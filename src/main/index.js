import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'

import { initDatabase, closeDatabase } from './db/index.js'
import { registerWorkspaceIpc } from './ipc/workspace.js'
import { seedDemoData } from './repositories/workspace.js'
import { startScheduler, stopScheduler } from './schedules/scheduler.js'
import { registerUpdater } from './updater.js'
import { registerLocalMetricsIpc } from './localMetrics.js'
import { createMainWindow, registerDesktop, showMainWindow, hasTray, restoreDesktopWindows } from './desktop.js'

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    app.whenReady().then(showMainWindow)
  })

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // 初始化 SQLite（drizzle）并注册工作区 IPC。
    initDatabase({
      file: join(app.getPath('userData'), 'powerhub.db'),
      migrationsFolder: join(__dirname, 'db/migrations')
    })
    seedDemoData()
    registerWorkspaceIpc()
    registerUpdater()
    registerLocalMetricsIpc()
    registerDesktop()
    startScheduler()

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    ipcMain.handle('is-window-maximized', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      return win.isMaximized()
    })

    createMainWindow()
    restoreDesktopWindows()

    app.on('activate', showMainWindow)
  })

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (!hasTray() && process.platform !== 'darwin') app.quit()
  })

  app.on('will-quit', () => {
    stopScheduler()
    closeDatabase()
  })

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.

}
