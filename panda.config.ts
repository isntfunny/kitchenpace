import { defineConfig } from '@pandacss/dev';
import { amber, amberDark, orange, orangeDark, slate, slateDark } from '@radix-ui/colors';

const lightThemeColors = {
    brand: {
        primary: { value: orange.orange9 },
        'primary-dark': { value: orange.orange11 },
        secondary: { value: slate.slate12 },
        accent: { value: amber.amber8 },
        light: { value: slate.slate1 },
        text: { value: slate.slate12 },
        'text-muted': { value: slate.slate10 },
    },
    primary: { value: orange.orange9 },
    'primary-dark': { value: orange.orange11 },
    accent: { value: amber.amber8 },
    accentHover: { value: amber.amber9 },
    accentSoft: { value: amber.amber4 },
    surface: { value: slate.slate1 },
    surfaceElevated: { value: slate.slate2 },
    background: { value: slate.slate2 },
    text: { value: slate.slate12 },
    'text-muted': { value: slate.slate10 },
    border: { value: slate.slate6 },
    'border-muted': { value: slate.slate4 },
};

const darkThemeColors = {
    brand: {
        primary: { value: orangeDark.orange8 },
        'primary-dark': { value: orangeDark.orange10 },
        secondary: { value: slateDark.slate12 },
        accent: { value: amberDark.amber9 },
        light: { value: slateDark.slate1 },
        text: { value: slateDark.slate12 },
        'text-muted': { value: slateDark.slate11 },
    },
    primary: { value: orangeDark.orange8 },
    'primary-dark': { value: orangeDark.orange10 },
    accent: { value: amberDark.amber9 },
    accentHover: { value: amberDark.amber10 },
    accentSoft: { value: amberDark.amber6 },
    surface: { value: slateDark.slate1 },
    surfaceElevated: { value: slateDark.slate2 },
    background: { value: slateDark.slate1 },
    text: { value: slateDark.slate12 },
    'text-muted': { value: slateDark.slate11 },
    border: { value: slateDark.slate7 },
    'border-muted': { value: slateDark.slate9 },
};

export default defineConfig({
    preflight: true,
    include: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
    exclude: [],
    theme: {
        extend: {
            tokens: {
                colors: {
                    ...lightThemeColors,
                },
            },
            semanticTokens: {
                colors: {
                    surface: {
                        DEFAULT: { value: '{colors.surface}' },
                        elevated: { value: '{colors.surfaceElevated}' },
                    },
                    background: { DEFAULT: { value: '{colors.background}' } },
                    foreground: { DEFAULT: { value: '{colors.text}' } },
                    'foreground-muted': { DEFAULT: { value: '{colors.text-muted}' } },
                    border: { DEFAULT: { value: '{colors.border}' } },
                    'border-muted': { DEFAULT: { value: '{colors.border-muted}' } },
                    accent: { DEFAULT: { value: '{colors.accent}' } },
                    'accent-hover': { DEFAULT: { value: '{colors.accentHover}' } },
                    'accent-soft': { DEFAULT: { value: '{colors.accentSoft}' } },
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
    themes: {
        dark: {
            extend: {
                tokens: {
                    colors: {
                        ...darkThemeColors,
                    },
                },
            },
        },
    },
    jsxFramework: 'react',
    outdir: 'styled-system',
});
