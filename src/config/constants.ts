// filename: src/config/constants.ts

import path from 'path';
import * as process from 'process';

const rootDir = process.cwd();

export const SANDBOX_DIR = path.join(rootDir, 'sandbox_data');
export const BUILDS_DIR = path.join(SANDBOX_DIR, 'builds');
export const PROJECTS_DIR = path.join(SANDBOX_DIR, 'projects'); // NOVO
export const PORT_ALLOC_FILE = path.join(rootDir, 'port_allocations.json');
export const SUB_SANDBOX_PREFIX = 'sub-sandbox-';
export const PORT_RANGE = {
    start: Number(process.env.PORT_RANGE_START ?? 16100),
    end: Number(process.env.PORT_RANGE_END ?? 16150)
};