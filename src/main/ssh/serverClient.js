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

function parseCpu(cpu1, cpu2) {
    const parse = (value) => {
        const line = splitLines(value)[0] || '';
        const parts = line.split(/\s+/).filter(Boolean).slice(1).map((item) => asNumber(item, 0));
        if (parts.length < 4) return null;
        const idle = parts[3] + (parts[4] || 0);
        const total = parts.slice(0, 8).reduce((sum, item) => sum + item, 0);
        return { idle, total };
    };

    const first = parse(cpu1);
    const second = parse(cpu2);
    if (!first || !second) return 0;

    const totalDelta = second.total - first.total;
    const idleDelta = second.idle - first.idle;
    if (totalDelta <= 0) return 0;
    return clampPercent((1 - idleDelta / totalDelta) * 100);
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

export function parseMetrics({ loadavg, nproc, cpu1, cpu2, free, uptime, df, net, diskstats, thermal, sensors }) {
    const { load1, load5, load15, cores } = parseLoad(loadavg, nproc);

    let memory = 0;
    const memLines = splitLines(free);
    const memLine = memLines.find((line) => line.toLowerCase().startsWith('mem:'));
    if (memLine) {
        const parts = memLine.split(/\s+/).filter(Boolean);
        const total = asNumber(parts[1], 0);
        const available = asNumber(parts[6], asNumber(parts[3], 0));
        if (total > 0) memory = clampPercent(((total - available) / total) * 100);
    }

    let swap = 0;
    let swapTotal = 0;
    const swapLine = memLines.find((line) => line.toLowerCase().startsWith('swap:'));
    if (swapLine) {
        const parts = swapLine.split(/\s+/).filter(Boolean);
        swapTotal = asNumber(parts[1], 0);
        const used = asNumber(parts[2], 0);
        if (swapTotal > 0) swap = clampPercent((used / swapTotal) * 100);
    }

    const diskLine = splitLines(df)[1] || '';
    const diskParts = diskLine.split(/\s+/).filter(Boolean);
    const disk = clampPercent(String(diskParts[4] || '0').replace('%', ''));

    const netTotals = splitLines(net)
        .filter((line) => !line.toLowerCase().startsWith('inter-') && !line.toLowerCase().startsWith('face'))
        .reduce(
            (total, line) => {
                const parts = line.split(/\s+/).filter(Boolean);
                return {
                    rx: total.rx + asNumber(parts[1], 0),
                    tx: total.tx + asNumber(parts[9], 0)
                };
            },
            { rx: 0, tx: 0 }
        );

    const diskTotals = splitLines(diskstats).reduce(
        (total, line) => {
            const parts = line.split(/\s+/).filter(Boolean);
            if (!isWholeDisk(parts[2] || '')) return total;
            const readSectors = asNumber(parts[5], 0);
            const writeSectors = asNumber(parts[9], 0);
            return {
                read: total.read + readSectors * 512,
                write: total.write + writeSectors * 512
            };
        },
        { read: 0, write: 0 }
    );

    const uptimeSeconds = asNumber(trimOutput(uptime).split(/\s+/)[0], 0);

    return {
        metrics: {
            load1,
            load5,
            load15,
            cores,
            cpu: parseCpu(cpu1, cpu2),
            memory,
            swap,
            swapTotal,
            disk,
            temperature: parseTemperature(thermal, sensors),
            netInTotal: netTotals.rx,
            netOutTotal: netTotals.tx,
            diskReadTotal: diskTotals.read,
            diskWriteTotal: diskTotals.write
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
                    'grep "^cpu " /proc/stat 2>/dev/null',
                    'sleep 0.5',
                    'printf "__CPU2__\\n"',
                    'grep "^cpu " /proc/stat 2>/dev/null',
                    'printf "__FREE__\\n"',
                    'free -k 2>/dev/null || free 2>/dev/null',
                    'printf "__DF__\\n"',
                    'df -Pk / 2>/dev/null',
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

        const temperature = await readTemperature(client);
        if (temperature !== null) parsed.metrics.temperature = temperature;

        return {
            ok: true,
            os: await readOperatingSystem(client),
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
