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
import os
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
    ("reduce", r"受けるダメージを[^。]*(軽減|半減|激減)|ダメージを\d+[%％]軽減|ダメージを(半減|激減)"),
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
    ("gravity", r"(現|最大)HPの?[\d.]+%|(?<!部位の)残りHPが[\d.]+[%％]減少"),
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
AWAKENS = json.load(open(Path(__file__).with_name("awakens.json"), encoding="utf-8"))
AWAKEN_BY_NAME = {v["name"]: int(k) for k, v in AWAKENS.items() if k.isdigit()}

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
    21: "skillBoost", 56: "skillBoost", 46: "teamHp", 131: "partBreak", 130: "aging",
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
        # エンハンスは2種類（本人の説明）:
        #   全体エンハンス = タイプ・属性・覚醒数を基準にするもの
        #   個別エンハンス = 自分・特定の位置（右隣・リーダー等）・味方全員（「全員の攻撃力」）
        # 条件付きスキル用に、全体エンハンスはどのタイプ/属性かも残す
        types = re.findall(r"\[(\S+?)タイプ\][^。]*?攻撃力", text)
        attrs = re.findall(r"\[?([火水木光闇])\]?属性の攻撃力", text)
        if types or attrs or re.search(r"覚醒[^。]*数に応じて[^。]*攻撃力|覚醒[^。]*1個につき[^。]*攻撃力", text):
            tags.add("enhanceZentai")
        for tname in types:
            tags.add("enhanceType:" + tname)
        for aname in attrs:
            tags.add("enhanceAttr:" + aname)
        if re.search(r"(自分|自身|全員|右隣|左隣|リーダー|助っ人|サブ)[^。]{0,6}の攻撃力", text):
            tags.add("enhanceKobetsu")
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


TYPE_ID = {"バランス": 1, "体力": 2, "回復": 3, "ドラゴン": 4, "神": 5, "攻撃": 6, "悪魔": 7, "マシン": 8}
ATTR_ID = {v: k for k, v in ATTR.items()}


def endurance_numbers(ids, skills):
    """耐久チェック用: "リジェネ%:毎ターン回復生成:スキル軽減%:最大HP倍率"。
    スキル軽減は「ダメージを◯%軽減」「半減」。%指定のない「軽減」は35%（パズドラの仕様、本人談）
    リジェネ = 「◯ターンの間…HPを◯%回復」の最大値。回復生成 = [回復]を生成/[回復]に変化"""
    ids = ids if isinstance(ids, list) else [ids]
    regen, gen, red, hpm = 0, 0, 0, 0
    for sid in ids:
        s = skills.get(str(sid)) if sid else None
        if not s:
            continue
        for sentence in s.get("description", "").replace("\r", "").replace("\n", "").split("。"):
            if "ターンの間" in sentence:
                for n in re.findall(r"HPを([\d.]+)[%％]回復", sentence):
                    regen = max(regen, float(n))
            if re.search(r"\[回復\][^。]*(生成|に変化)|回復ドロップ[^。]*生成", sentence):
                gen = 1
            if "ターンの間" in sentence:
                if "ダメージを半減" in sentence:
                    red = max(red, 50)
                for n in re.findall(r"ダメージを([\d.]+)[%％]軽減", sentence):
                    red = max(red, float(n))
                if re.search(r"ダメージを軽減", sentence):
                    red = max(red, 35)
                # 「激減」は75%（本人談）
                if re.search(r"ダメージを激減", sentence):
                    red = max(red, 75)
                for n in re.findall(r"最大HPが([\d.]+)倍", sentence):
                    hpm = max(hpm, float(n))
    return f"{regen:g}:{gen}:{red:g}:{hpm:g}"


