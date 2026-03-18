'use client';

import { Download, Wand2 } from 'lucide-react';
import { motion } from 'motion/react';

import { ErrorBanner } from '@app/components/recipe/RecipeForm/components/ErrorBanner';

import { ImportPageHeader } from './components/ImportPageHeader';
import {
    buttonIconClass,
    errorWrapperClass,
    formWrapperClass,
    hintTextClass,
    hintWrapperClass,
    inputClass,
} from './import-styles-url';
import { containerClass, labelClass, primaryButtonClass } from './importStyles';

interface ImportStepUrlProps {
    url: string;
    onUrlChange: (url: string) => void;
    onStartImport: () => void;
    error: string | null;
}

export function ImportStepUrl({ url, onUrlChange, onStartImport, error }: ImportStepUrlProps) {
    return (
        <div className={containerClass}>
            <ImportPageHeader
                icon={Download}
                title="Rezept importieren"
                subtitle="Importiere ein Rezept von einer externen URL. Die KI analysiert das Rezept und erstellt automatisch einen Flow."
            />

            {error && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={errorWrapperClass}
                >
                    <ErrorBanner message={error} />
                </motion.div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={formWrapperClass}
            >
                <label className={labelClass}>
                    Rezept-URL
                    <motion.input
                        whileFocus={{ scale: 1.01 }}
                        type="url"
                        value={url}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            onUrlChange(e.target.value)
                        }
                        placeholder="https://www.chefkoch.de/rezepte/..."
                        className={inputClass}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                            e.key === 'Enter' && onStartImport()
                        }
                    />
                </label>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onStartImport}
                    disabled={!url.trim()}
                    className={primaryButtonClass}
                >
                    <Wand2 className={buttonIconClass} />
                    Import starten
                </motion.button>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className={hintWrapperClass}
            >
                <p className={hintTextClass}>
                    Unterstützte Quellen: Chefkoch, Foodblogs, Rezept-Webseiten
                </p>
            </motion.div>
        </div>
    );
}
