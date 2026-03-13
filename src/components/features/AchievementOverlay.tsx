'use client';

import type { TrophyTier } from '@prisma/client';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PALETTE } from '@app/lib/palette';
import { TIER_STYLES } from '@app/lib/trophies/registry';
import { css } from 'styled-system/css';

// ---------------------------------------------------------------------------
// Confetti particle system (motion/react, no external dep)
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = [
    PALETTE.gold,
    PALETTE.orange,
    PALETTE.emerald,
    PALETTE.purple,
    PALETTE.pink,
    '#fff',
];

interface Particle {
    id: number;
    x: number; // start x offset from center (vw)
    y: number; // end y position (vh)
    rotate: number;
    scale: number;
    color: string;
    delay: number;
    duration: number;
    shape: 'circle' | 'rect';
}

function generateParticles(count: number): Particle[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 80, // spread +-40vw
        y: 60 + Math.random() * 40, // fall 60-100vh
        rotate: Math.random() * 720 - 360,
        scale: 0.4 + Math.random() * 0.8,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 1.2,
        duration: 2.5 + Math.random() * 0.8,
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
    }));
}

function ConfettiExplosion() {
    const particles = useMemo(() => generateParticles(70), []);

    return (
        <div
            className={css({
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 51,
                overflow: 'hidden',
            })}
        >
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{
                        opacity: 1,
                        x: '50vw',
                        y: '-5vh',
                        rotate: 0,
                        scale: 0,
                    }}
                    animate={{
                        opacity: [1, 1, 0],
                        x: `calc(50vw + ${p.x}vw)`,
                        y: `${p.y}vh`,
                        rotate: p.rotate,
                        scale: p.scale,
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: [0.22, 0.68, 0.36, 1],
                    }}
                    style={{
                        position: 'absolute',
                        width: p.shape === 'circle' ? 10 : 8,
                        height: p.shape === 'circle' ? 10 : 14,
                        borderRadius: p.shape === 'circle' ? '50%' : 2,
                        backgroundColor: p.color,
                    }}
                />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Dynamic lucide icon resolver
// ---------------------------------------------------------------------------

function TrophyIcon({ name, size = 48 }: { name: string; size?: number }) {
    const [IconComponent, setIconComponent] = useState<React.ComponentType<{
        size: number;
        className?: string;
    }> | null>(null);

    useEffect(() => {
        import('lucide-react').then((mod) => {
            const icon = (mod as Record<string, unknown>)[name] as typeof IconComponent;
            if (icon) setIconComponent(() => icon);
        });
    }, [name]);

    if (!IconComponent) return null;
    return <IconComponent size={size} className={css({ color: 'white' })} />;
}

// ---------------------------------------------------------------------------
// Achievement overlay
// ---------------------------------------------------------------------------

export interface AchievementOverlayProps {
    trophy: {
        id: string;
        name: string;
        description: string;
        icon: string;
        points: number;
        tier?: TrophyTier;
    };
    onClose: () => void;
}

export function AchievementOverlay({ trophy, onClose }: AchievementOverlayProps) {
    const [isOpen, setIsOpen] = useState(true);
    const tierStyle = TIER_STYLES[trophy.tier ?? 'NONE'];
    const router = useRouter();

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setTimeout(onClose, 400);
    }, [onClose]);

    const handleViewTrophies = useCallback(() => {
        handleClose();
        setTimeout(() => router.push('/profile'), 400);
    }, [handleClose, router]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <ConfettiExplosion />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={backdropClass}
                        onClick={handleClose}
                    >
                        <motion.div
                            initial={{ y: 120, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 60, opacity: 0, scale: 0.9 }}
                            transition={{
                                type: 'spring',
                                damping: 22,
                                stiffness: 280,
                            }}
                            className={cardOuterClass}
                            style={{
                                background: `linear-gradient(135deg, ${tierStyle.fill}, ${PALETTE.orange})`,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={cardInnerClass}>
                                {/* Trophy icon */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{
                                        delay: 0.2,
                                        type: 'spring',
                                        stiffness: 200,
                                    }}
                                    className={iconCircleClass}
                                    style={{
                                        background: `linear-gradient(135deg, ${tierStyle.fill}, ${tierStyle.stroke})`,
                                        boxShadow: `0 8px 30px ${tierStyle.glow}`,
                                    }}
                                >
                                    <TrophyIcon name={trophy.icon} size={48} />
                                </motion.div>

                                {/* Text */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <h2
                                        className={css({
                                            fontSize: '2xl',
                                            fontWeight: '800',
                                            mb: '2',
                                            background: 'linear-gradient(135deg, #FFD700, #e07b53)',
                                            backgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                        })}
                                    >
                                        Erfolgreich freigeschaltet!
                                    </h2>
                                    <p
                                        className={css({
                                            fontSize: 'xl',
                                            fontWeight: '700',
                                            color: 'text',
                                            mb: '1',
                                        })}
                                    >
                                        {trophy.name}
                                    </p>
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'text.muted',
                                        })}
                                    >
                                        {trophy.description}
                                    </p>
                                    {trophy.points > 0 && (
                                        <p
                                            className={css({
                                                fontSize: 'xs',
                                                fontWeight: '600',
                                                color: 'text.secondary',
                                                mt: '2',
                                            })}
                                        >
                                            +{trophy.points} Punkte
                                        </p>
                                    )}
                                </motion.div>

                                {/* Actions */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className={css({
                                        display: 'flex',
                                        flexDir: 'column',
                                        gap: '2',
                                        mt: '5',
                                    })}
                                >
                                    <button
                                        type="button"
                                        onClick={handleViewTrophies}
                                        className={css({
                                            px: '4',
                                            py: '2.5',
                                            borderRadius: 'xl',
                                            fontWeight: '700',
                                            fontSize: 'sm',
                                            color: 'white',
                                            bg: 'primary',
                                            cursor: 'pointer',
                                            _hover: { opacity: 0.9 },
                                            transition: 'opacity 0.15s',
                                        })}
                                    >
                                        Deine Trophäen ansehen
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className={css({
                                            px: '4',
                                            py: '2',
                                            borderRadius: 'xl',
                                            fontWeight: '600',
                                            fontSize: 'xs',
                                            color: 'text.muted',
                                            bg: 'transparent',
                                            cursor: 'pointer',
                                            _hover: { color: 'text' },
                                            transition: 'color 0.15s',
                                        })}
                                    >
                                        Schliessen
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ---------------------------------------------------------------------------
// Styles (Panda CSS)
// ---------------------------------------------------------------------------

const backdropClass = css({
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bg: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(6px)',
});

const cardOuterClass = css({
    position: 'relative',
    p: '1px',
    borderRadius: '3xl',
});

const cardInnerClass = css({
    bg: 'surface.elevated',
    borderRadius: 'calc(token(radii.3xl) - 1px)',
    px: { base: '6', md: '8' },
    py: { base: '8', md: '10' },
    textAlign: 'center',
    minW: { base: '280px', md: '340px' },
});

const iconCircleClass = css({
    width: '96px',
    height: '96px',
    mx: 'auto',
    mb: '5',
    borderRadius: 'full',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
});
