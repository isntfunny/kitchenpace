import { defineConfig } from '@pandacss/dev';

export default defineConfig({
    preflight: true,
    include: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
    exclude: [],

    // Theme configuration for easy theme switching
    theme: {
        extend: {
            tokens: {
                // Colors - easily swappable for different themes
                colors: {
                    // Primary brand color (Orange-Brown)
                    primary: { value: '{colors.brand.primary}' },
                    'primary-dark': { value: '{colors.brand.primary-dark}' },

                    // Secondary color (Dark)
                    secondary: { value: '{colors.brand.secondary}' },

                    // Accent color (Gold/Yellow)
                    accent: { value: '{colors.brand.accent}' },

                    // Background colors
                    light: { value: '{colors.brand.light}' },
                    background: { value: '{colors.brand.light}' },

                    // Text colors
                    text: { value: '{colors.brand.text}' },
                    'text-muted': { value: '{colors.brand.text-muted}' },

                    // Brand color palette - can be swapped for different themes
                    brand: {
                        primary: { value: '#e07b53' },
                        'primary-dark': { value: '#c4623d' },
                        secondary: { value: '#2d3436' },
                        accent: { value: '#f8b500' },
                        light: { value: '#faf9f7' },
                        text: { value: '#2d3436' },
                        'text-muted': { value: '#636e72' },
                    },
                },

                // Typography
                fonts: {
                    heading: { value: 'var(--font-playfair), Georgia, serif' },
                    body: { value: 'var(--font-inter), system-ui, sans-serif' },
                },
            },

            // Semantic tokens for consistent theming
            semanticTokens: {
                colors: {
                    surface: {
                        DEFAULT: { value: '{colors.light}' },
                        elevated: { value: 'white' },
                    },
                    foreground: {
                        DEFAULT: { value: '{colors.text}' },
                        muted: { value: '{colors.text-muted}' },
                    },
                },
            },

            // Breakpoints for responsive design
            breakpoints: {
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
                '2xl': '1536px',
            },
        },
    },

    // Enable JSX for cleaner component syntax
    jsxFramework: 'react',

    // Output directory
    outdir: 'styled-system',
});
