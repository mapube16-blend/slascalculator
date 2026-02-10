// Variables globales
let currentMetrics = null;
let selectedCalendarType = 'laboral'; // Calendario seleccionado por defecto
let allTickets = []; // Almacenar todos los tickets para paginación
let currentPage = 1;
let itemsPerPage = 10;
let currentSort = { field: null, direction: 'asc' }; // Estado del ordenamiento
let currentModalType = null; // Tipo de SLA en el modal actual
let currentModalStatus = null; // Estado de cumplimiento en el modal actual
let chartInstances = {}; // Almacenar instancias de gráficas para destruirlas antes de actualizar

// Elementos del DOM - se inicializarán en DOMContentLoaded
let elements = {};

// Mapa de nombres de calendarios para mostrar al usuario
const calendarNames = {
    'laboral': 'Horario Laboral (L-V, 8 AM - 5 PM)',
    '24-7': '24/7 Permanente (Todo el día)',
    'extended': 'Horario Extendido (L-D, 8 AM - 10 PM)'
};

function mapStateName(raw) {
    return raw || '';
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded disparado - inicializando app');
    
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
        typeSelect: document.getElementById('typeSelect'),
        btnLoadMetrics: document.getElementById('btnLoadMetrics'),
        btnGenerateReport: document.getElementById('btnGenerateReport'),
        btnClearFilters: document.getElementById('btnClearFilters'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        metricsContent: document.getElementById('metricsContent'),
        errorMessage: document.getElementById('errorMessage'),
        ticketDurationsContainer: document.getElementById('ticketDurationsContainer'),
        ticketDurationsBody: document.getElementById('ticketDurationsBody'),
        pageSizeSelect: document.getElementById('pageSizeSelect'),
        btnPrevPage: document.getElementById('btnPrevPage'),
        btnNextPage: document.getElementById('btnNextPage'),
        pageInfo: document.getElementById('pageInfo'),
        // Modal elements
        slaDetailsModal: document.getElementById('slaDetailsModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalTableBody: document.getElementById('modalTableBody'),
        closeModalBtn: document.querySelector('.close-modal'),
        btnExportModal: document.getElementById('btnExportModal'),
        // Cards
        cardFrMet: document.getElementById('cardFrMet'),
        cardFrBreached: document.getElementById('cardFrBreached'),
        cardResMet: document.getElementById('cardResMet'),
        cardResBreached: document.getElementById('cardResBreached'),
        // Chart controls
        chartSizeSelect: document.getElementById('chartSizeSelect'),
        chartsGrid: document.getElementById('chartsGrid')
    };
    
    console.log('Elementos del DOM cargados');
    
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
    if (elements.btnClearFilters) elements.btnClearFilters.addEventListener('click', clearFilters);
    
    // Event listeners para paginación
    if (elements.pageSizeSelect) {
        elements.pageSizeSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1; // Volver a la primera página al cambiar tamaño
            renderCurrentPage();
        });
    }
    
    if (elements.btnPrevPage) {
        elements.btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCurrentPage();
            }
        });
    }
    
    if (elements.btnNextPage) {
        elements.btnNextPage.addEventListener('click', () => {
            const maxPage = Math.ceil(allTickets.length / itemsPerPage);
            if (currentPage < maxPage) {
                currentPage++;
                renderCurrentPage();
            }
        });
    }
    
    console.log('Event listeners configurados');
    
    // ==================== INICIALIZAR TABS ====================
    initializeTabs();
    
    // ==================== INICIALIZAR BÚSQUEDA DE TICKETS ====================
    initializeTicketSearch();

    // ==================== INICIALIZAR ORDENAMIENTO ====================
    setupTableSorting();

    // ==================== INICIALIZAR MODAL SLA ====================
    setupSLAModal();
    
    // Event listener para exportar desde el modal
    if (elements.btnExportModal) {
        elements.btnExportModal.addEventListener('click', exportModalData);
    }

    // Event listener para cambiar tamaño de gráficas
    if (elements.chartSizeSelect) {
        elements.chartSizeSelect.addEventListener('change', (e) => {
            if (elements.chartsGrid) {
                elements.chartsGrid.className = `charts-grid-container size-${e.target.value}`;
                // Forzar ajuste de Chart.js
                Object.values(chartInstances).forEach(chart => chart.resize());
            }
        });
    }

    // Listener para cambios de tema en tiempo real (si el usuario cambia el modo del sistema)
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (currentMetrics) renderCharts(currentMetrics);
        });
    }
});

// Configurar eventos del selector de calendario
function setupCalendarSelector() {
    if (!elements.btnConfirmCalendar) {
        console.warn('btnConfirmCalendar no encontrado');
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
    loadStates();
    loadTicketTypes();
}

// Confirmar selección de calendario
function confirmCalendarSelection(calendarType) {
    selectedCalendarType = calendarType;
    console.log(`Calendario seleccionado: ${calendarType}`);
    
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
        
        // Si hay error de conexión (503), recargar para mostrar pantalla VPN
        if (response.status === 503) {
            window.location.reload();
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Limpiar select original
            elements.projectSelect.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Todos los proyectos';
            elements.projectSelect.appendChild(defaultOption);

            result.data.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                elements.projectSelect.appendChild(option);
            });

            // Habilitar búsqueda predictiva (Autocomplete)
            const projectsData = [{ id: '', name: 'Todos los proyectos' }, ...result.data];
            setupProjectSearch(projectsData);
        }
    } catch (error) {
        console.error('Error al cargar proyectos:', error);
    }
}

// Configurar búsqueda predictiva para proyectos
function setupProjectSearch(projects) {
    const select = elements.projectSelect;
    // Evitar duplicar si ya se inicializó
    if (!select || select.dataset.searchInitialized) return;

    // 1. Inyectar estilos CSS dinámicamente para el autocompletado
    if (!document.getElementById('autocomplete-styles')) {
        const style = document.createElement('style');
        style.id = 'autocomplete-styles';
        style.textContent = `
            .autocomplete-wrapper { position: relative; width: 100%; }
            .autocomplete-results {
                position: absolute;
                border: 1px solid #ced4da;
                border-top: none;
                z-index: 1000;
                top: 100%;
                left: 0;
                right: 0;
                max-height: 250px;
                overflow-y: auto;
                background-color: #fff;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                border-radius: 0 0 4px 4px;
            }
            .autocomplete-item {
                padding: 10px 12px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                font-size: 14px;
                color: #333;
            }
            .autocomplete-item:last-child { border-bottom: none; }
            .autocomplete-item:hover {
                background-color: #f8f9fa;
                color: #0f172a; /* Azul oscuro corporativo */
            }
            .no-results {
                padding: 10px;
                color: #6c757d;
                font-style: italic;
                font-size: 13px;
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Crear estructura DOM
    const wrapper = document.createElement('div');
    wrapper.className = 'autocomplete-wrapper';
    
    // Insertar wrapper antes del select y mover select dentro
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    // Crear input de búsqueda
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Buscar proyecto...';
    searchInput.className = select.className; 
    searchInput.style.width = '100%';
    searchInput.autocomplete = 'off';
    wrapper.appendChild(searchInput);

    // Crear contenedor de resultados
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'autocomplete-results';
    resultsDiv.style.display = 'none';
    wrapper.appendChild(resultsDiv);

    // Ocultar select original
    select.style.display = 'none';
    select.dataset.searchInitialized = 'true';

    // Función de normalización (ignorar acentos y mayúsculas)
    const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Función auxiliar para mostrar resultados
    const showResults = (val) => {
        resultsDiv.innerHTML = '';
        
        let matches = [];
        if (!val) {
            matches = projects; // Mostrar todos si no hay texto
        } else {
            matches = projects.filter(p => normalize(p.name).includes(val));
            matches.sort((a, b) => {
                const aStarts = normalize(a.name).startsWith(val);
                const bStarts = normalize(b.name).startsWith(val);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.name.localeCompare(b.name);
            });
        }

        if (matches.length > 0) {
            matches.forEach(p => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = p.name;
                
                item.addEventListener('click', () => {
                    searchInput.value = p.name;
                    select.value = p.id;
                    resultsDiv.style.display = 'none';
                    searchInput.style.borderColor = '#28a745';
                    searchInput.style.backgroundColor = '#f8fff9';
                });
                resultsDiv.appendChild(item);
            });
            resultsDiv.style.display = 'block';
        } else {
            const noResult = document.createElement('div');
            noResult.className = 'no-results';
            noResult.textContent = 'No se encontraron coincidencias';
            resultsDiv.appendChild(noResult);
            resultsDiv.style.display = 'block';
        }
    };

    // 3. Lógica de filtrado
    searchInput.addEventListener('input', (e) => {
        const val = normalize(e.target.value);
        select.value = ''; // Resetear selección
        searchInput.style.borderColor = '';
        searchInput.style.backgroundColor = '';
        showResults(val);
    });

    // Mostrar resultados al hacer click o focus
    const onInteract = () => {
        const val = normalize(searchInput.value);
        showResults(val);
    };
    searchInput.addEventListener('focus', onInteract);
    searchInput.addEventListener('click', onInteract);

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            resultsDiv.style.display = 'none';
        }
    });
}

// Cargar agentes disponibles
async function loadAgents() {
    try {
        const response = await fetch('/api/agents');
        if (response.status === 503) {
            window.location.reload();
            return;
        }
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

// Cargar estados disponibles con nombres exactos de BD
function loadStates() {
    if (!elements.stateSelect) return;

    const states = [
        { id: 'Recepcion', name: 'Recepcion' },
        { id: 'Clasificacion', name: 'Clasificacion' },
        { id: 'Diagnostico', name: 'Diagnostico' },
        { id: 'En progreso', name: 'En progreso' },
        { id: 'En Espera', name: 'En Espera' },
        { id: 'Resuelto', name: 'Resuelto' },
        { id: 'Cerrado', name: 'Cerrado' },
        { id: 'Cancelado', name: 'Cancelado' }
    ];

    elements.stateSelect.innerHTML = '<option value="">Todos los estados</option>';

    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state.id;
        option.textContent = state.name;
        elements.stateSelect.appendChild(option);
    });
}

// Cargar tipos de tickets disponibles
async function loadTicketTypes() {
    if (!elements.typeSelect) return;

    try {
        const response = await fetch('/api/ticket-types');
        if (response.status === 503) {
            window.location.reload();
            return;
        }
        const result = await response.json();
        
        if (result.success) {
            // Limpiar y asegurar opción por defecto
            elements.typeSelect.innerHTML = '<option value="">Todos los tipos</option>';

            result.data.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                elements.typeSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar tipos de tickets:', error);
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
    if (elements.agentSelect && elements.agentSelect.value) {
        filters.ownerId = parseInt(elements.agentSelect.value);
    }
    
    if (elements.stateSelect && elements.stateSelect.value) {
        filters.state = elements.stateSelect.value;
    }

    if (elements.typeSelect && elements.typeSelect.value) {
        filters.type = elements.typeSelect.value;
    }
    
    if (elements.ticketSearch && elements.ticketSearch.value) {
        filters.ticketNumber = elements.ticketSearch.value.trim();
    }

    if (elements.projectSelect && elements.projectSelect.value) {
    filters.organizationId = parseInt(elements.projectSelect.value);
}
    
    return filters;
}

// Limpiar todos los filtros
function clearFilters() {
    // Restablecer fechas a valores por defecto (últimos 30 días)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    if (elements.endDate) elements.endDate.valueAsDate = today;
    if (elements.startDate) elements.startDate.valueAsDate = thirtyDaysAgo;
    
    // Limpiar selects simples
    if (elements.agentSelect) elements.agentSelect.value = "";
    if (elements.stateSelect) elements.stateSelect.value = "";
    if (elements.typeSelect) elements.typeSelect.value = "";
    
    // Limpiar Proyecto (Manejo especial por el autocompletado)
    if (elements.projectSelect) {
        elements.projectSelect.value = "";
        // Buscar y limpiar el input visual del autocompletado
        const wrapper = elements.projectSelect.parentElement;
        if (wrapper && wrapper.classList.contains('autocomplete-wrapper')) {
            const input = wrapper.querySelector('input[type="text"]');
            if (input) {
                input.value = "";
                input.style.borderColor = "";
                input.style.backgroundColor = "";
            }
        }
    }
}

// Cargar métricas
async function loadMetrics() {
    // Validar que se ha seleccionado un calendario
    if (!selectedCalendarType) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = 'Debes seleccionar un calendario antes de cargar métricas';
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

            // Renderizar gráficas
            renderCharts(result.data);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error al cargar métricas:', error);
        if (elements.errorMessage) {
            elements.errorMessage.style.display = 'block';
            elements.errorMessage.textContent = 'Error al cargar métricas. Intenta de nuevo.';
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
        alert('Debes seleccionar un calendario antes de generar el reporte');
        showCalendarSelector();
        return;
    }
    
    const filters = getFilters();
    
    // Deshabilitar botón durante la generación
    if (elements.btnGenerateReport) {
        elements.btnGenerateReport.disabled = true;
        elements.btnGenerateReport.textContent = 'Generando...';
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
            
            alert('Reporte generado exitosamente');
        } else {
            throw new Error('Error al generar reporte');
        }
        
    } catch (error) {
        console.error('Error al generar reporte:', error);
        alert('Error al generar el reporte. Por favor intenta nuevamente.');
    } finally {
        if (elements.btnGenerateReport) {
            elements.btnGenerateReport.disabled = false;
            elements.btnGenerateReport.textContent = 'Generar Excel';
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
            allTickets = result.data; // Guardar todos los tickets
            
            if (currentSort.field) {
                sortTickets(); // Aplicar ordenamiento si ya estaba activo
            } else {
                currentPage = 1;
                renderCurrentPage();
            }
        }
    } catch (error) {
        console.error('Error al cargar duraciones de tickets:', error);
    }
}

// Renderizar la página actual de tickets
function renderCurrentPage() {
    if (!allTickets || allTickets.length === 0) return;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageTickets = allTickets.slice(start, end);
    
    displayTicketDurations(pageTickets);
    updatePaginationControls();
}

// Actualizar controles de paginación
function updatePaginationControls() {
    const totalPages = Math.ceil(allTickets.length / itemsPerPage);
    
    if (elements.pageInfo) {
        elements.pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    }
    
    if (elements.btnPrevPage) {
        elements.btnPrevPage.disabled = currentPage === 1;
        elements.btnPrevPage.style.opacity = currentPage === 1 ? '0.5' : '1';
    }
    
    if (elements.btnNextPage) {
        elements.btnNextPage.disabled = currentPage === totalPages;
        elements.btnNextPage.style.opacity = currentPage === totalPages ? '0.5' : '1';
    }
}

// Mostrar tabla con duraciones por estado
function displayTicketDurations(tickets) {
    if (!elements.ticketDurationsBody) return;
    
    elements.ticketDurationsBody.innerHTML = '';
    
    // Por cada ticket, crear filas para cada estado
    tickets.forEach((ticket) => {
        // 1. Fila Principal (Resumen)
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.title = 'Haz clic para ver el historial detallado de este ticket'; // Tooltip solicitado
        row.className = 'ticket-summary-row';
        
        // Icono de expansión
        const expandIcon = '▼'; // Carácter geométrico estándar, aceptable
        
        // Determinar clase del badge
        const stateClass = getStatusBadgeClass(ticket.state_name);
        
        row.innerHTML = `
            <td>
                <strong>${ticket.number}</strong> 
                <button class="copy-btn" onclick="copyToClipboard(event, '${ticket.number}')" title="Copiar número">Copiar</button>
                <span style="font-size: 0.8em; color: var(--accent-color); margin-left: 5px;">${expandIcon}</span>
            </td>
            <td title="${ticket.title}">${ticket.title.substring(0, 50)}${ticket.title.length > 50 ? '...' : ''}</td>
            <td>${ticket.organization || '-'}</td>
            <td>${ticket.owner || '-'}</td>
            <td><span class="status-badge ${stateClass}">${ticket.state_name}</span></td>
            <td style="text-align: right; color: var(--primary-color);"><strong>${Math.round(ticket.hightech_time_minutes || 0)}</strong></td>
        `;
        
        // 2. Fila de Detalle (Oculta por defecto)
        const detailRow = document.createElement('tr');
        detailRow.style.display = 'none';
        detailRow.style.backgroundColor = '#f8fafc';
        
        const detailCell = document.createElement('td');
        detailCell.colSpan = 6;
        detailCell.style.padding = '20px';
        detailCell.style.borderLeft = '4px solid var(--accent-color)';
        
        // Construir tabla interna de historial
        let historyHtml = `
            <div style="margin-bottom: 10px; font-weight: 600; color: var(--primary-color);">Historial Completo del Ticket ${ticket.number}</div>
            <table class="states-duration-table" style="width: 100%; font-size: 0.9em; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background: #e2e8f0; color: var(--text-main);">
                        <th style="padding: 8px 12px;">Estado</th>
                        <th style="padding: 8px 12px; text-align: right;">Duración</th>
                        <th style="padding: 8px 12px; text-align: right;">Inicio</th>
                        <th style="padding: 8px 12px; text-align: right;">Fin</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        ticket.history.forEach(h => {
            historyHtml += `
                <tr>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${h.to}</td>
                    <td style="padding: 8px 12px; text-align: right; border-bottom: 1px solid #eee;">${h.durationMinutes} min</td>
                    <td style="padding: 8px 12px; text-align: right; color: #64748b; border-bottom: 1px solid #eee; font-size: 0.85em;">${h.startTime || '-'}</td>
                    <td style="padding: 8px 12px; text-align: right; color: #64748b; border-bottom: 1px solid #eee; font-size: 0.85em;">${h.endTime || '-'}</td>
                </tr>
            `;
        });
        
        historyHtml += `</tbody></table>`;
        detailCell.innerHTML = historyHtml;
        detailRow.appendChild(detailCell);
        
        // Evento Click para expandir/colapsar
        row.addEventListener('click', () => {
            const isHidden = detailRow.style.display === 'none';
            detailRow.style.display = isHidden ? 'table-row' : 'none';
            row.style.backgroundColor = isHidden ? '#f1f5f9' : '';
        });
        
        elements.ticketDurationsBody.appendChild(row);
        elements.ticketDurationsBody.appendChild(detailRow);
    });
    
    // Mostrar el contenedor
    if (elements.ticketDurationsContainer) {
        elements.ticketDurationsContainer.style.display = 'block';
    }
}

