# 📊 Diccionario de Base de Datos - Zammad

**Última actualización:** 6 de febrero de 2026  
**Total de tablas en la BD:** 124 tablas  
**Base de datos:** PostgreSQL  

---

## 📋 TABLAS PRINCIPALES

### 1. TICKETS - Casos/Tickets/Solicitudes (1,320 registros)

Tabla principal que contiene todos los tickets/casos del sistema.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único del ticket |
| number | varchar | No | Número único del ticket (ej: 1001, 1002) |
| title | varchar | No | Título/Asunto del ticket |
| type | varchar | Sí | Tipo de solicitud (Incident, Request, etc.) |
| group_id | integer | No | FK a groups (equipo asignado) |
| owner_id | integer | No | FK a users (agente responsable) |
| customer_id | integer | No | FK a users (cliente/solicitante) |
| organization_id | integer | Sí | FK a organizations (empresa/proyecto) |
| priority_id | integer | No | FK a ticket_priorities (1=Baja, 2=Media, 3=Alta, 4=Muy Alta, 5=Urgente) |
| state_id | integer | No | FK a ticket_states (Nuevo, Abierto, En Espera, Resuelto, Cerrado, etc.) |
| article_count | integer | Sí | Cantidad de artículos/comentarios |
| create_article_type_id | integer | Sí | FK a ticket_article_types |
| create_article_sender_id | integer | Sí | FK a ticket_article_senders |
| first_response_at | timestamp | Sí | Fecha de primera respuesta |
| first_response_escalation_at | timestamp | Sí | Límite SLA primera respuesta |
| first_response_in_min | integer | Sí | Minutos SLA esperados primera respuesta |
| first_response_diff_in_min | integer | Sí | Diferencia en minutos vs SLA |
| close_at | timestamp | Sí | Fecha de cierre del ticket |
| close_escalation_at | timestamp | Sí | Límite SLA resolución |
| close_in_min | integer | Sí | Minutos SLA esperados para cierre |
| close_diff_in_min | integer | Sí | Diferencia en minutos vs SLA |
| last_close_at | timestamp | Sí | Último cierre (puede reabrir) |
| last_contact_at | timestamp | Sí | Último contacto (agente o cliente) |
| last_contact_agent_at | timestamp | Sí | Último contacto del agente |
| last_contact_customer_at | timestamp | Sí | Último contacto del cliente |
| last_owner_update_at | timestamp | Sí | Última actualización del responsable |
| pending_time | timestamp | Sí | Tiempo pendiente |
| escalation_at | timestamp | Sí | Fecha de escalación |
| created_at | timestamp | No | Fecha de creación |
| updated_at | timestamp | No | Última modificación |
| created_by_id | integer | No | FK a users (quién creó) |
| updated_by_id | integer | No | FK a users (quién último actualizó) |
| **CAMPOS CUSTOMIZADOS (bld_)** | | |
| bld_cliente | varchar | Sí | Cliente personalizado |
| bld_cliente_padre | varchar | Sí | Cliente padre (inherited from organization) |
| bld_projects | varchar | Sí | Proyectos asociados |
| bld_responsable | varchar | Sí | Responsable técnico |
| bld_ticket_fase | varchar | Sí | Fase del ticket |
| bld_ticket_espera_motivo | varchar | Sí | Motivo de espera |
| bld_prority_customer | varchar | Sí | Prioridad del cliente |
| bld_aprueba_cierre | varchar | Sí | Aprobación de cierre |
| bld_motivo_resuelto | varchar | Sí | Motivo de resolución |
| impact | varchar | Sí | Impacto |
| urgency | varchar | Sí | Urgencia |
| checklist_id | integer | Sí | FK a checklists |

**Foreign Keys:**
- group_id → groups(id)
- owner_id → users(id)
- customer_id → users(id)
- organization_id → organizations(id)
- priority_id → ticket_priorities(id)
- state_id → ticket_states(id)

---

### 2. ORGANIZATIONS - Empresas/Clientes/Proyectos (116 registros)

Almacena información de empresas, clientes y proyectos.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| name | varchar | No | Nombre del proyecto (ej: [P2068] UNA - Contrato 4) |
| active | boolean | No | ¿Está activa? |
| shared | boolean | No | ¿Es compartida? |
| vip | boolean | No | ¿Es VIP? |
| domain | varchar | Sí | Dominio asociado |
| domain_assignment | boolean | No | Auto-asignación por dominio |
| note | varchar | Sí | Notas internas |
| created_at | timestamp | No | Fecha de creación |
| updated_at | timestamp | No | Última actualización |
| created_by_id | integer | No | FK a users |
| updated_by_id | integer | No | FK a users |
| **CAMPOS CUSTOMIZADOS (bld_)** | | |
| bld_cliente_padre | varchar | Sí | ID del cliente padre (1-26) |
| bld_fecha_inicio_proyecto | date | Sí | Fecha inicio proyecto |
| bld_fecha_fin_proyectos | date | Sí | Fecha fin proyecto |

