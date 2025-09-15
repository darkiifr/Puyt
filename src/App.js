import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoDownloader from './components/VideoDownloader';
import BatchDownloader from './components/BatchDownloader';
import Header from './components/Header';
import Footer from './components/Footer';
import YtDlpChecker from './components/YtDlpChecker';
import Help from './components/Help';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import ThemeProvider from './contexts/ThemeContext';

function App() {
  const [ytDlpAvailable, setYtDlpAvailable] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [downloadMode, setDownloadMode] = useState('single'); // 'single' or 'batch'

  useEffect(() => {
    checkYtDlpAvailability();
  }, []);

  const checkYtDlpAvailability = async () => {
    try {
      if (window.electronAPI) {
        const available = await window.electronAPI.checkYtDlp();
        setYtDlpAvailable(available);
      } else {
        // Running in browser (development)
        setYtDlpAvailable(false);
      }
    } catch (error) {
        console.error('Error checking yt-dlp:', error);
        setYtDlpAvailable(false);
        // Show user-friendly error notification
        console.warn(`Failed to verify yt-dlp installation: ${error.message || 'System connectivity issue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleYtDlpInstalled = () => {
    setYtDlpAvailable(true);
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'help':
        return <Help onNavigate={handleNavigate} />;
      case 'privacy':
        return <PrivacyPolicy onNavigate={handleNavigate} />;
      case 'terms':
        return <TermsOfService onNavigate={handleNavigate} />;
      default:
        return !ytDlpAvailable ? (
          <YtDlpChecker onInstalled={handleYtDlpInstalled} />
        ) : (
          <div className="space-y-6">
            {/* Download Mode Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="card-body">
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDownloadMode('single')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      downloadMode === 'single'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Single Video
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDownloadMode('batch')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      downloadMode === 'batch'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Batch / Playlist
                  </motion.button>
                </div>
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {downloadMode === 'single' 
                    ? 'Download individual videos with detailed format selection'
                    : 'Download multiple videos or entire playlists at once'
                  }
                </div>
              </div>
            </motion.div>
            
            {/* Download Component */}
            <AnimatePresence mode="wait">
              <motion.div
                key={downloadMode}
                initial={{ opacity: 0, x: downloadMode === 'single' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: downloadMode === 'single' ? 20 : -20 }}
                transition={{ duration: 0.3 }}
              >
                {downloadMode === 'single' ? <VideoDownloader /> : <BatchDownloader />}
              </motion.div>
            </AnimatePresence>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Puyt...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="flex flex-col min-h-screen">
          <Header onNavigate={handleNavigate} />
          
          <main className="flex-1 container mx-auto px-4 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderCurrentPage()}
              </motion.div>
            </AnimatePresence>
          </main>
          
          <Footer onNavigate={handleNavigate} />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;