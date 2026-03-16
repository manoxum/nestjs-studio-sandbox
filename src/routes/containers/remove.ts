import { Router } from 'express';
import { removeContainer } from '../../services/docker';
import { releasePorts } from '../../services/portAlloc';
import { validateContainerName } from '../../utils/sanitize';

const router = Router();

/**
 * @openapi
 * /sandbox/containers/{name}:
 *   delete:
 *     summary: Remove um container (forçado)
 *     tags: [Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *     responses:
 *       200: { description: Container removido }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:name', async (req, res) => {
    const { name } = req.params;
    if (!validateContainerName(name)) {
        return res.status(400).json({ error: 'Invalid container name' });
    }
    try {
        await removeContainer(name);
        releasePorts(name);
        res.json({ message: `Container ${name} removed` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;