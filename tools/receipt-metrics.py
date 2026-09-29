"""ツイート画像のOCR結果（tools/ocr.swift の出力）から、楽さの指標を編成ごとに計算する。

使い方: python3 tools/receipt-metrics.py ocr.json > metrics.json
出力: { ツイートID: { chars, puzzle, branch, caution, zurashi, plus891, plus891Text } }
  chars   : PDCレシート（編成画像の下の立ち回り）の文字数
  puzzle  : パズル指定の数（L字・T字・十字・列・way・○c・全力・回復4 など）
  branch  : 分岐の数（乱入・分岐・場合・通常/or）
  caution : 注意書きの数（⚠・注意・耐久・ルーレット・ターゲット指定）
  zurashi : 「ずらし」の数（多いほど楽）
  plus891 : サブ・リーダーの+891の割合（0〜1）。本文で必須/不要と明言していればそれを優先
"""
import json
import re
import sys
from collections import defaultdict

PUZZLE = re.compile(r"L字|T字|十字|光T|光L|[水火木光闇]L|way|列|盤面\s*\d+\s*[cC]|\+?\s*\d\s*[cC](?![a-z])|コンボ|全力|回復\s*[4４]|[4４]つ消し|[4４]消し")
BRANCH = re.compile(r"乱入|分岐|場合|通常|\bor\b")
CAUTION = re.compile(r"⚠|注意|耐久|ルーレット|ルレ|タゲ|ターゲット|順番")
ZURASHI = re.compile(r"ずらし|ズラし|ズラシ")
BADGE = re.compile(r"^\+?\s*(891|297|300|723|741|318)$")
REQUIRED = re.compile(r"(ALL|オール|全員)\s*\+?891|891\s*(が)?必須")
NOT_REQUIRED = re.compile(r"891\s*(不要|は?無くても|はなくても|必要ないかも)|297のみ")


NO_LABEL = re.compile(r"N[oO0]\s*\d{3,5}|継承")


def is_screenshot(lines):
    text = "".join(l["t"] for l in lines)
    return any(k in text for k in ("クリアタイム", "Battle", "潜入確認", "挑戦する"))


def split_receipt(lines):
    """編成画像（No.や継承が並ぶ部分）より下の立ち回りテキストを返す。編成画像がなければ全体を続きとみなす"""
    pdc = [l["y"] for l in lines if "PDC" in l["t"] or "パズドラダメージ" in l["t"]]
    # 編成画像は画像の上側にある。下の方の「No.」は代用メモなどなので境目に使わない
    head = [l["y"] for l in lines if NO_LABEL.search(l["t"]) and l["y"] < 0.4]
    cut = pdc[0] if pdc else (max(head) if head else None)
    body = [l for l in lines if cut is None or l["y"] > cut + 0.002]
    return cut is not None, body, cut


def text_metrics(body):
    text = "\n".join(l["t"] for l in body)
    return {
        "chars": sum(len(re.sub(r"\s", "", l["t"])) for l in body),
        "puzzle": len(PUZZLE.findall(text)),
        "branch": len(BRANCH.findall(text)),
        "caution": len(CAUTION.findall(text)),
        "zurashi": len(ZURASHI.findall(text)),
    }


def metrics_for(images):
    # 編成画像付きのレシートが複数ある場合は分岐違いの別パターンとみなして最長のものを使い、
    # 編成画像なしの画像はレシートの続きとして足す
    best, extra, badge_src, all_text = None, [], None, ""
    for lines in images:
        if is_screenshot(lines):
            continue
        all_text += "\n".join(l["t"] for l in lines)
        has_head, body, cut = split_receipt(lines)
        m = text_metrics(body)
        if has_head:
            if best is None or m["chars"] > best["chars"]:
                best, badge_src = m, (lines, cut)
        else:
            extra.append(m)
    if best is None and not extra:
        return None
    total = dict(best or {k: 0 for k in ("chars", "puzzle", "branch", "caution", "zurashi")})
    for m in extra:
        for k in total:
            total[k] += m[k]
    # 編成画像の+数値バッジ: 上の段がアシスト、下の段がモンスター本体
    ratio = None
    if badge_src:
        lines, cut = badge_src
        badges = [l for l in lines if l["y"] < cut and BADGE.match(l["t"].replace(" ", ""))]
        if badges:
            ys = sorted(b["y"] for b in badges)
            mid = (ys[0] + ys[-1]) / 2
            base = [b for b in badges if b["y"] >= mid] if ys[-1] - ys[0] > 0.01 else badges
            ratio = sum("891" in b["t"] for b in base) / len(base)
    stated = "required" if REQUIRED.search(all_text) else "not-required" if NOT_REQUIRED.search(all_text) else None
    total["plus891"] = 1.0 if stated == "required" else 0.0 if stated == "not-required" else round(ratio or 0, 2)
    total["plus891Text"] = stated
    return total


def main():
    ocr = json.load(open(sys.argv[1]))
    by_tweet = defaultdict(list)
    for name, lines in sorted(ocr.items()):
        by_tweet[name.split("_")[0]].append(lines)
    out = {tid: m for tid, imgs in by_tweet.items() if (m := metrics_for(imgs))}
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
