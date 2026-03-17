// filename: src/middleware/projectPermission.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../db/prisma';

type Role = 'owner' | 'editor' | 'viewer';

export function checkProjectPermission(minRole: Role = 'viewer') {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const { projectUid } = req.params; // agora é projectUid
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const project = await prisma.project.findUnique({
                where: { uid: projectUid },
                select: { id: true, ownerId: true },
            });

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            if (project.ownerId === userId) {
                return next();
            }

            const collaborator = await prisma.collaborator.findUnique({
                where: {
                    userId_projectId: { userId, projectId: project.id },
                },
                select: { role: true },
            });

            if (!collaborator) {
                return res.status(403).json({ error: 'Access denied to this project' });
            }

            const roleHierarchy: Record<Role, number> = {
                owner: 3,
                editor: 2,
                viewer: 1,
            };

            if (roleHierarchy[collaborator.role as Role] < roleHierarchy[minRole]) {
                return res.status(403).json({ error: `Insufficient permissions. Required: ${minRole}` });
            }

            (req as any).collaboratorRole = collaborator.role;
            next();
        } catch (err) {
            console.error('[projectPermission] Error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}