const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync, spawn } = require('child_process');
const os = require('os');

class YtDlpInstaller {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.appDataPath = this.getAppDataPath();
    this.ytDlpPath = path.join(this.appDataPath, 'yt-dlp');
    this.executableName = this.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    this.executablePath = path.join(this.ytDlpPath, this.executableName);
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

  getDownloadUrl() {
    const baseUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
    
    switch (this.platform) {
      case 'win32':
        return baseUrl + 'yt-dlp.exe';
      case 'darwin':
        return baseUrl + 'yt-dlp_macos';
      default:
        return baseUrl + 'yt-dlp';
    }
  }

  async ensureDirectoryExists() {
    try {
      if (!fs.existsSync(this.ytDlpPath)) {
        fs.mkdirSync(this.ytDlpPath, { recursive: true });
        console.log(`📁 Created directory: ${this.ytDlpPath}`);
      }
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  async downloadYtDlp(onProgress) {
    return new Promise((resolve, reject) => {
      const url = this.getDownloadUrl();
      console.log(`🔄 Downloading yt-dlp from: ${url}`);
      
      const file = fs.createWriteStream(this.executablePath);
      
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          return https.get(response.headers.location, (redirectResponse) => {
            this.handleDownloadResponse(redirectResponse, file, onProgress, resolve, reject);
          }).on('error', reject);
        }
        
        this.handleDownloadResponse(response, file, onProgress, resolve, reject);
      }).on('error', reject);
    });
  }

  handleDownloadResponse(response, file, onProgress, resolve, reject) {
    if (response.statusCode !== 200) {
      return reject(new Error(`Download failed with status: ${response.statusCode}`));
    }

    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloadedSize = 0;

    response.on('data', (chunk) => {
      downloadedSize += chunk.length;
      if (onProgress && totalSize) {
        const progress = Math.round((downloadedSize / totalSize) * 100);
        onProgress(`📥 Downloading: ${progress}% (${this.formatBytes(downloadedSize)}/${this.formatBytes(totalSize)})`);
      }
    });

    response.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log('✅ Download completed successfully');
      resolve();
    });

    file.on('error', (error) => {
      fs.unlink(this.executablePath, () => {}); // Delete partial file
      reject(error);
    });
  }

  async makeExecutable() {
    if (this.platform !== 'win32') {
      try {
        execSync(`chmod +x "${this.executablePath}"`);
        console.log('✅ Made yt-dlp executable');
      } catch (error) {
        throw new Error(`Failed to make executable: ${error.message}`);
      }
    }
  }

  async addToPath() {
    try {
      if (this.platform === 'win32') {
        await this.addToWindowsPath();
      } else {
        await this.addToUnixPath();
      }
    } catch (error) {
      console.warn(`⚠️ Could not add to PATH automatically: ${error.message}`);
      console.log(`📝 Please manually add this path to your system PATH: ${this.ytDlpPath}`);
    }
  }

  async addToWindowsPath() {
    try {
      // Get current user PATH
      const currentPath = execSync('echo %PATH%', { encoding: 'utf8' }).trim();
      
      if (!currentPath.includes(this.ytDlpPath)) {
        // Add to user PATH using PowerShell
        const psCommand = `
          $currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
          if ($currentPath -notlike '*${this.ytDlpPath.replace(/\\/g, '\\\\')}*') {
            $newPath = if ($currentPath) { "$currentPath;${this.ytDlpPath}" } else { "${this.ytDlpPath}" }
            [Environment]::SetEnvironmentVariable('PATH', $newPath, 'User')
            Write-Host 'PATH updated successfully'
          } else {
            Write-Host 'PATH already contains yt-dlp directory'
          }
        `;
        
        execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' });
        console.log('✅ Added yt-dlp to Windows PATH');
      } else {
        console.log('✅ yt-dlp already in PATH');
      }
    } catch (error) {
      throw new Error(`Windows PATH update failed: ${error.message}`);
    }
  }

  async addToUnixPath() {
    const shellConfigFiles = [
      path.join(os.homedir(), '.bashrc'),
      path.join(os.homedir(), '.zshrc'),
      path.join(os.homedir(), '.profile')
    ];

    const pathExport = `export PATH="${this.ytDlpPath}:$PATH"`;
    let updated = false;

    for (const configFile of shellConfigFiles) {
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8');
        if (!content.includes(this.ytDlpPath)) {
          fs.appendFileSync(configFile, `\n# Added by Puyt\n${pathExport}\n`);
          console.log(`✅ Added yt-dlp to PATH in ${configFile}`);
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      // Create .profile if no config file exists
      const profilePath = path.join(os.homedir(), '.profile');
      fs.writeFileSync(profilePath, `# Added by Puyt\n${pathExport}\n`);
      console.log(`✅ Created .profile and added yt-dlp to PATH`);
    }
  }

  async verifyInstallation() {
    try {
      const version = execSync(`"${this.executablePath}" --version`, { encoding: 'utf8' }).trim();
      console.log(`✅ yt-dlp installation verified - Version: ${version}`);
      return { success: true, version, path: this.executablePath };
    } catch (error) {
      throw new Error(`Installation verification failed: ${error.message}`);
    }
  }

  async install(onProgress) {
    try {
      onProgress?.('🚀 Starting yt-dlp installation...');
      
      await this.ensureDirectoryExists();
      onProgress?.('📁 Directory structure created');
      
      await this.downloadYtDlp(onProgress);
      onProgress?.('📥 Download completed');
      
      await this.makeExecutable();
      onProgress?.('🔧 Permissions configured');
      
      await this.addToPath();
      onProgress?.('🛤️ PATH configuration updated');
      
      const result = await this.verifyInstallation();
      onProgress?.(`✅ Installation completed successfully! Version: ${result.version}`);
      
      return result;
    } catch (error) {
      onProgress?.(`❌ Installation failed: ${error.message}`);
      throw error;
    }
  }

  async update(onProgress) {
    try {
      onProgress?.('🔄 Updating yt-dlp...');
      
      // Remove old version
      if (fs.existsSync(this.executablePath)) {
        fs.unlinkSync(this.executablePath);
        onProgress?.('🗑️ Removed old version');
      }
      
      // Install new version
      return await this.install(onProgress);
    } catch (error) {
      onProgress?.(`❌ Update failed: ${error.message}`);
      throw error;
    }
  }

  async checkStatus() {
    try {
      if (!fs.existsSync(this.executablePath)) {
        return { installed: false, message: 'yt-dlp not found' };
      }
      
      const version = execSync(`"${this.executablePath}" --version`, { encoding: 'utf8' }).trim();
      return { 
        installed: true, 
        version, 
        path: this.executablePath,
        message: `yt-dlp ${version} is installed` 
      };
    } catch (error) {
      return { 
        installed: false, 
        error: error.message,
        message: 'yt-dlp installation corrupted' 
      };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = YtDlpInstaller;