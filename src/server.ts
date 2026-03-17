// src/server.ts
import app from './app';
import * as process from 'process';
import { createServer } from 'http';
import { initSocketServer } from './socket';
import { SANDBOX_DIR, PORT_RANGE } from './config/constants';
import { prisma } from './db/prisma';
import bcrypt from 'bcrypt';

const PORT = Number(process.env.PORT_APPLICATION ?? 3006);

async function ensureAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    try {
        const existing = await prisma.user.findUnique({
            where: { email: adminEmail }
        });
        if (!existing) {
            const hashed = await bcrypt.hash(adminPassword, 10);
            await prisma.user.create({
                data: {
                    name: 'Administrador',
                    email: adminEmail,
                    password: hashed
                }
            });
            console.log(`[INIT] Admin user with email '${adminEmail}' created.`);
        } else {
            console.log(`[INIT] Admin user with email '${adminEmail}' already exists.`);
        }
    } catch (err) {
        console.error('[INIT] Failed to ensure admin user:', err);
    }
}

// Criar servidor HTTP a partir da app Express
const httpServer = createServer(app);

// Inicializar socket e obter instância io
const io = initSocketServer(httpServer);

// Exportar io e as funções auxiliares
export { io };
export { emitToProject, emitToAsset, emitToUser } from './socket';

ensureAdminUser().finally(() => {
    httpServer.listen(PORT, () => {
        console.log(`[${new Date().toISOString()}] Sandbox master running on port ${PORT}`);
        console.log(`Sandbox data directory: ${SANDBOX_DIR}`);
        console.log(`Port range: ${PORT_RANGE.start}-${PORT_RANGE.end}`);
        console.log(`Socket.IO server initialized`);
    });
});