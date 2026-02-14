# Guía de Migración a React - Zammad SLA Reporter

## 📋 Resumen

Esta guía documenta la migración del frontend de Vanilla JavaScript a **React 18** con **Vite**, manteniendo el backend Express actual intacto.

---

## 🎯 Objetivos

- ✅ Mantener backend Express/Node.js sin cambios
- ✅ Crear frontend React moderno y escalable
- ✅ Implementar diseño de Figma AI
- ✅ Reutilizar lógica de negocio existente
- ✅ Mejorar rendimiento y experiencia de usuario

---

## 🏗️ Arquitectura Nueva

```
zammad-sla-reporter/
├── backend/                    # Backend Express (actual)
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
│
├── frontend/                   # Frontend React (nuevo)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/        # Componentes reutilizables
│   │   │   ├── charts/        # Gráficas
│   │   │   ├── filters/       # Filtros
│   │   │   ├── tables/        # Tablas
│   │   │   └── modals/        # Modales
│   │   ├── context/           # Context API (estado global)
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API calls
│   │   ├── utils/             # Utilidades
│   │   ├── pages/             # Páginas principales
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── package.json               # Root (scripts para ambos)
```

---

## 🚀 Stack Tecnológico

### Frontend (Nuevo)
- **Framework**: React 18
- **Build Tool**: Vite (más rápido que Create React App)
- **Estado**: Context API + useReducer
- **Routing**: React Router v6
- **HTTP Client**: Axios (reutilizando endpoints actuales)
- **Charts**: Chart.js con react-chartjs-2
- **Tablas**: TanStack Table (React Table v8)
- **Forms**: React Hook Form
- **UI**: Tailwind CSS + componentes del diseño Figma
- **Icons**: Phosphor Icons (manteniendo consistencia)

### Backend (Sin cambios)
- Express.js
- PostgreSQL
- Moment.js
- ExcelJS
- Express-validator

---

## 📦 Paso 1: Preparar el Proyecto

### 1.1 Reorganizar estructura actual

```bash
# Crear carpeta backend y mover archivos
mkdir backend
mv config middleware routes services utils server.js backend/
mv package.json backend/package.json
mv package-lock.json backend/package-lock.json
mv node_modules backend/node_modules
mv .env backend/.env

# Mantener archivos de documentación en raíz
# README.md, REFACTORING_GUIDE.md, etc. se quedan en raíz
```

### 1.2 Crear proyecto React con Vite

```bash
# Crear frontend React
npm create vite@latest frontend -- --template react

# Entrar al directorio
cd frontend

# Instalar dependencias
npm install

# Instalar dependencias adicionales
npm install axios react-router-dom chart.js react-chartjs-2 @tanstack/react-table
npm install react-hook-form date-fns phosphor-react
npm install tailwindcss postcss autoprefixer -D
```

### 1.3 Configurar Tailwind CSS

```bash
cd frontend
npx tailwindcss init -p
```

