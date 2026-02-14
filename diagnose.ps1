# Script de Diagnóstico para Setup de React
# Ejecutar con: .\diagnose.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Diagnóstico de Setup React" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node.js y npm
Write-Host "[1/7] Verificando Node.js y npm..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "  ✓ npm: $npmVersion" -ForegroundColor Green

    # Verificar versión mínima de Node (18+)
    $nodeVersionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeVersionNumber -lt 18) {
        Write-Host "  ⚠ ADVERTENCIA: Node.js $nodeVersion detectado. Se recomienda Node.js 18 o superior" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ ERROR: Node.js o npm no está instalado" -ForegroundColor Red
    Write-Host "    Descarga Node.js desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 2. Verificar ubicación actual
Write-Host "[2/7] Verificando directorio actual..." -ForegroundColor Yellow
$currentPath = Get-Location
Write-Host "  Ubicación: $currentPath" -ForegroundColor White

if ($currentPath -notlike "*zammad-sla-reporter*") {
    Write-Host "  ⚠ ADVERTENCIA: No estás en el directorio del proyecto" -ForegroundColor Red
    Write-Host "    Ejecuta: cd 'c:\Users\Maximiliano Pulido\Desktop\zammad-sla-reporter'" -ForegroundColor Yellow
}
Write-Host ""

# 3. Verificar estructura actual
Write-Host "[3/7] Verificando estructura de archivos..." -ForegroundColor Yellow

$currentStructure = @{
    "config" = Test-Path "config"
    "middleware" = Test-Path "middleware"
    "routes" = Test-Path "routes"
    "services" = Test-Path "services"
    "utils" = Test-Path "utils"
    "server.js" = Test-Path "server.js"
    "backend" = Test-Path "backend"
    "frontend" = Test-Path "frontend"
    "package.json" = Test-Path "package.json"
}

foreach ($item in $currentStructure.GetEnumerator()) {
    if ($item.Value) {
        Write-Host "  ✓ $($item.Key) - Existe" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $($item.Key) - No existe" -ForegroundColor Gray
    }
}
Write-Host ""

# 4. Determinar estado de migración
Write-Host "[4/7] Determinando estado de migración..." -ForegroundColor Yellow

$backendExists = Test-Path "backend"
$frontendExists = Test-Path "frontend"
$oldStructureExists = (Test-Path "config") -or (Test-Path "routes")

if ($backendExists -and $frontendExists) {
    Write-Host "  ✓ Migración completa - Backend y Frontend separados" -ForegroundColor Green
    $migrationStatus = "complete"
} elseif ($backendExists -and -not $frontendExists) {
    Write-Host "  ⚠ Migración parcial - Backend creado, falta Frontend" -ForegroundColor Yellow
    $migrationStatus = "partial-backend"
} elseif ($oldStructureExists -and -not $backendExists) {
    Write-Host "  ⚠ No migrado - Estructura antigua detectada" -ForegroundColor Yellow
    $migrationStatus = "not-started"
} else {
    Write-Host "  ✗ Estado desconocido" -ForegroundColor Red
    $migrationStatus = "unknown"
}
Write-Host ""

# 5. Verificar dependencias
Write-Host "[5/7] Verificando dependencias instaladas..." -ForegroundColor Yellow

if (Test-Path "backend/node_modules") {
    Write-Host "  ✓ Backend - node_modules existe" -ForegroundColor Green
} elseif (Test-Path "backend") {
    Write-Host "  ✗ Backend - node_modules NO existe" -ForegroundColor Red
    Write-Host "    Ejecuta: cd backend && npm install" -ForegroundColor Yellow
} else {
    Write-Host "  - Backend aún no creado" -ForegroundColor Gray
}

if (Test-Path "frontend/node_modules") {
    Write-Host "  ✓ Frontend - node_modules existe" -ForegroundColor Green
} elseif (Test-Path "frontend") {
    Write-Host "  ✗ Frontend - node_modules NO existe" -ForegroundColor Red
    Write-Host "    Ejecuta: cd frontend && npm install" -ForegroundColor Yellow
} else {
    Write-Host "  - Frontend aún no creado" -ForegroundColor Gray
}
Write-Host ""

# 6. Verificar Git
Write-Host "[6/7] Verificando Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "  ✓ Git instalado: $gitVersion" -ForegroundColor Green

    # Verificar si hay cambios sin commitear
    $gitStatus = git status --short
    if ($gitStatus) {
        Write-Host "  ⚠ Hay cambios sin commitear" -ForegroundColor Yellow
        Write-Host "    Se recomienda hacer commit antes de migrar" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠ Git no instalado (opcional)" -ForegroundColor Yellow
}
Write-Host ""

# 7. Recomendaciones
Write-Host "[7/7] Recomendaciones según estado..." -ForegroundColor Yellow
Write-Host ""

switch ($migrationStatus) {
    "not-started" {
        Write-Host "  ACCIÓN RECOMENDADA:" -ForegroundColor Cyan
        Write-Host "  1. Ejecuta: .\setup-react.bat" -ForegroundColor White
        Write-Host "     O sigue setup-manual.md paso a paso" -ForegroundColor White
    }
    "partial-backend" {
        Write-Host "  ACCIÓN RECOMENDADA:" -ForegroundColor Cyan
        Write-Host "  1. Crear proyecto frontend:" -ForegroundColor White
        Write-Host "     npm create vite@latest frontend -- --template react" -ForegroundColor White
        Write-Host "  2. Instalar dependencias frontend:" -ForegroundColor White
        Write-Host "     cd frontend && npm install" -ForegroundColor White
    }
    "complete" {
        Write-Host "  ACCIÓN RECOMENDADA:" -ForegroundColor Cyan
        Write-Host "  1. Instalar dependencias (si faltan):" -ForegroundColor White
        Write-Host "     npm run install:all" -ForegroundColor White
        Write-Host "  2. Iniciar desarrollo:" -ForegroundColor White
        Write-Host "     npm run dev" -ForegroundColor White
    }
    "unknown" {
        Write-Host "  ACCIÓN RECOMENDADA:" -ForegroundColor Cyan
        Write-Host "  1. Comparte la salida de este diagnóstico" -ForegroundColor White
        Write-Host "  2. Comparte el error específico que tuviste" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Diagnóstico Completo" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Comparte esta salida si necesitas ayuda" -ForegroundColor Yellow
