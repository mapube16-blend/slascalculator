const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Importante: configuración para conexión a través de VPN con SSL
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 30000,
  max: 10,
  keepAlive: true
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

// Función para verificar la conexión
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Conexión exitosa a la base de datos de Zammad');
    client.release();
    return true;
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message);
    console.error('Asegúrate de que la VPN esté activa y las credenciales sean correctas');
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
