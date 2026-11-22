import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cookDurationMinutes, criticalPathMinutes } from './duration';

test('critical path follows the longest chain, parallel branches do not add up', () => {
    const nodes = [
        { id: 'a', duration: 10 },
        { id: 'b', duration: 30 },
        { id: 'c', duration: 5 },
        { id: 'd', duration: 15 },
    ];
    const edges = [
        { source: 'a', target: 'd' },
        { source: 'b', target: 'd' },
        { source: 'c', target: 'd' },
    ];
    assert.equal(criticalPathMinutes(nodes, edges), 45);
});

test('cycles and dangling edges do not hang or throw', () => {
    const nodes = [
        { id: 'a', duration: 10 },
        { id: 'b', duration: 20 },
    ];
    const edges = [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'a' },
        { source: 'a', target: 'zzz' },
    ];
    assert.equal(criticalPathMinutes(nodes, edges), 30);
});

test('fallbacks: flow, then totalTime, then prep + cook, then unknown', () => {
    const flow = {
        flowNodes: [{ id: 'a', duration: 25 }],
        flowEdges: [],
        totalTime: 90,
    };
    assert.equal(cookDurationMinutes(flow), 25);
    assert.equal(
        cookDurationMinutes({ flowNodes: null, totalTime: 40, prepTime: 5, cookTime: 5 }),
        40,
    );
    assert.equal(
        cookDurationMinutes({ flowNodes: [], totalTime: 0, prepTime: 15, cookTime: 20 }),
        35,
    );
    assert.equal(cookDurationMinutes({ flowNodes: [{ id: 'a' }], totalTime: 0 }), 0);
    assert.equal(cookDurationMinutes({ flowNodes: 'broken' as unknown }), 0);
});
