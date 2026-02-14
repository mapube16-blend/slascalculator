@echo off
echo.
echo ========================================
echo   Migracion a React - Zammad SLA Reporter
echo ========================================
echo.

REM Paso 1: Crear carpeta backend
echo [1/6] Reorganizando estructura del proyecto...
if not exist backend mkdir backend

REM Mover archivos del backend (manteniendo docs en raiz)
if exist config move config backend\ >nul 2>&1
if exist middleware move middleware backend\ >nul 2>&1
if exist routes move routes backend\ >nul 2>&1
if exist services move services backend\ >nul 2>&1
if exist utils move utils backend\ >nul 2>&1
if exist server.js move server.js backend\ >nul 2>&1
if exist package.json move package.json backend\package.json >nul 2>&1
if exist package-lock.json move package-lock.json backend\package-lock.json >nul 2>&1
if exist node_modules move node_modules backend\node_modules >nul 2>&1

REM Mover .env
if exist .env (
    move .env backend\.env >nul 2>&1
    echo    - .env movido a backend/
)

echo    OK - Estructura reorganizada
echo.

REM Paso 2: Crear proyecto React
echo [2/6] Creando proyecto React con Vite...
call npm create vite@latest frontend -- --template react
echo    OK - Proyecto React creado
echo.

REM Paso 3: Instalar dependencias frontend
echo [3/6] Instalando dependencias de React...
cd frontend

call npm install
call npm install axios react-router-dom chart.js react-chartjs-2
call npm install @tanstack/react-table react-hook-form date-fns
call npm install phosphor-react
call npm install tailwindcss postcss autoprefixer -D

echo    OK - Dependencias instaladas
echo.

REM Paso 4: Configurar Tailwind
echo [4/6] Configurando Tailwind CSS...
call npx tailwindcss init -p

REM Crear tailwind.config.js
(
echo /** @type {import('tailwindcss'^).Config} */
echo export default {
echo   content: [
echo     "./index.html",
echo     "./src/**/*.{js,ts,jsx,tsx}",
echo   ],
echo   theme: {
echo     extend: {
echo       colors: {
echo         primary: '#2563eb',
echo         secondary: '#64748b',
echo         success: '#22c55e',
echo         warning: '#f59e0b',
echo         danger: '#ef4444',
echo       }
echo     },
echo   },
echo   plugins: [],
echo }
) > tailwind.config.js

REM Crear index.css
(
echo @tailwind base;
echo @tailwind components;
echo @tailwind utilities;
echo.
echo @layer base {
echo   body {
echo     @apply bg-gray-50 text-gray-900;
echo   }
echo }
) > src\index.css

echo    OK - Tailwind configurado
echo.

REM Paso 5: Configurar Vite
echo [5/6] Configurando proxy de Vite...
(
echo import { defineConfig } from 'vite'
echo import react from '@vitejs/plugin-react'
echo.
echo export default defineConfig({
echo   plugins: [react(^)],
echo   server: {
echo     port: 5173,
echo     proxy: {
echo       '/api': {
echo         target: 'http://localhost:3000',
echo         changeOrigin: true,
echo       }
echo     }
echo   }
echo }^)
) > vite.config.js

echo    OK - Vite configurado
echo.

REM Paso 6: Configurar scripts root
cd ..
echo [6/6] Configurando scripts de desarrollo...

call npm install concurrently -D

(
echo {
echo   "name": "zammad-sla-reporter",
echo   "version": "2.0.0",
echo   "description": "Sistema de reportes personalizados de SLA para Zammad con React",
echo   "scripts": {
echo     "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
echo     "dev:backend": "cd backend && npm run dev",
echo     "dev:frontend": "cd frontend && npm run dev",
echo     "build": "cd frontend && npm run build",
echo     "start:backend": "cd backend && npm start",
echo     "start": "npm run start:backend",
echo     "install:all": "cd backend && npm install && cd ../frontend && npm install"
echo   },
echo   "keywords": ["zammad", "sla", "reports", "react"],
echo   "author": "",
echo   "license": "ISC",
echo   "devDependencies": {
echo     "concurrently": "^8.2.2"
echo   }
echo }
) > package.json

echo    OK - Scripts configurados
echo.

echo ========================================
echo   Migracion completada exitosamente!
echo ========================================
echo.
echo Proximos pasos:
echo 1. Comparte el link de Figma
echo 2. Ejecuta: npm run install:all
echo 3. Ejecuta: npm run dev
echo.
echo URLs:
echo    Backend:  http://localhost:3000
echo    Frontend: http://localhost:5173
echo.
echo Lee REACT_MIGRATION_GUIDE.md para mas detalles
echo.
pause
