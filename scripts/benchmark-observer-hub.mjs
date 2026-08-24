import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { Window } from "happy-dom";
import {
  getObserverHubStats,
  subscribeDocumentMutations,
  subscribeElementResize,
} from "../runtime/observer-hub.ts";

class BenchmarkMutationObserver {
  static instances = [];

  constructor(callback) {
    this.callback = callback;
    BenchmarkMutationObserver.instances.push(this);
  }

  disconnect() {}
  observe() {}
  trigger(records) {
    this.callback(records, this);
  }
}

class BenchmarkResizeObserver {
  static instances = [];

  constructor(callback) {
    this.callback = callback;
    BenchmarkResizeObserver.instances.push(this);
  }

  disconnect() {}
  observe() {}
  unobserve() {}
}

const view = new Window({ url: "https://benchmark.wl-ui.test/" });
view.MutationObserver = BenchmarkMutationObserver;
view.ResizeObserver = BenchmarkResizeObserver;
const doc = view.document;
const target = doc.body;
let callbackCount = 0;
const stops = [];

for (let index = 0; index < 3; index += 1) {
  stops.push(
    subscribeDocumentMutations(
      doc,
      () => {
        callbackCount += 1;
      },
      { attributes: true, childList: true, subtree: true },
    ),
  );
}
for (let index = 0; index < 2; index += 1) {
  stops.push(subscribeElementResize(target, () => undefined));
}

const iterations = 500;
const startedAt = performance.now();
for (let index = 0; index < iterations; index += 1) {
  BenchmarkMutationObserver.instances[0].trigger([
    { addedNodes: [], target, type: "childList" },
  ]);
}
const elapsedMs = performance.now() - startedAt;
const stats = getObserverHubStats(doc);

assert.equal(BenchmarkMutationObserver.instances.length, 1);
assert.equal(BenchmarkResizeObserver.instances.length, 1);
assert.equal(callbackCount, iterations * 3);
assert.equal(stats.mutationObserverCount, 1);
assert.equal(stats.resizeObserverCount, 1);

for (const stop of stops) stop();
const cleaned = getObserverHubStats(doc);
assert.equal(cleaned.mutationSubscribers, 0);
assert.equal(cleaned.resizeTargets, 0);

console.log(
  JSON.stringify(
    {
      benchmark: "observer-hub",
      iterations,
      elapsedMs: Number(elapsedMs.toFixed(3)),
      legacyInstances: { mutation: 3, resize: 2 },
      sharedInstances: {
        mutation: stats.mutationObserverCount,
        resize: stats.resizeObserverCount,
      },
      instanceReduction: { mutation: "66.7%", resize: "50.0%" },
      cleaned,
    },
    null,
    2,
  ),
);
view.close();
