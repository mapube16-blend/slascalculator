# Blend 360 - Reportes SLA para Zammad

Sistema de reportes de Acuerdos de Nivel de Servicio (SLA) para tickets de Zammad. Permite visualizar métricas, cumplimiento de SLA y exportar informes en Excel.

## Requisitos

- Node.js 20+ (solo para desarrollo local)
- Acceso a la base de datos PostgreSQL de Zammad
- Docker y Docker Compose (para producción)
- VPN corporativa (para acceder a la EC2 y al RDS)

## Estructura del proyecto

```
zammad-sla-reporter/
├── backend/                  # API Express (Node.js)
│   ├── server.js             # Servidor principal
│   ├── Dockerfile            # Imagen multi-stage: compila frontend + backend
│   ├── routes/               # Endpoints API
│   ├── services/             # Lógica de negocio (SLA, Excel, exportación)
│   ├── cron/                 # Jobs programados (exportación a S3/QuickSight)
│   ├── middleware/           # Middleware Express
│   ├── utils/                # Utilidades (logger)
│   └── config/               # Base de datos, constantes (UTC offset, estados, SLA targets)
├── frontend/                 # App React (Vite)
│   ├── src/                  # Código fuente React
│   │   ├── components/       # Componentes UI reutilizables y de negocio
│   │   ├── context/          # Estado global (AppContext)
│   │   ├── pages/            # Páginas de la aplicación
│   │   └── services/         # Llamadas a la API
│   └── public/               # Assets estáticos (logo)
├── .github/workflows/        # CI/CD: build → push a GHCR → deploy en EC2
├── aws/                      # Scripts de infraestructura AWS (S3, Glue)
├── docker-compose.yml        # Orquestación de contenedores en producción
├── .env.example              # Plantilla de variables de entorno
└── DATABASE_DICTIONARY.md    # Diccionario de la base de datos de Zammad
```

## Desarrollo local

1. Configurar variables de entorno:
```bash
cp .env.example backend/.env
```
Editar `backend/.env` con las credenciales reales de la base de datos.

2. Instalar dependencias:
```bash
npm run install:all
```

3. Iniciar en modo desarrollo (backend + frontend con hot reload):
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

## Producción

### Infraestructura

| Componente | Servicio | Detalle |
|---|---|---|
| Backend + Frontend | EC2 (Node.js directo) | `10.67.4.151` (IP privada, requiere VPN) |
| Base de datos | RDS PostgreSQL | Base de datos de Zammad (solo lectura) |
| Registro de imágenes | GitHub Container Registry (GHCR) | `ghcr.io/mapube16/zammad-sla-reporter-backend` |
| Puerto | 443 | Expuesto directamente por Node.js (`sudo setcap` para bind sin root) |

### CI/CD automático

El proyecto usa GitHub Actions para despliegue continuo. Cada push a `main`:

1. **Build**: Construye la imagen Docker (multi-stage: compila el frontend React con Vite, luego monta el backend Node.js con el `dist/` incluido).
2. **Push**: Sube la imagen a GitHub Container Registry (GHCR).
3. **Deploy**: Intenta conectarse a la EC2 por SSH — **este paso falla** porque la EC2 está en red privada (`10.67.4.151`) sin acceso desde internet. El deploy siempre se hace manualmente (ver abajo).

```
git push origin main  →  GitHub Actions  →  GHCR  ✓
                                          →  SSH deploy a EC2  ✗ (IP privada, sin acceso desde internet)
```

> **Importante:** Solo los pasos de Build y Push funcionan automáticamente. El deploy en EC2 siempre requiere intervención manual.

**Secrets requeridos en el repositorio GitHub** (`Settings → Secrets and variables → Actions`):

| Secret | Descripción |
|---|---|
| `DEPLOY_HOST` | IP o hostname de la EC2 |
| `DEPLOY_USER` | Usuario SSH (ej. `ec2-user`) |
| `DEPLOY_SSH_KEY` | Clave privada SSH (contenido del `.pem`) |
| `DEPLOY_PORT` | Puerto SSH (por defecto `22`) |
| `DEPLOY_PATH` | Ruta en la EC2 donde está el `docker-compose.yml` |

