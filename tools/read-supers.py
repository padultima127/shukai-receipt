"""PDCレシート画像から、本体アイコン右上の「選んだ超覚醒」を読み取る（超覚醒は原則レシートから読む、本人指定）。

使い方: python3 tools/read-supers.py <出力JSON>
  - tools/crop-icons.py と同じ方法で本体の枠を決め、右上の覚醒アイコン部分を切り出す
  - そのキャラの超覚醒とシンクロ覚醒の画像（高画質覚醒スキル様の画像）をずらしながら見比べ、一番近いものにする
  - 一番近いのがシンクロ覚醒なら超覚醒は選んでいない → 0
出力: { 編成id: { 枠の番号: 覚醒No.（0＝超覚醒なし） } }。自信がないものは入れない
"""
import importlib.util
import os
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("ci", ROOT / "tools" / "crop-icons.py")
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)
AWK_DIR = ci.SCRATCH / "awk"
AWK_BASE = "https://yuunium.github.io/awokenskill/pic/"


def awk_names():
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    body = re.search(r"const AWK_IMG = \{(.*?)\};", js, re.S).group(1)
    return {int(k): v for k, v in re.findall(r"(\d+):\s*\"([\w]+)\"", body)}


def awk_icon(i, names):
    AWK_DIR.mkdir(exist_ok=True)
    p = AWK_DIR / f"{i}.png"
    if not p.exists():
        if i not in names:
            return None
        req = urllib.request.Request(AWK_BASE + names[i] + ".png", headers={"User-Agent": "Mozilla/5.0"})
        p.write_bytes(urllib.request.urlopen(req, timeout=20).read())
    with Image.open(p) as im:
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        return Image.alpha_composite(bg, im.convert("RGBA")).convert("RGB")


def monsters():
    rows = {}
    for line in (ROOT / "monsters-db.js").read_text(encoding="utf-8").splitlines():
        pass
    import subprocess
    out = subprocess.run(["node", "-e", "global.window={};require(process.argv[1]);const o={};for(const r of window.PAD_MONSTER_DB.rows)if(r[11])o[r[0]]=[String(r[11]).split('.').filter(Boolean).map(Number),r[26]||0];console.log(JSON.stringify(o))", str(ROOT / "monsters-db.js")], capture_output=True, text=True, check=True).stdout
    return {int(k): v for k, v in json.loads(out).items()}


def diff(a, b, size=28):
    a = a.resize((size, size), Image.LANCZOS)
    b = b.resize((size, size), Image.LANCZOS)
    st = ImageStat.Stat(ImageChops.difference(a, b))
    return sum(st.mean) / 3


def blue_frame(badge):
    """枠のあたりに青（選んだ超覚醒の印）があるか"""
    w, h = badge.size
    px = badge.load()
    blue = total = 0
    for x in range(w):
        for y in range(h):
            if min(x, y, w - 1 - x, h - 1 - y) > max(2, w // 12):
                continue
            r, g, b = px[x, y][:3]
            total += 1
            if b > 170 and r < 90 and b - g > 30:
                blue += 1
    return blue / max(1, total)


def main():
    names = awk_names()
    mons = monsters()
    teams = ci.load_teams()
    ocr = ci.load_ocr()
    out = {}
    stats = {"選択": 0, "なし": 0, "不明": 0}
    only = os.environ.get("ONLY")
    for t in teams:
        if only and t["id"] not in only.split(","):
            continue
        m = re.search(r"status/(\d+)", t["source"])
        if not m or t["multi"] or len(t["m"]) != 6:
            continue
        pdc = []
        for name in sorted(n for n in ocr if n.startswith(m.group(1) + "_")):
            labels = ci.labels_of(ocr[name])
            if len(labels) >= 4 and (rows := ci.rows_of(labels)):
                pdc.append((name, rows))
        nth = 1 if "#" in t["source"] else 0
        if len(pdc) <= nth:
            continue
        name, (_, base_b, _, bottom) = pdc[nth]
        path = ci.image_path(name)
        if not path:
            continue
        with Image.open(path) as im:
            im = im.convert("RGB")
            W, H = im.size
            for col, (base_no, _) in enumerate(t["m"]):
                cand = mons.get(base_no)
                if not cand:
                    continue
                supers, synchro = cand
                seen = [l["no"] for l in bottom if min(5, int(l["x"] * 6 + 0.02)) == col]
                if seen and not any(ci.near(s, base_no) for s in seen):
                    continue
                x0, y0, x1, y1 = ci.box_of(col, base_b * H, W)
                s = x1 - x0
                # 右上の覚醒アイコンのあたりを広めに切り出して、候補の画像をずらしながら一番合う位置を探す
                region = im.crop((int(x0 + s * 0.58), int(y0 + s * 0.18), int(x0 + s * 1.0), int(y0 + s * 0.74))).resize((84, 112), Image.LANCZOS)
                scores = []
                for i in set(supers) | ({synchro} if synchro else set()):
                    ic = awk_icon(i, names)
                    if ic is None:
                        continue
                    best_i = (999, None)
                    for size in (46, 50, 54):
                        tmpl = ic.resize((size, size), Image.LANCZOS)
                        for oy in range(0, 112 - size + 1, 3):
                            for ox in range(0, 84 - size + 1, 3):
                                win = region.crop((ox, oy, ox + size, oy + size))
                                st = ImageStat.Stat(ImageChops.difference(win, tmpl))
                                d = sum(st.mean) / 3
                                if d < best_i[0]:
                                    best_i = (d, (ox, oy, size))
                    scores.append((best_i[0], i, best_i[1]))
                scores.sort()
                if not scores:
                    continue
                ox, oy, size = scores[0][2]
                pad = max(3, size // 10)
                badge = region.crop((max(0, ox - pad), max(0, oy - pad), min(84, ox + size + pad), min(112, oy + size + pad)))
                best, second = scores[0], scores[1] if len(scores) > 1 else (99, None, None)
                key = str(col)
                # 一番合う候補が超覚醒ならそれを選んでいる、シンクロ覚醒なら超覚醒は選んでいない（青い枠は付かないこともあるので使わない）
                if best[0] < 65 and second[0] - best[0] >= 8:
                    if best[1] in supers and best[1] != synchro:
                        out.setdefault(t["id"], {})[key] = best[1]
                        stats["選択"] += 1
                    else:
                        out.setdefault(t["id"], {})[key] = 0
                        stats["なし"] += 1
                else:
                    stats["不明"] += 1
                if os.environ.get("DEBUG"):
                    print(t["id"], col, base_no, "青枠", round(blue_frame(badge), 3), [(round(a, 1), b) for a, b, _ in scores[:3]])
    Path(sys.argv[1]).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"編成 {len(out)}件: 超覚醒を読み取り {stats['選択']}枠・超覚醒なし {stats['なし']}枠・判定できず {stats['不明']}枠")


if __name__ == "__main__":
    main()
