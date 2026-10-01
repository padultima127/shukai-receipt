"""PDCレシート画像のOCR結果から、階ごとに「誰のスキルを使ったか」を取り出す（team.receiptCalls）。

使い方: python3 tools/receipt-calls.py <出力JSON>
  - OCR結果（scratchpad の ocr*.json、macOS Vision）のうち「Created by PDC」より下の行を読む
  - 行頭の「1f」「1F」「B1」「1.」などで階を区切る
  - 名前は編成のキャラ名（本体・武器）の一部と照らし合わせる。「裏」は武器、「表」は本体、どちらも書いていなければ auto
    （auto はサイト側で、スキルターン・スキブ・ヘイストから本体と武器のどちらを使ったか判定する）
  - 同じキャラが2体いる時は A/B、L/S/F の頭文字、または出てきた順で振り分ける
出力: { チームid: { 階: [ {mi: 枠の番号, part: "base"|"assist"|"auto", raw: 元の文字} ... ] } }
"""
import glob
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRATCH = Path("/private/tmp/claude-501/-Users-hm-Desktop-cloud/0eb1ef7d-c9ca-4c34-bba3-a2c311f021c1/scratchpad")
MONS = json.load(open(SCRATCH / "monster_list_full.json"))


def load_ocr():
    files = {}
    for f in glob.glob(str(SCRATCH / "ocr*.json")):
        d = json.load(open(f))
        if isinstance(d, dict):
            for k, v in d.items():
                files[os.path.basename(k)] = v
    return files


def load_teams():
    js = (ROOT / "data.js").read_text(encoding="utf-8")
    out = subprocess.run(
        ["node", "-e", "global.window={};eval(require('fs').readFileSync(process.argv[1],'utf8'));const s=window.PAD_SEED;const mon=new Map(s.monsters.map(m=>[m.id,m]));console.log(JSON.stringify(s.teams.map(t=>({id:t.id,source:t.source,members:t.members.map(m=>({role:m.role,no:mon.get(m.id)?.no,name:mon.get(m.id)?.name,assist:m.assist}))}))))", str(ROOT / "data.js")],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)


def lines_of(items):
    """OCRの断片を y で行にまとめる"""
    items = sorted(items, key=lambda w: (round(w["y"], 3), w["x"]))
    rows = []
    for w in items:
        if rows and abs(rows[-1]["y"] - w["y"]) < 0.006:
            rows[-1]["parts"].append(w)
        else:
            rows.append({"y": w["y"], "parts": [w]})
    return [" ".join(p["t"] for p in sorted(r["parts"], key=lambda w: w["x"])) for r in rows]


def keys_of(name):
    """キャラ名から照合用の短い名前（「・」「＆」の後ろ、【】を除いたもの）"""
    if not name:
        return []
    n = re.sub(r"【[^】]*】|\[[^\]]*\]|［[^］]*］|\([^)]*\)|（[^）]*）", "", name)
    parts = [p for p in re.split(r"[・＆&\s]", n) if p]
    keys = {n, parts[-1] if parts else n}
    for p in parts:
        if len(p) >= 2:
            keys.add(p)
    # 「日番谷冬獅郎」→「日番谷」のように頭3文字、「四ノ宮キコル」→「キコル」のようにカタカナの並び
    for k in list(keys):
        if len(k) >= 4 and not re.match(r"^[\u30A0-\u30FF]+$", k):
            keys.add(k[:3])
        for kata in re.findall(r"[\u30A0-\u30FFー]{2,}", k):
            keys.add(kata)
            # 長いカタカナ名は後ろの部分でも呼ばれる（アリナウィッシュミーメル → ミーメル）
            if len(kata) >= 6:
                for n in range(3, 6):
                    keys.add(kata[-n:])
    return [k for k in keys if len(k) >= 2]


FLOOR = re.compile(r"^[\s◆◇●■・•★☆【]*(?:B|b)?(\d{1,2})\s*(?:[fFＦ階]|\.|．|:)")


