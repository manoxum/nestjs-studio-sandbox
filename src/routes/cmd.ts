// filename: backend-sanbox/src/routes/cmd.ts

import { Router } from 'express';
import { executeCommand } from '../services/execCmd';
import { SANDBOX_DIR } from '../config/constants';

const router = Router();

/**
 * @openapi
 * /sandbox/cmd:
 *   post:
 *     summary: Executa um comando no diretório sandbox
 *     tags: [Comandos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - command
 *             properties:
 *               command:
 *                 type: string
 *                 example: "ls -la"
 *     responses:
 *       200:
 *         description: Saída do comando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 output:
 *                   type: string
 *       400:
 *         description: Comando inválido
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
router.post('/cmd', async (req, res) => {
    const { command } = req.body;
    console.log(`[CMD] Recebido comando: "${command}"`);

    if (!command || typeof command !== 'string') {
        console.error('[CMD] Comando inválido ou ausente');
        return res.status(400).json({ error: 'Missing or invalid command' });
    }

    try {
        console.log(`[CMD] Executando: "${command}" em ${SANDBOX_DIR}`);
        const output = await executeCommand(command, SANDBOX_DIR);
        console.log(`[CMD] Saída (primeiras 200 caracteres): ${output.substring(0, 200)}`);
        res.json({ output });
    } catch (err: any) {
        console.error(`[CMD] Erro: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

export default router;