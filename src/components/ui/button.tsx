import React, { forwardRef } from 'react';
import type { ButtonVariant, ButtonSize } from '@/types';

// ================================================================
// Button Component Types
// ================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

// ================================================================
// Styling Maps
// ================================================================

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:from-purple-800 active:to-purple-900 text-white border-transparent focus:ring-purple-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transform hover:-translate-y-0.5 transition-all',
  secondary: 'bg-gray-800/50 hover:bg-gray-700/50 active:bg-gray-600/50 text-gray-100 border-gray-700 focus:ring-gray-500 backdrop-blur-sm',
  danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white border-transparent focus:ring-red-500 shadow-lg shadow-red-500/25',
  ghost: 'bg-transparent hover:bg-purple-500/10 active:bg-purple-500/20 text-gray-300 hover:text-purple-300 border-purple-500/20 hover:border-purple-500/40 focus:ring-purple-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

// ================================================================
// Button Component
// ================================================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const buttonClasses = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className,
    ].join(' ');

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={buttonClasses}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ================================================================
// Export
// ================================================================

export default Button;