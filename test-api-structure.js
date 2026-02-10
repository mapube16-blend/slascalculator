// Test del endpoint para ver la estructura de datos
const http = require('http');

function testEndpoint() {
    console.log(' Probando estructura de datos del endpoint\n');
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/ticket-history/201132?calendarType=laboral',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                console.log('✓ Respuesta del API:');
                console.log(JSON.stringify(jsonData.data.history, null, 2));
                
                console.log('\n📊 Primera entrada (estructura):');
                if (jsonData.data.history && jsonData.data.history[0]) {
                    const first = jsonData.data.history[0];
                    console.log(`  from: ${first.from}`);
                    console.log(`  to: ${first.to}`);
                    console.log(`  durationMinutes: ${first.durationMinutes} (tipo: ${typeof first.durationMinutes})`);
                    console.log(`  durationFormatted: ${first.durationFormatted}`);
                }
            } catch (e) {
                console.log('❌ Error al parsear JSON:');
                console.log(data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`❌ Error:`, e);
    });

    req.end();
}

testEndpoint();
