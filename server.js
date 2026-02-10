const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Estado de la conexión
let isDbConnected = false;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (frontend)
// IMPORTANTE: { index: false } evita que se sirva index.html automáticamente en la raíz
// Esto nos permite interceptar la ruta '/' y decidir qué mostrar
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Middleware de verificación de conexión a BD
app.use(async (req, res, next) => {
  // 1. En la carga inicial (root), SIEMPRE verificar la conexión real
  // Esto asegura que si se cayó la VPN, al recargar se detecte y muestre la pantalla de error
  if (req.path === '/' || req.path === '/index.html') {
    try {
      isDbConnected = await testConnection();
    } catch (e) {
      isDbConnected = false;
    }
  }

  // 2. Si ya estamos conectados, dejar pasar
  if (isDbConnected) {
    return next();
  }

  // Si no estamos conectados, intentar reconectar (por si el usuario activó la VPN y recargó)
  // Solo intentamos reconectar en la ruta principal o APIs para no saturar
  if (req.path === '/' || req.path.startsWith('/api')) {
    try {
      isDbConnected = await testConnection();
      if (isDbConnected) {
        return next(); // ¡Conexión exitosa! Dejar pasar
      }
    } catch (e) {
      // Falló silenciosamente, seguiremos mostrando error
    }
  }

  // Si llegamos aquí, NO hay conexión
  
  // 1. Si es una petición de API, devolver error JSON (para que el frontend no se quede cargando infinito)
  if (req.path.startsWith('/api')) {
    return res.status(503).json({ success: false, error: 'Base de datos no disponible. Verifique conexión VPN.' });
  }

  // 2. Si es navegación web (HTML), mostrar la página de VPN
  if (req.accepts('html')) {
    return res.sendFile(path.join(__dirname, 'public', 'vpn_error.html'));
  }

  next();
});

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
    console.log('Verificando conexión a la base de datos...');
    isDbConnected = await testConnection();
    
    if (!isDbConnected) {
      console.log('\nADVERTENCIA: No se pudo conectar a la base de datos');
      console.log('   Asegúrate de que:');
      console.log('   1. La VPN esté activa');
      console.log('   2. Las credenciales en .env sean correctas');
      console.log('   3. El servidor de PostgreSQL esté accesible\n');
      console.log('   El servidor iniciará en MODO RESTRINGIDO (Pantalla de VPN requerida)\n');
    }
    
    app.listen(PORT, () => {
      console.log(`Servidor iniciado en http://localhost:${PORT}`);
      console.log(`Accede a la aplicación web en tu navegador`);
      console.log(`\nListo para generar reportes de SLA de Zammad\n`);
    });
    
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
