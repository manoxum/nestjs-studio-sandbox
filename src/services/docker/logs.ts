// filename: backend-sanbox/src/services/docker/logs.ts

import { exec } from 'child_process';

export function getContainerLogs(containerName: string, tail: string = '50'): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(`docker logs --tail ${tail} ${containerName} 2>&1`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || stdout));
            resolve(stdout);
        });
    });
}