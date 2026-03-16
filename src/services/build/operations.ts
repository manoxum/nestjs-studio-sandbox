import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { BUILDS_DIR } from '../../config/constants';
import { allocatePorts, releasePorts } from '../portAlloc';
import { removeContainer } from '../docker';
import { extractFile } from './extract';
import { PortMapping } from '../../types';

export interface BuildInfo {
    id: string;
    name: string;
    containerName: string;
    imageName: string;
    status: 'building' | 'running' | 'stopped' | 'error';
    portMappings: PortMapping[];
    createdAt: Date;
}

const builds: Map<string, BuildInfo> = new Map();

export async function buildAndRun(
    name: string,
    file: Express.Multer.File,
    internalPorts: number[],
    env: Record<string, string> = {}
): Promise<BuildInfo> {
    const id = uuidv4();
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '') || id;
    const buildDir = path.join(BUILDS_DIR, id);
    const isZip = file.originalname.endsWith('.zip');
    const filePath = path.join(buildDir, isZip ? 'upload.zip' : 'upload.tar');

    await fs.ensureDir(buildDir);
    await fs.writeFile(filePath, file.buffer);
    await extractFile(filePath, buildDir);

    const dockerfilePath = path.join(buildDir, 'Dockerfile');
    if (!(await fs.pathExists(dockerfilePath))) {
        const files = await fs.readdir(buildDir);
        const subDir = files.find(f => !f.includes('.') && fs.statSync(path.join(buildDir, f)).isDirectory());
        if (subDir && await fs.pathExists(path.join(buildDir, subDir, 'Dockerfile'))) {
            const subFiles = await fs.readdir(path.join(buildDir, subDir));
            for (const f of subFiles) {
                await fs.move(path.join(buildDir, subDir, f), path.join(buildDir, f));
            }
        } else {
            throw new Error('Dockerfile not found in the uploaded package');
        }
    }

    const imageName = `sandbox-build-${safeName}:${id.slice(0, 8)}`;
    const containerName = `sandbox-build-${safeName}`;

    try {
        await removeContainer(containerName).catch(() => {});
    } catch { }

    const portMappings = await allocatePorts(internalPorts, containerName);
    const envFlags = Object.entries(env).map(([k, v]) => `-e ${k}=${v}`);
    const portFlags = portMappings.map(m => `-p ${m.hostPort}:${m.internalPort}`);
    const allFlags = [...portFlags, ...envFlags];

    try {
        await new Promise<void>((resolve, reject) => {
            exec(`docker build -t ${imageName} "${buildDir}"`, (err, stdout, stderr) => {
                if (err) return reject(new Error(stderr || err.message));
                resolve();
            });
        });

        await new Promise<void>((resolve, reject) => {
            const cmd = `docker run -d --name ${containerName} ${allFlags.join(' ')} ${imageName}`;
            exec(cmd, (err, stdout, stderr) => {
                if (err) return reject(new Error(stderr || err.message));
                resolve();
            });
        });

        const buildInfo: BuildInfo = {
            id,
            name: safeName,
            containerName,
            imageName,
            status: 'running',
            portMappings,
            createdAt: new Date(),
        };
        builds.set(id, buildInfo);
        return buildInfo;
    } catch (error) {
        releasePorts(containerName);
        throw error;
    }
}

export async function stopBuild(containerName: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        exec(`docker stop ${containerName}`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || err.message));
            resolve();
        });
    });
    for (const info of builds.values()) {
        if (info.containerName === containerName) {
            info.status = 'stopped';
            break;
        }
    }
}

export async function removeBuild(containerName: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        exec(`docker rm -f ${containerName}`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || err.message));
            resolve();
        });
    });
    releasePorts(containerName);
    for (const [id, info] of builds.entries()) {
        if (info.containerName === containerName) {
            builds.delete(id);
            break;
        }
    }
}

export function listBuilds(): BuildInfo[] {
    return Array.from(builds.values());
}