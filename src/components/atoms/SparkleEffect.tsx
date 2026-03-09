'use client';

import { AnimatePresence, motion } from 'motion/react';
import { CSSProperties, ReactNode, useCallback, useState } from 'react';

import { PALETTE } from '@app/lib/palette';

const SPARK_COLORS = [
    PALETTE.orange,
    PALETTE.gold,
    '#f76b15', // primary-dark
    '#ff9a5c', // light orange
    PALETTE.emerald,
    PALETTE.purple,
    PALETTE.pink,
];

interface Spark {
    id: number;
    /** 0–100 position along the chosen edge */
    edgePos: number;
    /** which border edge: 0=top 1=right 2=bottom 3=left */
    edge: 0 | 1 | 2 | 3;
    /** normalised travel vector (pre-scaled by distance) */
    dx: number;
    dy: number;
    color: string;
    size: number;
    duration: number;
    delay: number;
}

function makeSparks(count: number): Spark[] {
    return Array.from({ length: count }, (_, i) => {
        const edge = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;
        const edgePos = Math.random() * 100;

        // base outward direction + spread cone
        const spread = Math.PI / 3; // ±60°
        let baseAngle: number;
        switch (edge) {
            case 0:
                baseAngle = -Math.PI / 2;
                break; // top → up
            case 1:
                baseAngle = 0;
                break; // right → right
            case 2:
                baseAngle = Math.PI / 2;
                break; // bottom → down
            default:
                baseAngle = Math.PI;
                break; // left → left
        }
        const angle = baseAngle + (Math.random() - 0.5) * spread;
        const distance = 36 + Math.random() * 52;

        return {
            id: i,
            edge,
            edgePos,
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance,
            color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
            size: 4 + Math.random() * 6,
            duration: 0.62 + Math.random() * 0.42,
            delay: Math.random() * 0.15,
        };
    });
}

/** Converts an edge + edgePos (0-100%) into CSS top/left on the wrapper */
function sparkOrigin(spark: Spark): CSSProperties {
    switch (spark.edge) {
        case 0:
            return { top: 0, left: `${spark.edgePos}%` };
        case 1:
            return { top: `${spark.edgePos}%`, left: '100%' };
        case 2:
            return { top: '100%', left: `${spark.edgePos}%` };
        default:
            return { top: `${spark.edgePos}%`, left: 0 };
    }
}

interface SparkleEffectProps {
    /** Render prop — receives a `triggerSparkle` callback to fire on interaction */
    children: (triggerSparkle: () => void) => ReactNode;
    /** Number of particles per burst (default 32) */
    particleCount?: number;
    style?: CSSProperties;
}

type Burst = { id: number; sparks: Spark[] };

export function SparkleEffect({ children, particleCount = 32, style }: SparkleEffectProps) {
    const [bursts, setBursts] = useState<Burst[]>([]);

    const triggerSparkle = useCallback(() => {
        const id = Date.now();
        // Replace any existing burst so rapid clicks don't stack DOM nodes
        setBursts([{ id, sparks: makeSparks(particleCount) }]);
        setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 1400);
    }, [particleCount]);

    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                width: '100%',
                overflow: 'visible',
                ...style,
            }}
        >
            {children(triggerSparkle)}

            <AnimatePresence>
                {bursts.map((burst) => (
                    <div
                        key={burst.id}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            overflow: 'visible',
                            zIndex: 10,
                        }}
                    >
                        {burst.sparks.map((spark) => (
                            <motion.div
                                key={spark.id}
                                style={{
                                    position: 'absolute',
                                    width: spark.size,
                                    height: spark.size,
                                    borderRadius: '50%',
                                    background: spark.color,
                                    boxShadow: `0 0 ${spark.size * 1.5}px ${spark.color}`,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    ...sparkOrigin(spark),
                                }}
                                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                                animate={{
                                    x: spark.dx,
                                    y: spark.dy,
                                    opacity: [1, 1, 0],
                                    scale: [1, 1.3, 0],
                                }}
                                transition={{
                                    duration: spark.duration,
                                    delay: spark.delay,
                                    ease: 'easeOut',
                                    opacity: { times: [0, 0.4, 1] },
                                    scale: { times: [0, 0.3, 1] },
                                }}
                            />
                        ))}
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}
