#!/usr/bin/env python3
"""End to end test of NutriLog at phone size, with Claude mocked.
1. v0.1 is served, a profile is saved the v0.1 way.
2. v0.2 is served on the same origin: the profile must migrate.
3. The main flows are clicked through and screenshots taken.
Usage: python3 tools/e2e_test.py <v01_dir> <v02_dir> <shots_dir>"""
import json, os, sys, threading, time, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

V01, V02, SHOTS = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(SHOTS, exist_ok=True)
ROOT = {'dir': V01}

class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split('?', 1)[0].split('#', 1)[0]
        rel = path.lstrip('/') or 'index.html'
        return os.path.join(ROOT['dir'], rel)
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

srv = socketserver.ThreadingTCPServer(('127.0.0.1', 8765), H)
srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:8765/'

EVAL = {"kind":"dish","name":"Kuřecí salát s avokádem","description":"Talíř se salátem, kuřecím masem, avokádem a rajčaty.","brand":None,
  "portionGrams":350,"servingLabel":"1 talíř","per100g":{"kcal":150,"prot":11,"fat":9,"carb":5,"fib":2.5},
  "perPortion":{"kcal":525,"prot":38,"fat":31,"carb":18,"fib":9},"nutritionBasis":"estimated_from_photo",
  "ingredientsSeen":["kuřecí maso","avokádo","rajčata","ledový salát","olivový olej"],"exclusionWarnings":[],
  "fitScore":4,"verdict":"Dobrá volba na oběd, hodně bílkovin.","reasons":["Pokryje asi čtvrtinu denních bílkovin.","Tuky jsou hlavně z avokáda a oleje."],
  "suggestions":["Přidejte krajíc celozrnného chleba pro víc energie."],"confidence":"medium"}
EST = {"items":[{"name":"Vejce smažená na másle","grams":110,"nutrients":{"kcal":220,"prot":14,"fat":18,"carb":1}},
  {"name":"Rohlík","grams":43,"nutrients":{"kcal":125,"prot":4,"fat":1.5,"carb":24,"fib":1.2}}],"confidence":"medium","assumptions":"Dvě vejce, jeden běžný rohlík."}
def rec(title, kcal):
    return {"title":title,"titleEn":title,"summary":"Test recipe","servings":2,"time":{"totalMin":25},"difficulty":"easy",
      "ingredients":[{"item":"cizrna z konzervy","qty":240,"unit":"g","grams":240},{"item":"špenát","qty":100,"unit":"g"}],
      "steps":[{"text":"Ohřejte cizrnu."},{"text":"Přidejte špenát."}],"tips":["Tip"],"variations":[],"storage":{"fridgeDays":3,"freezer":False,"reheat":"pánev"},
      "nutritionPerServing":{"kcal":kcal,"prot":20,"fat":10,"carb":40,"fib":12},"tags":["meal:lunch","diet:vegan","ing:chickpeas","prep:meal-prep"]}
RECS = {"recipes":[rec("Cizrnové kari",520), rec("Cizrna se špenátem",480), rec("Pečená cizrna",450)]}

