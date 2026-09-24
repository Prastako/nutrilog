// TZ must be set before any Date is created.
process.env.TZ = 'Europe/Prague';

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* Load src/core.js in a vm context, then expose SLOT_PRESETS and     */
/* slotPresetId.                                                      */
/* ------------------------------------------------------------------ */

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreSrc = readFileSync(resolve(__dirname, '../src/core.js'), 'utf8');

const ctx = createContext({
  console,
  Intl,
  Date,
  Math,
  JSON,
  String,
  Number,
  Array,
  Object,
  Uint8Array,
  Promise,
  Error,
  isFinite,
  TextEncoder,
  TextDecoder,
  setTimeout,
  clearTimeout,
  btoa(b) { return Buffer.from(b, 'binary').toString('base64'); },
  atob(s) { return Buffer.from(s, 'base64').toString('binary'); },
  document: {
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  crypto: {
    getRandomValues(buf) {
      for (let i = 0; i < buf.length; i++) buf[i] = i % 256;
    },
  },
  indexedDB: null,
});

runInContext(coreSrc, ctx);
runInContext(
  ';globalThis.__slots = { SLOT_PRESETS, slotPresetId, SLOTS };',
  ctx,
);
const { SLOT_PRESETS, slotPresetId, SLOTS } = ctx.__slots;

/* ================================================================== */
/* TESTS                                                              */
/* ================================================================== */

describe('SLOT_PRESETS', () => {
  it('contains exactly 4 presets', () => {
    assert.equal(SLOT_PRESETS.length, 4);
  });

  it('preset 0 is "three" with correct slot values', () => {
    const p = SLOT_PRESETS[0];
    assert.equal(p.id, 'three');
    assert.equal(p.slots.breakfast, 30);
    assert.equal(p.slots.lunch, 35);
    assert.equal(p.slots.snack, 0);
    assert.equal(p.slots.dinner, 35);
  });

  it('preset 1 is "snack" with correct slot values', () => {
    const p = SLOT_PRESETS[1];
    assert.equal(p.id, 'snack');
    assert.equal(p.slots.breakfast, 25);
    assert.equal(p.slots.lunch, 35);
    assert.equal(p.slots.snack, 10);
    assert.equal(p.slots.dinner, 30);
  });

  it('preset 2 is "bigbf" with correct slot values', () => {
    const p = SLOT_PRESETS[2];
    assert.equal(p.id, 'bigbf');
    assert.equal(p.slots.breakfast, 35);
    assert.equal(p.slots.lunch, 35);
    assert.equal(p.slots.snack, 10);
    assert.equal(p.slots.dinner, 20);
  });

  it('preset 3 is "lightbf" with correct slot values', () => {
    const p = SLOT_PRESETS[3];
    assert.equal(p.id, 'lightbf');
    assert.equal(p.slots.breakfast, 15);
    assert.equal(p.slots.lunch, 35);
    assert.equal(p.slots.snack, 15);
    assert.equal(p.slots.dinner, 35);
  });

  it('each preset sums to 100', () => {
    for (const p of SLOT_PRESETS) {
      const sum = SLOTS.reduce((s, k) => s + p.slots[k], 0);
      assert.equal(sum, 100, `preset "${p.id}" must sum to 100`);
    }
  });
});

describe('slotPresetId', () => {
  it('returns "three" for the three-meals preset', () => {
    assert.equal(slotPresetId({ breakfast: 30, lunch: 35, snack: 0, dinner: 35 }), 'three');
  });

  it('returns "snack" for the three-meals-plus-snack preset', () => {
    assert.equal(slotPresetId({ breakfast: 25, lunch: 35, snack: 10, dinner: 30 }), 'snack');
  });

  it('returns "bigbf" for the big breakfast preset', () => {
    assert.equal(slotPresetId({ breakfast: 35, lunch: 35, snack: 10, dinner: 20 }), 'bigbf');
  });

  it('returns "lightbf" for the light breakfast preset', () => {
    assert.equal(slotPresetId({ breakfast: 15, lunch: 35, snack: 15, dinner: 35 }), 'lightbf');
  });

  it('returns null for a custom distribution that matches no preset', () => {
    assert.equal(slotPresetId({ breakfast: 20, lunch: 40, snack: 10, dinner: 30 }), null);
  });

  it('returns null when one slot value differs', () => {
    assert.equal(slotPresetId({ breakfast: 30, lunch: 35, snack: 5, dinner: 35 }), null);
  });

  it('returns null for null input', () => {
    assert.equal(slotPresetId(null), null);
  });

  it('returns null for undefined input', () => {
    assert.equal(slotPresetId(undefined), null);
  });

  it('uses Number() comparison so string values match numeric presets', () => {
    assert.equal(
      slotPresetId({ breakfast: '30', lunch: '35', snack: '0', dinner: '35' }),
      'three',
    );
  });

  it('returns null when slot values are not valid numbers', () => {
    assert.equal(
      slotPresetId({ breakfast: 'x', lunch: 35, snack: 0, dinner: 35 }),
      null,
    );
  });

  it('returns null for an empty object', () => {
    assert.equal(slotPresetId({}), null);
  });
});
