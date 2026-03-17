// filename: src/routes/install.ts

import { Router } from 'express';
import { executeCommand } from '../services/execCmd';
import { SANDBOX_DIR } from '../config/constants';

const router = Router();

/**
 * @openapi
 * /sandbox/install:
 *   post:
 *     summary: Instala um pacote npm no diretório sandbox
 *     tags: [Comandos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pkg
 *             properties:
 *               pkg:
 *                 type: string
 *                 example: "express"
 *     responses:
 *       200:
 *         description: Saída da instalação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 output:
 *                   type: string
 *       400:
 *         description: Nome do pacote inválido
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
router.post('/install', async (req, res) => {
    const { pkg } = req.body;
    console.log(`[INSTALL] Recebido pacote: "${pkg}"`);

    if (!pkg || typeof pkg !== 'string') {
        console.error('[INSTALL] Pacote inválido ou ausente');
        return res.status(400).json({ error: 'Missing package name' });
    }

    try {
        const cmd = `npm install ${pkg}`;
        console.log(`[INSTALL] Executando: "${cmd}" em ${SANDBOX_DIR}`);
        const output = await executeCommand(cmd, SANDBOX_DIR);
        console.log(`[INSTALL] Saída (primeiras 200 caracteres): ${output.substring(0, 200)}`);
        res.json({ output });
    } catch (err: any) {
        console.error(`[INSTALL] Erro: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

export default router;