import { defineStore } from 'pinia';

const now = () => new Date().toISOString();

const initialEndpoints = [
    {
        id: 'endpoint-health',
        name: 'Production health',
        method: 'GET',
        url: 'https://api.example.com/health',
        collection: 'Production',
        headers: 2,
        enabled: true,
        health: 'healthy',
        latency: 128,
        updatedAt: '2026-10-30T08:35:00+08:00'
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
        latency: 642,
        updatedAt: '2026-10-30T08:20:00+08:00'
    },
    {
        id: 'endpoint-webhook',
        name: 'Partner webhook check',
        method: 'GET',
        url: 'https://partner.example.com/webhook/status',
        collection: 'Integrations',
        headers: 1,
        enabled: false,
        health: 'offline',
        latency: null,
        updatedAt: '2026-10-29T21:12:00+08:00'
    }
];

const initialSchedules = [
    {
        id: 'schedule-health',
        name: 'Health check every 15 min',
        endpointId: 'endpoint-health',
        cron: '*/15 * * * *',
        enabled: true,
        nextRun: '2026-10-30T10:15:00+08:00',
        lastRun: '2026-10-30T10:00:00+08:00',
        lastStatus: 'success'
    },
    {
        id: 'schedule-orders',
        name: 'Orders ping hourly',
        endpointId: 'endpoint-orders',
        cron: '0 * * * *',
        enabled: true,
        nextRun: '2026-10-30T11:00:00+08:00',
        lastRun: '2026-10-30T10:00:00+08:00',
        lastStatus: 'warning'
    },
    {
        id: 'schedule-webhook',
        name: 'Partner webhook nightly',
        endpointId: 'endpoint-webhook',
        cron: '0 2 * * *',
        enabled: false,
        nextRun: null,
        lastRun: '2026-10-29T02:00:00+08:00',
        lastStatus: 'failed'
    }
];

const initialRuns = [
    {
        id: 'run-1004',
        endpointId: 'endpoint-health',
        scheduleId: 'schedule-health',
        status: 'success',
        statusCode: 200,
        duration: 128,
        startedAt: '2026-10-30T10:00:00+08:00',
        triggeredBy: 'schedule',
        mode: 'mock'
    },
    {
        id: 'run-1003',
        endpointId: 'endpoint-orders',
        scheduleId: 'schedule-orders',
        status: 'warning',
        statusCode: 200,
        duration: 642,
        startedAt: '2026-10-30T10:00:00+08:00',
        triggeredBy: 'schedule',
        mode: 'mock'
    },
    {
        id: 'run-1002',
        endpointId: 'endpoint-health',
        scheduleId: null,
        status: 'success',
        statusCode: 200,
        duration: 132,
        startedAt: '2026-10-30T09:45:00+08:00',
        triggeredBy: 'manual',
        mode: 'mock'
    },
    {
        id: 'run-1001',
        endpointId: 'endpoint-webhook',
        scheduleId: 'schedule-webhook',
        status: 'failed',
        statusCode: 503,
        duration: 1550,
        startedAt: '2026-10-29T02:00:00+08:00',
        triggeredBy: 'schedule',
        mode: 'mock'
    }
];

const createId = (prefix) => `${prefix}-${Date.now().toString(36)}`;

export const useWorkspaceStore = defineStore('workspace', {
    state: () => ({
        endpoints: initialEndpoints.map((item) => ({ ...item })),
        schedules: initialSchedules.map((item) => ({ ...item })),
        runs: initialRuns.map((item) => ({ ...item }))
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
        addEndpoint(payload = {}) {
            const endpoint = {
                id: createId('endpoint'),
                name: payload.name || 'Untitled endpoint',
                method: payload.method || 'GET',
                url: payload.url || 'https://api.example.com/',
                collection: payload.collection || 'Personal',
                headers: 0,
                enabled: payload.enabled !== false,
                health: 'healthy',
                latency: null,
                updatedAt: now()
            };
            this.endpoints.unshift(endpoint);
            return endpoint;
        },
        toggleEndpoint(id) {
            const endpoint = this.endpointById[id];
            if (!endpoint) return;
            endpoint.enabled = !endpoint.enabled;
            endpoint.updatedAt = now();
        },
        addSchedule(payload = {}) {
            const schedule = {
                id: createId('schedule'),
                name: payload.name || 'Untitled schedule',
                endpointId:
                    payload.endpointId || this.endpoints[0]?.id || null,
                cron: payload.cron || '*/15 * * * *',
                enabled: payload.enabled !== false,
                nextRun: payload.nextRun || null,
                lastRun: null,
                lastStatus: 'idle'
            };
            this.schedules.unshift(schedule);
            return schedule;
        },
        toggleSchedule(id) {
            const schedule = this.scheduleById[id];
            if (!schedule) return;
            schedule.enabled = !schedule.enabled;
            schedule.nextRun = schedule.enabled ? schedule.nextRun || now() : null;
        },
        runEndpoint(endpointId, scheduleId = null, triggeredBy = 'manual') {
            const endpoint = this.endpointById[endpointId];
            if (!endpoint) return null;
            const statusCode = endpoint.health === 'offline' ? 503 : 200;
            const status =
                endpoint.health === 'offline'
                    ? 'failed'
                    : endpoint.health === 'degraded'
                      ? 'warning'
                      : 'success';
            const run = {
                id: createId('run'),
                endpointId,
                scheduleId,
                status,
                statusCode,
                duration: endpoint.latency || 180,
                startedAt: now(),
                triggeredBy,
                mode: 'mock'
            };
            this.runs.unshift(run);
            if (scheduleId && this.scheduleById[scheduleId]) {
                this.scheduleById[scheduleId].lastRun = run.startedAt;
                this.scheduleById[scheduleId].lastStatus = run.status;
            }
            return run;
        },
        resetDemoData() {
            this.endpoints = initialEndpoints.map((item) => ({ ...item }));
            this.schedules = initialSchedules.map((item) => ({ ...item }));
            this.runs = initialRuns.map((item) => ({ ...item }));
        }
    }
});
