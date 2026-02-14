import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, CaretDown } from 'phosphor-react';
import Card from '../common/Card';
import TicketDetailModal from '../modals/TicketDetailModal';

const TicketsTable = ({ tickets = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Ordenamiento
  const sortedTickets = useMemo(() => {
    if (!tickets.length) return [];

    return [...tickets].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Manejar valores null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Comparación numérica o de fecha
      if (sortField === 'created_at' || sortField === 'updated_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [tickets, sortField, sortDirection]);

  // Paginación
  const totalPages = Math.ceil(sortedTickets.length / pageSize);
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTickets.slice(start, start + pageSize);
  }, [sortedTickets, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <CaretDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 text-primary" weight="bold" />
      : <ArrowDown className="w-4 h-4 text-primary" weight="bold" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSLABadge = (slaMet) => {
    if (slaMet === null || slaMet === undefined) {
      return <span className="badge bg-gray-200 text-gray-600">N/A</span>;
    }
    return slaMet
      ? <span className="badge badge-success">Cumplido</span>
      : <span className="badge badge-danger">Incumplido</span>;
  };

  if (!tickets.length) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Datos Detallados de Tickets
        </h3>
        <p className="text-gray-500 text-center py-8">
          No hay tickets para mostrar
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Modal de Detalle */}
      {selectedTicket && (
        <TicketDetailModal
          ticketNumber={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      <Card padding="none">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Datos Detallados de Tickets ({tickets.length})
          </h3>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Mostrar:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="select text-sm py-1"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('ticket_number')}
              >
                <div className="flex items-center gap-1">
                  Número <SortIcon field="ticket_number" />
                </div>
              </th>
              <th className="min-w-[200px]">Título</th>
              <th
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('state_name')}
              >
                <div className="flex items-center gap-1">
                  Estado <SortIcon field="state_name" />
                </div>
              </th>
              <th>Proyecto</th>
              <th>Agente</th>
              <th
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Creado <SortIcon field="created_at" />
                </div>
              </th>
              <th>SLA 1ra Respuesta</th>
              <th>SLA Resolución</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <button
                    onClick={() => setSelectedTicket(ticket.ticket_number)}
                    className="font-medium text-primary hover:text-primary-dark hover:underline cursor-pointer"
                  >
                    #{ticket.ticket_number}
                  </button>
                </td>
                <td className="max-w-xs truncate" title={ticket.title}>
                  {ticket.title || '-'}
                </td>
                <td>
                  <span className={`badge ${
                    ticket.state_name?.toLowerCase().includes('cerrado')
                      ? 'badge-success'
                      : ticket.state_name?.toLowerCase().includes('abierto')
                      ? 'badge-danger'
                      : 'badge-warning'
                  }`}>
                    {ticket.state_name || '-'}
                  </span>
                </td>
                <td className="max-w-xs truncate" title={ticket.organization_name}>
                  {ticket.organization_name || '-'}
                </td>
                <td>{ticket.owner_name || 'Sin asignar'}</td>
                <td className="text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(ticket.created_at)}
                </td>
                <td>{getSLABadge(ticket.first_response_sla_met)}</td>
                <td>{getSLABadge(ticket.resolution_sla_met)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, tickets.length)} de {tickets.length}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }

              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentPage === pageNumber
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>
    </Card>
    </>
  );
};

export default TicketsTable;
