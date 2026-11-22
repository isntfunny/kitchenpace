'use client';

import {
    CalendarRange,
    ChevronDown,
    Copy,
    LayoutTemplate,
    Save,
    Share2,
    Trash2,
} from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useEffect, useId, useState } from 'react';

import {
    applyPlanTemplate,
    copyPlanDays,
    deletePlanTemplate,
    getPlanTemplates,
    previewPlanCopy,
    previewPlanTemplate,
    savePlanTemplate,
} from '@app/app/plan/edit-actions';
import { button, fieldLabel, input } from '@app/components/atoms/recipes';
import { Sheet } from '@app/components/ui/Sheet';
import { weekdayLong } from '@app/lib/meal-plan/view';
import { addDays } from '@app/lib/meal-plan/week';


import { css, cx } from 'styled-system/css';

import { CopyPanel, DaySelect, muted, resultMessage, slotLabelFor, usePreview } from './CopyPanel';
import { ShareWeek } from './ShareWeek';
import type { PlanWeekData } from './types';
import { usePlanAction } from './usePlanAction';

// "Letzte Woche übernehmen", "Tag kopieren", week templates (KUC-101) and sharing (KUC-110).

type Tool = 'week' | 'day' | 'save' | 'apply' | 'share';

const menuItem = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '3',
    py: '2.5',
    borderRadius: 'md',
    fontSize: 'sm',
    cursor: 'pointer',
    outline: 'none',
    _highlighted: { bg: 'accent.soft', color: 'primary' },
});

export function WeekTools({ data }: { data: PlanWeekData }) {
    const [tool, setTool] = useState<Tool | null>(null);
    const items: Array<[Tool, string, typeof Copy]> = [
        ['week', 'Letzte Woche übernehmen', CalendarRange],
        ['day', 'Tag kopieren …', Copy],
        ['save', 'Als Vorlage speichern …', Save],
        ['apply', 'Vorlage anwenden …', LayoutTemplate],
        ['share', 'Teilen …', Share2],
    ];
    const titles: Record<Tool, string> = {
        week: 'Letzte Woche übernehmen',
        day: 'Tag kopieren',
        save: 'Woche als Vorlage speichern',
        apply: 'Vorlage anwenden',
        share: 'Woche teilen',
    };
    return (
        <>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger className={button()}>
                    Woche <ChevronDown size={16} aria-hidden />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        align="end"
                        sideOffset={6}
                        className={css({
                            zIndex: 60,
                            minW: '240px',
                            p: '1',
                            bg: 'surface',
                            color: 'text',
                            border: '1px solid',
                            borderColor: 'border',
                            borderRadius: 'xl',
                            boxShadow: 'shadow.medium',
                        })}
                    >
                        {items.map(([key, label, Icon]) => (
                            <DropdownMenu.Item
                                key={key}
                                className={menuItem}
                                onSelect={() => setTool(key)}
                            >
                                <Icon size={16} aria-hidden /> {label}
                            </DropdownMenu.Item>
                        ))}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <Sheet
                open={!!tool}
                onOpenChange={(open) => !open && setTool(null)}
                title={tool ? titles[tool] : ''}
                subtitle={`KW ${data.weekNumber} · ${data.rangeLabel}`}
            >
                {tool === 'week' && <CopyWeek data={data} onDone={() => setTool(null)} />}
                {tool === 'day' && <CopyDay data={data} onDone={() => setTool(null)} />}
                {tool === 'save' && <SaveTemplate data={data} onDone={() => setTool(null)} />}
                {tool === 'apply' && <ApplyTemplate data={data} onDone={() => setTool(null)} />}
                {tool === 'share' && <ShareWeek data={data} />}
            </Sheet>
        </>
    );
}

function CopyWeek({ data, onDone }: { data: PlanWeekData; onDone: () => void }) {
    const { call, busy, showToast } = usePlanAction();
    const input = { from: addDays(data.startDate, -7), to: data.startDate, days: 7 as const };
    const state = usePreview(input.from, () => previewPlanCopy(input));
    return (
        <CopyPanel
            preview={state?.preview ?? null}
            loading={!state}
            error={state?.error}
            empty="Letzte Woche ist nichts geplant."
            slotLabel={slotLabelFor(data)}
            confirmLabel="Übernehmen"
            busy={busy}
            onConfirm={async (mode) => {
                const result = await call(() => copyPlanDays({ ...input, mode }));
                if (!result) return;
                onDone();
                showToast({
                    type: 'success',
                    title: 'Woche übernommen',
                    message: resultMessage(result),
                });
            }}
        />
    );
}

