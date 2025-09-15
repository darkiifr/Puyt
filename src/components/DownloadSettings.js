import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DownloadSettings = ({ downloadPath, onSelectFolder, onOpenFolder }) => {
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [previousPath, setPreviousPath] = useState(downloadPath);

  useEffect(() => {
    // Show notification when download path changes (indicating it was saved)
    // Only show if the path actually changed from a valid previous path
    // and it's not the initial load
    if (downloadPath && downloadPath !== previousPath && previousPath !== '' && previousPath !== null) {
      // Add a small delay to ensure this is a user-initiated change, not a component mount
      const timeoutId = setTimeout(() => {
        setShowSavedNotification(true);
        setTimeout(() => setShowSavedNotification(false), 3000);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    setPreviousPath(downloadPath);
  }, [downloadPath, previousPath]);
  return (
    <div className="relative">
      {/* Saved Notification */}
      <AnimatePresence>
        {showSavedNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute top-0 right-0 z-10 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg mb-2"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">📁 Download path saved!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-600"
      >
      <div className="flex items-center space-x-4 mb-4">
        <div className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-md">
          <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Download Location
            </h3>
            {downloadPath && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {downloadPath ? 'Your preferred download location is saved' : 'Choose where to save your downloads'}
          </p>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <input
          type="text"
          value={downloadPath}
          readOnly
          placeholder="Select your preferred download folder..."
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSelectFolder}
          className="px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Browse</span>
          </div>
        </motion.button>
        {downloadPath && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenFolder}
            className="px-4 py-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-500 hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-500 dark:hover:to-gray-400 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-all duration-200 shadow-sm"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Open</span>
            </div>
          </motion.button>
        )}
      </div>
      </motion.div>
    </div>
  );
};

export default DownloadSettings;