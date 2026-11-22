/** "1 Tag" / "3 Tage": count with the singular or plural noun (KUC-139). */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
