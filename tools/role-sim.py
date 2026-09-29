"""レシートを時系列でシミュレーションし、各スキルが「どの階のどのギミック」を対策しているかを割り出す（試作）。

使い方: python3 tools/role-sim.py
入力:
  - 編成（枠ごとの本体No.とアシストNo.、レシートでの呼び名）
  - レシートの手順（階ごとのターン数と、各ターンで使ったスキル）
  - ダンジョンの階ごとのギミック（ゲームウィズの敵行動表から構造化）
  - スキルの効果と持続ターン（padmdb のスキル文から抽出）
出力: スキルごとの「使った階 → 対策したギミック（何ターン目まで効果が必要だったか）」と、使われなかったアシスト
"""
import json
import re
from pathlib import Path

SCRATCH = Path("/private/tmp/claude-501/-Users-hm-Desktop-cloud/0eb1ef7d-c9ca-4c34-bba3-a2c311f021c1/scratchpad")
SKILLS = json.load(open(SCRATCH / "skill_list.json"))
MONS = json.load(open(SCRATCH / "monster_list_full.json"))

# ---------- スキル文 → 効果（持続ターン付き） ----------
EFFECTS = [
    ("voidPierce", r"ダメージ無効を貫通"),
    ("absorbNull", r"ダメージ吸収[^。]*無効"),
    ("attrAbsorbNull", r"属性吸収[^。]*無効"),
    ("awakenHeal", r"覚醒無効を[^。]*回復"),
    ("comboAdd", r"コンボ加算"),
    ("shieldBreak", r"シールドを\d+つ破壊"),
    ("capUp", r"ダメージ上限値"),
    ("haste", r"スキルが\d+ターン溜まる"),
    ("partDmg", r"部位の残りHP"),
]


def skill_text(no):
    m = MONS[str(no)]
    ids = m["skill"] if isinstance(m["skill"], list) else [m["skill"]]
    return "".join(SKILLS.get(str(i), {}).get("description", "") for i in ids if i).replace("\r", "").replace("\n", "")


def effects_of(no):
    """文単位で「◯ターンの間」を効果に結びつける。ターン指定がない効果は即時（0）"""
    out = {}
    for sentence in re.split(r"。", skill_text(no)):
        dur = int(m.group(1)) if (m := re.search(r"(\d+)ターンの間", sentence)) else 0
        # 「◯ターンの間、A、B。」の A・B が同じ持続を持つ。ヘイストなどは即時
        for key, pat in EFFECTS:
            if re.search(pat, sentence):
                d = 0 if key in ("haste", "shieldBreak", "partDmg") else max(dur, 1)
                out[key] = max(out.get(key, 0), d)
    return out


# ---------- 霧雨の魔王（ゲームウィズの敵行動表より）: 階 → [(ギミック, 継続ターン)] ----------
# 色アイコンは文字にならないため「吸収：10ターン」は属性吸収として扱う
KIRISAME = {
    1: [("attrAbsorb", 10), ("awakenVoid", 2)],
    2: [("attrAbsorb", 10)],
    3: [("dmgAbsorb", 5), ("assistVoid", 4)],
    4: [("dmgVoid", 10)],
    5: [("comboVoid", 1), ("attrAbsorb", 10)],
    6: [("attrAbsorb", 10)],
    7: [("dmgVoid", 10)],
    8: [("capDown", 3)],
    9: [("attrAbsorb", 10), ("awakenVoid", 3)],
    10: [("dmgAbsorb", 10)],
    11: [("dmgVoid", 3), ("awakenVoid", 2)],
    12: [("comboAbsorb", 10)],
    13: [("dmgVoid", 10), ("awakenVoid", 1)],
    14: [("shield3", 1), ("assistVoid", 4)],
    15: [("capDown", 5)],
}
COUNTERS = {
    "dmgVoid": ["voidPierce"],
    "dmgAbsorb": ["absorbNull"],
    "attrAbsorb": ["attrAbsorbNull"],
    "awakenVoid": ["awakenHeal"],
    "comboAbsorb": ["comboAdd"],
    "comboVoid": ["comboAdd"],
    "shield3": ["shieldBreak"],
    "capDown": ["capUp"],
}
GIMMICK_JP = {
    "dmgVoid": "ダメージ無効", "dmgAbsorb": "ダメージ吸収", "attrAbsorb": "属性吸収", "awakenVoid": "覚醒無効",
    "comboAbsorb": "コンボ吸収", "comboVoid": "コンボ無効", "shield3": "シールド3枚", "capDown": "上限値低下",
    "assistVoid": "アシスト無効",
}
EFFECT_JP = {
    "voidPierce": "無効貫通", "absorbNull": "ダメージ吸収無効", "attrAbsorbNull": "属性吸収無効", "awakenHeal": "覚醒無効回復",
    "comboAdd": "コンボ加算", "shieldBreak": "シールド破壊", "capUp": "上限解放", "haste": "ヘイスト", "partDmg": "部位ダメージ",
}

