// src/routes/users.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import { prisma } from '../db/prisma';
import { SANDBOX_DIR } from '../config/constants';
import { io } from '../server';
import { emitToUser } from '../server';

const router = Router();

router.use(authenticate);

// Configuração do multer para avatar
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const avatarsDir = path.join(SANDBOX_DIR, 'avatars');
        fs.ensureDirSync(avatarsDir);
        cb(null, avatarsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});
const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only images are allowed') as any, false);
        }
        cb(null, true);
    }
});

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Lista todos os usuários (apenas admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Acesso negado (não é admin)
 */
router.get('/', isAdmin, async (req: AuthRequest, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                uid: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json({ users });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Retorna os dados do usuário logado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get('/me', async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                uid: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json(user);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /users/me:
 *   put:
 *     summary: Atualiza o nome do usuário logado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário atualizado
 */
router.put('/me', async (req: AuthRequest, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const updated = await prisma.user.update({
            where: { id: req.user!.id },
            data: { name, updatedBy: req.user!.id },
            select: {
                uid: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json(updated);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /users/me/change-password:
 *   post:
 *     summary: Altera a senha do usuário logado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Senha atual incorreta
 */
router.post('/me/change-password', async (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password required' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user!.id },
            data: { password: hashed, updatedBy: req.user!.id },
        });
        res.json({ message: 'Password changed successfully' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /users/me/avatar:
 *   post:
 *     summary: Faz upload da foto de perfil do usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 avatarUrl:
 *                   type: string
 *       400:
 *         description: Erro no upload
 */
router.post('/me/avatar', uploadAvatar.single('avatar'), async (req: AuthRequest, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const avatarUrl = `${baseUrl}/avatars/${req.file.filename}`;

        await prisma.user.update({
            where: { id: req.user!.id },
            data: { avatar: avatarUrl, updatedBy: req.user!.id },
        });

        emitToUser(io, req.user!.id, 'user:avatar_updated', {
            avatarUrl,
            sourceSocketId: (req as any).socketId,
        });

        res.json({ avatarUrl });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /users/{uid}:
 *   get:
 *     summary: Retorna um usuário específico (apenas admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do usuário
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:uid', isAdmin, async (req: AuthRequest, res) => {
    const { uid } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { uid },
            select: {
                uid: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /users/{uid}:
 *   delete:
 *     summary: Remove um usuário (apenas admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário removido
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Usuário não encontrado
 */
router.delete('/:uid', isAdmin, async (req: AuthRequest, res) => {
    const { uid } = req.params;
    try {
        await prisma.user.delete({ where: { uid } });
        res.json({ message: 'User deleted' });
    } catch (err: any) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;