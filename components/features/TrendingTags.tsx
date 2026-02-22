import type { TrendingTagData } from '@/app/actions/community';
import { css } from 'styled-system/css';

import { Heading } from '../atoms/Typography';

interface TrendingTagsProps {
    tags: TrendingTagData[];
}

export function TrendingTags({ tags }: TrendingTagsProps) {
    if (tags.length === 0) {
        return (
            <div
                className={css({
                    p: '5',
                    borderRadius: '2xl',
                    bg: '#fffcf9',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                })}
            >
                <Heading as="h3" size="md" className={css({ color: 'primary', mb: '3' })}>
                    Trending 🔥
                </Heading>
                <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                    Aktuell keine Tags verfügbar.
                </p>
            </div>
        );
    }

    return (
        <div
            className={css({
                p: '5',
                borderRadius: '2xl',
                bg: '#fffcf9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div className={css({ mb: '3' })}>
                <Heading as="h3" size="md" className={css({ color: 'primary' })}>
                    Trending 🔥
                </Heading>
            </div>
            <div
                className={css({
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '2',
                })}
            >
                {tags.map((item) => (
                    <button
                        key={item.tag}
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '1.5',
                            px: '3',
                            py: '1.5',
                            borderRadius: 'full',
                            fontSize: 'sm',
                            fontFamily: 'body',
                            fontWeight: '500',
                            bg: 'transparent',
                            color: 'text',
                            border: '1px solid',
                            borderColor: 'rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            _hover: {
                                bg: item.color,
                                color: 'white',
                                borderColor: item.color,
                            },
                            transition: 'all 150ms ease',
                        })}
                    >
                        <span>{item.tag}</span>
                        <span
                            className={css({
                                fontSize: '0.65rem',
                                bg: 'rgba(0,0,0,0.1)',
                                px: '1.5',
                                py: '0.5',
                                borderRadius: 'full',
                            })}
                        >
                            {item.count}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
