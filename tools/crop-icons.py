"""編成に出てくるキャラのアイコンを、投稿されたPDCレシート画像から切り抜く。
ガンホーの著作物ガイドラインでは、サイズ変更・切り取りをした画像の利用が認められている（権利表記はフッター）。

使い方: python3 tools/crop-icons.py
  1. 位置で切り抜く: 編成の出典ツイートのPDC画像（原寸、tools/fetch-orig.py で取得）で、
     「No.◯◯◯◯◯」の文字の位置から上の段（アシスト）・下の段（本体）の高さを決め、横6枠を編成の順に切り抜く。
     その枠の文字が別のNo.と読めた時（1桁違いは読み違いとみなす）は使わない
  2. 位置で取れなかったものは、文字の No. の位置から切り抜く（他の編成の画像も含めて探す）
  同じNo.は一番大きく切り抜けたものを使う
出力: icons/<図鑑No.>.webp（作業用）と、まとめた icons.webp・icons.js（window.PAD_ICONS）
"""
import glob
import hashlib
import json
import os
import re
import statistics
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SCRATCH = Path("/private/tmp/claude-501/-Users-hm-Desktop-cloud/0eb1ef7d-c9ca-4c34-bba3-a2c311f021c1/scratchpad")
OUT = ROOT / "icons"
TILE = 96
COLS = 24
LABEL = re.compile(r"N[oO0]\.?\s*(\d{3,5})")


def load_teams():
    out = subprocess.run(
        ["node", "-e", "global.window={};eval(require('fs').readFileSync(process.argv[1],'utf8'));const s=window.PAD_SEED;const mon=new Map(s.monsters.map(m=>[m.id,m]));console.log(JSON.stringify(s.teams.map(t=>({id:t.id,source:t.source||'',multi:!!t.multi,m:t.members.map(m=>[mon.get(m.id)?.no??null,Number(String(m.assist??'').match(/No\\.(\\d+)/)?.[1])||null])}))))", str(ROOT / "data.js")],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)


def load_ocr():
    """原寸画像のOCR（ocr_orig.json）を優先し、なければ以前の画像のOCR"""
    ocr = {}
    files = sorted(glob.glob(str(SCRATCH / "ocr*.json")), key=lambda f: 0 if f.endswith("ocr_orig.json") else 1)
    for f in files:
        d = json.load(open(f))
        if isinstance(d, dict):
            for k, v in d.items():
                if isinstance(v, list):
                    ocr.setdefault(os.path.basename(k), v)
    return ocr


# 管理者が置いたPDCのスクショ（アイコンがないキャラの補充用。git には入れない）。本人の置き場所はデスクトップの「PDCアイコン保管場所」
MANUAL = Path(os.environ.get("PAD_MANUAL_ICONS", Path.home() / "Desktop" / "PDCアイコン保管場所"))


def image_path(name):
    """原寸があればそれ、なければ以前取得した画像。管理者のスクショも"""
    if (MANUAL / name).exists():
        return MANUAL / name
    p = SCRATCH / "orig" / name
    if p.exists():
        return p
    hits = glob.glob(str(SCRATCH / "tw*" / name))
    return Path(hits[0]) if hits else None


def labels_of(words):
    out = []
    for w in words:
        m = LABEL.search(w.get("t", ""))
        if m:
            out.append({"no": int(m.group(1)), "x": w["x"], "y": w["y"], "b": w["y"] + w["h"]})
    return out


def rows_of(labels):
    """ラベルを高さでまとめて、上から [アシストの段, 本体の段] の下端を返す"""
    labels = sorted(labels, key=lambda l: l["b"])
    groups = []
    for l in labels:
        if groups and abs(groups[-1][-1]["b"] - l["b"]) < 0.02:
            groups[-1].append(l)
        else:
            groups.append([l])
    groups = [g for g in groups if len(g) >= 2]
    if len(groups) < 2:
        return None
    top, bottom = groups[0], groups[1]
    return statistics.median(l["b"] for l in top), statistics.median(l["b"] for l in bottom), top, bottom


def near(a, b):
    """1桁違い・桁落ち（OCRの読み違い）は同じとみなす"""
    sa, sb = str(a), str(b)
    if sa == sb or sa in sb or sb in sa:
        return True
    return len(sa) == len(sb) and sum(x != y for x, y in zip(sa, sb)) <= 1


