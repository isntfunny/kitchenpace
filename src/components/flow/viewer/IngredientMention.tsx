'use client';

import { X } from 'lucide-react';
import { Popover } from 'radix-ui';

import { css } from 'styled-system/css';

import type { IngredientRef } from '../editor/editorTypes';

export function IngredientMention({
    name,
    override,
    ingredient,
}: {
    name: string;
    override?: string;
    ingredient?: IngredientRef;
}) {
    const recipeAmount = ingredient?.amount?.trim()
        ? [ingredient.amount, ingredient.unit].filter(Boolean).join(' ')
        : '';
    const amount = override || recipeAmount;
    const label = (
        <>
            {name}
            {amount ? ` (${amount})` : ''}
        </>
    );
    const mentionClass = css({
        bg: 'mention.bg',
        color: 'mention.text',
        borderRadius: '4px',
        px: '0.75',
        fontWeight: 600,
    });
    if (!ingredient) return <span className={mentionClass}>{label}</span>;

    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    className={mentionClass}
                    aria-label={`${name}${amount ? `, ${amount}` : ''}: Zutatendetails anzeigen`}
                    style={{
                        font: 'inherit',
                        fontWeight: 600,
                        lineHeight: 'inherit',
                        border: 0,
                        cursor: 'pointer',
                        display: 'inline',
                        textAlign: 'inherit',
                    }}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    {label}
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    aria-label={`Details zu ${name}`}
                    sideOffset={8}
                    collisionPadding={12}
                    onClick={(event) => event.stopPropagation()}
                    className={css({
                        zIndex: 10000,
                        maxWidth: 'min(320px, calc(100vw - 24px))',
                        p: '4',
                        borderRadius: 'lg',
                        bg: 'surface.elevated',
                        color: 'text',
                        border: '1px solid',
                        borderColor: 'border',
                        boxShadow: 'lg',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '4',
                            mb: '2',
                        })}
                    >
                        <strong>{ingredient.name}</strong>
                        <Popover.Close
                            aria-label="Zutatendetails schließen"
                            className={css({
                                bg: 'transparent',
                                color: 'text.muted',
                                border: 0,
                                cursor: 'pointer',
                                p: '1',
                            })}
                        >
                            <X size={18} />
                        </Popover.Close>
                    </div>
                    <div>{amount || 'Menge nach Bedarf'}</div>
                    {override && recipeAmount && override !== recipeAmount && (
                        <div className={css({ color: 'text.muted', fontSize: 'sm', mt: '1' })}>
                            Im Rezept: {recipeAmount}
                        </div>
                    )}
                    {ingredient.notes && (
                        <div className={css({ color: 'text.muted', fontSize: 'sm', mt: '2' })}>
                            {ingredient.notes}
                        </div>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
