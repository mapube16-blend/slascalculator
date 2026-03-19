import { useEffect, useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiService, VPNError } from '../services/api';
import {
  Ticket,
  CheckCircle,
  Gear,
  Clock,
  Target,
  Funnel,
  ArrowClockwise
} from 'phosphor-react';

// Components
import FilterPanel from '../components/filters/FilterPanel';
import MetricCard from '../components/metrics/MetricCard';
import SLAProgress from '../components/metrics/SLAProgress';
import SLATrendChart from '../components/charts/SLATrendChart';
import TicketDistributionChart from '../components/charts/TicketDistributionChart';
import TicketsByStateChart from '../components/charts/TicketsByStateChart';
import TicketsTable from '../components/tables/TicketsTable';
import VPNConnectionModal from '../components/modals/VPNConnectionModal';
import ToastContainer from '../components/common/Toast';
import DashboardSkeleton from '../components/common/SkeletonLoader';

const Dashboard = () => {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [showVPNModal, setShowVPNModal] = useState(false);
  const [vpnRetrying, setVpnRetrying] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [ticketStateFilter, setTicketStateFilter] = useState(null);
  const drilldownRef = useRef(null);
  const [ticketHistory, setTicketHistory] = useState(null);

  useEffect(() => {
    if (ticketStateFilter && drilldownRef.current) {
      const top = drilldownRef.current.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [ticketStateFilter]);
  const autoLoadDoneRef = useRef(false);

  // Mostrar modal invitando a conectar VPN apenas se carga la app
  useEffect(() => {
    setShowVPNModal(true);
  }, []);

  const loadInitialData = async () => {
    try {
      // Cargar proyectos, agentes, tipos, estados y equipos
      const [projects, agents, ticketTypes, ticketStates, teams] = await Promise.all([
        apiService.getProjects(),
        apiService.getAgents(),
        apiService.getTicketTypes(),
        apiService.getTicketStates(),
        apiService.getTeams().catch(() => [])
      ]);

      dispatch({ type: 'SET_PROJECTS', payload: projects });
      dispatch({ type: 'SET_AGENTS', payload: agents });
      dispatch({ type: 'SET_TICKET_TYPES', payload: ticketTypes });
      dispatch({ type: 'SET_TICKET_STATES', payload: ticketStates });
      dispatch({ type: 'SET_TEAMS', payload: teams });
      setShowVPNModal(false); // Cerrar modal si la conexión se recupera
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      // Detectar si es error de VPN
      if (error instanceof VPNError || error?.isVPNError) {
        setShowVPNModal(true);
      }
    }
  };

  const handleVPNRetry = async () => {
    setVpnRetrying(true);
    setShowVPNModal(false);
    try {
      // 1. Cargar datos iniciales (proyectos, agentes, etc)
      await loadInitialData();
      
      // 2. Auto-cargar últimos 30 días
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const filters = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
      
      await handleLoadMetrics(filters);
    } catch (error) {
      console.error('Error en reintento VPN:', error);
      setShowVPNModal(true);
    } finally {
      setVpnRetrying(false);
    }
  };

  const handleLoadMetrics = useCallback(async (filtersOverride) => {
    setLoading(true);
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const filters = {
        ...(filtersOverride || state.filters)
      };

      // Cargar métricas y tickets
      const [metrics, tickets] = await Promise.all([
        apiService.getMetrics(filters),
        apiService.getTickets(filters)
      ]);

      // Feedback específico para búsqueda de ticket
      if (filters.ticketNumber) {
        if (tickets.length === 0) {
          dispatch({ type: 'ADD_TOAST', payload: { type: 'warning', message: `No se encontró el ticket #${filters.ticketNumber}` } });
        } else {
          dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: `Ticket #${filters.ticketNumber} encontrado` } });
        }
      } else {
        dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: `${tickets?.length || 0} tickets cargados` } });
      }

      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_METRICS', payload: metrics });
      dispatch({ type: 'SET_TICKETS', payload: tickets });
      setShowVPNModal(false); // Cerrar modal si la conexión se recupera
    } catch (error) {
      console.error('❌ [Dashboard] Error cargando métricas:', error);
      
      // Detectar si es error de VPN
      if (error instanceof VPNError || error?.isVPNError) {
        setShowVPNModal(true);
        dispatch({ type: 'ADD_TOAST', payload: { type: 'error', message: 'No se pudo conectar. Por favor verifica tu conexión VPN.' } });
      } else {
        dispatch({ type: 'ADD_TOAST', payload: { type: 'error', message: 'Error al cargar métricas' } });
        dispatch({ type: 'SET_ERROR', payload: error.toString() });
      }
    } finally {
      setLoading(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.filters, dispatch]);

  const handleExportExcel = useCallback(async () => {
    try {
      dispatch({ type: 'ADD_TOAST', payload: { type: 'info', message: 'Generando reporte Excel...' } });

      const filters = {
        ...state.filters
      };

      // TODO: Capturar gráficas como imágenes
      const charts = {};

      const blob = await apiService.generateReport(filters, charts);
      apiService.downloadBlob(blob, `SLA_Report_${Date.now()}.xlsx`);

      dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: 'Reporte Excel descargado' } });
    } catch (error) {
      console.error('Error exportando Excel:', error);
      dispatch({ type: 'ADD_TOAST', payload: { type: 'error', message: 'Error al generar el reporte' } });
    }
  }, [state.filters, dispatch]);

  // Auto-cargar últimos 30 días una sola vez cuando se monta (SIN dependencias problemáticas)
  useEffect(() => {
    // NO hacer nada aquí. El usuario debe presionar "Reintentar" en el modal primero
    // para intentar la conexión
  }, []); // Array vacío = ejecuta 1 sola vez

  // Cargar historial cuando se busca un ticket individual
  useEffect(() => {
    if (state.filters?.ticketNumber) {
      const loadTicketHistory = async () => {
        try {
          const history = await apiService.getTicketHistory(state.filters.ticketNumber);
          setTicketHistory(history);
        } catch (error) {
          console.error('Error cargando historial del ticket:', error);
          setTicketHistory(null);
        }
      };
      loadTicketHistory();
    } else {
      setTicketHistory(null);
    }
  }, [state.filters?.ticketNumber]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Enter → Cargar métricas
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleLoadMetrics();
      }
      // Ctrl+E → Exportar Excel
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        if (state.currentMetrics) {
          handleExportExcel();
        }
      }
      // Escape → cerrado de modales se maneja en cada modal
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLoadMetrics, handleExportExcel, state.currentMetrics]);

  const metrics = state.currentMetrics;

  const normalizeStr = (v) => (v || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  const drilldownTickets = ticketStateFilter
    ? (state.tickets || []).filter(t => normalizeStr(t.state_name) === normalizeStr(ticketStateFilter))
    : [];

  // Preparar datos para gráfica de tendencia SLA (todos los días del rango o ticket individual)
  const prepareTrendData = () => {
    if (!state.tickets || state.tickets.length === 0) return null;

    // Si hay un ticket filtrado, mostrar tendencia de ese ticket
    if (state.filters?.ticketNumber) {
      const ticket = state.tickets.find(t => String(t.ticket_number) === String(state.filters.ticketNumber));
      if (ticket) {
        const date = new Date(ticket.created_at).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short'
        });
        return {
          labels: [date],
          firstResponse: [ticket.first_response_sla_met ? 100 : 0],
          resolution: [ticket.resolution_sla_met ? 100 : 0]
        };
      }
    }

    // Si no, agrupar por día (todos los tickets)
    const ticketsByDate = state.tickets.reduce((acc, ticket) => {
      const date = new Date(ticket.created_at).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short'
      });
      if (!acc[date]) {
        acc[date] = { total: 0, firstResponseMet: 0, resolutionMet: 0 };
      }
      acc[date].total++;
      if (ticket.first_response_sla_met) acc[date].firstResponseMet++;
      if (ticket.resolution_sla_met) acc[date].resolutionMet++;
      return acc;
    }, {});

    // Tomar todos los días con datos (para el slider)
    const dates = Object.keys(ticketsByDate).sort();

    return {
      labels: dates,
      firstResponse: dates.map(date => {
        const day = ticketsByDate[date];
        return day.total > 0 ? (day.firstResponseMet / day.total * 100) : 0;
      }),
      resolution: dates.map(date => {
        const day = ticketsByDate[date];
        return day.total > 0 ? (day.resolutionMet / day.total * 100) : 0;
      })
    };
  };

  // Preparar datos para gráfica de distribución (todos los tickets o ticket individual)
  const prepareDistributionData = () => {
    if (!state.tickets || state.tickets.length === 0) return null;

    const stateConfig = [
      { key: 'en espera', label: 'En Espera', color: '#E69F00' },
      { key: 'diagnostico', label: 'Diagnostico', color: '#009E73' },
      { key: 'clasificacion', label: 'Clasificacion', color: '#56B4E9' },
      { key: 'recepcion', label: 'Recepcion', color: '#F0E442' },
      { key: 'en progreso', label: 'En progreso', color: '#D55E00' }
    ];

    const normalize = (value) =>
      (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    // Si hay un ticket filtrado Y tenemos su historial, mostrar tiempo por estado
    if (state.filters?.ticketNumber && ticketHistory?.history) {
      const stateTimings = {};

      // Sumar duración por estado
      ticketHistory.history.forEach(entry => {
        const normalized = normalize(entry.to || '');
        const stateLabel = stateConfig.find(s => normalize(s.label) === normalized)?.label || entry.to;
        const durationMinutes = entry.durationMinutes || 0;
        
        if (!stateTimings[stateLabel]) {
          stateTimings[stateLabel] = 0;
        }
        stateTimings[stateLabel] += durationMinutes;
      });

      // Filtrar solo estados que tenemos en config
      const filledStates = stateConfig
        .filter(s => stateTimings[s.label] !== undefined)
        .map(s => ({
          label: s.label,
          minutes: stateTimings[s.label],
          color: s.color
        }));

      if (filledStates.length > 0) {
        return {
          labels: filledStates.map(s => s.label),
          values: filledStates.map(s => Math.round(s.minutes / 60)), // Convertir a horas
          colors: filledStates.map(s => s.color),
          isTicketView: true,
          ticketNumber: state.filters.ticketNumber
        };
      }
    }

    // Si no, mostrar distribución de estados de todos los tickets
    const counts = stateConfig.reduce((acc, s) => {
      acc[s.key] = 0;
      return acc;
    }, {});

    state.tickets.forEach(ticket => {
      const normalized = normalize(ticket.state_name);
      const match = stateConfig.find(s => s.key === normalized);
      if (match) counts[match.key] += 1;
    });

    return {
      labels: stateConfig.map(s => s.label),
      values: stateConfig.map(s => counts[s.key] || 0),
      colors: stateConfig.map(s => s.color),
      isTicketView: false
    };
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center justify-center">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Blend" className="h-24" />
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">Service Support</span>
              <span className="text-sm text-gray-400 tracking-widest uppercase">Dashboard de SLA</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Panel de Filtros */}
          <FilterPanel
            onLoadMetrics={handleLoadMetrics}
            onExportExcel={handleExportExcel}
          />

          {/* Loading State - Skeleton */}
          {loading && <DashboardSkeleton />}

          {/* Métricas - Solo mostrar si hay datos */}
          {metrics && !loading && (
            <>
              {/* Tab Navigation */}
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => { setActiveTab('overview'); setTicketStateFilter(null); }}
                  className={`px-4 py-3 font-medium transition-colors ${
                    activeTab === 'overview'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`px-4 py-3 font-medium transition-colors ${
                    activeTab === 'analysis'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Análisis
                </button>
                <button
                  onClick={() => { setActiveTab('tickets'); setTicketStateFilter(null); }}
                  className={`px-4 py-3 font-medium transition-colors ${
                    activeTab === 'tickets'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Tickets
                </button>
              </div>

              {/* Tab: Overview */}
              {activeTab === 'overview' && (
                <>
                  {/* Cards de Métricas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                    <MetricCard
                      title="Total de Tickets"
                      value={metrics.totalTickets || 0}
                      icon={Ticket}
                      iconBgColor="bg-info-light"
                      iconColor="text-info"
                    />
                    <MetricCard
                      title="Tickets Cerrados"
                      value={metrics.closedTickets || 0}
                      icon={CheckCircle}
                      iconBgColor="bg-success-light"
                      iconColor="text-success"
                    />
                    <MetricCard
                      title="Tickets Abiertos"
                      value={metrics.openTickets || 0}
                      icon={Gear}
                      iconBgColor="bg-yellow-100"
                      iconColor="text-yellow-500"
                    />
                  </div>

                  {/* Barras de Progreso SLA */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up animation-delay-100">
                    <SLAProgress
                      title="Tiempo de Primera Respuesta"
                      icon={Clock}
                      percentage={metrics.firstResponseRate || 0}
                      met={metrics.firstResponseMet || 0}
                      breached={metrics.firstResponseBreached || 0}
                    />
                    <SLAProgress
                      title="Tiempo de Resolución"
                      icon={Target}
                      percentage={metrics.resolutionRate || 0}
                      met={metrics.resolutionMet || 0}
                      breached={metrics.resolutionBreached || 0}
                    />
                  </div>
                </>
              )}

              {/* Tab: Análisis */}
              {activeTab === 'analysis' && (
                <>
                  {/* Gráficas Tendencia + Estado */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
                    <SLATrendChart data={prepareTrendData()} />
                    <TicketDistributionChart
                      data={prepareDistributionData()}
                      onStateClick={(stateName) => {
                        setTicketStateFilter(prev => prev === stateName ? null : stateName);
                      }}
                    />
                  </div>

                  {/* Tabla drill-down al hacer clic en la dona */}
                  {ticketStateFilter && (
                    <div ref={drilldownRef} className="animate-fade-in-up">
                      <div className="flex items-center gap-2 mb-2 px-1 text-sm text-gray-600">
                        <span>Mostrando tickets en estado: <strong>{ticketStateFilter}</strong> ({drilldownTickets.length})</span>
                        <button onClick={() => setTicketStateFilter(null)} className="ml-2 text-gray-400 hover:text-gray-700 font-bold">✕ Limpiar</button>
                      </div>
                      <TicketsTable tickets={drilldownTickets} />
                    </div>
                  )}
                </>
              )}

              {/* Tab: Tickets */}
              {activeTab === 'tickets' && (
                <>
                  {/* Gráfica de Tickets por Estado */}
                  <div className="animate-fade-in-up">
                    <TicketsByStateChart tickets={state.tickets} />
                  </div>

                  {/* Tabla de Tickets */}
                  <div className="animate-fade-in-up">
                    <TicketsTable tickets={state.tickets} filterState={ticketStateFilter} onClearFilter={() => setTicketStateFilter(null)} />
                  </div>
                </>
              )}
            </>
          )}

          {/* Empty State */}
          {!metrics && !loading && (
            <div className="bg-white rounded-card shadow-card p-12 text-center animate-fade-in-up">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Ticket className="w-10 h-10 text-gray-400" weight="duotone" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay datos para mostrar
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Configura los filtros de fecha, proyecto o agente y carga las métricas para visualizar los reportes de SLA.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handleLoadMetrics()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-button font-medium hover:bg-primary-dark transition-all duration-200"
                >
                  <Funnel className="w-5 h-5" />
                  Cargar Métricas
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Atajo: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">Ctrl+Enter</span> para cargar
              </p>
            </div>
          )}
        </div>
      </main>

      {/* VPN Modal */}
      {showVPNModal && (
        <VPNConnectionModal onRetry={handleVPNRetry} retrying={vpnRetrying} />
      )}
    </div>
  );
};

export default Dashboard;
