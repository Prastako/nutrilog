// TZ must be set before any Date is created.
process.env.TZ = 'Europe/Prague';

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* Load src/core.js in a vm context that provides the browser globals  */
/* it needs, then expose only the calculation helpers.                 */
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
  ';globalThis.__core = { localDateKey, dateFromKey, addDays, cycleDue, nowIso, '
  + 'isoMs, cmpIso, nutAdd, nutScale, nutRound, flatProfile, computeTargets, round10, '
  + 'round5, SUPP_UL, suppUlOver, splitPreview };',
  ctx,
);
const {
  localDateKey, dateFromKey, addDays, cycleDue, nowIso,
  isoMs, cmpIso,
  nutAdd, nutScale, nutRound, flatProfile, computeTargets, round10, round5,
  SUPP_UL, suppUlOver, splitPreview,
} = ctx.__core;

/* ================================================================== */
/* TESTS                                                              */
/* ================================================================== */

describe('localDateKey', () => {
  it('normal daytime returns the local calendar date', () => {
    const d = new Date(Date.UTC(2026, 6, 15, 10, 30, 0)); // July 15, 12:30 Prague
    assert.equal(localDateKey(d), '2026-07-15');
  });

  it('00:30 Prague (still previous day in UTC) returns the local day', () => {
    // Jan 2 00:30 CET = Jan 1 23:30 UTC
    const d = new Date(Date.UTC(2026, 0, 1, 23, 30, 0));
    assert.equal(localDateKey(d), '2026-01-02');
    // The UTC date would give 2026-01-01 if the function were wrong.
    const utcDay = d.getUTCFullYear()
      + '-' + String(d.getUTCMonth() + 1).padStart(2, '0')
      + '-' + String(d.getUTCDate()).padStart(2, '0');
    assert.notEqual(localDateKey(d), utcDay,
      'must differ from the UTC-derived date');
  });

  it('23:30 Prague (still same day in UTC) returns the local day', () => {
    // July 15 23:30 CEST = July 15 21:30 UTC
    const d = new Date(Date.UTC(2026, 6, 15, 21, 30, 0));
    assert.equal(localDateKey(d), '2026-07-15');
  });
});

describe('addDays', () => {
  it('adds days across month end (Jan 30 + 5 = Feb 4)', () => {
    assert.equal(addDays('2026-01-30', 5), '2026-02-04');
  });

  it('adds days across year end (Dec 30 + 5 = Jan 4 next year)', () => {
    assert.equal(addDays('2026-12-30', 5), '2027-01-04');
  });

  it('supports negative days (Mar 10 - 3 = Mar 7)', () => {
    assert.equal(addDays('2026-03-10', -3), '2026-03-07');
  });

  it('crosses spring DST change correctly (Mar 28 + 1 = Mar 29)', () => {
    // In 2026, clocks spring forward on March 29 at 03:00 in Prague.
    assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  });

  it('crosses autumn DST change correctly (Oct 24 + 1 = Oct 25)', () => {
    // In 2026, clocks fall back on October 25 at 04:00 in Prague.
    assert.equal(addDays('2026-10-24', 1), '2026-10-25');
  });
});

describe('nowIso', () => {
  it('winter date ends with +01:00 (CET)', () => {
    const d = new Date(Date.UTC(2026, 0, 15, 12, 0, 0)); // Jan 15 13:00 Prague
    const iso = nowIso(d);
    assert.match(iso, /\+01:00$/, 'winter offset must be +01:00');
    // Wall-clock hour is Prague hour (13), not UTC hour (12).
    assert.ok(iso.includes('T13:'), 'hour must be the Prague wall-clock hour');
  });

  it('summer date ends with +02:00 (CEST)', () => {
    const d = new Date(Date.UTC(2026, 6, 15, 10, 30, 0)); // July 15 12:30 Prague
    const iso = nowIso(d);
    assert.match(iso, /\+02:00$/, 'summer offset must be +02:00');
    // Wall-clock hour is Prague hour (12), not UTC hour (10).
    assert.ok(iso.includes('T12:'), 'hour must be the Prague wall-clock hour');
  });

  it('format is YYYY-MM-DDTHH:MM:SS+HH:MM', () => {
    const d = new Date(Date.UTC(2026, 5, 1, 12, 0, 0));
    const iso = nowIso(d);
    assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });
});

