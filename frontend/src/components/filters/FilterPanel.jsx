import { useState, useEffect } from 'react';
import { Funnel, DownloadSimple, X } from 'phosphor-react';
import { useApp } from '../../context/AppContext';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

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

  const stateOptions = [
    { value: 'nuevo', label: 'Nuevo' },
    { value: 'abierto', label: 'Abierto' },
    { value: 'en_progreso', label: 'En Progreso' },
    { value: 'en_espera', label: 'En Espera' },
    { value: 'resuelto', label: 'Resuelto' },
    { value: 'cerrado', label: 'Cerrado' },
  ];

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
      onLoadMetrics();
    }
  };

  // Permitir buscar con Enter en el campo de ticket
  const handleTicketNumberKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleApplyFilters();
    }
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      ticketNumber: null,
      startDate: thirtyDaysAgo,
      endDate: today,
      organizationId: null,
      ownerId: null,
      state: null,
      type: null
    };
    setLocalFilters(clearedFilters);
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
      {/* Grid de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
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
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
        />

        {/* Fecha Fin */}
        <Input
          type="date"
          label="Fecha Fin"
          value={localFilters.endDate || ''}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
        />

        {/* Proyecto */}
        <Select
          label="Proyecto"
          placeholder="Todos los Proyectos"
          options={projectOptions}
          value={localFilters.organizationId || ''}
          onChange={(e) => handleFilterChange('organizationId', e.target.value)}
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
