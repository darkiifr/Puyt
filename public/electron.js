const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

// Conditionally require YtDlpInstaller only in development
let YtDlpInstaller;
try {
  YtDlpInstaller = require('../scripts/install-ytdlp');
} catch (error) {
  console.log('YtDlpInstaller not available in production build');
  YtDlpInstaller = null;
}

let mainWindow;

function createWindow() {
  // Remove the default menu bar
  Menu.setApplicationMenu(null);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false,
    icon: path.join(__dirname, '../Assets/Square44x44Logo.scale-100.png'),
    autoHideMenuBar: true
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
    
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-video-info', async (event, url) => {
  return new Promise(async (resolve, reject) => {
    // Check if yt-dlp is available before proceeding
    const ytDlpPath = getYtDlpPath();
    if (!ytDlpPath) {
      console.log('yt-dlp path not found, rejecting');
      reject(new Error('yt-dlp not found. Please install yt-dlp first.'));
      return;
    }
    
    console.log('Using yt-dlp at:', ytDlpPath);
    // Skip version check for now since yt-dlp path is found
    const ytDlpAvailable = true;
    
    if (!ytDlpAvailable) {
      reject(new Error('yt-dlp not found. Please install yt-dlp first.'));
      return;
    }

    const process = spawn(ytDlpPath, [
      '--dump-json',
      '--no-playlist',
      url
    ]);

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        try {
          const videoInfo = JSON.parse(stdout);
          resolve({
            title: videoInfo.title,
            duration: videoInfo.duration,
            thumbnail: videoInfo.thumbnail,
            uploader: videoInfo.uploader,
            formats: (() => {
              if (!videoInfo.formats) return [];
              
              // Remove duplicates and filter valid formats
              const uniqueFormats = new Map();
              
              videoInfo.formats.forEach(format => {
                // Skip formats without proper codec info
                if (!format.format_id || (!format.vcodec && !format.acodec)) return;
                
                const key = `${format.format_id}_${format.ext}_${format.height || 'audio'}_${format.vcodec || 'none'}_${format.acodec || 'none'}`;
                
                // Only keep if not duplicate or if this one has better quality info
                if (!uniqueFormats.has(key) || 
                    (format.filesize && !uniqueFormats.get(key).filesize)) {
                  uniqueFormats.set(key, {
                    format_id: format.format_id,
                    ext: format.ext,
                    quality: format.quality,
                    filesize: format.filesize,
                    format_note: format.format_note,
                    height: format.height,
                    width: format.width,
                    fps: format.fps,
                    vcodec: format.vcodec === 'none' ? null : format.vcodec,
                    acodec: format.acodec === 'none' ? null : format.acodec,
                    // Add format type for better categorization
                    type: format.vcodec && format.acodec && format.vcodec !== 'none' && format.acodec !== 'none' ? 'video+audio' :
                          format.vcodec && format.vcodec !== 'none' ? 'video' : 'audio'
                  });
                }
              });
              
              return Array.from(uniqueFormats.values());
            })()
          });
        } catch (error) {
          reject(new Error('Failed to parse video information'));
        }
      } else {
        reject(new Error(stderr || 'Failed to get video information'));
      }
    });
  });
});

// FFmpeg fallback function
// Helper function to parse time string to seconds
function parseTimeToSeconds(timeString) {
  const parts = timeString.split(':');
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseFloat(parts[2]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function detectPlatformType(url) {
  const urlLower = url.toLowerCase();
  
  // YouTube and related
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube';
  }
  
  // Social media platforms that work better with FFmpeg
  if (urlLower.includes('tiktok.com') || urlLower.includes('discord.com') || 
      urlLower.includes('instagram.com') || urlLower.includes('twitter.com') ||
      urlLower.includes('x.com') || urlLower.includes('facebook.com') ||
      urlLower.includes('twitch.tv') || urlLower.includes('reddit.com')) {
    return 'social';
  }
  
  // Direct video links
  if (urlLower.match(/\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v)$/)) {
    return 'direct';
  }
  
  // Live streams
  if (urlLower.includes('m3u8') || urlLower.includes('rtmp') || urlLower.includes('rtsp')) {
    return 'stream';
  }
  
  // Other platforms
  return 'other';
}

