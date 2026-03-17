// src/app.ts
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import path from 'path'; // <-- adicionar
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { requestLogger } from './utils/logger';
import { extractSocketId } from './middleware/socketId'; // <-- importar
import fileRouter from './routes/file';
import installRouter from './routes/install';
import restartRouter from './routes/restart';
import subRouter from './routes/sub';
import buildRouter from './routes/build';
import containersRouter from './routes/containers';
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import projectFilesRouter from './routes/projectFiles';
import projectCmdRouter from './routes/projectCmd';
import usersRouter from './routes/users';
import collaboratorsRouter from './routes/collaborators';
import assetsRouter from './routes/assets';
import { projectInvitesRouter, publicInvitesRouter } from './routes/invites';
import contributionsRouter from './routes/contributions'; // <-- nova rota
import { loadPortAllocations } from './services/portAlloc';
import { SANDBOX_DIR, BUILDS_DIR, PROJECTS_DIR } from './config/constants';

const app = express();

// Garante que os diretórios de dados existem
if (!fs.existsSync(SANDBOX_DIR)) {
    fs.mkdirSync(SANDBOX_DIR, { recursive: true });
}
if (!fs.existsSync(BUILDS_DIR)) {
    fs.mkdirSync(BUILDS_DIR, { recursive: true });
}
if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Carrega as alocações de portas salvas e sincroniza
loadPortAllocations().catch(err => {
    console.error('Erro ao carregar alocações de porta:', err);
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(extractSocketId); // <-- adicionar middleware de socketId

// Servir avatares
app.use('/avatars', express.static(path.join(SANDBOX_DIR, 'avatars')));

// Rotas da API
app.use('/sandbox', fileRouter);
app.use('/sandbox', installRouter);
app.use('/sandbox', restartRouter);
app.use('/sandbox', subRouter);
app.use('/sandbox', buildRouter);
app.use('/sandbox/containers', containersRouter);

// Rotas de autenticação e projetos
app.use('/auth', authRouter);
app.use('/projects', projectsRouter);
app.use('/projects/:projectUid', projectFilesRouter);
app.use('/projects/:projectUid', projectCmdRouter);
app.use('/projects/:projectUid/collaborators', collaboratorsRouter);
app.use('/projects/:projectUid/assets', assetsRouter);
app.use('/projects/:projectUid/invites', projectInvitesRouter);
app.use('/invites', publicInvitesRouter);
app.use('/users', usersRouter);
app.use('/contributions', contributionsRouter); // <-- nova rota

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

export default app;