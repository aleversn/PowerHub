import { Client } from 'ssh2';

const DEFAULT_TIMEOUT = 12000;

const asNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const clampPercent = (value) => {
    const number = asNumber(value, 0);
    return Math.min(Math.max(Math.round(number), 0), 100);
};

const roundOne = (value) => Math.round(asNumber(value, 0) * 10) / 10;
const trimOutput = (value) => String(value || '').trim();

const splitLines = (value) =>
    trimOutput(value)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

// 只统计整块磁盘，避免分区与 dm/md 重复计数。
const WHOLE_DISK = [
    /^sd[a-z]+$/,
    /^hd[a-z]+$/,
    /^vd[a-z]+$/,
    /^xvd[a-z]+$/,
    /^nvme\d+n\d+$/,
    /^mmcblk\d+$/,
    /^md\d+$/
];

const isWholeDisk = (name) => WHOLE_DISK.some((pattern) => pattern.test(name));

const isVirtualNetworkInterface = (name) => {
    const value = String(name || '').toLowerCase();
    if (!value) return true;
    if (/^(lo|docker|br-|veth|virbr|tun|tap|wg|tailscale|zt|cni|cali|flannel|kube)/.test(value)) {
        return true;
    }
    return /-\d+$/.test(value);
};

const isSkippableDiskDevice = (name) => /^(loop|ram|fd|sr)\d*/i.test(String(name || ''));

export function connectServer(server = {}, timeout = DEFAULT_TIMEOUT) {
    return new Promise((resolve, reject) => {
        const client = new Client();
        let settled = false;
        const done = (error) => {
            if (settled) return;
            settled = true;
            if (error) reject(error);
            else resolve(client);
        };

        client.once('ready', () => done());
        client.once('error', (error) => done(error));
        client.once('close', () => {
            if (!settled) done(new Error('SSH connection closed before authentication completed.'));
        });

        client.connect({
            host: server.address,
            port: asNumber(server.port, 22),
            username: server.username,
            password: server.password,
            readyTimeout: timeout,
            keepaliveInterval: 5000,
            keepaliveCountMax: 2
        });
    });
}

export function execRemote(client, command, timeout = DEFAULT_TIMEOUT) {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        let settled = false;

        const finish = (error, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (error) reject(error);
            else resolve(value);
        };

        const timer = setTimeout(() => {
            finish(new Error('SSH command timed out.'));
        }, timeout);

        client.exec(command, (error, stream) => {
            if (error) {
                finish(error);
                return;
            }

            stream.setEncoding('utf8');
            stream.stderr.setEncoding('utf8');

            stream.on('close', (code) => {
                if (code && code !== 0) {
                    finish(new Error(stderr || `SSH command exited with code ${code}.`));
                    return;
                }
                finish(null, { stdout, stderr, code });
            });
            stream.on('data', (chunk) => {
                stdout += chunk.toString('utf8');
            });
            stream.stderr.on('data', (chunk) => {
                stderr += chunk.toString('utf8');
            });
        });
    });
}

async function readOperatingSystem(client) {
    const result = await execRemote(
        client,
        "sh -lc 'cat /etc/os-release 2>/dev/null | sed -n \"s/^PRETTY_NAME=//p\" | head -n 1'",
        8000
    );
    return trimOutput(result.stdout).replace(/^"|"$/g, '') || 'Linux';
}

async function readHostname(client) {
    try {
        const result = await execRemote(client, "sh -lc 'hostname 2>/dev/null'", 5000);
        return trimOutput(result.stdout) || '';
    } catch {
        return '';
    }
}

function parseLoad(loadavg, nproc) {
    const parts = trimOutput(loadavg).split(/\s+/);
    const fromLoadavg = asNumber(String(parts[3] || '').split('/')[1], 0);
    const cores = Math.max(asNumber(nproc, 0) || fromLoadavg || 1, 1);
    return {
        cores,
        load1: clampPercent((asNumber(parts[0], 0) / cores) * 100),
        load5: clampPercent((asNumber(parts[1], 0) / cores) * 100),
        load15: clampPercent((asNumber(parts[2], 0) / cores) * 100)
    };
}

