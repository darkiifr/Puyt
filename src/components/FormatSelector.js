import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FormatSelector = ({ formats, selectedFormat, onFormatChange }) => {
  const [selectedTab, setSelectedTab] = useState('video');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const formatCategories = useMemo(() => {
    if (!formats || formats.length === 0) return { video: [], audio: [], combined: [] };

    const video = [];
    const audio = [];
    const combined = [];

    formats.forEach(format => {
      const hasVideo = format.vcodec && format.vcodec !== 'none';
      const hasAudio = format.acodec && format.acodec !== 'none';

      if (hasVideo && hasAudio) {
        combined.push(format);
      } else if (hasVideo) {
        video.push(format);
      } else if (hasAudio) {
        audio.push(format);
      }
    });

    // Sort by quality
    const sortByQuality = (a, b) => {
      if (a.height && b.height) return b.height - a.height;
      if (a.abr && b.abr) return b.abr - a.abr;
      if (a.filesize && b.filesize) return b.filesize - a.filesize;
      return 0;
    };

    return {
      video: video.sort(sortByQuality),
      audio: audio.sort(sortByQuality),
      combined: combined.sort(sortByQuality)
    };
  }, [formats]);

  const formatFileSize = (bytes) => {
    if (!bytes) return null;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getQualityLabel = (format) => {
    if (format.height) {
      return `${format.height}p`;
    }
    if (format.abr) {
      return `${format.abr}kbps`;
    }
    return format.format_note || 'Unknown';
  };

  const getFormatIcon = (format) => {
    const hasVideo = format.vcodec && format.vcodec !== 'none';
    const hasAudio = format.acodec && format.acodec !== 'none';

    if (hasVideo && hasAudio) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else if (hasVideo) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8m-8 0V4a1 1 0 011-1h6a1 1 0 011 1v0" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      );
    }
  };

  const FormatCard = ({ format, isSelected, onClick }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
      }`}
      onClick={onClick}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
      
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${
          isSelected ? 'bg-brand-100 text-brand-600 dark:bg-brand-800 dark:text-brand-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {getFormatIcon(format)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`font-semibold text-sm ${
              isSelected ? 'text-brand-900 dark:text-brand-100' : 'text-gray-900 dark:text-white'
            }`}>
              {getQualityLabel(format)}
            </h4>
            <span className={`text-xs px-2 py-1 rounded-full ${
              isSelected 
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-800 dark:text-brand-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {format.ext?.toUpperCase() || 'Unknown'}
            </span>
          </div>
          
          <div className="space-y-1">
            {format.filesize && (
              <p className={`text-xs ${
                isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-gray-500 dark:text-gray-400'
              }`}>
                📁 {formatFileSize(format.filesize)}
              </p>
            )}
            
            {showAdvanced && (
              <div className={`text-xs space-y-1 ${
                isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {format.vcodec && format.vcodec !== 'none' && (
                  <p>🎥 {format.vcodec}</p>
                )}
                {format.acodec && format.acodec !== 'none' && (
                  <p>🔊 {format.acodec}</p>
                )}
                {format.fps && (
                  <p>📺 {format.fps} fps</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const tabs = [
    { id: 'combined', label: 'Video + Audio', count: formatCategories.combined.length },
    { id: 'video', label: 'Video Only', count: formatCategories.video.length },
    { id: 'audio', label: 'Audio Only', count: formatCategories.audio.length }
  ];

  const currentFormats = formatCategories[selectedTab] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="w-5 h-5 mr-2 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Format Selection
          </h2>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`text-sm px-3 py-1 rounded-lg transition-colors ${
              showAdvanced
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {showAdvanced ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>
      
      <div className="card-body">
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                selectedTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  selectedTab === tab.id
                    ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Format Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentFormats.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentFormats.map((format, index) => (
                  <FormatCard
                    key={format.format_id || index}
                    format={format}
                    isSelected={selectedFormat?.format_id === format.format_id}
                    onClick={() => onFormatChange(format)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No {tabs.find(t => t.id === selectedTab)?.label.toLowerCase()} formats available
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try selecting a different format type or check if the video supports this format.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        
        {/* Selected Format Info */}
        {selectedFormat && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-800"
          >
            <h4 className="font-medium text-brand-900 dark:text-brand-100 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Selected Format
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-brand-600 dark:text-brand-400 font-medium">Quality:</span>
                <p className="text-brand-800 dark:text-brand-200">{getQualityLabel(selectedFormat)}</p>
              </div>
              <div>
                <span className="text-brand-600 dark:text-brand-400 font-medium">Format:</span>
                <p className="text-brand-800 dark:text-brand-200">{selectedFormat.ext?.toUpperCase() || 'Unknown'}</p>
              </div>
              {selectedFormat.filesize && (
                <div>
                  <span className="text-brand-600 dark:text-brand-400 font-medium">Size:</span>
                  <p className="text-brand-800 dark:text-brand-200">{formatFileSize(selectedFormat.filesize)}</p>
                </div>
              )}
              <div>
                <span className="text-brand-600 dark:text-brand-400 font-medium">Type:</span>
                <p className="text-brand-800 dark:text-brand-200">
                  {selectedFormat.vcodec && selectedFormat.vcodec !== 'none' && selectedFormat.acodec && selectedFormat.acodec !== 'none'
                    ? 'Video + Audio'
                    : selectedFormat.vcodec && selectedFormat.vcodec !== 'none'
                    ? 'Video Only'
                    : 'Audio Only'
                  }
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default FormatSelector;