const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Save image to file
  saveImage: (imageData, type) => ipcRenderer.invoke('save-image', imageData, type),
  
  // Copy image to clipboard
  copyToClipboard: (imageData) => ipcRenderer.invoke('copy-to-clipboard', imageData),
  
  // Get desktop sources for screenshot
  getSources: () => ipcRenderer.invoke('get-sources'),
  
  // Hide/show window for capture
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  
  // Listen for tray actions
  onTrayAction: (callback) => ipcRenderer.on('trigger-fullscreen-capture', callback),
  onTrayAreaAction: (callback) => ipcRenderer.on('trigger-area-capture', callback)
});