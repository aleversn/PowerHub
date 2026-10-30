import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

const workspace = {
    endpoints: {
        list: () => ipcRenderer.invoke('workspace:endpoints:list'),
        create: (payload) => ipcRenderer.invoke('workspace:endpoints:create', payload),
        update: (id, patch) => ipcRenderer.invoke('workspace:endpoints:update', id, patch),
        toggle: (id) => ipcRenderer.invoke('workspace:endpoints:toggle', id),
        remove: (id) => ipcRenderer.invoke('workspace:endpoints:remove', id)
    },
    schedules: {
        list: () => ipcRenderer.invoke('workspace:schedules:list'),
        create: (payload) => ipcRenderer.invoke('workspace:schedules:create', payload),
        update: (id, patch) => ipcRenderer.invoke('workspace:schedules:update', id, patch),
        toggle: (id) => ipcRenderer.invoke('workspace:schedules:toggle', id),
        remove: (id) => ipcRenderer.invoke('workspace:schedules:remove', id)
    },
    runs: {
        list: (query) => ipcRenderer.invoke('workspace:runs:list', query),
        create: (payload) => ipcRenderer.invoke('workspace:runs:create', payload),
        prune: (days) => ipcRenderer.invoke('workspace:runs:prune', days)
    },
    settings: {
        get: (key, fallback) => ipcRenderer.invoke('workspace:settings:get', key, fallback),
        set: (key, value) => ipcRenderer.invoke('workspace:settings:set', key, value),
        getAll: (keys) => ipcRenderer.invoke('workspace:settings:getAll', keys),
        setAll: (patch) => ipcRenderer.invoke('workspace:settings:setAll', patch)
    },
    servers: {
        test: (server) => ipcRenderer.invoke('workspace:servers:test', server),
        metrics: (server) => ipcRenderer.invoke('workspace:servers:metrics', server)
    },
    resetDemoData: () => ipcRenderer.invoke('workspace:resetDemo')
};

// Custom APIs for renderer
const api = {
    isMaximized: () => ipcRenderer.invoke('is-window-maximized'),
    // 顶层别名，避免个别运行环境下 workspace 嵌套不可见。
    servers: workspace.servers,
    workspace
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI);
        contextBridge.exposeInMainWorld('api', api);
    } catch (error) {
        console.error(error);
    }
} else {
    window.electron = electronAPI;
    window.api = api;
}