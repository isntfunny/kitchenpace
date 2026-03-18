'use client';

import { Check, Sparkles, Wand2, X } from 'lucide-react';
import { Dialog } from 'radix-ui';

import type { AIAnalysisResult, ApplySelection } from '@app/lib/importer/ai-text-analysis';
import { PALETTE } from '@app/lib/palette';

import {
    closeButtonStyle,
    closeIconStyle,
    contentStyle,
    dialogSubtitleStyle,
    dialogTitleStyle,
    disabledButtonStyle,
    flowOnlyButtonStyle,
    overlayStyle,
} from './ai-dialog-styles';
import { InputPhase, ProcessingPhase } from './AiDialogPhases';
import { DonePhase, ErrorPhase, ReviewPhase } from './AiResultPreview';
import { useAiConversion } from './useAiConversion';

interface AiConversionDialogProps {
    open: boolean;
    onClose: () => void;
    /** Called when the user confirms applying the AI result */
    onResult?: (result: AIAnalysisResult, apply: ApplySelection) => void;
}

export function AiConversionDialog({ open, onClose, onResult }: AiConversionDialogProps) {
    const {
        text,
        setText,
        phase,
        setPhase,
        stepIndex,
        error,
        result,
        apply,
        startConversion,
        handleConfirmReview,
        handleClose,
        handleFlowOnly,
        toggleApply,
    } = useAiConversion({ onResult, onClose });

    return (
        <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className={overlayStyle} />
                <Dialog.Content
                    className={contentStyle}
                    style={{
                        width: phase === 'review' ? 'min(640px, 95vw)' : 'min(580px, 95vw)',
                        maxHeight: '90vh',
                    }}
                    onPointerDownOutside={(e) => phase === 'processing' && e.preventDefault()}
                >
                    {/* Header */}
                    <DialogHeader phase={phase} onClose={handleClose} />

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
                        <InputFooter
                            hasText={!!text.trim()}
                            onCancel={handleClose}
                            onConvert={startConversion}
                        />
                    )}
                    {phase === 'review' && (
                        <ReviewFooter
                            onBack={() => setPhase('input')}
                            onFlowOnly={handleFlowOnly}
                            onConfirm={handleConfirmReview}
                        />
                    )}
                    {(phase === 'done' || phase === 'error') && (
                        <CloseFooter phase={phase} onClose={handleClose} />
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/* -- Dialog Header --------------------------------------------- */

function DialogHeader({ phase, onClose }: { phase: string; onClose: () => void }) {
    return (
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
                <Dialog.Title className={dialogTitleStyle}>
                    {phase === 'review'
                        ? 'Erkannte Daten übernehmen'
                        : 'Lass KI die Arbeit übernehmen'}
                </Dialog.Title>
                <p className={dialogSubtitleStyle}>
                    {phase === 'review'
                        ? 'Wähle aus, welche Felder du übernehmen möchtest'
                        : 'Füge ein klassisches Rezept ein — KI wandelt es in einen Flow um'}
                </p>
            </div>
            {phase !== 'processing' && (
                <Dialog.Close asChild>
                    <button type="button" onClick={onClose} className={closeButtonStyle}>
                        <X className={closeIconStyle} />
                    </button>
                </Dialog.Close>
            )}
        </div>
    );
}

/* -- Footer: Input phase --------------------------------------- */

function InputFooter({
    hasText,
    onCancel,
    onConvert,
}: {
    hasText: boolean;
    onCancel: () => void;
    onConvert: () => void;
}) {
    return (
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
                onClick={onCancel}
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
                disabled={!hasText}
                onClick={onConvert}
                style={{
                    padding: '8px 20px',
                    borderRadius: '999px',
                    border: 'none',
                    background: hasText
                        ? `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`
                        : undefined,
                    color: hasText ? 'white' : undefined,
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: hasText ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                }}
                className={!hasText ? disabledButtonStyle : undefined}
            >
                <Wand2 style={{ width: '14px', height: '14px' }} />
                Jetzt konvertieren
            </button>
        </div>
    );
}

/* -- Footer: Review phase -------------------------------------- */

function ReviewFooter({
    onBack,
    onFlowOnly,
    onConfirm,
}: {
    onBack: () => void;
    onFlowOnly: () => void;
    onConfirm: () => void;
}) {
    return (
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
                onClick={onBack}
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
                <button type="button" onClick={onFlowOnly} className={flowOnlyButtonStyle}>
                    Nur Flow
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    style={{
                        padding: '8px 20px',
                        borderRadius: '999px',
                        border: 'none',
                        background: `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`,
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
    );
}

/* -- Footer: Done / Error phase -------------------------------- */

function CloseFooter({ phase, onClose }: { phase: string; onClose: () => void }) {
    return (
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
                onClick={onClose}
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
                    boxShadow: phase === 'done' ? '0 4px 16px rgba(224,123,83,0.35)' : 'none',
                }}
            >
                {phase === 'done' ? 'Flow ansehen' : 'Schliessen'}
            </button>
        </div>
    );
}
