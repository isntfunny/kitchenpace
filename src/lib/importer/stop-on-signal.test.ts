import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';

import { STOP_SIGNALS, stopOnSignal } from './stop-on-signal';

function fakeProcess() {
    const emitter = new EventEmitter();
    const exits: number[] = [];
    const target = {
        on: emitter.on.bind(emitter),
        off: emitter.off.bind(emitter),
        exit: (code?: number) => {
            exits.push(code ?? 0);
        },
    } as unknown as Parameters<typeof stopOnSignal>[1];
    return { emitter, exits, target };
}

test('first signal sets the flag and does not exit; a second one exits at once', () => {
    for (const name of STOP_SIGNALS) {
        const { emitter, exits, target } = fakeProcess();
        const seen: string[] = [];
        const stop = stopOnSignal((s) => seen.push(s), target);
        assert.equal(stop.requested, false);
        emitter.emit(name, name);
        assert.equal(stop.requested, true);
        assert.equal(stop.signal, name);
        assert.deepEqual(seen, [name]);
        assert.deepEqual(exits, []);
        emitter.emit('SIGINT', 'SIGINT');
        assert.deepEqual(exits, [130]);
        stop.dispose();
    }
});

test('dispose removes every handler', () => {
    const { emitter, target } = fakeProcess();
    const stop = stopOnSignal(() => {}, target);
    for (const name of STOP_SIGNALS) assert.equal(emitter.listenerCount(name), 1);
    stop.dispose();
    for (const name of STOP_SIGNALS) assert.equal(emitter.listenerCount(name), 0);
});
