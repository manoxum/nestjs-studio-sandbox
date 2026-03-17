// filename: src/routes/sub/stop.ts

import { Router } from 'express';
import { stopContainer } from '../../services/docker';
import { sanitiseFilename } from '../../utils/sanitize';
import { SUB_SANDBOX_PREFIX } from '../../config/constants';

const router = Router();

/**
 * @openapi
 * /sandbox/sub/{name}/stop:
 *   post:
 *     summary: Para um sub-container
 *     tags: [Sub-Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *     responses:
 *       200: { description: Container parado }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.post('/:name/stop', async (req, res) => {
    const { name } = req.params;
    const containerName = `${SUB_SANDBOX_PREFIX}${sanitiseFilename(name)}`;
    try {
        await stopContainer(containerName);
        res.json({ message: `Container ${containerName} stopped` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;