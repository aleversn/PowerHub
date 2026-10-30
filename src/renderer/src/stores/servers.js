import { defineStore } from 'pinia';

const STORAGE_KEY = 'powerhub.servers.v3';
const HISTORY_POINTS = 24;
const DEFAULT_POLL_SECONDS = 10;
const now = () => new Date().toISOString();

const createId = (address) => {
    const slug = String(address || 'server')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 36);
    return `server-${slug || Date.now().toString(36)}-${Date.now().toString(36)}`;
};

const clampMetric = (value) => Math.min(Math.max(Math.round(Number(value) || 0), 0), 100);
const clampTraffic = (value) => Math.max(Number(Number(value || 0).toFixed(1)), 0);
const clampBytes = (value) => Math.max(Number(value) || 0, 0);

const createEmptyMetrics = () => ({
    load1: 0,
    load5: 0,
    load15: 0,
    cores: 1,
    cpu: 0,
    memory: 0,
    swap: 0,
    swapTotal: 0,
    disk: 0,
    temperature: null,
    netInRate: 0,
    netOutRate: 0,
    diskReadRate: 0,
    diskWriteRate: 0,
    netInTotal: 0,
    netOutTotal: 0,
    diskReadTotal: 0,
    diskWriteTotal: 0,
    collectedAt: ''
});

const createHistory = (metrics = createEmptyMetrics()) => ({
    load: Array.from({ length: HISTORY_POINTS }, () => clampMetric(metrics.load1)),
    cpu: Array.from({ length: HISTORY_POINTS }, () => clampMetric(metrics.cpu)),
    memory: Array.from({ length: HISTORY_POINTS }, () => clampMetric(metrics.memory)),
    swap: Array.from({ length: HISTORY_POINTS }, () => clampMetric(metrics.swap)),
    disk: Array.from({ length: HISTORY_POINTS }, () => clampMetric(metrics.disk)),
    trafficIn: Array.from({ length: HISTORY_POINTS }, () => clampTraffic(metrics.netInRate)),
    trafficOut: Array.from({ length: HISTORY_POINTS }, () => clampTraffic(metrics.netOutRate))
});

const normalizeMetrics = (metrics = {}) => ({
    load1: clampMetric(metrics.load1 ?? metrics.load),
    load5: clampMetric(metrics.load5 ?? metrics.load),
    load15: clampMetric(metrics.load15 ?? metrics.load),
    cores: Math.max(Number(metrics.cores) || 1, 1),
    cpu: clampMetric(metrics.cpu),
    memory: clampMetric(metrics.memory),
    swap: clampMetric(metrics.swap),
    swapTotal: clampBytes(metrics.swapTotal),
    disk: clampMetric(metrics.disk),
    temperature:
        Number.isFinite(Number(metrics.temperature)) && Number(metrics.temperature) > 0
            ? Math.round(Number(metrics.temperature) * 10) / 10
            : null,
    netInRate: clampBytes(metrics.netInRate),
    netOutRate: clampBytes(metrics.netOutRate),
    diskReadRate: clampBytes(metrics.diskReadRate),
    diskWriteRate: clampBytes(metrics.diskWriteRate),
    netInTotal: clampBytes(metrics.netInTotal),
    netOutTotal: clampBytes(metrics.netOutTotal),
    diskReadTotal: clampBytes(metrics.diskReadTotal),
    diskWriteTotal: clampBytes(metrics.diskWriteTotal),
    collectedAt: metrics.collectedAt || ''
});

const appendHistory = (history = {}, metrics = createEmptyMetrics()) => ({
    load: [...(history.load || []).slice(1), metrics.load1],
    cpu: [...(history.cpu || []).slice(1), metrics.cpu],
    memory: [...(history.memory || []).slice(1), metrics.memory],
    swap: [...(history.swap || []).slice(1), metrics.swap],
    disk: [...(history.disk || []).slice(1), metrics.disk],
    trafficIn: [...(history.trafficIn || []).slice(1), metrics.netInRate],
    trafficOut: [...(history.trafficOut || []).slice(1), metrics.netOutRate]
});

