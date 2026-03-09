'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock, X } from 'lucide-react';
import { memo, useMemo, useCallback } from 'react';

import { PALETTE } from '@app/lib/palette';
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

function RecipeNodeComponent({ id, data, selected }: NodeProps<RecipeFlowNode>) {
    const {
        availableIngredients,
        onSelectNode,
        onDeleteNode,
        nodeOutgoingEdges,
        nodeIncomingEdges,
    } = useFlowEditor();
    const config = getStepConfig(data.stepType);

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

    const handleClick = useCallback(() => {
        onSelectNode(id);
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

    return (
        <div className={nodeWrapperClass}>
            {showAddBefore && <AddNodeButton nodeId={id} side="target" />}

            <div
                className={cx(nodeCardClass, selected && nodeSelectedClass, 'group')}
                style={{ backgroundImage: config.gradient, backgroundColor: config.color }}
                onClick={handleClick}
            >
                {config.canHaveIncomingEdge && (
                    <>
                        <Handle type="target" position={Position.Left} style={handleStyle} />
                        <Handle
                            id="top-in"
                            type="target"
                            position={Position.Top}
                            style={handleStyleSecondary}
                        />
                        <Handle
                            id="bottom-in"
                            type="target"
                            position={Position.Bottom}
                            style={handleStyleSecondary}
                        />
                    </>
                )}

                <div className={css({ p: '2.5' })}>
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
                        <span className={typeBadgeClass}>
                            <Icon className={css({ width: '12px', height: '12px' })} />
                            {config.label}
                        </span>
                        {data.duration != null && data.duration > 0 && (
                            <span className={durationBadgeClass}>
                                <Clock className={css({ width: '10px', height: '10px' })} />
                                {data.duration} Min.
                            </span>
                        )}
                    </div>

                    <div className={titleClass}>{data.label || 'Unbenannter Schritt'}</div>

                    {renderedDescription && (
                        <div className={descriptionClass}>{renderedDescription}</div>
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

                {data.photoUrl && (
                    <div
                        className={css({
                            overflow: 'hidden',
                            borderBottomLeftRadius: 'xl',
                            borderBottomRightRadius: 'xl',
                        })}
                    >
                        <img
                            src={data.photoUrl}
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
                    <>
                        <Handle type="source" position={Position.Right} style={handleStyle} />
                        <Handle
                            id="top-out"
                            type="source"
                            position={Position.Top}
                            style={handleStyleSecondary}
                        />
                        <Handle
                            id="bottom-out"
                            type="source"
                            position={Position.Bottom}
                            style={handleStyleSecondary}
                        />
                    </>
                )}
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

const titleClass = css({
    fontSize: 'sm',
    fontWeight: '700',
    color: 'text',
    mt: '1.5',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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

const handleStyle: React.CSSProperties = {
    background: PALETTE.orange,
    width: 8,
    height: 8,
    border: '2px solid white',
};

const handleStyleSecondary: React.CSSProperties = {
    background: '#c0a090',
    width: 6,
    height: 6,
    border: '1.5px solid white',
    opacity: 0.5,
};
