# 📖 GUÍA DE TEST - Sistema de Detalle de Tickets

## ✅ Verificar que todo está funcionando

### Paso 1: Abre Developer Tools
- Presiona **F12** en el navegador
- Ve a la pestaña **Console**
- Deberías ver varios mensajes de `✓` en verde

### Paso 2: Verifica los logs iniciales
En la consola deberías ver:
```
🎯 DOMContentLoaded disparado - inicializando app
✓ Elementos del DOM cargados
✓ Event listeners configurados
🔄 Inicializando sistema de TABS
✓ Encontrados 3 botones tab y 3 contenedores
✓ Sistema de TABS inicializado
🔄 Inicializando búsqueda de TICKET
...
✓ Event listeners agregados
```

**Si VES ERRORES en rojo:**
- Copia el error
- Pega aquí para investigar

---

## 🔍 Test: Buscar Ticket

### Paso 1: Haz clic en la pestaña "🔍 Detalle de Ticket"
- Debería verse el formulario de búsqueda
- Si no aparece, revisa la consola para errores

### Paso 2: Sistema de Calendario (OBLIGATORIO)
- Si ves un panel azul "⏰ Selecciona el Tipo de Calendario":
  - Selecciona "⏢ Horario Laboral"
  - Haz clic en "Confirmar Calendario"
  - Deberías verlo desaparecer

### Paso 3: Busca el ticket 201132
- En el campo "Número de Ticket:" escribe: `201132`
- Haz clic en el botón "Buscar" (con el icono 🔍)
- En la consola verás:
  ```
  🔎 Buscando ticket: "201132"
  → Llamando API: /api/ticket-history/201132?calendarType=laboral
  → Response status: 200
  ✓ Ticket encontrado: 201132
  ✓ Datos mostrados en pantalla
  ```

### Paso 4: Verifica la tabla de resultados
Debería aparecer una tabla con:
```
| Estado          | Minutos |
|-----------------|---------|
| Recepción       | 0       |
| Clasificación   | 0       |
| Diagnóstico     | 0       |
| En Progreso     | 0       |
| Resuelto        | 225     |
| Cerrado         | 0       |
```

---

## 🐛 Si algo no funciona...

### Tabla no aparece
1. **Abre Console (F12)**
2. Copia los errores rojos
3. Reporta qué dice el error

### Números muestran 0 en todo
- Esto es CORRECTO si el ticket se creó fuera del horario laboral (8 AM-5 PM)
- Los cambios de estado 201132 fueron entre las 8 PM - 11 PM (fuera de horario)
- Solo "En Progreso → Resuelto" muestra 225 minutos porque fue entre esos horarios

### Calendar selector no desaparece
- Revisa la consola para errores
- Presiona F5 para recargar la página

---

## 🎯 Suceso esperado
El sistema debería:
1. ✓ Mostrar el panel de calendario
2. ✓ Permitir hacer clic en "Confirmar"
3. ✓ Mostrar la barra de búsqueda
4. ✓ Buscar ticket al hacer clic o presionar Enter
5. ✓ Mostrar tabla con: Estado | Minutos
6. ✓ Mapear los nombres de estados con acentos (Recepción, Clasificación, etc)

---

## 📝 Reporta lo que ves
Describe:
1. ¿Qué apareció?
2. ¿Qué errores hay en la consola?
3. ¿Qué esperabas vs qué viste?
