import React from 'react';
import { motion } from 'framer-motion';

const VideoInfo = ({ videoInfo, downloadParameters }) => {
  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card overflow-hidden"
    >
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Video Information
        </h2>
      </div>
      
      <div className="card-body">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Thumbnail */}
          {videoInfo.thumbnail && (
            <div className="flex-shrink-0">
              <div className="relative w-full lg:w-64 h-36 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <img
                  src={videoInfo.thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden w-full h-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                
                {/* Duration overlay */}
                {videoInfo.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(videoInfo.duration)}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Video Details */}
          <div className="flex-1 space-y-4">
            {/* Title */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
                {videoInfo.title || 'Unknown Title'}
              </h3>
              {videoInfo.uploader && (
                <p className="text-gray-600 dark:text-gray-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {videoInfo.uploader}
                </p>
              )}
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Duration */}
              {videoInfo.duration && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Duration
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {formatDuration(videoInfo.duration)}
                  </div>
                </div>
              )}
              
              {/* Formats Count */}
              {videoInfo.formats && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Formats
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {videoInfo.formats.length} available
                  </div>
                </div>
              )}
              
              {/* Best Quality */}
              {videoInfo.formats && videoInfo.formats.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Best Quality
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {(() => {
                      const bestFormat = videoInfo.formats
                        .filter(f => f.height)
                        .sort((a, b) => (b.height || 0) - (a.height || 0))[0];
                      return bestFormat ? `${bestFormat.height}p` : 'Unknown';
                    })()}
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick Info */}
            <div className="flex flex-wrap gap-2">
              {videoInfo.formats && videoInfo.formats.some(f => f.vcodec && f.vcodec !== 'none') && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Video
                </span>
              )}
              {videoInfo.formats && videoInfo.formats.some(f => f.acodec && f.acodec !== 'none') && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  Audio
                </span>
              )}
              {videoInfo.formats && videoInfo.formats.some(f => f.ext === 'mp4') && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  MP4 Available
                </span>
              )}
            </div>
            
            {/* Selected Download Options */}
            {downloadParameters && (
              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Selected Download Options
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Quality:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {downloadParameters.quality === 'best' ? '🏆 Best' : 
                       downloadParameters.quality === 'worst' ? '⚡ Fastest' : 
                       `📺 ${downloadParameters.quality}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Format:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {downloadParameters.format?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Audio:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {downloadParameters.extractAudio ? '🎵 Only' : 
                       downloadParameters.integratedAudio ? '🔊 Integrated' : '❌ None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Extras:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {[downloadParameters.downloadSubtitles && '📝', 
                        downloadParameters.embedThumbnail && '🖼️'].filter(Boolean).join(' ') || '➖'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoInfo;