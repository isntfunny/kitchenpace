// Synthetic browser-test boundary. Never imported by application code.
import type { BringItems } from '../../../src/lib/bring/types';

export const state = {
    connected: new URLSearchParams(location.search).get('connected') !== '0',
    signedIn: new URLSearchParams(location.search).get('signed') !== '0',
    lists: [
        { listUuid: 'a', name: 'Zuhause' },
        { listUuid: 'b', name: 'Wochenende' },
    ],
    defaultListUuid: 'a',
    delay: 0,
    failWrite: false,
    items: {
        a: {
            purchase: [
                { name: 'Milch', specification: '1 L' },
                { name: 'Peperoni', displayName: 'Paprika', specification: '2 Stück' },
            ],
            recently: [],
        },
        b: { purchase: [{ name: 'Brot', specification: '1 Stück' }], recently: [] },
    } as Record<string, BringItems>,
};
if (new URLSearchParams(location.search).has('full'))
    state.items.a.purchase.push(
        ...[
            ['Sonnenblumenöl', '1 Flasche (zum Frittieren)'],
            ['Orange', '1 Stück'],
            ['Minze', '1 Zweig'],
            ['Limette', '½ Stück'],
            ['Erdbeeren', '100 g'],
            ['Pasta', '500 g'],
            ['Olivenöl', '2 EL'],
            ['Joghurt', '200 g'],
        ].map(([name, specification]) => ({ name, specification })),
    );
if (new URLSearchParams(location.search).has('empty')) state.lists = [];
Object.assign(window, { bringTest: state });
const ok = <T>(data: T) => ({ ok: true as const, data });
export async function getBringStatus() {
    return state.signedIn
        ? ok({ connected: state.connected, defaultListUuid: state.defaultListUuid })
        : { ok: false as const, code: 'SIGN_IN', error: 'Bitte anmelden.' };
}
export async function getBringLists() {
    return ok({ lists: state.lists, defaultListUuid: state.defaultListUuid });
}
export async function previewBringConnection() {
    return ok(state.lists);
}
export async function connectBring(input: { defaultListUuid: string }) {
    state.connected = true;
    state.defaultListUuid = input.defaultListUuid;
    return ok(undefined);
}
export async function disconnectBring() {
    state.connected = false;
    return ok(undefined);
}
export async function setBringDefault(listUuid: string) {
    state.defaultListUuid = listUuid;
    return ok(undefined);
}
export async function getBringItems(listUuid: string) {
    await new Promise((resolve) => setTimeout(resolve, state.delay));
    return ok(structuredClone(state.items[listUuid]));
}
export async function changeBringItem(input: {
    listUuid: string;
    operation: string;
    name: string;
    specification: string;
    previousSpecification?: string;
}) {
    if (state.failWrite)
        return {
            ok: false as const,
            code: 'UNAVAILABLE',
            error: 'Test: Schreiben fehlgeschlagen.',
        };
    const items = state.items[input.listUuid];
    if (
        input.previousSpecification !== undefined &&
        items.purchase.find((item) => item.name === input.name)?.specification !==
            input.previousSpecification
    )
        return {
            ok: false as const,
            code: 'CONFLICT',
            error: 'Der Artikel wurde zwischenzeitlich geändert.',
        };
    if (input.operation === 'add') {
        items.purchase = items.purchase.filter((item) => item.name !== input.name);
        items.recently = items.recently.filter((item) => item.name !== input.name);
        items.purchase.push({ name: input.name, specification: input.specification });
    }
    if (input.operation === 'remove') {
        items.purchase = items.purchase.filter((item) => item.name !== input.name);
        items.recently = items.recently.filter((item) => item.name !== input.name);
    }
    if (input.operation === 'complete') {
        items.recently.push(...items.purchase.filter((item) => item.name === input.name));
        items.purchase = items.purchase.filter((item) => item.name !== input.name);
    }
    return ok(structuredClone(items));
}
export async function transferToBring(input: { items: { id: string; name: string }[] }) {
    return ok(input.items.map((item) => ({ ...item, status: 'added' as const })));
}

export async function createBringList(input: { name: string }) {
    await new Promise((resolve) => setTimeout(resolve, state.delay));
    if (state.failWrite)
        return {
            ok: false as const,
            code: 'UNAVAILABLE',
            error: 'Test: Erstellen fehlgeschlagen.',
        };
    const list = { listUuid: `new-${state.lists.length}`, name: input.name };
    state.lists.push(list);
    state.items[list.listUuid] = { purchase: [], recently: [] };
    return ok(list);
}
