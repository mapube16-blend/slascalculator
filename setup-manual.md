# Setup Manual de React (Paso a Paso)

Si el script automático no funciona, ejecuta estos comandos uno por uno:

## Paso 1: Reorganizar Estructura

```powershell
# Crear carpeta backend
mkdir backend

# Mover archivos del backend
Move-Item -Path config -Destination backend\ -ErrorAction SilentlyContinue
Move-Item -Path middleware -Destination backend\ -ErrorAction SilentlyContinue
Move-Item -Path routes -Destination backend\ -ErrorAction SilentlyContinue
Move-Item -Path services -Destination backend\ -ErrorAction SilentlyContinue
Move-Item -Path utils -Destination backend\ -ErrorAction SilentlyContinue
Move-Item -Path server.js -Destination backend\ -ErrorAction SilentlyContinue
Move-Item -Path package.json -Destination backend\package.json -ErrorAction SilentlyContinue
Move-Item -Path package-lock.json -Destination backend\package-lock.json -ErrorAction SilentlyContinue
Move-Item -Path node_modules -Destination backend\node_modules -ErrorAction SilentlyContinue

# Mover .env
Move-Item -Path .env -Destination backend\.env -ErrorAction SilentlyContinue
```

## Paso 2: Crear Proyecto React

```powershell
# Crear proyecto React con Vite
npm create vite@latest frontend -- --template react
```

Presiona Enter cuando pregunte por confirmación.

## Paso 3: Instalar Dependencias Frontend

```powershell
cd frontend

# Instalar dependencias base
npm install

# Instalar dependencias adicionales
npm install axios react-router-dom chart.js react-chartjs-2 @tanstack/react-table react-hook-form date-fns phosphor-react

# Instalar Tailwind
npm install -D tailwindcss postcss autoprefixer

# Inicializar Tailwind
npx tailwindcss init -p
```

## Paso 4: Configurar Tailwind

Crea/edita `frontend/tailwind.config.js`:

```javascript
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
```

Edita `frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}
```

## Paso 5: Configurar Vite Proxy

Edita `frontend/vite.config.js`:

```javascript
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
```

## Paso 6: Configurar Scripts Root

```powershell
cd ..

# Instalar concurrently
npm install concurrently -D
```

Crea `package.json` en la raíz:

```json
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
```

## Paso 7: Instalar Todas las Dependencias

```powershell
npm run install:all
```

## Paso 8: Iniciar Desarrollo

```powershell
npm run dev
```

¡Listo! Deberías ver:
- Backend en: http://localhost:3000
- Frontend en: http://localhost:5173
