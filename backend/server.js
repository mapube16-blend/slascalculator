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
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : '*',
  credentials: true,
};
app.use(cors(corsOptions));
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
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting solo a rutas de API
app.use('/api/', apiLimiter);

// Middleware de verificación de conexión a BD (solo para rutas API)
app.use('/api', async (req, res, next) => {
  if (isDbConnected) {
    return next();
  }

  try {
    isDbConnected = await testConnection();
    if (isDbConnected) {
      return next();
    }
  } catch (e) {
    // Falló silenciosamente
  }

  return res.status(503).json({ success: false, error: 'Base de datos no disponible. Verifique conexión VPN.' });
});

// Rutas de API
app.use('/api', apiRoutes);

// Servir frontend React en producción (desactivar si el frontend está en S3)
if (process.env.SERVE_FRONTEND !== 'false') {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));

  // SPA routing: cualquier ruta que no sea /api sirve index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'La solicitud es demasiado grande.'
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
      console.log('   La aplicación iniciará sin conexión a BD.');
      console.log('   El frontend mostrará el modal de VPN.\n');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor iniciado en http://0.0.0.0:${PORT}`);
      if (process.env.SERVE_FRONTEND !== 'false') {
        console.log(`Frontend servido desde: ${path.join(__dirname, '../frontend/dist')}`);
      } else {
        console.log('Frontend: desactivado (servido desde S3)');
      }
    });

  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
