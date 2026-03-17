// filename: src/routes/assets.ts

// src/routes/assets.ts
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkProjectPermission } from '../middleware/projectPermission';
import { prisma } from '../db/prisma';
import { io } from '../server';
import { SOCKET_EVENTS } from '../socket/events';
import { emitToProject, emitToAsset } from '../server';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(checkProjectPermission('viewer'));

/**
 * @openapi
 * /projects/{projectUid}/assets:
 *   get:
 *     summary: Lista todos os assets de um projeto
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de assets
 */
router.get('/', async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const assets = await prisma.asset.findMany({
            where: { projectId: project.id },
            include: { user: { select: { uid: true, name: true } } },
        });
        res.json({ assets });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/assets/{assetUid}:
 *   get:
 *     summary: Retorna um asset específico
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: assetUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset
 *       404:
 *         description: Não encontrado
 */
router.get('/:assetUid', async (req: AuthRequest, res) => {
    const { projectUid, assetUid } = req.params;
    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const asset = await prisma.asset.findFirst({
            where: { uid: assetUid, projectId: project.id },
            include: { user: { select: { uid: true, name: true } } },
        });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json(asset);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/assets:
 *   post:
 *     summary: Cria um novo asset (metadados) no projeto
 *     tags: [Assets]
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
 *             required: [type, name, path]
 *             properties:
 *               type:
 *                 type: string
 *               name:
 *                 type: string
 *               path:
 *                 type: string
 *               configs:
 *                 type: object
 *               binary:
 *                 type: string
 *                 format: binary
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asset criado
 *       403:
 *         description: Permissão insuficiente (requer editor)
 */
router.post('/', checkProjectPermission('editor'), async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const { type, name, path, configs, binary, text } = req.body;
    const userId = req.user!.id;

    if (!type || !name || !path) {
        return res.status(400).json({ error: 'type, name and path required' });
    }

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const asset = await prisma.asset.create({
            data: {
                type,
                name,
                path,
                configs: configs || {},
                ownerId: userId,
                projectId: project.id,
                binary: binary ? Buffer.from(binary, 'base64') : null,
                text: text || null,
                createdBy: userId,
                updatedBy: userId,
            },
        });

        const payload = {
            projectUid,
            asset: {
                uid: asset.uid,
                type: asset.type,
                name: asset.name,
                path: asset.path,
                configs: asset.configs,
            },
            createdBy: { uid: req.user!.uid, name: req.user!.name },
        };

        emitToProject(io, projectUid, SOCKET_EVENTS.ASSET_CREATED, payload, userId);
        emitToAsset(io, asset.uid, SOCKET_EVENTS.ASSET_CREATED, payload, userId);

        res.status(201).json({ uid: asset.uid });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/assets/{assetUid}:
 *   put:
 *     summary: Atualiza um asset (requer editor)
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: assetUid
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
 *               configs:
 *                 type: object
 *               binary:
 *                 type: string
 *                 format: binary
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asset atualizado
 *       403:
 *         description: Permissão insuficiente
 *       404:
 *         description: Não encontrado
 */
router.put('/:assetUid', checkProjectPermission('editor'), async (req: AuthRequest, res) => {
    const { projectUid, assetUid } = req.params;
    const { name, configs, binary, text } = req.body;
    const userId = req.user!.id;

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const asset = await prisma.asset.findFirst({
            where: { uid: assetUid, projectId: project.id },
        });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });

        const updated = await prisma.asset.update({
            where: { id: asset.id },
            data: {
                ...(name && { name }),
                ...(configs !== undefined && { configs }),
                ...(binary !== undefined && { binary: binary ? Buffer.from(binary, 'base64') : null }),
                ...(text !== undefined && { text: text || null }),
                updatedBy: userId,
            },
        });

        const payload = {
            projectUid,
            assetUid,
            asset: {
                uid: updated.uid,
                name: updated.name,
                configs: updated.configs,
            },
            updatedBy: { uid: req.user!.uid, name: req.user!.name },
        };

        emitToProject(io, projectUid, SOCKET_EVENTS.ASSET_UPDATED, payload, userId);
        emitToAsset(io, assetUid, SOCKET_EVENTS.ASSET_UPDATED, payload, userId);

        res.json({ uid: updated.uid });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/assets/{assetUid}:
 *   delete:
 *     summary: Remove um asset (requer editor)
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: assetUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset removido
 *       403:
 *         description: Permissão insuficiente
 */
router.delete('/:assetUid', checkProjectPermission('editor'), async (req: AuthRequest, res) => {
    const { projectUid, assetUid } = req.params;
    const userId = req.user!.id;
    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const asset = await prisma.asset.findFirst({
            where: { uid: assetUid, projectId: project.id },
        });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });

        await prisma.asset.delete({ where: { id: asset.id } });

        const payload = { projectUid, assetUid, deletedBy: { uid: req.user!.uid, name: req.user!.name } };

        emitToProject(io, projectUid, SOCKET_EVENTS.ASSET_DELETED, payload, userId);
        emitToAsset(io, assetUid, SOCKET_EVENTS.ASSET_DELETED, payload, userId);

        res.json({ message: 'Asset deleted' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;