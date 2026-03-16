// filename: backend-sanbox/src/types/index.ts

export interface PortMapping {
    hostPort: number;
    internalPort: number;
}

export interface PortAllocations {
    [containerName: string]: PortMapping[];
}