function parseCpuLine(line) {
    const parts = String(line || '').split(/\s+/).filter(Boolean).slice(1).map((item) => asNumber(item, 0));
    if (parts.length < 4) return null;
    return {
        user: parts[0] || 0,
        nice: parts[1] || 0,
        system: parts[2] || 0,
        idle: parts[3] || 0,
        iowait: parts[4] || 0,
        irq: parts[5] || 0,
        softirq: parts[6] || 0,
        steal: parts[7] || 0,
        guest: parts[8] || 0,
        guestNice: parts[9] || 0
    };
}

function cpuBreakdown(first, second) {
    if (!first || !second) {
        return {
            user: 0,
            system: 0,
            iowait: 0,
            steal: 0,
            idle: 100,
            usage: 0
        };
    }

    const delta = (key) => Math.max(asNumber(second[key], 0) - asNumber(first[key], 0), 0);
    const userDelta = delta('user') + delta('nice');
    const systemDelta = delta('system') + delta('irq') + delta('softirq');
    const idleDelta = delta('idle');
    const iowaitDelta = delta('iowait');
    const stealDelta = delta('steal');
    const total = userDelta + systemDelta + idleDelta + iowaitDelta + stealDelta;

    if (total <= 0) {
        return {
            user: 0,
            system: 0,
            iowait: 0,
            steal: 0,
            idle: 100,
            usage: 0
        };
    }

    const idle = (idleDelta / total) * 100;
    return {
        user: roundOne((userDelta / total) * 100),
        system: roundOne((systemDelta / total) * 100),
        iowait: roundOne((iowaitDelta / total) * 100),
        steal: roundOne((stealDelta / total) * 100),
        idle: roundOne(idle),
        usage: roundOne(100 - idle)
    };
}

function parseCpuUsage(cpu1, cpu2) {
    const first = new Map();
    const second = new Map();

    splitLines(cpu1).forEach((line) => {
        const label = line.split(/\s+/)[0];
        const parsed = parseCpuLine(line);
        if (label && parsed) first.set(label, parsed);
    });

    splitLines(cpu2).forEach((line) => {
        const label = line.split(/\s+/)[0];
        const parsed = parseCpuLine(line);
        if (label && parsed) second.set(label, parsed);
    });

    const total = cpuBreakdown(first.get('cpu'), second.get('cpu'));
    const cores = Array.from(second.keys())
        .filter((label) => /^cpu\d+$/.test(label))
        .sort((left, right) => asNumber(left.slice(3), 0) - asNumber(right.slice(3), 0))
        .map((label) => {
            const breakdown = cpuBreakdown(first.get(label), second.get(label));
            return {
                id: label.slice(3),
                usage: roundOne(breakdown.usage)
            };
        });

    return {
        usage: clampPercent(total.usage),
        breakdown: {
            user: roundOne(total.user),
            system: roundOne(total.system),
            iowait: roundOne(total.iowait),
            steal: roundOne(total.steal),
            idle: roundOne(total.idle)
        },
        cores
    };
}

function parseTemperature(thermal, sensors) {
    const readings = [];
    const push = (label, value) => {
        const name = String(label || '').replace(/^[zh]:/, '').trim();
        if (!Number.isFinite(value) || value <= 0 || value >= 200) return;
        readings.push({ label: name, value });
    };

    splitLines(thermal).forEach((line) => {
        // 形如 z:acpitz:45000 或 h:coretemp:45000（毫摄氏度）
        let match = line.match(/^(.*):(-?\d+)$/);
        if (match) {
            push(match[1], asNumber(match[2], 0) / 1000);
            return;
        }
        // 形如 temp1_input: 45.000
        match = line.match(/^([A-Za-z0-9_\- ]+):\s*(-?[\d.]+)$/);
        if (match) push(match[1], asNumber(match[2], 0));
    });

    splitLines(sensors).forEach((line) => {
        // 形如 "Package id 0:  +45.0°C" / "Tctl: +45.0°C"
        let match = line.match(/^(.+?):\s*\+?(-?[\d.]+)\s*°?C/i);
        if (match) {
            push(match[1], asNumber(match[2], 0));
            return;
        }
        // 形如 temp1_input: 45.000（sensors -u）
        match = line.match(/^([A-Za-z0-9_\- ]+):\s*(-?[\d.]+)$/);
        if (match && /temp/i.test(match[1])) push(match[1], asNumber(match[2], 0));
    });

    if (!readings.length) return null;

    const preferred = readings.find((item) =>
        /pkg|package|core|cpu|soc|composite|tctl|tdie|zone0/i.test(item.label)
    );
    const picked = preferred || readings.sort((a, b) => b.value - a.value)[0];
    return Math.round(picked.value * 10) / 10;
}

