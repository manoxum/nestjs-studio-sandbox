// filename: backend-sanbox/src/config/constants.ts

import path from 'path';
import * as process from 'process';

const rootDir = process.cwd(); // diretório raiz do projeto

export const SANDBOX_DIR = path.join(rootDir, 'sandbox_data');
export const BUILDS_DIR = path.join(SANDBOX_DIR, 'builds');          // <-- NOVO
export const PORT_ALLOC_FILE = path.join(rootDir, 'port_allocations.json');
export const SUB_SANDBOX_PREFIX = 'sub-sandbox-';
export const PORT_RANGE = {
    start: Number(process.env.PORT_RANGE_START ?? 16100),
    end: Number(process.env.PORT_RANGE_END ?? 16150)
};