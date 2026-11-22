/**
 * State of the week selection dialog (KUC-126): chosen slots, picked dishes per meal kind,
 * servings and side dishes. Pure reducer plus counters; the capacity of a kind is the number
 * of chosen slots of that kind, a dish uses one slot plus one per leftover day.
 */
import type { RecipeCardData } from '@app/app/actions/recipes';

// Relative on purpose: the unit tests run without the path aliases
import { leftoverDays } from '../../../../shared/meal-planning/distribute';
import { MEAL_KIND_LABELS, type MealKind } from '../../../../shared/meal-planning/meal-kind';

export type Pick = {
    recipe: RecipeCardData;
    kind: MealKind;
    servings: number;
    side?: { card: RecipeCardData; accepted: boolean };
};

export type SelectionState = {
    household: number;
    /** "date|slotKey" */
    chosenSlots: string[];
    /** Kind of every slot that can be chosen, by "date|slotKey" */
    slotKinds: Record<string, MealKind>;
    /** In the order of choice */
    picks: Pick[];
};

export type SelectionAction =
    | { type: 'toggleSlot'; key: string }
    | { type: 'setSlots'; keys: string[] }
    | { type: 'togglePick'; recipe: RecipeCardData; kind: MealKind }
    | { type: 'servings'; recipeId: string; delta: 1 | -1 }
    | { type: 'side'; recipeId: string; side: { card: RecipeCardData } | null }
    | { type: 'acceptSide'; recipeId: string; accepted: boolean };

const KIND_ORDER: MealKind[] = ['main', 'breakfast', 'snack'];

/** Chosen slots of the kind. */
export function capacityOf(s: SelectionState, kind: MealKind): number {
    return s.chosenSlots.filter((key) => s.slotKinds[key] === kind).length;
}

const slotsNeeded = (servings: number, household: number) => 1 + leftoverDays(servings, household);

/** Slots used by the picks of the kind: Σ (1 + leftover days). */
export function usedOf(s: SelectionState, kind: MealKind): number {
    return s.picks
        .filter((p) => p.kind === kind)
        .reduce((sum, p) => sum + slotsNeeded(p.servings, s.household), 0);
}

/** A new pick starts with the household's servings, so it needs exactly one slot. */
export function canPick(s: SelectionState, kind: MealKind): boolean {
    return usedOf(s, kind) + slotsNeeded(s.household, s.household) <= capacityOf(s, kind);
}

/** One more serving must not need more slots than the kind has. */
export function canIncrement(s: SelectionState, recipeId: string): boolean {
    const pick = s.picks.find((p) => p.recipe.id === recipeId);
    if (!pick) return false;
    const next =
        usedOf(s, pick.kind) -
        slotsNeeded(pick.servings, s.household) +
        slotsNeeded(pick.servings + 1, s.household);
    return next <= capacityOf(s, pick.kind);
}

export function tabsOf(
    s: SelectionState,
): { kind: MealKind; label: string; used: number; capacity: number; full: boolean }[] {
    return KIND_ORDER.map((kind) => ({
        kind,
        label: MEAL_KIND_LABELS[kind],
        used: usedOf(s, kind),
        capacity: capacityOf(s, kind),
    }))
        .filter((t) => t.capacity > 0)
        .map((t) => ({ ...t, full: t.used >= t.capacity }));
}

/** Drops the last picks of every kind until they fit into the chosen slots. */
function fitToCapacity(s: SelectionState): SelectionState {
    let picks = s.picks;
    for (const kind of KIND_ORDER) {
        const capacity = capacityOf(s, kind);
        const used = (list: Pick[]) =>
            list
                .filter((p) => p.kind === kind)
                .reduce((sum, p) => sum + slotsNeeded(p.servings, s.household), 0);
        while (used(picks) > capacity) {
            const last = picks.findLastIndex((p) => p.kind === kind);
            picks = picks.filter((_, i) => i !== last);
        }
    }
    return picks === s.picks ? s : { ...s, picks };
}

const mapPick = (s: SelectionState, recipeId: string, fn: (p: Pick) => Pick): SelectionState => ({
    ...s,
    picks: s.picks.map((p) => (p.recipe.id === recipeId ? fn(p) : p)),
});

export function selectionReducer(s: SelectionState, a: SelectionAction): SelectionState {
    switch (a.type) {
        case 'toggleSlot': {
            const chosenSlots = s.chosenSlots.includes(a.key)
                ? s.chosenSlots.filter((k) => k !== a.key)
                : [...s.chosenSlots, a.key];
            return fitToCapacity({ ...s, chosenSlots });
        }
        case 'setSlots':
            return fitToCapacity({ ...s, chosenSlots: [...new Set(a.keys)] });
        case 'togglePick': {
            if (s.picks.some((p) => p.recipe.id === a.recipe.id)) {
                return { ...s, picks: s.picks.filter((p) => p.recipe.id !== a.recipe.id) };
            }
            if (!canPick(s, a.kind)) return s;
            return {
                ...s,
                picks: [...s.picks, { recipe: a.recipe, kind: a.kind, servings: s.household }],
            };
        }
        case 'servings': {
            const pick = s.picks.find((p) => p.recipe.id === a.recipeId);
            if (!pick) return s;
            if (a.delta === 1) {
                return canIncrement(s, a.recipeId)
                    ? mapPick(s, a.recipeId, (p) => ({ ...p, servings: p.servings + 1 }))
                    : s;
            }
            return pick.servings <= 1
                ? s
                : mapPick(s, a.recipeId, (p) => ({ ...p, servings: p.servings - 1 }));
        }
        case 'side':
            return mapPick(s, a.recipeId, (p) => {
                if (!a.side) {
                    const { side: _side, ...rest } = p;
                    return rest;
                }
                const same = p.side?.card.id === a.side.card.id;
                return {
                    ...p,
                    side: { card: a.side.card, accepted: same ? p.side!.accepted : false },
                };
            });
        case 'acceptSide':
            return mapPick(s, a.recipeId, (p) =>
                p.side ? { ...p, side: { ...p.side, accepted: a.accepted } } : p,
            );
    }
}
