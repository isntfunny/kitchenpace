'use client';

import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

interface SubmissionControlsProps {
    saving: boolean;
    saveStatus: 'DRAFT' | 'PUBLISHED';
    onStatusChange: (status: 'DRAFT' | 'PUBLISHED') => void;
}

const baseButtonClass = css({
    flex: '1',
    textAlign: 'center',
    borderRadius: 'full',
    px: '6',
    py: '3',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    _hover: { transform: 'translateY(-1px)' },
    _disabled: { opacity: 0.7, cursor: 'not-allowed', _hover: { transform: 'none' } },
});

export function SubmissionControls({
    saving,
    saveStatus,
    onStatusChange,
}: SubmissionControlsProps) {
    const isActive = (status: 'DRAFT' | 'PUBLISHED') => saveStatus === status;
    const accentColor = (status: 'DRAFT' | 'PUBLISHED') =>
        status === 'DRAFT' ? PALETTE.orange : PALETTE.emerald;

    const buttonStyle = (status: 'DRAFT' | 'PUBLISHED'): React.CSSProperties => ({
        backgroundColor: isActive(status) ? accentColor(status) : 'transparent',
        color: isActive(status) ? 'white' : accentColor(status),
        border: `2px solid ${accentColor(status)}`,
    });

    return (
        <div className={css({ display: 'flex', gap: '3' })}>
            <button
                type="submit"
                disabled={saving}
                onClick={() => onStatusChange('DRAFT')}
                className={baseButtonClass}
                style={buttonStyle('DRAFT')}
                data-tutorial="draft-save"
            >
                {saving ? 'Wird gespeichert...' : 'Als Entwurf speichern'}
            </button>
            <button
                type="submit"
                disabled={saving}
                onClick={() => onStatusChange('PUBLISHED')}
                className={baseButtonClass}
                style={buttonStyle('PUBLISHED')}
            >
                {saving ? 'Wird gespeichert...' : 'Veröffentlichen'}
            </button>
        </div>
    );
}
