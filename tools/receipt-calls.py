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
# OCR結果などの作業データ（一時フォルダは消えることがあるので .work/ に退避したもの）
SCRATCH = ROOT / ".work"


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
                for ln in range(3, 6):
                    keys.add(kata[-ln:])
                # 頭の部分でも呼ばれる（アマテラスオオカミ → アマテラス）
                for ln in range(4, 6):
                    keys.add(kata[:ln])
    # 漢字4文字の名前（服部平次・黒崎一護・坂田銀時）は名字だけ・名前だけでも呼ばれる
    for p in [p for p in re.split(r"[＆&\s]", n.split("・")[-1]) if p]:
        if re.fullmatch(r"[\u4E00-\u9FFF]{4}", p):
            keys.add(p[:2])
            keys.add(p[2:])
        # 5文字（四楓院夜一）は後ろ2文字の名前で呼ばれる
        elif re.fullmatch(r"[\u4E00-\u9FFF]{5}", p):
            keys.add(p[-2:])
            keys.add(p[-3:])  # 竈門炭治郎 → 炭治郎
    return [k for k in keys if len(k) >= 2]


# OCRの読み違いをならす（濁点・半濁点なし、小さい字 → 大きい字、X → メ）。1文字ずつの置き換えなので位置はずれない。
# 名前が1回も見つからないキャラだけに使う（全部に使うと「ダイン」が「バレンタイン」の中に当たるなど誤検出が増えるため）
_FOLD = str.maketrans(
    "ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポヴァィゥェォッャュョXxＸ",
    "カキクケコサシスセソタチツテトハヒフヘホハヒフヘホウアイウエオツヤユヨメメメ",
)


def fold(s):
    return (s or "").translate(_FOLD)


# 名前のすぐ後に「温存」「打たない」「不要」などが続くのは、スキルを使った記録ではない（「服部温存」「ダイン間違って打たない」）
MENTION = re.compile(
    r"^[\s①-⑩\dabAB裏表上下]*[はをがも]?[^\s、,，→⇒▶>（(]{0,6}?(温存|打たない|打たず|打たなく|使わない|使わず|使わなく|不要|いらない|切れたら|残り\d|は残す|(?:は|を)?(?:基本)?ループ)"
    # 「雨竜→9Fまで温存」
    r"|^\s*[→⇒]?\s*\d+\s*[FfＦ階]?まで(?:温存|打たない|使わない)"
)
# 「ミナカ891推奨」のように＋値を書いているだけ
PLUS_NOTE = re.compile(r"^\s*[+＋]?(297|891|99)\b")
# 以降のループ（「以降クラウディアループ」「イシス、日番谷、ダインはループ」）
LOOP = re.compile(r"ループ(?!.{0,2}(ズレ|ずれ))|以降.{0,12}(毎回|毎ターン)|毎ターン使う")


ASSIST_ALIAS = {"全ての鬼を滅するために作った刀": ["鋼塚"]}

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"
BRANCH = re.compile(r"^\s*(通常|乱入|[■●□○]|.{0,10}の(場合|とき|時)|[火水木光闇][アグリ色]?(の場合|なら))")
TURN_END = re.compile(r"盤面\s*\d+\s*[cCｃ]|[+＋]?\s*\d\s*[cCｃ](?!(?![xX]\s*\d)[a-zA-Z])|ずらし|[0０]\s*[cCｃ]|全力|[LＬ]字|十字|列")
FLOOR = re.compile(r"^[\s◆◇●■・•★☆【]*(?:B|b)?(\d{1,2})\s*(?:[fFＦ階]|\.|．|:|：|，|,|、(?!\d))")
# 「1テレシア裏・…」「3 ①L」のように数字のすぐ後に名前や①が続く行も階（数字の後が数字・個・c・%・ターンなどの時は除く）
FLOOR_LOOSE = re.compile(r"^\s*(\d{1,2})(?=\s*[①-⑳]|[^\d\s個cCｃ%％ターン秒倍枠体回日時分月年万億つ件人ヶ箇kKmM.．,，、:：x×])")


