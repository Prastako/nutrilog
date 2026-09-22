#!/usr/bin/env python3
"""Build the recipe archive from extracted reels.

Inputs (all produced by the pipeline, see tools/reels/PIPELINE.md):
  PREPARED/<reel>/bundle.json, thumb.webp   from prepare.py
  EXTRACTED/<reel>.json                     one extraction per reel (written by Claude)
  MERGED/<recipe-id>.json                   optional: one recipe built from several reels
Outputs into OUT:
  index.json            {archive, schema, generatedAt, recipes:[recipe records]}
  thumbs/<id>.webp      one thumbnail per recipe
  report.json           what was built, skipped, and nutrition match quality

Nutrition per serving is computed from the USDA database (data/foods.json)
by the grams of each ingredient; values stated by the author are kept next
to it, never mixed in.

Usage: python3 build_archive.py PREPARED EXTRACTED MERGED OUT FOODS_JSON"""
import json, os, re, sys, glob, shutil, time, unicodedata

PREPARED, EXTRACTED, MERGED, OUT, FOODS = sys.argv[1:6]

def fold(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

def toks(s):
    return [t for t in re.sub(r'[^a-z0-9%]+', ' ', fold(s)).split() if t]

db = json.load(open(FOODS))
KEYS = db['nutrients']
FOODS_L = []
for f in db['foods']:
    FOODS_L.append((f, toks(f['en']), fold(f['en'].split(',')[0])))
PROCESSED = ['breaded','batter','tenders','nugget','patty','fried','frozen','prepared','with added','dehydrated','imitation','sweetened','flavored','substitute','restaurant']

def match(en):
    q = toks(en)
    if not q: return None, 0
    best, bs = None, -1e9
    for f, ft, head in FOODS_L:
        s = 0; ok = True
        for i, w in enumerate(q):
            hit = -1
            for j, t in enumerate(ft):
                if t.startswith(w) or (len(w) > 4 and w.startswith(t)):
                    hit = (3 if t == w else 2) + (2 if j < 3 else 0); break
            if hit < 0:
                if i == 0: ok = False; break
                s -= 2; continue
            s += hit
        if not ok: continue
        if head.startswith(q[0]): s += 3
        low = f['en'].lower()
        for w in PROCESSED:
            if w in low and w not in en.lower(): s -= 3
        s -= len(f['en']) / 90
        if s > bs: best, bs = f, s
    matched = len(q)
    conf = 'high' if bs >= 3 * matched else 'medium' if bs >= 2 * matched else 'low'
    return best, conf

def compute(ingredients, servings):
    tot = {k: 0.0 for k in KEYS}; unknown = {k: 0.0 for k in KEYS}; allk = 0.0; matches = []
    for ing in ingredients:
        g = ing.get('grams')
        if not g or not ing.get('en'): continue
        f, conf = match(ing['en'])
        if not f or conf == 'low':
            matches.append({'item': ing.get('item'), 'en': ing['en'], 'match': f['en'] if f else None, 'confidence': conf})
            ing['foodRef'] = None
            continue
        ing['foodRef'] = 'usda:%d' % f['i']
        matches.append({'item': ing.get('item'), 'en': ing['en'], 'match': f['en'], 'confidence': conf})
        kc = (f['n'][0] or 0) * g / 100; allk += kc
        for i, k in enumerate(KEYS):
            v = f['n'][i]
            if v is None: unknown[k] += kc; continue
            tot[k] += v * g / 100
    ps = {}
    for k in KEYS:
        if k == 'water': continue
        if allk and unknown[k] / allk > 0.25: ps[k] = None; continue
        v = tot[k] / max(1, servings)
        ps[k] = round(v) if abs(v) >= 100 else round(v, 1) if abs(v) >= 1 else round(v, 3)
    return ps, matches

def slug(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', fold(s))).strip('-')[:48]

def source_of(reel):
    bp = os.path.join(PREPARED, reel, 'bundle.json')
    b = json.load(open(bp)) if os.path.exists(bp) else {'shortcode': reel}
    return {'platform': 'instagram', 'id': 'ig:' + reel, 'shortcode': reel,
            'url': b.get('url') or 'https://www.instagram.com/reel/%s/' % reel,
            'author': b.get('author'), 'authorName': b.get('authorName'), 'postedAt': b.get('postedAt'),
            'durationSec': b.get('durationSec'), 'caption': b.get('caption'),
            'files': {'info': 'originals/%s.info.json' % reel, 'thumb': 'originals/%s.jpg' % reel,
                      'frames': 'originals/%s.frames.jpg' % reel, 'extraction': 'extracted/%s.json' % reel}}

def main():
    os.makedirs(os.path.join(OUT, 'thumbs'), exist_ok=True)
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    used = set(); recipes = []; report = {'built': [], 'notRecipe': [], 'lowMatches': []}
    units = []
    for mp in sorted(glob.glob(os.path.join(MERGED, '*.json'))) if os.path.isdir(MERGED) else []:
        m = json.load(open(mp)); units.append((m['reels'], m['recipe'], m.get('extraction', {}), m.get('id')))
        used.update(m['reels'])
    for ep in sorted(glob.glob(os.path.join(EXTRACTED, '*.json'))):
        e = json.load(open(ep)); reel = e['reel']
        if reel in used: continue
        if not e.get('isRecipe'):
            report['notRecipe'].append(reel); continue
        units.append(([reel], e['recipe'], e.get('extraction', {}), None))
    for reels, r, ex, rid in units:
        rid = rid or 'rcp-' + slug(r.get('titleEn') or r['title']) + '-' + reels[0].lower()
        servings = r.get('servings') or 1
        ps, matches = compute(r.get('ingredients', []), servings)
        low = [m for m in matches if m['confidence'] == 'low']
        if low: report['lowMatches'].append({'id': rid, 'items': low})
        nut = dict(r.get('nutrition') or {})
        stated = nut.get('stated')
        rec = {
            'id': rid, 'type': 'recipe', 'schema': 1, 'origin': 'archive', 'archive': 'reel-recipe-atlas',
            'lang': r.get('lang', 'en'), 'title': r['title'], 'titleEn': r.get('titleEn') or r['title'], 'titleCs': r.get('titleCs', ''),
            'summary': r.get('summary', ''),
            'servings': servings, 'yield': r.get('yield'), 'time': r.get('time', {}), 'difficulty': r.get('difficulty'),
            'ingredients': r.get('ingredients', []), 'steps': r.get('steps', []),
            'tips': r.get('tips', []), 'variations': r.get('variations', []), 'storage': r.get('storage'),
            'nutrition': {'perServing': ps, 'basis': 'computed', 'confidence': 'medium' if low else 'high',
                          'source': 'USDA FoodData Central SR Legacy', 'stated': stated},
            'tags': sorted(set(r.get('tags', []))),
            'sources': [source_of(x) for x in reels],
            'extraction': {'at': now, 'by': ex.get('by', 'claude'), 'inputs': ex.get('inputs', []),
                           'confidence': ex.get('confidence', 'medium'), 'gaps': ex.get('gaps', []), 'pipeline': 'reels/1'},
            'thumb': 'thumbs/%s.webp' % rid, 'createdAt': now, 'updatedAt': now
        }
        th = os.path.join(PREPARED, reels[0], 'thumb.webp')
        if os.path.exists(th): shutil.copy(th, os.path.join(OUT, 'thumbs', rid + '.webp'))
        else: rec['thumb'] = None
        recipes.append(rec)
        report['built'].append({'id': rid, 'reels': reels, 'kcal': ps.get('kcal'), 'stated': (stated or {}).get('perServing')})
    recipes.sort(key=lambda x: x['title'])
    json.dump({'archive': 'reel-recipe-atlas', 'schema': 1, 'generatedAt': now, 'count': len(recipes), 'recipes': recipes},
              open(os.path.join(OUT, 'index.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), ensure_ascii=False, indent=1)
    print('built', len(recipes), 'recipes;', len(report['notRecipe']), 'not recipes;', len(report['lowMatches']), 'with weak ingredient matches')

main()
