// Variables globales
let currentMetrics = null;
let selectedCalendarType = 'laboral'; // Calendario seleccionado por defecto

// Elementos del DOM - se inicializarán en DOMContentLoaded
let elements = {};

// Mapa de nombres de calendarios para mostrar al usuario
const calendarNames = {
    'laboral': 'Horario Laboral (L-V, 8 AM - 5 PM)',
    '24-7': '24/7 Permanente (Todo el día)',
    'extended': 'Horario Extendido (L-D, 8 AM - 10 PM)'
};

// Mapa de nombres de estados (DB -> Front display)
const stateNameMap = {
    // Estados de la BD colombiana (sin acentos)
    'Recepcion': 'Recepción',
    'Clasificacion': 'Clasificación',
    'Diagnostico': 'Diagnóstico',
    'En progreso': 'En Progreso',
    'Resuelto': 'Resuelto',
    'Cerrado': 'Cerrado',
    'En Espera': 'En Espera',
    'Cancelado': 'Cancelado',
    
    // Estados estándar alternativos (por si acaso)
    'Nuevo': 'Nuevo',
    'Abierto': 'Abierto',
    'Espera': 'En Espera',
    'Closed': 'Cerrado',
    'Waiting': 'En Espera'
};

function mapStateName(raw) {
    if (!raw && raw !== '') return raw;
    const name = String(raw).trim();
    if (stateNameMap[name]) return stateNameMap[name];
    // Intenta comparación case-insensitive
    const lower = name.toLowerCase();
    for (const key of Object.keys(stateNameMap)) {
        if (key.toLowerCase() === lower) return stateNameMap[key];
    }
    return name; // fallback al valor original
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 DOMContentLoaded disparado - inicializando app');
    
    // Inicializar objeto elements ahora que el DOM está listo
    elements = {
        calendarSelectorPanel: document.getElementById('calendarSelectorPanel'),
        filtersPanelMain: document.getElementById('filtersPanelMain'),
        btnConfirmCalendar: document.getElementById('btnConfirmCalendar'),
        btnChangeCalendar: document.getElementById('btnChangeCalendar'),
        calendarSelectedDisplay: document.getElementById('calendarSelectedDisplay'),
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate'),
        projectSelect: document.getElementById('projectSelect'),
        agentSelect: document.getElementById('agentSelect'),
        stateSelect: document.getElementById('stateSelect'),
        btnLoadMetrics: document.getElementById('btnLoadMetrics'),
        btnGenerateReport: document.getElementById('btnGenerateReport'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        metricsContent: document.getElementById('metricsContent'),
        errorMessage: document.getElementById('errorMessage'),
        ticketDurationsContainer: document.getElementById('ticketDurationsContainer'),
        ticketDurationsBody: document.getElementById('ticketDurationsBody')
    };
    
    console.log('✓ Elementos del DOM cargados');
    
    // Configurar eventos del selector de calendario
    setupCalendarSelector();
    
    // Establecer fechas por defecto (últimos 30 días)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    if (elements.endDate) elements.endDate.valueAsDate = today;
    if (elements.startDate) elements.startDate.valueAsDate = thirtyDaysAgo;
    
    // Event listeners
    if (elements.btnLoadMetrics) elements.btnLoadMetrics.addEventListener('click', loadMetrics);
    if (elements.btnGenerateReport) elements.btnGenerateReport.addEventListener('click', generateReport);
    
    console.log('✓ Event listeners configurados');
    
    // ==================== INICIALIZAR TABS ====================
    initializeTabs();
    
    // ==================== INICIALIZAR BÚSQUEDA DE TICKETS ====================
    initializeTicketSearch();
});

// Configurar eventos del selector de calendario
function setupCalendarSelector() {
    if (!elements.btnConfirmCalendar) {
        console.warn('⚠️  btnConfirmCalendar no encontrado');
        return;
    }
    
    elements.btnConfirmCalendar.addEventListener('click', () => {
        const selected = document.querySelector('input[name="calendarType"]:checked');
        if (selected) {
            confirmCalendarSelection(selected.value);
        }
    });
    
    if (elements.btnChangeCalendar) {
        elements.btnChangeCalendar.addEventListener('click', () => {
            showCalendarSelector();
        });
    }
    
    // Mostrar panel de filtros cuando se carga la página
    loadProjects();
    loadAgents();
}

