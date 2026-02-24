#!/bin/bash
set -e

# =======================================================================
# Deploy AWS Infrastructure - Zammad SLA Reporter Pipeline
# =======================================================================
#
# Pipeline: CRON (EC2, 2 AM) → Parquet → S3 → Glue Crawler → Data Catalog → QuickSight
#
# Uso:
#   ./aws/deploy-infra.sh                    # Deploy con valores por defecto
#   ./aws/deploy-infra.sh --env staging      # Deploy en staging
#   ./aws/deploy-infra.sh --delete           # Eliminar stack
#   ./aws/deploy-infra.sh --status           # Ver estado del stack
#
# Requisitos:
#   - AWS CLI configurado (aws configure)
#   - Permisos: CloudFormation, S3, Glue, IAM
# =======================================================================

# Defaults
ENVIRONMENT="prod"
STACK_NAME="zammad-sla-reporter-pipeline"
REGION="${AWS_REGION:-us-east-1}"
TEMPLATE="aws/cloudformation.yml"
ACTION="deploy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)       ENVIRONMENT="$2"; shift 2 ;;
    --region)    REGION="$2"; shift 2 ;;
    --bucket)    BUCKET_NAME="$2"; shift 2 ;;
    --delete)    ACTION="delete"; shift ;;
    --status)    ACTION="status"; shift ;;
    --outputs)   ACTION="outputs"; shift ;;
    --help|-h)   ACTION="help"; shift ;;
    *)           echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
  esac
done

FULL_STACK_NAME="${STACK_NAME}-${ENVIRONMENT}"

show_help() {
  echo -e "${CYAN}=== Zammad SLA Reporter — AWS Pipeline Deploy ===${NC}"
  echo ""
  echo "Uso: ./aws/deploy-infra.sh [opciones]"
  echo ""
  echo "Opciones:"
  echo "  --env <env>       Ambiente: dev, staging, prod (default: prod)"
  echo "  --region <region> Region AWS (default: us-east-1)"
  echo "  --bucket <name>   Nombre custom del bucket S3"
  echo "  --delete          Eliminar el stack de CloudFormation"
  echo "  --status          Ver estado actual del stack"
  echo "  --outputs         Ver outputs del stack (bucket name, crawler, etc.)"
  echo "  --help, -h        Mostrar esta ayuda"
  echo ""
  echo "Pipeline:"
  echo "  EC2 CRON (2 AM) → Parquet → S3 → Glue Crawler (2:30 AM) → Data Catalog → QuickSight"
}

check_aws_cli() {
  if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI no encontrado. Instalar: https://aws.amazon.com/cli/${NC}"
    exit 1
  fi

  # Verify credentials
  if ! aws sts get-caller-identity --region "$REGION" &> /dev/null; then
    echo -e "${RED}ERROR: Credenciales AWS no configuradas. Ejecutar: aws configure${NC}"
    exit 1
  fi

  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "$REGION")
  echo -e "${GREEN}✓ AWS CLI OK — Account: ${ACCOUNT_ID}, Region: ${REGION}${NC}"
}

deploy_stack() {
  echo -e "\n${CYAN}=== Desplegando Pipeline AWS ===${NC}"
  echo -e "Stack:    ${YELLOW}${FULL_STACK_NAME}${NC}"
  echo -e "Ambiente: ${YELLOW}${ENVIRONMENT}${NC}"
  echo -e "Region:   ${YELLOW}${REGION}${NC}"
  echo ""

  # Build parameters
  PARAMS="ParameterKey=Environment,ParameterValue=${ENVIRONMENT}"
  
  if [ -n "$BUCKET_NAME" ]; then
    PARAMS="${PARAMS} ParameterKey=S3BucketName,ParameterValue=${BUCKET_NAME}"
  fi

  echo -e "${YELLOW}>>> Validando template...${NC}"
  aws cloudformation validate-template \
    --template-body "file://${TEMPLATE}" \
    --region "$REGION" > /dev/null
  echo -e "${GREEN}✓ Template válido${NC}"

  echo -e "\n${YELLOW}>>> Desplegando CloudFormation stack...${NC}"
  aws cloudformation deploy \
    --template-file "$TEMPLATE" \
    --stack-name "$FULL_STACK_NAME" \
    --parameter-overrides $PARAMS \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION" \
    --tags \
      Project=zammad-sla-reporter \
      Environment="$ENVIRONMENT" \
      ManagedBy=cloudformation

  echo -e "\n${GREEN}✓ Stack desplegado exitosamente${NC}\n"

  # Show outputs
  show_outputs

  echo -e "\n${CYAN}=== Siguiente paso ===${NC}"
  echo -e "1. Copiar el nombre del bucket S3 de arriba"
  echo -e "2. Configurar en la EC2:"
  echo -e "   ${YELLOW}AWS_S3_BUCKET=<bucket-name>${NC}"
  echo -e "   ${YELLOW}AWS_GLUE_CRAWLER_NAME=<crawler-name>${NC}"
  echo -e "   ${YELLOW}AWS_REGION=${REGION}${NC}"
  echo -e "3. Asociar el Instance Profile a la EC2:"
  echo -e "   ${YELLOW}aws ec2 associate-iam-instance-profile --instance-id <ID> --iam-instance-profile Name=<profile-name> --region ${REGION}${NC}"
  echo -e "4. Conectar QuickSight a Glue:"
  echo -e "   QuickSight → Datasets → New → Athena → Database: zammad_sla_db"
}

delete_stack() {
  echo -e "${RED}>>> Eliminando stack: ${FULL_STACK_NAME}${NC}"
  echo -e "${YELLOW}NOTA: El bucket S3 NO se eliminará (DeletionPolicy: Retain)${NC}"
  read -p "¿Continuar? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    aws cloudformation delete-stack \
      --stack-name "$FULL_STACK_NAME" \
      --region "$REGION"
    echo -e "${GREEN}✓ Stack eliminado${NC}"
  fi
}

show_status() {
  echo -e "${CYAN}=== Estado del Stack ===${NC}"
  aws cloudformation describe-stacks \
    --stack-name "$FULL_STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].{Status:StackStatus,Created:CreationTime,Updated:LastUpdatedTime}" \
    --output table 2>/dev/null || echo -e "${YELLOW}Stack no encontrado${NC}"
}

show_outputs() {
  echo -e "${CYAN}=== Outputs del Stack ===${NC}"
  aws cloudformation describe-stacks \
    --stack-name "$FULL_STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[*].{Key:OutputKey,Value:OutputValue}" \
    --output table 2>/dev/null || echo -e "${YELLOW}Stack no encontrado o sin outputs${NC}"
}

# Main
case "$ACTION" in
  deploy)
    check_aws_cli
    deploy_stack
    ;;
  delete)
    check_aws_cli
    delete_stack
    ;;
  status)
    check_aws_cli
    show_status
    ;;
  outputs)
    check_aws_cli
    show_outputs
    ;;
  help)
    show_help
    ;;
esac
