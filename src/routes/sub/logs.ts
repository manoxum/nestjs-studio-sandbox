import { Router } from 'express';
import { getContainerLogs } from '../../services/docker';
import { sanitiseFilename } from '../../utils/sanitize';
import { SUB_SANDBOX_PREFIX } from '../../config/constants';

const router = Router();

/**
 * @openapi
 * /sandbox/sub/{name}/logs:
 *   get:
 *     summary: Obtém os logs de um sub-container
 *     tags: [Sub-Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *       - in: query, name: tail, schema: { type: string }
 *     responses:
 *       200: { description: Logs, content: { application/json: { schema: { type: object, properties: { logs: { type: string } } } } } }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.get('/:name/logs', async (req, res) => {
    const { name } = req.params;
    const containerName = `${SUB_SANDBOX_PREFIX}${sanitiseFilename(name)}`;
    const tail = req.query.tail || '50';
    try {
        const logs = await getContainerLogs(containerName, tail as string);
        res.json({ logs });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;