def sse(events):
    out = ''
    for ev, data in events:
        out += 'event: ' + ev + '\ndata: ' + json.dumps(data) + '\n\n'
    return out

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
                   ('content_block_delta', {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Zapíšu si, že máte vejce a špenát. "}}),
                   ('content_block_stop', {"type":"content_block_stop","index":0}),
                   ('content_block_start', {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"tu_1","name":"update_pantry","input":{}}}),
                   ('content_block_delta', {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"have\": [\"vejce\", \"špenát\"], "}}),
                   ('content_block_delta', {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"\"ran_out\": [\"mléko\"]}"}}),
                   ('content_block_stop', {"type":"content_block_stop","index":1}),
                   ('message_delta', {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":60}}),
                   ('message_stop', {"type":"message_stop"})]
        else:
            evs = [('message_start', {"type":"message_start","message":{"model":body['model'],"usage":{"input_tokens":1700,"output_tokens":1}}}),
                   ('content_block_start', {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}),
                   ('content_block_delta', {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Z toho uděláte **omeletu se špenátem**:\n- 3 vejce\n- hrst špenátu\n\n1. Rozšlehejte vejce.\n2. Osmahněte špenát."}}),
                   ('content_block_stop', {"type":"content_block_stop","index":0}),
                   ('message_delta', {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":80}}),
                   ('message_stop', {"type":"message_stop"})]
        return route.fulfill(status=200, headers={'content-type':'text/event-stream'}, body=sse(evs))
    tools = body.get('tools') or []
    name = tools[0]['name'] if tools else None
    if name == 'report_food_evaluation': inp = EVAL
    elif name == 'report_meal_estimate': inp = EST
    elif name == 'propose_recipes': inp = RECS
    else:
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({"model":body['model'],"usage":usage,"stop_reason":"end_turn",
          "content":[{"type":"text","text":"## Co šlo dobře\n- Bílkoviny v cíli.\n## Co chybí\n- Vitamin D: přidejte lososa 2x týdně."}]}))
    return route.fulfill(status=200, content_type='application/json', body=json.dumps({"model":body['model'],"usage":usage,"stop_reason":"tool_use",
      "content":[{"type":"tool_use","id":"tu_x","name":name,"input":inp}]}))

errors = []
def shot(page, name):
    page.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=False)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='cs-CZ', timezone_id='Europe/Prague')
    ctx.route('https://api.anthropic.com/**', anthropic)
    import urllib.request
    def passthrough(route, request):
        # the test browser has no proxy; fetch real Open Food Facts data from Python instead
        try:
            with urllib.request.urlopen(urllib.request.Request(request.url, headers={'User-Agent':'NutriLog-test/0.2'}), timeout=20) as r:
                return route.fulfill(status=r.status, headers={'content-type': r.headers.get('content-type','application/json'), 'access-control-allow-origin':'*'}, body=r.read())
        except urllib.error.HTTPError as e:
            return route.fulfill(status=e.code, headers={'access-control-allow-origin':'*'}, body=e.read())
    ctx.route('https://world.openfoodfacts.org/**', passthrough)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)

    # --- v0.1: save a profile the old way
    page.goto(BASE + '#today')
    page.wait_for_timeout(800)
    page.evaluate("""async () => {
      await kvSet('profile', {sex:'male', age:'28', height:'182', weight:'76', direction:'maintain', activity:3, split:'protein', custom:{p:25,f:30,c:45},
        exclusions:[{id:'milk', label:'Mléko', type:'allergy', syn:['mléko','máslo','sýr','smetana','jogurt','tvaroh']}], cuisines:['it','jp'], cuisineFree:'',
        timeWeekday:2, timeWeekend:3, equipment:['hob','oven','blender'], budget:'bud3', savedAt: new Date().toISOString()});
      await dbPut('profileHistory', {savedAt: new Date().toISOString(), weight: 76, profile:{}});
    }""")
    page.reload(); page.wait_for_timeout(700)
    shot(page, '00_v01_today')

    # --- switch to v0.2 on the same origin
    ROOT['dir'] = V02
    page.evaluate("async () => { const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); }")
    page.goto(BASE + '#today'); page.wait_for_timeout(1500)
    page.reload(); page.wait_for_timeout(1500)
    shot(page, '01_today_migrated')
    prof = page.evaluate("async () => { const r = await recGet('profile'); return r; }")
    assert prof and prof['person']['weightKg'] == 76 and prof['food']['exclusions'][0]['label'] == 'Mléko', prof
    print('migration ok:', prof['person'], prof['goals']['macroSplit'])

    # --- add food by search
    page.click('#fab'); page.wait_for_timeout(300)
    page.click('[data-fab="add"]'); page.wait_for_timeout(400)
    page.fill('#fq', 'kuřecí prsa'); page.wait_for_timeout(1500)
    shot(page, '02_search')
    first = page.locator('#fres .frow').first
    print('first result:', first.inner_text().replace('\n', ' | '))
    first.click(); page.wait_for_timeout(400)
    page.fill('#amG', '150'); page.wait_for_timeout(200)
    shot(page, '03_amount')
    page.click('#amSave'); page.wait_for_timeout(800)

    # oats search in Czech
    page.click('#fab'); page.wait_for_timeout(300); page.click('[data-fab="add"]'); page.wait_for_timeout(300)
    page.fill('#fq', 'ovesné vločky'); page.wait_for_timeout(1200)
    print('oats result:', page.locator('#fres .frow').first.inner_text().replace('\n', ' | '))
    page.locator('#fres .frow').first.click(); page.wait_for_timeout(300); page.click('#amSave'); page.wait_for_timeout(600)

    # --- describe with Claude (mocked)
    page.evaluate("async () => { S.secrets.anthropic = 'sk-test'; await secretSet('anthropic','sk-test'); }")
    page.click('#fab'); page.wait_for_timeout(300); page.click('[data-fab="describe"]'); page.wait_for_timeout(400)
    page.fill('#dq', 'dvě vejce na másle a rohlík'); page.click('#dqGo'); page.wait_for_timeout(1200)
    shot(page, '04_describe')
    page.click('#dqSave'); page.wait_for_timeout(800)

    # --- barcode lookup through Open Food Facts (real network)
    page.click('#fab'); page.wait_for_timeout(300); page.click('[data-fab="scan"]'); page.wait_for_timeout(600)
    page.fill('#scanCode', '5449000000996'); page.click('#scanGo'); page.wait_for_timeout(6000)
    shot(page, '05_barcode')
    if page.locator('#amSave').count():
        page.fill('#amG', '330'); page.click('#amSave'); page.wait_for_timeout(800)
    else:
        print('barcode lookup did not reach amount step:', page.locator('#scanRes').inner_text()[:200])
        page.click('[data-sheet-close]'); page.wait_for_timeout(300)

    # --- today
    page.click('#tabbar [data-go="today"]'); page.wait_for_timeout(1000)
    shot(page, '06_today_after')

    # --- supplements
    page.click('#tabbar [data-go="log"]'); page.wait_for_timeout(600)
    page.click('#s-log [data-act="supp-manage"]'); page.wait_for_timeout(400)
    page.click('[data-preset="d2000"]'); page.wait_for_timeout(400)
    shot(page, '07_supp_form')
    page.click('#sSave'); page.wait_for_timeout(700)
    page.click('[data-sheet-close]'); page.wait_for_timeout(500)
    page.locator('#s-log [data-supp]').first.check(); page.wait_for_timeout(600)
    shot(page, '08_log')

    # --- recipes and suggestions
    page.click('#tabbar [data-go="recipes"]'); page.wait_for_timeout(1500)
    shot(page, '09_suggest')
    page.click('[data-act="rtab"][data-v="all"]'); page.wait_for_timeout(600)
    shot(page, '10_recipe_list')
    txt = page.locator('#rtabBody').inner_text()
    print('excluded shown in list:', 'obsahuje vyloučené' in txt)
    page.locator('#rtabBody .rcard').first.click(); page.wait_for_timeout(600)
    shot(page, '11_recipe')
    page.evaluate("window.scrollTo(0, 900)"); page.wait_for_timeout(200)
    shot(page, '11b_recipe_scrolled')
    page.click('[data-act="rserv"][data-d="1"]'); page.wait_for_timeout(300)
    page.click('[data-act="recipe-log"]'); page.wait_for_timeout(400)
    page.click('#rl-save'); page.wait_for_timeout(700)
    # Claude recipe ideas
    page.click('#tabbar [data-go="recipes"]'); page.wait_for_timeout(800)
    page.click('[data-act="rtab"][data-v="suggest"]'); page.wait_for_timeout(1200)
    page.locator('#s-recipes [data-act="ai-recipes"]').first.click(); page.wait_for_timeout(400)
    page.click('#ai-go'); page.wait_for_timeout(1500)
    shot(page, '12_ai_recipes')
    page.locator('[data-ai-save]').first.click(); page.wait_for_timeout(600)
    page.click('[data-sheet-close]'); page.wait_for_timeout(500)

    # --- photo (mocked)
    page.click('#tabbar [data-go="today"]'); page.wait_for_timeout(600)
    page.click('#fab'); page.wait_for_timeout(300); page.click('[data-fab="photo"]'); page.wait_for_timeout(400)
    page.set_input_files('#phFile', os.path.join(V02, 'icon-512.png')); page.wait_for_timeout(800)
    page.click('#phGo'); page.wait_for_timeout(1500)
    shot(page, '13_photo')
    page.click('#phLog'); page.wait_for_timeout(700)

    # --- chat (mocked streaming with a pantry tool call)
    page.click('#tabbar [data-go="chat"]'); page.wait_for_timeout(800)
    page.fill('#chatText', 'Mám doma vejce a špenát, došlo mléko. Co uvařím?')
    page.click('#chatSend'); page.wait_for_timeout(2500)
    shot(page, '14_chat')
    pantry = page.evaluate("async () => (await recByType('pantry_item')).map(p => p.name + ':' + p.have)")
    print('pantry after chat:', pantry)

    # --- review
    page.click('#tabbar [data-go="review"]'); page.wait_for_timeout(1500)
    shot(page, '15_review')
    page.evaluate("window.scrollTo(0, 800)"); page.wait_for_timeout(300)
    shot(page, '15b_review_scrolled')
    page.click('#rvAi'); page.wait_for_timeout(1500)
    shot(page, '16_review_ai')

    # --- profile and settings
    page.click('#btnSettings'); page.wait_for_timeout(800)
    shot(page, '17_settings')
    page.click('[data-act="go-profile"]'); page.wait_for_timeout(600)
    page.evaluate("window.scrollTo(0, 1500)"); page.wait_for_timeout(200)
    shot(page, '18_profile_goals')

    # --- export payload shape
    payload = page.evaluate("async () => { const p = await buildPayload(); return {schema: p.schema, types: [...new Set(p.data.records.map(r => r.type))], n: p.data.records.length, recipes: p.data.recipes.length}; }")
    print('payload:', payload)

    # --- back gesture closes sheets
    page.click('#tabbar [data-go="log"]'); page.wait_for_timeout(500)
    page.locator('#s-log [data-act="edit-entry"]').first.click(); page.wait_for_timeout(400)
    page.go_back(); page.wait_for_timeout(500)
    print('sheet closed by back:', page.locator('.sheetbg').count() == 0, 'screen:', page.evaluate('S.screen'))
    shot(page, '19_log_final')

    # --- dark mode and English
    page.emulate_media(color_scheme='dark')
    page.evaluate("async () => { S.lang = 'en'; await savePrefs(); applyLang(); }"); page.wait_for_timeout(600)
    page.click('#tabbar [data-go="today"]'); page.wait_for_timeout(800)
    shot(page, '20_today_dark_en')
    b.close()

print('\n'.join(errors) if errors else 'no page errors')
srv.shutdown()
