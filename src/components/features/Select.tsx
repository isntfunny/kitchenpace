'use client';

import { Select as SelectPrimitive } from 'radix-ui';
import * as React from 'react';

import { css } from 'styled-system/css';

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ children, ...props }, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={css({
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2',
            px: '4',
            py: '2',
            fontFamily: 'body',
            fontSize: 'sm',
            bg: 'surface',
            color: 'text',
            border: '1px solid',
            borderColor: { base: 'rgba(0,0,0,0.1)', _dark: 'rgba(255,255,255,0.12)' },
            borderRadius: 'md',
            cursor: 'pointer',
            _hover: {
                borderColor: 'primary',
            },
            _focus: {
                outline: 'none',
                borderColor: 'primary',
                boxShadow: {
                    base: '0 0 0 2px rgba(224, 123, 83, 0.2)',
                    _dark: '0 0 0 2px rgba(224, 123, 83, 0.15)',
                },
            },
        })}
        {...props}
    >
        {children}
        <SelectPrimitive.Icon asChild>
            <span>▼</span>
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ children, ...props }, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content
            ref={ref}
            className={css({
                zIndex: 50,
                minW: '200px',
                bg: 'surface',
                color: 'text',
                borderRadius: 'md',
                border: '1px solid',
                borderColor: { base: 'rgba(0,0,0,0.1)', _dark: 'rgba(255,255,255,0.12)' },
                boxShadow: {
                    base: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    _dark: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
                },
                overflow: 'hidden',
            })}
            {...props}
        >
            <SelectPrimitive.Viewport
                className={css({
                    p: '1',
                })}
            >
                {children}
            </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ children, ...props }, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={css({
            display: 'flex',
            alignItems: 'center',
            px: '3',
            py: '2',
            fontFamily: 'body',
            fontSize: 'sm',
            color: 'text',
            cursor: 'pointer',
            borderRadius: 'sm',
            _hover: {
                bg: 'surface.muted',
            },
            _focus: {
                bg: 'surface.muted',
                outline: 'none',
            },
        })}
        {...props}
    >
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
