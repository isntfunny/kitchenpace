# Mobile Header, Search, Menu & Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all header interactions (search, menu, user menu, notifications) work well on mobile by replacing dropdowns with fullscreen overlays and drawers.

**Architecture:** Two shared primitives (`MobileDrawer`, `MobileOverlay`) built with Framer Motion + Panda CSS. Each header element gets a mobile-specific wrapper that renders the shared primitive on `< md` breakpoint while keeping desktop behavior unchanged. Filter sheet gets styling polish only.

**Tech Stack:** Next.js 16, React 19, Panda CSS, Framer Motion (`motion` v12), Radix UI (desktop only), `lucide-react` icons

**Spec:** `docs/superpowers/specs/2026-03-26-mobile-header-menu-search-design.md`

---

## File Structure

### New Files

| File                                              | Responsibility                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/components/ui/MobileDrawer.tsx`              | Shared drawer primitive (slide from left/right, backdrop blur, swipe-to-close, scroll-lock) |
| `src/components/ui/MobileOverlay.tsx`             | Shared fullscreen overlay primitive (fade-in, backdrop blur, scroll-lock)                   |
| `src/components/features/MobileSearch.tsx`        | Mobile fullscreen search — wraps existing `HeaderSearch` logic                              |
| `src/components/features/MobileNavDrawer.tsx`     | Mobile hamburger menu drawer content                                                        |
| `src/components/features/MobileUserDrawer.tsx`    | Mobile user/profile drawer content                                                          |
| `src/components/features/MobileNotifications.tsx` | Mobile fullscreen notifications overlay                                                     |

### Modified Files

| File                                               | Changes                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/components/features/Header.tsx`               | Mobile header row renders MobileSearch trigger, MobileNavDrawer trigger        |
| `src/components/features/HeaderAuth.tsx`           | Mobile: MobileUserDrawer + MobileNotifications instead of Radix dropdowns      |
| `src/app/recipes/components/MobileFilterSheet.tsx` | Visual polishing: handle-bar, tighter padding, blur backdrop, dark mode tokens |

---

## Task 1: MobileOverlay Primitive

**Files:**

- Create: `src/components/ui/MobileOverlay.tsx`

- [ ] **Step 1: Create MobileOverlay component**

```tsx
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect } from 'react';

import { css } from 'styled-system/css';

export function MobileOverlay({
    open,
    onClose,
    children,
}: {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
}) {
    // Lock body scroll
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        zIndex: 60,
                        display: 'flex',
                        flexDirection: 'column',
                        bg: { base: 'rgba(255,252,248,0.97)', _dark: 'rgba(26,23,21,0.97)' },
                        backdropFilter: 'blur(20px)',
                    })}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
```

- [ ] **Step 2: Verify it renders in dev**

Open any page, temporarily import and render `<MobileOverlay open={true} onClose={() => {}}>Test</MobileOverlay>` inside a client component. Confirm fullscreen overlay appears with blur. Remove temporary usage.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/MobileOverlay.tsx
git commit -m "feat: add MobileOverlay primitive component"
```

---

## Task 2: MobileDrawer Primitive

**Files:**

- Create: `src/components/ui/MobileDrawer.tsx`

- [ ] **Step 1: Create MobileDrawer component**

```tsx
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useRef } from 'react';

import { css } from 'styled-system/css';