// Helper para obtener clase de color según estado
function getStatusBadgeClass(stateName) {
    if (!stateName) return 'status-closed';
    
    const lower = stateName.toLowerCase();
    
    if (lower.includes('nuevo') || lower.includes('new') || lower.includes('abierto') || lower.includes('open') || lower.includes('progreso')) {
        return 'status-open';
    }
    if (lower.includes('espera') || lower.includes('pending') || lower.includes('recordatorio')) {
        return 'status-pending';
    }
    if (lower.includes('resuelto') || lower.includes('solved') || lower.includes('solucionado')) {
        return 'status-solved';
    }
    if (lower.includes('cancelado') || lower.includes('rejected')) {
        return 'status-rejected';
    }
    
    return 'status-closed'; // Default (Cerrado)
}

// Función global para copiar al portapapeles
window.copyToClipboard = function(event, text) {
    event.stopPropagation(); // Evitar que se expanda la fila al hacer clic en copiar
    navigator.clipboard.writeText(text).then(() => {
        // Feedback visual opcional (podría ser un toast, pero por ahora simple)
        const btn = event.target;
        const original = btn.textContent;
        btn.textContent = 'Copiado';
        setTimeout(() => btn.textContent = original, 1000);
    });
};

// Utilidades
function formatMinutes(minutes) {
    if (!minutes || minutes == 0) return '0 minutos';
    
    const mins = Math.round(parseFloat(minutes));
    
    return `${mins} minutos`;
}

