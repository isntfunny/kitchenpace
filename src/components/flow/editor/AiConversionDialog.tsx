'use client';

import { Sparkles, ChefHat, CheckCircle2, X, Wand2, AlertCircle, Check } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState, useRef, useEffect } from 'react';

import { analyzeRecipeText, type AIAnalysisResult, type ApplySelection } from '@app/lib/importer/ai-text-analysis';
import { PALETTE } from '@app/lib/palette';

interface AiConversionDialogProps {
    open: boolean;
    onClose: () => void;
    /** Called when the user confirms applying the AI result */
    onResult?: (result: AIAnalysisResult, apply: ApplySelection) => void;
}

type Phase = 'input' | 'processing' | 'review' | 'done' | 'error';

const PROCESSING_STEPS = [
    'Rezepttext wird analysiert...',
    'Zutaten werden erkannt...',
    'Zubereitungsschritte werden identifiziert...',
    'Flow-Struktur wird generiert...',
    'Verbindungen werden optimiert...',
];

const DEFAULT_APPLY: ApplySelection = {
    title: true,
    description: true,
    category: true,
    tags: true,
    prepTime: true,
    cookTime: true,
    servings: true,
    difficulty: true,
    ingredients: true,
};

export function AiConversionDialog({ open, onClose, onResult }: AiConversionDialogProps) {
    const [text, setText] = useState('');
    const [phase, setPhase] = useState<Phase>('input');
    const [stepIndex, setStepIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AIAnalysisResult | null>(null);
    const [apply, setApply] = useState<ApplySelection>(DEFAULT_APPLY);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    async function startConversion() {
        if (!text.trim()) return;

        setPhase('processing');
        setStepIndex(0);
        setError(null);

        // Start animation
        runSteps(0);

        try {
            const analysisResult = await analyzeRecipeText(text.trim());

            if (analysisResult.success) {
                setResult(analysisResult.data);
                setApply(DEFAULT_APPLY);
                setPhase('review');
            } else {
                setError(analysisResult.error?.message || 'Analyse fehlgeschlagen');
                setPhase('error');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
            setPhase('error');
        }
    }

    function runSteps(idx: number) {
        if (idx >= PROCESSING_STEPS.length) {
            return;
        }
        setStepIndex(idx);
        timerRef.current = setTimeout(() => runSteps(idx + 1), 800);
    }

    function handleConfirmReview() {
        if (!result) return;
        onResult?.(result, apply);
        setPhase('done');
    }

    function handleClose() {
        if (timerRef.current) clearTimeout(timerRef.current);
        setPhase('input');
        setStepIndex(0);
        setText('');
        setError(null);
        setResult(null);
        setApply(DEFAULT_APPLY);
        onClose();
    }

    function toggleApply(field: keyof ApplySelection) {
        setApply((prev) => ({ ...prev, [field]: !prev[field] }));
    }

    return (
        <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
            <Dialog.Portal>
                <Dialog.Overlay
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9000,
                        animation: 'fadeIn 0.2s ease',
                    }}
                />
                <Dialog.Content
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 9001,
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
                        width: phase === 'review' ? 'min(640px, 95vw)' : 'min(580px, 95vw)',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        transition: 'width 0.2s ease',
                    }}
                    onPointerDownOutside={(e) => phase === 'processing' && e.preventDefault()}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '20px 24px 16px',
                            borderBottom: '1px solid rgba(224,123,83,0.15)',
                            background:
                                'linear-gradient(135deg, rgba(224,123,83,0.06) 0%, rgba(248,181,0,0.06) 100%)',
                        }}
                    >
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Sparkles style={{ width: '18px', height: '18px', color: 'white' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Dialog.Title
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: '#2d3436',
                                    lineHeight: 1.2,
                                }}
                            >
                                {phase === 'review'
                                    ? 'Erkannte Daten übernehmen'
                                    : 'Lass KI die Arbeit übernehmen'}
                            </Dialog.Title>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '12px',
                                    color: '#636e72',
                                    marginTop: '2px',
                                }}
                            >
                                {phase === 'review'
                                    ? 'Wähle aus, welche Felder du übernehmen möchtest'
                                    : 'Füge ein klassisches Rezept ein — KI wandelt es in einen Flow um'}
                            </p>
                        </div>
                        {phase !== 'processing' && (
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: 'rgba(0,0,0,0.06)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <X
                                        style={{ width: '14px', height: '14px', color: '#636e72' }}
                                    />
                                </button>
                            </Dialog.Close>
                        )}
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                        {phase === 'input' && <InputPhase text={text} onChange={setText} />}
                        {phase === 'processing' && <ProcessingPhase stepIndex={stepIndex} />}
                        {phase === 'review' && result && (
                            <ReviewPhase result={result} apply={apply} onToggle={toggleApply} />
                        )}
                        {phase === 'done' && <DonePhase result={result} />}
                        {phase === 'error' && <ErrorPhase error={error || ''} />}
                    </div>

                    {/* Footer */}
                    {phase === 'input' && (
                        <div
                            style={{
                                padding: '16px 24px',
                                borderTop: '1px solid rgba(224,123,83,0.12)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px',
                            }}
                        >
                            <button
                                type="button"
                                onClick={handleClose}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '999px',
                                    border: '1.5px solid rgba(224,123,83,0.3)',
                                    backgroundColor: 'transparent',
                                    color: PALETTE.orange,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}
                            >
                                Abbrechen
                            </button>
                            <button
                                type="button"
                                disabled={!text.trim()}
                                onClick={startConversion}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '999px',
                                    border: 'none',
                                    background: text.trim()
                                        ? `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`
                                        : 'rgba(0,0,0,0.1)',
                                    color: text.trim() ? 'white' : '#b2bec3',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: text.trim() ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <Wand2 style={{ width: '14px', height: '14px' }} />
                                Jetzt konvertieren
                            </button>
                        </div>
                    )}
                    {phase === 'review' && (
                        <div
                            style={{
                                padding: '16px 24px',
                                borderTop: '1px solid rgba(224,123,83,0.12)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '10px',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setPhase('input')}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '999px',
                                    border: '1.5px solid rgba(224,123,83,0.3)',
                                    backgroundColor: 'transparent',
                                    color: PALETTE.orange,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}
                            >
                                Zurück
                            </button>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!result) return;
                                        onResult?.(result, {
                                            title: false,
                                            description: false,
                                            category: false,
                                            tags: false,
                                            prepTime: false,
                                            cookTime: false,
                                            servings: false,
                                            difficulty: false,
                                            ingredients: false,
                                        });
                                        setPhase('done');
                                    }}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '999px',
                                        border: '1.5px solid rgba(0,0,0,0.12)',
                                        backgroundColor: 'transparent',
                                        color: '#636e72',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Nur Flow
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmReview}
                                    style={{
                                        padding: '8px 20px',
                                        borderRadius: '999px',
                                        border: 'none',
                                        background:
                                            `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`,
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 12px rgba(224,123,83,0.3)',
                                    }}
                                >
                                    <Check style={{ width: '14px', height: '14px' }} />
                                    Auswahl übernehmen
                                </button>
                            </div>
                        </div>
                    )}
                    {(phase === 'done' || phase === 'error') && (
                        <div
                            style={{
                                padding: '16px 24px',
                                borderTop: '1px solid rgba(224,123,83,0.12)',
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '10px',
                            }}
                        >
                            <button
                                type="button"
                                onClick={handleClose}
                                style={{
                                    padding: '9px 28px',
                                    borderRadius: '999px',
                                    border: 'none',
                                    background:
                                        phase === 'done'
                                            ? `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`
                                            : '#ef4444',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow:
                                        phase === 'done'
                                            ? '0 4px 16px rgba(224,123,83,0.35)'
                                            : 'none',
                                }}
                            >
                                {phase === 'done' ? 'Flow ansehen ✨' : 'Schließen'}
                            </button>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/* ── Sub-phases ────────────────────────────────────────────── */

function InputPhase({ text, onChange }: { text: string; onChange: (v: string) => void }) {
    return (
        <div>
            <p
                style={{
                    margin: '0 0 12px',
                    fontSize: '13px',
                    color: '#636e72',
                    lineHeight: 1.6,
                }}
            >
                Füge dein Rezept in Textform ein. Die KI erkennt automatisch Zutaten, Schritte und
                deren Reihenfolge und erstellt daraus einen visuellen Flow.
            </p>
            <textarea
                value={text}
                onChange={(e) => onChange(e.target.value)}
                placeholder={PLACEHOLDER_TEXT}
                style={{
                    width: '100%',
                    minHeight: '240px',
                    border: '1.5px solid rgba(224,123,83,0.35)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    lineHeight: 1.65,
                    resize: 'vertical',
                    outline: 'none',
                    color: '#2d3436',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = PALETTE.orange)}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(224,123,83,0.35)')}
                autoFocus
            />
            <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#b2bec3' }}>
                Tipp: Kopiere einfach ein Rezept aus dem Internet oder tippe es ab.
            </p>
        </div>
    );
}

function ProcessingPhase({ stepIndex }: { stepIndex: number }) {
    return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
            {/* Animated orb */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '28px' }}>
                <div
                    style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'aiPulse 1.4s ease-in-out infinite',
                        boxShadow: '0 0 0 0 rgba(224,123,83,0.4)',
                    }}
                >
                    <ChefHat style={{ width: '36px', height: '36px', color: 'white' }} />
                </div>
                {/* Orbiting sparkle dots */}
                <div style={orbitDot(0)} />
                <div style={orbitDot(1)} />
                <div style={orbitDot(2)} />
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#2d3436' }}>
                KI analysiert dein Rezept…
            </h3>
            <p style={{ margin: '0 0 28px', fontSize: '13px', color: '#636e72' }}>
                Das dauert nur einen Moment
            </p>

            {/* Step log */}
            <div
                style={{
                    textAlign: 'left',
                    maxWidth: '340px',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}
            >
                {PROCESSING_STEPS.map((step, i) => {
                    const done = i < stepIndex;
                    const active = i === stepIndex;
                    return (
                        <div
                            key={step}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                opacity: i > stepIndex ? 0.3 : 1,
                                transition: 'opacity 0.3s ease',
                            }}
                        >
                            <div
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    backgroundColor: done
                                        ? PALETTE.orange
                                        : active
                                          ? 'rgba(224,123,83,0.2)'
                                          : 'rgba(0,0,0,0.08)',
                                    border: active ? `2px solid ${PALETTE.orange}` : '2px solid transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {done && (
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
                                {active && (
                                    <div
                                        style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: PALETTE.orange,
                                            animation: 'aiDotPulse 0.8s ease-in-out infinite',
                                        }}
                                    />
                                )}
                            </div>
                            <span
                                style={{
                                    fontSize: '13px',
                                    color: done ? '#2d3436' : active ? PALETTE.orange : '#b2bec3',
                                    fontWeight: active || done ? 500 : 400,
                                    transition: 'color 0.3s ease',
                                }}
                            >
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes aiPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(224,123,83,0.4); transform: scale(1); }
                    50% { box-shadow: 0 0 0 16px rgba(224,123,83,0); transform: scale(1.04); }
                }
                @keyframes aiDotPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                @keyframes aiOrbit {
                    from { transform: rotate(var(--start)) translateX(52px) rotate(calc(-1 * var(--start))); }
                    to { transform: rotate(calc(var(--start) + 360deg)) translateX(52px) rotate(calc(-1 * (var(--start) + 360deg))); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

/* ── Review Phase ──────────────────────────────────────────── */

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

interface ReviewPhaseProps {
    result: AIAnalysisResult;
    apply: ApplySelection;
    onToggle: (field: keyof ApplySelection) => void;
}

function ReviewPhase({ result, apply, onToggle }: ReviewPhaseProps) {
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
                    ? result.description.slice(0, 120) + '…'
                    : result.description
                : '—',
            subtle: true,
        },
        {
            field: 'category',
            label: 'Kategorie',
            value: CATEGORY_LABEL[result.categorySlug] ?? result.categorySlug ?? '—',
        },
        {
            field: 'tags',
            label: 'Tags',
            value:
                result.tags && result.tags.length > 0
                    ? result.tags.join(', ')
                    : 'Keine erkannt',
        },
        {
            field: 'prepTime',
            label: 'Vorbereitungszeit',
            value: result.prepTime > 0 ? `${result.prepTime} Min` : '—',
        },
        {
            field: 'cookTime',
            label: 'Kochzeit',
            value: result.cookTime > 0 ? `${result.cookTime} Min` : '—',
        },
        {
            field: 'servings',
            label: 'Portionen',
            value: String(result.servings),
        },
        {
            field: 'difficulty',
            label: 'Schwierigkeitsgrad',
            value: DIFFICULTY_LABEL[result.difficulty] ?? result.difficulty,
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
                style={{
                    margin: '0 0 16px',
                    fontSize: '13px',
                    color: '#636e72',
                    lineHeight: 1.6,
                }}
            >
                Die KI hat folgende Daten erkannt. Der Flow-Diagram wird immer übernommen.
                Wähle aus, welche weiteren Felder du in das Formular übernehmen möchtest.
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
                                border: checked
                                    ? '1.5px solid rgba(224,123,83,0.4)'
                                    : '1.5px solid rgba(0,0,0,0.07)',
                                backgroundColor: checked
                                    ? 'rgba(224,123,83,0.05)'
                                    : 'rgba(0,0,0,0.02)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {/* Checkbox */}
                            <div
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '5px',
                                    flexShrink: 0,
                                    marginTop: '1px',
                                    backgroundColor: checked ? PALETTE.orange : 'white',
                                    border: checked
                                        ? `1.5px solid ${PALETTE.orange}`
                                        : '1.5px solid rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                }}
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
                                        color: checked ? PALETTE.orange : '#b2bec3',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '2px',
                                        transition: 'color 0.15s ease',
                                    }}
                                >
                                    {label}
                                </div>
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: checked
                                            ? subtle
                                                ? '#636e72'
                                                : '#2d3436'
                                            : '#b2bec3',
                                        lineHeight: 1.4,
                                        wordBreak: 'break-word',
                                        transition: 'color 0.15s ease',
                                    }}
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

