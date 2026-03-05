import { BarChart3, Clock, Flame, Tag, Users, BookOpen, Heart, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { QuickTipData, QuickTipIconName } from '@app/app/actions/community';
import { css } from 'styled-system/css';

import { Heading, Text } from '../atoms/Typography';

const TIP_ICON_MAP: Record<QuickTipIconName, LucideIcon> = {
    tag: Tag,
    flame: Flame,
    clock: Clock,
    users: Users,
    book: BookOpen,
    heart: Heart,
    star: Star,
    chart: BarChart3,
};

interface QuickTipsProps {
    tips: QuickTipData[];
}

export function QuickTips({ tips }: QuickTipsProps) {
    if (tips.length === 0) {
        return (
            <div
                className={css({
                    p: '4',
                    borderRadius: '2xl',
                    bg: 'surface',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                })}
            >
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: '#00b894',
                        mb: '2',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    })}
                >
                    <BarChart3 size={18} />
                    <span>Unsere Statistiken</span>
                </Heading>
                <Text size="sm" color="muted">
                    Wir bereiten gerade neue Tipps für dich vor.
                </Text>
            </div>
        );
    }

    return (
        <div
            className={css({
                p: '4',
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div className={css({ mb: '2' })}>
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: '#00b894',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    })}
                >
                    <BarChart3 size={18} />
                    <span>Unsere Statistiken</span>
                </Heading>
            </div>

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                {tips.map((tip) => (
                    <div
                        key={tip.title}
                        className={css({
                            display: 'flex',
                            gap: '2',
                            p: '2',
                            _hover: {
                                bg: 'rgba(0,0,0,0.02)',
                            },
                            transition: 'background 150ms ease',
                        })}
                    >
                        <span
                            className={css({
                                fontSize: 'xl',
                                flexShrink: 0,
                                width: '36px',
                                height: '36px',
                                display: 'grid',
                                placeItems: 'center',
                                borderRadius: 'full',
                                background: tip.iconBg,
                                color: 'white',
                            })}
                        >
                            {(() => {
                                const Icon = TIP_ICON_MAP[tip.icon];
                                return Icon ? <Icon size={18} /> : null;
                            })()}
                        </span>
                        <div>
                            <Text size="sm" className={css({ fontWeight: '600', color: 'text' })}>
                                {tip.title}
                            </Text>
                            <Text size="sm" color="muted">
                                {tip.content}
                            </Text>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
