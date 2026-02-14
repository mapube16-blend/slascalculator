# Script para completar el setup de React
# Ejecutar desde la raíz del proyecto: .\complete-setup.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Completando Setup de React" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la raíz del proyecto
if (-not (Test-Path "frontend")) {
    Write-Host "ERROR: No se encuentra la carpeta frontend" -ForegroundColor Red
    Write-Host "Asegúrate de estar en la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Paso 1: Configurar Tailwind en frontend
Write-Host "[1/6] Configurando Tailwind CSS..." -ForegroundColor Yellow
Set-Location frontend

# Verificar si tailwindcss está instalado
$tailwindInstalled = Test-Path "node_modules/tailwindcss"
if (-not $tailwindInstalled) {
    Write-Host "  Instalando Tailwind CSS..." -ForegroundColor Gray
    npm install -D tailwindcss@latest postcss@latest autoprefixer@latest
}

# Inicializar Tailwind
Write-Host "  Inicializando Tailwind..." -ForegroundColor Gray
npx tailwindcss init -p

Write-Host "  OK - Tailwind configurado" -ForegroundColor Green
Write-Host ""

# Paso 2: Copiar archivos de configuración
Write-Host "[2/6] Copiando archivos de configuración..." -ForegroundColor Yellow
Set-Location ..

if (Test-Path "frontend-config") {
    Copy-Item "frontend-config\tailwind.config.js" "frontend\tailwind.config.js" -Force
    Copy-Item "frontend-config\index.css" "frontend\src\index.css" -Force
    Copy-Item "frontend-config\vite.config.js" "frontend\vite.config.js" -Force
    Write-Host "  OK - Archivos de configuración copiados" -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: No se encontró frontend-config/" -ForegroundColor Yellow
    Write-Host "  Continuando con configuración por defecto..." -ForegroundColor Gray
}
Write-Host ""

# Paso 3: Instalar dependencias del backend
Write-Host "[3/6] Verificando dependencias del backend..." -ForegroundColor Yellow
if (Test-Path "backend/package.json") {
    if (-not (Test-Path "backend/node_modules")) {
        Write-Host "  Instalando dependencias del backend..." -ForegroundColor Gray
        Set-Location backend
        npm install
        Set-Location ..
        Write-Host "  OK - Dependencias del backend instaladas" -ForegroundColor Green
    } else {
        Write-Host "  OK - Dependencias del backend ya instaladas" -ForegroundColor Green
    }
} else {
    Write-Host "  ADVERTENCIA: No se encontró backend/package.json" -ForegroundColor Yellow
}
Write-Host ""

# Paso 4: Instalar concurrently en root
Write-Host "[4/6] Instalando concurrently..." -ForegroundColor Yellow
npm install -D concurrently
Write-Host "  OK - concurrently instalado" -ForegroundColor Green
Write-Host ""

# Paso 5: Crear package.json en root
Write-Host "[5/6] Creando package.json en root..." -ForegroundColor Yellow

$packageJson = @"
{
  "name": "zammad-sla-reporter",
  "version": "2.0.0",
  "description": "Sistema de reportes personalizados de SLA para Zammad con React",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm start",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "preview": "cd frontend && npm run preview"
  },
  "keywords": ["zammad", "sla", "reports", "react"],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
"@

$packageJson | Out-File -FilePath "package.json" -Encoding UTF8
Write-Host "  OK - package.json creado" -ForegroundColor Green
Write-Host ""

# Paso 6: Verificación final
Write-Host "[6/6] Verificación final..." -ForegroundColor Yellow

$checks = @{
    "frontend/node_modules" = Test-Path "frontend/node_modules"
    "frontend/tailwind.config.js" = Test-Path "frontend/tailwind.config.js"
    "frontend/vite.config.js" = Test-Path "frontend/vite.config.js"
    "backend/node_modules" = Test-Path "backend/node_modules"
    "backend/server.js" = Test-Path "backend/server.js"
    "package.json (root)" = Test-Path "package.json"
}

$allGood = $true
foreach ($check in $checks.GetEnumerator()) {
    if ($check.Value) {
        Write-Host "  OK $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "  X  $($check.Key)" -ForegroundColor Red
        $allGood = $false
    }
}
Write-Host ""

# Resultado final
Write-Host "================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  Setup Completado Exitosamente!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Próximos pasos:" -ForegroundColor Yellow
    Write-Host "1. Ejecuta: npm run dev" -ForegroundColor White
    Write-Host "2. Abre:" -ForegroundColor White
    Write-Host "   - Backend:  http://localhost:3000" -ForegroundColor Cyan
    Write-Host "   - Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "  Setup Incompleto" -ForegroundColor Yellow
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Algunos pasos fallaron. Revisa los errores arriba." -ForegroundColor Yellow
    Write-Host ""
}
