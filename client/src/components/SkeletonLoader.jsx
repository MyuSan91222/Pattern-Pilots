/**
 * Skeleton Loader - Mirrors the layout structure during loading
 * Provides perceived performance improvement vs static spinners
 */
export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-4">
      <div className="skeleton-loader h-6 w-32 rounded" />
      <div className="space-y-3">
        <div className="skeleton-loader h-4 w-full rounded" />
        <div className="skeleton-loader h-4 w-5/6 rounded" />
        <div className="skeleton-loader h-4 w-4/6 rounded" />
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-ink-800/30 rounded-lg">
          <div className="skeleton-loader h-8 w-8 rounded" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-loader h-4 w-32 rounded" />
            <div className="skeleton-loader h-3 w-24 rounded" />
          </div>
          <div className="skeleton-loader h-8 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, width = 'w-full' }) {
  return (
    <div className="space-y-3">
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className={`skeleton-loader h-4 ${width} rounded ${i === lines - 1 ? 'w-4/6' : ''}`}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar() {
  return <div className="skeleton-loader h-10 w-10 rounded-full" />;
}

export function SkeletonButton() {
  return <div className="skeleton-loader h-10 w-32 rounded-lg" />;
}
