import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoInfo from './VideoInfo';
import FormatSelector from './FormatSelector';
import DownloadProgress from './DownloadProgress';
import DynamicParameterControls from './DynamicParameterControls';
import MiniConsole from './MiniConsole';

const VideoDownloader = () => {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [downloadPath, setDownloadPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [dynamicParameters, setDynamicParameters] = useState({});
  const [showConsole, setShowConsole] = useState(false);
  const [consoleProgress, setConsoleProgress] = useState(null);

  useEffect(() => {
    // Set default download path from settings
    const savedSettings = JSON.parse(localStorage.getItem('puytSettings') || '{}');
    if (savedSettings.downloadPath) {
      setDownloadPath(savedSettings.downloadPath);
    } else if (window.electronAPI) {
      setDownloadPath('');
    }

    // Initialize dynamic parameters with saved settings
    setDynamicParameters({
      quality: savedSettings.videoQuality || 'best',
      format: savedSettings.videoFormat || 'mp4',
      audioFormat: savedSettings.audioFormat || 'mp3',
      extractAudio: savedSettings.extractAudio || false,
      downloadSubtitles: savedSettings.downloadSubtitles || false,
      embedThumbnail: savedSettings.embedThumbnail || false,
      startTime: '',
      endTime: '',
      customArgs: ''
    });

    // Setup download progress listener
    if (window.electronAPI) {
      window.electronAPI.onDownloadProgress((data) => {
        setDownloadProgress(data.progress);
        setConsoleProgress({
          message: data.message || `Download progress: ${data.progress}%`,
          type: 'progress',
          progress: data.progress
        });
      });

      window.electronAPI.onDownloadError((data) => {
        setError(data.error);
        setIsDownloading(false);
        setConsoleProgress({
          message: `Error: ${data.error}`,
          type: 'error'
        });
      });

      return () => {
        window.electronAPI.removeAllListeners('download-progress');
        window.electronAPI.removeAllListeners('download-error');
      };
    }
  }, []);

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setVideoInfo(null);
    setSelectedFormat(null);
    setDownloadComplete(false);

    try {
      if (window.electronAPI) {
        const info = await window.electronAPI.getVideoInfo(url.trim());
        setVideoInfo(info);
        
        // Auto-select best quality format
        if (info.formats && info.formats.length > 0) {
          const bestFormat = info.formats
            .filter(f => f.vcodec !== 'none' && f.acodec !== 'none')
            .sort((a, b) => (b.height || 0) - (a.height || 0))[0] || info.formats[0];
          setSelectedFormat(bestFormat);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to get video information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo || !downloadPath) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);
    setDownloadComplete(false);
    setShowConsole(true); // Show console when download starts

    // Log download start
    setConsoleProgress({
      message: `Starting download: ${videoInfo.title}`,
      type: 'info'
    });

    try {
      if (window.electronAPI) {
        // Build download options from dynamic parameters
        const downloadOptions = {
          url: url.trim(),
          outputPath: downloadPath,
          quality: dynamicParameters.quality || 'best',
          format: dynamicParameters.format || 'mp4',
          audioFormat: dynamicParameters.audioFormat || 'mp3',
          extractAudio: dynamicParameters.extractAudio || false,
          downloadSubtitles: dynamicParameters.downloadSubtitles || false,
          embedThumbnail: dynamicParameters.embedThumbnail || false,
          startTime: dynamicParameters.startTime || null,
          endTime: dynamicParameters.endTime || null,
          customArgs: dynamicParameters.customArgs || ''
        };

        setConsoleProgress({
          message: `Download options: Quality=${downloadOptions.quality}, Format=${downloadOptions.format}`,
          type: 'info'
        });

        await window.electronAPI.downloadVideo(downloadOptions);
        setDownloadComplete(true);
        setConsoleProgress({
          message: 'Download completed successfully!',
          type: 'success'
        });
      }
    } catch (err) {
      setError(err.message || 'Download failed');
      setConsoleProgress({
        message: `Download failed: ${err.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.selectDownloadFolder();
      if (folder) {
        setDownloadPath(folder);
      }
    }
  };

  const handleOpenFolder = () => {
    if (window.electronAPI && downloadPath) {
      window.electronAPI.openFolder(downloadPath);
    }
  };

  const resetDownload = () => {
    setUrl('');
    setVideoInfo(null);
    setSelectedFormat(null);
    setDownloadProgress(0);
    setError(null);
    setDownloadComplete(false);
    setIsDownloading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Download Videos from Any Platform
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Paste a video URL below to get started. Supports YouTube, Vimeo, Twitter, and many more platforms.
        </p>
      </motion.div>

      {/* URL Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="card-body">
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Video URL
              </label>
              <div className="flex space-x-3">
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="input-primary flex-1"
                  disabled={isLoading || isDownloading}
                  required
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || isDownloading || !url.trim()}
                  className="btn-primary px-6 min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Analyze
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

      {/* Video Information */}
      <AnimatePresence>
        {videoInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <VideoInfo videoInfo={videoInfo} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Parameter Controls */}
      <AnimatePresence>
        {videoInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1 }}
          >
            <DynamicParameterControls 
               videoInfo={videoInfo}
               onParametersChange={setDynamicParameters}
               initialSettings={dynamicParameters}
             />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Settings */}
      <AnimatePresence>
        {videoInfo && (
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

      {/* Format Selector */}
      <AnimatePresence>
        {videoInfo && videoInfo.formats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.25 }}
          >
            <FormatSelector
              formats={videoInfo.formats}
              selectedFormat={selectedFormat}
              onFormatSelect={setSelectedFormat}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Progress */}
      <AnimatePresence>
        {(isDownloading || downloadComplete) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <DownloadProgress
              progress={downloadProgress}
              isDownloading={isDownloading}
              isComplete={downloadComplete}
              onOpenFolder={handleOpenFolder}
              onReset={resetDownload}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Button */}
      <AnimatePresence>
        {videoInfo && selectedFormat && !isDownloading && !downloadComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDownload}
              className="btn-primary px-8 py-3 text-lg font-semibold"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Video
            </motion.button>
          </motion.div>
        )}      </AnimatePresence>

      {/* Mini Console */}
      <MiniConsole
        isVisible={showConsole}
        onToggle={() => setShowConsole(!showConsole)}
        downloadProgress={consoleProgress}
      />
    </div>
  );
};

export default VideoDownloader;