def leader_numbers(ls):
    """リーダースキルの軽減率とHP倍率。"軽減%|HP倍率の条件=倍率,..."（条件: all / t6 = 攻撃タイプ / a4 = 光属性）"""
    if not ls:
        return ""
    text = ls.get("description", "").replace("\r", "").replace("\n", "")
    red = 0.0
    if "ダメージを半減" in text:
        red = 50.0
    # 「激減」は75%（本人談）
    if "ダメージを激減" in text:
        red = max(red, 75.0)
    for n in re.findall(r"ダメージを([\d.]+)[%％]軽減", text):
        red = max(red, float(n))
    hp = []
    for sentence in text.split("。"):
        for grp, mult in re.findall(r"((?:\[[^\]]+\](?:属性|タイプ)?[と・、]?)+)の(?:HP|全パラメータ)[^。倍]*?([\d.]+)倍", sentence):
            for name in re.findall(r"\[([^\]]+)\]", grp):
                if name.endswith("タイプ") or name in TYPE_ID:
                    t = TYPE_ID.get(name.replace("タイプ", ""))
                    if t:
                        hp.append(f"t{t}={mult}")
                elif name in ATTR_ID:
                    hp.append(f"a{ATTR_ID[name]}={mult}")
        for grp, mult in re.findall(r"(?<!\])((?:[火水木光闇][と・、]?)+)属性の(?:HP|全パラメータ)[^。倍]*?([\d.]+)倍", sentence):
            for name in re.findall(r"[火水木光闇]", grp):
                hp.append(f"a{ATTR_ID[name]}={mult}")
        if not hp:
            m = re.search(r"(?:^|、)HP(?:と[^。倍]*)?が([\d.]+)倍", sentence)
            if m:
                hp.append(f"all={m.group(1)}")
    return f"{red:g}|{','.join(hp)}" if red or hp else ""


def effect_durations(ids, skills):
    """能力ごとの効果ターン "voidPierce:12,dmgAbsorbNull:5"（文単位で「◯ターンの間」を結びつける）"""
    ids = ids if isinstance(ids, list) else [ids]
    out = {}
    for sid in ids:
        s = skills.get(str(sid)) if sid else None
        if not s:
            continue
        for sentence in s.get("description", "").replace("\r", "").replace("\n", "").split("。"):
            m = re.search(r"(\d+)ターンの間", sentence)
            if not m:
                continue
            for tag, pat in SKILL_TAGS:
                if re.search(pat, sentence):
                    out[tag] = max(out.get(tag, 0), int(m.group(1)))
    return ",".join(f"{k}:{v}" for k, v in sorted(out.items()))


def gravity_pct(ids, skills):
    """部位以外へのグラビティ（敵の残りHP/現HPを◯%減少）の1回あたりの最大%"""
    ids = ids if isinstance(ids, list) else [ids]
    g = 0
    for sid in ids:
        s = skills.get(str(sid)) if sid else None
        if s:
            for x in re.findall(r"(?<!部位の)(?:残りHP|現HP)[^。]{0,6}?(\d+)[%％]減少", s.get("description", "")):
                g = max(g, int(x))
    return g


# 自分の全パラメータを掛ける覚醒（HP推定用）。138 アシスト共鳴・139 自力・128/129 加護は条件付き、63 スキルボイスは素のステータスだけ
STAT_MULT_AWAKENS = {63, 127, 128, 129, 130, 138, 139, 142, 146, 147}


