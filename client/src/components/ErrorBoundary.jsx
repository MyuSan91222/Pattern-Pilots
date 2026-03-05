import { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Enhanced Error Boundary with humanized error messages
 * Provides user-friendly error information instead of technical jargon
 */
export default function ErrorBoundary({ children }) {
  const [error, setError] = useState(null);

  const handleError = (err) => {
    console.error('Application Error:', err);
    setError(err.message || 'Something went wrong');
  };

  const getHumanizedError = (errorMessage) => {
    const errorMap = {
      '404': {
        title: 'Not Found',
        message: 'We couldn\'t find what you were looking for. Try going back and checking your search.',
        action: 'Go Back',
      },
      '500': {
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again in a moment.',
        action: 'Retry',
      },
      'Network': {
        title: 'Connection Lost',
        message: 'Check your internet connection and try again.',
        action: 'Retry',
      },
      'default': {
        title: 'Oops! Something went wrong',
        message: 'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.',
        action: 'Refresh',
      },
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (key !== 'default' && errorMessage?.includes(key)) {
        return value;
      }
    }
    return errorMap.default;
  };

  if (error) {
    const { title, message, action } = getHumanizedError(error);

    return (
      <div className="flex-1 overflow-y-auto bg-ink-950 flex items-center justify-center p-6">
        <div className="empty-state">
          <div className="empty-state-icon">
            <AlertTriangle size={40} />
          </div>
          <div>
            <h2 className="empty-state-title">{title}</h2>
            <p className="empty-state-description">{message}</p>
          </div>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw size={14} />
            {action}
          </button>
        </div>
      </div>
    );
  }

  return children;
}
