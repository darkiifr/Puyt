const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync, spawn } = require('child_process');
const os = require('os');

class DependencyManager {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.appDataPath = this.getAppDataPath();
    this.binPath = path.join(this.appDataPath, 'bin');
  }

  getAppDataPath() {
    switch (this.platform) {
      case 'win32':
        return path.join(os.homedir(), 'AppData', 'Local', 'Puyt');
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support', 'Puyt');
      default:
        return path.join(os.homedir(), '.local', 'share', 'puyt');
    }
  }

  // Simple command availability check
  isCommandAvailable(command) {
    try {
      const whereCommand = this.platform === 'win32' ? `where ${command}` : `which ${command}`;
      execSync(whereCommand, { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get command path if available
  getCommandPath(command) {
    try {
      const whereCommand = this.platform === 'win32' ? `where ${command}` : `which ${command}`;
      const result = execSync(whereCommand, { encoding: 'utf8' });
      return result.trim().split('\n')[0];
    } catch (error) {
      return null;
    }
  }

  // Check yt-dlp availability
  checkYtDlp() {
    const executableName = this.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    
    // First check if it's in PATH
    if (this.isCommandAvailable('yt-dlp')) {
      return { available: true, path: this.getCommandPath('yt-dlp'), source: 'system' };
    }
    
    // Check local installation
    const localPath = path.join(this.binPath, executableName);
    if (fs.existsSync(localPath)) {
      return { available: true, path: localPath, source: 'local' };
    }
    
    return { available: false, path: null, source: null };
  }

  // Check ffmpeg availability
  checkFfmpeg() {
    const executableName = this.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    
    // First check if it's in PATH
    if (this.isCommandAvailable('ffmpeg')) {
      return { available: true, path: this.getCommandPath('ffmpeg'), source: 'system' };
    }
    
    // Check local installation
    const localPath = path.join(this.binPath, executableName);
    if (fs.existsSync(localPath)) {
      return { available: true, path: localPath, source: 'local' };
    }
    
    return { available: false, path: null, source: null };
  }

  // Ensure bin directory exists
  async ensureBinDirectory() {
    try {
      if (!fs.existsSync(this.binPath)) {
        fs.mkdirSync(this.binPath, { recursive: true });
        console.log(`📁 Created bin directory: ${this.binPath}`);
      }
    } catch (error) {
      throw new Error(`Failed to create bin directory: ${error.message}`);
    }
  }

  // Download file with progress
  async downloadFile(url, outputPath, onProgress) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);
      
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          return this.downloadFile(response.headers.location, outputPath, onProgress)
            .then(resolve)
            .catch(reject);
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;
        
        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (onProgress && totalSize) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            onProgress(`📥 Downloading... ${progress}% (${this.formatBytes(downloadedSize)}/${this.formatBytes(totalSize)})`);
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(outputPath);
        });
        
        file.on('error', (error) => {
          fs.unlink(outputPath, () => {});
          reject(error);
        });
      }).on('error', reject);
    });
  }

  // Install yt-dlp
  async installYtDlp(onProgress) {
    try {
      onProgress?.('🚀 Starting yt-dlp installation...');
      
      await this.ensureBinDirectory();
      
      const executableName = this.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
      const executablePath = path.join(this.binPath, executableName);
      
      // Get download URL
      const baseUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download';
      let downloadUrl;
      
      if (this.platform === 'win32') {
        downloadUrl = `${baseUrl}/yt-dlp.exe`;
      } else {
        downloadUrl = `${baseUrl}/yt-dlp`;
      }
      
      onProgress?.('📥 Downloading yt-dlp...');
      await this.downloadFile(downloadUrl, executablePath, onProgress);
      
      // Make executable on Unix systems
      if (this.platform !== 'win32') {
        execSync(`chmod +x "${executablePath}"`);
      }
      
      // Add to PATH
      await this.addToPath();
      
      // Verify installation
      const version = execSync(`"${executablePath}" --version`, { encoding: 'utf8' }).trim();
      onProgress?.(`✅ yt-dlp ${version} installed successfully!`);
      
      return { success: true, version, path: executablePath };
    } catch (error) {
      onProgress?.(`❌ yt-dlp installation failed: ${error.message}`);
      throw error;
    }
  }

  // Install ffmpeg
  async installFfmpeg(onProgress) {
    try {
      onProgress?.('🚀 Starting FFmpeg installation...');
      
      await this.ensureBinDirectory();
      
      if (this.platform === 'win32') {
        await this.installFfmpegWindows(onProgress);
      } else if (this.platform === 'darwin') {
        await this.installFfmpegMacOS(onProgress);
      } else {
        await this.installFfmpegLinux(onProgress);
      }
      
      // Add to PATH
      await this.addToPath();
      
      onProgress?.('✅ FFmpeg installed successfully!');
      return { success: true };
    } catch (error) {
      onProgress?.(`❌ FFmpeg installation failed: ${error.message}`);
      throw error;
    }
  }

  async installFfmpegWindows(onProgress) {
    // Download FFmpeg essentials build for Windows
    const downloadUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
    const zipPath = path.join(this.binPath, 'ffmpeg.zip');
    
    onProgress?.('📥 Downloading FFmpeg for Windows...');
    await this.downloadFile(downloadUrl, zipPath, onProgress);
    
    onProgress?.('📦 Extracting FFmpeg...');
    // Extract using PowerShell (available on all Windows systems)
    const extractCommand = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${this.binPath}' -Force"`;
    execSync(extractCommand);
    
    // Find the extracted folder and move binaries
    const extractedFolders = fs.readdirSync(this.binPath).filter(item => 
      fs.statSync(path.join(this.binPath, item)).isDirectory() && item.includes('ffmpeg')
    );
    
    if (extractedFolders.length > 0) {
      const ffmpegFolder = path.join(this.binPath, extractedFolders[0], 'bin');
      const binaries = ['ffmpeg.exe', 'ffprobe.exe', 'ffplay.exe'];
      
      for (const binary of binaries) {
        const sourcePath = path.join(ffmpegFolder, binary);
        const destPath = path.join(this.binPath, binary);
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
        }
      }
      
      // Clean up
      fs.rmSync(path.join(this.binPath, extractedFolders[0]), { recursive: true, force: true });
    }
    
    fs.unlinkSync(zipPath);
  }

  async installFfmpegMacOS(onProgress) {
    onProgress?.('🍺 Installing FFmpeg via Homebrew...');
    try {
      execSync('brew install ffmpeg', { stdio: 'inherit' });
    } catch (error) {
      throw new Error('Homebrew not found. Please install Homebrew first: https://brew.sh');
    }
  }

  async installFfmpegLinux(onProgress) {
    onProgress?.('📦 Installing FFmpeg via package manager...');
    try {
      // Try different package managers
      if (this.isCommandAvailable('apt')) {
        execSync('sudo apt update && sudo apt install -y ffmpeg', { stdio: 'inherit' });
      } else if (this.isCommandAvailable('yum')) {
        execSync('sudo yum install -y ffmpeg', { stdio: 'inherit' });
      } else if (this.isCommandAvailable('dnf')) {
        execSync('sudo dnf install -y ffmpeg', { stdio: 'inherit' });
      } else if (this.isCommandAvailable('pacman')) {
        execSync('sudo pacman -S ffmpeg', { stdio: 'inherit' });
      } else {
        throw new Error('No supported package manager found');
      }
    } catch (error) {
      throw new Error(`Package manager installation failed: ${error.message}`);
    }
  }

  // Add bin directory to PATH
  async addToPath() {
    try {
      if (this.platform === 'win32') {
        await this.addToWindowsPath();
      } else {
        await this.addToUnixPath();
      }
    } catch (error) {
      console.warn(`⚠️ Could not add to PATH automatically: ${error.message}`);
      console.log(`📝 Please manually add this path to your system PATH: ${this.binPath}`);
    }
  }

  async addToWindowsPath() {
    try {
      // Get current user PATH
      const currentPath = execSync('echo %PATH%', { encoding: 'utf8' }).trim();
      
      if (!currentPath.includes(this.binPath)) {
        // Add to user PATH using setx
        const command = `setx PATH "%PATH%;${this.binPath}"`;
        execSync(command);
        console.log('✅ Added to Windows PATH (restart required)');
      }
    } catch (error) {
      throw new Error(`Failed to add to Windows PATH: ${error.message}`);
    }
  }

  async addToUnixPath() {
    const shellConfigFiles = [
      path.join(os.homedir(), '.bashrc'),
      path.join(os.homedir(), '.zshrc'),
      path.join(os.homedir(), '.profile')
    ];

    const pathExport = `export PATH="${this.binPath}:$PATH"`;
    let updated = false;

    for (const configFile of shellConfigFiles) {
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8');
        if (!content.includes(this.binPath)) {
          fs.appendFileSync(configFile, `\n# Added by Puyt\n${pathExport}\n`);
          console.log(`✅ Added to PATH in ${configFile}`);
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      // Create .profile if no config file exists
      const profilePath = path.join(os.homedir(), '.profile');
      fs.writeFileSync(profilePath, `# Added by Puyt\n${pathExport}\n`);
      console.log('✅ Created .profile and added to PATH');
    }
  }

  // Get installation instructions for manual installation
  getInstallationInstructions() {
    const instructions = {
      ytdlp: {
        windows: [
          'winget install yt-dlp',
          'Or download from: https://github.com/yt-dlp/yt-dlp/releases'
        ],
        macos: [
          'brew install yt-dlp',
          'Or: pip install yt-dlp'
        ],
        linux: [
          'sudo apt install yt-dlp  # Ubuntu/Debian',
          'sudo dnf install yt-dlp  # Fedora',
          'Or: pip install yt-dlp'
        ]
      },
      ffmpeg: {
        windows: [
          'winget install FFmpeg',
          'Or download from: https://ffmpeg.org/download.html'
        ],
        macos: [
          'brew install ffmpeg'
        ],
        linux: [
          'sudo apt install ffmpeg  # Ubuntu/Debian',
          'sudo dnf install ffmpeg  # Fedora'
        ]
      }
    };

    return instructions;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = DependencyManager;