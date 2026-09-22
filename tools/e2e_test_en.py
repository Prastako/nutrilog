#!/usr/bin/env python3
"""English walk-through of NutriLog with a leftover-Czech detector.
Fresh browser profile (no saved settings), phone size, Claude mocked in English.
Visits every screen and sheet; on each one it lists visible text or
placeholders/labels that look Czech. Food and recipe data you type yourself
are not checked (the test types English).
Usage: python3 tools/e2e_test_en.py <repo_dir> <shots_dir> [--lang-default-check]"""
import json, os, re, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

REPO, SHOTS = sys.argv[1], sys.argv[2]
os.makedirs(SHOTS, exist_ok=True)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=REPO)
H.log_message = lambda *a: None
class Srv(socketserver.ThreadingTCPServer): allow_reuse_address = True
srv = Srv(('127.0.0.1', 8768), H); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:8768/'

EVAL = {"kind":"dish","name":"Chicken salad with avocado","description":"A plate of salad with chicken, avocado and tomatoes.","brand":None,
  "portionGrams":350,"servingLabel":"1 plate","per100g":{"kcal":150,"prot":11,"fat":9,"carb":5,"fib":2.5},
  "perPortion":{"kcal":525,"prot":38,"fat":31,"carb":18,"fib":9},"nutritionBasis":"estimated_from_photo",
  "ingredientsSeen":["chicken","avocado","tomatoes","iceberg lettuce","olive oil"],"exclusionWarnings":[],
  "fitScore":4,"verdict":"A good lunch choice, high in protein.","reasons":["Covers about a quarter of daily protein.","Fat comes mostly from avocado and oil."],
  "suggestions":["Add a slice of wholegrain bread for more energy."],"confidence":"medium"}
EST = {"items":[{"name":"Eggs fried in butter","grams":110,"nutrients":{"kcal":220,"prot":14,"fat":18,"carb":1}},
  {"name":"White bread roll","grams":43,"nutrients":{"kcal":125,"prot":4,"fat":1.5,"carb":24,"fib":1.2}}],"confidence":"medium","assumptions":"Two eggs, one regular roll."}
def rec(title, kcal):
    return {"title":title,"titleCs":"","summary":"Test recipe","servings":2,"time":{"totalMin":25},"difficulty":"easy",
      "ingredients":[{"item":"canned chickpeas","qty":240,"unit":"g","grams":240},{"item":"spinach","qty":100,"unit":"g"}],
      "steps":[{"text":"Warm the chickpeas."},{"text":"Add the spinach."}],"tips":["Tip"],"variations":[],"storage":{"fridgeDays":3,"freezer":False,"reheat":"pan"},
      "nutritionPerServing":{"kcal":kcal,"prot":20,"fat":10,"carb":40,"fib":12},"tags":["meal:lunch","diet:vegan","ing:chickpeas","prep:meal-prep"]}
RECS = {"recipes":[rec("Chickpea curry",520), rec("Chickpeas with spinach",480), rec("Roasted chickpeas",450)]}

def sse(events):
    return ''.join('event: ' + ev + '\ndata: ' + json.dumps(data) + '\n\n' for ev, data in events)