describe('nutAdd', () => {
  it('adds two nutrient maps', () => {
    const result = nutAdd({}, { kcal: 200, prot: 10 });
    assert.equal(result.kcal, 200);
    assert.equal(result.prot, 10);
  });

  it('accumulates across calls', () => {
    const acc = {};
    nutAdd(acc, { kcal: 200, prot: 10 });
    nutAdd(acc, { kcal: 300, prot: 5 });
    assert.equal(acc.kcal, 500);
    assert.equal(acc.prot, 15);
  });

  it('applies a factor', () => {
    const result = nutAdd({}, { kcal: 100, prot: 5 }, 2);
    assert.equal(result.kcal, 200);
    assert.equal(result.prot, 10);
  });

  it('skips null values', () => {
    const result = nutAdd({}, { kcal: 200, prot: null, fat: 3 });
    assert.equal(result.kcal, 200);
    assert.equal(result.fat, 3);
    assert.equal(result.prot, undefined);
  });

  it('skips missing (undefined) values', () => {
    const acc = nutAdd({}, { kcal: null, prot: undefined });
    assert.equal(acc.kcal, undefined);
    assert.equal(acc.prot, undefined);
  });

  it('returns acc unchanged when n is null', () => {
    const acc = { kcal: 100 };
    assert.strictEqual(nutAdd(acc, null), acc);
  });
});

describe('nutScale', () => {
  it('scales numeric values', () => {
    const result = nutScale({ kcal: 1000, prot: 50 }, 0.5);
    assert.equal(result.kcal, 500);
    assert.equal(result.prot, 25);
  });

  it('keeps null as null', () => {
    const result = nutScale({ kcal: 1000, prot: null }, 2);
    assert.equal(result.kcal, 2000);
    assert.equal(result.prot, null);
  });

  it('handles empty input', () => {
    const result = nutScale(null, 3);
    assert.equal(Object.keys(result).length, 0);
  });
});

describe('nutRound', () => {
  it('rounds to integer when value >= 100', () => {
    const result = nutRound({ kcal: 1857.4, prot: 120.6 });
    assert.equal(result.kcal, 1857);
    assert.equal(result.prot, 121);
  });

  it('rounds to one decimal when 1 <= value < 100', () => {
    const result = nutRound({ prot: 45.678, fat: 30.123 });
    assert.equal(result.prot, 45.7);
    assert.equal(result.fat, 30.1);
  });

  it('rounds to three decimals when value < 1', () => {
    const result = nutRound({ vitd: 0.0006, biotin: 0.0004 });
    assert.equal(result.vitd, 0.001);
    assert.equal(result.biotin, 0.0);
  });

  it('keeps null as null', () => {
    const result = nutRound({ kcal: 2000, prot: null });
    assert.equal(result.kcal, 2000);
    assert.equal(result.prot, null);
  });

  it('handles empty input', () => {
    const result = nutRound(null);
    assert.equal(Object.keys(result).length, 0);
  });
});

describe('computeTargets', () => {
  function profile(sex, age, heightCm, weightKg, activityLevel, direction, bodyFatPct) {
    return {
      person: { sex, age, heightCm, weightKg, activityLevel, bodyFatPct },
      goals: { direction },
    };
  }

  it('returns null when age is missing', () => {
    assert.equal(computeTargets(profile('male', null, 180, 75, 2, 'maintain')), null);
  });

  it('returns null when weight is missing', () => {
    assert.equal(computeTargets(profile('male', 28, 180, null, 2, 'maintain')), null);
  });

  it('mifflin: rmr 1657 for age 28, height 180, weight 75', () => {
    const p = profile('male', 28, 180, 75, 2, 'maintain');
    const result = computeTargets(p);
    assert.equal(result.rmr, 1657);
    assert.equal(result.method, 'mifflin');
  });

  it('weight: rmr 1545 for age 35, weight 70, no height', () => {
    const p = profile('male', 35, 0, 70, 2, 'maintain');
    const result = computeTargets(p);
    assert.equal(result.rmr, 1545);
    assert.equal(result.method, 'weight');
  });

  it('leanmass: rmr 1996 for body fat 15%, weight 80', () => {
    const p = profile('male', 25, 175, 80, 2, 'maintain', 15);
    const result = computeTargets(p);
    assert.equal(result.rmr, 1996);
    assert.equal(result.method, 'leanmass');
  });

  it('low and high are multiples of 10', () => {
    const p = profile('male', 28, 180, 75, 2, 'maintain');
    const result = computeTargets(p);
    assert.equal(result.low % 10, 0, 'low must be multiple of 10');
    assert.equal(result.high % 10, 0, 'high must be multiple of 10');
  });

  it('low < high', () => {
    const p = profile('male', 28, 180, 75, 2, 'maintain');
    const result = computeTargets(p);
    assert.ok(result.low < result.high, `low (${result.low}) must be < high (${result.high})`);
  });

  describe('floor binding', () => {
    const p = profile('female', 35, 160, 35, 1, 'lose');

    it('floorBinding is true for small person losing weight', () => {
      const result = computeTargets(p);
      assert.equal(result.floorBinding, true);
    });

    it('low equals floor', () => {
      const result = computeTargets(p);
      assert.equal(result.low, result.floor);
    });
  });
});

