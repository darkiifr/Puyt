import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoInfo from './VideoInfo';
import FormatSelector from './FormatSelector';
import DownloadProgress from './DownloadProgress';
import DynamicParameterControls from './DynamicParameterControls';
import DownloadSettings from './DownloadSettings';
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
    // Load settings from both localStorage and electron API
    const loadSettings = async () => {
      let savedSettings = JSON.parse(localStorage.getItem('puytSettings') || '{}');
      
      // Try to load from electron API for better consistency
      if (window.electronAPI && window.electronAPI.getSettings) {
        try {
          const electronSettings = await window.electronAPI.getSettings();
          if (electronSettings) {
            savedSettings = { ...savedSettings, ...electronSettings };
            // Sync localStorage with electron settings
            localStorage.setItem('puytSettings', JSON.stringify(savedSettings));
          }
        } catch (error) {
          console.error('Error loading electron settings:', error);
        }
      }
      
      if (savedSettings.downloadPath) {
        setDownloadPath(savedSettings.downloadPath);
        // Show a subtle indication that saved preference was loaded
        console.log('📁 Loaded saved download path:', savedSettings.downloadPath);
      } else if (window.electronAPI) {
        setDownloadPath('');
      }
      
      // Initialize dynamic parameters with saved settings
      setDynamicParameters({
        quality: savedSettings.videoQuality || 'best',
        format: savedSettings.videoFormat || 'mp4',
        audioFormat: savedSettings.audioFormat || 'mp3',
        extractAudio: savedSettings.extractAudio || false,
        integratedAudio: savedSettings.integratedAudio !== false,
        downloadSubtitles: savedSettings.downloadSubtitles || false,
        embedThumbnail: savedSettings.embedThumbnail || false,
        startTime: '',
        endTime: '',
        customArgs: ''
      });
    };
    
    loadSettings();

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

      // Add download complete listener
      const handleDownloadComplete = (data) => {
        setDownloadComplete(true);
        setIsDownloading(false);
        if (data && data.fileName) {
          const fileSizeMB = data.fileSize ? (data.fileSize / (1024 * 1024)).toFixed(2) : 'Unknown';
          let message = `Download completed successfully! File: ${data.fileName} (${fileSizeMB} MB)`;
          
          // Add folder organization info if applicable
          if (data.isOrganized && data.folderName) {
            message += ` - Organized in folder: "${data.folderName}"`;
          }
          
          setConsoleProgress({
            message,
            type: 'success'
          });
        } else {
          setConsoleProgress({
            message: 'Download completed successfully!',
            type: 'success'
          });
        }
      };

      // Listen for download complete events
      if (window.electronAPI.onDownloadComplete) {
        window.electronAPI.onDownloadComplete(handleDownloadComplete);
      }

      return () => {
        window.electronAPI.removeAllListeners('download-progress');
        window.electronAPI.removeAllListeners('download-error');
        if (window.electronAPI.removeAllListeners) {
          window.electronAPI.removeAllListeners('download-complete');
        }
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
        
        // Auto-select best quality format based on current parameters
        if (info.formats && info.formats.length > 0) {
          const bestFormat = selectBestFormat(info.formats, dynamicParameters);
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
        // Build download options from dynamic parameters and selected format
        const downloadOptions = {
          url: url.trim(),
          outputPath: downloadPath,
          quality: dynamicParameters.quality || 'best',
          format: dynamicParameters.format || 'mp4',
          audioFormat: dynamicParameters.audioFormat || 'mp3',
          extractAudio: dynamicParameters.extractAudio || false,
          integratedAudio: dynamicParameters.integratedAudio !== false,
          downloadSubtitles: dynamicParameters.downloadSubtitles || false,
          embedThumbnail: dynamicParameters.embedThumbnail || false,
          preferHEVC: dynamicParameters.preferHEVC || false,
          videoCodec: dynamicParameters.videoCodec || 'auto',
          startTime: dynamicParameters.startTime || null,
          endTime: dynamicParameters.endTime || null,
          customArgs: dynamicParameters.customArgs || '',
          selectedFormatId: selectedFormat?.format_id || null,
          videoTitle: videoInfo?.title // Pass video title for folder organization
        };

        const formatInfo = selectedFormat ? 
          `${selectedFormat.height ? selectedFormat.height + 'p' : downloadOptions.quality} ${selectedFormat.ext?.toUpperCase() || downloadOptions.format}` :
          `${downloadOptions.quality} ${downloadOptions.format.toUpperCase()}`;
        
        setConsoleProgress({
          message: `Download options: ${formatInfo}, Audio=${downloadOptions.integratedAudio ? 'Integrated' : 'Separate'}${downloadOptions.extractAudio ? ' (Extract Only)' : ''}`,
          type: 'info'
        });

        await window.electronAPI.downloadVideo(downloadOptions);
        // Download completion is now handled by the event listener
      }
    } catch (err) {
      console.error('Video download error:', err);
      const errorMessage = err.message || 'Download failed due to unknown error';
      const detailedError = `Download failed for "${videoInfo?.title || 'video'}": ${errorMessage}`;
      setError(detailedError);
      setConsoleProgress({
        message: `❌ ${detailedError}${err.code ? ` (Error Code: ${err.code})` : ''}`,
        type: 'error'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      try {
        const folder = await window.electronAPI.selectDownloadFolder();
        if (folder) {
          setDownloadPath(folder);
          // Save the selected path to preferences
          const savedSettings = JSON.parse(localStorage.getItem('puytSettings') || '{}');
          const updatedSettings = { ...savedSettings, downloadPath: folder };
          localStorage.setItem('puytSettings', JSON.stringify(updatedSettings));
          
          // Also save to electron settings if available
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

  const selectBestFormat = (formats, params) => {
    if (!formats || formats.length === 0) return null;
    
    const quality = params.quality || 'best';
    const extractAudio = params.extractAudio || false;
    
    if (extractAudio) {
      // For audio extraction, prefer audio-only formats
      const audioFormats = formats.filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'));
      if (audioFormats.length > 0) {
        return audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];
      }
    }
    
    // For video downloads, prefer combined formats (video + audio)
    const combinedFormats = formats.filter(f => f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none');
    
    if (quality === 'best') {
      return combinedFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0] || formats[0];
    } else if (quality === 'worst') {
      return combinedFormats.sort((a, b) => (a.height || 0) - (b.height || 0))[0] || formats[formats.length - 1];
    } else if (quality.includes('p')) {
      const targetHeight = parseInt(quality);
      const matchingFormats = combinedFormats.filter(f => f.height === targetHeight);
      if (matchingFormats.length > 0) {
        return matchingFormats[0];
      }
      // Find closest quality
      return combinedFormats.sort((a, b) => {
        const aDiff = Math.abs((a.height || 0) - targetHeight);
        const bDiff = Math.abs((b.height || 0) - targetHeight);
        return aDiff - bDiff;
      })[0] || formats[0];
    }
    
    return combinedFormats[0] || formats[0];
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

  const getDownloadButtonText = () => {
    const quality = dynamicParameters.quality || 'best';
    const format = dynamicParameters.format || 'mp4';
    const audioFormat = dynamicParameters.audioFormat || 'mp3';
    
    if (dynamicParameters.extractAudio) {
      return `🎵 Extract ${audioFormat.toUpperCase()} Audio`;
    }
    
    if (selectedFormat) {
      const hasVideo = selectedFormat.vcodec && selectedFormat.vcodec !== 'none';
      const hasAudio = selectedFormat.acodec && selectedFormat.acodec !== 'none';
      const qualityText = selectedFormat.height ? `${selectedFormat.height}p` : quality;
      const formatText = selectedFormat.ext?.toUpperCase() || format.toUpperCase();
      
      if (hasVideo && hasAudio) {
        return `📹 Download ${qualityText} ${formatText} (Complete)`;
      } else if (hasVideo) {
        return `🎬 Download ${qualityText} ${formatText} (Video Only)`;
      } else {
        return `🎵 Download ${formatText} Audio`;
      }
    }
    
    // Fallback based on parameters
    if (quality === 'best') {
      return `Download Best Quality ${format.toUpperCase()}`;
    } else if (quality === 'worst') {
      return `Download ${format.toUpperCase()} (Fast)`;
    } else {
      return `Download ${quality} ${format.toUpperCase()}`;
    }
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
            <VideoInfo videoInfo={videoInfo} downloadParameters={dynamicParameters} />
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
              onFormatChange={setSelectedFormat}
              downloadParameters={dynamicParameters}
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
        {videoInfo && downloadPath && !isDownloading && !downloadComplete && (
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
              disabled={!downloadPath}
              className="btn-primary px-8 py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {getDownloadButtonText()}
            </motion.button>
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* Format Selection Helper */}
      <AnimatePresence>
        {videoInfo && selectedFormat && !isDownloading && !downloadComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-center"
          >
            <div className="max-w-md p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Ready to Download:</p>
                  <p>
                    {(() => {
                      const hasVideo = selectedFormat.vcodec && selectedFormat.vcodec !== 'none';
                      const hasAudio = selectedFormat.acodec && selectedFormat.acodec !== 'none';
                      const quality = selectedFormat.height ? `${selectedFormat.height}p` : 'Audio';
                      
                      if (dynamicParameters.extractAudio) {
                        return `Audio will be extracted from ${quality} source`;
                      }
                      
                      if (hasVideo && hasAudio) {
                        return `Complete ${quality} video with integrated audio`;
                      } else if (hasVideo) {
                        return `${quality} video only - audio will be merged automatically`;
                      } else {
                        return `Audio-only download`;
                      }
                    })()} 
                    • Format: {selectedFormat.ext?.toUpperCase()}
                    {selectedFormat.filesize && ` • Size: ${(selectedFormat.filesize / (1024 * 1024)).toFixed(1)} MB`}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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