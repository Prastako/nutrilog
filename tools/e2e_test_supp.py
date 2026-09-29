#!/usr/bin/env python3
"""Checks for 0.2.4: supplement upper level warning, magnesium preset, Open Food Facts credit,
every-other-day supplement schedule. Phone size, English, network mocked.
Usage: python3 tools/e2e_test_supp.py <repo_dir> <shots_dir>"""
import json, os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
REPO, SHOTS = sys.argv[1], sys.argv[2]; os.makedirs(SHOTS, exist_ok=True)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=REPO); H.log_message = lambda *a: None
class Srv(socketserver.ThreadingTCPServer): allow_reuse_address = True
srv = Srv(('127.0.0.1', 8771), H); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:8771/'
PROD = {"code":"8594001021499","product_name":"Test yogurt","brands":"Testbrand","nutriments":{"energy-kcal_100g":62,"proteins_100g":4,"fat_100g":3,"carbohydrates_100g":4.5},"serving_quantity":150,"serving_size":"150 g"}
def off(route, req):
    body = {"status":1,"product":PROD} if '/api/v2/product/' in req.url else {"products":[PROD]}
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin':'*'}, body=json.dumps(body))
fails = []
def ok(c, m): print(('PASS ' if c else 'FAIL ') + m); (None if c else fails.append(m))
def open_add(page, mode=None):
    # opens the add sheet from the visible meal "+" of the current time slot
    slot = page.evaluate('guessSlot()')
    page.click('[data-act="add-food"][data-slot="%s"]:visible' % slot); page.wait_for_timeout(400)
    if mode:
        page.click('#addModes button[data-mode="%s"]' % mode); page.wait_for_timeout(400)
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='en-GB', timezone_id='Europe/Prague')
    ctx.route('https://world.openfoodfacts.org/**', off)
    ctx.route('https://api.anthropic.com/**', lambda r, q: r.abort())
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    shot = lambda n: page.screenshot(path=os.path.join(SHOTS, n + '.png'))
    page.goto(BASE + '#today'); page.wait_for_timeout(1500)
    page.evaluate("""async () => {
      await kvSet('profile', {sex:'male', age:'28', height:'182', weight:'76', direction:'maintain', activity:3, split:'balanced', custom:{p:25,f:30,c:45},
        exclusions:[], cuisines:[], cuisineFree:'', timeWeekday:2, timeWeekend:3, equipment:['hob'], budget:'bud3', savedAt: new Date().toISOString()});
      await recPut({type:'supplement', name:'Hořčík 300 mg', form:'tablet', unitLabel:'', perUnit:{mg:300}, extra:[], defaultUnits:1, schedule:{days:[0,1,2,3,4,5,6], time:'evening'}, active:true});
      await recPut({type:'supplement', name:'Vitamin D3 2000 IU', form:'capsule', unitLabel:'', perUnit:{vitd:50}, extra:[], defaultUnits:1, schedule:{days:[0,1,2,3,4,5,6], time:'morning'}, active:true});
    }""")
    page.reload(); page.wait_for_timeout(1500)
    page.click('#tabbar [data-go="log"]'); page.wait_for_timeout(800)
    txt = page.inner_text('#s-log')
    ok('Magnesium 300 mg' in txt, 'old magnesium supplement shows its English name')
    ok('add up to 300 mg of Magnesium' in txt and 'upper level from supplements is 250 mg' in txt, 'upper level warning for 300 mg magnesium')
    ok('Vitamin D' not in txt.split('upper level')[0][-200:] or txt.count('upper level') == 1, 'only one warning (vitamin D 50 µg is fine)')
    page.locator('#s-log .notice.warn').first.scroll_into_view_if_needed(); page.wait_for_timeout(300); shot('u1_log_supp_warning')
    page.click('#s-log [data-act="supp-manage"]'); page.wait_for_timeout(500)
    chips = page.evaluate("Array.from(document.querySelectorAll('.sheet [data-preset]')).map(b => b.textContent.trim())")
    ok('+ Magnesium 250 mg' in chips and not any('300' in c for c in chips), 'preset chips: ' + ', '.join(c for c in chips if 'agnes' in c))
    shot('u2_supp_manager'); page.click('[data-sheet-close]'); page.wait_for_timeout(300)
    # barcode found
    open_add(page, 'scan')
    page.fill('#scanCode', PROD['code']); page.click('#scanGo'); page.wait_for_timeout(1500)
    s = page.inner_text('.sheet')
    ok('Product data from Open Food Facts' in s and 'ODbL' in s, 'credit on barcode amount screen')
    ok(page.locator('.sheet a[href="https://world.openfoodfacts.org"]').count() >= 1, 'credit link on amount screen')
    shot('u3_barcode_amount_credit')
    for _ in range(3):
        if page.locator('[data-sheet-close]').count(): page.locator('[data-sheet-close]').first.click(); page.wait_for_timeout(300)
    # product search
    open_add(page)
    page.fill('#fq', 'yogurt'); page.wait_for_timeout(1200); page.click('#offBtn'); page.wait_for_timeout(1500)
    s = page.inner_text('.sheet')
    ok('Test yogurt' in s and 'Product data from Open Food Facts' in s, 'credit under product search results')
    shot('u4_search_credit')
    for _ in range(3):
        if page.locator('[data-sheet-close]').count(): page.locator('[data-sheet-close]').first.click(); page.wait_for_timeout(300)
    page.evaluate("go('settings'); openSettingsCat('about')"); page.wait_for_timeout(800)
    s = page.inner_text('body')
    ok('Product data' in s and 'Open Food Facts (openfoodfacts.org), ODbL' in s, 'About row in settings')
    if page.locator('text=Product data').count(): page.locator('text=Product data').first.scroll_into_view_if_needed()
    shot('u5_settings_about')
    # Czech mode spot check
    page.evaluate("async () => { S.lang='cs'; await savePrefs && savePrefs(); }"); page.evaluate("go('log')"); page.wait_for_timeout(800)
    txt = page.inner_text('#s-log')
    ok('Bezpečný horní limit EU' in txt, 'Czech warning text')
    shot('u6_log_czech')
    b.close()
