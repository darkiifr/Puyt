import React from 'react';
import { motion } from 'framer-motion';

const Toggle = ({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const sizes = {
    sm: {
      switch: 'h-5 w-9',
      thumb: 'h-4 w-4',
      translate: 'translate-x-4'
    },
    md: {
      switch: 'h-6 w-11',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5'
    },
    lg: {
      switch: 'h-7 w-12',
      thumb: 'h-6 w-6',
      translate: 'translate-x-5'
    }
  };
  
  const sizeConfig = sizes[size];
  
  const switchClasses = `relative inline-flex ${sizeConfig.switch} flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
    checked
      ? 'bg-brand-600'
      : 'bg-gray-200 dark:bg-gray-700'
  } ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  }`;
  
  const thumbClasses = `pointer-events-none inline-block ${sizeConfig.thumb} transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
    checked ? sizeConfig.translate : 'translate-x-0'
  }`;
  
  return (
    <div className={`flex items-start ${className}`}>
      <motion.button
        type="button"
        className={switchClasses}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange && onChange(!checked)}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        {...props}
      >
        <span className="sr-only">{label}</span>
        <motion.span
          className={thumbClasses}
          layout
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30
          }}
        />
      </motion.button>
      {(label || description) && (
        <div className="ml-3 flex-1">
          {label && (
            <label className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                   onClick={() => !disabled && onChange && onChange(!checked)}>
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Toggle;