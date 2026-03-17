// filename: src/middleware/projectAccess.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../db/prisma';

export async function canAccessProject(req: AuthRequest, res: Response, next: NextFunction) {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Verifica se o usuário é owner ou colaborador ativo
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                collaborators: {
                    where: {
                        userId,
                        AND: [
                            { OR: [{ startAt: null }, { startAt: { lte: new Date() } }] },
                            { OR: [{ endAt: null }, { endAt: { gte: new Date() } }] }
                        ]
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.ownerId !== userId && project.collaborators.length === 0) {
            return res.status(403).json({ error: 'Access denied to this project' });
        }

        // Opcional: anexar o projeto à requisição para uso posterior
        (req as any).project = project;
        next();
    } catch (err) {
        console.error('[projectAccess] Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}