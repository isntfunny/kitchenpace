'use client';

import { X, Upload, Loader2, Clock, Trash2, Check } from 'lucide-react';
import { useRef, useState, useCallback, useEffect } from 'react';

import { searchIngredients } from '@app/components/recipe/actions';
import type { AddedIngredient } from '@app/components/recipe/RecipeForm/data';
import { css } from 'styled-system/css';

import { DescriptionEditor } from './DescriptionEditor';
import type { RecipeNodeData, StepType } from './editorTypes';
import { useFlowEditor } from './FlowEditorContext';
import { ADDABLE_STEP_TYPES, STEP_CONFIGS } from './stepConfig';

interface NodeEditPanelProps {
    nodeId: string;
    data: RecipeNodeData;
    availableIngredients: AddedIngredient[];
    onSave: (data: Partial<RecipeNodeData>) => void;
    onClose: () => void;
    onDelete?: () => void;
    canDelete?: boolean;
}

const MENTION_REGEX = /@\[.*?\]\((.*?)\)/g;

function extractIngredientIds(description: string): string[] {
    return [...description.matchAll(MENTION_REGEX)].map((m) => m[1]);
}

export function NodeEditPanel({
    nodeId: _nodeId,
    data,
    availableIngredients,
    onSave,
    onClose,
    onDelete,
    canDelete = true,
}: NodeEditPanelProps) {
    const { onAddIngredientToRecipe } = useFlowEditor();
    const [stepType, setStepType] = useState<StepType>(data.stepType);
    const [label, setLabel] = useState(data.label);
    const [description, setDescription] = useState(data.description);
    const [duration, setDuration] = useState<number | undefined>(data.duration);
    const [photoKey, setPhotoKey] = useState<string | undefined>(data.photoKey);
    const [photoUrl, setPhotoUrl] = useState<string | undefined>(data.photoUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentConfig = STEP_CONFIGS[stepType];
    const Icon = currentConfig.icon;

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'recipe');

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? 'Upload fehlgeschlagen');
            }
            const { url, key } = await res.json();
            setPhotoKey(key);
            setPhotoUrl(url);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, []);

    const handleSave = useCallback(() => {
        onSave({
            stepType,
            label,
            description,
            duration,
            ingredientIds: extractIngredientIds(description),
            photoKey,
            photoUrl,
        });
    }, [stepType, label, description, duration, photoKey, photoUrl, onSave]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const isStartOrServieren = data.stepType === 'start' || data.stepType === 'servieren';

    return (
        <div className={overlayClass} onClick={onClose}>
            <div className={panelClass} onClick={(e) => e.stopPropagation()}>
                {/* ── Colored header band ── */}
                <div
                    className={headerBandClass}
                    style={{ backgroundImage: currentConfig.gradient }}
                >
                    <div className={headerIconWrapClass}>
                        <Icon
                            className={css({ width: '24px', height: '24px', color: '#2d3436' })}
                        />
                    </div>
                    <div className={css({ flex: '1' })}>
                        <span className={headerTypeClass}>{currentConfig.label}</span>
                        <span className={headerSubtitleClass}>Schritt bearbeiten</span>
                    </div>
                    <button type="button" className={closeButtonClass} onClick={onClose}>
                        <X className={css({ width: '18px', height: '18px' })} />
                    </button>
                </div>

                {/* ── Photo banner ── */}
                {photoUrl && (
                    <div className={photoBannerClass}>
                        <img
                            src={photoUrl}
                            alt="Schrittfoto"
                            className={photoBannerImgClass}
                            onError={() => setPhotoUrl(undefined)}
                        />
                        <button
                            type="button"
                            className={photoReplaceClass}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className={css({ width: '12px', height: '12px' })} />
                            Ersetzen
                        </button>
                    </div>
                )}

                <div className={contentClass}>
                    {/* ── Type selector ── */}
                    {!isStartOrServieren && (
                        <div className={fieldClass}>
                            <label className={labelClass}>Typ ändern</label>
                            <div className={typeGridClass}>
                                {ADDABLE_STEP_TYPES.map((type) => {
                                    const config = STEP_CONFIGS[type];
                                    const TypeIcon = config.icon;
                                    const isSelected = stepType === type;
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            className={typeButtonClass}
                                            style={{
                                                backgroundImage: isSelected
                                                    ? config.gradient
                                                    : undefined,
                                                borderColor: isSelected ? '#e07b53' : undefined,
                                            }}
                                            onClick={() => setStepType(type)}
                                        >
                                            <TypeIcon
                                                className={css({
                                                    width: '16px',
                                                    height: '16px',
                                                    opacity: isSelected ? '1' : '0.6',
                                                })}
                                            />
                                            <span
                                                className={typeLabelClass}
                                                style={{ fontWeight: isSelected ? '700' : '500' }}
                                            >
                                                {config.label}
                                            </span>
                                            {isSelected && (
                                                <div className={typeCheckClass}>
                                                    <Check
                                                        className={css({
                                                            width: '8px',
                                                            height: '8px',
                                                        })}
                                                    />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Title + Duration row ── */}
                    <div className={twoColRowClass}>
                        <div className={css({ flex: '1' })}>
                            <label className={labelClass}>Titel</label>
                            <input
                                type="text"
                                className={inputClass}
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="z.B. Pasta kochen"
                            />
                        </div>
                        <div className={css({ width: '120px', flexShrink: '0' })}>
                            <label className={labelClass}>Dauer</label>
                            <div className={durationWrapClass}>
                                <Clock
                                    className={css({
                                        width: '14px',
                                        height: '14px',
                                        color: 'text.muted',
                                        flexShrink: '0',
                                    })}
                                />
                                <input
                                    type="number"
                                    className={durationInputClass}
                                    value={duration ?? ''}
                                    onChange={(e) =>
                                        setDuration(
                                            e.target.value
                                                ? parseInt(e.target.value, 10)
                                                : undefined,
                                        )
                                    }
                                    placeholder="0"
                                    min="0"
                                />
                                <span className={durationSuffixClass}>Min.</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Description ── */}
                    <div className={fieldClass}>
                        <label className={labelClass}>Beschreibung</label>
                        <DescriptionEditor
                            value={description}
                            onChange={setDescription}
                            availableIngredients={availableIngredients}
                            onSearchIngredients={searchIngredients}
                            onAddIngredient={onAddIngredientToRecipe}
                        />
                    </div>

                    {/* ── Photo upload ── */}
                    {!photoUrl && (
                        <div className={fieldClass}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className={css({ display: 'none' })}
                                onChange={handleFileChange}
                            />
                            <button
                                type="button"
                                className={uploadButtonClass}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <Loader2
                                        className={css({
                                            width: '18px',
                                            height: '18px',
                                            animation: 'spin 0.7s linear infinite',
                                        })}
                                    />
                                ) : (
                                    <Upload className={css({ width: '18px', height: '18px' })} />
                                )}
                                <span>
                                    {isUploading ? 'Wird hochgeladen...' : 'Foto hinzufügen'}
                                </span>
                            </button>
                            {uploadError && (
                                <p className={css({ fontSize: 'xs', color: 'red.500', mt: '1' })}>
                                    {uploadError}
                                </p>
                            )}
                        </div>
                    )}
                    {/* Hidden file input for photo replace when banner is visible */}
                    {photoUrl && (
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className={css({ display: 'none' })}
                            onChange={handleFileChange}
                        />
                    )}
                </div>

                {/* ── Footer ── */}
                <div className={footerClass}>
                    {canDelete ? (
                        <button type="button" className={deleteButtonClass} onClick={onDelete}>
                            <Trash2 className={css({ width: '14px', height: '14px' })} />
                            Löschen
                        </button>
                    ) : (
                        <div />
                    )}
                    <button type="button" className={saveButtonClass} onClick={handleSave}>
                        <Check className={css({ width: '16px', height: '16px' })} />
                        Fertig
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── styles ──────────────────────────────────────────────── */

const overlayClass = css({
    position: 'fixed',
    inset: '0',
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)',
    zIndex: '40',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: '4',
    animation: 'fadeIn 0.15s ease-out',
});

const panelClass = css({
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    backgroundColor: 'white',
    borderRadius: '2xl',
    boxShadow: '0 24px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.2s ease-out',
});

const headerBandClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    px: '4',
    py: '3.5',
});

const headerIconWrapClass = css({
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 'xl',
    backdropFilter: 'blur(8px)',
    flexShrink: '0',
});

const headerTypeClass = css({
    display: 'block',
    fontSize: 'md',
    fontWeight: '700',
    fontFamily: 'heading',
    color: 'text',
    lineHeight: '1.2',
});

const headerSubtitleClass = css({
    display: 'block',
    fontSize: 'xs',
    color: 'rgba(45,52,54,0.6)',
    mt: '0.5',
});

const closeButtonClass = css({
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'lg',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'rgba(255,255,255,0.5)',
    color: 'text',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.15s ease',
    flexShrink: '0',
    _hover: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        transform: 'scale(1.05)',
    },
});

const photoBannerClass = css({
    position: 'relative',
    height: '120px',
    overflow: 'hidden',
});

const photoBannerImgClass = css({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
});

const photoReplaceClass = css({
    position: 'absolute',
    bottom: '2',
    right: '2',
    display: 'flex',
    alignItems: 'center',
    gap: '1',
    px: '2',
    py: '1',
    fontSize: 'xs',
    fontWeight: '600',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(8px)',
    border: 'none',
    borderRadius: 'md',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: { backgroundColor: 'rgba(0,0,0,0.7)' },
});

const contentClass = css({
    flex: '1',
    overflowY: 'auto',
    px: '4',
    py: '3',
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
});

const fieldClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5',
});

