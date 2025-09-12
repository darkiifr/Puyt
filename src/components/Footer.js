import React from 'react';
import { motion } from 'framer-motion';

const Footer = ({ onNavigate }) => {
  return (
    <motion.footer 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 mt-auto"
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* Left side - Copyright */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <span>© 2025 Vins Software</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span>Puyt Video Downloader</span>
          </div>

          {/* Center - Status */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Ready to download
            </span>
          </div>

          {/* Right side - Links */}
          <div className="flex items-center space-x-6 text-sm">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => onNavigate && onNavigate('help')}
              className="text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors duration-200 cursor-pointer"
            >
              Help & Support
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => onNavigate && onNavigate('privacy')}
              className="text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors duration-200 cursor-pointer"
            >
              Privacy Policy
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => onNavigate && onNavigate('terms')}
              className="text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors duration-200 cursor-pointer"
            >
              Terms of Service
            </motion.button>
          </div>
        </div>

        {/* Bottom section - Version info */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Built with Electron, React, and Tailwind CSS
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Version 1.0.0 • Powered by yt-dlp
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;