export function MobileDrawer({
    open,
    onClose,
    direction,
    children,
}: {
    open: boolean;
    onClose: () => void;
    direction: 'left' | 'right';
    children: ReactNode;
}) {
    const touchStart = useRef<number | null>(null);

    // Lock body scroll
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    const isLeft = direction === 'left';

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className={css({
                            position: 'fixed',
                            inset: 0,
                            zIndex: 60,
                            backdropFilter: 'blur(8px)',
                        })}
                        initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
                        animate={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                        exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />
                    {/* Drawer panel */}
                    <motion.div
                        className={css({
                            position: 'fixed',
                            top: 0,
                            bottom: 0,
                            zIndex: 61,
                            width: '85%',
                            maxWidth: '320px',
                            display: 'flex',
                            flexDirection: 'column',
                            bg: { base: 'white', _dark: '#1a1715' },
                            boxShadow: '0 0 40px rgba(0,0,0,0.15)',
                            overflowY: 'auto',
                            ...(isLeft ? { left: 0 } : { right: 0 }),
                        })}
                        initial={{ x: isLeft ? '-100%' : '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: isLeft ? '-100%' : '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        onTouchStart={(e) => {
                            touchStart.current = e.touches[0].clientX;
                        }}
                        onTouchEnd={(e) => {
                            if (touchStart.current === null) return;
                            const dx = e.changedTouches[0].clientX - touchStart.current;
                            touchStart.current = null;
                            const threshold = 80;
                            if (isLeft && dx < -threshold) onClose();
                            if (!isLeft && dx > threshold) onClose();
                        }}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
```

- [ ] **Step 2: Verify it renders in dev**

Temporarily render `<MobileDrawer open={true} onClose={() => {}} direction="left"><div style={{padding:20}}>Drawer</div></MobileDrawer>`. Confirm it slides in from left with blur backdrop. Test swipe-to-close by swiping left. Remove temporary usage.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/MobileDrawer.tsx
git commit -m "feat: add MobileDrawer primitive component"
```

---

## Task 3: MobileSearch Fullscreen Overlay

**Files:**

- Create: `src/components/features/MobileSearch.tsx`
- Modify: `src/components/features/Header.tsx`

- [ ] **Step 1: Create MobileSearch component**

This wraps the existing search logic (useStreamingSearch) in a fullscreen overlay. Read `src/components/features/HeaderSearch.tsx` first to understand the search state management, then extract the results rendering into this new component. The key insight: `HeaderSearch` uses `useStreamingSearch` for data and renders a dropdown. `MobileSearch` reuses the same hook but renders results fullscreen.

```tsx
'use client';

import { BookOpen, Carrot, Search, Sparkles, Tag, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useStreamingSearch } from '@app/lib/hooks/useStreamingSearch';
import { css } from 'styled-system/css';

import { MobileOverlay } from '../ui/MobileOverlay';

export function MobileSearch() {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const trimmedQuery = inputValue.trim();

    const { recipes, semanticRecipes, ingredients, tags, users, phase, hasSemantic } =
        useStreamingSearch(trimmedQuery, {
            enabled: open && trimmedQuery.length >= 2,
        });

    // Auto-focus when opening
    useEffect(() => {
        if (open) {
            // Small delay to let animation start
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setInputValue('');
        }
    }, [open]);

    const handleSelect = (href: string) => {
        setOpen(false);
        window.location.href = href;
    };

    const hasResults =
        recipes.length > 0 ||
        semanticRecipes.length > 0 ||
        ingredients.length > 0 ||
        tags.length > 0 ||
        users.length > 0;

    return (
        <>
            {/* Trigger — tapping the search area opens the overlay */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={css({
                    display: { base: 'flex', md: 'none' },
                    flex: 1,
                    alignItems: 'center',
                    gap: '2',
                    height: '44px',
                    px: '4',
                    borderRadius: 'full',
                    border: '1px solid',
                    borderColor: { base: 'border.subtle', _dark: 'border.subtle' },
                    bg: { base: 'surface.elevated', _dark: 'surface.elevated' },
                    color: 'text.muted',
                    fontSize: 'sm',
                    cursor: 'pointer',
                })}
            >
                <Search style={{ width: 16, height: 16, opacity: 0.5 }} />
                Rezepte, Zutaten, Tags suchen…
            </button>

            <MobileOverlay open={open} onClose={() => setOpen(false)}>
                {/* Header with input */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3',
                        px: '4',
                        py: '3',
                        borderBottom: '1px solid',
                        borderColor: { base: 'border.subtle', _dark: 'border.subtle' },
                        flexShrink: 0,
                    })}
                >
                    <Search style={{ width: 18, height: 18, opacity: 0.4, flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Rezepte, Zutaten, Tags suchen…"
                        className={css({
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            bg: 'transparent',
                            fontSize: 'md',
                            color: { base: 'text', _dark: 'text' },
                            '&::placeholder': { color: 'text.muted' },
                        })}
                    />
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: 'full',
                            border: 'none',
                            bg: { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(255,255,255,0.08)' },
                            color: { base: 'text.muted', _dark: 'text.muted' },
                            cursor: 'pointer',
                            flexShrink: 0,
                        })}
                    >
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Results area */}
                <div
                    className={css({
                        flex: 1,
                        overflowY: 'auto',
                        px: '4',
                        py: '3',
                    })}
                >
                    {trimmedQuery.length < 2 && (
                        <p
                            className={css({
                                textAlign: 'center',
                                color: 'text.muted',
                                fontSize: 'sm',
                                pt: '8',
                            })}
                        >
                            Mindestens 2 Zeichen eingeben…
                        </p>
                    )}

                    {phase === 'searching' && !hasResults && (
                        <p
                            className={css({
                                textAlign: 'center',
                                color: 'text.muted',
                                fontSize: 'sm',
                                pt: '8',
                            })}
                        >
                            Suche…
                        </p>
                    )}

                    {phase === 'done' && !hasResults && trimmedQuery.length >= 2 && (
                        <p
                            className={css({
                                textAlign: 'center',
                                color: 'text.muted',
                                fontSize: 'sm',
                                pt: '8',
                            })}
                        >
                            Keine Ergebnisse fuer &ldquo;{trimmedQuery}&rdquo;
                        </p>
                    )}

                    {/* Render result sections — follow same pattern as HeaderSearch dropdown */}
                    {/* Each section: icon + title header, then list of clickable items */}
                    {/* Implementation note: reuse the same section rendering logic from
                        HeaderSearch.tsx lines 172-280. Extract the section components
                        (RecipeSection, SuggestSection, UserSection) into shared modules
                        if they aren't already, or import them directly. */}

                    {hasSemantic && semanticRecipes.length > 0 && (
                        <MobileSearchSection icon={<Sparkles />} title="Das koennte passen">
                            {semanticRecipes.map((r) => (
                                <MobileSearchRecipeItem
                                    key={r.id}
                                    recipe={r}
                                    onSelect={() => handleSelect(`/recipe/${r.slug}`)}
                                />
                            ))}
                        </MobileSearchSection>
                    )}

                    {recipes.length > 0 && (
                        <MobileSearchSection icon={<BookOpen />} title="Rezepte">
                            {recipes.map((r) => (
                                <MobileSearchRecipeItem
                                    key={r.id}
                                    recipe={r}
                                    onSelect={() => handleSelect(`/recipe/${r.slug}`)}
                                />
                            ))}
                        </MobileSearchSection>
                    )}

                    {ingredients.length > 0 && (
                        <MobileSearchSection icon={<Carrot />} title="Zutaten">
                            {ingredients.map((item) => (
                                <MobileSearchSuggestItem
                                    key={item.name}
                                    label={item.name}
                                    count={item.count}
                                    onSelect={() =>
                                        handleSelect(
                                            `/recipes?ingredients=${encodeURIComponent(item.name)}`,
                                        )
                                    }
                                />
                            ))}
                        </MobileSearchSection>
                    )}

                    {tags.length > 0 && (
                        <MobileSearchSection icon={<Tag />} title="Tags">
                            {tags.map((item) => (
                                <MobileSearchSuggestItem
                                    key={item.name}
                                    label={item.name}
                                    count={item.count}
                                    onSelect={() =>
                                        handleSelect(
                                            `/recipes?tags=${encodeURIComponent(item.name)}`,
                                        )
                                    }
                                />
                            ))}
                        </MobileSearchSection>
                    )}

                    {users.length > 0 && (
                        <MobileSearchSection icon={<User />} title="Nutzer">
                            {users.map((u) => (
                                <MobileSearchSuggestItem
                                    key={u.id}
                                    label={u.nickname}
                                    onSelect={() => handleSelect(`/user/${u.slug ?? u.id}`)}
                                />
                            ))}
                        </MobileSearchSection>
                    )}
                </div>
            </MobileOverlay>
        </>
    );
}

function MobileSearchSection({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className={css({ mb: '4' })}>
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    mb: '2',
                    color: 'text.muted',
                    fontSize: 'xs',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                })}
            >
                <span style={{ width: 14, height: 14 }}>{icon}</span>
                {title}
            </div>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
                {children}
            </div>
        </div>
    );
}

function MobileSearchRecipeItem({
    recipe,
    onSelect,
}: {
    recipe: { id: string; title: string; slug: string; category?: string; totalTime?: number };
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '3',
                p: '3',
                borderRadius: 'lg',
                border: 'none',
                bg: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s',
                _hover: { bg: { base: 'rgba(0,0,0,0.03)', _dark: 'rgba(255,255,255,0.05)' } },
            })}
        >
            <div>
                <div className={css({ fontSize: 'sm', fontWeight: '600', color: 'text' })}>
                    {recipe.title}
                </div>
                {(recipe.category || recipe.totalTime) && (
                    <div className={css({ fontSize: 'xs', color: 'text.muted' })}>
                        {[recipe.category, recipe.totalTime ? `${recipe.totalTime} Min.` : null]
                            .filter(Boolean)
                            .join(' · ')}
                    </div>
                )}
            </div>
        </button>
    );
}

function MobileSearchSuggestItem({
    label,
    count,
    onSelect,
}: {
    label: string;
    count?: number;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={css({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: '3',
                borderRadius: 'lg',
                border: 'none',
                bg: 'transparent',
                cursor: 'pointer',
                width: '100%',
                transition: 'background 0.15s',
                _hover: { bg: { base: 'rgba(0,0,0,0.03)', _dark: 'rgba(255,255,255,0.05)' } },
            })}
        >
            <span className={css({ fontSize: 'sm', fontWeight: '600', color: 'text' })}>
                {label}
            </span>
            {count != null && (
                <span className={css({ fontSize: 'xs', color: 'text.muted' })}>
                    {count} Rezepte
                </span>
            )}
        </button>
    );
}
```

- [ ] **Step 2: Wire MobileSearch into Header mobile row**

In `src/components/features/Header.tsx`, find the mobile header row 2 (the row with `display: { base: 'flex', md: 'none' }`). Replace the existing `HeaderSearch` in the mobile row with `MobileSearch`. Keep `HeaderSearch` in the desktop row unchanged.

Read `Header.tsx` lines 404-448 to find the exact mobile row structure, then replace the search element in that row with `<MobileSearch />`.

The desktop row (lines 326-401, `display: { base: 'none', md: 'flex' }`) keeps `<HeaderSearch />` unchanged.

- [ ] **Step 3: Test on mobile viewport**

Run `npm run dev`. Open the site at 390px viewport width. Tap the search trigger — fullscreen overlay should appear. Type a query — results should render full-width. Close via X button. Verify desktop search dropdown still works at wider viewport.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/MobileSearch.tsx src/components/features/Header.tsx
git commit -m "feat: fullscreen mobile search overlay"
```

---

## Task 4: MobileNavDrawer (Hamburger Menu)

**Files:**

- Create: `src/components/features/MobileNavDrawer.tsx`
- Modify: `src/components/features/Header.tsx`

- [ ] **Step 1: Create MobileNavDrawer component**

Read `src/components/features/Header.tsx` lines 81-231 (`HeaderNavigationMenu`) to understand the menu items and their structure. Also read `src/components/features/HeaderMenuPanel.tsx` which defines `MenuSection` and link constants.

```tsx
'use client';

import { LayoutGrid, Menu, Plus, Shield, ShieldCheck, X, Zap } from 'lucide-react';
import { useState } from 'react';

import { useSession } from '@app/lib/auth-client';
import { css } from 'styled-system/css';

import { MobileDrawer } from '../ui/MobileDrawer';

import { MenuSection, QUICK_FILTER_LINKS } from './HeaderMenuPanel';
import { ThemeToggle } from './ThemeToggle';

export function MobileNavDrawer() {
    const [open, setOpen] = useState(false);
    const { data: session, isPending } = useSession();
    const isAuthenticated = !isPending && Boolean(session?.user?.id);
    const userRole = session?.user?.role;
    const isAdmin = isAuthenticated && userRole === 'admin';
    const isModerator = isAuthenticated && (userRole === 'moderator' || isAdmin);

    return (
        <>
            {/* Trigger — only on mobile */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={css({
                    display: { base: 'flex', md: 'none' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '44px',
                    minHeight: '44px',
                    borderRadius: 'xl',
                    border: '1px solid',
                    borderColor: { base: 'border.subtle', _dark: 'border.subtle' },
                    bg: { base: 'surface.elevated', _dark: 'surface.elevated' },
                    color: { base: 'text', _dark: 'text' },
                    cursor: 'pointer',
                })}
            >
                <Menu style={{ width: 20, height: 20 }} />
            </button>

            <MobileDrawer open={open} onClose={() => setOpen(false)} direction="left">
                {/* Drawer header */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: '5',
                        py: '4',
                        borderBottom: '1px solid',
                        borderColor: { base: 'border.subtle', _dark: 'border.subtle' },
                    })}
                >
                    <span
                        className={css({
                            fontSize: 'lg',
                            fontWeight: '800',
                            color: 'text',
                        })}
                    >
                        Menü
                    </span>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: 'full',
                            border: 'none',
                            bg: { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(255,255,255,0.08)' },
                            color: 'text.muted',
                            cursor: 'pointer',
                        })}
                    >
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Menu items */}
                <div className={css({ flex: 1, overflowY: 'auto', py: '2' })}>
                    <DrawerItem
                        icon={<LayoutGrid />}
                        label="Rezepte entdecken"
                        sub="Stoebere durch die komplette Sammlung"
                        href="/recipes"
                        onNavigate={() => setOpen(false)}
                    />

                    {/* Quick filters from HeaderMenuPanel */}
                    {QUICK_FILTER_LINKS.map((link) => (
                        <DrawerItem
                            key={link.href}
                            icon={link.icon ? <link.icon /> : <Zap />}
                            label={link.label}
                            sub={link.description}
                            href={link.href}
                            onNavigate={() => setOpen(false)}
                        />
                    ))}

                    {/* Auth-dependent items */}
                    {isAuthenticated && (
                        <>
                            <div
                                className={css({
                                    height: '1px',
                                    bg: { base: 'border.subtle', _dark: 'border.subtle' },
                                    mx: '5',
                                    my: '2',
                                })}
                            />
                            <DrawerItem
                                icon={<Plus />}
                                label="Rezept erstellen"
                                sub="Neue Idee festhalten"
                                href="/recipe/new"
                                onNavigate={() => setOpen(false)}
                            />
                        </>
                    )}

                    {isModerator && (
                        <>
                            <div
                                className={css({
                                    px: '5',
                                    pt: '3',
                                    pb: '1',
                                    fontSize: 'xs',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: 'text.muted',
                                })}
                            >
                                Verwaltung
                            </div>
                            {isAdmin && (
                                <DrawerItem
                                    icon={<Shield />}
                                    label="Administration"
                                    sub="Benutzer & Inhalte verwalten"
                                    href="/admin"
                                    onNavigate={() => setOpen(false)}
                                />
                            )}
                            <DrawerItem
                                icon={<ShieldCheck />}
                                label="Moderation"
                                sub="Inhalte pruefen & moderieren"
                                href="/moderation"
                                onNavigate={() => setOpen(false)}
                            />
                        </>
                    )}
                </div>

                {/* Footer: Theme toggle */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: '5',
                        py: '4',
                        borderTop: '1px solid',
                        borderColor: { base: 'border.subtle', _dark: 'border.subtle' },
                    })}
                >
                    <span className={css({ fontSize: 'sm', color: 'text.muted' })}>
                        Darstellung
                    </span>
                    <ThemeToggle />
                </div>
            </MobileDrawer>
        </>
    );
}

