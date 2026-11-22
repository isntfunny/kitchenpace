'use client';

import { CalendarRange, ChevronDown, Copy, LayoutTemplate, Save, Share2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';

import { copyPlanDays, previewPlanCopy } from '@app/app/plan/edit-actions';
import { button } from '@app/components/atoms/recipes';
import { Sheet } from '@app/components/ui/Sheet';
import { addDays, weekdayLong } from '@shared/dates';

import { css } from 'styled-system/css';

import { CopyPanel, DaySelect, muted, resultMessage, slotLabelFor, usePreview } from './CopyPanel';
import { ShareWeek } from './ShareWeek';
import { ApplyTemplate, SaveTemplate } from './TemplateTools';
import type { PlanWeekData } from './types';
import { usePlanAction } from './usePlanAction';

// "Letzte Woche übernehmen", "Tag kopieren", week templates (KUC-101) and sharing (KUC-110).

type Tool = 'week' | 'day' | 'save' | 'apply' | 'share';

const menu = css({
    zIndex: 60,
    minW: '240px',
    p: '1',
    bg: 'surface',
    color: 'text',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'xl',
    boxShadow: 'shadow.medium',
});
const column = css({ display: 'flex', flexDirection: 'column', gap: '4' });
const dayPair = css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3' });
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
                    <DropdownMenu.Content align="end" sideOffset={6} className={menu}>
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
        <div className={column}>
            <div className={dayPair}>
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
