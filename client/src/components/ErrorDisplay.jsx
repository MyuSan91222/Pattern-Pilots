import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Error Display Component - Humanized error messages instead of technical jargon
 * Provides actionable guidance for users
 */
export default function ErrorDisplay({
  error,
  errorCode = null,
  onRetry = () => {},
  onHome = () => {},
  showRetry = true,
  showHome = true,
}) {
  const getHumanizedMessage = (err, code) => {
    // Check for specific error codes
    if (code === 404 || err?.includes('404')) {
      return {
        title: '🔍 Not Found',
        message: 'We couldn\'t find what you were looking for. It might have been deleted or the link might be incorrect.',
        icon: '🔍',
      };
    }

    if (code === 500 || err?.includes('500')) {
      return {
        title: '⚠️ Server Error',
        message: 'Something went wrong on our end. Please try again in a moment or contact support if the problem persists.',
        icon: '⚠️',
      };
    }

    if (code === 403 || err?.includes('403') || err?.includes('Unauthorized')) {
      return {
        title: '🔐 Access Denied',
        message: 'You don\'t have permission to access this resource. Please check your credentials and try again.',
        icon: '🔐',
      };
    }

    if (err?.includes('Network') || err?.includes('network')) {
      return {
        title: '📡 Connection Lost',
        message: 'Check your internet connection and try again. We\'ll automatically reconnect when you\'re back online.',
        icon: '📡',
      };
    }

    if (err?.includes('timeout')) {
      return {
        title: '⏱️ Request Timed Out',
        message: 'The request took too long. Please try again or check your connection.',
        icon: '⏱️',
      };
    }

    // Default message
    return {
      title: '😕 Oops! Something went wrong',
      message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      icon: '😕',
    };
  };

  const { title, message } = getHumanizedMessage(error, errorCode);

  return (
    <div className="error-container">
      <div className="flex gap-4">
        <AlertTriangle className="text-danger flex-shrink-0 mt-1" size={20} />
        <div className="flex-1">
          <h3 className="error-title">{title}</h3>
          <p className="error-message">{message}</p>
          <div className="error-action">
            {showRetry && (
              <button onClick={onRetry} className="btn-primary flex items-center gap-2 text-sm">
                <RefreshCw size={14} />
                Try Again
              </button>
            )}
            {showHome && (
              <button onClick={onHome} className="btn-ghost flex items-center gap-2 text-sm">
                <Home size={14} />
                Go Home
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
