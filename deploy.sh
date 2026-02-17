#!/bin/bash
set -e

# ===========================================
# Deploy Script - Zammad SLA Reporter
# ===========================================
# Uso:
#   ./deploy.sh frontend   → Despliega frontend a S3
#   ./deploy.sh backend    → Despliega backend a Elastic Beanstalk
#   ./deploy.sh all        → Despliega ambos
# ===========================================

# Configuración - CAMBIAR ESTOS VALORES
S3_BUCKET="TU-BUCKET-FRONTEND"
CLOUDFRONT_DISTRIBUTION_ID="TU-DISTRIBUTION-ID"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

deploy_frontend() {
  echo -e "${YELLOW}>>> Desplegando frontend a S3...${NC}"

  cd frontend
  npm run build
  aws s3 sync dist/ "s3://${S3_BUCKET}" --delete
  echo -e "${GREEN}>>> Frontend subido a S3${NC}"

  if [ "$CLOUDFRONT_DISTRIBUTION_ID" != "TU-DISTRIBUTION-ID" ]; then
    echo -e "${YELLOW}>>> Invalidando cache de CloudFront...${NC}"
    aws cloudfront create-invalidation \
      --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
      --paths "/*"
    echo -e "${GREEN}>>> Cache invalidado${NC}"
  fi

  cd ..
  echo -e "${GREEN}>>> Frontend desplegado exitosamente${NC}"
}

deploy_backend() {
  echo -e "${YELLOW}>>> Desplegando backend a Elastic Beanstalk...${NC}"

  cd backend
  eb deploy
  cd ..

  echo -e "${GREEN}>>> Backend desplegado exitosamente${NC}"
}

case "$1" in
  frontend)
    deploy_frontend
    ;;
  backend)
    deploy_backend
    ;;
  all)
    deploy_backend
    deploy_frontend
    ;;
  *)
    echo "Uso: ./deploy.sh {frontend|backend|all}"
    exit 1
    ;;
esac
