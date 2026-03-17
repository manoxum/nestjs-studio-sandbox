// filename: src/routes/containers/logs.ts


import { Router } from 'express';
import { getContainerLogs } from '../../services/docker';
import { validateContainerName } from '../../utils/sanitize';

const router = Router();

/**
 * @openapi
 * /sandbox/containers/{name}/logs:
 *   get:
 *     summary: Obtém logs de um container
 *     tags: [Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *       - in: query, name: tail, schema: { type: string }
 *     responses:
 *       200: { description: Logs }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.get('/:name/logs', async (req, res) => {
    const { name } = req.params;
    const tail = req.query.tail || '50';
    if (!validateContainerName(name)) {
        return res.status(400).json({ error: 'Invalid container name' });
    }
    try {
        const logs = await getContainerLogs(name, tail as string);
        res.json({ logs });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;