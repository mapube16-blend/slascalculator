#!/bin/bash
set -e
cd /home/ec2-user/slascalculator

echo "→ git pull..."
git pull origin main

echo "→ npm install backend..."
npm install --prefix backend --production --quiet 2>/dev/null || true

echo "→ npm install frontend..."
npm install --prefix frontend --quiet 2>/dev/null || true

echo "→ npm run build frontend..."
npm run build --prefix frontend --quiet 2>/dev/null || true

echo "→ Reiniciando servidor (pm2)..."
pm2 reload sla-reporter || pm2 start backend/server.js --name sla-reporter

echo "✓ Servidor recargado/iniciado"
pm2 list