chat_round = {'n': 0}
def anthropic(route, request):
    url = request.url
    if '/v1/models' in url:
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({"data":[{"id":"claude-sonnet-5"},{"id":"claude-opus-5"},{"id":"claude-haiku-4-5"}]}))
    body = json.loads(request.post_data or '{}')
    usage = {"input_tokens": 1200, "output_tokens": 400}
    if body.get('stream'):
        chat_round['n'] += 1
        if chat_round['n'] % 2 == 1:
            evs = [('message_start', {"type":"message_start","message":{"model":body['model'],"usage":{"input_tokens":1500,"output_tokens":1}}}),
                   ('content_block_start', {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}),
                   ('content_block_delta', {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Noted: you have eggs and spinach. "}}),
                   ('content_block_stop', {"type":"content_block_stop","index":0}),
                   ('content_block_start', {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"tu_1","name":"update_pantry","input":{}}}),
                   ('content_block_delta', {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"have\": [\"eggs\", \"spinach\"], "}}),
                   ('content_block_delta', {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"\"ran_out\": [\"milk\"]}"}}),
                   ('content_block_stop', {"type":"content_block_stop","index":1}),
                   ('message_delta', {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":60}}),
                   ('message_stop', {"type":"message_stop"})]
        else:
            evs = [('message_start', {"type":"message_start","message":{"model":body['model'],"usage":{"input_tokens":1700,"output_tokens":1}}}),
                   ('content_block_start', {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}),
                   ('content_block_delta', {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"You can make a **spinach omelette**:\n- 3 eggs\n- a handful of spinach\n\n1. Beat the eggs.\n2. Wilt the spinach."}}),
                   ('content_block_stop', {"type":"content_block_stop","index":0}),
                   ('message_delta', {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":80}}),
                   ('message_stop', {"type":"message_stop"})]
        return route.fulfill(status=200, headers={'content-type':'text/event-stream'}, body=sse(evs))
    tools = body.get('tools') or []
    name = tools[0]['name'] if tools else None
    SEEN_SYSTEM.append(str(body.get('system', ''))[:4000])
    if name == 'report_food_evaluation': inp = EVAL
    elif name == 'report_meal_estimate': inp = EST
    elif name == 'propose_recipes': inp = RECS
    else:
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({"model":body['model'],"usage":usage,"stop_reason":"end_turn",
          "content":[{"type":"text","text":"## What went well\n- Protein on target.\n## What is missing\n- Vitamin D: add salmon twice a week."}]}))
    return route.fulfill(status=200, content_type='application/json', body=json.dumps({"model":body['model'],"usage":usage,"stop_reason":"tool_use",
      "content":[{"type":"tool_use","id":"tu_x","name":name,"input":inp}]}))
SEEN_SYSTEM = []

# Czech detector: letters only Czech uses, or Czech words with common accents.
STRONG = re.compile(r'[ěščřžůťďňĚŠČŘŽŮŤĎŇ]')
SOFT = re.compile(r'[áéíóúýÁÉÍÓÚÝ]')
CZ_PLAIN = {'porce','porci','snidane','obed','vecere','svacina','dnes','zpet','ulozit','zrusit','tyden','mesic','recept','recepty','suroviny','postup','bilkoviny','tuky','sacharidy','vlaknina','nastaveni','hledat','pridat','zapsat','denik','prehled','ano','ne','ks','lzice','lzicka','hrnek','nebo','jsou','neni','bez','pro','jak'}
ALLOW = {'Čeština', 'purée', 'sautéed', 'rosé', 'café', 'crème', 'Fumé', 'Sémillon', 'Rosé', 'jalapeño', 'piña', 'Piña', 'Gewürztraminer', 'Müller', 'crêpe', 'µg'}
DETECT_JS = """() => {
  const out = [];
  const vis = el => { const r = el.getClientRects(); if (!r.length) return false; const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none'; };
  out.push(document.body.innerText);
  document.querySelectorAll('[placeholder],[aria-label],[title],option').forEach(el => {
    if (!vis(el) && el.tagName !== 'OPTION') return;
    ['placeholder','aria-label','title'].forEach(a => { const v = el.getAttribute(a); if (v) out.push(v); });
    if (el.tagName === 'OPTION') out.push(el.textContent);
  });
  out.push(document.title);
  return out.join('\\n');
}"""
LEAKS = {}
def check(page, label):
    txt = page.evaluate(DETECT_JS)
    found = []
    for line in txt.split('\n'):
        for w in re.findall(r"[\wÀ-ž'-]+", line):
            if w in ALLOW: continue
            if STRONG.search(w) or SOFT.search(w):
                found.append((w, line.strip()[:90]))
    # Czech without accents: macro initials (B/T/S = bílkoviny, tuky, sacharidy) and common words
    for line in txt.split('\n'):
        if re.search(r'(^|· )B \d[\d,.]*( g)? · T \d|· S \d|· B \d[\d,.]* g\b', line): found.append(('B/T/S', line.strip()[:90]))
        for w in re.findall(r"[A-Za-z]+", line):
            if w.lower() in CZ_PLAIN: found.append((w, line.strip()[:90]))
    uniq = []
    for w, l in found:
        if (w, l) not in uniq: uniq.append((w, l))
    if uniq: LEAKS[label] = uniq
    return uniq

errors = []
def shot(page, name):
    page.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=False)
