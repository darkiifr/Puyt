import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/DependencyManager.css';

const DependencyManager = () => {
  const [dependencies, setDependencies] = useState({
    ytdlp: { available: false, path: null, source: null },
    ffmpeg: { available: false, path: null, source: null }
  });
  const [installing, setInstalling] = useState({ ytdlp: false, ffmpeg: false });
  const [installProgress, setInstallProgress] = useState('');
  const [instructions, setInstructions] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [customInstallPath, setCustomInstallPath] = useState('');
  const [showPathSelector, setShowPathSelector] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const progressListenerRef = useRef(null);

  // Consolidated initialization function
  const initializeComponent = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      // Load both dependencies and instructions in parallel
      const [deps, inst] = await Promise.all([
        window.electronAPI?.checkDependencies?.() || Promise.resolve({}),
        window.electronAPI?.getInstallationInstructions?.() || Promise.resolve(null)
      ]);
      
      setDependencies(deps);
      setInstructions(inst);
      
      // Setup progress listener only once
      if (window.electronAPI?.onInstallationProgress && !progressListenerRef.current) {
        progressListenerRef.current = (data) => {
          setInstallProgress(data.message);
        };
        window.electronAPI.onInstallationProgress(progressListenerRef.current);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize dependency manager:', error);
    }
  }, [isInitialized]);

  // Single useEffect for initialization
  useEffect(() => {
    initializeComponent();
    
    return () => {
      if (window.electronAPI?.removeAllListeners && progressListenerRef.current) {
        window.electronAPI.removeAllListeners('installation-progress');
        progressListenerRef.current = null;
      }
    };
  }, [initializeComponent]);

  const checkDependencies = useCallback(async () => {
    try {
      const deps = await window.electronAPI?.checkDependencies?.() || {};
      setDependencies(deps);
    } catch (error) {
      console.error('Failed to check dependencies:', error);
    }
  }, []);

  const selectInstallPath = async () => {
    try {
      const path = await window.electronAPI?.selectInstallationDirectory?.() || null;
      if (path) {
        setCustomInstallPath(path);
      }
    } catch (error) {
      console.error('Failed to select installation path:', error);
    }
  };

  const clearCustomPath = () => {
    setCustomInstallPath('');
  };

  const installYtDlp = useCallback(async () => {
    setInstalling(prev => ({ ...prev, ytdlp: true }));
    setInstallProgress('Starting yt-dlp installation...');
    
    try {
      const installOptions = customInstallPath ? { customPath: customInstallPath } : {};
      const result = await window.electronAPI?.installYtDlpNew?.(installOptions) || { success: false, error: 'API not available' };
      
      if (result.success) {
        setInstallProgress('✅ yt-dlp installed successfully!');
        await checkDependencies();
      } else {
        setInstallProgress(`❌ Installation failed: ${result.error}`);
      }
    } catch (error) {
      setInstallProgress(`❌ Installation failed: ${error.message}`);
    } finally {
      setInstalling(prev => ({ ...prev, ytdlp: false }));
      setTimeout(() => setInstallProgress(''), 5000);
    }
  }, [customInstallPath, checkDependencies]);

  const installFfmpeg = useCallback(async () => {
    setInstalling(prev => ({ ...prev, ffmpeg: true }));
    setInstallProgress('Starting FFmpeg installation...');
    
    try {
      const installOptions = customInstallPath ? { customPath: customInstallPath } : {};
      const result = await window.electronAPI?.installFfmpeg?.(installOptions) || { success: false, error: 'API not available' };
      
      if (result.success) {
        setInstallProgress('✅ FFmpeg installed successfully!');
        await checkDependencies();
      } else {
        setInstallProgress(`❌ Installation failed: ${result.error}`);
      }
    } catch (error) {
      setInstallProgress(`❌ Installation failed: ${error.message}`);
    } finally {
      setInstalling(prev => ({ ...prev, ffmpeg: false }));
      setTimeout(() => setInstallProgress(''), 5000);
    }
  }, [customInstallPath, checkDependencies]);

  const getStatusIcon = (available) => {
    return available ? '✅' : '❌';
  };

  const getStatusText = (available) => {
    return available ? 'Installed' : 'Not Found';
  };

  const getSourceText = (source) => {
    switch (source) {
      case 'system': return 'System PATH';
      case 'local': return 'Local Installation';
      default: return 'Unknown';
    }
  };

  return (
    <div className="dependency-manager">
      <div className="dependency-header">
        <div className="header-content">
          <div className="header-icon">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="header-text">
            <h3>Dependency Manager</h3>
            <p>Manage required tools for video downloading</p>
          </div>
        </div>
        <button 
          className="refresh-all-btn"
          onClick={checkDependencies}
          disabled={installing.ytdlp || installing.ffmpeg}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh All
        </button>
      </div>

      {/* Custom Installation Path Selector */}
      <div className="path-selector-section">
        <div className="path-selector-header">
          <h4>Installation Location</h4>
          <button 
            className="toggle-path-btn"
            onClick={() => setShowPathSelector(!showPathSelector)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {showPathSelector ? 'Hide Options' : 'Custom Location'}
          </button>
        </div>
        
        {showPathSelector && (
          <div className="path-selector-content">
            <div className="path-input-group">
              <input
                type="text"
                className="path-input"
                placeholder="Default installation location will be used"
                value={customInstallPath}
                readOnly
              />
              <button className="select-path-btn" onClick={selectInstallPath}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Browse
              </button>
              {customInstallPath && (
                <button className="clear-path-btn" onClick={clearCustomPath}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <p className="path-help-text">
              Choose a custom directory for dependency installation. Leave empty to use the default system location.
            </p>
          </div>
        )}
      </div>

      <div className="dependency-grid">
        {/* yt-dlp Section */}
        <div className="dependency-card">
          <div className="card-header">
            <div className="card-icon ytdlp">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="card-title-section">
              <h4>yt-dlp</h4>
              <div className={`status-indicator ${dependencies.ytdlp.available ? 'available' : 'missing'}`}>
                <div className="status-dot"></div>
                <span className="status-text">{getStatusText(dependencies.ytdlp.available)}</span>
              </div>
            </div>
          </div>
          
          <div className="card-content">
            <p className="dependency-description">
              Essential tool for downloading videos from YouTube and other platforms
            </p>
            
            {dependencies.ytdlp.available && (
              <div className="dependency-details">
                <div className="detail-item">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Source: {getSourceText(dependencies.ytdlp.source)}</span>
                </div>
                <div className="detail-item">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="path-text">{dependencies.ytdlp.path}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="card-actions">
            {!dependencies.ytdlp.available && (
              <button 
                className="install-btn primary"
                onClick={installYtDlp}
                disabled={installing.ytdlp}
              >
                {installing.ytdlp ? (
                  <>
                    <div className="loading-spinner"></div>
                    Installing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Install yt-dlp
                  </>
                )}
              </button>
            )}
            <button 
              className="refresh-btn secondary"
              onClick={checkDependencies}
              disabled={installing.ytdlp || installing.ffmpeg}
              title="Refresh Status"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* FFmpeg Section */}
        <div className="dependency-card">
          <div className="card-header">
            <div className="card-icon ffmpeg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m3 0H4a1 1 0 00-1 1v16a1 1 0 001 1h16a1 1 0 001-1V5a1 1 0 00-1-1zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div className="card-title-section">
              <h4>FFmpeg</h4>
              <div className={`status-indicator ${dependencies.ffmpeg.available ? 'available' : 'missing'}`}>
                <div className="status-dot"></div>
                <span className="status-text">{getStatusText(dependencies.ffmpeg.available)}</span>
              </div>
            </div>
          </div>
          
          <div className="card-content">
            <p className="dependency-description">
              Powerful multimedia framework for video processing and conversion
            </p>
            
            {dependencies.ffmpeg.available && (
              <div className="dependency-details">
                <div className="detail-item">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Source: {getSourceText(dependencies.ffmpeg.source)}</span>
                </div>
                <div className="detail-item">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="path-text">{dependencies.ffmpeg.path}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="card-actions">
            {!dependencies.ffmpeg.available && (
              <button 
                className="install-btn primary"
                onClick={installFfmpeg}
                disabled={installing.ffmpeg}
              >
                {installing.ffmpeg ? (
                  <>
                    <div className="loading-spinner"></div>
                    Installing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Install FFmpeg
                  </>
                )}
              </button>
            )}
            <button 
              className="refresh-btn secondary"
              onClick={checkDependencies}
              disabled={installing.ytdlp || installing.ffmpeg}
              title="Refresh Status"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Installation Progress */}
      {installProgress && (
        <div className="install-progress">
          <div className="progress-content">
            <div className="progress-icon">
              {installProgress.includes('✅') ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : installProgress.includes('❌') ? (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <div className="progress-spinner"></div>
              )}
            </div>
            <span className="progress-text">{installProgress}</span>
          </div>
        </div>
      )}

      {/* Manual Installation Instructions */}
      <div className="manual-install">
        <button 
          className="instructions-toggle"
          onClick={() => setShowInstructions(!showInstructions)}
        >
          <div className="toggle-left">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332-.477-4.5-1.253z" />
            </svg>
            <span>Manual Installation Guide</span>
          </div>
          <svg className={`toggle-arrow w-4 h-4 transition-transform duration-200 ${showInstructions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showInstructions && instructions && (
          <div className="instructions-content">
            <div className="instruction-intro">
              <p className="intro-text">
                If automatic installation fails, you can manually install the required dependencies using the methods below. 
                Both yt-dlp and FFmpeg are essential for video downloading and processing.
              </p>
            </div>

            <div className="instruction-section">
              <div className="section-header">
                <h4>🎬 yt-dlp Installation</h4>
                <p className="section-description">Essential tool for downloading videos from YouTube and other platforms</p>
              </div>
              <div className="platform-instructions">
                <div className="platform">
                  <h5>🪟 Windows</h5>
                  <div className="method">
                    <span className="method-label">Recommended:</span>
                    <code>winget install yt-dlp</code>
                  </div>
                  <div className="method">
                    <span className="method-label">Alternative:</span>
                    <span className="method-text">Download from <a href="https://github.com/yt-dlp/yt-dlp/releases" target="_blank" rel="noopener noreferrer">GitHub releases</a></span>
                  </div>
                </div>
                <div className="platform">
                  <h5>🍎 macOS</h5>
                  <div className="method">
                    <span className="method-label">Homebrew:</span>
                    <code>brew install yt-dlp</code>
                  </div>
                  <div className="method">
                    <span className="method-label">Python pip:</span>
                    <code>pip install yt-dlp</code>
                  </div>
                </div>
                <div className="platform">
                  <h5>🐧 Linux</h5>
                  <div className="method">
                    <span className="method-label">Ubuntu/Debian:</span>
                    <code>sudo apt install yt-dlp</code>
                  </div>
                  <div className="method">
                    <span className="method-label">Fedora:</span>
                    <code>sudo dnf install yt-dlp</code>
                  </div>
                  <div className="method">
                    <span className="method-label">Universal:</span>
                    <code>pip install yt-dlp</code>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="instruction-section">
              <div className="section-header">
                <h4>🎞️ FFmpeg Installation</h4>
                <p className="section-description">Powerful multimedia framework for video processing and conversion</p>
              </div>
              <div className="platform-instructions">
                <div className="platform">
                  <h5>🪟 Windows</h5>
                  <div className="method">
                    <span className="method-label">Recommended:</span>
                    <code>winget install FFmpeg</code>
                  </div>
                  <div className="method">
                    <span className="method-label">Alternative:</span>
                    <span className="method-text">Download from <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer">official website</a></span>
                  </div>
                </div>
                <div className="platform">
                  <h5>🍎 macOS</h5>
                  <div className="method">
                    <span className="method-label">Homebrew:</span>
                    <code>brew install ffmpeg</code>
                  </div>
                </div>
                <div className="platform">
                  <h5>🐧 Linux</h5>
                  <div className="method">
                    <span className="method-label">Ubuntu/Debian:</span>
                    <code>sudo apt install ffmpeg</code>
                  </div>
                  <div className="method">
                    <span className="method-label">Fedora:</span>
                    <code>sudo dnf install ffmpeg</code>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="instruction-footer">
              <div className="refresh-reminder">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <div>
                  <p className="reminder-title">After Installation</p>
                  <p className="reminder-text">Click the refresh button above to detect the newly installed tools and verify they're working correctly.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DependencyManager;