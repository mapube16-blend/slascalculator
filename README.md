# Blend 360 - Reportes SLA para Zammad

Sistema de análisis y generación de reportes de Acuerdos de Nivel de Servicio (SLA) para tickets de Zammad. Esta aplicación permite visualizar métricas clave, cumplimiento de SLA y exportar informes detallados en Excel.

##  Características

*   **Tablero de Control (Dashboard):** Visualización gráfica de cumplimiento de SLA, estado de tickets y carga de trabajo por agente.
*   **Cálculo de SLA Personalizado:** Soporte para diferentes calendarios (Horario Laboral, 24/7, Extendido) y exclusión de tiempos en estados de espera ("Tiempo Hightech" vs "Tiempo Cliente").
*   **Filtros Avanzados:** Filtrado por fecha, proyecto, agente, estado y tipo de solicitud.
*   **Detalle de Tickets:** Vista detallada con línea de tiempo (timeline) de los cambios de estado y duración en cada etapa.
*   **Exportación a Excel:** Generación de reportes en Excel que incluye:
    *   Dashboard gráfico (imágenes de las gráficas actuales).
    *   Resumen ejecutivo.
    *   Detalle completo de tickets.
*   **Verificación de VPN:** Middleware de seguridad que valida la conexión a la base de datos antes de permitir el acceso.

## 📋 Requisitos Previos

*   Node.js (v14 o superior)
*   Acceso a la base de datos PostgreSQL de Zammad.
*   Conexión VPN activa (si la base de datos está en una red privada).

## ️ Instalación

1.  Clonar el repositorio:
    ```bash
    git clone <url-del-repositorio>
    cd zammad-sla-reporter
    ```

2.  Instalar dependencias:
    ```bash
    npm install
    ```

## ⚙️ Configuración

Crea un archivo `.env` en la raíz del proyecto con las credenciales de tu base de datos:

```env
DB_HOST=192.168.x.x
DB_PORT=5432
DB_NAME=zammad
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
PORT=3000
```

## ▶️ Ejecución

Para iniciar el servidor:

```bash
npm start
```

Para desarrollo (con reinicio automático):

```bash
npm run dev
```

Accede a la aplicación en: `http://localhost:3000`

## 📂 Estructura del Proyecto

*   `public/`: Frontend (HTML, CSS, JS, Assets).
*   `routes/`: Endpoints de la API (`api.js`).
*   `services/`: Lógica de negocio (`slaService.js`, `excelService.js`, `workingHoursService.js`).
*   `config/`: Configuración de base de datos (`database.js`).
*   `server.js`: Servidor Express y configuración principal.