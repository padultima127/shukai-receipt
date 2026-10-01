"""登録済みの編成の出典ツイートから、画像を原寸（?name=orig）で取り直す（アイコンを高画質で切り抜くため）。

使い方: python3 tools/fetch-orig.py <出力フォルダ>
  - data.js の編成の source にある X のツイート（本人が貼ったもの）だけ。1件ずつ間をあけて取得する
  - 画像は <出力フォルダ>/<ツイートID>_<n>.jpg。取得済みのものは飛ばす
"""
import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    sources = json.loads(subprocess.run(
        ["node", "-e", "global.window={};eval(require('fs').readFileSync(process.argv[1],'utf8'));console.log(JSON.stringify(window.PAD_SEED.teams.map(t=>t.source||'')))", str(ROOT / "data.js")],
        capture_output=True, text=True, check=True).stdout)
    tids = sorted({m.group(1) for s in sources if (m := re.search(r"(?:x|twitter)\.com/[^/]+/status/(\d+)", s))})
    ok = fail = skip = 0
    for tid in tids:
        if list(out.glob(f"{tid}_*.jpg")):
            skip += 1
            continue
        try:
            d = json.loads(get(f"https://cdn.syndication.twimg.com/tweet-result?id={tid}&token=a"))
            for i, media in enumerate(d.get("mediaDetails", []), 1):
                (out / f"{tid}_{i}.jpg").write_bytes(get(media["media_url_https"] + "?name=orig"))
            ok += 1
        except Exception as e:  # 削除・鍵垢など
            print(f"取得失敗 {tid}: {e}")
            fail += 1
        time.sleep(1)
    print(f"ツイート {len(tids)}件: 取得 {ok} / 取得済み {skip} / 失敗 {fail}")


if __name__ == "__main__":
    main()