**frontend/tailwind.config.js**:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores del diseño Figma (ajustar según tu diseño)
        primary: '#2563eb',
        secondary: '#64748b',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      }
    },
  },
  plugins: [],
}
```

**frontend/src/index.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 🔧 Paso 2: Configurar Comunicación Backend-Frontend

### 2.1 Configurar proxy en Vite

**frontend/vite.config.js**:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

### 2.2 Actualizar backend para CORS

**backend/server.js** (ya está configurado):
```javascript
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
```

---

## 🎨 Paso 3: Implementar Diseño Figma

### 3.1 Exportar assets de Figma

1. **Acceder al link de Figma** que compartirás
2. **Exportar íconos** como SVG
3. **Copiar estilos CSS** (colores, tipografía, espaciados)
4. **Exportar imágenes** necesarias

### 3.2 Convertir diseño Figma a React

Opciones para implementar diseño Figma:

#### Opción A: Plugin Figma to React (Recomendado)
1. Instalar plugin "Figma to React Component" en Figma
2. Seleccionar frames/componentes
3. Exportar como código React
4. Ajustar código generado

#### Opción B: Manual (más control)
1. Inspeccionar diseño en Figma (Dev Mode)
2. Copiar CSS de cada elemento
3. Crear componentes React manualmente
4. Aplicar estilos con Tailwind

#### Opción C: Locofy.ai o Builder.io (Automático)
1. Importar diseño Figma
2. Generar código React automáticamente
3. Descargar e integrar

### 3.3 Estructura de componentes sugerida

```
src/components/
├── common/
│   ├── Button.jsx
│   ├── Input.jsx
│   ├── Select.jsx
│   ├── Card.jsx
│   ├── Badge.jsx
│   ├── Loader.jsx
│   └── ErrorMessage.jsx
│
├── layout/
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   └── Footer.jsx
│
├── filters/
│   ├── FilterPanel.jsx
│   ├── DateRangePicker.jsx
│   ├── ProjectSelect.jsx
│   └── AgentSelect.jsx
│
├── charts/
│   ├── SLAMetricsChart.jsx
│   ├── ComplianceChart.jsx
│   └── TrendChart.jsx
│
├── tables/
│   ├── TicketsTable.jsx
│   ├── TablePagination.jsx
│   └── TableFilters.jsx
│
└── modals/
    ├── TicketDetailModal.jsx
    └── ExportModal.jsx
```

---

## 💾 Paso 4: Migrar Lógica de Negocio

### 4.1 Servicio API (reutilizar lógica actual)

**frontend/src/services/api.js**:
```javascript
import axios from 'axios';

