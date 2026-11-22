'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import {
    applyPlanTemplate,
    deletePlanTemplate,
    getPlanTemplates,
    previewPlanTemplate,
    savePlanTemplate,
} from '@app/app/plan/edit-actions';
import { Button } from '@app/components/atoms/Button';
import { fieldLabel, input } from '@app/components/atoms/recipes';

import { css } from 'styled-system/css';

import { CopyPanel, muted, resultMessage, slotLabelFor, usePreview } from './CopyPanel';
import type { PlanWeekData } from './types';
import { usePlanAction } from './usePlanAction';

// Week templates of the "Woche" menu (KUC-101): save the week, apply a saved one.

const column = css({ display: 'flex', flexDirection: 'column', gap: '4' });
const field = css({ display: 'flex', flexDirection: 'column', gap: '1.5' });
const errorText = css({ color: 'status.error', fontSize: 'sm' });
const list = css({ display: 'flex', flexDirection: 'column', gap: '2' });
const row = css({ display: 'flex', gap: '2' });
const cardBase = {
    flex: 1,
    minW: 0,
    textAlign: 'left',
    p: '3',
    borderRadius: 'lg',
    border: '1px solid',
    color: 'text',
    cursor: 'pointer',
    _hover: { borderColor: 'primary' },
    _focusVisible: { outline: '2px solid', outlineColor: 'primary' },
} as const;
const card = css(cardBase, { borderColor: 'border', bg: 'surface' });
const chosenCard = css(cardBase, { borderColor: 'primary', bg: 'accent.soft' });
const cardName = css({ display: 'block', fontWeight: '600' });
const cardMeta = css({ display: 'block', fontSize: 'xs', color: 'foreground.muted' });

export function SaveTemplate({ data, onDone }: { data: PlanWeekData; onDone: () => void }) {
    const { call, busy, showToast } = usePlanAction();
    const id = useId();
    const [name, setName] = useState(`Woche KW ${data.weekNumber}`);
    const count = data.dishes.filter((dish) => !dish.isLeftover).length;
    if (count === 0)
        return <p className={muted}>Plane zuerst ein paar Gerichte in dieser Woche.</p>;
    return (
        <form
            className={column}
            onSubmit={async (event) => {
                event.preventDefault();
                const result = await call(() =>
                    savePlanTemplate({ startDate: data.startDate, name }),
                );
                if (!result) return;
                onDone();
                showToast({
                    type: 'success',
                    title: 'Vorlage gespeichert',
                    message: `„${result.name}“ mit ${result.count} Gerichten`,
                });
            }}
        >
            <div className={field}>
                <label htmlFor={id} className={fieldLabel}>
                    Name
                </label>
                <input
                    id={id}
                    className={input}
                    value={name}
                    maxLength={80}
                    required
                    onChange={(event) => setName(event.target.value)}
                />
            </div>
            <p className={muted}>
                {count} {count === 1 ? 'Gericht' : 'Gerichte'} mit Tag, Mahlzeit, Uhrzeit und
                Portionen. Reste werden über die doppelte Portion mitgespeichert.
            </p>
            <Button variant="primary" type="submit" disabled={busy || !name.trim()}>
                Speichern
            </Button>
        </form>
    );
}

interface TemplateRow {
    id: string;
    name: string;
    count: number;
    titles: string[];
}

export function ApplyTemplate({ data, onDone }: { data: PlanWeekData; onDone: () => void }) {
    const { call, busy, showToast } = usePlanAction();
    const [templates, setTemplates] = useState<TemplateRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const slotLabel = slotLabelFor(data);

    useEffect(() => {
        let active = true;
        getPlanTemplates().then(
            (result) => {
                if (!active) return;
                if (result.ok) setTemplates(result.data);
                else setError(result.error);
            },
            () => active && setError('Keine Verbindung.'),
        );
        return () => {
            active = false;
        };
    }, []);

    const state = usePreview(selected, () =>
        previewPlanTemplate({ templateId: selected, startDate: data.startDate }),
    );

    if (error) return <p className={errorText}>{error}</p>;
    if (!templates) return <p className={muted}>Einen Moment …</p>;
    if (templates.length === 0)
        return (
            <p className={muted}>
                Noch keine Vorlagen. Speichere eine gelungene Woche über „Woche → Als Vorlage
                speichern“.
            </p>
        );

    return (
        <div className={column}>
            <ul className={list}>
                {templates.map((template) => (
                    <li key={template.id} className={row}>
                        <TemplateCard
                            template={template}
                            selected={selected === template.id}
                            onSelect={() => setSelected(template.id)}
                        />
                        <Button
                            variant="ghost"
                            type="button"
                            aria-label={`Vorlage „${template.name}“ löschen`}
                            disabled={busy}
                            onClick={async () => {
                                if (!(await call(() => deletePlanTemplate(template.id)))) return;
                                setTemplates(
                                    (rows) => rows?.filter((r) => r.id !== template.id) ?? null,
                                );
                                if (selected === template.id) setSelected(null);
                            }}
                        >
                            <Trash2 size={16} aria-hidden />
                        </Button>
                    </li>
                ))}
            </ul>
            {selected && (
                <CopyPanel
                    key={selected}
                    preview={state?.preview ?? null}
                    loading={!state}
                    error={state?.error}
                    empty="Keines der Rezepte dieser Vorlage ist noch verfügbar."
                    slotLabel={slotLabel}
                    confirmLabel="Anwenden"
                    busy={busy}
                    onConfirm={async (mode) => {
                        const result = await call(() =>
                            applyPlanTemplate({
                                templateId: selected,
                                startDate: data.startDate,
                                mode,
                            }),
                        );
                        if (!result) return;
                        onDone();
                        showToast({
                            type: 'success',
                            title: 'Vorlage angewendet',
                            message: resultMessage(result),
                        });
                    }}
                />
            )}
        </div>
    );
}

function TemplateCard({
    template,
    selected,
    onSelect,
}: {
    template: TemplateRow;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onSelect}
            className={selected ? chosenCard : card}
        >
            <span className={cardName}>{template.name}</span>
            <span className={cardMeta}>
                {template.count} Gerichte · {template.titles.join(', ')}
                {template.count > template.titles.length ? ' …' : ''}
            </span>
        </button>
    );
}