# every-other-day schedule, fresh profile
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='en-GB', timezone_id='Europe/Prague')
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e))); page.on('dialog', lambda d: d.accept())
    shot = lambda n: page.screenshot(path=os.path.join(SHOTS, n + '.png'))
    page.goto(BASE + '#log'); page.wait_for_timeout(1500)
    page.evaluate("async () => { S.prefs.modules = {logging:true, goals:true, supplements:true, assistant:true}; await savePrefs(); location.hash = '#log'; }"); page.reload(); page.wait_for_timeout(1500)
    page.click('#s-log [data-act="supp-manage"]'); page.wait_for_timeout(400)
    page.click('[data-preset="fe"]'); page.wait_for_timeout(400)
    page.click('#srep [data-rep="alt"]'); page.wait_for_timeout(200)
    ok(page.is_visible('#sstart') and not page.is_visible('#sdays'), 'alt shows first-day field and hides weekdays')
    today = page.evaluate('localDateKey()')
    ok(page.input_value('#sstart') == today, 'first day defaults to today')
    page.locator('#sstart').scroll_into_view_if_needed(); shot('a1_form_alt')
    page.click('#sSave'); page.wait_for_timeout(700)
    rec = page.evaluate("(async () => (await recByType('supplement')).find(s => /Iron|Železo/.test(s.name)))()")
    ok(rec['schedule'].get('every') == 2 and rec['schedule'].get('start') == today and isinstance(rec['schedule'].get('days'), list), 'saved schedule ' + json.dumps(rec['schedule']))
    page.locator('.sheet [data-sedit]').first.click(); page.wait_for_timeout(500)
    ok(page.get_attribute('#srep [data-rep="alt"]', 'aria-pressed') == 'true' and page.is_visible('#sstart') and not page.is_visible('#sdays'), 'reopened sheet shows every other day')
    for _ in range(3):
        if page.locator('[data-sheet-close]').count(): page.locator('[data-sheet-close]').first.click(); page.wait_for_timeout(300)
    page.wait_for_timeout(500)
    has = lambda: 'Iron' in page.inner_text('#s-log')
    ok(has(), 'shows today (first day)')
    page.evaluate("go('log')"); page.wait_for_timeout(300)
    nxt = page.locator('#s-log button[aria-label]').all()
    tom = page.evaluate("addDays(localDateKey(), 1)"); d2 = page.evaluate("addDays(localDateKey(), 2)")
    ok(not page.evaluate(f"suppScheduledOn({json.dumps(rec)}, '{tom}')") and page.evaluate(f"suppScheduledOn({json.dumps(rec)}, '{d2}')"), 'not tomorrow, yes the day after')
    b.close()
ok(not errors, 'no page errors ' + '; '.join(errors[:3]))
print('RESULT:', 'all passed' if not fails else f'{len(fails)} failed')
sys.exit(1 if fails else 0)
