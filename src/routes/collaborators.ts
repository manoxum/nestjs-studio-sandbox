// src/routes/collaborators.ts
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkProjectPermission } from '../middleware/projectPermission';
import { prisma } from '../db/prisma';
import { io } from '../server';
import { SOCKET_EVENTS } from '../socket/events';
import { emitToUser } from '../server';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(checkProjectPermission('editor'));

/**
 * @openapi
 * /projects/{projectUid}/collaborators:
 *   get:
 *     summary: Lista colaboradores de um projeto
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de colaboradores
 */
router.get('/', async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const collaborators = await prisma.collaborator.findMany({
            where: { projectId: project.id },
            include: {
                user: { select: { uid: true, name: true, email: true } },
            },
        });
        res.json({ collaborators });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/collaborators:
 *   post:
 *     summary: Adiciona um colaborador ao projeto
 *     tags: [Collaborators]
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
 *             required: [email, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [editor, viewer]
 *               startAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               endAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Colaborador adicionado
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Usuário não encontrado
 *       409:
 *         description: Já é colaborador
 */
router.post('/', async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const { email, role, startAt, endAt } = req.body;
    const userId = req.user!.id;

    if (!email || !role || !['editor', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Email and valid role (editor/viewer) required' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const existing = await prisma.collaborator.findUnique({
            where: {
                userId_projectId: { userId: user.id, projectId: project.id },
            },
        });
        if (existing) return res.status(409).json({ error: 'User already collaborator' });

        const collaborator = await prisma.collaborator.create({
            data: {
                userId: user.id,
                projectId: project.id,
                role,
                startAt: startAt ? new Date(startAt) : null,
                endAt: endAt ? new Date(endAt) : null,
                createdBy: userId,
                updatedBy: userId,
            },
            include: {
                user: { select: { uid: true, name: true, email: true } },
                project: { select: { name: true } },
            },
        });

        const payload = {
            projectUid,
            collaborator: {
                uid: collaborator.uid,
                user: collaborator.user,
                role: collaborator.role,
                startAt: collaborator.startAt,
                endAt: collaborator.endAt,
            },
            addedBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        };
        io.to(`project:${projectUid}`).emit(SOCKET_EVENTS.COLLABORATOR_ADDED, payload);

        emitToUser(io, user.id, SOCKET_EVENTS.USER_COLLABORATOR_ADDED, {
            projectUid,
            projectName: collaborator.project.name,
            role: collaborator.role,
            addedBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        });

        res.status(201).json(collaborator);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/collaborators/{userUid}:
 *   patch:
 *     summary: Atualiza papel ou período de um colaborador
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userUid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [editor, viewer]
 *               startAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               endAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Colaborador atualizado
 *       404:
 *         description: Não encontrado
 */
router.patch('/:userUid', async (req: AuthRequest, res) => {
    const { projectUid, userUid } = req.params;
    const { role, startAt, endAt } = req.body;
    const currentUserId = req.user!.id;

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const user = await prisma.user.findUnique({ where: { uid: userUid } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const collaborator = await prisma.collaborator.findUnique({
            where: {
                userId_projectId: { userId: user.id, projectId: project.id },
            },
        });
        if (!collaborator) return res.status(404).json({ error: 'Collaborator not found' });

        if (collaborator.role === 'owner') {
            return res.status(403).json({ error: 'Cannot modify owner via this endpoint' });
        }

        const updated = await prisma.collaborator.update({
            where: { id: collaborator.id },
            data: {
                ...(role && { role }),
                ...(startAt !== undefined && { startAt: startAt ? new Date(startAt) : null }),
                ...(endAt !== undefined && { endAt: endAt ? new Date(endAt) : null }),
                updatedBy: currentUserId,
            },
            include: {
                user: { select: { uid: true, name: true, email: true } },
                project: { select: { name: true } },
            },
        });

        const payload = {
            projectUid,
            collaborator: {
                uid: updated.uid,
                user: updated.user,
                role: updated.role,
                startAt: updated.startAt,
                endAt: updated.endAt,
            },
            updatedBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        };
        io.to(`project:${projectUid}`).emit(SOCKET_EVENTS.COLLABORATOR_UPDATED, payload);

        emitToUser(io, updated.userId, SOCKET_EVENTS.USER_COLLABORATOR_UPDATED, {
            projectUid,
            projectName: updated.project.name,
            role: updated.role,
            startAt: updated.startAt,
            endAt: updated.endAt,
            updatedBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        });

        res.json(updated);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/collaborators/{userUid}:
 *   delete:
 *     summary: Remove um colaborador do projeto
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Colaborador removido
 *       404:
 *         description: Não encontrado
 */
router.delete('/:userUid', async (req: AuthRequest, res) => {
    const { projectUid, userUid } = req.params;
    const currentUserId = req.user!.id;

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const user = await prisma.user.findUnique({ where: { uid: userUid } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const collaborator = await prisma.collaborator.findUnique({
            where: {
                userId_projectId: { userId: user.id, projectId: project.id },
            },
            include: { project: { select: { name: true } } },
        });
        if (!collaborator) return res.status(404).json({ error: 'Collaborator not found' });

        if (collaborator.role === 'owner') {
            return res.status(403).json({ error: 'Cannot remove project owner' });
        }

        await prisma.collaborator.delete({ where: { id: collaborator.id } });

        const payload = {
            projectUid,
            userUid,
            removedBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        };
        io.to(`project:${projectUid}`).emit(SOCKET_EVENTS.COLLABORATOR_REMOVED, payload);

        emitToUser(io, collaborator.userId, SOCKET_EVENTS.USER_COLLABORATOR_REMOVED, {
            projectUid,
            projectName: collaborator.project.name,
            removedBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        });

        res.json({ message: 'Collaborator removed' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;