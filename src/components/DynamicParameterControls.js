import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DynamicParameterControls = ({ videoInfo, onParametersChange, initialSettings = {} }) => {
  const [parameters, setParameters] = useState({
    quality: initialSettings.videoQuality || 'best',
    format: initialSettings.videoFormat || 'mp4',
    audioFormat: initialSettings.audioFormat || 'mp3',
    extractAudio: initialSettings.extractAudio || false,
    integratedAudio: initialSettings.integratedAudio !== false, // Default to true
    downloadSubtitles: initialSettings.downloadSubtitles || false,
    embedThumbnail: initialSettings.embedThumbnail || false,
    preferHEVC: initialSettings.preferHEVC || false,
    videoCodec: initialSettings.videoCodec || 'auto',
    startTime: '',
    endTime: '',
    customArgs: ''
  });

  useEffect(() => {
    // Notify parent component of parameter changes
    onParametersChange(parameters);
  }, [parameters, onParametersChange]);

  const updateParameter = (key, value) => {
    const newParams = { ...parameters, [key]: value };
    
    // Auto-adjust related parameters for better coherence
    if (key === 'extractAudio' && value) {
      // When extracting audio, disable video-specific options
      newParams.quality = 'best';
      newParams.format = 'best';
    } else if (key === 'extractAudio' && !value) {
      // When not extracting audio, ensure video format is selected
      if (newParams.format === 'bestaudio') {
        newParams.format = 'best';
      }
    }
    
    setParameters(newParams);
  };

  const getAvailableQualities = () => {
    if (!videoInfo?.formats) return [];
    
    const qualities = new Set();
    videoInfo.formats.forEach(format => {
      if (format.height) {
        qualities.add(`${format.height}p`);
      }
    });
    
    // Add standard quality options including 4K and 8K
    const standardQualities = ['8320p', '4320p', '2880p', '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'];
    standardQualities.forEach(quality => {
      const height = parseInt(quality);
      // Only add if we have formats at or above this quality
      const hasQuality = Array.from(qualities).some(q => parseInt(q) >= height);
      if (hasQuality || height <= 1080) { // Always include up to 1080p
        qualities.add(quality);
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

      {/* Download Mode Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          📥 Download Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateParameter('extractAudio', false)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              !parameters.extractAudio
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">🎥 Video + Audio</span>
            </div>
            <p className="text-xs opacity-75">Download complete video with audio</p>
          </button>
          
          <button
            onClick={() => updateParameter('extractAudio', true)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              parameters.extractAudio
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span className="font-medium">🎵 Audio Only</span>
            </div>
            <p className="text-xs opacity-75">Extract and convert audio only</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quality Selection - Available for both video and integrated audio modes */}
        {!parameters.extractAudio && (
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
              {getAvailableQualities().map(quality => {
                const height = parseInt(quality);
                let emoji = '📺';
                if (height >= 4320) emoji = '🎬'; // 8K
                else if (height >= 2160) emoji = '💎'; // 4K
                else if (height >= 1440) emoji = '🔥'; // 2K/1440p
                else if (height >= 1080) emoji = '⭐'; // 1080p
                else if (height >= 720) emoji = '📺'; // 720p
                
                return (
                  <option key={quality} value={quality}>
                    {emoji} {quality} {height >= 2160 ? '(Ultra HD)' : height >= 1080 ? '(Full HD)' : height >= 720 ? '(HD)' : ''}
                  </option>
                );
              })}
              <option value="worst">⚡ Fastest (Lowest)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {parameters.integratedAudio ? 'All qualities available for integrated audio' : 'Higher quality = larger file size'}
            </p>
          </div>
        )}

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {parameters.extractAudio ? '🎵 Audio Format' : '📹 Video Format'}
          </label>
          <select
            value={parameters.extractAudio ? parameters.audioFormat : parameters.format}
            onChange={(e) => updateParameter(parameters.extractAudio ? 'audioFormat' : 'format', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {parameters.extractAudio ? (
              // Audio formats
              <>
                <option value="mp3">MP3 (Universal)</option>
                <option value="aac">AAC (High Quality)</option>
                <option value="wav">WAV (Lossless)</option>
                <option value="flac">FLAC (Audiophile)</option>
              </>
            ) : (
              // Video formats
              <>
                <option value="mp4">MP4 (Recommended)</option>
                <option value="webm">WebM (Web Optimized)</option>
                <option value="mkv">MKV (High Quality)</option>
                {getAvailableFormats().map(format => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </>
            )}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {parameters.extractAudio 
              ? 'MP3 recommended for compatibility'
              : 'MP4 recommended for compatibility'
            }
          </p>
        </div>

        {/* Video Codec - Only show for video mode */}
        {!parameters.extractAudio && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              🎬 Video Codec
            </label>
            <select
              value={parameters.videoCodec}
              onChange={(e) => updateParameter('videoCodec', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="auto">🤖 Auto (Best Available)</option>
              <option value="h264">H.264/AVC (Universal)</option>
              <option value="hevc">💎 HEVC/H.265 (Efficient)</option>
              <option value="vp9">VP9 (Web Optimized)</option>
              <option value="av1">🚀 AV1 (Future-proof)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              HEVC offers better compression but may have compatibility issues
            </p>
          </div>
        )}

        {/* Audio Format - Only show for video mode */}
        {!parameters.extractAudio && (
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
        )}

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

      {/* Audio Extraction Info */}
      {parameters.extractAudio && (
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">🎵 Audio Extraction Mode Active:</p>
              <p>Only the audio track will be downloaded and converted to your selected format. Video quality settings are ignored in this mode.</p>
            </div>
          </div>
        </div>
      )}

      {/* Checkboxes */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={parameters.integratedAudio}
            onChange={(e) => updateParameter('integratedAudio', e.target.checked)}
            disabled={parameters.extractAudio}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">🔊 Video with integrated audio</span>
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
          yt-dlp
          {(() => {
            if (parameters.extractAudio) {
              return ` -f "bestaudio" --extract-audio --audio-format ${parameters.audioFormat}`;
            } else {
              let formatStr = '';
              if (parameters.quality === 'best') {
                if (parameters.integratedAudio) {
                  formatStr = ` -f "best[ext=${parameters.format}]+bestaudio/best"`;
                } else {
                  formatStr = ` -f "best[ext=${parameters.format}]/best"`;
                }
              } else if (parameters.quality === 'worst') {
                if (parameters.integratedAudio) {
                  formatStr = ` -f "worst[ext=${parameters.format}]+worstaudio/worst"`;
                } else {
                  formatStr = ` -f "worst[ext=${parameters.format}]/worst"`;
                }
              } else {
                const height = parameters.quality.replace('p', '');
                if (parameters.integratedAudio) {
                  formatStr = ` -f "best[height<=${height}][ext=${parameters.format}]+bestaudio/best[height<=${height}]/best"`;
                } else {
                  formatStr = ` -f "best[height<=${height}][ext=${parameters.format}]/best[height<=${height}]/best"`;
                }
              }
              return formatStr;
            }
          })()}
          {parameters.downloadSubtitles ? ' --write-subs --write-auto-subs' : ''}
          {parameters.embedThumbnail ? ' --embed-thumbnail' : ''}
          {parameters.startTime ? ` --download-sections "*${parameters.startTime}-${parameters.endTime || 'end'}"` : ''}
          {parameters.customArgs ? ` ${parameters.customArgs}` : ''}
          {' -o "[OUTPUT_PATH]/%(title)s.%(ext)s" "[URL]"'}
        </code>
      </div>
    </motion.div>
  );
};

export default DynamicParameterControls;