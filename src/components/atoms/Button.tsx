'use client';

import * as React from 'react';

import { cx } from 'styled-system/css';

import { button, iconButton } from './recipes';

type ButtonVariants = NonNullable<Parameters<typeof button>[0]>;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariants['variant'];
    size?: ButtonVariants['size'];
    /** Full width */
    block?: boolean;
    children: React.ReactNode;
}

/** Text button of the design system (recipe `button`). */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant, size, block, className, children, ...props },
    ref,
) {
    return (
        <button ref={ref} className={cx(button({ variant, size, block }), className)} {...props}>
            {children}
        </button>
    );
});

type IconButtonVariants = NonNullable<Parameters<typeof iconButton>[0]>;

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Required: the button has no visible text */
    'aria-label': string;
    variant?: IconButtonVariants['variant'];
    size?: IconButtonVariants['size'];
    children: React.ReactNode;
}

/** Round button with only an icon (recipe `iconButton`). */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { variant, size, className, type = 'button', children, ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            className={cx(iconButton({ variant, size }), className)}
            {...props}
        >
            {children}
        </button>
    );
});
