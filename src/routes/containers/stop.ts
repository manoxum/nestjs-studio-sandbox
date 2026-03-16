import { Router } from 'express';
import { stopContainer } from '../../services/docker';
import { validateContainerName } from '../../utils/sanitize';

const router = Router();

/**
 * @openapi
 * /sandbox/containers/{name}/stop:
 *   post:
 *     summary: Para um container
 *     tags: [Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *     responses:
 *       200: { description: Container parado }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.post('/:name/stop', async (req, res) => {
    const { name } = req.params;
    if (!validateContainerName(name)) {
        return res.status(400).json({ error: 'Invalid container name' });
    }
    try {
        await stopContainer(name);
        res.json({ message: `Container ${name} stopped` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;