function CopyDay({ data, onDone }: { data: PlanWeekData; onDone: () => void }) {
    const { call, busy, showToast } = usePlanAction();
    const planned = data.days.filter((day) => data.dishes.some((dish) => dish.date === day));
    const [from, setFrom] = useState(planned[0] ?? data.days[0]);
    const targets = [...data.days, ...data.days.map((day) => addDays(day, 7))];
    const [to, setTo] = useState(() => targets.find((day) => day > from) ?? targets[0]);
    const valid = from !== to;
    const input = { from, to, days: 1 as const };
    const state = usePreview(valid ? `${from}>${to}` : null, () => previewPlanCopy(input));
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3' })}>
                <DaySelect label="Von" days={data.days} value={from} onChange={setFrom} />
                <DaySelect label="Nach" days={targets} value={to} onChange={setTo} />
            </div>
            {valid ? (
                <CopyPanel
                    key={`${from}>${to}`}
                    preview={state?.preview ?? null}
                    loading={!state}
                    error={state?.error}
                    empty={`Am ${weekdayLong(from)} ist nichts geplant.`}
                    slotLabel={slotLabelFor(data)}
                    confirmLabel="Kopieren"
                    busy={busy}
                    onConfirm={async (mode) => {
                        const result = await call(() => copyPlanDays({ ...input, mode }));
                        if (!result) return;
                        onDone();
                        showToast({
                            type: 'success',
                            title: 'Tag kopiert',
                            message: resultMessage(result),
                        });
                    }}
                />
            ) : (
                <p className={muted}>Wähle einen anderen Zieltag.</p>
            )}
        </div>
    );
}

function SaveTemplate({ data, onDone }: { data: PlanWeekData; onDone: () => void }) {
    const { call, busy, showToast } = usePlanAction();
    const id = useId();
    const [name, setName] = useState(`Woche KW ${data.weekNumber}`);
    const count = data.dishes.filter((dish) => !dish.isLeftover).length;
    if (count === 0)
        return <p className={muted}>Plane zuerst ein paar Gerichte in dieser Woche.</p>;
    return (
        <form
            className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}
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
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
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
            <button
                type="submit"
                className={button({ variant: 'primary' })}
                disabled={busy || !name.trim()}
            >
                Speichern
            </button>
        </form>
    );
}

interface TemplateRow {
    id: string;
    name: string;
    count: number;
    titles: string[];
}

function ApplyTemplate({ data, onDone }: { data: PlanWeekData; onDone: () => void }) {
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

    if (error) return <p className={css({ color: 'status.error', fontSize: 'sm' })}>{error}</p>;
    if (!templates) return <p className={muted}>Einen Moment …</p>;
    if (templates.length === 0)
        return (
            <p className={muted}>
                Noch keine Vorlagen. Speichere eine gelungene Woche über „Woche → Als Vorlage
                speichern“.
            </p>
        );

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <ul className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                {templates.map((template) => (
                    <li key={template.id} className={css({ display: 'flex', gap: '2' })}>
                        <button
                            type="button"
                            aria-pressed={selected === template.id}
                            onClick={() => setSelected(template.id)}
                            className={cx(
                                css({
                                    flex: 1,
                                    minW: 0,
                                    textAlign: 'left',
                                    p: '3',
                                    borderRadius: 'lg',
                                    border: '1px solid',
                                    borderColor: 'border',
                                    bg: 'surface',
                                    color: 'text',
                                    cursor: 'pointer',
                                    _hover: { borderColor: 'primary' },
                                    _focusVisible: {
                                        outline: '2px solid',
                                        outlineColor: 'primary',
                                    },
                                }),
                                selected === template.id &&
                                    css({ borderColor: 'primary', bg: 'accent.soft' }),
                            )}
                        >
                            <span className={css({ display: 'block', fontWeight: '600' })}>
                                {template.name}
                            </span>
                            <span
                                className={css({
                                    display: 'block',
                                    fontSize: 'xs',
                                    color: 'foreground.muted',
                                })}
                            >
                                {template.count} Gerichte · {template.titles.join(', ')}
                                {template.count > template.titles.length ? ' …' : ''}
                            </span>
                        </button>
                        <button
                            type="button"
                            aria-label={`Vorlage „${template.name}“ löschen`}
                            className={button({ variant: 'ghost' })}
                            disabled={busy}
                            onClick={async () => {
                                if (!(await call(() => deletePlanTemplate(template.id)))) return;
                                setTemplates(
                                    (rows) => rows?.filter((row) => row.id !== template.id) ?? null,
                                );
                                if (selected === template.id) setSelected(null);
                            }}
                        >
                            <Trash2 size={16} aria-hidden />
                        </button>
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