**Mapeo bld_cliente_padre:**
```
1=Policía Nacional, 2=Universidad Nacional, 3=Coljuegos, 4=Alcaldía de Cali,
5=Banco Interamericano, 6=Blend360, 7=BTG, 8=Cámara de Comercio Cali,
9=Consejo Superior Judicatura, 10=DIAN, 11=Fiduagraria, 12=Financiera DN,
13=Fondo Adaptación, 14=ICFES, 15=Justicia Penal, 16=Metro Medellín,
17=MinTIC, 18=Sanidad, 19=Secretaría Distrital Hábitat, 20=Superintendencia Servicios,
21=Superintendencia Sociedades, 22=UAECAD, 23=Universidad Caldas,
24=Universidad Bosque, 25=Instituto Geográfico Militar, 26=Progresión
```

---

### 3. USERS - Usuarios/Agentes/Clientes (368 registros)

Gestiona todos los usuarios del sistema: agentes de soporte, clientes, administradores.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| login | varchar | No | Nombre de usuario (para login) |
| firstname | varchar | Sí | Nombre |
| lastname | varchar | Sí | Apellido |
| email | varchar | Sí | Email |
| phone | varchar | Sí | Teléfono |
| mobile | varchar | Sí | Celular |
| fax | varchar | Sí | Fax |
| department | varchar | Sí | Departamento |
| organization_id | integer | Sí | FK a organizations |
| active | boolean | No | ¿Usuario activo? |
| verified | boolean | No | ¿Email verificado? |
| vip | boolean | No | ¿Es VIP? |
| out_of_office | boolean | No | ¿Fuera de oficina? |
| out_of_office_start_at | date | Sí | Inicio fuera de oficina |
| out_of_office_end_at | date | Sí | Fin fuera de oficina |
| out_of_office_replacement_id | integer | Sí | FK a users (reemplazo) |
| last_login | timestamp | Sí | Último login |
| password | varchar | Sí | Contraseña (hasheada) |
| image | varchar | Sí | Avatar/imagen |
| note | varchar | Sí | Notas |
| created_at | timestamp | No | Fecha de creación |
| updated_at | timestamp | No | Última actualización |
| created_by_id | integer | No | FK a users |
| updated_by_id | integer | No | FK a users |

---

### 4. TICKET_STATES - Estados de Tickets (8 registros)

Define los estados posibles de los tickets.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único (1-8) |
| name | varchar | No | Nombre estado (Nuevo, Abierto, En Espera, Resuelto, Cerrado, etc.) |
| state_type_id | integer | No | FK a ticket_state_types |
| next_state_id | integer | Sí | Siguiente estado permitido |
| ignore_escalation | boolean | No | Ignorar escalación en este estado |
| default_create | boolean | No | Estado por defecto al crear |
| default_follow_up | boolean | No | Estado por defecto en seguimiento |
| active | boolean | No | ¿Activado? |
| note | varchar | Sí | Notas |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

**Estados típicos:**
- Nuevo (new)
- Abierto (open)
- En Espera (pending)
- Resuelto (solved)
- Cerrado (closed)

---

### 5. TICKET_PRIORITIES - Prioridades (5 registros)

Define los niveles de prioridad disponibles.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único (1-5) |
| name | varchar | No | Nombre (Baja, Media, Alta, Muy Alta, Urgente) |
| default_create | boolean | No | Prioridad por defecto |
| ui_icon | varchar | Sí | Ícono en interfaz |
| ui_color | varchar | Sí | Color en interfaz |
| active | boolean | No | ¿Activa? |
| note | varchar | Sí | Notas |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

---

### 6. TICKET_ARTICLES - Artículos/Comentarios (13,684 registros)

Cada comentario, email, nota de un ticket es un artículo.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| ticket_id | integer | No | FK a tickets |
| type_id | integer | No | FK a ticket_article_types (email, note, phone, etc.) |
| sender_id | integer | No | FK a ticket_article_senders (Customer, Agent, System) |
| from | varchar | Sí | De (email/nombre) |
| to | varchar | Sí | Para |
| cc | varchar | Sí | Con copia |
| subject | varchar | Sí | Asunto |
| body | text | No | Contenido del artículo |
| internal | boolean | No | ¿Es nota interna? |
| content_type | varchar | No | Tipo MIME |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |
| created_by_id | integer | No | FK a users |
| updated_by_id | integer | No | FK a users |

