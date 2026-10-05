"""index.html から公開（Artifact）用のページ artifact/index.html を作る。

公開環境は <html><head><body> を自動で付けるので、それらのタグを外して中身だけにする。
CSS・JSは同じ階層に一緒に公開する（style.css / app.js / data.js / monsters-db.js）。
使い方: python3 tools/build-artifact.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
title = re.search(r"<title>.*?</title>", html, re.S).group(0)
links = "\n".join(re.findall(r"<link [^>]*>", html))
body = re.search(r"<body>(.*)</body>", html, re.S).group(1).strip()
# claude.ai の公開ページでは外部SDKを読めないので Firebase 関連は外す（共有は claude の db を使う）
body = "\n".join(l for l in body.splitlines() if "firebase" not in l.lower() and "gstatic" not in l and "cloudflareinsights" not in l)
out = ROOT / "artifact" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(f"{title}\n{links}\n{body}\n", encoding="utf-8")
print(out)
