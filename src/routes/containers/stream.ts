// filename: src/routes/containers/stream.ts


import { Router } from 'express';
import { spawn } from 'child_process';
import { inspectContainer } from '../../services/docker';
import { validateContainerName } from '../../utils/sanitize';

const router = Router();

/**
 * @openapi
 * /sandbox/containers/{name}/logs/stream:
 *   get:
 *     summary: Obtém logs de um container em streaming (follow)
 *     tags: [Containers]
 *     parameters:
 *       - in: path, name: name, required: true, schema: { type: string }
 *       - in: query, name: tail, schema: { type: string, default: "50" }
 *       - in: query, name: follow, schema: { type: boolean, default: false }
 *     responses:
 *       200: { description: Stream de logs em texto puro, content: { text/plain: { schema: { type: string } } } }
 *       400: { description: Nome inválido ou container não encontrado }
 *       500: { description: Erro interno }
 */
router.get('/:name/logs/stream', async (req, res) => {
    const { name } = req.params;
    const tail = req.query.tail || '50';
    const follow = req.query.follow === 'true';

    if (!validateContainerName(name)) {
        return res.status(400).json({ error: 'Invalid container name' });
    }

    try {
        await inspectContainer(name);
    } catch {
        return res.status(400).json({ error: `Container ${name} not found` });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const args = ['logs'];
    if (follow) args.push('-f');
    args.push('--tail', tail as string);
    args.push(name);

    const dockerProcess = spawn('docker', args);

    dockerProcess.stdout.on('data', (data) => res.write(data));
    dockerProcess.stderr.on('data', (data) => res.write(data));
    dockerProcess.on('close', () => res.end());
    dockerProcess.on('error', (err) => {
        console.error(`[stream] Erro: ${err.message}`);
        res.end();
    });

    req.on('close', () => dockerProcess.kill());
});

export default router;