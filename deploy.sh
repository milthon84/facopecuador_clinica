#!/bin/bash
# =============================================================
# Script de deploy para Hostinger
# Ejecutar por SSH: bash deploy.sh
# =============================================================

set -e  # Detener si cualquier comando falla

echo "🚀 Iniciando deploy..."

# 1. Obtener últimos cambios de git
echo "📥 Jalando cambios de git..."
git pull origin main

# 2. Instalar dependencias si cambiaron
echo "📦 Instalando dependencias..."
npm install --production=false

# 3. Construir la aplicación
echo "🔨 Construyendo la aplicación..."
npm run build

# 4. Reiniciar el proceso con PM2
echo "🔄 Reiniciando servidor..."
if command -v pm2 &> /dev/null; then
    pm2 restart all --update-env
    echo "✅ PM2 reiniciado"
else
    echo "⚠ PM2 no encontrado — reinicia el proceso manualmente desde el panel de Hostinger"
fi

echo ""
echo "✅ Deploy completado exitosamente"
echo "🌐 Sitio: https://clinica.facop.com.ec"
