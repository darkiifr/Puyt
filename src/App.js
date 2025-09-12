import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoDownloader from './components/VideoDownloader';
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
          <VideoDownloader />
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