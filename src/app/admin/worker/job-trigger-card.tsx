'use client';

import { useState, useTransition } from 'react';

import { getQueueLabel } from '@worker/queues/job-run-ui';
import { QueueName, type JobPayloadSchema } from '@worker/queues/types';

import { css } from 'styled-system/css';

import { triggerJobAction } from './actions';

type JobCatalogItem = {
    id: string;
    jobName: string;
    queue: QueueName;
    type: 'worker' | 'scheduled';
    defaultPayload: Record<string, unknown>;
    schema?: JobPayloadSchema;
    meta: {
        concurrency?: number;
        repeatPattern?: string;
    };
};

export function JobTriggerCard({ item }: { item: JobCatalogItem }) {
    const [fieldValues, setFieldValues] = useState<Record<string, unknown>>(() => {
        if (!item.schema) return item.defaultPayload;
        return Object.fromEntries(
            Object.entries(item.schema).map(([key, field]) => [
                key,
                item.defaultPayload[key] ??
                    field.default ??
                    (field.type === 'boolean' ? false : field.type === 'number' ? 0 : ''),
            ]),
        );
    });

    const [isPending, startTransition] = useTransition();

    function handleFieldChange(key: string, value: unknown) {
        setFieldValues((prev) => ({ ...prev, [key]: value }));
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData();
        formData.set('queue', item.queue);
        formData.set('jobName', item.jobName);
        formData.set('payload', JSON.stringify(fieldValues));
        startTransition(() => triggerJobAction(formData));
    }

    const hasSchema = item.schema && Object.keys(item.schema).length > 0;

    return (
        <li
            className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '2',
                padding: '3',
                borderRadius: 'lg',
                borderWidth: '1px',
                borderColor: 'border.muted',
                background: 'surface',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '2',
                })}
            >
                <div>
                    <p
                        className={css({
                            fontSize: 'sm',
                            fontWeight: 'semibold',
                            color: 'foreground',
                        })}
                    >
                        {item.jobName}
                    </p>
                    <p
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                        })}
                    >
                        {getQueueLabel(item.queue)}
                    </p>
                </div>
                <span
                    className={css({
                        borderRadius: 'full',
                        px: '2',
                        py: '0.5',
                        fontSize: 'xs',
                        fontWeight: 'medium',
                        background: 'border.muted',
                        color: 'foreground.muted',
                    })}
                >
                    {item.type === 'worker'
                        ? `${item.meta.concurrency ?? 1}⚡`
                        : (item.meta.repeatPattern ?? 'adhoc')}
                </span>
            </div>

            <form onSubmit={handleSubmit}>
                {hasSchema && (
                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2',
                            marginBottom: '2',
                            paddingBottom: '2',
                            borderBottomWidth: '1px',
                            borderColor: 'border.muted',
                        })}
                    >
                        {Object.entries(item.schema!).map(([key, field]) => (
                            <div key={key}>
                                <label
                                    className={css({
                                        display: 'block',
                                        fontSize: 'xs',
                                        fontWeight: 'medium',
                                        color: 'foreground.muted',
                                        marginBottom: '0.5',
                                    })}
                                >
                                    {field.label}
                                </label>

                                {field.type === 'number' && (
                                    <input
                                        type="number"
                                        min={field.min}
                                        max={field.max}
                                        value={(fieldValues[key] as number) ?? field.default ?? 0}
                                        onChange={(e) =>
                                            handleFieldChange(key, Number(e.target.value))
                                        }
                                        className={css({
                                            width: '100%',
                                            padding: '0.5',
                                            fontSize: 'xs',
                                            borderWidth: '1px',
                                            borderColor: 'border.muted',
                                            borderRadius: 'md',
                                            background: 'surface.elevated',
                                            color: 'foreground',
                                            _focus: {
                                                outline: 'none',
                                                borderColor: 'primary',
                                            },
                                        })}
                                    />
                                )}

                                {field.type === 'string' && (
                                    <input
                                        type="text"
                                        placeholder={field.placeholder}
                                        value={(fieldValues[key] as string) ?? field.default ?? ''}
                                        onChange={(e) => handleFieldChange(key, e.target.value)}
                                        className={css({
                                            width: '100%',
                                            padding: '0.5',
                                            fontSize: 'xs',
                                            borderWidth: '1px',
                                            borderColor: 'border.muted',
                                            borderRadius: 'md',
                                            background: 'surface.elevated',
                                            color: 'foreground',
                                            _focus: {
                                                outline: 'none',
                                                borderColor: 'primary',
                                            },
                                        })}
                                    />
                                )}

                                {field.type === 'boolean' && (
                                    <label
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1',
                                            cursor: 'pointer',
                                        })}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={Boolean(
                                                fieldValues[key] ?? field.default ?? false,
                                            )}
                                            onChange={(e) =>
                                                handleFieldChange(key, e.target.checked)
                                            }
                                        />
                                        <span
                                            className={css({ fontSize: 'xs', color: 'foreground' })}
                                        >
                                            Aktiviert
                                        </span>
                                    </label>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className={css({
                        width: '100%',
                        borderRadius: 'lg',
                        background: 'primary',
                        color: 'white',
                        fontSize: 'xs',
                        fontWeight: 'semibold',
                        padding: '2',
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: isPending ? 0.7 : 1,
                        '&:hover': {
                            opacity: isPending ? 0.7 : 0.9,
                        },
                    })}
                >
                    {isPending ? '⏳ Wird ausgeführt...' : '▶ Ausführen'}
                </button>
            </form>
        </li>
    );
}
