const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const YtDlpInstaller = require('../scripts/install-ytdlp');

let mainWindow;

function createWindow() {
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
    icon: path.join(__dirname, '../Assets/Square44x44Logo.scale-100.png')
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
    const ytDlpAvailable = await new Promise((checkResolve) => {
      const testProcess = spawn('yt-dlp', ['--version'], { shell: true });
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
      reject(new Error('yt-dlp not found. Please install yt-dlp first.'));
      return;
    }
    
    const ytDlpPath = getYtDlpPath();

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
            formats: videoInfo.formats?.map(format => ({
              format_id: format.format_id,
              ext: format.ext,
              quality: format.quality,
              filesize: format.filesize,
              format_note: format.format_note,
              height: format.height,
              width: format.width,
              fps: format.fps,
              vcodec: format.vcodec,
              acodec: format.acodec
            })) || []
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
function downloadWithFfmpeg(url, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    // Check if ffmpeg is available
    const ffmpegProcess = spawn('ffmpeg', ['-version'], { shell: true });
    
    ffmpegProcess.on('error', () => {
      reject(new Error('Neither yt-dlp nor ffmpeg found. Please install one of them.'));
    });
    
    ffmpegProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('FFmpeg not available'));
        return;
      }
      
      // Build ffmpeg command for basic video download
      const outputFile = path.join(outputPath, `video_${Date.now()}.${options.format || 'mp4'}`);
      const args = ['-i', url, '-c', 'copy', outputFile];
      
      // Add time range if specified
      if (options.startTime) {
        args.splice(-2, 0, '-ss', options.startTime);
      }
      if (options.endTime) {
        args.splice(-2, 0, '-to', options.endTime);
      }
      
      const downloadProcess = spawn('ffmpeg', args, { shell: true });
      
      downloadProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('FFmpeg output:', output);
        
        // Try to extract progress from ffmpeg output
        const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (timeMatch) {
          // Send progress update (simplified)
          event.sender.send('download-progress', {
            progress: Math.min(50, Math.random() * 100), // Simplified progress
            message: `Processing with FFmpeg: ${timeMatch[1]}`
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
        reject(new Error(`FFmpeg error: ${error.message}`));
      });
    });
  });
}

ipcMain.handle('download-video', async (event, options) => {
  return new Promise(async (resolve, reject) => {
    // First try yt-dlp
    const ytDlpAvailable = await new Promise((checkResolve) => {
      const testProcess = spawn('yt-dlp', ['--version'], { shell: true });
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
    
    const ytDlpPath = getYtDlpPath();

    const {
      url,
      outputPath,
      quality = 'best',
      format = 'mp4',
      audioFormat = 'mp3',
      extractAudio = false,
      downloadSubtitles = false,
      embedThumbnail = false,
      startTime = null,
      endTime = null,
      customArgs = ''
    } = options;

    // Build format selector based on quality and format preferences
    let formatSelector;
    if (quality === 'best') {
      formatSelector = extractAudio ? 'bestaudio' : `best[ext=${format}]/best`;
    } else if (quality === 'worst') {
      formatSelector = extractAudio ? 'worstaudio' : `worst[ext=${format}]/worst`;
    } else {
      // Quality like '720p', '1080p'
      const height = quality.replace('p', '');
      formatSelector = extractAudio ? 'bestaudio' : `best[height<=${height}][ext=${format}]/best[height<=${height}]/best`;
    }

    const args = [
      '-f', formatSelector,
      '-o', path.join(outputPath, '%(title)s.%(ext)s'),
      '--newline'
    ];

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

    process.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('yt-dlp output:', output);
      
      const progressMatch = output.match(/\[download\]\s+(\d+\.\d+)%/);
      const speedMatch = output.match(/at\s+([\d\.]+\w+\/s)/);
      const etaMatch = output.match(/ETA\s+(\d+:\d+)/);
      
      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);
        const speed = speedMatch ? speedMatch[1] : '';
        const eta = etaMatch ? etaMatch[1] : '';
        
        mainWindow.webContents.send('download-progress', { 
          progress, 
          speed, 
          eta 
        });
      }
    });

    process.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('yt-dlp error:', error);
      mainWindow.webContents.send('download-error', { error });
    });

    process.on('close', (code) => {
      console.log('yt-dlp process closed with code:', code);
      if (code === 0) {
        mainWindow.webContents.send('download-complete');
        resolve({ success: true });
      } else {
        reject(new Error('Download failed'));
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
    const installer = new YtDlpInstaller();
    const status = await installer.checkStatus();
    return status;
  } catch (error) {
    return { installed: false, error: error.message, message: 'Error checking yt-dlp status' };
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
  // Check common installation paths for yt-dlp
  const appDataPath = app.getPath('userData');
  const possiblePaths = [
    'yt-dlp', // If in PATH
    path.join(appDataPath, 'bin', 'yt-dlp.exe'), // Windows executable in app data
    path.join(appDataPath, 'bin', 'yt-dlp'), // Unix executable in app data
    path.join(process.cwd(), 'yt-dlp.exe'), // Windows executable in app directory
    path.join(process.cwd(), 'yt-dlp'), // Unix executable in app directory
    '/usr/local/bin/yt-dlp', // Common Unix path
    '/usr/bin/yt-dlp' // Another common Unix path
  ];

  for (const ytDlpPath of possiblePaths) {
    try {
      if (fs.existsSync(ytDlpPath)) {
        return ytDlpPath;
      }
    } catch (error) {
      continue;
    }
  }

  return 'yt-dlp'; // Fallback to PATH
}