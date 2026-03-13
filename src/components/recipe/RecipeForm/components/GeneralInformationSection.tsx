'use client';

import { type RefObject } from 'react';

import { FileUpload } from '@app/components/features/FileUpload';
import { css } from 'styled-system/css';

interface GeneralInformationSectionProps {
    title: string;
    onTitleChange: (value: string) => void;
    description: string;
    onDescriptionChange: (value: string) => void;
    imageKey?: string;
    onImageKeyChange?: (value: string) => void;
    showAutoSaveHint?: boolean;
    recipeId?: string;
    titleInputRef?: RefObject<HTMLInputElement | null>;
}

export function GeneralInformationSection({
    title,
    onTitleChange,
    description,
    onDescriptionChange,
    imageKey = '',
    onImageKeyChange = () => {},
    showAutoSaveHint = false,
    recipeId,
    titleInputRef,
}: GeneralInformationSectionProps) {
    return (
        <div>
            <div className={css({ fontWeight: '600', display: 'block', mb: '2' })}>Rezeptbild</div>
            <FileUpload
                type="recipe"
                value={imageKey}
                onChange={onImageKeyChange}
                recipeId={recipeId}
                label="Rezeptbild"
            />

            <div className={css({ mt: '6' })}>
                <label className={css({ fontWeight: '600', display: 'block', mb: '2' })}>
                    Titel *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="z.B. Spaghetti Carbonara"
                    ref={titleInputRef}
                    className={css({
                        width: '100%',
                        padding: '3',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: {
                            base: 'rgba(224,123,83,0.4)',
                            _dark: 'rgba(224,123,83,0.45)',
                        },
                        fontSize: 'md',
                        outline: 'none',
                        bg: { base: 'transparent', _dark: 'surface' },
                        color: 'text',
                        _focus: {
                            borderColor: 'palette.orange',
                            boxShadow: {
                                base: '0 0 0 3px rgba(224,123,83,0.15)',
                                _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                            },
                        },
                    })}
                    required
                />
                {showAutoSaveHint && !title.trim() && (
                    <p
                        className={css({
                            mt: '1.5',
                            fontSize: 'xs',
                            color: 'text.muted',
                            fontStyle: 'italic',
                        })}
                    >
                        Bitte Titel eingeben, um die automatische Speicherung zu aktivieren.
                    </p>
                )}
            </div>

            <div className={css({ mt: '6' })}>
                <label className={css({ fontWeight: '600', display: 'block', mb: '2' })}>
                    Beschreibung
                </label>
                <textarea
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="Kurze Beschreibung des Rezepts..."
                    rows={3}
                    className={css({
                        width: '100%',
                        padding: '3',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: {
                            base: 'rgba(224,123,83,0.4)',
                            _dark: 'rgba(224,123,83,0.45)',
                        },
                        fontSize: 'md',
                        resize: 'vertical',
                        outline: 'none',
                        bg: { base: 'transparent', _dark: 'surface' },
                        color: 'text',
                        _focus: {
                            borderColor: 'palette.orange',
                            boxShadow: {
                                base: '0 0 0 3px rgba(224,123,83,0.15)',
                                _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                            },
                        },
                    })}
                />
            </div>
        </div>
    );
}
