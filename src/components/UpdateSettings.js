import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const UpdateSettings = () => {
  // Utility functions for formatting
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === Infinity) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  const [updateChannel, setUpdateChannel] = useState('stable');
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);
  const [lastUpdateCheck, setLastUpdateCheck] = useState(null);
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [autoDownload, setAutoDownload] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [channelVersions, setChannelVersions] = useState({});
  const [checkingChannelVersions, setCheckingChannelVersions] = useState(false);

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      try {
        // Load auto-update settings from backend
        if (window.electronAPI?.getAutoUpdateSettings) {
          const autoUpdateSettings = await window.electronAPI.getAutoUpdateSettings();
          setAutoCheckUpdates(autoUpdateSettings.enabled);
          setUpdateChannel(autoUpdateSettings.channel);
          setAutoDownload(autoUpdateSettings.autoDownload || false);
          if (autoUpdateSettings.lastCheck) {
            setLastUpdateCheck(new Date(autoUpdateSettings.lastCheck));
          }
        } else {
          // Fallback to localStorage for backward compatibility
          const savedSettings = JSON.parse(localStorage.getItem('puytSettings') || '{}');
          if (savedSettings.updateChannel) {
            setUpdateChannel(savedSettings.updateChannel);
          }
          if (savedSettings.autoCheckUpdates !== undefined) {
            setAutoCheckUpdates(savedSettings.autoCheckUpdates);
          }
          if (savedSettings.autoDownload !== undefined) {
            setAutoDownload(savedSettings.autoDownload);
          }
          if (savedSettings.lastUpdateCheck) {
            setLastUpdateCheck(new Date(savedSettings.lastUpdateCheck));
          }
        }

        // Get current version info from electron
        if (window.electronAPI?.getAppVersion) {
          const versionInfo = await window.electronAPI.getAppVersion();
          if (typeof versionInfo === 'object') {
            setCurrentVersion(`${versionInfo.version} (${versionInfo.channel})`);
          } else {
            setCurrentVersion(versionInfo);
          }
        }
      } catch (error) {
        console.error('Error loading update settings:', error);
      }
    };

    loadSettings();

    // Setup update event listeners
    if (window.electronAPI) {
      const handleUpdateAvailable = (updateData) => {
        setUpdateInfo(updateData);
        setIsCheckingUpdate(false);
        showNotification(`Update available: v${updateData.version}`, 'success');
      };

      const handleUpdateNotAvailable = () => {
        setUpdateInfo(null);
        setIsCheckingUpdate(false);
        setLastUpdateCheck(new Date());
        saveSettings({ lastUpdateCheck: new Date().toISOString() });
        showNotification('No updates available. You are running the latest version.', 'info');
      };

      const handleUpdateDownloadProgress = (progress) => {
        setDownloadProgress(progress.percent);
        // Store additional progress info for enhanced display
        setDownloadInfo({
          percent: progress.percent,
          downloadedBytes: progress.downloadedBytes || 0,
          totalBytes: progress.totalBytes || 0,
          speed: progress.speed || 0,
          eta: progress.eta || 0,
          attempt: progress.attempt || 1
        });
      };

      const handleUpdateDownloaded = () => {
        setIsDownloadingUpdate(false);
        setDownloadProgress(100);
        setDownloadInfo(null);
      };

      const handleUpdateError = (error) => {
        setError(error.message || 'Update failed');
        setIsCheckingUpdate(false);
        setIsDownloadingUpdate(false);
        setDownloadInfo(null);
      };

      const handleAutoUpdateNotification = (notification) => {
        console.log('Auto-update notification received:', notification);
        
        switch (notification.type) {
          case 'checking':
            setIsCheckingUpdate(true);
            break;
          case 'update-available':
            setUpdateInfo(notification.data);
            setIsCheckingUpdate(false);
            setError('');
            // For silent notifications, don't show intrusive UI updates
            if (!notification.silent) {
              // Show update available UI
            }
            break;
          case 'update-downloaded':
            setIsDownloadingUpdate(false);
            setDownloadProgress(100);
            setDownloadInfo(null);
            setError('');
            // Show subtle notification that update is ready
            break;
          case 'not-available':
            setUpdateInfo(null);
            setIsCheckingUpdate(false);
            setLastUpdateCheck(new Date());
            break;
          case 'update-error':
            setError(notification.message || 'Auto-update failed');
            setIsCheckingUpdate(false);
            setIsDownloadingUpdate(false);
            break;
          default:
            console.log('Unknown notification type:', notification.type);
        }
      };

      window.electronAPI.on?.('update-available', handleUpdateAvailable);
      window.electronAPI.on?.('update-not-available', handleUpdateNotAvailable);
      window.electronAPI.on?.('update-download-progress', handleUpdateDownloadProgress);
      window.electronAPI.on?.('update-downloaded', handleUpdateDownloaded);
      window.electronAPI.on?.('update-error', handleUpdateError);
      window.electronAPI.onAutoUpdateNotification?.(handleAutoUpdateNotification);

      return () => {
        window.electronAPI.off?.('update-available', handleUpdateAvailable);
        window.electronAPI.off?.('update-not-available', handleUpdateNotAvailable);
        window.electronAPI.off?.('update-download-progress', handleUpdateDownloadProgress);
        window.electronAPI.off?.('update-downloaded', handleUpdateDownloaded);
        window.electronAPI.off?.('update-error', handleUpdateError);
        // Note: onAutoUpdateNotification cleanup is handled automatically by the preload script
      };
    }
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const checkChannelVersions = async (channel) => {
    setCheckingChannelVersions(true);
    try {
      if (window.electronAPI?.checkChannelVersions) {
        const versions = await window.electronAPI.checkChannelVersions(channel);
        setChannelVersions(prev => ({ ...prev, [channel]: versions }));
        
        if (versions && versions.length > 0) {
          showNotification(`Found ${versions.length} version(s) available in ${channel} channel`, 'success');
        } else {
          showNotification(`No versions available in ${channel} channel`, 'info');
        }
      } else {
        showNotification(`Channel version checking not available`, 'warning');
      }
    } catch (error) {
      console.error('Error checking channel versions:', error);
      showNotification(`Failed to check ${channel} channel versions`, 'error');
    } finally {
      setCheckingChannelVersions(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      // Save to backend using new auto-update settings API
      if (window.electronAPI?.setAutoUpdateSettings) {
        const currentSettings = {
          enabled: autoCheckUpdates,
          channel: updateChannel,
          autoDownload: autoDownload,
          interval: 4 * 60 * 60 * 1000, // 4 hours
          silent: true
        };
        
        // Update with new settings
        const updatedSettings = { ...currentSettings, ...newSettings };
        await window.electronAPI.setAutoUpdateSettings(updatedSettings);
        showNotification('Settings saved successfully!', 'success');
      } else {
        // Fallback to localStorage for backward compatibility
        const savedSettings = JSON.parse(localStorage.getItem('puytSettings') || '{}');
        const updatedSettings = { ...savedSettings, ...newSettings };
        localStorage.setItem('puytSettings', JSON.stringify(updatedSettings));
        
        if (window.electronAPI?.saveSettings) {
          await window.electronAPI.saveSettings(updatedSettings);
        }
        showNotification('Settings saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Error saving update settings:', error);
      showNotification('Failed to save settings', 'error');
    }
  };

  const handleUpdateChannelChange = (channel) => {
    setUpdateChannel(channel);
    saveSettings({ channel: channel });
  };

  const handleAutoCheckToggle = (enabled) => {
    setAutoCheckUpdates(enabled);
    saveSettings({ enabled: enabled });
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setError('');
    setUpdateInfo(null);
    
    try {
      // Use new manual update check method if available
      if (window.electronAPI?.triggerManualUpdateCheck) {
        await window.electronAPI.triggerManualUpdateCheck();
      } else if (window.electronAPI?.checkForUpdates) {
        // Fallback to old method
        await window.electronAPI.checkForUpdates(updateChannel);
      } else {
        throw new Error('Update check not available');
      }
    } catch (error) {
      setError(error.message || 'Failed to check for updates');
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI?.downloadUpdate || !updateInfo) return;
    
    setIsDownloadingUpdate(true);
    setDownloadProgress(0);
    setError('');
    
    try {
      await window.electronAPI.downloadUpdate();
    } catch (error) {
      console.error('Download update error:', error);
      setError(error.message || 'Failed to download update');
    } finally {
      setIsDownloadingUpdate(false);
      setDownloadProgress(0);
    }
  };

  const handleInstallUpdate = async () => {
    if (!window.electronAPI?.installUpdate) return;
    
    setError('');
    
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('Install update error:', error);
      setError(error.message || 'Failed to install update');
    }
  };

  const getChannelColor = (channel) => {
    switch (channel) {
      case 'alpha': return 'text-red-600 dark:text-red-400';
      case 'beta': return 'text-yellow-600 dark:text-yellow-400';
      case 'stable': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getChannelBadgeColor = (channel) => {
    switch (channel) {
      case 'alpha': return 'bg-red-500/20 dark:bg-red-500/30 text-red-700 dark:text-red-300 border border-red-500/30';
      case 'beta': return 'bg-orange-500/20 dark:bg-orange-500/30 text-orange-700 dark:text-orange-300 border border-orange-500/30';
      case 'stable': return 'bg-green-500/20 dark:bg-green-500/30 text-green-700 dark:text-green-300 border border-green-500/30';
      default: return 'bg-gray-500/20 dark:bg-gray-500/30 text-gray-700 dark:text-gray-300 border border-gray-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="card-body">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Update Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage automatic updates and release channels
            </p>
          </div>
        </div>

        {/* Current Version */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Current Version
              </h3>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                v{currentVersion}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getChannelBadgeColor(updateChannel)}`}>
              {updateChannel.charAt(0).toUpperCase() + updateChannel.slice(1)}
            </div>
          </div>
          {lastUpdateCheck && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Last checked: {lastUpdateCheck.toLocaleString()}
            </p>
          )}
        </div>

        {/* Notification Display */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`mb-4 p-4 rounded-lg border ${
                notification.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                notification.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                notification.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className={`flex-shrink-0 ${
                    notification.type === 'success' ? 'text-green-500' :
                    notification.type === 'error' ? 'text-red-500' :
                    notification.type === 'warning' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`}>
                    {notification.type === 'success' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {notification.type === 'error' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    {notification.type === 'warning' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    {notification.type === 'info' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      notification.type === 'success' ? 'text-green-800 dark:text-green-200' :
                      notification.type === 'error' ? 'text-red-800 dark:text-red-200' :
                      notification.type === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                      'text-blue-800 dark:text-blue-200'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className={`flex-shrink-0 ml-4 ${
                    notification.type === 'success' ? 'text-green-400 hover:text-green-600' :
                    notification.type === 'error' ? 'text-red-400 hover:text-red-600' :
                    notification.type === 'warning' ? 'text-yellow-400 hover:text-yellow-600' :
                    'text-blue-400 hover:text-blue-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Update Error
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Update Available */}
        <AnimatePresence>
          {updateInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    🎉 Update Available!
                  </h3>
                  <p className="text-blue-800 dark:text-blue-200 mt-1">
                    Version {updateInfo.version} is now available
                  </p>
                  {updateInfo.releaseNotes && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border">
                      <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                    Release Notes:
                  </h4>
                  <p className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {updateInfo.releaseNotes}
                  </p>
                    </div>
                  )}
                </div>
                <div className="ml-4 space-y-2">
                  {!isDownloadingUpdate && downloadProgress < 100 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDownloadUpdate}
                      className="btn-primary px-4 py-2 text-base"
                    >
                      Download Update
                    </motion.button>
                  )}
                  {downloadProgress === 100 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleInstallUpdate}
                      className="btn-primary px-4 py-2 text-base"
                    >
                      Install & Restart
                    </motion.button>
                  )}
                </div>
              </div>
              
              {/* Enhanced Download Progress */}
              {isDownloadingUpdate && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-base text-blue-800 dark:text-blue-200">
                      {downloadInfo?.attempt > 1 ? `Downloading (Retry ${downloadInfo.attempt})...` : 'Downloading update...'}
                    </span>
                      {downloadInfo?.attempt > 1 && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                          Attempt {downloadInfo.attempt}
                        </span>
                      )}
                    </div>
                    <span className="text-base font-medium text-blue-800 dark:text-blue-200">
                      {Math.round(downloadProgress)}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 mb-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadProgress}%` }}
                      className="bg-blue-600 dark:bg-blue-400 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                    >
                      {/* Animated progress stripe for active downloads */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                    </motion.div>
                  </div>
                  
                  {/* Download Statistics */}
                  {downloadInfo && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-blue-700 dark:text-blue-300">
                      <div className="flex flex-col">
                        <span className="font-medium">Downloaded</span>
                        <span>{formatBytes(downloadInfo.downloadedBytes)} / {formatBytes(downloadInfo.totalBytes)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Speed</span>
                        <span>{downloadInfo.speed > 0 ? formatSpeed(downloadInfo.speed) : 'Calculating...'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">ETA</span>
                        <span>{downloadInfo.eta > 0 ? formatTime(downloadInfo.eta) : 'Calculating...'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Status</span>
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                          Active
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Update Channel Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Release Channel
          </h3>
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleUpdateChannelChange('stable')}
              className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                updateChannel === 'stable'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="font-medium text-lg text-gray-900 dark:text-white">Stable</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChannelColor('stable')}`}>
                       Recommended
                     </span>
                  </div>
                  <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                    Thoroughly tested releases with maximum stability and reliability
                  </p>
                </div>
                {updateChannel === 'stable' && (
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                handleUpdateChannelChange('beta');
                checkChannelVersions('beta');
              }}
              className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                updateChannel === 'beta'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-medium text-lg text-gray-900 dark:text-white">Beta</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChannelColor('beta')}`}>
                       Early Access
                     </span>
                    {checkingChannelVersions && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                    )}
                  </div>
                  <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                    Pre-release versions with new features, tested but may have minor issues
                  </p>
                  {channelVersions.beta && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                      {channelVersions.beta.length} version(s) available
                    </p>
                  )}
                </div>
                {updateChannel === 'beta' && (
                  <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                handleUpdateChannelChange('alpha');
                checkChannelVersions('alpha');
              }}
              className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                updateChannel === 'alpha'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="font-medium text-lg text-gray-900 dark:text-white">Alpha</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChannelColor('alpha')}`}>
                       Bleeding Edge
                     </span>
                    {checkingChannelVersions && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                    )}
                  </div>
                  <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                    Latest experimental features and improvements, expect bugs and instability
                  </p>
                  {channelVersions.alpha && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {channelVersions.alpha.length} version(s) available
                    </p>
                  )}
                </div>
                {updateChannel === 'alpha' && (
                  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </motion.button>
          </div>
        </div>

        {/* Auto-check Updates */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Automatic Updates
              </h3>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Automatically check for updates on startup
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAutoCheckToggle(!autoCheckUpdates)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoCheckUpdates ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <motion.span
                animate={{
                  x: autoCheckUpdates ? 20 : 2,
                }}
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              />
            </motion.button>
          </div>
        </div>

        {/* Auto Download Toggle - only show when auto updates are enabled */}
        {autoCheckUpdates && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Auto Download Updates
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically download updates in the background when available
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const newAutoDownload = !autoDownload;
                  setAutoDownload(newAutoDownload);
                  saveSettings({ autoDownload: newAutoDownload });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoDownload ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <motion.span
                  animate={{
                    x: autoDownload ? 20 : 2,
                  }}
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                />
              </motion.button>
            </div>
          </div>
        )}

        {/* Manual Check Button */}
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckForUpdates}
            disabled={isCheckingUpdate}
            className="btn-primary px-6 py-3"
          >
            {isCheckingUpdate ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Checking for Updates...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Check for Updates
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default UpdateSettings;