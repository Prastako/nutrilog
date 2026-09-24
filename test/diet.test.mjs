// TZ must be set before any Date is created.
process.env.TZ = 'Europe/Prague';

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stringsSrc = readFileSync(resolve(__dirname, '../src/strings.js'), 'utf8');
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

runInContext(stringsSrc, ctx);
runInContext(coreSrc, ctx);
runInContext(';globalThis.__x = { S, exclusionHits, migrateDietV3 };', ctx);
const { S, exclusionHits, migrateDietV3 } = ctx.__x;

/* ------------------------------------------------------------------ */
/* Helper                                                             */
/* ------------------------------------------------------------------ */

function hits(food, text) {
  S.lang = 'en';
  S.profile = { food: Object.assign({ exclusions: [] }, food), goals: {} };
  return exclusionHits(text).length > 0;
}

/* ------------------------------------------------------------------ */
/* Exclusion filter tests                                             */
/* ------------------------------------------------------------------ */

describe('exclusion filter -- vegetarian', () => {
  const f = { pattern: 'vegetarian' };
  const rows = [
    ['chicken breast', true],
    ['Chicken pho', true],
    ['fish sauce', true],
    ['prawns', true],
    ['Hasselback teriyaki tofu steaks', false],
    ['coconut milk', false],
    ['grated parmesan', false],
    ['eggs', false],
    ['gooseberries', false],
    ['Rice, white, steamed', false],
    ['Croutons, plain / Krutony', false],
  ];
  for (const [text, expected] of rows) {
    it(`hits('${text}') => ${expected}`, () => {
      assert.equal(hits(f, text), expected, text);
    });
  }
});

describe('exclusion filter -- vegetarian with noEggs', () => {
  const f = { pattern: 'vegetarian', patternOpts: { noEggs: true } };
  it('hits(eggs) => true', () => {
    assert.equal(hits(f, 'eggs'), true);
  });
});

describe('exclusion filter -- pescatarian', () => {
  const f = { pattern: 'pescatarian' };
  const rows = [
    ['salmon fillets', false],
    ['bacon', true],
    ['cod liver oil', false],
  ];
  for (const [text, expected] of rows) {
    it(`hits('${text}') => ${expected}`, () => {
      assert.equal(hits(f, text), expected, text);
    });
  }
});

describe('exclusion filter -- vegan', () => {
  const f = { pattern: 'vegan' };
  const rows = [
    ['honey', true],
    ['butter', true],
    ['eggs', true],
    ['honeydew melon', false],
    ['peanut butter', false],
    ['vegan sausage', false],
  ];
  for (const [text, expected] of rows) {
    it(`hits('${text}') => ${expected}`, () => {
      assert.equal(hits(f, text), expected, text);
    });
  }
});

describe('exclusion filter -- vegan label', () => {
  it('exclusionHits(butter)[0].label is Vegan', () => {
    S.lang = 'en';
    S.profile = { food: { pattern: 'vegan', exclusions: [] }, goals: {} };
    const h = exclusionHits('butter');
    assert.equal(h[0].label, 'Vegan');
  });
});

describe('exclusion filter -- everything', () => {
  const f = { pattern: 'everything' };
  it('hits(chicken breast) => false', () => {
    assert.equal(hits(f, 'chicken breast'), false);
  });
});

describe('exclusion filter -- carnivore', () => {
  const f = { pattern: 'carnivore' };
  it('hits(rice) => false', () => {
    assert.equal(hits(f, 'rice'), false);
  });
});

describe('exclusion filter -- coeliac condition', () => {
  const f = { conditions: ['coeliac'] };
  const rows = [
    ['wholegrain bread', true],
    ['rice noodles', false],
  ];
  for (const [text, expected] of rows) {
    it(`hits('${text}') => ${expected}`, () => {
      assert.equal(hits(f, text), expected, text);
    });
  }
});

describe('exclusion filter -- halal rule', () => {
  const f = { rules: ['halal'] };
  const rows = [
    ['pork belly', true],
    ['red wine', true],
    ['fresh ginger', false],
    ['apple cider vinegar', false],
    ['hamburger', false],
  ];
  for (const [text, expected] of rows) {
    it(`hits('${text}') => ${expected}`, () => {
      assert.equal(hits(f, text), expected, text);
    });
  }
});

