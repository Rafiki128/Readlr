import { strict as assert } from "node:assert";
import { test } from "node:test";
import { furtherBridgeJourney, normalizeBridgeJourney } from "../src/app/components/stageTwoContent.ts";
import { emptyCvcJourney, furtherCvcJourney } from "../src/app/components/cvcContent.ts";

const bridge = (training: number[], crossings: number[]) => normalizeBridgeJourney({ version: 3, training, crossings });

test("a new device takes the server's bridge journey when it is further along", () => {
  const server = { version: 3, training: [1, 2, 3, 4, 5], crossings: [1, 2, 3] };
  assert.deepEqual(furtherBridgeJourney(bridge([], []), server), bridge([1, 2, 3, 4, 5], [1, 2, 3]));
});

test("the device keeps its own bridge journey when the server is behind, missing or invalid", () => {
  const local = bridge([1, 2, 3, 4, 5], [1, 2]);
  assert.equal(furtherBridgeJourney(local, { version: 3, training: [1, 2], crossings: [] }), local);
  assert.equal(furtherBridgeJourney(local, null), local);
  assert.equal(furtherBridgeJourney(local, "junk"), local);
});

test("cvc journeys compare lessons first, then crown jewels", () => {
  const local = { version: 1 as const, completed: 4, jewels: 0 };
  assert.deepEqual(furtherCvcJourney(local, { version: 1, completed: 9, jewels: 0 }), { version: 1, completed: 9, jewels: 0 });
  assert.equal(furtherCvcJourney(local, { version: 1, completed: 2, jewels: 0 }), local);
  const crown = { version: 1 as const, completed: 19, jewels: 1 };
  assert.deepEqual(furtherCvcJourney(crown, { version: 1, completed: 19, jewels: 2 }), { version: 1, completed: 19, jewels: 2 });
  assert.equal(furtherCvcJourney(emptyCvcJourney(), undefined).completed, 0);
});
