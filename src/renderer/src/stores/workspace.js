import { defineStore } from 'pinia';

const DEFAULT_COLLECTION = 'Default collection';
const now = () => new Date().toISOString();

const createId = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const createKeyValueRow = (item = {}) => ({
    id: item.id || createId('row'),
    key: String(item.key ?? ''),
    value: String(item.value ?? ''),
    enabled: item.enabled !== false,
    hide: item.hide === true
});

const normalizeKeyValueList = (value) =>
    Array.isArray(value) ? value.map(createKeyValueRow) : [];

const normalizeEndpoint = (endpoint = {}) => {
    const headersData = normalizeKeyValueList(
        endpoint.headersData || endpoint.headers || []
    );
    return {
        id: endpoint.id || createId('endpoint'),
        name: endpoint.name || 'Untitled endpoint',
        method: String(endpoint.method || 'GET').toUpperCase(),
        url: endpoint.url || '',
        collection: endpoint.collection || DEFAULT_COLLECTION,
        description: endpoint.description || '',
        params: normalizeKeyValueList(endpoint.params),
        headersData,
        authType: endpoint.authType || 'none',
        authData:
            endpoint.authData && typeof endpoint.authData === 'object'
                ? { ...endpoint.authData }
                : {},
        bodyType: endpoint.bodyType || 'none',
        body: endpoint.body || '',
        preRequestScript: endpoint.preRequestScript || '',
        postResponseScript: endpoint.postResponseScript || '',
        headers: headersData.filter((item) => item.enabled && item.key).length,
        sortOrder: Number(endpoint.sortOrder) || 0,
        enabled: endpoint.enabled !== false,
        health: endpoint.health || 'healthy',
        latency: endpoint.latency ?? null,
        createdAt: endpoint.createdAt || now(),
        updatedAt: endpoint.updatedAt || now()
    };
};

const normalizeCollection = (collection = {}) => ({
    id: collection.id || createId('collection'),
    name: collection.name || DEFAULT_COLLECTION,
    emoji: String(collection.emoji ?? ''),
    sortOrder: Number(collection.sortOrder) || 0,
    createdAt: collection.createdAt || now(),
    updatedAt: collection.updatedAt || now()
});

const normalizeVariable = (variable = {}) => ({
    id: variable.id || createId('variable'),
    collection: variable.collection || DEFAULT_COLLECTION,
    key: String(variable.key ?? ''),
    value: String(variable.value ?? ''),
    type: variable.type === 'blob' ? 'blob' : 'text',
    hidden: variable.hidden === true,
    enabled: variable.enabled !== false,
    description: String(variable.description ?? ''),
    sortOrder: Number(variable.sortOrder) || 0,
    createdAt: variable.createdAt || now(),
    updatedAt: variable.updatedAt || now()
});

const normalizeRun = (run = {}) => ({
    ...run,
    statusCode: run.statusCode ?? null,
    duration: run.duration ?? null,
    mode: run.mode || 'live'
});

// Vue/Pinia 的响应式 Proxy 不能直接通过 Electron IPC 的结构化克隆。
// 发送 IPC 前统一转成普通 JSON 数据，避免 An object could not be cloned。
const toPlain = (value) => {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
};

const resolveWorkspaceApi = () => {
    if (typeof window === 'undefined') return null;

    const api = window.api;
    if (api?.workspace?.endpoints?.list) return api.workspace;

    const ipcRenderer = window.electron?.ipcRenderer;
    if (ipcRenderer) {
        return {
            collections: {
                list: () => ipcRenderer.invoke('workspace:collections:list'),
                create: (payload) =>
                    ipcRenderer.invoke('workspace:collections:create', payload),
                update: (id, patch) =>
                    ipcRenderer.invoke('workspace:collections:update', id, patch),
                remove: (id) =>
                    ipcRenderer.invoke('workspace:collections:remove', id)
            },
            endpoints: {
                list: () => ipcRenderer.invoke('workspace:endpoints:list'),
                create: (payload) =>
                    ipcRenderer.invoke('workspace:endpoints:create', payload),
                update: (id, patch) =>
                    ipcRenderer.invoke('workspace:endpoints:update', id, patch),
                duplicate: (id) =>
                    ipcRenderer.invoke('workspace:endpoints:duplicate', id),
                toggle: (id) =>
                    ipcRenderer.invoke('workspace:endpoints:toggle', id),
                move: (id, collection) =>
                    ipcRenderer.invoke('workspace:endpoints:move', id, collection),
                remove: (id) =>
                    ipcRenderer.invoke('workspace:endpoints:remove', id),
                send: (id, payload) =>
                    ipcRenderer.invoke('workspace:endpoints:send', id, payload),
                runScript: (payload) =>
                    ipcRenderer.invoke('workspace:endpoints:runScript', payload)
            },
            schedules: {
                list: () => ipcRenderer.invoke('workspace:schedules:list'),
                create: (payload) =>
                    ipcRenderer.invoke('workspace:schedules:create', payload),
                update: (id, patch) =>
                    ipcRenderer.invoke('workspace:schedules:update', id, patch),
                toggle: (id) =>
                    ipcRenderer.invoke('workspace:schedules:toggle', id),
                remove: (id) =>
                    ipcRenderer.invoke('workspace:schedules:remove', id)
            },
            runs: {
                list: (query) => ipcRenderer.invoke('workspace:runs:list', query),
                create: (payload) =>
                    ipcRenderer.invoke('workspace:runs:create', payload),
                prune: (days) => ipcRenderer.invoke('workspace:runs:prune', days)
            },
            variables: {
                list: (collection) =>
                    ipcRenderer.invoke('workspace:variables:list', collection),
                create: (payload) =>
                    ipcRenderer.invoke('workspace:variables:create', payload),
                update: (id, patch) =>
                    ipcRenderer.invoke('workspace:variables:update', id, patch),
                remove: (id) =>
                    ipcRenderer.invoke('workspace:variables:remove', id),
                replace: (collection, variables) =>
                    ipcRenderer.invoke(
                        'workspace:variables:replace',
                        collection,
                        variables
                    )
            }
        };
    }

    return null;
};

