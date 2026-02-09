const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de API
app.use('/api', apiRoutes);

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Error interno del servidor' 
  });
});

// Iniciar servidor
async function startServer() {
  try {
    console.log('🔄 Verificando conexión a la base de datos...');
    const connected = await testConnection();
    
    if (!connected) {
      console.log('\n⚠️  ADVERTENCIA: No se pudo conectar a la base de datos');
      console.log('   Asegúrate de que:');
      console.log('   1. La VPN esté activa');
      console.log('   2. Las credenciales en .env sean correctas');
      console.log('   3. El servidor de PostgreSQL esté accesible\n');
      console.log('El servidor se iniciará de todos modos...\n');
    }
    
    app.listen(PORT, () => {
      console.log(`✓ Servidor iniciado en http://localhost:${PORT}`);
      console.log(`✓ Accede a la aplicación web en tu navegador`);
      console.log(`\n📊 Listo para generar reportes de SLA de Zammad\n`);
    });
    
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
