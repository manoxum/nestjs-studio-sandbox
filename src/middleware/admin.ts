// filename: src/middleware/admin.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
        return res.status(500).json({ error: 'ADMIN_EMAIL not configured in environment' });
    }
    if (req.user?.email !== adminEmail) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}