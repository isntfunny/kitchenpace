'use client';

import { useState } from 'react';

import { css } from 'styled-system/css';

interface ShoppingItem {
    id: string;
    name: string;
    quantity: string;
    category: string;
    checked: boolean;
    recipe?: string;
}

interface DashboardShoppingListProps {
    items: ShoppingItem[];
}

const categoryIcons: Record<string, string> = {
    Gemüse: '🥬',
    Obst: '🍎',
    Fleisch: '🥩',
    Fisch: '🐟',
    Milchprodukte: '🧀',
    Gewürze: '🧂',
    Backen: '🥖',
    Getränke: '🥤',
    Sonstiges: '📦',
};

function ShoppingItemRow({
    item,
    onToggle,
}: {
    item: ShoppingItem;
    onToggle: (id: string) => void;
}) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '3',
                padding: '3',
                borderRadius: 'lg',
                transition: 'all 150ms ease',
                _hover: {
                    background: 'rgba(0,0,0,0.02)',
                },
            })}
        >
            <button
                onClick={() => onToggle(item.id)}
                className={css({
                    width: '24px',
                    height: '24px',
                    borderRadius: 'full',
                    border: item.checked ? 'none' : '2px solid',
                    borderColor: item.checked ? '#00b894' : 'rgba(0,0,0,0.2)',
                    background: item.checked ? '#00b894' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'sm',
                    color: 'white',
                    flexShrink: 0,
                    transition: 'all 150ms ease',
                })}
            >
                {item.checked && '✓'}
            </button>
            <div
                className={css({
                    flex: '1',
                })}
            >
                <p
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '500',
                        color: item.checked ? 'text-muted' : 'text',
                        textDecoration: item.checked ? 'line-through' : 'none',
                    })}
                >
                    {item.name}
                </p>
                {item.recipe && (
                    <p
                        className={css({
                            fontSize: 'xs',
                            color: 'text-muted',
                        })}
                    >
                        für {item.recipe}
                    </p>
                )}
            </div>
            <span
                className={css({
                    fontSize: 'xs',
                    color: 'text-muted',
                    background: 'rgba(0,0,0,0.04)',
                    px: '2',
                    py: '1',
                    borderRadius: 'full',
                })}
            >
                {item.quantity}
            </span>
        </div>
    );
}

export function DashboardShoppingList({ items: initialItems }: DashboardShoppingListProps) {
    const [items, setItems] = useState(initialItems);

    const toggleItem = (id: string) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
        );
    };

    const checkedCount = items.filter((i) => i.checked).length;
    const totalCount = items.length;
    const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

    const groupedItems = items.reduce(
        (acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        },
        {} as Record<string, ShoppingItem[]>,
    );

    return (
        <div
            className={css({
                background: 'white',
                borderRadius: '2xl',
                padding: '6',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.06)',
                height: 'fit-content',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: '4',
                })}
            >
                <div>
                    <h3
                        className={css({
                            fontSize: 'xl',
                            fontWeight: '700',
                            color: 'text',
                        })}
                    >
                        Einkaufsliste 🛒
                    </h3>
                    <p
                        className={css({
                            fontSize: 'sm',
                            color: 'text-muted',
                            mt: '1',
                        })}
                    >
                        {checkedCount} von {totalCount} erledigt
                    </p>
                </div>
                <button
                    className={css({
                        fontSize: 'xs',
                        fontWeight: '600',
                        color: 'white',
                        background: '#e07b53',
                        border: 'none',
                        px: '3',
                        py: '1.5',
                        borderRadius: 'lg',
                        cursor: 'pointer',
                        _hover: {
                            background: '#c4623d',
                        },
                    })}
                >
                    + Hinzufügen
                </button>
            </div>

            <div
                className={css({
                    height: '6px',
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: 'full',
                    overflow: 'hidden',
                    mb: '4',
                })}
            >
                <div
                    className={css({
                        height: '100%',
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #e07b53, #f8b500)',
                        borderRadius: 'full',
                        transition: 'width 300ms ease',
                    })}
                />
            </div>

            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4',
                    maxHeight: '300px',
                    overflowY: 'auto',
                })}
            >
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <div key={category}>
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                mb: '2',
                                paddingLeft: '1',
                            })}
                        >
                            <span>{categoryIcons[category] || '📦'}</span>
                            <span
                                className={css({
                                    fontSize: 'xs',
                                    fontWeight: '600',
                                    color: 'text-muted',
                                    textTransform: 'uppercase',
                                    letterSpacing: 'wide',
                                })}
                            >
                                {category}
                            </span>
                        </div>
                        {categoryItems.map((item) => (
                            <ShoppingItemRow key={item.id} item={item} onToggle={toggleItem} />
                        ))}
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div
                    className={css({
                        textAlign: 'center',
                        py: '6',
                        color: 'text-muted',
                    })}
                >
                    <span
                        className={css({
                            fontSize: '2xl',
                            display: 'block',
                            mb: '2',
                        })}
                    >
                        🛒
                    </span>
                    <p className={css({ fontSize: 'sm' })}>Keine Artikel in der Liste</p>
                </div>
            )}
        </div>
    );
}
