const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Notification } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { promisify } = require('util');
const { pipeline } = require('stream');
const crypto = require('crypto');
const pipelineAsync = promisify(pipeline);
const DependencyManager = require('../scripts/dependency-manager');

// Conditionally require YtDlpInstaller only in development
let YtDlpInstaller;
try {
  YtDlpInstaller = require('../scripts/install-ytdlp');
} catch (error) {
  console.log('YtDlpInstaller not available in production build');
  YtDlpInstaller = null;
}

let mainWindow;
let dependencyManager = new DependencyManager();

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
    
    // Suppress DevTools console errors
    mainWindow.webContents.on('console-message', (event, level, message) => {
      if (message.includes('Autofill.enable') || message.includes('Autofill.setAddresses')) {
        event.preventDefault();
      }
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  // Start automatic update checker after app is ready
  startAutoUpdateChecker();
}).catch((error) => {
  console.error('Failed to create window:', error);
  app.quit();
});

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

// IPC Handlers for Dependency Management
ipcMain.handle('check-dependencies', async () => {
  const ytdlpCheck = dependencyManager.checkYtDlp();
  const ffmpegCheck = dependencyManager.checkFfmpeg();
  
  return {
    ytdlp: ytdlpCheck,
    ffmpeg: ffmpegCheck
  };
});

ipcMain.handle('install-ytdlp', async (event) => {
  try {
    // Check if already installed
    const existingCheck = dependencyManager.checkYtDlp();
    if (existingCheck.available) {
      event.sender.send('installation-progress', { tool: 'yt-dlp', message: '✅ yt-dlp is already installed!' });
      return { success: true, message: 'yt-dlp is already available', path: existingCheck.path };
    }
    
    // Check internet connectivity
    event.sender.send('installation-progress', { tool: 'yt-dlp', message: '🌐 Checking internet connection...' });
    
    const result = await dependencyManager.installYtDlp((progress) => {
      event.sender.send('installation-progress', { tool: 'yt-dlp', message: progress });
    });
    
    // Final verification
    const finalCheck = dependencyManager.checkYtDlp();
    if (!finalCheck.available) {
      throw new Error('Installation completed but yt-dlp is not accessible. Please restart the application.');
    }
    
    return { success: true, message: 'yt-dlp installed successfully', ...result };
  } catch (error) {
    console.error('yt-dlp installation error:', error);
    
    let errorMessage = error.message;
    let suggestions = [];
    
    // Provide specific error messages and suggestions
    if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      errorMessage = 'Network connection failed. Please check your internet connection.';
      suggestions = [
        'Check your internet connection',
        'Try again in a few moments',
        'Consider manual installation using pip: pip install yt-dlp'
      ];
    } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
      errorMessage = 'Permission denied. Please run the application as administrator.';
      suggestions = [
        'Run the application as administrator',
        'Check folder permissions',
        'Try manual installation: pip install yt-dlp'
      ];
    } else if (error.message.includes('ENOSPC')) {
      errorMessage = 'Insufficient disk space for installation.';
      suggestions = [
        'Free up disk space',
        'Try installing to a different location'
      ];
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Download timeout. The server may be busy.';
      suggestions = [
        'Try again in a few minutes',
        'Check your internet connection speed',
        'Consider manual installation: pip install yt-dlp'
      ];
    } else {
      suggestions = [
        'Try manual installation: pip install yt-dlp',
        'Check the Help section for detailed instructions',
        'Restart the application and try again'
      ];
    }
    
    event.sender.send('installation-progress', { 
      tool: 'yt-dlp', 
      message: `❌ Installation failed: ${errorMessage}`,
      error: true,
      suggestions
    });
    
    return { 
      success: false, 
      error: errorMessage,
      suggestions,
      details: error.message
    };
  }
});

ipcMain.handle('install-ffmpeg', async (event) => {
  try {
    const result = await dependencyManager.installFfmpeg((progress) => {
      event.sender.send('installation-progress', { tool: 'ffmpeg', message: progress });
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-installation-instructions', async () => {
  return dependencyManager.getInstallationInstructions();
});

// Handler for selecting custom installation directory
ipcMain.handle('select-installation-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Installation Directory',
      defaultPath: path.join(os.homedir(), 'AppData', 'Local')
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Error selecting installation directory:', error);
    return { error: `Failed to open directory dialog: ${error.message || 'Dialog system error'}` };
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

    // Detect platform and check playlist support
    const platformInfo = detectPlatformType(url);
    
    // Check if URL is a playlist
    const isPlaylist = url.includes('playlist?list=') || url.includes('&list=');
    
    // Only allow playlist mode for supported platforms
    const allowPlaylist = isPlaylist && platformInfo.supportsPlaylists;
    
    // Load settings for cookie configuration
    let settings = {};
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load settings for cookie configuration:', error.message);
    }
    
    const args = [
      '--dump-json',
      allowPlaylist ? '--yes-playlist' : '--no-playlist'
    ];
    

    
    // Add URL last
    args.push(url);
    
    const process = spawn(ytDlpPath, args);

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
          // Handle both single video and playlist responses
          const lines = stdout.trim().split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error('No video information found'));
            return;
          }
          
          // Parse each line as JSON (for playlists, each video is a separate JSON object)
          const videos = [];
          for (const line of lines) {
            try {
              const videoInfo = JSON.parse(line);
              videos.push(videoInfo);
            } catch (parseError) {
              console.warn('Failed to parse video info line:', parseError);
            }
          }
          
          if (videos.length === 0) {
            reject(new Error('Failed to parse video information'));
            return;
          }
          
          // If it's a single video, return single video format
          if (videos.length === 1 && !allowPlaylist) {
            const videoInfo = videos[0];
            resolve({
              title: videoInfo.title,
              duration: videoInfo.duration,
              thumbnail: videoInfo.thumbnail,
              uploader: videoInfo.uploader,
              url: videoInfo.webpage_url || url,
              isPlaylist: false,
              platform: platformInfo,
              formats: (() => {
              if (!videoInfo.formats) return [];
              
              // Remove duplicates and filter valid formats
              const uniqueFormats = new Map();
              
              videoInfo.formats.forEach(format => {
                // Skip invalid formats - must have proper codec info and not be thumbnails/banners
                if (!format.format_id || (!format.vcodec && !format.acodec)) return;
                
                // Skip thumbnail and banner formats
                if (format.format_note && (
                  format.format_note.toLowerCase().includes('thumbnail') ||
                  format.format_note.toLowerCase().includes('banner') ||
                  format.format_note.toLowerCase().includes('storyboard') ||
                  format.format_note.toLowerCase().includes('preview')
                )) return;
                
                // Skip formats without proper video dimensions for video content
                const hasVideo = format.vcodec && format.vcodec !== 'none';
                const hasAudio = format.acodec && format.acodec !== 'none';
                
                if (hasVideo && (!format.height || format.height < 144)) return; // Skip very low quality or invalid video
                
                // Create unique key for deduplication
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
                    abr: format.abr, // Audio bitrate
                    vbr: format.vbr, // Video bitrate
                    tbr: format.tbr, // Total bitrate
                    // Add format type for better categorization
                    type: hasVideo && hasAudio ? 'combined' :
                          hasVideo ? 'video' : 'audio'
                  });
                }
              });
              
              return Array.from(uniqueFormats.values());
            })()
          });
          } else {
            // Handle playlist - return playlist information with video list
            const playlistVideos = videos.map(video => ({
              id: video.id,
              title: video.title,
              duration: video.duration,
              thumbnail: video.thumbnail,
              uploader: video.uploader,
              url: video.webpage_url,
              playlist_index: video.playlist_index
            }));
            
            // Get playlist metadata from first video
            const firstVideo = videos[0];
            resolve({
              title: firstVideo.playlist_title || `Playlist (${videos.length} videos)`,
              duration: videos.reduce((total, video) => total + (video.duration || 0), 0),
              thumbnail: firstVideo.thumbnail,
              uploader: firstVideo.uploader,
              url: url,
              isPlaylist: true,
              videoCount: videos.length,
              videos: playlistVideos,
              platform: platformInfo,
              formats: [] // Playlists don't have formats, individual videos do
            });
          }
        } catch (error) {
          reject(new Error('Failed to parse video information'));
        }
      } else {
        reject(new Error(stderr || 'Failed to get video information'));
      }
    });
  });
});

