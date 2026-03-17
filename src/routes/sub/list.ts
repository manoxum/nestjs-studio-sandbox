// filename: src/routes/sub/list.ts

import { Router } from 'express';
import { listContainers } from '../../services/docker';
import { getAllocations } from '../../services/portAlloc';

const router = Router();

/**
 * @openapi
 * /sandbox/sub:
 *   get:
 *     summary: Lista todos os sub-containers
 *     tags: [Sub-Containers]
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
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string }
 *                       status: { type: string }
 *                       image: { type: string }
 *                       portMappings: { type: array, items: { $ref: '#/components/schemas/PortMapping' } }
 */
router.get('/', async (req, res) => {
    try {
        const containers = await listContainers();
        const allocations = getAllocations();
        const result = containers.map(c => ({
            ...c,
            portMappings: allocations[c.name] || []
        }));
        res.json({ containers: result });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;