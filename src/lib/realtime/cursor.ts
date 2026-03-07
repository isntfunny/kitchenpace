type CursorEntity = {
    id: string;
    createdAt: Date | string;
};

export type StreamCursor = {
    createdAt: Date;
    id: string;
};

export function parseStreamCursor(
    createdAtValue: string | null,
    idValue: string | null,
): StreamCursor | null {
    if (!createdAtValue || !idValue) {
        return null;
    }

    const createdAt = new Date(createdAtValue);
    if (Number.isNaN(createdAt.getTime())) {
        return null;
    }

    return {
        createdAt,
        id: idValue,
    };
}

export function isEntityAfterCursor(entity: CursorEntity, cursor: StreamCursor | null) {
    if (!cursor) {
        return true;
    }

    const entityCreatedAt =
        entity.createdAt instanceof Date ? entity.createdAt : new Date(entity.createdAt);
    const entityTime = entityCreatedAt.getTime();
    const cursorTime = cursor.createdAt.getTime();

    if (entityTime > cursorTime) {
        return true;
    }

    if (entityTime < cursorTime) {
        return false;
    }

    return entity.id > cursor.id;
}
