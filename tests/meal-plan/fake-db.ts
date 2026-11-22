// Minimal in-memory stand-in for the Prisma calls used by the meal plan,
// shopping and pantry repositories. Unit tests only: no SQL, no constraints
// beyond the unique keys modelled below.
type Row = Record<string, any>;

const DEFAULTS: Record<string, () => Row> = {
    mealPlanRecipe: () => ({
        status: 'PLANNED',
        pinned: false,
        position: 0,
        cookedAt: null,
        cookHistoryId: null,
        pantryBookedAt: null,
        leftoverOfId: null,
        notes: null,
        time: null,
    }),
    shoppingItem: () => ({
        status: 'OPEN',
        quantity: null,
        baseUnit: null,
        displayUnit: null,
        quantityText: null,
        note: null,
        position: 0,
    }),
    shoppingSuggestionSnooze: () => ({ dismissCount: 1 }),
    pantryItem: () => ({ status: 'AVAILABLE', approximate: false, leftoverHintDismissedAt: null }),
};

// Unique keys per model, checked on create/update like the DB would
const UNIQUE: Record<string, string[][]> = {
    shoppingList: [['userId']],
    shoppingItem: [
        ['shoppingListId', 'itemKey'],
        ['shoppingListId', 'ingredientId'],
    ],
    mealPlan: [['userId', 'startDate'], ['shareToken']],
    shoppingSuggestionSnooze: [['userId', 'itemKey']],
};

// Relation filters: relation name → [target model, local foreign key]
const RELATIONS: Record<string, Record<string, [string, string]>> = {
    shoppingItem: { shoppingList: ['shoppingList', 'shoppingListId'] },
    mealPlanRecipe: { recipe: ['recipe', 'recipeId'] },
};

let counter = 0;
const same = (a: any, b: any) =>
    a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b;

