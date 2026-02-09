// Diagnóstico del estado de los elementos del DOM
console.log('\n🔍 DIAGNÓSTICO DE ELEMENTOS DEL DOM\n');

// Verificar elementos principales
const elements = {
    'tabs-header': document.querySelector('.tabs-header'),
    'tab-buttons': document.querySelectorAll('.tab-button'),
    'reports-tab': document.getElementById('reports-tab'),
    'ticket-detail-tab': document.getElementById('ticket-detail-tab'),
    'ticketNumber': document.getElementById('ticketNumber'),
    'btnSearchTicket': document.getElementById('btnSearchTicket'),
    'ticketDetailContent': document.getElementById('ticketDetailContent'),
    'ticketErrorContent': document.getElementById('ticketErrorContent'),
    'ticketLoadingIndicator': document.getElementById('ticketLoadingIndicator'),
    'historyTableBody': document.getElementById('historyTableBody')
};

console.log('Elementos encontrados:');
Object.entries(elements).forEach(([name, el]) => {
    if (Array.isArray(el)) {
        console.log(`  ${name}: ${el.length} elementos`);
    } else {
        console.log(`  ${name}: ${el ? '✓' : '❌'}`);
    }
});

// Verificar clases activas
console.log('\nClases activas de tabs:');
document.querySelectorAll('.tab-button').forEach((btn, i) => {
    const isActive = btn.classList.contains('active');
    const tabName = btn.getAttribute('data-tab');
    console.log(`  ${i}. Tab "${tabName}": ${isActive ? 'ACTIVO ✓' : 'inactivo'}`);
});

// Verificar visibility de tabs
console.log('\nVisibilidad de tabs:');
const reportsTab = document.getElementById('reports-tab');
const ticketTab = document.getElementById('ticket-detail-tab');
if (reportsTab) {
    const reportsDisplay = window.getComputedStyle(reportsTab).display;
    const reportsActive = reportsTab.classList.contains('active');
    console.log(`  reports-tab: display=${reportsDisplay}, active=${reportsActive}`);
}
if (ticketTab) {
    const ticketDisplay = window.getComputedStyle(ticketTab).display;
    const ticketActive = ticketTab.classList.contains('active');
    console.log(`  ticket-detail-tab: display=${ticketDisplay}, active=${ticketActive}`);
}

// Interceptar clicks en los tabs
console.log('\nAgregando listeners a los tabs...');
document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        console.log(`✓ Click en tab: ${tabName}`);
        
        // Verificar qué pasa después del click
        setTimeout(() => {
            const tabEl = document.getElementById(`${tabName}-tab`);
            if (tabEl) {
                const isActive = tabEl.classList.contains('active');
                const display = window.getComputedStyle(tabEl).display;
                console.log(`  → ${tabName}-tab ahora: active=${isActive}, display=${display}`);
            }
        }, 100);
    });
});

console.log('\n✓ Diagnóstico completado. Abre la consola para más detalles.\n');
