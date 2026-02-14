# Mapa de Componentes desde Figma

## 🎨 Paleta de Colores Extraída

```javascript
// tailwind.config.js - colors
{
  primary: {
    DEFAULT: '#4DD4D4',  // Turquesa principal
    light: '#E0F2FE',    // Fondos de íconos
  },
  success: '#10B981',    // Verde - Cerrados, Cumplido
  danger: '#EF4444',     // Rojo - Abiertos, Incumplido
  warning: '#F59E0B',    // Amarillo - Pendientes
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',      // Fondo principal
    200: '#E5E7EB',
    300: '#D1D5DB',
    500: '#6B7280',      // Texto secundario
    900: '#1F2937',      // Texto principal
  }
}
```

---

## 📦 Componentes Identificados

### 1. Layout Principal
```
└── MainLayout
    ├── Header (opcional - no visible en screenshots)
    └── Content
        ├── ConfigurationSection
        ├── FiltersSection
        ├── MetricsCards
        ├── SLAProgressBars
        ├── TicketsTable
        └── ChartsSection
```

### 2. ConfigurationSection
**Ubicación**: Top de la página
**Elementos**:
- Título: "Configuración SLA" con ícono de reloj
- Selector de calendario: 3 botones (Horario Laboral, 24/7, Extendido)

**Componentes React**:
```jsx
<ConfigurationSection>
  <SectionTitle icon={ClockIcon}>Configuración SLA</SectionTitle>
  <CalendarSelector
    options={['Horario Laboral', '24/7', 'Extendido']}
    selected="Horario Laboral"
    onChange={handleCalendarChange}
  />
</ConfigurationSection>
```

### 3. FiltersSection
**Elementos**:
- 2 Date pickers (Fecha Inicio, Fecha Fin)
- 3 Dropdowns (Proyecto, Agente, Estado del Ticket)
- 2 Botones (Cargar Métricas - primario turquesa, Exportar Excel - secundario)

**Componentes React**:
```jsx
<FiltersSection>
  <FilterRow>
    <DatePicker label="Fecha Inicio" />
    <DatePicker label="Fecha Fin" />
    <Select label="Proyecto" />
    <Select label="Agente" />
    <Select label="Estado del Ticket" />
  </FilterRow>
  <ButtonGroup>
    <Button variant="primary" icon={FilterIcon}>Cargar Métricas</Button>
    <Button variant="secondary" icon={DownloadIcon}>Exportar Excel</Button>
  </ButtonGroup>
</FiltersSection>
```

### 4. MetricsCards
**3 Cards con**:
- Card 1: Total de Tickets (1247) - ícono azul claro
- Card 2: Tickets Cerrados (1089) - ícono verde con check
- Card 3: Tickets Abiertos (158) - ícono rojo con X

**Componentes React**:
```jsx
<MetricsCards>
  <MetricCard
    title="Total de Tickets"
    value="1247"
    icon={TicketIcon}
    iconColor="blue"
  />
  <MetricCard
    title="Tickets Cerrados"
    value="1089"
    icon={CheckCircleIcon}
    iconColor="success"
  />
  <MetricCard
    title="Tickets Abiertos"
    value="158"
    icon={XCircleIcon}
    iconColor="danger"
  />
</MetricsCards>
```

### 5. SLAProgressBars
**2 Secciones con barras de progreso**:
- Tiempo de Primera Respuesta: 94.2%
- Tiempo de Resolución: 87.5%

Cada una con:
- Título con ícono de reloj
- Porcentaje grande en verde
- Barra de progreso turquesa
- Debajo: "SLA Cumplido" y "SLA Incumplido"

**Componentes React**:
```jsx
<SLAProgressSection>
  <SLAProgress
    title="Tiempo de Primera Respuesta"
    icon={ClockIcon}
    percentage={94.2}
    met={1234}
    breached={13}
  />
  <SLAProgress
    title="Tiempo de Resolución"
    icon={CheckCircleIcon}
    percentage={87.5}
    met={1089}
    breached={158}
  />
</SLAProgressSection>
```