def attr_changes(ids, skills):
    """属性変更スキル: "自分:属性:ターン|敵:属性:ターン|条件:属性:倍"（ターン0＝その階の間ずっと）
    自分の属性変更 → アシスト共鳴などの判定が変わる。敵の属性変更 → 属性軽減が変わる。
    条件 → 「敵が◯属性の時、効果が◯倍」（日番谷の最大HPアップなど）"""
    ids = ids if isinstance(ids, list) else [ids]
    text = "".join((skills.get(str(i)) or {}).get("description", "") for i in ids if i).replace("\r", "").replace("\n", "")
    parts = []
    if m := re.search(r"(?:(\d+)ターンの間、)?自分の属性が([火水木光闇])属性に変化", text):
        parts.append(f"自分:{m.group(2)}:{m.group(1) or 0}")
    # 自分以外の味方の属性変更（右隣・左隣・両隣・味方全員・助っ人・リーダー）。LSの属性HP倍率や共鳴が変わる
    for sentence in text.split("。"):
        dur = (re.search(r"(\d+)ターンの間", sentence) or [None, 0])[1]
        for m in re.finditer(r"(右隣|左隣|両隣|味方|助っ人|リーダー)が([火水木光闇])属性に変化", sentence):
            parts.append(f"味方:{m.group(1)}:{m.group(2)}:{dur or 0}")
    if m := re.search(r"(?:(\d+)ターンの間、)?敵全体が([火水木光闇])属性に変化", text):
        parts.append(f"敵:{m.group(2)}:{m.group(1) or 0}")
    if m := re.search(r"敵が([火水木光闇])属性の時、効果が([\d.]+)倍", text):
        parts.append(f"条件:{m.group(1)}:{m.group(2)}")
    # ドロップ目覚めが条件の効果: 「[火目覚め]発動中、◯ターンの間、受けるダメージを軽減」など（軽減 red・最大HP hp）
    for sentence in text.split("。"):
        if m := re.search(r"\[([^\]]+?)目覚め\]発動中", sentence):
            eff = "+".join(k for k, pat in (("red", r"軽減|半減|激減"), ("hp", r"最大HP")) if re.search(pat, sentence))
            if eff:
                parts.append(f"目覚め条件:{m.group(1)}:{eff}")
    # ドロップ目覚めを付ける: 「◯ターンの間、[火][闇]が少し落ちやすくなる」「[強化ドロップ目覚め]が◯%落ちてくる」
    names, dur = [], 0
    for m in re.finditer(r"(\d+)ターンの間、((?:\[[^\]]+\])+)が(?:少し|かなり)?落ちやすくなる", text):
        names += re.findall(r"\[([^\]]+)\]", m.group(2))
        dur = max(dur, int(m.group(1)))
    if m := re.search(r"(\d+)ターンの間、[^。]*\[強化ドロップ目覚め\]", text):
        names.append("強化ドロップ")
        dur = max(dur, int(m.group(1)))
    if names:
        parts.append(f"目覚め付与:{','.join(dict.fromkeys(names))}:{dur}")
    return "|".join(parts)


def delayed_activation(ids, skills):
    ids = ids if isinstance(ids, list) else [ids]
    n = 0
    for sid in ids:
        s = skills.get(str(sid)) if sid else None
        if s:
            for x in re.findall(r"(\d+)ターン後に発動", s.get("description", "")):
                n = max(n, int(x))
    return n


# アップデートで変わったら編成に影響する項目（行のインデックス → 表示名）
TRACKED = {5: "スキルターン", 6: "スキルの能力", 7: "覚醒", 12: "スキルの効果ターン・倍率", 21: "能力ごとの効果ターン", 17: "最大HP", 19: "リーダースキル"}


