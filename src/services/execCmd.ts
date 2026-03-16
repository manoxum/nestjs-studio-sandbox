// filename: backend-sanbox/src/services/execCmd.ts

import { exec } from 'child_process';
import { sanitiseCommand } from '../utils/sanitize';

export function executeCommand(command: string, cwd: string): Promise<string> {
    const safeCommand = sanitiseCommand(command);
    return new Promise((resolve, reject) => {
        exec(safeCommand, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
            } else {
                resolve(stdout);
            }
        });
    });
}