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


def image_path(name):
    """原寸があればそれ、なければ以前取得した画像"""
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

    # 2. 文字のNo.の位置から（位置で取れなかったもの）
    for name, words in ocr.items():
        labels = labels_of(words)
        if len(labels) < 4:
            continue
        path = image_path(name)
        if not path:
            continue
        with Image.open(path) as im:
            W, H = im.size
        for l in labels:
            if l["no"] in wanted and (l["no"] not in best or best[l["no"]][3] != "pos"):
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
    (ROOT / "icons.js").write_text(
        "// PDCレシート画像から切り抜いたアイコン（tools/crop-icons.py）。icons.webp の何番目か\nwindow.PAD_ICONS = { cols: %d, tile: %d, rows: %d, index: %s };\n"
        % (COLS, TILE, rows, json.dumps({no: i for i, no in enumerate(nos)})),
        encoding="utf-8",
    )
    pos = sum(1 for v in best.values() if v[3] == "pos")
    print(f"切り抜き {len(best)}体（位置で {pos}・文字で {len(best) - pos}）／編成に出てくる {len(wanted)}体（なし {len(wanted - set(best))}体）")
    print("なし:", sorted(wanted - set(best)))


if __name__ == "__main__":
    main()
