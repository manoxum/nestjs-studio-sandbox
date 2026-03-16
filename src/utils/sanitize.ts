// filename: backend-sanbox/src/utils/sanitize.ts

import path from 'path';

export function sanitiseFilename(filename: string): string {
    return path.basename(filename);
}

export function sanitiseCommand(cmd: string): string {
    // Permite apenas letras, números, espaços, pontos, traços, underscores e barras
    return cmd.replace(/[^a-zA-Z0-9\s\.\-\_\/]/g, '');
}

export function validateContainerName(name: string): boolean {
    // Permite apenas letras, números, hífen e underscore
    return /^[a-zA-Z0-9_-]+$/.test(name);
}