// Batch download handler for playlists and multiple videos
ipcMain.handle('download-batch', async (event, options) => {
  const { videos, outputPath, downloadOptions } = options;
  
  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    throw new Error('No videos provided for batch download');
  }
  
  const results = [];
  let completedCount = 0;
  
  // Send initial progress
  event.sender.send('batch-download-progress', {
    total: videos.length,
    completed: 0,
    current: null,
    status: 'starting'
  });
  
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    
    try {
      // Send progress update
      event.sender.send('batch-download-progress', {
        total: videos.length,
        completed: completedCount,
        current: {
          index: i + 1,
          title: video.title,
          url: video.url
        },
        status: 'downloading'
      });
      
      // Download individual video
      const videoOptions = {
        ...downloadOptions,
        url: video.url,
        outputPath: outputPath,
        title: video.title
      };
      
      // Use existing download logic
      await new Promise((resolve, reject) => {
        downloadWithFfmpeg(video.url, outputPath, videoOptions)
          .then(resolve)
          .catch(reject);
      });
      
      completedCount++;
      results.push({ success: true, video: video.title });
      
    } catch (error) {
      results.push({ success: false, video: video.title, error: error.message });
      
      // Send error for this video but continue with others
      event.sender.send('batch-download-error', {
        video: video.title,
        error: error.message,
        index: i + 1
      });
    }
  }
  
  // Send final progress
  event.sender.send('batch-download-progress', {
    total: videos.length,
    completed: completedCount,
    current: null,
    status: 'completed'
  });
  
  return {
    success: true,
    results: results,
    totalVideos: videos.length,
    successCount: results.filter(r => r.success).length,
    errorCount: results.filter(r => !r.success).length
  };
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
  
  // YouTube and related - Full playlist support
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return {
      type: 'youtube',
      supportsPlaylists: true,
      name: 'YouTube'
    };
  }
  
  // Vimeo - Limited playlist support
  if (urlLower.includes('vimeo.com')) {
    return {
      type: 'vimeo',
      supportsPlaylists: true,
      name: 'Vimeo'
    };
  }
  
  // Dailymotion - Playlist support
  if (urlLower.includes('dailymotion.com')) {
    return {
      type: 'dailymotion',
      supportsPlaylists: true,
      name: 'Dailymotion'
    };
  }
  
  // Twitch - VOD collections support
  if (urlLower.includes('twitch.tv')) {
    return {
      type: 'twitch',
      supportsPlaylists: true,
      name: 'Twitch'
    };
  }
  
  // Social media platforms - No playlist support
  if (urlLower.includes('tiktok.com') || urlLower.includes('discord.com') || 
      urlLower.includes('instagram.com') || urlLower.includes('twitter.com') ||
      urlLower.includes('x.com') || urlLower.includes('facebook.com') ||
      urlLower.includes('reddit.com')) {
    return {
      type: 'social',
      supportsPlaylists: false,
      name: 'Social Media'
    };
  }
  
  // Direct video links - No playlist support
  if (urlLower.match(/\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v)$/)) {
    return {
      type: 'direct',
      supportsPlaylists: false,
      name: 'Direct Video'
    };
  }
  
  // Live streams - No playlist support
  if (urlLower.includes('m3u8') || urlLower.includes('rtmp') || urlLower.includes('rtsp')) {
    return {
      type: 'stream',
      supportsPlaylists: false,
      name: 'Live Stream'
    };
  }
  
  // Other platforms - Unknown playlist support
  return {
    type: 'other',
    supportsPlaylists: false,
    name: 'Other Platform'
  };
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
    const ffmpegCheck = dependencyManager.checkFfmpeg();
    if (!ffmpegCheck.available) {
      reject(new Error('FFmpeg not found. Please install FFmpeg or use the auto-installer in Settings.'));
      return;
    }
    
    console.log(`Found FFmpeg (${ffmpegCheck.source}):`, ffmpegCheck.path);
      
      // For YouTube URLs, try to get direct stream URLs using yt-dlp first
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // Use yt-dlp to get stream URLs without downloading
        const ytDlpPath = getYtDlpPath();
        if (ytDlpPath) {
          // Load settings for cookie configuration
          let settings = {};
          try {
            const settingsPath = path.join(app.getPath('userData'), 'settings.json');
            if (fs.existsSync(settingsPath)) {
              settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            }
          } catch (error) {
            console.warn('Could not load settings for cookie configuration:', error.message);
          }
          
          const args = ['-g', '--no-warnings'];
          

          
          // Add URL last
          args.push(url);
          
          const getUrlProcess = spawn(ytDlpPath, args);
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
      
      const ffmpegPath = dependencyManager.checkFfmpeg().path;
      const downloadProcess = spawn(ffmpegPath, args);
      let processCompleted = false;
      let totalDuration = null;
      
      // Set up timeout for long-running processes (30 minutes max)
      const processTimeout = setTimeout(() => {
        if (!processCompleted) {
          console.log('FFmpeg process timed out, terminating...');
          try {
            downloadProcess.kill('SIGTERM');
            setTimeout(() => {
              if (!processCompleted) {
                downloadProcess.kill('SIGKILL');
              }
            }, 5000);
          } catch (error) {
            console.log('Error terminating FFmpeg process:', error.message);
          }
          reject(new Error('FFmpeg process timed out after 30 minutes'));
        }
      }, 30 * 60 * 1000); // 30 minutes
      
      const cleanup = () => {
        processCompleted = true;
        clearTimeout(processTimeout);
      };
      
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
          cleanup();
          mainWindow.webContents.send('download-error', { 
            error: 'FFmpeg failed to process the video stream. The URL may be invalid or expired.' 
          });
        }
      });
      
      downloadProcess.on('close', (code) => {
        cleanup();
        if (code === 0) {
          resolve({ success: true, message: 'Download completed with FFmpeg' });
        } else {
          reject(new Error('FFmpeg download failed'));
        }
      });
      
      downloadProcess.on('error', (error) => {
        cleanup();
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
      let resolved = false;
      
      const cleanup = (result) => {
        if (resolved) return;
        resolved = true;
        
        try {
          if (!testProcess.killed) {
            testProcess.kill('SIGTERM');
          }
        } catch (error) {
          // Process might already be dead
        }
        
        checkResolve(result);
      };
      
      testProcess.stdout.on('data', (data) => {
        if (data.toString().trim()) {
          hasOutput = true;
        }
      });
      
      testProcess.on('close', (code) => {
        cleanup(code === 0 && hasOutput);
      });
      
      testProcess.on('error', () => {
        cleanup(false);
      });
      
      // Timeout with proper cleanup
      setTimeout(() => {
        cleanup(false);
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
      videoTitle = null,
      preferHEVC = false,
      videoCodec = 'auto'
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

    // Build codec preference string
    let codecPreference = '';
    if (videoCodec === 'h264') {
      codecPreference = '[vcodec^=avc1]/[vcodec^=h264]';
    } else if (videoCodec === 'h265' || preferHEVC) {
      codecPreference = '[vcodec^=hev1]/[vcodec^=hvc1]/[vcodec^=h265]/[vcodec^=hevc]';
    } else if (videoCodec === 'vp9') {
      codecPreference = '[vcodec^=vp9]';
    } else if (videoCodec === 'av1') {
      codecPreference = '[vcodec^=av01]';
    }

    // Build format selector based on quality and format preferences
    let formatSelector;
    if (extractAudio) {
      // Audio extraction - prioritize high quality audio formats
      formatSelector = 'bestaudio[acodec!=opus]/bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio';
    } else if (quality === 'best') {
      if (integratedAudio) {
        // Best quality with integrated audio - avoid banners and thumbnails
        if (codecPreference) {
          formatSelector = `bestvideo[height>=240][vcodec!=none]${codecPreference}+bestaudio[acodec!=none]/bestvideo[height>=240][vcodec!=none]+bestaudio[acodec!=none]/best[height>=240][vcodec!=none][acodec!=none]`;
        } else {
          formatSelector = `bestvideo[height>=240][vcodec!=none]+bestaudio[acodec!=none]/best[height>=240][vcodec!=none][acodec!=none]`;
        }
      } else {
        // Best video only - ensure it's actual video content
        if (codecPreference) {
          formatSelector = `bestvideo[height>=240][vcodec!=none]${codecPreference}/bestvideo[height>=240][vcodec!=none]`;
        } else {
          formatSelector = `bestvideo[height>=240][vcodec!=none]`;
        }
      }
    } else if (quality === 'worst') {
      if (integratedAudio) {
        if (codecPreference) {
          formatSelector = `worstvideo[height>=240][vcodec!=none]${codecPreference}+bestaudio[acodec!=none]/worstvideo[height>=240][vcodec!=none]+bestaudio[acodec!=none]/worst[height>=240][vcodec!=none][acodec!=none]`;
        } else {
          formatSelector = `worstvideo[height>=240][vcodec!=none]+bestaudio[acodec!=none]/worst[height>=240][vcodec!=none][acodec!=none]`;
        }
      } else {
        if (codecPreference) {
          formatSelector = `worstvideo[height>=240][vcodec!=none]${codecPreference}/worstvideo[height>=240][vcodec!=none]`;
        } else {
          formatSelector = `worstvideo[height>=240][vcodec!=none]`;
        }
      }
    } else {
      // Specific quality like '720p', '1080p', etc.
      const height = quality.replace('p', '');
      const minHeight = Math.max(240, parseInt(height) * 0.8); // Allow some tolerance but ensure minimum quality
      
      if (integratedAudio) {
        // Prioritize exact height match, then close matches, ensure real video content
        if (codecPreference) {
          formatSelector = `bestvideo[height=${height}][vcodec!=none]${codecPreference}+bestaudio[acodec!=none]/bestvideo[height<=${height}][height>=${minHeight}][vcodec!=none]${codecPreference}+bestaudio[acodec!=none]/bestvideo[height=${height}][vcodec!=none]+bestaudio[acodec!=none]/bestvideo[height<=${height}][height>=${minHeight}][vcodec!=none]+bestaudio[acodec!=none]/best[height=${height}][vcodec!=none][acodec!=none]/best[height<=${height}][height>=${minHeight}][vcodec!=none][acodec!=none]`;
        } else {
          formatSelector = `bestvideo[height=${height}][vcodec!=none]+bestaudio[acodec!=none]/bestvideo[height<=${height}][height>=${minHeight}][vcodec!=none]+bestaudio[acodec!=none]/best[height=${height}][vcodec!=none][acodec!=none]/best[height<=${height}][height>=${minHeight}][vcodec!=none][acodec!=none]`;
        }
      } else {
        // Video only with specific quality
        if (codecPreference) {
          formatSelector = `bestvideo[height=${height}][vcodec!=none]${codecPreference}/bestvideo[height<=${height}][height>=${minHeight}][vcodec!=none]${codecPreference}/bestvideo[height=${height}][vcodec!=none]/bestvideo[height<=${height}][height>=${minHeight}][vcodec!=none]`;
        } else {
          formatSelector = `bestvideo[height=${height}][vcodec!=none]/bestvideo[height<=${height}][height>=${minHeight}][vcodec!=none]`;
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
      '--restrict-filenames',
      '--no-check-certificates', // Handle SSL issues
      '--ignore-errors', // Continue on non-fatal errors
      '--no-warnings' // Reduce noise in output
    ];

    // Add quality preservation arguments
    if (!extractAudio) {
      args.push('--merge-output-format', format);
      // Preserve original framerate and quality, avoid negative timestamps
      args.push('--postprocessor-args', 'ffmpeg:-avoid_negative_ts make_zero -fflags +genpts -movflags +faststart');
    }

    // Add audio extraction options
    if (extractAudio) {
      args.push('--extract-audio');
      args.push('--audio-format', audioFormat);
      args.push('--audio-quality', '0'); // Best audio quality
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

    // Load settings for cookie configuration
    let settings = {};
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load settings for cookie configuration:', error.message);
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
        // Properly terminate the current process and trigger fallback
        try {
          if (!process.killed) {
            process.kill('SIGTERM');
          }
        } catch (killError) {
          console.log('Process already terminated');
        }
        cleanup();
        return;
      }
      
      mainWindow.webContents.send('download-error', { error });
    });

    const cleanup = () => {
      try {
        process.removeAllListeners('data');
        process.removeAllListeners('error');
        process.removeAllListeners('close');
        if (process.stdout) process.stdout.removeAllListeners('data');
        if (process.stderr) process.stderr.removeAllListeners('data');
      } catch (cleanupError) {
        console.log('Process cleanup error:', cleanupError.message);
      }
    };

    process.on('close', async (code) => {
      console.log('yt-dlp process closed with code:', code);
      cleanup();
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
          cleanup();
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
          cleanup();
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
    let resolved = false;
    
    const cleanup = (result) => {
      if (resolved) return;
      resolved = true;
      
      try {
        if (!process.killed) {
          process.kill('SIGTERM');
        }
      } catch (error) {
        // Process might already be dead
      }
      
      resolve(result);
    };
    
    process.stdout.on('data', (data) => {
      if (data.toString().trim()) {
        hasOutput = true;
      }
    });
    
    process.on('close', (code) => {
      cleanup(code === 0 && hasOutput);
    });
    
    process.on('error', () => {
      cleanup(false);
    });
    
    // Timeout after 5 seconds with proper cleanup
    setTimeout(() => {
      cleanup(false);
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
    return { success: false, error: `Failed to validate path "${pathToValidate}": ${error.message || 'File system error'}` };
  }
});

// Settings management
ipcMain.handle('get-settings', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    
    // Ensure the userData directory exists
    const userDataDir = app.getPath('userData');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      if (settingsData.trim()) {
        const settings = JSON.parse(settingsData);
        return { success: true, data: settings };
      }
    }
    
    // Return default settings
    const defaultSettings = {
      downloadPath: path.join(os.homedir(), 'Downloads'),
      videoQuality: 'best',
      audioFormat: 'mp3',
      videoFormat: 'mp4'
    };
    return { success: true, data: defaultSettings };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { success: false, error: `Failed to load settings: ${error.message || 'File read error'}` };
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    if (!settings || typeof settings !== 'object') {
      return { success: false, error: 'Invalid settings data provided' };
    }
    
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    
    // Ensure the userData directory exists
    const userDataDir = app.getPath('userData');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    // Create backup of existing settings
    if (fs.existsSync(settingsPath)) {
      const backupPath = settingsPath + '.backup';
      try {
        fs.copyFileSync(settingsPath, backupPath);
      } catch (backupError) {
        console.warn('Failed to create settings backup:', backupError);
        // Continue with save operation even if backup fails
      }
    }
    
    // Write new settings
    const settingsData = JSON.stringify(settings, null, 2);
    fs.writeFileSync(settingsPath, settingsData, 'utf8');
    
    // Verify the file was written correctly
    if (fs.existsSync(settingsPath)) {
      try {
        const verifyData = fs.readFileSync(settingsPath, 'utf8');
        JSON.parse(verifyData); // Validate JSON structure
      } catch (verifyError) {
        throw new Error('Settings file verification failed - corrupted data');
      }
    } else {
      throw new Error('Settings file was not created');
    }
    
    return { success: true, message: 'Settings saved successfully' };
  } catch (error) {
    console.error('Error saving settings:', error);
    
    // Try to restore backup if it exists
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    const backupPath = settingsPath + '.backup';
    if (fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, settingsPath);
        console.log('Settings restored from backup');
      } catch (restoreError) {
        console.error('Failed to restore settings backup:', restoreError);
      }
    }
    
    return { success: false, error: `Failed to save settings: ${error.message || 'File write error'}` };
  }
});

