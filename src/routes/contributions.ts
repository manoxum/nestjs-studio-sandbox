// src/routes/contributions.ts
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { checkProjectPermission } from '../middleware/projectPermission';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /contributions/me:
 *   get:
 *     summary: Lista as contribuições do próprio usuário
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: Lista de contribuições
 */
router.get('/me', async (req: AuthRequest, res) => {
    try {
        const contributions = await prisma.contribution.findMany({
            where: { userId: req.user!.id },
            orderBy: { createdAt: 'desc' },
            include: { project: { select: { uid: true, name: true } } },
        });
        res.json({ contributions });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /contributions/projects/{projectUid}:
 *   get:
 *     summary: Lista as contribuições de um projeto (requer acesso)
 *     tags: [Contributions]
 *     parameters:
 *       - in: path
 *         name: projectUid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de contribuições
 *       403:
 *         description: Acesso negado
 */
router.get('/projects/:projectUid', checkProjectPermission('viewer'), async (req: AuthRequest, res) => {
    const { projectUid } = req.params;
    try {
        const project = await prisma.project.findUnique({ where: { uid: projectUid } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const contributions = await prisma.contribution.findMany({
            where: { projectId: project.id },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { uid: true, name: true, avatar: true } } },
        });
        res.json({ contributions });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;