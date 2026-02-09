// Script de diagnóstico visual para ticket-detail-tab

setTimeout(() => {
    console.clear();
    console.log('%c🔍 DIAGNÓSTICO DE TICKET DETAIL TAB', 'font-size: 16px; color: #667eea; font-weight: bold;');
    
    const tab = document.getElementById('ticket-detail-tab');
    const filterPanel = tab ? tab.querySelector('.filters-panel') : null;
    const input = document.getElementById('ticketNumber');
    const button = document.getElementById('btnSearchTicket');
    
    // Elemento tab
    console.log('%nℹ️ ELEMENTO TAB:', 'color: #333');
    console.log(`  Existe: ${tab ? '✓' : '❌'}`);
    if (tab) {
        console.log(`  Clase "active": ${tab.classList.contains('active') ? '✓' : '❌'}`);
        const display = window.getComputedStyle(tab).display;
        console.log(`  Display: ${display}`);
        const visibility = window.getComputedStyle(tab).visibility;
        console.log(`  Visibility: ${visibility}`);
        console.log(`  Height: ${tab.offsetHeight}px`);
        console.log(`  Width: ${tab.offsetWidth}px`);
    }
    
    // Filters panel
    console.log('%n📋 FILTERS PANEL:', 'color: #333');
    console.log(`  Existe: ${filterPanel ? '✓' : '❌'}`);
    if (filterPanel) {
        const display = window.getComputedStyle(filterPanel).display;
        console.log(`  Display: ${display}`);
        const visibility = window.getComputedStyle(filterPanel).visibility;
        console.log(`  Visibility: ${visibility}`);
        console.log(`  Height: ${filterPanel.offsetHeight}px`);
        console.log(`  Width: ${filterPanel.offsetWidth}px`);
        console.log(`  Overflow: ${window.getComputedStyle(filterPanel).overflow}`);
    }
    
    // Input field
    console.log('%n✏️ INPUT FIELD (#ticketNumber):', 'color: #333');
    console.log(`  Existe: ${input ? '✓' : '❌'}`);
    if (input) {
        const display = window.getComputedStyle(input).display;
        console.log(`  Display: ${display}`);
        const visibility = window.getComputedStyle(input).visibility;
        console.log(`  Visibility: ${visibility}`);
        console.log(`  Height: ${input.offsetHeight}px`);
        console.log(`  Width: ${input.offsetWidth}px`);
        console.log(`  Disabled: ${input.disabled ? '✓ SÍ' : '❌ NO'}`);
        console.log(`  Readonly: ${input.readOnly ? '✓ SÍ' : '❌ NO'}`);
        console.log(`  Parent display: ${window.getComputedStyle(input.parentElement).display}`);
    }
    
    // Button
    console.log('%n🔘 BUTTON (#btnSearchTicket):', 'color: #333');
    console.log(`  Existe: ${button ? '✓' : '❌'}`);
    if (button) {
        const display = window.getComputedStyle(button).display;
        console.log(`  Display: ${display}`);
        const visibility = window.getComputedStyle(button).visibility;
        console.log(`  Visibility: ${visibility}`);
        console.log(`  Height: ${button.offsetHeight}px`);
        console.log(`  Width: ${button.offsetWidth}px`);
        console.log(`  Disabled: ${button.disabled ? '✓ SÍ' : '❌ NO'}`);
    }
    
    // Prueba de escritura
    console.log('%n✍️ PRUEBA DE ESCRITURA:', 'color: #333');
    if (input && tab && tab.classList.contains('active')) {
        input.value = 'TEST-WRITE';
        const wrote = input.value === 'TEST-WRITE';
        console.log(`  Se puede escribir: ${wrote ? '✓ SÍ' : '❌ NO'}`);
        input.value = '';
    }
    
    console.log('%n' + '='.repeat(50));
    
}, 500);
