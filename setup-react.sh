#!/bin/bash

echo "🚀 Iniciando migración a React..."
echo ""

# Paso 1: Crear carpeta backend
echo "📁 Paso 1/6: Reorganizando estructura del proyecto..."
mkdir -p backend

# Mover archivos del backend (manteniendo docs en raíz)
mv config middleware routes services utils server.js backend/ 2>/dev/null || true
mv package.json backend/package.json 2>/dev/null || true
mv package-lock.json backend/package-lock.json 2>/dev/null || true
mv node_modules backend/node_modules 2>/dev/null || true

# Mover .env pero crear .env.example en raíz
if [ -f ".env" ]; then
  mv .env backend/.env
  echo "✓ .env movido a backend/"
fi

# Actualizar .env.example para que quede en raíz
cp backend/.env.example .env.example 2>/dev/null || true

echo "✓ Estructura reorganizada"
echo ""

# Paso 2: Crear proyecto React con Vite
echo "⚛️  Paso 2/6: Creando proyecto React con Vite..."
npm create vite@latest frontend -- --template react
echo "✓ Proyecto React creado"
echo ""

# Paso 3: Instalar dependencias del frontend
echo "📦 Paso 3/6: Instalando dependencias de React..."
cd frontend

npm install
npm install axios react-router-dom chart.js react-chartjs-2
npm install @tanstack/react-table react-hook-form date-fns
npm install phosphor-react
npm install tailwindcss postcss autoprefixer -D

echo "✓ Dependencias instaladas"
echo ""

# Paso 4: Configurar Tailwind
echo "🎨 Paso 4/6: Configurando Tailwind CSS..."
npx tailwindcss init -p

# Actualizar tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      }
    },
  },
  plugins: [],
}
EOF

# Actualizar index.css
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}
EOF

echo "✓ Tailwind configurado"
echo ""

# Paso 5: Configurar Vite proxy
echo "🔧 Paso 5/6: Configurando proxy de Vite..."
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
EOF

echo "✓ Vite configurado"
echo ""

# Paso 6: Crear scripts en root package.json
cd ..
echo "📝 Paso 6/6: Configurando scripts de desarrollo..."

npm install concurrently -D

cat > package.json << 'EOF'
{
  "name": "zammad-sla-reporter",
  "version": "2.0.0",
  "description": "Sistema de reportes personalizados de SLA para Zammad con React",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "start:backend": "cd backend && npm start",
    "start": "npm run start:backend",
    "install:all": "cd backend && npm install && cd ../frontend && npm install"
  },
  "keywords": ["zammad", "sla", "reports", "react"],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
EOF

echo "✓ Scripts configurados"
echo ""

echo "✅ ¡Migración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Comparte el link de Figma"
echo "2. Ejecuta: npm run install:all"
echo "3. Ejecuta: npm run dev"
echo ""
echo "🌐 URLs:"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "📖 Lee REACT_MIGRATION_GUIDE.md para más detalles"