function DrawerItem({
    icon,
    label,
    sub,
    href,
    onNavigate,
}: {
    icon: React.ReactNode;
    label: string;
    sub?: string;
    href: string;
    onNavigate: () => void;
}) {
    return (
        <a
            href={href}
            onClick={onNavigate}
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '3',
                px: '5',
                py: '3',
                minHeight: '48px',
                textDecoration: 'none',
                color: 'text',
                transition: 'background 0.15s',
                _hover: { bg: { base: 'accent.soft', _dark: 'accent.soft' } },
            })}
        >
            <span
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: 'lg',
                    bg: { base: 'accent.soft', _dark: 'accent.soft' },
                    color: 'primary',
                    flexShrink: 0,
                })}
            >
                {icon}
            </span>
            <div>
                <div className={css({ fontSize: 'sm', fontWeight: '700' })}>{label}</div>
                {sub && <div className={css({ fontSize: 'xs', color: 'text.muted' })}>{sub}</div>}
            </div>
        </a>
    );
}
```

**Implementation note:** Read `HeaderMenuPanel.tsx` to check if `QUICK_FILTER_LINKS` is exported and what shape it has. If not exported, check how the existing `HeaderNavigationMenu` in `Header.tsx` builds its links and replicate the same data. Also check if `ThemeToggle` is a separate component or inline — if inline, extract the toggle from `Header.tsx` lines ~218-229.

- [ ] **Step 2: Wire into Header.tsx mobile row**

In `Header.tsx`, replace the existing `HeaderNavigationMenu` trigger button in the mobile row with `<MobileNavDrawer />`. Keep the desktop `HeaderNavigationMenu` unchanged (it uses `display: { base: 'none', md: 'flex' }` or similar).

- [ ] **Step 3: Test on mobile viewport**

Run dev server. At 390px viewport: tap hamburger → drawer slides from left. Verify all menu items render. Tap backdrop → closes. Swipe left → closes. Verify desktop hamburger dropdown still works.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/MobileNavDrawer.tsx src/components/features/Header.tsx
git commit -m "feat: fullscreen mobile navigation drawer (from left)"
```

