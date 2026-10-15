'use client';

import { useCombobox } from 'downshift';
import { Loader2, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Text } from '@app/components/atoms/Typography';
import { searchIngredients, type IngredientSearchResponse } from '@app/components/recipe/actions';
import { IngredientSearchDropdown } from '@app/components/recipe/RecipeForm/components/IngredientSearchDropdown';
import type { BringItem } from '@app/lib/bring/types';

import { css } from 'styled-system/css';

import { field, label, stack } from './styles';

export function ShoppingAddForm({
    disabled,
    onAdd,
}: {
    disabled: boolean;
    onAdd: (item: BringItem) => Promise<boolean>;
}) {
    const [name, setName] = useState('');
    const [specification, setSpecification] = useState('');
    const [details, setDetails] = useState(false);
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState<IngredientSearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);

    useEffect(() => {
        if (query.trim().length < 2 || disabled) return;
        let active = true;
        const timer = setTimeout(async () => {
            try {
                const result = await searchIngredients(query.trim());
                if (active) setResponse(result);
            } catch {
                if (active) setFailed(true);
            } finally {
                if (active) setLoading(false);
            }
        }, 180);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [query, disabled]);

    const suggestions = response?.results ?? [];
    const { getInputProps, getMenuProps, getItemProps, highlightedIndex } = useCombobox({
        items: suggestions,
        itemToString: (item) => item?.name ?? '',
        inputValue: name,
        selectedItem: null,
        isOpen: suggestionsOpen && suggestions.length > 0 && !disabled,
        defaultHighlightedIndex: -1,
        onInputValueChange: ({ inputValue, type }) => {
            if (type !== useCombobox.stateChangeTypes.InputChange) return;
            const value = inputValue ?? '';
            setName(value);
            setQuery(value);
            setResponse(null);
            setFailed(false);
            setLoading(value.trim().length >= 2);
            setSuggestionsOpen(true);
        },
        onIsOpenChange: ({ isOpen }) => setSuggestionsOpen(!!isOpen),
        onSelectedItemChange: ({ selectedItem }) => {
            if (!selectedItem) return;
            setName(selectedItem.name);
            const quantity = [response?.parsed.amount, response?.parsed.unit]
                .filter(Boolean)
                .join(' ');
            if (quantity) setSpecification((previous) => previous || quantity);
            setDetails(true);
            setQuery('');
            setResponse(null);
            setLoading(false);
            setSuggestionsOpen(false);
        },
    });

    async function add() {
        if (disabled || !name.trim()) return;
        setSuggestionsOpen(false);
        if (await onAdd({ name: name.trim(), specification })) {
            setName('');
            setQuery('');
            setSpecification('');
            setDetails(false);
            setResponse(null);
            setLoading(false);
            setFailed(false);
        }
    }

    return (
        <form
            className={stack}
            onSubmit={(event) => {
                event.preventDefault();
                void add();
            }}
        >
            <div className={css({ display: 'flex', gap: '2', alignItems: 'flex-start' })}>
                <div className={css({ flex: 1, minW: 0, position: 'relative' })}>
                    <Search
                        size={18}
                        aria-hidden
                        className={css({
                            position: 'absolute',
                            left: '3',
                            top: '3.5',
                            color: 'text-muted',
                            pointerEvents: 'none',
                        })}
                    />
                    <input
                        {...getInputProps({
                            'aria-label': 'Artikel hinzufügen',
                            placeholder: 'Was brauchst du?',
                            disabled,
                            autoComplete: 'off',
                            maxLength: 200,
                            onKeyDown: (event) => {
                                if (event.key === 'Escape') {
                                    setSuggestionsOpen(false);
                                }
                            },
                        })}
                        className={field}
                        style={{ paddingLeft: 40, paddingRight: 32 }}
                    />
                    {loading && !disabled && (
                        <Loader2
                            size={16}
                            aria-label="Zutaten werden gesucht"
                            className={css({
                                position: 'absolute',
                                right: '3',
                                top: '3.5',
                                color: 'primary',
                                animation: 'spin 1s linear infinite',
                                _motionReduce: { animation: 'none' },
                            })}
                        />
                    )}
                    <ul {...getMenuProps()} className={css({ position: 'relative', zIndex: 10 })}>
                        {suggestionsOpen && suggestions.length > 0 && !disabled && (
                            <li role="presentation">
                                <IngredientSearchDropdown>
                                    {suggestions.map((item, index) => (
                                        <div
                                            key={item.id}
                                            {...getItemProps({ item, index })}
                                            className={css({
                                                px: '3',
                                                py: '3',
                                                minH: '11',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1',
                                                color: 'text',
                                                fontSize: 'sm',
                                                _hover: { bg: 'accent.soft' },
                                            })}
                                            style={
                                                highlightedIndex === index
                                                    ? { background: 'var(--colors-accent-soft)' }
                                                    : undefined
                                            }
                                        >
                                            <span className={css({ fontWeight: '600' })}>
                                                {highlightName(
                                                    item.name,
                                                    response?.parsed.name ?? query,
                                                )}
                                            </span>
                                            {(item.categories[0] || item.matchedAlias) && (
                                                <span
                                                    className={css({
                                                        color: 'text-muted',
                                                        fontSize: 'xs',
                                                    })}
                                                >
                                                    {[item.categories[0], item.matchedAlias]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </IngredientSearchDropdown>
                            </li>
                        )}
                    </ul>
                </div>
                <Button
                    type="submit"
                    disabled={disabled || !name.trim()}
                    aria-label="Hinzufügen"
                    title="Hinzufügen"
                    style={{ minWidth: 44, minHeight: 44, padding: 10 }}
                >
                    <Plus size={22} aria-hidden />
                </Button>
            </div>
            {failed && (
                <Text size="sm" color="muted" role="status">
                    Vorschläge gerade nicht verfügbar. Du kannst den Artikel trotzdem hinzufügen.
                </Text>
            )}
            {!loading &&
                !failed &&
                suggestionsOpen &&
                query.trim().length >= 2 &&
                response?.results.length === 0 && (
                    <Text size="sm" color="muted">
                        Kein passender Vorschlag. Du kannst „{name}“ frei hinzufügen.
                    </Text>
                )}
            {details ? (
                <label className={label}>
                    Menge oder Details
                    <input
                        className={field}
                        value={specification}
                        disabled={disabled}
                        maxLength={500}
                        placeholder="z. B. 200 g oder eine reife Frucht"
                        onChange={(event) => setSpecification(event.target.value)}
                    />
                </label>
            ) : (
                <div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => setDetails(true)}
                    >
                        <Plus size={14} aria-hidden /> Menge / Details
                    </Button>
                </div>
            )}
        </form>
    );
}

function highlightName(name: string, query: string) {
    const index = name.toLocaleLowerCase('de').indexOf(query.toLocaleLowerCase('de'));
    if (index < 0 || !query) return name;
    return (
        <>
            {name.slice(0, index)}
            <mark className={css({ bg: 'transparent', color: 'primary' })}>
                {name.slice(index, index + query.length)}
            </mark>
            {name.slice(index + query.length)}
        </>
    );
}
