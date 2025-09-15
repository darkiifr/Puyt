import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DownloadSettings from './DownloadSettings';
import DynamicParameterControls from './DynamicParameterControls';
import MiniConsole from './MiniConsole';

const BatchDownloader = () => {
  const [urls, setUrls] = useState(['']);
  const [downloadPath, setDownloadPath] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [batchInfo, setBatchInfo] = useState(null);
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [currentDownload, setCurrentDownload] = useState(null);
  const [completedDownloads, setCompletedDownloads] = useState([]);
  const [failedDownloads, setFailedDownloads] = useState([]);
  const [error, setError] = useState('');
  const [consoleProgress, setConsoleProgress] = useState({ message: '', type: 'info' });
  const [dynamicParameters, setDynamicParameters] = useState({
    quality: 'best',
    format: 'mp4',
    audioFormat: 'mp3',
    extractAudio: false,
    integratedAudio: true,
    downloadSubtitles: false,
    embedThumbnail: false,
    startTime: null,
    endTime: null,
    customArgs: '',
    preferHEVC: false,
    videoCodec: 'auto'
  });

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      try {
        const savedSettings = JSON.parse(localStorage.getItem('puytSettings') || '{}');
        if (savedSettings.downloadPath) {
          setDownloadPath(savedSettings.downloadPath);
        }
        
        // Load dynamic parameters from saved settings
        const savedParams = { ...dynamicParameters };
        Object.keys(dynamicParameters).forEach(key => {
          if (savedSettings[key] !== undefined) {
            savedParams[key] = savedSettings[key];
          }
        });
        setDynamicParameters(savedParams);

        if (window.electronAPI?.getSettings) {
          const electronSettings = await window.electronAPI.getSettings();
          if (electronSettings.downloadPath) {
            setDownloadPath(electronSettings.downloadPath);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();

    // Setup event listeners
    if (window.electronAPI) {
      const handleBatchProgress = (data) => {
        setConsoleProgress({
          message: `📦 Batch Progress: ${data.completed}/${data.total} - ${data.currentVideo || 'Processing...'}`,
          type: 'info'
        });
        
        if (data.currentVideo) {
          setCurrentDownload(data.currentVideo);
        }
        
        if (data.completed > completedDownloads.length) {
          setCompletedDownloads(prev => [...prev, data.lastCompleted]);
        }
        
        if (data.failed && data.failed.length > failedDownloads.length) {
          setFailedDownloads(data.failed);
        }
      };

      const handleBatchComplete = (data) => {
        setIsDownloading(false);
        setCurrentDownload(null);
        setConsoleProgress({
          message: `✅ Batch download completed! ${data.successful}/${data.total} videos downloaded successfully.`,
          type: 'success'
        });
      };

      const handleBatchError = (data) => {
        setError(data.error || 'Batch download failed');
        setIsDownloading(false);
        setCurrentDownload(null);
        setConsoleProgress({
          message: `❌ Batch download failed: ${data.error}`,
          type: 'error'
        });
      };

      window.electronAPI.on?.('batch-progress', handleBatchProgress);
      window.electronAPI.on?.('batch-complete', handleBatchComplete);
      window.electronAPI.on?.('batch-error', handleBatchError);

      return () => {
        window.electronAPI.off?.('batch-progress', handleBatchProgress);
        window.electronAPI.off?.('batch-complete', handleBatchComplete);
        window.electronAPI.off?.('batch-error', handleBatchError);
      };
    }
  }, [completedDownloads.length, failedDownloads.length]);

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index) => {
    if (urls.length > 1) {
      const newUrls = urls.filter((_, i) => i !== index);
      setUrls(newUrls);
    }
  };

  const updateUrl = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleAnalyzeBatch = async (e) => {
    e.preventDefault();
    setError('');
    setBatchInfo(null);
    setIsAnalyzing(true);
    
    const validUrls = urls.filter(url => url.trim());
    if (validUrls.length === 0) {
      setError('Please enter at least one valid URL');
      setIsAnalyzing(false);
      return;
    }

    try {
      setConsoleProgress({
        message: `🔍 Analyzing ${validUrls.length} URL(s)...`,
        type: 'info'
      });

      const batchResults = [];
      for (let i = 0; i < validUrls.length; i++) {
        const url = validUrls[i];
        setConsoleProgress({
          message: `🔍 Analyzing URL ${i + 1}/${validUrls.length}: ${url.substring(0, 50)}...`,
          type: 'info'
        });
        
        try {
          const videoInfo = await window.electronAPI.getVideoInfo(url);
          
          // Check if this is a playlist URL on an unsupported platform
          const isPlaylistUrl = url.includes('playlist') || url.includes('list=');
          if (isPlaylistUrl && videoInfo.platform && !videoInfo.platform.supportsPlaylists) {
            batchResults.push({ 
              url, 
              info: videoInfo, 
              status: 'warning',
              warning: `Playlist not supported on ${videoInfo.platform.name}. Only single video will be downloaded.`
            });
          } else {
            batchResults.push({ url, info: videoInfo, status: 'ready' });
          }
        } catch (error) {
          batchResults.push({ url, error: error.message, status: 'error' });
        }
      }

      setBatchInfo({
        results: batchResults,
        totalVideos: batchResults.reduce((sum, result) => {
          if (result.info?.isPlaylist && result.status !== 'warning') {
            return sum + (result.info.videoCount || 0);
          }
          return sum + (['ready', 'warning'].includes(result.status) ? 1 : 0);
        }, 0),
        totalPlaylists: batchResults.filter(r => r.info?.isPlaylist && r.status !== 'warning').length,
        totalSingleVideos: batchResults.filter(r => r.info && (!r.info.isPlaylist || r.status === 'warning')).length,
        errors: batchResults.filter(r => r.status === 'error').length,
        warnings: batchResults.filter(r => r.status === 'warning').length
      });

      setConsoleProgress({
        message: `✅ Analysis complete! Found ${batchResults.length} items to process.`,
        type: 'success'
      });
    } catch (error) {
      setError(`Analysis failed: ${error.message}`);
      setConsoleProgress({
        message: `❌ Analysis failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBatchDownload = async () => {
    if (!batchInfo || !downloadPath) return;
    
    setIsDownloading(true);
    setError('');
    setCompletedDownloads([]);
    setFailedDownloads([]);
    setCurrentDownload(null);
    
    try {
      const downloadOptions = {
        items: batchInfo?.results?.filter(r => ['ready', 'warning'].includes(r.status)) || [],
        outputPath: downloadPath,
        ...dynamicParameters
      };

      setConsoleProgress({
        message: `🚀 Starting batch download of ${downloadOptions.items.length} items...`,
        type: 'info'
      });

      await window.electronAPI.downloadBatch(downloadOptions);
    } catch (error) {
      console.error('Batch download error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setError(`Batch download failed: ${errorMessage}`);
      setConsoleProgress({
        message: `❌ Batch download failed: ${errorMessage}`,
        type: 'error'
      });
    } finally {
      setIsDownloading(false);
      setCurrentDownload(null);
    }
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      try {
        const folder = await window.electronAPI.selectDownloadFolder();
        if (folder) {
          setDownloadPath(folder);
          const savedSettings = JSON.parse(localStorage.getItem('puytSettings') || '{}');
          const updatedSettings = { ...savedSettings, downloadPath: folder };
          localStorage.setItem('puytSettings', JSON.stringify(updatedSettings));
          
          if (window.electronAPI.saveSettings) {
            try {
              await window.electronAPI.saveSettings(updatedSettings);
            } catch (error) {
              console.error('Error saving settings to electron:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error selecting download folder:', error);
        setError(`Failed to select download folder: ${error.message || 'Unknown file system error'}`);
      }
    }
  };

  const handleOpenFolder = () => {
    if (window.electronAPI && downloadPath) {
      window.electronAPI.openFolder(downloadPath);
    }
  };

  const resetBatch = () => {
    setBatchInfo(null);
    setCompletedDownloads([]);
    setFailedDownloads([]);
    setCurrentDownload(null);
    setError('');
    setConsoleProgress({ message: '', type: 'info' });
  };

  return (
    <div className="space-y-6">
      {/* URL Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="card-body">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Batch Download
          </h2>
          <form onSubmit={handleAnalyzeBatch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Video URLs or Playlist URLs
              </label>
              <div className="space-y-3">
                {urls.map((url, index) => (
                  <div key={index} className="flex space-x-3">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateUrl(index, e.target.value)}
                      placeholder={`https://www.youtube.com/watch?v=... or playlist URL ${index + 1}`}
                      className="input-primary flex-1"
                      disabled={isAnalyzing || isDownloading}
                    />
                    {urls.length > 1 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => removeUrlField(index)}
                        className="btn-secondary px-3"
                        disabled={isAnalyzing || isDownloading}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </motion.button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={addUrlField}
                  className="btn-secondary"
                  disabled={isAnalyzing || isDownloading}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add URL
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isAnalyzing || isDownloading || urls.every(url => !url.trim())}
                  className="btn-primary px-6"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Analyze Batch
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Information */}
      <AnimatePresence>
        {batchInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card"
          >
            <div className="card-body">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Batch Analysis Results
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {batchInfo?.totalVideos || 0}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    Total Videos
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {batchInfo?.totalPlaylists || 0}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    Playlists
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {batchInfo?.totalSingleVideos || 0}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">
                    Single Videos
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {batchInfo?.warnings || 0}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    Warnings
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {batchInfo?.errors || 0}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Errors
                  </div>
                </div>
              </div>
              
              {/* Detailed Results */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {batchInfo?.results?.map((result, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    result.status === 'ready' 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : result.status === 'warning'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.info?.title || result.url.substring(0, 50) + '...'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {result.info?.platform && (
                            <span className="inline-block mr-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                              {result.info.platform.name}
                            </span>
                          )}
                          {result.info?.isPlaylist && result.status !== 'warning' ? `Playlist (${result.info.videoCount} videos)` : 'Single Video'}
                        </div>
                        {result.error && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Error: {result.error}
                          </div>
                        )}
                        {result.warning && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            ⚠️ {result.warning}
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        result.status === 'ready'
                          ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
                          : result.status === 'warning'
                          ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                          : 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200'
                      }`}>
                        {result.status === 'ready' ? 'Ready' : result.status === 'warning' ? 'Warning' : 'Error'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Parameter Controls */}
      <AnimatePresence>
        {batchInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1 }}
          >
            <DynamicParameterControls 
              videoInfo={{ formats: [] }} // Dummy for compatibility
              onParametersChange={setDynamicParameters}
              initialSettings={dynamicParameters}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Settings */}
      <AnimatePresence>
        {batchInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.15 }}
          >
            <DownloadSettings
              downloadPath={downloadPath}
              onSelectFolder={handleSelectFolder}
              onOpenFolder={handleOpenFolder}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Progress */}
      <AnimatePresence>
        {(isDownloading || completedDownloads.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card"
          >
            <div className="card-body">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Batch Download Progress
              </h3>
              
              {currentDownload && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Currently downloading:
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {currentDownload}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {completedDownloads.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Completed
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {failedDownloads.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Failed
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {batchInfo ? batchInfo.totalVideos - completedDownloads.length - failedDownloads.length : 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Remaining
                  </div>
                </div>
              </div>
              
              {!isDownloading && completedDownloads.length > 0 && (
                <div className="flex justify-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleOpenFolder}
                    className="btn-primary"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                    </svg>
                    Open Download Folder
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetBatch}
                    className="btn-secondary"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Start New Batch
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Button */}
      <AnimatePresence>
        {batchInfo && downloadPath && !isDownloading && completedDownloads.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBatchDownload}
              disabled={!downloadPath || !batchInfo?.results?.filter(r => r.status === 'ready').length}
              className="btn-primary px-8 py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Batch ({batchInfo?.results?.filter(r => r.status === 'ready').length || 0} items)
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Console */}
      <AnimatePresence>
        {consoleProgress.message && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <MiniConsole 
              progress={consoleProgress}
              isVisible={!!consoleProgress.message}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BatchDownloader;