describe('isoMs and cmpIso', () => {
  it('orders stamps by the real moment across the autumn clock change', () => {
    assert.ok(isoMs('2026-10-25T02:10:00+01:00') > isoMs('2026-10-25T02:30:00+02:00'));
  });
  it('treats the same moment with different offsets as equal', () => {
    assert.equal(cmpIso('2026-09-24T02:00:00+02:00', '2026-09-24T00:00:00Z'), 0);
  });
  it('sorts oldest first', () => {
    const a = ['2026-10-25T02:10:00+01:00', '2026-10-24T23:00:00Z', '2026-10-25T02:30:00+02:00'].sort(cmpIso);
    assert.deepEqual([...a], ['2026-10-24T23:00:00Z', '2026-10-25T02:30:00+02:00', '2026-10-25T02:10:00+01:00']);
  });
  it('returns 0 for missing or invalid input', () => {
    for (const bad of [null, undefined, '', 'garbage', 12345, {}]) assert.equal(isoMs(bad), 0);
  });
});

describe('suppUlOver', () => {
  const keys = (r) => r.map(x => x.k).join(',');
  it('flags magnesium above 250 mg', () => {
    const r = suppUlOver({mg: 300});
    assert.equal(r.length, 1);
    assert.equal(r[0].k, 'mg'); assert.equal(r[0].amount, 300); assert.equal(r[0].ul, 250);
  });
  it('does not flag an amount equal to the level', () => { assert.equal(suppUlOver({mg: 250}).length, 0); });
  it('flags only nutrients above their level', () => { assert.equal(keys(suppUlOver({vitd: 125, zn: 10})), 'vitd'); });
  it('keeps the order of SUPP_UL', () => { assert.equal(keys(suppUlOver({fe: 41, mg: 251})), 'mg,fe'); });
  it('returns an empty list for missing or invalid input', () => {
    assert.equal(suppUlOver(null).length, 0);
    assert.equal(suppUlOver(undefined).length, 0);
    assert.equal(suppUlOver({mg: null, vitd: 'x', zn: NaN, fe: Infinity}).length, 0);
  });
  it('uses the EFSA levels', () => {
    assert.equal(SUPP_UL.mg, 250); assert.equal(SUPP_UL.vitd, 100); assert.equal(SUPP_UL.zn, 25); assert.equal(SUPP_UL.fe, 40);
  });
});

