import { desc, eq, lt } from 'drizzle-orm';

import { getDatabase } from '../db/index.js';
import {
    collectionVariables,
    collections,
    endpoints,
    runs,
    schedules,
    settings
} from '../db/schema.js';

const now = () => new Date().toISOString();
const createId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const DEFAULT_COLLECTION = 'Default collection';

const safeJsonParse = (value, fallback) => {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const serializeJson = (value, fallback = '[]') => {
    if (typeof value === 'string') return value;
    return JSON.stringify(value ?? safeJsonParse(fallback, []));
};

const normalizeMethod = (value) => {
    const method = String(value || 'GET').toUpperCase();
    return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)
        ? method
        : 'GET';
};

const normalizeSortOrder = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const normalizeKeyValueList = (value) =>
    Array.isArray(value)
        ? value.map((item, index) => ({
              id: item?.id || `row-${index}`,
              key: String(item?.key ?? ''),
              value: String(item?.value ?? ''),
              enabled: item?.enabled !== false,
              hide: item?.hide === true
          }))
        : [];

const endpointRowToModel = (row) => {
    if (!row) return null;
    const headersData = normalizeKeyValueList(safeJsonParse(row.headersData, []));
    return {
        ...row,
        collection: row.collection || DEFAULT_COLLECTION,
        description: row.description || '',
        params: normalizeKeyValueList(safeJsonParse(row.params, [])),
        headersData,
        authType: row.authType || 'none',
        authData: safeJsonParse(row.authData, {}),
        bodyType: row.bodyType || 'none',
        body: row.body || '',
        headers: headersData.filter((item) => item.enabled && item.key).length,
        sortOrder: normalizeSortOrder(row.sortOrder)
    };
};

const runRowToModel = (row) => {
    if (!row) return null;
    return {
        ...row,
        responseHeaders: safeJsonParse(row.responseHeaders, {})
    };
};

const collectionRowToModel = (row) =>
    row
        ? {
              ...row,
              name: row.name || DEFAULT_COLLECTION,
              sortOrder: normalizeSortOrder(row.sortOrder)
          }
        : null;

/* ---------------------------- collections ---------------------------- */

// 历史数据里 endpoint.collection 可能是任意字符串，启动时补齐对应集合记录。
function syncCollectionsFromEndpoints() {
    const db = getDatabase();
    const rows = db.select().from(collections).all();
    const existing = new Set(rows.map((item) => String(item.name).toLowerCase()));
    const names = new Set([DEFAULT_COLLECTION]);
    for (const endpoint of db.select().from(endpoints).all()) {
        names.add(String(endpoint.collection || DEFAULT_COLLECTION));
    }
    const timestamp = now();
    let sortOrder = rows.reduce(
        (max, item) => Math.max(max, normalizeSortOrder(item.sortOrder, 0)),
        -1
    );
    for (const name of names) {
        if (!name || existing.has(name.toLowerCase())) continue;
        sortOrder += 1;
        db.insert(collections)
            .values({
                id: createId('collection'),
                name,
                sortOrder,
                createdAt: timestamp,
                updatedAt: timestamp
            })
            .run();
        existing.add(name.toLowerCase());
    }
}

export function listCollections() {
    syncCollectionsFromEndpoints();
    return getDatabase()
        .select()
        .from(collections)
        .orderBy(collections.sortOrder, collections.name)
        .all()
        .map(collectionRowToModel);
}

export function createCollection(payload = {}) {
    const timestamp = now();
    const existing = new Set(listCollections().map((item) => item.name.toLowerCase()));
    let name = String(payload.name || '').trim() || 'New collection';
    if (existing.has(name.toLowerCase())) name = `${name} copy`;
    const sortRows = getDatabase().select().from(collections).all();
    const maxSort = sortRows.reduce((max, item) => Math.max(max, normalizeSortOrder(item.sortOrder, 0)), 0);
    const collection = {
        id: payload.id || createId('collection'),
        name,
        sortOrder: normalizeSortOrder(payload.sortOrder, maxSort + 1),
        createdAt: timestamp,
        updatedAt: timestamp
    };
    getDatabase().insert(collections).values(collection).run();
    return collectionRowToModel(collection);
}

