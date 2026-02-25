import type { QuickTipData } from '@/app/actions/community';
import { css } from 'styled-system/css';

import { Heading, Text } from '../atoms/Typography';

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
                    bg: '#fffcf9',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                })}
            >
                <Heading as="h3" size="md" className={css({ color: '#00b894', mb: '2' })}>
                    Küchen-Hacks 💡
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
                bg: '#fffcf9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div className={css({ mb: '2' })}>
                <Heading as="h3" size="md" className={css({ color: '#00b894' })}>
                    Küchen-Hacks 💡
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
                            {tip.icon}
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