describe('exclusion filter -- nobeef rule', () => {
  const f = { rules: ['nobeef'] };
  const rows = [
    ['hamburger', true],
    ['chicken', false],
  ];
  for (const [text, expected] of rows) {
    it(`hits('${text}') => ${expected}`, () => {
      assert.equal(hits(f, text), expected, text);
    });
  }
});

describe('exclusion filter -- kosher rule', () => {
  const f = { rules: ['kosher'] };
  const rows = [
    ['shrimp', true],
    ['ham', true],
  ];
  for (const [text, expected] of rows) {
    it(`hits('${text}') => ${expected}`, () => {
      assert.equal(hits(f, text), expected, text);
    });
  }
});

describe('exclusion filter -- empty food', () => {
  it('hits(chicken breast) => false', () => {
    assert.equal(hits({}, 'chicken breast'), false);
  });
});

/* ------------------------------------------------------------------ */
/* migrateDietV3 tests                                                */
/* ------------------------------------------------------------------ */

describe('migrateDietV3 -- vegan takes priority', () => {
  const rec = { food: { exclusions: [] }, goals: { dietStyle: ['vegetarian', 'vegan'], aims: [] } };
  const result = migrateDietV3(rec);
  it('pattern is vegan', () => {
    assert.equal(result.food.pattern, 'vegan');
  });
});

describe('migrateDietV3 -- flexitarian + mediterranean', () => {
  const rec = { food: { exclusions: [] }, goals: { dietStyle: ['flexitarian', 'mediterranean'], aims: [] } };
  const result = migrateDietV3(rec);
  it('pattern is littlemeat', () => {
    assert.equal(result.food.pattern, 'littlemeat');
  });
  it('goals.focus includes mediterranean', () => {
    assert.ok(result.goals.focus.includes('mediterranean'));
  });
});

describe('migrateDietV3 -- aims split into focus and hints', () => {
  const rec = { food: { exclusions: [] }, goals: { dietStyle: [], aims: ['fibre', 'muscle', 'sleep'] } };
  const result = migrateDietV3(rec);
  it('goals.focus is ["fibre"]', () => {
    assert.equal(JSON.stringify(result.goals.focus), '["fibre"]');
  });
  it('goals.hints is ["sleep"]', () => {
    assert.equal(JSON.stringify(result.goals.hints), '["sleep"]');
  });
});

describe('migrateDietV3 -- glutenfree without gluten exclusion', () => {
  const rec = { food: { exclusions: [] }, goals: { dietStyle: ['glutenfree'], aims: [] } };
  const result = migrateDietV3(rec);
  it('prefs includes avoidgluten', () => {
    assert.ok(result.food.prefs.includes('avoidgluten'));
  });
});

describe('migrateDietV3 -- glutenfree with gluten exclusion', () => {
  const rec = { food: { exclusions: [{ id: 'gluten' }] }, goals: { dietStyle: ['glutenfree'], aims: [] } };
  const result = migrateDietV3(rec);
  it('prefs does not include avoidgluten', () => {
    assert.ok(!result.food.prefs.includes('avoidgluten'));
  });
});

describe('migrateDietV3 -- already has pattern', () => {
  const rec = { food: { pattern: 'vegan', exclusions: [] }, goals: { dietStyle: [], aims: [] } };
  const result = migrateDietV3(rec);
  it('pattern stays vegan', () => {
    assert.equal(result.food.pattern, 'vegan');
  });
});

describe('migrateDietV3 -- keeps dietStyle, input unchanged', () => {
  const rec = { food: { exclusions: [] }, goals: { dietStyle: ['vegetarian'], aims: [] } };
  const result = migrateDietV3(rec);
  it('dietStyle is still present after migration', () => {
    assert.ok(result.goals.dietStyle.includes('vegetarian'));
  });
  it('input record food.pattern is still undefined', () => {
    assert.equal(rec.food.pattern, undefined);
  });
});
