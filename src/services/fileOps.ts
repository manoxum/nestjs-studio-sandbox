// filename: backend-sanbox/src/services/fileOps.ts

import fs from 'fs';
import path from 'path';
import { SANDBOX_DIR } from '../config/constants';
import { sanitiseFilename } from '../utils/sanitize';

export function writeFile(filename: string, content: string = ''): string {
    const safeFilename = sanitiseFilename(filename);
    const filePath = path.join(SANDBOX_DIR, safeFilename);
    fs.writeFileSync(filePath, content);
    return safeFilename;
}

export function deleteFile(filename: string): void {
    const safeFilename = sanitiseFilename(filename);
    const filePath = path.join(SANDBOX_DIR, safeFilename);
    fs.unlinkSync(filePath);
}