def box_of(col, bottom_px, W):
    cell = W / 6
    top = bottom_px + cell * 0.04 - cell
    return (int(col * cell + cell * 0.03), int(top + cell * 0.03), int((col + 1) * cell - cell * 0.03), int(bottom_px + cell * 0.04 - cell * 0.03))


def main():
    teams = load_teams()
    ocr = load_ocr()
    wanted = {n for t in teams for pair in t["m"] for n in pair if n}
    best = {}  # No. -> (切り抜きの幅px, 画像, 範囲, 方法)

    def offer(no, path, box, how):
        size = box[2] - box[0]
        if box[1] < 0 or size < 40:
            return
        if no not in best or size > best[no][0] or (size == best[no][0] and how == "pos" and best[no][3] != "pos"):
            best[no] = (size, path, box, how)

    # 1. 位置で切り抜く（編成の順番が分かっているので、読み違えたNo.の枠も取れる）
    for t in teams:
        m = re.search(r"status/(\d+)", t["source"])
        if not m or t["multi"] or len(t["m"]) != 6:
            continue
        tid = m.group(1)
        pdc = []
        for name in sorted(n for n in ocr if n.startswith(tid + "_")):
            labels = labels_of(ocr[name])
            if len(labels) >= 4 and (rows := rows_of(labels)):
                pdc.append((name, rows))
        nth = 1 if "#" in t["source"] else 0
        if len(pdc) <= nth:
            continue
        name, (assist_b, base_b, top, bottom) = pdc[nth]
        path = image_path(name)
        if not path:
            continue
        with Image.open(path) as im:
            W, H = im.size
        for col, (base_no, assist_no) in enumerate(t["m"]):
            for no, row_b, row in ((base_no, base_b, bottom), (assist_no, assist_b, top)):
                if not no:
                    continue
                seen = [l["no"] for l in row if min(5, int(l["x"] * 6 + 0.02)) == col]
                if seen and not any(near(s, no) for s in seen):
                    continue  # その枠に別のキャラのNo.が書いてある（編成の順番がレシートと違う）
                offer(no, path, box_of(col, row_b * H, W), "pos")

    # 管理者のスクショ（manual-icons/）をOCRして、文字の No. の位置から切り抜く
    manual = sorted(p for p in MANUAL.glob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"))
    if manual:
        res = json.loads(subprocess.run(["swift", str(ROOT / "tools" / "ocr.swift"), *map(str, manual)], capture_output=True, text=True, check=True).stdout)
        for k, v in res.items():
            ocr[os.path.basename(k)] = v
        print(f"管理者のスクショ {len(manual)}枚")

    # 2. 文字のNo.の位置から（位置で取れなかったもの）
    for name, words in ocr.items():
        labels = labels_of(words)
        path = image_path(name)
        if len(labels) < (1 if path and path.parent == MANUAL else 4):
            continue
        if not path:
            continue
        with Image.open(path) as im:
            W, H = im.size
        for l in labels:
            # 管理者のスクショは編成にいないキャラ（承認済みの登録編成など）も受け付ける
            if (l["no"] in wanted or path.parent == MANUAL) and (l["no"] not in best or best[l["no"]][3] != "pos"):
                offer(l["no"], path, box_of(min(5, int(l["x"] * 6 + 0.02)), l["b"] * H, W), "label")

    OUT.mkdir(exist_ok=True)
    for f in OUT.glob("*.webp"):
        f.unlink()
    for no, (_, path, box, _) in best.items():
        with Image.open(path) as im:
            im.convert("RGB").crop(box).resize((128, 128), Image.LANCZOS).save(OUT / f"{no}.webp", "WEBP", quality=85)
    # 切り抜いた画像の中の「No.◯◯◯◯◯」をOCRして、別のキャラ（1桁違い以上）なら捨てる
    tmp = SCRATCH / "iconcheck"
    tmp.mkdir(exist_ok=True)
    for f in tmp.glob("*.png"):
        f.unlink()
    for no in best:
        with Image.open(OUT / f"{no}.webp") as im:
            im.resize((384, 384), Image.LANCZOS).save(tmp / f"{no}.png")
    res = json.loads(subprocess.run(["swift", str(ROOT / "tools" / "ocr.swift"), *map(str, sorted(tmp.glob("*.png")))], capture_output=True, text=True, check=True).stdout)
    dropped = []
    for k, words in res.items():
        no = int(Path(k).stem)
        found = [int(m.group(1)) for w in words if (m := LABEL.search(w.get("t", "")))]
        if found and not any(near(f, no) for f in found):
            dropped.append((no, found))
            del best[no]
            (OUT / f"{no}.webp").unlink()
    if dropped:
        print("別のキャラが写っていたので除外:", dropped)
    nos = sorted(best)
    rows = (len(nos) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * TILE, rows * TILE), (40, 40, 48))
    for i, no in enumerate(nos):
        with Image.open(OUT / f"{no}.webp") as im:
            sheet.paste(im.resize((TILE, TILE), Image.LANCZOS), ((i % COLS) * TILE, (i // COLS) * TILE))
    sheet.save(ROOT / "icons.webp", "WEBP", quality=82)
    # ver: 画像の中身から作る番号。画像が変わったらURLも変わるので、古い画像がキャッシュで使われない
    ver = hashlib.md5((ROOT / "icons.webp").read_bytes()).hexdigest()[:10]
    (ROOT / "icons.js").write_text(
        "// PDCレシート画像から切り抜いたアイコン（tools/crop-icons.py）。icons.webp の何番目か\nwindow.PAD_ICONS = { ver: %s, cols: %d, tile: %d, rows: %d, index: %s };\n"
        % (json.dumps(ver), COLS, TILE, rows, json.dumps({no: i for i, no in enumerate(nos)})),
        encoding="utf-8",
    )
    crop_badges(teams, ocr)
    pos = sum(1 for v in best.values() if v[3] == "pos")
    print(f"切り抜き {len(best)}体（位置で {pos}・文字で {len(best) - pos}）／編成に出てくる {len(wanted)}体（なし {len(wanted - set(best))}体）")
    print("なし:", sorted(wanted - set(best)))


BADGE_W, BADGE_H = 72, 52
LAT_W, LAT_H = 150, 50


def badge_box(region):
    """タイトルの左のバッジ（色の付いた横長の札）の範囲。QRコードや文字は白黒なので色の濃さで見分ける。
    色の付いた行のかたまりのうち一番下（編成のすぐ上）を高さとし、その中で左から続く列を幅とする"""
    w, h = region.size
    px = region.load()
    colored = lambda x, y: (lambda c: max(c) - min(c) > 45)(px[x, y][:3])
    lw = int(w * 0.65)
    rows = [sum(colored(x, y) for x in range(lw)) for y in range(h)]
    on = [r > lw * 0.15 for r in rows]
    y1 = max((y for y in range(h) if on[y]), default=None)
    if y1 is None:
        return None
    y0 = y1
    while y0 - 1 >= 0 and (on[y0 - 1] or (y0 - 2 >= 0 and on[y0 - 2])):
        y0 -= 1
    bh = y1 - y0 + 1
    cols = [sum(colored(x, y) for y in range(y0, y1 + 1)) for x in range(w)]
    xs = [x for x in range(w) if cols[x] > bh * 0.3]
    if not xs:
        return None
    x0 = xs[0]
    x1 = x0
    while x1 + 1 < w and cols[x1 + 1] > bh * 0.15:
        x1 += 1
    bw = x1 - x0 + 1
    if bw < w * 0.15 or bh < 8 or not (0.9 < bw / bh < 2.6):
        return None
    return (x0, y0, x1 + 1, y1 + 1)


def badge_box_old(region):
    """最初の版: 左から続く色付きの列で探す（バッジが大きく写っている画像に強い）"""
    w, h = region.size
    px = region.load()
    colored = lambda x, y: (lambda c: max(c) - min(c) > 45)(px[x, y][:3])
    cols = [sum(colored(x, y) for y in range(h)) for x in range(w)]
    xs = [x for x in range(w) if cols[x] > h * 0.25]
    if not xs:
        return None
    x0 = xs[0]
    x1 = x0
    while x1 + 1 < w and cols[x1 + 1] > h * 0.15:
        x1 += 1
    rows = [sum(colored(x, y) for x in range(x0, x1 + 1)) for y in range(h)]
    ys = [y for y in range(h) if rows[y] > (x1 - x0 + 1) * 0.25]
    if not ys:
        return None
    y0, y1 = ys[0], ys[-1]
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    if bw < w * 0.2 or bh < h * 0.2 or not (0.9 < bw / bh < 2.6):
        return None
    return (x0, y0, x1 + 1, y1 + 1)


def crop_badges(teams, ocr):
    """PDCで選んだバッジ（タイトルの左のアイコン）を編成ごとに切り抜いて badges.webp にまとめる"""
    found = {}
    latents = {}
    for t in teams:
        m = re.search(r"status/(\d+)", t["source"])
        if not m or t["multi"]:
            continue
        pdc = []
        for name in sorted(n for n in ocr if n.startswith(m.group(1) + "_")):
            labels = labels_of(ocr[name])
            if len(labels) >= 4 and (rows := rows_of(labels)):
                pdc.append((name, rows))
        nth = 1 if "#" in t["source"] else 0
        if len(pdc) <= nth:
            continue
        name, (assist_b, base_b, _, _) = pdc[nth]
        path = image_path(name)
        if not path:
            continue
        with Image.open(path) as im:
            im = im.convert("RGB")
            W, H = im.size
            cell = W / 6
            top = assist_b * H + cell * 0.04 - cell  # アシストの段の上端
            y0 = max(0, top - cell * 0.85)
            region = im.crop((0, int(y0), int(cell * 0.75), int(top)))
            box = badge_box(region) or badge_box_old(region)
            if box:
                found[t["id"]] = region.crop(box).resize((BADGE_W, BADGE_H), Image.LANCZOS)
            # 潜在覚醒（アシストの段と本体の段の間、各枠の下側）。最大8枠が2段で並ぶ
            base_top = base_b * H + cell * 0.04 - cell
            for col, (bno, _) in enumerate(t["m"]):
                if not bno:
                    continue
                strip = im.crop((int(col * cell + cell * 0.02), int(base_top - cell * 0.46), int((col + 1) * cell - cell * 0.02), int(base_top - cell * 0.01)))
                latents[f'{t["id"]}:{col}'] = strip.resize((LAT_W, LAT_H), Image.LANCZOS)
    ids = sorted(found)
    cols = 16
    rows = max(1, (len(ids) + cols - 1) // cols)
    sheet = Image.new("RGB", (cols * BADGE_W, rows * BADGE_H), (40, 40, 48))
    for i, tid in enumerate(ids):
        sheet.paste(found[tid], ((i % cols) * BADGE_W, (i // cols) * BADGE_H))
    sheet.save(ROOT / "badges.webp", "WEBP", quality=85)
    ver = hashlib.md5((ROOT / "badges.webp").read_bytes()).hexdigest()[:10]
    with open(ROOT / "icons.js", "a", encoding="utf-8") as f:
        f.write("// PDCで選んだバッジ（タイトルの左のアイコン）。badges.webp の何番目か（編成id）\nwindow.PAD_BADGES = { ver: %s, cols: %d, rows: %d, index: %s };\n"
                % (json.dumps(ver), cols, rows, json.dumps({tid: i for i, tid in enumerate(ids)}, ensure_ascii=False)))
    print(f"バッジ {len(ids)}編成")
    keys = sorted(latents)
    lcols = 12
    lrows = max(1, (len(keys) + lcols - 1) // lcols)
    sheet = Image.new("RGB", (lcols * LAT_W, lrows * LAT_H), (40, 40, 48))
    for i, k in enumerate(keys):
        sheet.paste(latents[k], ((i % lcols) * LAT_W, (i // lcols) * LAT_H))
    sheet.save(ROOT / "latents.webp", "WEBP", quality=80)
    ver = hashlib.md5((ROOT / "latents.webp").read_bytes()).hexdigest()[:10]
    with open(ROOT / "icons.js", "a", encoding="utf-8") as f:
        f.write("// PDCレシートの潜在覚醒の欄（編成id:枠）。latents.webp の何番目か\nwindow.PAD_LATENTS = { ver: %s, cols: %d, rows: %d, index: %s };\n"
                % (json.dumps(ver), lcols, lrows, json.dumps({k: i for i, k in enumerate(keys)}, ensure_ascii=False)))
    print(f"潜在 {len(keys)}枠")


if __name__ == "__main__":
    main()
