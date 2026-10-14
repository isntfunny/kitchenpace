'use client';

import { Check, Copy, Terminal } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@app/components/atoms/Button';

import { css } from 'styled-system/css';

const command =
    'curl "$KUECHENTAKT_URL/api/v1/recipes?limit=20" \\\n  -H "x-api-key: $KUECHENTAKT_API_KEY"';

export function CodeExample() {
    const [message, setMessage] = useState('');
    async function copy() {
        try {
            await navigator.clipboard.writeText(command);
            setMessage('Kopiert');
        } catch {
            setMessage('Bitte markiere und kopiere den Code.');
        }
    }
    return (
        <div
            className={css({
                minW: '0',
                bg: 'surface',
                border: '1px solid',
                borderColor: 'border',
                borderRadius: 'xl',
                overflow: 'hidden',
                alignSelf: 'start',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '3',
                    px: '4',
                    py: '2',
                    borderBottomWidth: '1px',
                    borderBottomStyle: 'solid',
                    borderColor: 'border',
                    fontFamily: 'body',
                    fontSize: 'sm',
                    color: 'text-muted',
                })}
            >
                <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '2' })}>
                    <Terminal size={16} aria-hidden="true" /> Eigene Rezepte abrufen
                </span>
                <Button variant="ghost" size="sm" onClick={copy} aria-label="Beispiel kopieren">
                    {message === 'Kopiert' ? <Check size={16} /> : <Copy size={16} />}
                    <span>Kopieren</span>
                </Button>
            </div>
            <pre
                className={css({
                    m: '0',
                    p: { base: '4', md: '5' },
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: 'sm',
                    lineHeight: '1.9',
                    color: 'text',
                })}
                tabIndex={0}
                aria-label="cURL-Beispiel"
            >
                <code>{command}</code>
            </pre>
            <div
                className={css({
                    px: '4',
                    pb: '4',
                    fontFamily: 'body',
                    fontSize: 'xs',
                    lineHeight: 'relaxed',
                    color: 'text-muted',
                })}
            >
                Setze KUECHENTAKT_URL auf die Adresse dieser Website und KUECHENTAKT_API_KEY auf
                deinen Schlüssel.
                <span
                    role="status"
                    className={css({ display: 'block', color: 'primary', minH: '4', mt: '1' })}
                >
                    {message}
                </span>
            </div>
        </div>
    );
}
