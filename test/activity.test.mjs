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
  atob(s) { return Buffer.from(s, 'binary').toString('binary'); },
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
  ';globalThis.__core = { computeTargets, ACTIVITY, sessionKcal, trainingPerDay };',
  ctx,
);
const { computeTargets, ACTIVITY, sessionKcal, trainingPerDay } = ctx.__core;

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe('ACTIVITY constants', () => {
  it('mult values are [1.4,1.55,1.7,1.9]', () => {
    assert.equal(
      JSON.stringify(ACTIVITY.map(a => a.mult)),
      '[1.4,1.55,1.7,1.9]'
    );
  });

  it('unc values are [0.13,0.13,0.14,0.16]', () => {
    assert.equal(
      JSON.stringify(ACTIVITY.map(a => a.unc)),
      '[0.13,0.13,0.14,0.16]'
    );
  });
});

describe('computeTargets with activityLevel and activityDetail', () => {
  const basePerson = () => ({ age: 30, heightCm: 170, weightKg: 70, activityLevel: 2 });
  const baseGoals = () => ({ direction: 'maintain' });

  it('activityLevel 1, no detail -> mult 1.4, training 0, tdee 2148', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.activityLevel = 1;
    const result = computeTargets(rec);
    assert.equal(result.mult, 1.4);
    assert.equal(result.training, 0);
    assert.equal(result.tdee, 2148);
  });

  it('activityLevel 3, no detail -> mult 1.7, training 0', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.activityLevel = 3;
    const result = computeTargets(rec);
    assert.equal(result.mult, 1.7);
    assert.equal(result.training, 0);
  });

  it('no activityLevel, no detail -> mult 1.55', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    delete rec.person.activityLevel;
    const result = computeTargets(rec);
    assert.equal(result.mult, 1.55);
  });

  it('activityLevel 3, detail on:false -> mult 1.7, training 0', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.activityLevel = 3;
    rec.person.activityDetail = { on: false, base: 1, sessions: 3, type: 'hiit' };
    const result = computeTargets(rec);
    assert.equal(result.mult, 1.7);
    assert.equal(result.training, 0);
  });

  it('detail on:true, base:2, sessions:3, minutes:60, strength, always -> mult 1.55, training 68, tdee 2446', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.activityDetail = { on: true, base: 2, sessions: 3, minutes: 60, type: 'strength', attendance: 'always' };
    const result = computeTargets(rec);
    assert.equal(result.mult, 1.55);
    assert.equal(result.training, 68);
    assert.equal(result.tdee, 2446);
  });

  it('detail on:true, base:1, sessions:3, minutes:60, heavy, usually -> training 113', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.activityLevel = 1;
    rec.person.activityDetail = { on: true, base: 1, sessions: 3, minutes: 60, type: 'heavy', attendance: 'usually' };
    const result = computeTargets(rec);
    assert.equal(result.training, 113);
  });

  it('detail on:true, base:1, sessions:2, minutes:60, climbing, usually -> training 72', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.activityLevel = 1;
    rec.person.activityDetail = { on: true, base: 1, sessions: 2, minutes: 60, type: 'climbing', attendance: 'usually' };
    const result = computeTargets(rec);
    assert.equal(result.training, 72);
  });

  it('detail on:true, base:1, sessions:2, minutes:60, yoga, usually -> training 20', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.activityLevel = 1;
    rec.person.activityDetail = { on: true, base: 1, sessions: 2, minutes: 60, type: 'yoga', attendance: 'usually' };
    const result = computeTargets(rec);
    assert.equal(result.training, 20);
  });

  it('detail on:true, base:1, sessions:3, strength, always (no minutes) -> training 68', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.activityLevel = 1;
    rec.person.activityDetail = { on: true, base: 1, sessions: 3, type: 'strength', attendance: 'always' };
    const result = computeTargets(rec);
    assert.equal(result.training, 68);
  });

  it('detail on:true, base:1, sessions:3, minutes:60, unknown type/attendance -> training 56', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.activityLevel = 1;
    rec.person.activityDetail = { on: true, base: 1, sessions: 3, minutes: 60, type: 'unknownword', attendance: 'nonsense' };
    const result = computeTargets(rec);
    assert.equal(result.training, 56);
  });

  it('detail on:true, base:7, sessions:0 -> mult 1.4, training 0', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.activityLevel = 1;
    rec.person.activityDetail = { on: true, base: 7, sessions: 0 };
    const result = computeTargets(rec);
    assert.equal(result.mult, 1.4);
    assert.equal(result.training, 0);
  });

  it('weightKg null, detail on:true -> computeTargets returns null', () => {
    const rec = { person: basePerson(), goals: baseGoals() };
    rec.person.weightKg = null;
    rec.person.activityDetail = { on: true, sessions: 3, minutes: 60, type: 'strength', attendance: 'always' };
    const result = computeTargets(rec);
    assert.equal(result, null);
  });

  it('detail sessions 5 vs sessions 3: mid with 5 sessions is greater', () => {
    const rec5 = { person: basePerson(), goals: baseGoals() };
    rec5.person.activityLevel = 2;
    rec5.person.activityDetail = { on: true, base: 2, sessions: 5, minutes: 60, type: 'strength', attendance: 'always' };
    const result5 = computeTargets(rec5);

    const rec3 = { person: basePerson(), goals: baseGoals() };
    rec3.person.activityLevel = 2;
    rec3.person.activityDetail = { on: true, base: 2, sessions: 3, minutes: 60, type: 'strength', attendance: 'always' };
    const result3 = computeTargets(rec3);

    assert.ok(result5.mid > result3.mid);
  });

  it('detail on:true vs on:false: relPct is equal', () => {
    const recOn = { person: basePerson(), goals: baseGoals() };
    recOn.person.activityLevel = 2;
    recOn.person.activityDetail = { on: true, base: 2, sessions: 3, minutes: 60, type: 'strength', attendance: 'always' };
    const resultOn = computeTargets(recOn);

    const recOff = { person: basePerson(), goals: baseGoals() };
    recOff.person.activityLevel = 2;
    recOff.person.activityDetail = { on: false };
    const resultOff = computeTargets(recOff);

    assert.equal(resultOn.relPct, resultOff.relPct);
  });

  it('old profile with sex empty, activityLevel 2 -> mult 1.55, training 0', () => {
    const rec = {
      person: { sex: '', age: 30, heightCm: 170, weightKg: 70, activityLevel: 2 },
      goals: { direction: 'maintain' }
    };
    const result = computeTargets(rec);
    assert.equal(result.mult, 1.55);
    assert.equal(result.training, 0);
  });
});

describe('sessionKcal', () => {
  it('sessionKcal(strength, 70, 60) = 175', () => {
    assert.equal(sessionKcal('strength', 70, 60), 175);
  });
});

describe('trainingPerDay', () => {
  it('trainingPerDay strength 3 sessions always 70kg differs from 67.5 by less than 1e-9', () => {
    const detail = { on: true, sessions: 3, minutes: 60, type: 'strength', attendance: 'always' };
    const value = trainingPerDay(detail, 70);
    assert.ok(Math.abs(value - 67.5) < 1e-9);
  });
});
