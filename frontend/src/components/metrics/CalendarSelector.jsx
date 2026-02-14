import { Clock } from 'phosphor-react';
import { useApp } from '../../context/AppContext';

const CalendarSelector = () => {
  const { state, dispatch } = useApp();

  const calendarOptions = [
    {
      value: 'laboral',
      label: 'Horario Laboral',
      description: 'L-V, 8:30-13:30, 15:00-18:00'
    },
    {
      value: '24x7',
      label: '24/7',
      description: 'Continuo las 24 horas'
    },
    {
      value: 'continuo',
      label: 'Extendido',
      description: 'L-V, 8:30-18:00'
    }
  ];

  const handleCalendarChange = (value) => {
    dispatch({ type: 'SET_CALENDAR_TYPE', payload: value });
  };

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      {/* Título */}
      <div className="flex items-center mb-4">
        <Clock className="w-6 h-6 text-primary mr-2" weight="duotone" />
        <h2 className="text-lg font-semibold text-gray-900">Configuración SLA</h2>
      </div>

      {/* Selector de calendario */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 mb-3">Calendario SLA:</p>

        <div className="grid grid-cols-3 gap-3">
          {calendarOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleCalendarChange(option.value)}
              className={`
                relative px-4 py-3 rounded-button text-sm font-medium
                transition-all duration-200 text-left
                ${state.selectedCalendarType === option.value
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <div className="font-semibold">{option.label}</div>
              <div className={`text-xs mt-1 ${state.selectedCalendarType === option.value ? 'text-white opacity-90' : 'text-gray-500'
                }`}>
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarSelector;
