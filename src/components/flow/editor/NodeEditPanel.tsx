'use client';

import { X, Upload, Trash2, Check, Edit3 } from 'lucide-react';
import { useRef, useState, useCallback, useEffect } from 'react';

import { UploadArea } from '@app/components/features/UploadArea';
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
    const { onAddIngredientToRecipe, recipeId: contextRecipeId } = useFlowEditor();
    const [stepType, setStepType] = useState<StepType>(data.stepType);
    const [label, setLabel] = useState(data.label);
    const [description, setDescription] = useState(data.description);
    const [duration, setDuration] = useState<number | undefined>(data.duration);
    const [photoKey, setPhotoKey] = useState<string | undefined>(data.photoKey);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentConfig = STEP_CONFIGS[stepType];
    const Icon = currentConfig.icon;
    const accent = currentConfig.accent;

    // Keep latest values + callbacks in refs so the unmount cleanup can read them
    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    });
    const latestDataRef = useRef({ stepType, label, description, duration, photoKey });
    useEffect(() => {
        latestDataRef.current = { stepType, label, description, duration, photoKey };
    });

    // Flags for the unmount-save guard
    const discardRef = useRef(false); // "Abbrechen" sets this → skip save
    const savedRef = useRef(false); // explicit save already done → skip double-save

    // Auto-save on unmount (handles: click on canvas, switch to another node, etc.)
    useEffect(() => {
        return () => {
            if (!discardRef.current && !savedRef.current) {
                const d = latestDataRef.current;
                onSaveRef.current({
                    stepType: d.stepType,
                    label: d.label,
                    description: d.description,
                    duration: d.duration,
                    ingredientIds: extractIngredientIds(d.description),
                    photoKey: d.photoKey,
                });
            }
        };
    }, []);

    const handleSave = useCallback(() => {
        savedRef.current = true;
        onSave({
            stepType,
            label,
            description,
            duration,
            ingredientIds: extractIngredientIds(description),
            photoKey,
        });
        onClose();
    }, [stepType, label, description, duration, photoKey, onSave, onClose]);

    const handleDiscard = useCallback(() => {
        discardRef.current = true;
        onClose();
    }, [onClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const isStartOrServieren = data.stepType === 'start' || data.stepType === 'servieren';

    return (
        <div className={panelClass} data-tutorial="node-edit-panel">
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
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                        <div className={sectionLabelClass}>Titel</div>
                        <button
                            type="button"
                            onClick={() => setIsEditingTitle((v) => !v)}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1',
                                fontSize: '10px',
                                color: 'text.muted',
                                cursor: 'pointer',
                                px: '1.5',
                                py: '0.5',
                                borderRadius: 'md',
                                border: '1px solid rgba(224,123,83,0.2)',
                                background: 'transparent',
                                _hover: { background: 'rgba(224,123,83,0.08)' },
                            })}
                        >
                            <Edit3 style={{ width: '10px', height: '10px' }} />
                            {isEditingTitle ? 'Standard' : 'Bearbeiten'}
                        </button>
                    </div>
                    {isEditingTitle ? (
                        <input
                            type="text"
                            className={inputClass}
                            style={{ border: `1px solid ${PALETTE.orange}40` }}
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder={`Neuer ${currentConfig.label}-Schritt`}
                        />
                    ) : (
                        <div
                            className={css({
                                px: '3',
                                py: '2',
                                borderRadius: 'xl',
                                fontSize: 'sm',
                                color: 'text.muted',
                                backgroundColor: {
                                    base: 'rgba(0,0,0,0.02)',
                                    _dark: 'rgba(255,255,255,0.04)',
                                },
                            })}
                        >
                            {label && label.trim() !== currentConfig.label
                                ? label
                                : `${currentConfig.label} (Standard)`}
                        </div>
                    )}
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
                        onAddIngredient={onAddIngredientToRecipe}
                    />
                </div>

                {/* ── Photo ── */}
                <div className={fieldClass}>
                    {photoKey ? (
                        <div className={photoPreviewClass}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className={css({ display: 'none' })}
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    formData.append('type', 'step');
                                    const res = await fetch('/api/upload', {
                                        method: 'POST',
                                        body: formData,
                                    });
                                    if (res.ok) {
                                        const { key } = (await res.json()) as { key: string };
                                        setPhotoKey(key);
                                    }
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                            />
                            <img
                                src={getThumbnailUrl(photoKey, '3:1', 460)}
                                alt="Schrittfoto"
                                className={css({
                                    width: '100%',
                                    height: '90px',
                                    objectFit: 'cover',
                                    display: 'block',
                                })}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className={photoPreviewActionsClass}>
                                <button
                                    type="button"
                                    className={photoActionButtonClass}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload style={{ width: 11, height: 11 }} />
                                    Ersetzen
                                </button>
                                <button
                                    type="button"
                                    className={photoActionButtonClass}
                                    onClick={() => setPhotoKey(undefined)}
                                >
                                    <X style={{ width: 11, height: 11 }} />
                                    Entfernen
                                </button>
                            </div>
                        </div>
                    ) : (
                        <UploadArea
                            uploadType="step"
                            recipeId={contextRecipeId}
                            stepId={_nodeId}
                            label="Schritt-Foto"
                            onUploaded={setPhotoKey}
                        />
                    )}
                </div>
            </div>

            {/* ── Footer ── */}
            <div className={footerClass}>
                <div
                    className={css({
                        display: 'flex',
                        gap: '2',
                        alignItems: 'center',
                        width: '100%',
                    })}
                >
                    {canDelete && (
                        <button type="button" className={deleteButtonClass} onClick={onDelete}>
                            <Trash2 style={{ width: 14, height: 14 }} />
                            Löschen
                        </button>
                    )}
                    <button type="button" className={discardButtonClass} onClick={handleDiscard}>
                        Abbrechen
                    </button>
                </div>
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
    );
}

