import React from 'react';

// ================================================================
// Spinner Component Types
// ================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white' | 'green' | 'red';
  className?: string;
}

// ================================================================
// Styling Maps
// ================================================================

const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const colorStyles = {
  blue: 'text-blue-600',
  gray: 'text-gray-600',
  white: 'text-white',
  green: 'text-green-600',
  red: 'text-red-600',
};

// ================================================================
// Spinner Component
// ================================================================

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'blue',
  className = '',
}) => {
  const spinnerClasses = [
    'animate-spin',
    sizeStyles[size],
    colorStyles[color],
    className,
  ].join(' ');

  return (
    <svg
      className={spinnerClasses}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading..."
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
  );
};

// ================================================================
// Loading Container Component
// ================================================================

interface LoadingContainerProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingContainer: React.FC<LoadingContainerProps> = ({
  isLoading,
  children,
  loadingText = 'Loading...',
  size = 'md',
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <Spinner size={size} />
        <p className="mt-2 text-sm text-gray-600">{loadingText}</p>
      </div>
    );
  }

  return <>{children}</>;
};

// ================================================================
// Page Loading Component
// ================================================================

export const PageLoading: React.FC<{ message?: string }> = ({
  message = 'Loading page...',
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <Spinner size="xl" />
      <p className="mt-4 text-lg text-gray-600">{message}</p>
    </div>
  </div>
);

// ================================================================
// Overlay Loading Component
// ================================================================

interface OverlayLoadingProps {
  isVisible: boolean;
  message?: string;
}

export const OverlayLoading: React.FC<OverlayLoadingProps> = ({
  isVisible,
  message = 'Processing...',
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 shadow-xl">
        <div className="flex flex-col items-center">
          <Spinner size="lg" />
          <p className="mt-3 text-lg text-gray-700">{message}</p>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// Export
// ================================================================

export default Spinner;