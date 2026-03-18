'use client';

import { CheckCircle2, Circle, Loader2, LoaderCircle, X, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { MutableRefObject } from 'react';

import { css } from 'styled-system/css';

import {
    cancelButtonClass,
    processingContainerClass,
    processingHeaderClass,
    processingSubtitleClass,
    processingTitleClass,
    urlItemClass,
    urlItemContentClass,
    urlItemErrorClass,
    urlItemIconClass,
    urlItemStatusClass,
    urlItemTitleClass,
    urlItemUrlClass,
    urlListClass,
} from './bulk-import-styles';
import type { BulkItem } from './bulk-import-types';
import { ProgressBar } from './components/ProgressBar';

interface BulkProgressTableProps {
    items: BulkItem[];
    abortRef: MutableRefObject<boolean>;
}

export function BulkProgressTable({ items, abortRef }: BulkProgressTableProps) {
    const doneCount = items.filter((i) => i.status === 'done' || i.status === 'error').length;
    const progress = Math.round((doneCount / items.length) * 100);
    const currentItem = items.find((i) => i.status === 'scraping' || i.status === 'analyzing');

    return (
        <div className={processingContainerClass}>
            <div className={processingHeaderClass}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                >
                    <Loader2 size={24} className={css({ color: 'palette.orange' })} />
                </motion.div>
                <div>
                    <h2 className={processingTitleClass}>
                        Verarbeite {doneCount} von {items.length} Rezepten...
                    </h2>
                    {currentItem && (
                        <p className={processingSubtitleClass}>
                            {currentItem.status === 'scraping'
                                ? 'Lade Seite...'
                                : 'KI analysiert...'}{' '}
                            <span className={css({ color: 'text.dimmed', fontSize: 'xs' })}>
                                {new URL(currentItem.url).hostname}
                            </span>
                        </p>
                    )}
                </div>
            </div>

            {/* Overall progress */}
            <div className={css({ mb: '6' })}>
                <ProgressBar progress={progress} />
            </div>

            {/* URL list with statuses */}
            <div className={urlListClass}>
                {items.map((item, idx) => (
                    <motion.div
                        key={item.url}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={urlItemClass(item.status)}
                    >
                        <div className={urlItemIconClass}>
                            {item.status === 'pending' && (
                                <Circle size={16} className={css({ color: 'text.dimmed' })} />
                            )}
                            {item.status === 'scraping' && (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 1,
                                        ease: 'linear',
                                    }}
                                >
                                    <LoaderCircle
                                        size={16}
                                        className={css({ color: 'palette.blue' })}
                                    />
                                </motion.div>
                            )}
                            {item.status === 'analyzing' && (
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    <LoaderCircle
                                        size={16}
                                        className={css({ color: 'palette.purple' })}
                                    />
                                </motion.div>
                            )}
                            {item.status === 'done' && (
                                <CheckCircle2
                                    size={16}
                                    className={css({ color: 'status.success' })}
                                />
                            )}
                            {item.status === 'error' && (
                                <XCircle size={16} className={css({ color: 'status.error' })} />
                            )}
                        </div>

                        <div className={urlItemContentClass}>
                            <span className={urlItemUrlClass}>
                                {(() => {
                                    try {
                                        const u = new URL(item.url);
                                        return u.hostname + u.pathname.slice(0, 40);
                                    } catch {
                                        return item.url.slice(0, 50);
                                    }
                                })()}
                            </span>
                            {item.status === 'done' && item.recipe && (
                                <span className={urlItemTitleClass}>{item.recipe.title}</span>
                            )}
                            {item.status === 'error' && item.error && (
                                <span className={urlItemErrorClass}>{item.error}</span>
                            )}
                            {item.status === 'scraping' && (
                                <span className={urlItemStatusClass}>Seite wird geladen...</span>
                            )}
                            {item.status === 'analyzing' && (
                                <span className={urlItemStatusClass}>
                                    KI analysiert das Rezept...
                                </span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            <button
                type="button"
                onClick={() => {
                    abortRef.current = true;
                }}
                className={cancelButtonClass}
            >
                <X size={16} />
                Abbrechen
            </button>
        </div>
    );
}
