// filename: backend-sanbox/src/utils/network.ts

import net from 'net';

export function waitForPort(host: string, port: number, timeoutMs: number = 30000): Promise<void> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            const socket = new net.Socket();
            const onError = () => {
                socket.destroy();
                if (Date.now() - start > timeoutMs) {
                    reject(new Error(`Timeout waiting for port ${port} to be open`));
                } else {
                    setTimeout(check, 1000);
                }
            };
            socket.setTimeout(2000);
            socket.once('connect', () => {
                socket.destroy();
                resolve();
            });
            socket.once('error', onError);
            socket.once('timeout', onError);
            socket.connect(port, host);
        };
        check();
    });
}

export async function waitForAllPorts(host: string, ports: number[], timeoutMs: number = 30000): Promise<void> {
    const promises = ports.map(port => waitForPort(host, port, timeoutMs));
    await Promise.all(promises);
}