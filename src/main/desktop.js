import {
    app,
    autoUpdater as nativeUpdater,
    BrowserWindow,
    ipcMain,
    Menu,
    nativeImage,
    screen,
    shell,
    Tray
} from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, renameSync } from 'fs';
import { is } from '@electron-toolkit/utils';
import { createFloatingMetrics } from './floatingMetrics.js';

let mainWindow = null;
let floatingWindow = null;
let tray = null;
let quitting = false;
let floatingRequested = false;
let floatingDrag = null;
let floatingMaterialSuspended = false;
let language = 'en';
let theme = 'light';
let desktopState = { mainVisible: true, floatingVisible: false, floatingPosition: null };
const statePath = () => join(app.getPath('userData'), 'desktop-state.json');

function loadDesktopState() {
    try {
        const saved = JSON.parse(readFileSync(statePath(), 'utf8'));
        const position = saved.floatingPosition;
        desktopState = {
            mainVisible: typeof saved.mainVisible === 'boolean' ? saved.mainVisible : true,
            floatingVisible: saved.floatingVisible === true,
            floatingPosition: position && Number.isInteger(position.x) && Number.isInteger(position.y) ? { x: position.x, y: position.y } : null
        };
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('Failed to load desktop state:', error);
    }
}

function saveDesktopState() {
    if (quitting) return;
    try {
        const path = statePath();
        writeFileSync(`${path}.tmp`, JSON.stringify(desktopState), 'utf8');
        renameSync(`${path}.tmp`, path);
    } catch (error) { console.error('Failed to save desktop state:', error); }
}

function constrainFloatingBounds(bounds, snap = false) {
    const area = screen.getDisplayMatching(bounds).workArea;
    const maxX = Math.max(area.x, area.x + area.width - bounds.width);
    const maxY = Math.max(area.y, area.y + area.height - bounds.height);
    let x = Math.max(area.x, Math.min(maxX, bounds.x));
    let y = Math.max(area.y, Math.min(maxY, bounds.y));
    if (snap) {
        const threshold = 16;
        if (x - area.x <= threshold) x = area.x;
        else if (maxX - x <= threshold) x = maxX;
        if (y - area.y <= threshold) y = area.y;
        else if (maxY - y <= threshold) y = maxY;
    }
    return { ...bounds, x, y };
}

function restoreFloatingMaterial() {
    if (!floatingMaterialSuspended) return;
    floatingMaterialSuspended = false;
    if (floatingWindow && !floatingWindow.isDestroyed()) {
        floatingWindow.setBackgroundMaterial('acrylic');
    }
}

function saveFloatingPosition() {
    if (!floatingWindow || floatingWindow.isDestroyed()) return;
    const bounds = floatingWindow.getBounds();
    desktopState.floatingPosition = { x: bounds.x, y: bounds.y };
    saveDesktopState();
}

function adjustFloatingPosition(snap = false) {
    if (!floatingWindow || floatingWindow.isDestroyed()) return;
    const bounds = floatingWindow.getBounds();
    const next = constrainFloatingBounds(bounds, snap);
    if (next.x !== bounds.x || next.y !== bounds.y) floatingWindow.setBounds(next);
    saveFloatingPosition();
}
const text = (en, cn) => (language === 'cn' ? cn : en);
const monitor = createFloatingMetrics((metrics) => {
    if (
        floatingWindow &&
        !floatingWindow.isDestroyed() &&
        floatingWindow.isVisible()
    ) {
        floatingWindow.webContents.send('floating-monitor:metrics', metrics);
    }
});

function loadWindow(win, floating = false) {
    if (is.dev && process.env.ELECTRON_RENDERER_URL) {
        const url = floating
            ? new URL('floating.html', process.env.ELECTRON_RENDERER_URL).href
            : process.env.ELECTRON_RENDERER_URL;
        win.loadURL(url);
    } else {
        win.loadFile(
            join(
                __dirname,
                '../renderer',
                floating ? 'floating.html' : 'index.html'
            )
        );
    }
}

