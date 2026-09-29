"""padmdb（みんなで作るパズドラモンスターデータベース）の公開JSONから、
代用検索に使う図鑑データ monsters-db.js を作る。

使い方: python3 tools/build-monsters.py
出典: https://padmdb.rainbowsite.net/ （JSONデータは自由に使用できる形で公開されている）

各行: [No, 名前, 主属性, 副属性, アシスト可, スキル最短ターン, スキルの能力タグ, 覚醒の能力タグ, 覚醒アシスト(武器), 変身グループ]
  変身グループ: 変身前後のキャラをまとめた番号（グループ内で一番小さいNo.）。変身しないキャラは0
  火力覚醒: 攻撃倍率に関わる覚醒の番号を「.」区切りで（同じ覚醒は個数分）。倍率は app.js の DMG_AWK
  超覚醒: 選べる超覚醒の番号を「.」区切りで（どれか1つを付けられる）
  スキル数値: "効果ターン:攻撃倍率"（スキル文の「◯ターンの間」の最大値と「攻撃力が◯倍」の最大値。なければ0）
  能力タグはカンマ区切り。ヘイストは "h2"（2ターン溜まる）のように数値付き
"""
import json
import re
import urllib.request
from pathlib import Path

BASE = "https://padmdb.rainbowsite.net/listJson/"
ATTR = {1: "火", 2: "水", 3: "木", 4: "光", 5: "闇"}

# スキル文 → 能力タグ（ダンジョンのギミック対策や、編成で役割になりやすいもの）
SKILL_TAGS = [
    ("voidPierce", r"ダメージ無効を貫通"),
    ("dmgAbsorbNull", r"ダメージ吸収[^。]*無効"),
    ("attrAbsorbNull", r"属性吸収[^。]*無効"),
    ("comboAbsorbNull", r"コンボ吸収[^。]*無効"),
    ("board76", r"7×6"),
    ("board65", r"6×5マス"),
    ("delay", r"敵の行動を\d+ターン遅らせ"),
    ("reduce", r"受けるダメージを[^。]*(軽減|半減|激減)|ダメージを\d+%軽減"),
    ("hpUp", r"最大HP[^。]*倍|HPが[\d.]+倍"),
    ("heal", r"HPを[^。]*回復|HP全回復|HPを全回復"),
    ("regen", r"毎ターン[^。]*回復|\d+ターンの間[^。]*HPを[\d.]+[%％]回復"),
    ("shieldBreak", r"シールドを\d+つ破壊"),
    ("unerasableHeal", r"消せないドロップ[^。]*回復"),
    ("dropEnhanceAwk", r"\[強化ドロップ目覚め\]|強化ドロップ目覚め"),
    ("enhance", r"攻撃力が[\d.]+倍"),
    ("capUp", r"ダメージ上限値"),
    ("comboAdd", r"コンボ加算"),
    ("noSkyfall", r"落ちコンなし"),
    ("lockRelease", r"\[?ロック\]?を解除"),
    ("assistVoidHeal", r"アシスト無効[^。]*回復"),
    ("awakenHeal", r"覚醒(スキル)?無効[^。]*回復"),
    ("sealHeal", r"封印[^。]*回復"),
    ("bindHeal", r"バインド[^。]*回復"),
    ("cloudHeal", r"雲[^。]*(回復|消|解除)|操作不可[^。]*(回復|解除)"),
    ("atkDebuffHeal", r"攻撃力(低下|減少|激減)[^。]*回復"),
    ("gravity", r"(現|最大)HPの?[\d.]+%"),
    ("fixedDmg", r"固定[^。]*ダメージ"),
    ("orbChange", r"ドロップを[^。]*に変化|列を[^。]*に変化|を生成|陣"),
    ("boardRefresh", r"盤面を\[[^。]*に変化|盤面[^。]*(全|すべて)[^。]*変化|ランダムで生成"),
    ("attrChange", r"敵[^。]*属性[^。]*変化"),
    ("transform", r"変身"),
    ("oneShotAssist", r"このアシストが消滅"),
]
HASTE = re.compile(r"(自分以外の)?スキルが(\d+)ターン溜まる")
GRANT = re.compile(r"((?:\[[^\]]+\])+)を付与")
# 覚醒の名前 → 番号（padmdb の画面データから抜き出した表。スキルで付与される覚醒の判定に使う）
AWAKEN_BY_NAME = {v["name"]: int(k) for k, v in json.load(open(Path(__file__).with_name("awakens.json"), encoding="utf-8")).items() if k.isdigit()}

