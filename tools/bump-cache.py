"""index.html のスクリプト・CSSの読み込みに、ファイルごとの更新番号（?v=中身のハッシュ）を付ける。
中身が変わったファイルだけ番号が変わるので、data.js だけ直した時に monsters-db.js（大きい）まで読み直させずに済む。
GitHub Pages はファイルを最大10分キャッシュするので、更新直後に古い版が使われないようにする目的もある。
使い方: 公開（git push）の前に python3 tools/bump-cache.py
"""
import hashlib
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
p = root / "index.html"
s = p.read_text(encoding="utf-8")
tags = {}


def tag(m):
    name = m.group(2)
    f = root / name
    h = hashlib.md5(f.read_bytes()).hexdigest()[:10] if f.exists() else "0"
    tags[name] = h
    return f'{m.group(1)}{name}?v={h}"'


s = re.sub(r'((?:src|href)=")([\w-]+\.(?:js|css))(?:\?v=[\w-]+)?"', tag, s)
# サイト全体の版番号（どれか1つでも変われば変わる）。開いているページが古い版か、app.js が version.json と比べる
# index.html の中身（番号と meta を除いたもの）も含める。画面の部品だけ直した時にも版番号が変わるように
markup = re.sub(r'\?v=[\w-]+|<meta name="app-version" content="[\w-]*">', "", s)
whole = hashlib.md5(("".join(f"{k}={v};" for k, v in sorted(tags.items())) + markup).encode()).hexdigest()[:12]
meta = f'<meta name="app-version" content="{whole}">'
if 'name="app-version"' in s:
    s = re.sub(r'<meta name="app-version" content="[\w-]*">', meta, s)
else:
    s = s.replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n  {meta}', 1)
p.write_text(s, encoding="utf-8")
(root / "version.json").write_text('{"v": "%s"}\n' % whole, encoding="utf-8")
print("cache version", whole, f"({len(tags)} files)")
