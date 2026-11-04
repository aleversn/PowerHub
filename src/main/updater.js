import { app, BrowserWindow, ipcMain, shell } from 'electron';
import updater from 'electron-updater';

const { autoUpdater } = updater;
const releaseUrl = 'https://github.com/aleversn/PowerHub/releases';
let state = {
    status: 'idle',
    currentVersion: '',
    version: '',
    percent: 0,
    error: '',
    platform: process.platform,
    packaged: false
};

function updateState(patch) {
    state = { ...state, ...patch };
    for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) window.webContents.send('app-update:state', state);
    }
    return { ...state };
}

export function registerUpdater() {
    state = { ...state, currentVersion: app.getVersion(), packaged: app.isPackaged };
    autoUpdater.autoDownload = true;
    // Installation is explicit, so closing the app never unexpectedly installs an update.
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.on('checking-for-update', () => updateState({ status: 'checking', error: '', percent: 0 }));
    autoUpdater.on('update-available', (info) => updateState({ status: 'downloading', version: info.version, error: '', percent: 0 }));
    autoUpdater.on('update-not-available', (info) => updateState({ status: 'latest', version: info.version, error: '', percent: 0 }));
    autoUpdater.on('download-progress', (progress) => updateState({ status: 'downloading', percent: Math.max(0, Math.min(100, Math.round(progress.percent || 0))) }));
    autoUpdater.on('update-downloaded', (info) => updateState({ status: 'downloaded', version: info.version, percent: 100, error: '' }));
    autoUpdater.on('error', (error) => updateState({ status: 'error', error: error?.message || 'Unknown error' }));

    ipcMain.handle('app-update:get-state', () => ({ ...state }));
    ipcMain.handle('app-update:check', async () => {
        if (state.status === 'checking' || state.status === 'downloading' || state.status === 'downloaded') return { ...state };
        if (!app.isPackaged || !['win32', 'darwin'].includes(process.platform)) {
            return updateState({ status: 'unsupported', error: '' });
        }
        try {
            updateState({ status: 'checking', version: '', percent: 0, error: '' });
            const result = await autoUpdater.checkForUpdates();
            if (result?.downloadPromise) {
                result.downloadPromise.catch((error) => {
                    if (state.status !== 'error') {
                        updateState({ status: 'error', error: error?.message || 'Unknown error' });
                    }
                });
            }
        } catch (error) {
            updateState({ status: 'error', error: error?.message || 'Unknown error' });
        }
        return { ...state };
    });
    ipcMain.handle('app-update:install', () => {
        if (state.status !== 'downloaded') return false;
        setImmediate(() => autoUpdater.quitAndInstall());
        return true;
    });
    ipcMain.handle('app-update:open-releases', () => shell.openExternal(releaseUrl));
}
