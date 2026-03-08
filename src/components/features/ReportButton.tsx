'use client';

import { Flag } from 'lucide-react';

import { css } from 'styled-system/css';

import { ReportModal } from './ReportModal';

interface ReportButtonProps {
    contentType: 'recipe' | 'comment' | 'user' | 'cook_image';
    contentId: string;
    variant?: 'icon' | 'text';
}

export function ReportButton({ contentType, contentId, variant = 'text' }: ReportButtonProps) {
    return (
        <ReportModal
            contentType={contentType}
            contentId={contentId}
            trigger={
                variant === 'icon' ? (
                    <button
                        type="button"
                        className={css({
                            p: '1.5',
                            borderRadius: 'lg',
                            bg: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'text.muted',
                            _hover: { color: '#dc2626', bg: 'rgba(239,68,68,0.08)' },
                        })}
                        title="Inhalt melden"
                    >
                        <Flag size={14} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5',
                            px: '3',
                            py: '1.5',
                            borderRadius: 'lg',
                            bg: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'text.muted',
                            fontSize: 'xs',
                            fontWeight: '500',
                            _hover: { color: '#dc2626', bg: 'rgba(239,68,68,0.05)' },
                        })}
                    >
                        <Flag size={12} />
                        Melden
                    </button>
                )
            }
        />
    );
}
