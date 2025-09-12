import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DownloadProgress = ({ progress, isDownloading, error, onCancel, downloadPath }) => {
  const formatSpeed = (speed) => {
    if (!speed) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let size = speed;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
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

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusIcon = () => {
    if (error) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    if (progress?.percent === 100) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    if (isDownloading) {
      return (
        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 text-brand-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </motion.svg>
      );
    }
    
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (error) return 'Download Failed';
    if (progress?.percent === 100) return 'Download Complete';
    if (isDownloading) return 'Downloading...';
    return 'Ready to Download';
  };

  const getStatusColor = () => {
    if (error) return 'text-red-600 dark:text-red-400';
    if (progress?.percent === 100) return 'text-green-600 dark:text-green-400';
    if (isDownloading) return 'text-brand-600 dark:text-brand-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <AnimatePresence>
      {(isDownloading || progress || error) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="card"
        >
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                {getStatusIcon()}
                <span className="ml-2">Download Progress</span>
              </h2>
              
              {isDownloading && onCancel && (
                <button
                  onClick={onCancel}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
          
          <div className="card-body">
            {/* Status */}
            <div className="flex items-center justify-between mb-4">
              <span className={`font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              
              {progress?.percent !== undefined && (
                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                  {progress.percent.toFixed(1)}%
                </span>
              )}
            </div>
            
            {/* Progress Bar */}
            {progress?.percent !== undefined && (
              <div className="mb-6">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percent}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      error
                        ? 'bg-red-500'
                        : progress.percent === 100
                        ? 'bg-green-500'
                        : 'bg-gradient-to-r from-brand-500 to-brand-600'
                    }`}
                  />
                </div>
                
                {/* Progress glow effect */}
                {isDownloading && progress.percent > 0 && progress.percent < 100 && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-full bg-gradient-to-r from-transparent via-brand-200 to-transparent dark:via-brand-800 rounded-full h-3 -mt-3 opacity-50"
                    style={{ width: `${progress.percent}%` }}
                  />
                )}
              </div>
            )}
            
            {/* Download Stats */}
            {progress && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {/* Downloaded Size */}
                {progress.downloaded_bytes !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Downloaded
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatSize(progress.downloaded_bytes)}
                      {progress.total_bytes && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
                          / {formatSize(progress.total_bytes)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Download Speed */}
                {progress.speed !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Speed
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatSpeed(progress.speed)}
                    </div>
                  </div>
                )}
                
                {/* ETA */}
                {progress.eta !== undefined && progress.eta > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ETA
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatTime(progress.eta)}
                    </div>
                  </div>
                )}
                
                {/* Elapsed Time */}
                {progress.elapsed !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Elapsed
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatTime(progress.elapsed)}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4"
              >
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                      Download Error
                    </h4>
                    <p className="text-red-700 dark:text-red-300 text-sm">
                      {error}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Success Message with Download Path */}
            {progress?.percent === 100 && !error && downloadPath && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                        Download Complete!
                      </h4>
                      <p className="text-green-700 dark:text-green-300 text-sm mb-2">
                        Your video has been successfully downloaded.
                      </p>
                      <p className="text-green-600 dark:text-green-400 text-xs font-mono bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                        {downloadPath}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => window.electronAPI?.openFolder(downloadPath)}
                    className="ml-4 px-3 py-1 text-sm bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5L12 5H5a2 2 0 00-2 2z" />
                    </svg>
                    Open Folder
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DownloadProgress;