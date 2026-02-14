import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import {
  Ticket,
  CheckCircle,
  XCircle,
  Clock,
  Target
} from 'phosphor-react';

// Components
import CalendarSelector from '../components/metrics/CalendarSelector';
import FilterPanel from '../components/filters/FilterPanel';
import MetricCard from '../components/metrics/MetricCard';
import SLAProgress from '../components/metrics/SLAProgress';
import SLATrendChart from '../components/charts/SLATrendChart';
import TicketDistributionChart from '../components/charts/TicketDistributionChart';
import TicketsTable from '../components/tables/TicketsTable';

const Dashboard = () => {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Cargar proyectos, agentes, tipos
      const [projects, agents, ticketTypes] = await Promise.all([
        apiService.getProjects(),
        apiService.getAgents(),
        apiService.getTicketTypes()
      ]);

      dispatch({ type: 'SET_PROJECTS', payload: projects });
      dispatch({ type: 'SET_AGENTS', payload: agents });
      dispatch({ type: 'SET_TICKET_TYPES', payload: ticketTypes });
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      dispatch({ type: 'SET_ERROR', payload: error });
    }
  };

  const handleLoadMetrics = async () => {
    console.log('🚀 [Dashboard] Iniciando carga de métricas...');
    console.log('🚀 [Dashboard] state.filters:', state.filters);
    console.log('🚀 [Dashboard] state.selectedCalendarType:', state.selectedCalendarType);

    setLoading(true);
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const filters = {
        ...state.filters,
        calendarType: state.selectedCalendarType
      };
      console.log('🚀 [Dashboard] Filtros combinados a enviar:', filters);

      // Si hay búsqueda por número de ticket, informar al usuario
      if (filters.ticketNumber) {
        console.log(`🔍 [Dashboard] Buscando ticket específico: #${filters.ticketNumber}`);
      }

      // Cargar métricas y tickets
      const [metrics, tickets] = await Promise.all([
        apiService.getMetrics(filters),
        apiService.getTickets(filters)
      ]);

      console.log('✅ [Dashboard] Métricas recibidas:', metrics);
      console.log('✅ [Dashboard] Tickets recibidos:', tickets?.length, 'tickets');

      // Feedback específico para búsqueda de ticket
      if (filters.ticketNumber) {
        if (tickets.length === 0) {
          console.warn(`⚠️ [Dashboard] No se encontró el ticket #${filters.ticketNumber}`);
          dispatch({ type: 'SET_ERROR', payload: `No se encontró el ticket #${filters.ticketNumber}` });
        } else {
          console.log(`✅ [Dashboard] Ticket #${filters.ticketNumber} encontrado`);
          // Limpiar error anterior si existía
          dispatch({ type: 'SET_ERROR', payload: null });
        }
      } else {
        // Limpiar error si no hay búsqueda específica
        dispatch({ type: 'SET_ERROR', payload: null });
      }

      dispatch({ type: 'SET_METRICS', payload: metrics });
      dispatch({ type: 'SET_TICKETS', payload: tickets });
    } catch (error) {
      console.error('❌ [Dashboard] Error cargando métricas:', error);
      dispatch({ type: 'SET_ERROR', payload: error.toString() });
    } finally {
      setLoading(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleExportExcel = async () => {
    try {
      const filters = {
        ...state.filters,
        calendarType: state.selectedCalendarType
      };

      // TODO: Capturar gráficas como imágenes
      const charts = {};

      const blob = await apiService.generateReport(filters, charts);
      apiService.downloadBlob(blob, `SLA_Report_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      alert('Error al generar el reporte');
    }
  };

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
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard de SLA
          </h1>
          <p className="text-gray-500 mt-1">
            Sistema de reportes personalizados para Zammad
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Selector de Calendario */}
          <CalendarSelector />

          {/* Panel de Filtros */}
          <FilterPanel
            onLoadMetrics={handleLoadMetrics}
            onExportExcel={handleExportExcel}
          />

          {/* Error Message */}
          {state.error && (
            <div className="bg-danger-light border border-danger text-danger-dark px-4 py-3 rounded-button">
              <strong>Error:</strong> {state.error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Métricas - Solo mostrar si hay datos */}
          {metrics && !loading && (
            <>
              {/* Cards de Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SLATrendChart data={prepareTrendData()} />
                <TicketDistributionChart data={prepareDistributionData()} />
              </div>

              {/* Tabla de Tickets */}
              <TicketsTable tickets={state.tickets} />
            </>
          )}

          {/* Empty State */}
          {!metrics && !loading && (
            <div className="bg-white rounded-card shadow-card p-12 text-center">
              <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay datos para mostrar
              </h3>
              <p className="text-gray-500 mb-6">
                Selecciona los filtros y haz clic en "Cargar Métricas" para ver los reportes
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