# 覚醒番号 → 能力タグ（padmdbの覚醒番号。名前はツール内の awakens 表と同じ）
AWAKEN_TAGS = {
    48: "voidPierceAwk", 109: "voidPierceAwk",
    136: "delayResist", 28: "sealResist", 106: "levitate", 148: "assistVoidResist",
    54: "cloudResist", 55: "tapeResist", 11: "darkResist", 68: "darkResist",
    12: "jammerResist", 69: "jammerResist", 13: "poisonResist", 70: "poisonResist",
    132: "afternoonTea", 10: "bindResist", 52: "bindResist", 20: "bindHealAwk", 115: "bindHealAwk",
    14: "dropEnhance", 15: "dropEnhance", 16: "dropEnhance", 17: "dropEnhance", 18: "dropEnhance",
    99: "dropEnhance", 100: "dropEnhance", 101: "dropEnhance", 102: "dropEnhance", 103: "dropEnhance",
    137: "dropEnhance", 29: "dropEnhance", 104: "dropEnhance",
    43: "combo7", 107: "combo7", 61: "combo10", 111: "combo10", 144: "combo15",
    60: "lShape", 108: "lShape", 126: "tShape", 78: "cross", 110: "cross",
    22: "row", 23: "row", 24: "row", 25: "row", 26: "row",
    116: "row", 117: "row", 118: "row", 119: "row", 120: "row",
    44: "guardBreak", 19: "fingers", 53: "fingers", 140: "timeResist",
    21: "skillBoost", 56: "skillBoost", 131: "partBreak", 130: "aging",
    45: "fixedDmgAwk", 50: "fixedDmgAwk",
}


# 攻撃倍率に関わる覚醒（padmdb の覚醒番号）。倍率の表は app.js 側の DMG_AWK
DMG_AWAKENS = {
    27, 96, 43, 107, 61, 111, 144, 60, 108, 59, 126, 78, 110, 48, 109, 79, 112, 80, 113, 81, 114,
    82, 57, 58, 73, 74, 75, 76, 77, 121, 122, 123, 124, 125, 22, 23, 24, 25, 26, 116, 117, 118, 119, 120,
    44, 133, 134, 135, 141, 71, 72, 128, 129, 31, 32, 33, 34, 35, 36, 37, 38,
    127, 142, 138, 139, 145, 146, 147,
}