function downloadWithFfmpeg(url, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    const { 
      quality = 'best', 
      format = 'mp4', 
      extractAudio = false, 
      audioFormat = 'mp3',
      startTime,
      endTime,
      customArgs = '',
      platformType = 'other',
      preferFFmpeg = false
    } = options;

    // Check if ffmpeg is available
    const ffmpegProcess = spawn('ffmpeg', ['-version']);
    
    ffmpegProcess.on('error', () => {
      reject(new Error('FFmpeg not found. Please install FFmpeg to use as fallback.'));
    });
    
    ffmpegProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('FFmpeg not available or not working properly'));
        return;
      }
      
      // For YouTube URLs, try to get direct stream URLs using yt-dlp first
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // Use yt-dlp to get stream URLs without downloading
        const ytDlpPath = getYtDlpPath();
        if (ytDlpPath) {
          const getUrlProcess = spawn(ytDlpPath, ['-g', '--no-warnings', url]);
          let streamUrls = '';
          
          getUrlProcess.stdout.on('data', (data) => {
            streamUrls += data.toString();
          });
          
          getUrlProcess.on('close', (urlCode) => {
            if (urlCode === 0 && streamUrls.trim()) {
              const urls = streamUrls.trim().split('\n');
              const videoUrl = urls[0]; // Use first URL (usually best quality)
              downloadWithFfmpegDirect(videoUrl, outputPath, options, resolve, reject);
            } else {
              // Fallback to direct URL (might not work for YouTube)
              downloadWithFfmpegDirect(url, outputPath, options, resolve, reject);
            }
          });
          
          getUrlProcess.on('error', () => {
            downloadWithFfmpegDirect(url, outputPath, options, resolve, reject);
          });
        } else {
          downloadWithFfmpegDirect(url, outputPath, options, resolve, reject);
        }
      } else {
        downloadWithFfmpegDirect(url, outputPath, options, resolve, reject);
      }
    });
  });
}

function downloadWithFfmpegDirect(url, outputPath, options, resolve, reject) {
  // Build ffmpeg command with proper options
  const { quality, format, extractAudio, audioFormat, startTime, endTime, platformType = 'other' } = options;
  
  // Determine output filename and format
  let outputExtension = 'mp4';
  let outputFilename = 'downloaded_video';
  
  if (extractAudio) {
    outputExtension = audioFormat || 'mp3';
    outputFilename = 'downloaded_audio';
  } else if (format && format !== 'best') {
    outputExtension = format;
  }
  
  const outputFile = path.join(outputPath, `${outputFilename}.${outputExtension}`);
  
  const args = ['-i', url];
  
  // Platform-specific optimizations
  if (platformType === 'social' || platformType === 'stream') {
    args.splice(1, 0, '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    args.splice(3, 0, '-headers', 'Referer: https://www.tiktok.com/');
  }
      
      // Add time range if specified
      if (startTime) {
        args.push('-ss', startTime);
      }
      if (endTime) {
        args.push('-to', endTime);
      }
      
      // Enhanced quality/resolution settings including 4K/8K support
      if (quality && quality !== 'best' && quality !== 'worst' && !extractAudio) {
        const height = parseInt(quality.replace('p', ''));
        
        if (height >= 4320) {
          // 8K+ settings
          args.push('-vf', `scale=-2:${height}:flags=lanczos`);
          args.push('-c:v', 'libx265', '-preset', 'medium', '-crf', '18');
          args.push('-pix_fmt', 'yuv420p10le');
        } else if (height >= 2160) {
          // 4K settings
          args.push('-vf', `scale=-2:${height}:flags=lanczos`);
          args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18');
          args.push('-pix_fmt', 'yuv420p');
        } else if (height >= 1080) {
          args.push('-vf', `scale=-2:${height}:flags=lanczos`);
          args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20');
        } else {
          args.push('-vf', `scale=-2:${height}`);
          args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
        }
      }
      
      // Audio extraction or video processing
      if (extractAudio) {
        args.push('-vn'); // No video
        if (audioFormat === 'mp3') {
          args.push('-c:a', 'libmp3lame', '-b:a', '192k');
        } else if (audioFormat === 'aac') {
          args.push('-c:a', 'aac', '-b:a', '128k');
        } else {
          args.push('-c:a', 'copy');
        }
      } else {
        // Video processing with better audio handling
        if (!quality || quality === 'best') {
          args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20');
        }
        args.push('-c:a', 'aac', '-b:a', '128k');
        args.push('-movflags', '+faststart'); // Optimize for streaming
      }
      
      args.push('-y'); // Overwrite output file
      args.push(outputFile);
      
      const downloadProcess = spawn('ffmpeg', args);
      
      let totalDuration = null;
      
      downloadProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('FFmpeg output:', output);
        
        // Extract duration from initial output
        if (!totalDuration) {
          const durationMatch = output.match(/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/);
          if (durationMatch) {
            totalDuration = parseTimeToSeconds(durationMatch[1]);
          }
        }
        
        // Try to extract progress from ffmpeg output
        const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        const speedMatch = output.match(/speed=\s*([\d\.]+)x/);
        const bitrateMatch = output.match(/bitrate=\s*([\d\.]+\w*bits\/s)/);
        
        if (timeMatch && mainWindow) {
          let progress = 50; // Default progress
          let eta = 'Calculating...';
          
          if (totalDuration && totalDuration > 0) {
            const currentTime = parseTimeToSeconds(timeMatch[1]);
            progress = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));
            
            // Calculate ETA if speed is available
            if (speedMatch && parseFloat(speedMatch[1]) > 0) {
              const remainingTime = (totalDuration - currentTime) / parseFloat(speedMatch[1]);
              const minutes = Math.floor(remainingTime / 60);
              const seconds = Math.floor(remainingTime % 60);
              eta = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
          }
          
          const speed = speedMatch ? `${speedMatch[1]}x speed` : 'Processing with FFmpeg';
          const bitrate = bitrateMatch ? ` (${bitrateMatch[1]})` : '';
          
          mainWindow.webContents.send('download-progress', {
            progress: Math.round(progress * 100) / 100,
            speed: speed + bitrate,
            eta: eta
          });
        }
        
        // Check for FFmpeg errors
        if (output.includes('Invalid data found') || output.includes('Connection refused') || output.includes('Server returned 4')) {
          mainWindow.webContents.send('download-error', { 
            error: 'FFmpeg failed to process the video stream. The URL may be invalid or expired.' 
          });
        }
      });
      
      downloadProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: 'Download completed with FFmpeg' });
        } else {
          reject(new Error('FFmpeg download failed'));
        }
      });
      
      downloadProcess.on('error', (error) => {
        reject(new Error(`FFmpeg process error: ${error.message}`));
      });
}

