import { desc, eq, lt } from 'drizzle-orm';

import { getDatabase } from '../db/index.js';
import { endpoints, runs, schedules, settings } from '../db/schema.js';

const now = () => new Date().toISOString();
const createId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ----------------------------- endpoints ----------------------------- */

export function listEndpoints() {
    return getDatabase().select().from(endpoints).orderBy(desc(endpoints.updatedAt)).all();
}

export function createEndpoint(payload = {}) {
    const timestamp = now();
    const endpoint = {
        id: payload.id || createId('endpoint'),
        name: payload.name || 'Untitled endpoint',
        method: payload.method || 'GET',
        url: payload.url || 'https://api.example.com/',
        collection: payload.collection || 'Personal',
        headers: Number(payload.headers) || 0,
        enabled: payload.enabled !== false,
        health: payload.health || 'healthy',
        latency: payload.latency ?? null,
        createdAt: timestamp,
        updatedAt: timestamp
    };
    getDatabase().insert(endpoints).values(endpoint).run();
    return endpoint;
}

export function updateEndpoint(id, patch = {}) {
    const timestamp = now();
    getDatabase()
        .update(endpoints)
        .set({ ...patch, updatedAt: timestamp })
        .where(eq(endpoints.id, id))
        .run();
    return getDatabase().select().from(endpoints).where(eq(endpoints.id, id)).get();
}

export function toggleEndpoint(id) {
    const current = getDatabase().select().from(endpoints).where(eq(endpoints.id, id)).get();
    if (!current) return null;
    return updateEndpoint(id, { enabled: !current.enabled });
}

export function removeEndpoint(id) {
    getDatabase().delete(endpoints).where(eq(endpoints.id, id)).run();
}

/* ----------------------------- schedules ----------------------------- */

export function listSchedules() {
    return getDatabase().select().from(schedules).orderBy(desc(schedules.updatedAt)).all();
}

export function createSchedule(payload = {}) {
    const timestamp = now();
    const schedule = {
        id: payload.id || createId('schedule'),
        name: payload.name || 'Untitled schedule',
        endpointId: payload.endpointId || null,
        cron: payload.cron || '*/15 * * * *',
        enabled: payload.enabled !== false,
        nextRun: payload.nextRun || null,
        lastRun: null,
        lastStatus: 'idle',
        createdAt: timestamp,
        updatedAt: timestamp
    };
    getDatabase().insert(schedules).values(schedule).run();
    return schedule;
}

export function updateSchedule(id, patch = {}) {
    const timestamp = now();
    getDatabase()
        .update(schedules)
        .set({ ...patch, updatedAt: timestamp })
        .where(eq(schedules.id, id))
        .run();
    return getDatabase().select().from(schedules).where(eq(schedules.id, id)).get();
}

export function toggleSchedule(id) {
    const current = getDatabase().select().from(schedules).where(eq(schedules.id, id)).get();
    if (!current) return null;
    return updateSchedule(id, {
        enabled: !current.enabled,
        nextRun: current.enabled ? null : current.nextRun || now()
    });
}

export function removeSchedule(id) {
    getDatabase().delete(schedules).where(eq(schedules.id, id)).run();
}

/* ------------------------------- runs -------------------------------- */

export function listRuns({ endpointId, limit = 200 } = {}) {
    const query = getDatabase().select().from(runs).orderBy(desc(runs.startedAt));
    const rows = endpointId
        ? query.where(eq(runs.endpointId, endpointId)).all()
        : query.all();
    return rows.slice(0, limit);
}

export function createRun(payload = {}) {
    const run = {
        id: payload.id || createId('run'),
        endpointId: payload.endpointId || null,
        scheduleId: payload.scheduleId || null,
        status: payload.status || 'success',
        statusCode: payload.statusCode ?? null,
        duration: payload.duration ?? null,
        startedAt: payload.startedAt || now(),
        triggeredBy: payload.triggeredBy || 'manual',
        mode: payload.mode || 'mock'
    };
    getDatabase().insert(runs).values(run).run();
    if (run.scheduleId) {
        getDatabase()
            .update(schedules)
            .set({ lastRun: run.startedAt, lastStatus: run.status, updatedAt: now() })
            .where(eq(schedules.id, run.scheduleId))
            .run();
    }
    return run;
}

// 按保留天数清理历史运行记录。
export function pruneRuns(retentionDays) {
    const days = Number(retentionDays);
    if (!Number.isFinite(days) || days <= 0) return 0;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const result = getDatabase().delete(runs).where(lt(runs.startedAt, cutoff)).run();
    return result.changes || 0;
}

/* ------------------------------ settings ----------------------------- */

export function getSetting(key, fallback = null) {
    const row = getDatabase().select().from(settings).where(eq(settings.key, key)).get();
    if (!row) return fallback;
    try {
        return JSON.parse(row.value);
    } catch {
        return fallback;
    }
}

export function setSetting(key, value) {
    const serialized = JSON.stringify(value ?? null);
    getDatabase()
        .insert(settings)
        .values({ key, value: serialized, updatedAt: now() })
        .onConflictDoUpdate({
            target: settings.key,
            set: { value: serialized, updatedAt: now() }
        })
        .run();
    return value;
}

export function getSettings(keys = []) {
    const result = {};
    for (const key of keys) result[key] = getSetting(key);
    return result;
}

export function setSettings(patch = {}) {
    for (const [key, value] of Object.entries(patch)) setSetting(key, value);
    return patch;
}

/* ------------------------------ bootstrap ---------------------------- */

// 首次启动时写入演示数据，方便前端在接入 IPC 前就有内容。
export function seedDemoData() {
    const count = getDatabase().select().from(endpoints).all().length;
    if (count > 0) return;

    const seedEndpoints = [
        {
            id: 'endpoint-health',
            name: 'Production health',
            method: 'GET',
            url: 'https://api.example.com/health',
            collection: 'Production',
            headers: 2,
            enabled: true,
            health: 'healthy',
            latency: 128
        },
        {
            id: 'endpoint-orders',
            name: 'Orders service ping',
            method: 'POST',
            url: 'https://api.example.com/v1/orders/ping',
            collection: 'Core services',
            headers: 3,
            enabled: true,
            health: 'degraded',
            latency: 642
        }
    ];
    for (const endpoint of seedEndpoints) createEndpoint(endpoint);
}

export function resetDemoData() {
    getDatabase().delete(runs).run();
    getDatabase().delete(schedules).run();
    getDatabase().delete(endpoints).run();
    seedDemoData();
}

export const workspaceRepository = {
    listEndpoints,
    createEndpoint,
    updateEndpoint,
    toggleEndpoint,
    removeEndpoint,
    listSchedules,
    createSchedule,
    updateSchedule,
    toggleSchedule,
    removeSchedule,
    listRuns,
    createRun,
    pruneRuns,
    getSetting,
    setSetting,
    getSettings,
    setSettings,
    seedDemoData,
    resetDemoData
};