// ==================== FUNCIONALIDAD DE TABS ====================

function initializeTabs() {
    console.log('Inicializando sistema de TABS');
    
    // Como solo hay una pestaña (Reportes), solo inicializamos sus eventos
    const tabButtons = document.querySelectorAll('.tab-button');
    console.log(`Encontrados ${tabButtons.length} botón tab`);
    
    // Si hay más de una pestaña, agregar lógica de cambio
    if (tabButtons.length > 1) {
        const allTabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach((button) => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const tabName = this.getAttribute('data-tab');
                console.log(`Click en tab: "${tabName}"`);
                
                tabButtons.forEach(b => b.classList.remove('active'));
                allTabContents.forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                const targetTab = document.getElementById(`${tabName}-tab`);
                if (targetTab) {
                    targetTab.classList.add('active');
                }
                
                // FIX: Redibujar gráficas al cambiar a la pestaña de gráficas
                // Esto soluciona el problema de que Chart.js no renderiza bien en elementos ocultos
                if (tabName === 'charts' && currentMetrics) {
                    setTimeout(() => {
                        renderCharts(currentMetrics);
                    }, 50); // Pequeño retraso para asegurar que el contenedor ya es visible
                }
            });
        });
    }
    
    console.log('Sistema de TABS inicializado\n');
}

