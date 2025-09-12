import React from 'react';
import { motion } from 'framer-motion';

const TermsOfService = ({ onNavigate }) => {
  return (
    <div className="prose prose-gray dark:prose-invert max-w-none">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white m-0">Terms of Service</h1>
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
          Welcome to Puyt. These Terms of Service ("Terms") govern your use of the Puyt application ("Service") operated by us.
        </p>
      </div>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          By accessing and using Puyt, you accept and agree to be bound by the terms and provision of this agreement.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">2. Use License</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          Permission is granted to temporarily download one copy of Puyt for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
          <li>modify or copy the materials</li>
          <li>use the materials for any commercial purpose or for any public display</li>
          <li>attempt to reverse engineer any software contained in Puyt</li>
          <li>remove any copyright or other proprietary notations from the materials</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">3. Content Responsibility</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          You are solely responsible for ensuring that any content you download using Puyt complies with applicable laws and respects intellectual property rights. Puyt is a tool that facilitates downloading; we do not host, store, or distribute any content.
        </p>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            <strong>Important:</strong> Only download content you have the right to download or that is available under appropriate licenses.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">4. Third-Party Dependencies</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          Puyt requires yt-dlp, a third-party tool, to function. We are not responsible for yt-dlp's functionality, availability, or any issues arising from its use.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">5. Disclaimer</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          The materials in Puyt are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">6. Limitations</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          In no event shall Puyt or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use Puyt, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">7. Privacy</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          Your privacy is important to us. Puyt operates locally on your device and does not collect or transmit personal data to external servers. Please refer to our Privacy Policy for more details.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">8. Modifications</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          We may revise these terms of service at any time without notice. By using Puyt, you are agreeing to be bound by the then current version of these terms of service.
        </p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">9. Contact Information</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          If you have any questions about these Terms of Service, please contact us through the application's help section.
        </p>
      </section>
    </div>
  );
};

export default TermsOfService;