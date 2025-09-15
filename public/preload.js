const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getVideoInfo: (url) => ipcRenderer.invoke('get-video-info', url),
  downloadVideo: (options) => ipcRenderer.invoke('download-video', options),
  selectDownloadFolder: () => ipcRenderer.invoke('select-download-folder'),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  checkYtDlp: () => ipcRenderer.invoke('check-ytdlp'),
  installYtDlp: () => ipcRenderer.invoke('install-ytdlp'),
  updateYtDlp: () => ipcRenderer.invoke('update-ytdlp'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  
  // Settings-related APIs
  checkYtDlpStatus: () => ipcRenderer.invoke('check-ytdlp-status'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectDownloadPath: () => ipcRenderer.invoke('select-download-path'),
  validatePath: (path) => ipcRenderer.invoke('validate-path', path),
  getHomeDirectory: () => ipcRenderer.invoke('get-home-directory'),
  
  // Event listeners
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  onDownloadError: (callback) => {
    ipcRenderer.on('download-error', (event, data) => callback(data));
  },
  onYtDlpInstallProgress: (callback) => {
    ipcRenderer.on('ytdlp-install-progress', (event, data) => callback(data));
  },
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Expose a limited API for window controls if needed
contextBridge.exposeInMainWorld('windowAPI', {
  platform: process.platform,
  versions: process.versions
});