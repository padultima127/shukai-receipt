"""index.html のスクリプト・CSSの読み込みに更新番号（?v=…）を付ける。
GitHub Pages はファイルを最大10分キャッシュするので、更新直後に古い data.js などが使われないようにする。
使い方: 公開（git push）の前に python3 tools/bump-cache.py
"""
import re
import time
from pathlib import Path

p = Path(__file__).resolve().parent.parent / "index.html"
v = time.strftime("%Y%m%d%H%M%S")
s = p.read_text(encoding="utf-8")
s = re.sub(r'((?:src|href)="(?:[\w-]+)\.(?:js|css))(\?v=\d+)?"', rf'\1?v={v}"', s)
p.write_text(s, encoding="utf-8")
print("cache version", v)
