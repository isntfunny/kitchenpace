'use client';

import { Check, Copy, Link2Off, RefreshCw, Share2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import {
    getPlanShare,
    revokePlanShare,
    sharePlanWeek,
    type PlanShareState,
} from '@app/app/plan/share-actions';

import { css, cx } from 'styled-system/css';

import { muted } from './CopyPanel';
import { Switch } from './FormParts';
import { actionButton, fieldLabel, input } from './styles';
import type { PlanWeekData } from './types';
import { usePlanAction } from './usePlanAction';

// Share one week by a read-only link (KUC-110).

const shareUrl = (token: string) => `${window.location.origin}/plan/shared/${token}`;

const MODERATION_HINTS: Record<string, string> = {
    PENDING: 'Eigene Mahlzeitennamen und Notizen werden noch geprüft und bis dahin ausgeblendet.',
    REJECTED: 'Eigene Mahlzeitennamen und Notizen werden nicht angezeigt.',
};

export function ShareWeek({ data }: { data: PlanWeekData }) {
    const { call, busy, showToast } = usePlanAction();
    const [state, setState] = useState<PlanShareState | null | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [includeNotes, setIncludeNotes] = useState(false);
    const [copied, setCopied] = useState(false);
    const urlId = useId();

    useEffect(() => {
        let active = true;
        getPlanShare(data.startDate).then(
            (result) => {
                if (!active) return;
                if (!result.ok) return setError(result.error);
                setState(result.data);
                setIncludeNotes(result.data?.includeNotes ?? false);
            },
            () => active && setError('Keine Verbindung.'),
        );
        return () => {
            active = false;
        };
    }, [data.startDate]);

    const share = async (renew = false) => {
        const next = await call(() =>
            sharePlanWeek({ startDate: data.startDate, includeNotes, renew }),
        );
        if (!next) return;
        setState(next);
        setCopied(false);
        if (renew)
            showToast({
                type: 'success',
                title: 'Neuer Link',
                message: 'Der alte Link gilt nicht mehr.',
            });
    };

    const revoke = async () => {
        if (!(await call(() => revokePlanShare(data.startDate)))) return;
        setState(null);
        showToast({
            type: 'info',
            title: 'Teilen beendet',
            message: 'Der Link zeigt nichts mehr an.',
        });
    };

    const copy = async (token: string) => {
        try {
            await navigator.clipboard.writeText(shareUrl(token));
            setCopied(true);
        } catch {
            showToast({ type: 'error', title: 'Kopieren nicht möglich' });
        }
    };

    const systemShare = async (token: string) => {
        try {
            await navigator.share({
                title: `Wochenplan KW ${data.weekNumber}`,
                url: shareUrl(token),
            });
        } catch {
            // Cancelled by the user
        }
    };

    if (error) return <p className={css({ color: 'status.error', fontSize: 'sm' })}>{error}</p>;
    if (state === undefined) return <p className={muted}>Einen Moment …</p>;

    const notesSwitch = (
        <Switch
            checked={includeNotes}
            onChange={setIncludeNotes}
            label="Notizen mitteilen"
            description="Notizen und eigene Mahlzeitennamen werden vorher geprüft."
        />
    );

    if (!state)
        return (
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                <p className={css({ fontSize: 'sm' })}>
                    Wer den Link hat, sieht die Gerichte dieser Woche mit Mahlzeit, Uhrzeit und
                    Portionen – ohne Anmeldung. Vorrat, Einkaufsliste und Erinnerungen bleiben
                    privat. Nicht veröffentlichte Rezepte werden nicht gezeigt.
                </p>
                {notesSwitch}
                <button
                    type="button"
                    className={actionButton({ variant: 'primary' })}
                    onClick={() => share()}
                    disabled={busy}
                >
                    <Share2 size={16} aria-hidden /> Link erstellen
                </button>
            </div>
        );

    const hint = state.moderationStatus ? MODERATION_HINTS[state.moderationStatus] : undefined;
    const canSystemShare = typeof navigator !== 'undefined' && 'share' in navigator;

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
                <label htmlFor={urlId} className={fieldLabel}>
                    Link zu dieser Woche
                </label>
                <div className={css({ display: 'flex', gap: '2' })}>
                    <input
                        id={urlId}
                        readOnly
                        value={shareUrl(state.token)}
                        onFocus={(event) => event.target.select()}
                        className={cx(input, css({ flex: 1, minW: 0 }))}
                    />
                    <button
                        type="button"
                        className={actionButton()}
                        onClick={() => copy(state.token)}
                    >
                        {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                        {copied ? 'Kopiert' : 'Kopieren'}
                    </button>
                </div>
            </div>
            {canSystemShare && (
                <button
                    type="button"
                    className={actionButton()}
                    onClick={() => systemShare(state.token)}
                >
                    <Share2 size={16} aria-hidden /> Teilen …
                </button>
            )}
            {hint && (
                <p
                    role="status"
                    className={css({
                        fontSize: 'sm',
                        p: '2.5',
                        borderRadius: 'lg',
                        bg: 'palette.gold/14',
                    })}
                >
                    {hint}
                </p>
            )}
            {notesSwitch}
            <p className={muted}>
                Änderungen an Notizen oder Mahlzeitennamen erscheinen erst nach erneuter Prüfung.
            </p>
            <div className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}>
                <button
                    type="button"
                    className={actionButton()}
                    onClick={() => share()}
                    disabled={busy}
                >
                    <RefreshCw size={16} aria-hidden /> Erneut prüfen
                </button>
                <button
                    type="button"
                    className={actionButton()}
                    onClick={() => share(true)}
                    disabled={busy}
                >
                    Neuen Link erzeugen
                </button>
                <button
                    type="button"
                    className={actionButton({ variant: 'ghost' })}
                    onClick={revoke}
                    disabled={busy}
                >
                    <Link2Off size={16} aria-hidden className={css({ color: 'status.error' })} />{' '}
                    Teilen beenden
                </button>
            </div>
        </div>
    );
}
