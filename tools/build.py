#!/usr/bin/env python3
"""Build index.html from src/. Usage: python3 tools/build.py [version]"""
import pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src'
version = sys.argv[1] if len(sys.argv) > 1 else (src / 'VERSION').read_text().strip()
(src / 'VERSION').write_text(version + '\n')
css = (src/'fonts.css').read_text() + '\n' + (src/'base.css').read_text() + '\n' + (src/'app.css').read_text()
icons = (src/'icons.svg.part').read_text()
order = ['strings.js','core.js','foods.js','ai.js','ui.js','recipes.js','log.js','photo.js','chat.js','review.js','backup.js','settings.js','app.js']
js = '\n'.join('/* ---- ' + f + ' ---- */\n' + (src/f).read_text() for f in order)
html = (src/'shell.html').read_text()
for k, v in (('@@CSS@@', css), ('@@ICONS@@', icons), ('@@JS@@', js), ('@@VERSION@@', version)):
    html = html.replace(k, v)
(root/'index.html').write_text(html)
sw = (root/'sw.js').read_text()
sw = re.sub(r"const CACHE = '[^']*';", "const CACHE = 'nutrilog-shell-" + version + "';", sw)
(root/'sw.js').write_text(sw)
print('built index.html', len(html), 'bytes, version', version)