// ==================== GRÁFICAS (CHART.JS) ====================

function renderCharts(metrics) {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js no está cargado');
        return;
    }

    // Detectar modo oscuro para ajustar colores de gráficas
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Colores dinámicos según el tema
    const colors = {
        text: isDarkMode ? '#94a3b8' : '#666',
        grid: isDarkMode ? '#334155' : '#e5e5e5',
        success: isDarkMode ? '#059669' : '#dcfce7',
        successBorder: isDarkMode ? '#34d399' : '#166534',
        danger: isDarkMode ? '#991b1b' : '#fee2e2',
        dangerBorder: isDarkMode ? '#f87171' : '#991b1b',
        closed: isDarkMode ? '#334155' : '#f1f5f9',
        closedBorder: isDarkMode ? '#475569' : '#cbd5e1',
        open: isDarkMode ? '#0c4a6e' : '#e0f2fe',
        openBorder: isDarkMode ? '#38bdf8' : '#bae6fd',
        barTotal: isDarkMode ? '#3b82f6' : '#0f172a',
        barClosed: isDarkMode ? '#0ea5e9' : '#0ea5e9'
    };

    // Configuración global de fuentes para Chart.js
    Chart.defaults.color = colors.text;
    Chart.defaults.borderColor = colors.grid;

    // Destruir gráficas anteriores si existen
    if (chartInstances.sla) chartInstances.sla.destroy();
    if (chartInstances.status) chartInstances.status.destroy();
    if (chartInstances.agent) chartInstances.agent.destroy();

    // 1. Gráfica de Cumplimiento SLA (Barras Agrupadas)
    const ctxSla = document.getElementById('slaComplianceChart').getContext('2d');
    chartInstances.sla = new Chart(ctxSla, {
        type: 'bar',
        data: {
            labels: ['Primera Respuesta', 'Resolución'],
            datasets: [
                {
                    label: 'Cumplido',
                    data: [metrics.first_response.met, metrics.resolution.met],
                    backgroundColor: colors.success,
                    borderColor: colors.successBorder,
                    borderWidth: 1
                },
                {
                    label: 'Incumplido',
                    data: [metrics.first_response.breached, metrics.resolution.breached],
                    backgroundColor: colors.danger,
                    borderColor: colors.dangerBorder,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // 2. Gráfica de Estado de Tickets (Dona)
    const ctxStatus = document.getElementById('ticketStatusChart').getContext('2d');
    chartInstances.status = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Cerrados', 'Abiertos'],
            datasets: [{
                data: [metrics.closed_tickets, metrics.open_tickets],
                backgroundColor: [colors.closed, colors.open],
                borderColor: [colors.closedBorder, colors.openBorder],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // 3. Gráfica de Agentes (Barras Horizontales - Top 10)
    // Preparar datos: convertir objeto a array y ordenar
    const agentData = Object.entries(metrics.by_agent)
        .map(([name, data]) => ({ name, total: data.total, closed: data.closed }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10); // Top 10

    const ctxAgent = document.getElementById('agentWorkloadChart').getContext('2d');
    chartInstances.agent = new Chart(ctxAgent, {
        type: 'bar',
        data: {
            labels: agentData.map(a => a.name),
            datasets: [
                {
                    label: 'Total Asignados',
                    data: agentData.map(a => a.total),
                    backgroundColor: colors.barTotal,
                    borderRadius: 4
                },
                {
                    label: 'Cerrados',
                    data: agentData.map(a => a.closed),
                    backgroundColor: colors.barClosed,
                    borderRadius: 4
                }
            ]
        },
        options: {
            indexAxis: 'y', // Barras horizontales
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

// ==================== BÚSQUEDA RÁPIDA DE TICKETS ====================

function initializeTicketSearch() {
    console.log('Inicializando búsqueda rápida de TICKETS');
    
    // Obtener elementos
    const quickTicketInput = document.getElementById('quickTicketNumber');
    const btnQuickSearch = document.getElementById('btnQuickSearch');
    
    if (!quickTicketInput || !btnQuickSearch) {
        console.warn('Elementos de búsqueda rápida no encontrados');
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
    
    console.log('Búsqueda rápida inicializada\n');
}

async function searchQuickTicket() {
    const ticketNumber = document.getElementById('quickTicketNumber').value.trim();
    
    console.log(`Buscando ticket: "${ticketNumber}"`);
    
    // Validar que se ha seleccionado un calendario
    if (!selectedCalendarType) {
        showQuickTicketError('Debes seleccionar un calendario primero');
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
        
        console.log(`  API: /api/ticket-history/${ticketNumber}?calendarType=${selectedCalendarType}`);
        
        // Buscar ticket
        const response = await fetch(`/api/ticket-history/${encodeURIComponent(ticketNumber)}?calendarType=${selectedCalendarType}`);
        const result = await response.json();
        
        if (!result.success) {
            showQuickTicketError(result.error || 'Ticket no encontrado');
            return;
        }
        
        console.log(`Ticket encontrado: ${result.data.ticket.number}`);
        
        // Mostrar resultado
        displayQuickTicket(result.data);
        document.getElementById('quickTicketResult').style.display = 'block';
        document.getElementById('quickTicketError').style.display = 'none';
        
    } catch (error) {
        console.error('Error:', error);
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
            <td style="text-align: right;">${entry.durationFormatted || entry.durationMinutes + ' min'}</td>
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

// ==================== ORDENAMIENTO DE TABLA ====================

function setupTableSorting() {
    const headers = document.querySelectorAll('.sortable-header');
    headers.forEach(th => {
        // Agregar icono
        const icon = document.createElement('span');
        icon.className = 'sort-icon';
        icon.textContent = '↕';
        th.appendChild(icon);

        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            handleSort(field);
        });
    });
}

function handleSort(field) {
    if (currentSort.field === field) {
        // Alternar dirección
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // Nuevo campo, default asc
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    updateSortIcons(field);
    sortTickets();
}

function updateSortIcons(activeField) {
    const headers = document.querySelectorAll('.sortable-header');
    headers.forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (th.dataset.sort === activeField) {
            icon.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
            icon.style.opacity = '1';
            icon.style.color = 'var(--accent-color)';
        } else {
            icon.textContent = '↕';
            icon.style.opacity = '0.5';
            icon.style.color = '';
        }
    });
}

function sortTickets() {
    if (!allTickets || allTickets.length === 0) return;

    const field = currentSort.field;
    const direction = currentSort.direction;

    allTickets.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];

        // Manejo de nulos
        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        // Comparación numérica para campos específicos
        if (field === 'hightech_time_minutes' || field === 'number') {
            const numA = parseFloat(valA) || 0;
            const numB = parseFloat(valB) || 0;
            return direction === 'asc' ? numA - numB : numB - numA;
        }

        // Comparación de texto
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    currentPage = 1; // Volver a la primera página al reordenar
    renderCurrentPage();
}

// ==================== MODAL DE DETALLES SLA ====================

function setupSLAModal() {
    // Event listeners para las tarjetas
    if (elements.cardFrMet) elements.cardFrMet.addEventListener('click', () => openSLAModal('first_response', 'met'));
    if (elements.cardFrBreached) elements.cardFrBreached.addEventListener('click', () => openSLAModal('first_response', 'breached'));
    if (elements.cardResMet) elements.cardResMet.addEventListener('click', () => openSLAModal('resolution', 'met'));
    if (elements.cardResBreached) elements.cardResBreached.addEventListener('click', () => openSLAModal('resolution', 'breached'));

    // Cerrar modal
    if (elements.closeModalBtn) {
        elements.closeModalBtn.addEventListener('click', () => {
            elements.slaDetailsModal.style.display = 'none';
        });
    }

    // Cerrar al hacer clic fuera
    window.addEventListener('click', (event) => {
        if (event.target === elements.slaDetailsModal) {
            elements.slaDetailsModal.style.display = 'none';
        }
    });
}

function openSLAModal(type, status) {
    if (!allTickets || allTickets.length === 0) {
        alert('No hay datos cargados para mostrar detalles.');
        return;
    }

    currentModalType = type;
    currentModalStatus = status;

    let filteredTickets = [];
    let title = '';
    let timeField = '';
    let slaField = '';

    // Configurar filtro y títulos según lo que se clickeó
    if (type === 'first_response') {
        title = status === 'met' ? 'Tickets con Primera Respuesta Cumplida' : 'Tickets con Primera Respuesta Incumplida';
        timeField = 'first_response_time_minutes';
        slaField = 'firstResponse';
        
        filteredTickets = allTickets.filter(t => 
            status === 'met' ? t.first_response_sla_met === true : t.first_response_sla_met === false
        );
    } else {
        title = status === 'met' ? 'Tickets con Resolución Cumplida' : 'Tickets con Resolución Incumplida';
        timeField = 'hightech_time_minutes';
        slaField = 'resolution';
        
        filteredTickets = allTickets.filter(t => 
            status === 'met' ? t.resolution_sla_met === true : t.resolution_sla_met === false
        );
    }

    // Actualizar título
    elements.modalTitle.textContent = `${title} (${filteredTickets.length})`;

    // Llenar tabla
    elements.modalTableBody.innerHTML = '';
    
    if (filteredTickets.length === 0) {
        elements.modalTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No se encontraron tickets en esta categoría.</td></tr>';
    } else {
        filteredTickets.forEach(t => {
            const row = document.createElement('tr');
            
            const realTime = t[timeField] || 0;
            const targetTime = t.sla_config ? t.sla_config[slaField] : 0;
            const diff = realTime - targetTime;
            const diffClass = diff <= 0 ? 'status-solved' : 'status-rejected';
            const diffSign = diff > 0 ? '+' : '';
            
            row.innerHTML = `
                <td><strong>${t.number}</strong></td>
                <td title="${t.title}">${t.title.substring(0, 40)}${t.title.length > 40 ? '...' : ''}</td>
                <td>${t.owner || '-'}</td>
                <td style="text-align: right;">${formatMinutes(realTime)}</td>
                <td style="text-align: right; color: #64748b;">${formatMinutes(targetTime)}</td>
                <td style="text-align: right;"><span class="status-badge ${diffClass}">${diffSign}${formatMinutes(diff)}</span></td>
            `;
            
            // Hacer click en la fila para ir al detalle (opcional, si quisieras cerrar modal y buscar ticket)
            
            elements.modalTableBody.appendChild(row);
        });
    }

    // Mostrar modal
    elements.slaDetailsModal.style.display = 'block';
}

async function exportModalData() {
    if (!currentModalType || !currentModalStatus) return;
    
    const filters = getFilters();
    // Añadir filtros específicos del modal
    const exportFilters = {
        ...filters,
        slaType: currentModalType,
        slaStatus: currentModalStatus
    };
    
    // Deshabilitar botón
    const btn = elements.btnExportModal;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Exportando...';
    
    try {
        const response = await fetch('/api/generate-filtered-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(exportFilters)
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SLA_Filtered_${currentModalType}_${currentModalStatus}_${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            throw new Error('Error al generar reporte filtrado');
        }
    } catch (error) {
        console.error('Error exportando modal:', error);
        alert('Error al exportar los datos.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}