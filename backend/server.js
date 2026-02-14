const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const apiRoutes = require('./routes/api');
const { API } = require('./config/constants');

const app = express();
const PORT = process.env.PORT || 3000;

// Estado de la conexión
let isDbConnected = false;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting para prevenir abuso de API
const apiLimiter = rateLimit({
  windowMs: API.RATE_LIMIT.WINDOW_MS,
  max: API.RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Aplicar rate limiting solo a rutas de API
app.use('/api/', apiLimiter);

// NOTA: Los archivos estáticos ahora se sirven desde el frontend React (Vite)
// El backend solo maneja las rutas de API

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

  // 2. Si es navegación web (HTML), devolver mensaje
  if (req.accepts('html')) {
    return res.status(503).send('<h1>Base de datos no disponible</h1><p>Verifique conexión VPN.</p>');
  }

  next();
});

// Rutas de API
app.use('/api', apiRoutes);

// Ruta principal - API info
app.get('/', (req, res) => {
  res.json({
    message: 'Zammad SLA Reporter API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      projects: '/api/projects',
      agents: '/api/agents',
      metrics: '/api/metrics',
      tickets: '/api/tickets'
    },
    frontend: 'http://localhost:5173'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  
  // Manejo específico para PayloadTooLargeError
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      success: false, 
      error: 'La solicitud es demasiado grande. Por favor reinicia el servidor para aplicar los cambios de configuración.' 
    });
  }
  
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
