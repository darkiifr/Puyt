import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UpdateSettings from './UpdateSettings';
import DependencyManager from './DependencyManager';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Toggle from './ui/Toggle';
import { Tabs, TabPanel } from './ui/Tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';

const Settings = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('general');

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


  useEffect(() => {
    loadSettings();
  }, []);



  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };



  const loadSettings = async () => {
    try {
      const response = await window.electronAPI.getSettings();
      if (response && response.success) {
        setSettings(response.data);
      } else if (response && response.error) {
        console.error('Error loading settings:', response.error);
        showNotification(`Failed to load settings: ${response.error}`, 'error');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showNotification(`Failed to load settings: ${error.message || 'File system error'}`, 'error');
    }
  };



  const saveSettings = async (newSettings = settings) => {
    setIsSaving(true);
    try {
      const response = await window.electronAPI.saveSettings(newSettings);
      
      // Handle different response formats
      if (response && response.success === true) {
        showNotification(response.message || 'Settings saved successfully!', 'success');
      } else if (response && response.success === false && response.error) {
        console.error('Error saving settings:', response.error);
        showNotification(`Failed to save settings: ${response.error}`, 'error');
      } else if (response && response.error) {
        // Handle error-only response format
        console.error('Error saving settings:', response.error);
        showNotification(`Failed to save settings: ${response.error}`, 'error');
      } else if (response === true || (response && !response.hasOwnProperty('success'))) {
        // Handle legacy response format (boolean true or object without success property)
        showNotification('Settings saved successfully!', 'success');
      } else {
        // Fallback for unexpected response format
        console.warn('Unexpected response format:', response);
        showNotification('Settings saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification(`Failed to save settings: ${error.message || 'File system error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save with useRef to persist timeout across renders
  const autoSaveTimeoutRef = useRef(null);
  
  const debouncedSaveSettings = useCallback((newSettings) => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveSettings(newSettings);
      autoSaveTimeoutRef.current = null;
    }, 800); // Increased debounce time for better UX
  }, []);

  // Auto-save settings when they change
  const updateSetting = useCallback((key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    debouncedSaveSettings(newSettings);
  }, [settings, debouncedSaveSettings]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const selectDownloadPath = async () => {
    try {
      const result = await window.electronAPI.selectDownloadPath();
      if (result && result.error) {
        console.error('Error selecting download path:', result.error);
        showNotification(`Failed to select download path: ${result.error}`, 'error');
        return;
      }
      
      if (result && !result.canceled && result.filePath) {
        updateSetting('downloadPath', result.filePath);
        showNotification('Download path updated and saved!', 'success');
      } else if (result && result.canceled) {
        // User canceled the dialog - no action needed
        console.log('User canceled download path selection');
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
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-lg shadow-sm ${
              notification.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-5 h-5 mr-3 ${
                notification.type === 'success' ? 'text-green-400' : 'text-red-400'
              }`}>
                {notification.type === 'success' ? (
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="font-medium">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure your download preferences and manage dependencies
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs
        tabs={[
          {
            id: 'general',
            label: 'General',
            icon: (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
            )
          },
          {
            id: 'dependencies',
            label: 'Dependencies',
            icon: (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )
          },
          {
            id: 'updates',
            label: 'Updates',
            icon: (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )
          }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-8"
      />

      {/* Tab Content */}
      {activeTab === 'general' && (
        <TabPanel>
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <CardTitle>Download Preferences</CardTitle>
                  <CardDescription>Configure quality, formats, and download location</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Download Path */}
              <div className="md:col-span-2">
                <Input
                  label="📁 Download Location"
                  value={settings.downloadPath}
                  readOnly
                  placeholder="Select your preferred download folder..."
                  leftIcon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  }
                />
                <div className="flex space-x-3 mt-3">
                  <Button
                    variant="primary"
                    onClick={async () => {
                      const homeDir = await window.electronAPI.getHomeDirectory();
                      const defaultPath = homeDir + '/Downloads';
                      updateSetting('downloadPath', defaultPath);
                      showNotification('Default download path set!', 'success');
                    }}
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Set Default
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={selectDownloadPath}
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Browse Folder
                  </Button>
                </div>
              </div>

              {/* Video Quality */}
              <div>
                <Select
                  label="🎥 Video Quality"
                  value={settings.videoQuality}
                  onChange={(e) => updateSetting('videoQuality', e.target.value)}
                  options={[
                    { value: 'best', label: '🏆 Best Quality Available' },
                    { value: '4320p', label: '🌟 8K Ultra HD (4320p)' },
                    { value: '2160p', label: '💎 4K Ultra HD (2160p)' },
                    { value: '1440p', label: '🎯 2K QHD (1440p)' },
                    { value: '1080p', label: '🔥 Full HD (1080p)' },
                    { value: '720p', label: '📺 HD (720p)' },
                    { value: '480p', label: '📱 SD (480p)' },
                    { value: '360p', label: '💾 Low (360p)' },
                    { value: 'worst', label: '⚡ Fastest (Lowest)' }
                  ]}
                />
              </div>

          {/* Video Format */}
          <div>
            <Select
              label="📹 Video Format"
              value={settings.videoFormat}
              onChange={(value) => updateSetting('videoFormat', value)}
              options={[
                { value: 'mp4', label: 'MP4 (Recommended)' },
                { value: 'webm', label: 'WebM (Web Optimized)' },
                { value: 'mkv', label: 'MKV (High Quality)' }
              ]}
            />
          </div>

          {/* Audio Format */}
          <div>
            <Select
              label="🎵 Audio Format"
              value={settings.audioFormat}
              onChange={(value) => updateSetting('audioFormat', value)}
              options={[
                { value: 'mp3', label: 'MP3 (Universal)' },
                { value: 'aac', label: 'AAC (High Quality)' },
                { value: 'wav', label: 'WAV (Lossless)' },
                { value: 'flac', label: 'FLAC (Audiophile)' }
              ]}
            />
          </div>

          {/* Additional Settings */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              ⚙️ Additional Options
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Toggle
                checked={settings.extractAudio}
                onChange={(checked) => updateSetting('extractAudio', checked)}
                label="Extract audio only"
                description="Download only the audio track from videos"
              />
              <Toggle
                checked={settings.downloadSubtitles}
                onChange={(checked) => updateSetting('downloadSubtitles', checked)}
                label="Download subtitles"
                description="Include subtitle files when available"
              />
              <Toggle
                checked={settings.keepOriginal}
                onChange={(checked) => updateSetting('keepOriginal', checked)}
                label="Keep original file"
                description="Preserve the original downloaded file"
              />
              <Toggle
                checked={settings.embedThumbnail}
                onChange={(checked) => updateSetting('embedThumbnail', checked)}
                label="Embed thumbnail"
                description="Add video thumbnail to the file metadata"
              />
            </div>
          </div>


        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            💡 Settings are automatically saved and applied to future downloads
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={() => onNavigate ? onNavigate('home') : window.history.back()}
              className="w-full sm:w-auto"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={saveSettings}
              disabled={isSaving}
              loading={isSaving}
              className="w-full sm:w-auto min-w-[140px]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </Button>
          </div>
        </div>
            </CardContent>
          </Card>
        </TabPanel>
      )}

      {/* Dependencies Tab Content */}
      {activeTab === 'dependencies' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DependencyManager />
        </motion.div>
      )}

      {/* Updates Tab Content */}
      {activeTab === 'updates' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <UpdateSettings />
        </motion.div>
      )}
    </div>
  );
};

export default Settings;