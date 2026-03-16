// filename: backend-sanbox/src/config/swagger.ts

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sandbox Master API',
            version: '1.0.0',
            description: 'API para gerenciamento de sandboxes Docker',
        },
        servers: [
            {
                url: 'http://localhost:3000',
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
            },
        },
    },
    apis: ['./src/routes/*.ts'], // caminho para os arquivos de rota
};

export const swaggerSpec = swaggerJsdoc(options);