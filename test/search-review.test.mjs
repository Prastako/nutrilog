// TZ must be set before any Date is created.
process.env.TZ = 'Europe/Prague';

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ */
/* Load src files in a vm context with browser global stubs.            */
/* ------------------------------------------------------------------ */

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
  fetch: () => { throw new Error('fetch not available in tests'); },
});

/* core.js defines fold, localDateKey, dateFromKey, nutScale, nutRound, etc. */
runInContext(readFileSync(resolve(__dirname, '../src/core.js'), 'utf8'), ctx);

/* foods.js defines tokensOf, expandToken, nutrientsFor (uses fold from core.js) */
runInContext(readFileSync(resolve(__dirname, '../src/foods.js'), 'utf8'), ctx);

/* review.js defines periodRange, nutrientStatus (uses dateFromKey, localDateKey from core.js) */
runInContext(readFileSync(resolve(__dirname, '../src/review.js'), 'utf8'), ctx);

/* Expose only the functions we test. */
runInContext(
  ';globalThis.__exports = { '
  + 'tokensOf, expandToken, nutrientsFor, '
  + 'periodRange, nutrientStatus '
  + '};',
  ctx,
);

const { nutrientsFor, periodRange, nutrientStatus } = ctx.__exports;
/* Arrays made inside the vm belong to another realm; copy them so deepEqual compares plain arrays. */
const tokensOf = (s) => [...ctx.__exports.tokensOf(s)];
const expandToken = (t) => [...ctx.__exports.expandToken(t)];

/* ================================================================== */
/* TESTS                                                              */
/* ================================================================== */

describe('tokensOf', () => {
  it('splits a Czech phrase with diacritics and punctuation', () => {
    assert.deepEqual(
      tokensOf('Kuřecí prsa, 100%'),
      ['kureci', 'prsa', '100%'],
    );
  });

  it('strips diacritics from Czech letters', () => {
    assert.deepEqual(tokensOf('hlívovka ušitná'), ['hlivovka', 'usitna']);
  });

  it('returns empty array for blank input', () => {
    assert.deepEqual(tokensOf(''), []);
    assert.deepEqual(tokensOf('   '), []);
    assert.deepEqual(tokensOf(null), []);
  });

  it('splits on commas and multiple spaces', () => {
    assert.deepEqual(
      tokensOf('chicken breast, raw'),
      ['chicken', 'breast', 'raw'],
    );
  });
});

describe('expandToken', () => {
  it('Czech "kureci" includes English "chicken"', () => {
    const result = expandToken('kureci');
    assert.ok(result.includes('kureci'), 'must include original');
    assert.ok(result.includes('chicken'), 'must include chicken');
  });

  it('Czech "prsa" includes English "breast"', () => {
    const result = expandToken('prsa');
    assert.ok(result.includes('prsa'), 'must include original');
    assert.ok(result.includes('breast'), 'must include breast');
  });

  it('Czech "jogurt" includes English "yogurt"', () => {
    const result = expandToken('jogurt');
    assert.ok(result.includes('jogurt'), 'must include original');
    assert.ok(result.includes('yogurt'), 'must include yogurt');
  });

  it('English "chicken" returns only itself (no reverse lookup)', () => {
    assert.deepEqual(expandToken('chicken'), ['chicken']);
  });

  it('short prefix "ku" gives only itself (no match below 3 chars)', () => {
    assert.deepEqual(expandToken('ku'), ['ku']);
  });

  it('includes original token as first element', () => {
    const result = expandToken('kureci');
    assert.equal(result[0], 'kureci');
  });
});

describe('nutrientsFor', () => {
  it('scales per100 values for 150 g portion', () => {
    const food = { per100: { kcal: 200, prot: 10 } };
    const result = nutrientsFor(food, 150);
    assert.equal(result.kcal, 300);
    assert.equal(result.prot, 15);
  });

  it('keeps null values as null', () => {
    const food = { per100: { kcal: 200, prot: 10, fat: null } };
    const result = nutrientsFor(food, 150);
    assert.equal(result.kcal, 300);
    assert.equal(result.fat, null);
  });

  it('handles empty per100', () => {
    const result = nutrientsFor({}, 100);
    assert.equal(Object.keys(result).length, 0);
  });

  it('handles missing per100', () => {
    const result = nutrientsFor({}, 100);
    assert.equal(Object.keys(result).length, 0);
  });

  it('scales to 100 g as identity', () => {
    const food = { per100: { kcal: 350, prot: 20, fat: 12 } };
    const result = nutrientsFor(food, 100);
    assert.equal(result.kcal, 350);
    assert.equal(result.prot, 20);
    assert.equal(result.fat, 12);
  });

  it('rounds small values appropriately', () => {
    const food = { per100: { vitd: 0.002 } };
    const result = nutrientsFor(food, 50);
    assert.equal(result.vitd, 0.001);
  });
});

