import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import {
  Ticket,
  CheckCircle,
  XCircle,
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

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
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
      setShowVPNModal(false);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      setShowVPNModal(true);
    }
  };

  const handleVPNRetry = async () => {
    setVpnRetrying(true);
    await loadInitialData();
    setVpnRetrying(false);
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
    } catch (error) {
      console.error('❌ [Dashboard] Error cargando métricas:', error);
      dispatch({ type: 'ADD_TOAST', payload: { type: 'error', message: 'Error al cargar métricas' } });
      dispatch({ type: 'SET_ERROR', payload: error.toString() });
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

  // Preparar datos para gráfica de tendencia SLA (últimos 7 días)
  const prepareTrendData = () => {
    if (!state.tickets || state.tickets.length === 0) return null;

    // Agrupar tickets por día
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

    // Tomar los últimos 7 días con datos
    const dates = Object.keys(ticketsByDate).slice(-7);

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

  // Preparar datos para gráfica de distribución
  const prepareDistributionData = () => {
    if (!metrics) return null;

    return {
      labels: ['Abiertos', 'Cerrados'],
      values: [metrics.openTickets || 0, metrics.closedTickets || 0]
    };
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <img src="/logo.png" alt="Blend" className="h-10" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard de SLA
            </h1>
            <p className="text-gray-500 text-sm">
              Sistema de reportes personalizados para Zammad
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
            <span className="px-2 py-1 bg-gray-100 rounded font-mono">Ctrl+Enter</span>
            <span>Cargar</span>
            <span className="px-2 py-1 bg-gray-100 rounded font-mono">Ctrl+E</span>
            <span>Exportar</span>
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
                  icon={XCircle}
                  iconBgColor="bg-danger-light"
                  iconColor="text-danger"
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

              {/* Gráficas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up animation-delay-200">
                <SLATrendChart data={prepareTrendData()} />
                <TicketDistributionChart data={prepareDistributionData()} />
              </div>

              {/* Gráfica de Tickets por Estado */}
              <div className="animate-fade-in-up animation-delay-300">
                <TicketsByStateChart tickets={state.tickets} />
              </div>

              {/* Tabla de Tickets */}
              <div className="animate-fade-in-up animation-delay-400">
                <TicketsTable tickets={state.tickets} />
              </div>
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