async function readTemperature(client) {
    const script = [
        'for f in /sys/class/thermal/thermal_zone*/temp; do [ -r "$f" ] && printf "z:%s:%s\n" "$(cat "${f%temp}type" 2>/dev/null)" "$(cat "$f" 2>/dev/null)"; done 2>/dev/null',
        'for f in /sys/class/hwmon/hwmon*/temp*_input; do [ -r "$f" ] && printf "h:%s:%s\n" "$(cat "$(dirname "$f")/name" 2>/dev/null)" "$(cat "$f" 2>/dev/null)"; done 2>/dev/null',
        'sensors 2>/dev/null | grep -iE "temp|package|core|tctl|tdie" || true'
    ].join('; ');

    try {
        const result = await execRemote(client, "sh -lc '" + script + "'", 8000);
        return parseTemperature(result.stdout, "");
    } catch {
        return null;
    }
}

async function readGpu(client) {
    const script = [
        'nvidia-smi --query-gpu=index,name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu --format=csv,noheader,nounits 2>/dev/null',
        'lspci 2>/dev/null | grep -Ei "vga|3d|display" || true'
    ].join('; ');

    try {
        const result = await execRemote(client, "sh -lc '" + script + "'", 8000);
        const lines = splitLines(result.stdout);
        const nvidia = lines
            .filter((line) => line.includes(','))
            .map((line, index) => {
                const parts = line.split(',').map((item) => item.trim());
                const memoryTotal = asNumber(parts[2], 0) * 1024 * 1024;
                const memoryUsed = asNumber(parts[3], 0) * 1024 * 1024;
                const memoryFree = asNumber(parts[4], 0) * 1024 * 1024;
                return {
                    id: parts[0] || String(index),
                    name: parts[1] || `GPU ${index + 1}`,
                    memoryTotal,
                    memoryUsed,
                    memoryFree,
                    utilization: clampPercent(parts[5]),
                    temperature:
                        asNumber(parts[6], 0) > 0 ? roundOne(asNumber(parts[6], 0)) : null,
                    source: 'nvidia'
                };
            });

        if (nvidia.length) return nvidia;

        return lines.map((line, index) => ({
            id: String(index),
            name: line.replace(/^[0-9a-f:.]+\s+/i, '').trim() || `GPU ${index + 1}`,
            memoryTotal: 0,
            memoryUsed: 0,
            memoryFree: 0,
            utilization: 0,
            temperature: null,
            source: 'lspci'
        }));
    } catch {
        return [];
    }
}

function parseMemory(free) {
    const lines = splitLines(free);
    const memLine = lines.find((line) => line.toLowerCase().startsWith('mem:'));
    const swapLine = lines.find((line) => line.toLowerCase().startsWith('swap:'));
    const result = {
        memory: 0,
        memoryTotal: 0,
        memoryUsed: 0,
        memoryFree: 0,
        pageCache: 0,
        swap: 0,
        swapTotal: 0
    };

    if (memLine) {
        const parts = memLine.split(/\s+/).filter(Boolean);
        const total = asNumber(parts[1], 0) * 1024;
        const used = asNumber(parts[2], 0) * 1024;
        const free = asNumber(parts[3], 0) * 1024;
        const available = asNumber(parts[6], asNumber(parts[3], 0)) * 1024;
        const cache = asNumber(parts[5], 0) * 1024;
        result.memoryTotal = total;
        result.memoryUsed = used;
        result.memoryFree = free;
        result.pageCache = cache;
        if (total > 0) result.memory = clampPercent(((total - available) / total) * 100);
    }

    if (swapLine) {
        const parts = swapLine.split(/\s+/).filter(Boolean);
        result.swapTotal = asNumber(parts[1], 0) * 1024;
        const used = asNumber(parts[2], 0) * 1024;
        if (result.swapTotal > 0) result.swap = clampPercent((used / result.swapTotal) * 100);
    }

    return result;
}