describe('periodRange week', () => {
  it('anchor 2026-09-23 (Wednesday) gives Monday 09-21 to Sunday 09-27', () => {
    const r = periodRange('week', '2026-09-23');
    assert.equal(r.from, '2026-09-21');
    assert.equal(r.to, '2026-09-27');
    assert.equal(r.key, 'week:2026-09-21');
  });

  it('anchor 2026-09-27 (Sunday) stays in the same week', () => {
    const r = periodRange('week', '2026-09-27');
    assert.equal(r.from, '2026-09-21');
    assert.equal(r.to, '2026-09-27');
  });

  it('anchor 2026-09-28 (Monday) starts a new week', () => {
    const r = periodRange('week', '2026-09-28');
    assert.equal(r.from, '2026-09-28');
    assert.equal(r.to, '2026-10-04');
    assert.equal(r.key, 'week:2026-09-28');
  });

  it('anchor 2026-10-25 (autumn clock change week) gives 09-19 to 10-25', () => {
    const r = periodRange('week', '2026-10-25');
    assert.equal(r.from, '2026-10-19');
    assert.equal(r.to, '2026-10-25');
    assert.equal(r.key, 'week:2026-10-19');
  });

  it('anchor 2026-12-31 spans year boundary: 12-28 to 2027-01-03', () => {
    const r = periodRange('week', '2026-12-31');
    assert.equal(r.from, '2026-12-28');
    assert.equal(r.to, '2027-01-03');
  });

  it('Monday anchor returns itself as from', () => {
    const r = periodRange('week', '2026-09-28');
    assert.equal(r.from, '2026-09-28');
  });
});

describe('periodRange month', () => {
  it('anchor 2026-02-15 gives full February 2026', () => {
    const r = periodRange('month', '2026-02-15');
    assert.equal(r.from, '2026-02-01');
    assert.equal(r.to, '2026-02-28');
    assert.equal(r.key, 'month:2026-02');
  });

  it('anchor 2028-02-10 ends on Feb 29 (leap year)', () => {
    const r = periodRange('month', '2028-02-10');
    assert.equal(r.from, '2028-02-01');
    assert.equal(r.to, '2028-02-29');
    assert.equal(r.key, 'month:2028-02');
  });

  it('anchor 2026-12-31 gives full December 2026', () => {
    const r = periodRange('month', '2026-12-31');
    assert.equal(r.from, '2026-12-01');
    assert.equal(r.to, '2026-12-31');
    assert.equal(r.key, 'month:2026-12');
  });

  it('first day of month gives the same month', () => {
    const r = periodRange('month', '2026-06-01');
    assert.equal(r.from, '2026-06-01');
    assert.equal(r.to, '2026-06-30');
  });
});

describe('nutrientStatus', () => {
  describe('kind min with ref v=100 and full coverage', () => {
    const ref = { k: { kind: 'min', v: 100 } };

    it('avg 40 (below 50%) returns low2', () => {
      const r = nutrientStatus('k', 40, 1, ref);
      assert.equal(r.st, 'low2');
    });

    it('avg 60 (between 50% and 80%) returns low', () => {
      const r = nutrientStatus('k', 60, 1, ref);
      assert.equal(r.st, 'low');
    });

    it('avg 90 (between 80% and 100%) returns close', () => {
      const r = nutrientStatus('k', 90, 1, ref);
      assert.equal(r.st, 'close');
    });

    it('avg 100 (at 100%) returns ok', () => {
      const r = nutrientStatus('k', 100, 1, ref);
      assert.equal(r.st, 'ok');
    });
  });

  it('low coverage with kind min returns nodata', () => {
    const ref = { k: { kind: 'min', v: 100 } };
    const r = nutrientStatus('k', 60, 0.5, ref);
    assert.equal(r.st, 'nodata');
  });

  describe('kind max with ref v=100', () => {
    const ref = { k: { kind: 'max', v: 100 } };

    it('avg 80 (below 90%) returns ok', () => {
      assert.equal(nutrientStatus('k', 80, 1, ref).st, 'ok');
    });

    it('avg 95 (above 90%, below 100%) returns near', () => {
      assert.equal(nutrientStatus('k', 95, 1, ref).st, 'near');
    });

    it('avg 120 (above 100%) returns high', () => {
      assert.equal(nutrientStatus('k', 120, 1, ref).st, 'high');
    });
  });

  describe('kind range with low=10, high=20', () => {
    const ref = { k: { kind: 'range', low: 10, high: 20 } };

    it('avg 8 (below 90% of low) returns low', () => {
      assert.equal(nutrientStatus('k', 8, 1, ref).st, 'low');
    });

    it('avg 15 (within range) returns ok', () => {
      assert.equal(nutrientStatus('k', 15, 1, ref).st, 'ok');
    });

    it('avg 23 (above 110% of high) returns high', () => {
      assert.equal(nutrientStatus('k', 23, 1, ref).st, 'high');
    });
  });

  it('no reference returns info', () => {
    assert.equal(nutrientStatus('k', 50, 1, {}).st, 'info');
  });

  it('avg null returns nodata', () => {
    const ref = { k: { kind: 'min', v: 100 } };
    assert.equal(nutrientStatus('k', null, 1, ref).st, 'nodata');
  });

  it('info kind always returns info regardless of avg', () => {
    const ref = { k: { kind: 'info' } };
    assert.equal(nutrientStatus('k', 0, 0, ref).st, 'info');
    assert.equal(nutrientStatus('k', 999, 1, ref).st, 'info');
  });
});
