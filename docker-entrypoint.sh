#!/bin/sh
set -e

echo "🔄 Gerando cliente Prisma..."
npx prisma generate

echo "🔄 Aplicando migrações do Prisma..."
psm deploy

echo "🚀 Iniciando aplicação..."
exec "$@"