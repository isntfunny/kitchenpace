'use client';

import { Flag } from 'lucide-react';

import { css } from 'styled-system/css';

import { ReportModal } from './ReportModal';

interface ReportButtonProps {
    contentType: 'recipe' | 'comment' | 'user' | 'cook_image';
    contentId: string;
    variant?: 'icon' | 'icon-overlay' | 'text';
}

export function ReportButton({ contentType, contentId, variant = 'text' }: ReportButtonProps) {
    return (
        <ReportModal
            contentType={contentType}
            contentId={contentId}
            trigger={
                variant === 'icon-overlay' ? (
                    <button
                        type="button"
                        className={css({
                            p: '2',
                            borderRadius: 'lg',
                            bg: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.75)',
                            backdropFilter: 'blur(8px)',
                            transition: 'all 150ms',
                            _hover: {
                                color: 'white',
                                bg: 'rgba(239,68,68,0.3)',
                                borderColor: 'rgba(239,68,68,0.5)',
                            },
                        })}
                        title="Inhalt melden"
                    >
                        <Flag size={15} />
                    </button>
                ) : variant === 'icon' ? (
                    <button
                        type="button"
                        className={css({
                            p: '1.5',
                            borderRadius: 'lg',
                            bg: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'text.muted',
                            _hover: {
                                color: 'red.600',
                                bg: { base: 'rgba(239,68,68,0.08)', _dark: 'rgba(239,68,68,0.13)' },
                            },
                        })}
                        title="Inhalt melden"
                    >
                        <Flag size={14} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2',
                            px: '4',
                            py: '2',
                            borderRadius: 'md',
                            bg: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'text',
                            fontSize: 'md',
                            fontWeight: '500',
                            fontFamily: 'body',
                            transition: 'all 150ms ease-in-out',
                            _hover: {
                                color: 'red.600',
                                bg: { base: 'rgba(239,68,68,0.05)', _dark: 'rgba(239,68,68,0.1)' },
                            },
                        })}
                    >
                        <Flag size={16} />
                        Melden
                    </button>
                )
            }
        />
    );
}
