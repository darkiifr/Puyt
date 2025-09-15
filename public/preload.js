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
  selectCookieFile: () => ipcRenderer.invoke('select-cookie-file'),
  
  // Update system APIs
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: (channel) => ipcRenderer.invoke('check-for-updates', channel),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Automatic update APIs
  getAutoUpdateSettings: () => ipcRenderer.invoke('get-auto-update-settings'),
  setAutoUpdateSettings: (settings) => ipcRenderer.invoke('set-auto-update-settings', settings),
  triggerManualUpdateCheck: (channel) => ipcRenderer.invoke('trigger-manual-update-check', channel),
  
  // Dependency Management APIs
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  installYtDlpNew: () => ipcRenderer.invoke('install-ytdlp'),
  installFfmpeg: () => ipcRenderer.invoke('install-ffmpeg'),
  getInstallationInstructions: () => ipcRenderer.invoke('get-installation-instructions'),
  selectInstallationDirectory: () => ipcRenderer.invoke('select-installation-directory'),
  
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
  
  // Update event listeners
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, data) => callback(data));
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', (event, data) => callback(data));
  },
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, data) => callback(data));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, data) => callback(data));
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, data) => callback(data));
  },
  onAutoUpdateNotification: (callback) => {
    ipcRenderer.on('auto-update-notification', (event, data) => callback(data));
  },
  onInstallationProgress: (callback) => {
    ipcRenderer.on('installation-progress', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Generic event listener management
  on: (channel, callback) => {
    ipcRenderer.on(channel, callback);
  },
  off: (channel, callback) => {
    ipcRenderer.off(channel, callback);
  }
});

// Expose a limited API for window controls if needed
contextBridge.exposeInMainWorld('windowAPI', {
  platform: process.platform,
  versions: process.versions
});