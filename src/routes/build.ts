// filename: backend-sanbox/src/routes/build.ts

import { Router } from 'express';
import multer from 'multer';
import { buildAndRun, stopBuild, removeBuild, listBuilds } from '../services/build';
import { sanitiseFilename } from '../utils/sanitize';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @openapi
 * /sandbox/build:
 *   post:
 *     summary: Faz upload de um arquivo (tar/zip) com Dockerfile, constrói e executa
 *     tags: [Builds]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - name
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *                 example: "meu-projeto"
 *               internalPorts:
 *                 type: string
 *                 description: "Array JSON de portas internas (ex: [3000])"
 *               env:
 *                 type: string
 *                 description: "Objeto JSON com variáveis de ambiente"
 *     responses:
 *       200:
 *         description: Build concluído e container em execução
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                 - $ref: '#/components/schemas/BuildInfo'
 *       400:
 *         description: Parâmetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/build', upload.single('file'), async (req, res) => {
    try {
        const { name, internalPorts, env } = req.body;
        console.log(`[BUILD] Iniciando build: name="${name}"`);
        console.log(`[BUILD] Arquivo recebido: ${req.file?.originalname}, tamanho: ${req.file?.size} bytes`);
        if (internalPorts) console.log(`[BUILD] Portas internas solicitadas:`, internalPorts);
        if (env) console.log(`[BUILD] Variáveis de ambiente:`, env);

        if (!req.file) {
            console.error('[BUILD] Nenhum arquivo enviado');
            return res.status(400).json({ error: 'No tar file uploaded' });
        }
        if (!name || typeof name !== 'string') {
            console.error('[BUILD] Nome inválido ou ausente');
            return res.status(400).json({ error: 'Missing or invalid name' });
        }

        let ports: number[] = [];
        if (internalPorts) {
            if (typeof internalPorts === 'string') {
                ports = JSON.parse(internalPorts);
            } else if (Array.isArray(internalPorts)) {
                ports = internalPorts;
            }
            if (!ports.every(p => typeof p === 'number')) {
                console.error('[BUILD] Portas inválidas:', internalPorts);
                return res.status(400).json({ error: 'internalPorts must be an array of numbers' });
            }
        }

        let envVars: Record<string, string> = {};
        if (env) {
            if (typeof env === 'string') {
                envVars = JSON.parse(env);
            } else if (typeof env === 'object' && !Array.isArray(env)) {
                envVars = env;
            } else {
                console.error('[BUILD] env deve ser um objeto');
                return res.status(400).json({ error: 'env must be an object' });
            }
        }

        console.log(`[BUILD] Chamando buildAndRun...`);
        const buildInfo = await buildAndRun(name, req.file, ports, envVars);
        console.log(`[BUILD] Build concluído: container=${buildInfo.containerName}, id=${buildInfo.id}`);

        res.json({
            message: 'Build started and container is running',
            ...buildInfo,
        });
    } catch (err: any) {
        console.error(`[BUILD] Erro: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /sandbox/builds:
 *   get:
 *     summary: Lista todos os builds ativos
 *     tags: [Builds]
 *     responses:
 *       200:
 *         description: Lista de builds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 builds:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BuildInfo'
 */
router.get('/builds', async (req, res) => {
    console.log('[BUILD] Listando builds ativos');
    try {
        const builds = listBuilds();
        console.log(`[BUILD] Encontrados ${builds.length} builds`);
        res.json({ builds });
    } catch (err: any) {
        console.error(`[BUILD] Erro ao listar builds: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /sandbox/builds/{name}/stop:
 *   post:
 *     summary: Para um container de build
 *     tags: [Builds]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome base do build (sem prefixo)
 *     responses:
 *       200:
 *         description: Build parado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/builds/:name/stop', async (req, res) => {
    const { name } = req.params;
    const containerName = `sandbox-build-${sanitiseFilename(name)}`;
    console.log(`[BUILD] Parar build: ${containerName}`);

    try {
        await stopBuild(containerName);
        console.log(`[BUILD] Build ${containerName} parado`);
        res.json({ message: `Build ${name} stopped` });
    } catch (err: any) {
        console.error(`[BUILD] Erro ao parar: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @openapi
 * /sandbox/builds/{name}:
 *   delete:
 *     summary: Remove um container de build
 *     tags: [Builds]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Build removido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/builds/:name', async (req, res) => {
    const { name } = req.params;
    const containerName = `sandbox-build-${sanitiseFilename(name)}`;
    console.log(`[BUILD] Remover build: ${containerName}`);

    try {
        await removeBuild(containerName);
        console.log(`[BUILD] Build ${containerName} removido`);
        res.json({ message: `Build ${name} removed` });
    } catch (err: any) {
        console.error(`[BUILD] Erro ao remover: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

export default router;