const labelClass = css({
    fontSize: '11px',
    fontWeight: '700',
    color: 'text.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
});

const inputClass = css({
    p: '2.5',
    border: '1px solid rgba(224,123,83,0.3)',
    borderRadius: 'xl',
    fontSize: 'sm',
    fontFamily: 'body',
    outline: 'none',
    transition: 'all 0.15s ease',
    _focus: {
        borderColor: 'brand.primary',
        boxShadow: '0 0 0 3px rgba(224,123,83,0.12)',
    },
});

const twoColRowClass = css({
    display: 'flex',
    gap: '3',
    alignItems: 'flex-start',
});

const durationWrapClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    p: '2.5',
    border: '1px solid rgba(224,123,83,0.3)',
    borderRadius: 'xl',
    transition: 'all 0.15s ease',
    _focusWithin: {
        borderColor: 'brand.primary',
        boxShadow: '0 0 0 3px rgba(224,123,83,0.12)',
    },
});

const durationInputClass = css({
    width: '36px',
    border: 'none',
    outline: 'none',
    fontSize: 'sm',
    fontFamily: 'body',
    textAlign: 'center',
    appearance: 'textfield',
    /* Chrome: hide spinner */
    '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
        appearance: 'none',
        margin: '0',
    },
});

const durationSuffixClass = css({
    fontSize: 'xs',
    color: 'text.muted',
    fontWeight: '500',
});

