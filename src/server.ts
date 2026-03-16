// filename: backend-sanbox/src/server.ts

import app from './app';
import * as process from 'process';
import { SANDBOX_DIR, PORT_RANGE } from './config/constants';

const PORT = Number(process.env.PORT_APPLICATION ?? 3000);

app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Sandbox master running on port ${PORT}`);
    console.log(`Sandbox data directory: ${SANDBOX_DIR}`);
    console.log(`Port range: ${PORT_RANGE.start}-${PORT_RANGE.end}`);
});