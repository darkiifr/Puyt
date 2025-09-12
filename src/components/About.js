import React from 'react';
import { motion } from 'framer-motion';

const About = () => {
  const features = [
    { icon: '🚀', title: 'Fast Downloads', description: 'Optimized for speed and efficiency' },
    { icon: '🎨', title: 'Modern UI', description: 'Beautiful, intuitive interface' },
    { icon: '🔒', title: 'Privacy First', description: 'No data collection or tracking' },
    { icon: '🌐', title: '1000+ Sites', description: 'Support for major video platforms' },
    { icon: '📱', title: 'Cross Platform', description: 'Works on Windows, macOS, and Linux' },
    { icon: '🎵', title: 'Audio Downloads', description: 'Extract audio from videos' }
  ];

  const technologies = [
    { name: 'Electron', description: 'Cross-platform desktop framework' },
    { name: 'React', description: 'User interface library' },
    { name: 'Tailwind CSS', description: 'Utility-first CSS framework' },
    { name: 'Framer Motion', description: 'Animation library' },
    { name: 'yt-dlp', description: 'Video downloading engine' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
        >
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10l0 6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </motion.div>
        
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
        >
          Puyt
        </motion.h1>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-gray-600 dark:text-gray-300 mb-2"
        >
          Modern Video Downloader
        </motion.p>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 dark:text-gray-400"
        >
          Version 1.0.0
        </motion.p>
      </div>

      {/* Description */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-800"
      >
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">About Puyt</h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          Puyt is a modern, user-friendly video downloader built with privacy and simplicity in mind. 
          It provides an elegant interface for yt-dlp, making video downloading accessible to everyone 
          while maintaining the power and flexibility of command-line tools.
        </p>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Designed for users who value their privacy, Puyt operates entirely locally on your device 
          without collecting any personal data or requiring internet connectivity beyond downloading videos.
        </p>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Technologies */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Built With</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {technologies.map((tech, index) => (
              <motion.div
                key={tech.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
              >
                <div className="w-2 h-2 bg-brand-500 rounded-full mr-3"></div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{tech.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{tech.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Credits */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Credits & Acknowledgments</h2>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">yt-dlp Team</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Special thanks to the yt-dlp developers for creating and maintaining the powerful 
              video downloading engine that powers Puyt.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Open Source Community</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Built with love using amazing open-source technologies. Thanks to all the developers 
              and contributors who make these tools possible.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Legal */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Legal & Responsibility</h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Puyt is a tool designed to help users download videos they have the right to download. 
            Users are solely responsible for ensuring their downloads comply with applicable laws 
            and respect intellectual property rights.
          </p>
          <p>
            Always respect platform terms of service and copyright laws. Only download content 
            you own or have explicit permission to download.
          </p>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="text-center py-8 border-t border-gray-200 dark:border-gray-700"
      >
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Made with ❤️ for the community
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
          © 2025 Puyt. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

export default About;