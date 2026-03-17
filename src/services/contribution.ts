// filename: src/services/contribution.ts

import { prisma } from '../db/prisma';

export async function recordContribution(
    userId: number,
    action: string,
    projectId?: number | null,
    details?: any,
    score: number = 1
) {
    try {
        await prisma.contribution.create({
            data: {
                userId,
                projectId,
                action,
                details: details || {},
                score,
            },
        });
    } catch (err) {
        console.error('Failed to record contribution:', err);
    }
}