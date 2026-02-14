import { Clock, CheckCircle } from 'phosphor-react';
import Card from '../common/Card';

const SLAProgress = ({
  title,
  icon: Icon = Clock,
  percentage,
  met,
  breached
}) => {

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center mb-4">
        <Icon className="w-6 h-6 text-primary mr-2" weight="duotone" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Tasa de Cumplimiento */}
      <div className="mb-4">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-success">{percentage}%</span>
          <span className="ml-2 text-sm text-gray-500">Tasa de Cumplimiento</span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Detalles */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-success mr-2" weight="fill" />
          <div>
            <p className="text-xs text-gray-500">SLA Cumplido</p>
            <p className="text-lg font-semibold text-gray-900">{met || 0}</p>
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-5 h-5 rounded-full bg-danger flex items-center justify-center mr-2">
            <span className="text-white text-xs font-bold">×</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">SLA Incumplido</p>
            <p className="text-lg font-semibold text-gray-900">{breached || 0}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SLAProgress;
