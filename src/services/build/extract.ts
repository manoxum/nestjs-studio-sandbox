import fs from 'fs-extra';
import { exec } from 'child_process';

export async function extractFile(filePath: string, destDir: string): Promise<void> {
    await fs.ensureDir(destDir);
    const isZip = filePath.endsWith('.zip');
    const cmd = isZip ? `unzip -o "${filePath}" -d "${destDir}"` : `tar -xzf "${filePath}" -C "${destDir}"`;

    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || err.message));
            resolve();
        });
    });
}