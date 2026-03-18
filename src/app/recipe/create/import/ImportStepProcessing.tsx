'use client';

import {
    ArrowRight,
    Brain,
    Check,
    CheckCircle2,
    Circle,
    FileText,
    Globe,
    LoaderCircle,
    Network,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { RefObject } from 'react';

import { ProgressBar } from './components/ProgressBar';
import {
    pipelineClass,
    pipelineConnectorClass,
    pipelineStepClass,
    pipelineStepIndicatorClass,
    pipelineStepLabelClass,
    processingLayoutClass,
    processingSidebarClass,
    progressBarSpacerClass,
    sidebarHeaderClass,
    sidebarIconClass,
    sidebarIconWrapperClass,
    sidebarStatRowClass,
    sidebarStatsClass,
    sidebarSubtitleClass,
    sidebarTitleClass,
    streamingBufferClass,
    terminalBodyClass,
    terminalCursorClass,
    terminalCursorLineClass,
    terminalDetailClass,
    terminalDotClass,
    terminalDotsClass,
    terminalInitClass,
    terminalLineClass,
    terminalMessageClass,
    terminalPanelClass,
    terminalPromptClass,
    terminalTimestampClass,
    terminalTitleBarClass,
    terminalTitleBarSpacerClass,
    terminalTitleClass,
} from './import-styles-processing';
import type { ImportStep, ProcessingStatus, StreamEvent } from './import-types';

interface ImportStepProcessingProps {
    currentStep: ImportStep;
    status: ProcessingStatus;
    streamEvents: StreamEvent[];
    streamingBuffer: string;
    terminalRef: RefObject<HTMLDivElement | null>;
}

export function ImportStepProcessing({
    currentStep,
    status,
    streamEvents,
    streamingBuffer,
    terminalRef,
}: ImportStepProcessingProps) {
    const isScraping = currentStep === 'scraping';

    const pipelineSteps = [
        { id: 'fetch', label: 'URL laden', icon: Globe, done: true, active: false },
        {
            id: 'scraping',
            label: 'Seite scrapen',
            icon: Globe,
            done: !isScraping,
            active: isScraping,
        },
        { id: 'analyzing', label: 'KI-Analyse', icon: Brain, done: false, active: !isScraping },
        { id: 'preview', label: 'Vorschau', icon: Check, done: false, active: false },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={processingLayoutClass}
        >
            {/* ── LEFT SIDEBAR ── */}
            <div className={processingSidebarClass}>
                <div className={sidebarHeaderClass}>
                    <motion.div
                        animate={isScraping ? { rotate: 360 } : { scale: [1, 1.15, 1] }}
                        transition={
                            isScraping
                                ? { repeat: Infinity, duration: 2, ease: 'linear' }
                                : { repeat: Infinity, duration: 1.5 }
                        }
                        className={sidebarIconWrapperClass(isScraping)}
                    >
                        {isScraping ? (
                            <Globe className={sidebarIconClass} />
                        ) : (
                            <Brain className={sidebarIconClass} />
                        )}
                    </motion.div>
                    <div>
                        <h2 className={sidebarTitleClass}>
                            {isScraping ? 'Seite wird geladen' : 'KI analysiert Rezept'}
                        </h2>
                        <motion.p
                            key={status.message}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={sidebarSubtitleClass}
                        >
                            {status.message}
                        </motion.p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className={progressBarSpacerClass}>
                    <ProgressBar progress={status.progress} />
                </div>

                {/* Pipeline steps */}
                <div className={pipelineClass}>
                    {pipelineSteps.map((step, idx) => (
                        <div key={step.id} className={pipelineStepClass}>
                            <div className={pipelineStepIndicatorClass(step.done, step.active)}>
                                {step.done ? (
                                    <CheckCircle2 size={16} />
                                ) : step.active ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 1.2,
                                            ease: 'linear',
                                        }}
                                    >
                                        <LoaderCircle size={16} />
                                    </motion.div>
                                ) : (
                                    <Circle size={16} />
                                )}
                            </div>
                            <span className={pipelineStepLabelClass(step.done, step.active)}>
                                {step.label}
                            </span>
                            {idx < pipelineSteps.length - 1 && (
                                <div className={pipelineConnectorClass(step.done)} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Live stats */}
                {status.liveData && (
                    <div className={sidebarStatsClass}>
                        {status.liveData.markdownLength != null && (
                            <div className={sidebarStatRowClass}>
                                <FileText size={12} />
                                <span>{status.liveData.markdownLength.toLocaleString()} chars</span>
                            </div>
                        )}
                        {status.liveData.nodesFound != null && (
                            <div className={sidebarStatRowClass}>
                                <Network size={12} />
                                <span>{status.liveData.nodesFound} Schritte</span>
                            </div>
                        )}
                        {status.liveData.edgesFound != null && (
                            <div className={sidebarStatRowClass}>
                                <ArrowRight size={12} />
                                <span>{status.liveData.edgesFound} Kanten</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── RIGHT TERMINAL ── */}
            <div className={terminalPanelClass}>
                {/* macOS-style title bar */}
                <div className={terminalTitleBarClass}>
                    <div className={terminalDotsClass}>
                        <span className={terminalDotClass('#ff5f57')} />
                        <span className={terminalDotClass('#febc2e')} />
                        <span className={terminalDotClass('#28c840')} />
                    </div>
                    <span className={terminalTitleClass}>küchentakt — import-log</span>
                    <div className={terminalTitleBarSpacerClass} />
                </div>

                {/* Terminal body */}
                <div className={terminalBodyClass} ref={terminalRef}>
                    <div className={terminalInitClass}>
                        KüchenTakt Import Engine v1.0 — {new Date().toISOString().split('T')[0]}
                    </div>
                    {streamEvents.map((event, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className={terminalLineClass}
                        >
                            <span className={terminalTimestampClass}>{event.timestamp}</span>
                            <span className={terminalPromptClass(event.type)}>
                                {event.type === 'complete'
                                    ? '✓'
                                    : event.type === 'error'
                                      ? '✗'
                                      : event.type === 'data'
                                        ? '·'
                                        : '›'}
                            </span>
                            <span className={terminalMessageClass(event.type)}>
                                {event.message}
                            </span>
                            {event.detail && (
                                <span className={terminalDetailClass(event.type)}>
                                    {event.detail}
                                </span>
                            )}
                        </motion.div>
                    ))}
                    {/* Live JSON stream — shows raw OpenAI output as it arrives */}
                    {streamingBuffer && (
                        <div className={terminalLineClass}>
                            <span className={terminalTimestampClass}>live</span>
                            <span className={terminalPromptClass('data')}>·</span>
                            <span className={streamingBufferClass}>
                                {streamingBuffer.length > 160
                                    ? '…' + streamingBuffer.slice(-160)
                                    : streamingBuffer}
                            </span>
                        </div>
                    )}
                    {/* Blinking cursor */}
                    <div className={terminalCursorLineClass}>
                        <span className={terminalTimestampClass}>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        </span>
                        <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className={terminalCursorClass}
                        >
                            █
                        </motion.span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
