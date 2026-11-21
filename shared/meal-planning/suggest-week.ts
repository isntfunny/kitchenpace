/**
 * "Plan mir die Woche" (KUC-113): rule-based suggestions for the empty slots of a week.
 *
 * - Only empty slots are filled; existing entries are never touched or returned.
 * - Rules: taste, season, duration per weekday, variety (no repeats, spread categories),
 *   shared ingredients, soon-expiring ingredients.
 * - Deterministic: same input + same seed => same output (a hash-based tie-breaker, no
 *   global random state, no dependence on input order).
 * - Every suggestion carries 1–2 short German reasons.
 */
import { diffDays, isWeekend, seasonOf, SEASON_NAMES_DE, weekdayNameDe } from './dates';
import {
    clamp01,
    DEFAULT_DURATION,
    durationFit,
    hash01,
    tasteOf,
    type DurationConfig,
} from './scoring';
import {
    compareSlots,
    slotKey,
    type Candidate,
    type ExpiringIngredient,
    type PlannedSlot,
    type SlotRef,
} from './types';

export interface WeekPlanWeights {
    taste: number;
    season: number;
    duration: number;
    variety: number;
    shared: number;
    expiring: number;
}

export interface WeekPlanConfig extends DurationConfig {
    weights: WeekPlanWeights;
    /** Staples (salt, water, oil …) that do not count as "shared ingredients" */
    ignoredIngredientIds: string[];
    /** Max. size of the deterministic tie-breaker added to each score */
    jitter: number;
}

export const DEFAULT_WEEK_PLAN_CONFIG: WeekPlanConfig = {
    ...DEFAULT_DURATION,
    weights: { taste: 3, season: 1.5, duration: 2, variety: 2.5, shared: 1.5, expiring: 3 },
    ignoredIngredientIds: [],
    jitter: 0.05,
};

export interface SuggestWeekInput {
    /** All slots of the week; slots without `recipeId` are the empty ones */
    slots: PlannedSlot[];
    /** Recipes that may be suggested (already filtered by the user's recipe filters) */
    candidates: Candidate[];
    /**
     * Details (category, ingredients) of recipes in already filled slots. Used for variety
     * and shared-ingredient rules; recipes missing here still count as "used".
     */
    plannedRecipes?: Candidate[];
    /** Soon-expiring ingredients (leftovers) that should be used up */
    expiring?: ExpiringIngredient[];
    seed?: number;
    config?: Partial<Omit<WeekPlanConfig, 'weights'>> & { weights?: Partial<WeekPlanWeights> };
}

export interface WeekSuggestion extends SlotRef {
    recipeId: string;
    /** Weighted score (higher is better), for sorting/debugging only */
    score: number;
    /** 1–2 short German reasons */
    reasons: string[];
}

export interface SuggestWeekResult {
    suggestions: WeekSuggestion[];
    /** Empty slots for which no candidate was left */
    unfilled: SlotRef[];
}

interface Assignment extends SlotRef {
    recipeId: string;
    candidate?: Candidate;
}

function resolveConfig(config: SuggestWeekInput['config']): WeekPlanConfig {
    return {
        ...DEFAULT_WEEK_PLAN_CONFIG,
        ...config,
        weights: { ...DEFAULT_WEEK_PLAN_CONFIG.weights, ...config?.weights },
    };
}

interface Context {
    config: WeekPlanConfig;
    seed: number;
    expiring: ExpiringIngredient[];
    assignments: Assignment[];
    usedIds: Set<string>;
}

function plannedAssignments(input: SuggestWeekInput): Assignment[] {
    const known = new Map<string, Candidate>();
    for (const candidate of [...input.candidates, ...(input.plannedRecipes ?? [])]) {
        known.set(candidate.id, candidate);
    }
    return input.slots
        .filter((slot): slot is PlannedSlot & { recipeId: string } => !!slot.recipeId)
        .map((slot) => ({
            date: slot.date,
            slot: slot.slot,
            recipeId: slot.recipeId,
            candidate: known.get(slot.recipeId),
        }));
}

function uniqueEmptySlots(slots: PlannedSlot[]): SlotRef[] {
    const filled = new Set(slots.filter((s) => s.recipeId).map(slotKey));
    const seen = new Set<string>();
    const empty: SlotRef[] = [];
    for (const slot of slots) {
        const key = slotKey(slot);
        if (slot.recipeId || filled.has(key) || seen.has(key)) continue;
        seen.add(key);
        empty.push({ date: slot.date, slot: slot.slot });
    }
    return empty.sort(compareSlots);
}

