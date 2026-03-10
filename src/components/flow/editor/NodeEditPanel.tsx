'use client';

import { X, Upload, Loader2, Trash2, Check } from 'lucide-react';
import { useRef, useState, useCallback, useEffect } from 'react';

import { searchIngredients } from '@app/components/recipe/actions';
import { SegmentedBar } from '@app/components/recipe/RecipeForm/components/SegmentedBar';
import type { AddedIngredient } from '@app/components/recipe/RecipeForm/data';
import { PALETTE } from '@app/lib/palette';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';
import { css } from 'styled-system/css';

import { DescriptionEditor } from './DescriptionEditor';
import type { RecipeNodeData, StepType } from './editorTypes';
import { useFlowEditor } from './FlowEditorContext';
import { ADDABLE_STEP_TYPES, STEP_CONFIGS } from './stepConfig';

const DURATION_PRESETS = [1, 5, 10, 15, 20, 30, 45, 60] as const;
const DURATION_LABELS = DURATION_PRESETS.map(String);

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
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentConfig = STEP_CONFIGS[stepType];
    const Icon = currentConfig.icon;
    const accent = currentConfig.accent;

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'step');

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.error ?? 'Upload fehlgeschlagen');
            }
            const { key } = await res.json();
            setPhotoKey(key);
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
        });
    }, [stepType, label, description, duration, photoKey, onSave]);

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
                {/* ── Header ── */}
                <div className={headerClass} style={{ backgroundColor: `${accent}18` }}>
                    <div
                        className={headerIconClass}
                        style={{ backgroundColor: `${accent}22`, color: accent }}
                    >
                        <Icon style={{ width: 22, height: 22 }} />
                    </div>

                    <div className={css({ flex: '1', minWidth: '0' })}>
                        <div className={headerTitleClass} style={{ color: accent }}>
                            {currentConfig.label}
                        </div>
                        <div className={headerSubtitleClass}>Schritt bearbeiten</div>
                    </div>

                    <button type="button" className={closeButtonClass} onClick={onClose}>
                        <X style={{ width: 16, height: 16 }} />
                    </button>
                </div>

                {/* ── Photo banner ── */}
                {photoKey && (
                    <div className={photoBannerClass}>
                        <img
                            src={getThumbnailUrl(photoKey, '4:1', 460)}
                            alt="Schrittfoto"
                            className={photoBannerImgClass}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <button
                            type="button"
                            className={photoReplaceClass}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload style={{ width: 12, height: 12 }} />
                            Ersetzen
                        </button>
                    </div>
                )}

                <div className={contentClass}>
                    {/* ── Type selector ── */}
                    {!isStartOrServieren && (
                        <div className={fieldClass}>
                            <div className={sectionLabelClass}>Typ</div>
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
                                            style={
                                                isSelected
                                                    ? {
                                                          border: `1px solid ${config.accent}`,
                                                          backgroundColor: `${config.accent}15`,
                                                          boxShadow: `0 0 0 1px ${config.accent}40`,
                                                      }
                                                    : {
                                                          border: `1px solid ${PALETTE.orange}40`,
                                                      }
                                            }
                                            onClick={() => setStepType(type)}
                                        >
                                            <TypeIcon
                                                style={{
                                                    width: 18,
                                                    height: 18,
                                                    color: isSelected ? config.accent : undefined,
                                                    opacity: isSelected ? 1 : 0.45,
                                                }}
                                            />
                                            <span
                                                className={typeLabelClass}
                                                style={
                                                    isSelected
                                                        ? { color: config.accent, fontWeight: 700 }
                                                        : undefined
                                                }
                                            >
                                                {config.label}
                                            </span>
                                            {isSelected && (
                                                <div
                                                    className={typeCheckClass}
                                                    style={{ backgroundColor: config.accent }}
                                                >
                                                    <Check style={{ width: 7, height: 7 }} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Title ── */}
                    <div className={fieldClass}>
                        <div className={sectionLabelClass}>Titel</div>
                        <input
                            type="text"
                            className={inputClass}
                            style={{ border: `1px solid ${PALETTE.orange}40` }}
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="z.B. Pasta kochen"
                        />
                    </div>

                    {/* ── Duration ── */}
                    <div className={fieldClass}>
                        <div className={sectionLabelClass}>Dauer</div>
                        <SegmentedBar
                            items={DURATION_LABELS}
                            activeIndex={DURATION_PRESETS.indexOf(
                                duration as (typeof DURATION_PRESETS)[number],
                            )}
                            onSelect={(i) => {
                                const preset = DURATION_PRESETS[i];
                                setDuration(duration === preset ? undefined : preset);
                            }}
                            trackingName="step_duration"
                            customInput={{
                                type: 'number',
                                value: duration ?? 0,
                                onChange: (v) => setDuration(v || undefined),
                                placeholder: 'Min.',
                                suffix: 'Min.',
                            }}
                        />
                    </div>

                    {/* ── Description ── */}
                    <div className={fieldClass}>
                        <div className={sectionLabelClass}>Beschreibung</div>
                        <DescriptionEditor
                            value={description}
                            onChange={setDescription}
                            availableIngredients={availableIngredients}
                            onSearchIngredients={searchIngredients}
                            onAddIngredient={onAddIngredientToRecipe}
                        />
                    </div>

                    {/* ── Photo upload ── */}
                    {!photoKey && (
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
                                            width: '16px',
                                            height: '16px',
                                            animation: 'spin 0.7s linear infinite',
                                        })}
                                    />
                                ) : (
                                    <Upload style={{ width: 16, height: 16 }} />
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
                    {photoKey && (
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
                            <Trash2 style={{ width: 14, height: 14 }} />
                            Löschen
                        </button>
                    ) : (
                        <div />
                    )}
                    <button
                        type="button"
                        className={saveButtonClass}
                        style={{ backgroundColor: accent, boxShadow: `0 2px 10px ${accent}50` }}
                        onClick={handleSave}
                    >
                        <Check style={{ width: 15, height: 15 }} />
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
    backgroundColor: 'surface.overlay',
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
    maxWidth: '460px',
    maxHeight: '90vh',
    backgroundColor: 'surface',
    borderRadius: '2xl',
    boxShadow: {
        base: '0 24px 48px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)',
        _dark: '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)',
    },
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.2s ease-out',
});

