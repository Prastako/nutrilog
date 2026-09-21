#!/usr/bin/env python3
"""Prepare downloaded reels for extraction.
For each <id>.mp4 (+ .info.json, .jpg from yt-dlp) in RAW, writes into OUT/<id>/:
  bundle.json   caption, author, url, duration, date, transcript (with language)
  frames.jpg    one contact sheet of 8 frames (2 x 4), 1024 px wide, for reading on-screen text
  thumb.webp    320 px thumbnail for the app
Idempotent: skips reels that already have a bundle. Usage:
  python3 prepare.py RAW_DIR OUT_DIR [--model small]"""
import json, os, subprocess, sys, glob, time

def sh(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)

def duration(path):
    r = sh(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',path])
    try: return float(r.stdout.strip())
    except: return None

def contact_sheet(video, out, dur):
    n = 8
    tmp = out + '.d'; os.makedirs(tmp, exist_ok=True)
    for i in range(n):
        ts = max(0.2, (dur or 10) * (i + 0.5) / n)
        sh(['ffmpeg','-y','-loglevel','error','-ss',str(ts),'-i',video,'-frames:v','1','-vf','scale=256:-2',os.path.join(tmp,'f%02d.jpg'%i)])
    frames = sorted(glob.glob(os.path.join(tmp,'f*.jpg')))
    if frames:
        sh(['ffmpeg','-y','-loglevel','error','-pattern_type','glob','-i',os.path.join(tmp,'f*.jpg'),'-filter_complex','tile=4x2:padding=4:color=white','-q:v','4',out])
    for f in frames: os.remove(f)
    os.rmdir(tmp)

def main():
    raw, outdir = sys.argv[1], sys.argv[2]
    model_name = sys.argv[sys.argv.index('--model')+1] if '--model' in sys.argv else 'small'
    os.makedirs(outdir, exist_ok=True)
    model = None
    vids = sorted(glob.glob(os.path.join(raw, '*.mp4')))
    for v in vids:
        rid = os.path.splitext(os.path.basename(v))[0]
        od = os.path.join(outdir, rid)
        if os.path.exists(os.path.join(od, 'bundle.json')): continue
        os.makedirs(od, exist_ok=True)
        info = {}
        ip = os.path.join(raw, rid + '.info.json')
        if os.path.exists(ip): info = json.load(open(ip))
        dur = info.get('duration') or duration(v)
        if model is None:
            from faster_whisper import WhisperModel
            model = WhisperModel(model_name, device='cpu', compute_type='int8')
        t = time.time()
        try:
            segs, ti = model.transcribe(v, vad_filter=True, beam_size=1)
            transcript = ' '.join(s.text.strip() for s in segs)
            lang = ti.language
        except Exception as e:
            transcript, lang = '', None
        contact_sheet(v, os.path.join(od, 'frames.jpg'), dur)
        th = os.path.join(raw, rid + '.jpg')
        src = th if os.path.exists(th) else v
        sh(['ffmpeg','-y','-loglevel','error','-i',src,'-frames:v','1','-vf','scale=320:-2','-q:v','70',os.path.join(od,'thumb.webp')])
        bundle = {
            'id': rid, 'platform': 'instagram', 'shortcode': rid,
            'url': info.get('webpage_url') or ('https://www.instagram.com/reel/%s/' % rid),
            'author': info.get('channel') or info.get('uploader_id'), 'authorName': info.get('uploader'),
            'postedAt': (lambda d: d[:4]+'-'+d[4:6]+'-'+d[6:] if d else None)(info.get('upload_date')),
            'durationSec': round(dur, 1) if dur else None,
            'caption': info.get('description') or '',
            'transcript': transcript, 'transcriptLang': lang,
            'topComments': [c.get('text') for c in (info.get('comments') or [])[:15]],
            'preparedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        json.dump(bundle, open(os.path.join(od, 'bundle.json'), 'w'), ensure_ascii=False, indent=1)
        print(rid, 'ok', round(time.time()-t,1), 's', lang, len(transcript), 'chars', flush=True)

if __name__ == '__main__':
    main()