### Desplegar cambios

**Paso 1 — Push (automático via CI):**
```bash
git add .
git commit -m "descripcion del cambio"
git push origin main
```

El pipeline de GitHub Actions construye y sube la imagen a GHCR automáticamente. El pipeline puede verse en `Actions` del repositorio GitHub.

**Paso 2 — Deploy manual en EC2:**

```bash
# 1. Conectarse a la EC2 (requiere VPN activa)
ssh -i "nuv-prod-ai-servicecenter-informespk 1.pem" ec2-user@10.67.4.151

# 2. Ir al directorio del proyecto y traer cambios
cd /home/ec2-user/slascalculator
git pull origin main

# 3. Instalar dependencias (si hay cambios en package.json)
cd backend && npm install && cd ..

# 4. Reiniciar el servidor
pkill -f "node server.js"
cd backend
nohup node server.js > /home/ec2-user/app.log 2>&1 &

# 5. Verificar que levantó correctamente
tail -f /home/ec2-user/app.log
```

**Comandos útiles en producción:**

```bash
# Ver logs en tiempo real
tail -f /home/ec2-user/app.log

# Verificar que el proceso está corriendo
ps aux | grep "node server.js"

# Ver qué proceso escucha en el puerto 443
sudo lsof -i :443

# Habilitar binding al puerto 443 sin root (hacer una sola vez si cambia el binario de node)
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

> **Nota:** El servidor corre directamente con Node.js (`nohup node server.js`), no con Docker. El `PORT=443` está configurado en `backend/.env`.

### URL de la aplicación

```
http://10.67.4.151
```
Requiere VPN corporativa activa (puerto 443, no es necesario especificarlo en la URL).

## Calendarios SLA soportados

| Tipo | Horario | Horas/día | Días | Festivos Colombia |
|---|---|---|---|---|
| `laboral` | 8:00–17:00 | 9 h | Lunes a Viernes | Excluidos |
| `continuo` | 8:00–18:00 | 10 h | Lunes a Viernes | No excluidos |
| `24x7` | 00:00–24:00 | 24 h | Todos los días | No excluidos |

## API — Endpoint principal

### `POST /api/metrics`

Retorna métricas SLA filtradas.

**Request Body (todos los campos son opcionales):**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-02-28",
  "organizationId": 5,
  "ownerId": 10,
  "state": "Abierto",
  "type": "Incidente",
  "calendarType": "laboral"
}
```

## API — Exportación para AWS QuickSight

### `POST /api/export/quicksight`

Retorna toda la data de SLA en formato aplanado (sin objetos anidados), listo para ser consumido por una Lambda de AWS y escrito a S3 como Parquet para QuickSight.

**Request Body (todos los campos son opcionales):**
```json
{
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-02-28T23:59:59Z",
  "organizationId": 5,
  "ownerId": 10,
  "state": "Abierto",
  "type": "Incidente",
  "calendarType": "laboral"
}
```

**Response:**
```json
{
  "success": true,
  "metadata": {
    "exported_at": "2026-02-23T20:53:00.000Z",
    "filters_applied": {},
    "total_records": 245
  },
  "data": {
    "tickets": [
      {
        "ticket_id": 1001,
        "ticket_number": "1001",
        "title": "No puedo acceder al sistema",
        "type": "Incidente",
        "state": "Cerrado",
        "priority": "Media",
        "organization": "[P2068] UNA - Contrato 4",
        "empresa": "Universidad Nacional",
        "owner": "Juan Perez",
        "customer": "Maria Lopez",
        "created_at": "2026-01-15T14:30:00.000Z",
        "close_at": "2026-01-17T19:45:00.000Z",
        "hightech_time_minutes": 240,
        "client_time_minutes": 120,
        "first_response_time_minutes": 45,
        "sla_first_response_target_minutes": 240,
        "sla_resolution_target_minutes": 3360,
        "first_response_sla_met": true,
        "resolution_sla_met": true
      }
    ],
    "summary": {
      "total_tickets": 245,
      "closed_tickets": 180,
      "open_tickets": 65,
      "first_response_compliance_rate": "85.71",
      "resolution_compliance_rate": "79.59"
    },
    "by_agent": [...],
    "by_organization": [...],
    "by_type": [...]
  }
}
```

