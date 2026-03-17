// filename: src/routes/sub/delete.ts


import { Router } from 'express';
import { removeContainer } from '../../services/docker';
import { releasePorts } from '../../services/portAlloc';
import { sanitiseFilename } from '../../utils/sanitize';
import { SUB_SANDBOX_PREFIX } from '../../config/constants';

const router = Router();

/**
 * @openapi
 * /sandbox/sub/{name}:
 *   delete:
 *     summary: Remove um sub-container
 *     tags: [Sub-Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *     responses:
 *       200: { description: Container removido }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:name', async (req, res) => {
    const { name } = req.params;
    const containerName = `${SUB_SANDBOX_PREFIX}${sanitiseFilename(name)}`;
    try {
        await removeContainer(containerName);
        releasePorts(containerName);
        res.json({ message: `Container ${containerName} removed` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;