const schemaError = (message) => ({
    ok: false,
    code: 'SCHEMA',
    message
});

const resolveServersApi = () => {
    if (typeof window === 'undefined') return null;

    const api = window.api;
    if (api?.servers?.test && api?.servers?.metrics) return api.servers;
    if (api?.workspace?.servers?.test && api?.workspace?.servers?.metrics) {
        return api.workspace.servers;
    }

    // 最后兜底：preload 未注入 api 时，直接用 electron 暴露的 ipcRenderer。
    const ipcRenderer = window.electron?.ipcRenderer;
    if (ipcRenderer) {
        return {
            test: (server) => ipcRenderer.invoke('workspace:servers:test', server),
            metrics: (server) => ipcRenderer.invoke('workspace:servers:metrics', server)
        };
    }

    return null;
};

const ipcError = (error) => ({
    ok: false,
    code: error?.code || 'SSH_ERROR',
    message: error?.message || String(error || 'SSH operation failed.')
});

const normalizeServer = (server = {}, index = 0) => {
    const metrics = normalizeMetrics(server.metrics);
    const address = server.address || server.host || server.ip || '127.0.0.1';

    return {
        id: server.id || createId(address),
        name: server.name || `Server ${index + 1}`,
        address,
        port: Number(server.port) || 22,
        username: server.username || 'root',
        password: server.password || '',
        status: server.status || 'offline',
        enabled: server.enabled !== false,
        uptimeDays: Number(server.uptimeDays) || 0,
        lastSeen: server.lastSeen || '',
        error: server.error || '',
        metrics,
        history: {
            ...createHistory(metrics),
            ...(server.history && typeof server.history === 'object' ? server.history : {})
        }
    };
};

const readServers = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((server, index) => normalizeServer(server, index));
    } catch {
        return [];
    }
};

const persistServers = (servers) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
    } catch {
        // Local persistence is best effort in restricted renderer contexts.
    }
};

