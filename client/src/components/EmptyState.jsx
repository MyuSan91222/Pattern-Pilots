/**
 * Empty State Component - Helpful guidance when no data is available
 * Provides actionable CTAs instead of blank screens
 */
export default function EmptyState({
  icon: Icon,
  title = 'No data yet',
  description = 'Get started by adding some data.',
  actionLabel = 'Get Started',
  onAction = () => {},
  variant = 'default', // 'default', 'error', 'success'
}) {
  const variantStyles = {
    default: {
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent/60',
    },
    error: {
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500/60',
    },
    success: {
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500/60',
    },
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <div className="empty-state">
      {Icon && (
        <div className={`empty-state-icon ${style.iconBg}`}>
          <Icon size={40} className={style.iconColor} />
        </div>
      )}
      <div>
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-description">{description}</p>
      </div>
      {onAction && (
        <div className="empty-state-action">
          <button onClick={onAction} className="btn-primary">
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
