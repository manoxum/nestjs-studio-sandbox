// filename: src/routes/containers/list.ts

import { Router } from 'express';
import { listAllContainers } from '../../services/docker';
import { getPortMappings } from '../../services/portAlloc';
import { SUB_SANDBOX_PREFIX } from '../../config/constants';

const router = Router();
const BUILD_PREFIX = 'sandbox-build-';

/**
 * @openapi
 * /sandbox/containers:
 *   get:
 *     summary: Lista todos os containers gerenciados (sub e build)
 *     tags: [Containers]
 *     responses:
 *       200:
 *         description: Lista de containers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 containers:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ContainerInfo' }
 */
router.get('/', async (req, res) => {
    try {
        const containers = await listAllContainers([SUB_SANDBOX_PREFIX, BUILD_PREFIX]);
        const result = containers.map(c => ({
            ...c,
            portMappings: getPortMappings(c.name),
            type: c.name.startsWith(SUB_SANDBOX_PREFIX) ? 'sub' : 'build'
        }));
        res.json({ containers: result });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;