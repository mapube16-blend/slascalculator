import { useState, useMemo, useCallback, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import Card from '../common/Card';
import { useApp } from '../../context/AppContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const STATE_CONFIG = [
  { name: 'Recepcion',     bg: 'rgba(96, 165, 250, 0.8)',  border: '#60A5FA' },
  { name: 'Clasificacion', bg: 'rgba(139, 92, 246, 0.8)',  border: '#8B5CF6' },
  { name: 'Diagnostico',   bg: 'rgba(249, 115, 22, 0.8)',  border: '#F97316' },
  { name: 'En progreso',   bg: 'rgba(234, 179, 8, 0.8)',   border: '#EAB308' },
  { name: 'En Espera',     bg: 'rgba(156, 163, 175, 0.8)', border: '#9CA3AF' },
  { name: 'Resuelto',      bg: 'rgba(34, 197, 94, 0.8)',   border: '#22C55E' },
  { name: 'Cerrado',       bg: 'rgba(21, 128, 61, 0.8)',   border: '#15803D' },
  { name: 'Cancelado',     bg: 'rgba(239, 68, 68, 0.8)',   border: '#EF4444' },
];

const COLOR_MAP = Object.fromEntries(STATE_CONFIG.map(s => [s.name, s]));
const DEFAULT_COLOR = { bg: 'rgba(107, 114, 128, 0.8)', border: '#6B7280' };

const formatMinutes = (minutes) => {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const truncate = (str, max) => {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
};

const TicketsByStateChart = ({ tickets }) => {
  const { dispatch } = useApp();
  const chartRef = useRef(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeState, setActiveState] = useState(null); // null = todos

  // Conteo por estado
  const stateCounts = useMemo(() => {
    const counts = {};
    if (!tickets) return counts;
    tickets.forEach(t => {
      const s = t.state_name || 'Sin estado';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [tickets]);

  // Selección simple: click = filtrar, click de nuevo = mostrar todos
  const handleStateClick = useCallback((stateName) => {
    setActiveState(prev => prev === stateName ? null : stateName);
    setCurrentPage(1);
  }, []);

  // Tickets filtrados y ordenados
  const filteredTickets = useMemo(() => {
    if (!tickets || tickets.length === 0) return [];

    let filtered = tickets;
    if (activeState) {
      filtered = tickets.filter(t => t.state_name === activeState);
    }

    // Agrupar por estado y ordenar por tiempo desc dentro de cada grupo
    const grouped = {};
    filtered.forEach(t => {
      const s = t.state_name || 'Sin estado';
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(t);
    });

    Object.values(grouped).forEach(g =>
      g.sort((a, b) => (b.hightech_time_minutes || 0) - (a.hightech_time_minutes || 0))
    );

    const stateOrder = STATE_CONFIG.map(s => s.name);
    const sortedKeys = [
      ...stateOrder.filter(s => grouped[s]),
      ...Object.keys(grouped).filter(s => !stateOrder.includes(s))
    ];

    const result = [];
    sortedKeys.forEach(s => grouped[s].forEach(t => result.push(t)));
    return result;
  }, [tickets, activeState]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedTickets = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, safePage, pageSize]);

  // Chart data
  const { chartData, chartHeight } = useMemo(() => {
    if (paginatedTickets.length === 0) return { chartData: null, chartHeight: 300 };

    return {
      chartData: {
        labels: paginatedTickets.map(t => `#${t.ticket_number} - ${truncate(t.title, 25)}`),
        datasets: [{
          data: paginatedTickets.map(t => t.hightech_time_minutes || 0),
          backgroundColor: paginatedTickets.map(t => (COLOR_MAP[t.state_name] || DEFAULT_COLOR).bg),
          borderColor: paginatedTickets.map(t => (COLOR_MAP[t.state_name] || DEFAULT_COLOR).border),
          borderWidth: 1,
          borderRadius: 3,
          barThickness: 18,
        }]
      },
      chartHeight: Math.max(250, paginatedTickets.length * 28)
    };
  }, [paginatedTickets]);

  // Chart options
  const options = useMemo(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        padding: 12,
        titleFont: { size: 13, family: 'Inter, sans-serif', weight: 'bold' },
        bodyFont: { size: 12, family: 'Inter, sans-serif' },
        bodySpacing: 5,
        callbacks: {
          title: (items) => {
            const t = paginatedTickets[items[0]?.dataIndex];
            return t ? `Ticket #${t.ticket_number}` : '';
          },
          label: () => null,
          afterBody: (items) => {
            const t = paginatedTickets[items[0]?.dataIndex];
            if (!t) return [];
            return [
              `Título: ${t.title || 'Sin título'}`,
              `Estado: ${t.state_name || 'N/A'}`,
              `Agente: ${t.owner_name || 'Sin asignar'}`,
              `Tiempo en estado: ${t.hightech_time_formatted || '0 minutos'}`,
              `Proyecto: ${t.organization_name || 'N/A'}`,
            ];
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'Tiempo', font: { size: 12, family: 'Inter, sans-serif' } },
        ticks: {
          font: { size: 11, family: 'Inter, sans-serif' },
          callback: (v) => v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      y: {
        ticks: { font: { size: 11, family: 'Inter, sans-serif' }, autoSkip: false },
        grid: { display: false }
      }
    },
    onClick: (_e, elements) => {
      if (elements.length > 0) {
        const t = paginatedTickets[elements[0].index];
        if (t) dispatch({ type: 'OPEN_MODAL', payload: { ticketNumber: t.ticket_number } });
      }
    },
    onHover: (event, elements) => {
      const c = event.native?.target;
      if (c) c.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    }
  }), [paginatedTickets, dispatch]);

  if (!tickets || tickets.length === 0) return null;

  return (
    <Card padding="none">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Tickets por Estado - Tiempo Empresa ({filteredTickets.length})
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Selecciona un estado para filtrar. Clic en una barra para ver detalle.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Mostrar:</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="select text-sm py-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* State filter buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Botón "Todos" */}
          <button
            type="button"
            onClick={() => { setActiveState(null); setCurrentPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              border cursor-pointer transition-all duration-150
              ${!activeState
                ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
              }`}
          >
            Todos ({tickets.length})
          </button>

          {STATE_CONFIG.map(({ name, border }) => {
            const count = stateCounts[name] || 0;
            const isActive = activeState === name;

            return (
              <button
                type="button"
                key={name}
                onClick={() => count > 0 ? handleStateClick(name) : null}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  border transition-all duration-150
                  ${count === 0
                    ? 'opacity-40 cursor-default bg-gray-50 border-gray-200 text-gray-400'
                    : isActive
                      ? 'text-white shadow-sm cursor-pointer'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 cursor-pointer'
                  }`}
                style={isActive && count > 0 ? { backgroundColor: border, borderColor: border } : undefined}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: border }}
                />
                {name}
                <span className={`ml-0.5 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        {chartData ? (
          <div style={{ height: `${chartHeight}px` }}>
            <Bar ref={chartRef} data={chartData} options={options} />
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No hay tickets para los estados seleccionados
          </p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {((safePage - 1) * pageSize) + 1} - {Math.min(safePage * pageSize, filteredTickets.length)} de {filteredTickets.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pn;
                if (totalPages <= 5) pn = i + 1;
                else if (safePage <= 3) pn = i + 1;
                else if (safePage >= totalPages - 2) pn = totalPages - 4 + i;
                else pn = safePage - 2 + i;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pn)}
                    className={`px-3 py-1 rounded text-sm ${
                      safePage === pn ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {pn}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TicketsByStateChart;