def parse_team(team, texts):
    idx = next((i for i, l in enumerate(texts) if "PDC" in l or "パズドラダメージ計算" in l), None)
    if idx is None:
        # 立ち回りだけを別の画像に書いている場合（PDCの文字がない）: 階の行が4つ以上あれば最初から読む
        if sum(1 for l in texts if FLOOR.match(l)) < 4:
            return None
        idx = -1
    members = team["members"]
    mkeys = [keys_of(m["name"]) for m in members]
    # 「日向＆影山」「キコル8号」のように2人組の名前は、続けて書いた形でも呼ばれる
    for i, m in enumerate(members):
        n = re.sub(r"【[^】]*】|\[[^\]]*\]|［[^］]*］", "", m["name"] or "").split("・")[-1]
        if "＆" in n or "&" in n:
            a, b = re.split(r"[＆&]", n, maxsplit=1)
            a, b = a.split()[0] if a.split() else a, b.split()[0] if b.split() else b
            mkeys[i] += [f"{a}＆{b}", f"{a}&{b}", f"{a}{b}"]
            # 漢字の頭1文字ずつの略し方（日向＆影山 → 日影）
            if re.match(r"[\u4E00-\u9FFF]", a) and re.match(r"[\u4E00-\u9FFF]", b):
                mkeys[i].append(a[0] + b[0])
            # カタカナの頭2文字ずつの略し方（メニット＆チャオリン → メニチャオ）
            if re.match(r"[\u30A0-\u30FF]{3}", a) and re.match(r"[\u30A0-\u30FF]{3}", b):
                mkeys[i] += [a[:x] + b[:y] for x in (2, 3) for y in (2, 3)]  # フリーレン＆フェルン → フリフェル
    akeys = [[k for k in keys_of(re.sub(r"\s*No\.?\s*\d+.*$", "", m.get("assist") or "")) if len(k) >= 3] for m in members]
    # 名前に出てこない呼び方で呼ばれる武器（「全ての鬼を滅するために作った刀」→ 作った人の名前で「鋼塚」）
    for i, m in enumerate(members):
        for full, alias in ASSIST_ALIAS.items():
            if full in (m.get("assist") or ""):
                akeys[i] += alias
    body = "\n".join(texts[idx + 1:])
    # 1回も名前が見つからないキャラは、OCRの読み違いをならした文字で探す
    fold_members = {i for i, ks in enumerate(mkeys) if ks and not any(k in body for k in ks)}
    fkeys = {i: sorted({fold(k) for k in mkeys[i]}) for i in fold_members}
    # それでも見つからないキャラは消去法: レシートに出てくる「誰にも当たらない呼び方」のうち、
    # そのキャラの名前の文字を順番どおりに拾ってできるもの（メニット＆チャオリン → メニチャオ）をそのキャラの呼び方にする
    still = [i for i in fold_members if not any(k in fold(body) for k in fkeys[i])]
    if still:
        allkeys = [k for ks in mkeys for k in ks] + [k for ks in akeys for k in ks]
        toks = set()
        for tok in re.split(r"[、,，→⇒▶>\s・。()（）「」【】:：/／+＋※＊*]+", body):
            tok = re.sub(r"^[LFＬＦ①-⑩]+", "", tok)
            tok = re.sub(r"(裏|表|上|下|変身|進化|[①-⑩\dａ-ｚabAB])+$", "", tok)
            if re.fullmatch(r"[\u30A0-\u30FFー]{3,7}|[\u4E00-\u9FFF]{2,4}", tok) and not any(k in tok or tok in k for k in allkeys):
                toks.add(tok)

        def spells(tok, name):
            # 名前のどこかの区切り（・＆の後ろ、先頭）から始まって、トークンの文字が順番どおりに出てくる
            n = re.sub(r"【[^】]*】", "", name or "")
            starts = [0] + [mm.end() for mm in re.finditer(r"[・＆&\s]", n)]
            for st0 in starts:
                if not n[st0:].startswith(tok[0]):
                    continue
                pos = st0
                for ch in tok:
                    pos = n.find(ch, pos)
                    if pos < 0:
                        break
                    pos += 1
                else:
                    return True
            return False

        for tok in toks:
            cand = [i for i in still if spells(tok, members[i]["name"])]
            if len(cand) == 1:
                mkeys[cand[0]] = mkeys[cand[0]] + [tok]
                if os.environ.get("ELIM_DEBUG"): print("ELIM", team["id"], tok, "->", members[cand[0]]["name"], file=sys.stderr)
                fkeys[cand[0]] = sorted(set(fkeys[cand[0]]) | {fold(tok)})
    loops = []
    prev_tail = ""
    calls = {}
    floor = None
    seen_order = {}
    turn_base = 0  # その階で、この行より前に終わったターンの数（盤面◯c・ずらし・①②などで区切る）
    loose = sum(1 for l in texts[idx + 1:] if FLOOR_LOOSE.match(l)) >= 4 and sum(1 for l in texts[idx + 1:] if FLOOR.match(l)) < 4
    body = texts[idx + 1:]
    for li, line in enumerate(body):
        next_line = body[li + 1] if li + 1 < len(body) else ""
        tail, prev_tail = prev_tail, line.rstrip()[-6:]
        m = FLOOR.match(line) or (FLOOR_LOOSE.match(line) if loose else None)
        if m:
            floor = int(m.group(1))
            line = line[m.end():]
            turn_base = 0
        # 「通常」「乱入」「■の場合」などの分岐は、どちらか一方なので同じ階の最初のターンから数え直す
        if BRANCH.match(line):
            turn_base = 0
        # ターンの区切り: パズル（盤面4c・+1c・ずらし・0c）でそのターンが終わる。①②…はそのターン番号
        ends = []
        for mm in TURN_END.finditer(line):
            # 「1Cx3」「0c×2」は3ターン・2ターン
            rep = re.match(r"\s*[xX×]\s*(\d)", line[mm.end():])
            ends += [mm.end()] * (int(rep.group(1)) if rep else 1)
        marks = [(mm.start(), CIRCLED.index(mm.group(0))) for mm in re.finditer("[" + CIRCLED + "]", line)]
        if floor is None or floor > 30:
            continue
        # 「※盤面あればダイアモス不要」などの注意書きはスキルを使った記録ではない
        if line.lstrip().startswith(("※", "＊", "*")) and re.search(r"不要|いらない|なしでも|省略", line):
            continue
        # ループの記載は別に取っておく（どの階から・誰が）。階ごとの記録には足さない
        lm = LOOP.search(line)
        if lm and floor is not None:
            # ループする人は、同じ文（。→▶ で区切る）の中で「ループ」より前に書かれた名前だけ
            clause = re.split(r"[。→⇒▶]", line[:lm.start()])[-1]
            hits = {i: {k for k in ks if k in clause} for i, ks in enumerate(mkeys)}
            hits = {i: h for i, h in hits.items() if h}
            def dominated(i):
                # 同じ呼び方で、ほかのキャラの方がより多く当たっている（「ミヤ神楽」→神楽＆ミヤ衣装）。同じなら単体の名前を残す
                for j, h in hits.items():
                    if members[j]["no"] == members[i]["no"]:
                        continue
                    if hits[i] < h:
                        return True
                    if hits[i] == h and ("＆" in (members[i]["name"] or "")) and "＆" not in (members[j]["name"] or ""):
                        return True
                return False
            who = sorted(i for i in hits if not dominated(i))
            if who:
                loops.append({"from": floor, "mi": who, "raw": line.strip()[:80]})
        # 区切り（→ など）がOCRで消えることがあるので、行の中からキャラ名の出てくる位置を探す
        found = []
        # 行の折り返しで名前が切れることがある（「…アマテ」「ラス、…」）ので、前の行の末尾をつなげて探す
        if m:
            tail = ""
        line = tail + line
        cut = len(tail)
        for i, ks in fkeys.items():
            fl = fold(line)
            for k in ks:
                for mm in re.finditer(re.escape(k), fl):
                    found.append((mm.start(), mm.end(), i, mkeys[i][0] if mkeys[i] else k))
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
                for mm in re.finditer(rf"(?:^|(?<=[→⇒>、,，\s(（①-⑩]))({re.escape(last)})(?=$|[→⇒>、,，\s)）(（裏表上下①-⑩])", line[cut:]):
                    found.append((mm.start(1) + cut, mm.end(1) + cut, i, last))
        # 長い名前を優先して、重ならないものだけ残す
        found.sort(key=lambda f: (-(f[1] - f[0]), f[0]))
        taken, picked = [], []
        for st, en, i, k in found:
            if any(not (en <= a or st >= b) for a, b in taken):
                continue
            taken.append((st, en))
            picked.append((st, en, i, k))
        picked.sort()
        # 「一護＆織姫」「一護織姫」のように同じキャラの名前が続けて当たった時は1回に数える
        # （前の行の末尾の名前ともつなげてから見る: 「…義勇炭治」「郎（裏）」は前の行で数えた義勇炭治郎の続き）
        merged = []
        for p in picked:
            if merged and merged[-1][2] == p[2] and not p[3].startswith("@") and not merged[-1][3].startswith("@") and re.fullmatch(r"[＆&・]?|[\u4E00-\u9FFF]", line[merged[-1][1]:p[0]]):
                merged[-1] = (merged[-1][0], p[1], p[2], merged[-1][3], merged[-1][4])
                continue
            merged.append((*p, p[1] <= cut))
        # 前の行の末尾で始まって、前の行ですでに数えた名前（の続き）は数えない
        picked = [p[:4] for p in merged if p[1] > cut and not p[4]]
        for st, en, i, k in picked:
            # 「服部温存」「ダイン間違って打たない」「ミナカ891推奨」は使った記録ではない
            if MENTION.match(line[en:en + 14]) or PLUS_NOTE.match(line[en:en + 6]):
                continue
            after = line[en:en + 3]
            # 行の折り返しで「一護織姫」「（裏）、日番谷…」のように裏が次の行の頭に来ることがある
            if not line[en:].strip(" 　、,，") and next_line:
                after = next_line.lstrip()[:3]
            before = line[max(0, st - 1):st]
            # 「ダイン変身」「クチナ（変身）」は変身スキルを押したもの（本体）。「変身後」「進化後」はただの説明なので数えない
            if re.match(r"\s*[（(]?(変身|進化)後", after):
                continue
            transform = bool(re.match(r"\s*[（(]?(変身|進化)", after))
            # PDCではアシストが上・本体が下に並ぶので「ヘラ上」は武器、「ヘラ下」は本体（まつりーたさんのレシートなど）
            part = ("assist" if k.startswith("@") or re.match(r"\s*[（(]?(裏|上)(?![か手])", after)
                    else "base" if transform or re.match(r"\s*[（(]?(表|下)(?![か手])", after) else "auto")
            k = k.lstrip("@")
            same = [j for j, ks in enumerate(mkeys) if k in ks]
            # 同じ呼び方が別のキャラにもある時（「神楽」＝万事屋・神楽と神楽＆ミヤ衣装）は、前後の文字に
            # そのキャラのほかの呼び方（「ミヤ」など）が出てくる方。どちらでもなければ2人組でない方（単体の名前）
            nos = {members[j]["no"] for j in same}
            if len(nos) > 1:
                def score(j):
                    nm = members[j]["name"] or ""
                    # すぐ前・すぐ後ろに、そのキャラのほかの呼び方がくっついているか（「ミヤ神楽」「キコル8号」）
                    other = sum(1 for kk in mkeys[j] if kk != k and k not in kk and (line[en:].startswith(kk) or line[:st].endswith(kk)))
                    halves = re.split(r"[＆&]", re.sub(r"【[^】]*】", "", nm).split("・")[-1])
                    if len(halves) > 1:
                        partner = next((h for h in halves if k not in h), "")
                        if any(partner[a:a + 2] and line[en:en + 2] == partner[a:a + 2] for a in range(len(partner) - 1)):
                            other += 1
                    combo = "＆" in nm or "&" in nm
                    # 呼び方が名前の最後の部分そのもの（「ハーデス」＝冥界の超越神・ハーデス）なら、そのキャラ
                    exact = re.sub(r"【[^】]*】", "", nm).split("・")[-1] == k
                    return (other, 0 if combo else 1, 1 if exact else 0)
                best = max(score(j) for j in same)
                same = [j for j in same if score(j) == best]
                # 残りが別々のキャラなら、最初のキャラ（と同じキャラの2体目以降）だけにする
                same = [j for j in same if members[j]["no"] == members[same[0]]["no"]]
                i = same[0]
            mi = i
            why = None
            both = []
            if len(same) > 1:
                # L/S/F の頭文字、A/B の後ろ文字、どちらもなければ出てきた順
                # 「LF童磨変身」はリーダーとフレンドの両方
                if re.search(r"(?:^|[^0-9０-９A-Za-zＡ-Ｚ])(?:LF|FL|L[・&＆]F|F[・&＆]L)$", line[max(cut, st - 4):st]):
                    both = [j for j in same if members[j]["role"] in ("L", "F")]
                    mi = both[0] if both else i
                elif before.upper() in ("L", "S", "F"):
                    mi = next((j for j in same if members[j]["role"] == before.upper()), i)
                elif before in ("左", "右"):
                    # 「左銀時」「右銀時」: パーティーの並びの左・右
                    mi = same[0] if before == "左" else same[-1]
                    why = "lr"
                elif sm := re.match(r"([ABab①②])|\s([ABab])(?![a-zA-Z])|([12１２])(?![cCｃ×xX0-9体段コ])", line[en:en + 4]):
                    g = (sm.group(1) or sm.group(2) or sm.group(3)).upper()
                    mi = same[min({"A": 0, "①": 0, "1": 0, "１": 0, "B": 1, "②": 1, "2": 1, "２": 1}.get(g, 0), len(same) - 1)]
                    why = "num"
                else:
                    n = seen_order.get(k, 0)
                    mi = same[n % len(same)]
                    seen_order[k] = n + 1
                    # 同じキャラが2体いて、その階で片方だけ武器（裏）を先に使っている時は、本体の呼び出しはその子
                    # （タカミムスビ（Fキコルの武器）→…→キコル→ネヴァン（Sキコルの武器） の「キコル」は Fキコル）
                    if part != "assist":
                        fc = calls.get(str(floor), [])
                        last = {c["mi"]: c["part"] for c in fc}
                        pending = [j for j in same if last.get(j) == "assist"]
                        if len(pending) == 1:
                            mi = pending[0]
                            why = "pending"
            turn = turn_base + sum(1 for e in ends if e <= st - cut)
            for pos, n in marks:
                if pos <= st - cut:
                    turn = max(turn, n)
            for one in (both if len(both) > 1 else [mi]):
                calls.setdefault(str(floor), []).append({"mi": one, "part": part, "turn": turn, "raw": line[max(0, st - 1):en + 2], **({"why": why} if why and os.environ.get("WHY") else {})})
        if floor is not None:
            # ずらし・0c・+1c で終わるターンは1ターン耐久（レシートの画面に「⏳ +1Cで耐久」と出す）
            body_line = line[cut:]
            for mm in TURN_END.finditer(body_line):
                w = mm.group(0)
                if not re.fullmatch(r"ずらし|[+＋]?\s*[01０１]\s*[cCｃ]", w.strip()):
                    continue
                n_before = sum(1 for e in ends if e < mm.end())
                # ①②…の印があれば、そのターン番号（呼び出しの turn と同じ数え方）
                n_before = max([turn_base + n_before] + [n for pos, n in marks if pos <= mm.start()]) - turn_base
                rep = re.match(r"\s*[xX×]\s*(\d)", body_line[mm.end():])
                label = re.sub(r"\s+", "", w).replace("ｃ", "C").replace("c", "C").replace("＋", "+") + (f"×{rep.group(1)}" if rep else "")
                WAITS.setdefault(team["id"], {}).setdefault(str(floor), []).append({"turn": turn_base + n_before, "label": label})
            turn_base += len(ends)
    if loops:
        LOOPS[team["id"]] = loops
    return calls or None


LOOPS = {}
WAITS = {}


def main():
    ocr = load_ocr()
    result = {}
    stats = []
    for team in load_teams():
        m = re.search(r"status/(\d+)", team.get("source") or "")
        if not m:
            continue
        # 1つのツイートに2編成ある時（source に #ダンジョンid）は2枚目のレシート
        pdc = [t for k in sorted(ocr) if k.startswith(m.group(1)) for t in [lines_of(ocr[k])]
               if any("PDC" in l for l in t) or sum(1 for l in t if FLOOR.match(l)) >= 4]
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
    # ループの記載（2つ目の引数があれば）: { チームid: [ {from: 階, mi: [枠], raw: 元の文字} ] }
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(json.dumps(LOOPS, ensure_ascii=False, indent=1), encoding="utf-8")
    # 1ターン耐久の記載（3つ目の引数があれば）: { チームid: { 階: [ {turn: 終わるターン(0始まり), label: "+1C"} ] } }
    if len(sys.argv) > 3:
        Path(sys.argv[3]).write_text(json.dumps(WAITS, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(result)}編成: 階の数・呼び出し数")
    for s in stats[:200]:
        print(" ", *s)


if __name__ == "__main__":
    main()
