'use client';

import { AlertTriangle } from 'lucide-react';
import { Component, ReactNode } from 'react';

import { captureErrorWithDialog } from '@app/lib/sentry';
import { css } from 'styled-system/css';

interface ErrorBoundaryProps {
    children: ReactNode;
    context?: string; // e.g., "Recipe Form", "Ingredients Table"
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary for catching React component errors
 * Automatically shows Sentry feedback dialog on error
 *
 * Usage:
 * <ErrorBoundary context="My Component">
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
        // Capture to Sentry with feedback dialog
        captureErrorWithDialog(error, this.props.context);
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <div
                        className={css({
                            padding: '4',
                            borderRadius: 'lg',
                            background: 'red.50',
                            borderWidth: '1px',
                            borderColor: 'red.200',
                        })}
                    >
                        <div
                            className={css({ display: 'flex', gap: '3', alignItems: 'flex-start' })}
                        >
                            <AlertTriangle
                                size={20}
                                className={css({ color: 'red.600', marginTop: '0.25' })}
                            />
                            <div>
                                <h3
                                    className={css({
                                        fontWeight: 'semibold',
                                        color: 'red.600',
                                        marginBottom: '1',
                                    })}
                                >
                                    Ein Fehler ist aufgetreten
                                </h3>
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'red.700',
                                        lineHeight: '1.5',
                                    })}
                                >
                                    {this.props.context && `Fehler in ${this.props.context}: `}
                                    {this.state.error?.message ||
                                        'Ein unbekannter Fehler ist aufgetreten.'}
                                </p>
                                <button
                                    onClick={() => {
                                        this.setState({ hasError: false, error: null });
                                    }}
                                    className={css({
                                        marginTop: '2',
                                        paddingX: '3',
                                        paddingY: '2',
                                        borderRadius: 'md',
                                        background: 'red.600',
                                        color: 'white',
                                        fontSize: 'sm',
                                        fontWeight: 'medium',
                                        border: 'none',
                                        cursor: 'pointer',
                                        _hover: { background: 'red.700' },
                                    })}
                                >
                                    Erneut versuchen
                                </button>
                            </div>
                        </div>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
