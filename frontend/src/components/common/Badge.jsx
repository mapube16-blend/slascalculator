const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {

  // Clases base
  const baseClasses = 'inline-flex items-center font-medium rounded-full';

  // Variantes de color (colores del diseño Figma)
  const variantClasses = {
    success: 'bg-success-light text-success-dark',
    danger: 'bg-danger-light text-danger-dark',
    warning: 'bg-warning-light text-warning-dark',
    info: 'bg-info-light text-info',
    default: 'bg-gray-200 text-gray-700',
    primary: 'bg-primary-light text-primary-dark',
  };

  // Tamaños
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
};

// Componente específico para estados de tickets (del diseño Figma)
export const StatusBadge = ({ status }) => {
  const statusConfig = {
    'Cerrado': { variant: 'success', label: 'Cerrado' },
    'cerrado': { variant: 'success', label: 'Cerrado' },
    'Abierto': { variant: 'info', label: 'Abierto' },
    'abierto': { variant: 'info', label: 'Abierto' },
    'Pendiente': { variant: 'warning', label: 'Pendiente' },
    'pendiente': { variant: 'warning', label: 'Pendiente' },
    'En Espera': { variant: 'warning', label: 'En Espera' },
    'Nuevo': { variant: 'info', label: 'Nuevo' },
    'En Progreso': { variant: 'primary', label: 'En Progreso' },
  };

  const config = statusConfig[status] || { variant: 'default', label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Componente específico para SLA (del diseño Figma)
export const SLABadge = ({ met }) => {
  return (
    <Badge variant={met ? 'success' : 'danger'}>
      {met ? 'SLA Cumplido' : 'Incumplido'}
    </Badge>
  );
};

export default Badge;
