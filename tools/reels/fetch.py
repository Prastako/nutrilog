#!/usr/bin/env python3
"""Download Instagram reels for the archive with yt-dlp.

Accepts any text or JSON file that contains reel or post links (a pasted list,
the Instagram "Download your information" export of saved posts, a links
export from a browser extension). Every instagram.com/reel/<code> or /p/<code>
found in the files is collected, de-duplicated and downloaded once.

Writes, per reel, into RAW:
  <code>.mp4  <code>.info.json  <code>.jpg     (same layout as Reel Movement Atlas/originals)
Keeps RAW/fetch_log.json with ok / failed / skipped per code, so a run can be
resumed and failures retried later. Waits between downloads so Instagram is
not hammered.

Usage: python3 fetch.py RAW_DIR LINKS_FILE [LINKS_FILE ...] [--limit N] [--cookies cookies.txt]"""
import json, os, random, re, subprocess, sys, time

CODE = re.compile(r'instagram\.com/(?:[A-Za-z0-9_.]+/)?(?:reel|reels|p|tv)/([A-Za-z0-9_-]{5,})')

def collect(paths):
    codes = []
    for p in paths:
        txt = open(p, encoding='utf-8', errors='ignore').read()
        for m in CODE.finditer(txt):
            c = m.group(1)
            if c not in codes: codes.append(c)
        for line in txt.splitlines():            # bare shortcodes, one per line
            s = line.strip()
            if re.fullmatch(r'[A-Za-z0-9_-]{9,14}', s) and s not in codes: codes.append(s)
    return codes

def main():
    args = sys.argv[1:]
    limit = int(args[args.index('--limit')+1]) if '--limit' in args else None
    cookies = args[args.index('--cookies')+1] if '--cookies' in args else None
    files = [a for i, a in enumerate(args[1:], 1) if not a.startswith('--') and args[i-1] not in ('--limit', '--cookies')]
    raw = args[0]
    os.makedirs(raw, exist_ok=True)
    logp = os.path.join(raw, 'fetch_log.json')
    log = json.load(open(logp)) if os.path.exists(logp) else {}
    codes = collect(files)
    print(len(codes), 'links found', flush=True)
    done = 0
    for c in codes:
        if os.path.exists(os.path.join(raw, c + '.mp4')):
            log.setdefault(c, {'status': 'ok'}); continue
        if log.get(c, {}).get('status') == 'failed' and log[c].get('tries', 0) >= 3: continue
        if limit is not None and done >= limit: break
        cmd = ['yt-dlp', '-q', '--no-warnings', '--no-progress', '-o', os.path.join(raw, '%(id)s.%(ext)s'),
               '--write-info-json', '--write-thumbnail', '--convert-thumbnails', 'jpg',
               '-f', 'bv*[height<=1280]+ba/b', '--merge-output-format', 'mp4',
               'https://www.instagram.com/reel/%s/' % c]
        if cookies: cmd[1:1] = ['--cookies', cookies]
        r = subprocess.run(cmd, capture_output=True, text=True)
        ok = os.path.exists(os.path.join(raw, c + '.mp4'))
        prev = log.get(c, {})
        log[c] = {'status': 'ok' if ok else 'failed', 'tries': prev.get('tries', 0) + 1,
                  'error': None if ok else (r.stderr or r.stdout)[-400:], 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
        json.dump(log, open(logp, 'w'), indent=1)
        print(c, log[c]['status'], flush=True)
        done += 1
        if not ok and 'login' in (log[c]['error'] or '').lower():
            print('Instagram asks for a login; stopping so the account is not flagged.', flush=True)
            break
        time.sleep(random.uniform(4, 9))
    okn = sum(1 for v in log.values() if v.get('status') == 'ok')
    print('ok', okn, 'failed', sum(1 for v in log.values() if v.get('status') == 'failed'), flush=True)

if __name__ == '__main__':
    main()
