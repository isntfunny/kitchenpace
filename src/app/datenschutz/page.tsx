import { Metadata } from 'next';

import { PageShell } from '@app/components/layouts/PageShell';

import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Datenschutzerklärung — KochTakt',
    description:
        'Datenschutzerklärung von KochTakt — Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.',
};

export default function DatenschutzPage() {
    return (
        <PageShell>
            <div
                className={css({
                    maxW: '800px',
                    mx: 'auto',
                    py: { base: '6', md: '10' },
                    px: { base: '0', md: '4' },
                })}
            >
                <div
                    role="status"
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2',
                        flexWrap: 'wrap',
                        p: { base: '4', md: '5' },
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'palette.orange',
                        background: 'surface-raised',
                        color: 'text',
                        fontSize: { base: 'md', md: 'lg' },
                        fontWeight: '700',
                        textAlign: 'center',
                        lineHeight: '1.6',
                    })}
                >
                    <svg
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 9v4" />
                        <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.875h16.214a1.914 1.914 0 0 0 1.636 -2.875l-8.106 -13.534a1.914 1.914 0 0 0 -3.274 0z" />
                        <path d="M12 16h.01" />
                    </svg>
                    <span>Kommt bald - Softlaunch, kein finanzielles Interesse</span>
                    <svg
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 9v4" />
                        <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.875h16.214a1.914 1.914 0 0 0 1.636 -2.875l-8.106 -13.534a1.914 1.914 0 0 0 -3.274 0z" />
                        <path d="M12 16h.01" />
                    </svg>
                </div>

                {/*
                    Softlaunch: Die bisherige Datenschutzerklaerung mit Platzhaltern und internen
                    Techniknamen ist bewusst ausgeblendet, bis die finale Fassung fuer den privaten
                    Release vorliegt.
                */}
            </div>
        </PageShell>
    );
}
