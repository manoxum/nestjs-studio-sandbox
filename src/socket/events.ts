// filename: src/socket/events.ts

// src/socket/events.ts
export const SOCKET_EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    JOIN_PROJECT: 'join-project',
    LEAVE_PROJECT: 'leave-project',
    SUBSCRIBE_ASSET: 'subscribe-asset',
    UNSUBSCRIBE_ASSET: 'unsubscribe-asset',

    // Eventos de projeto
    PROJECT_UPDATED: 'project:updated',
    PROJECT_DELETED: 'project:deleted',

    // Eventos de ficheiros
    FILE_CREATED: 'file:created',
    FILE_UPDATED: 'file:updated',
    FILE_DELETED: 'file:deleted',

    // Eventos de assets
    ASSET_CREATED: 'asset:created',
    ASSET_UPDATED: 'asset:updated',
    ASSET_DELETED: 'asset:deleted',

    // Eventos de colaboradores
    COLLABORATOR_ADDED: 'collaborator:added',
    COLLABORATOR_UPDATED: 'collaborator:updated',
    COLLABORATOR_REMOVED: 'collaborator:removed',

    // Eventos pessoais do utilizador
    USER_COLLABORATOR_ADDED: 'user:collaborator_added',
    USER_COLLABORATOR_UPDATED: 'user:collaborator_updated',
    USER_COLLABORATOR_REMOVED: 'user:collaborator_removed',
} as const;