ipcMain.handle('select-download-path', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Download Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return {
        canceled: false,
        filePath: result.filePaths[0]
      };
    }
    return {
      canceled: true,
      filePath: null
    };
  } catch (error) {
    console.error('Error selecting download path:', error);
    return { 
      canceled: true,
      filePath: null,
      error: `Failed to open folder dialog: ${error.message || 'Dialog system error'}` 
    };
  }
});



// Update System Variables
let updateInfo = null;
let isCheckingForUpdates = false;
let isDownloadingUpdate = false;

// Automatic update checker configuration
let autoUpdateInterval = null;
let autoUpdateSettings = {
  enabled: true,
  interval: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
  channel: 'stable',
  silent: true, // Don't show notifications for automatic checks
  autoDownload: false // Whether to automatically download updates in silent mode
};

// Function to read version from version.txt (GitHub format)
function getVersionInfo() {
  try {
    const versionPath = path.join(__dirname, '../version.txt');
    if (fs.existsSync(versionPath)) {
      const versionContent = fs.readFileSync(versionPath, 'utf8').trim();
      const releaseInfo = JSON.parse(versionContent);
      
      return {
        version: releaseInfo.tag_name?.replace('v', '') || app.getVersion(),
        channel: releaseInfo.channel || (releaseInfo.prerelease ? 'beta' : 'stable'),
        date: releaseInfo.published_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        description: releaseInfo.name || 'Puyt Desktop Application',
        notes: releaseInfo.body || 'No release notes available',
        draft: releaseInfo.draft || false,
        prerelease: releaseInfo.prerelease || false
      };
    }
  } catch (error) {
    console.error('Error reading version.txt:', error);
    // Try legacy format fallback
    try {
      const versionPath = path.join(__dirname, '../version.txt');
      const versionContent = fs.readFileSync(versionPath, 'utf8').trim().split('\n');
      if (versionContent.length >= 2) {
        return {
          version: versionContent[0] || app.getVersion(),
          channel: versionContent[1] || 'stable',
          date: versionContent[2] || new Date().toISOString().split('T')[0],
          description: versionContent[3] || 'Puyt Desktop Application',
          notes: versionContent[4] || 'No release notes available'
        };
      }
    } catch (legacyError) {
      console.error('Error reading legacy version format:', legacyError);
    }
  }
  
  // Fallback to package.json version
  return {
    version: app.getVersion(),
    channel: 'stable',
    date: new Date().toISOString().split('T')[0],
    description: 'Puyt Desktop Application',
    notes: 'No release notes available'
  };
}

