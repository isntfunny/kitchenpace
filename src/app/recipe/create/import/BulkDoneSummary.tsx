'use client';

import { ArrowRight, ChefHat, CheckCircle2, Download, SkipForward, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';

import { css } from 'styled-system/css';

import {
    doneActionsClass,
    failedItemClass,
    failedListClass,
    primaryButtonCompactClass,
    savedItemClass,
    savedItemTitleClass,
    savedListClass,
    savedListTitleClass,
    secondaryButtonClass,
    summaryCardClass,
    summaryCardCountClass,
    summaryCardLabelClass,
    summaryGridClass,
} from './bulk-import-styles';
import type { BulkItem } from './bulk-import-types';
import { SuccessBanner } from './components/SuccessBanner';
import { containerClass } from './importStyles';

interface BulkDoneSummaryProps {
    savedItems: BulkItem[];
    skippedItems: BulkItem[];
    failedItems: BulkItem[];
    onRestart: () => void;
}

export function BulkDoneSummary({
    savedItems,
    skippedItems,
    failedItems,
    onRestart,
}: BulkDoneSummaryProps) {
    const router = useRouter();

    return (
        <div className={containerClass}>
            <SuccessBanner
                title="Bulk-Import abgeschlossen"
                subtitle={`${savedItems.length} gespeichert, ${skippedItems.length} übersprungen${failedItems.length > 0 ? `, ${failedItems.length} fehlgeschlagen` : ''}`}
            />

            {/* Summary cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={summaryGridClass}
            >
                <div className={summaryCardClass('success')}>
                    <CheckCircle2 size={20} />
                    <span className={summaryCardCountClass}>{savedItems.length}</span>
                    <span className={summaryCardLabelClass}>Gespeichert</span>
                </div>
                <div className={summaryCardClass('skip')}>
                    <SkipForward size={20} />
                    <span className={summaryCardCountClass}>{skippedItems.length}</span>
                    <span className={summaryCardLabelClass}>Übersprungen</span>
                </div>
                <div className={summaryCardClass('error')}>
                    <XCircle size={20} />
                    <span className={summaryCardCountClass}>{failedItems.length}</span>
                    <span className={summaryCardLabelClass}>Fehlgeschlagen</span>
                </div>
            </motion.div>

            {/* Saved recipes list */}
            {savedItems.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className={savedListClass}
                >
                    <h3 className={savedListTitleClass}>Gespeicherte Rezepte</h3>
                    {savedItems.map((item) => (
                        <a
                            key={item.savedId}
                            href={`/recipe/${item.savedId}/edit`}
                            className={savedItemClass}
                        >
                            <ChefHat size={16} className={css({ color: 'palette.orange' })} />
                            <span className={savedItemTitleClass}>
                                {item.recipe?.title ?? 'Rezept'}
                            </span>
                            <ArrowRight
                                size={14}
                                className={css({ color: 'text.dimmed', ml: 'auto' })}
                            />
                        </a>
                    ))}
                </motion.div>
            )}

            {/* Failed URLs */}
            {failedItems.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className={failedListClass}
                >
                    <h3 className={savedListTitleClass}>Fehlgeschlagen</h3>
                    {failedItems.map((item) => (
                        <div key={item.url} className={failedItemClass}>
                            <XCircle
                                size={14}
                                className={css({ color: 'status.error', flexShrink: 0 })}
                            />
                            <div>
                                <span
                                    className={css({
                                        fontSize: 'xs',
                                        color: 'text.dimmed',
                                        display: 'block',
                                    })}
                                >
                                    {(() => {
                                        try {
                                            return new URL(item.url).hostname;
                                        } catch {
                                            return item.url;
                                        }
                                    })()}
                                </span>
                                <span className={css({ fontSize: 'xs', color: 'status.error' })}>
                                    {item.error}
                                </span>
                            </div>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Actions */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className={doneActionsClass}
            >
                <button type="button" onClick={onRestart} className={secondaryButtonClass}>
                    <Download size={16} />
                    Weiteren Import starten
                </button>
                <button
                    type="button"
                    onClick={() => router.push('/profile/recipes')}
                    className={primaryButtonCompactClass}
                >
                    Meine Rezepte
                    <ArrowRight size={16} />
                </button>
            </motion.div>
        </div>
    );
}
