// src/routes/projectFiles.ts
import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkProjectPermission } from '../middleware/projectPermission';
import { prisma } from '../db/prisma';
import { PROJECTS_DIR } from '../config/constants';
import { sanitiseFilename } from '../utils/sanitize';
import { io } from '../server';
import { SOCKET_EVENTS } from '../socket/events';
import { emitToProject, emitToAsset } from '../server';
import { recordContribution } from '../services/contribution';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(checkProjectPermission('editor'));

/**
 * @openapi
 * /projects/{projectUid}/files:
 *   post:
 *     summary: Cria um arquivo no projeto (upload ou conteúdo texto)
 *     tags: [Project Files]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               filename:
 *                 type: string
 *               content:
 *                 type: string
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Arquivo criado (retorna uid do asset)
 */
router.post('/files', upload.single('file'), async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const userId = req.user!.id;
    let filename: string;
    let content: Buffer | string = '';

    if (req.file) {
        filename = req.file.originalname;
        content = req.file.buffer;
    } else {
        filename = req.body.filename;
        content = req.body.content || '';
    }

    if (!filename) {
        return res.status(400).json({ error: 'filename required' });
    }

    const safeFilename = sanitiseFilename(filename);

    const project = await prisma.project.findUnique({ where: { uid: projectUid } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const projectDir = path.join(PROJECTS_DIR, project.uid);
    const filePath = path.join(projectDir, safeFilename);

    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(projectDir))) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    try {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content);

        const baseCreateData: Prisma.AssetUncheckedCreateInput = {
            type: 'project:file',
            name: safeFilename,
            ownerId: userId,
            projectId: project.id,
            path: safeFilename,
            configs: {},
            createdBy: userId,
            updatedBy: userId,
        };

        let createData: Prisma.AssetUncheckedCreateInput;
        if (req.file) {
            createData = { ...baseCreateData, binary: content as any, text: null };
        } else {
            createData = { ...baseCreateData, text: content as string, binary: null };
        }

        let updateData: Prisma.AssetUncheckedUpdateInput;
        if (req.file) {
            updateData = { updatedBy: userId, binary: content as any, text: null };
        } else {
            updateData = { updatedBy: userId, text: content as string, binary: null };
        }

        const asset = await prisma.asset.upsert({
            where: { projectId_path: { projectId: project.id, path: safeFilename } },
            update: updateData,
            create: createData,
        });

        await recordContribution(
            userId,
            req.file ? 'file_created' : 'file_updated',
            project.id,
            { filename: safeFilename, assetUid: asset.uid }
        );

        const event = req.file ? SOCKET_EVENTS.FILE_CREATED : SOCKET_EVENTS.FILE_UPDATED;
        const payload = {
            projectUid,
            filename: safeFilename,
            assetUid: asset.uid,
            action: req.file ? 'created' : 'updated',
            user: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        };

        emitToProject(io, projectUid, event, payload, (req as any).socketId);
        emitToAsset(io, asset.uid, event, payload, (req as any).socketId);

        res.status(201).json({ message: 'File saved', assetUid: asset.uid });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/files:
 *   get:
 *     summary: Lista arquivos e pastas do projeto
 *     tags: [Project Files]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de arquivos com metadados do asset (se houver)
 */
router.get('/files', async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    const project = await prisma.project.findUnique({ where: { uid: projectUid } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const projectDir = path.join(PROJECTS_DIR, project.uid);

    try {
        let files: string[] = [];
        if (await fs.pathExists(projectDir)) {
            files = await fs.readdir(projectDir);
        }
        const assets = await prisma.asset.findMany({
            where: { projectId: project.id, type: 'project:file' },
        });

        const result = await Promise.all(
            files.map(async (f) => {
                const fullPath = path.join(projectDir, f);
                const stat = await fs.stat(fullPath);
                const asset = assets.find((a) => a.path === f);
                return {
                    name: f,
                    isDirectory: stat.isDirectory(),
                    size: stat.size,
                    modified: stat.mtime,
                    asset: asset ? { uid: asset.uid, type: asset.type, name: asset.name, path: asset.path } : null,
                };
            })
        );

        res.json(result);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/files/*:
 *   get:
 *     summary: Download de um arquivo (caminho relativo)
 *     tags: [Project Files]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: 0
 *         required: true
 *         schema:
 *           type: string
 *         description: Caminho relativo do arquivo
 *     responses:
 *       200:
 *         description: Arquivo
 *         content:
 *           application/octet-stream: {}
 */
router.get('/files/*', async (req: AuthRequest, res) => {
    const { projectUid, 0: filePath } = req.params;
    const project = await prisma.project.findUnique({ where: { uid: projectUid } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const projectDir = path.join(PROJECTS_DIR, project.uid);
    const fullPath = path.join(projectDir, filePath);

    if (!fullPath.startsWith(projectDir)) {
        return res.status(400).json({ error: 'Invalid path' });
    }

    try {
        if (!(await fs.pathExists(fullPath))) {
            return res.status(404).json({ error: 'File not found' });
        }
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            return res.status(400).json({ error: 'Cannot download a directory' });
        }
        res.sendFile(fullPath);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /projects/{projectUid}/files/*:
 *   delete:
 *     summary: Remove um arquivo
 *     tags: [Project Files]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: 0
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Arquivo removido
 */
router.delete('/files/*', async (req: AuthRequest, res) => {
    const { projectUid, 0: filePath } = req.params;
    const userId = req.user!.id;
    const project = await prisma.project.findUnique({ where: { uid: projectUid } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const projectDir = path.join(PROJECTS_DIR, project.uid);
    const fullPath = path.join(projectDir, filePath);

    if (!fullPath.startsWith(projectDir)) {
        return res.status(400).json({ error: 'Invalid path' });
    }

    try {
        if (!(await fs.pathExists(fullPath))) {
            return res.status(404).json({ error: 'File not found' });
        }
        await fs.remove(fullPath);

        const assets = await prisma.asset.findMany({
            where: { projectId: project.id, path: filePath },
        });
        await prisma.asset.deleteMany({ where: { projectId: project.id, path: filePath } }).catch(() => {});

        await recordContribution(
            userId,
            'file_deleted',
            project.id,
            { path: filePath, assetUids: assets.map(a => a.uid) }
        );

        const payload = {
            projectUid,
            path: filePath,
            user: { uid: req.user!.uid, name: req.user!.name },
            sourceSocketId: (req as any).socketId,
        };
        emitToProject(io, projectUid, SOCKET_EVENTS.FILE_DELETED, payload, (req as any).socketId);
        for (const asset of assets) {
            emitToAsset(io, asset.uid, SOCKET_EVENTS.FILE_DELETED, payload, (req as any).socketId);
        }

        res.json({ message: 'File deleted' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;