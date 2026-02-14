import { useEffect, useState } from 'react';
import { X, Clock, Calendar, User, Tag } from 'phosphor-react';
import { apiService } from '../../services/api';
import { useApp } from '../../context/AppContext';

const TicketDetailModal = ({ ticketNumber, onClose }) => {
  const { state } = useApp();
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
      const data = await apiService.getTicketHistory(
        ticketNumber,
        state.selectedCalendarType
      );
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
    // Backend already returns formatted dates: 'YYYY-MM-DD HH:mm:ss'
    // Convert to ES locale format
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

              {/* Historial de Estados */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar size={16} />
                  Historial de Estados - Duraciones por Estado
                </h3>

                {ticketDetail.history && ticketDetail.history.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Estado</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Tipo</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Inicio</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Fin</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Duración</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {ticketDetail.history.map((state, index) => (
                          <tr key={index} className={`hover:bg-gray-50 ${state.isCurrent ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3">
                              <span className={`badge ${
                                state.to?.toLowerCase().includes('cerrado')
                                  ? 'badge-success'
                                  : state.to?.toLowerCase().includes('nuevo') || state.to?.toLowerCase().includes('abierto')
                                  ? 'badge-danger'
                                  : 'badge-warning'
                              }`}>
                                {state.to || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded ${
                                state.type === 'Empresa'
                                  ? 'bg-primary-light text-primary'
                                  : state.type === 'Cliente'
                                  ? 'bg-warning-light text-warning'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {state.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {formatDate(state.startTime)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {state.isCurrent ? (
                                <span className="text-primary font-medium">En curso</span>
                              ) : (
                                formatDate(state.endTime)
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-gray-900">
                                {state.durationFormatted}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
