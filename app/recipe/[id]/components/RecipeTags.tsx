'use client';

import { Badge } from '@/components/atoms/Badge';
import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface RecipeTagsProps {
    category: string;
    difficulty: string;
    tags: string[];
    onCategoryClick: (category: string) => void;
    onDifficultyClick: (difficulty: string) => void;
    onTagClick: (tag: string) => void;
}

export function RecipeTags({
    category,
    difficulty,
    tags,
    onCategoryClick,
    onDifficultyClick,
    onTagClick,
}: RecipeTagsProps) {
    return (
        <>
            <div className={flex({ gap: '2', mb: '4', flexWrap: 'wrap' })}>
                <button
                    onClick={() => onCategoryClick(category)}
                    className={css({ cursor: 'pointer', _hover: { opacity: 0.8 } })}
                >
                    <Badge>{category}</Badge>
                </button>
                <button
                    onClick={() => onDifficultyClick(difficulty)}
                    className={css({
                        px: '3',
                        py: '1',
                        bg: 'light',
                        borderRadius: 'full',
                        fontSize: 'sm',
                        fontFamily: 'body',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        _hover: { bg: '#e8e2d9' },
                    })}
                >
                    {difficulty}
                </button>
            </div>

            <div className={flex({ gap: '2', mt: '4', flexWrap: 'wrap' })}>
                {tags.map((tag) => (
                    <button
                        key={tag}
                        onClick={() => onTagClick(tag)}
                        className={css({
                            fontSize: 'sm',
                            color: 'primary',
                            fontFamily: 'body',
                            cursor: 'pointer',
                            _hover: { textDecoration: 'underline' },
                        })}
                    >
                        #{tag}
                    </button>
                ))}
            </div>
        </>
    );
}
