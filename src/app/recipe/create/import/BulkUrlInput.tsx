'use client';

import { Link2, List, Wand2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

import { css } from 'styled-system/css';

import {
    errorBannerClass,
    formCardClass,
    hintClass,
    textareaClass,
    urlCountClass,
} from './bulk-import-styles';
import { ImportPageHeader } from './components/ImportPageHeader';
import { containerClass, labelClass, primaryButtonClass } from './importStyles';

interface BulkUrlInputProps {
    urlText: string;
    onUrlTextChange: (text: string) => void;
    validUrls: string[];
    error: string | null;
    onStart: () => void;
}

export function BulkUrlInput({
    urlText,
    onUrlTextChange,
    validUrls,
    error,
    onStart,
}: BulkUrlInputProps) {
    return (
        <div className={containerClass}>
            <ImportPageHeader
                icon={List}
                title="Bulk-Import"
                subtitle="Importiere mehrere Rezepte auf einmal. Eine URL pro Zeile."
            />

            {error && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={css({ mb: '6' })}
                >
                    <div className={errorBannerClass}>
                        <XCircle size={16} />
                        {error}
                    </div>
                </motion.div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={formCardClass}
            >
                <label className={labelClass}>
                    Rezept-URLs (eine pro Zeile)
                    <textarea
                        value={urlText}
                        onChange={(e) => onUrlTextChange(e.target.value)}
                        placeholder={
                            'https://www.chefkoch.de/rezepte/...\nhttps://www.lecker.de/...\nhttps://www.eatsmarter.de/...'
                        }
                        rows={8}
                        className={textareaClass}
                    />
                </label>

                {urlText.trim() && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={urlCountClass}
                    >
                        <Link2 size={14} />
                        <span>
                            {validUrls.length} gültige URL{validUrls.length !== 1 ? 's' : ''}{' '}
                            erkannt
                        </span>
                        {urlText.split('\n').filter((l) => l.trim()).length > validUrls.length && (
                            <span className={css({ color: 'status.warning' })}>
                                (
                                {urlText.split('\n').filter((l) => l.trim()).length -
                                    validUrls.length}{' '}
                                ungültig)
                            </span>
                        )}
                    </motion.div>
                )}

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onStart}
                    disabled={validUrls.length === 0}
                    className={primaryButtonClass}
                >
                    <Wand2 size={18} />
                    {validUrls.length} Rezept{validUrls.length !== 1 ? 'e' : ''} importieren
                </motion.button>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className={css({ mt: '6', textAlign: 'center' })}
            >
                <p className={hintClass}>
                    Die Rezepte werden nacheinander verarbeitet. Du kannst jedes Rezept anschließend
                    einzeln prüfen und speichern.
                </p>
            </motion.div>
        </div>
    );
}
