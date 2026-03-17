// filename: src/socket/index.ts

// src/socket/index.ts
import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { SOCKET_EVENTS } from './events';

// Mapa para manter referência dos sockets por userId
const userSockets = new Map<number, Socket[]>();

export function initSocketServer(httpServer: HttpServer): SocketServer {
    const io = new SocketServer(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    // Middleware de autenticação
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication token missing'));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
                id: number;
                uid: string;
                name: string;
                email: string;
            };
            socket.data.user = decoded;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on(SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
        const user = socket.data.user;
        console.log(`[SOCKET] User ${user.email} connected (socket ${socket.id})`);

        if (!userSockets.has(user.id)) userSockets.set(user.id, []);
        userSockets.get(user.id)!.push(socket);

        // Sala pessoal do utilizador
        socket.join(`user:${user.id}`);
        console.log(`[SOCKET] User ${user.email} joined personal room user:${user.id}`);

        socket.on(SOCKET_EVENTS.JOIN_PROJECT, (projectUid: string) => {
            socket.join(`project:${projectUid}`);
            console.log(`[SOCKET] User ${user.email} joined room project:${projectUid}`);
        });

        socket.on(SOCKET_EVENTS.LEAVE_PROJECT, (projectUid: string) => {
            socket.leave(`project:${projectUid}`);
            console.log(`[SOCKET] User ${user.email} left room project:${projectUid}`);
        });

        socket.on(SOCKET_EVENTS.SUBSCRIBE_ASSET, async (assetUid: string) => {
            try {
                const asset = await prisma.asset.findUnique({
                    where: { uid: assetUid },
                    include: { project: true },
                });
                if (!asset) {
                    socket.emit('error', { message: 'Asset not found' });
                    return;
                }
                const hasAccess = await prisma.project.findFirst({
                    where: {
                        uid: asset.project.uid,
                        OR: [
                            { ownerId: user.id },
                            { collaborators: { some: { userId: user.id } } },
                        ],
                    },
                });
                if (!hasAccess) {
                    socket.emit('error', { message: 'Access denied to this asset' });
                    return;
                }
                socket.join(`asset:${assetUid}`);
                console.log(`[SOCKET] User ${user.email} subscribed to asset:${assetUid}`);
            } catch (err) {
                console.error('[SOCKET] Error in subscribe-asset:', err);
                socket.emit('error', { message: 'Internal server error' });
            }
        });

        socket.on(SOCKET_EVENTS.UNSUBSCRIBE_ASSET, (assetUid: string) => {
            socket.leave(`asset:${assetUid}`);
            console.log(`[SOCKET] User ${user.email} unsubscribed from asset:${assetUid}`);
        });

        socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            console.log(`[SOCKET] User ${user.email} disconnected (socket ${socket.id})`);
            const sockets = userSockets.get(user.id) || [];
            const index = sockets.indexOf(socket);
            if (index !== -1) sockets.splice(index, 1);
            if (sockets.length === 0) userSockets.delete(user.id);
        });
    });

    return io;
}

// Funções auxiliares para emitir eventos com exclusão por socketId
export function emitToProject(io: SocketServer, projectUid: string, event: string, data: any, excludeSocketId?: string) {
    const room = `project:${projectUid}`;
    if (excludeSocketId) {
        io.to(room).except(excludeSocketId).emit(event, data);
    } else {
        io.to(room).emit(event, data);
    }
}

export function emitToAsset(io: SocketServer, assetUid: string, event: string, data: any, excludeSocketId?: string) {
    const room = `asset:${assetUid}`;
    if (excludeSocketId) {
        io.to(room).except(excludeSocketId).emit(event, data);
    } else {
        io.to(room).emit(event, data);
    }
}

export function emitToUser(io: SocketServer, userId: number, event: string, data: any) {
    const room = `user:${userId}`;
    io.to(room).emit(event, data);
}