// Get app version
ipcMain.handle('get-app-version', async () => {
  return getVersionInfo();
});

// Check for updates
ipcMain.handle('check-for-updates', async (event, channel = 'stable') => {
  if (isCheckingForUpdates) {
    throw new Error('Update check already in progress');
  }

  isCheckingForUpdates = true;
  updateInfo = null;

  try {
    const currentVersion = app.getVersion();
    const releases = await fetchGitHubReleases(channel);
    
    if (releases.length === 0) {
      mainWindow.webContents.send('update-not-available');
      return { available: false, message: 'No releases found' };
    }

    const latestRelease = releases[0];
    const latestVersion = latestRelease.tag_name.replace(/^v/, '');
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      updateInfo = {
        version: latestVersion,
        downloadUrl: getDownloadUrl(latestRelease),
        releaseNotes: latestRelease.body || 'No release notes available',
        publishedAt: latestRelease.published_at,
        channel: channel
      };
      
      mainWindow.webContents.send('update-available', updateInfo);
      return { available: true, updateInfo };
    } else {
      mainWindow.webContents.send('update-not-available');
      return { available: false, message: 'You are running the latest version' };
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
    mainWindow.webContents.send('update-error', { message: error.message });
    throw error;
  } finally {
    isCheckingForUpdates = false;
  }
});

