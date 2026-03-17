#!/bin/bash
# run.sh

source .env

echo ">>> Parada forçada e limpeza agressiva de containers..."
docker ps -a --filter "label=com.docker.compose.project=sandbox-engine" -q | xargs -r docker rm -f

echo ">>> Parada forçada e limpeza agressiva..."
docker compose -p sandbox-engine --env-file .env down --remove-orphans

echo ">>> Iniciando build e deploy..."
docker compose -p sandbox-engine --env-file .env up -d --build

echo ">>> Gerando documentação da API..."
echo ">>> Aguardando a API estar disponível em http://localhost:${PORT_APPLICATION}/api-docs.json..."

# Tentativas máximas (ex: 60  tentativas * 3 segundos = 3 min)
MAX_RETRIES=60
RETRY_COUNT=0

until $(curl -sf -o swagger.json "http://localhost:${PORT_APPLICATION}/api-docs.json"); do
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo ">>> Erro: Timeout ao aguardar o swagger.json após ${MAX_RETRIES} tentativas."
        exit 1
    fi
    echo ">>> Aplicação ainda não respondeu (Tentativa ${RETRY_COUNT}/${MAX_RETRIES}). Aguardando 2s..."
    sleep 3
done

echo ">>> swagger.json obtido com sucesso!"

# Converte o swagger para Markdown
if [ -f "swagger.json" ]; then
    npx swagger-markdown -i swagger.json -o README-API.md
    echo ">>> README-API.md gerado com sucesso."
else
    echo ">>> Erro: Não foi possível obter o swagger.json. Verifique se o servidor está rodando em http://localhost:${PORT_APPLICATION}"
fi

echo ">>> Logs em tempo real:"
docker compose -p sandbox-engine --env-file .env logs -f --tail 20 master