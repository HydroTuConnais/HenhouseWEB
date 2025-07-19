#!/bin/bash

# Script de préparation pour Pterodactyl
echo "📦 Préparation pour déploiement Pterodactyl..."

# Build de production
echo "🔨 Build de production..."
pnpm run build:prod

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build"
    exit 1
fi

# Création du dossier de déploiement
echo "📁 Création du dossier de déploiement..."
rm -rf pterodactyl-deploy
mkdir -p pterodactyl-deploy

# Copie des fichiers nécessaires
echo "📋 Copie des fichiers..."
cp -r .next/ pterodactyl-deploy/
cp package.json pterodactyl-deploy/
cp server.js pterodactyl-deploy/
cp .env.production pterodactyl-deploy/.env
cp next.config.ts pterodactyl-deploy/

# Copie du dossier public si il existe
if [ -d "public" ]; then
    cp -r public/ pterodactyl-deploy/
fi

# Création de l'archive
echo "📦 Création de l'archive..."
cd pterodactyl-deploy
zip -r ../pterodactyl-deploy.zip .
cd ..

# Nettoyage
rm -rf pterodactyl-deploy

echo "✅ Préparation terminée!"
echo "📁 Archive créée: pterodactyl-deploy.zip"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Uploadez pterodactyl-deploy.zip sur votre serveur Pterodactyl"
echo "2. Décompressez l'archive"
echo "3. Configurez les variables d'environnement:"
echo "   - NODE_ENV=production"
echo "   - PORT=3000"
echo "   - HOSTNAME=0.0.0.0"
echo "4. Script de démarrage: node server.js"