---

## Task 5: MobileUserDrawer (Profile Menu from Right)

**Files:**

- Create: `src/components/features/MobileUserDrawer.tsx`
- Modify: `src/components/features/HeaderAuth.tsx`

- [ ] **Step 1: Create MobileUserDrawer component**

Read `src/components/features/HeaderAuth.tsx` lines 155-258 to understand the profile menu structure and `src/components/features/HeaderMenuPanel.tsx` for `PERSONAL_LINKS`.

```tsx
'use client';

import { LogOut, X } from 'lucide-react';
import { useState } from 'react';

import { handleSignOut } from '@app/components/auth/actions';
import { useProfile } from '@app/components/providers/ProfileProvider';
import { useSession } from '@app/lib/auth-client';
import { css } from 'styled-system/css';

import { Avatar } from '../atoms/Avatar';
import { MobileDrawer } from '../ui/MobileDrawer';

import { PERSONAL_LINKS } from './HeaderMenuPanel';

export function MobileUserDrawer() {
    const [open, setOpen] = useState(false);
    const { data: session } = useSession();
    const { profile } = useProfile();

    return (
        <>
            {/* Trigger — reuse existing avatar button pattern */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={css({
                    display: { base: 'flex', md: 'none' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: 'none',
                    bg: 'transparent',
                    p: 0,
                })}
            >
                <Avatar
                    nickname={profile?.nickname ?? session?.user?.name ?? '?'}
                    photoKey={profile?.photoKey ?? undefined}
                    size={36}
                />
            </button>

            <MobileDrawer open={open} onClose={() => setOpen(false)} direction="right">
                {/* Header with user info */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: '5',
                        py: '4',
                        borderBottom: '1px solid',
                        borderColor: { base: 'border.subtle', _dark: 'border.subtle' },
                    })}
                >
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                        <Avatar
                            nickname={profile?.nickname ?? session?.user?.name ?? '?'}
                            photoKey={profile?.photoKey ?? undefined}
                            size={40}
                        />
                        <div>
                            <div
                                className={css({
                                    fontSize: 'sm',
                                    fontWeight: '700',
                                    color: 'text',
                                })}
                            >
                                {profile?.nickname ?? session?.user?.name}
                            </div>
                            <div className={css({ fontSize: 'xs', color: 'text.muted' })}>
                                {session?.user?.email}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: 'full',
                            border: 'none',
                            bg: { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(255,255,255,0.08)' },
                            color: 'text.muted',
                            cursor: 'pointer',
                        })}
                    >
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Personal links */}
                <div className={css({ flex: 1, overflowY: 'auto', py: '2' })}>
                    <div
                        className={css({
                            px: '5',
                            pt: '3',
                            pb: '1',
                            fontSize: 'xs',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'text.muted',
                        })}
                    >
                        Fuer dich
                    </div>
                    {PERSONAL_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3',
                                px: '5',
                                py: '3',
                                minHeight: '48px',
                                textDecoration: 'none',
                                color: 'text',
                                transition: 'background 0.15s',
                                _hover: { bg: { base: 'accent.soft', _dark: 'accent.soft' } },
                            })}
                        >
                            <span
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: 'lg',
                                    bg: { base: 'accent.soft', _dark: 'accent.soft' },
                                    color: 'primary',
                                    flexShrink: 0,
                                })}
                            >
                                {link.icon && <link.icon size={16} />}
                            </span>
                            <div>
                                <div className={css({ fontSize: 'sm', fontWeight: '700' })}>
                                    {link.label}
                                </div>
                                {link.description && (
                                    <div className={css({ fontSize: 'xs', color: 'text.muted' })}>
                                        {link.description}
                                    </div>
                                )}
                            </div>
                        </a>
                    ))}
                </div>

                {/* Sign out */}
                <div
                    className={css({
                        px: '5',
                        py: '4',
                        borderTop: '1px solid',
                        borderColor: { base: 'border.subtle', _dark: 'border.subtle' },
                    })}
                >
                    <button
                        type="button"
                        onClick={() => handleSignOut()}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            width: '100%',
                            p: '3',
                            borderRadius: 'lg',
                            border: 'none',
                            bg: 'transparent',
                            color: 'status.error',
                            fontSize: 'sm',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            _hover: {
                                bg: {
                                    base: 'rgba(255,107,107,0.08)',
                                    _dark: 'rgba(255,107,107,0.12)',
                                },
                            },
                        })}
                    >
                        <LogOut style={{ width: 16, height: 16 }} />
                        Abmelden
                    </button>
                </div>
            </MobileDrawer>
        </>
    );
}
```

