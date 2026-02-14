# Componentes React - Zammad SLA Reporter

Este documento describe todos los componentes creados basados en el diseño de Figma.

## 📦 Estructura de Componentes

```
src/components/
├── common/              # Componentes reutilizables base
│   ├── Button.jsx       ✅ Botones con variantes y tamaños
│   ├── Badge.jsx        ✅ Badges de estado y SLA
│   ├── Card.jsx         ✅ Contenedor con sombra
│   ├── Input.jsx        ✅ Input con label y validación
│   └── Select.jsx       ✅ Dropdown personalizado
│
├── metrics/             # Componentes de métricas
│   ├── MetricCard.jsx   ✅ Card con número grande e ícono
│   ├── CalendarSelector.jsx ✅ Selector de calendario (3 botones)
│   └── SLAProgress.jsx  ✅ Barra de progreso con estadísticas
│
├── filters/             # Componentes de filtros
│   └── FilterPanel.jsx  ✅ Panel completo de filtros
│
├── tables/              # Componentes de tablas
│   └── TicketsTable.jsx ⏳ En progreso
│
└── charts/              # Componentes de gráficas
    ├── StackedBarChart.jsx ⏳ Pendiente
    ├── DonutChart.jsx       ⏳ Pendiente
    └── HorizontalBarChart.jsx ⏳ Pendiente
```

## 🎨 Componentes Completados

### 1. Common Components

#### Button
```jsx
<Button variant="primary" icon={Icon} loading={false}>
  Cargar Métricas
</Button>
```

**Variantes**: `primary`, `secondary`, `success`, `danger`, `warning`, `outline`
**Tamaños**: `sm`, `md`, `lg`

#### Badge
```jsx
<Badge variant="success">Cerrado</Badge>
<StatusBadge status="Cerrado" />
<SLABadge met={true} />
```

#### Card
```jsx
<Card title="Título" icon={Icon} hoverable>
  Contenido
</Card>
```

### 2. Metrics Components

#### MetricCard
Usado para mostrar métricas principales (Total Tickets, Cerrados, Abiertos).

```jsx
<MetricCard
  title="Total de Tickets"
  value="1247"
  icon={TicketIcon}
  iconBgColor="bg-primary-light"
  iconColor="text-primary"
/>
```

#### CalendarSelector
Selector de calendario SLA con 3 opciones.

```jsx
<CalendarSelector />
```

Opciones:
- Horario Laboral (L-V, 8:30-13:30, 15:00-18:00)
- 24/7 (Continuo)
- Extendido (L-V, 8:30-18:00)

#### SLAProgress
Barra de progreso con porcentaje y estadísticas.

```jsx
<SLAProgress
  title="Tiempo de Primera Respuesta"
  percentage={94.2}
  met={1234}
  breached={13}
/>
```

### 3. Filter Components

#### FilterPanel
Panel completo de filtros con botones de acción.

```jsx
<FilterPanel
  onLoadMetrics={handleLoadMetrics}
  onExportExcel={handleExportExcel}
/>
```

Incluye:
- 2 Date pickers (Inicio, Fin)
- 3 Selects (Proyecto, Agente, Estado)
- 3 Botones (Cargar, Exportar, Limpiar)

## 🎯 Próximos Componentes

### TicketsTable
Tabla completa de tickets con:
- Paginación
- Ordenamiento
- Badges de estado
- Links a detalles

### Charts
- **StackedBarChart**: Tendencia de SLA mensual
- **DonutChart**: Distribución de estados
- **HorizontalBarChart**: Agentes con mejor desempeño

## 🔌 Integración con API

Todos los componentes están integrados con:
- **AppContext**: Estado global
- **apiService**: Llamadas al backend

### Ejemplo de uso en Dashboard

```jsx
import { useApp } from './context/AppContext';
import { apiService } from './services/api';
import MetricCard from './components/metrics/MetricCard';

function Dashboard() {
  const { state, dispatch } = useApp();

  const loadMetrics = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const filters = {
        ...state.filters,
        calendarType: state.selectedCalendarType
      };
      const metrics = await apiService.getMetrics(filters);
      dispatch({ type: 'SET_METRICS', payload: metrics });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error });
    }
  };

  return (
    <div>
      <MetricCard
        title="Total de Tickets"
        value={state.currentMetrics?.totalTickets || 0}
        icon={TicketIcon}
      />
    </div>
  );
}
```

## 🎨 Colores del Diseño Figma

```javascript
primary: '#4DD4D4'    // Turquesa - botones, gráficas
success: '#10B981'    // Verde - cerrados, cumplido
danger: '#EF4444'     // Rojo - abiertos, incumplido
warning: '#F59E0B'    // Amarillo - pendientes
info: '#3B82F6'       // Azul - información
```

## 📱 Responsive Design

Todos los componentes usan Tailwind CSS con breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## ✅ Estado Actual

**Completado**: 11/14 componentes base
**Próximo**: TicketsTable y Charts

---

**Última actualización**: 2026-02-11