export function updateCollection(id, patch = {}) {
    const timestamp = now();
    const current = getDatabase().select().from(collections).where(eq(collections.id, id)).get();
    if (!current) return null;
    const nextName =
        patch.name !== undefined
            ? String(patch.name).trim() || current.name
            : current.name;
    getDatabase()
        .update(collections)
        .set({
            name: nextName,
            sortOrder:
                patch.sortOrder !== undefined
                    ? normalizeSortOrder(patch.sortOrder, current.sortOrder)
                    : current.sortOrder,
            updatedAt: timestamp
        })
        .where(eq(collections.id, id))
        .run();
    if (nextName !== current.name) {
        getDatabase()
            .update(endpoints)
            .set({ collection: nextName, updatedAt: timestamp })
            .where(eq(endpoints.collection, current.name))
            .run();
    }
    return collectionRowToModel(getDatabase().select().from(collections).where(eq(collections.id, id)).get());
}

export function removeCollection(id) {
    const current = getDatabase().select().from(collections).where(eq(collections.id, id)).get();
    if (!current) return false;
    getDatabase()
        .update(endpoints)
        .set({ collection: DEFAULT_COLLECTION, updatedAt: now() })
        .where(eq(endpoints.collection, current.name))
        .run();
    getDatabase().delete(collections).where(eq(collections.id, id)).run();
    return true;
}

/* ----------------------------- endpoints ----------------------------- */

export function listEndpoints() {
    return getDatabase()
        .select()
        .from(endpoints)
        .orderBy(endpoints.sortOrder, desc(endpoints.updatedAt))
        .all()
        .map(endpointRowToModel);
}

export function createEndpoint(payload = {}) {
    const timestamp = now();
    const rows = getDatabase().select().from(endpoints).all();
    const maxSort = rows.reduce((max, item) => Math.max(max, normalizeSortOrder(item.sortOrder, 0)), 0);
    const headersData = normalizeKeyValueList(payload.headersData || payload.headers || []);
    const endpoint = {
        id: payload.id || createId('endpoint'),
        name: String(payload.name || 'Untitled endpoint').trim() || 'Untitled endpoint',
        method: normalizeMethod(payload.method),
        url: String(payload.url || '').trim(),
        collection: String(payload.collection || DEFAULT_COLLECTION).trim() || DEFAULT_COLLECTION,
        description: String(payload.description || ''),
        params: serializeJson(normalizeKeyValueList(payload.params)),
        headersData: serializeJson(headersData),
        authType: String(payload.authType || 'none'),
        authData: serializeJson(payload.authData || {}),
        bodyType: String(payload.bodyType || 'none'),
        body: String(payload.body || ''),
        preRequestScript: String(payload.preRequestScript || ''),
        postResponseScript: String(payload.postResponseScript || ''),
        headers: headersData.filter((item) => item.enabled && item.key).length,
        sortOrder: normalizeSortOrder(payload.sortOrder, maxSort + 1),
        enabled: payload.enabled !== false,
        health: payload.health || 'healthy',
        latency: payload.latency ?? null,
        createdAt: timestamp,
        updatedAt: timestamp
    };
    getDatabase().insert(endpoints).values(endpoint).run();
    return endpointRowToModel(endpoint);
}

export function updateEndpoint(id, patch = {}) {
    const current = getDatabase().select().from(endpoints).where(eq(endpoints.id, id)).get();
    if (!current) return null;
    const timestamp = now();
    const next = {
        ...patch,
        updatedAt: timestamp
    };
    if (patch.params !== undefined) next.params = serializeJson(normalizeKeyValueList(patch.params));
    if (patch.headersData !== undefined) {
        const headersData = normalizeKeyValueList(patch.headersData);
        next.headersData = serializeJson(headersData);
        next.headers = headersData.filter((item) => item.enabled && item.key).length;
    }
    if (patch.authData !== undefined) next.authData = serializeJson(patch.authData || {});
    getDatabase().update(endpoints).set(next).where(eq(endpoints.id, id)).run();
    return endpointRowToModel(getDatabase().select().from(endpoints).where(eq(endpoints.id, id)).get());
}