- [ ] **Step 2: Wire into HeaderAuth.tsx**

In `HeaderAuth.tsx`, add a mobile-only rendering path. On mobile (`< md`), render `<MobileUserDrawer />` instead of the Radix profile `DropdownMenu`. Keep the desktop dropdown unchanged.

Read `HeaderAuth.tsx` lines 155-258 to find the profile menu section, then wrap it with responsive display conditions: `display: { base: 'none', md: 'flex' }` for desktop, and render `<MobileUserDrawer />` with `display: { base: 'flex', md: 'none' }`.

- [ ] **Step 3: Test on mobile viewport**

At 390px: tap avatar → drawer slides from right with user info. Verify personal links render. Tap "Abmelden" works. Swipe right → closes. Desktop profile dropdown still works.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/MobileUserDrawer.tsx src/components/features/HeaderAuth.tsx
git commit -m "feat: fullscreen mobile user drawer (from right)"
```

---

## Task 6: MobileNotifications Overlay

**Files:**

- Create: `src/components/features/MobileNotifications.tsx`
- Modify: `src/components/features/HeaderAuth.tsx`

- [ ] **Step 1: Create MobileNotifications component**

Read `src/components/features/HeaderAuth.tsx` lines 88-152 and `src/components/notifications/InboxDropdown.tsx` for the notification rendering pattern.

```tsx
'use client';

