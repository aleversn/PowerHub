import { ipcMain, BrowserWindow } from 'electron';

import { workspaceRepository as repo } from '../repositories/workspace.js';
import { sendEndpointRequest } from '../http/endpointClient.js';
import { runSandbox } from '../scripts/sandboxRunner.js';
import { prepareSchedule, runSchedule, nextRunFor, setRunProgressNotifier } from '../schedules/scheduler.js';
import {
    collectServerMetrics,
    testServerConnection
} from '../ssh/serverClient.js';

// 统一的通道名，preload 与渲染层共用同一份字符串。
export const workspaceChannels = {
    collectionsList: 'workspace:collections:list',
    collectionsCreate: 'workspace:collections:create',
    collectionsUpdate: 'workspace:collections:update',
    collectionsRemove: 'workspace:collections:remove',
    endpointsList: 'workspace:endpoints:list',
    endpointsCreate: 'workspace:endpoints:create',
    endpointsUpdate: 'workspace:endpoints:update',
    endpointsDuplicate: 'workspace:endpoints:duplicate',
    endpointsToggle: 'workspace:endpoints:toggle',
    endpointsMove: 'workspace:endpoints:move',
    endpointsRemove: 'workspace:endpoints:remove',
    endpointsSend: 'workspace:endpoints:send',
    endpointsRunScript: 'workspace:endpoints:runScript',
    variablesList: 'workspace:variables:list',
    variablesCreate: 'workspace:variables:create',
    variablesUpdate: 'workspace:variables:update',
    variablesRemove: 'workspace:variables:remove',
    variablesReplace: 'workspace:variables:replace',
    schedulesList: 'workspace:schedules:list',
    schedulesCreate: 'workspace:schedules:create',
    schedulesUpdate: 'workspace:schedules:update',
    schedulesToggle: 'workspace:schedules:toggle',
    schedulesRemove: 'workspace:schedules:remove',
    schedulesRun: 'workspace:schedules:run',
    runsList: 'workspace:runs:list',
    runsCreate: 'workspace:runs:create',
    runsRemove: 'workspace:runs:remove',
    runsClear: 'workspace:runs:clear',
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
    setRunProgressNotifier(run => {
        for (const window of BrowserWindow.getAllWindows()) {
            if (!window.isDestroyed()) window.webContents.send('workspace:runs:progress', run);
        }
    });
    const handler = (channel, fn) => {
        ipcMain.handle(channel, (_event, ...args) => fn(...args));
    };

    handler(workspaceChannels.collectionsList, () => repo.listCollections());
    handler(workspaceChannels.collectionsCreate, (payload) => repo.createCollection(payload));
    handler(workspaceChannels.collectionsUpdate, (id, patch) => repo.updateCollection(id, patch));
    handler(workspaceChannels.collectionsRemove, (id) => repo.removeCollection(id));

    handler(workspaceChannels.endpointsList, () => repo.listEndpoints());
    handler(workspaceChannels.endpointsCreate, (payload) => repo.createEndpoint(payload));
    handler(workspaceChannels.endpointsUpdate, (id, patch) => repo.updateEndpoint(id, patch));
    handler(workspaceChannels.endpointsDuplicate, (id) => repo.duplicateEndpoint(id));
    handler(workspaceChannels.endpointsToggle, (id) => repo.toggleEndpoint(id));
    handler(workspaceChannels.endpointsMove, (id, collection) => repo.moveEndpoint(id, collection));
    handler(workspaceChannels.endpointsRemove, (id) => repo.removeEndpoint(id));
    handler(workspaceChannels.endpointsSend, async (id, payload) => {
        const result = await sendEndpointRequest(payload || {});
        const run = repo.createRun({
            endpointId: id,
            scheduleId: payload?.scheduleId || null,
            status: result.status,
            statusCode: result.statusCode,
            duration: result.duration,
            startedAt: new Date().toISOString(),
            triggeredBy: payload?.triggeredBy || 'manual',
            mode: 'live',
            requestUrl: result.url,
            response: result.response ?? null,
            responseHeaders: result.headers || {},
            error: result.error ?? null
        });
        return { result, run };
    });

    handler(workspaceChannels.endpointsRunScript, (payload) => runSandbox(payload || {}));

    handler(workspaceChannels.variablesList, (collection) => repo.listCollectionVariables(collection));
    handler(workspaceChannels.variablesCreate, (payload) => repo.createCollectionVariable(payload));
    handler(workspaceChannels.variablesUpdate, (id, patch) => repo.updateCollectionVariable(id, patch));
    handler(workspaceChannels.variablesRemove, (id) => repo.removeCollectionVariable(id));
    handler(workspaceChannels.variablesReplace, (collection, variables) =>
        repo.replaceCollectionVariables(collection, variables)
    );

    handler(workspaceChannels.schedulesList, () => repo.listSchedules());
    handler(workspaceChannels.schedulesCreate, (payload) => repo.createSchedule(prepareSchedule(payload)));
    handler(workspaceChannels.schedulesUpdate, (id, patch) => repo.updateSchedule(id, prepareSchedule(patch)));
    handler(workspaceChannels.schedulesToggle, (id) => {
        const schedule = repo.listSchedules().find(item => item.id === id);
        if (!schedule) throw new Error('Schedule not found.');
        if (schedule.taskType === 'legacy') throw new Error('Edit and save this legacy schedule before enabling it.');
        const enabled = !schedule.enabled;
        if (enabled) prepareSchedule({ ...schedule, enabled });
        return repo.updateSchedule(id, { enabled, nextRun: enabled ? nextRunFor(schedule.cron) : null });
    });
    handler(workspaceChannels.schedulesRun, (id) => runSchedule(id));
    handler(workspaceChannels.schedulesRemove, (id) => repo.removeSchedule(id));

    handler(workspaceChannels.runsList, (query) => repo.listRuns(query));
    handler(workspaceChannels.runsCreate, (payload) => repo.createRun(payload));
    handler(workspaceChannels.runsRemove, (id) => repo.removeRun(id));
    handler(workspaceChannels.runsClear, () => repo.clearRuns());
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