// Confirmar selección de calendario
function confirmCalendarSelection(calendarType) {
    selectedCalendarType = calendarType;
    console.log(`✓ Calendario seleccionado: ${calendarType}`);
    
    // Actualizar el nombre mostrado
    if (elements.calendarSelectedDisplay) {
        elements.calendarSelectedDisplay.textContent = calendarNames[calendarType];
    }
    
    // Ocultar selector, mostrar filtros
    if (elements.calendarSelectorPanel) {
        elements.calendarSelectorPanel.style.display = 'none';
    }
    if (elements.filtersPanelMain) {
        elements.filtersPanelMain.style.display = 'block';
    }
}

// Mostrar selector de calendario
function showCalendarSelector() {
    if (elements.calendarSelectorPanel) {
        elements.calendarSelectorPanel.style.display = 'block';
    }
    if (elements.filtersPanelMain) {
        elements.filtersPanelMain.style.display = 'none';
    }
}

// Cargar proyectos disponibles
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const result = await response.json();
        
        if (result.success) {
            result.data.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                elements.projectSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar proyectos:', error);
    }
}

// Cargar agentes disponibles
async function loadAgents() {
    try {
        const response = await fetch('/api/agents');
        const result = await response.json();
        
        if (result.success) {
            result.data.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent.id;
                option.textContent = agent.name;
                elements.agentSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar agentes:', error);
    }
}

// Obtener filtros actuales
function getFilters() {
    const filters = {
        calendarType: selectedCalendarType  // Agregar calendario a los filtros
    };
    
    if (elements.startDate && elements.startDate.value) {
        filters.startDate = elements.startDate.value;
    }
    
    if (elements.endDate && elements.endDate.value) {
        filters.endDate = elements.endDate.value;
    }
    
    if (elements.projectSelect && elements.projectSelect.value) {
        filters.projectId = parseInt(elements.projectSelect.value);
    }
    
    if (elements.agentSelect && elements.agentSelect.value) {
        filters.ownerId = parseInt(elements.agentSelect.value);
    }
    
    if (elements.stateSelect && elements.stateSelect.value) {
        filters.state = elements.stateSelect.value;
    }
    
    if (elements.ticketSearch && elements.ticketSearch.value) {
        filters.ticketNumber = elements.ticketSearch.value.trim();
    }
    
    return filters;
}

// Cargar métricas
async function loadMetrics() {
    // Validar que se ha seleccionado un calendario
    if (!selectedCalendarType) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = '⚠️ Debes seleccionar un calendario antes de cargar métricas';
            elements.errorMessage.style.display = 'block';
        }
        showCalendarSelector();
        return;
    }
    
    const filters = getFilters();
    filters.calendarType = selectedCalendarType;
    
    // Mostrar loading
    if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'block';
    if (elements.metricsContent) elements.metricsContent.style.display = 'none';
    if (elements.ticketDurationsContainer) elements.ticketDurationsContainer.style.display = 'none';
    if (elements.errorMessage) elements.errorMessage.style.display = 'none';
    
    try {
        const response = await fetch('/api/metrics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filters)
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentMetrics = result.data;
            displayMetrics(result.data);
            if (elements.metricsContent) elements.metricsContent.style.display = 'block';
            
            // Cargar y mostrar duraciones por estado
            await loadAndDisplayTicketDurations(filters);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error al cargar métricas:', error);
        if (elements.errorMessage) {
            elements.errorMessage.style.display = 'block';
            elements.errorMessage.textContent = '❌ Error al cargar métricas. Intenta de nuevo.';
        }
    } finally {
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'none';
    }
}