### 6. TicketsTable
**Tabla con columnas**:
- Número (#10234, #10235, etc.) - link azul
- Título (texto del ticket)
- Proyecto
- Agente
- Estado - badge coloreado (Cerrado-verde, Abierto-azul, Pendiente-amarillo)
- Duración (2h 15m, 4h 32m, etc.)
- Estado SLA - badge (SLA Cumplido-verde, Incumplido-rojo)

**Componentes React**:
```jsx
<TicketsTable>
  <TableHeader>
    <TableColumn>Número</TableColumn>
    <TableColumn>Título</TableColumn>
    <TableColumn>Proyecto</TableColumn>
    <TableColumn>Agente</TableColumn>
    <TableColumn>Estado</TableColumn>
    <TableColumn>Duración</TableColumn>
    <TableColumn>Estado SLA</TableColumn>
  </TableHeader>
  <TableBody>
    {tickets.map(ticket => (
      <TableRow key={ticket.id}>
        <TableCell>
          <TicketLink>{ticket.number}</TicketLink>
        </TableCell>
        <TableCell>{ticket.title}</TableCell>
        <TableCell>{ticket.project}</TableCell>
        <TableCell>{ticket.agent}</TableCell>
        <TableCell>
          <StatusBadge status={ticket.status} />
        </TableCell>
        <TableCell>{ticket.duration}</TableCell>
        <TableCell>
          <SLABadge met={ticket.sla_met} />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</TicketsTable>
```

### 7. ChartsSection
**3 Gráficas**:

#### a) Tendencia de Cumplimiento SLA (Barras Apiladas)
- Eje X: Meses (Ago, Sep, Oct, Nov, Dic, Ene)
- Eje Y: Tickets (0-340)
- Turquesa: SLA Cumplido
- Rojo: SLA Incumplido
- Tooltip al hover

#### b) Distribución de Estado de Tickets (Dona)
- Verde (81%): Cerrados: 1089
- Rojo (12%): Abiertos: 158
- Amarillo (7%): Pendientes: 95
- Leyenda abajo

#### c) Agentes con Mejor Desempeño (Barras Horizontales)
- 5 agentes con barras turquesas
- Eje X: Tickets Resueltos (0-360)

**Componentes React**:
```jsx
<ChartsSection>
  <ChartCard title="Tendencia de Cumplimiento SLA" icon={TrendingUpIcon}>
    <StackedBarChart
      data={trendData}
      xAxis="month"
      series={[
        { name: 'SLA Cumplido', color: '#4DD4D4' },
        { name: 'SLA Incumplido', color: '#EF4444' }
      ]}
    />
  </ChartCard>

  <ChartCard title="Distribución de Estado de Tickets" icon={PieChartIcon}>
    <DonutChart
      data={[
        { label: 'Cerrados', value: 1089, color: '#10B981' },
        { label: 'Abiertos', value: 158, color: '#EF4444' },
        { label: 'Pendientes', value: 95, color: '#F59E0B' }
      ]}
    />
  </ChartCard>

  <ChartCard title="Agentes con Mejor Desempeño" icon={UsersIcon}>
    <HorizontalBarChart
      data={agentsData}
      xAxis="tickets"
      color="#4DD4D4"
    />
  </ChartCard>
</ChartsSection>
```

---

## 🎯 Componentes Atómicos a Crear

### Base Components
```
components/
├── common/
│   ├── Button.jsx           ✓ Primario (turquesa), Secundario (gris)
│   ├── DatePicker.jsx       ✓ Con calendario
│   ├── Select.jsx           ✓ Dropdown personalizado
│   ├── Badge.jsx            ✓ Estado, SLA (colores variados)
│   ├── Card.jsx             ✓ Contenedor con sombra
│   ├── ProgressBar.jsx      ✓ Barra turquesa
│   ├── Input.jsx            ✓ Para fechas
│   └── SectionTitle.jsx     ✓ Título con ícono
│
├── metrics/
│   ├── MetricCard.jsx       ✓ Card con número grande e ícono
│   ├── SLAProgress.jsx      ✓ Sección de progreso completa
│   └── CalendarSelector.jsx ✓ 3 botones de calendario
│
├── tables/
│   ├── TicketsTable.jsx     ✓ Tabla completa
│   ├── TableHeader.jsx
│   ├── TableRow.jsx
│   ├── TableCell.jsx
│   ├── TicketLink.jsx       ✓ Link azul clickeable
│   └── StatusBadge.jsx      ✓ Badge de estado coloreado
│
└── charts/
    ├── StackedBarChart.jsx  ✓ Chart.js barras apiladas
    ├── DonutChart.jsx       ✓ Chart.js dona
    ├── HorizontalBarChart.jsx ✓ Chart.js barras horizontales
    └── ChartCard.jsx        ✓ Wrapper para gráficas
```

---

## 📐 Especificaciones de Diseño

### Typography
```css
Títulos principales: font-size: 24px, font-weight: 700
Títulos de sección: font-size: 18px, font-weight: 600
Números grandes (métricas): font-size: 36px, font-weight: 700
Texto normal: font-size: 14px
Texto secundario: font-size: 12px, color: gray-500
```

### Spacing
```css
Card padding: 1.5rem (24px)
Gap entre cards: 1.5rem
Gap en grid: 1rem
Border radius: 0.75rem (12px) para cards
Border radius: 0.5rem (8px) para botones/inputs
```

### Shadows
```css
Card shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
Button hover: 0 4px 6px rgba(0, 0, 0, 0.1)
```

### Icons
- Tamaño estándar: 20px
- Tamaño en cards: 40px (con fondo circular)
- Biblioteca: Phosphor Icons o Lucide React

---

## 🔄 Mapeo a Funcionalidad Actual

| Componente Figma | Endpoint Backend | Funcionalidad Actual |
|------------------|------------------|----------------------|
| CalendarSelector | - | `selectedCalendarType` |
| DatePicker (Inicio/Fin) | `/api/metrics`, `/api/tickets` | `filters.startDate`, `filters.endDate` |
| Select Proyecto | `/api/projects` | `filters.organizationId` |
| Select Agente | `/api/agents` | `filters.ownerId` |
| Select Estado | - | `filters.state` |
| MetricCard Total | `/api/metrics` | `metrics.totalTickets` |
| MetricCard Cerrados | `/api/metrics` | `metrics.closedTickets` |
| MetricCard Abiertos | `/api/metrics` | `metrics.openTickets` |
| SLAProgress Primera Respuesta | `/api/metrics` | `metrics.firstResponse` |
| SLAProgress Resolución | `/api/metrics` | `metrics.resolution` |
| TicketsTable | `/api/tickets` | `tickets[]` |
| Tendencia SLA Chart | `/api/metrics` | `metrics.trend` |
| Distribución Chart | `/api/metrics` | `metrics.distribution` |
| Agentes Chart | `/api/metrics` | `metrics.topAgents` |
| Exportar Excel | `/api/generate-report` | Existente |

---

## ✅ Próximos Pasos

1. ✅ Configurar Tailwind con colores exactos del diseño
2. ✅ Crear componentes atómicos (Button, Badge, etc.)
3. ✅ Crear componentes de métricas (MetricCard, SLAProgress)
4. ✅ Implementar tabla de tickets
5. ✅ Integrar Chart.js con diseño personalizado
6. ✅ Conectar con API backend existente
7. ✅ Responsive design

---

**Referencia Visual**: Screenshots proporcionados por el usuario
**Diseño Figma**: https://www.figma.com/make/P6p9Lhfp7gP0P2PofwJGcT/SLA-Reports-Website
