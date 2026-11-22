// Serializable data the week view receives from the server (KUC-99).
import type { DishMarker } from '@app/lib/meal-plan/view';

export interface PlanDish {
    id: string;
    recipeId: string;
    date: string;
    slot: string;
    position: number;
    /** Own time; null = slot default */
    time: string | null;
    servings: number;
    status: string;
    leftoverOfDate: string | null;
    /** This entry is the leftover meal of another one (also when that lies in another week) */
    isLeftover: boolean;
    /** Day of the first leftover meal of this dish in this week ("reicht für Do") */
    leftoverForDate: string | null;
    notes: string | null;
    recipeAvailable: boolean;
    recipe: {
        slug: string;
        title: string;
        imageKey: string | null;
        totalTime: number;
        caloriesPerServing: number | null;
        nutritionCompleteness: number | null;
    };
}

export interface PlanSlot {
    key: string;
    label: string;
    name: string | null;
    time: string;
    enabled: boolean;
}

export interface PlanDisplay {
    showTime: boolean;
    showServings: boolean;
    showCalories: boolean;
}

export interface PlanWeekData {
    startDate: string;
    days: string[];
    today: string;
    weekNumber: number;
    rangeLabel: string;
    prevParam: string;
    nextParam: string;
    todayParam: string;
    isCurrentWeek: boolean;
    /** Slots shown as rows: enabled ones plus disabled ones holding entries */
    slots: PlanSlot[];
    /** Full effective configuration of this week (for the settings dialog) */
    allSlots: PlanSlot[];
    hasWeekOverride: boolean;
    householdSize: number | null;
    display: PlanDisplay;
    dishes: PlanDish[];
}

/**
 * Extension points for later tickets; the view renders what it gets and
 * otherwise leaves the space empty:
 * - markers: status markers per entry id (freshness KUC-96, pantry KUC-107, start time KUC-109)
 */
export interface PlanExtensions {
    markers?: Record<string, DishMarker[]>;
}
