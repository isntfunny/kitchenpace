import Link from 'next/link';

import type { TrendingTagData } from '@/app/actions/community';
import { buildRecipeFilterHref } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';

import { Heading } from '../atoms/Typography';
import { Flame } from 'lucide-react';

interface TrendingTagsProps {
    tags: TrendingTagData[];
}

export function TrendingTags({ tags }: TrendingTagsProps) {
    if (tags.length === 0) {
        return (
            <div
                className={css({
                    p: '4',
                    borderRadius: '2xl',
                    bg: '#fffcf9',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                })}
            >
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: 'primary',
                        mb: '2',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    })}
                >
                    <Flame size={18} />
                    <span>Trending</span>
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
                p: '4',
                borderRadius: '2xl',
                bg: '#fffcf9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div className={css({ mb: '2' })}>
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: 'primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    })}
                >
                    <Flame size={18} />
                    <span>Trending</span>
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
                    <Link
                        key={item.tag}
                        href={buildRecipeFilterHref({ tags: [item.tag] })}
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
                            textDecoration: 'none',
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
                    </Link>
                ))}
            </div>
        </div>
    );
}