import { Bell, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { NotificationItem } from '@app/components/notifications/NotificationItem';
import { resolveNotificationHref } from '@app/components/notifications/utils';
import { css } from 'styled-system/css';

import { MobileOverlay } from '../ui/MobileOverlay';

import type { useNotifications } from '@app/components/notifications/useNotifications';

type NotificationData = ReturnType<typeof useNotifications>;

export function MobileNotifications({
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
}: Pick<NotificationData, 'notifications' | 'unreadCount' | 'markAsRead' | 'markAllAsRead'>) {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Badge trigger — only on mobile */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={css({
                    display: { base: 'flex', md: 'none' },
                    position: 'relative',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: 'full',
                    border: 'none',
                    bg: 'transparent',
                    color: 'text',
                    cursor: 'pointer',
                })}
            >
                <Bell style={{ width: 20, height: 20 }} />
                {unreadCount > 0 && (
                    <span
                        className={css({
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            minWidth: '18px',
                            height: '18px',
                            borderRadius: 'full',
                            bg: 'status.danger',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: '1',
                        })}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <MobileOverlay open={open} onClose={() => setOpen(false)}>
                {/* Header */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: '4',
                        py: '3',
                        borderBottom: '1px solid',
                        borderColor: { base: 'border.subtle', _dark: 'border.subtle' },
                        flexShrink: 0,
                    })}
                >
                    <div>
                        <div className={css({ fontSize: 'lg', fontWeight: '800', color: 'text' })}>
                            Benachrichtigungen
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => markAllAsRead()}
                                className={css({
                                    fontSize: 'xs',
                                    color: 'primary',
                                    fontWeight: '600',
                                    border: 'none',
                                    bg: 'transparent',
                                    cursor: 'pointer',
                                    p: 0,
                                })}
                            >
                                Alle als gelesen markieren
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: 'full',
                            border: 'none',
                            bg: { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(255,255,255,0.08)' },
                            color: 'text.muted',
                            cursor: 'pointer',
                        })}
                    >
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Notification list */}
                <div className={css({ flex: 1, overflowY: 'auto' })}>
                    {notifications.length === 0 ? (
                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2',
                                pt: '12',
                                color: 'text.muted',
                            })}
                        >
                            <Bell style={{ width: 32, height: 32, opacity: 0.3 }} />
                            <p className={css({ fontSize: 'sm' })}>Noch keine Benachrichtigungen</p>
                        </div>
                    ) : (
                        notifications.slice(0, 30).map((n) => (
                            <NotificationItem
                                key={n.id}
                                notification={n}
                                href={resolveNotificationHref(n)}
                                onHover={() => {
                                    if (!n.readAt) markAsRead(n.id);
                                }}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div
                    className={css({
                        px: '4',
                        py: '3',
                        borderTop: '1px solid',
                        borderColor: { base: 'border.subtle', _dark: 'border.subtle' },
                        flexShrink: 0,
                    })}
                >
                    <Link
                        href="/notifications"
                        onClick={() => setOpen(false)}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            py: '3',
                            borderRadius: 'lg',
                            bg: { base: 'accent.soft', _dark: 'accent.soft' },
                            color: 'primary',
                            fontSize: 'sm',
                            fontWeight: '700',
                            textDecoration: 'none',
                        })}
                    >
                        Alle anzeigen
                    </Link>
                </div>
            </MobileOverlay>
        </>
    );
}
```

- [ ] **Step 2: Wire into HeaderAuth.tsx**

In `HeaderAuth.tsx`, add `MobileNotifications` for the mobile path. Pass the notification state from `useNotifications` hook (already in HeaderAuth) to `MobileNotifications`. Hide the desktop `InboxDropdown` on mobile with `display: { base: 'none', md: 'block' }`.

- [ ] **Step 3: Test on mobile viewport**

At 390px: tap notification bell → fullscreen overlay. Verify notification list renders. "Alle als gelesen markieren" works. "Alle anzeigen" navigates. Close via X. Desktop notification dropdown still works.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/MobileNotifications.tsx src/components/features/HeaderAuth.tsx
git commit -m "feat: fullscreen mobile notifications overlay"
```