/* ── Done / Error phases ───────────────────────────────────── */

function DonePhase({ result }: { result: AIAnalysisResult | null }) {
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
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#2d3436' }}>
                Flow wurde erstellt! 🎉
            </h3>
            <p
                style={{
                    margin: '0 0 24px',
                    fontSize: '13px',
                    color: '#636e72',
                    maxWidth: '360px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    lineHeight: 1.6,
                }}
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
                        <div style={{ fontSize: '11px', color: '#636e72', marginTop: '4px' }}>
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ErrorPhase({ error }: { error: string }) {
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
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#2d3436' }}>
                Fehler bei der Analyse
            </h3>
            <p
                style={{
                    margin: '0 0 24px',
                    fontSize: '13px',
                    color: '#636e72',
                    maxWidth: '360px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    lineHeight: 1.6,
                }}
            >
                {error}
            </p>
        </div>
    );
}

/* ── helpers ────────────────────────────────────────────────── */

function orbitDot(index: number): React.CSSProperties {
    const startDeg = index * 120;
    return {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: index === 0 ? PALETTE.orange : index === 1 ? PALETTE.gold : '#ff8c69',
        marginTop: '-4px',
        marginLeft: '-4px',
        animation: `aiOrbit ${1.8 + index * 0.3}s linear infinite`,
        // @ts-expect-error CSS custom property
        '--start': `${startDeg}deg`,
    };
}

const PLACEHOLDER_TEXT = `Beispiel:

Für den Teig:
- 200g Mehl
- 100g Butter
- 2 Eier
- 1 Prise Salz

1. Mehl, Butter und Salz vermischen bis eine krümelige Masse entsteht.
2. Eier hinzufügen und zu einem glatten Teig kneten.
3. Teig 30 Minuten kalt stellen.
4. Teig ausrollen und in die Form legen.
5. Bei 180°C für 25 Minuten backen.`;