def fetch(name):
    req = urllib.request.Request(BASE + name, headers={"User-Agent": "pad-farming"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def skill_info(ids, skills):
    ids = ids if isinstance(ids, list) else [ids]
    tags, turn = set(), None
    for sid in ids:
        s = skills.get(str(sid)) if sid else None
        if not s:
            continue
        text = s.get("description", "")
        for tag, pat in SKILL_TAGS:
            if re.search(pat, text):
                tags.add(tag)
        # エンハンスの種類: 全体 / 個別（自分） / タイプ / 属性（どれが条件になるかで代用できるかが変わる）
        if re.search(r"全員の攻撃力", text):
            tags.add("enhanceAll")
        if re.search(r"自分の攻撃力|自身の攻撃力", text):
            tags.add("enhanceSelf")
        for tname in re.findall(r"\[(\S+?)タイプ\]の攻撃力", text):
            tags.add("enhanceType:" + tname)
        for aname in re.findall(r"\[?([火水木光闇])\]?属性の攻撃力", text):
            tags.add("enhanceAttr:" + aname)
        for other, n in HASTE.findall(text):
            tags.add(f"h{n}")
        # スキルで付与される覚醒（例: [浮遊]を付与）は覚醒の能力として扱う
        for group in GRANT.findall(text):
            for name in re.findall(r"\[([^\]]+)\]", group):
                aid = AWAKEN_BY_NAME.get(name)
                if aid in AWAKEN_TAGS:
                    tags.add("grant:" + AWAKEN_TAGS[aid])
        if turn is None and s.get("minTurn"):
            turn = s["minTurn"]
    return sorted(tags), turn


def transform_groups(monsters, skills):
    """変身スキルを持つキャラと、その直後のNo.（変身後）をまとめる。
    変身先の名前はスキル文に書かれていない（「最終段階に変身」）ため、図鑑で変身後が
    直後のNo.に並ぶ規則を使う。5体以上つながるもの（装身シリーズ等の別キャラ）は除外"""
    def text(m):
        ids = m.get("skill") if isinstance(m.get("skill"), list) else [m.get("skill")]
        return "".join(skills.get(str(i), {}).get("description", "") for i in ids if i)

    def transforms(no):
        m = monsters.get(str(no))
        return bool(m) and not m.get("assist") and "変身" in text(m) and "このアシストが" not in text(m)

    group, seen = {}, set()
    for no in sorted(int(k) for k in monsters):
        if no in seen or not transforms(no):
            continue
        chain, k = [no], no
        attr = (monsters[str(no)].get("attributes") or [None])[0]
        while transforms(k):
            nxt = monsters.get(str(k + 1))
            if not nxt or nxt.get("assist") or (nxt.get("attributes") or [None])[0] != attr:
                break
            k += 1
            chain.append(k)
        seen.update(chain)
        if 2 <= len(chain) <= 4:
            for n in chain:
                group[n] = chain[0]
    return group


def skill_numbers(ids, skills):
    ids = ids if isinstance(ids, list) else [ids]
    dur, mult = 0, 0.0
    for sid in ids:
        s = skills.get(str(sid)) if sid else None
        if not s:
            continue
        text = s.get("description", "")
        for n in re.findall(r"(\d+)ターンの間", text):
            dur = max(dur, int(n))
        for n in re.findall(r"攻撃力が([\d.]+)倍", text):
            mult = max(mult, float(n))
    return f"{dur}:{mult:g}"


def main():
    monsters = fetch("monster_list_full.json")
    skills = fetch("skill_list.json")
    updated = fetch("last_modified.json")["monster_list_full"]
    groups = transform_groups(monsters, skills)
    rows = []
    for no, m in sorted(monsters.items(), key=lambda kv: int(kv[0])):
        attrs = m.get("attributes") or []
        main_attr = ATTR.get(attrs[0] if attrs else None, "")
        sub_attr = ATTR.get(attrs[1] if len(attrs) > 1 else None, "")
        awakens = [a for a in (m.get("awakens") or []) if a] + [a for a in (m.get("superAwakens") or []) if a][:0]
        s_tags, turn = skill_info(m.get("skill"), skills)
        a_tags = sorted({AWAKEN_TAGS[a] for a in awakens if a in AWAKEN_TAGS})
        rows.append([
            int(no), m["name"], main_attr, sub_attr, 1 if m.get("assist") else 0,
            turn or 0, ",".join(s_tags), ",".join(a_tags), 1 if 49 in awakens else 0,
            groups.get(int(no), 0),
            ".".join(str(a) for a in awakens if a in DMG_AWAKENS),
            ".".join(str(a) for a in (m.get("superAwakens") or []) if a),
            skill_numbers(m.get("skill"), skills),
        ])
    out = Path(__file__).resolve().parent.parent / "monsters-db.js"
    out.write_text(
        "// 自動生成: tools/build-monsters.py（出典: みんなで作るパズドラモンスターデータベース）\n"
        "// [No, 名前, 主属性, 副属性, アシスト可, スキル最短ターン, スキル能力タグ, 覚醒能力タグ, 覚醒アシスト, 変身グループ, 火力覚醒, 超覚醒, スキル数値]\n"
        f"// 更新: {updated}\n"
        f"window.PAD_MONSTER_DB = {{ updated: {json.dumps(updated)}, rows: "
        + json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
        + " };\n",
        encoding="utf-8",
    )
    print(f"{len(rows)}体 → {out}（{out.stat().st_size // 1024}KB）")


if __name__ == "__main__":
    main()