---

## Task 7: Filter Sheet Visual Polishing

**Files:**

- Modify: `src/app/recipes/components/MobileFilterSheet.tsx`

- [ ] **Step 1: Read current MobileFilterSheet**

Read `src/app/recipes/components/MobileFilterSheet.tsx` completely to understand the current structure before making changes.

- [ ] **Step 2: Apply visual improvements**

Make these targeted changes to `MobileFilterSheet.tsx`:

1. **Add handle-bar** at the top of the sheet content (inside `motion.div`, before the header):

```tsx
<div
    className={css({
        width: '36px',
        height: '4px',
        borderRadius: 'full',
        bg: { base: 'rgba(0,0,0,0.15)', _dark: 'rgba(255,255,255,0.2)' },
        mx: 'auto',
        mt: '3',
        mb: '2',
    })}
/>
```

2. **Add backdrop blur** to the overlay backdrop — add `backdropFilter: 'blur(8px)'` to the `motion.div` that has `position: 'fixed', inset: 0`.

3. **Reduce horizontal padding** — find the scrollable content area and change `px` from `'4'` to `'3'`.

4. **Convert hardcoded colors to Panda tokens** — replace any `rgba()` background/border colors with semantic tokens like `border.subtle`, `surface.elevated`, `text.muted` where applicable.

