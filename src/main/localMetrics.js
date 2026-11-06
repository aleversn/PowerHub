import { ipcMain } from 'electron';
import si from 'systeminformation';

const finite = (value, { positive = false, max = Infinity } = {}) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > max || (positive && number === 0)) return null;
    return number;
};
const percent = (value) => finite(value, { max: 100 });
const bytes = (value) => finite(value);
const megabytes = (value) => {
    const amount = finite(value);
    return amount === null ? null : amount * 1024 * 1024;
};
const temperature = (value) => finite(value, { positive: true, max: 150 });
const safeList = (value) => Array.isArray(value) ? value : [];
let pending = null;

async function collectLocalMetrics() {
    const sources = {
        system: () => si.osInfo(),
        cpuInfo: () => si.cpu(),
        cpu: () => si.currentLoad(),
        temperature: () => si.cpuTemperature(),
        memory: () => si.mem(),
        graphics: () => si.graphics(),
        interfaces: () => si.networkInterfaces(),
        network: () => si.networkStats('*'),
        disks: () => si.fsSize(),
        diskIo: () => si.fsStats()
    };
    const names = Object.keys(sources);
    const results = await Promise.allSettled(names.map((key) => Promise.resolve().then(sources[key])));
    const data = {};
    const errors = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') data[names[index]] = result.value;
        else errors.push(names[index]);
    });
    if (errors.length === names.length) throw new Error('Local metrics could not be collected.');
    const interfaces = safeList(data.interfaces);
    const byName = new Map(interfaces.map((item) => [item.iface, item]));
    const network = safeList(data.network).filter((item) => {
        const info = byName.get(item.iface);
        return info ? !info.internal && !info.virtual : !/^(lo|loopback)/i.test(item.iface || '');
    });
    const sumRate = (key) => {
        const values = network.map((item) => bytes(item[key])).filter((value) => value !== null);
        return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
    };
    const total = bytes(data.memory?.total);
    const available = bytes(data.memory?.available);
    const used = total !== null && available !== null ? Math.max(total - available, 0) : bytes(data.memory?.active);
    return {
        collectedAt: new Date().toISOString(),
        system: { hostname: data.system?.hostname || '', platform: data.system?.distro || '', release: data.system?.release || '' },
        cpu: { name: [data.cpuInfo?.manufacturer, data.cpuInfo?.brand].filter(Boolean).join(' '), cores: finite(data.cpuInfo?.cores, { positive: true }), usage: percent(data.cpu?.currentLoad), temperature: temperature(data.temperature?.main) },
        memory: { total, used, available, usage: total && used !== null ? percent(used / total * 100) : null },
        network: { download: sumRate('rx_sec'), upload: sumRate('tx_sec'), interfaces: network.map((item) => ({ name: item.iface || '', download: bytes(item.rx_sec), upload: bytes(item.tx_sec) })) },
        disks: safeList(data.disks).filter((disk) => bytes(disk.size) > 0).map((disk) => ({ name: disk.mount || disk.fs || '', filesystem: disk.fs || '', size: bytes(disk.size), used: bytes(disk.used), available: bytes(disk.available), usage: percent(disk.use) })),
        diskIo: { read: bytes(data.diskIo?.rx_sec), write: bytes(data.diskIo?.wx_sec) },
        gpus: safeList(data.graphics?.controllers).map((gpu) => ({ name: gpu.model || gpu.vendor || '', utilization: percent(gpu.utilizationGpu), temperature: temperature(gpu.temperatureGpu), memoryTotal: megabytes(gpu.vram) || null, memoryUsed: megabytes(gpu.memoryUsed) })),
        errors
    };
}

export function registerLocalMetricsIpc() {
    ipcMain.handle('local-metrics:get', () => {
        if (!pending) pending = collectLocalMetrics().finally(() => { pending = null; });
        return pending;
    });
}
