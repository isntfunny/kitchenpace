'use client';

import { useState, useTransition } from 'react';

import { css } from 'styled-system/css';

import { approveContent, rejectContent } from './actions';
import { ModerationDetailDialog } from './QueueActions';
import { QueueRow, type QueueItem } from './QueueColumns';

export type { QueueItem } from './QueueColumns';

export function ModerationQueueTable({ items }: { items: QueueItem[] }) {
    const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
    const [pending, startTransition] = useTransition();

    if (items.length === 0) {
        return (
            <div
                className={css({
                    textAlign: 'center',
                    py: '12',
                    color: 'foreground.muted',
                    fontSize: 'lg',
                })}
            >
                Keine ausstehenden Einträge — alles sauber!
            </div>
        );
    }

    const handleApprove = (id: string) => {
        startTransition(async () => {
            await approveContent(id);
        });
    };

    const handleReject = (id: string, note: string) => {
        if (!note.trim()) return;
        startTransition(async () => {
            await rejectContent(id, note);
        });
    };

    return (
        <>
            <div
                className={css({
                    borderRadius: 'xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    overflow: 'hidden',
                })}
            >
                {/* Table header */}
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: '100px 1fr 80px 140px 90px 90px',
                        gap: '3',
                        px: '4',
                        py: '2.5',
                        bg: 'surface.muted',
                        borderBottom: '1px solid',
                        borderColor: 'border.muted',
                        fontSize: 'xs',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'foreground.muted',
                    })}
                >
                    <span>Typ</span>
                    <span>Vorschau</span>
                    <span>Score</span>
                    <span>Autor</span>
                    <span>Zeit</span>
                    <span>Aktionen</span>
                </div>

                {/* Rows */}
                {items.map((item) => (
                    <QueueRow
                        key={item.id}
                        item={item}
                        onSelect={setSelectedItem}
                        onApprove={handleApprove}
                        pending={pending}
                    />
                ))}
            </div>

            {selectedItem && (
                <ModerationDetailDialog
                    item={selectedItem}
                    open={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}
        </>
    );
}