const typeGridClass = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1.5',
});

const typeButtonClass = css({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5',
    p: '2',
    border: '2px solid transparent',
    borderRadius: 'xl',
    cursor: 'pointer',
    backgroundColor: 'rgba(0,0,0,0.02)',
    transition: 'all 0.15s ease',
    _hover: {
        transform: 'translateY(-1px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
});

const typeLabelClass = css({
    fontSize: '10px',
    color: 'text',
    lineHeight: '1.2',
    textAlign: 'center',
});

const typeCheckClass = css({
    position: 'absolute',
    top: '-3px',
    right: '-3px',
    width: '14px',
    height: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'brand.primary',
    color: 'white',
    borderRadius: 'full',
    border: '2px solid white',
});

const uploadButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    py: '3',
    border: '2px dashed rgba(224,123,83,0.3)',
    borderRadius: 'xl',
    backgroundColor: 'rgba(224,123,83,0.02)',
    color: 'text.muted',
    fontSize: 'sm',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        borderColor: 'brand.primary',
        color: 'brand.primary',
        backgroundColor: 'rgba(224,123,83,0.05)',
    },
    _disabled: { opacity: '0.6', cursor: 'not-allowed' },
});

const footerClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    px: '4',
    py: '3',
    borderTop: '1px solid rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(0,0,0,0.01)',
});

const deleteButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    px: '3',
    py: '2',
    border: 'none',
    borderRadius: 'lg',
    backgroundColor: 'transparent',
    color: 'text.muted',
    fontSize: 'sm',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: { color: 'red.500', backgroundColor: 'rgba(239,68,68,0.08)' },
});

const saveButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    px: '5',
    py: '2.5',
    border: 'none',
    borderRadius: 'xl',
    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
    color: 'white',
    fontSize: 'sm',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 2px 8px rgba(224,123,83,0.3)',
    _hover: {
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 16px rgba(224,123,83,0.4)',
    },
});
