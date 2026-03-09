#!/bin/bash
set -e

# =============================================
# Deploy Script - Zammad SLA Reporter
# =============================================
# Uso:
#   ./deploy.sh             → Push + deploy en EC2
#   ./deploy.sh --no-push   → Solo deploy (sin git push)
#   ./deploy.sh --logs      → Muestra logs al final
#   ./deploy.sh --no-push --logs
# =============================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Cargar config local (no commiteada)
if [ -f .env.deploy ]; then
  source .env.deploy
fi

EC2_HOST="${EC2_HOST:-10.67.4.151}"
EC2_USER="${EC2_USER:-ec2-user}"
EC2_KEY="${EC2_KEY:-}"
EC2_APP_DIR="${EC2_APP_DIR:-/home/ec2-user/slascalculator}"
EC2_LOG_FILE="${EC2_LOG_FILE:-/home/ec2-user/app.log}"

# Flags
NO_PUSH=false
SHOW_LOGS=false
for arg in "$@"; do
  case $arg in
    --no-push) NO_PUSH=true ;;
    --logs)    SHOW_LOGS=true ;;
  esac
done

# Validar SSH key
if [ -z "$EC2_KEY" ]; then
  echo -e "${RED}Error: EC2_KEY no definido.${NC}"
  echo ""
  echo "Crea el archivo .env.deploy con:"
  echo "  EC2_KEY=\"/ruta/a/tu-key.pem\""
  echo ""
  echo "Ver .env.deploy.example para referencia."
  exit 1
fi

ssh_cmd() {
  ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "${EC2_USER}@${EC2_HOST}" "$@"
}

# ── Paso 1: Git push ──────────────────────────────────────
if [ "$NO_PUSH" = false ]; then
  echo -e "${YELLOW}[1/2] Pushing a GitHub...${NC}"
  git push origin main
  echo -e "${GREEN}✓ Push completado${NC}"
fi

# ── Paso 2: Deploy en EC2 ─────────────────────────────────
echo -e "${YELLOW}[2/2] Desplegando en EC2...${NC}"

ssh_cmd bash << REMOTE
  set -e
  cd "$EC2_APP_DIR"

  echo "  → git pull..."
  git pull origin main

  echo "  → npm install..."
  npm install --prefix backend --production --quiet

  echo "  → Reiniciando servidor..."
  pkill -f "node server.js" || true
  sleep 1

  cd backend
  nohup node server.js > "$EC2_LOG_FILE" 2>&1 &
  sleep 2

  if pgrep -f "node server.js" > /dev/null; then
    echo "  ✓ Servidor corriendo (PID: \$(pgrep -f 'node server.js'))"
  else
    echo "  ✗ ERROR: el servidor no inició. Revisa los logs:"
    tail -20 "$EC2_LOG_FILE"
    exit 1
  fi
REMOTE

echo ""
echo -e "${GREEN}✓ Deploy completado — http://${EC2_HOST}${NC}"

# ── Paso 3 (opcional): Logs ───────────────────────────────
if [ "$SHOW_LOGS" = true ]; then
  echo ""
  echo -e "${YELLOW}Logs en tiempo real (Ctrl+C para salir):${NC}"
  ssh_cmd "tail -f $EC2_LOG_FILE"
fi
