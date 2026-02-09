# Sistema de Reportes SLA para Zammad

Sistema web para generar reportes personalizados de SLA desde la base de datos PostgreSQL de Zammad, con exportación a Excel.

## 📋 Características

- ✅ **Métricas de Primera Respuesta**: Tiempo promedio, cumplimiento de SLA, tickets vencidos
- ✅ **Métricas de Resolución**: Tiempo de resolución, cumplimiento de SLA
- ✅ **Análisis por Agente**: Rendimiento individual de cada agente
- ✅ **Análisis por Equipo**: Métricas agregadas por grupo/equipo
- ✅ **Exportación a Excel**: Reportes profesionales con múltiples hojas y formato
- ✅ **Interfaz Web Moderna**: Dashboard interactivo con filtros personalizables
- ✅ **Filtros Avanzados**: Por fecha, equipo, agente, estado

## 🔧 Requisitos Previos

- Node.js v14 o superior
- Acceso a la base de datos PostgreSQL de Zammad
- Conexión VPN configurada (si es necesario)

## 📦 Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar credenciales de la base de datos**

Crea un archivo `.env` en la raíz del proyecto (puedes copiar `.env.example`):

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
# Configuración de PostgreSQL (Zammad)
DB_HOST=tu-host-zammad.com
DB_PORT=5432
DB_NAME=zammad_production
DB_USER=tu_usuario
DB_PASSWORD=tu_password

# Puerto del servidor
PORT=3000

# Configuración de zona horaria
TIMEZONE=America/Mexico_City
```

## 🚀 Uso

### 1. Conectar la VPN

**IMPORTANTE**: Antes de iniciar el servidor, asegúrate de que tu VPN esté conectada y activa.

### 2. Iniciar el servidor

```bash
npm start
```

O para desarrollo con auto-reload:

```bash
npm run dev
```

### 3. Acceder a la aplicación

Abre tu navegador en:
```
http://localhost:3000
```

### 4. Generar reportes

1. **Selecciona los filtros** que necesites:
   - Rango de fechas
   - Equipo específico
   - Agente específico
   - Estado de tickets

2. **Haz clic en "Cargar Métricas"** para ver el análisis en pantalla

3. **Haz clic en "Generar Excel"** para descargar el reporte completo

## 📊 Estructura del Reporte Excel

El reporte generado incluye 4 hojas:

### 1. **Resumen Ejecutivo**
- Métricas generales (total tickets, cerrados, abiertos)
- Métricas de primera respuesta
- Métricas de resolución
- Tasas de cumplimiento de SLA

### 2. **Detalle de Tickets**
- Lista completa de tickets con toda la información
- Tiempos de respuesta y resolución
- Estado de cumplimiento de SLA
- Filtros automáticos en Excel

### 3. **Métricas por Agente**
- Rendimiento individual de cada agente
- Cumplimiento de SLA por agente
- Comparativa entre agentes

### 4. **Métricas por Equipo**
- Rendimiento por equipo/grupo
- Cumplimiento de SLA por equipo
- Comparativa entre equipos

## 🗂️ Estructura del Proyecto

```
zammad-sla-reporter/
├── config/
│   └── database.js          # Configuración de PostgreSQL
├── services/
│   ├── slaService.js        # Lógica de consultas y métricas
│   └── excelService.js      # Generación de reportes Excel
├── routes/
│   └── api.js               # Endpoints de la API
├── public/
│   ├── index.html           # Interfaz web
│   ├── styles.css           # Estilos
│   └── app.js               # Lógica del frontend
├── server.js                # Servidor Express principal
├── package.json             # Dependencias
├── .env.example             # Plantilla de configuración
└── README.md               # Este archivo
```

## 🔍 Solución de Problemas

### Error: No se puede conectar a la base de datos

**Soluciones**:
1. Verifica que la VPN esté activa
2. Confirma que las credenciales en `.env` sean correctas
3. Verifica que el host y puerto sean accesibles
4. Prueba la conexión con psql:
   ```bash
   psql -h tu-host -p 5432 -U tu_usuario -d zammad_production
   ```

### Error: No se cargan los grupos o agentes

**Causa**: La estructura de la base de datos de Zammad puede variar según la versión

**Solución**: Verifica las tablas y columnas en tu instalación de Zammad y ajusta las consultas en `services/slaService.js` si es necesario

### El reporte Excel se descarga vacío

**Soluciones**:
1. Verifica que existan tickets en el rango de fechas seleccionado
2. Revisa la consola del navegador y del servidor para errores
3. Intenta con filtros más amplios (sin filtrar por equipo o agente)

## 🎨 Personalización

### Modificar las reglas de negocio SLA

Edita el archivo `services/slaService.js` en el método `getTicketsWithSLA()` para ajustar:
- Cálculos de tiempo
- Criterios de cumplimiento
- Campos adicionales

### Cambiar el formato del Excel

Edita `services/excelService.js` para:
- Modificar colores y estilos
- Agregar hojas adicionales
- Cambiar formato de números y fechas

### Personalizar la interfaz

Modifica `public/styles.css` y `public/index.html` para cambiar:
- Colores y tema
- Diseño de componentes
- Campos de filtros adicionales

## 📝 Notas Importantes

- **Seguridad**: Nunca compartas tu archivo `.env` ni lo subas a repositorios públicos
- **Rendimiento**: Para bases de datos muy grandes, considera agregar índices en PostgreSQL
- **VPN**: El sistema requiere que la VPN esté activa durante toda la sesión
- **Zona Horaria**: Ajusta `TIMEZONE` en `.env` según tu ubicación

## 🤝 Soporte

Si encuentras problemas o necesitas personalizar el sistema para tus necesidades específicas, revisa:

1. Los logs del servidor en la consola
2. La consola del navegador (F12)
3. La documentación de Zammad: https://docs.zammad.org/

## 📄 Licencia

Este proyecto es de uso interno. Personaliza según tus necesidades.