const workspaceApiUnavailable = () => ({
    ok: false,
    code: 'WORKSPACE_API_UNAVAILABLE',
    message: 'Workspace IPC API is not available.'
});

export const useWorkspaceStore = defineStore('workspace', {
    state: () => ({
        collections: [],
        endpoints: [],
        schedules: [],
        runs: [],
        collectionVariables: [],
        loaded: false,
        loading: false,
        error: ''
    }),
    getters: {
        endpointById: (state) =>
            Object.fromEntries(
                state.endpoints.map((endpoint) => [endpoint.id, endpoint])
            ),
        scheduleById: (state) =>
            Object.fromEntries(
                state.schedules.map((schedule) => [schedule.id, schedule])
            ),
        variablesByCollection: (state) => {
            const groups = {};
            for (const item of state.collectionVariables) {
                const name = item.collection || DEFAULT_COLLECTION;
                if (!groups[name]) groups[name] = [];
                groups[name].push(item);
            }
            return groups;
        },
        collectionByName: (state) =>
            Object.fromEntries(
                state.collections.map((collection) => [
                    collection.name,
                    collection
                ])
            ),
        collectionGroups: (state) => {
            const groups = state.collections.map((collection) => ({
                ...collection,
                endpoints: state.endpoints.filter(
                    (endpoint) => endpoint.collection === collection.name
                )
            }));
            const knownNames = new Set(groups.map((group) => group.name));
            const orphanEndpoints = state.endpoints.filter(
                (endpoint) => !knownNames.has(endpoint.collection)
            );
            if (orphanEndpoints.length) {
                groups.push({
                    id: 'collection-orphans',
                    name: DEFAULT_COLLECTION,
                    sortOrder: 9999,
                    endpoints: orphanEndpoints
                });
            }
            return groups;
        },
        activeSchedules: (state) =>
            state.schedules.filter((schedule) => schedule.enabled).length,
        healthyEndpoints: (state) =>
            state.endpoints.filter((endpoint) => endpoint.health === 'healthy')
                .length,
        successRate: (state) => {
            if (!state.runs.length) return 0;
            const successCount = state.runs.filter(
                (run) => run.status === 'success'
            ).length;
            return Math.round((successCount / state.runs.length) * 100);
        },
        averageLatency: (state) => {
            const values = state.runs
                .map((run) => Number(run.duration))
                .filter((value) => Number.isFinite(value));
            if (!values.length) return 0;
            return Math.round(
                values.reduce((total, value) => total + value, 0) /
                    values.length
            );
        }
    },
    actions: {
        async initialize() {
            if (this.loaded || this.loading) return;
            await this.loadWorkspace();
        },
        async loadWorkspace() {
            const api = resolveWorkspaceApi();
            if (!api) {
                this.error = workspaceApiUnavailable().message;
                return workspaceApiUnavailable();
            }

            this.loading = true;
            this.error = '';
            try {
                const [collections, endpoints, schedules, runs, variables] =
                    await Promise.all([
                        api.collections.list(),
                        api.endpoints.list(),
                        api.schedules.list(),
                        api.runs.list({ limit: 200 }),
                        api.variables?.list
                            ? api.variables.list()
                            : Promise.resolve([])
                    ]);
                this.collections = (collections || []).map(normalizeCollection);
                this.endpoints = (endpoints || []).map(normalizeEndpoint);
                this.schedules = schedules || [];
                this.runs = (runs || []).map(normalizeRun);
                this.collectionVariables = (variables || []).map(normalizeVariable);
                this.loaded = true;
                return { ok: true };
            } catch (error) {
                this.error = error?.message || String(error);
                return {
                    ok: false,
                    code: error?.code || 'WORKSPACE_LOAD_FAILED',
                    message: this.error
                };
            } finally {
                this.loading = false;
            }
        },
        async addEndpoint(payload = {}) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            try {
                const endpoint = normalizeEndpoint(
                    await api.endpoints.create(
                        toPlain({
                            ...payload,
                            collection: payload.collection || DEFAULT_COLLECTION
                        })
                    )
                );
                this.endpoints.unshift(endpoint);
                return { ok: true, endpoint };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'ENDPOINT_CREATE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async updateEndpoint(id, patch = {}) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            try {
                const endpoint = normalizeEndpoint(
                    await api.endpoints.update(id, toPlain(patch))
                );
                const index = this.endpoints.findIndex((item) => item.id === id);
                if (index >= 0) this.endpoints.splice(index, 1, endpoint);
                return { ok: true, endpoint };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'ENDPOINT_UPDATE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async duplicateEndpoint(id) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            try {
                const endpoint = normalizeEndpoint(
                    await api.endpoints.duplicate(id)
                );
                this.endpoints.unshift(endpoint);
                return { ok: true, endpoint };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'ENDPOINT_DUPLICATE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async toggleEndpoint(id) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            try {
                const endpoint = normalizeEndpoint(
                    await api.endpoints.toggle(id)
                );
                const index = this.endpoints.findIndex((item) => item.id === id);
                if (index >= 0) this.endpoints.splice(index, 1, endpoint);
                return { ok: true, endpoint };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'ENDPOINT_TOGGLE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async moveEndpoint(id, collection) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            try {
                const endpoint = normalizeEndpoint(
                    await api.endpoints.move(id, collection || DEFAULT_COLLECTION)
                );
                const index = this.endpoints.findIndex((item) => item.id === id);
                if (index >= 0) this.endpoints.splice(index, 1, endpoint);
                return { ok: true, endpoint };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'ENDPOINT_MOVE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async removeEndpoint(id) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            try {
                await api.endpoints.remove(id);
                this.endpoints = this.endpoints.filter((item) => item.id !== id);
                this.runs = this.runs.filter((run) => run.endpointId !== id);
                return { ok: true };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'ENDPOINT_REMOVE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async addCollection(payload = {}) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            try {
                const collection = normalizeCollection(
                    await api.collections.create(toPlain(payload))
                );
                this.collections.push(collection);
                return { ok: true, collection };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'COLLECTION_CREATE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async updateCollection(id, patch = {}) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            const current = this.collections.find((item) => item.id === id);
            const previousName = current?.name;
            try {
                const collection = normalizeCollection(
                    await api.collections.update(
                        id,
                        toPlain({ name: patch.name, emoji: patch.emoji })
                    )
                );
                const index = this.collections.findIndex(
                    (item) => item.id === id
                );
                if (index >= 0) this.collections.splice(index, 1, collection);
                if (previousName && previousName !== collection.name) {
                    this.endpoints = this.endpoints.map((endpoint) =>
                        endpoint.collection === previousName
                            ? { ...endpoint, collection: collection.name }
                            : endpoint
                    );
                }
                return { ok: true, collection };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'COLLECTION_UPDATE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async removeCollection(id) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            const current = this.collections.find((item) => item.id === id);
            try {
                await api.collections.remove(id);
                this.collections = this.collections.filter(
                    (item) => item.id !== id
                );
                if (current?.name && current.name !== DEFAULT_COLLECTION) {
                    this.endpoints = this.endpoints.map((endpoint) =>
                        endpoint.collection === current.name
                            ? { ...endpoint, collection: DEFAULT_COLLECTION }
                            : endpoint
                    );
                }
                return { ok: true };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'COLLECTION_REMOVE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async runEndpoint(endpointId, payload = {}, scheduleId = null, triggeredBy = 'manual') {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            const endpoint = this.endpointById[endpointId];
            if (!endpoint) {
                return {
                    ok: false,
                    code: 'ENDPOINT_NOT_FOUND',
                    message: 'Endpoint not found.'
                };
            }
            try {
                const { result, run } = await api.endpoints.send(
                    endpointId,
                    toPlain({
                        ...endpoint,
                        ...payload,
                        scheduleId: scheduleId || null,
                        triggeredBy
                    })
                );
                const normalizedRun = normalizeRun(run);
                this.runs.unshift(normalizedRun);
                const index = this.endpoints.findIndex(
                    (item) => item.id === endpointId
                );
                if (index >= 0) {
                    this.endpoints.splice(index, 1, {
                        ...this.endpoints[index],
                        health:
                            normalizedRun.status === 'success'
                                ? 'healthy'
                                : normalizedRun.status === 'warning'
                                  ? 'degraded'
                                  : 'offline',
                        latency: normalizedRun.duration,
                        updatedAt: normalizedRun.startedAt
                    });
                }
                if (scheduleId && this.scheduleById[scheduleId]) {
                    const schedule = this.scheduleById[scheduleId];
                    schedule.lastRun = normalizedRun.startedAt;
                    schedule.lastStatus = normalizedRun.status;
                }
                // 请求前后脚本可能改写了集合变量，发送完成后刷新一次。
                await this.refreshVariables();
                return { ok: true, result, run: normalizedRun };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'ENDPOINT_SEND_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async addSchedule(payload = {}) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            try {
                const schedule = await api.schedules.create(toPlain(payload));
                this.schedules.unshift(schedule);
                return { ok: true, schedule };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'SCHEDULE_CREATE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async toggleSchedule(id) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            try {
                const schedule = await api.schedules.toggle(id);
                const index = this.schedules.findIndex(
                    (item) => item.id === id
                );
                if (index >= 0) this.schedules.splice(index, 1, schedule);
                return { ok: true, schedule };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'SCHEDULE_TOGGLE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async refreshRuns(query = { limit: 200 }) {
            const api = resolveWorkspaceApi();
            if (!api) return workspaceApiUnavailable();
            try {
                this.runs = (await api.runs.list(query)).map(normalizeRun);
                return { ok: true };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'RUNS_LOAD_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async refreshVariables(collection = null) {
            const api = resolveWorkspaceApi();
            if (!api?.variables?.list) return workspaceApiUnavailable();
            try {
                const rows = await api.variables.list(collection || undefined);
                const normalized = (rows || []).map(normalizeVariable);
                if (collection) {
                    const others = this.collectionVariables.filter(
                        (item) => item.collection !== collection
                    );
                    this.collectionVariables = [...others, ...normalized];
                } else {
                    this.collectionVariables = normalized;
                }
                return { ok: true, variables: normalized };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'VARIABLES_LOAD_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async saveVariables(collection, variables = []) {
            const api = resolveWorkspaceApi();
            if (!api?.variables?.replace) return workspaceApiUnavailable();
            try {
                const rows = await api.variables.replace(
                    collection,
                    toPlain(variables)
                );
                const normalized = (rows || []).map(normalizeVariable);
                const others = this.collectionVariables.filter(
                    (item) => item.collection !== collection
                );
                this.collectionVariables = [...others, ...normalized];
                return { ok: true, variables: normalized };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'VARIABLES_SAVE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async addVariable(payload = {}) {
            const api = resolveWorkspaceApi();
            if (!api?.variables?.create) return workspaceApiUnavailable();
            try {
                const variable = normalizeVariable(
                    await api.variables.create(toPlain(payload))
                );
                this.collectionVariables.push(variable);
                return { ok: true, variable };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'VARIABLE_CREATE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async updateVariable(id, patch = {}) {
            const api = resolveWorkspaceApi();
            if (!api?.variables?.update) return workspaceApiUnavailable();
            try {
                const variable = normalizeVariable(
                    await api.variables.update(id, toPlain(patch))
                );
                const index = this.collectionVariables.findIndex(
                    (item) => item.id === id
                );
                if (index >= 0) this.collectionVariables.splice(index, 1, variable);
                return { ok: true, variable };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'VARIABLE_UPDATE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async removeVariable(id) {
            const api = resolveWorkspaceApi();
            if (!api?.variables?.remove) return workspaceApiUnavailable();
            try {
                await api.variables.remove(id);
                this.collectionVariables = this.collectionVariables.filter(
                    (item) => item.id !== id
                );
                return { ok: true };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'VARIABLE_REMOVE_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async runEndpointScript({ script, phase = 'prerequest', environment = {}, request = null, response = null, collectionVariables = {} } = {}) {
            const api = resolveWorkspaceApi();
            if (!api?.endpoints?.runScript) return workspaceApiUnavailable();
            try {
                const result = await api.endpoints.runScript(
                    toPlain({
                        script,
                        phase,
                        environment,
                        request,
                        response,
                        collectionVariables
                    })
                );
                return { ok: true, result };
            } catch (error) {
                return {
                    ok: false,
                    code: error?.code || 'SCRIPT_RUN_FAILED',
                    message: error?.message || String(error)
                };
            }
        },
        async resetDemoData() {
            const api = resolveWorkspaceApi();
            if (!api?.resetDemoData) return workspaceApiUnavailable();
            await api.resetDemoData();
            this.loaded = false;
            return this.loadWorkspace();
        }
    }
});