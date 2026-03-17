################################## PREPARE BASE IMAGE ##################################
FROM node:22-slim as packages
RUN apt update -y
RUN apt install -y python3 make g++
RUN apt install -y curl unzip

# Instala docker cli
RUN curl -L https://download.docker.com/linux/static/stable/x86_64/docker-27.3.1.tgz | tar -xz -C /tmp \
    && mv /tmp/docker/docker /usr/local/bin/ \
    && apt clean \
    && rm -rf /var/lib/apt/lists/* /tmp/docker

# Instalação global das ferramentas de desenvolvimento
RUN npm install -g ts-node-dev typescript

################################## PREPARE DEPENDENCY ##################################
FROM node:22-slim as deps
WORKDIR /app
COPY package*.json ./
RUN npm install

################################## PREPARE SANDBOX ##################################
FROM packages as app
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY . .

# GERA O CLIENTE PRISMA (NOVO)
RUN npx prisma generate

# Script de entrypoint para aplicar migrações e iniciar a aplicação
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["ts-node-dev", "--respawn", "--transpile-only", "src/server.ts"]