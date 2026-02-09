// Test de cálculo de working minutes
const workingHours = require('./services/workingHoursService');

async function testWorkingHours() {
    console.log('🧪 Probando cálculo de working hours\n');
    
    // Configurar el tipo de calendario
    workingHours.setCalendarType('laboral');
    
    // Ejemplo de período: 2026-01-29 20:12:33 a 2026-01-29 20:18:56
    const start1 = new Date('2026-01-29T20:12:33');
    const end1 = new Date('2026-01-29T20:18:56');
    
    console.log(`Período 1: ${start1.toISOString()} a ${end1.toISOString()}`);
    const minutes1 = workingHours.calculateWorkingMinutes(start1, end1, 'laboral');
    console.log(`  → Minutos: ${minutes1}\n`);
    
    // Ejemplo: 2026-01-29 21:45:47 a 2026-01-29 21:54:04
    const start2 = new Date('2026-01-29T21:45:47');
    const end2 = new Date('2026-01-29T21:54:04');
    
    console.log(`Período 2: ${start2.toISOString()} a ${end2.toISOString()}`);
    const minutes2 = workingHours.calculateWorkingMinutes(start2, end2, 'laboral');
    console.log(`  → Minutos: ${minutes2}\n`);
    
    // Ejemplo: 2026-01-29 21:54:04 a 2026-01-30 11:45:31
    const start3 = new Date('2026-01-29T21:54:04');
    const end3 = new Date('2026-01-30T11:45:31');
    
    console.log(`Período 3: ${start3.toISOString()} a ${end3.toISOString()}`);
    const minutes3 = workingHours.calculateWorkingMinutes(start3, end3, 'laboral');
    console.log(`  → Minutos: ${minutes3}\n`);
}

testWorkingHours();
