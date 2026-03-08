'use client';

import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';

interface SubmissionControlsProps {
    saving: boolean;
    saveStatus: 'DRAFT' | 'PUBLISHED';
    onStatusChange: (status: 'DRAFT' | 'PUBLISHED') => void;
}

export function SubmissionControls({
    saving,
    saveStatus,
    onStatusChange,
}: SubmissionControlsProps) {
    const buttonClass = (status: 'DRAFT' | 'PUBLISHED') =>
        css({
            alignSelf: 'flex-start',
            borderRadius: 'full',
            px: '6',
            py: '3',
            background:
                saveStatus === status
                    ? status === 'DRAFT'
                        ? `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`
                        : `linear-gradient(135deg, ${PALETTE.emerald} 0%, ${PALETTE.blue} 100%)`
                    : 'white',
            color: saveStatus === status ? 'white' : status === 'DRAFT' ? PALETTE.orange : PALETTE.emerald,
            fontWeight: '600',
            border: `2px solid ${status === 'DRAFT' ? PALETTE.orange : PALETTE.emerald}`,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'all 150ms ease',
            _hover: { transform: saving ? 'none' : 'translateY(-1px)' },
        });

    return (
        <div className={css({ display: 'flex', gap: '3', flexWrap: 'wrap' })}>
            <button
                type="submit"
                disabled={saving}
                onClick={() => onStatusChange('DRAFT')}
                className={buttonClass('DRAFT')}
            >
                {saving ? 'Wird gespeichert...' : 'Als Entwurf speichern'}
            </button>
            <button
                type="submit"
                disabled={saving}
                onClick={() => onStatusChange('PUBLISHED')}
                className={buttonClass('PUBLISHED')}
            >
                {saving ? 'Wird gespeichert...' : 'Veröffentlichen'}
            </button>
        </div>
    );
}
