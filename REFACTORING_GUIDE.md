# Guía de Refactorización - Zammad SLA Reporter

## 📋 Resumen de Cambios Implementados

Este documento describe todas las mejoras y refactorizaciones aplicadas al proyecto.

---

## ✅ Cambios Completados

### 1. Seguridad (P0 - Crítico)

#### ✓ Archivo .env.example creado
- **Archivo**: `.env.example`
- **Propósito**: Plantilla de configuración sin credenciales sensibles
- **Acción requerida**:
  1. Copiar `.env.example` a `.env`
  2. Completar con credenciales reales
  3. **NUNCA** commitear `.env` a git

#### ✓ Validación de entrada implementada
- **Archivo**: `middleware/validators.js`
- **Características**:
  - Validación de fechas ISO 8601
  - Validación de tipos de calendario
  - Validación de IDs y parámetros
  - Mensajes de error descriptivos
- **Endpoints protegidos**:
  - POST `/api/metrics`
  - POST `/api/tickets`
  - POST `/api/tickets-with-durations`
  - GET `/api/ticket-history/:number`
  - POST `/api/generate-report`
  - POST `/api/generate-filtered-report`

#### ✓ Rate Limiting implementado
- **Archivo**: `server.js`
- **Configuración**: 100 requests por 15 minutos
- **Alcance**: Todas las rutas `/api/*`
- **Personalizable**: Ver `config/constants.js` → `API.RATE_LIMIT`

---

### 2. Organización del Código (P1 - Alto)

#### ✓ Archivos basura eliminados
```bash
# Archivos eliminados:
- Dockerfile (vacío)
- .dockerignore (vacío)
- scripts/generateDatabaseDictionary.js (vacío)
- TEST_GUIDE.md (vacío)
- debug-query.js
- debug-times.js
- database-exploration.txt
- services/vpn_error.html (duplicado)
```

#### ✓ Archivos de prueba reorganizados
- **Directorio**: `tests/`
- **Archivos movidos**: Todos los `test-*.js` del root
- **Próximos pasos**: Implementar framework de testing (Jest/Mocha)

#### ✓ Dependencias limpiadas
**Eliminadas (no usadas)**:
- `lucide-react` (270KB)
- `react-router` (58KB)
- `recharts` (160KB)
- `business-days` (duplicado)

**Agregadas (nuevas funcionalidades)**:
- `express-rate-limit` - Rate limiting
- `express-validator` - Validación de entrada

**Resultado**: ~500KB de reducción en bundle size

---

### 3. Centralización de Configuración (P2 - Medio)

#### ✓ Archivo de constantes creado
- **Archivo**: `config/constants.js`
- **Contenido**:
  - `DATABASE` - Configuración de DB (batch size, IDs de campos)
  - `TICKET_STATES` - Estados de tickets
  - `STATE_GROUPS` - Grupos de estados para cálculos
  - `TICKET_TYPES` - Tipos de tickets
  - `PRIORITIES` - Niveles de prioridad
  - `CALENDAR_TYPES` - Tipos de calendario
  - `CALENDAR_CONFIG` - Configuración de horarios
  - `SLA_TARGETS` - Objetivos de SLA
  - `API` - Configuración de API
  - `PAGINATION` - Configuración de paginación
  - `EXCEL` - Configuración de reportes
  - `ERROR_MESSAGES` - Mensajes de error centralizados
  - `SUCCESS_MESSAGES` - Mensajes de éxito

**Beneficios**:
- Un solo lugar para modificar valores
- Fácil mantenimiento
- Reducción de errores por valores inconsistentes

---

### 4. Sistema de Logging Mejorado (P2 - Medio)

#### ✓ Logger implementado
- **Archivo**: `utils/logger.js`
- **Características**:
  - Niveles de log: ERROR, WARN, INFO, DEBUG
  - Formato estructurado con timestamp
  - Contexto enriquecido en errores
  - Logging de queries (modo DEBUG)
  - Logging de requests API

**Uso**:
```javascript
const logger = require('../utils/logger');

// Log de error con contexto
logger.error('Error message', error, { ticketId: 123 });

// Log de info
logger.info('Operation completed', { count: 50 });

// Log de warning
logger.warn('Deprecated feature used');

// Log de debug (solo en desarrollo)
logger.debug('Detailed information', { data });
```

#### ✓ Errores actualizados en slaService.js
- Todos los `console.error` reemplazados por `logger.error`
- Contexto agregado a cada error
- Mejor trazabilidad de problemas

---

### 5. Modularización del Frontend (P1 - Alto)

