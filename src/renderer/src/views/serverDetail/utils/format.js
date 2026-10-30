const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export const formatBytes = (value) => {
    const bytes = Number(value) || 0;
    if (bytes <= 0) return '0 B';
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
    const scaled = bytes / Math.pow(1024, index);
    const digits = scaled >= 100 || index === 0 ? 0 : scaled >= 10 ? 1 : 2;
    return scaled.toFixed(digits) + ' ' + UNITS[index];
};

export const formatRate = (value) => formatBytes(value) + '/s';

export const formatPercent = (value) => Math.round(Number(value) || 0) + ' %';

export const formatTemperature = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return '--';
    return number.toFixed(0) + '°C';
};

export const clampPercent = (value) => Math.min(Math.max(Number(value) || 0, 0), 100);