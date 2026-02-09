// Diagnóstico completo del frontend
console.clear();
console.log('=== 🔍 DIAGNÓSTICO COMPLETO DEL FRONTEND ===\n');

// 1. Verificar que los elementos críticos existen
console.log('📋 ELEMENTOS CRÍTICOS DEL DOM:');
const criticalElements = {
    'ticketNumber': document.getElementById('ticketNumber'),
    'btnSearchTicket': document.getElementById('btnSearchTicket'),
    'ticketDetailContent': document.getElementById('ticketDetailContent'),
    'ticketErrorContent': document.getElementById('ticketErrorContent'),
    'ticketLoadingIndicator': document.getElementById('ticketLoadingIndicator'),
    'ticketErrorMessage': document.getElementById('ticketErrorMessage'),
    'ticketStatesSimple': document.getElementById('ticketStatesSimple'),
    'statesDurationBody': document.getElementById('statesDurationBody'),
    'ticket-detail-tab': document.getElementById('ticket-detail-tab'),
    'btnLoadMetrics': document.getElementById('btnLoadMetrics'),
    'btnGenerateReport': document.getElementById('btnGenerateReport'),
    'calendarSelectorPanel': document.getElementById('calendarSelectorPanel'),
    'filtersPanelMain': document.getElementById('filtersPanelMain')
};

Object.entries(criticalElements).forEach(([name, element]) => {
    console.log(`  ${element ? '✓' : '❌'} ${name}`);
});

// 2. Verificar tabs
console.log('\n📑 TABS:');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
console.log(`  Total botones tab: ${tabButtons.length}`);
console.log(`  Total contenedores tab: ${tabContents.length}`);

// 3. Verificar que app.js está cargado
console.log('\n📦 FUNCIONES GLOBALES:');
console.log(`  window.searchTicket: ${typeof window.searchTicket !== 'undefined' ? '✓' : '❌'}`);
console.log(`  window.displayTicketHistory: ${typeof window.displayTicketHistory !== 'undefined' ? '✓' : '❌'}`);
console.log(`  window.mapStateName: ${typeof window.mapStateName !== 'undefined' ? '✓' : '❌'}`);
console.log(`  window.loadMetrics: ${typeof window.loadMetrics !== 'undefined' ? '✓' : '❌'}`);

// 4. Variables globales
console.log('\n🔧 VARIABLES GLOBALES:');
console.log(`  selectedCalendarType: ${window.selectedCalendarType}`);
console.log(`  currentMetrics: ${window.currentMetrics}`);

// 5. Event listeners en botones
console.log('\n🖱️ EVENT LISTENERS:');
if (criticalElements.btnSearchTicket) {
    console.log('  btnSearchTicket: Haz clic para ver si se ejecuta');
    criticalElements.btnSearchTicket.addEventListener('click', () => {
        console.log('✓ btnSearchTicket - Click detectado');
    });
}

if (tabButtons.length > 0) {
    console.log(`  Tab buttons: ${tabButtons.length} botones>`);
}

// 6. Test de mapStateName
console.log('\n🧪 TEST de mapStateName:');
if (typeof window.mapStateName === 'function') {
    console.log(`  mapStateName('Recepcion'): ${window.mapStateName('Recepcion')}`);
    console.log(`  mapStateName('Clasificacion'): ${window.mapStateName('Clasificacion')}`);
    console.log(`  mapStateName('Cerrado'): ${window.mapStateName('Cerrado')}`);
}

// 7. Verificar que el servidor está respondiendo
console.log('\n🌐 SERVIDOR:');
fetch('/api/projects')
    .then(r => r.json())
    .then(data => {
        console.log(`  GET /api/projects: ✓ (${data.data?.length || 0} proyectos)`);
    })
    .catch(e => console.log(`  GET /api/projects: ❌ (${e.message})`));

fetch('/api/agents')
    .then(r => r.json())
    .then(data => {
        console.log(`  GET /api/agents: ✓ (${data.data?.length || 0} agentes)`);
    })
    .catch(e => console.log(`  GET /api/agents: ❌ (${e.message})`));

console.log('\n=== 🎯 FIN DEL DIAGNÓSTICO ===\n');
