import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import type { NextConfig } from 'next';

const resolveAliasPath = (subpath: string) => new URL(subpath, import.meta.url).pathname;

function buildRelease(): string {
    if (process.env.SOURCE_COMMIT) return process.env.SOURCE_COMMIT.slice(0, 12);
    try {
        return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim();
    } catch {
        const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
        return `v${pkg.version}`;
    }
}

const nextConfig: NextConfig = {
    allowedDevOrigins: ['kitchendev.isntlab.de'],
    env: {
        NEXT_PUBLIC_RELEASE: buildRelease(),
    },
    async redirects() {
        return [
            { source: '/moderation', destination: '/admin/moderation', permanent: true },
            {
                source: '/moderation/:path*',
                destination: '/admin/moderation/:path*',
                permanent: true,
            },
            { source: '/mods/:path*', destination: '/admin/:path*', permanent: true },
        ];
    },
    reactCompiler: true,
    output: 'standalone',
    serverExternalPackages: [
        'bullmq',
        'sharp',
        'nodehun',
        'pg',
        'ioredis',
        '@opentelemetry/api',
        '@opentelemetry/api-logs',
        '@opentelemetry/sdk-node',
        '@opentelemetry/sdk-logs',
        '@opentelemetry/sdk-trace-base',
        '@opentelemetry/sdk-metrics',
        '@opentelemetry/resources',
        '@opentelemetry/exporter-trace-otlp-http',
        '@opentelemetry/exporter-trace-otlp-proto',
        '@opentelemetry/exporter-logs-otlp-http',
        '@opentelemetry/exporter-metrics-otlp-http',
        '@opentelemetry/exporter-metrics-otlp-proto',
        '@opentelemetry/instrumentation-pg',
        '@opentelemetry/instrumentation-ioredis',
        '@opentelemetry/instrumentation-undici',
        '@opentelemetry/instrumentation-http',
        '@opentelemetry/instrumentation-aws-sdk',
        '@opentelemetry/instrumentation-runtime-node',
    ],
    productionBrowserSourceMaps: process.env.NEXT_PUBLIC_DEBUG === '1',
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'beta.xn--kchentakt-q9a.de',
            },
            {
                protocol: 'https',
                hostname: 'cdn.isntfunny.de',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
            },
        ],
        localPatterns: [
            {
                pathname: '/api/thumbnail**',
            },
            {
                pathname: '/kitchenpace.png',
            },
            {
                pathname: '/placeholder.jpg',
            },
        ],
    },
    turbopack: {
        resolveAlias: {
            'styled-system': './styled-system',
            'styled-system/css': './styled-system/css',
            'styled-system/patterns': './styled-system/patterns',
            'styled-system/tokens': './styled-system/tokens',
            'styled-system/jsx': './styled-system/jsx',
        },
    },
    webpack: (config) => {
        config.resolve.alias = {
            ...(config.resolve.alias ?? {}),
            'styled-system': resolveAliasPath('./styled-system'),
            'styled-system/css': resolveAliasPath('./styled-system/css'),
            'styled-system/patterns': resolveAliasPath('./styled-system/patterns'),
            'styled-system/tokens': resolveAliasPath('./styled-system/tokens'),
            'styled-system/jsx': resolveAliasPath('./styled-system/jsx'),
        };

        return config;
    },
};

export default nextConfig;