// Download update
ipcMain.handle('download-update', async (event) => {
  if (!updateInfo) {
    throw new Error('No update available to download');
  }

  if (isDownloadingUpdate) {
    throw new Error('Update download already in progress');
  }

  isDownloadingUpdate = true;

  try {
    const downloadPath = path.join(app.getPath('temp'), `puyt-update-${updateInfo.version}.exe`);
    
    await downloadFile(updateInfo.downloadUrl, downloadPath, (progress) => {
      // Enhanced progress with retry info, speed, and ETA
      const progressData = {
        percent: typeof progress === 'number' ? progress : progress.percent,
        downloadedBytes: progress.downloadedBytes || 0,
        totalBytes: progress.totalBytes || 0,
        speed: progress.speed || 0,
        eta: progress.eta || 0,
        attempt: progress.attempt || 1
      };
      mainWindow.webContents.send('update-download-progress', progressData);
    }, {
      maxRetries: 5,
      retryDelay: 3000,
      timeout: 60000,
      resumeSupport: true
    });

    updateInfo.localPath = downloadPath;
    mainWindow.webContents.send('update-downloaded', updateInfo);
    
    return { success: true, path: downloadPath };
  } catch (error) {
    console.error('Error downloading update:', error);
    mainWindow.webContents.send('update-error', { message: error.message });
    throw error;
  } finally {
    isDownloadingUpdate = false;
  }
});

// Install update
ipcMain.handle('install-update', async (event) => {
  if (!updateInfo || !updateInfo.localPath) {
    throw new Error('No update downloaded');
  }

  try {
    // Launch the installer
    const { spawn } = require('child_process');
    spawn(updateInfo.localPath, [], {
      detached: true,
      stdio: 'ignore'
    });

    // Quit the current app
    app.quit();
    
    return { success: true };
  } catch (error) {
    console.error('Error installing update:', error);
    mainWindow.webContents.send('update-error', { message: error.message });
    throw error;
  }
});

