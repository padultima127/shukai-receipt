"""ツイートURLから本文・投稿者・投稿日・画像を取得する（編成登録の下準備用）。

使い方: python3 tools/fetch-tweets.py <出力フォルダ> URL [URL ...]
  - 画像は <出力フォルダ>/<ツイートID>_<n>.jpg に保存
  - data.js に登録済みのツイートは「登録済み」と表示してスキップ
X公式の埋め込み用エンドポイント（1件ずつ、人が貼ったURLのみ）を使う。検索や巡回はしない。
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    registered = (ROOT / "data.js").read_text(encoding="utf-8")
    for url in sys.argv[2:]:
        m = re.search(r"(?:x|twitter)\.com/([^/]+)/status/(\d+)", url)
        if not m:
            print(f"== スキップ（ツイートURLではない）: {url}\n")
            continue
        handle, tid = m.groups()
        if f"/status/{tid}" in registered:
            print(f"== 登録済み: {url}\n")
            continue
        try:
            d = json.loads(get(f"https://cdn.syndication.twimg.com/tweet-result?id={tid}&token=a"))
        except Exception as e:  # 削除・鍵垢など
            print(f"== 取得失敗: {url} ({e})\n")
            continue
        user = d.get("user", {})
        print(f"== {tid}")
        print(f"URL: https://x.com/{user.get('screen_name', handle)}/status/{tid}")
        print(f"作者: {user.get('name')} (@{user.get('screen_name', handle)})")
        print(f"日付: {d.get('created_at', '')[:10]}")
        print("本文:\n" + d.get("text", ""))
        for i, media in enumerate(d.get("mediaDetails", []), 1):
            path = out / f"{tid}_{i}.jpg"
            path.write_bytes(get(media["media_url_https"] + "?name=large"))
            print(f"画像{i}: {path}")
        print()


if __name__ == "__main__":
    main()
