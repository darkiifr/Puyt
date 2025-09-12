import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DynamicParameterControls = ({ videoInfo, onParametersChange, initialSettings = {} }) => {
  const [parameters, setParameters] = useState({
    quality: initialSettings.videoQuality || 'best',
    format: initialSettings.videoFormat || 'mp4',
    audioFormat: initialSettings.audioFormat || 'mp3',
    extractAudio: initialSettings.extractAudio || false,
    downloadSubtitles: initialSettings.downloadSubtitles || false,
    embedThumbnail: initialSettings.embedThumbnail || false,
    startTime: '',
    endTime: '',
    customArgs: ''
  });

  useEffect(() => {
    // Notify parent component of parameter changes
    onParametersChange(parameters);
  }, [parameters, onParametersChange]);

  const updateParameter = (key, value) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  const getAvailableQualities = () => {
    if (!videoInfo?.formats) return [];
    
    const qualities = new Set();
    videoInfo.formats.forEach(format => {
      if (format.height) {
        qualities.add(`${format.height}p`);
      }
    });
    
    return Array.from(qualities).sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      return bNum - aNum;
    });
  };

  const getAvailableFormats = () => {
    if (!videoInfo?.formats) return [];
    
    const formats = new Set();
    videoInfo.formats.forEach(format => {
      if (format.ext) {
        formats.add(format.ext);
      }
    });
    
    return Array.from(formats);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 shadow-lg border border-blue-200 dark:border-blue-800"
    >
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            🎛️ Download Parameters
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Customize download settings for this video in real-time
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quality Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            🎥 Video Quality
          </label>
          <select
            value={parameters.quality}
            onChange={(e) => updateParameter('quality', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="best">🏆 Best Available</option>
            {getAvailableQualities().map(quality => (
              <option key={quality} value={quality}>
                📺 {quality}
              </option>
            ))}
            <option value="worst">⚡ Fastest (Lowest)</option>
          </select>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            📹 Video Format
          </label>
          <select
            value={parameters.format}
            onChange={(e) => updateParameter('format', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="mp4">MP4 (Recommended)</option>
            <option value="webm">WebM (Web Optimized)</option>
            <option value="mkv">MKV (High Quality)</option>
            {getAvailableFormats().map(format => (
              <option key={format} value={format}>
                {format.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Audio Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            🎵 Audio Format
          </label>
          <select
            value={parameters.audioFormat}
            onChange={(e) => updateParameter('audioFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="mp3">MP3 (Universal)</option>
            <option value="aac">AAC (High Quality)</option>
            <option value="wav">WAV (Lossless)</option>
            <option value="flac">FLAC (Audiophile)</option>
          </select>
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ⏰ Start Time (optional)
          </label>
          <input
            type="text"
            value={parameters.startTime}
            onChange={(e) => updateParameter('startTime', e.target.value)}
            placeholder="00:30 or 30s"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* End Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ⏱️ End Time (optional)
          </label>
          <input
            type="text"
            value={parameters.endTime}
            onChange={(e) => updateParameter('endTime', e.target.value)}
            placeholder="05:30 or 330s"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Custom Arguments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ⚙️ Custom Args
          </label>
          <input
            type="text"
            value={parameters.customArgs}
            onChange={(e) => updateParameter('customArgs', e.target.value)}
            placeholder="--embed-subs --write-info-json"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={parameters.extractAudio}
            onChange={(e) => updateParameter('extractAudio', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">🎵 Extract audio only</span>
        </label>
        
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={parameters.downloadSubtitles}
            onChange={(e) => updateParameter('downloadSubtitles', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">📝 Download subtitles</span>
        </label>
        
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={parameters.embedThumbnail}
            onChange={(e) => updateParameter('embedThumbnail', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">🖼️ Embed thumbnail</span>
        </label>
      </div>

      {/* Parameter Preview */}
      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📋 Generated Command Preview:</h4>
        <code className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
          yt-dlp {parameters.quality !== 'best' ? `-f "best[height<=${parameters.quality.replace('p', '')}]"` : '-f best'}
          {parameters.extractAudio ? ' --extract-audio' : ''}
          {parameters.audioFormat !== 'mp3' ? ` --audio-format ${parameters.audioFormat}` : ''}
          {parameters.downloadSubtitles ? ' --write-subs' : ''}
          {parameters.embedThumbnail ? ' --embed-thumbnail' : ''}
          {parameters.startTime ? ` --download-sections "*${parameters.startTime}-${parameters.endTime || 'end'}"` : ''}
          {parameters.customArgs ? ` ${parameters.customArgs}` : ''}
          {' "[URL]"'}
        </code>
      </div>
    </motion.div>
  );
};

export default DynamicParameterControls;