describe('cycleDue', () => {
  it('is true for the start date itself (day 0)', () => {
    assert.ok(cycleDue('2026-09-24', '2026-09-24', 2));
  });

  it('is true every other day from start', () => {
    assert.ok(cycleDue('2026-09-24', '2026-09-26', 2));
    assert.ok(cycleDue('2026-09-24', '2026-09-28', 2));
    assert.ok(cycleDue('2026-09-24', '2026-09-30', 2));
  });

  it('is false on the days in between', () => {
    assert.ok(!cycleDue('2026-09-24', '2026-09-25', 2));
    assert.ok(!cycleDue('2026-09-24', '2026-09-27', 2));
  });

  it('works for dates before the start', () => {
    assert.ok(cycleDue('2026-09-24', '2026-09-22', 2));
    assert.ok(!cycleDue('2026-09-24', '2026-09-23', 2));
  });

  it('handles DST autumn transition correctly (clocks fall back)', () => {
    // 2026-10-25 is autumn DST change in Prague. Calendar day counting avoids the shift.
    assert.ok(cycleDue('2026-10-24', '2026-10-26', 2));
    assert.ok(cycleDue('2026-10-25', '2026-10-27', 2));
  });

  it('handles DST spring transition correctly (clocks spring forward)', () => {
    // 2026-03-29 is spring DST change in Prague
    assert.ok(cycleDue('2026-03-28', '2026-03-30', 2));
    assert.ok(cycleDue('2026-03-29', '2026-03-31', 2));
  });

  it('returns true when startKey is missing', () => {
    assert.ok(cycleDue(null, '2026-09-24', 2));
    assert.ok(cycleDue(undefined, '2026-09-24', 2));
    assert.ok(cycleDue('', '2026-09-24', 2));
  });

  it('returns true when every is less than 2', () => {
    assert.ok(cycleDue('2026-09-24', '2026-09-25', 1));
    assert.ok(cycleDue('2026-09-24', '2026-09-25', 0));
  });

  it('supports every=3 cycle', () => {
    assert.ok(cycleDue('2026-09-24', '2026-09-24', 3));
    assert.ok(cycleDue('2026-09-24', '2026-09-27', 3));
    assert.ok(cycleDue('2026-09-24', '2026-09-30', 3));
    assert.ok(!cycleDue('2026-09-24', '2026-09-25', 3));
    assert.ok(!cycleDue('2026-09-24', '2026-09-26', 3));
  });
});

describe('splitPreview', () => {
  function profile(sex, age, heightCm, weightKg, activityLevel, direction, preset) {
    return {
      person: { sex, age, heightCm, weightKg, activityLevel },
      goals: { direction, macroSplit: { preset: preset || 'balanced' } },
    };
  }

  it('returns null when weightKg is missing', () => {
    const p = {
      person: { sex: 'male', age: 28, heightCm: 180, weightKg: null, activityLevel: 2 },
      goals: { direction: 'maintain' },
    };
    assert.equal(splitPreview(p), null);
  });

  describe('male 28, 180 cm, 75 kg, activity 2, maintain, balanced', () => {
    const p = profile('male', 28, 180, 75, 2, 'maintain', 'balanced');

    it('kcal equals computeTargets mid', () => {
      const g = computeTargets(p);
      const result = splitPreview(p);
      assert.equal(result.kcal, g.mid);
    });

    it('p equals round5(kcal * 25 / 100 / 4)', () => {
      const g = computeTargets(p);
      const result = splitPreview(p);
      assert.equal(result.p, round5(g.mid * 25 / 100 / 4));
    });

    it('fatHigh is false', () => {
      const result = splitPreview(p);
      assert.equal(result.fatHigh, false);
    });

    it('slots are breakfast, lunch, snack, dinner with correct kcal', () => {
      const g = computeTargets(p);
      const result = splitPreview(p);
      const expected = [
        { slot: 'breakfast', kcal: round10(g.mid * 25 / 100) },
        { slot: 'lunch', kcal: round10(g.mid * 35 / 100) },
        { slot: 'snack', kcal: round10(g.mid * 10 / 100) },
        { slot: 'dinner', kcal: round10(g.mid * 30 / 100) },
      ];
      assert.equal(JSON.stringify([...result.slots]), JSON.stringify(expected));
    });
  });

  it('preset lowcarb gives fatHigh true', () => {
    const p = profile('male', 28, 180, 75, 2, 'maintain', 'lowcarb');
    const result = splitPreview(p);
    assert.equal(result.fatHigh, true);
  });

  it('custom slots {breakfast:50, lunch:50, snack:0, dinner:0} produce only breakfast and lunch', () => {
    const p = {
      person: { sex: 'male', age: 28, heightCm: 180, weightKg: 75, activityLevel: 2 },
      goals: { direction: 'maintain', macroSplit: { preset: 'balanced' }, slots: { breakfast: 50, lunch: 50, snack: 0, dinner: 0 } },
    };
    const g = computeTargets(p);
    const result = splitPreview(p);
    const expected = [
      { slot: 'breakfast', kcal: round10(g.mid * 50 / 100) },
      { slot: 'lunch', kcal: round10(g.mid * 50 / 100) },
    ];
    assert.equal(result.slots.length, 2, 'should have exactly 2 slots');
    assert.equal(JSON.stringify([...result.slots]), JSON.stringify(expected));
  });
});
