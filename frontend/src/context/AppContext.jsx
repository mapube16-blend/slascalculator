import { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

// Estado inicial
const initialState = {
  // Configuración
  selectedCalendarType: 'laboral', // 'laboral', 'continuo', '24x7'

  // Datos
  currentMetrics: null,
  tickets: [],
  projects: [],
  agents: [],
  ticketTypes: [],

  // Filtros
  filters: {
    ticketNumber: null,
    startDate: null,
    endDate: null,
    organizationId: null,
    ownerId: null,
    state: null,
    type: null
  },

  // UI State
  loading: false,
  error: null,

  // Paginación
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalPages: 0
  },

  // Ordenamiento
  sorting: {
    field: null,
    direction: 'asc' // 'asc' | 'desc'
  },

  // Modal
  modal: {
    isOpen: false,
    ticketNumber: null,
    data: null
  }
};

// Reducer para manejar acciones
function appReducer(state, action) {
  switch (action.type) {
    // ==================== CALENDARIO ====================
    case 'SET_CALENDAR_TYPE':
      return {
        ...state,
        selectedCalendarType: action.payload
      };

    // ==================== DATOS ====================
    case 'SET_METRICS':
      return {
        ...state,
        currentMetrics: action.payload,
        loading: false,
        error: null
      };

    case 'SET_TICKETS':
      return {
        ...state,
        tickets: action.payload,
        loading: false,
        error: null
      };

    case 'SET_PROJECTS':
      return {
        ...state,
        projects: action.payload
      };

    case 'SET_AGENTS':
      return {
        ...state,
        agents: action.payload
      };

    case 'SET_TICKET_TYPES':
      return {
        ...state,
        ticketTypes: action.payload
      };

    // ==================== FILTROS ====================
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, currentPage: 1 } // Reset page
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: {
          ...initialState.filters,
          // Mantener fechas por defecto al resetear
          startDate: state.filters.startDate,
          endDate: state.filters.endDate
        },
        pagination: { ...state.pagination, currentPage: 1 }
      };

    // ==================== UI STATE ====================
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    // ==================== PAGINACIÓN ====================
    case 'SET_PAGINATION':
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload }
      };

    case 'SET_PAGE':
      return {
        ...state,
        pagination: { ...state.pagination, currentPage: action.payload }
      };

    case 'SET_PAGE_SIZE':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          pageSize: action.payload,
          currentPage: 1 // Reset to first page
        }
      };

    // ==================== ORDENAMIENTO ====================
    case 'SET_SORTING':
      return {
        ...state,
        sorting: action.payload
      };

    case 'TOGGLE_SORT':
      const currentField = state.sorting.field;
      const currentDirection = state.sorting.direction;

      return {
        ...state,
        sorting: {
          field: action.payload,
          direction: currentField === action.payload && currentDirection === 'asc'
            ? 'desc'
            : 'asc'
        }
      };

    // ==================== MODAL ====================
    case 'OPEN_MODAL':
      return {
        ...state,
        modal: {
          isOpen: true,
          ticketNumber: action.payload.ticketNumber,
          data: action.payload.data || null
        }
      };

    case 'CLOSE_MODAL':
      return {
        ...state,
        modal: {
          isOpen: false,
          ticketNumber: null,
          data: null
        }
      };

    default:
      return state;
  }
}

// Provider Component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Cargar estado inicial desde localStorage
  useEffect(() => {
    const savedCalendarType = localStorage.getItem('selectedCalendarType');
    if (savedCalendarType) {
      dispatch({
        type: 'SET_CALENDAR_TYPE',
        payload: savedCalendarType
      });
    }
  }, []);

  // Guardar calendario seleccionado en localStorage
  useEffect(() => {
    localStorage.setItem('selectedCalendarType', state.selectedCalendarType);
  }, [state.selectedCalendarType]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }

  return context;
}

export default AppContext;
