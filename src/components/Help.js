import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Help = ({ onNavigate }) => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'installation', title: 'Installation', icon: '⚙️' },
    { id: 'usage', title: 'How to Use', icon: '📖' },
    { id: 'formats', title: 'Video Formats', icon: '🎥' },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: '🔧' },
    { id: 'shortcuts', title: 'Keyboard Shortcuts', icon: '⌨️' },
    { id: 'faq', title: 'FAQ', icon: '❓' }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to Puyt!</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate && onNavigate('home')}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <span>←</span>
                <span>Back to Home</span>
              </motion.button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Puyt is a modern, user-friendly video downloader that helps you save videos from various platforms to your local device.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Quick Start</h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
                <li>Ensure yt-dlp is installed on your system</li>
                <li>Copy a video URL from your favorite platform</li>
                <li>Paste it into Puyt and click "Get Video Info"</li>
                <li>Choose your preferred format and quality</li>
                <li>Select download location and start downloading!</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">✨ Features</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Multiple video formats</li>
                  <li>• Audio-only downloads</li>
                  <li>• Quality selection</li>
                  <li>• Progress tracking</li>
                  <li>• Dark/Light themes</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🌐 Supported Platforms</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• YouTube</li>
                  <li>• Vimeo</li>
                  <li>• Twitter</li>
                  <li>• And 1000+ more!</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'installation':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Installing yt-dlp</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Puyt requires yt-dlp to function. Here's how to install it on different operating systems:
            </p>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">🪟</span> Windows
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Method 1: Using winget (Recommended)</h4>
                    <div className="bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                      winget install yt-dlp
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Method 2: Using pip</h4>
                    <div className="bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                      pip install yt-dlp
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Requires Python to be installed. Download from <a href="https://python.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">python.org</a>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Method 3: Manual Installation</h4>
                    <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      <li>Download yt-dlp.exe from <a href="https://github.com/yt-dlp/yt-dlp/releases" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">GitHub releases</a></li>
                      <li>Place it in a folder (e.g., C:\\Tools\\)</li>
                      <li>Add the folder to your PATH environment variable</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">🍎</span> macOS
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Method 1: Using Homebrew (Recommended)</h4>
                    <div className="bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                      brew install yt-dlp
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Install Homebrew first from <a href="https://brew.sh" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">brew.sh</a>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Method 2: Using pip</h4>
                    <div className="bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                      pip install yt-dlp
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Python is usually pre-installed on macOS. If not, install from <a href="https://python.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">python.org</a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">🐧</span> Linux
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Ubuntu/Debian</h4>
                    <div className="bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                      sudo apt install yt-dlp
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Arch Linux</h4>
                    <div className="bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                      sudo pacman -S yt-dlp
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Fedora</h4>
                    <div className="bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                      sudo dnf install yt-dlp
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Universal (pip)</h4>
                    <div className="bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                      pip install yt-dlp
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Works on all Linux distributions. Install Python first: <code className="bg-gray-700 px-1 rounded text-xs">sudo apt install python3-pip</code> (Ubuntu/Debian) or equivalent
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'usage':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">How to Use Puyt</h2>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">Step-by-Step Guide</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-4">1</div>
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200">Enter Video URL</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">Paste the URL of the video you want to download in the input field.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-4">2</div>
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200">Get Video Information</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">Click "Get Video Info" to fetch available formats and video details.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-4">3</div>
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200">Choose Format</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">Select your preferred video quality and format from the available options.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-4">4</div>
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200">Select Download Location</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">Choose where to save the downloaded file on your computer.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-4">5</div>
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200">Start Download</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">Click "Download" and monitor the progress in real-time.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">💡 Pro Tips</h4>
                <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1">
                  <li>• Use audio-only formats for music downloads to save space</li>
                  <li>• Higher quality videos take longer to download and use more storage</li>
                  <li>• You can cancel downloads at any time</li>
                  <li>• Check the file size before downloading large videos</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'formats':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Understanding Video Formats</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">🎥</span> Video Formats
                </h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">MP4</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Most compatible format, works on all devices</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">WEBM</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Good quality, smaller file sizes</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">MKV</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">High quality, supports multiple audio tracks</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="mr-2">🎵</span> Audio Formats
                </h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">MP3</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Universal compatibility, good compression</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">M4A</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Better quality than MP3 at same bitrate</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">OPUS</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Excellent quality, modern codec</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">Quality Guidelines</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">📱</div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Mobile Viewing</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">720p or lower</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">💻</div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Desktop Viewing</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">1080p recommended</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">📺</div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">TV/Projector</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">1440p or 4K</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'troubleshooting':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Troubleshooting</h2>
            
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">yt-dlp not detected</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-300 mb-3">If Puyt can't find yt-dlp:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>Ensure yt-dlp is installed and in your PATH</li>
                    <li>Try restarting Puyt after installation</li>
                    <li>On Windows, restart your terminal/command prompt</li>
                    <li>Verify installation by running 'yt-dlp --version' in terminal</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Download fails or stops</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-300 mb-3">Common solutions:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>Check your internet connection</li>
                    <li>Verify the video URL is still valid</li>
                    <li>Try a different video format or quality</li>
                    <li>Ensure you have enough disk space</li>
                    <li>Update yt-dlp to the latest version</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Video info not loading</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-300 mb-3">Try these steps:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>Double-check the video URL</li>
                    <li>Ensure the video is publicly accessible</li>
                    <li>Some platforms may have restrictions</li>
                    <li>Wait a moment and try again</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Performance issues</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-300 mb-3">To improve performance:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>Close other applications while downloading</li>
                    <li>Choose lower quality for faster downloads</li>
                    <li>Ensure stable internet connection</li>
                    <li>Download to a fast storage device (SSD preferred)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Keyboard Shortcuts</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">General</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">Focus URL input</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">Ctrl+L</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">Get video info</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">Ctrl+Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">Toggle theme</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">Ctrl+Shift+T</kbd>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Navigation</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">Open help</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">F1</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">Close modal</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">Esc</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">Refresh</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">F5</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Is Puyt free to use?</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-300">Yes, Puyt is completely free and open-source. There are no hidden fees or premium features.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">What platforms are supported?</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-300">Puyt supports over 1000 platforms including YouTube, Vimeo, Twitter, Facebook, Instagram, TikTok, and many more through yt-dlp.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Is it legal to download videos?</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-300">You should only download content you have the right to download or that is available under appropriate licenses. Always respect copyright laws and platform terms of service.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Does Puyt collect my data?</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-300">No, Puyt operates entirely locally on your device and doesn't collect, store, or transmit any personal data to external servers.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Can I download playlists?</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-300">Currently, Puyt focuses on individual video downloads. Playlist support may be added in future versions.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Why do I need yt-dlp?</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-300">yt-dlp is a powerful, actively maintained tool that handles the complex process of extracting video URLs and downloading from various platforms. Puyt provides a user-friendly interface for yt-dlp.</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full max-h-[calc(90vh-120px)]">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Help Topics
          </h3>
          <nav className="space-y-1">
            {sections.map((section) => (
              <motion.button
                key={section.id}
                whileHover={{ x: 4 }}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </motion.button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Help;