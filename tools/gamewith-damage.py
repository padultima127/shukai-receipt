"""ゲームウィズの「出現モンスターと先制行動」の表から、耐久チェック用の被ダメージ表（damage.floors）を作る。

使い方: python3 tools/gamewith-damage.py <出力JSON> <ダンジョンid>=<記事番号> [...]
  例: python3 tools/gamewith-damage.py /tmp/dmg.json kirisame=562297 fuun=545668

取り込むもの（耐久チェックの考え方に合わせる）
  - 先制行動のダメージ（固定ダメージ・現HP◯%割合）      → kind "preemptive"
  - 【超根性発動時】のダメージ                            → kind "superResolve"（threshold は「超根性（HP◯%）」）
  - 【初回行動時】などのダメージ                          → kind "turn"（ワンパン前提なので計算には入れず、表に「受けない」と表示）
敵の属性は、敵アイコンの図鑑No.から padmdb のデータで判定する。
1つの階に「◯体」より多くの敵が載っている場合（いずれか出現）は、【必ず出現】＋先制ダメージが大きい順に選ぶ（安全側）。
乱入は取り込まない。自動取り込みなので、登録後に人の目で確認すること。
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

SCRATCH = Path("/private/tmp/claude-501/-Users-hm-Desktop-cloud/0eb1ef7d-c9ca-4c34-bba3-a2c311f021c1/scratchpad")
MONS = json.load(open(SCRATCH / "monster_list_full.json"))
ATTR = {1: "火", 2: "水", 3: "木", 4: "光", 5: "闇"}
BASE = "https://xn--0ck4aw2h.gamewith.jp/article/show/"


def attr_of(no):
    m = MONS.get(str(no))
    if not m:
        return None
    a = list(m.get("attributes") or [])
    # 一部の敵専用キャラは [0, 属性, 0] と1つずれている
    if a and not a[0] and len(a) > 1 and a[1]:
        a = a[1:]
    return ATTR.get(a[0] if a else None)


def fetch(n):
    req = urllib.request.Request(BASE + str(n), headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


IMG_NO = re.compile(r"/(\d+)\.png")


DROP_ICON = {"fire": "火", "water": "水", "tree": "木", "light": "光", "dark": "闇", "heart": "回復", "ojama": "お邪魔", "doku": "毒", "moudoku": "猛毒", "bomb": "爆弾"}


def drop_mark(src):
    m = re.search(r"/([a-z]+)\.png", src)
    return f"[{DROP_ICON[m.group(1)]}]" if m and m.group(1) in DROP_ICON else ""


def cell_text(td):
    """画像は、敵アイコン（数字.png）→ @@E番号@@、ドロップアイコン → [火] など、それ以外は消す。改行を保つ"""
    for img in td.find_all("img"):
        src = img.get("data-original") or img.get("src") or ""
        m = IMG_NO.search(src)
        img.replace_with(f"@@E{m.group(1)}@@" if m else drop_mark(src))
    for br in td.find_all("br"):
        br.replace_with("\n")
    t = td.get_text("\n")
    # 本文中に文字として埋め込まれた <img ...> もある
    t = re.sub(r"<img[^>]*?/(\d+)\.png[^>]*>", r"@@E\1@@", t)
    t = re.sub(r"<img[^>]*?/([a-z]+)\.png[^>]*>", lambda m: f"[{DROP_ICON[m.group(1)]}]" if m.group(1) in DROP_ICON else "", t)
    t = re.sub(r"<img[^>]*>", "", t)
    return re.sub(r"[ \t　]+", " ", t)


def split_variants(text, default_no):
    """「@@E番号@@の先制行動」ごとに敵を分ける（いずれか出現・複数体をまとめた行）"""
    marks = list(re.finditer(r"((?:@@E\d+@@\s*)+)の先制行動", text))
    if not marks:
        return [(default_no, re.sub(r"@@E\d+@@", "", text))]
    out = []
    for i, m in enumerate(marks):
        no = int(re.findall(r"@@E(\d+)@@", m.group(1))[-1])
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        out.append((no, re.sub(r"@@E\d+@@", "", text[m.end():end])))
    return out


DMG = re.compile(r"([\d,]{5,})ダメージ")
RATIO = re.compile(r"現HP(?:の)?(\d+)[%％]割合")


def sections(text):
    """【…】で区切る。最初の区切りの前が先制行動"""
    # 【必ず出現】【ランダム1体出現】は条件ではないので区切りにしない
    text = re.sub(r"【[^】]*出現[^】]*】", "", text)
    parts = re.split(r"(【[^】]*】)", text)
    out = [(None, parts[0])]
    for i in range(1, len(parts), 2):
        out.append((parts[i], parts[i + 1] if i + 1 < len(parts) else ""))
    return out


def awaken_of(text):
    """先制の「[火]目覚め：◯ターン」（敵が付けるドロップ目覚め）"""
    pre = sections(text)[0][1]
    return [{"names": list(dict.fromkeys(re.findall(r"\[([^\]]+)\]", m.group(1)))), "dur": int(m.group(2))} for m in re.finditer(r"((?:\[[^\]]+\]\s*)+)目覚め\s*[:：]\s*(\d+)ターン", pre)]


def hits_of(text, attrs, threshold):
    hits = []
    for marker, body in sections(text):
        body = re.sub(r"[（(][^）)]*?(?:以降|次回|次ターン)[^）)]*[）)]", "", body)  # 「（※以降、◯ダメージ）」は予告なので除く
        body = "\n".join(l for l in body.split("\n") if not l.strip().startswith("※"))  # 「※既にリダチェン時」など条件付きの注記は除く
        if marker is None:
            kind, label = "preemptive", "先制"
        elif "超根性" in marker and ("発動" in marker or "行動" in marker):
            kind, label = "superResolve", "超根性発動時"
        elif "初回" in marker or "初ターン" in marker or "1ターン目" in marker:
            kind, label = "turn", "初回行動時"
        else:
            continue
        for m in RATIO.finditer(body):
            h = {"label": f"{label} 現HP{m.group(1)}%割合", "ratio": int(m.group(1)), "kind": kind, "attrs": attrs}
            if kind == "superResolve":
                h["threshold"] = threshold
            hits.append(h)
        for m in DMG.finditer(body):
            h = {"label": label, "dmg": int(m.group(1).replace(",", "")), "kind": kind, "attrs": attrs}
            if kind == "superResolve":
                h["threshold"] = threshold
            hits.append(h)
    return hits


def parse(html):
    soup = BeautifulSoup(html, "html.parser")
    table = None
    for t in soup.find_all("table"):
        head = t.find("tr")
        if head and "先制" in head.get_text() and "HP:" in t.get_text():
            table = t
            break
    if not table:
        return None
    floors = []
    cur = None
    for tr in table.find_all("tr")[1:]:
        tds = tr.find_all(["td", "th"], recursive=False)
        if len(tds) < 2:
            continue
        if len(tds) >= 3:
            label = re.sub(r"\s+", " ", tds[0].get_text(" ")).strip()
            cur = {"label": label, "rows": []}
            floors.append(cur)
        if cur is None:
            continue
        hp_td, text_td = tds[-2], tds[-1]
        enemy_nos = [int(m.group(1)) for img in hp_td.find_all("img") if (m := IMG_NO.search(img.get("data-original") or img.get("src") or ""))]
        raw_hp = hp_td.get_text(" ")
        text = cell_text(text_td)
        thr = re.search(r"超根性[（(]HP(\d+)[%％]", text)
        variants = []
        for no, vt in split_variants(text, enemy_nos[0] if enemy_nos else None):
            attrs = [a for a in [attr_of(no)] if a] if no else []
            variants.append({"no": no, "hits": hits_of(vt, attrs, int(thr.group(1)) if thr else 50), "awaken": awaken_of(vt)})
        cur["rows"].append({"mandatory": "必ず出現" in raw_hp + text, "variants": variants, "attrs": sorted({a for n in enemy_nos for a in [attr_of(n)] if a}), "parts": "部位" in raw_hp or bool(re.search(r"防御[:：]\s*[\d.]+[兆億]?\s*(?!HP)[^\s\d:：]+[:：]\s*[\d.]+[兆億]", raw_hp))})
    return floors


def pre_total(v):
    """どの敵が一番危ないか（先制＋超根性発動時。割合ダメージは大きめに数える）"""
    return sum(h.get("dmg", 0) + h.get("ratio", 0) * 100000 for h in v["hits"] if h["kind"] in ("preemptive", "superResolve"))


def build(floors):
    out = []
    for f in floors:
        m = re.match(r"B\s*(\d+)", f["label"])
        if not m:
            continue  # 乱入など
        n = int(m.group(1))
        cnt = re.search(r"B\s*\d+\s+(\d+)\s*体", f["label"])
        rows = f["rows"]
        # 行の中の「いずれか出現」は先制ダメージが一番大きい敵（同じならまとめて属性の候補にする）
        picked = []
        for r in rows:
            best = max(r["variants"], key=pre_total)
            same = [v for v in r["variants"] if pre_total(v) == pre_total(best)]
            attrs = sorted({a for v in same for h in v["hits"] for a in h["attrs"]} | {a for v in same for a in [attr_of(v["no"])] if a})
            hits = [{**h, "attrs": attrs or h["attrs"]} for h in best["hits"]]
            picked.append({"mandatory": r["mandatory"], "hits": hits, "total": pre_total(best), "alt": len(r["variants"]) > 1, "awaken": best["awaken"]})
            # 行に攻撃がなくても属性だけは持っておく（同ダメージの候補の属性まとめ用）
            if not hits:
                picked[-1]["hits"] = []
        note = []
        if cnt and int(cnt.group(1)) < len(picked):
            k = int(cnt.group(1))
            must = [p for p in picked if p["mandatory"]]
            rest = sorted([p for p in picked if not p["mandatory"]], key=lambda p: -p["total"])
            chosen = rest[: max(0, k - len(must))]
            # 選ばれなかった同じダメージの敵の属性も候補に入れる（どれが出ても耐えられるか）
            for c in chosen:
                extra = {a for p in rest if p not in chosen and p["total"] == c["total"] for h in p["hits"] for a in h["attrs"]}
                c["hits"] = [{**h, "attrs": sorted(set(h["attrs"]) | extra)} for h in c["hits"]]
            picked = must + chosen
            note.append(f"敵は{len(rows)}種類のうち{k}体。先制ダメージが大きい組み合わせで計算（安全側）")
        if any(p["alt"] for p in picked):
            note.append("いずれか1体出現の枠は先制ダメージが大きい方で計算")
        hits = [h for p in picked for h in p["hits"]]
        floor = {"floor": n, "hits": hits}
        # その階に出る可能性のある敵全員の属性（「敵が◯属性の時」の条件判定用。ダメージのない敵も含む）
        floor["enemyAttrs"] = sorted({a for r in rows for a in r.get("attrs", [])})
        # 部位がある階（部位破壊ボーナスの判定用）
        if any(r.get("parts") for r in rows):
            floor["parts"] = True
        aw = [a for p in picked for a in p.get("awaken", [])]
        if aw:
            floor["awaken"] = aw
        if note:
            floor["note"] = "／".join(note)
        out.append(floor)
    return out


def main():
    result = {}
    for arg in sys.argv[2:]:
        did, num = arg.split("=")
        floors = parse(fetch(num))
        if not floors:
            print(f"{did}: 表が見つかりません")
            continue
        result[did] = {"url": BASE + num, "floors": build(floors)}
        dmg = sum(1 for f in result[did]["floors"] for h in f["hits"] if h["kind"] != "turn")
        print(f"{did}: {len(result[did]['floors'])}階, 計算に入る攻撃 {dmg}件")
    Path(sys.argv[1]).write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
