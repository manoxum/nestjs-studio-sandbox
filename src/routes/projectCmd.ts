// filename: src/routes/projectCmd.ts

import { Router } from 'express';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkProjectPermission } from '../middleware/projectPermission';
import { executeCommand } from '../services/execCmd';
import { PROJECTS_DIR } from '../config/constants';
import { prisma } from '../db/prisma';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(checkProjectPermission('editor')); // Precisa de editor para executar comandos

/**
 * @openapi
 * /projects/{projectUid}/command:
 *   post:
 *     summary: Executa um comando no diretório do projeto
 *     tags: [Project Commands]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [command]
 *             properties:
 *               command:
 *                 type: string
 *     responses:
 *       200:
 *         description: Saída do comando
 */
router.post('/command', async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Missing command' });
    }

    const project = await prisma.project.findUnique({ where: { uid: projectUid } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const projectDir = path.join(PROJECTS_DIR, project.uid);

    try {
        const output = await executeCommand(command, projectDir);
        res.json({ output });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/install:
 *   post:
 *     summary: Instala um pacote npm no diretório do projeto
 *     tags: [Project Commands]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pkg]
 *             properties:
 *               pkg:
 *                 type: string
 *     responses:
 *       200:
 *         description: Saída da instalação
 */
router.post('/install', async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const { pkg } = req.body;

    if (!pkg || typeof pkg !== 'string') {
        return res.status(400).json({ error: 'Missing package name' });
    }

    const project = await prisma.project.findUnique({ where: { uid: projectUid } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const projectDir = path.join(PROJECTS_DIR, project.uid);
    const command = `npm install ${pkg}`;

    try {
        const output = await executeCommand(command, projectDir);
        res.json({ output });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;