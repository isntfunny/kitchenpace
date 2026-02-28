'use client';

import { FileUpload } from '@/components/features/FileUpload';
import { css } from 'styled-system/css';

interface GeneralInformationSectionProps {
    title: string;
    onTitleChange: (value: string) => void;
    description: string;
    onDescriptionChange: (value: string) => void;
    imageUrl: string;
    onImageUrlChange: (value: string) => void;
}

export function GeneralInformationSection({
    title,
    onTitleChange,
    description,
    onDescriptionChange,
    imageUrl,
    onImageUrlChange,
}: GeneralInformationSectionProps) {
    return (
        <div>
            <div className={css({ fontWeight: '600', display: 'block', mb: '2' })}>Rezeptbild</div>
            <FileUpload type="recipe" value={imageUrl} onChange={onImageUrlChange} />

            <div className={css({ mt: '6' })}>
                <label className={css({ fontWeight: '600', display: 'block', mb: '2' })}>
                    Titel *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="z.B. Spaghetti Carbonara"
                    className={css({
                        width: '100%',
                        padding: '3',
                        borderRadius: 'xl',
                        border: '1px solid rgba(224,123,83,0.4)',
                        fontSize: 'md',
                        outline: 'none',
                        _focus: {
                            borderColor: '#e07b53',
                            boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                        },
                    })}
                    required
                />
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
                        border: '1px solid rgba(224,123,83,0.4)',
                        fontSize: 'md',
                        resize: 'vertical',
                        outline: 'none',
                        _focus: {
                            borderColor: '#e07b53',
                            boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                        },
                    })}
                />
            </div>
        </div>
    );
}
