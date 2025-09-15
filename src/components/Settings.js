import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Settings = () => {
  const [ytDlpStatus, setYtDlpStatus] = useState('checking');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installLog, setInstallLog] = useState('');
  const [showConsole, setShowConsole] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    downloadPath: '',
    videoQuality: 'best',
    audioFormat: 'mp3',
    videoFormat: 'mp4',
    extractAudio: false,
    downloadSubtitles: false,
    keepOriginal: true,
    embedThumbnail: false
  });
  const consoleRef = useRef(null);

  useEffect(() => {
    checkYtDlpStatus();
    loadSettings();
  }, []);

  useEffect(() => {
    if (consoleRef.current && installLog) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [installLog]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const checkYtDlpStatus = async () => {
    try {
      const status = await window.electronAPI.checkYtDlpStatus();
      setYtDlpStatus(status ? 'installed' : 'not-installed');
    } catch (error) {
      console.error('Error checking yt-dlp status:', error);
      setYtDlpStatus('not-installed');
      showNotification(`Failed to check yt-dlp status: ${error.message || 'Connection error'}`, 'error');
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electronAPI.getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showNotification(`Failed to load settings: ${error.message || 'File system error'}`, 'error');
    }
  };

  const installYtDlp = async () => {
    setIsInstalling(true);
    setShowConsole(true);
    setInstallLog('🚀 Starting yt-dlp installation...\n');
    
    try {
      // Listen for installation progress
      window.electronAPI.onYtDlpInstallProgress((data) => {
        setInstallLog(prev => prev + data + '\n');
      });

      const result = await window.electronAPI.installYtDlp();
      
      if (result.success) {
        setYtDlpStatus('installed');
        setInstallLog(prev => prev + '✅ Installation completed successfully!\n');
        showNotification('yt-dlp installed successfully!', 'success');
      } else {
        setInstallLog(prev => prev + `❌ Installation failed: ${result.error}\n`);
        showNotification('Installation failed. Check console for details.', 'error');
      }
    } catch (error) {
      setInstallLog(prev => prev + `❌ Installation error: ${error.message}\n`);
      showNotification('Installation error occurred.', 'error');
    } finally {
      setIsInstalling(false);
      window.electronAPI.removeAllListeners('ytdlp-install-progress');
    }
  };

  const saveSettings = async (newSettings = settings) => {
    setIsSaving(true);
    try {
      await window.electronAPI.saveSettings(newSettings);
      showNotification('Settings saved automatically!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification(`Failed to save settings: ${error.message || 'File system error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save settings when they change
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    // Debounce auto-save to avoid too many calls
    setTimeout(() => saveSettings(newSettings), 500);
  };

  const selectDownloadPath = async () => {
    try {
      const result = await window.electronAPI.selectDownloadPath();
      if (result && !result.canceled) {
        updateSetting('downloadPath', result.filePath);
        showNotification('Download path updated and saved!', 'success');
      }
    } catch (error) {
      console.error('Error selecting download path:', error);
      showNotification(`Failed to select download path: ${error.message || 'Dialog error'}`, 'error');
    }
  };

  // Function to detect and validate path
  const detectAndValidatePath = async () => {
    try {
      const isValid = await window.electronAPI.validatePath(settings.downloadPath);
      if (!isValid) {
        showNotification('Current download path is invalid or inaccessible', 'error');
        // Auto-set to default path if current is invalid
        const homeDir = await window.electronAPI.getHomeDirectory();
        const defaultPath = homeDir + '/Downloads';
        updateSetting('downloadPath', defaultPath);
        showNotification('Reset to default download path', 'success');
      } else {
        showNotification('Download path is valid and accessible', 'success');
      }
    } catch (error) {
      console.error('Error validating path:', error);
      showNotification(`Failed to validate path "${settings.downloadPath}": ${error.message || 'File system error'}`, 'error');
    }
  };

  return (
    <div className="relative p-6 space-y-6 max-w-4xl mx-auto">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
              notification.type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {notification.type === 'success' ? '✅' : '❌'}
              </span>
              <span className="font-medium">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Settings & Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your download preferences and manage yt-dlp installation
        </p>
      </div>

      {/* yt-dlp Status Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-600"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-md">
              <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                yt-dlp Engine
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Core download engine status
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              ytDlpStatus === 'installed' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              ytDlpStatus === 'checking' 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                ytDlpStatus === 'installed' ? 'bg-green-500' :
                ytDlpStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span>
                {ytDlpStatus === 'installed' ? 'Ready' :
                 ytDlpStatus === 'checking' ? 'Checking...' :
                 'Not Installed'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">
            {ytDlpStatus === 'installed' ? '🎉 yt-dlp is installed and ready to download videos' :
             ytDlpStatus === 'checking' ? '🔍 Checking yt-dlp installation status...' :
             '⚠️ yt-dlp needs to be installed to download videos'}
          </span>
          
          {ytDlpStatus === 'not-installed' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={installYtDlp}
              disabled={isInstalling}
              className="px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {isInstalling ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Installing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Install yt-dlp</span>
                </div>
              )}
            </motion.button>
          )}
        </div>

        {/* Console Toggle */}
        {installLog && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Installation Console</span>
              </h4>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConsole(!showConsole)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors duration-200"
              >
                {showConsole ? 'Hide Console' : 'Show Console'}
              </motion.button>
            </div>
            
            <AnimatePresence>
              {showConsole && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-900 rounded-lg overflow-hidden shadow-inner border border-gray-700"
                >
                  <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-gray-400 text-sm font-mono">Installation Terminal</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setInstallLog('')}
                      className="text-gray-400 hover:text-white transition-colors duration-200"
                      title="Clear console"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </motion.button>
                  </div>
                  <div 
                    ref={consoleRef}
                    className="bg-gray-900 text-green-400 p-4 font-mono text-sm max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
                  >
                    <pre className="whitespace-pre-wrap">{installLog}</pre>
                    {isInstalling && (
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400">Processing...</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Download Settings */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-600"
      >
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-md">
            <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Download Preferences
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure quality, formats, and download location
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Download Path */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              📁 Download Location
            </label>
            <div className="flex flex-col space-y-3">
              <input
                type="text"
                value={settings.downloadPath}
                readOnly
                placeholder="Select your preferred download folder..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm mb-3"
              />
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    const homeDir = await window.electronAPI.getHomeDirectory();
                    const defaultPath = homeDir + '/Downloads';
                    updateSetting('downloadPath', defaultPath);
                    showNotification('Default download path set!', 'success');
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>Set Default</span>
                  </div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={selectDownloadPath}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-500 hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-500 dark:hover:to-gray-400 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-all duration-200 shadow-sm"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>Browse Folder</span>
                  </div>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Video Quality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              🎥 Video Quality
            </label>
            <select
              value={settings.videoQuality}
              onChange={(e) => updateSetting('videoQuality', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
            >
              <option value="best">🏆 Best Quality Available</option>
              <option value="4320p">🌟 8K Ultra HD (4320p)</option>
              <option value="2160p">💎 4K Ultra HD (2160p)</option>
              <option value="1440p">🎯 2K QHD (1440p)</option>
              <option value="1080p">🔥 Full HD (1080p)</option>
              <option value="720p">📺 HD (720p)</option>
              <option value="480p">📱 SD (480p)</option>
              <option value="360p">💾 Low (360p)</option>
              <option value="worst">⚡ Fastest (Lowest)</option>
            </select>
          </div>

          {/* Video Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              📹 Video Format
            </label>
            <select
              value={settings.videoFormat}
              onChange={(e) => updateSetting('videoFormat', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
            >
              <option value="mp4">MP4 (Recommended)</option>
              <option value="webm">WebM (Web Optimized)</option>
              <option value="mkv">MKV (High Quality)</option>
            </select>
          </div>

          {/* Audio Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              🎵 Audio Format
            </label>
            <select
              value={settings.audioFormat}
              onChange={(e) => updateSetting('audioFormat', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
            >
              <option value="mp3">MP3 (Universal)</option>
              <option value="aac">AAC (High Quality)</option>
              <option value="wav">WAV (Lossless)</option>
              <option value="flac">FLAC (Audiophile)</option>
            </select>
          </div>

          {/* Additional Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              ⚙️ Additional Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.extractAudio}
                  onChange={(e) => updateSetting('extractAudio', e.target.checked)}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Extract audio only</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.downloadSubtitles}
                  onChange={(e) => updateSetting('downloadSubtitles', e.target.checked)}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Download subtitles</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.keepOriginal}
                  onChange={(e) => updateSetting('keepOriginal', e.target.checked)}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Keep original file</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.embedThumbnail}
                  onChange={(e) => updateSetting('embedThumbnail', e.target.checked)}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Embed thumbnail</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            💡 Settings are automatically saved and applied to future downloads
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.history.back()}
              className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all duration-200 shadow-lg"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={saveSettings}
              disabled={isSaving}
              className="w-full sm:w-auto min-w-[140px] px-8 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Settings</span>
                </div>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;