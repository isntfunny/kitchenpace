'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';

import type { AIAnalysisResult, ApplySelection } from '@app/lib/importer/ai-text-analysis';
import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

/* -- Label maps ------------------------------------------------ */

const DIFFICULTY_LABEL: Record<string, string> = {
    EASY: 'Einfach',
    MEDIUM: 'Mittel',
    HARD: 'Schwer',
};

const CATEGORY_LABEL: Record<string, string> = {
    hauptgericht: 'Hauptgericht',
    beilage: 'Beilage',
    backen: 'Backen',
    dessert: 'Dessert',
    fruehstueck: 'Frühstück',
    getraenk: 'Getränk',
    vorspeise: 'Vorspeise',
    salat: 'Salat',
};

/* -- ReviewPhase ----------------------------------------------- */

interface ReviewPhaseProps {
    result: AIAnalysisResult;
    apply: ApplySelection;
    onToggle: (field: keyof ApplySelection) => void;
}

export function ReviewPhase({ result, apply, onToggle }: ReviewPhaseProps) {
    const rows: Array<{
        field: keyof ApplySelection;
        label: string;
        value: string;
        subtle?: boolean;
    }> = [
        {
            field: 'title',
            label: 'Titel',
            value: result.title || '—',
        },
        {
            field: 'description',
            label: 'Beschreibung',
            value: result.description
                ? result.description.length > 120
                    ? result.description.slice(0, 120) + '...'
                    : result.description
                : '—',
            subtle: true,
        },
        {
            field: 'category',
            label: 'Kategorie',
            value: result.categoryIds?.length
                ? result.categoryIds.map((s) => CATEGORY_LABEL[s] ?? s).join(', ')
                : '—',
        },
        {
            field: 'tags',
            label: 'Tags',
            value: result.tags && result.tags.length > 0 ? result.tags.join(', ') : 'Keine erkannt',
        },
        {
            field: 'prepTime',
            label: 'Vorbereitungszeit',
            value: (result.prepTime ?? 0) > 0 ? `${result.prepTime} Min` : '—',
        },
        {
            field: 'cookTime',
            label: 'Kochzeit',
            value: (result.cookTime ?? 0) > 0 ? `${result.cookTime} Min` : '—',
        },
        {
            field: 'servings',
            label: 'Portionen',
            value: result.servings ? String(result.servings) : '—',
        },
        {
            field: 'difficulty',
            label: 'Schwierigkeitsgrad',
            value: result.difficulty
                ? (DIFFICULTY_LABEL[result.difficulty] ?? result.difficulty)
                : '—',
        },
        {
            field: 'ingredients',
            label: 'Zutaten',
            value:
                result.ingredients && result.ingredients.length > 0
                    ? `${result.ingredients.length} Zutaten erkannt`
                    : 'Keine erkannt',
        },
    ];

    return (
        <div>
            <p
                className={css({
                    margin: '0 0 16px',
                    fontSize: '13px',
                    color: 'text.muted',
                    lineHeight: 1.6,
                })}
            >
                Die KI hat folgende Daten erkannt. Der Flow-Diagram wird immer übernommen. Wähle
                aus, welche weiteren Felder du in das Formular übernehmen möchtest.
            </p>

            {/* Always-applied note */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(34,197,94,0.07)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    marginBottom: '16px',
                }}
            >
                <CheckCircle2
                    style={{ width: '15px', height: '15px', color: '#22c55e', flexShrink: 0 }}
                />
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>
                    Flow-Diagramm ({result.flowNodes?.length ?? 0} Schritte,{' '}
                    {result.flowEdges?.length ?? 0} Verbindungen) wird immer übernommen
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {rows.map(({ field, label, value, subtle }) => {
                    const checked = apply[field];
                    return (
                        <button
                            key={field}
                            type="button"
                            onClick={() => onToggle(field)}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: checked ? '1.5px solid rgba(224,123,83,0.4)' : undefined,
                                backgroundColor: checked ? 'rgba(224,123,83,0.05)' : undefined,
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                transition: 'all 0.15s ease',
                            }}
                            className={
                                !checked
                                    ? css({
                                          border: '1.5px solid',
                                          borderColor: 'border.muted',
                                          backgroundColor: 'surface.mutedXLight',
                                      })
                                    : undefined
                            }
                        >
                            {/* Checkbox */}
                            <div
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '5px',
                                    flexShrink: 0,
                                    marginTop: '1px',
                                    backgroundColor: checked ? PALETTE.orange : undefined,
                                    border: checked ? `1.5px solid ${PALETTE.orange}` : undefined,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                }}
                                className={
                                    !checked
                                        ? css({
                                              backgroundColor: 'checkbox.bg',
                                              border: '1.5px solid',
                                              borderColor: 'checkbox.border',
                                          })
                                        : undefined
                                }
                            >
                                {checked && (
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <path
                                            d="M2 5l2.5 2.5L8 3"
                                            stroke="white"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: checked ? PALETTE.orange : undefined,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '2px',
                                        transition: 'color 0.15s ease',
                                    }}
                                    className={!checked ? css({ color: 'text.light' }) : undefined}
                                >
                                    {label}
                                </div>
                                <div
                                    style={{
                                        fontSize: '13px',
                                        lineHeight: 1.4,
                                        wordBreak: 'break-word',
                                        transition: 'color 0.15s ease',
                                    }}
                                    className={css({
                                        color: checked
                                            ? subtle
                                                ? 'text.muted'
                                                : 'text'
                                            : 'text.light',
                                    })}
                                >
                                    {value}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* -- DonePhase ------------------------------------------------- */

export function DonePhase({ result }: { result: AIAnalysisResult | null }) {
    const stats = result
        ? [
              { label: 'Schritte erkannt', value: String(result.flowNodes?.length || 0) },
              { label: 'Zutaten verknüpft', value: String(result.ingredients?.length || 0) },
              { label: 'Verbindungen', value: String(result.flowEdges?.length || 0) },
          ]
        : [
              { label: 'Schritte erkannt', value: '7' },
              { label: 'Zutaten verknüpft', value: '12' },
              { label: 'Verbindungen', value: '8' },
          ];

    return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div
                style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    border: '2px solid rgba(34,197,94,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                }}
            >
                <CheckCircle2 style={{ width: '40px', height: '40px', color: '#22c55e' }} />
            </div>
            <h3
                className={css({
                    margin: '0 0 8px',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'text',
                })}
            >
                Flow wurde erstellt!
            </h3>
            <p
                className={css({
                    margin: '0 0 24px',
                    fontSize: '13px',
                    color: 'text.muted',
                    maxWidth: '360px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    lineHeight: 1.6,
                })}
            >
                Dein Rezept wurde erfolgreich in einen visuellen Flow umgewandelt. Du kannst ihn
                jetzt bearbeiten und verfeinern.
            </p>
            {/* Stats */}
            <div
                style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                }}
            >
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        style={{
                            backgroundColor: 'rgba(224,123,83,0.07)',
                            borderRadius: '10px',
                            padding: '10px 16px',
                            minWidth: '100px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '22px',
                                fontWeight: 800,
                                color: PALETTE.orange,
                                lineHeight: 1,
                            }}
                        >
                            {stat.value}
                        </div>
                        <div
                            className={css({
                                fontSize: '11px',
                                color: 'text.muted',
                                marginTop: '4px',
                            })}
                        >
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* -- ErrorPhase ------------------------------------------------ */

export function ErrorPhase({ error }: { error: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div
                style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    border: '2px solid rgba(239,68,68,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                }}
            >
                <AlertCircle style={{ width: '40px', height: '40px', color: '#ef4444' }} />
            </div>
            <h3
                className={css({
                    margin: '0 0 8px',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'text',
                })}
            >
                Fehler bei der Analyse
            </h3>
            <p
                className={css({
                    margin: '0 0 24px',
                    fontSize: '13px',
                    color: 'text.muted',
                    maxWidth: '360px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    lineHeight: 1.6,
                })}
            >
                {error}
            </p>
        </div>
    );
}
