// Whether creating a catalogue ingredient notifies moderators. On in the app;
// bulk scripts (full re-import, KUC-115) turn it off because their report
// already lists every new ingredient. Kept out of the 'use server' module on
// purpose: a setter exported there would become a callable server action.

let enabled = true;

export function setNewIngredientNotifications(next: boolean) {
    enabled = next;
}

export function newIngredientNotificationsEnabled(): boolean {
    return enabled;
}
