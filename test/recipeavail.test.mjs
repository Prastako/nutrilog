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
  console, Intl, Date, Math, JSON, String, Number, Array, Object, Error,
  isFinite, TextEncoder, TextDecoder, setTimeout, clearTimeout,
  btoa(b) { return Buffer.from(b, 'binary').toString('base64'); },
  atob(s) { return Buffer.from(s, 'base64').toString('binary'); },
  document: { querySelector: () => null, querySelectorAll: () => [] },
  crypto: { getRandomValues(buf) { for (let i = 0; i < buf.length; i++) buf[i] = i % 256; } },
  indexedDB: null,
  setTimeout, clearTimeout,
});

runInContext(readFileSync(resolve(__dirname, '../src/strings.js'), 'utf8'), ctx);
runInContext(readFileSync(resolve(__dirname, '../src/core.js'), 'utf8'), ctx);
runInContext(readFileSync(resolve(__dirname, '../src/recipeschema.js'), 'utf8'), ctx);
runInContext(readFileSync(resolve(__dirname, '../src/recipeavail.js'), 'utf8'), ctx);
runInContext(';globalThis.__api = { profileAxisFlags, recipeAvailability, recipeCategories, isFullMeal };', ctx);
const { profileAxisFlags, recipeAvailability, recipeCategories, isFullMeal } = ctx.__api;

describe('profileAxisFlags', () => {
  it('littlemeat pattern maps to omnivore axis', () => {
    const result = profileAxisFlags({ food: { pattern: 'littlemeat' } });
    assert.equal(result.axis, 'omnivore');
  });

  it('coeliac + peanut allergy produces gluten-free and no:peanut flags', () => {
    const result = profileAxisFlags({
      food: { conditions: ['coeliac'], exclusions: [{ id: 'peanut', type: 'allergy' }] }
    });
    assert.equal(JSON.stringify(result.flags), JSON.stringify(['gluten-free', 'no:peanut']));
  });
});

describe('recipeAvailability', () => {
  it('vegetarian recipe not available for pescatarian profile', () => {
    const result = recipeAvailability(
      { written: 'vegetarian', variants: { omnivore: [] }, ingredients: [], steps: [] },
      { food: { pattern: 'pescatarian' } }
    );
    assert.equal(result.available, false);
    assert.equal(result.reason, 'axis');
  });
});

describe('recipeCategories', () => {
  it('totalMin 25 produces quick category', () => {
    const result = recipeCategories({ time: { totalMin: 25 } });
    assert.equal(JSON.stringify(result), JSON.stringify(['quick']));
  });
});

describe('isFullMeal', () => {
  it('500 kcal, 25g protein, 7g fiber is a full meal', () => {
    assert.equal(isFullMeal({ kcal: 500, prot: 25, fib: 7 }), true);
  });
});