/* Header */
const headerClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    px: '4',
    py: '3.5',
});

const headerIconClass = css({
    width: '40px',
    height: '40px',
    borderRadius: 'xl',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
});

const headerTitleClass = css({
    fontSize: 'lg',
    fontWeight: '700',
    fontFamily: 'heading',
    lineHeight: '1.2',
});

const headerSubtitleClass = css({
    fontSize: 'xs',
    color: 'text.muted',
    mt: '0.5',
    lineHeight: '1',
});

const closeButtonClass = css({
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'lg',
    cursor: 'pointer',
    border: { base: '1px solid rgba(0,0,0,0.08)', _dark: '1px solid rgba(255,255,255,0.1)' },
    backgroundColor: { base: 'rgba(0,0,0,0.04)', _dark: 'rgba(255,255,255,0.06)' },
    color: 'text.muted',
    transition: 'all 0.15s ease',
    flexShrink: '0',
    _hover: {
        backgroundColor: { base: 'rgba(0,0,0,0.08)', _dark: 'rgba(255,255,255,0.12)' },
        color: 'text',
    },
});

/* Photo banner */
const photoBannerClass = css({
    position: 'relative',
    height: '110px',
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

/* Content */
const contentClass = css({
    flex: '1',
    overflowY: 'auto',
    px: '4',
    pt: '3',
    pb: '2',
    display: 'flex',
    flexDirection: 'column',
    gap: '3.5',
});

const fieldClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5',
});

const sectionLabelClass = css({
    fontSize: '11px',
    fontWeight: '700',
    color: 'text.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
});

const inputClass = css({
    px: '3',
    py: '2.5',
    borderRadius: 'xl',
    fontSize: 'sm',
    fontFamily: 'body',
    outline: 'none',
    backgroundColor: { base: 'rgba(0,0,0,0.02)', _dark: 'rgba(255,255,255,0.04)' },
    color: 'text',
    transition: 'all 0.15s ease',
    _focus: {
        borderColor: 'brand.primary',
        backgroundColor: 'surface',
        boxShadow: '0 0 0 3px rgba(224,123,83,0.12)',
    },
});

/* Type grid */
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
    gap: '1',
    py: '2.5',
    px: '1',
    borderRadius: 'xl',
    cursor: 'pointer',
    backgroundColor: { base: 'rgba(0,0,0,0.02)', _dark: 'rgba(255,255,255,0.03)' },
    transition: 'all 0.15s ease',
    _hover: {
        backgroundColor: { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(255,255,255,0.07)' },
        transform: 'translateY(-1px)',
    },
});

const typeLabelClass = css({
    fontSize: '10px',
    color: 'text.muted',
    fontWeight: '500',
    lineHeight: '1.2',
    textAlign: 'center',
});

const typeCheckClass = css({
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '14px',
    height: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    borderRadius: 'full',
    border: { base: '2px solid white', _dark: '2px solid {colors.surface}' },
});

/* Upload button */
const uploadButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    py: '2.5',
    border: { base: '1.5px dashed rgba(0,0,0,0.12)', _dark: '1.5px dashed rgba(255,255,255,0.12)' },
    borderRadius: 'xl',
    backgroundColor: 'transparent',
    color: 'text.muted',
    fontSize: 'sm',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        borderColor: 'brand.primary',
        color: 'brand.primary',
        backgroundColor: { base: 'rgba(224,123,83,0.04)', _dark: 'rgba(224,123,83,0.08)' },
    },
    _disabled: { opacity: '0.6', cursor: 'not-allowed' },
});

/* Footer */
const footerClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    px: '4',
    py: '3',
    borderTop: { base: '1px solid rgba(0,0,0,0.06)', _dark: '1px solid rgba(255,255,255,0.07)' },
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
    _hover: {
        color: 'red.500',
        backgroundColor: { base: 'rgba(239,68,68,0.08)', _dark: 'rgba(239,68,68,0.15)' },
    },
});

const saveButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    px: '5',
    py: '2.5',
    border: 'none',
    borderRadius: 'xl',
    color: 'white',
    fontSize: 'sm',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        transform: 'translateY(-1px)',
        filter: 'brightness(1.1)',
    },
});
