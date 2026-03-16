// filename: backend-sanbox/src/swagger.ts

import swaggerJsdoc from 'swagger-jsdoc';

const options = {
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
                description: 'Servidor de desenvolvimento',
            },
        ],
        components: {
            schemas: {
                PortMapping: {
                    type: 'object',
                    properties: {
                        hostPort: { type: 'number', description: 'Porta no host' },
                        internalPort: { type: 'number', description: 'Porta no container' },
                    },
                },
                Container: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        status: { type: 'string' },
                        image: { type: 'string' },
                        id: { type: 'string' },
                        portMappings: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/PortMapping' },
                        },
                        type: { type: 'string', enum: ['sub', 'build'] },
                    },
                },
                BuildInfo: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        containerName: { type: 'string' },
                        imageName: { type: 'string' },
                        status: { type: 'string', enum: ['building', 'running', 'stopped', 'error'] },
                        portMappings: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/PortMapping' },
                        },
                        createdAt: { type: 'string', format: 'date-time' },
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
    apis: ['./src/routes/*.ts'], // arquivos onde estarão os comentários JSDoc
};

export const specs = swaggerJsdoc(options);