export function duplicateEndpoint(id) {
    const current = endpointRowToModel(
        getDatabase().select().from(endpoints).where(eq(endpoints.id, id)).get()
    );
    if (!current) return null;
    const rows = getDatabase()
        .select()
        .from(endpoints)
        .where(eq(endpoints.collection, current.collection))
        .all();
    const maxSort = rows.reduce(
        (max, item) => Math.max(max, normalizeSortOrder(item.sortOrder, 0)),
        -1
    );
    const copyName = `${current.name} copy`;
    return createEndpoint({
        ...current,
        id: undefined,
        name: copyName,
        createdAt: undefined,
        updatedAt: undefined,
        sortOrder: maxSort + 1
    });
}

export function toggleEndpoint(id) {
    const current = getDatabase().select().from(endpoints).where(eq(endpoints.id, id)).get();
    if (!current) return null;
    return updateEndpoint(id, { enabled: !current.enabled });
}

export function moveEndpoint(id, collection) {
    const current = getDatabase().select().from(endpoints).where(eq(endpoints.id, id)).get();
    if (!current) return null;
    const target =
        String(collection || DEFAULT_COLLECTION).trim() || DEFAULT_COLLECTION;
    if (target === current.collection) return endpointRowToModel(current);
    const targetRows = getDatabase()
        .select()
        .from(endpoints)
        .where(eq(endpoints.collection, target))
        .all();
    const maxSort = targetRows.reduce(
        (max, item) => Math.max(max, normalizeSortOrder(item.sortOrder, 0)),
        -1
    );
    return updateEndpoint(id, { collection: target, sortOrder: maxSort + 1 });
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
    return rows.slice(0, limit).map(runRowToModel);
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
        mode: payload.mode || 'live',
        requestUrl: payload.requestUrl || payload.url || null,
        response: payload.response ?? null,
        responseHeaders: serializeJson(payload.responseHeaders || {}, '{}'),
        error: payload.error ?? null
    };
    getDatabase().insert(runs).values(run).run();
    if (run.endpointId) {
        getDatabase()
            .update(endpoints)
            .set({
                health:
                    run.status === 'success'
                        ? 'healthy'
                        : run.status === 'warning'
                          ? 'degraded'
                          : 'offline',
                latency: run.duration,
                updatedAt: now()
            })
            .where(eq(endpoints.id, run.endpointId))
            .run();
    }
    if (run.scheduleId) {
        getDatabase()
            .update(schedules)
            .set({ lastRun: run.startedAt, lastStatus: run.status, updatedAt: now() })
            .where(eq(schedules.id, run.scheduleId))
            .run();
    }
    return runRowToModel(run);
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

/* ------------------------ collection variables ----------------------- */

const VARIABLE_TYPES = ['text', 'blob'];

const normalizeVariableType = (value) =>
    VARIABLE_TYPES.includes(String(value || '').toLowerCase())
        ? String(value).toLowerCase()
        : 'text';

const collectionVariableRowToModel = (row) =>
    row
        ? {
              id: row.id,
              collection: row.collection || DEFAULT_COLLECTION,
              key: row.key || '',
              value: row.value ?? '',
              type: normalizeVariableType(row.type),
              hidden: row.hidden === true,
              enabled: row.enabled !== false,
              description: row.description || '',
              sortOrder: normalizeSortOrder(row.sortOrder),
              createdAt: row.createdAt,
              updatedAt: row.updatedAt
          }
        : null;

export function listCollectionVariables(collection = null) {
    const query = getDatabase().select().from(collectionVariables);
    const rows = collection
        ? query.where(eq(collectionVariables.collection, String(collection))).all()
        : query.all();
    return rows
        .sort((left, right) => {
            const nameCompare = String(left.collection).localeCompare(String(right.collection));
            if (nameCompare !== 0) return nameCompare;
            return normalizeSortOrder(left.sortOrder, 0) - normalizeSortOrder(right.sortOrder, 0);
        })
        .map(collectionVariableRowToModel);
}