---

### 7. HISTORIES - Historial de Cambios (112,338 registros)

Registra todos los cambios en los tickets.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| o_id | integer | No | ID del objeto modificado (ej: ticket_id) |
| history_type_id | integer | No | FK a history_types |
| history_object_id | integer | No | FK a history_objects (Ticket, etc.) |
| history_attribute_id | integer | Sí | FK a history_attributes (qué campo cambió) |
| value_from | varchar | Sí | Valor anterior |
| value_to | varchar | Sí | Valor nuevo |
| id_from | integer | Sí | ID anterior (para relaciones) |
| id_to | integer | Sí | ID nuevo (para relaciones) |
| created_by_id | integer | No | FK a users (quién hizo el cambio) |
| created_at | timestamp | No | Fecha del cambio |
| updated_at | timestamp | No | Última actualización |

**history_attribute_id importantes:**
- 13: Estado (state)
- Otros: ver tabla history_attributes

---

### 8. HISTORY_ATTRIBUTES - Atributos de Historial (54 registros)

Define qué campos pueden cambiar y se registran en histories.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| name | varchar | No | Nombre del atributo (state, owner, priority, etc.) |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

**Ejemplos:**
- state: Estado del ticket
- owner: Propietario/Asignado a
- priority: Prioridad
- customer: Cliente

---

### 9. GROUPS - Equipos/Departamentos (11 registros)

Agrupa agentes en departamentos o equipos de soporte.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| name | varchar | No | Nombre del equipo |
| name_last | varchar | No | Nombre anterior |
| parent_id | integer | Sí | ID del grupo padre |
| email_address_id | integer | Sí | FK a email_addresses |
| signature_id | integer | Sí | FK a signatures |
| active | boolean | No | ¿Activo? |
| shared_drafts | boolean | No | ¿Permite borradores compartidos? |
| follow_up_possible | varchar | No | ¿Permite seguimientos? |
| reopen_time_in_days | integer | Sí | Días para reabrir automáticamente |
| assignment_timeout | integer | Sí | Timeout para asignación |
| note | varchar | Sí | Notas |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

---

### 10. SLAS - Acuerdos de Nivel de Servicio (8 registros)

Define los SLAs (tiempos de respuesta y resolución).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| calendar_id | integer | No | FK a calendars (horario laboral) |
| name | varchar | Sí | Nombre del SLA |
| first_response_time | integer | Sí | Minutos para primera respuesta |
| response_time | integer | Sí | Minutos para respuesta general |
| update_time | integer | Sí | Minutos para actualización |
| solution_time | integer | Sí | Minutos para solución |
| condition | text | Sí | Condición JSON (ej: estado, prioridad, etc.) |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

---

### 11. CALENDARS - Calendarios Laborales (2 registros)

Define horarios de trabajo y festivos para cálculo de SLAs.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| name | varchar | Sí | Nombre (ej: Bogota/Colombia) |
| timezone | varchar | Sí | Zona horaria (America/Bogota) |
| business_hours | varchar | Sí | JSON con horarios por día |
| default | boolean | No | ¿Calendario por defecto? |
| public_holidays | text | Sí | JSON con festivos de Colombia |
| ical_url | varchar | Sí | URL para sincronizar festivos |
| last_sync | timestamp | Sí | Última sincronización |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

---

### 12. TICKET_ARTICLES_TYPES - Tipos de Artículos (14 registros)

Tipos de artículos: email, nota interna, llamada, etc.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| name | varchar | No | Nombre (email, note, phone, etc.) |
| communication | boolean | No | ¿Es comunicación externa? |
| active | boolean | No | ¿Activo? |
| note | varchar | Sí | Notas |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

---

### 13. TICKET_ARTICLE_SENDERS - Remitentes de Artículos (3 registros)

Quién envía el artículo.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| name | varchar | No | Nombre (Customer, Agent, System) |
| note | varchar | Sí | Notas |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

---

### 14. TAGS - Etiquetas (584 registros)

Sistema de etiquetado flexible.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| o_id | integer | No | ID del objeto (ticket, etc.) |
| tag_object_id | integer | No | FK a tag_objects (qué tipo de objeto) |
| tag_item_id | integer | No | FK a tag_items (la etiqueta) |
| created_by_id | integer | No | FK a users |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

---

### 15. TAG_ITEMS - Valores de Etiquetas (87 registros)

