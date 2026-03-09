'use client';

import { List, Link2 } from 'lucide-react';
import { useState } from 'react';

import type { Category, Tag } from '@app/components/recipe/RecipeForm/data';
import { css } from 'styled-system/css';

import { BulkImportClient } from './BulkImportClient';
import { ImportRecipeClient } from './ImportRecipeClient';

type ImportMode = 'single' | 'bulk';

interface ImportModeSwitcherProps {
    categories: Category[];
    tags: Tag[];
    authorId: string;
}

export function ImportModeSwitcher({ categories, tags, authorId }: ImportModeSwitcherProps) {
    const [mode, setMode] = useState<ImportMode>('single');

    return (
        <>
            {/* Mode toggle — top-right corner */}
            <div className={toggleWrapperClass}>
                <div className={toggleGroupClass}>
                    <button
                        type="button"
                        onClick={() => setMode('single')}
                        className={toggleButtonClass(mode === 'single')}
                    >
                        <Link2 size={14} />
                        Einzeln
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('bulk')}
                        className={toggleButtonClass(mode === 'bulk')}
                    >
                        <List size={14} />
                        Bulk
                    </button>
                </div>
            </div>

            {mode === 'single' ? (
                <ImportRecipeClient categories={categories} tags={tags} authorId={authorId} />
            ) : (
                <BulkImportClient categories={categories} tags={tags} authorId={authorId} />
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const toggleWrapperClass = css({
    display: 'flex',
    justifyContent: 'center',
    pt: '6',
    pb: '0',
});

const toggleGroupClass = css({
    display: 'inline-flex',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.2)', _dark: 'rgba(224,123,83,0.25)' },
    overflow: 'hidden',
    backgroundColor: { base: 'white', _dark: 'surface' },
    boxShadow: { base: '0 2px 8px rgba(0,0,0,0.04)', _dark: '0 2px 8px rgba(0,0,0,0.2)' },
});

const toggleButtonClass = (active: boolean) =>
    css({
        display: 'flex',
        alignItems: 'center',
        gap: '1.5',
        px: '4',
        py: '2',
        fontSize: 'sm',
        fontWeight: active ? '700' : '500',
        color: active ? 'white' : 'text.muted',
        backgroundColor: active
            ? 'palette.orange'
            : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        _hover: active
            ? {}
            : { color: 'text', backgroundColor: { base: 'rgba(224,123,83,0.05)', _dark: 'rgba(224,123,83,0.08)' } },
    });