def step(page, name, wait=0):
    if wait: page.wait_for_timeout(wait)
    shot(page, name); check(page, name)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='en-GB', timezone_id='Europe/Prague')
    ctx.route('https://api.anthropic.com/**', anthropic)
    ctx.route('https://world.openfoodfacts.org/**', lambda route, req: route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body='{"status":0,"status_verbose":"product not found"}'))
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
    page.on('dialog', lambda d: d.accept())

    # first run: default language, no profile
    page.goto(BASE + '#today'); page.wait_for_timeout(1500)
    print('default language:', page.evaluate('S.lang'), '| html lang:', page.evaluate('document.documentElement.lang'))
    step(page, 'e00_first_run')
    page.click('#tabbar [data-go="log"]'); step(page, 'e01_log_empty', 600)
    page.click('#tabbar [data-go="recipes"]'); step(page, 'e02_recipes_noprofile', 1200)
    page.click('#tabbar [data-go="chat"]'); step(page, 'e03_chat_empty', 600)
    page.click('#tabbar [data-go="review"]'); step(page, 'e04_review_empty', 1000)
    page.evaluate("go('profile')"); step(page, 'e05_profile_blank', 600)
    page.evaluate("window.scrollTo(0, 1600)"); step(page, 'e05b_profile_blank_mid', 200)
    page.evaluate("window.scrollTo(0, 4000)"); step(page, 'e05c_profile_blank_end', 200)

    # a profile, the way a first save stores it (schema 1 path, migrated on load)
    page.evaluate("""async () => {
      await kvSet('profile', {sex:'male', age:'28', height:'182', weight:'76', direction:'maintain', activity:3, split:'protein', custom:{p:25,f:30,c:45},
        exclusions:[{id:'milk', label:'Milk', type:'allergy', syn:['milk','butter','cheese','cream','yogurt']}], cuisines:['it','jp'], cuisineFree:'',
        timeWeekday:2, timeWeekend:3, equipment:['hob','oven','blender'], budget:'bud3', savedAt: new Date().toISOString()});
      S.secrets.anthropic = 'sk-test'; await secretSet('anthropic','sk-test');
    }""")
    page.reload(); page.wait_for_timeout(1500)
    page.click('#tabbar [data-go="today"]'); page.wait_for_timeout(1000)
    step(page, 'e06_today')
    if page.locator('[data-act="why-range"]').count():
        page.locator('[data-act="why-range"]').first.click(); step(page, 'e07_why_range', 400); page.click('[data-sheet-close]'); page.wait_for_timeout(300)

    # add flows
    page.click('#fab'); step(page, 'e08_fab', 300)
    page.click('[data-fab="add"]'); page.wait_for_timeout(400)
    page.fill('#fq', 'chicken breast'); step(page, 'e09_search', 1500)
    page.locator('#fres .frow').first.click(); page.wait_for_timeout(400)
    page.fill('#amG', '150'); step(page, 'e10_amount', 200)
    page.click('#amSave'); page.wait_for_timeout(800)
    # other add tabs
    page.click('#fab'); page.wait_for_timeout(300); page.click('[data-fab="add"]'); page.wait_for_timeout(400)
    tabs = page.evaluate("Array.from(document.querySelectorAll('.sheet .seg button, .sheet [role=tab]')).map(b => b.textContent.trim())")
    print('add tabs:', tabs)
    def close_sheets():
        for _ in range(3):
            if page.locator('[data-sheet-close]').count():
                page.locator('[data-sheet-close]').first.click(); page.wait_for_timeout(300)
    close_sheets()
    for i in range(len(tabs)):
        page.click('#fab'); page.wait_for_timeout(300); page.click('[data-fab="add"]'); page.wait_for_timeout(400)
        page.locator('.sheet .seg button, .sheet [role=tab]').nth(i).click(); step(page, 'e11_add_tab_%d' % i, 600)
        close_sheets()
    # describe (mocked)
    page.click('#fab'); page.wait_for_timeout(300); page.click('[data-fab="describe"]'); page.wait_for_timeout(400)
    page.fill('#dq', 'two eggs fried in butter and a bread roll'); page.click('#dqGo'); step(page, 'e12_describe', 1400)
    page.click('#dqSave'); page.wait_for_timeout(800)
    # barcode (lookup mocked as not found)
    page.click('#fab'); page.wait_for_timeout(300); page.click('[data-fab="scan"]'); page.wait_for_timeout(600)
    page.fill('#scanCode', '5449000000996'); page.click('#scanGo'); step(page, 'e13_barcode_notfound', 1500)
    page.click('[data-sheet-close]'); page.wait_for_timeout(300)
    # photo (mocked)
    page.click('#fab'); page.wait_for_timeout(300); page.click('[data-fab="photo"]'); step(page, 'e14_photo_sheet', 400)
    page.set_input_files('#phFile', os.path.join(REPO, 'icon-512.png')); page.wait_for_timeout(800)
    page.click('#phGo'); step(page, 'e15_photo_result', 1500)
    page.click('#phLog'); page.wait_for_timeout(700)
    page.click('#tabbar [data-go="today"]'); step(page, 'e16_today_after', 1000)

    # supplements
    page.click('#tabbar [data-go="log"]'); page.wait_for_timeout(600)
    page.click('#s-log [data-act="supp-manage"]'); step(page, 'e17_supp_manager', 400)
    page.click('[data-preset="d2000"]'); step(page, 'e18_supp_form', 400)
    page.click('#sSave'); page.wait_for_timeout(700)
    page.click('#sNew'); step(page, 'e19_supp_new', 400)
    page.click('[data-sheet-close]'); page.wait_for_timeout(300)
    if page.locator('.sheet').count(): page.click('[data-sheet-close]'); page.wait_for_timeout(300)
    page.locator('#s-log [data-supp]').first.check(); step(page, 'e20_log', 600)
    page.locator('#s-log [data-act="edit-entry"]').first.click(); step(page, 'e21_edit_entry', 400)
    page.click('[data-sheet-close]'); page.wait_for_timeout(300)

    # recipes
    page.click('#tabbar [data-go="recipes"]'); step(page, 'e22_suggest', 1500)
    page.click('[data-act="rtab"][data-v="all"]'); step(page, 'e23_recipe_list', 600)
    if page.locator('[data-act="rtags"]').count():
        page.locator('[data-act="rtags"]').first.click(); step(page, 'e24_tags', 400); page.click('[data-sheet-close]'); page.wait_for_timeout(300)
    page.locator('#rtabBody .rcard').first.click(); step(page, 'e25_recipe', 600)
    page.evaluate("window.scrollTo(0, 900)"); step(page, 'e25b_recipe_scrolled', 200)
    page.evaluate("window.scrollTo(0, 3000)"); step(page, 'e25c_recipe_end', 200)
    if page.locator('[data-act="recipe-missing"]').count():
        page.click('[data-act="recipe-missing"]'); step(page, 'e26_missing', 500); page.click('[data-sheet-close]'); page.wait_for_timeout(300)
    page.click('[data-act="recipe-log"]'); step(page, 'e27_recipe_log', 400)
    page.click('#rl-save'); page.wait_for_timeout(700)
    page.click('#tabbar [data-go="recipes"]'); page.wait_for_timeout(800)
    page.click('[data-act="rtab"][data-v="suggest"]'); page.wait_for_timeout(1200)
    page.locator('#s-recipes [data-act="ai-recipes"]').first.click(); step(page, 'e28_ai_sheet', 400)
    page.click('#ai-go'); step(page, 'e29_ai_recipes', 1500)
    page.locator('[data-ai-save]').first.click(); page.wait_for_timeout(600)
    page.click('[data-sheet-close]'); page.wait_for_timeout(500)
    page.click('[data-act="rtab"][data-v="all"]'); page.wait_for_timeout(500)
    if page.locator('[data-act="recipe-new"]').count():
        page.locator('[data-act="recipe-new"]').first.click(); step(page, 'e30_own_recipe', 400); page.click('[data-sheet-close]'); page.wait_for_timeout(300)

    # chat and pantry
    page.click('#tabbar [data-go="chat"]'); page.wait_for_timeout(800)
    page.fill('#chatText', 'I have eggs and spinach at home, milk ran out. What can I cook?')
    page.click('#chatSend'); step(page, 'e31_chat', 2500)
    for act, name in [('pantry', 'e32_pantry'), ('shopping', 'e33_shopping')]:
        loc = page.locator('#s-chat [data-act="%s"]' % act)
        if loc.count(): loc.first.click(); step(page, name, 500); page.click('[data-sheet-close]'); page.wait_for_timeout(300)

    # review
    page.click('#tabbar [data-go="review"]'); step(page, 'e34_review', 1500)
    page.evaluate("window.scrollTo(0, 900)"); step(page, 'e34b_review_scrolled', 300)
    page.click('#rvAi'); step(page, 'e35_review_ai', 1500)
    page.evaluate("S.reviewMode = 'month'; renderScreen('review')"); step(page, 'e36_review_month', 1200)

    # settings and profile
    page.click('#btnSettings'); step(page, 'e37_settings', 800)
    for y, n in [(900, 'e37b'), (1800, 'e37c'), (2700, 'e37d'), (3600, 'e37e'), (6000, 'e37f')]:
        page.evaluate("window.scrollTo(0, %d)" % y); step(page, n + '_settings', 200)
    if page.locator('[data-act="diag-copy"]').count():
        page.locator('[data-act="diag-copy"]').first.click(); step(page, 'e38_diag', 600)
        if page.locator('.sheet').count(): page.click('[data-sheet-close]'); page.wait_for_timeout(300)
    page.evaluate("window.scrollTo(0, 0)"); page.wait_for_timeout(200)
    page.click('[data-act="go-profile"]'); step(page, 'e39_profile', 600)
    for y, n in [(1200, 'e39b'), (2400, 'e39c'), (3600, 'e39d'), (6000, 'e39e')]:
        page.evaluate("window.scrollTo(0, %d)" % y); step(page, n + '_profile', 200)

    # what Claude is told about language
    print('system prompts mention English:', sum(1 for s in SEEN_SYSTEM if 'English' in s), 'of', len(SEEN_SYSTEM),
          '| mention Czech:', sum(1 for s in SEEN_SYSTEM if 'Czech' in s))
    b.close()

print('\nLEFTOVER CZECH:', 'none' if not LEAKS else '%d of the checked views' % len(LEAKS))
seen = set()
for k, v in LEAKS.items():
    lines = []
    for w, l in v:
        if l not in seen: seen.add(l); lines.append(l)
    if lines:
        print(' ', k)
        for l in lines[:15]: print('      |', l)
        if len(lines) > 15: print('      ... and', len(lines) - 15, 'more lines')
print('\n'.join(errors) if errors else 'no page errors')
srv.shutdown()
