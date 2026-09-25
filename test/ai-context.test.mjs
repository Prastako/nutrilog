// TZ must be set before any Date is created.
process.env.TZ = 'Europe/Prague';

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

runInContext(readFileSync(resolve(__dirname, '../src/strings.js'), 'utf8'), ctx);
runInContext(readFileSync(resolve(__dirname, '../src/core.js'), 'utf8'), ctx);
runInContext(readFileSync(resolve(__dirname, '../src/ai.js'), 'utf8'), ctx);
runInContext(';globalThis.__h = { S, buildContext };', ctx);

const { S, buildContext } = ctx.__h;

const P = 'PROFILE (no sex given; do not assume one): ';

describe('ai-context PROFILE line', () => {
  it('none', async () => {
    S.lang = 'en';
    S.profile = { person: { age: 30, heightCm: 170, weightKg: 70, activityLevel: 2, periods: 'skip' }, goals: { direction: 'maintain' }, food: {}, kitchen: {} };
    const c = await buildContext();
    assert.strictEqual(c.split('\n')[0], P + '30 years, 170 cm, 70 kg, activity level 2 of 4, direction: maintain');
  });

  it('heightCm empty string', async () => {
    S.lang = 'en';
    S.profile = { person: { age: 30, heightCm: '', weightKg: 70, activityLevel: 2, periods: 'skip' }, goals: { direction: 'maintain' }, food: {}, kitchen: {} };
    const c = await buildContext();
    assert.strictEqual(c.split('\n')[0], P + '30 years, height not given, 70 kg, activity level 2 of 4, direction: maintain');
  });

  it('bodyFatPct 20', async () => {
    S.lang = 'en';
    S.profile = { person: { age: 30, heightCm: 170, weightKg: 70, bodyFatPct: 20, activityLevel: 2, periods: 'skip' }, goals: { direction: 'maintain' }, food: {}, kitchen: {} };
    const c = await buildContext();
    assert.strictEqual(c.split('\n')[0], P + '30 years, 170 cm, 70 kg, 20 % body fat, activity level 2 of 4, direction: maintain');
  });

  it('periods yes', async () => {
    S.lang = 'en';
    S.profile = { person: { age: 30, heightCm: 170, weightKg: 70, activityLevel: 2, periods: 'yes' }, goals: { direction: 'maintain' }, food: {}, kitchen: {} };
    const c = await buildContext();
    assert.strictEqual(c.split('\n')[0], P + '30 years, 170 cm, 70 kg, has periods (iron need 16 mg), activity level 2 of 4, direction: maintain');
  });

  it('periods no', async () => {
    S.lang = 'en';
    S.profile = { person: { age: 30, heightCm: 170, weightKg: 70, activityLevel: 2, periods: 'no' }, goals: { direction: 'maintain' }, food: {}, kitchen: {} };
    const c = await buildContext();
    assert.strictEqual(c.split('\n')[0], P + '30 years, 170 cm, 70 kg, activity level 2 of 4, direction: maintain');
  });

  it('bodyFatPct 20 and periods yes', async () => {
    S.lang = 'en';
    S.profile = { person: { age: 30, heightCm: 170, weightKg: 70, bodyFatPct: 20, activityLevel: 2, periods: 'yes' }, goals: { direction: 'maintain' }, food: {}, kitchen: {} };
    const c = await buildContext();
    assert.strictEqual(c.split('\n')[0], P + '30 years, 170 cm, 70 kg, 20 % body fat, has periods (iron need 16 mg), activity level 2 of 4, direction: maintain');
  });

  it('sex female', async () => {
    S.lang = 'en';
    S.profile = { person: { age: 30, heightCm: 170, weightKg: 70, sex: 'female', activityLevel: 2, periods: 'skip' }, goals: { direction: 'maintain' }, food: {}, kitchen: {} };
    const c = await buildContext();
    assert.strictEqual(c.split('\n')[0], P + '30 years, 170 cm, 70 kg, activity level 2 of 4, direction: maintain');
  });

  it('sex male', async () => {
    S.lang = 'en';
    S.profile = { person: { age: 30, heightCm: 170, weightKg: 70, sex: 'male', activityLevel: 2, periods: 'skip' }, goals: { direction: 'maintain' }, food: {}, kitchen: {} };
    const c = await buildContext();
    assert.strictEqual(c.split('\n')[0], P + '30 years, 170 cm, 70 kg, activity level 2 of 4, direction: maintain');
  });

  it('activityDetail', async () => {
    S.lang = 'en';
    S.profile = { person: { age: 30, heightCm: 170, weightKg: 70, activityLevel: 2, periods: 'skip', activityDetail: { on: true, base: 2, sessions: 3, minutes: 60, type: 'strength', attendance: 'always' } }, goals: { direction: 'maintain' }, food: {}, kitchen: {} };
    const c = await buildContext();
    assert.strictEqual(c.split('\n')[0], P + '30 years, 170 cm, 70 kg, daily life level 2 of 4 plus training about 68 kcal a day, direction: maintain');
  });

  it('sex female context contains no male or physiology', async () => {
    S.lang = 'en';
    S.profile = { person: { age: 30, heightCm: 170, weightKg: 70, sex: 'female', activityLevel: 2, periods: 'skip' }, goals: { direction: 'maintain' }, food: {}, kitchen: {} };
    const c = await buildContext();
    assert.ok(!c.includes('male'), 'context must not contain "male"');
    assert.ok(!c.includes('physiology'), 'context must not contain "physiology"');
  });

  it('null profile', async () => {
    S.lang = 'en';
    S.profile = null;
    const c = await buildContext();
    assert.strictEqual(c, 'The person has not filled in a profile yet.');
  });
});