interface Scored {
    candidate: Candidate;
    score: number;
    reasons: string[];
}

function scoreCandidate(ctx: Context, ref: SlotRef, candidate: Candidate): Scored {
    const { config } = ctx;
    const w = config.weights;
    const others = ctx.assignments;

    const taste = tasteOf(candidate.tasteScore);

    const hasSeasons = !!candidate.seasons && candidate.seasons.length > 0;
    const currentSeason = seasonOf(ref.date);
    const season = hasSeasons ? (candidate.seasons!.includes(currentSeason) ? 1 : 0) : 0.5;

    const duration = durationFit(candidate.totalTime, ref.date, config);

    const sameCategory = others.filter((a) => a.candidate?.categoryId === candidate.categoryId);
    const adjacent = sameCategory.some((a) => Math.abs(diffDays(a.date, ref.date)) <= 1);
    const variety = clamp01(1 - 0.35 * sameCategory.length - (adjacent ? 0.35 : 0));

    const ignored = new Set(config.ignoredIngredientIds);
    const otherIngredients = new Set(
        others.flatMap((a) => a.candidate?.ingredients.map((i) => i.ingredientId) ?? []),
    );
    const sharedIds = [
        ...new Set(
            candidate.ingredients
                .map((i) => i.ingredientId)
                .filter((id) => !ignored.has(id) && otherIngredients.has(id)),
        ),
    ];
    const shared = Math.min(sharedIds.length, 3) / 3;

    let expiring = 0;
    let expiringHit: ExpiringIngredient | undefined;
    for (const item of ctx.expiring) {
        if (!candidate.ingredients.some((i) => i.ingredientId === item.ingredientId)) continue;
        const daysLeft = diffDays(item.expiresOn, ref.date);
        if (daysLeft < 0) continue; // already expired on that day
        const urgency = 1 - Math.min(daysLeft, 6) / 7;
        if (urgency > expiring) {
            expiring = urgency;
            expiringHit = item;
        }
    }

    const jitter = hash01(`${ctx.seed}|${slotKey(ref)}|${candidate.id}`) * config.jitter;
    const score =
        w.taste * taste +
        w.season * season +
        w.duration * duration +
        w.variety * variety +
        w.shared * shared +
        w.expiring * expiring +
        jitter;

    // ── Reasons: collect the notable ones, keep the two that contributed most ──
    const reasons: { text: string; priority: number }[] = [];
    if (expiringHit) {
        const daysLeft = diffDays(expiringHit.expiresOn, ref.date);
        const when =
            daysLeft === 0
                ? 'läuft an diesem Tag ab'
                : `läuft am ${weekdayNameDe(expiringHit.expiresOn)} ab`;
        reasons.push({
            text: `Verbraucht ${expiringHit.name ?? 'eine Zutat'}, ${
                expiringHit.name ? 'die' : 'sie'
            } ${when}`,
            priority: 0,
        });
    }
    if (sharedIds.length > 0) {
        reasons.push({
            text:
                sharedIds.length === 1
                    ? 'Teilt eine Zutat mit einem anderen Gericht dieser Woche'
                    : `Teilt ${sharedIds.length} Zutaten mit anderen Gerichten dieser Woche`,
            priority: 1,
        });
    }
    if (hasSeasons && season === 1) {
        reasons.push({
            text: `Passt zur Jahreszeit (${SEASON_NAMES_DE[currentSeason]})`,
            priority: 2,
        });
    }
    if (taste >= 0.65) reasons.push({ text: 'Passt zu deinem Geschmack', priority: 3 });
    if (!isWeekend(ref.date) && candidate.totalTime <= config.weekdayMaxMinutes) {
        reasons.push({
            text: `Schnell gemacht: ${candidate.totalTime} Min. unter der Woche`,
            priority: 4,
        });
    } else if (isWeekend(ref.date) && candidate.totalTime >= config.weekendMinMinutes) {
        reasons.push({
            text: `Zeit zum Kochen am Wochenende: ${candidate.totalTime} Min.`,
            priority: 4,
        });
    }
    if (variety === 1 && others.length > 0) {
        reasons.push({
            text: candidate.categoryName
                ? `Bringt Abwechslung (${candidate.categoryName})`
                : 'Bringt Abwechslung in die Woche',
            priority: 5,
        });
    }
    // Specific reasons (expiring, shared ingredients) come before generic ones
    reasons.sort((a, b) => a.priority - b.priority);

    return {
        candidate,
        score,
        reasons: reasons.length > 0 ? reasons.slice(0, 2).map((r) => r.text) : [FALLBACK_REASON],
    };
}

