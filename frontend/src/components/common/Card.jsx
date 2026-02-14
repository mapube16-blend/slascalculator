const Card = ({
  children,
  title,
  subtitle,
  icon: Icon,
  className = '',
  hoverable = false,
  padding = 'normal',
  ...props
}) => {

  // Clases base
  const baseClasses = 'bg-white rounded-card shadow-card transition-shadow duration-200';

  // Hover effect
  const hoverClasses = hoverable ? 'hover:shadow-card-hover cursor-pointer' : '';

  // Padding
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    normal: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {(title || Icon) && (
        <div className="flex items-center mb-4">
          {Icon && (
            <div className="mr-3">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          )}
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
