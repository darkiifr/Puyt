import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MiniConsole = ({ isVisible, onToggle, downloadProgress }) => {
  const [logs, setLogs] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const logsEndRef = useRef(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    if (downloadProgress) {
      const timestamp = new Date().toLocaleTimeString();
      const message = downloadProgress.message || downloadProgress;
      const type = downloadProgress.type || 'info';
      const progress = downloadProgress.progress;
      
      setLogs(prev => {
        // Check if this is a progress update that should replace the last log
        if (type === 'progress' && prev.length > 0) {
          const lastLog = prev[prev.length - 1];
          // If the last log was also a progress update, replace it
          if (lastLog.type === 'progress') {
            const updated = [...prev.slice(0, -1), {
              id: lastLog.id, // Keep same ID to maintain consistency
              timestamp,
              message,
              type,
              progress
            }];
            return updated.slice(-100);
          }
        }
        
        // For non-progress logs or when there's no previous progress log, add new log
        const newLog = {
          id: Date.now(),
          timestamp,
          message,
          type,
          progress
        };
        
        const updated = [...prev, newLog];
        // Keep only last 100 logs to prevent memory issues
        return updated.slice(-100);
      });
    }
  }, [downloadProgress]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'progress':
        return '⏳';
      default:
        return 'ℹ️';
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      case 'progress':
        return 'text-blue-400';
      default:
        return 'text-gray-300';
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 right-4 z-40 w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-white">Download Console</span>
            <span className="text-xs text-gray-400">({logs.length} logs)</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isExpanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                )}
              </svg>
            </button>
            
            <button
              onClick={clearLogs}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              title="Clear logs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            
            <button
              onClick={onToggle}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              title="Close console"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Console Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="h-64 overflow-y-auto bg-gray-900 p-3 font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    <div className="text-2xl mb-2">📝</div>
                    <p>No logs yet...</p>
                    <p className="text-xs mt-1">Download progress will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start space-x-2 py-1"
                      >
                        <span className="text-gray-500 text-xs mt-0.5 flex-shrink-0">
                          {log.timestamp}
                        </span>
                        <span className="flex-shrink-0 mt-0.5">
                          {getLogIcon(log.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={`${getLogColor(log.type)} break-words`}>
                            {log.message}
                          </span>
                          {log.progress && (
                            <div className="mt-1">
                              <div className="w-full bg-gray-700 rounded-full h-1.5">
                                <div 
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${log.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-400">{log.progress}%</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimized View */}
        {!isExpanded && logs.length > 0 && (
          <div className="p-3 bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="flex-shrink-0">
                  {getLogIcon(logs[logs.length - 1]?.type)}
                </span>
                <span className={`text-xs ${getLogColor(logs[logs.length - 1]?.type)} truncate`}>
                  {logs[logs.length - 1]?.message}
                </span>
              </div>
              {logs[logs.length - 1]?.progress && (
                <div className="ml-2 flex items-center space-x-2">
                  <div className="w-16 bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${logs[logs.length - 1].progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {logs[logs.length - 1].progress}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default MiniConsole;