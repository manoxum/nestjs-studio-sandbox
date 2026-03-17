// filename: src/middleware/socketId.ts

import { Request, Response, NextFunction } from 'express';

export function extractSocketId(req: Request, res: Response, next: NextFunction) {
    const socketId = req.headers['x-socket-id'];
    if (socketId && typeof socketId === 'string') {
        (req as any).socketId = socketId;
    }
    next();
}