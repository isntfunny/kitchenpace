export interface BringCredentials {
    email: string;
    password: string;
}
export interface BringList {
    listUuid: string;
    name: string;
}
export interface BringItem {
    displayName?: string;
    name: string;
    specification: string;
}
export interface BringItems {
    purchase: BringItem[];
    recently: BringItem[];
}
export type BringOperation = 'add' | 'complete' | 'remove';
export interface TransferItem {
    id: string;
    name: string;
    specification: string;
}
export interface TransferOutcome {
    id: string;
    name: string;
    status: 'added' | 'existing' | 'failed';
}
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code: string };
export interface ConnectionStatus {
    connected: boolean;
    defaultListUuid: string | null;
}
