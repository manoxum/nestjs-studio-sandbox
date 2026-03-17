// filename: src/routes/containers/start.ts

import { Router } from 'express';
import { startContainer } from '../../services/docker';
import { validateContainerName } from '../../utils/sanitize';

const router = Router();

/**
 * @openapi
 * /sandbox/containers/{name}/start:
 *   post:
 *     summary: Inicia um container parado
 *     tags: [Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *     responses:
 *       200: { description: Container iniciado }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.post('/:name/start', async (req, res) => {
    const { name } = req.params;
    if (!validateContainerName(name)) {
        return res.status(400).json({ error: 'Invalid container name' });
    }
    try {
        await startContainer(name);
        res.json({ message: `Container ${name} started` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;