import { cpus, freemem, totalmem } from 'os';
import { spawn, execFile } from 'child_process';
import { createInterface } from 'readline';
import si from 'systeminformation';

const validPercent = (value) => {
    const number = Number(value);
    return value === null || value === undefined || value === '' || !Number.isFinite(number) || number < 0 || number > 100 ? null : number;
};
const validTemperature = (value) => {
    const number = Number(value);
    return value === null || value === undefined || value === '' || !Number.isFinite(number) || number <= 0 || number > 150 ? null : number;
};

// One persistent process reads local counters on Windows, avoiding a new PowerShell per sample.
const networkScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
while ($true) {
    try {
        $rx = 0L; $tx = 0L; $count = 0
        foreach ($nic in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
            if ($nic.OperationalStatus -ne 'Up' -or $nic.NetworkInterfaceType -eq 'Loopback' -or $nic.NetworkInterfaceType -eq 'Tunnel') { continue }
            try { $stats = $nic.GetIPStatistics(); $rx += $stats.BytesReceived; $tx += $stats.BytesSent; $count++ } catch {}
        }
        if ($count -gt 0) { [Console]::WriteLine("$rx,$tx") } else { [Console]::WriteLine('unavailable') }
    } catch { [Console]::WriteLine('unavailable') }
    Start-Sleep -Milliseconds 1000
}`;

export function createFloatingMetrics(send) {
    let timer = null;
    let netProcess = null;
    let previousNetwork = null;
    let network = { download: null, upload: null };
    let previousCpu = null;
    let networkPending = false;
    let gpuPending = false;
    let gpu = { usage: null, temperature: null };
    let active = false;
    let generation = 0;
    let gpuUnavailableUntil = 0;
    let gpuProcess = null;

    function startNetwork() {
        if (process.platform !== 'win32') return;
        const command = Buffer.from(networkScript, 'utf16le').toString('base64');
        const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', command], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
        netProcess = child;
        child.on('error', () => { if (netProcess === child) network = { download: null, upload: null }; });
        child.on('exit', () => { if (netProcess === child) { netProcess = null; network = { download: null, upload: null }; } });
        const lines = createInterface({ input: child.stdout });
        lines.on('line', (line) => {
            if (netProcess !== child) return;
            const match = line.trim().match(/^(\d+),(\d+)$/);
            if (!match) { previousNetwork = null; network = { download: null, upload: null }; return; }
            const sample = { rx: Number(match[1]), tx: Number(match[2]), time: Date.now() };
            if (previousNetwork) {
                const seconds = (sample.time - previousNetwork.time) / 1000;
                network = {
                    download: seconds > 0 && sample.rx >= previousNetwork.rx ? (sample.rx - previousNetwork.rx) / seconds : null,
                    upload: seconds > 0 && sample.tx >= previousNetwork.tx ? (sample.tx - previousNetwork.tx) / seconds : null
                };
            }
            previousNetwork = sample;
        });
    }
    function cpuUsage() {
        const totals = cpus().reduce((result, cpu) => {
            for (const [key, value] of Object.entries(cpu.times)) { result.total += value; if (key === 'idle') result.idle += value; }
            return result;
        }, { idle: 0, total: 0 });
        const last = previousCpu;
        previousCpu = totals;
        if (!last || totals.total <= last.total) return null;
        return validPercent((1 - (totals.idle - last.idle) / (totals.total - last.total)) * 100);
    }
    function readGpu() {
        if (process.platform === 'darwin' || Date.now() < gpuUnavailableUntil) return Promise.resolve({ usage: null, temperature: null });
        return new Promise((resolve) => {
            const current = generation;
            const child = execFile('nvidia-smi', ['--query-gpu=utilization.gpu,temperature.gpu', '--format=csv,noheader,nounits'], { windowsHide: true, timeout: 1500, maxBuffer: 16384 }, (error, stdout) => {
                if (gpuProcess === child) gpuProcess = null;
                if (error) { if (current === generation && active) gpuUnavailableUntil = Date.now() + 60000; resolve({ usage: null, temperature: null }); return; }
                const [usage, temperature] = stdout.trim().split(/\r?\n/)[0].split(',').map((value) => value.trim());
                resolve({ usage: validPercent(usage), temperature: validTemperature(temperature) });
            });
            gpuProcess = child;
        });
    }
    function tick() {
        if (!active) return;
        const current = generation;
        const total = totalmem();
        send({ cpu: cpuUsage(), memory: total > 0 ? validPercent((total - freemem()) / total * 100) : null, network: { ...network }, gpu: { ...gpu } });
        if (!gpuPending) {
            gpuPending = true;
            readGpu().then((value) => { if (active && current === generation) gpu = value; })
                .catch(() => { if (active && current === generation) gpu = { usage: null, temperature: null }; })
                .finally(() => { gpuPending = false; });
        }
        if (process.platform !== 'win32' && !networkPending) {
            networkPending = true;
            si.networkStats().then((items) => {
                if (!active || current !== generation) return;
                const item = items[0];
                const rate = (value) => value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 0 ? null : Number(value);
                network = { download: rate(item?.rx_sec), upload: rate(item?.tx_sec) };
            }).catch(() => { if (active && current === generation) network = { download: null, upload: null }; })
                .finally(() => { networkPending = false; });
        }
    }
    return {
        start() {
            if (active) return;
            active = true; generation += 1; previousCpu = null; previousNetwork = null;
            startNetwork(); tick(); timer = setInterval(tick, 1000);
        },
        stop() {
            active = false; generation += 1; clearInterval(timer); timer = null;
            if (netProcess) { netProcess.kill(); netProcess = null; }
            if (gpuProcess) { gpuProcess.kill(); gpuProcess = null; }
            network = { download: null, upload: null }; gpu = { usage: null, temperature: null }; previousNetwork = null;
        }
    };
}