// Helper functions for update system
async function fetchGitHubReleases(channel) {
  return new Promise((resolve, reject) => {
    // GitHub repository configuration (hardcoded for public repository)
    const REPO_OWNER = 'vinssoftware';
    const REPO_NAME = 'puyt';
    
    console.log(`🔍 Checking for updates from GitHub repository: ${REPO_OWNER}/${REPO_NAME}`);
    
    // For local development, return empty releases to avoid API errors
    if (isDev) {
      console.log('🔧 Development mode: Skipping update check');
      resolve([]);
      return;
    }
    
    const headers = {
      'User-Agent': 'Puyt-App',
      'Accept': 'application/vnd.github.v3+json'
    };
    
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
      method: 'GET',
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Check if response is empty or invalid
          if (!data || data.trim() === '') {
            reject(new Error('Empty response from GitHub API'));
            return;
          }
          
          // Check for GitHub API error responses
          if (res.statusCode !== 200) {
            let errorMessage = `GitHub API returned status ${res.statusCode}`;
            
            // Handle specific error cases for public repository access
            if (res.statusCode === 403) {
              errorMessage = 'GitHub API rate limit exceeded. Please try again later or check your internet connection.';
            } else if (res.statusCode === 404) {
              errorMessage = 'Repository not found. The repository may have been moved or deleted.';
            } else if (res.statusCode === 422) {
              errorMessage = 'Invalid request to GitHub API. Please check the repository configuration.';
            } else if (res.statusCode >= 500) {
              errorMessage = 'GitHub API server error. Please try again later.';
            } else {
              errorMessage += `: ${data.substring(0, 200)}`; // Truncate long error messages
            }
            
            console.error(`🚫 GitHub API error: ${res.statusCode}`, data.substring(0, 500));
            reject(new Error(errorMessage));
            return;
          }
          
          const releases = JSON.parse(data);
          
          // Validate that releases is an array
          if (!Array.isArray(releases)) {
            reject(new Error('Invalid GitHub API response format'));
            return;
          }
          
          const filteredReleases = releases.filter(release => {
            // Validate release object structure
            if (!release || !release.tag_name) {
              return false;
            }
            
            const tagName = release.tag_name.toLowerCase();
            
            switch (channel) {
              case 'alpha':
                return tagName.includes('alpha') || tagName.includes('beta') || (!tagName.includes('alpha') && !tagName.includes('beta'));
              case 'beta':
                return tagName.includes('beta') || (!tagName.includes('alpha') && !tagName.includes('beta'));
              case 'stable':
              default:
                return !tagName.includes('alpha') && !tagName.includes('beta');
            }
          });
          
          resolve(filteredReleases);
        } catch (error) {
          console.error('GitHub API parsing error:', error.message);
          console.error('Response data:', data.substring(0, 500)); // Log first 500 chars for debugging
          reject(new Error(`Failed to parse GitHub API response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`GitHub API request failed: ${error.message}`));
    });
    
    req.end();
  });
}

function getDownloadUrl(release) {
  const platform = os.platform();
  const arch = os.arch();
  
  // Look for platform-specific assets
  const assets = release.assets || [];
  
  if (platform === 'win32') {
    const windowsAsset = assets.find(asset => 
      asset.name.toLowerCase().includes('win') || 
      asset.name.toLowerCase().includes('.exe')
    );
    if (windowsAsset) return windowsAsset.browser_download_url;
  }
  
  if (platform === 'darwin') {
    const macAsset = assets.find(asset => 
      asset.name.toLowerCase().includes('mac') || 
      asset.name.toLowerCase().includes('darwin') ||
      asset.name.toLowerCase().includes('.dmg')
    );
    if (macAsset) return macAsset.browser_download_url;
  }
  
  if (platform === 'linux') {
    const linuxAsset = assets.find(asset => 
      asset.name.toLowerCase().includes('linux') ||
      asset.name.toLowerCase().includes('.appimage')
    );
    if (linuxAsset) return linuxAsset.browser_download_url;
  }
  
  // Fallback to first asset or tarball
  return assets.length > 0 ? assets[0].browser_download_url : release.tarball_url;
}

function compareVersions(version1, version2) {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  const maxLength = Math.max(v1parts.length, v2parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part > v2part) return 1;
    if (v1part < v2part) return -1;
  }
  
  return 0;
}

// Enhanced download function with retry mechanism and better progress tracking
async function downloadFile(url, outputPath, onProgress, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    timeout = 30000,
    resumeSupport = true
  } = options;

  let attempt = 0;
  let existingSize = 0;

  // Check if partial file exists for resume
  if (resumeSupport && fs.existsSync(outputPath)) {
    try {
      const stats = fs.statSync(outputPath);
      existingSize = stats.size;
      console.log(`📁 Resuming download from ${existingSize} bytes`);
    } catch (error) {
      console.warn('Could not get existing file size:', error.message);
      existingSize = 0;
    }
  }

  const attemptDownload = () => {
    return new Promise((resolve, reject) => {
      attempt++;
      console.log(`🔄 Download attempt ${attempt}/${maxRetries + 1} for ${url}`);

      const requestOptions = {
        timeout: timeout,
        headers: {}
      };

      // Add range header for resume support
      if (existingSize > 0 && resumeSupport) {
        requestOptions.headers['Range'] = `bytes=${existingSize}-`;
      }

      const file = fs.createWriteStream(outputPath, { flags: existingSize > 0 ? 'a' : 'w' });
      let downloadStartTime = Date.now();
      let lastProgressTime = Date.now();
      let downloadedSize = existingSize;
      let totalSize = existingSize;
      let isResolved = false;

      const request = https.get(url, requestOptions, (response) => {
        // Handle redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          return downloadFile(response.headers.location, outputPath, onProgress, options)
            .then(resolve)
            .catch(reject);
        }

        // Handle partial content (resume) or full content
        if (response.statusCode !== 200 && response.statusCode !== 206) {
          file.close();
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        // Get total file size
        if (response.statusCode === 206) {
          // Partial content - parse content-range header
          const contentRange = response.headers['content-range'];
          if (contentRange) {
            const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
            if (match) {
              totalSize = parseInt(match[1], 10);
            }
          }
        } else {
          // Full content
          totalSize = parseInt(response.headers['content-length'], 10) || 0;
          existingSize = 0; // Reset if we're downloading from scratch
          downloadedSize = 0;
        }

        console.log(`📊 Total size: ${totalSize}, Starting from: ${existingSize}`);

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const now = Date.now();
          
          // Throttle progress updates to avoid overwhelming the UI
          if (now - lastProgressTime > 100) { // Update every 100ms
            lastProgressTime = now;
            
            if (totalSize && onProgress) {
              const progress = (downloadedSize / totalSize) * 100;
              const speed = downloadedSize / ((now - downloadStartTime) / 1000); // bytes per second
              const eta = totalSize > downloadedSize ? (totalSize - downloadedSize) / speed : 0;
              
              onProgress({
                percent: Math.min(progress, 100),
                downloadedBytes: downloadedSize,
                totalBytes: totalSize,
                speed: speed,
                eta: eta,
                attempt: attempt
              });
            }
          }
        });

        response.pipe(file);

        response.on('end', () => {
          if (!isResolved) {
            isResolved = true;
            file.close(() => {
              console.log(`✅ Download completed successfully`);
              resolve(outputPath);
            });
          }
        });

        response.on('error', (error) => {
          if (!isResolved) {
            isResolved = true;
            file.close();
            console.error(`❌ Response error:`, error.message);
            reject(error);
          }
        });
      });

      request.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          file.close();
          console.error(`❌ Request error:`, error.message);
          reject(error);
        }
      });

      request.on('timeout', () => {
        if (!isResolved) {
          isResolved = true;
          request.destroy();
          file.close();
          console.error(`⏰ Request timeout after ${timeout}ms`);
          reject(new Error(`Download timeout after ${timeout}ms`));
        }
      });

      file.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          console.error(`❌ File write error:`, error.message);
          reject(error);
        }
      });
    });
  };

  // Retry logic
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await attemptDownload();
    } catch (error) {
      console.error(`❌ Download attempt ${attempt} failed:`, error.message);
      
      if (i === maxRetries) {
        // Final attempt failed, clean up and throw
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
            console.log(`🗑️ Cleaned up partial download file`);
          }
        } catch (cleanupError) {
          console.warn('Could not clean up partial file:', cleanupError.message);
        }
        throw new Error(`Download failed after ${maxRetries + 1} attempts: ${error.message}`);
      }
      
      // Wait before retry
      console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Exponential backoff
      retryDelay *= 1.5;
    }
  }
}

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
        }).on('error', (error) => {
          file.destroy(); // Clean up the file stream
          reject(error);
        });
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
        
        response.on('error', (error) => {
          file.destroy(); // Clean up the file stream
          fs.unlink(filePath, () => {}); // Delete partial file
          reject(error);
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
        
        file.on('error', (error) => {
          file.destroy(); // Clean up the file stream
          fs.unlink(filePath, () => {}); // Delete partial file
          reject(error);
        });
      }
    }).on('error', (error) => {
      file.destroy(); // Clean up the file stream
      reject(error);
    });
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
  const ytdlpCheck = dependencyManager.checkYtDlp();
  if (ytdlpCheck.available) {
    console.log(`Found yt-dlp (${ytdlpCheck.source}):`, ytdlpCheck.path);
    return ytdlpCheck.path;
  }
  console.log('yt-dlp not found');
  return null;
}

// Automatic Update Checker Functions
function startAutoUpdateChecker() {
  if (!autoUpdateSettings.enabled) {
    console.log('🔄 Automatic update checker is disabled');
    return;
  }

  console.log(`🔄 Starting automatic update checker (interval: ${autoUpdateSettings.interval / 1000 / 60} minutes)`);
  
  // Clear existing interval if any
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
  }

  // Perform initial check after 30 seconds
  setTimeout(() => {
    performAutoUpdateCheck();
  }, 30000);

  // Set up recurring checks
  autoUpdateInterval = setInterval(() => {
    performAutoUpdateCheck();
  }, autoUpdateSettings.interval);
}

function stopAutoUpdateChecker() {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    console.log('🛑 Automatic update checker stopped');
  }
}

// System notification helper
function showSystemNotification(title, body, type = 'info') {
  if (!Notification.isSupported()) {
    console.log('📢 System notifications not supported, using console log:', title, body);
    return;
  }

  try {
    const notification = new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, '../build/icon.png'), // App icon
      silent: false,
      urgency: type === 'update-error' ? 'critical' : 'normal'
    });

    notification.on('click', () => {
      // Focus the main window when notification is clicked
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        
        // If it's an update notification, navigate to settings
        if (type.includes('update')) {
          mainWindow.webContents.send('navigate-to-settings');
        }
      }
    });

    notification.show();
    console.log('📢 System notification shown:', title);
  } catch (error) {
    console.error('❌ Failed to show system notification:', error.message);
  }
}

// Silent update download handler
async function downloadUpdateSilently(updateInfo) {
  if (isDownloadingUpdate) {
    console.log('⏳ Update download already in progress, skipping silent download');
    return;
  }

  try {
    isDownloadingUpdate = true;
    console.log(`🔄 Starting silent download for version ${updateInfo.version}`);
    
    const downloadPath = path.join(os.tmpdir(), `puyt-update-${updateInfo.version}.exe`);
    
    // Download with progress tracking but no UI updates for silent mode
    await downloadFile(updateInfo.downloadUrl, downloadPath, (progress) => {
      // Log progress for silent downloads but don't send to UI
      if (progress.percent % 25 === 0) { // Log every 25%
        console.log(`📥 Silent download progress: ${Math.round(progress.percent)}% (${formatBytes(progress.downloadedBytes)}/${formatBytes(progress.totalBytes)})`);
      }
    }, {
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 300000, // 5 minutes
      resumeSupport: true
    });

    console.log(`✅ Silent download completed: ${downloadPath}`);
    
    // Show notification that download is complete and ready to install
    showSystemNotification(
      'Update Downloaded',
      `Puyt ${updateInfo.version} has been downloaded and is ready to install. Click to install now or it will be installed on next restart.`,
      'update-downloaded'
    );
    
    // Store the downloaded update info for later installation
    updateInfo.downloadPath = downloadPath;
    updateInfo.downloadedAt = new Date().toISOString();
    
    // Notify the UI if window is available (non-intrusive)
    if (mainWindow) {
      mainWindow.webContents.send('auto-update-notification', {
        title: 'Update Ready',
        message: `Puyt ${updateInfo.version} is ready to install`,
        version: updateInfo.version,
        type: 'update-downloaded',
        silent: true
      });
    }
    
  } catch (error) {
    console.error('❌ Silent update download failed:', error.message);
    throw error;
  } finally {
    isDownloadingUpdate = false;
  }
}

// Helper function for formatting bytes in silent downloads
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Security: Verify update file integrity
function verifyUpdateSignature(filePath, expectedHash, algorithm = 'sha256') {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => {
        hash.update(data);
      });
      
      stream.on('end', () => {
        const fileHash = hash.digest('hex');
        const isValid = fileHash === expectedHash;
        console.log(`🔐 Update verification: ${isValid ? 'PASSED' : 'FAILED'}`);
        console.log(`Expected: ${expectedHash}`);
        console.log(`Actual: ${fileHash}`);
        resolve(isValid);
      });
      
      stream.on('error', (error) => {
        console.error('❌ Error verifying update signature:', error);
        reject(error);
      });
    } catch (error) {
      console.error('❌ Error creating hash verification:', error);
      reject(error);
    }
  });
}

// Rollback mechanism for failed updates
function createUpdateBackup() {
  return new Promise((resolve, reject) => {
    try {
      const appPath = app.getAppPath();
      const backupDir = path.join(os.tmpdir(), 'puyt-backup', Date.now().toString());
      
      // Create backup directory
      fs.mkdirSync(backupDir, { recursive: true });
      
      // Copy current app files to backup
      const copyRecursive = (src, dest) => {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
          fs.mkdirSync(dest, { recursive: true });
          const files = fs.readdirSync(src);
          files.forEach(file => {
            copyRecursive(path.join(src, file), path.join(dest, file));
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      };
      
      copyRecursive(appPath, backupDir);
      console.log(`📦 Update backup created: ${backupDir}`);
      resolve(backupDir);
    } catch (error) {
      console.error('❌ Failed to create update backup:', error);
      reject(error);
    }
  });
}

function rollbackUpdate(backupPath) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup path does not exist');
      }
      
      const appPath = app.getAppPath();
      
      // Remove current app files
      const removeRecursive = (dirPath) => {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              removeRecursive(filePath);
            } else {
              fs.unlinkSync(filePath);
            }
          });
          fs.rmdirSync(dirPath);
        }
      };
      
      // Restore from backup
      const copyRecursive = (src, dest) => {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
          fs.mkdirSync(dest, { recursive: true });
          const files = fs.readdirSync(src);
          files.forEach(file => {
            copyRecursive(path.join(src, file), path.join(dest, file));
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      };
      
      copyRecursive(backupPath, appPath);
      
      // Clean up backup
      removeRecursive(backupPath);
      
      console.log('🔄 Update rollback completed successfully');
      resolve(true);
    } catch (error) {
      console.error('❌ Failed to rollback update:', error);
      reject(error);
    }
  });
}

async function performAutoUpdateCheck() {
  if (isCheckingForUpdates) {
    console.log('⏳ Update check already in progress, skipping automatic check');
    return;
  }

  try {
    console.log(`🔍 Performing automatic update check (channel: ${autoUpdateSettings.channel})`);
    
    const currentVersion = app.getVersion();
    const releases = await fetchGitHubReleases(autoUpdateSettings.channel);
    
    if (releases.length === 0) {
      console.log('📭 No releases found during automatic check');
      return;
    }

    const latestRelease = releases[0];
    const latestVersion = latestRelease.tag_name.replace(/^v/, '');
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      updateInfo = {
        version: latestVersion,
        downloadUrl: getDownloadUrl(latestRelease),
        releaseNotes: latestRelease.body || 'No release notes available',
        publishedAt: latestRelease.published_at,
        channel: autoUpdateSettings.channel,
        isAutomatic: true
      };
      
      console.log(`🎉 New version available: ${latestVersion} (current: ${currentVersion})`);      
      
      // Handle silent vs non-silent updates
      if (autoUpdateSettings.silent) {
        // For silent updates, show system notification
        if (autoUpdateSettings.autoDownload) {
          showSystemNotification(
            'Update Available',
            `Puyt ${latestVersion} is available. Downloading in background...`,
            'update-available'
          );
          
          // Start automatic download for silent updates
          try {
            await downloadUpdateSilently(updateInfo);
          } catch (error) {
            console.error('❌ Silent update download failed:', error.message);
            showSystemNotification(
              'Update Download Failed',
              `Failed to download Puyt ${latestVersion}. You can update manually from settings.`,
              'update-error'
            );
          }
        } else {
          // Just notify about available update without auto-downloading
          showSystemNotification(
            'Update Available',
            `Puyt ${latestVersion} is now available! Click to open settings and update.`,
            'update-available'
          );
        }
      } else {
        // For non-silent updates, notify the UI
        if (mainWindow) {
          mainWindow.webContents.send('update-available', updateInfo);
          mainWindow.webContents.send('auto-update-notification', {
            title: 'Update Available',
            message: `Puyt ${latestVersion} is now available!`,
            version: latestVersion,
            type: 'update-available'
          });
        }
      }
    } else {
      console.log('✅ Application is up to date (automatic check)');
    }
  } catch (error) {
    console.error('❌ Error during automatic update check:', error.message);
    // Don't show error notifications for automatic checks to avoid spam
  }
}



// IPC handlers for automatic update settings
ipcMain.handle('get-auto-update-settings', () => {
  return autoUpdateSettings;
});

ipcMain.handle('set-auto-update-settings', (event, settings) => {
  const oldEnabled = autoUpdateSettings.enabled;
  const oldInterval = autoUpdateSettings.interval;
  
  autoUpdateSettings = { ...autoUpdateSettings, ...settings };
  
  // Restart checker if settings changed
  if (autoUpdateSettings.enabled !== oldEnabled || autoUpdateSettings.interval !== oldInterval) {
    stopAutoUpdateChecker();
    if (autoUpdateSettings.enabled) {
      startAutoUpdateChecker();
    }
  }
  
  console.log('⚙️ Auto-update settings updated:', autoUpdateSettings);
  return autoUpdateSettings;
});

ipcMain.handle('trigger-manual-update-check', async (event, channel) => {
  // This is for manual checks triggered by user, not silent
  const originalSilent = autoUpdateSettings.silent;
  autoUpdateSettings.silent = false;
  
  try {
    // Call the check-for-updates handler directly
    const checkForUpdatesHandler = ipcMain.listeners('check-for-updates')[0];
    if (checkForUpdatesHandler) {
      return await checkForUpdatesHandler(event, channel || autoUpdateSettings.channel);
    } else {
      // Fallback: call the handler function directly
      if (isCheckingForUpdates) {
        throw new Error('Update check already in progress');
      }

      isCheckingForUpdates = true;
      updateInfo = null;

      try {
        const currentVersion = app.getVersion();
        const releases = await fetchGitHubReleases(channel || autoUpdateSettings.channel);
        
        if (releases.length === 0) {
          mainWindow.webContents.send('update-not-available');
          return { available: false, message: 'No releases found' };
        }

        const latestRelease = releases[0];
        const latestVersion = latestRelease.tag_name.replace(/^v/, '');
        
        if (compareVersions(latestVersion, currentVersion) > 0) {
          updateInfo = {
            version: latestVersion,
            downloadUrl: getDownloadUrl(latestRelease),
            releaseNotes: latestRelease.body || 'No release notes available',
            publishedAt: latestRelease.published_at,
            channel: channel || autoUpdateSettings.channel
          };
          
          mainWindow.webContents.send('update-available', updateInfo);
          return { available: true, updateInfo };
        } else {
          mainWindow.webContents.send('update-not-available');
          return { available: false, message: 'You are running the latest version' };
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
        mainWindow.webContents.send('update-error', { message: error.message });
        throw error;
      } finally {
        isCheckingForUpdates = false;
      }
    }
  } finally {
    autoUpdateSettings.silent = originalSilent;
  }
});