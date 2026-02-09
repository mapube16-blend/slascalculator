// Test del endpoint /api/ticket-history/:number
const http = require('http');

function testEndpoint() {
    console.log('🧪 Probando endpoint GET /api/ticket-history/201132?calendarType=laboral\n');
    
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
            console.log(`📊 Status: ${res.statusCode}`);
            console.log(`📋 Headers:`, res.headers);
            
            try {
                const jsonData = JSON.parse(data);
                console.log('\n✓ Respuesta JSON recibida:');
                console.log(JSON.stringify(jsonData, null, 2));
                
                if (jsonData.success && jsonData.data && jsonData.data.history) {
                    console.log('\n📈 Resumen del historial:');
                    jsonData.data.history.forEach((item, idx) => {
                        console.log(`  ${idx + 1}. ${item.from} → ${item.to}: ${item.durationMinutes} minutos (${item.type})`);
                    });
                }
            } catch (e) {
                console.log('\n❌ Error al parsear JSON:');
                console.log(data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`❌ Error en la solicitud:`, e);
    });

    req.end();
}

testEndpoint();