export function createCollectionVariable(payload = {}) {
    const timestamp = now();
    const collection =
        String(payload.collection || DEFAULT_COLLECTION).trim() || DEFAULT_COLLECTION;
    const rows = getDatabase()
        .select()
        .from(collectionVariables)
        .where(eq(collectionVariables.collection, collection))
        .all();
    const maxSort = rows.reduce(
        (max, item) => Math.max(max, normalizeSortOrder(item.sortOrder, 0)),
        -1
    );
    const variable = {
        id: payload.id || createId('variable'),
        collection,
        key: String(payload.key || '').trim(),
        value: String(payload.value ?? ''),
        type: normalizeVariableType(payload.type),
        hidden: payload.hidden === true,
        enabled: payload.enabled !== false,
        description: String(payload.description || ''),
        sortOrder: normalizeSortOrder(payload.sortOrder, maxSort + 1),
        createdAt: timestamp,
        updatedAt: timestamp
    };
    getDatabase().insert(collectionVariables).values(variable).run();
    return collectionVariableRowToModel(variable);
}

export function updateCollectionVariable(id, patch = {}) {
    const current = getDatabase()
        .select()
        .from(collectionVariables)
        .where(eq(collectionVariables.id, id))
        .get();
    if (!current) return null;
    const next = { ...patch, updatedAt: now() };
    if (patch.collection !== undefined) {
        next.collection = String(patch.collection || DEFAULT_COLLECTION).trim() || DEFAULT_COLLECTION;
    }
    if (patch.key !== undefined) next.key = String(patch.key || '').trim();
    if (patch.value !== undefined) next.value = String(patch.value ?? '');
    if (patch.type !== undefined) next.type = normalizeVariableType(patch.type);
    if (patch.hidden !== undefined) next.hidden = patch.hidden === true;
    if (patch.enabled !== undefined) next.enabled = patch.enabled !== false;
    if (patch.description !== undefined) next.description = String(patch.description || '');
    if (patch.sortOrder !== undefined) next.sortOrder = normalizeSortOrder(patch.sortOrder, current.sortOrder);
    getDatabase().update(collectionVariables).set(next).where(eq(collectionVariables.id, id)).run();
    return collectionVariableRowToModel(
        getDatabase().select().from(collectionVariables).where(eq(collectionVariables.id, id)).get()
    );
}

export function removeCollectionVariable(id) {
    getDatabase().delete(collectionVariables).where(eq(collectionVariables.id, id)).run();
    return true;
}

// 批量覆盖某个集合的变量列表，用于变量管理页面整体保存与沙箱写回。
export function replaceCollectionVariables(collection, variables = []) {
    const target = String(collection || DEFAULT_COLLECTION).trim() || DEFAULT_COLLECTION;
    const timestamp = now();
    getDatabase().delete(collectionVariables).where(eq(collectionVariables.collection, target)).run();
    const list = Array.isArray(variables) ? variables : [];
    list.forEach((item, index) => {
        const variable = {
            id: item?.id || createId('variable'),
            collection: target,
            key: String(item?.key || '').trim(),
            value: String(item?.value ?? ''),
            type: normalizeVariableType(item?.type),
            hidden: item?.hidden === true,
            enabled: item?.enabled !== false,
            description: String(item?.description || ''),
            sortOrder: normalizeSortOrder(item?.sortOrder, index),
            createdAt: item?.createdAt || timestamp,
            updatedAt: timestamp
        };
        getDatabase().insert(collectionVariables).values(variable).run();
    });
    return listCollectionVariables(target);
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
            headersData: [{ id: 'accept', key: 'Accept', value: 'application/json', enabled: true }],
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
            headersData: [
                { id: 'accept', key: 'Accept', value: 'application/json', enabled: true },
                { id: 'ctype', key: 'Content-Type', value: 'application/json', enabled: true }
            ],
            bodyType: 'json',
            body: '{\n  "ping": true\n}',
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
    getDatabase().delete(collections).run();
    seedDemoData();
}

export const workspaceRepository = {
    listCollections,
    createCollection,
    updateCollection,
    removeCollection,
    listEndpoints,
    createEndpoint,
    updateEndpoint,
    duplicateEndpoint,
    toggleEndpoint,
    moveEndpoint,
    removeEndpoint,
    listSchedules,
    createSchedule,
    updateSchedule,
    toggleSchedule,
    removeSchedule,
    listRuns,
    createRun,
    pruneRuns,
    listCollectionVariables,
    createCollectionVariable,
    updateCollectionVariable,
    removeCollectionVariable,
    replaceCollectionVariables,
    getSetting,
    setSetting,
    getSettings,
    setSettings,
    seedDemoData,
    resetDemoData
};