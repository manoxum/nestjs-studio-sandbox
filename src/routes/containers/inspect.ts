// filename: src/routes/containers/inspect.ts

import { Router } from 'express';
import { inspectContainer } from '../../services/docker';
import { getPortMappings } from '../../services/portAlloc';
import { validateContainerName } from '../../utils/sanitize';

const router = Router();

/**
 * @openapi
 * /sandbox/containers/{name}:
 *   get:
 *     summary: Inspeciona um container específico
 *     tags: [Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *     responses:
 *       200: { description: Informações detalhadas }
 *       400: { description: Nome inválido }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.get('/:name', async (req, res) => {
    const { name } = req.params;
    if (!validateContainerName(name)) {
        return res.status(400).json({ error: 'Invalid container name' });
    }
    try {
        const info = await inspectContainer(name);
        const portMappings = getPortMappings(name);
        res.json({ ...info, portMappings });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;