export function createFakeDb(seed: Record<string, Row[]> = {}) {
    const tables: Record<string, Row[]> = {};
    const table = (name: string) => (tables[name] ??= []);
    for (const [name, rows] of Object.entries(seed))
        table(name).push(...rows.map((r) => ({ ...r })));

    function matches(model: string, row: Row, where: Row = {}): boolean {
        return Object.entries(where).every(([key, cond]) => {
            if (key === 'OR') return (cond as Row[]).some((w) => matches(model, row, w));
            if (key === 'AND') return (cond as Row[]).every((w) => matches(model, row, w));
            const relation = RELATIONS[model]?.[key];
            if (relation) {
                const target = table(relation[0]).find((r) => r.id === row[relation[1]]);
                return !!target && matches(relation[0], target, cond);
            }
            if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
                if (
                    !(key in row) &&
                    Object.values(cond).every(
                        (v) => typeof v !== 'object' || v instanceof Date || v === null,
                    )
                )
                    // Compound unique selector like userId_startDate
                    return matches(model, row, cond);
                return Object.entries(cond).every(([op, value]) => {
                    const v = row[key];
                    if (op === 'in') return (value as any[]).some((x) => same(x, v));
                    if (op === 'not') return !same(v, value);
                    if (op === 'gte') return v >= (value as any);
                    if (op === 'lte') return v <= (value as any);
                    if (op === 'lt') return v < (value as any);
                    if (op === 'gt') return v > (value as any);
                    if (op === 'startsWith') return String(v).startsWith(value as string);
                    throw new Error(`fake db: unsupported operator ${op}`);
                });
            }
            return same(row[key] ?? null, cond ?? null);
        });
    }

    function checkUnique(model: string, row: Row) {
        for (const fields of UNIQUE[model] ?? []) {
            if (fields.some((f) => row[f] == null)) continue;
            const clash = table(model).find(
                (other) =>
                    other !== row &&
                    other.id !== row.id &&
                    fields.every((f) => same(other[f], row[f])),
            );
            if (clash)
                throw Object.assign(new Error(`Unique constraint on ${fields}`), { code: 'P2002' });
        }
    }

    function apply(row: Row, data: Row) {
        for (const [key, value] of Object.entries(data)) {
            if (value && typeof value === 'object' && 'increment' in value)
                row[key] += value.increment;
            else if (value && typeof value === 'object' && 'decrement' in value)
                row[key] -= value.decrement;
            else if (value === undefined) continue;
            else if (
                value &&
                typeof value === 'object' &&
                !(value instanceof Date) &&
                !Array.isArray(value) &&
                value.constructor?.name?.includes('Null')
            )
                row[key] = null;
            else row[key] = value;
        }
        row.updatedAt = new Date();
    }

    function withIncludes(model: string, row: Row | null) {
        if (!row) return null;
        const copy = { ...row };
        if (model === 'mealPlanRecipe')
            copy.recipe = table('recipe').find((r) => r.id === row.recipeId);
        if (model === 'mealPlan')
            copy.user = { profile: table('profile').find((p) => p.userId === row.userId) ?? null };
        if (model === 'mealPlanTemplate')
            copy.entries = table('mealPlanTemplateEntry')
                .filter((e) => e.templateId === row.id)
                .map((e) => ({ ...e, recipe: table('recipe').find((r) => r.id === e.recipeId) }));
        if (model === 'shoppingItem')
            copy.sources = table('shoppingItemSource').filter((s) => s.shoppingItemId === row.id);
        return copy;
    }

    function delegate(model: string) {
        const create = ({ data }: Row) => {
            const row = {
                id: `${model}-${++counter}`,
                createdAt: new Date(),
                ...(DEFAULTS[model]?.() ?? {}),
            };
            // Nested create of template entries (the only nested write in use)
            const { entries, ...plain } = data;
            apply(row, model === 'mealPlanTemplate' ? plain : data);
            checkUnique(model, row);
            table(model).push(row);
            if (model === 'mealPlanTemplate' && entries?.create)
                for (const entry of entries.create)
                    table('mealPlanTemplateEntry').push({
                        id: `mealPlanTemplateEntry-${++counter}`,
                        mealType: null,
                        customMealType: null,
                        ...entry,
                        templateId: row.id,
                    });
            return withIncludes(model, row);
        };
        const pick = (row: Row, select?: Row) =>
            select
                ? Object.fromEntries(
                      Object.keys(select)
                          .filter((k) => select[k])
                          .map((k) => [k, row[k]]),
                  )
                : row;
        const findMany = ({ where, take, select }: Row = {}) => {
            const rows = table(model)
                .filter((r) => matches(model, r, where))
                .map((r) => pick(withIncludes(model, r)!, select));
            return take ? rows.slice(0, take) : rows;
        };
        const findFirst = (args: Row = {}) => findMany(args)[0] ?? null;
        const update = ({ where, data }: Row) => {
            const row = table(model).find((r) => matches(model, r, where));
            if (!row) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
            apply(row, data);
            checkUnique(model, row);
            return withIncludes(model, row);
        };
        return {
            create: async (args: Row) => create(args),
            findMany: async (args?: Row) => findMany(args),
            findFirst: async (args?: Row) => findFirst(args),
            findUnique: async (args: Row) => findFirst(args),
            count: async ({ where }: Row = {}) => findMany({ where }).length,
            update: async (args: Row) => update(args),
            updateMany: async ({ where, data }: Row) => {
                const rows = table(model).filter((r) => matches(model, r, where));
                rows.forEach((row) => apply(row, data));
                return { count: rows.length };
            },
            upsert: async ({ where, create: createData, update: updateData }: Row) => {
                const existing = findFirst({ where });
                return existing
                    ? update({ where, data: updateData })
                    : create({ data: createData });
            },
            delete: async ({ where }: Row) => {
                const index = table(model).findIndex((r) => matches(model, r, where));
                if (index < 0)
                    throw Object.assign(new Error('Record not found'), { code: 'P2025' });
                return table(model).splice(index, 1)[0];
            },
            deleteMany: async ({ where }: Row = {}) => {
                const keep = table(model).filter((r) => !matches(model, r, where));
                const count = table(model).length - keep.length;
                tables[model] = keep;
                return { count };
            },
        };
    }

    const db: any = new Proxy(
        { tables, $transaction: async (work: (tx: any) => Promise<any>) => work(tx) },
        { get: (target: any, prop: string) => (prop in target ? target[prop] : delegate(prop)) },
    );
    const tx: any = new Proxy(
        { tables },
        { get: (target: any, prop: string) => (prop in target ? target[prop] : delegate(prop)) },
    );
    return db;
}
