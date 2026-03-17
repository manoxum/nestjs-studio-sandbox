// filename: src/routes/file.ts

import { Router } from 'express';
import { writeFile, deleteFile } from '../services/fileOps';

const router = Router();

/**
 * @openapi
 * /sandbox/file:
 *   post:
 *     summary: Cria um arquivo no diretório sandbox
 *     tags: [Arquivos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *                 example: "test.txt"
 *               content:
 *                 type: string
 *                 example: "Hello World"
 *     responses:
 *       200:
 *         description: Arquivo criado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 path:
 *                   type: string
 *       400:
 *         description: Nome do arquivo inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/file', (req, res) => {
    const { filename, content } = req.body;
    console.log(`[FILE] Criar arquivo: "${filename}"`);

    if (!filename || typeof filename !== 'string') {
        console.error('[FILE] Nome de arquivo inválido');
        return res.status(400).json({ error: 'Missing filename' });
    }

    try {
        const safeFilename = writeFile(filename, content);
        console.log(`[FILE] Arquivo criado: ${safeFilename}`);
        res.json({ message: 'File created successfully', path: safeFilename });
    } catch (err: any) {
        console.error(`[FILE] Erro ao escrever: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /sandbox/file/{filename}:
 *   delete:
 *     summary: Remove um arquivo do diretório sandbox
 *     tags: [Arquivos]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do arquivo
 *     responses:
 *       200:
 *         description: Arquivo removido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/file/:filename', (req, res) => {
    const { filename } = req.params;
    console.log(`[FILE] Remover arquivo: "${filename}"`);

    try {
        deleteFile(filename);
        console.log(`[FILE] Arquivo removido: ${filename}`);
        res.json({ message: 'File removed' });
    } catch (err: any) {
        console.error(`[FILE] Erro ao remover: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

export default router;