export function createMainWindow() {
    const win = new BrowserWindow({
        frame: false,
        show: false,
        width: 1200,
        height: 800,
        transparent: false,
        backgroundMaterial: 'acrylic',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true,
            devTools: true
        }
    });
    mainWindow = win;
    win.once('ready-to-show', () => {
        if (!win.isDestroyed() && (desktopState.mainVisible || !tray)) win.show();
    });
    win.on('close', (event) => {
        if (!quitting && tray) {
            event.preventDefault();
            win.hide();
        }
    });
    win.on('show', () => { desktopState.mainVisible = true; saveDesktopState(); });
    win.on('hide', () => { if (!quitting) { desktopState.mainVisible = false; saveDesktopState(); } });
    win.on('minimize', () => { desktopState.mainVisible = false; saveDesktopState(); });
    win.on('restore', () => { desktopState.mainVisible = true; saveDesktopState(); });
    win.on('closed', () => {
        if (mainWindow === win) mainWindow = null;
    });
    win.setMenu(null);
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
    loadWindow(win);
    return win;
}

function showMain() {
    const win =
        mainWindow && !mainWindow.isDestroyed()
            ? mainWindow
            : createMainWindow();
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
}

function createFloatingWindow() {
    const win = new BrowserWindow({
        width: 320,
        height: 35,
        minWidth: 320,
        minHeight: 35,
        frame: false,
        resizable: false,
        show: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        transparent: false,
        backgroundColor: '#00000000',
        backgroundMaterial: 'acrylic',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    floatingWindow = win;
    if (desktopState.floatingPosition) {
        const bounds = constrainFloatingBounds({ ...win.getBounds(), ...desktopState.floatingPosition });
        win.setBounds(bounds);
    } else {
        const bounds = constrainFloatingBounds(win.getBounds());
        win.setBounds(bounds);
    }
    win.setMenu(null);
    win.on('show', () => {
        desktopState.floatingVisible = true;
        saveDesktopState();
        monitor.start();
        updateMenu();
    });
    win.on('hide', () => {
        floatingDrag = null;
        restoreFloatingMaterial();
        floatingRequested = false;
        if (!quitting) { desktopState.floatingVisible = false; saveDesktopState(); }
        monitor.stop();
        updateMenu();
    });
    win.on('close', (event) => {
        if (!quitting && tray) {
            event.preventDefault();
            win.hide();
        }
    });
    win.on('closed', () => {
        floatingRequested = false;
        monitor.stop();
        if (floatingWindow === win) floatingWindow = null;
        updateMenu();
    });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    loadWindow(win, true);
    return win;
}

function showFloating() {
    floatingRequested = true;
    desktopState.floatingVisible = true;
    saveDesktopState();
    const win =
        floatingWindow && !floatingWindow.isDestroyed()
            ? floatingWindow
            : createFloatingWindow();
    updateMenu();
    if (win.webContents.isLoadingMainFrame())
        win.once('ready-to-show', () => {
            if (floatingRequested && !win.isDestroyed()) win.show();
        });
    else win.show();
}

function hideFloating() {
    floatingRequested = false;
    desktopState.floatingVisible = false;
    saveDesktopState();
    if (floatingWindow && !floatingWindow.isDestroyed()) floatingWindow.hide();
    updateMenu();
}

function updateMenu() {
    if (!tray) return;
    const menu = Menu.buildFromTemplate([
        { label: text('Show main window', '显示主界面'), click: showMain },
        {
            label: text('Show floating window', '显示悬浮窗'),
            type: 'checkbox',
            checked: floatingRequested,
            click: (item) => {
                if (item.checked) showFloating();
                else hideFloating();
            }
        },
        { type: 'separator' },
        { label: text('Quit', '退出'), click: () => app.quit() }
    ]);
    tray.setToolTip('PowerHub');
    tray.setContextMenu(menu);
}

export function registerDesktop() {
    language = app.getLocale().toLowerCase().startsWith('zh') ? 'cn' : 'en';
    loadDesktopState();
    screen.on('display-removed', () => adjustFloatingPosition());
    screen.on('display-metrics-changed', () => adjustFloatingPosition());
    app.on('before-quit', () => {
        quitting = true;
        monitor.stop();
    });
    nativeUpdater.on('before-quit-for-update', () => {
        quitting = true;
        monitor.stop();
    });
    ipcMain.on('min', (event) =>
        BrowserWindow.fromWebContents(event.sender)?.minimize()
    );
    ipcMain.on('max', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win?.isMaximized()) win.restore();
        else win?.maximize();
    });
    ipcMain.on('close', (event) =>
        BrowserWindow.fromWebContents(event.sender)?.close()
    );
    ipcMain.on('desktop:floating-drag', (event, phase) => {
        if (!floatingWindow || floatingWindow.isDestroyed() || event.sender !== floatingWindow.webContents) return;
        if (phase === 'start') {
            floatingDrag = { cursor: screen.getCursorScreenPoint(), bounds: floatingWindow.getBounds() };
        } else if (phase === 'move' && floatingDrag) {
            const cursor = screen.getCursorScreenPoint();
            if (cursor.x === floatingDrag.cursor.x && cursor.y === floatingDrag.cursor.y) return;
            if (process.platform === 'win32' && !floatingMaterialSuspended) {
                floatingWindow.setBackgroundMaterial('none');
                floatingMaterialSuspended = true;
            }
            floatingWindow.setBounds(constrainFloatingBounds({
                x: floatingDrag.bounds.x + cursor.x - floatingDrag.cursor.x,
                y: floatingDrag.bounds.y + cursor.y - floatingDrag.cursor.y,
                width: floatingDrag.bounds.width,
                height: floatingDrag.bounds.height
            }));
        } else if (phase === 'end') {
            floatingDrag = null;
            adjustFloatingPosition(true);
            restoreFloatingMaterial();
        }
    });
    const getState = () => ({ language, theme });
    const configure = (options = {}) => {
        const nextLanguage =
            options.language === 'cn' || options.language === 'en'
                ? options.language
                : language;
        const nextTheme =
            options.theme === 'dark' || options.theme === 'light'
                ? options.theme
                : theme;
        const stateChanged = language !== nextLanguage || theme !== nextTheme;
        language = nextLanguage;
        theme = nextTheme;
        if (stateChanged) updateMenu();
        if (stateChanged && floatingWindow && !floatingWindow.isDestroyed())
            floatingWindow.webContents.send('desktop:state', getState());
        return getState();
    };
    const getStartupState = () => {
        const supported = app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin');
        return { supported, enabled: supported ? app.getLoginItemSettings().openAtLogin : false };
    };
    ipcMain.handle('desktop:get-startup', getStartupState);
    ipcMain.handle('desktop:set-startup', (_event, enabled) => {
        if (typeof enabled !== 'boolean') throw new TypeError('Invalid startup setting');
        if (!getStartupState().supported) throw new Error('Startup is unavailable');
        app.setLoginItemSettings({ openAtLogin: enabled });
        const state = getStartupState();
        if (state.enabled !== enabled) throw new Error('The system did not apply the startup setting');
        return state;
    });
    ipcMain.handle('desktop:get-state', getState);
    ipcMain.handle('desktop:configure', (_event, options) =>
        configure(options)
    );
    ipcMain.handle('desktop:hide-floating', hideFloating);
    ipcMain.handle('desktop:show-main', showMain);
    try {
        const iconPath = join(__dirname, '../../resources/icon.png');
        const icon = nativeImage
            .createFromPath(iconPath)
            .resize({ width: 16, height: 16 });
        if (icon.isEmpty()) throw new Error('Tray icon could not be loaded.');
        tray = new Tray(icon);
        updateMenu();
        if (process.platform !== 'darwin')
            tray.on('click', () => tray.popUpContextMenu());
    } catch (error) {
        tray = null;
        console.error('Failed to initialize tray:', error);
    }
}

export function showMainWindow() {
    showMain();
}

export function hasTray() {
    return Boolean(tray);
}

export function restoreDesktopWindows() {
    if (desktopState.floatingVisible && tray) showFloating();
}