const FALLBACK_REASON = 'Passt gut in deine Woche';

function pickBest(ctx: Context, ref: SlotRef, candidates: Candidate[]): Scored | null {
    const eligible = candidates.filter(
        (candidate) =>
            !ctx.usedIds.has(candidate.id) &&
            (!candidate.slots ||
                candidate.slots.length === 0 ||
                candidate.slots.includes(ref.slot)),
    );

    // Weekday dishes far above the time budget are excluded, unless nothing else is left
    const withinBudget = eligible.filter(
        (candidate) =>
            isWeekend(ref.date) || candidate.totalTime <= ctx.config.weekdayHardMaxMinutes,
    );
    const pool = withinBudget.length > 0 ? withinBudget : eligible;

    let best: Scored | null = null;
    for (const candidate of pool) {
        const scored = scoreCandidate(ctx, ref, candidate);
        if (
            !best ||
            scored.score > best.score ||
            (scored.score === best.score && scored.candidate.id < best.candidate.id)
        ) {
            best = scored;
        }
    }
    return best;
}

function toSuggestion(ref: SlotRef, scored: Scored): WeekSuggestion {
    return {
        date: ref.date,
        slot: ref.slot,
        recipeId: scored.candidate.id,
        score: Math.round(scored.score * 1000) / 1000,
        reasons: scored.reasons,
    };
}

function buildContext(input: SuggestWeekInput, assignments: Assignment[]): Context {
    return {
        config: resolveConfig(input.config),
        seed: input.seed ?? 0,
        expiring: input.expiring ?? [],
        assignments,
        usedIds: new Set(assignments.map((a) => a.recipeId)),
    };
}

/** Suggests a recipe for every empty slot, in chronological order. */
export function suggestWeek(input: SuggestWeekInput): SuggestWeekResult {
    const ctx = buildContext(input, plannedAssignments(input));
    const suggestions: WeekSuggestion[] = [];
    const unfilled: SlotRef[] = [];

    for (const ref of uniqueEmptySlots(input.slots)) {
        const best = pickBest(ctx, ref, input.candidates);
        if (!best) {
            unfilled.push(ref);
            continue;
        }
        suggestions.push(toSuggestion(ref, best));
        ctx.assignments.push({
            date: ref.date,
            slot: ref.slot,
            recipeId: best.candidate.id,
            candidate: best.candidate,
        });
        ctx.usedIds.add(best.candidate.id);
    }

    return { suggestions, unfilled };
}

/**
 * Swaps one suggestion: returns the next best recipe for that slot, judged against the
 * planned entries and all other current suggestions. The current recipe and
 * `rejectedRecipeIds` are excluded. Returns `null` if the slot is filled in the plan
 * (existing entries are never swapped) or no candidate is left.
 */
export function swapSuggestion(
    input: SuggestWeekInput,
    current: readonly WeekSuggestion[],
    target: SlotRef,
    options: { rejectedRecipeIds?: readonly string[] } = {},
): WeekSuggestion | null {
    const isFilled = input.slots.some((slot) => slotKey(slot) === slotKey(target) && slot.recipeId);
    if (isFilled) return null;

    const byId = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
    const assignments = plannedAssignments(input);
    const excluded: string[] = [...(options.rejectedRecipeIds ?? [])];

    for (const suggestion of current) {
        if (slotKey(suggestion) === slotKey(target)) {
            excluded.push(suggestion.recipeId);
            continue;
        }
        assignments.push({
            date: suggestion.date,
            slot: suggestion.slot,
            recipeId: suggestion.recipeId,
            candidate: byId.get(suggestion.recipeId),
        });
    }

    const ctx = buildContext(input, assignments);
    excluded.forEach((id) => ctx.usedIds.add(id));

    const best = pickBest(ctx, { date: target.date, slot: target.slot }, input.candidates);
    return best ? toSuggestion(target, best) : null;
}