### Pipeline AWS QuickSight (CRON → S3 → Glue → QuickSight)

```
EC2 CRON (2:00 AM COT)          Glue Crawler (2:30 AM COT)         QuickSight
       │                                │                              │
       ▼                                ▼                              ▼
  Zammad DB ──► Parquet ──► S3 ──► Glue Data Catalog ──► Athena ──► SPICE Dataset
  (PostgreSQL)   (7 tablas)   │         (auto-discover)
                              │
                              └── sla-data/
                                    ├── tickets/data.parquet
                                    ├── ticket_timeline/data.parquet
                                    ├── summary/data.parquet
                                    ├── by_agent/data.parquet
                                    ├── by_organization/data.parquet
                                    ├── by_type/data.parquet
                                    └── metadata/data.parquet
```

**Tablas en Glue Data Catalog:**

| Tabla | Descripción | Registros aprox |
|---|---|---|
| `tickets` | Todos los tickets con métricas SLA aplanadas | ~1,700+ |
| `ticket_timeline` | Historial de cambios de estado por ticket | ~10,000+ |
| `summary` | Resumen global de cumplimiento SLA | 1 |
| `by_agent` | Métricas SLA por agente | ~15 |
| `by_organization` | Métricas SLA por organización/proyecto | ~20 |
| `by_type` | Conteo de tickets por tipo (Incidente, RFC) | ~5 |
| `metadata` | Timestamp y versión de la exportación | 1 |

**Costos estimados:**

| Servicio | Costo/mes |
|---|---|
| S3 (storage ~50MB + PUTs) | ~$0.02 |
| Glue Crawler (1 run/día x 30 días) | ~$0.30 |
| Glue Data Catalog (7 tablas) | $0.00 (free tier) |
| QuickSight Author (1 usuario) | $12-24 |
| **Total** | **~$12-25** |

### Desplegar infraestructura AWS

```bash
# 1. Desplegar S3 + Glue + IAM
./aws/deploy-infra.sh

# 2. Ver outputs (bucket name, crawler name, instance profile)
./aws/deploy-infra.sh --outputs

# 3. Agregar variables al .env en la EC2
#   AWS_S3_BUCKET=<bucket-name-del-output>
#   AWS_GLUE_CRAWLER_NAME=<crawler-name-del-output>
#   AWS_REGION=us-east-1

# 4. Asociar el Instance Profile a la EC2
aws ec2 associate-iam-instance-profile \
  --instance-id <INSTANCE-ID> \
  --iam-instance-profile Name=zammad-sla-reporter-ec2-profile-prod

# 5. Ejecutar el CRON manualmente para verificar
cd /home/ec2-user/slascalculator/backend
node -e "require('./cron/sla-exporter-cron').exportSLAToQuickSight().then(console.log)"

# 6. Conectar QuickSight:
#    QuickSight → Datasets → New dataset → Athena
#    Database: zammad_sla_db
#    Tables: tickets, summary, by_agent, etc.
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DB_HOST` | Host de PostgreSQL (Zammad) | `xxx.rds.amazonaws.com` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `postgres` |
| `DB_USER` | Usuario de la base de datos | `cloud` |
| `DB_PASSWORD` | Contraseña de la base de datos | `****` |
| `PORT` | Puerto del servidor | `443` (producción) / `3000` (desarrollo local) |
| `TIMEZONE` | Zona horaria del servidor | `America/Bogota` |
| `CORS_ORIGIN` | Dominios permitidos para CORS (separar con coma) | `*` |
| `SERVE_FRONTEND` | Servir frontend desde Express (`false` si está en S3) | `true` |
| `AWS_S3_BUCKET` | Bucket S3 para Parquet (pipeline) | `zammad-sla-reporter-prod-123456` |
| `AWS_S3_PREFIX` | Prefijo S3 de los datos | `sla-data` |
| `AWS_REGION` | Región AWS | `us-east-1` |
| `AWS_GLUE_CRAWLER_NAME` | Nombre del Glue Crawler | `zammad-sla-reporter-crawler-latest-prod` |

## Repositorio

```
https://github.com/mapube16/slascalculator.git
```