function parseDisks(df) {
    return splitLines(df)
        .filter((line) => !/^filesystem\b/i.test(line))
        .map((line) => {
            const parts = line.split(/\s+/).filter(Boolean);
            if (parts.length < 6) return null;
            const hasType = parts.length >= 7 && /^\d+$/.test(parts[2]);
            const sizeIndex = hasType ? 2 : 1;
            const capacity = String(parts[sizeIndex + 3] || '').replace('%', '');
            const mount = parts.slice(sizeIndex + 4).join(' ');
            const filesystem = parts[0] || '';
            if (!filesystem || !mount) return null;

            return {
                filesystem,
                type: hasType ? parts[1] : '',
                mount,
                size: asNumber(parts[sizeIndex], 0) * 1024,
                used: asNumber(parts[sizeIndex + 1], 0) * 1024,
                available: asNumber(parts[sizeIndex + 2], 0) * 1024,
                usage: clampPercent(capacity)
            };
        })
        .filter(Boolean);
}

function parseNetworkInterfaces(net) {
    return splitLines(net)
        .filter((line) => !line.toLowerCase().startsWith('inter-') && !line.toLowerCase().startsWith('face'))
        .map((line) => {
            const match = line.match(/^\s*([^:]+):\s*(.*)$/);
            if (!match) return null;
            const name = match[1].trim();
            const parts = match[2].split(/\s+/).filter(Boolean);
            if (!name || parts.length < 16) return null;
            return {
                name,
                rxTotal: asNumber(parts[0], 0),
                txTotal: asNumber(parts[8], 0),
                rxPackets: asNumber(parts[1], 0),
                txPackets: asNumber(parts[9], 0),
                virtual: isVirtualNetworkInterface(name)
            };
        })
        .filter(Boolean);
}

function parseDiskDevices(diskstats) {
    return splitLines(diskstats)
        .map((line) => {
            const parts = line.split(/\s+/).filter(Boolean);
            if (parts.length < 14) return null;
            const name = parts[2] || '';
            if (!name || isSkippableDiskDevice(name)) return null;
            return {
                name,
                whole: isWholeDisk(name),
                readTotal: asNumber(parts[5], 0) * 512,
                writeTotal: asNumber(parts[9], 0) * 512,
                readIops: asNumber(parts[3], 0),
                writeIops: asNumber(parts[7], 0),
                readWaitMs: asNumber(parts[6], 0),
                writeWaitMs: asNumber(parts[10], 0),
                busyMs: asNumber(parts[12], 0)
            };
        })
        .filter(Boolean);
}

export function parseMetrics({ loadavg, nproc, cpu1, cpu2, free, uptime, df, net, diskstats, thermal, sensors }) {
    const { load1, load5, load15, cores } = parseLoad(loadavg, nproc);
    const cpu = parseCpuUsage(cpu1, cpu2);
    const memory = parseMemory(free);
    const disks = parseDisks(df);
    const netInterfaces = parseNetworkInterfaces(net);
    const diskDevices = parseDiskDevices(diskstats);
    const defaultDisk = disks.find((disk) => disk.mount === '/') || disks[0] || { usage: 0 };
    const aggregateNetwork = netInterfaces.filter((item) => !item.virtual && item.name !== 'lo');
    const networkSource = aggregateNetwork.length ? aggregateNetwork : netInterfaces;
    const netTotals = networkSource.reduce(
        (total, item) => ({
            rx: total.rx + item.rxTotal,
            tx: total.tx + item.txTotal
        }),
        { rx: 0, tx: 0 }
    );
    const wholeDisks = diskDevices.filter((device) => device.whole);
    const diskSource = wholeDisks.length ? wholeDisks : diskDevices;
    const diskTotals = diskSource.reduce(
        (total, device) => ({
            read: total.read + device.readTotal,
            write: total.write + device.writeTotal
        }),
        { read: 0, write: 0 }
    );

    const uptimeSeconds = asNumber(trimOutput(uptime).split(/\s+/)[0], 0);

    return {
        metrics: {
            load1,
            load5,
            load15,
            cores,
            cpu: cpu.usage,
            cpuBreakdown: cpu.breakdown,
            cpuCores: cpu.cores,
            memory: memory.memory,
            memoryTotal: memory.memoryTotal,
            memoryUsed: memory.memoryUsed,
            memoryFree: memory.memoryFree,
            pageCache: memory.pageCache,
            swap: memory.swap,
            swapTotal: memory.swapTotal,
            disk: defaultDisk.usage,
            disks,
            diskDevices,
            temperature: parseTemperature(thermal, sensors),
            netInTotal: netTotals.rx,
            netOutTotal: netTotals.tx,
            netInterfaces,
            diskReadTotal: diskTotals.read,
            diskWriteTotal: diskTotals.write,
            uptimeSeconds
        },
        uptimeSeconds
    };
}

