// filename: backend-sanbox/src/app.ts

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { requestLogger } from './utils/logger';
import cmdRouter from './routes/cmd';
import fileRouter from './routes/file';
import installRouter from './routes/install';
import restartRouter from './routes/restart';
import subRouter from './routes/sub';
import buildRouter from './routes/build';
import containersRouter from './routes/containers';
import { loadPortAllocations } from './services/portAlloc';
import { SANDBOX_DIR, BUILDS_DIR } from './config/constants';
import fs from 'fs';

const app = express();

// Garante que os diretórios de dados existem
if (!fs.existsSync(SANDBOX_DIR)) {
    fs.mkdirSync(SANDBOX_DIR, { recursive: true });
}
if (!fs.existsSync(BUILDS_DIR)) {
    fs.mkdirSync(BUILDS_DIR, { recursive: true });
}

// Carrega as alocações de portas salvas e sincroniza (agora async)
loadPortAllocations().catch(err => {
    console.error('Erro ao carregar alocações de porta:', err);
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Rotas da API
app.use('/sandbox', cmdRouter);
app.use('/sandbox', fileRouter);
app.use('/sandbox', installRouter);
app.use('/sandbox', restartRouter);
app.use('/sandbox', subRouter);
app.use('/sandbox', buildRouter);
app.use('/sandbox/containers', containersRouter);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

export default app;