ipcMain.handle('download-video', async (event, options) => {
  return new Promise(async (resolve, reject) => {
    // First try yt-dlp
    const ytDlpPath = getYtDlpPath();
    const ytDlpAvailable = await new Promise((checkResolve) => {
      const testProcess = spawn(ytDlpPath, ['--version']);
      let hasOutput = false;
      
      testProcess.stdout.on('data', (data) => {
        if (data.toString().trim()) {
          hasOutput = true;
        }
      });
      
      testProcess.on('close', (code) => {
        checkResolve(code === 0 && hasOutput);
      });
      
      testProcess.on('error', () => {
        checkResolve(false);
      });
      
      setTimeout(() => {
        testProcess.kill();
        checkResolve(false);
      }, 3000);
    });
    
    if (!ytDlpAvailable) {
      // Try ffmpeg as fallback
      try {
        const result = await downloadWithFfmpeg(options.url, options.outputPath, options);
        resolve(result);
        return;
      } catch (ffmpegError) {
        reject(new Error('yt-dlp not found and ffmpeg fallback failed. Please install yt-dlp or ffmpeg.'));
        return;
      }
    }

    const {
      url,
      outputPath,
      quality = 'best',
      format = 'mp4',
      audioFormat = 'mp3',
      extractAudio = false,
      integratedAudio = true,
      downloadSubtitles = false,
      embedThumbnail = false,
      startTime = null,
      endTime = null,
      customArgs = '',
      videoTitle = null
    } = options;

    // Create organized folder structure if downloading extras (subtitles or thumbnails)
    const needsOrganizedFolder = downloadSubtitles || embedThumbnail;
    let finalOutputPath = outputPath;
    let videoFolderName = '';
    
    if (needsOrganizedFolder && videoTitle) {
      // Sanitize video title for folder name
      videoFolderName = videoTitle
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
        .substring(0, 100); // Limit length
      
      if (videoFolderName) {
        finalOutputPath = path.join(outputPath, videoFolderName);
        
        // Create the video folder if it doesn't exist
        try {
          if (!fs.existsSync(finalOutputPath)) {
            fs.mkdirSync(finalOutputPath, { recursive: true });
          }
        } catch (error) {
          console.error('Failed to create video folder:', error);
          // Fall back to original path if folder creation fails
          finalOutputPath = outputPath;
        }
      }
    }

    // Build format selector based on quality and format preferences
    let formatSelector;
    if (extractAudio) {
      formatSelector = 'bestaudio[acodec!=opus]/bestaudio';
    } else if (quality === 'best') {
      if (integratedAudio) {
        // Prioritize original quality with best codec compatibility
        formatSelector = `best[ext=${format}][vcodec!*=av01]/bestvideo[ext=${format}][vcodec!*=av01]+bestaudio[acodec!=opus]/bestvideo+bestaudio/best`;
      } else {
        formatSelector = `bestvideo[ext=${format}][vcodec!*=av01]/bestvideo[vcodec!*=av01]/best[ext=${format}]/best`;
      }
    } else if (quality === 'worst') {
      if (integratedAudio) {
        formatSelector = `worst[ext=${format}]/worst`;
      } else {
        formatSelector = `worstvideo[ext=${format}]/worst[ext=${format}]/worst`;
      }
    } else {
      // Quality like '720p', '1080p', '1440p', '2160p', '4320p', '8320p'
      const height = quality.replace('p', '');
      if (integratedAudio) {
        // Enhanced format selection for high quality videos including 4K/8K
        if (parseInt(height) >= 2160) {
          // For 4K+ videos, prioritize best codecs and avoid problematic formats
          formatSelector = `best[height<=${height}][vcodec*=264]/best[height<=${height}][vcodec*=265]/bestvideo[height<=${height}][vcodec*=264]+bestaudio[acodec!=opus]/bestvideo[height<=${height}][vcodec*=265]+bestaudio[acodec!=opus]/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`;
        } else {
          // Standard quality selection with original framerate preservation
          formatSelector = `best[height<=${height}][ext=${format}][vcodec!*=av01]/bestvideo[height<=${height}][ext=${format}][vcodec!*=av01]+bestaudio[acodec!=opus]/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`;
        }
      } else {
        // Video only with enhanced codec selection for high quality
        if (parseInt(height) >= 2160) {
          formatSelector = `bestvideo[height<=${height}][vcodec*=264]/bestvideo[height<=${height}][vcodec*=265]/bestvideo[height<=${height}][vcodec!*=av01]/best[height<=${height}]/best`;
        } else {
          formatSelector = `bestvideo[height<=${height}][ext=${format}][vcodec!*=av01]/bestvideo[height<=${height}][vcodec!*=av01]/best[height<=${height}]/best`;
        }
      }
    }

    const args = [
      '-f', formatSelector,
      '-o', path.join(finalOutputPath, '%(title).200s.%(ext)s').replace(/\\/g, '/'),
      '--newline',
      '--no-post-overwrites',
      '--embed-metadata',
      '--write-info-json',
      '--no-playlist',
      '--restrict-filenames'
    ];

    // Add quality preservation arguments
    if (!extractAudio) {
      args.push('--merge-output-format', format);
      // Preserve original framerate and quality
      args.push('--postprocessor-args', 'ffmpeg:-avoid_negative_ts make_zero -fflags +genpts');
    }

    // Add audio extraction options
    if (extractAudio) {
      args.push('--extract-audio');
      args.push('--audio-format', audioFormat);
    }

    // Add subtitle options
    if (downloadSubtitles) {
      args.push('--write-subs');
      args.push('--write-auto-subs');
    }

    // Add thumbnail embedding
    if (embedThumbnail) {
      args.push('--embed-thumbnail');
    }

    // Add time range if specified
    if (startTime || endTime) {
      const timeRange = `*${startTime || '0'}-${endTime || 'end'}`;
      args.push('--download-sections', timeRange);
    }

    // Add custom arguments
    if (customArgs.trim()) {
      const customArgsArray = customArgs.trim().split(/\s+/);
      args.push(...customArgsArray);
    }

    // Add URL last
    args.push(url);

    console.log('yt-dlp command:', ytDlpPath, args.join(' '));

    const process = spawn(ytDlpPath, args);

    // Handle process crashes
    process.on('error', async (error) => {
      console.error('yt-dlp process error:', error);
      
      // Detect platform type for better fallback handling
      const platformType = detectPlatformType(url);
      const fallbackMessage = platformType === 'other' ? 
        `yt-dlp failed for ${platformType} platform, using FFmpeg fallback...` : 
        'yt-dlp crashed, attempting ffmpeg fallback...';
      
      mainWindow.webContents.send('download-error', { 
        error: fallbackMessage 
      });
      
      try {
        // Enhanced FFmpeg options for different platforms
        const enhancedOptions = {
          ...options,
          platformType,
          preferFFmpeg: platformType === 'other'
        };
        const result = await downloadWithFfmpeg(options.url, options.outputPath, enhancedOptions);
        mainWindow.webContents.send('download-complete');
        resolve(result);
      } catch (ffmpegError) {
        mainWindow.webContents.send('download-error', { 
          error: `Both yt-dlp and ffmpeg failed: ${ffmpegError.message}` 
        });
        reject(new Error(`yt-dlp crashed and ffmpeg fallback failed: ${ffmpegError.message}`));
      }
    });

    let lastProgressSent = -1;
    let progressBuffer = null;
    
    process.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('yt-dlp output:', output);
      
      const progressMatch = output.match(/\[download\]\s+(\d+\.\d+)%/);
      const speedMatch = output.match(/at\s+([\d\.]+\w+\/s)/);
      const etaMatch = output.match(/ETA\s+(\d+:\d+)/);
      const sizeMatch = output.match(/(\d+\.\d+\w+B)\s+at/);
      
      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);
        const speed = speedMatch ? speedMatch[1] : '';
        const eta = etaMatch ? etaMatch[1] : '';
        const size = sizeMatch ? sizeMatch[1] : '';
        
        // Only send progress updates every 1% or significant changes
        const progressInt = Math.floor(progress);
        if (progressInt > lastProgressSent || progress >= 100) {
          lastProgressSent = progressInt;
          
          const progressData = {
            progress,
            speed,
            eta,
            size,
            message: `Downloading... ${progress.toFixed(1)}%${speed ? ` at ${speed}` : ''}${eta ? ` (ETA: ${eta})` : ''}`,
            type: 'progress'
          };
          
          mainWindow.webContents.send('download-progress', progressData);
        }
      }
      
      // Handle other important messages
      if (output.includes('[download] Destination:')) {
        const destinationMatch = output.match(/\[download\] Destination: (.+)/);
        if (destinationMatch) {
          mainWindow.webContents.send('download-progress', {
            message: `Saving to: ${path.basename(destinationMatch[1])}`,
            type: 'info'
          });
        }
      }
      
      if (output.includes('[download] 100%')) {
        mainWindow.webContents.send('download-progress', {
          message: 'Download completed, processing...',
          type: 'success',
          progress: 100
        });
      }
    });

    process.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('yt-dlp error:', error);
      
      // Check for common errors and provide helpful messages
      if (error.includes('Video unavailable')) {
        mainWindow.webContents.send('download-error', { 
          error: 'Video is unavailable or private' 
        });
      } else if (error.includes('Sign in to confirm')) {
        mainWindow.webContents.send('download-error', { 
          error: 'Video requires sign-in to access' 
        });
      } else if (error.includes('Requested format is not available')) {
        mainWindow.webContents.send('download-error', { 
          error: `Requested quality (${quality}) is not available for this video. Try a lower quality.` 
        });
      } else if (error.includes('No video formats found')) {
        mainWindow.webContents.send('download-error', { 
          error: 'No compatible video formats found. Trying FFmpeg fallback...' 
        });
        // Trigger FFmpeg fallback
        setTimeout(async () => {
          try {
            const result = await downloadWithFfmpeg(options.url, options.outputPath, options);
            mainWindow.webContents.send('download-complete');
            resolve(result);
          } catch (ffmpegError) {
            mainWindow.webContents.send('download-error', { 
              error: `Both yt-dlp and FFmpeg failed: ${ffmpegError.message}` 
            });
            reject(new Error(`yt-dlp failed and FFmpeg fallback failed: ${ffmpegError.message}`));
          }
        }, 1000);
      }
      
      // Enhanced error detection for non-YouTube platforms
      const platformType = detectPlatformType(url);
      const shouldFallbackToFFmpeg = (
        error.includes('ERROR:') && (
          error.includes('Unsupported URL') ||
          error.includes('Video unavailable') ||
          error.includes('Private video') ||
          error.includes('Unable to extract') ||
          error.includes('HTTP Error 403') ||
          error.includes('HTTP Error 404') ||
          error.includes('No video formats found') ||
          (platformType === 'social' && error.includes('ERROR:')) ||
          (platformType === 'other' && error.includes('ERROR:'))
        )
      );
      
      if (shouldFallbackToFFmpeg) {
        console.log(`Triggering FFmpeg fallback for ${platformType} platform`);
        mainWindow.webContents.send('download-progress', {
          message: `yt-dlp failed for ${platformType} platform, switching to FFmpeg...`,
          type: 'warning'
        });
        
        setTimeout(async () => {
          try {
            const enhancedOptions = {
              ...options,
              platformType,
              preferFFmpeg: true
            };
            const result = await downloadWithFfmpeg(options.url, options.outputPath, enhancedOptions);
            mainWindow.webContents.send('download-complete');
            resolve(result);
          } catch (ffmpegError) {
            mainWindow.webContents.send('download-error', { 
              error: `Both yt-dlp and FFmpeg failed: ${ffmpegError.message}` 
            });
            reject(new Error(`yt-dlp failed and FFmpeg fallback failed: ${ffmpegError.message}`));
          }
        }, 1000);
        return;
      }
      
      // Check for other critical errors
      if (error.includes('ERROR:') && (
        error.includes('This video is not available') ||
        error.includes('nsig extraction failed') ||
        error.includes('Unable to extract signature') ||
        error.includes('Sign in to confirm') ||
        error.includes('This video requires payment') ||
        error.includes('format not available')
      )) {
        console.log('Critical yt-dlp error detected, will fallback to ffmpeg');
        // Kill the current process and trigger fallback
        process.kill();
        return;
      }
      
      mainWindow.webContents.send('download-error', { error });
    });

    process.on('close', async (code) => {
      console.log('yt-dlp process closed with code:', code);
      if (code === 0) {
        // Verify that the file was actually created
        try {
          const files = fs.readdirSync(finalOutputPath);
          const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.mp3', '.m4a', '.wav', '.flac'].includes(ext);
          });
          
          if (videoFiles.length > 0) {
            const downloadedFile = videoFiles[videoFiles.length - 1]; // Get the most recent file
            const filePath = path.join(finalOutputPath, downloadedFile);
            const stats = fs.statSync(filePath);
            
            // If we created an organized folder, include folder info in response
            const folderInfo = needsOrganizedFolder && videoFolderName ? {
              isOrganized: true,
              folderName: videoFolderName,
              folderPath: finalOutputPath
            } : { isOrganized: false };
            
            if (stats.size > 0) {
              mainWindow.webContents.send('download-complete', {
                success: true,
                fileName: downloadedFile,
                fileSize: stats.size,
                filePath: filePath,
                ...folderInfo
              });
              resolve({ success: true, fileName: downloadedFile, filePath: filePath, ...folderInfo });
            } else {
              throw new Error('Downloaded file is empty (0 bytes)');
            }
          } else {
            throw new Error('No video/audio files found in download directory');
          }
        } catch (verificationError) {
          console.error('File verification failed:', verificationError.message);
          mainWindow.webContents.send('download-error', { 
            error: `Download completed but file verification failed: ${verificationError.message}` 
          });
          reject(new Error(`File verification failed: ${verificationError.message}`));
        }
      } else {
        console.log('yt-dlp failed, trying ffmpeg fallback...');
        mainWindow.webContents.send('download-error', { 
          error: 'yt-dlp failed, attempting ffmpeg fallback...' 
        });
        
        try {
          const result = await downloadWithFfmpeg(options.url, finalOutputPath, options);
          // Verify FFmpeg download as well
          const files = fs.readdirSync(finalOutputPath);
          const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.mp3', '.m4a', '.wav', '.flac'].includes(ext);
          });
          
          if (videoFiles.length > 0) {
            const downloadedFile = videoFiles[videoFiles.length - 1];
            const filePath = path.join(finalOutputPath, downloadedFile);
            const stats = fs.statSync(filePath);
            
            const folderInfo = needsOrganizedFolder && videoFolderName ? {
              isOrganized: true,
              folderName: videoFolderName,
              folderPath: finalOutputPath
            } : { isOrganized: false };
            
            if (stats.size > 0) {
              mainWindow.webContents.send('download-complete', {
                success: true,
                fileName: downloadedFile,
                fileSize: stats.size,
                filePath: filePath,
                ...folderInfo
              });
              resolve({ success: true, fileName: downloadedFile, filePath: filePath, ...folderInfo });
            } else {
              throw new Error('FFmpeg downloaded file is empty');
            }
          } else {
            throw new Error('FFmpeg did not create any video/audio files');
          }
        } catch (ffmpegError) {
          mainWindow.webContents.send('download-error', { 
            error: `Both yt-dlp and ffmpeg failed: ${ffmpegError.message}` 
          });
          reject(new Error(`Download failed: yt-dlp (code ${code}) and ffmpeg fallback failed: ${ffmpegError.message}`));
        }
      }
    });
  });
});

