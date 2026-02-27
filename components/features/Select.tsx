'use client';

import { Select as SelectPrimitive } from 'radix-ui';
import * as React from 'react';

import { css } from 'styled-system/css';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
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
            bg: 'white',
            border: '1px solid',
            borderColor: 'rgba(0,0,0,0.1)',
            borderRadius: 'md',
            cursor: 'pointer',
            _hover: {
                borderColor: 'primary',
            },
            _focus: {
                outline: 'none',
                borderColor: 'primary',
                boxShadow: '0 0 0 2px rgba(224, 123, 83, 0.2)',
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
                bg: 'white',
                borderRadius: 'md',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.1)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
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
            cursor: 'pointer',
            borderRadius: 'sm',
            _hover: {
                bg: 'light',
            },
            _focus: {
                bg: 'light',
                outline: 'none',
            },
        })}
        {...props}
    >
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
