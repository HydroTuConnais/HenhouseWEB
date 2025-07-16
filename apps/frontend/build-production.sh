#!/bin/bash

# Script de build pour production
echo "🚀 Démarrage du build de production..."

# Vérification des dépendances
echo "📦 Installation des dépendances..."
pnpm install --frozen-lockfile

# Nettoyage du cache
echo "🧹 Nettoyage du cache..."
rm -rf .next
rm -rf out

# Build avec variables d'environnement de production
echo "🔨 Build Next.js en mode production..."
NODE_ENV=production pnpm run build

# Vérification que le build a réussi
if [ $? -eq 0 ]; then
    echo "✅ Build terminé avec succès!"
    echo "📁 Fichiers générés dans .next/"
    ls -la .next/
else
    echo "❌ Erreur lors du build"
    exit 1
fi

echo "🎉 Build prêt pour le déploiement!"