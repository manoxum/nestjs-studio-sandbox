#!/bin/bash

# shellcheck disable=SC2164
cd "$(dirname "$(readlink -f "$0")")/.."

if docker ps >/dev/null 2>&1; then
    echo "Docker está ativo e respondendo."
else
    echo "Docker não está respondendo. Iniciando Docker Desktop de forma isolada..."

    # Tentativa com setsid (mais robusta para isolar o grupo de processos)
    if command -v setsid >/dev/null 2>&1; then
        setsid docker desktop start >/dev/null 2>&1 &
    else
        # Fallback para subshell isolado
        (docker desktop start </dev/null >/dev/null 2>&1 &)
    fi

    echo "Aguardando o daemon do Docker..."
    until docker ps >/dev/null 2>&1; do
        printf "."
        sleep 1
    done
    echo -e "\nDocker está pronto para uso."
fi

nodemon --watch . --ext sh,ts,js,dockerfile,yaml --ignore node_modules --exec "./run.sh"