def parse_team(team, texts):
    idx = next((i for i, l in enumerate(texts) if "PDC" in l or "パズドラダメージ計算" in l), None)
    if idx is None:
        return None
    members = team["members"]
    mkeys = [keys_of(m["name"]) for m in members]
    akeys = [[k for k in keys_of(re.sub(r"\s*No\.?\s*\d+.*$", "", m.get("assist") or "")) if len(k) >= 3] for m in members]
    calls = {}
    floor = None
    seen_order = {}
    for line in texts[idx + 1:]:
        m = FLOOR.match(line)
        if m:
            floor = int(m.group(1))
            line = line[m.end():]
        if floor is None or floor > 30:
            continue
        # 区切り（→ など）がOCRで消えることがあるので、行の中からキャラ名の出てくる位置を探す
        found = []
        for i, ks in enumerate(mkeys):
            for k in ks:
                for mm in re.finditer(re.escape(k), line):
                    found.append((mm.start(), mm.end(), i, k))
        # 武器の名前（「タカミムスビ」「ネヴァン」など）は武器を使ったもの
        for i, ks in enumerate(akeys):
            for k in ks:
                for mm in re.finditer(re.escape(k), line):
                    found.append((mm.start(), mm.end(), i, "@" + k))
        # 1文字の名前（「功」など）は前後が区切りの時だけ
        for i, m1 in enumerate(members):
            last = re.sub(r"[^\u4E00-\u9FFF]", "", (m1["name"] or "")[-1:])
            if last and len(m1["name"] or "") >= 3:
                for mm in re.finditer(rf"(?:^|(?<=[→⇒>、,，\s(（]))({re.escape(last)})(?=$|[→⇒>、,，\s)）(（裏表])", line):
                    found.append((mm.start(1), mm.end(1), i, last))
        # 長い名前を優先して、重ならないものだけ残す
        found.sort(key=lambda f: (-(f[1] - f[0]), f[0]))
        taken, picked = [], []
        for st, en, i, k in found:
            if any(not (en <= a or st >= b) for a, b in taken):
                continue
            taken.append((st, en))
            picked.append((st, en, i, k))
        picked.sort()
        for st, en, i, k in picked:
            after = line[en:en + 3]
            before = line[max(0, st - 1):st]
            if "変身" in line[en:en + 3] or "進化" in line[en:en + 3]:
                continue
            part = "assist" if k.startswith("@") or re.match(r"\s*[（(]?裏", after) else "base" if re.match(r"\s*[（(]?表", after) else "auto"
            k = k.lstrip("@")
            same = [j for j, ks in enumerate(mkeys) if k in ks]
            mi = i
            if len(same) > 1:
                # L/S/F の頭文字、A/B の後ろ文字、どちらもなければ出てきた順
                if before.upper() in ("L", "S", "F"):
                    mi = next((j for j in same if members[j]["role"] == before.upper()), i)
                elif sm := re.match(r"([ABab①②])", after):
                    mi = same[min({"A": 0, "①": 0, "B": 1, "②": 1}.get(sm.group(1).upper(), 0), len(same) - 1)]
                else:
                    n = seen_order.get(k, 0)
                    mi = same[n % len(same)]
                    seen_order[k] = n + 1
            calls.setdefault(str(floor), []).append({"mi": mi, "part": part, "raw": line[max(0, st - 1):en + 2]})
    return calls or None


def main():
    ocr = load_ocr()
    result = {}
    stats = []
    for team in load_teams():
        m = re.search(r"status/(\d+)", team.get("source") or "")
        if not m:
            continue
        # 1つのツイートに2編成ある時（source に #ダンジョンid）は2枚目のレシート
        pdc = [t for k in sorted(ocr) if k.startswith(m.group(1)) for t in [lines_of(ocr[k])] if any("PDC" in l for l in t)]
        nth = 1 if "#" in team["source"] else 0
        if nth == 0 and len(pdc) > 1:
            # 立ち回りが書いてある画像（階の行が一番多いもの）
            pdc.sort(key=lambda t: -sum(1 for l in t if FLOOR.match(l)))
        texts = pdc[nth] if len(pdc) > nth else []
        if not texts:
            continue
        calls = parse_team(team, texts)
        if calls:
            result[team["id"]] = calls
            stats.append((team["id"], len(calls), sum(len(v) for v in calls.values())))
    Path(sys.argv[1]).write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(result)}編成: 階の数・呼び出し数")
    for s in stats[:200]:
        print(" ", *s)


if __name__ == "__main__":
    main()
