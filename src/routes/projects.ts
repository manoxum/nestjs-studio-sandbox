// src/routes/projects.ts
import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkProjectPermission } from '../middleware/projectPermission';
import { prisma } from '../db/prisma';
import { PROJECTS_DIR } from '../config/constants';
import { io } from '../server';
import { SOCKET_EVENTS } from '../socket/events';
import { emitToProject } from '../server';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /projects:
 *   get:
 *     summary: Lista projetos do usuário (owner ou colaborador) - apenas ativos
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *         description: Se true, inclui projetos excluídos (status = -1)
 *     responses:
 *       200:
 *         description: Lista de projetos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 */
router.get('/', async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const includeDeleted = req.query.includeDeleted === 'true';
    try {
        const whereCondition: any = {
            OR: [
                { ownerId: userId },
                { collaborators: { some: { userId } } },
            ],
        };
        if (!includeDeleted) {
            whereCondition.status = 1; // apenas ativos
        }
        const projects = await prisma.project.findMany({
            where: whereCondition,
            include: {
                owner: { select: { uid: true, name: true, email: true } },
                collaborators: {
                    include: { user: { select: { uid: true, name: true, email: true } } },
                },
            },
        });
        res.json({ projects });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects:
 *   post:
 *     summary: Cria um novo projeto e sua pasta no sandbox
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Projeto criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Nome inválido
 *       409:
 *         description: Nome já existe
 */
router.post('/', async (req: AuthRequest, res) => {
    const { name } = req.body;
    const userId = req.user!.id;

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Project name required' });
    }

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '');
    if (safeName !== name) {
        return res.status(400).json({ error: 'Project name contains invalid characters' });
    }

    try {
        const existing = await prisma.project.findUnique({ where: { name: safeName } });
        if (existing) {
            return res.status(409).json({ error: 'Project name already exists' });
        }

        const project = await prisma.$transaction(async (tx) => {
            const proj = await tx.project.create({
                data: {
                    name: safeName,
                    ownerId: userId,
                    createdBy: userId,
                    updatedBy: userId,
                    status: 1, // ativo
                },
            });

            await tx.collaborator.create({
                data: {
                    userId,
                    projectId: proj.id,
                    role: 'owner',
                    createdBy: userId,
                    updatedBy: userId,
                },
            });

            return proj;
        });

        const projectDir = path.join(PROJECTS_DIR, project.uid);
        await fs.ensureDir(projectDir);

        res.status(201).json({
            uid: project.uid,
            name: project.name,
            owner: { uid: req.user!.uid, name: req.user!.name, email: req.user!.email },
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}:
 *   get:
 *     summary: Detalhes de um projeto (requer acesso) - apenas ativo, a menos que includeDeleted=true
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *         description: Se true, permite ver projeto excluído (status = -1)
 *     responses:
 *       200:
 *         description: Projeto
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Não encontrado
 */
router.get('/:projectUid', checkProjectPermission('viewer'), async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';
    try {
        const where: any = { uid: projectUid };
        if (!includeDeleted) {
            where.status = 1;
        }
        const project = await prisma.project.findFirst({
            where,
            include: {
                owner: { select: { uid: true, name: true, email: true } },
                collaborators: {
                    include: { user: { select: { uid: true, name: true, email: true } } },
                },
                assets: {
                    select: {
                        uid: true,
                        type: true,
                        name: true,
                        path: true,
                        configs: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}:
 *   put:
 *     summary: Atualiza um projeto (requer role editor ou owner)
 *     tags: [Projects]
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
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Projeto atualizado
 *       403:
 *         description: Permissão insuficiente
 */
router.put('/:projectUid', checkProjectPermission('editor'), async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const { name } = req.body;
    const userId = req.user!.id;

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Name required' });
    }

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const updated = await prisma.project.update({
            where: { id: project.id },
            data: { name, updatedBy: userId },
        });

        emitToProject(io, projectUid, SOCKET_EVENTS.PROJECT_UPDATED, {
            projectUid,
            name: updated.name,
            updatedAt: updated.updatedAt,
            user: { uid: req.user!.uid, name: req.user!.name },
        }, userId);

        res.json({ uid: updated.uid, name: updated.name });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}:
 *   delete:
 *     summary: Remove um projeto (requer owner) - marca como excluído (status = -1) e remove a pasta do disco
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projeto marcado como excluído
 *       403:
 *         description: Apenas o owner pode deletar
 */
router.delete('/:projectUid', checkProjectPermission('owner'), async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const userId = req.user!.id;

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Emitir evento ANTES de marcar como excluído
        emitToProject(io, projectUid, SOCKET_EVENTS.PROJECT_DELETED, {
            projectUid,
            user: { uid: req.user!.uid, name: req.user!.name },
        }, userId);

        // Marcar projeto como excluído (status = -1)
        await prisma.project.update({
            where: { id: project.id },
            data: { status: -1, updatedBy: userId },
        });

        // Remover a pasta do projeto do disco (opcional, mas para liberar espaço)
        const projectDir = path.join(PROJECTS_DIR, project.uid);
        await fs.remove(projectDir).catch((err) => {
            console.warn(`[DELETE] Could not remove project directory: ${err.message}`);
        });

        res.json({ message: 'Project marked as deleted' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/restore:
 *   post:
 *     summary: Restaura um projeto excluído (requer owner) - muda status de -1 para 1 e recria a pasta
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projeto restaurado
 *       403:
 *         description: Permissão negada
 *       404:
 *         description: Projeto não encontrado
 */
router.post('/:projectUid/restore', checkProjectPermission('owner'), async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const userId = req.user!.id;

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.status !== -1) {
            return res.status(400).json({ error: 'Project is not deleted' });
        }

        // Restaurar status
        await prisma.project.update({
            where: { id: project.id },
            data: { status: 1, updatedBy: userId },
        });

        // Recriar a pasta do projeto (opcional, pode ser recriada depois)
        const projectDir = path.join(PROJECTS_DIR, project.uid);
        await fs.ensureDir(projectDir);

        // Opcional: recriar arquivos a partir dos assets? Pode ser feito depois

        emitToProject(io, projectUid, SOCKET_EVENTS.PROJECT_UPDATED, {
            projectUid,
            name: project.name,
            updatedAt: new Date(),
            user: { uid: req.user!.uid, name: req.user!.name },
        }, userId);

        res.json({ message: 'Project restored' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;