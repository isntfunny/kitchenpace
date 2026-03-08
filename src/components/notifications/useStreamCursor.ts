'use client';

export type CursorItem = {
    id: string;
    createdAt: string;
};

export function buildStreamCursor<TItem extends CursorItem>(items: TItem[]) {
    if (items.length === 0) {
        return null;
    }

    return {
        after: items[0].createdAt,
        afterId: items[0].id,
    };
}