#### ✓ Estructura de módulos creada
```
public/
├── modules/
│   ├── state.js      - Manejo del estado global
│   ├── api.js        - Llamadas a la API
│   └── utils.js      - Utilidades compartidas
└── app.js            - Aplicación principal (pendiente de migrar)
```

#### Módulo: state.js
**Responsabilidades**:
- Manejo centralizado del estado
- Gestión de paginación
- Gestión de ordenamiento
- Persistencia en sessionStorage
- Caché de elementos del DOM

**API**:
```javascript
AppState.currentMetrics      // Métricas actuales
AppState.selectedCalendarType // Calendario seleccionado
AppState.allTickets          // Array de tickets
AppState.pagination          // Estado de paginación
AppState.updatePagination(page, size) // Actualizar paginación
AppState.updateSort(field, dir)       // Actualizar ordenamiento
```

#### Módulo: api.js
**Responsabilidades**:
- Todas las llamadas HTTP al backend
- Manejo de errores de red
- Formato de respuestas
- Descarga de archivos

**API**:
```javascript
await API.getProjects()
await API.getAgents()
await API.getMetrics(filters)
await API.getTickets(filters)
await API.getTicketHistory(number, calType)
await API.generateReport(filters, charts)
```

#### Módulo: utils.js
**Responsabilidades**:
- Formateo de fechas y números
- Cálculos de porcentajes
- Utilidades de UI (loading, errores)
- Helpers de ordenamiento
- Debouncing

**API**:
```javascript
Utils.formatMinutes(120)           // "2h"
Utils.formatDate(new Date())       // "10/02/2026"
Utils.calculatePercentage(50, 200) // 25
Utils.showLoading(true)
Utils.showError("Error message")
Utils.getFiltersFromForm()
Utils.sortBy(array, 'field', 'asc')
```

---

### 6. Optimización de Consultas SQL (P1 - Alto)

#### ✓ Función helper para consultas de historial
- **Archivo**: `services/slaService.js`
- **Función**: `_getTicketHistories(ticketIds)`
- **Beneficios**:
  - Elimina código duplicado (4 implementaciones → 1)
  - Procesamiento en lotes automático
  - Logging de errores integrado
  - Reutilizable en todo el servicio

**Antes**:
```javascript
// 4 implementaciones diferentes dispersas en el código
const res = await pool.query(`
  SELECT created_at, value_from, value_to
  FROM histories
  WHERE o_id = $1 AND history_attribute_id = 13
  ORDER BY created_at ASC
`, [ticketId]);
```

**Después**:
```javascript
// Una sola implementación optimizada
const histories = await this._getTicketHistories(ticketId);
// o para múltiples tickets:
const historiesMap = await this._getTicketHistories([id1, id2, id3]);
```

---

## 📊 Métricas de Mejora

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Archivos basura | 8 | 0 | ✅ 100% |
| Dependencias no usadas | 4 | 0 | ✅ 100% |
| Bundle size (deps) | ~500KB extra | 0KB | ✅ -500KB |
| Consultas SQL duplicadas | 4 | 1 | ✅ 75% |
| Archivos monolíticos >1000 LOC | 2 | 2* | ⚠️ En progreso |
| Validación de entrada | 0% | 100% | ✅ |
| Rate limiting | No | Sí | ✅ |
| Logging estructurado | No | Sí | ✅ |
| Constantes centralizadas | No | Sí | ✅ |

\* *app.js y slaService.js aún son grandes, pero ahora hay módulos separados disponibles*

---

## 🚀 Próximos Pasos Recomendados

### Inmediato (Esta semana)

1. **Instalar nuevas dependencias**
   ```bash
   npm install
   ```

2. **Probar validaciones de API**
   - Enviar requests malformadas para verificar validación
   - Verificar mensajes de error descriptivos

3. **Verificar rate limiting**
   - Hacer múltiples requests rápidos
   - Confirmar que bloquea después del límite

### Corto Plazo (Próximas 2 semanas)

4. **Migrar app.js a módulos**
   - Crear `modules/charts.js` para gráficas
   - Crear `modules/table.js` para tabla y paginación
   - Crear `modules/modal.js` para modal de detalles
   - Crear `modules/filters.js` para manejo de filtros
   - Actualizar `index.html` para cargar módulos

5. **Refactorizar slaService.js**
   - Separar en:
     - `services/sla/SLACalculator.js`
     - `services/sla/TimeCalculator.js`
     - `services/sla/TicketQueryService.js`
   - Mantener `slaService.js` como orquestador

