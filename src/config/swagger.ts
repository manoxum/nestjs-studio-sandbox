// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import process from "process";

const PORT = Number(process.env.PORT_APPLICATION ?? 3000);

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sandbox Master API',
            version: '1.0.0',
            description: 'API para gerenciamento de sandboxes Docker com suporte a WebSockets (Socket.IO) para atualizações em tempo real.',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Servidor local',
            },
        ],
        components: {
            schemas: {
                PortMapping: {
                    type: 'object',
                    properties: {
                        hostPort: { type: 'number', example: 16100 },
                        internalPort: { type: 'number', example: 3000 },
                    },
                },
                BuildInfo: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        containerName: { type: 'string' },
                        imageName: { type: 'string' },
                        status: { type: 'string', enum: ['building', 'running', 'stopped', 'error'] },
                        portMappings: { type: 'array', items: { $ref: '#/components/schemas/PortMapping' } },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                ContainerInfo: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        status: { type: 'string' },
                        image: { type: 'string' },
                        id: { type: 'string' },
                        portMappings: { type: 'array', items: { $ref: '#/components/schemas/PortMapping' } },
                        type: { type: 'string', enum: ['sub', 'build'] },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        logs: { type: 'string' },
                    },
                },
                Project: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
                        name: { type: 'string', example: 'meu-projeto' },
                        ownerId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174001' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        avatar: { type: 'string', nullable: true, description: 'URL da foto de perfil' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Collaborator: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        projectId: { type: 'string', format: 'uuid' },
                        role: { type: 'string', enum: ['owner', 'editor', 'viewer'] },
                        startAt: { type: 'string', format: 'date-time', nullable: true },
                        endAt: { type: 'string', format: 'date-time', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        user: { $ref: '#/components/schemas/User' }
                    }
                },
                Asset: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        type: { type: 'string' },
                        name: { type: 'string' },
                        ownerId: { type: 'string', format: 'uuid' },
                        projectId: { type: 'string', format: 'uuid' },
                        userOwnerId: { type: 'string', format: 'uuid', nullable: true },
                        path: { type: 'string' },
                        configs: { type: 'object' },
                        parentUid: { type: 'string', format: 'uuid', nullable: true, description: 'UID do asset pai (para hierarquia)' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Invite: {
                    type: 'object',
                    properties: {
                        uid: { type: 'string', format: 'uuid' },
                        token: { type: 'string' },
                        role: { type: 'string', enum: ['viewer', 'editor'] },
                        expiresAt: { type: 'string', format: 'date-time', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        creator: { $ref: '#/components/schemas/User' },
                    },
                },
                Contribution: {
                    type: 'object',
                    properties: {
                        uid: { type: 'string', format: 'uuid' },
                        user: { $ref: '#/components/schemas/User' },
                        project: { $ref: '#/components/schemas/Project' },
                        action: { type: 'string' },
                        details: { type: 'object' },
                        score: { type: 'integer' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
        tags: [
            { name: 'Auth' },
            { name: 'Users' },
            { name: 'Projects' },
            { name: 'Collaborators' },
            { name: 'Assets' },
            { name: 'Project Commands' },
            { name: 'Project Files' },
            { name: 'Builds' },
            { name: 'Containers' },
            { name: 'Sub-Containers' },
            { name: 'Arquivos' },
            { name: 'Comandos' },
            { name: 'Sistema' },
            { name: 'Invites' },
            { name: 'Contributions' },
            {
                name: 'WebSockets',
                description:
                    `### Eventos em tempo real via Socket.IO

**Autenticação:** O cliente deve enviar o token JWT no handshake: \`{ auth: { token: "JWT" } }\`.

**Eventos do cliente:**
- \`join-project(projectUid)\`: Entrar na sala do projeto.
- \`leave-project(projectUid)\`: Sair da sala do projeto.
- \`subscribe-asset(assetUid)\`: Subscrever a um asset específico (requer acesso ao projeto).
- \`unsubscribe-asset(assetUid)\`: Cancelar subscrição de um asset.

**Eventos do servidor (emitidos para a sala do projeto):**

- **\`project:updated\`** – Projeto atualizado.
  - Payload: \`{ projectUid, name, updatedAt, user: { uid, name }, sourceSocketId }\`
- **\`project:deleted\`** – Projeto eliminado.
  - Payload: \`{ projectUid, user: { uid, name }, sourceSocketId }\`
- **\`file:created\`** – Ficheiro criado (upload).
  - Payload: \`{ projectUid, filename, assetUid, action: 'created', user: { uid, name }, sourceSocketId }\`
- **\`file:updated\`** – Ficheiro atualizado (texto).
  - Payload: \`{ projectUid, filename, assetUid, action: 'updated', user: { uid, name }, sourceSocketId }\`
- **\`file:deleted\`** – Ficheiro eliminado.
  - Payload: \`{ projectUid, path, user: { uid, name }, sourceSocketId }\`
- **\`asset:created\`** – Asset criado.
  - Payload: \`{ projectUid, asset: { uid, type, name, path, configs, parentUid }, createdBy: { uid, name }, sourceSocketId }\`
- **\`asset:updated\`** – Asset atualizado.
  - Payload: \`{ projectUid, assetUid, asset: { uid, name, configs, parentUid }, updatedBy: { uid, name }, sourceSocketId }\`
- **\`asset:deleted\`** – Asset eliminado.
  - Payload: \`{ projectUid, assetUid, deletedBy: { uid, name }, sourceSocketId }\`
- **\`collaborator:added\`** – Colaborador adicionado.
  - Payload: \`{ projectUid, collaborator: { uid, user: { uid, name, email }, role, startAt, endAt }, addedBy: { uid, name }, sourceSocketId }\`
- **\`collaborator:updated\`** – Colaborador atualizado.
  - Payload: \`{ projectUid, collaborator: { uid, user: { uid, name, email }, role, startAt, endAt }, updatedBy: { uid, name }, sourceSocketId }\`
- **\`collaborator:removed\`** – Colaborador removido.
  - Payload: \`{ projectUid, userUid, removedBy: { uid, name }, sourceSocketId }\`

**Eventos do servidor (emitidos para a sala pessoal do utilizador):**

- **\`user:collaborator_added\`** – O utilizador foi adicionado como colaborador a um projeto.
  - Payload: \`{ projectUid, projectName, role, addedBy: { uid, name }, sourceSocketId }\`
- **\`user:collaborator_updated\`** – O papel do utilizador num projeto foi alterado.
  - Payload: \`{ projectUid, projectName, role, startAt, endAt, updatedBy: { uid, name }, sourceSocketId }\`
- **\`user:collaborator_removed\`** – O utilizador foi removido de um projeto.
  - Payload: \`{ projectUid, projectName, removedBy: { uid, name }, sourceSocketId }\`
- **\`user:avatar_updated\`** – O utilizador atualizou a sua foto de perfil.
  - Payload: \`{ avatarUrl, sourceSocketId }\`

**Nota:** Todos os eventos incluem informações contextuais, o utilizador que realizou a ação e o identificador da sessão socket que originou o evento.`
            }
        ]
    },
    apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);