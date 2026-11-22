'use client';

import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { input } from '@app/components/atoms/recipes';
import {
    customSlotKey,
    isFixedSlot,
    slotLabel,
    sortSlots,
    type SlotConfig,
} from '@app/lib/meal-plan/slots';

import { css } from 'styled-system/css';

import { Switch } from './FormParts';
import { field, hint, legend, section, startSelf, timeInput } from './settings-styles';

const list = css({ display: 'flex', flexDirection: 'column', gap: '2', listStyle: 'none' });
const row = css({ display: 'flex', alignItems: 'center', gap: '3', minH: '44px' });
const checkbox = css({ w: '5', h: '5', accentColor: 'var(--colors-primary)', flexShrink: 0 });
const name = css({ flex: 1, fontSize: 'sm', fontWeight: '500' });
const hiddenName = css({ flex: 1, fontSize: 'sm', fontWeight: '500', opacity: 0.5 });
const keepRoom = css({ w: '40px' });
const addRow = css({ display: 'flex', gap: '2', alignItems: 'flex-end', flexWrap: 'wrap' });
const nameField = css({ flex: '1 1 180px' });

type SetSlots = (update: (current: SlotConfig[]) => SlotConfig[]) => void;

/** "Mahlzeiten": slots on/off with time, own slots, optionally only for this week. */
export function SlotSettings({
    slots,
    setSlots,
    onReset,
    week,
    weekOnly,
    setWeekOnly,
}: {
    slots: SlotConfig[];
    /** Changes the slots and clears the save status */
    setSlots: SetSlots;
    /** "Auf deine Standard-Mahlzeiten zurücksetzen" */
    onReset: () => void;
    week?: { hasOverride: boolean };
    weekOnly: boolean;
    setWeekOnly: (value: boolean) => void;
}) {
    const updateSlot = (key: string, patch: Partial<SlotConfig>) =>
        setSlots((current) => current.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    return (
        <fieldset className={section}>
            <legend className={legend}>Mahlzeiten</legend>
            {week && (
                <Switch
                    checked={weekOnly}
                    onChange={setWeekOnly}
                    label="Nur für diese Woche"
                    description={
                        weekOnly
                            ? 'Die Mahlzeiten gelten nur für diese Woche.'
                            : 'Änderungen gelten für alle Wochen.'
                    }
                />
            )}
            <ul className={list}>
                {sortSlots(slots).map((slot) => (
                    <li key={slot.key} className={row}>
                        <input
                            type="checkbox"
                            checked={slot.enabled}
                            onChange={(e) => updateSlot(slot.key, { enabled: e.target.checked })}
                            aria-label={`${slotLabel(slot)} anzeigen`}
                            className={checkbox}
                        />
                        <span className={slot.enabled ? name : hiddenName}>{slotLabel(slot)}</span>
                        <input
                            type="time"
                            value={slot.time}
                            required
                            onChange={(e) => updateSlot(slot.key, { time: e.target.value })}
                            aria-label={`Uhrzeit ${slotLabel(slot)}`}
                            className={timeInput}
                        />
                        {isFixedSlot(slot.key) ? (
                            <span className={keepRoom} />
                        ) : (
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() =>
                                    setSlots((current) => current.filter((s) => s.key !== slot.key))
                                }
                                aria-label={`${slotLabel(slot)} entfernen`}
                            >
                                <Trash2 size={16} />
                            </Button>
                        )}
                    </li>
                ))}
            </ul>
            <p className={hint}>
                Ausgeblendete Mahlzeiten mit Gerichten bleiben sichtbar; es geht nichts verloren.
            </p>
            <AddSlot full={slots.length >= 12} setSlots={setSlots} />
            {week?.hasOverride && weekOnly && (
                <Button variant="ghost" type="button" className={startSelf} onClick={onReset}>
                    <RotateCcw size={16} /> Auf deine Standard-Mahlzeiten zurücksetzen
                </Button>
            )}
        </fieldset>
    );
}

function AddSlot({ full, setSlots }: { full: boolean; setSlots: SetSlots }) {
    const id = useId();
    const [newName, setNewName] = useState('');
    const [newTime, setNewTime] = useState('10:30');
    const add = () => {
        const trimmed = newName.trim();
        if (!trimmed || !newTime) return;
        setSlots((current) =>
            sortSlots([
                ...current,
                {
                    key: customSlotKey(
                        trimmed,
                        current.map((s) => s.key),
                    ),
                    name: trimmed,
                    time: newTime,
                    enabled: true,
                },
            ]),
        );
        setNewName('');
    };
    return (
        <div className={addRow}>
            <label htmlFor={id} className={`${field} ${nameField}`}>
                Eigene Mahlzeit
                <input
                    id={id}
                    className={input}
                    value={newName}
                    maxLength={40}
                    placeholder="z. B. Brunch"
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add();
                        }
                    }}
                />
            </label>
            <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                aria-label="Uhrzeit der eigenen Mahlzeit"
                className={timeInput}
            />
            <Button type="button" onClick={add} disabled={!newName.trim() || full}>
                <Plus size={16} /> Hinzufügen
            </Button>
        </div>
    );
}