// Mostrar métricas en la interfaz
function displayMetrics(metrics) {
    // Métricas generales
    document.getElementById('totalTickets').textContent = metrics.total_tickets;
    document.getElementById('closedTickets').textContent = metrics.closed_tickets;
    document.getElementById('openTickets').textContent = metrics.open_tickets;
    
    // Primera respuesta
    document.getElementById('frMet').textContent = metrics.first_response.met;
    document.getElementById('frBreached').textContent = metrics.first_response.breached;
    document.getElementById('frRate').textContent = metrics.first_response.compliance_rate + '%';
    document.getElementById('frAvgTime').textContent = 
        formatMinutes(metrics.first_response.avg_time_minutes);
    
    // Resolución
    document.getElementById('resMet').textContent = metrics.resolution.met;
    document.getElementById('resBreached').textContent = metrics.resolution.breached;
    document.getElementById('resRate').textContent = metrics.resolution.compliance_rate + '%';
    document.getElementById('resAvgTime').textContent = 
        formatMinutes(metrics.resolution.avg_time_minutes);
}

// Mostrar métricas por agente
// Generar reporte Excel
async function generateReport() {
    // Validar que se ha seleccionado un calendario
    if (!selectedCalendarType) {
        alert('⚠️ Debes seleccionar un calendario antes de generar el reporte');
        showCalendarSelector();
        return;
    }
    
    const filters = getFilters();
    
    // Deshabilitar botón durante la generación
    if (elements.btnGenerateReport) {
        elements.btnGenerateReport.disabled = true;
        elements.btnGenerateReport.textContent = '⏳ Generando...';
    }
    
    try {
        const response = await fetch('/api/generate-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filters)
        });
        
        if (response.ok) {
            // Descargar archivo
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SLA_Report_${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('✓ Reporte generado exitosamente');
        } else {
            throw new Error('Error al generar reporte');
        }
        
    } catch (error) {
        console.error('Error al generar reporte:', error);
        alert('✗ Error al generar el reporte. Por favor intenta nuevamente.');
    } finally {
        if (elements.btnGenerateReport) {
            elements.btnGenerateReport.disabled = false;
            elements.btnGenerateReport.innerHTML = '<span class="btn-icon">📥</span> Generar Excel';
        }
    }
}

// Cargar y mostrar duraciones por estado para todos los tickets
async function loadAndDisplayTicketDurations(filters) {
    try {
        const response = await fetch('/api/tickets-with-durations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filters)
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            displayTicketDurations(result.data);
        }
    } catch (error) {
        console.error('Error al cargar duraciones de tickets:', error);
    }
}

// Mostrar tabla con duraciones por estado
function displayTicketDurations(tickets) {
    if (!elements.ticketDurationsBody) return;
    
    elements.ticketDurationsBody.innerHTML = '';
    
    // Por cada ticket, crear filas para cada estado
    tickets.forEach((ticket) => {
        const stateNameMap = {
            'Recepcion': 'Recepción',
            'Clasificacion': 'Clasificación',
            'Diagnostico': 'Diagnóstico',
            'En progreso': 'En progreso',
            'Resuelto': 'Resuelto',
            'Cerrado': 'Cerrado',
            'En Espera': 'En Espera',
            'Cancelado': 'Cancelado'
        };
        
        ticket.history.forEach((entry, index) => {
            const row = document.createElement('tr');
            const displayName = stateNameMap[entry.to] || entry.to;
            
            row.innerHTML = `
                <td><strong>${ticket.number}</strong></td>
                <td title="${ticket.title}">${ticket.title.substring(0, 50)}${ticket.title.length > 50 ? '...' : ''}</td>
                <td>${ticket.organization || '-'}</td>
                <td>${displayName}</td>
                <td style="text-align: right;"><strong>${entry.durationMinutes}</strong></td>
            `;
            
            elements.ticketDurationsBody.appendChild(row);
        });
    });
    
    // Mostrar el contenedor
    if (elements.ticketDurationsContainer) {
        elements.ticketDurationsContainer.style.display = 'block';
    }
}

// Utilidades
function formatMinutes(minutes) {
    if (!minutes || minutes == 0) return '0 minutos';
    
    const mins = Math.round(parseFloat(minutes));
    
    return `${mins} minutos`;
}

// ==================== FUNCIONALIDAD DE TABS ====================

