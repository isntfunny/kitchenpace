'use client';

import { css } from 'styled-system/css';

interface SubmissionControlsProps {
    saving: boolean;
    saveStatus: 'DRAFT' | 'PUBLISHED';
    onStatusChange: (status: 'DRAFT' | 'PUBLISHED') => void;
}

export function SubmissionControls({ saving, saveStatus, onStatusChange }: SubmissionControlsProps) {
    const buttonClass = (status: 'DRAFT' | 'PUBLISHED') =>
        css({
            alignSelf: 'flex-start',
            borderRadius: 'full',
            px: '6',
            py: '3',
            background:
                saveStatus === status
                    ? status === 'DRAFT'
                        ? 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)'
                        : 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)'
                    : 'white',
            color:
                saveStatus === status
                    ? 'white'
                    : status === 'DRAFT'
                        ? '#e07b53'
                        : '#00b894',
            fontWeight: '600',
            border: `2px solid ${
                status === 'DRAFT' ? '#e07b53' : '#00b894'
            }`,
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