Valores únicos de etiquetas.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| name | varchar | No | Nombre de la etiqueta |
| name_downcase | varchar | No | Nombre en minúsculas |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

---

### 16. TAG_OBJECTS - Tipos de Objetos Etiquetables (2 registros)

Define qué objetos pueden ser etiquetados (Ticket, User, etc.).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| name | varchar | No | Nombre del tipo (Ticket, User) |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

---

### 17. OBJECT_MANAGER_ATTRIBUTES - Campos Customizados (71 registros)

Define campos personalizados agregados a diferentes objetos.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| id | integer | No | ID único |
| object_lookup_id | integer | No | FK a object_lookups |
| name | varchar | No | Nombre del campo (bld_cliente, etc.) |
| display | varchar | No | Nombre para mostrar |
| data_type | varchar | No | Tipo (text, select, date, etc.) |
| data_option | text | Sí | Opciones JSON |
| editable | boolean | No | ¿Editable? |
| active | boolean | No | ¿Activo? |
| screens | varchar | Sí | Pantallas donde aparece |
| position | integer | No | Posición en formulario |
| created_at | timestamp | No | Fecha creación |
| updated_at | timestamp | No | Última actualización |

---

## 🔗 RELACIONES PRINCIPALES

```
organizations (Empresas/Proyectos)
  ├─ 1:N → tickets
  └─ Some have custom fields (bld_cliente_padre, bld_fecha_inicio_proyecto)

tickets (Casos principales)
  ├─ M:1 → organizations (project/company)
  ├─ M:1 → users (owner_id = agent assigned)
  ├─ M:1 → users (customer_id = who reported)
  ├─ M:1 → groups (support team)
  ├─ M:1 → ticket_states (current state)
  ├─ M:1 → ticket_priorities (priority level)
  ├─ M:1 → slas (SLA applied)
  ├─ 1:N → ticket_articles (comments/emails)
  ├─ 1:N → histories (change log)
  └─ 1:N → tags (labels)

ticket_articles (Comments/Emails)
  ├─ M:1 → tickets
  ├─ M:1 → ticket_article_types
  ├─ M:1 → ticket_article_senders
  └─ M:1 → users (who created)

histories (Change Log)
  ├─ M:1 → tickets (o_id = ticket_id)
  ├─ M:1 → history_attributes (what field changed)
  ├─ M:1 → history_types (create, update, delete)
  └─ M:1 → users (who made the change)

tags
  ├─ M:1 → tickets (o_id)
  ├─ M:1 → tag_items (label value)
  └─ M:1 → tag_objects (object type)

slas
  └─ M:1 → calendars (working hours calendars)

groups
  ├─ 1:N → tickets
  ├─ M:1 → email_addresses
  ├─ M:1 → signatures
  └─ M:1 → groups (parent_id)
```

---

## 🔍 VISTAS Y TABLAS ESPECIALES GENERADAS

Existen 4 vistas (v_* y vista_*) creadas para reportes:

1. **v_estado_casos** - Estado de casos
2. **v_tiempos_ans** - Tiempos SLA
3. **v_diferencia_diaria_casos** - Diferencia diaria de casos
4. **v_estado__general_casos** / **v2_estado_general_casos** - Estado general
5. **vista_reportes_zammad** - Reportes Zammad

Estas vistas contienen datos pre-calculados para reportes.

---

## 📊 LISTA COMPLETA DE TABLAS (124 TOTAL)

### Tablas de Tickets y Artículos (9)
ticket_articles, ticket_article_flags, ticket_article_senders, ticket_article_types, ticket_counters, ticket_priorities, ticket_shared_draft_starts, ticket_shared_draft_zooms, ticket_state_types, ticket_states, ticket_time_accounting_types,
ticket_time_accountings, tickets

### Usuarios y Autorización (9)
users, user_devices, user_overview_sortings, user_two_factor_preferences, authorizations, tokens, email_addresses, roles, roles_groups, roles_users

### Organizaciones y Grupos (8)
organizations, organizations_users, groups, groups_users, groups_macros, groups_text_modules, permissions, permissions_roles

### Historial y Cambios (8)
histories, history_attributes, history_objects, history_types, activity_streams, activity_stream_objects, activity_stream_types

### SLA y Horarios (5)
slas, calendars, ticket_time_accounting_types, ticket_time_accountings

### Etiquetas (3)
tags, tag_items, tag_objects

### Gestión de Contenido (19)
knowledge_bases, knowledge_base_answers, knowledge_base_categories, knowledge_base_menu_items, knowledge_base_permissions, knowledge_base_locales, knowledge_base_answer_translations, knowledge_base_category_translations, knowledge_base_answer_translation_contents, knowledge_base_translations, templates, text_modules, macros, overviews, overviews_users, overviews_groups, overviews_roles, signatures, messages (chats related)