- [ ] **Step 3: Test the filter sheet**

Navigate to `/recipes` on 390px viewport. Tap "Filter öffnen". Verify: handle-bar visible at top, backdrop has blur, content has tighter padding, colors work in both light and dark mode.

- [ ] **Step 4: Commit**

```bash
git add src/app/recipes/components/MobileFilterSheet.tsx
git commit -m "style: polish mobile filter sheet (handle-bar, blur, tighter padding, dark mode tokens)"
```

---

## Task 8: Final Integration Test

- [ ] **Step 1: Test all 4 mobile overlays together**

At 390px viewport, test this sequence:

1. Tap hamburger → drawer from left opens → close
2. Tap search → fullscreen overlay → type query → see results → close
3. Tap avatar → drawer from right opens → close
4. Tap notification bell → overlay → close
5. Navigate to `/recipes` → tap "Filter oeffnen" → handle-bar visible, blur backdrop
6. Switch to dark mode → repeat all steps → verify colors

- [ ] **Step 2: Test desktop is unchanged**

At 1280px viewport, verify:

1. Hamburger opens Radix DropdownMenu (not drawer)
2. Search shows inline dropdown (not overlay)
3. Avatar opens Radix profile menu (not drawer)
4. Notification bell opens InboxDropdown (not overlay)

- [ ] **Step 3: Run lint and format checks**

```bash
npm run lint
npm run format:check
```

Fix any issues found.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: lint and format issues from mobile overlay implementation"
```
