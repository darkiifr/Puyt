import React from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicy = ({ onNavigate }) => {
  return (
    <div className="prose prose-gray dark:prose-invert max-w-none">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white m-0">Privacy Policy</h1>
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
      <div className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          This Privacy Policy describes how Puyt ("we", "our", or "us") handles your information when you use our desktop application.
        </p>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-8">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Privacy-First Design</h4>
            <p className="text-green-700 dark:text-green-300 text-sm">
              Puyt is designed with privacy in mind. The application runs entirely on your local device and does not collect, store, or transmit any personal data to external servers.
            </p>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">1. Information We Don't Collect</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          Puyt does not collect, store, or transmit any of the following:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
          <li>Personal identification information</li>
          <li>URLs you enter or videos you download</li>
          <li>Download history or preferences</li>
          <li>Usage analytics or telemetry data</li>
          <li>Device information or system specifications</li>
          <li>Network activity or browsing behavior</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">2. Local Data Storage</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          Puyt may store the following information locally on your device for functionality purposes:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4 mb-4">
          <li>Application preferences and settings</li>
          <li>Download folder preferences</li>
          <li>Theme and UI customization choices</li>
        </ul>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          This data remains on your device and is never transmitted to external servers.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">3. Third-Party Tools</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          Puyt uses yt-dlp, a third-party command-line tool, to download videos. When you use Puyt:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4 mb-4">
          <li>yt-dlp communicates directly with video platforms</li>
          <li>We do not intercept or monitor this communication</li>
          <li>yt-dlp's privacy practices are governed by its own policies</li>
          <li>No data is sent to Puyt's developers or servers</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">4. Network Connections</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          Puyt itself does not make any network connections. All network activity is performed by:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
          <li>yt-dlp when downloading videos</li>
          <li>Your system when checking for yt-dlp availability</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">5. Data Security</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          Since Puyt operates entirely locally:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
          <li>Your data never leaves your device</li>
          <li>No external servers can access your information</li>
          <li>You maintain complete control over your data</li>
          <li>Standard desktop security practices apply</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">6. Children's Privacy</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          Puyt does not collect any information from anyone, including children under 13. Since the application operates locally, no personal information is transmitted or stored externally.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">7. Changes to Privacy Policy</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          We may update this Privacy Policy from time to time. Any changes will be reflected in the application and will include an updated "Last updated" date.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">8. Contact Us</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          If you have any questions about this Privacy Policy, please contact us through the application's help section.
        </p>
      </section>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Summary</h4>
        <p className="text-blue-700 dark:text-blue-300 text-sm">
          Puyt respects your privacy by design. We don't collect, store, or transmit any personal data. Everything happens locally on your device, giving you complete control over your information.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;