def record_changes(rows, updated):
    """前回の monsters-db.js と比べて、変わったキャラを monsters-changes.js に追記する（ゲームのアップデート対応）"""
    root = Path(__file__).resolve().parent.parent
    prev_file = root / "monsters-db.js"
    log_file = root / "monsters-changes.js"
    if not prev_file.exists():
        return
    # 抽出ロジックを変えたとき（ゲームのアップデートではない差分）は SKIP_CHANGES=1 で実行して履歴に残さない
    if os.environ.get("SKIP_CHANGES"):
        print("変更履歴: 記録しない（SKIP_CHANGES）")
        return
    text = prev_file.read_text(encoding="utf-8")
    prev = {r[0]: r for r in json.loads(text[text.index("rows: ") + 6 : text.rindex(" };")])}
    log = []
    if log_file.exists():
        t = log_file.read_text(encoding="utf-8")
        log = json.loads(t[t.index("=") + 1 : t.rindex(";")])
    date = str(updated)[:10]
    added = 0
    for r in rows:
        old = prev.get(r[0])
        if not old:
            continue
        for i, label in TRACKED.items():
            a = old[i] if i < len(old) else None
            b = r[i] if i < len(r) else None
            # 新しく増やした列（前回は存在しない）は変更として数えない
            if i >= len(old) or a == b:
                continue
            log.append({"no": r[0], "date": date, "field": label, "before": a, "after": b})
            added += 1
    log = log[-3000:]
    log_file.write_text(
        "// 自動生成: tools/build-monsters.py。アップデートでスキルターンなどが変わったキャラの履歴\n"
        "window.PAD_MONSTER_CHANGES = " + json.dumps(log, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"変更: {added}件（履歴 {len(log)}件）")


def main():
    monsters = fetch("monster_list_full.json")
    skills = fetch("skill_list.json")
    leaders = fetch("leader_skill_list.json")
    updated = fetch("last_modified.json")["monster_list_full"]
    groups = transform_groups(monsters, skills)
    rows = []
    for no, m in sorted(monsters.items(), key=lambda kv: int(kv[0])):
        attrs = list(m.get("attributes") or [])
        # 一部の敵専用キャラは [0, 属性, 0] と1つずれて登録されている（例: 新百式5Fのプリシラ・テュオレ・カティア）
        if attrs and not attrs[0] and len(attrs) > 1 and attrs[1]:
            attrs = [attrs[1]] + attrs[2:]
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
            # タイプ（共鳴判定用）。0 は空き枠の埋め値として扱う
            ".".join(str(t) for t in (m.get("types") or []) if t),
            # 暗闇・お邪魔・毒耐性の%（通常20%、+は100%）。パーティー合計100%の判定用
            ".".join(str(min(100, sum(20 if a == n else 100 if a == p else 0 for a in awakens)))
                     for n, p in ((11, 68), (12, 69), (13, 70))),
            # スキルブーストの数（スキブ+ は2）
            sum(1 if a == 21 else 2 if a == 56 else 0 for a in awakens),
            # 耐久チェック用: リジェネ%:回復生成 / 最大HP（限界突破があればその値）/ HP覚醒の増減:チームHP強化の数 / LS
            endurance_numbers(m.get("skill"), skills),
            (m.get("overLimitParam") or {}).get("hp") or (m.get("maxParam") or {}).get("hp") or 0,
            f"{sum(3000 if a == 1 else -2500 if a == 65 else 0 for a in awakens)}:{awakens.count(46)}",
            leader_numbers(leaders.get(str(m.get("leaderSkill")))) if m.get("leaderSkill", 1) > 1 else "",
            # 「【◯ターン後に発動】」の◯（遅れて発動するスキル。なければ0）
            delayed_activation(m.get("skill"), skills),
            effect_durations(m.get("skill"), skills),
            # 属性ダメージ軽減の覚醒の数（火.水.木.光.闇、1個7%）
            ".".join(str(awakens.count(a)) for a in (4, 5, 6, 7, 8)) if any(a in awakens for a in (4, 5, 6, 7, 8)) else "",
            gravity_pct(m.get("skill"), skills),
            # Lv99の最大HP（Lv120 = Lv110 + Lv99最大HPの10%）
            (m.get("maxParam") or {}).get("hp") or 0,
            ".".join(str(a) for a in awakens if a in STAT_MULT_AWAKENS),
            (m.get("synchroAwaken") or {}).get("awaken") or 0,
            # 通常覚醒の全リスト（表示用）
            ".".join(str(a) for a in awakens),
            attr_changes(m.get("skill"), skills),
        ])
    record_changes(rows, updated)
    out = Path(__file__).resolve().parent.parent / "monsters-db.js"
    out.write_text(
        "// 自動生成: tools/build-monsters.py（出典: みんなで作るパズドラモンスターデータベース）\n"
        "// [No, 名前, 主属性, 副属性, アシスト可, スキル最短ターン, スキル能力タグ, 覚醒能力タグ, 覚醒アシスト, 変身グループ, 火力覚醒, 超覚醒, スキル数値, タイプ, 暗闇.お邪魔.毒耐性%, スキブ数, リジェネ%:回復生成, 最大HP, HP覚醒:チームHP強化数, LS軽減%|HP倍率, ◯ターン後に発動, 能力ごとの効果ターン, 属性軽減覚醒の数 火.水.木.光.闇, グラビティ%, Lv99最大HP, 全パラ系覚醒, シンクロ覚醒, 通常覚醒, 属性変更]\n"
        f"// 更新: {updated}\n"
        "window.PAD_AWAKEN_NAMES = " + json.dumps({k: v["name"] for k, v in AWAKENS.items() if k.isdigit()}, ensure_ascii=False, separators=(",", ":")) + ";\n"
        f"window.PAD_MONSTER_DB = {{ updated: {json.dumps(updated)}, rows: "
        + json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
        + " };\n",
        encoding="utf-8",
    )
    print(f"{len(rows)}体 → {out}（{out.stat().st_size // 1024}KB）")


if __name__ == "__main__":
    main()
