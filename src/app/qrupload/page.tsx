'use client';

import { Camera, CheckCircle, Clock, Loader2, QrCode, UploadCloud, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { PageShell } from '@app/components/layouts/PageShell';
import { pollQRUploadStatus } from '@app/lib/qrupload/actions';

import { css } from 'styled-system/css';

type PageState = 'loading' | 'ready' | 'uploading' | 'success' | 'error' | 'expired' | 'used';

interface TokenPayload {
    tokenId: string;
    userId: string;
    type: string;
    recipeId?: string;
    stepId?: string;
    label?: string;
    exp: number;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12, transition: { duration: 0.15 } },
    transition: { duration: 0.35, ease: EASE },
};

const stagger = {
    animate: { transition: { staggerChildren: 0.07 } },
};

const child = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

export default function QRUploadPage() {
    const [state, setState] = useState<PageState>('loading');
    const [payload, setPayload] = useState<TokenPayload | null>(null);
    const [token, setToken] = useState<string>('');
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        async function init() {
            const hash = window.location.hash.slice(1);
            if (!hash) {
                setState('expired');
                return;
            }

            try {
                const parts = hash.split('.');
                if (parts.length !== 3) throw new Error('invalid');
                const raw = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
                const parsed = JSON.parse(raw) as TokenPayload;
                const secs = parsed.exp - Math.floor(Date.now() / 1000);
                if (secs <= 0) {
                    setState('expired');
                    return;
                }

                const pollResult = await pollQRUploadStatus(hash);
                if (pollResult.status === 'expired') {
                    setState('expired');
                    return;
                }
                if (pollResult.status === 'complete') {
                    setState('used');
                    return;
                }

                setPayload(parsed);
                setToken(hash);
                setSecondsLeft(secs);
                setState('ready');
            } catch {
                setState('expired');
            }
        }
        void init();
    }, []);

    useEffect(() => {
        if (state !== 'ready') return;

        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    setState('expired');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [state]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        setState('uploading');
        setErrorMsg('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/qrupload/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                setState('success');
                return;
            }

            const data = (await res.json().catch(() => ({}))) as { error?: string };
            let msg = 'Unbekannter Fehler.';

            if (res.status === 401) {
                msg = 'QR-Code ungültig oder abgelaufen.';
            } else if (res.status === 409) {
                msg =
                    'Dieser QR-Code wurde bereits verwendet. Pro QR-Code kann nur ein Foto hochgeladen werden. Bitte erstelle einen neuen QR-Code.';
            } else if (res.status === 410) {
                msg = 'QR-Code abgelaufen – scanne erneut.';
            } else if (res.status === 400 && data.error?.includes('groß')) {
                msg = 'Datei zu groß (max. 5 MB).';
            } else if (res.status === 400 && data.error?.includes('abgelehnt')) {
                msg = 'Dieses Bild wurde von unserer Moderation abgelehnt.';
            } else if (data.error) {
                msg = data.error;
            }

            setErrorMsg(msg);
            setState('error');
        } catch {
            setErrorMsg('Verbindungsfehler – bitte nochmal versuchen.');
            setState('error');
        }
    };

    const timerUrgent = secondsLeft < 30;
    const timerWarning = secondsLeft < 120;

    return (
        <PageShell>
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minH: '60vh',
                    p: '6',
                })}
            >
                <div
                    className={css({
                        width: '100%',
                        maxWidth: '420px',
                        display: 'flex',
                        flexDir: 'column',
                        alignItems: 'center',
                        gap: '6',
                        textAlign: 'center',
                    })}
                >
                    <AnimatePresence mode="wait">
                        {state === 'loading' && (
                            <motion.div
                                key="loading"
                                {...fadeUp}
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    alignItems: 'center',
                                    gap: '3',
                                })}
                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                    <Loader2 size={32} className={css({ color: 'primary' })} />
                                </motion.div>
                                <p className={css({ color: 'text.muted', fontSize: 'sm', m: 0 })}>
                                    Laden...
                                </p>
                            </motion.div>
                        )}

                        {state === 'expired' && (
                            <motion.div
                                key="expired"
                                {...fadeUp}
                                variants={stagger}
                                initial="initial"
                                animate="animate"
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    alignItems: 'center',
                                    gap: '4',
                                })}
                            >
                                <motion.div
                                    variants={child}
                                    className={css({
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: 'xl',
                                        bg: 'bg.card',
                                        border: '1px solid',
                                        borderColor: 'border',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    })}
                                >
                                    <Clock size={28} className={css({ color: 'text.muted' })} />
                                </motion.div>
                                <motion.div
                                    variants={child}
                                    className={css({
                                        display: 'flex',
                                        flexDir: 'column',
                                        gap: '2',
                                    })}
                                >
                                    <h1
                                        className={css({
                                            fontSize: 'xl',
                                            fontWeight: '700',
                                            color: 'text',
                                            m: 0,
                                        })}
                                    >
                                        QR-Code abgelaufen
                                    </h1>
                                    <p
                                        className={css({
                                            color: 'text.muted',
                                            fontSize: 'sm',
                                            m: 0,
                                        })}
                                    >
                                        Bitte scanne den QR-Code erneut vom Desktop.
                                    </p>
                                </motion.div>
                            </motion.div>
                        )}

                        {state === 'used' && (
                            <motion.div
                                key="used"
                                {...fadeUp}
                                variants={stagger}
                                initial="initial"
                                animate="animate"
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    alignItems: 'center',
                                    gap: '4',
                                })}
                            >
                                <motion.div
                                    variants={child}
                                    className={css({
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: 'xl',
                                        bg: 'bg.card',
                                        border: '1px solid',
                                        borderColor: 'border',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    })}
                                >
                                    <QrCode size={28} className={css({ color: 'text.muted' })} />
                                </motion.div>
                                <motion.div
                                    variants={child}
                                    className={css({
                                        display: 'flex',
                                        flexDir: 'column',
                                        gap: '2',
                                    })}
                                >
                                    <h1
                                        className={css({
                                            fontSize: 'xl',
                                            fontWeight: '700',
                                            color: 'text',
                                            m: 0,
                                        })}
                                    >
                                        Bereits hochgeladen
                                    </h1>
                                    <p
                                        className={css({
                                            color: 'text.muted',
                                            fontSize: 'sm',
                                            m: 0,
                                        })}
                                    >
                                        Pro QR-Code kann nur ein Foto hochgeladen werden. Bitte
                                        erstelle am Desktop einen neuen QR-Code.
                                    </p>
                                </motion.div>
                            </motion.div>
                        )}

                        {(state === 'ready' || state === 'uploading' || state === 'error') &&
                            payload && (
                                <motion.div
                                    key="upload"
                                    variants={stagger}
                                    initial="initial"
                                    animate="animate"
                                    className={css({
                                        width: '100%',
                                        display: 'flex',
                                        flexDir: 'column',
                                        alignItems: 'center',
                                        gap: '6',
                                    })}
                                >
                                    {/* Icon */}
                                    <motion.div
                                        variants={child}
                                        whileTap={{ scale: 0.94 }}
                                        className={css({
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: 'xl',
                                            background:
                                                'linear-gradient(135deg, token(colors.primary), #c9622e)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 8px 24px token(colors.primary)/30',
                                        })}
                                    >
                                        <Camera size={28} color="white" />
                                    </motion.div>

                                    {/* Title + context */}
                                    <motion.div
                                        variants={child}
                                        className={css({
                                            display: 'flex',
                                            flexDir: 'column',
                                            alignItems: 'center',
                                            gap: '1',
                                        })}
                                    >
                                        <h1
                                            className={css({
                                                fontSize: '2xl',
                                                fontWeight: '700',
                                                color: 'text',
                                                m: 0,
                                            })}
                                        >
                                            Foto hochladen
                                        </h1>
                                        {payload.label && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.2, duration: 0.25 }}
                                                className={css({
                                                    mt: '1',
                                                    px: '3',
                                                    py: '1.5',
                                                    bg: 'bg.card',
                                                    border: '1px solid',
                                                    borderColor: 'border',
                                                    borderRadius: 'full',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '1.5',
                                                })}
                                            >
                                                <UploadCloud
                                                    size={13}
                                                    className={css({ color: 'primary' })}
                                                />
                                                <span
                                                    className={css({
                                                        fontSize: 'xs',
                                                        fontWeight: '600',
                                                        color: 'text',
                                                    })}
                                                >
                                                    {payload.label}
                                                </span>
                                            </motion.div>
                                        )}
                                    </motion.div>

                                    {/* Countdown */}
                                    <motion.div
                                        variants={child}
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1.5',
                                        })}
                                    >
                                        <motion.div
                                            animate={timerUrgent ? { scale: [1, 1.2, 1] } : {}}
                                            transition={{
                                                duration: 0.5,
                                                repeat: timerUrgent ? Infinity : 0,
                                                repeatDelay: 0.5,
                                            }}
                                        >
                                            <Clock
                                                size={13}
                                                className={css({
                                                    color: timerUrgent
                                                        ? 'red.500'
                                                        : timerWarning
                                                          ? 'yellow.500'
                                                          : 'text.muted',
                                                })}
                                            />
                                        </motion.div>
                                        <span
                                            className={css({
                                                fontSize: 'sm',
                                                fontWeight: '600',
                                                color: timerUrgent
                                                    ? 'red.500'
                                                    : timerWarning
                                                      ? 'yellow.500'
                                                      : 'text.muted',
                                                fontVariantNumeric: 'tabular-nums',
                                            })}
                                        >
                                            Noch {formatTime(secondsLeft)}
                                        </span>
                                    </motion.div>

                                    {/* Upload zone */}
                                    <motion.label
                                        variants={child}
                                        whileHover={state !== 'uploading' ? { scale: 1.01 } : {}}
                                        whileTap={state !== 'uploading' ? { scale: 0.98 } : {}}
                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                        className={css({
                                            display: 'flex',
                                            flexDir: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '3',
                                            width: '100%',
                                            minHeight: '180px',
                                            border: '2px dashed',
                                            borderColor:
                                                state === 'error' ? 'red.400' : 'primary/30',
                                            borderRadius: '2xl',
                                            cursor: state === 'uploading' ? 'wait' : 'pointer',
                                            transition: 'border-color 200ms, background 200ms',
                                            bg: state === 'error' ? 'red.50/30' : 'primary/3',
                                            _dark: {
                                                bg: state === 'error' ? 'red.950/30' : 'primary/5',
                                            },
                                            _hover:
                                                state !== 'uploading'
                                                    ? { borderColor: 'primary/60', bg: 'primary/8' }
                                                    : {},
                                            p: '6',
                                        })}
                                    >
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            onChange={handleFileChange}
                                            disabled={state === 'uploading'}
                                            className={css({ display: 'none' })}
                                        />
                                        <AnimatePresence mode="wait">
                                            {state === 'uploading' ? (
                                                <motion.div
                                                    key="spinner"
                                                    initial={{ opacity: 0, scale: 0.5 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{
                                                            duration: 1,
                                                            repeat: Infinity,
                                                            ease: 'linear',
                                                        }}
                                                    >
                                                        <Loader2
                                                            size={32}
                                                            className={css({ color: 'primary' })}
                                                        />
                                                    </motion.div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="camera"
                                                    initial={{ opacity: 0, scale: 0.5 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.5 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <Camera
                                                        size={32}
                                                        className={css({
                                                            color:
                                                                state === 'error'
                                                                    ? 'red.500'
                                                                    : 'primary',
                                                        })}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <span
                                            className={css({
                                                fontSize: 'base',
                                                fontWeight: '700',
                                                color: 'text',
                                            })}
                                        >
                                            {state === 'uploading'
                                                ? 'Wird hochgeladen...'
                                                : 'Foto auswählen'}
                                        </span>
                                        <span
                                            className={css({ fontSize: 'xs', color: 'text.muted' })}
                                        >
                                            JPEG, PNG, GIF, WebP · max. 5 MB
                                        </span>
                                    </motion.label>

                                    {/* Error message */}
                                    <AnimatePresence>
                                        {state === 'error' && errorMsg && (
                                            <motion.div
                                                key="error-msg"
                                                initial={{ opacity: 0, y: 8, height: 0 }}
                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                exit={{ opacity: 0, y: 4, height: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className={css({
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '2',
                                                    p: '3',
                                                    bg: 'red.50',
                                                    _dark: {
                                                        bg: 'red.950/40',
                                                        borderColor: 'red.800',
                                                    },
                                                    border: '1px solid',
                                                    borderColor: 'red.200',
                                                    borderRadius: 'lg',
                                                    width: '100%',
                                                    textAlign: 'left',
                                                })}
                                            >
                                                <XCircle
                                                    size={16}
                                                    className={css({
                                                        color: 'red.500',
                                                        flexShrink: '0',
                                                        mt: '0.5',
                                                    })}
                                                />
                                                <p
                                                    className={css({
                                                        fontSize: 'sm',
                                                        color: 'red.600',
                                                        _dark: { color: 'red.400' },
                                                        m: 0,
                                                        fontWeight: '500',
                                                    })}
                                                >
                                                    {errorMsg}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <AnimatePresence>
                                        {state === 'error' && (
                                            <motion.button
                                                key="retry"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                type="button"
                                                onClick={() => setState('ready')}
                                                whileTap={{ scale: 0.95 }}
                                                className={css({
                                                    fontSize: 'sm',
                                                    color: 'primary',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: '600',
                                                    p: '0',
                                                    _hover: { opacity: '0.75' },
                                                })}
                                            >
                                                Erneut versuchen
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                        {state === 'success' && (
                            <motion.div
                                key="success"
                                variants={stagger}
                                initial="initial"
                                animate="animate"
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    alignItems: 'center',
                                    gap: '4',
                                })}
                            >
                                <motion.div
                                    variants={child}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 300,
                                        damping: 18,
                                        delay: 0.05,
                                    }}
                                    className={css({
                                        width: '72px',
                                        height: '72px',
                                        borderRadius: 'xl',
                                        bg: 'green.500/10',
                                        border: '1px solid',
                                        borderColor: 'green.500/30',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    })}
                                >
                                    <motion.div
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.4, delay: 0.2 }}
                                    >
                                        <CheckCircle
                                            size={32}
                                            className={css({ color: 'green.500' })}
                                        />
                                    </motion.div>
                                </motion.div>
                                <motion.div
                                    variants={child}
                                    className={css({
                                        display: 'flex',
                                        flexDir: 'column',
                                        gap: '2',
                                    })}
                                >
                                    <h1
                                        className={css({
                                            fontSize: 'xl',
                                            fontWeight: '700',
                                            color: 'text',
                                            m: 0,
                                        })}
                                    >
                                        Erfolgreich hochgeladen!
                                    </h1>
                                    <p
                                        className={css({
                                            color: 'text.muted',
                                            fontSize: 'sm',
                                            m: 0,
                                        })}
                                    >
                                        Du kannst dieses Fenster schließen.
                                    </p>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </PageShell>
    );
}
