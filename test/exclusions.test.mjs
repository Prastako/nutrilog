// TZ must be set before any Date is created.
process.env.TZ = 'Europe/Prague';

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* Load src/core.js in a vm context, then expose S, exclusionHits     */
/* and ALLERGENS.                                                     */
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
runInContext(';globalThis.__x = { S, exclusionHits, ALLERGENS };', ctx);
const { S, exclusionHits, ALLERGENS } = ctx.__x;

/* ------------------------------------------------------------------ */
/* Helper: check if a given allergen id flags a piece of text          */
/* ------------------------------------------------------------------ */

function hit(id, text) {
  S.profile = {
    food: {
      exclusions: [{ id, label: id, type: 'allergy', syn: [] }],
    },
  };
  return exclusionHits(text).length > 0;
}

/* ================================================================== */
/* TESTS                                                              */
/* ================================================================== */

describe('exclusionHits true positives', () => {
  it("gluten 'soy sauce'", () => {
    assert.ok(hit('gluten', 'soy sauce'));
  });

  it("gluten 'teriyaki sauce'", () => {
    assert.ok(hit('gluten', 'teriyaki sauce'));
  });

  it("gluten 'spaghetti'", () => {
    assert.ok(hit('gluten', 'spaghetti'));
  });

  it("gluten 'wholegrain bread'", () => {
    assert.ok(hit('gluten', 'wholegrain bread'));
  });

  it("gluten 'rolled oats'", () => {
    assert.ok(hit('gluten', 'rolled oats'));
  });

  it("fish 'kimchi'", () => {
    assert.ok(hit('fish', 'kimchi'));
  });

  it("fish 'worcestershire sauce'", () => {
    assert.ok(hit('fish', 'worcestershire sauce'));
  });

  it("crustaceans 'kimchi'", () => {
    assert.ok(hit('crustaceans', 'kimchi'));
  });

  it("milk 'green pesto'", () => {
    assert.ok(hit('milk', 'green pesto'));
  });

  it("milk 'butter'", () => {
    assert.ok(hit('milk', 'butter'));
  });

  it("milk 'whey protein'", () => {
    assert.ok(hit('milk', 'whey protein'));
  });

  it("milk 'grated parmesan'", () => {
    assert.ok(hit('milk', 'grated parmesan'));
  });

  it("egg 'full-fat mayonnaise'", () => {
    assert.ok(hit('egg', 'full-fat mayonnaise'));
  });

  it("soy 'teriyaki sauce'", () => {
    assert.ok(hit('soy', 'teriyaki sauce'));
  });

  it("molluscs 'oyster sauce'", () => {
    assert.ok(hit('molluscs', 'oyster sauce'));
  });

  it("nuts 'almond butter'", () => {
    assert.ok(hit('nuts', 'almond butter'));
  });
});

describe('exclusionHits false negatives', () => {
  it("gluten 'chicken breast'", () => {
    assert.ok(!hit('gluten', 'chicken breast'));
  });

  it("gluten 'breakfast burrito with rice'", () => {
    assert.ok(!hit('gluten', 'breakfast burrito with rice'));
  });

  it("gluten 'tomato paste'", () => {
    assert.ok(!hit('gluten', 'tomato paste'));
  });

  it("gluten 'rice noodles'", () => {
    assert.ok(!hit('gluten', 'rice noodles'));
  });

  it("gluten 'gluten free soy sauce'", () => {
    assert.ok(!hit('gluten', 'gluten free soy sauce'));
  });

  it("milk 'maple syrup'", () => {
    assert.ok(!hit('milk', 'maple syrup'));
  });

  it("milk 'coconut milk'", () => {
    assert.ok(!hit('milk', 'coconut milk'));
  });

  it("milk 'butternut squash'", () => {
    assert.ok(!hit('milk', 'butternut squash'));
  });

  it("molluscs 'oyster mushrooms'", () => {
    assert.ok(!hit('molluscs', 'oyster mushrooms'));
  });

  it("egg 'eggplant'", () => {
    assert.ok(!hit('egg', 'eggplant'));
  });

  it("nuts 'nutmeg'", () => {
    assert.ok(!hit('nuts', 'nutmeg'));
  });
});
