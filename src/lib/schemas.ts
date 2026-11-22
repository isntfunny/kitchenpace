// Zod schemas shared by plan, shopping list and pantry input (KUC-98, KUC-139). Same ranges
// as the CHECK constraints in prisma/migrations/20261121210000_meal_plan_shopping_pantry.
import { z } from 'zod';

/** Id of a row (cuid) or user; trimmed, never empty */
export const idSchema = z.string().trim().min(1).max(64);
/** Servings of a plan entry or a recipe added to the list */
export const servingsSchema = z.number().int().min(1).max(100);
/** Stored quantity in a base unit */
export const quantitySchema = z.number().finite().min(0).max(1_000_000);
