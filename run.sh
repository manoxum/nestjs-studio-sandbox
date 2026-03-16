#!/bin/bash
# run.sh

echo ">>> Parada forçada e limpeza agressiva de containers..."
docker ps -a --filter "label=com.docker.compose.project=sandbox-engine" -q | xargs -r docker rm -f

echo ">>> Parada forçada e limpeza agressiva..."
docker compose -p sandbox-engine --env-file .env down --remove-orphans -v

echo ">>> Iniciando build e deploy..."
docker compose -p sandbox-engine --env-file .env up -d --build

# Aguarda o serviço estabilizar (ajuste o tempo se necessário)
echo ">>> Aguardando 1 segundos para inicialização do sistema..."
sleep 1

echo ">>> Gerando documentação da API..."
# Tenta baixar o swagger.json (o host localhost deve apontar para onde o serviço está exposto)
curl -s -o swagger.json http://localhost:3000/api-docs.json

# Converte o swagger para Markdown
if [ -f "swagger.json" ]; then
    npx swagger-markdown -i swagger.json -o README-API.md
    echo ">>> README-API.md gerado com sucesso."
else
    echo ">>> Erro: Não foi possível obter o swagger.json. Verifique se o servidor está rodando em http://localhost:3000"
fi

echo ">>> Logs em tempo real:"
docker compose -p sandbox-engine --env-file .env logs -f --tail 20 master