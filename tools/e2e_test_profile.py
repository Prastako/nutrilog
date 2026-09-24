#!/usr/bin/env python3
"""Checks for 0.2.5: the profile preview under the macro split and the meal split
(calories, grams, g per kg, fat and protein warnings, live update, Czech).
Usage: python3 tools/e2e_test_profile.py <repo_dir> <shots_dir>"""
import os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
REPO, SHOTS = sys.argv[1], sys.argv[2]; os.makedirs(SHOTS, exist_ok=True)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=REPO); H.log_message = lambda *a: None
class Srv(socketserver.ThreadingTCPServer): allow_reuse_address = True
srv = Srv(('127.0.0.1', 8783), H); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
fails=[]; errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else fails.append(m))
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width':390,'height':844}, locale='en-GB', timezone_id='Europe/Prague')
    page = ctx.new_page(); page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto('http://127.0.0.1:8783/#today'); page.wait_for_timeout(1500)
    page.evaluate("S.draft=null; go('profile')"); page.wait_for_timeout(600)
    mp = lambda: page.inner_text('#macroPreviewBox'); sp = lambda: page.inner_text('#slotPreviewBox')
    ok(mp().strip()=='' and sp().strip()=='', 'blank profile: no preview')
    page.click('label.opt:has(input[name="person.sex"][value="male"])')
    page.fill('#f-age','28'); page.fill('#f-height','180'); page.fill('#f-weight','75'); page.wait_for_timeout(300)
    m1 = mp(); s1 = sp(); print(m1); print(s1)
    mid = page.evaluate("computeTargets(S.draft).mid")
    ok(str(mid) in m1.replace(',','') , 'macro preview shows mid kcal %s' % mid)
    ok('Breakfast' in s1 and 'Dinner' in s1, 'slot preview lists meals')
    page.fill('#f-weight','90'); page.wait_for_timeout(300)
    ok(mp()!=m1, 'preview updates while typing weight')
    page.click('label.opt:has(input[name="goals.macroSplit.preset"][value="lowcarb"])'); page.wait_for_timeout(400)
    ok('outside the EU reference range' in mp(), 'lowcarb shows fat warning')
    page.click('label.opt:has(input[name="goals.macroSplit.preset"][value="balanced"])'); page.wait_for_timeout(400)
    ok('outside the EU' not in mp(), 'balanced no fat warning')
    page.fill('#sl-snack','0'); page.wait_for_timeout(300)
    ok('Snack' not in sp(), 'snack 0 removed from slot list')
    # protein high: custom 40% protein, light person, gain
    page.click('label.opt:has(input[name="goals.macroSplit.preset"][value="custom"])'); page.wait_for_timeout(400)
    page.fill('#c-p','45'); page.fill('#c-f','25'); page.fill('#c-c','30'); page.fill('#f-weight','60'); page.click('label.opt:has(input[name="person.activityLevel"][value="4"])'); page.wait_for_timeout(300)
    print(mp())
    ok('more protein than most people can use' in mp(), 'high protein warning')
    page.locator('#macroPreviewBox').scroll_into_view_if_needed(); page.screenshot(path=SHOTS+'/p1_macro.png')
    page.locator('#slotPreviewBox').scroll_into_view_if_needed(); page.screenshot(path=SHOTS+'/p2_slots.png')
    page.evaluate("S.lang='cs'; S.draft && renderProfile()"); page.wait_for_timeout(400)
    print(mp()); ok('Při středu vašeho cíle' in mp() and 'g na kg' in mp(), 'Czech preview')
    ok(',' in mp().split('(')[1].split(' ')[0], 'Czech decimal comma in g per kg')
    page.locator('#macroPreviewBox').scroll_into_view_if_needed(); page.screenshot(path=SHOTS+'/p3_cs.png')
    b.close()
ok(not errs, 'no page errors %s' % errs)
print('RESULT', 'all passed' if not fails else fails)
