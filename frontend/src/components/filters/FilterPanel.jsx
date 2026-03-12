import { useState, useEffect } from 'react';
import { Funnel, DownloadSimple, X } from 'phosphor-react';
import { useApp } from '../../context/AppContext';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import SearchSelect from '../common/SearchSelect';

const FilterPanel = ({ onLoadMetrics, onExportExcel }) => {
  const { state, dispatch } = useApp();

  // Establecer fechas por defecto (últimos 30 días)
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [localFilters, setLocalFilters] = useState({
    ...state.filters,
    startDate: state.filters.startDate || thirtyDaysAgo,
    endDate: state.filters.endDate || today
  });

  // Sincronizar fechas por defecto con el contexto global al montar
  useEffect(() => {
    if (!state.filters.startDate || !state.filters.endDate) {
      dispatch({
        type: 'SET_FILTERS',
        payload: {
          startDate: thirtyDaysAgo,
          endDate: today
        }
      });
    }
  }, []);

  // Opciones para los selects
  const projectOptions = state.projects.map(p => ({
    value: p.id,
    label: p.name
  }));

  const agentOptions = state.agents.map(a => ({
    value: a.id,
    label: a.name
  }));

  const teamOptions = state.teams.map(t => ({
    value: t.id,
    label: t.type === 'gerencia' ? `Gerencia: ${t.name}` : `Área: ${t.name}`
  }));

  const stateOptions = [
    { value: 'Nuevo', label: 'Nuevo' },
    { value: 'Abierto', label: 'Abierto' },
    { value: 'En Progreso', label: 'En Progreso' },
    { value: 'En Espera', label: 'En Espera' },
    { value: 'Resuelto', label: 'Resuelto' },
    { value: 'Cerrado', label: 'Cerrado' },
  ];

  const typeOptions = state.ticketTypes.map(t => ({
    value: t,
    label: t
  }));

  const handleFilterChange = (field, value) => {
    // Convertir strings vacíos a null para que filterNullValues los elimine
    const normalizedValue = value === '' ? null : value;
    setLocalFilters(prev => ({
      ...prev,
      [field]: normalizedValue
    }));
  };

  const handleApplyFilters = () => {
    // Normalizar todos los valores antes de aplicar
    const normalizedFilters = Object.entries(localFilters).reduce((acc, [key, value]) => {
      acc[key] = value === '' ? null : value;
      return acc;
    }, {});

    console.log('📋 [FilterPanel] Aplicando filtros:', normalizedFilters);

    dispatch({ type: 'SET_FILTERS', payload: normalizedFilters });
    if (onLoadMetrics) {
      onLoadMetrics(normalizedFilters);
    }
  };

  // Permitir buscar con Enter en el campo de ticket
  const handleTicketNumberKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleApplyFilters();
    }
  };

  // Presets de fechas rápidas
  const datePresets = [
    {
      label: 'Hoy',
      getRange: () => ({ startDate: today, endDate: today })
    },
    {
      label: 'Última semana',
      getRange: () => ({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: today
      })
    },
    {
      label: 'Últimos 30 días',
      getRange: () => ({ startDate: thirtyDaysAgo, endDate: today })
    },
    {
      label: 'Este mes',
      getRange: () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        return { startDate: firstDay, endDate: today };
      }
    },
    {
      label: 'Mes anterior',
      getRange: () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        return { startDate: firstDay, endDate: lastDay };
      }
    }
  ];

  const [activePreset, setActivePreset] = useState('Últimos 30 días');

  const handlePresetClick = (preset) => {
    const range = preset.getRange();
    setActivePreset(preset.label);
    setLocalFilters(prev => ({ ...prev, ...range }));
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      ticketNumber: null,
      startDate: thirtyDaysAgo,
      endDate: today,
      organizationId: null,
      ownerId: null,
      teamId: null,
      state: null,
      type: null
    };
    setLocalFilters(clearedFilters);
    setActivePreset('Últimos 30 días');
    dispatch({
      type: 'SET_FILTERS',
      payload: {
        startDate: thirtyDaysAgo,
        endDate: today
      }
    });
  };

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      {/* Presets de fechas */}
      <div className="flex flex-wrap gap-2 mb-4">
        {datePresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePresetClick(preset)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-all duration-200 ${
              activePreset === preset.label
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Grid de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Búsqueda por Número de Ticket */}
        <Input
          type="text"
          label="Número de Ticket"
          placeholder="Ej: 12345 (Enter para buscar)"
          value={localFilters.ticketNumber || ''}
          onChange={(e) => handleFilterChange('ticketNumber', e.target.value)}
          onKeyPress={handleTicketNumberKeyPress}
        />

        {/* Fecha Inicio */}
        <Input
          type="date"
          label="Fecha Inicio"
          value={localFilters.startDate || ''}
          onChange={(e) => {
            handleFilterChange('startDate', e.target.value);
            setActivePreset(null);
          }}
        />

        {/* Fecha Fin */}
        <Input
          type="date"
          label="Fecha Fin"
          value={localFilters.endDate || ''}
          onChange={(e) => {
            handleFilterChange('endDate', e.target.value);
            setActivePreset(null);
          }}
        />

        {/* Proyecto */}
        <SearchSelect
          label="Proyecto"
          placeholder="Buscar proyecto..."
          options={projectOptions}
          value={localFilters.organizationId || ''}
          onChange={(val) => handleFilterChange('organizationId', val)}
        />

        {/* Tipo de Solicitud */}
        <SearchSelect
          label="Tipo de Solicitud"
          placeholder="Buscar tipo..."
          options={typeOptions}
          value={localFilters.type || ''}
          onChange={(val) => handleFilterChange('type', val)}
        />

        {/* Equipo */}
        <Select
          label="Equipo"
          placeholder="Todos los Equipos"
          options={teamOptions}
          value={localFilters.teamId || ''}
          onChange={(e) => handleFilterChange('teamId', e.target.value)}
        />

        {/* Agente */}
        <Select
          label="Agente"
          placeholder="Todos los Agentes"
          options={agentOptions}
          value={localFilters.ownerId || ''}
          onChange={(e) => handleFilterChange('ownerId', e.target.value)}
        />

        {/* Estado del Ticket */}
        <Select
          label="Estado del Ticket"
          placeholder="Todos los Estados"
          options={stateOptions}
          value={localFilters.state || ''}
          onChange={(e) => handleFilterChange('state', e.target.value)}
        />
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          icon={Funnel}
          onClick={handleApplyFilters}
          loading={state.loading}
        >
          Cargar Métricas
        </Button>

        <Button
          variant="secondary"
          icon={DownloadSimple}
          onClick={onExportExcel}
          disabled={!state.currentMetrics}
        >
          Exportar Excel
        </Button>

        <Button
          variant="outline"
          icon={X}
          onClick={handleClearFilters}
        >
          Limpiar Filtros
        </Button>
      </div>
    </div>
  );
};

export default FilterPanel;
