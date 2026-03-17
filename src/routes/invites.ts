// src/routes/invites.ts
import { Router } from 'express';
import { randomBytes } from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkProjectPermission } from '../middleware/projectPermission';
import { prisma } from '../db/prisma';
import { io } from '../server';
import { SOCKET_EVENTS } from '../socket/events';
import { emitToProject, emitToUser } from '../server';

export const projectInvitesRouter = Router({ mergeParams: true });
export const publicInvitesRouter = Router();

// ---------- Rotas protegidas (dentro de projeto) ----------
projectInvitesRouter.use(authenticate);

/**
 * @openapi
 * /projects/{projectUid}/invites:
 *   post:
 *     summary: Cria um link de convite para o projeto
 *     tags: [Invites]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [viewer, editor]
 *                 default: viewer
 *               expiresIn:
 *                 type: integer
 *                 description: Tempo de expiração em horas (opcional)
 *     responses:
 *       201:
 *         description: Convite criado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inviteUid:
 *                   type: string
 *                 inviteUrl:
 *                   type: string
 *                 token:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: Permissão insuficiente
 */
projectInvitesRouter.post('/', checkProjectPermission('editor'), async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const { role = 'viewer', expiresIn } = req.body;
    const userId = req.user!.id;

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const token = randomBytes(32).toString('hex');
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000) : null;

        const invite = await prisma.invite.create({
            data: {
                token,
                projectId: project.id,
                createdBy: userId,
                role,
                expiresAt,
            },
        });

        const inviteUrl = `${req.protocol}://${req.get('host')}/invites/join?token=${token}`;

        res.status(201).json({
            inviteUid: invite.uid,
            inviteUrl,
            token,
            expiresAt: invite.expiresAt,
        });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/invites:
 *   get:
 *     summary: Lista os convites ativos de um projeto
 *     tags: [Invites]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de convites
 */
projectInvitesRouter.get('/', checkProjectPermission('viewer'), async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const invites = await prisma.invite.findMany({
            where: { projectId: project.id, usedAt: null },
            orderBy: { createdAt: 'desc' },
            include: { creator: { select: { uid: true, name: true } } },
        });
        res.json({ invites });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/invites/{inviteUid}:
 *   delete:
 *     summary: Cancela um convite (apaga)
 *     tags: [Invites]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: inviteUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Convite cancelado
 */
projectInvitesRouter.delete('/:inviteUid', checkProjectPermission('editor'), async (req: AuthRequest, res) => {
    const { projectUid, inviteUid } = req.params;
    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const invite = await prisma.invite.findFirst({
            where: { uid: inviteUid, projectId: project.id },
        });
        if (!invite) return res.status(404).json({ error: 'Invite not found' });

        await prisma.invite.delete({ where: { id: invite.id } });
        res.json({ message: 'Invite cancelled' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ---------- Rota pública para aceitar convite ----------
/**
 * @openapi
 * /invites/join:
 *   post:
 *     summary: Aceita um convite e adiciona o usuário como colaborador
 *     tags: [Invites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário adicionado ao projeto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 projectUid:
 *                   type: string
 *                 role:
 *                   type: string
 *       400:
 *         description: Token inválido ou expirado
 *       401:
 *         description: Usuário não autenticado
 *       409:
 *         description: Já é colaborador
 */
publicInvitesRouter.post('/join', authenticate, async (req: AuthRequest, res) => {
    const { token } = req.body;
    const userId = req.user!.id;

    if (!token) return res.status(400).json({ error: 'Token required' });

    try {
        const invite = await prisma.invite.findUnique({
            where: { token },
            include: { project: true },
        });

        if (!invite) return res.status(400).json({ error: 'Invalid token' });
        if (invite.usedAt) return res.status(400).json({ error: 'Token already used' });
        if (invite.expiresAt && invite.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Token expired' });
        }

        const existing = await prisma.collaborator.findUnique({
            where: { userId_projectId: { userId, projectId: invite.projectId } },
        });
        if (existing) return res.status(409).json({ error: 'User already collaborator' });

        const collaborator = await prisma.collaborator.create({
            data: {
                userId,
                projectId: invite.projectId,
                role: invite.role,
                createdBy: userId,
                updatedBy: userId,
            },
            include: { user: true, project: true },
        });

        await prisma.invite.update({
            where: { id: invite.id },
            data: { usedAt: new Date(), usedBy: userId },
        });

        const payload = {
            projectUid: invite.project.uid,
            collaborator: {
                uid: collaborator.uid,
                user: { uid: collaborator.user.uid, name: collaborator.user.name, email: collaborator.user.email },
                role: collaborator.role,
                startAt: collaborator.startAt,
                endAt: collaborator.endAt,
            },
            addedBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        };

        emitToProject(io, invite.project.uid, SOCKET_EVENTS.COLLABORATOR_ADDED, payload, (req as any).socketId);
        emitToUser(io, userId, SOCKET_EVENTS.USER_COLLABORATOR_ADDED, {
            projectUid: invite.project.uid,
            projectName: invite.project.name,
            role: collaborator.role,
            addedBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        });

        res.json({
            message: 'Successfully joined project',
            projectUid: invite.project.uid,
            role: collaborator.role,
        });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});