# ---------- 編成: 前歯ニキさんの霧雨ダイン編成 ----------
TEAM = {  # 呼び名: (本体No., アシストNo.)
    "ダイン": (14098, 14039),
    "日番谷": (14068, 14039),
    "イズナ": (14142, 13584),
    "リルトット": (14074, 12634),
    "渋谷凛": (13571, 12301),
    "ダイアモス": (14113, 11384),
}
# 階 → 各ターンで使ったスキル（「〇〇裏」＝アシストのスキル、「〇〇変身」は変身のみで効果は数えない）
RECEIPT = {
    1: [["リルトット裏", "ダイアモス裏", "ダイン変身", "日番谷変身", "イズナ裏", "ダイン", "渋谷凛裏", "ダイアモス変身"]],
    2: [["イズナ", "日番谷", "ダイアモス"]],
    3: [["ダイアモス", "ダイン"]],
    4: [["渋谷凛", "ダイアモス"]],
    5: [["ダイアモス"]],
    6: [["日番谷", "ダイアモス"], ["ダイアモス"]],
    7: [["ダイアモス"]],
    8: [["リルトット裏", "ダイアモス", "ダイン"]],
    9: [["イズナ", "日番谷", "ダイアモス"]],
    10: [["ダイアモス"]],
    11: [["渋谷凛", "ダイアモス"]],
    12: [["ダイアモス"]],
    13: [["ダイン", "イズナ", "日番谷"], ["ダイアモス"]],
    14: [["ダイアモス", "リルトット"], ["ダイアモス"]],
    15: [["渋谷凛", "イズナ", "日番谷", "ダイアモス"], ["ダイアモス", "ダイン"], ["ダイアモス"], ["ダイアモス"],
         ["イズナ", "日番谷", "ダイアモス"], ["ダイアモス", "リルトット"]],
}


def resolve(call):
    call = call.replace("変身", "")
    assist = call.endswith("裏")
    name = call[:-1] if assist else call
    base, asst = TEAM[name]
    return name, assist, (asst if assist else base)


def simulate():
    turn = 0
    active = []  # 効果: {src, effect, until(最終ターン), usedFloor}
    findings = []
    used = set()
    floor_first_turn = {}
    for floor, turns in RECEIPT.items():
        for ti, calls in enumerate(turns):
            turn += 1
            floor_first_turn.setdefault(floor, turn)
            for c in calls:
                name, is_assist, no = resolve(c)
                if "変身" in c:
                    continue
                used.add((name, is_assist))
                for eff, dur in effects_of(no).items():
                    active.append({"src": c, "no": no, "effect": eff, "from": turn, "until": turn + max(dur, 1) - 1, "floor": floor})
            # このターンに有効なギミック（階の最初のターンから継続ターン分）
            for g, gdur in KIRISAME.get(floor, []):
                if turn - floor_first_turn[floor] >= gdur:
                    continue
                cover = [a for a in active if a["effect"] in COUNTERS.get(g, []) and a["from"] <= turn <= a["until"]]
                findings.append({"floor": floor, "turn": turn, "gimmick": g, "cover": cover})
    return findings, used, turn


def main():
    findings, used, total = simulate()
    print(f"総ターン数: {total}\n")
    roles = {}
    for f in findings:
        for a in f["cover"]:
            key = (a["src"], a["floor"], a["effect"])
            r = roles.setdefault(key, {"a": a, "hits": []})
            r["hits"].append((f["floor"], f["turn"], f["gimmick"]))
    print("■ スキルごとの役割（使った階 → 対策したギミック、必要な持続）")
    for (src, fl, eff), r in sorted(roles.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        a = r["a"]
        last = max(t for _, t, _ in r["hits"])
        need = last - a["from"] + 1
        hits = sorted({(f, g) for f, _, g in r["hits"]})
        print(f"  {fl:>2}F {src:<10} {EFFECT_JP[eff]}（{a['until'] - a['from'] + 1}ターン） → "
              + "、".join(f"{f}Fの{GIMMICK_JP[g]}" for f, g in hits)
              + f"｜必要な持続: {need}ターン")
    print("\n■ 対策スキルが見つからなかったギミック（パズル・覚醒・潜在で対応していると推定）")
    seen = set()
    for f in findings:
        if not f["cover"] and (f["floor"], f["gimmick"]) not in seen:
            seen.add((f["floor"], f["gimmick"]))
            print(f"  {f['floor']:>2}F {GIMMICK_JP[f['gimmick']]}")
    print("\n■ レシートで一度もスキルを使っていないアシスト（覚醒目的と推定）")
    for name, (b, a) in TEAM.items():
        if (name, True) not in used:
            print(f"  {name}のアシスト {MONS[str(a)]['name']}")


if __name__ == "__main__":
    main()
