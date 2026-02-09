# 📋 Estructura del Reporte Detallado - ACTUALIZADO

## ✅ Campos Implementados (usando vista_reportes_zammad)

| # | Campo | Estado | Fuente |
|---|-------|--------|--------|
| 1 | Número | ✅ | vista.numero_caso |
| 2 | Creado en | ✅ | vista.fechacreacion |
| 3 | Tipo de Solicitud | ✅ | vista.tipocaso |
| 4 | Estado | ✅ | vista.estado |
| 5 | Proyecto | ✅ | vista.nombre_organizacion |
| 6 | Título | ✅ | vista.titulo |
| 7 | Prioridad | ✅ | vista.prioridad_nombre |
| 8 | Asignado a | ✅ | vista.nombre_asignado |
| 9 | Resp. Técnico Service Desk | ✅ | vista.responsable_cambio_estado |
| 10 | Resp. Funcional Service Desk | ✅ | vista.responsable_estado_actual |
| 11 | Última Modificación | ✅ | vista.fechaactualizacion |
| 12 | Tiempo Hightech | ✅ | vista.tiempo_neto_sla_minutos |
| 13 | Tiempo Cliente | ✅ | vista.tiempo_en_espera_minutos |

---

## 📊 Vista Base: vista_reportes_zammad

Esta vista proporciona **41 columnas** pre-calculadas con:

### Información Básica
- numero_caso
- titulo
- tipocaso
- estado
- estado_actual
- ticket_cerrado

### Fechas
- fechacreacion
- fechacierre
- fechaactualizacion
- fecha_entrada_estado

### Personas
- nombre_grupo (equipo)
- nombre_asignado (agente)
- email_asignado
- nombre_organizacion (proyecto)
- responsable_cambio_estado (técnico)
- email_responsable_cambio
- responsable_estado_actual (funcional)
- email_responsable_estado_actual

### Tiempos (ya en minutos)
- **duracion_total_minutos** - Total del ticket
- **tiempo_en_espera_minutos** - Cliente esperando
- **tiempo_neto_sla_minutos** - Tiempo Hightech (SLA neto)
- **duracion_estado_minutos** - Duración en estado actual
- **limite_sla_minutos** - SLA límite
- **horas_efectivas_sla** - Horas efectivas
- **horas_totales** - Total en horas
- **horas_en_espera** - Horas esperando
- **porcentaje_sla_cumplido** - % SLA
- **minutos_restantes_sla** - Minutos restantes
- **en_riesgo_sla** - En riesgo?
- **estado_sla** - Estado del SLA

### Análisis
- prioridad_nombre
- metrica_atendido
- metrica_en_gestion
- total_casos_validacion

### Análisis Temporal
- semana_creacion_inicio
- anio_creacion
- mes_creacion
- anio_mes_creacion
- dia_semana_creacion
- numero_semana

---

## ⏱️ Cálculo de Tiempos

### Tiempo Hightech
**Fuente:** vista.tiempo_neto_sla_minutos
- Minutos que Hightech estuvo trabajando
- Ya **excluye estados**: Espera, Resuelto, Cerrado
- Calculado por la vista de reportes

### Tiempo Cliente
**Fuente:** vista.tiempo_en_espera_minutos
- Minutos esperando respuesta del cliente
- Solo cuando estado = Espera
- Calculado por la vista de reportes

---

## 📝 Consulta Base

```sql
SELECT 
  numero_caso as ticket_number,
  titulo as title,
  tipocaso as ticket_type,
  estado as state_name,
  fechacreacion as created_at,
  fechacierre as close_at,
  fechaactualizacion as updated_at,
  prioridad_nombre as priority_name,
  nombre_asignado as owner_name,
  responsable_cambio_estado as technical_responsible,
  responsable_estado_actual as functional_responsible,
  nombre_organizacion as organization_name,
  duracion_total_minutos as total_duration_minutes,
  tiempo_en_espera_minutos as waiting_time_minutes,
  tiempo_neto_sla_minutos as net_sla_minutes,
  porcentaje_sla_cumplido as sla_compliance_percentage,
  en_riesgo_sla as sla_at_risk
FROM vista_reportes_zammad
WHERE 1=1
ORDER BY fechacreacion DESC
```

---

## 🎯 Reporte Excel Generado

### Estructura (13 columnas)

```
A      B        C                D       E           F       G          H            I                J                 K                L                M
Número | Creado en | Tipo Solicitud | Estado | Proyecto | Título | Prioridad | Asignado a | Resp.Técnico | Resp.Funcional | Última Modif. | Tiempo Hightech | Tiempo Cliente
```

---

