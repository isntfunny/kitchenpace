import { defineConfig } from '@pandacss/dev';

export default defineConfig({
    preflight: true,
    include: ['./src/app/**/*.{js,jsx,ts,tsx}', './src/components/**/*.{js,jsx,ts,tsx}'],
    exclude: [],

    conditions: {
        extend: {
            dark: '[data-theme="dark"] &',
        },
    },

    globalCss: {
        'html, :host': {
            backgroundColor: 'background',
            color: 'foreground',
            minHeight: '100vh',
        },
        body: {
            backgroundColor: 'background',
            color: 'foreground',
            minHeight: '100vh',
            backgroundImage: 'linear-gradient(180deg, #fff8f4 0%, #fef0e8 40%, #fceadd 100%)',
            backgroundAttachment: 'fixed',
            _dark: {
                backgroundImage: 'linear-gradient(180deg, #1a1715 0%, #231e1a 40%, #1c1815 100%)',
                backgroundAttachment: 'fixed',
            },
        },
    },

    theme: {
        extend: {
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
                    to: { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                slideDown: {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                slideUpCollapse: {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
            },

            tokens: {
                colors: {
                    brand: {
                        primary: { value: '#e07b53' },
                        'primary-dark': { value: '#f76b15' },
                        secondary: { value: '#2d3436' },
                        accent: { value: '#f8b500' },
                        light: { value: '#faf9f7' },
                        dark: { value: '#0f1114' },
                        text: { value: '#2d3436' },
                        'text-muted': { value: '#636e72' },
                        'text-dark': { value: '#f5f5f5' },
                        'text-muted-dark': { value: '#a0a0a0' },
                        'page-light': { value: '#fffcf9' },
                        'page-dark': { value: '#121418' },
                        'card-light': { value: '#ffffff' },
                        'card-dark': { value: '#1a1d21' },
                        'admin-header': { value: '#ffe8d6' },
                        'header-bg': { value: '#fceadd' },
                    },
                },

                fonts: {
                    heading: { value: 'var(--font-playfair), Georgia, serif' },
                    body: { value: 'var(--font-inter), system-ui, sans-serif' },
                },
            },

            semanticTokens: {
                colors: {
                    background: {
                        value: {
                            base: '{colors.brand.light}',
                            _dark: '{colors.brand.dark}',
                        },
                    },
                    surface: {
                        value: {
                            base: '{colors.brand.card-light}',
                            _dark: '{colors.brand.card-dark}',
                        },
                    },
                    foreground: {
                        value: {
                            base: '{colors.brand.text}',
                            _dark: '{colors.brand.text-dark}',
                        },
                    },
                    'foreground.muted': {
                        value: {
                            base: '{colors.brand.text-muted}',
                            _dark: '{colors.brand.text-muted-dark}',
                        },
                    },
                    border: {
                        value: {
                            base: 'rgba(0,0,0,0.08)',
                            _dark: '#2d333b',
                        },
                    },
                    accent: {
                        value: '{colors.brand.accent}',
                    },
                    'accent.hover': {
                        value: '{colors.brand.primary}',
                    },
                    'accent.soft': {
                        value: {
                            base: 'rgba(224,123,83,0.08)',
                            _dark: 'rgba(224,123,83,0.15)',
                        },
                    },
                    accentSoft: {
                        value: {
                            base: 'rgba(224,123,83,0.08)',
                            _dark: 'rgba(224,123,83,0.15)',
                        },
                    },
                    primary: {
                        value: {
                            base: '{colors.brand.primary}',
                            _dark: '{colors.brand.primary-dark}',
                        },
                    },
                    'surface.elevated': {
                        value: {
                            base: '{colors.brand.card-light}',
                            _dark: '{colors.brand.card-dark}',
                        },
                    },
                    'header.background': {
                        value: {
                            base: '{colors.brand.header-bg}',
                            _dark: '{colors.brand.card-dark}',
                        },
                    },
                    'admin.surface': {
                        value: {
                            base: '{colors.brand.admin-header}',
                            _dark: '{colors.brand.card-dark}',
                        },
                    },
                    'surface.card': {
                        value: {
                            base: '{colors.brand.card-light}',
                            _dark: '{colors.brand.card-dark}',
                        },
                    },
                    'border.primary': {
                        value: {
                            base: '{colors.brand.primary}',
                            _dark: '{colors.brand.primary-dark}',
                        },
                    },
                    'border.secondary': {
                        value: {
                            base: '{colors.brand.secondary}',
                            _dark: '{colors.brand.secondary}',
                        },
                    },
                    'border.muted': {
                        value: {
                            base: 'rgba(0,0,0,0.04)',
                            _dark: '#22262c',
                        },
                    },
                    'text.muted': {
                        value: {
                            base: '{colors.brand.text-muted}',
                            _dark: '{colors.brand.text-muted-dark}',
                        },
                    },
                    text: {
                        value: {
                            base: '{colors.brand.text}',
                            _dark: '{colors.brand.text-dark}',
                        },
                    },
                    'text.primary': {
                        value: {
                            base: '{colors.brand.text}',
                            _dark: '{colors.brand.text-dark}',
                        },
                    },
                    'text.secondary': {
                        value: {
                            base: '{colors.brand.text-muted}',
                            _dark: '{colors.brand.text-muted-dark}',
                        },
                    },
                    'text.accent': {
                        value: {
                            base: '{colors.brand.accent}',
                            _dark: '{colors.brand.accent}',
                        },
                    },
                    'text.primary-hover': {
                        value: {
                            base: '{colors.brand.primary}',
                            _dark: '{colors.brand.primary-dark}',
                        },
                    },
                    'button.primary': {
                        value: {
                            base: '{colors.brand.primary}',
                            _dark: '{colors.brand.primary-dark}',
                        },
                    },
                    'button.primary-hover': {
                        value: {
                            base: '{colors.brand.primary-dark}',
                            _dark: '{colors.brand.primary}',
                        },
                    },
                    'button.secondary': {
                        value: {
                            base: '{colors.brand.secondary}',
                            _dark: '{colors.brand.secondary}',
                        },
                    },
                    'button.secondary-hover': {
                        value: {
                            base: 'rgba(0,0,0,0.08)',
                            _dark: 'rgba(255,255,255,0.08)',
                        },
                    },
                    'shadow.small': {
                        value: '0 2px 8px rgba(0,0,0,0.06)',
                    },
                    'shadow.medium': {
                        value: '0 4px 24px rgba(0,0,0,0.08)',
                    },
                    'shadow.large': {
                        value: '0 40px 120px rgba(0,0,0,0.15)',
                    },
                },
            },

            breakpoints: {
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
                '2xl': '1536px',
            },
        },
    },
});