function initializeTabs() {
    console.log('🔄 Inicializando sistema de TABS');
    
    // Como solo hay una pestaña (Reportes), solo inicializamos sus eventos
    const tabButtons = document.querySelectorAll('.tab-button');
    console.log(`✓ Encontrados ${tabButtons.length} botón tab`);
    
    // Si hay más de una pestaña, agregar lógica de cambio
    if (tabButtons.length > 1) {
        const allTabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach((button) => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const tabName = this.getAttribute('data-tab');
                console.log(`👆 Click en tab: "${tabName}"`);
                
                tabButtons.forEach(b => b.classList.remove('active'));
                allTabContents.forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                const targetTab = document.getElementById(`${tabName}-tab`);
                if (targetTab) {
                    targetTab.classList.add('active');
                }
            });
        });
    }
    
    console.log('✓ Sistema de TABS inicializado\n');
}

// ==================== BÚSQUEDA RÁPIDA DE TICKETS ====================

function initializeTicketSearch() {
    console.log('🔄 Inicializando búsqueda rápida de TICKETS');
    
    // Obtener elementos
    const quickTicketInput = document.getElementById('quickTicketNumber');
    const btnQuickSearch = document.getElementById('btnQuickSearch');
    
    if (!quickTicketInput || !btnQuickSearch) {
        console.warn('⚠️ Elementos de búsqueda rápida no encontrados');
        return;
    }
    
    // Event listeners
    btnQuickSearch.addEventListener('click', () => {
        searchQuickTicket();
    });
    
    quickTicketInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchQuickTicket();
        }
    });
    
    console.log('✓ Búsqueda rápida inicializada\n');
}

async function searchQuickTicket() {
    const ticketNumber = document.getElementById('quickTicketNumber').value.trim();
    
    console.log(`🔎 Buscando ticket: "${ticketNumber}"`);
    
    // Validar que se ha seleccionado un calendario
    if (!selectedCalendarType) {
        showQuickTicketError('⚠️ Debes seleccionar un calendario primero');
        return;
    }
    
    if (!ticketNumber) {
        showQuickTicketError('Ingresa un número de ticket');
        return;
    }
    
    try {
        // Mostrar loading
        document.getElementById('quickTicketLoading').style.display = 'flex';
        document.getElementById('quickTicketResult').style.display = 'none';
        document.getElementById('quickTicketError').style.display = 'none';
        
        console.log(`  → API: /api/ticket-history/${ticketNumber}?calendarType=${selectedCalendarType}`);
        
        // Buscar ticket
        const response = await fetch(`/api/ticket-history/${ticketNumber}?calendarType=${selectedCalendarType}`);
        const result = await response.json();
        
        if (!result.success) {
            showQuickTicketError(result.error || 'Ticket no encontrado');
            return;
        }
        
        console.log(`✓ Ticket encontrado: ${result.data.ticket.number}`);
        
        // Mostrar resultado
        displayQuickTicket(result.data);
        document.getElementById('quickTicketResult').style.display = 'block';
        document.getElementById('quickTicketError').style.display = 'none';
        
    } catch (error) {
        console.error('❌ Error:', error);
        showQuickTicketError('Error al buscar el ticket. Intenta de nuevo.');
    } finally {
        document.getElementById('quickTicketLoading').style.display = 'none';
    }
}

function displayQuickTicket(data) {
    const { ticket, history } = data;
    
    // Llenar información del ticket
    document.getElementById('quickTicketTitle').textContent = ticket.title;
    document.getElementById('quickTicketNum').textContent = ticket.number;
    document.getElementById('quickTicketOrg').textContent = ticket.organization;
    document.getElementById('quickTicketState').textContent = mapStateName(ticket.currentState);
    document.getElementById('quickTicketCo').textContent = ticket.empresa;
    document.getElementById('quickTicketCreated').textContent = ticket.created;
    document.getElementById('quickTicketClosed').textContent = ticket.closed;
    
    // Llenar tabla de duraciones
    const stateBody = document.getElementById('quickTicketStateBody');
    stateBody.innerHTML = '';
    
    history.forEach((entry) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${mapStateName(entry.to)}</td>
            <td style="text-align: right;">${entry.durationMinutes}</td>
        `;
        stateBody.appendChild(row);
    });
}

function showQuickTicketError(message) {
    document.getElementById('quickTicketErrorMsg').textContent = message;
    document.getElementById('quickTicketError').style.display = 'block';
    document.getElementById('quickTicketResult').style.display = 'none';
    document.getElementById('quickTicketLoading').style.display = 'none';
}