ipcMain.handle('select-download-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: path.join(os.homedir(), 'Downloads')
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.handle('install-ytdlp', async (event) => {
  try {
    if (!YtDlpInstaller) {
      return { success: false, error: 'YtDlpInstaller not available in production build' };
    }
    
    const installer = new YtDlpInstaller();
    
    const result = await installer.install((message) => {
      event.sender.send('ytdlp-install-progress', message);
    });
    
    return { success: true, message: `yt-dlp ${result.version} installed successfully!`, path: result.path };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-ytdlp', async (event) => {
  try {
    if (!YtDlpInstaller) {
      return { success: false, error: 'YtDlpInstaller not available in production build' };
    }
    
    const installer = new YtDlpInstaller();
    
    const result = await installer.update((message) => {
      event.sender.send('ytdlp-install-progress', message);
    });
    
    return { success: true, message: `yt-dlp updated to ${result.version}!`, path: result.path };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('restart-app', async () => {
  app.relaunch();
  app.exit();
});

ipcMain.handle('check-ytdlp', async () => {
  return new Promise((resolve) => {
    // Try to execute yt-dlp --version to verify it's working
    const process = spawn('yt-dlp', ['--version'], { shell: true });
    
    let hasOutput = false;
    
    process.stdout.on('data', (data) => {
      if (data.toString().trim()) {
        hasOutput = true;
      }
    });
    
    process.on('close', (code) => {
      resolve(code === 0 && hasOutput);
    });
    
    process.on('error', () => {
      resolve(false);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      process.kill();
      resolve(false);
    }, 5000);
  });
});

// New handler for Settings component
ipcMain.handle('check-ytdlp-status', async () => {
  try {
    if (!YtDlpInstaller) {
      // Fallback status check without installer
      const ytDlpPath = getYtDlpPath();
      const installed = fs.existsSync(ytDlpPath) || ytDlpPath === 'yt-dlp.exe' || ytDlpPath === 'yt-dlp';
      return { 
        installed, 
        message: installed ? 'yt-dlp is available' : 'yt-dlp not found',
        path: installed ? ytDlpPath : null
      };
    }
    
    const installer = new YtDlpInstaller();
    const status = await installer.checkStatus();
    return status;
  } catch (error) {
    return { installed: false, error: error.message, message: 'Error checking yt-dlp status' };
  }
});

// Get home directory
ipcMain.handle('get-home-directory', async () => {
  return os.homedir();
});

ipcMain.handle('validate-path', async (event, pathToValidate) => {
  try {
    if (!pathToValidate) return false;
    return fs.existsSync(pathToValidate) && fs.statSync(pathToValidate).isDirectory();
  } catch (error) {
    console.error('Error validating path:', error);
    return false;
  }
});

// Settings management
ipcMain.handle('get-settings', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return settings;
    }
    return {
      downloadPath: path.join(os.homedir(), 'Downloads'),
      videoQuality: 'best',
      audioFormat: 'mp3',
      videoFormat: 'mp4'
    };
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
});

ipcMain.handle('select-download-path', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Download Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Error selecting download path:', error);
    return null;
  }
});

async function downloadYtDlpDirectly(event) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const platform = os.platform();
    const arch = os.arch();
    
    if (event) {
      event.sender.send('ytdlp-install-progress', 'Downloading yt-dlp directly from GitHub...');
    }
    
    let downloadUrl;
    let fileName;
    
    if (platform === 'win32') {
      downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
      fileName = 'yt-dlp.exe';
    } else {
      downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
      fileName = 'yt-dlp';
    }
    
    const appDataPath = app.getPath('userData');
    const binPath = path.join(appDataPath, 'bin');
    const filePath = path.join(binPath, fileName);
    
    if (event) {
      event.sender.send('ytdlp-install-progress', `Creating directory: ${binPath}`);
    }
    
    // Create bin directory if it doesn't exist
    if (!fs.existsSync(binPath)) {
      fs.mkdirSync(binPath, { recursive: true });
    }
    
    const file = fs.createWriteStream(filePath);
    
    if (event) {
      event.sender.send('ytdlp-install-progress', `Downloading from: ${downloadUrl}`);
    }
    
    https.get(downloadUrl, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        if (event) {
          event.sender.send('ytdlp-install-progress', 'Following redirect...');
        }
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
          let downloadedSize = 0;
          
          redirectResponse.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (event && totalSize) {
              const progress = Math.round((downloadedSize / totalSize) * 100);
              event.sender.send('ytdlp-install-progress', `Download progress: ${progress}%`);
            }
          });
          
          redirectResponse.pipe(file);
          
          file.on('finish', () => {
            file.close();
            if (event) {
              event.sender.send('ytdlp-install-progress', 'Download completed, setting up...');
            }
            // Make executable on Unix systems
            if (platform !== 'win32') {
              fs.chmodSync(filePath, '755');
            }
            
            // Add to PATH environment variable
            addToPath(binPath);
            
            if (event) {
              event.sender.send('ytdlp-install-progress', 'yt-dlp installed successfully!');
            }
            
            resolve({ 
              success: true, 
              message: 'yt-dlp downloaded and installed successfully!' 
            });
          });
        }).on('error', reject);
      } else {
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;
        
        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (event && totalSize) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            event.sender.send('ytdlp-install-progress', `Download progress: ${progress}%`);
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          if (event) {
            event.sender.send('ytdlp-install-progress', 'Download completed, setting up...');
          }
          // Make executable on Unix systems
          if (platform !== 'win32') {
            fs.chmodSync(filePath, '755');
          }
          
          // Add to PATH environment variable
          addToPath(binPath);
          
          if (event) {
            event.sender.send('ytdlp-install-progress', 'yt-dlp installed successfully!');
          }
          
          resolve({ 
            success: true, 
            message: 'yt-dlp downloaded and installed successfully!' 
          });
        });
      }
    }).on('error', reject);
  });
}

