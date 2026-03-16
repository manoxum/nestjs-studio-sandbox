// filename: backend-sanbox/src/routes/sub/create.ts

import { Router } from 'express';
import {
    checkContainerExists,
    runContainer,
    waitForContainerRunning,
    inspectContainer,
    getContainerLogs,
    removeContainer
} from '../../services/docker';
import { allocatePorts, releasePorts } from '../../services/portAlloc';
import { SUB_SANDBOX_PREFIX } from '../../config/constants';
import { waitForAllPorts } from '../../utils/network';

const router = Router();

/**
 * @openapi
 * /sandbox/sub:
 *   post:
 *     summary: Cria um novo sub-container a partir de uma imagem
 *     tags: [Sub-Containers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - image
 *               - requestedPorts
 *             properties:
 *               name: { type: string, example: "api-node" }
 *               image: { type: string, example: "node:18-alpine" }
 *               requestedPorts: { type: array, items: { type: number }, example: [3000] }
 *               env: { type: object, additionalProperties: { type: string }, example: { "NODE_ENV": "production" } }
 *     responses:
 *       200:
 *         description: Container criado e pronto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 containerId: { type: string }
 *                 mappings: { type: array, items: { $ref: '#/components/schemas/PortMapping' } }
 *       400: { $ref: '#/components/schemas/Error' }
 *       409: { $ref: '#/components/schemas/Error' }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.post('/', async (req, res) => {
    const { name, image, requestedPorts, env } = req.body;
    console.log(`[SUB] Criar container: name="${name}", image="${image}", requestedPorts=${JSON.stringify(requestedPorts)}`);

    if (!name || !image || !Array.isArray(requestedPorts)) {
        return res.status(400).json({ error: 'Missing or invalid parameters: name, image, requestedPorts (array)' });
    }

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '');
    if (safeName !== name) {
        return res.status(400).json({ error: 'Container name contains invalid characters' });
    }
    const containerName = `${SUB_SANDBOX_PREFIX}${safeName}`;

    try {
        const exists = await checkContainerExists(containerName);
        if (exists) {
            return res.status(409).json({ error: `Container ${containerName} already exists` });
        }

        const portMappings = await allocatePorts(requestedPorts, containerName);
        const portFlags = portMappings.map(m => `-p ${m.hostPort}:${m.internalPort}`);
        const envFlags = Object.entries(env || {}).map(([k, v]) => `-e ${k}=${v}`);
        const allFlags = [...portFlags, ...envFlags];

        const containerId = await runContainer(containerName, allFlags, image);
        await waitForContainerRunning(containerName, 60000);

        const inspect = await inspectContainer(containerName);
        const publishedPorts = inspect.NetworkSettings?.Ports;
        if (!publishedPorts || Object.keys(publishedPorts).length === 0) {
            throw new Error('No ports published for container');
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        const hostPorts = portMappings.map(m => m.hostPort);
        try {
            await waitForAllPorts('localhost', hostPorts, 180000);
        } catch {
            await waitForAllPorts('127.0.0.1', hostPorts, 60000);
        }

        res.json({
            message: `Sub‑sandbox ${containerName} created and ready`,
            containerId,
            mappings: portMappings
        });
    } catch (err: any) {
        console.error(`[SUB] Erro: ${err.message}`);
        let logs = '';
        try {
            logs = await getContainerLogs(containerName, '50');
        } catch { }
        await removeContainer(containerName).catch(() => {});
        releasePorts(containerName);
        res.status(500).json({ error: err.message, logs: logs || 'No logs available' });
    }
});

export default router;