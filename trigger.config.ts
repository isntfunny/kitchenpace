import { prismaExtension } from '@trigger.dev/build/extensions/prisma';
import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
    project: 'proj_hyhxzimpbrmzymtacobm',
    runtime: 'node-22',
    logLevel: 'log',
    maxDuration: 3600,
    dirs: ['trigger'],
    build: {
        extensions: [
            prismaExtension({
                mode: 'legacy',
                schema: 'prisma/schema.prisma',
                migrate: true,
            }),
        ],
    },
    retries: {
        enabledInDev: true,
        default: {
            maxAttempts: 3,
            minTimeoutInMs: 1000,
            maxTimeoutInMs: 10000,
            factor: 2,
            randomize: true,
        },
    },
});
