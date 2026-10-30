import { ipcMain } from 'electron';

import { workspaceRepository as repo } from '../repositories/workspace.js';
import {
    collectServerMetrics,
    testServerConnection
} from '../ssh/serverClient.js';

// 统一的通道名，preload 与渲染层共用同一份字符串。
export const workspaceChannels = {
    endpointsList: 'workspace:endpoints:list',
    endpointsCreate: 'workspace:endpoints:create',
    endpointsUpdate: 'workspace:endpoints:update',
    endpointsToggle: 'workspace:endpoints:toggle',
    endpointsRemove: 'workspace:endpoints:remove',
    schedulesList: 'workspace:schedules:list',
    schedulesCreate: 'workspace:schedules:create',
    schedulesUpdate: 'workspace:schedules:update',
    schedulesToggle: 'workspace:schedules:toggle',
    schedulesRemove: 'workspace:schedules:remove',
    runsList: 'workspace:runs:list',
    runsCreate: 'workspace:runs:create',
    runsPrune: 'workspace:runs:prune',
    settingsGet: 'workspace:settings:get',
    settingsSet: 'workspace:settings:set',
    settingsGetAll: 'workspace:settings:getAll',
    settingsSetAll: 'workspace:settings:setAll',
    serverTest: 'workspace:servers:test',
    serverMetrics: 'workspace:servers:metrics',
    resetDemo: 'workspace:resetDemo'
};

export function registerWorkspaceIpc() {
    const handler = (channel, fn) => {
        ipcMain.handle(channel, (_event, ...args) => fn(...args));
    };

    handler(workspaceChannels.endpointsList, () => repo.listEndpoints());
    handler(workspaceChannels.endpointsCreate, (payload) => repo.createEndpoint(payload));
    handler(workspaceChannels.endpointsUpdate, (id, patch) => repo.updateEndpoint(id, patch));
    handler(workspaceChannels.endpointsToggle, (id) => repo.toggleEndpoint(id));
    handler(workspaceChannels.endpointsRemove, (id) => repo.removeEndpoint(id));

    handler(workspaceChannels.schedulesList, () => repo.listSchedules());
    handler(workspaceChannels.schedulesCreate, (payload) => repo.createSchedule(payload));
    handler(workspaceChannels.schedulesUpdate, (id, patch) => repo.updateSchedule(id, patch));
    handler(workspaceChannels.schedulesToggle, (id) => repo.toggleSchedule(id));
    handler(workspaceChannels.schedulesRemove, (id) => repo.removeSchedule(id));

    handler(workspaceChannels.runsList, (query) => repo.listRuns(query));
    handler(workspaceChannels.runsCreate, (payload) => repo.createRun(payload));
    handler(workspaceChannels.runsPrune, (days) => repo.pruneRuns(days));

    handler(workspaceChannels.settingsGet, (key, fallback) => repo.getSetting(key, fallback));
    handler(workspaceChannels.settingsSet, (key, value) => repo.setSetting(key, value));
    handler(workspaceChannels.settingsGetAll, (keys) => repo.getSettings(keys));
    handler(workspaceChannels.settingsSetAll, (patch) => repo.setSettings(patch));

    handler(workspaceChannels.serverTest, (server) => testServerConnection(server));
    handler(workspaceChannels.serverMetrics, (server) => collectServerMetrics(server));

    handler(workspaceChannels.resetDemo, () => {
        repo.resetDemoData();
        return true;
    });
}