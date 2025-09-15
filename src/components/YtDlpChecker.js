import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const YtDlpChecker = ({ onInstalled }) => {
  const [isChecking, setIsChecking] = useState(true); // Start with checking on mount
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState('');
  const [hasCheckedOnMount, setHasCheckedOnMount] = useState(false);

  // Check yt-dlp status on component mount
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (hasCheckedOnMount) return; // Prevent multiple checks
      
      try {
        if (window.electronAPI) {
          const available = await window.electronAPI.checkYtDlp();
          if (available) {
            onInstalled(); // Automatically proceed if yt-dlp is available
            return;
          }
        }
      } catch (error) {
        console.error('Error checking yt-dlp on mount:', error);
        setInstallMessage(`Failed to check yt-dlp availability: ${error.message || 'Connection error'}`);
      } finally {
        setIsChecking(false);
        setHasCheckedOnMount(true);
      }
    };

    checkInitialStatus();
  }, [onInstalled, hasCheckedOnMount]);

  const handleRecheck = async () => {
    setIsChecking(true);
    setInstallMessage('');
    try {
      if (window.electronAPI) {
        const available = await window.electronAPI.checkYtDlp();
        if (available) {
          onInstalled();
        }
      }
    } catch (error) {
      console.error('Error checking yt-dlp:', error);
      setInstallMessage(`Failed to verify yt-dlp installation: ${error.message || 'System error'}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallMessage('Installing yt-dlp... This may take a few minutes.');
    
    // Listen for installation progress
    const handleProgress = (event, data) => {
      if (data.tool === 'yt-dlp') {
        setInstallMessage(data.message);
      }
    };
    
    if (window.electronAPI && window.electronAPI.onInstallationProgress) {
      window.electronAPI.onInstallationProgress(handleProgress);
    }
    
    try {
      if (window.electronAPI) {
        // Use the correct IPC handler name
        const result = await window.electronAPI.invoke('install-ytdlp');
        
        if (result.success) {
          setInstallMessage(`✅ ${result.message || 'yt-dlp installed successfully!'} Please restart the application.`);
          
          // Auto-recheck after successful installation
          setTimeout(async () => {
            await handleRecheck();
          }, 1000);
        } else {
          let errorMessage = `❌ Installation failed: ${result.error || 'Unknown error'}`;
          
          // Add suggestions if available
          if (result.suggestions && result.suggestions.length > 0) {
            errorMessage += '\n\nSuggestions:';
            result.suggestions.forEach((suggestion, index) => {
              errorMessage += `\n${index + 1}. ${suggestion}`;
            });
          } else {
            errorMessage += '\n\nPlease try installing manually using: pip install yt-dlp';
          }
          
          setInstallMessage(errorMessage);
        }
      } else {
        setInstallMessage('❌ Installation failed: Electron API not available.');
      }
    } catch (error) {
      console.error('Error installing yt-dlp:', error);
      setInstallMessage(`❌ Installation failed: ${error.message || 'Network or system error'}.\n\nSuggestions:\n1. Check your internet connection\n2. Try manual installation: pip install yt-dlp\n3. Restart the application and try again`);
    } finally {
      setIsInstalling(false);
      
      // Clean up progress listener
      if (window.electronAPI && window.electronAPI.removeInstallationProgressListener) {
        window.electronAPI.removeInstallationProgressListener(handleProgress);
      }
    }
  };

  const openYtDlpWebsite = () => {
    if (window.electronAPI) {
      // In Electron, we could open external links
      window.open('https://github.com/yt-dlp/yt-dlp#installation', '_blank');
    } else {
      window.open('https://github.com/yt-dlp/yt-dlp#installation', '_blank');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-8 text-center"
      >
        {/* Icon */}
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          yt-dlp Required
        </h2>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
          Puyt requires <strong>yt-dlp</strong> to download videos from various platforms. 
          Please install yt-dlp on your system to continue.
        </p>

        {/* Installation Instructions */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Installation Instructions
          </h3>
          
          <div className="space-y-4">
            {/* Windows */}
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">🪟 Windows:</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Recommended:</span>
                  <div className="bg-gray-900 dark:bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                    winget install yt-dlp
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Using pip:</span>
                  <div className="bg-gray-900 dark:bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                    pip install yt-dlp
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Or download from <a href="https://github.com/yt-dlp/yt-dlp/releases" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">GitHub releases</a>
                </p>
              </div>
            </div>

            {/* macOS */}
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">🍎 macOS:</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Homebrew:</span>
                  <div className="bg-gray-900 dark:bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                    brew install yt-dlp
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Using pip:</span>
                  <div className="bg-gray-900 dark:bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                    pip install yt-dlp
                  </div>
                </div>
              </div>
            </div>

            {/* Linux */}
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">🐧 Linux:</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Ubuntu/Debian:</span>
                  <div className="bg-gray-900 dark:bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                    sudo apt install yt-dlp
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Fedora/RHEL:</span>
                  <div className="bg-gray-900 dark:bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                    sudo dnf install yt-dlp
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Universal (pip):</span>
                  <div className="bg-gray-900 dark:bg-gray-900 rounded-md p-3 font-mono text-sm text-green-400">
                    pip install yt-dlp
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Installation Status Message */}
        {installMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            installMessage.includes('successfully') || installMessage.includes('Restarting') 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : installMessage.includes('failed') || installMessage.includes('Error')
              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
          }`}>
            <div className="flex items-center">
              {isInstalling && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              )}
              <span className="text-sm font-medium">{installMessage}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleInstall}
            disabled={isInstalling || isChecking}
            className="btn-primary flex items-center justify-center min-w-[160px]"
          >
            {isInstalling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Installing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Auto Install yt-dlp
              </>
            )}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openYtDlpWebsite}
            className="btn-secondary flex items-center justify-center"
            disabled={isInstalling}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Manual Install
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRecheck}
            disabled={isChecking || isInstalling}
            className="btn-secondary flex items-center justify-center min-w-[140px]"
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Checking...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Check Again
              </>
            )}
          </motion.button>
        </div>

        {/* Additional Help */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Check the{' '}
            <button 
              onClick={openYtDlpWebsite}
              className="text-brand-600 dark:text-brand-400 hover:underline"
            >
              official installation guide
            </button>
            {' '}for detailed instructions.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default YtDlpChecker;