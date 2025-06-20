const { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage, desktopCapturer, Tray, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Keep a global reference of the window object and tray
let mainWindow;
let tray = null;

// Enable live reload for Electron in development
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname);
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false // Don't show immediately
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close - minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Show notification on first minimize
      if (!tray.isDestroyed()) {
        tray.displayBalloon({
          iconType: 'info',
          title: 'Gleeva Capture',
          content: 'App was minimized to tray. Right-click the tray icon to access options.'
        });
      }
    }
    return false;
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Create tray icon (using a simple icon for now)
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  
  // Create a simple icon if assets folder doesn't exist
  const trayIcon = nativeImage.createFromNamedImage('NSImageNameFolder', [16, 16]);
  
  tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Capture Full Screen (Ctrl+Shift+F)',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('trigger-fullscreen-capture');
        }
      }
    },
    {
      label: 'Capture Area (Ctrl+Shift+A)',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('trigger-area-capture');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Gleeva Capture');
  tray.setContextMenu(contextMenu);
  
  // Double-click to show window
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

function registerGlobalShortcuts() {
  // Global shortcut for full screen capture
  globalShortcut.register('Ctrl+Shift+F', () => {
    if (mainWindow) {
      mainWindow.webContents.send('trigger-fullscreen-capture');
    }
  });
  
  // Global shortcut for area capture
  globalShortcut.register('Ctrl+Shift+A', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
      }
      mainWindow.webContents.send('trigger-area-capture');
    }
  });
}

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up tray and shortcuts on quit
app.on('before-quit', () => {
  app.isQuiting = true;
  globalShortcut.unregisterAll();
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
});

// IPC Handlers

// Handle saving image to file
ipcMain.handle('save-image', async (event, imageData, type) => {
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Image',
      defaultPath: `capture_${type}_${Date.now()}.png`,
      filters: [
        { name: 'Images', extensions: ['png'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      // Convert base64 to buffer and save
      const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(result.filePath, buffer);
      return { success: true, path: result.filePath };
    }
    
    return { success: false, canceled: true };
  } catch (error) {
    console.error('Error saving image:', error);
    return { success: false, error: error.message };
  }
});

// Handle copying image to clipboard
ipcMain.handle('copy-to-clipboard', async (event, imageData) => {
  try {
    // Convert base64 to native image
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const image = nativeImage.createFromBuffer(buffer);
    
    // Copy to clipboard
    clipboard.writeImage(image);
    return { success: true };
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return { success: false, error: error.message };
  }
});

// Get available screen sources for capturing
ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    
    // Log available sources for debugging
    console.log('Available screen sources:', sources.map(s => ({ id: s.id, name: s.name })));
    
    return sources;
  } catch (error) {
    console.error('Error getting sources:', error);
    return [];
  }
});

// Hide window for capture
ipcMain.handle('hide-window', async () => {
  if (mainWindow) {
    mainWindow.hide();
    // Small delay to ensure window is fully hidden
    await new Promise(resolve => setTimeout(resolve, 200));
  }
});

// Show window after capture
ipcMain.handle('show-window', async () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Global shortcut handlers for tray actions
ipcMain.handle('capture-fullscreen-from-tray', async () => {
  // This will be triggered from tray menu
  return { action: 'fullscreen' };
});

ipcMain.handle('capture-area-from-tray', async () => {
  // This will be triggered from tray menu
  return { action: 'area' };
});