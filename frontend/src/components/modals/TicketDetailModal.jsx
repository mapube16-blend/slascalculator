import { useEffect, useState } from 'react';
import { X, Clock, Calendar, User, Tag, ArrowRight } from 'phosphor-react';
import { apiService } from '../../services/api';
const PERIOD_COLORS = {
  Empresa: { dot: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', line: 'bg-blue-300' },
  Cliente: { dot: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', line: 'bg-amber-300' },
  Excluido: { dot: 'bg-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', line: 'bg-gray-300' }
};

const TicketDetailModal = ({ ticketNumber, onClose }) => {
  const [ticketDetail, setTicketDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTicketDetail();
  }, [ticketNumber]);

  const loadTicketDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getTicketHistory(ticketNumber);
      setTicketDetail(data);
    } catch (err) {
      console.error('Error cargando detalle del ticket:', err);
      setError('No se pudo cargar la información del ticket');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Abierto') return dateString || '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Calculate max duration for proportional bar widths
  const maxDuration = ticketDetail?.history
    ? Math.max(...ticketDetail.history.map(h => h.durationMinutes || 0), 1)
    : 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Ticket #{ticketNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-primary-dark rounded p-1 transition-colors"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="bg-danger-light border border-danger text-danger-dark px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {ticketDetail && !loading && (
            <div className="space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                    <Tag size={16} />
                    Información General
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Título:</span>
                      <p className="font-medium">{ticketDetail.ticket?.title || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Estado Actual:</span>
                      <p className="font-medium">{ticketDetail.ticket?.currentState || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Proyecto:</span>
                      <p className="font-medium">{ticketDetail.ticket?.organization || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Empresa:</span>
                      <p className="font-medium">{ticketDetail.ticket?.empresa || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                    <User size={16} />
                    Fechas y Agente
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Agente Asignado:</span>
                      <p className="font-medium">{ticketDetail.ticket?.owner || 'Sin asignar'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Creado:</span>
                      <p className="font-medium">{formatDate(ticketDetail.ticket?.created)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Cerrado:</span>
                      <p className="font-medium">{formatDate(ticketDetail.ticket?.closed)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de Tiempos */}
              <div className="bg-primary-light p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Clock size={16} />
                  Resumen de Tiempos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Tiempo Empresa:</p>
                    <p className="font-semibold text-primary text-lg">
                      {ticketDetail.summary?.totalHighTechFormatted || '-'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ticketDetail.summary?.totalHighTechMinutes || 0} minutos
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Tiempo Cliente:</p>
                    <p className="font-semibold text-warning text-lg">
                      {ticketDetail.summary?.totalClientFormatted || '-'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ticketDetail.summary?.totalClientMinutes || 0} minutos
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Tiempo Total Hábil:</p>
                    <p className="font-semibold text-gray-900 text-lg">
                      {ticketDetail.summary?.totalWorkingFormatted || '-'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ticketDetail.summary?.totalWorkingMinutes || 0} minutos
                    </p>
                  </div>
                </div>
              </div>

              {/* Leyenda */}
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Empresa
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  Cliente
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  Excluido
                </div>
              </div>

              {/* Línea de Tiempo Visual */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Calendar size={16} />
                  Línea de Tiempo
                </h3>

                {ticketDetail.history && ticketDetail.history.length > 0 ? (
                  <div className="relative">
                    {ticketDetail.history.map((entry, index) => {
                      const colors = PERIOD_COLORS[entry.type] || PERIOD_COLORS.Excluido;
                      const isLast = index === ticketDetail.history.length - 1;
                      const barWidth = maxDuration > 0
                        ? Math.max((entry.durationMinutes / maxDuration) * 100, 4)
                        : 4;

                      return (
                        <div key={index} className="flex gap-4 group">
                          {/* Timeline rail */}
                          <div className="flex flex-col items-center w-6 flex-shrink-0">
                            <div className={`w-4 h-4 rounded-full ${colors.dot} ring-4 ring-white shadow-sm z-10 flex-shrink-0`}></div>
                            {!isLast && (
                              <div className={`w-0.5 flex-1 min-h-[24px] ${colors.line}`}></div>
                            )}
                          </div>

                          {/* Content card */}
                          <div className={`flex-1 mb-3 p-3 rounded-lg border ${colors.bg} ${colors.border} ${entry.isCurrent ? 'ring-2 ring-blue-400' : ''}`}>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              {/* Left: state + owner */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-semibold text-sm ${colors.text}`}>
                                    {entry.to || '-'}
                                  </span>
                                  {entry.isCurrent && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-medium">
                                      ACTUAL
                                    </span>
                                  )}
                                </div>
                                {entry.owner && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                                    <User size={12} weight="bold" />
                                    <span>{entry.owner}</span>
                                  </div>
                                )}
                              </div>

                              {/* Right: duration */}
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-sm text-gray-900">
                                  {entry.durationFormatted}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {entry.durationMinutes} min
                                </p>
                              </div>
                            </div>

                            {/* Duration bar */}
                            <div className="mt-2 w-full bg-white bg-opacity-60 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${colors.dot} transition-all duration-500`}
                                style={{ width: `${barWidth}%` }}
                              ></div>
                            </div>

                            {/* Timestamps */}
                            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-500">
                              <span>{formatShortDate(entry.startTime)}</span>
                              <ArrowRight size={10} />
                              <span>
                                {entry.isCurrent ? 'En curso' : formatShortDate(entry.endTime)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No hay historial de estados disponible
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
