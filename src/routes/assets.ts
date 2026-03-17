// src/routes/assets.ts
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkProjectPermission } from '../middleware/projectPermission';
import { prisma } from '../db/prisma';
import { io } from '../server';
import { SOCKET_EVENTS } from '../socket/events';
import { emitToProject, emitToAsset } from '../server';
import { recordContribution } from '../services/contribution';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(checkProjectPermission('viewer'));

// Função auxiliar recursiva para obter a árvore de assets
async function getAssetTree(projectId: number, parentId: number | null = null): Promise<any[]> {
    const assets = await prisma.asset.findMany({
        where: { projectId, parentId },
        include: {
            owner: { select: { uid: true, name: true } },
        },
    });
    for (const asset of assets) {
        (asset as any).children = await getAssetTree(projectId, asset.id);
    }
    return assets;
}

// Função auxiliar para obter um asset com os seus filhos até uma determinada profundidade
async function getAssetWithChildren(assetId: number, depth: number): Promise<any> {
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: {
            owner: { select: { uid: true, name: true } },
            project: { select: { uid: true } },
        },
    });
    if (!asset) return null;
    if (depth === 0) return asset;
    const children = await prisma.asset.findMany({
        where: { parentId: asset.id },
        include: {
            owner: { select: { uid: true, name: true } },
        },
    });
    for (const child of children) {
        (child as any).children = await getAssetWithChildren(child.id, depth > 0 ? depth - 1 : -1);
    }
    return { ...asset, children };
}

// Função recursiva para obter todos os descendentes (para a rota /children)
async function getDescendants(parentId: number): Promise<any[]> {
    const directChildren = await prisma.asset.findMany({
        where: { parentId },
        include: { owner: { select: { uid: true, name: true } } },
    });
    for (const child of directChildren) {
        (child as any).children = await getDescendants(child.id);
    }
    return directChildren;
}

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
 *       - in: query
 *         name: tree
 *         schema:
 *           type: boolean
 *         description: Se true, retorna a árvore hierárquica (assets organizados por parentId)
 *     responses:
 *       200:
 *         description: Lista de assets
 */