// Crear instancia axios con configuración base
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para manejar errores
api.interceptors.response.use(
  response => response,
  error => {
    // Manejar errores globalmente
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Endpoints (basados en backend actual)
export const apiService = {
  // Projects
  getProjects: () => api.get('/projects'),

  // Agents
  getAgents: () => api.get('/agents'),

  // Ticket Types
  getTicketTypes: () => api.get('/ticket-types'),

  // Metrics
  getMetrics: (filters) => api.post('/metrics', filters),

  // Tickets
  getTickets: (filters) => api.post('/tickets', filters),

  getTicketsWithDurations: (filters) => api.post('/tickets-with-durations', filters),

  getTicketHistory: (number, calendarType) =>
    api.get(`/ticket-history/${number}`, { params: { calendarType } }),

  // Reports
  generateReport: async (filters, charts) => {
    const response = await api.post('/generate-report',
      { filters, charts },
      { responseType: 'blob' }
    );
    return response.data;
  },

  generateFilteredReport: async (filters) => {
    const response = await api.post('/generate-filtered-report',
      filters,
      { responseType: 'blob' }
    );
    return response.data;
  }
};
```

### 4.2 Context API para Estado Global

**frontend/src/context/AppContext.jsx**:
```javascript
import { createContext, useContext, useReducer } from 'react';

const AppContext = createContext();

const initialState = {
  selectedCalendarType: 'laboral',
  currentMetrics: null,
  tickets: [],
  filters: {
    startDate: null,
    endDate: null,
    organizationId: null,
    ownerId: null,
    state: null,
    type: null
  },
  pagination: {
    currentPage: 1,
    pageSize: 10
  },
  loading: false,
  error: null
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_CALENDAR_TYPE':
      return { ...state, selectedCalendarType: action.payload };

    case 'SET_METRICS':
      return { ...state, currentMetrics: action.payload };

    case 'SET_TICKETS':
      return { ...state, tickets: action.payload };

    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };

    case 'SET_PAGINATION':
      return { ...state, pagination: { ...state.pagination, ...action.payload } };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'RESET_FILTERS':
      return { ...state, filters: initialState.filters };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

### 4.3 Custom Hooks

**frontend/src/hooks/useMetrics.js**:
```javascript
import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { useApp } from '../context/AppContext';

export function useMetrics() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {
        ...state.filters,
        calendarType: state.selectedCalendarType
      };

      const response = await apiService.getMetrics(filters);
      dispatch({ type: 'SET_METRICS', payload: response.data });

      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [state.filters, state.selectedCalendarType, dispatch]);

  return { loadMetrics, loading, error };
}
```

---

## 🎨 Paso 5: Crear Componentes React

### 5.1 Componente Principal

**frontend/src/App.jsx**:
```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
```

### 5.2 Página Dashboard (ejemplo)

**frontend/src/pages/Dashboard.jsx**:
```javascript
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useMetrics } from '../hooks/useMetrics';
import FilterPanel from '../components/filters/FilterPanel';
import MetricsCards from '../components/dashboard/MetricsCards';
import SLACharts from '../components/charts/SLACharts';
import TicketsTable from '../components/tables/TicketsTable';

export default function Dashboard() {
  const { state } = useApp();
  const { loadMetrics, loading } = useMetrics();

  useEffect(() => {
    // Cargar métricas iniciales
    loadMetrics();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Dashboard de SLA
      </h1>

      <FilterPanel onApplyFilters={loadMetrics} />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      ) : (
        <>
          <MetricsCards metrics={state.currentMetrics} />
          <SLACharts metrics={state.currentMetrics} />
          <TicketsTable />
        </>
      )}
    </div>
  );
}
```

---

## 🔄 Paso 6: Scripts de Desarrollo

### 6.1 Root package.json

**package.json** (en raíz):
```json
{
  "name": "zammad-sla-reporter",
  "version": "2.0.0",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "start:backend": "cd backend && npm start",
    "start": "npm run start:backend",
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### 6.2 Instalar concurrently

```bash
npm install concurrently -D
```

---

## 🚀 Paso 7: Ejecutar Proyecto

```bash
# Instalar todas las dependencias
npm run install:all

# Desarrollo (backend + frontend simultáneamente)
npm run dev

# El backend estará en: http://localhost:3000
# El frontend estará en: http://localhost:5173
```

---

## 📋 Checklist de Migración

### Preparación
- [ ] Crear carpeta `backend/` y mover archivos
- [ ] Crear proyecto React en `frontend/`
- [ ] Configurar Tailwind CSS
- [ ] Configurar proxy Vite

### Implementación
- [ ] Compartir link de Figma
- [ ] Exportar assets de Figma (íconos, imágenes)
- [ ] Copiar paleta de colores de Figma
- [ ] Crear componentes base
- [ ] Implementar layout principal
- [ ] Migrar servicio API
- [ ] Configurar Context API
- [ ] Crear custom hooks

### Páginas y Funcionalidades
- [ ] Dashboard principal
- [ ] Panel de filtros
- [ ] Tarjetas de métricas
- [ ] Gráficas de SLA
- [ ] Tabla de tickets con paginación
- [ ] Modal de detalles de ticket
- [ ] Generación de reportes Excel

### Testing y Optimización
- [ ] Probar todas las funcionalidades
- [ ] Optimizar rendimiento
- [ ] Responsive design
- [ ] Build de producción
- [ ] Deploy

---

## 🎯 Próximos Pasos Inmediatos

1. **Compartir link de Figma** para que pueda ver el diseño
2. **Reorganizar estructura** del proyecto (backend/ y frontend/)
3. **Crear proyecto React** con Vite
4. **Configurar Tailwind** con colores del diseño
5. **Empezar a implementar** componentes del diseño

---

## 💡 Ventajas de esta Migración

✅ **Código más mantenible** - Componentes reutilizables
✅ **Mejor rendimiento** - Virtual DOM de React
✅ **Desarrollo más rápido** - Hot reload con Vite
✅ **UI moderna** - Diseño Figma + Tailwind CSS
✅ **Escalable** - Fácil agregar nuevas features
✅ **Type-safe** - Podemos migrar a TypeScript después
✅ **Testing** - Más fácil hacer tests con React Testing Library

---

## 🤝 ¿Listo para Empezar?

Comparte el link de Figma y comenzamos con la implementación! 🚀
