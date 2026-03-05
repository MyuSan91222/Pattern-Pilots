/**
 * Loading Spinner with Accessibility
 * Provides visual feedback with proper ARIA labels
 */
export function Spinner({ size = 'md', ariaLabel = 'Loading' }) {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div
      className={`spinner ${sizeMap[size]}`}
      role="status"
      aria-label={ariaLabel}
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

/**
 * Loading Container with text
 */
export function LoadingContainer({ message = 'Loading...', fullScreen = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${
        fullScreen ? 'fixed inset-0 bg-ink-950/80 z-50' : 'p-12'
      }`}
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" ariaLabel={message} />
      <p className="text-ink-400 text-sm font-medium">{message}</p>
    </div>
  );
}

/**
 * Loading Overlay - for content that's being refreshed
 */
export function LoadingOverlay() {
  return (
    <div
      className="absolute inset-0 bg-ink-950/20 backdrop-blur-sm flex items-center justify-center rounded-lg z-30"
      role="status"
      aria-label="Updating content"
    >
      <Spinner size="md" />
    </div>
  );
}
