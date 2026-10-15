'use client';

import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@app/components/atoms/Button';

import { field, label, row, stack } from './styles';

export function CreateListForm({
    busy,
    onCreate,
}: {
    busy: boolean;
    onCreate: (name: string, operationId: string) => Promise<boolean>;
}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const request = useRef<{ name: string; id: string } | null>(null);
    const triggerContainer = useRef<HTMLDivElement>(null);
    const restoreFocus = useRef(false);
    useEffect(() => {
        if (!open && !busy && restoreFocus.current) {
            triggerContainer.current?.querySelector('button')?.focus();
            restoreFocus.current = false;
        }
    }, [open, busy]);

    function close() {
        setOpen(false);
        setName('');
        request.current = null;
        restoreFocus.current = true;
    }

    return (
        <div className={stack}>
            <div className={row} ref={triggerContainer}>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-expanded={open}
                    onClick={() => (open ? close() : setOpen(true))}
                >
                    <Plus size={16} aria-hidden /> Neue Liste
                </Button>
            </div>
            {open && (
                <form
                    className={stack}
                    onSubmit={async (event) => {
                        event.preventDefault();
                        const value = name.trim();
                        if (busy || !value) return;
                        if (!request.current || request.current.name !== value)
                            request.current = { name: value, id: crypto.randomUUID() };
                        if (await onCreate(value, request.current.id)) close();
                    }}
                >
                    <label className={label}>
                        Listenname
                        <input
                            className={field}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={100}
                            required
                            disabled={busy}
                            autoFocus
                            placeholder="Zum Beispiel Wochenmarkt"
                        />
                    </label>
                    <div className={row}>
                        <Button type="submit" disabled={busy || !name.trim()}>
                            {busy ? 'Wird erstellt …' : 'Liste erstellen'}
                        </Button>
                        <Button type="button" variant="ghost" disabled={busy} onClick={close}>
                            Abbrechen
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