/* ── styles ──────────────────────────────────────────────── */

const panelClass = css({
    width: '100%',
    height: '100%',
    backgroundColor: 'surface',
    borderRadius: 'xl',
    border: '1px solid rgba(224,123,83,0.4)',
    boxShadow: {
        base: '0 4px 16px rgba(0,0,0,0.08)',
        _dark: '0 4px 16px rgba(0,0,0,0.3)',
    },
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.15s ease-out',
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

/* Photo preview (inline in content area) */
const photoPreviewClass = css({
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'xl',
    overflow: 'hidden',
    border: {
        base: '1.5px dashed rgba(0,0,0,0.12)',
        _dark: '1.5px dashed rgba(255,255,255,0.12)',
    },
});

const photoPreviewActionsClass = css({
    display: 'flex',
    borderTop: {
        base: '1px solid rgba(0,0,0,0.07)',
        _dark: '1px solid rgba(255,255,255,0.08)',
    },
});

const photoActionButtonClass = css({
    display: 'flex',
    flex: '1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5',
    py: '2',
    fontSize: '11px',
    fontWeight: '500',
    color: 'text.muted',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        color: 'brand.primary',
        backgroundColor: { base: 'rgba(224,123,83,0.04)', _dark: 'rgba(224,123,83,0.08)' },
    },
    '&:not(:first-child)': {
        borderLeft: {
            base: '1px solid rgba(0,0,0,0.07)',
            _dark: '1px solid rgba(255,255,255,0.08)',
        },
    },
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

/* Footer */
const footerClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
    px: '4',
    py: '3',
    borderTop: { base: '1px solid rgba(0,0,0,0.06)', _dark: '1px solid rgba(255,255,255,0.07)' },
});

const deleteButtonClass = css({
    display: 'flex',
    flex: '1',
    alignItems: 'center',
    justifyContent: 'center',
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

const discardButtonClass = css({
    display: 'flex',
    flex: '1',
    alignItems: 'center',
    justifyContent: 'center',
    px: '4',
    py: '2.5',
    border: { base: '1px solid rgba(0,0,0,0.1)', _dark: '1px solid rgba(255,255,255,0.1)' },
    borderRadius: 'xl',
    backgroundColor: 'transparent',
    color: 'text.muted',
    fontSize: 'sm',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        backgroundColor: { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(255,255,255,0.08)' },
        color: 'text',
    },
});

const saveButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5',
    width: '100%',
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
