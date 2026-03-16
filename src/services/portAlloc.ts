// filename: backend-sanbox/src/services/portAlloc.ts

import fs from 'fs';
import net from 'net';
import { PORT_ALLOC_FILE, PORT_RANGE } from '../config/constants';
import { PortAllocations, PortMapping } from '../types';
import { listAllContainers } from './docker';

let portAllocations: PortAllocations = {};

// Verifica se uma porta está livre no host
function isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                // Outros erros (ex: permissão) consideramos como livre? Melhor assumir livre.
                resolve(true);
            }
        });
        server.once('listening', () => {
            server.close(() => resolve(true));
        });
        server.listen(port, '0.0.0.0');
    });
}

export async function loadPortAllocations(): Promise<void> {
    if (fs.existsSync(PORT_ALLOC_FILE)) {
        try {
            portAllocations = JSON.parse(fs.readFileSync(PORT_ALLOC_FILE, 'utf-8'));
        } catch (e) {
            console.error('Failed to read port allocations, starting fresh:', e);
            portAllocations = {};
        }
    } else {
        portAllocations = {};
    }
    await syncPortAllocations();
}

export function savePortAllocations(): void {
    fs.writeFileSync(PORT_ALLOC_FILE, JSON.stringify(portAllocations, null, 2));
}

export function getAllocations(): PortAllocations {
    return portAllocations;
}

export async function allocatePorts(requestedPorts: number[], containerName: string): Promise<PortMapping[]> {
    // Sincroniza antes de alocar
    await syncPortAllocations();

    const usedPorts = new Set<number>();
    for (const mappings of Object.values(portAllocations)) {
        mappings.forEach(m => usedPorts.add(m.hostPort));
    }

    const portMappings: PortMapping[] = [];
    let hostPort = PORT_RANGE.start;

    for (const internalPort of requestedPorts) {
        let found = false;
        while (hostPort <= PORT_RANGE.end && !found) {
            if (!usedPorts.has(hostPort)) {
                const free = await isPortFree(hostPort);
                if (free) {
                    found = true;
                } else {
                    console.log(`[portAlloc] Porta ${hostPort} está ocupada no host, ignorando`);
                    hostPort++;
                }
            } else {
                hostPort++;
            }
        }
        if (!found) {
            throw new Error('No available host ports in range');
        }
        usedPorts.add(hostPort);
        portMappings.push({ hostPort, internalPort });
        hostPort++; // avança para próxima iteração
    }

    portAllocations[containerName] = portMappings;
    savePortAllocations();
    return portMappings;
}

export function releasePorts(containerName: string): void {
    delete portAllocations[containerName];
    savePortAllocations();
}

export function getPortMappings(containerName: string): PortMapping[] {
    return portAllocations[containerName] || [];
}

export async function syncPortAllocations(): Promise<void> {
    try {
        const containers = await listAllContainers();
        const containerNames = new Set(containers.map(c => c.name));
        let changed = false;
        for (const containerName of Object.keys(portAllocations)) {
            if (!containerNames.has(containerName)) {
                delete portAllocations[containerName];
                changed = true;
                console.log(`[portAlloc] Removed orphaned port allocation for ${containerName}`);
            }
        }
        if (changed) {
            savePortAllocations();
        }
    } catch (err) {
        console.error('[portAlloc] Failed to sync port allocations:', err);
    }
}