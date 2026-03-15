'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock, GitBranch, X } from 'lucide-react';
import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';

import { StepTypePicker } from '@app/components/lane-wizard/StepTypePicker';
import {
    dispatchRecipeTutorialEvent,
    RECIPE_TUTORIAL_EVENTS,
} from '@app/components/recipe/tutorial/shared';
import { useIsDark } from '@app/lib/darkMode';
import { PALETTE } from '@app/lib/palette';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';

import { css, cx } from 'styled-system/css';

import { AddNodeButton } from './AddNodeButton';
import type { RecipeFlowNode } from './editorTypes';
import { useFlowEditor } from './FlowEditorContext';
import { getStepConfig } from './stepConfig';

const MENTION_REGEX = /@\[.*?(?:\|.*?)?\]\((.*?)\)/g;
const MENTION_FULL_REGEX = /@\[(.*?)(?:\|(.*?))?\]\((.*?)\)/g;

/** Render description with @[Name](id) or @[Name|override](id) as inline highlighted chips */
function renderDescription(
    raw: string,
    availableIngredients: import('@app/components/recipe/RecipeForm/data').AddedIngredient[],
): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    MENTION_FULL_REGEX.lastIndex = 0;

    while ((match = MENTION_FULL_REGEX.exec(raw)) !== null) {
        if (match.index > lastIndex) {
            parts.push(raw.slice(lastIndex, match.index));
        }
        const [, name, override, id] = match;
        const ing = availableIngredients.find((i) => i.id === id);
        const amountStr = override
            ? ` (${override})`
            : ing && (ing.amount || ing.unit)
              ? ` (${[ing.amount, ing.unit].filter(Boolean).join(' ')})`
              : '';
        parts.push(
            <span
                key={match.index}
                style={{
                    display: 'inline',
                    backgroundColor: 'rgba(224,123,83,0.18)',
                    color: '#c45e30',
                    borderRadius: '4px',
                    padding: '0 3px',
                    fontWeight: 600,
                    fontSize: 'inherit',
                }}
            >
                {name}
                {amountStr}
            </span>,
        );
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < raw.length) {
        parts.push(raw.slice(lastIndex));
    }
    return parts;
}

