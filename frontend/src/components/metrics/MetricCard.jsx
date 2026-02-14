import Card from '../common/Card';

const MetricCard = ({
  title,
  value,
  icon: Icon,
  iconBgColor = 'bg-primary-light',
  iconColor = 'text-primary',
  subtitle,
  trend
}) => {

  return (
    <Card hoverable className="flex items-center">
      {/* Ícono */}
      <div className={`flex-shrink-0 ${iconBgColor} rounded-full p-3 mr-4`}>
        {Icon && <Icon className={`w-8 h-8 ${iconColor}`} weight="duotone" />}
      </div>

      {/* Contenido */}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={`text-xs mt-1 ${trend.positive ? 'text-success' : 'text-danger'}`}>
            {trend.value}
          </div>
        )}
      </div>
    </Card>
  );
};

export default MetricCard;
