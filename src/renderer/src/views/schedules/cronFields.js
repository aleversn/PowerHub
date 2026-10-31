const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function expandField(field, min, max, names = []) {
    if (field === '*') return [];
    const valueOf = (raw) => {
        const upper = raw.toUpperCase();
        const named = names.indexOf(upper);
        if (named >= 0) return named + (min === 1 ? 1 : 0);
        if (!/^\d+$/.test(raw)) throw new Error('unsupported');
        const value = Number(raw);
        if (value < min || value > max) throw new Error('unsupported');
        return value;
    };
    const values = new Set();
    for (const part of field.split(',')) {
        const pieces = part.split('/');
        if (pieces.length > 2 || (pieces.length === 2 && !/^[1-9]\d*$/.test(pieces[1]))) throw new Error('unsupported');
        const step = pieces.length === 2 ? Number(pieces[1]) : 1;
        const range = pieces[0];
        let start, end;
        if (range === '*') { start = min; end = max; }
        else if (range.includes('-')) {
            const parts = range.split('-');
            if (parts.length !== 2) throw new Error('unsupported');
            start = valueOf(parts[0]); end = valueOf(parts[1]);
        } else {
            start = valueOf(range); end = pieces.length === 2 ? max : start;
        }
        if (start > end || step > max - min + 1) throw new Error('unsupported');
        for (let i = start; i <= end; i += step) values.add(min === 0 && max === 7 && i === 7 ? 0 : i);
    }
    if (!values.size) throw new Error('unsupported');
    return [...values].sort((a, b) => a - b).map(String);
}

export function parseCronFields(expression) {
    const parts = String(expression || '').trim().split(/\s+/);
    if (parts.length !== 5) return null;
    const [minute, hour, day, month, weekday] = parts;
    let interval = '';
    let hourValue = 0;
    let minuteValue = 0;
    if (hour === '*' && (minute === '*' || /^\*\/([1-9]\d*)$/.test(minute))) {
        interval = minute === '*' ? '1' : minute.slice(2);
        if (Number(interval) > 59) return null;
    } else if (/^\d{1,2}$/.test(minute) && /^\d{1,2}$/.test(hour)) {
        minuteValue = Number(minute); hourValue = Number(hour);
        if (minuteValue > 59 || hourValue > 23) return null;
    } else return null;
    try {
        return { interval, hour: hourValue, minute: minuteValue,
            days: expandField(day, 1, 31), months: expandField(month, 1, 12, MONTHS), weekdays: expandField(weekday, 0, 7, WEEKDAYS) };
    } catch { return null; }
}

export function buildCronFields({ interval, hour, minute, days, months, weekdays }) {
    const field = (values) => values.length ? values.map(Number).sort((a, b) => a - b).join(',') : '*';
    const first = interval ? `*/${interval} *` : `${Number(minute)} ${Number(hour)}`;
    return `${first} ${field(days)} ${field(months)} ${field(weekdays)}`;
}
