"""編成に出てくるキャラのアイコンを、投稿されたPDCレシート画像から切り抜く（本人の判断で、出典表記のうえ掲載）。

使い方: python3 tools/crop-icons.py
  - scratchpad の ocr*.json（tools/ocr.swift の結果）から「No12345」「LV99|No12345」の文字の位置を探す
  - PDCの編成は横6枠なので、文字のある列の枠（幅＝画像の幅/6）を、文字の下端を枠の下端として正方形で切り抜く
  - 図鑑No.が data.js の編成（本体・アシスト）に出てくるものだけ。同じNo.は一番大きい画像から1枚
出力: icons/<図鑑No.>.webp（96px、作業用）と、まとめた icons.webp・icons.js（window.PAD_ICONS）
"""
import glob
import json
import os
import re
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SCRATCH = Path("/private/tmp/claude-501/-Users-hm-Desktop-cloud/0eb1ef7d-c9ca-4c34-bba3-a2c311f021c1/scratchpad")
OUT = ROOT / "icons"
SIZE = 96
LABEL = re.compile(r"N[oO0]\.?\s*(\d{3,5})")


def team_numbers():
    out = subprocess.run(
        ["node", "-e", "global.window={};eval(require('fs').readFileSync(process.argv[1],'utf8'));const s=window.PAD_SEED;const mon=new Map(s.monsters.map(m=>[m.id,m]));const n=new Set();for(const t of s.teams)for(const m of t.members){const no=mon.get(m.id)?.no;if(no)n.add(no);const a=String(m.assist??'').match(/No\\.(\\d+)/);if(a)n.add(Number(a[1]))}console.log(JSON.stringify([...n]))", str(ROOT / "data.js")],
        capture_output=True, text=True, check=True,
    ).stdout
    return set(json.loads(out))


def image_paths():
    paths = {}
    for p in glob.glob(str(SCRATCH / "tw*" / "*.jpg")):
        paths.setdefault(os.path.basename(p), p)
    return paths


def main():
    wanted = team_numbers()
    paths = image_paths()
    best = {}  # No. -> (幅, 画像パス, 切り抜き範囲)
    for f in glob.glob(str(SCRATCH / "ocr*.json")):
        data = json.load(open(f))
        if not isinstance(data, dict):
            continue
        for name, words in data.items():
            path = paths.get(os.path.basename(name))
            if not path or not isinstance(words, list):
                continue
            labels = [w for w in words if LABEL.search(w.get("t", ""))]
            if len(labels) < 4:  # PDCの編成画像だけ（ラベルが並んでいるもの）
                continue
            with Image.open(path) as im:
                W, H = im.size
            cell = W / 6
            for w in labels:
                no = int(LABEL.search(w["t"]).group(1))
                if no not in wanted:
                    continue
                col = min(5, int(w["x"] * 6 + 0.02))
                bottom = (w["y"] + w["h"]) * H + cell * 0.04
                top = bottom - cell
                if top < 0:
                    continue
                box = (int(col * cell + cell * 0.03), int(top + cell * 0.03), int((col + 1) * cell - cell * 0.03), int(bottom - cell * 0.03))
                if no not in best or W > best[no][0]:
                    best[no] = (W, path, box)
    OUT.mkdir(exist_ok=True)
    for no, (_, path, box) in best.items():
        with Image.open(path) as im:
            im.convert("RGB").crop(box).resize((SIZE, SIZE), Image.LANCZOS).save(OUT / f"{no}.webp", "WEBP", quality=82)
    nos = sorted(int(p.stem) for p in OUT.glob("*.webp"))
    # 1枚にまとめる（ファイル数を減らす）。icons.js に図鑑No. → 何番目か
    cols = 24
    tile = 64
    rows = (len(nos) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tile, rows * tile), (40, 40, 48))
    for i, no in enumerate(nos):
        with Image.open(OUT / f"{no}.webp") as im:
            sheet.paste(im.resize((tile, tile), Image.LANCZOS), ((i % cols) * tile, (i // cols) * tile))
    sheet.save(ROOT / "icons.webp", "WEBP", quality=80)
    (ROOT / "icons.js").write_text(
        "// PDCレシート画像から切り抜いたアイコン（tools/crop-icons.py）。icons.webp の何番目か（横24枚・64px）\nwindow.PAD_ICONS = { cols: %d, tile: %d, rows: %d, index: %s };\n"
        % (cols, tile, rows, json.dumps({no: i for i, no in enumerate(nos)})),
        encoding="utf-8",
    )
    print(f"切り抜き {len(best)}体 / 編成に出てくる {len(wanted)}体（アイコンなし {len(wanted - set(nos))}体）")


if __name__ == "__main__":
    main()
