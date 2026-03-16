import { Router } from 'express';
import { execInContainer } from '../../services/docker';
import { validateContainerName } from '../../utils/sanitize';

const router = Router();

/**
 * @openapi
 * /sandbox/containers/{name}/exec:
 *   post:
 *     summary: Executa um comando dentro do container
 *     tags: [Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [command]
 *             properties:
 *               command: { type: string, example: "npm test" }
 *     responses:
 *       200: { description: Saída do comando }
 *       500: { $ref: '#/components/schemas/Error' }
 */
router.post('/:name/exec', async (req, res) => {
    const { name } = req.params;
    const { command } = req.body;
    if (!validateContainerName(name)) {
        return res.status(400).json({ error: 'Invalid container name' });
    }
    if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid command' });
    }
    try {
        const output = await execInContainer(name, command);
        res.json({ output });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;