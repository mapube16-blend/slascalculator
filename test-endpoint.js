const http = require('http');

async function testEndpoint() {
  try {
    console.log('\n🧪 TEST DEL ENDPOINT /api/ticket-history\n');

    // Probar con el ticket #20502
    const ticketNumber = '20502';
    console.log(`Buscando ticket #${ticketNumber}...\n`);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/ticket-history/${ticketNumber}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('Status:', res.statusCode);
          console.log('Response:', JSON.stringify(parsed, null, 2));

          if (parsed.success) {
            console.log('\n✅ ÉXITO: Endpoint está funcionando\n');
            console.log('Datos del ticket:');
            console.log(JSON.stringify(parsed.data.ticket, null, 2));
            console.log('\nResumen:');
            console.log(JSON.stringify(parsed.data.summary, null, 2));
            console.log(`\nHistorial: ${parsed.data.history.length} cambios`);
            if (parsed.data.history.length > 0) {
              console.log('Primer cambio:');
              console.log(JSON.stringify(parsed.data.history[0], null, 2));
            }
          } else {
            console.log('\n❌ ERROR:', parsed.error);
          }
          process.exit(0);
        } catch (e) {
          console.log('Raw response:', data);
          process.exit(1);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
      process.exit(1);
    });

    req.end();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testEndpoint();
