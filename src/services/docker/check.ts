// filename: backend-sanbox/src/services/docker/check.ts

import { exec } from 'child_process';

export function checkContainerExists(containerName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        exec(`docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`, (err, stdout) => {
            if (err) return reject(err);
            resolve(stdout.trim() === containerName);
        });
    });
}