### Chat y Comunicación (11)
chats, chat_sessions, chat_messages, chat_agents, channels, cti_logs, cti_caller_ids

### Archivos y Almacenamiento (9)
store_files, store_objects, stores, store_provider_dbs, attachments (related), avatars, package_migrations, packages

### Configuración y Sistema (20)
settings, locales, translations, object_lookups, object_manager_attributes, link_objects, link_types, links, ar_internal_metadata, schema_migrations, delayed_jobs, jobs, active_job_locks, import_jobs, webhooks, triggers, core_workflows, external_credentials, external_syncs

### Privacidad y Seguridad (6)
data_privacy_tasks, pgp_keys, smime_certificates, ssl_certificates, online_notifications, public_links

### Otros (10)
mention(s if exist), report_profiles, http_logs, system_reports, sessions, taskbars, type_lookups, recent_views, stats_stores, schedulers

---

## 💡 CAMPOS CUSTOMIZADOS IMPORTANTES (bld_)

### En tabla TICKETS:
- `bld_cliente`: Cliente personalizado
- `bld_cliente_padre`: Heredado de organization.bld_cliente_padre
- `bld_projects`: Proyectos asociados
- `bld_responsable`: Responsable técnico
- `bld_ticket_fase`: Fase (planning, development, testing, etc.)
- `bld_ticket_espera_motivo`: Por qué está en espera
- `bld_prority_customer`: Prioridad del cliente
- `bld_aprueba_cierre`: Quién aprueba el cierre
- `bld_motivo_resuelto`: Descripción de resolución
- `impact`: Impacto
- `urgency`: Urgencia

### En tabla ORGANIZATIONS:
- `bld_cliente_padre`: Cliente padre principal (1-26)
- `bld_fecha_inicio_proyecto`: Cuándo inicia el proyecto
- `bld_fecha_fin_proyectos`: Cuándo finaliza el proyecto

---

## ✅ GUÍA PARA REPORTES

### Para obtener tickets con información completa:

```sql
SELECT 
  t.id, t.number, t.title,
  o.name as proyecto,
  o.bld_cliente_padre as cliente_padre,
  ts.name as estado,
  tp.name as prioridad,
  u_owner.firstname || ' ' || u_owner.lastname as agente,
  u_customer.firstname || ' ' || u_customer.lastname as solicitante,
  t.created_at, t.updated_at,
  t.first_response_escalation_at as sla_primera_respuesta,
  t.close_escalation_at as sla_resolucion,
  t.first_response_at, t.close_at
FROM tickets t
LEFT JOIN organizations o ON t.organization_id = o.id
LEFT JOIN ticket_states ts ON t.state_id = ts.id
LEFT JOIN ticket_priorities tp ON t.priority_id = tp.id
LEFT JOIN users u_owner ON t.owner_id = u_owner.id
LEFT JOIN users u_customer ON t.customer_id = u_customer.id
ORDER BY t.created_at DESC
```

### Para obtener cambios de estado:

```sql
SELECT 
  t.number,
  h.value_from as estado_anterior,
  h.value_to as estado_nuevo,
  u.firstname || ' ' || u.lastname as modificado_por,
  h.created_at as fecha_cambio
FROM histories h
JOIN tickets t ON h.o_id = t.id
JOIN users u ON h.created_by_id = u.id
WHERE h.history_attribute_id = 
  (SELECT id FROM history_attributes WHERE name = 'state')
ORDER BY h.created_at DESC
LIMIT 100
```

### Para calcular tiempos SLA:

Los campos de tickets ya contienen:
- `first_response_in_min`: Minutos SLA para primera respuesta
- `first_response_diff_in_min`: Diferencia real vs SLA
- `close_in_min`: Minutos SLA para resolución
- `close_diff_in_min`: Diferencia real vs SLA
- `update_in_min` / `update_diff_in_min`: Para actualizaciones

---

## 📝 NOTAS IMPORTANTES

✅ **Zammad es un CRM/Ticketing construido en Ruby on Rails**
- Usa convención over configuration
- Muchos campos son JSON (preferences, conditions, business_hours)
- Los campos `o_id` = "object_id" (versión corta)
- Las vistas (v_*) facilitan análisis rápidos

✅ **Campos de timestamp siempre en UTC**
- Las fechas están en formato UTC
- El timezone se aplica en la presentación

✅ **Extensibilidad**
- La tabla `object_manager_attributes` permite campos customizados
- Todos los campos `bld_*` son customización de Blend360



