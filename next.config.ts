import type { NextConfig } from 'next';
const resolveAliasPath = (subpath: string) => new URL(subpath, import.meta.url).pathname;

const nextConfig: NextConfig = {
    output: 'standalone',
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
