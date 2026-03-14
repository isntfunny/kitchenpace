type CursorEntity = {
    id: string;
    createdAt: Date | string;
};

export type StreamCursor = {
    createdAt: Date;
    id: string;
};

const STREAM_CURSOR_SEPARATOR = '|';

function parseStreamCursor(
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

function parseStreamCursorValue(value: string | null): StreamCursor | null {
    if (!value) {
        return null;
    }

    const separatorIndex = value.indexOf(STREAM_CURSOR_SEPARATOR);
    if (separatorIndex === -1) {
        return null;
    }

    return parseStreamCursor(
        value.slice(0, separatorIndex),
        value.slice(separatorIndex + STREAM_CURSOR_SEPARATOR.length),
    );
}

export function resolveRequestStreamCursor(request: Request): StreamCursor | null {
    const { searchParams } = new URL(request.url);

    return (
        parseStreamCursor(searchParams.get('after'), searchParams.get('afterId')) ??
        parseStreamCursorValue(request.headers.get('last-event-id'))
    );
}

export function formatStreamCursor(createdAtValue: Date | string, id: string): string {
    const createdAt =
        createdAtValue instanceof Date ? createdAtValue.toISOString() : createdAtValue;
    return `${createdAt}${STREAM_CURSOR_SEPARATOR}${id}`;
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