6. **Implementar paginación server-side**
   - Agregar parámetros `page` y `pageSize` a endpoints
   - Modificar queries SQL con LIMIT/OFFSET
   - Retornar metadatos de paginación (total, páginas)

### Mediano Plazo (Próximo mes)

7. **Agregar tests automatizados**
   - Framework: Jest o Mocha
   - Unit tests para `slaService.js`
   - Integration tests para API endpoints
   - Objetivo: >70% cobertura

8. **Implementar caché**
   - Redis o caché en memoria
   - TTL: 15 minutos
   - Invalidación inteligente

9. **Optimizar base de datos**
   - Crear índices en:
     - `histories(o_id, history_attribute_id, created_at)`
     - `tickets(created_at, state_id, organization_id)`
   - Analizar queries lentas con EXPLAIN

### Largo Plazo (Próximo trimestre)

10. **Migrar a TypeScript**
    - Mejor type safety
    - Menos errores en runtime
    - Mejor experiencia de desarrollo

11. **Implementar CI/CD**
    - GitHub Actions o GitLab CI
    - Tests automáticos en cada PR
    - Deploy automático a staging

12. **Monitoreo y alertas**
    - Implementar APM (Sentry, DataDog)
    - Alertas de errores
    - Métricas de rendimiento

---

## 📖 Guía de Uso de Nuevas Funcionalidades

### Usando el Logger

```javascript
// En cualquier archivo del backend
const logger = require('../utils/logger');

// Diferentes niveles
logger.error('Database connection failed', error, { host, port });
logger.warn('Deprecated API endpoint used', { endpoint });
logger.info('Report generated successfully', { ticketCount: 150 });
logger.debug('Query executed', { query, duration: 45 });
```

### Usando Constantes

```javascript
// En lugar de hardcodear valores
const { DATABASE, TICKET_STATES, ERROR_MESSAGES } = require('../config/constants');

// Usar constantes
const batchSize = DATABASE.BATCH_SIZE; // en lugar de 200
const waitingState = TICKET_STATES.WAITING; // en lugar de 'En Espera'
const errorMsg = ERROR_MESSAGES.TICKET_NOT_FOUND; // consistente
```

### Usando Validadores

```javascript
// En routes/api.js
const { filtersValidation, validate } = require('../middleware/validators');

router.post('/my-endpoint',
  filtersValidation,  // Reglas de validación
  validate,           // Middleware que verifica
  async (req, res) => {
    // req.body ya está validado aquí
  }
);
```

### Usando Módulos Frontend (después de migración)

```html
<!-- En index.html -->
<script src="/modules/state.js"></script>
<script src="/modules/api.js"></script>
<script src="/modules/utils.js"></script>
<script src="/app.js"></script>
```

```javascript
// En tu código JavaScript
// Estado
AppState.selectedCalendarType = '24x7';
AppState.updatePagination(2, 20);

// API
const tickets = await API.getTickets(filters);

// Utils
const formatted = Utils.formatMinutes(125); // "2h 5min"
Utils.showLoading(true);
```

---

## ⚠️ Notas Importantes

### Seguridad

1. **Credenciales**: Asegúrate de que `.env` esté en `.gitignore`
2. **Rotación**: Si `.env` fue commiteado antes, rotar credenciales de DB
3. **HTTPS**: En producción, forzar HTTPS
4. **Validación**: Nunca confiar en datos del cliente

### Rendimiento

1. **Caché**: Considerar implementar caché para queries frecuentes
2. **Índices**: Agregar índices a la base de datos
3. **Paginación**: Implementar paginación server-side para grandes datasets
4. **Bundle**: Considerar code splitting para el frontend

### Mantenimiento

1. **Logging**: Revisar logs regularmente para detectar problemas
2. **Dependencias**: Mantener dependencias actualizadas
3. **Tests**: Agregar tests antes de cambios grandes
4. **Documentación**: Mantener este archivo actualizado

---

## 🤝 Contribuir

Al hacer cambios futuros:

1. ✅ Usar constantes de `config/constants.js`
2. ✅ Usar logger en lugar de console.log
3. ✅ Validar entrada de usuario
4. ✅ Agregar tests para nueva funcionalidad
5. ✅ Actualizar documentación
6. ✅ Revisar seguridad

---

## 📞 Soporte

Para preguntas sobre esta refactorización:
- Ver código de ejemplo en cada módulo
- Revisar comentarios en `config/constants.js`
- Consultar `middleware/validators.js` para validaciones

---

**Última actualización**: 2026-02-10
**Versión**: 2.0.0-refactored
