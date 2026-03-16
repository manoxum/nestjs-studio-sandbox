# Sandbox Engine – Documentação Completa

## 1. Visão Geral

O **Sandbox Engine** é uma aplicação servidor (master) que expõe uma API REST para gerenciamento de ambientes isolados – denominados **sub‑sandboxes** – cada um executado como um contêiner Docker independente. O objetivo é permitir a criação sob demanda de contêineres efêmeros, com alocação dinâmica de portas, execução de comandos, manipulação de arquivos e instalação de pacotes npm, tudo dentro de um ambiente controlado e seguro.

O projeto é escrito em **TypeScript** e utiliza **Node.js** com **Express** para a API. A comunicação com o Docker é feita através da **CLI do Docker** (socket montado no contêiner master). O orquestrador principal (`master`) é executado via Docker Compose, garantindo que o ambiente de desenvolvimento e produção seja facilmente reproduzível.

## 2. Arquitetura

A aplicação é composta por dois tipos de entidades:

- **Master**: contêiner principal que expõe a API (porta 3000) e gerencia os sub‑sandboxes. Ele possui acesso ao socket do Docker do host, permitindo criar, listar e destruir contêineres.
- **Sub‑sandboxes**: contêineres criados dinamicamente a partir de imagens Docker fornecidas pelo usuário. Cada sub‑sandbox pode expor portas específicas, que são mapeadas para portas livres em um intervalo pré‑definido no host.

O master mantém um arquivo JSON (`port_allocations.json`) para persistir o mapeamento de portas entre contêineres e host, garantindo que as portas não sejam reutilizadas enquanto o contêiner existir.

**Diagrama simplificado:**



