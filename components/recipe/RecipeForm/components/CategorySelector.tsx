'use client';

import { Check } from 'lucide-react';
import { Checkbox } from 'radix-ui';

import { css } from 'styled-system/css';

import { Category } from '../data';

interface CategorySelectorProps {
    categories: Category[];
    selectedIds: string[];
    onToggle: (id: string, selected: boolean) => void;
}

export function CategorySelector({ categories, selectedIds, onToggle }: CategorySelectorProps) {
    return (
        <div>
            <label className={css({ fontWeight: '600', display: 'block', mb: '2' })}>
                Kategorien (mindestens eine)
            </label>
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '2',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '2',
                    border: '1px solid rgba(224,123,83,0.4)',
                    borderRadius: 'xl',
                })}
            >
                {categories.map((cat) => (
                    <label
                        key={cat.id}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            cursor: 'pointer',
                            padding: '1',
                            borderRadius: 'md',
                            _hover: { bg: 'gray.50' },
                        })}
                    >
                        <Checkbox.Root
                            checked={selectedIds.includes(cat.id)}
                            onCheckedChange={(checked) => {
                                onToggle(cat.id, checked === true);
                            }}
                            className={css({
                                width: '4',
                                height: '4',
                                backgroundColor: 'white',
                                borderRadius: 'sm',
                                border: '2px solid',
                                borderColor: selectedIds.includes(cat.id)
                                    ? 'brand.primary'
                                    : 'gray.300',
                                cursor: 'pointer',
                                transition: 'all 150ms ease',
                                _hover: { borderColor: 'brand.primary' },
                                '&[data-state="checked"]': {
                                    backgroundColor: 'brand.primary',
                                    borderColor: 'brand.primary',
                                },
                            })}
                        >
                            <Checkbox.Indicator>
                                <Check color="white" size={12} />
                            </Checkbox.Indicator>
                        </Checkbox.Root>
                        <span>{cat.name}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
