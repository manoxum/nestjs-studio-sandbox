// filename: backend-sanbox/src/routes/restart.ts

import { Router } from 'express';
import * as process from 'process';

const router = Router();

/**
 * @openapi
 * /sandbox/restart:
 *   post:
 *     summary: Reinicia o servidor master (sai do processo)
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Reiniciando...
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/restart', (req, res) => {
    console.log('[RESTART] Reiniciando servidor master...');
    res.json({ message: 'Restarting sandbox...' });
    setTimeout(() => {
        console.log('[RESTART] Saindo do processo');
        process.exit(0);
    }, 500);
});

export default router;