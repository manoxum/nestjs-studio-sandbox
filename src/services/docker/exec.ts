import { exec } from 'child_process';

export function execInContainer(containerName: string, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(`docker exec ${containerName} ${command}`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr));
            resolve(stdout);
        });
    });
}