/** Small (+) button below a node that forks a new parallel branch */
function ForkButton({
    nodeId,
    tutorialTarget = false,
}: {
    nodeId: string;
    tutorialTarget?: boolean;
}) {
    const { onForkNodeAfter } = useFlowEditor();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    if (!onForkNodeAfter) return null;

    return (
        <div
            ref={wrapperRef}
            className={forkWrapperClass}
            style={open ? { opacity: 1, pointerEvents: 'auto' } : undefined}
        >
            <button
                type="button"
                className={forkButtonClass}
                data-tutorial={tutorialTarget ? 'flow-branch-button' : undefined}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => {
                        if (!v)
                            dispatchRecipeTutorialEvent(RECIPE_TUTORIAL_EVENTS.branchButtonClicked);
                        return !v;
                    });
                }}
                title="Parallelen Schritt hinzufügen"
            >
                <GitBranch className={css({ width: '10px', height: '10px' })} />
            </button>

            {open && (
                <div
                    className={css({
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: '50',
                    })}
                    data-tutorial="flow-palette"
                    onClick={(e) => e.stopPropagation()}
                >
                    <StepTypePicker
                        title="Was passiert parallel?"
                        onSelect={(type) => {
                            setOpen(false);
                            onForkNodeAfter(nodeId, type);
                        }}
                        onClose={() => setOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}

function RecipeNodeComponent({ id, data, selected }: NodeProps<RecipeFlowNode>) {
    const {
        availableIngredients,
        onSelectNode,
        onDeleteNode,
        nodeOutgoingEdges,
        nodeIncomingEdges,
        validationIssuesByNode,
    } = useFlowEditor();
    const config = getStepConfig(data.stepType);
    const isDark = useIsDark();

    const ingredientChips = useMemo(() => {
        if (!data.description) return [];
        const chips: { id: string; label: string }[] = [];
        const seen = new Set<string>();
        for (const match of data.description.matchAll(MENTION_REGEX)) {
            const ingredientId = match[1];
            if (seen.has(ingredientId)) continue;
            seen.add(ingredientId);
            const ingredient = availableIngredients.find((ing) => ing.id === ingredientId);
            if (ingredient) {
                chips.push({
                    id: ingredientId,
                    label: `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`,
                });
            }
        }
        return chips;
    }, [data.description, availableIngredients]);

    const renderedDescription = useMemo(
        () => (data.description ? renderDescription(data.description, availableIngredients) : null),
        [data.description, availableIngredients],
    );

    const canDelete = data.stepType !== 'start' && data.stepType !== 'servieren';

    const validationIssues = validationIssuesByNode.get(id) ?? [];
    const hasValidationError = validationIssues.some((issue) => issue.severity === 'error');
    const hasValidationNotice = validationIssues.length > 0 && !hasValidationError;
    const validationIndicatorTitle = validationIssues.map((issue) => issue.message).join(' · ');
    const topValidationIssue = validationIssues[0] ?? null;

    const handleClick = useCallback(() => {
        onSelectNode(id);
        dispatchRecipeTutorialEvent(RECIPE_TUTORIAL_EVENTS.nodeSelected);
    }, [id, onSelectNode]);

    const handleDeleteClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onDeleteNode(id);
        },
        [id, onDeleteNode],
    );

    const Icon = config.icon;
    const outgoingCount = nodeOutgoingEdges.get(id) ?? 0;
    const incomingCount = nodeIncomingEdges.get(id) ?? 0;
    const showAddAfter = config.canHaveOutgoingEdge && outgoingCount === 0;
    const showAddBefore =
        config.canHaveIncomingEdge && incomingCount === 0 && data.stepType !== 'start';
    const showFork = config.canHaveOutgoingEdge;

    return (
        <div className={nodeWrapperClass}>
            {showAddBefore && <AddNodeButton nodeId={id} side="target" />}

            <div
                className={cx(
                    nodeCardClass,
                    selected && nodeSelectedClass,
                    'group',
                    data.stepType === 'start' && startNodeClass,
                    data.stepType === 'servieren' && finishNodeClass,
                    hasValidationError && nodeErrorClass,
                    hasValidationNotice && nodeWarningClass,
                )}
                style={{
                    backgroundImage: isDark ? config.darkGradient : config.gradient,
                    backgroundColor: isDark ? config.darkColor : config.color,
                }}
                onClick={handleClick}
                data-tutorial={
                    data.stepType === 'start'
                        ? 'flow-start-node'
                        : data.stepType === 'servieren'
                          ? 'flow-end-node'
                          : undefined
                }
            >
                {data.stepType === 'start' && <div className={startBadgeClass}>Start</div>}
                {data.stepType === 'servieren' && <div className={finishBadgeClass}>Finish</div>}
                {validationIssues.length > 0 && (
                    <div
                        className={cx(
                            validationBadgeClass,
                            hasValidationError
                                ? validationBadgeErrorClass
                                : validationBadgeWarningClass,
                        )}
                        title={validationIndicatorTitle || undefined}
                    >
                        <span>{validationIssues.length}</span>
                        <span className={validationBadgeLabelClass}>
                            {hasValidationError ? 'Blocker' : 'Hinweis'}
                        </span>
                    </div>
                )}
                {config.canHaveIncomingEdge && (
                    <Handle
                        type="target"
                        position={Position.Left}
                        style={handleStyle}
                        {...(data.stepType === 'servieren'
                            ? { 'data-tutorial-servieren-handle': '' }
                            : {})}
                    />
                )}

                <div className={css({ p: '2.5' })}>
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
                        <span className={typeBadgeClass}>
                            <Icon className={css({ width: '12px', height: '12px' })} />
                            {data.label && data.label.trim() !== config.label
                                ? data.label
                                : config.label}
                        </span>
                        {data.duration != null && data.duration > 0 && (
                            <span className={durationBadgeClass}>
                                <Clock className={css({ width: '10px', height: '10px' })} />
                                {data.duration} Min.
                            </span>
                        )}
                    </div>

                    {renderedDescription ? (
                        <div className={descriptionClass}>{renderedDescription}</div>
                    ) : data.stepType === 'start' ? (
                        <div className={placeholderDescClass}>
                            Alle Zutaten & Werkzeuge bereitlegen
                        </div>
                    ) : null}

                    {topValidationIssue && (
                        <div
                            className={cx(
                                validationIssuePreviewClass,
                                hasValidationError
                                    ? validationIssuePreviewErrorClass
                                    : validationIssuePreviewWarningClass,
                            )}
                            title={topValidationIssue.hint ?? topValidationIssue.message}
                        >
                            <strong>{topValidationIssue.title}</strong>
                            <span>{topValidationIssue.message}</span>
                        </div>
                    )}

                    {ingredientChips.length > 0 && (
                        <div className={ingredientListClass}>
                            <span className={ingredientListLabelClass}>Zutaten:</span>
                            <div className={ingredientChipsClass}>
                                {ingredientChips.map((chip) => (
                                    <span key={chip.id} className={ingredientChipClass}>
                                        {chip.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {data.photoKey && (
                    <div
                        className={css({
                            overflow: 'hidden',
                            borderBottomLeftRadius: 'xl',
                            borderBottomRightRadius: 'xl',
                        })}
                    >
                        <img
                            src={getThumbnailUrl(data.photoKey, '3:1', 320)}
                            alt=""
                            onError={(e) => {
                                const wrapper = (e.target as HTMLImageElement).parentElement;
                                if (wrapper) wrapper.style.display = 'none';
                            }}
                            className={css({
                                width: '100%',
                                height: '72px',
                                objectFit: 'cover',
                                display: 'block',
                            })}
                        />
                    </div>
                )}

                {canDelete && (
                    <button type="button" className={deleteButtonClass} onClick={handleDeleteClick}>
                        <X className={css({ width: '12px', height: '12px' })} />
                    </button>
                )}

                {config.canHaveOutgoingEdge && (
                    <Handle
                        type="source"
                        position={Position.Right}
                        style={handleStyle}
                        data-tutorial-unconnected={outgoingCount === 0 ? '' : undefined}
                    />
                )}
                {showFork && <ForkButton nodeId={id} tutorialTarget={canDelete} />}
            </div>

            {showAddAfter && <AddNodeButton nodeId={id} side="source" />}
        </div>
    );
}

export const RecipeNode = memo(RecipeNodeComponent);

/* ── styles ──────────────────────────────────────────────── */

const nodeWrapperClass = css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '8px',
});

const nodeCardClass = css({
    width: '220px',
    borderRadius: 'xl',
    border: '2px solid transparent',
    boxShadow: { base: '0 2px 8px rgba(0,0,0,0.07)', _dark: '0 2px 8px rgba(0,0,0,0.25)' },
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    cursor: 'pointer',
    position: 'relative',
    fontFamily: 'body',
    overflow: 'visible',
    _hover: {
        boxShadow: {
            base: '0 4px 16px rgba(224,123,83,0.2)',
            _dark: '0 4px 16px rgba(224,123,83,0.3)',
        },
    },
});

const nodeSelectedClass = css({
    borderColor: 'brand.primary',
    boxShadow: {
        base: '0 4px 16px rgba(224,123,83,0.2)',
        _dark: '0 4px 16px rgba(224,123,83,0.3)',
    },
});

const nodeErrorClass = css({
    borderColor: { base: 'rgba(239,68,68,0.6)', _dark: 'rgba(248,113,113,0.5)' },
    boxShadow: { base: '0 0 0 3px rgba(239,68,68,0.25)', _dark: '0 0 0 3px rgba(248,113,113,0.2)' },
});

const nodeWarningClass = css({
    borderColor: { base: 'rgba(245,158,11,0.6)', _dark: 'rgba(251,191,36,0.5)' },
    boxShadow: { base: '0 0 0 3px rgba(245,158,11,0.25)', _dark: '0 0 0 3px rgba(251,191,36,0.2)' },
});

const typeBadgeClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    px: '1.5',
    py: '0.5',
    borderRadius: 'full',
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: { base: 'rgba(255,255,255,0.6)', _dark: 'rgba(255,255,255,0.15)' },
});

const descriptionClass = css({
    fontSize: 'xs',
    color: 'text.muted',
    mt: '0.5',
    lineHeight: '1.4',
    maxHeight: '2.8em',
    overflow: 'hidden',
    lineClamp: '2',
});

const placeholderDescClass = css({
    fontSize: 'xs',
    color: 'text.muted',
    mt: '0.5',
    lineHeight: '1.4',
    opacity: '0.55',
    fontStyle: 'italic',
});

const durationBadgeClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5',
    fontSize: '10px',
    color: 'text.muted',
    ml: 'auto',
});