export const useServerStore = defineStore('servers', {
    state: () => ({
        servers: readServers(),
        lastRefreshed: now(),
        loadingServerIds: [],
        pollSeconds: DEFAULT_POLL_SECONDS,
        autoRefresh: true,
        pollTimer: null
    }),
    getters: {
        serverById: (state) =>
            Object.fromEntries(state.servers.map((server) => [server.id, server])),
        connectedServers: (state) =>
            state.servers.filter(
                (server) => server.enabled && server.status === 'connected'
            ).length,
        enabledServers: (state) =>
            state.servers.filter((server) => server.enabled).length,
        averageLoad: (state) => {
            const values = state.servers
                .filter((server) => server.enabled)
                .map((server) => Number(server.metrics.load1));
            if (!values.length) return 0;
            return Math.round(
                values.reduce((total, value) => total + value, 0) / values.length
            );
        },
        averageMemory: (state) => {
            const values = state.servers
                .filter((server) => server.enabled)
                .map((server) => Number(server.metrics.memory));
            if (!values.length) return 0;
            return Math.round(
                values.reduce((total, value) => total + value, 0) / values.length
            );
        },
        averageDisk: (state) => {
            const values = state.servers
                .filter((server) => server.enabled)
                .map((server) => Number(server.metrics.disk));
            if (!values.length) return 0;
            return Math.round(
                values.reduce((total, value) => total + value, 0) / values.length
            );
        },
        averageTemperature: (state) => {
            const values = state.servers
                .filter((server) => server.enabled)
                .map((server) => Number(server.metrics.temperature))
                .filter((value) => Number.isFinite(value) && value > 0);
            if (!values.length) return null;
            return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
        }
    },
    actions: {
        persist() {
            persistServers(this.servers);
        },
        isServerLoading(id) {
            return this.loadingServerIds.includes(id);
        },
        setServerLoading(id, loading) {
            const next = new Set(this.loadingServerIds);
            if (loading) next.add(id);
            else next.delete(id);
            this.loadingServerIds = Array.from(next);
        },
        validateServerPayload(payload = {}) {
            if (!String(payload.address || '').trim()) {
                return schemaError('Server address is required.');
            }
            if (!String(payload.username || '').trim()) {
                return schemaError('SSH username is required.');
            }
            if (!String(payload.password || '')) {
                return schemaError('SSH password is required.');
            }
            if (!Number.isFinite(Number(payload.port)) || Number(payload.port) <= 0) {
                return schemaError('SSH port must be a positive number.');
            }
            return { ok: true };
        },
        async testServer(server) {
            const validation = this.validateServerPayload(server);
            if (!validation.ok) return validation;
            const serversApi = resolveServersApi();
            if (!serversApi) {
                const api = typeof window !== 'undefined' ? window.api : null;
                const keys = api ? Object.keys(api).join(', ') : 'window.api is undefined';
                return schemaError(`Server IPC API is not available. Available api keys: ${keys}`);
            }
            try {
                return await serversApi.test({
                    address: server.address,
                    port: Number(server.port) || 22,
                    username: server.username,
                    password: server.password
                });
            } catch (error) {
                return ipcError(error);
            }
        },
        async collectServer(server) {
            const validation = this.validateServerPayload(server);
            if (!validation.ok) return validation;
            const serversApi = resolveServersApi();
            if (!serversApi) {
                const api = typeof window !== 'undefined' ? window.api : null;
                const keys = api ? Object.keys(api).join(', ') : 'window.api is undefined';
                return schemaError(`Server IPC API is not available. Available api keys: ${keys}`);
            }
            try {
                return await serversApi.metrics({
                    address: server.address,
                    port: Number(server.port) || 22,
                    username: server.username,
                    password: server.password
                });
            } catch (error) {
                return ipcError(error);
            }
        },
        applyMetricSnapshot(server, result = {}) {
            const incoming = result.metrics || {};
            const previous = server.metrics || createEmptyMetrics();
            const collectedAt = new Date().toISOString();
            const previousAt = previous.collectedAt ? Date.parse(previous.collectedAt) : 0;
            const elapsed = previousAt ? (Date.parse(collectedAt) - previousAt) / 1000 : 0;

            const rate = (next, last) => {
                if (!elapsed || elapsed <= 0 || elapsed > 3600) return 0;
                return clampBytes((Number(next) - Number(last)) / elapsed);
            };

            const metrics = normalizeMetrics({
                ...incoming,
                netInRate: rate(incoming.netInTotal, previous.netInTotal),
                netOutRate: rate(incoming.netOutTotal, previous.netOutTotal),
                diskReadRate: rate(incoming.diskReadTotal, previous.diskReadTotal),
                diskWriteRate: rate(incoming.diskWriteTotal, previous.diskWriteTotal),
                collectedAt
            });

            server.metrics = metrics;
            server.history = appendHistory(server.history, metrics);
            server.uptimeDays = Math.floor((result.uptimeSeconds || 0) / 86400);
            server.lastSeen = collectedAt;
            server.status =
                metrics.memory > 88 || metrics.disk > 92 || metrics.cpu > 92 || metrics.swap > 90
                    ? 'warning'
                    : 'connected';
            server.error = '';
            return metrics;
        },
        startAutoRefresh() {
            if (typeof window === 'undefined') return;
            if (this.autoRefresh === false) return;
            if (this.pollTimer) return;
            this.autoRefresh = true;
            this.pollSeconds = Math.max(5, Number(this.pollSeconds) || DEFAULT_POLL_SECONDS);
            this.pollTimer = window.setInterval(() => {
                if (typeof document !== 'undefined' && document.hidden) return;
                this.refreshAll();
            }, this.pollSeconds * 1000);
        },
        stopAutoRefresh() {
            if (this.pollTimer && typeof window !== 'undefined') {
                window.clearInterval(this.pollTimer);
            }
            this.pollTimer = null;
        },
        setAutoRefresh(enabled) {
            this.autoRefresh = enabled !== false;
            this.stopAutoRefresh();
            if (this.autoRefresh) this.startAutoRefresh();
        },
        setPollSeconds(seconds) {
            const value = Math.max(5, Number(seconds) || DEFAULT_POLL_SECONDS);
            this.pollSeconds = value;
            this.stopAutoRefresh();
            this.startAutoRefresh();
        },
        async addServer(payload = {}) {
            const validation = this.validateServerPayload(payload);
            if (!validation.ok) return validation;

            const server = normalizeServer({
                id: createId(payload.address),
                name: payload.name || payload.address,
                address: payload.address,
                port: payload.port,
                username: payload.username,
                password: payload.password,
                status: 'offline',
                enabled: payload.enabled !== false,
                lastSeen: '',
                metrics: createEmptyMetrics(),
                history: createHistory(createEmptyMetrics())
            });

            const testResult = await this.testServer(server);
            if (!testResult.ok) return testResult;

            server.status = 'connected';
            server.lastSeen = now();

            if (server.enabled) {
                const metricsResult = await this.collectServer(server);
                if (metricsResult.ok) {
                    this.applyMetricSnapshot(server, metricsResult);
                }
            }

            this.servers.unshift(server);
            this.lastRefreshed = now();
            this.persist();
            return { ok: true, server };
        },
        async updateServer(id, patch = {}) {
            const server = this.serverById[id];
            if (!server) return schemaError('Server not found.');

            const next = {
                ...server,
                ...patch,
                port: Number(patch.port ?? server.port) || 22
            };
            const validation = this.validateServerPayload(next);
            if (!validation.ok) return validation;

            const testResult = await this.testServer(next);
            if (!testResult.ok) return testResult;

            Object.assign(server, patch);
            server.port = Number(server.port) || 22;
            server.address = String(server.address || '').trim();
            server.username = String(server.username || '').trim();
            server.password = String(server.password || '');
            server.name = String(server.name || server.address).trim();
            server.status = 'connected';
            server.error = '';
            server.lastSeen = now();

            const metricsResult = await this.collectServer(server);
            if (metricsResult.ok) {
                this.applyMetricSnapshot(server, metricsResult);
            }

            this.lastRefreshed = now();
            this.persist();
            return { ok: true, server };
        },
        removeServer(id) {
            this.servers = this.servers.filter((server) => server.id !== id);
            this.persist();
            return { ok: true };
        },
        async toggleServer(id) {
            const server = this.serverById[id];
            if (!server) return schemaError('Server not found.');
            if (server.enabled) {
                server.enabled = false;
                server.status = 'offline';
                this.persist();
                return { ok: true };
            }

            const testResult = await this.testServer(server);
            if (!testResult.ok) return testResult;

            server.enabled = true;
            server.status = 'connected';
            server.error = '';
            server.lastSeen = now();
            this.persist();
            return { ok: true };
        },
        async refreshServer(id) {
            const server = this.serverById[id];
            if (!server || !server.enabled) return schemaError('No enabled server found.');
            this.setServerLoading(id, true);
            try {
                const result = await this.collectServer(server);
                if (!result.ok) {
                    server.status = 'offline';
                    server.error = result.message;
                    this.persist();
                    return result;
                }
                this.applyMetricSnapshot(server, result);
                this.lastRefreshed = now();
                this.persist();
                return { ok: true, server };
            } finally {
                this.setServerLoading(id, false);
            }
        },
        async refreshAll() {
            const servers = this.servers.filter((server) => server.enabled);
            for (const server of servers) {
                await this.refreshServer(server.id);
            }
            this.lastRefreshed = now();
            return { ok: true };
        }
    }
});