function addToPath(binPath) {
  const platform = os.platform();
  
  if (platform === 'win32') {
    // On Windows, we can't easily modify system PATH, but we can add to process.env.PATH
    // The user might need to restart the app for full effect
    if (!process.env.PATH.includes(binPath)) {
      process.env.PATH = `${binPath};${process.env.PATH}`;
    }
  } else {
    // On Unix systems, add to current process PATH
    if (!process.env.PATH.includes(binPath)) {
      process.env.PATH = `${binPath}:${process.env.PATH}`;
    }
  }
}

function getYtDlpPath() {
  const isWindows = process.platform === 'win32';
  const executableName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
  const appDataPath = app.getPath('userData');
  
  const possiblePaths = [
    // Python Scripts directories (highest priority)
    ...(isWindows ? [
      path.join(os.homedir(), 'AppData', 'Local', 'Packages', 'PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0', 'LocalCache', 'local-packages', 'Python313', 'Scripts', executableName),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python313', 'Scripts', executableName),
      path.join(os.homedir(), 'AppData', 'Roaming', 'Python', 'Python313', 'Scripts', executableName),
      // Try other Python versions
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'Scripts', executableName),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python311', 'Scripts', executableName),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python310', 'Scripts', executableName)
    ] : []),
    
    // User-specific paths
    path.join(os.homedir(), 'AppData', 'Roaming', 'yt-dlp', executableName),
    path.join(os.homedir(), 'AppData', 'Roaming', 'puyt-video-downloader', 'bin', executableName),
    path.join(os.homedir(), 'AppData', 'Roaming', 'puyt-video-downloader', executableName),
    
    // Local project paths
    path.join(__dirname, executableName),
    path.join(__dirname, 'scripts', executableName),
    
    // Unix/Linux paths
    path.join(os.homedir(), '.local', 'bin', executableName),
    
    // Windows specific paths
    ...(isWindows ? [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'yt-dlp', executableName),
      path.join(process.env.PROGRAMFILES || '', 'yt-dlp', executableName),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'yt-dlp', executableName),
      path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WindowsApps', executableName)
    ] : []),
    
    // Unix/Linux/macOS paths
    ...(!isWindows ? [
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      '/opt/homebrew/bin/yt-dlp',
      '/snap/bin/yt-dlp',
      path.join(process.env.HOME || '', '.local', 'bin', 'yt-dlp')
    ] : [])
  ];

  console.log('Checking yt-dlp paths:', possiblePaths);
  
  for (const ytDlpPath of possiblePaths) {
    try {
      if (fs.existsSync(ytDlpPath)) {
        console.log('Found yt-dlp at:', ytDlpPath);
        return ytDlpPath;
      }
    } catch (error) {
      continue;
    }
  }

  console.log('yt-dlp not found in specific paths, trying PATH');
  
  // Try to find in PATH
  try {
    const whereCommand = isWindows ? `where ${executableName}` : `which ${executableName}`;
    const result = execSync(whereCommand, { encoding: 'utf8' });
    const pathFromWhere = result.trim().split('\n')[0];
    if (fs.existsSync(pathFromWhere)) {
      console.log('Found yt-dlp in PATH:', pathFromWhere);
      return pathFromWhere;
    }
  } catch (error) {
    console.log('yt-dlp not found in PATH:', error.message);
  }
  
  // Final fallback - try pip show to find installation location
  try {
    const pipResult = execSync('pip show yt-dlp', { encoding: 'utf8' });
    const locationMatch = pipResult.match(/Location: (.+)/i);
    if (locationMatch) {
      const pipLocation = path.join(locationMatch[1], '..', 'Scripts', executableName);
      if (fs.existsSync(pipLocation)) {
        console.log('Found yt-dlp via pip location:', pipLocation);
        return pipLocation;
      }
    }
  } catch (error) {
    console.log('Could not find yt-dlp via pip show');
  }
  
  return null;
}