const deleteButtonClass = css({
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'red.500',
    color: 'white',
    borderRadius: 'full',
    cursor: 'pointer',
    zIndex: '10',
    border: 'none',
    opacity: '0',
    transition: 'opacity 0.15s ease',
    _groupHover: { opacity: '1' },
});

const ingredientListClass = css({
    mt: '1.5',
    pt: '1.5',
    borderTop: { base: '1px solid rgba(0,0,0,0.06)', _dark: '1px solid rgba(255,255,255,0.08)' },
});

const ingredientListLabelClass = css({
    fontSize: '9px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'text.muted',
    mb: '0.5',
    display: 'block',
});

const ingredientChipsClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1',
});

const validationBadgeClass = css({
    position: 'absolute',
    top: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    minWidth: '20px',
    minHeight: '20px',
    paddingInline: '1.5',
    paddingBlock: '0.5',
    borderRadius: 'full',
    color: 'white',
    fontSize: '9px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    zIndex: '1',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.15s ease',
    _groupHover: {
        opacity: '0',
    },
});

const validationBadgeErrorClass = css({
    backgroundColor: 'rgba(239,68,68,0.9)',
});

const validationBadgeWarningClass = css({
    backgroundColor: 'rgba(245,158,11,0.92)',
});

const validationBadgeLabelClass = css({
    fontSize: '9px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
});

const validationIssuePreviewClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5',
    mt: '1.5',
    py: '2',
    px: '2.5',
    borderRadius: 'lg',
    fontSize: '11px',
    lineHeight: '1.35',
});

const validationIssuePreviewErrorClass = css({
    backgroundColor: { base: 'rgba(239,68,68,0.12)', _dark: 'rgba(239,68,68,0.15)' },
    color: { base: 'rgba(127,29,29,0.96)', _dark: 'rgba(252,165,165,0.95)' },
});

const validationIssuePreviewWarningClass = css({
    backgroundColor: { base: 'rgba(245,158,11,0.12)', _dark: 'rgba(245,158,11,0.15)' },
    color: { base: 'rgba(120,53,15,0.96)', _dark: 'rgba(253,224,71,0.95)' },
});

const ingredientChipClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    px: '1.5',
    py: '0.5',
    backgroundColor: { base: 'rgba(224,123,83,0.12)', _dark: 'rgba(224,123,83,0.17)' },
    borderRadius: 'full',
    fontSize: '9px',
    fontWeight: '600',
    color: 'palette.orange',
});

/* Fork button — absolutely positioned below the card, no impact on measured node height */
const forkWrapperClass = css({
    position: 'absolute',
    bottom: '0',
    left: '50%',
    transform: 'translate(-50%, 50%)',
    display: 'flex',
    justifyContent: 'center',
    zIndex: '10',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 0.15s ease',
    _groupHover: {
        opacity: '1',
        pointerEvents: 'auto',
    },
});

const forkButtonClass = css({
    width: '22px',
    height: '22px',
    borderRadius: 'full',
    border: {
        base: '1.5px dashed rgba(224,123,83,0.45)',
        _dark: '1.5px dashed rgba(224,123,83,0.35)',
    },
    backgroundColor: {
        base: 'rgba(255,255,255,0.8)',
        _dark: 'rgba(26,29,33,0.8)',
    },
    color: { base: 'rgba(224,123,83,0.7)', _dark: 'rgba(224,123,83,0.6)' },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.15)' },
        borderColor: { base: 'rgba(224,123,83,0.7)', _dark: 'rgba(224,123,83,0.55)' },
        color: 'brand.primary',
        transform: 'scale(1.1)',
    },
});

/* Start node styling - green glow effect */
const startNodeClass = css({
    boxShadow: {
        base: '0 0 0 3px rgba(39,174,96,0.4), 0 4px 16px rgba(39,174,96,0.3)',
        _dark: '0 0 0 3px rgba(39,174,96,0.5), 0 4px 16px rgba(39,174,96,0.4)',
    },
});

const startBadgeClass = css({
    position: 'absolute',
    top: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    px: '2',
    py: '0.5',
    borderRadius: 'full',
    fontSize: '9px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: '#27ae60',
    color: 'white',
    boxShadow: '0 2px 8px rgba(39,174,96,0.4)',
});

/* Finish/Servieren node styling - red glow effect (mirrors startNodeClass) */
const finishNodeClass = css({
    boxShadow: {
        base: '0 0 0 3px rgba(231,76,60,0.4), 0 4px 16px rgba(231,76,60,0.3)',
        _dark: '0 0 0 3px rgba(231,76,60,0.5), 0 4px 16px rgba(231,76,60,0.4)',
    },
});

const finishBadgeClass = css({
    position: 'absolute',
    top: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    px: '2',
    py: '0.5',
    borderRadius: 'full',
    fontSize: '9px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: '#e74c3c',
    color: 'white',
    boxShadow: '0 2px 8px rgba(231,76,60,0.4)',
});

const handleStyle: React.CSSProperties = {
    background: PALETTE.orange,
    width: 12,
    height: 12,
    border: '2px solid white',
};