router.get('/', async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const { tree } = req.query;

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        let assets;
        if (tree === 'true') {
            assets = await getAssetTree(project.id);
        } else {
            assets = await prisma.asset.findMany({
                where: { projectId: project.id },
                include: { owner: { select: { uid: true, name: true } } },
            });
        }
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
 *       - in: query
 *         name: depth
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Profundidade dos filhos a incluir (-1 para infinito)
 *     responses:
 *       200:
 *         description: Asset
 *       404:
 *         description: Não encontrado
 */
router.get('/:assetUid', async (req: AuthRequest, res) => {
    const { projectUid, assetUid } = req.params;
    const { depth } = req.query;
    const depthNum = depth ? parseInt(depth as string, 10) : 0;

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const assetRecord = await prisma.asset.findFirst({
            where: { uid: assetUid, projectId: project.id },
            select: { id: true },
        });
        if (!assetRecord) return res.status(404).json({ error: 'Asset not found' });

        const asset = await getAssetWithChildren(assetRecord.id, depthNum);
        if (!asset || asset.project.uid !== projectUid) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        res.json(asset);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/assets/{assetUid}/children:
 *   get:
 *     summary: Lista os filhos de um asset
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
 *       - in: query
 *         name: recursive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Se true, retorna todos os descendentes recursivamente; se false, apenas filhos diretos.
 *     responses:
 *       200:
 *         description: Lista de assets filhos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 children:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Asset'
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Asset não encontrado
 */
router.get('/:assetUid/children', async (req: AuthRequest, res) => {
    const { projectUid, assetUid } = req.params;
    const { recursive } = req.query;
    const isRecursive = recursive === 'true';

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const asset = await prisma.asset.findFirst({
            where: { uid: assetUid, projectId: project.id },
        });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });

        let children;
        if (isRecursive) {
            children = await getDescendants(asset.id);
        } else {
            children = await prisma.asset.findMany({
                where: { parentId: asset.id },
                include: { owner: { select: { uid: true, name: true } } },
            });
        }

        res.json({ children });
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
 *               parentUid:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: UID do asset pai (para criar hierarquia)
 *     responses:
 *       201:
 *         description: Asset criado
 *       403:
 *         description: Permissão insuficiente (requer editor)
 */
router.post('/', checkProjectPermission('editor'), async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const { type, name, path, configs, binary, text, parentUid } = req.body;
    const userId = req.user!.id;

    if (!type || !name || !path) {
        return res.status(400).json({ error: 'type, name and path required' });
    }

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Validação do parentUid (se fornecido)
        let parentId: number | undefined = undefined;
        if (parentUid) {
            const parent = await prisma.asset.findUnique({
                where: { uid: parentUid },
                select: { id: true, projectId: true },
            });
            if (!parent || parent.projectId !== project.id) {
                return res.status(400).json({ error: 'Invalid parent asset' });
            }
            parentId = parent.id;
        }

        const asset = await prisma.asset.create({
            data: {
                type,
                name,
                path,
                configs: configs || {},
                ownerId: userId,
                projectId: project.id,
                parentId,
                binary: binary ? Buffer.from(binary, 'base64') : null,
                text: text || null,
                createdBy: userId,
                updatedBy: userId,
            },
            include: { owner: { select: { uid: true, name: true } } },
        });

        // Registar contribuição
        await recordContribution(
            userId,
            'asset_created',
            project.id,
            { assetUid: asset.uid, parentUid }
        );

        const payload = {
            projectUid,
            asset: {
                uid: asset.uid,
                type: asset.type,
                name: asset.name,
                path: asset.path,
                configs: asset.configs,
                parentUid: asset.parentId ? (await prisma.asset.findUnique({ where: { id: asset.parentId } }))?.uid : null,
            },
            createdBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        };

        emitToProject(io, projectUid, SOCKET_EVENTS.ASSET_CREATED, payload, (req as any).socketId);
        emitToAsset(io, asset.uid, SOCKET_EVENTS.ASSET_CREATED, payload, (req as any).socketId);

        // Notificar o pai (se existir) que teve um novo filho
        if (asset.parentId) {
            const parentAsset = await prisma.asset.findUnique({ where: { id: asset.parentId } });
            if (parentAsset) {
                emitToAsset(io, parentAsset.uid, SOCKET_EVENTS.ASSET_UPDATED, {
                    projectUid,
                    assetUid: parentAsset.uid,
                    asset: { uid: parentAsset.uid, hasNewChild: true },
                    updatedBy: { uid: req.user!.uid, name: req.user!.name },
                    sourceSocketId: (req as any).socketId,
                }, (req as any).socketId);
            }
        }

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
 *               parentUid:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Novo asset pai (null para remover pai)
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
    const { name, configs, binary, text, parentUid } = req.body;
    const userId = req.user!.id;

    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const asset = await prisma.asset.findFirst({
            where: { uid: assetUid, projectId: project.id },
        });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });

        // Guardar parentId antigo para notificações
        const oldParentId = asset.parentId;

        // Validar novo parentUid (se fornecido)
        let parentId: number | null | undefined = undefined;
        if (parentUid !== undefined) {
            if (parentUid === null) {
                parentId = null;
            } else {
                const parent = await prisma.asset.findUnique({
                    where: { uid: parentUid },
                    select: { id: true, projectId: true },
                });
                if (!parent || parent.projectId !== project.id) {
                    return res.status(400).json({ error: 'Invalid parent asset' });
                }
                // Impedir ciclo: novo pai não pode ser o próprio asset
                if (parent.id === asset.id) {
                    return res.status(400).json({ error: 'Asset cannot be its own parent' });
                }
                // (Opcional) impedir ciclo mais profundo: verificar se o novo pai é descendente do asset
                // Pode ser implementado com uma função recursiva, mas por simplicidade omitimos aqui.
                parentId = parent.id;
            }
        }

        const updated = await prisma.asset.update({
            where: { id: asset.id },
            data: {
                ...(name && { name }),
                ...(configs !== undefined && { configs }),
                ...(binary !== undefined && { binary: binary ? Buffer.from(binary, 'base64') : null }),
                ...(text !== undefined && { text: text || null }),
                ...(parentId !== undefined && { parentId }),
                updatedBy: userId,
            },
        });

        // Registar contribuição
        await recordContribution(
            userId,
            'asset_updated',
            project.id,
            { assetUid: updated.uid, changes: { name, configs, parentUid } }
        );

        const payload = {
            projectUid,
            assetUid,
            asset: {
                uid: updated.uid,
                name: updated.name,
                configs: updated.configs,
                parentUid: updated.parentId ? (await prisma.asset.findUnique({ where: { id: updated.parentId } }))?.uid : null,
            },
            updatedBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        };

        emitToProject(io, projectUid, SOCKET_EVENTS.ASSET_UPDATED, payload, (req as any).socketId);
        emitToAsset(io, assetUid, SOCKET_EVENTS.ASSET_UPDATED, payload, (req as any).socketId);

        // Notificar antigo pai (se mudou) e novo pai
        if (parentId !== undefined && oldParentId !== updated.parentId) {
            if (oldParentId) {
                const oldParent = await prisma.asset.findUnique({ where: { id: oldParentId } });
                if (oldParent) {
                    emitToAsset(io, oldParent.uid, SOCKET_EVENTS.ASSET_UPDATED, {
                        projectUid,
                        assetUid: oldParent.uid,
                        asset: { uid: oldParent.uid, childRemoved: true },
                        updatedBy: { uid: req.user!.uid, name: req.user!.name },
                        sourceSocketId: (req as any).socketId,
                    }, (req as any).socketId);
                }
            }
            if (updated.parentId) {
                const newParent = await prisma.asset.findUnique({ where: { id: updated.parentId } });
                if (newParent) {
                    emitToAsset(io, newParent.uid, SOCKET_EVENTS.ASSET_UPDATED, {
                        projectUid,
                        assetUid: newParent.uid,
                        asset: { uid: newParent.uid, hasNewChild: true },
                        updatedBy: { uid: req.user!.uid, name: req.user!.name },
                        sourceSocketId: (req as any).socketId,
                    }, (req as any).socketId);
                }
            }
        }

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

        // Guardar parentId para notificação
        const parentId = asset.parentId;

        await prisma.asset.delete({ where: { id: asset.id } });

        // Registar contribuição
        await recordContribution(
            userId,
            'asset_deleted',
            project.id,
            { assetUid }
        );

        const payload = {
            projectUid,
            assetUid,
            deletedBy: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        };

        emitToProject(io, projectUid, SOCKET_EVENTS.ASSET_DELETED, payload, (req as any).socketId);
        emitToAsset(io, assetUid, SOCKET_EVENTS.ASSET_DELETED, payload, (req as any).socketId);

        // Notificar o pai (se existir) que perdeu um filho
        if (parentId) {
            const parentAsset = await prisma.asset.findUnique({ where: { id: parentId } });
            if (parentAsset) {
                emitToAsset(io, parentAsset.uid, SOCKET_EVENTS.ASSET_UPDATED, {
                    projectUid,
                    assetUid: parentAsset.uid,
                    asset: { uid: parentAsset.uid, childRemoved: true },
                    updatedBy: { uid: req.user!.uid, name: req.user!.name },
                    sourceSocketId: (req as any).socketId,
                }, (req as any).socketId);
            }
        }

        res.json({ message: 'Asset deleted' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;