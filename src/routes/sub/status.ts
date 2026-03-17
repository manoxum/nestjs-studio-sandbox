// filename: routes/sub/status.ts

import { Router } from 'express';
import { inspectContainer } from '../../services/docker';
import { sanitiseFilename } from '../../utils/sanitize';
import { SUB_SANDBOX_PREFIX } from '../../config/constants';

const router = Router();

/**
 * @openapi
 * /sandbox/sub/{name}/status:
 *   get:
 *     summary: Inspeciona um sub-container
 *     tags: [Sub-Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *     responses:
 *       200: { description: Informações detalhadas }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.get('/:name/status', async (req, res) => {
    const { name } = req.params;
    const containerName = `${SUB_SANDBOX_PREFIX}${sanitiseFilename(name)}`;
    try {
        const info = await inspectContainer(containerName);
        res.json(info);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;