export async function collectServerMetrics(server = {}) {
    const client = await connectServer(server);
    try {
        const command = [
            'sh -lc',
            JSON.stringify(
                [
                    'printf "__LOAD__\\n"',
                    'cat /proc/loadavg 2>/dev/null',
                    'printf "__NPROC__\\n"',
                    'nproc 2>/dev/null || grep -c processor /proc/cpuinfo 2>/dev/null',
                    'printf "__CPU1__\\n"',
                    'grep "^cpu" /proc/stat 2>/dev/null',
                    'sleep 0.5',
                    'printf "__CPU2__\\n"',
                    'grep "^cpu" /proc/stat 2>/dev/null',
                    'printf "__FREE__\\n"',
                    'free -k 2>/dev/null || free 2>/dev/null',
                    'printf "__DF__\\n"',
                    'df -PTk 2>/dev/null || df -Pk 2>/dev/null',
                    'printf "__NET__\\n"',
                    'cat /proc/net/dev 2>/dev/null',
                    'printf "__DISKSTATS__\\n"',
                    'cat /proc/diskstats 2>/dev/null',
                    'printf "__UPTIME__\\n"',
                    'cat /proc/uptime 2>/dev/null'
                ].join('; ')
            )
        ].join(' ');

        const result = await execRemote(client, command, 12000);
        const sections = {};
        let current = '';
        splitLines(result.stdout).forEach((line) => {
            const section = line.match(/^__([A-Z]+)__$/);
            if (section) {
                current = section[1].toLowerCase();
                sections[current] = [];
                return;
            }
            if (current) sections[current].push(line);
        });

        const parsed = parseMetrics({
            loadavg: (sections.load || []).join('\n'),
            nproc: (sections.nproc || []).join('\n'),
            cpu1: (sections.cpu1 || []).join('\n'),
            cpu2: (sections.cpu2 || []).join('\n'),
            free: (sections.free || []).join('\n'),
            df: (sections.df || []).join('\n'),
            net: (sections.net || []).join('\n'),
            diskstats: (sections.diskstats || []).join('\n'),
            thermal: (sections.thermal || []).join('\n'),
            sensors: (sections.sensors || []).join('\n'),
            uptime: (sections.uptime || []).join('\n')
        });

        const [temperature, gpus, hostname] = await Promise.all([
            readTemperature(client),
            readGpu(client),
            readHostname(client)
        ]);

        if (temperature !== null) parsed.metrics.temperature = temperature;
        parsed.metrics.gpus = gpus;

        return {
            ok: true,
            os: await readOperatingSystem(client),
            hostname,
            ...parsed,
            lastSeen: new Date().toISOString()
        };
    } finally {
        client.end();
    }
}

export async function testServerConnection(server = {}) {
    const client = await connectServer(server);
    try {
        const result = await execRemote(client, 'sh -lc "printf powerhub-ok"', 8000);
        return {
            ok: trimOutput(result.stdout) === 'powerhub-ok',
            message: trimOutput(result.stdout) || 'No response'
        };
    } finally {
        client.end();
    }
}