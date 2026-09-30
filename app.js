"use strict";

const DATA_KEY = "pad-farming:data";
const BOX_KEY = "pad-farming:box";
// ロード・リザルト画面などダンジョン外で1周ごとにかかる秒数
const RUN_OVERHEAD_SEC = 20;
// 経験値効率で並べるモード → evaluate() の値の名前
// 効率順のモード。素材で探す時は探している素材の効率、ダンジョンで探す時は経験値の効率で並べる
const EXP_MODES = { expHour: "effPerHour", expStamina: "effPerStamina" };
const MODE_WEIGHTS = {
  ease: { speed: 0.25, ease: 0.75 },
  balance: { speed: 0.5, ease: 0.5 },
  speed: { speed: 0.8, ease: 0.2 },
};
// 楽さの内訳の重み（合計1）。クリアターン・レシートの長さ・複雑さ・+891必須かどうか
const EASE_WEIGHTS = { turns: 0.3, length: 0.3, complexity: 0.25, plus891: 0.15 };
const PENALTY_MISSING = 35; // 代用も見つからない枠1つあたり
const PENALTY_SUBSTITUTE = 5;
const SUB_SLOTS = 4; // パズドラの編成は リーダー1 + サブ4 + フレンド1 の6体 // 代用で埋めた枠1つあたり（火力・耐久が落ちる想定）

// ---------- 保存 ----------
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 保存できない環境でも動作は続ける */
  }
}

// 旧バージョンの架空サンプルが保存されていたら実データの初期データに置き換える
let db = loadJSON(DATA_KEY, null);
if (!db || db.sample) db = structuredClone(window.PAD_SEED);
else if ((db.version ?? 0) < window.PAD_SEED.version) {
  // 初期データが更新されていたら、同じidは上書き・新しいidは追加（自分で取り込んだデータは残す）
  for (const k of ["monsters", "items", "dungeons", "teams"]) {
    for (const rec of window.PAD_SEED[k]) {
      const i = db[k].findIndex((x) => x.id === rec.id);
      if (i >= 0) db[k][i] = structuredClone(rec);
      else db[k].push(structuredClone(rec));
    }
  }
  // 初期データ側で統合・削除したダンジョンは消し、そこにあった編成は統合先へ移す
  const removed = new Set(window.PAD_SEED.removed?.dungeons ?? []);
  db.dungeons = db.dungeons.filter((d) => !removed.has(d.id));
  const removedTeams = new Set(window.PAD_SEED.removed?.teams ?? []);
  db.teams = db.teams.filter((t) => !removedTeams.has(t.id));
  for (const t of db.teams) {
    if (!removed.has(t.dungeonId)) continue;
    const seedTeam = window.PAD_SEED.teams.find((x) => x.id === t.id);
    if (seedTeam) t.dungeonId = seedTeam.dungeonId;
  }
  db.version = window.PAD_SEED.version;
  saveJSON(DATA_KEY, db);
}
let box = new Set(loadJSON(BOX_KEY, []));
let mode = "balance";
let searchType = "item"; // "item"(素材で探す) | "dungeon"(ダンジョンで探す)
const SEARCH_TYPES = {
  item: { label: "集めたい素材", placeholder: "例: スパノエ、プラス", noun: "素材" },
  dungeon: { label: "周回したいダンジョン", placeholder: "例: 万寿、ノエル大集合", noun: "ダンジョン" },
};

// 図鑑（monsters-db.js）: No → [No, 名前, 主属性, 副属性, アシスト可]
const MDB_ROWS = window.PAD_MONSTER_DB?.rows ?? [];
const MDB = new Map(MDB_ROWS.map((r) => [r[0], r]));
const parseNo = (s) => {
  const m = String(s).trim().match(/^(?:no\.?\s*)?(\d{1,5})$/i);
  return m ? Number(m[1]) : null;
};

// No. か名前で図鑑を引く。名前は完全一致を優先
function lookupMonster(query) {
  const no = parseNo(query);
  if (no != null) return MDB.get(no) ?? null;
  const q = String(query).trim();
  return MDB_ROWS.find((r) => r[1] === q) ?? null;
}

function searchMonsterDB(query, limit = 20) {
  const no = parseNo(query);
  if (no != null) return MDB.has(no) ? [MDB.get(no)] : [];
  const n = norm(query);
  if (!n) return [];
  const hits = [];
  // 新しいモンスターほど周回で使われやすいので、No.の大きい順に出す
  for (let i = MDB_ROWS.length - 1; i >= 0 && hits.length < limit; i--) {
    if (norm(MDB_ROWS[i][1]).includes(n)) hits.push(MDB_ROWS[i]);
  }
  return hits;
}

const padmdbUrl = (no) => `https://padmdb.rainbowsite.net/monster/${no}`;

// 変身前後は同じキャラとして扱う（図鑑の変身グループ番号。変身しないキャラはNo.そのもの）
const familyOf = (no) => (no && MDB.get(no)?.[9]) || no;
const sameChara = (a, b) => a && b && familyOf(a) === familyOf(b);

const byId = (list, id) => list.find((x) => x.id === id);
const monster = (id) => byId(db.monsters, id);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (sel) => document.querySelector(sel);

function persist() {
  easeRangeCache = null;
  // 共有データ（shared: true）は公開ページの共有DBから毎回読み込むので、ブラウザには保存しない
  saveJSON(DATA_KEY, { ...db, teams: db.teams.filter((t) => !t.shared), dungeons: db.dungeons.filter((d) => !d.shared) });
}

// ---------- 検索 ----------
// よく使われる略称 → 正式名。データ側の aliases（取り込み時の「別名:」）と併用される
const BUILTIN_ALIASES = {
  スパノエ: "スーパーノエルドラゴン",
  スーパーノエル: "スーパーノエルドラゴン",
};

// ひらがな→カタカナ、全角英数→半角、空白・中黒除去、小文字化
function norm(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/[\s・]/g, "")
    .toLowerCase();
}

function canonicalName(q) {
  const n = norm(q);
  const hit = Object.entries(BUILTIN_ALIASES).find(([a]) => norm(a) === n);
  return hit ? hit[1] : q.trim();
}

const namesOf = (rec) => [rec.name, ...(rec.aliases ?? [])].map(norm);
const exactMatches = (list, q) => list.filter((r) => namesOf(r).includes(norm(q)));
const partialMatches = (list, q) => list.filter((r) => namesOf(r).some((x) => x.includes(norm(q))));
function matchRecords(list, q) {
  const exact = exactMatches(list, q);
  return exact.length ? exact : partialMatches(list, q);
}

// 入力文字列を、選択中の検索種別（ダンジョン or 素材）で解決する
// canonical: 略称を正式名に直したもの（未登録時の案内に使う）
function resolveQuery(q, type) {
  q = q.trim();
  const canonical = canonicalName(q);
  const none = { dungeons: [], item: null, canonical };
  if (!q) return none;
  // 完全一致を優先し、なければ部分一致
  for (const match of [exactMatches, partialMatches]) {
    for (const key of new Set([q, canonical])) {
      if (type === "dungeon") {
        const dungeons = match(db.dungeons, key);
        if (dungeons.length) return { dungeons, item: null, canonical };
      } else {
        const item = match(db.items, key)[0];
        if (item) {
          const dungeons = db.dungeons.filter((d) => d.drops.some((x) => x.itemId === item.id));
          return { dungeons, item, canonical };
        }
      }
    }
  }
  return none;
}

// 枠ごとの所持状況と代用候補
// ---------- 代用検索（スキル・覚醒の能力ベース） ----------
const GIMMICK_LABEL = {
  dmgVoid: "ダメージ無効", dmgAbsorb: "ダメージ吸収", attrAbsorb: "属性吸収", comboAbsorb: "コンボ吸収",
  resolve: "根性・超根性", assistVoid: "アシスト無効", skillSeal: "スキル封印", awakenVoid: "覚醒無効",
  board54: "5×4盤面", roulette: "ルーレット", cloud: "雲", tape: "操作不可", skillDelay: "スキル遅延",
  weakenAwaken: "弱体化目覚め", healDown: "回復力低下", defenseUp: "防御力増加", lock: "ロック",
  bomb: "爆弾", spike: "トゲ", poison: "毒・猛毒", jammer: "お邪魔", comboDown: "コンボ減少",
  unerasable: "消せないドロップ", atkDown: "攻撃力デバフ", buffClear: "スキル効果解除",
  bigHit: "大ダメージ・割合ダメージ", darkness: "暗闇", damageCap: "ダメージ上限変更",
  maxHpDown: "最大HP減少", timeDown: "操作時間減少", bind: "バインド", shield: "シールド",
};
// ギミック → 対策になる能力
const GIMMICK_COUNTERS = {
  dmgVoid: ["voidPierce", "voidPierceAwk"], dmgAbsorb: ["dmgAbsorbNull"], attrAbsorb: ["attrAbsorbNull"],
  comboAbsorb: ["comboAbsorbNull", "comboAdd"], assistVoid: ["levitate", "assistVoidResist"],
  skillSeal: ["sealResist"], awakenVoid: ["awakenHeal"], board54: ["board76", "board65"], unerasable: ["unerasableHeal"], shield: ["shieldBreak"],
  skillDelay: ["delayResist"], weakenAwaken: ["dropEnhance", "dropEnhanceAwk"], cloud: ["cloudResist"], tape: ["tapeResist"],
  darkness: ["darkResist"], jammer: ["jammerResist", "afternoonTea"], poison: ["poisonResist", "afternoonTea"],
  lock: ["lockRelease"], bind: ["bindResist", "bindHeal", "bindHealAwk"], comboDown: ["comboAdd"],
  timeDown: ["fingers", "timeResist"], bigHit: ["reduce", "hpUp"], maxHpDown: ["hpUp"],
  healDown: ["heal", "regen"], damageCap: ["capUp"], defenseUp: ["guardBreak"], resolve: ["fixedDmg", "gravity"],
};
const CAP_LABEL = {
  voidPierce: "無効貫通", voidPierceAwk: "無効貫通(覚醒)", dmgAbsorbNull: "ダメージ吸収無効", attrAbsorbNull: "属性吸収無効",
  comboAbsorbNull: "コンボ吸収無効", unerasableHeal: "消せないドロップ回復", shieldBreak: "シールド破壊", dropEnhanceAwk: "強化ドロップ目覚め", board76: "7×6化", board65: "6×5化", delay: "遅延", reduce: "軽減", hpUp: "HP倍率",
  heal: "回復", regen: "リジェネ", enhance: "エンハンス", capUp: "上限解放", comboAdd: "コンボ加算", noSkyfall: "落ちコンなし",
  lockRelease: "ロック解除", awakenHeal: "覚醒無効回復", bindHeal: "バインド回復", gravity: "割合ダメージ", fixedDmg: "固定ダメージ",
  orbChange: "ドロップ変換", boardRefresh: "陣", attrChange: "属性変化", transform: "変身", delayResist: "遅延耐性",
  sealResist: "封印耐性", levitate: "浮遊", assistVoidResist: "アシスト無効耐性", cloudResist: "雲耐性",
  tapeResist: "操作不可耐性", darkResist: "暗闇耐性", jammerResist: "お邪魔耐性", poisonResist: "毒耐性",
  afternoonTea: "紅茶", bindResist: "バインド耐性", bindHealAwk: "バインド回復(覚醒)", dropEnhance: "ドロップ強化", teamHp: "チームHP強化", resonance: "共鳴",
  combo7: "7コンボ強化", combo10: "10コンボ強化", combo15: "15コンボ強化", lShape: "L字", tShape: "T字", cross: "十字",
  row: "列強化", guardBreak: "ガードブレイク", fingers: "操作時間延長", timeResist: "操作時間変更耐性",
  partBreak: "部位破壊", aging: "熟成", fixedDmgAwk: "追加攻撃", skillBoost: "スキブ", oneShotAssist: "使い切り", haste: "ヘイスト",
};
// 編成内でこの枠しか持っていなければ重要とみなすスキル能力
const KEY_SKILL_CAPS = new Set(["voidPierce", "dmgAbsorbNull", "attrAbsorbNull", "comboAbsorbNull", "board76", "board65",
  "awakenHeal", "bindHeal", "reduce", "hpUp", "enhance", "capUp", "comboAdd", "noSkyfall", "delay", "gravity",
  "fixedDmg", "lockRelease", "haste"]);
const TURN_TOLERANCE = 5;
const MAJOR_WEIGHT = 5; // これ以上の重みの能力を「重要」として目立たせる（未満は耐性など） // スキルターンのずれの許容（本人指定: 3〜5ターンなら可、ずれは表示）
CAP_LABEL.enhanceZentai = "全体エンハンス";
CAP_LABEL.enhanceKobetsu = "個別エンハンス";
const capLabel = (c) =>
  CAP_LABEL[c] ?? (c.startsWith("enhanceType:") ? `全体エンハンス（${c.slice(12)}タイプ）` : c.startsWith("enhanceAttr:") ? `全体エンハンス（${c.slice(12)}属性）` : c);

// ---------- 火力覚醒 ----------
// 覚醒番号 → [種類, 倍率]（padmdb の覚醒データの damage_multiplier など。条件付きの倍率は条件を満たした時の値）
// 種類 "stat" は条件なしで常にかかる全パラメータ系
const DMG_AWK = {
  27: ["2way", 2.2], 96: ["2way", 4.84], 43: ["c7", 2], 107: ["c7", 4], 61: ["c10", 5], 111: ["c10", 25], 144: ["c15", 100],
  60: ["L", 2.2], 108: ["L", 4.84], 59: ["healL", 3], 126: ["T", 8], 78: ["cross", 3], 110: ["cross", 9],
  48: ["vp", 3.5], 109: ["vp", 12.25], 79: ["col3", 3.5], 112: ["col3", 12.25], 80: ["col4", 4.5], 113: ["col4", 20.25],
  81: ["col5", 5], 114: ["col5", 25], 82: ["link", 12], 57: ["hpHigh", 10], 58: ["hpLow", 10],
  73: ["attrCombo", 1.3], 74: ["attrCombo", 1.3], 75: ["attrCombo", 1.3], 76: ["attrCombo", 1.3], 77: ["attrCombo", 1.3],
  121: ["attrCombo", 1.6], 122: ["attrCombo", 1.6], 123: ["attrCombo", 1.6], 124: ["attrCombo", 1.6], 125: ["attrCombo", 1.6],
  22: ["row", 1.3], 23: ["row", 1.3], 24: ["row", 1.3], 25: ["row", 1.3], 26: ["row", 1.3],
  116: ["row", 1.9], 117: ["row", 1.9], 118: ["row", 1.9], 119: ["row", 1.9], 120: ["row", 1.9],
  44: ["gb", 3], 133: ["dual", 50], 134: ["dual", 50], 135: ["dual", 50], 141: ["multi", 50],
  71: ["jammerKago", 10], 72: ["poisonKago", 10], 128: ["kago", 5], 129: ["kago", 5],
  31: ["killer", 5], 32: ["killer", 5], 33: ["killer", 5], 34: ["killer", 5], 35: ["killer", 5], 36: ["killer", 5], 37: ["killer", 5], 38: ["killer", 5],
  127: ["stat", 1.5], 142: ["stat", 1.8], 138: ["stat", 3], 139: ["stat", 3], 145: ["stat", 1.5], 146: ["stat", 1.5], 147: ["stat", 1.5],
};
const AWAKEN_NAME = { 27: "2体攻撃", 96: "2体攻撃＋", 43: "コンボ強化", 107: "コンボ強化+", 61: "超コンボ強化", 111: "超コンボ強化＋", 144: "超絶コンボ強化",
  60: "L字消し攻撃", 108: "L字消し攻撃+", 59: "回復L字消し", 126: "T字消し攻撃", 78: "十字消し攻撃", 110: "十字消し攻撃＋", 48: "ダメージ無効貫通",
  109: "ダメージ無効貫通＋", 79: "3色攻撃強化", 112: "3色攻撃強化＋", 80: "4色攻撃強化", 113: "4色攻撃強化＋", 81: "5色攻撃強化", 114: "5色攻撃強化＋",
  82: "超つなげ消し強化", 57: "HP50%以上強化", 58: "HP50%以下強化", 44: "ガードブレイク", 127: "全パラメータ強化", 142: "全パラメータ強化＋",
  31: "ドラゴンキラー", 32: "神キラー", 33: "悪魔キラー", 34: "マシンキラー", 35: "バランスキラー", 36: "攻撃キラー", 37: "体力キラー", 38: "回復キラー" };
const DMG_LABEL = {
  "2way": "2体攻撃", c7: "7コンボ強化", c10: "10コンボ強化", c15: "15コンボ強化", L: "L字", healL: "回復L字", T: "T字",
  cross: "十字", vp: "無効貫通", col3: "3色", col4: "4色", col5: "5色", link: "超つなげ", hpHigh: "HP50%以上",
  hpLow: "HP50%以下", attrCombo: "属性コンボ強化", row: "列強化", gb: "ガードブレイク", dual: "2属性同時", multi: "達人多色",
  jammerKago: "お邪魔の加護", poisonKago: "毒の加護", kago: "陰陽の加護", killer: "キラー", stat: "全パラ系",
};

// 本体の火力覚醒を種類ごとの倍率にまとめる（同じ種類は掛け算）
function firepowerOf(no) {
  const out = {};
  for (const id of String(MDB.get(no)?.[10] ?? "").split(".").filter(Boolean)) {
    const [type, mult] = DMG_AWK[id] ?? [];
    if (type) out[type] = (out[type] ?? 1) * mult;
  }
  return out;
}

// 元のキャラが持つ火力覚醒の条件で比べる（元が組んでいた消し方を代用でも組む想定）
// 超覚醒（どれか1つを選んで付けられる）を1つ足した火力覚醒の候補
function firepowerChoices(no) {
  const base = firepowerOf(no);
  const out = [{ fp: base, sa: null }];
  for (const id of String(MDB.get(no)?.[11] ?? "").split(".").filter(Boolean)) {
    const [type, mult] = DMG_AWK[id] ?? [];
    if (!type) continue;
    out.push({ fp: { ...base, [type]: (base[type] ?? 1) * mult }, sa: Number(id) });
  }
  return out;
}

function compareFirepower(origNo, candNo) {
  // 元のキャラは超覚醒込みで一番強い形、候補も元の条件に一番合う超覚醒を選んだ形で比べる
  const origBest = firepowerChoices(origNo).reduce((a, b) => (fpScore(b.fp, b.fp) > fpScore(a.fp, a.fp) ? b : a));
  const o = origBest.fp;
  const types = Object.keys(o).filter((t) => t !== "stat");
  const prod = (f) => types.reduce((x, t) => x * (f[t] ?? 1), 1) * (f.stat ?? 1);
  const candBest = firepowerChoices(candNo).reduce((a, b) => (prod(b.fp) > prod(a.fp) ? b : a));
  const c = candBest.fp;
  const orig = prod(o);
  const cand = prod(c);
  const lost = types.filter((t) => (c[t] ?? 1) < o[t]);
  return { orig, cand, ratio: orig ? cand / orig : 1, lost, candSA: candBest.sa, origSA: origBest.sa };
}
const fpScore = (f) => Object.values(f).reduce((x, v) => x * v, 1);

const fmtMult = (x) => (x >= 100 ? Math.round(x).toLocaleString() : x >= 10 ? x.toFixed(0) : x.toFixed(1)) + "倍";

// 作者がレシートで挙げた代用（team.endorsedAlts）から、対象No.の分を探す
function endorsedFor(team, targetNo) {
  if (!targetNo) return null;
  return team.endorsedAlts?.find((e) => familyOf(e.target) === familyOf(targetNo)) ?? null;
}

// 代用の評価（Firebase の subVotes から集計）。キー: 編成id|枠の本体No.|候補No.
const subVotes = new Map();
function voteKey(teamId, mem, candNo) {
  return `${teamId}|${monster(mem.id)?.no ?? mem.id}|${familyOf(candNo)}`;
}
function votesFor(teamId, mem, candNo) {
  return subVotes.get(voteKey(teamId, mem, candNo)) ?? { ok: 0, ng: 0 };
}
// 「回れなかった」の理由（任意）。代用の判定を直すときの手がかりにする
const NG_REASONS = ["火力不足", "耐久不足", "スキルが間に合わない", "ギミック対策が足りない", "効果ターンが足りない", "パズル・操作が難しい", "その他"];

const assistNoOf = (mem) => Number(String(mem.assist ?? "").match(/No\.?\s*(\d+)/)?.[1]) || null;

// 図鑑1体分の能力。アシストとして付ける場合、覚醒は武器（覚醒アシスト持ち）のときだけ本体に付く
// 変身キャラは変身前後でスキルが違うので、本体として使う場合は同じ変身グループ全員のスキルを合わせる
const familyRows = new Map();
for (const r of MDB_ROWS) if (r[9]) (familyRows.get(r[9]) ?? familyRows.set(r[9], []).get(r[9])).push(r);

function capsOfNo(no, asAssist) {
  const row = MDB.get(no);
  if (!row) return null;
  const skill = new Set(), awk = new Set();
  let haste = 0;
  const skillRows = !asAssist && row[9] ? familyRows.get(row[9]) : [row];
  for (const t of skillRows.flatMap((r) => (r[6] ?? "").split(",")).filter(Boolean)) {
    if (/^h\d+$/.test(t)) haste = Math.max(haste, Number(t.slice(1)));
    else if (t.startsWith("grant:")) awk.add(t.slice(6)); // スキルで付与される覚醒
    else skill.add(t);
  }
  if (haste) skill.add("haste");
  if (!asAssist || row[8]) for (const t of (row[7] ?? "").split(",").filter(Boolean)) awk.add(t);
  return { skill, awk, all: new Set([...skill, ...awk]), turn: row[5] || 0, haste, row };
}

// 枠（本体＋アシスト）全体の能力
// 暗闇・お邪魔・毒耐性の%（武器は覚醒アシスト持ちのときだけ）
const RESIST_KEYS = ["darkResist", "jammerResist", "poisonResist"];
function resistOf(no, asAssist) {
  const row = MDB.get(no);
  if (!row || (asAssist && !row[8])) return [0, 0, 0];
  return String(row[14] ?? "0.0.0").split(".").map(Number);
}
// パーティー全体の耐性%（mem の part を candNo に差し替えた場合）
function teamResist(team, mem, part, candNo) {
  const total = [0, 0, 0];
  for (const m of team.members.filter((x) => !team.multi || x.p === mem.p)) {
    const b = m === mem && part === "base" ? candNo : monster(m.id)?.no;
    const a = m === mem && part === "assist" ? candNo : assistNoOf(m);
    [resistOf(b, false), a ? resistOf(a, true) : [0, 0, 0]].forEach((r) => r.forEach((v, i) => (total[i] += v)));
  }
  return total;
}

// パーティー全体のスキブ数（mem の part を candNo に差し替えた場合。candNo 省略で元の編成）
function teamSkillBoost(team, mem, part, candNo) {
  let n = 0;
  for (const m of team.members.filter((x) => !team.multi || x.p === mem.p)) {
    const b = candNo && m === mem && part === "base" ? candNo : monster(m.id)?.no;
    const a = candNo && m === mem && part === "assist" ? candNo : assistNoOf(m);
    n += MDB.get(b)?.[15] ?? 0;
    const ar = a && MDB.get(a);
    if (ar?.[8]) n += ar[15] ?? 0;
  }
  return n;
}

// 共鳴: 本体と武器の主属性が同じ、かつタイプが1つ以上一致
function resonates(baseNo, assistNo) {
  const b = MDB.get(baseNo);
  const a = MDB.get(assistNo);
  if (!b || !a || !b[2] || b[2] !== a[2]) return false;
  const bt = new Set(String(b[13] ?? "").split(".").filter(Boolean));
  return String(a[13] ?? "").split(".").some((t) => t && bt.has(t));
}

function slotCaps(baseNo, assistNo) {
  const b = baseNo ? capsOfNo(baseNo, false) : null;
  const a = assistNo ? capsOfNo(assistNo, true) : null;
  const caps = new Set([...(b?.all ?? []), ...(a?.all ?? [])]);
  if (baseNo && assistNo && resonates(baseNo, assistNo)) caps.add("resonance");
  return caps;
}

const dungeonGimmicks = (d) => {
  const g = d.gimmicks;
  if (!g) return [];
  return [...g.all.map((k) => ({ key: k, sure: true })), ...g.partial.map((p) => ({ key: p.key, sure: false, sites: p.sites }))];
};

// 枠が失うと困る能力とその理由
function importantCaps(mem, team, dungeon) {
  const baseNo = monster(mem.id)?.no;
  const mine = slotCaps(baseNo, assistNoOf(mem));
  // 重み: スキルによるギミック対策10、編成内でこの枠だけのスキル8、覚醒の耐性など3。
  // 片方のサイトにしか載っていないギミックへの対策は半分
  const skillCaps = new Set([...(capsOfNo(baseNo, false)?.skill ?? []), ...(capsOfNo(assistNoOf(mem), true)?.skill ?? [])]);
  const reasons = new Map();
  const put = (c, why, weight) => {
    if (!reasons.has(c) || reasons.get(c).weight < weight) reasons.set(c, { why, weight });
  };
  for (const g of dungeonGimmicks(dungeon)) {
    for (const c of GIMMICK_COUNTERS[g.key] ?? []) {
      if (!mine.has(c)) continue;
      const w = (skillCaps.has(c) ? 10 : 3) * (g.sure ? 1 : 0.5);
      put(c, `${GIMMICK_LABEL[g.key]}対策${g.sure ? "" : `（${g.sites.join("・")}のみ記載）`}`, w);
    }
  }
  const others = team.members.filter((m) => m !== mem && (!team.multi || m.p === mem.p));
  const otherCaps = new Set(others.flatMap((m) => [...slotCaps(monster(m.id)?.no, assistNoOf(m))]));
  for (const c of mine) if (KEY_SKILL_CAPS.has(c) && !otherCaps.has(c)) put(c, "編成内でこの枠だけ", 8);
  // 作者本人が説明した役割は最優先で上書き。チーム全体でどこかにあればいい役割（ヘイスト等）は軽くする
  for (const sr of team.slotRoles ?? []) {
    const hit = sr.part === "assist" ? familyOf(assistNoOf(mem)) === familyOf(sr.target) : familyOf(baseNo) === familyOf(sr.target);
    if (!hit) continue;
    // 作者が「役割ではない」とした能力は推定から外す
    for (const c of sr.notRoles ?? []) reasons.delete(c);
    // 作者が「挙げた役割以外は不要」とした枠（スキルを使わない武器など）はギミックからの推定を捨てる
    if (sr.onlyListed && sr.part === "assist") {
      const baseAll = capsOfNo(baseNo, false)?.all ?? new Set();
      for (const [k, v] of reasons) if (!v.byAuthor && !baseAll.has(k)) reasons.delete(k);
    }
    for (const r of sr.roles) {
      const why = `${r.why}（${sr.source}）`;
      if (r.note) reasons.set(r.cap, { why, weight: 0, note: true, byAuthor: true, part: sr.part });
      else if (r.optional) reasons.set(r.cap, { why, weight: 4, optional: true, byAuthor: true, part: sr.part });
      else if (r.teamWide) reasons.set(r.cap, { why, weight: 3, teamWide: true, byAuthor: true, part: sr.part });
      else reasons.set(r.cap, { why, weight: 15, minDur: r.minDur ?? null, minHaste: r.minHaste ?? null, fireAtFloor: r.fireAtFloor ?? null, activeAtTurn: r.activeAtTurn ?? null, activeFloor: r.activeFloor ?? null, mustBeBase: !!r.mustBeBase, part: sr.part, author: true, byAuthor: true });
    }
  }
  return reasons;
}

const ownedNos = () => new Set(db.monsters.filter((m) => m.no && box.has(m.id)).map((m) => m.no));
// 所持判定用: 変身前後どちらを持っていても所持扱い
const ownedFamilies = () => new Set([...ownedNos()].map(familyOf));

// 欠けている部品（本体 or アシスト）の代用候補を、重要能力をどれだけ守れるかで並べる
// pool: "owned"（手持ちBOXから）/ "all"（図鑑全体から。手持ちを上に並べる）
let currentDungeon = null;
// 能力ごとの効果ターン（本体として使う変身キャラは変身前後の最大）。その能力の記載がなければ null
function capDur(no, cap, asBase) {
  const row = MDB.get(no);
  if (!row) return null;
  const rows = asBase && row[9] ? familyRows.get(row[9]) : [row];
  let best = null;
  for (const r of rows.filter(Boolean)) {
    for (const kv of String(r[21] ?? "").split(",").filter(Boolean)) {
      const [k, v] = kv.split(":");
      if (k === cap) best = Math.max(best ?? 0, Number(v));
    }
  }
  return best;
}

function findSubstitutes(part, mem, important, team, { pool = "owned", limit = 3 } = {}) {
  currentDungeon = db.dungeons.find((d) => d.id === team.dungeonId) ?? null;
  const baseNo = monster(mem.id)?.no;
  const assistNo = assistNoOf(mem);
  const orig = capsOfNo(part === "base" ? baseNo : assistNo, part === "assist");
  const used = new Set(team.members.flatMap((m) => [monster(m.id)?.no, assistNoOf(m)]).filter(Boolean).map(familyOf));
  const owned = ownedFamilies();
  const out = [];
  const nos = pool === "all" ? MDB_ROWS.map((r) => r[0]) : ownedNos();
  // 元の編成が武器のスキルを使っていて、元の本体が変身キャラでないなら、変身キャラは本体の代用にしない（作者談）
  const weaponUsed = assistNo && !(team.slotRoles ?? []).some((sr) => sr.part === "assist" && familyOf(sr.target) === familyOf(assistNo) && sr.roles.some((r) => r.cap === "skillFree"));
  const noTransform = part === "base" && weaponUsed && !MDB.get(baseNo)?.[9];
  for (const no of nos) {
    if (used.has(familyOf(no))) continue;
    const row = MDB.get(no);
    if (!row || (part === "assist" && !row[4])) continue;
    // 本体の代用に装備（覚醒アシスト持ちの武器）は使えない
    if (part === "base" && row[8]) continue;
    if (noTransform && row[9]) continue;
    const cand = capsOfNo(no, part === "assist");
    const caps = part === "base" ? slotCaps(no, assistNo) : slotCaps(baseNo, no);
    // 耐性は「パーティー全体で100%あればよい」（作者談）。足りていればこの枠になくても保持扱い
    const tr = teamResist(team, mem, part, no);
    RESIST_KEYS.forEach((k, i) => {
      if (!important.get(k)?.teamWide) return;
      if (tr[i] >= 100) caps.add(k);
      else caps.delete(k);
    });
    // スキブは「サノス等が必要な階で使えるだけ」が条件。元の編成の合計を下回らなければ保持扱い
    let sbShort = 0;
    if (important.get("skillBoost")?.byAuthor) {
      const need = teamSkillBoost(team, mem);
      const got = teamSkillBoost(team, mem, part, no);
      if (got >= need) caps.add("skillBoost");
      else {
        caps.delete("skillBoost");
        sbShort = need - got;
      }
    }
    const keys = [...important.keys()].filter((k) => !important.get(k).note);
    const kept = keys.filter((c) => caps.has(c));
    const lost = keys.filter((c) => !caps.has(c));
    const w = (list) => list.reduce((sum, c) => sum + important.get(c).weight, 0);
    // スキルを使わない武器（作者が「スキルは何でもよい」とした枠）はターン・倍率を比べない
    const skillFree = part === "assist" && important.has("skillFree");
    const turnDiff = !skillFree && orig?.turn && cand.turn ? cand.turn - orig.turn : 0;
    const endorsedHit = endorsedFor(team, part === "base" ? baseNo : assistNo)?.nos.some((n) => familyOf(n) === familyOf(no));
    if (!endorsedHit && turnDiff > TURN_TOLERANCE) continue; // スキルターンが短いのは不利にならないので、重い場合だけ除外
    if (!endorsedHit && !kept.length && important.size) continue;
    const hasteDiff = !skillFree && orig?.haste ? cand.haste - orig.haste : 0;
    // 変身キャラ（本体として使う場合）は変身前後のうち長い方の効果ターン・大きい方の倍率
    const skillNums = (r) => {
      const rows = part === "base" && r?.[9] ? familyRows.get(r[9]) : [r];
      return rows.filter(Boolean).reduce(([d, m], x) => {
        const [dd, mm] = String(x[12] ?? "0:0").split(":").map(Number);
        return [Math.max(d, dd), Math.max(m, mm)];
      }, [0, 0]);
    };
    const [oDur, oMult] = skillNums(orig?.row);
    const [cDur, cMult] = skillNums(row);
    const durDiff = !skillFree && oDur && cDur ? cDur - oDur : 0;
    // 持続ターンの条件は、その役割を担っている部品（本体 or アシスト）を置き換える時だけ見る
    // 必要な持続は、その役割の能力そのものの効果ターンで比べる（別の効果の長いターン数に惑わされない）
    const durRole = [...important].filter(([, v]) => (!v.part || v.part === part) && v.minDur).sort((a, b) => b[1].minDur - a[1].minDur)[0];
    const needDur = durRole?.[1].minDur ?? 0;
    const roleDur = durRole ? capDur(no, durRole[0], part === "base") ?? cDur : cDur;
    const durShort = needDur && roleDur < needDur ? needDur : 0;
    // ヘイスト量と「◯Fで使えるか」（スキルターンが元より重いと、元と同じ階では溜まっていない）
    const partRoles = [...important.values()].filter((v) => !v.part || v.part === part);
    const needHaste = Math.max(0, ...partRoles.map((v) => v.minHaste ?? 0));
    const hasteShort = needHaste && cand.haste < needHaste ? needHaste : 0;
    const fireFloor = partRoles.find((v) => v.fireAtFloor)?.fireAtFloor ?? null;
    const lateFire = fireFloor && orig?.turn && cand.turn > orig.turn ? fireFloor : 0;
    // アシスト無効の階より後で使う役割を、武器（アシスト）のスキルで担うとスキルターンがリセットされる
    const avFloors = (typeof currentDungeon !== "undefined" && currentDungeon?.gimmickFloors?.assistVoid) || [];
    const resetRisk = part === "assist" && partRoles.some((v) => v.fireAtFloor && avFloors.some((f) => f < v.fireAtFloor))
      ? avFloors.filter((f) => partRoles.some((v) => v.fireAtFloor > f))[0] : 0;
    const multRatio = !skillFree && oMult > 1 && cMult > 0 ? cMult / oMult : null;
    let score = w(kept) - w(lost) - Math.abs(turnDiff) - Math.abs(hasteDiff) * 2 - Math.max(0, -durDiff) * 1.5;
    if (multRatio) score += Math.max(-6, Math.min(3, Math.log2(multRatio) * 3));
    if (durShort) score -= 20;
    if (hasteShort) score -= 15;
    if (lateFire) score -= 15;
    if (resetRisk) score -= 15;
    if (sbShort) score -= sbShort * 4;
    // 「◯Fで使って、◯ターン目まで効果が必要」（遅れて発動するスキルも含む）: 使ったターンを1として数える
    const activeEntry = [...important].find(([, v]) => (!v.part || v.part === part) && v.activeAtTurn);
    const activeRole = activeEntry?.[1];
    let activeShort = null;
    if (activeRole) {
      const dly = row[20] || 0;
      const T = activeRole.activeAtTurn;
      const dur = capDur(no, activeEntry[0], part === "base");
      // 「◯Fで使って◯Fまで効果」は必須条件。その能力がない・効果が届かない候補は出さない（作者公認の代用は除く）
      if (dur == null || !(1 + dly <= T && dly + dur >= T)) {
        if (!endorsedHit) continue;
        activeShort = { T, dly, dur: dur ?? 0, floor: activeRole.activeFloor, use: activeRole.fireAtFloor ?? 1 };
      }
    }
    // 作者がレシートで挙げている代用は最優先
    const endorsed = endorsedFor(team, part === "base" ? baseNo : assistNo);
    const isEndorsed = endorsed?.nos.some((n) => familyOf(n) === familyOf(no));
    if (isEndorsed) score += 100;
    // 使った人の評価（回れた +、回れなかった −）
    const v = votesFor(team.id, mem, no);
    score += (v.ok - v.ng) * 4;
    let attr = null;
    let fire = null;
    if (part === "base" && orig?.row) {
      // 本体は属性（主・副）と火力覚醒の倍率も比べる
      attr = { main: [orig.row[2], row[2]], sub: [orig.row[3], row[3]] };
      if (row[2] !== orig.row[2]) score -= 15;
      if (row[3] !== orig.row[3]) score -= 3;
      fire = compareFirepower(baseNo, no);
      score += Math.max(-30, Math.min(4, Math.log2(fire.ratio) * 3));
    } else if (orig?.row && row[2] === orig.row[2]) {
      score += 3;
    }
    const major = (list) => list.filter((c) => important.get(c).weight >= MAJOR_WEIGHT);
    const isOwned = owned.has(familyOf(no));
    out.push({ no, name: row[1], kept, lost, keptMajor: major(kept), lostMajor: major(lost), turnDiff, hasteDiff, durDiff, durShort, cDur: roleDur, hasteShort, candHaste: cand.haste, lateFire, resetRisk, sbShort, activeShort, candTurn: cand.turn, origTurn: orig?.turn, multRatio, score, owned: isOwned, attr, fire, endorsed: isEndorsed, votes: v });
  }
  // 図鑑全体から探す時は、手持ちにいるキャラを先に並べる
  const rank = (c) => (pool === "all" && c.owned ? 1e6 : 0) + c.score;
  return out.sort((a, b) => rank(b) - rank(a)).slice(0, limit);
}

// 枠ごとの所持状況と代用候補
function analyzeMember(mem, team, boxActive, dungeon) {
  const m = monster(mem.id);
  const base = {
    mem, m, need: [], subs: [], teamId: team.id, idx: team.members.indexOf(mem),
    important: dungeon ? importantCaps(mem, team, dungeon) : new Map(),
  };
  if (mem.role === "F") return { ...base, status: "friend" };
  if (!boxActive) return { ...base, status: "unknown" };
  const assistNo = assistNoOf(mem);
  const families = ownedFamilies();
  const baseOk = box.has(mem.id) || (m?.no && families.has(familyOf(m.no)));
  const assistOk = !assistNo || families.has(familyOf(assistNo));
  if (baseOk && assistOk) return { ...base, status: "owned" };
  const r = { ...base, baseOk, assistOk, status: "missing", alt: {} };
  if (mem.role === "L" && !baseOk) return { ...r, leaderLock: true };
  if (!m?.no) return { ...r, noData: true };
  if (!baseOk) r.alt.base = findSubstitutes("base", mem, base.important, team);
  if (!assistOk) r.alt.assist = findSubstitutes("assist", mem, base.important, team);
  const best = [r.alt.base?.[0], r.alt.assist?.[0]];
  const need = [!baseOk, !assistOk];
  const covered = need.every((n, i) => !n || best[i]);
  if (covered) r.status = need.some((n, i) => n && best[i].lostMajor.length) ? "partial" : "substitute";
  return r;
}

// 1人分の編成を L → S → F の順に並べ、サブが4体未満なら「自由枠」で埋める
function arrangeSide(list, team, boxActive, p, dungeon) {
  const order = { L: 0, S: 1, F: 2 };
  const sorted = [...list].sort((a, b) => order[a.role] - order[b.role]);
  const members = sorted.map((mem) => analyzeMember(mem, team, boxActive, dungeon));
  const subCount = sorted.filter((m) => m.role === "S").length;
  const free = Array.from({ length: Math.max(0, SUB_SLOTS - subCount) }, () => ({
    mem: { role: "S", p }, m: null, need: [], subs: [], status: "free",
  }));
  const friendAt = members.findIndex((r) => r.mem.role === "F");
  members.splice(friendAt === -1 ? members.length : friendAt, 0, ...free);
  return members;
}

// レシートの複雑さ: パズル指定・注意書きが多いほど、分岐があると高く、「ずらし」が多いほど低い
// 分岐は数ではなく「あるかないか」だけを見る（ある場合は一律で加算）
const BRANCH_PENALTY = 3;
const complexityOf = (m) => Math.max(0, m.puzzle + (m.branch > 0 ? BRANCH_PENALTY : 0) + m.caution * 0.5 - m.zurashi * 0.5);

// 全編成の指標の最小〜最大（楽さを0〜1に正規化するため）。データが変わったら作り直す
let easeRangeCache = null;
function easeRanges() {
  if (easeRangeCache) return easeRangeCache;
  const withM = db.teams.filter((t) => t.metrics);
  const range = (vals) => ({ min: Math.min(...vals), max: Math.max(...vals) });
  const turns = withM.map((t) => t.turns).filter(Boolean).sort((a, b) => a - b);
  easeRangeCache = {
    turns: range(turns),
    turnsMedian: turns[Math.floor(turns.length / 2)] ?? 25,
    length: range(withM.map((t) => t.metrics.chars)),
    complexity: range(withM.map((t) => complexityOf(t.metrics))),
  };
  return easeRangeCache;
}
const norm01 = (v, { min, max }) => (max > min ? Math.min(1, Math.max(0, (v - min) / (max - min))) : 0.5);

// 楽さ（0〜100）とその内訳。metrics がない編成（攻略サイト由来）は従来の★と安定率で出す
function easeOf(team) {
  const m = team.metrics;
  if (!m) return { score: ((team.ease - 1) / 4) * 60 + team.stability * 0.4, legacy: true };
  const R = easeRanges();
  const parts = {
    turns: norm01(team.turns ?? R.turnsMedian, R.turns),
    length: norm01(m.chars, R.length),
    complexity: norm01(complexityOf(m), R.complexity),
    plus891: m.plus891,
  };
  const burden = Object.entries(EASE_WEIGHTS).reduce((sum, [k, w]) => sum + w * parts[k], 0);
  return { score: (1 - burden) * 100, parts };
}

function evaluate(team, dungeon, item, boxActive) {
  // マルチは プレイヤーA / B がそれぞれ リーダー1 + サブ4（フレンド枠なし）
  const sides = team.multi ? ["A", "B"] : [null];
  const members = sides.flatMap((p) =>
    arrangeSide(p ? team.members.filter((m) => m.p === p) : team.members, team, boxActive, p, dungeon)
  );
  // 部位破壊の数などで編成ごとに報酬が違う場合は team.yields を優先
  const rate = !item
    ? 1
    : team.yields?.[item.id] ?? dungeon.drops.filter((d) => d.itemId === item.id).reduce((s, d) => s + d.rate, 0);
  const runSec = team.timeSec + RUN_OVERHEAD_SEC;
  const perHour = (3600 / runSec) * rate;
  const staminaPer = rate > 0 ? dungeon.stamina / rate : Infinity;
  // 経験値効率（ランク経験値）。編成ごとの値があればそちらを優先。スタミナ未登録なら出さない
  const expPerRun = team.yields?.exp ?? dungeon.drops.find((d) => d.itemId === "exp")?.rate ?? 0;
  const expPerHour = expPerRun ? (3600 / runSec) * expPerRun : null;
  const expPerStamina = expPerRun && dungeon.stamina > 0 ? expPerRun / dungeon.stamina : null;
  // マルチは自分が担当する側だけ揃えばよいので、足りない枠が少ない側で数える
  const count = (status, p) => members.filter((r) => r.status === status && (!p || r.mem.p === p)).length;
  const side = team.multi ? (count("missing", "A") <= count("missing", "B") ? "A" : "B") : null;
  const missing = count("missing", side);
  const substituted = count("substitute", side) + count("partial", side);
  const ease = easeOf(team);
  return { team, dungeon, members, side, rate, runSec, perHour, staminaPer, expPerHour, expPerStamina, missing, substituted, easeScore: ease.score, ease };
}

function search() {
  const q = $("#q").value;
  const { dungeons, item, canonical } = resolveQuery(q, searchType);
  const boxActive = box.size > 0;
  const ownedOnly = $("#owned-only").checked;
  const out = $("#results");

  if (!q.trim()) {
    out.innerHTML = `<p class="empty">${SEARCH_TYPES[searchType].noun}名を入力してください。</p>`;
    return;
  }

  let rows = dungeons.flatMap((d) =>
    db.teams.filter((t) => t.dungeonId === d.id).map((t) => evaluate(t, d, item, boxActive))
  );
  const total = rows.length;
  if (!total) {
    const isDungeon = searchType === "dungeon";
    const target = item ? item.name : dungeons.length ? dungeons[0].name : canonical;
    const alias = norm(target) !== norm(q) ? `（「${esc(q)}」→「${esc(target)}」）` : "";
    const found = item || dungeons.length;
    const other = resolveQuery(q, isDungeon ? "item" : "dungeon");
    const otherNoun = isDungeon ? "素材" : "ダンジョン";
    // 検索種別を間違えただけなら、切り替えだけ案内する
    if (!found && (other.item || other.dungeons.length)) {
      out.innerHTML = `<div class="card unregistered">
        <p>「${esc(q)}」という${SEARCH_TYPES[searchType].noun}は見つかりません。${otherNoun}として登録されています。</p>
        <button class="primary" id="switch-type">${otherNoun}で探す</button>
      </div>`;
      $("#switch-type").addEventListener("click", () => {
        setSearchType(isDungeon ? "item" : "dungeon");
        search();
      });
      return;
    }
    out.innerHTML = `<div class="card unregistered">
      <p><strong>${esc(target)}</strong>${alias} の周回編成はまだ登録されていません。</p>
      <p class="hint">攻略サイトやXで見つけた編成を取り込むと、ここに最適順で表示されます。</p>
      <button class="primary" id="go-register">この${SEARCH_TYPES[searchType].noun}の編成を登録する</button>
    </div>`;
    $("#go-register").addEventListener("click", () =>
      openRegister(isDungeon ? { dungeon: target } : { item: target, alias: alias ? q.trim() : "" })
    );
    return;
  }
  if (ownedOnly && boxActive) rows = rows.filter((r) => r.missing === 0);

  const maxPerHour = Math.max(...rows.map((r) => r.perHour), 1e-9);
  const penalty = (r) => r.missing * PENALTY_MISSING + r.substituted * PENALTY_SUBSTITUTE;
  for (const r of rows) r.speedScore = (r.perHour / maxPerHour) * 100;
  // 効率の対象: 素材で探す→その素材、ダンジョンで探す→経験値
  for (const r of rows) {
    r.effPerHour = item ? r.perHour : r.expPerHour;
    r.effPerStamina = item ? (r.dungeon.stamina > 0 && r.rate > 0 ? r.rate / r.dungeon.stamina : null) : r.expPerStamina;
  }
  const expKey = EXP_MODES[mode];
  if (expKey) {
    // 経験値効率順: 一番効率のいい編成を100点。データがない編成は最後に回す
    const max = Math.max(...rows.map((r) => r[expKey] ?? 0), 1e-9);
    for (const r of rows) r.score = r[expKey] == null ? null : (r[expKey] / max) * 100 - penalty(r);
    rows.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
  } else {
    const w = MODE_WEIGHTS[mode];
    for (const r of rows) r.score = r.speedScore * w.speed + r.easeScore * w.ease - penalty(r);
    rows.sort((a, b) => b.score - a.score);
  }

  const head =
    (item
      ? `<p class="summary">「${esc(item.name)}」が出るダンジョン ${dungeons.length}件 / 編成 ${rows.length}件</p>`
      : `<p class="summary">編成 ${rows.length}件</p>`) +
    `<p class="caution">⚠️ 編成・アシスト・立ち回りは要約や読み取りのため、誤りや省略があるかもしれません。参考にするときは<strong>必ず各編成の「元のポスト／元の記事」のリンク先を確認</strong>してください。</p>`;
  const boxNote = boxActive
    ? ""
    : `<p class="note">手持ちBOXが未登録なので、所持チェックはしていません。「手持ちBOX」タブで登録すると代用を自動で探します。</p>`;

  if (!rows.length) {
    out.innerHTML =
      head +
      `<p class="empty">手持ちだけで組める編成がありません（全${total}件）。チェックを外すと、足りないモンスターと代用候補を確認できます。</p>`;
    return;
  }
  out.innerHTML = head + boxNote + rows.map((r, i) => renderResult(r, i, item)).join("");
}

// ---------- 描画 ----------
const ROLE_LABEL = { L: "リーダー", F: "フレンド", S: "サブ" };

function noLabel(m) {
  if (m?.no) return `<a class="no" href="${padmdbUrl(m.no)}" target="_blank" rel="noopener">No.${m.no}</a>`;
  if (m?.noUncertain) return `<span class="no" title="${esc(m.noUncertain)}">No.未確定</span>`;
  return "";
}

function renderAlt(label, list, { pool = "owned" } = {}) {
  if (!list) return "";
  if (!list.length) return `<div class="sub-line">${label}の代用: ${pool === "all" ? "条件に合う候補なし" : "手持ちに候補なし"}</div>`;
  const items = list.map((c) => {
    const minorLost = c.lost.filter((k) => !c.lostMajor.includes(k));
    const kept = c.keptMajor.map((k) => `<span class="ok">✓${esc(capLabel(k))}</span>`).join(" ");
    const lost = [
      ...c.lostMajor.map((k) => `<span class="ng">✗${esc(capLabel(k))}がなくなる</span>`),
      ...(minorLost.length ? [`<span class="warnc">耐性など: ${esc(minorLost.map(capLabel).join("・"))}がなくなる</span>`] : []),
    ].join(" ");
    const turn = c.turnDiff ? `<span class="warnc">△スキルが${Math.abs(c.turnDiff)}ターン${c.turnDiff > 0 ? "長い" : "短い"}</span>` : "";
    const haste = c.hasteDiff ? `<span class="warnc">△ヘイストが${Math.abs(c.hasteDiff)}ターン${c.hasteDiff > 0 ? "多い" : "少ない"}</span>` : "";
    let attr = "";
    if (c.attr) {
      const [om, cm] = c.attr.main;
      const [os, cs] = c.attr.sub;
      attr = om !== cm
        ? `<span class="ng">✗主属性が違う（${esc(om || "なし")}→${esc(cm || "なし")}）</span>`
        : os !== cs
          ? `<span class="warnc">△副属性が違う（${esc(os || "なし")}→${esc(cs || "なし")}）</span>`
          : `<span class="ok">✓属性同じ（${esc(om)}${os ? "/" + esc(os) : ""}）</span>`;
    }
    const endorsedBadge = c.endorsed ? `<span class="st st-ok">作者公認の代用</span> ` : "";
    const hs = c.hasteShort ? `<span class="ng">✗ヘイスト${c.candHaste || 0}ターン（必要${c.hasteShort}ターン。足りない分をほかの枠で補う必要あり）</span>` : "";
    const late = c.lateFire ? `<span class="ng">✗スキル${c.candTurn}ターンで元（${c.origTurn}ターン）より重く、${c.lateFire}Fで使えない可能性</span>` : "";
    const as = c.activeShort
      ? `<span class="ng">✗${c.activeShort.use}Fで使うと${c.activeShort.floor ? `${c.activeShort.floor}F（` : ""}${c.activeShort.T}ターン目${c.activeShort.floor ? "）" : ""}に効果が残らない（${c.activeShort.dly ? `${c.activeShort.dly}ターン後に発動・` : ""}効果${c.activeShort.dur}ターン）</span>`
      : "";
    const sb = c.sbShort ? `<span class="ng">✗パーティーのスキブが${c.sbShort}個減る（必要な階でスキルが溜まるか要確認）</span>` : "";
    const reset = c.resetRisk ? `<span class="ng">✗${c.resetRisk}Fのアシスト無効でスキルターンがリセットされ、間に合わない可能性</span>` : "";
    const short = c.durShort ? `<span class="ng">✗効果${c.cDur}ターンで、必要な${c.durShort}ターンに届かない</span>` : "";
    const dur = c.durDiff ? `<span class="${c.durDiff < 0 ? "warnc" : "ok"}">△効果が${Math.abs(c.durDiff)}ターン${c.durDiff > 0 ? "長い" : "短い"}</span>` : "";
    const mult = c.multRatio && Math.abs(c.multRatio - 1) > 0.05 ? `<span class="${c.multRatio < 1 ? "warnc" : "ok"}">攻撃倍率 ×${c.multRatio.toFixed(2)}</span>` : "";
    const sa = c.fire?.candSA && AWAKEN_NAME[c.fire.candSA] ? `<span class="muted">超覚醒: ${esc(AWAKEN_NAME[c.fire.candSA] ?? "")}を選ぶ想定</span>` : "";
    const reasons = Object.entries(c.votes.reasons ?? {}).sort((a, b) => b[1] - a[1]);
    const reasonLine = reasons.length || c.votes.notes?.length
      ? `<div class="vote-reasons">回れなかった理由: ${reasons.map(([r, n]) => `${esc(r)}×${n}`).join("、")}${(c.votes.notes ?? []).map((t) => `<q>${esc(t)}</q>`).join("")}</div>`
      : "";
    const votes = shared.mode === "firebase"
      ? `<span class="votes">使った人: 回れた ${c.votes.ok} / 回れなかった ${c.votes.ng}
         <button type="button" class="link vote-btn" data-cand="${c.no}" data-ok="1">回れた</button>
         <button type="button" class="link vote-ng-open" data-cand="${c.no}">回れなかった</button></span>
         <form class="vote-ng-form" data-cand="${c.no}" hidden>
           <label>理由 <select name="reason">${NG_REASONS.map((r) => `<option>${r}</option>`).join("")}</select></label>
           <input name="note" maxlength="200" placeholder="くわしく（任意）例: 6Fで火力が足りずワンパンできない">
           <button type="submit" class="link">送る</button>
         </form>${reasonLine}`
      : "";
    let fire = "";
    if (c.fire && c.fire.orig > 1) {
      const cls = c.fire.ratio >= 0.99 ? "ok" : c.fire.ratio >= 0.5 ? "warnc" : "ng";
      const lost = c.fire.lost.length ? `、${c.fire.lost.map((t) => DMG_LABEL[t] ?? t).join("・")}が弱い` : "";
      fire = `<span class="${cls}">火力覚醒 ${fmtMult(c.fire.orig)}→${fmtMult(c.fire.cand)}${lost}</span>`;
    }
    const own = pool === "all" && box.size ? (c.owned ? `<span class="st st-ok">所持</span> ` : "") : "";
    return `<li>${iconHTML(c.no, { assist: label === "アシスト" })}${endorsedBadge}${own}<strong>${esc(c.name)}</strong> <a class="no" href="${padmdbUrl(c.no)}" target="_blank" rel="noopener">No.${c.no}</a>
      <div class="alt-caps">${[attr, fire, sa, as, short, hs, late, reset, sb, kept, lost, turn, haste, dur, mult].filter(Boolean).join(" ") || "重要な能力の指定なし"}</div>${votes}</li>`;
  });
  return `<div class="sub-line">${label}の代用候補（要確認）:<ol class="alts">${items.join("")}</ol></div>`;
}

// 役割一覧は本体と武器（アシスト）に分けて表示する
function renderImportant(r) {
  if (!r.important?.size) return "";
  const baseNo = r.m?.no;
  const assistNo = assistNoOf(r.mem);
  const baseCaps = capsOfNo(baseNo, false)?.all ?? new Set();
  const assistCaps = assistNo ? capsOfNo(assistNo, true)?.all ?? new Set() : new Set();
  // 作者の説明は枠の指定どおり。推定した役割は、持っている側（両方なら本体）
  const partOf = (c, v) => v.part ?? (baseCaps.has(c) || !assistCaps.has(c) ? "base" : "assist");
  const all = [...r.important];
  const groups = [
    ["base", "本体の役割"],
    ["assist", `武器の役割（${esc(MDB.get(assistNo)?.[1] ?? "")}）`],
  ];
  if (!assistNo) return renderImportantPart(all);
  return groups
    .map(([part, title]) => {
      const html = renderImportantPart(all.filter(([c, v]) => partOf(c, v) === part));
      return html ? `<div class="part-block"><div class="part-head">${title}</div>${html}</div>` : "";
    })
    .join("");
}

function renderImportantPart(list) {
  if (!list.length) return "";
  const entries = [...list].sort((a, b) => b[1].weight - a[1].weight);
  const major = entries.filter(([, v]) => v.weight >= MAJOR_WEIGHT);
  const minor = entries.filter(([, v]) => v.weight < MAJOR_WEIGHT && !v.teamWide && !v.optional && !v.note);
  const chips = major.map(([c, v]) => `<span class="tag${v.author ? " tag-author" : ""}">${esc(capLabel(c))}${v.minDur ? `（${v.minDur}ターン以上）` : ""}${v.minHaste ? `（${v.minHaste}ターン以上・${v.fireAtFloor ?? 1}Fで使用）` : ""}${v.activeAtTurn ? `（${v.fireAtFloor ?? 1}Fで使い${v.activeFloor ? `${v.activeFloor}F＝` : ""}${v.activeAtTurn}ターン目まで効果）` : ""}${v.mustBeBase ? "（本体で持つ）" : ""}<small>・${esc(v.why)}</small></span>`).join("");
  const team = entries.filter(([, v]) => v.teamWide).map(([c, v]) => `<div class="sub-line muted">チーム全体で必要: ${esc(capLabel(c))} ・${esc(v.why)}</div>`).join("")
    + entries.filter(([, v]) => v.optional).map(([c, v]) => `<div class="sub-line muted">条件付き: ${esc(capLabel(c))} ・${esc(v.why)}</div>`).join("")
    + entries.filter(([, v]) => v.note).map(([, v]) => `<div class="sub-line"><span class="st st-ok">役割メモ</span> ${esc(v.why)}</div>`).join("");
  const rest = minor.length ? `<div class="sub-line muted">耐性など: ${minor.map(([c]) => esc(capLabel(c))).join("・")}</div>` : "";
  return `${chips ? `<div class="tags imp">${chips}</div>` : ""}${team}${rest}`;
}

// ---------- 覚醒アイコン ----------
// 画像: 高画質覚醒スキル（@pad_awokenskill）様の画像を、yuunium 様の覚醒スキル性能作成補助ツール経由で表示
const AWK_IMG_BASE = "https://yuunium.github.io/awokenskill/pic/";
const AWK_IMG = {
  1: "hp", 2: "att", 3: "rcv", 4: "barrier_fire", 5: "barrier_water", 6: "barrier_wood", 7: "barrier_light", 8: "barrier_dark",
  9: "autorcv", 10: "bind", 11: "resist_blind", 12: "resist_jama", 13: "resist_doku", 14: "drop_fire", 15: "drop_water", 16: "drop_wood",
  17: "drop_light", 18: "drop_dark", 19: "time", 20: "bindrcv", 21: "boost", 22: "row_fire", 23: "row_water", 24: "row_wood", 25: "row_light",
  26: "row_dark", 27: "way", 28: "huin", 29: "drop_rcv", 30: "multi", 31: "killer_dragon", 32: "killer_god", 33: "killer_devil",
  34: "killer_machine", 35: "killer_barance", 36: "killer_attack", 37: "killer_stamina", 38: "killer_rcv", 40: "killer_awoken",
  43: "7c", 44: "guardbreak", 45: "bonusatt", 46: "team_hp", 47: "team_rcv", 48: "void", 49: "assist", 50: "bonusatt_p", 51: "charge",
  52: "bind_p", 53: "time_p", 54: "resist_kumo", 55: "resist_tape", 56: "boost_p", 57: "50more", 58: "50less", 59: "rcvl", 60: "l",
  61: "10c", 62: "combo", 63: "voice", 64: "dungeon_bonus", 65: "hp_m", 66: "att_m", 67: "rcv_m", 68: "resist_blind_p", 69: "resist_jama_p",
  70: "resist_doku_p", 71: "fall_jama", 72: "fall_doku", 73: "combo_fire", 74: "combo_water", 75: "combo_wood", 76: "combo_light",
  77: "combo_dark", 78: "cross", 79: "3color", 80: "4color", 81: "5color", 82: "100c", 83: "type_dragon", 84: "type_god", 85: "type_devil",
  86: "type_machine", 87: "type_balance", 88: "type_att", 89: "type_stamina", 90: "type_rcv", 91: "sub_fire", 92: "sub_water",
  93: "sub_wood", 94: "sub_light", 95: "sub_dark", 96: "way_p", 97: "charge_p", 98: "autorcv_p", 99: "drop_fire_p", 100: "drop_water_p",
  101: "drop_wood_p", 102: "drop_light_p", 103: "drop_dark_p", 104: "drop_rcv_p", 105: "boost_m", 106: "levitate", 107: "7c_p", 108: "l_p",
  109: "void_p", 110: "cross_p", 111: "10c_p", 112: "3color_p", 113: "4color_p", 114: "5color_p", 115: "bindrcv_p", 116: "row3_fire",
  117: "row3_water", 118: "row3_wood", 119: "row3_light", 120: "row3_dark", 121: "combo_fire_p", 122: "combo_water_p", 123: "combo_wood_p",
  124: "combo_light_p", 125: "combo_dark_p", 126: "t", 127: "all", 128: "yo", 129: "in", 130: "taru", 131: "parts_break", 132: "tea",
  133: "double_firewater", 134: "double_waterwood", 135: "double_woodfire", 136: "resist_delay", 137: "drop_all", 138: "same_assist",
  139: "my_power", 140: "resist_change_time", 142: "all_p", 143: "kasoku", 144: "15c", 148: "resist_assist",
};
const AWK_NAMES = window.PAD_AWAKEN_NAMES ?? {};
function awkIcon(id, cls = "") {
  const name = AWK_NAMES[id] ?? `覚醒${id}`;
  const img = AWK_IMG[id];
  return img
    ? `<img class="awk ${cls}" src="${AWK_IMG_BASE}${img}.png" alt="${esc(name)}" title="${esc(name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'awk-txt ${cls}',textContent:this.alt}))">`
    : `<span class="awk-txt ${cls}" title="${esc(name)}">${esc(name)}</span>`;
}
// 本体の覚醒（＋選んだ超覚醒・シンクロ覚醒）。武器は覚醒アシストのときだけ小さく
function renderAwakenings(mem) {
  const row = MDB.get(monster(mem.id)?.no);
  if (!row) return "";
  const ids = String(row[27] ?? "").split(".").filter(Boolean).map(Number);
  const sup = mem.build?.super ? `<span class="awk-sep">超</span>${awkIcon(mem.build.super, "awk-super")}` : "";
  const syn = row[26] ? `<span class="awk-sep">シンクロ</span>${awkIcon(row[26], "awk-super")}` : "";
  const a = MDB.get(assistNoOf(mem));
  const aIds = a?.[8] ? String(a[27] ?? "").split(".").filter(Boolean).map(Number).filter((x) => x !== 49) : [];
  const weapon = aIds.length ? `<div class="awk-row awk-weapon"><span class="awk-sep">武器</span>${aIds.map((x) => awkIcon(x)).join("")}</div>` : "";
  return `<div class="awk-row">${ids.map((x) => awkIcon(x)).join("")}${sup}${syn}</div>${weapon}`;
}

// 名前の横の「超覚醒一覧」: レシートで選ばれていない超覚醒も確認できる（選ばれているものは枠付き）
function renderSuperList(mem) {
  const row = MDB.get(monster(mem.id)?.no);
  const ids = String(row?.[11] ?? "").split(".").filter(Boolean).map(Number);
  if (!ids.length) return "";
  return `<details class="awk-supers"><summary>超覚醒一覧（${ids.length}）</summary><div class="awk-row">${ids
    .map((id) => awkIcon(id, id === mem.build?.super ? "awk-super" : ""))
    .join("")}</div>${mem.build?.super ? `<small class="muted">枠付きがレシートで選ばれている超覚醒</small>` : `<small class="muted">レシートからは選んだ超覚醒が分かりません</small>`}</details>`;
}

// ---------- アップデートによる変更 ----------
const MONSTER_CHANGES = window.PAD_MONSTER_CHANGES ?? [];
function tagDiff(before, after) {
  const a = new Set(String(before ?? "").split(",").filter(Boolean));
  const b = new Set(String(after ?? "").split(",").filter(Boolean));
  const label = (t) => (/^h\d+$/.test(t) ? `ヘイスト${t.slice(1)}` : capLabel(t.replace(/^grant:/, "")));
  const add = [...b].filter((t) => !a.has(t)).map(label);
  const del = [...a].filter((t) => !b.has(t)).map(label);
  return [add.length ? `追加: ${add.join("・")}` : "", del.length ? `削除: ${del.join("・")}` : ""].filter(Boolean).join("／") || "内容が変更";
}
function describeChange(c) {
  if (c.field === "スキルターン") return `スキルターン ${c.before}→${c.after}`;
  if (c.field === "最大HP") return `最大HP ${Number(c.before).toLocaleString("ja-JP")}→${Number(c.after).toLocaleString("ja-JP")}`;
  if (c.field === "スキルの能力" || c.field === "覚醒") return `${c.field}（${tagDiff(c.before, c.after)}）`;
  return `${c.field}が変更`;
}
// 編成の投稿日より後に、その枠（本体・変身前後・アシスト）に入った変更
function changesSince(mem, since) {
  const nos = new Set();
  const base = monster(mem.id)?.no;
  if (base) (MDB.get(base)?.[9] ? familyRows.get(MDB.get(base)[9]) : [MDB.get(base)]).filter(Boolean).forEach((r) => nos.add(r[0]));
  const an = assistNoOf(mem);
  if (an) nos.add(an);
  return MONSTER_CHANGES.filter((c) => nos.has(c.no) && (!since || c.date >= since));
}
function renderChanges(mem, team) {
  const list = changesSince(mem, team.sourceDate);
  if (!list.length) return "";
  return `<div class="sub-line changed"><span class="st st-ng">投稿後にアップデート</span> ${list
    .map((c) => `${esc(MDB.get(c.no)?.[1] ?? "")}: ${esc(describeChange(c))}（${esc(c.date)}）`)
    .join("／")}。役割や立ち回りが変わっていないか確認してください</div>`;
}

function renderMember(r) {
  if (r.status === "free") {
    return `<li class="mem mem-free"><span class="role">サブ</span>
      <div class="mem-main"><span class="mname muted">自由枠</span><div class="sub-line muted">元の編成で指定なし。好きなモンスターでOK</div></div></li>`;
  }
  const name = r.m ? r.m.name : `不明(${r.mem.id})`;
  const assistNo = assistNoOf(r.mem);
  const icons = `<span class="mem-icons">${iconHTML(r.m)}${assistNo ? iconHTML(assistNo, { assist: true }) : ""}</span>`;
  const assistMissing = r.status !== "owned" && r.assistOk === false;
  const assist = r.mem.assist
    ? `<div class="sub-line muted">アシスト: ${esc(r.mem.assist)}${assistMissing ? ` <span class="st st-ng">未所持</span>` : ""}</div>`
    : "";
  let status = "";
  let extra = "";
  if (r.status === "friend") status = `<span class="st st-friend">フレンドから借りる</span>`;
  if (r.status === "owned") status = `<span class="st st-ok">所持</span>`;
  if (["missing", "substitute", "partial"].includes(r.status)) {
    const label = { missing: "未所持", substitute: "未所持 → 代用あり", partial: "未所持 → 条件付きで代用" }[r.status];
    status = `<span class="st ${r.status === "missing" ? "st-ng" : "st-sub"}">${r.baseOk === false ? label : "本体は所持"}</span>`;
    if (r.leaderLock) extra = `<div class="sub-line">リーダーはリーダースキルが変わるため代用しません</div>`;
    else if (r.noData) extra = `<div class="sub-line">図鑑No.がないため代用を探せません</div>`;
    else extra = renderAlt("本体", r.alt?.base) + renderAlt("アシスト", r.alt?.assist);
  }
  return `<li class="mem mem-${r.status}">
    <span class="role">${ROLE_LABEL[r.mem.role] ?? r.mem.role}</span>${icons}
    <div class="mem-main"><span class="mname">${esc(name)}</span>${noLabel(r.m)}${status}${renderSuperList(r.mem)}
      ${renderAwakenings(r.mem)}
      ${renderChanges(r.mem, db.teams.find((t) => t.id === r.teamId) ?? {})}${renderImportant(r)}${assist}${extra}${altButton(r)}</div>
  </li>`;
}

// 図鑑全体から代用を探すボタン。リーダー・フレンドは本体を変えるとリーダースキルが変わるので武器（アシスト）だけ
// 作者が「原則代用できない」とした枠（毎ターン使う生成キャラなど）
function noSubstituteReason(team, mem) {
  const no = monster(mem.id)?.no;
  return team?.slotRoles?.find((sr) => sr.noSubstitute && sr.part === "base" && familyOf(sr.target) === familyOf(no))?.noSubstitute ?? null;
}

function altButton(r) {
  if (r.idx < 0 || !r.m?.no) return "";
  const team = db.teams.find((t) => t.id === r.teamId);
  const ns = noSubstituteReason(team, r.mem);
  if (ns && r.mem.role === "S" && !assistNoOf(r.mem)) return `<div class="sub-line"><span class="st st-ng">原則代用不可</span> ${esc(ns)}</div>`;
  const weaponOnly = r.mem.role !== "S";
  if (weaponOnly && !assistNoOf(r.mem)) return "";
  const label = weaponOnly ? "武器の代用を探す" : "代用を探す";
  return `<div class="alt-search"><button type="button" class="alt-btn" data-team="${esc(r.teamId)}" data-idx="${r.idx}" data-label="${label}">${label}</button><div class="alt-out"></div></div>`;
}

function searchAltFor(teamId, idx) {
  const team = db.teams.find((t) => t.id === teamId);
  const mem = team?.members[idx];
  if (!mem) return "";
  const dungeon = db.dungeons.find((d) => d.id === team.dungeonId);
  const important = importantCaps(mem, team, dungeon);
  const note = box.size
    ? `<p class="hint">図鑑全体から探しています。手持ちBOXにいるキャラを上に表示します。</p>`
    : `<p class="hint">図鑑全体から探しています。手持ちBOXを登録すると、持っているキャラが上に並びます。</p>`;
  const opts = { pool: "all", limit: 5 };
  const ns = noSubstituteReason(team, mem);
  const baseList = mem.role === "S" && !ns ? findSubstitutes("base", mem, important, team, opts) : null;
  const nsNote = ns ? `<p class="endorsed-note"><span class="st st-ng">本体は原則代用不可</span> ${esc(ns)}（作者本人の説明）。武器の代用だけを探します。</p>` : "";
  const assistList = assistNoOf(mem) ? findSubstitutes("assist", mem, important, team, opts) : null;
  const endorsedNotes = [monster(mem.id)?.no, assistNoOf(mem)]
    .map((no) => endorsedFor(team, no))
    .filter(Boolean)
    .filter((e) => mem.role === "S" || e.part === "assist")
    .map((e) => `<p class="endorsed-note"><span class="st st-ok">作者の記載</span> ${esc(e.text)}</p>`)
    .join("");
  const weaponNote = mem.role !== "S" ? `<p class="hint">リーダー・フレンドはリーダースキルが変わるため、武器（アシスト）の代用だけを探します。</p>` : "";
  return note + nsNote + endorsedNotes + weaponNote + (baseList ? renderAlt("本体", baseList, opts) : "") + (assistList ? renderAlt("アシスト", assistList, opts) : "");
}

// ダンジョンのギミック（2サイト以上で確認。片方のサイトにしかないものは明記）
function renderGimmicks(d) {
  const g = d.gimmicks;
  if (!g) return "";
  const sure = g.all.map((k) => `<span class="tag">${esc(GIMMICK_LABEL[k] ?? k)}</span>`).join("");
  const partial = g.partial.map((p) => `<span class="tag partial">${esc(GIMMICK_LABEL[p.key] ?? p.key)}<small>（${esc(p.sites.join("・"))}のみ）</small></span>`).join("");
  const src = g.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.site)}</a>（${esc(s.date)}）`).join("・");
  const notes = g.notes?.length ? `<ul class="gnotes">${g.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : "";
  const none = !g.all.length && !g.partial.length ? `<p class="hint">両サイトともギミックなし</p>` : "";
  return `<details class="gimmicks"><summary>ギミック（${g.sources.length}サイトで確認）</summary>
    ${none}${sure ? `<div class="tags">${sure}</div>` : ""}${partial ? `<p class="hint">サイトによって記載が違うもの</p><div class="tags">${partial}</div>` : ""}
    ${notes}<p class="hint">出典: ${src}</p></details>`;
}

function formatTime(sec) {
  return sec >= 60 ? `${Math.floor(sec / 60)}分${String(Math.round(sec % 60)).padStart(2, "0")}秒` : `${sec}秒`;
}

// 経験値など桁の大きい数を「2.2億」のように縮める
function formatCount(n) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}億`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`;
  return n.toFixed(1);
}

function bar(label, value) {
  const v = Math.max(0, Math.min(100, value));
  return `<div class="bar"><span>${label}</span><div class="track"><div class="fill" style="width:${v}%"></div></div><b>${Math.round(v)}</b></div>`;
}

const SITE_NAMES = {
  "gamewith.jp": "ゲームウィズ",
  "game8.jp": "ゲームエイト",
  "kamigame.jp": "神ゲー攻略",
  "altema.jp": "アルテマ",
  "appmedia.jp": "AppMedia",
};

// 出典URLから投稿者（X）やサイト名を割り出す。team.author があればそちらを優先
function sourceInfo(t) {
  let url;
  try {
    url = new URL(t.source);
  } catch {
    return t.source ? { label: t.source } : null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "x.com" || host === "twitter.com") {
    const handle = url.pathname.split("/")[1];
    return {
      label: t.author?.name || `@${handle}`,
      handle: `@${handle}`,
      profileUrl: `https://x.com/${handle}`,
      postUrl: `https://x.com${url.pathname}`,
      postLabel: "元のポスト",
    };
  }
  const site = Object.entries(SITE_NAMES).find(([d]) => host === d || host.endsWith(`.${d}`));
  return {
    label: t.author?.name || (site ? site[1] : host),
    profileUrl: t.author?.url || `${url.protocol}//${url.host}/`,
    postUrl: url.href,
    postLabel: "元の記事",
  };
}

function reportButton(t) {
  return shared.mode === "firebase" && t.shared && t.status === "approved"
    ? ` <button type="button" class="link report-btn" data-report="${esc(t.id)}">問題を報告</button>`
    : "";
}

function renderSource(t) {
  const info = sourceInfo(t);
  if (!info) return "";
  const date = t.sourceDate ? `<span class="muted">${esc(t.sourceDate)}</span>` : "";
  if (!info.postUrl) return `<p class="src">参考: ${esc(info.label)} ${date}</p>`;
  const handle = info.handle && info.handle !== info.label ? `<span class="muted">${esc(info.handle)}</span>` : "";
  return `<p class="src">参考:
    <a href="${esc(info.profileUrl)}" target="_blank" rel="noopener"><strong>${esc(info.label)}</strong></a> ${handle}
    ・<a href="${esc(info.postUrl)}" target="_blank" rel="noopener">${info.postLabel}</a> ${date}</p>
    <p class="src-caution">参考にする前に必ずリンク先の元の内容を確認してください</p>`;
}

function renderConstraints(t) {
  if (!t.constraints?.length) return "";
  return `<div class="constraints">${t.constraints
    .map((c) => `<p><span class="st st-ok">前提条件</span> ${esc(c.why)}${c.source ? `<small class="muted">（${esc(c.source)}）</small>` : ""}</p>`)
    .join("")}</div>`;
}

function renderMembers(r) {
  if (!r.team.multi) return `<ul class="members">${r.members.map(renderMember).join("")}</ul>`;
  return ["A", "B"]
    .map((p) => {
      const mine = r.side === p && box.size > 0 ? `<span class="st st-ok">手持ちで組みやすい側</span>` : "";
      return `<p class="side-head">マルチ${p} ${mine}</p>
        <ul class="members">${r.members.filter((x) => x.mem.p === p).map(renderMember).join("")}</ul>`;
    })
    .join("");
}

function plus891Label(m) {
  if (m.plus891Text === "required") return "必須";
  if (m.plus891Text === "not-required") return "不要";
  if (m.plus891 >= 0.99) return "全員";
  if (m.plus891 > 0) return `一部（${Math.round(m.plus891 * 6)}体）`;
  return "なし";
}

function renderEaseStats(m) {
  return `<div><dt>レシート</dt><dd>${m.chars}字</dd></div>
    <div><dt>パズル指定</dt><dd>${m.puzzle}</dd></div>
    <div><dt>分岐</dt><dd>${m.branch > 0 ? "あり" : "なし"}</dd></div>
    <div><dt>ずらし</dt><dd>${m.zurashi}</dd></div>
    <div><dt>+891</dt><dd>${plus891Label(m)}</dd></div>`;
}

// 楽さの内訳（楽なほど棒が長い）
function renderEaseBreakdown(p) {
  const label = { turns: "クリアターン", length: "レシートの長さ", complexity: "複雑さ", plus891: "+891" };
  return `<details class="ease-detail"><summary>楽さの内訳</summary>
    ${Object.keys(EASE_WEIGHTS).map((k) => bar(label[k], (1 - p[k]) * 100)).join("")}
    <p class="hint">バーが長いほど楽。重み: クリアターン30%・レシートの長さ30%・複雑さ25%・+891 15%</p></details>`;
}

function renderResult(r, i, item) {
  const t = r.team;
  const unit = item ? `${esc(item.name)} / 時` : "周 / 時";
  const est = (key) => (t.estimated?.includes(key) ? `<span class="est">推定</span>` : "");
  const dropEst = item && r.dungeon.drops.some((d) => d.itemId === item.id && d.estimated)
    ? `<span class="est">推定</span>`
    : item && r.dungeon.drops.some((d) => d.itemId === item.id && d.countUnknown)
      ? `<span class="est" title="攻略サイトには出現の記載のみで個数が書かれていないため、1体として計算">個数不明（1体で計算）</span>`
    : item && r.dungeon.drops.some((d) => d.itemId === item.id && d.siteSource)
      ? (() => { const d = r.dungeon.drops.find((x) => x.itemId === item.id); return `<span class="est">${esc(d.siteSource.join("・"))}記載${d.note ? `（${esc(d.note)}）` : ""}</span>`; })()
    : item && !r.team.yields?.[item.id] && r.dungeon.drops.some((d) => d.itemId === item.id && d.observed)
      ? `<span class="est" title="${esc(r.dungeon.rewardNote ?? "")}">1周分の実績</span>`
      : "";
  let staminaLine = "";
  if (item && r.dungeon.stamina > 0 && r.rate > 0) {
    const hl = mode === "expStamina" ? "hl" : "";
    staminaLine = r.staminaPer >= 1
      ? `<div class="${hl}"><dt>1個あたりスタミナ</dt><dd>${r.staminaPer.toFixed(0)}${dropEst}</dd></div>`
      : `<div class="${hl}"><dt>スタミナ1あたり</dt><dd>${formatCount(r.rate / r.dungeon.stamina)}個${dropEst}</dd></div>`;
  }
  const warn = r.missing
    ? `<p class="warn">代用できない枠が${r.missing}つあります。モンスターを入手するか、別の編成を検討してください。</p>`
    : "";
  const src = renderSource(t) + reportButton(t);
  return `<article class="result ${i === 0 ? "best" : ""}">
    <div class="res-head">
      <span class="rank">${i + 1}</span>
      <div><h3>${t.multi ? `<span class="badge">マルチ</span>` : ""}${t.userAdded ? `<span class="badge badge-mine">自分で登録</span>` : ""}${esc(t.title)}</h3><p class="muted">${esc(r.dungeon.name)}${r.dungeon.note ? ` ― ${esc(r.dungeon.note)}` : ""}</p>${renderGimmicks(r.dungeon)}</div>
      <span class="score">${r.score == null ? `<small>データなし</small>` : `${Math.round(r.score)}<small>点</small>`}</span>
    </div>
    <div class="bars">${bar("速さ", r.speedScore)}${bar("楽さ", r.easeScore)}</div>
    ${r.ease.legacy ? "" : renderEaseBreakdown(r.ease.parts)}
    <dl class="stats">
      <div><dt>1周</dt><dd>${formatTime(t.timeSec)}${est("timeSec")}</dd></div>
      ${item ? "" : `<div class="${mode === "expHour" ? "hl" : ""}"><dt>経験値/時</dt><dd>${r.expPerHour == null ? "―" : formatCount(r.expPerHour)}</dd></div>
      <div class="${mode === "expStamina" ? "hl" : ""}"><dt>経験値/スタミナ</dt><dd>${r.expPerStamina == null ? "―（スタミナ未登録）" : formatCount(r.expPerStamina)}</dd></div>`}
      ${t.turns ? `<div><dt>クリアターン</dt><dd>${t.turns}ターン</dd></div>` : ""}
      <div class="${item && mode === "expHour" ? "hl" : ""}"><dt>${unit}</dt><dd>${formatCount(r.perHour)}${est("timeSec") || dropEst}</dd></div>
      ${r.ease.legacy
        ? `<div><dt>安定率</dt><dd>${t.stability}%${est("stability")}</dd></div>
           <div><dt>楽さ</dt><dd>${"★".repeat(t.ease)}${"☆".repeat(5 - t.ease)}${est("ease")}</dd></div>`
        : renderEaseStats(t.metrics)}
      ${staminaLine}
    </dl>
    ${warn}
    ${renderConstraints(t)}
    ${renderMembers(r)}
    ${renderEndurance(t, r.dungeon)}
    ${t.steps?.length ? `<details><summary>立ち回り</summary><ol>${t.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></details>` : ""}
    ${src}
  </article>`;
}

// ---------- 耐久チェック（試作） ----------
// 回復の考え方（本人の指定）:
//   毎ターン使うスキルで回復ドロップを生成する → 毎ターンHP満タン（100%回復）として計算
//   そうでない → 編成内のリジェネ（◯ターンの間HPを◯%回復）の値で計算
function lsNumbers(no) {
  const [red, hp] = String(MDB.get(no)?.[19] ?? "").split("|");
  const mults = (hp ?? "").split(",").filter(Boolean).map((x) => {
    const [cond, m] = x.split("=");
    return { cond, mult: Number(m) };
  });
  return { red: Number(red) || 0, mults };
}

function hpMultFor(row, ls) {
  const types = String(row[13] ?? "").split(".");
  const attrs = [row[2], row[3]];
  const ATTR_BY_ID = { 1: "火", 2: "水", 3: "木", 4: "光", 5: "闇" };
  let m = 1;
  for (const { cond, mult } of ls.mults) {
    if (cond === "all" || (cond[0] === "t" && types.includes(cond.slice(1))) || (cond[0] === "a" && attrs.includes(ATTR_BY_ID[cond.slice(1)]))) {
      m *= mult;
      break; // 同じLSで重複して掛けない
    }
  }
  return m;
}

function enduranceSetup(t, opts = {}) {
  const mems = t.members.filter((m) => m.role !== "free");
  const leader = mems.find((m) => m.role === "L");
  const friend = mems.find((m) => m.role === "F");
  const lsL = lsNumbers(monster(leader?.id)?.no);
  const lsF = lsNumbers(monster(friend?.id)?.no);
  // HP推定: 最大HP（限界突破値）＋297の990、HP覚醒、LSのHP倍率、チームHP強化（5%/個）
  // バッジ（team.badge.hp: チームHP%、badge.targetNos があればそのキャラだけ）
  const badge = t.badge ?? null;
  // 加護: 耐久チェックでユーザーが選んだもの（なし/陽/陰）。未選択ならダンジョンのデータ
  const dungeonKago = opts.kago !== undefined ? opts.kago || null : db.dungeons.find((x) => x.id === t.dungeonId)?.kago ?? null;
  // 属性変更スキル（自分の属性が◯属性に変化）で主属性が変わった時のHPも出せるように、関数にしておく
  const teamHpWith = (overrides = new Map()) => {
  let total = 0;
  let teamHp = 0;
  let unknown = 0;
  const detail = [];
  for (const [mi, m] of mems.entries()) {
    const no = monster(m.id)?.no;
    const row0 = MDB.get(no);
    // 主属性の上書き（アシスト共鳴・アシストボーナス・LSの属性HP倍率の判定に使う）
    const row = row0 && overrides.has(mi) ? Object.assign([...row0], { 2: overrides.get(mi) }) : row0;
    if (!row) {
      unknown++;
      continue;
    }
    const b = m.build ?? {};
    const [flat, cnt] = String(row[18] ?? "0:0").split(":").map(Number);
    // レベル: Lv99 → 最大HP、Lv110 → 限界突破値、Lv120 → Lv110 + Lv99最大HPの10%
    // 変身しないキャラは常にLv120想定（限界突破できるキャラのみ）。変身キャラはレシートのレベル
    const hp99 = row[24] || row[17] || 0;
    const canLimitBreak = row[17] > hp99;
    const lv = row[9] ? b.lv ?? 110 : canLimitBreak ? 120 : 99;
    let hp = lv >= 120 ? row[17] + hp99 * 0.1 : lv >= 110 ? row[17] : hp99;
    // スキルボイスは素のステータスだけに1.1倍（＋値・潜在には乗らない）
    const ownAwk = String(row[25] ?? "").split(".").filter(Boolean).map(Number);
    hp *= 1.1 ** ownAwk.filter((a) => a === 63).length;
    // ＋値: HP・攻撃・回復に均等に振る前提（＋3でHP＋1）。HP＋1につき10（＋297 → 990、＋891 → 2970）。全パラ系の倍率はこの分にも乗る
    hp += Math.round((b.plus ?? 297) / 3) * 10;
    hp += flat;
    teamHp += cnt;
    const an = assistNoOf(m);
    const a = MDB.get(an);
    // アシストボーナス: 本体とアシストの主属性が同じなら、アシストのHP（Lv99最大＋297）の10%が本体に入る
    if (a && a[2] && a[2] === row[2]) hp += ((a[24] || a[17] || 0) + 990) * 0.1;
    if (a?.[8]) {
      const [af, ac] = String(a[18] ?? "0:0").split(":").map(Number);
      hp += af;
      teamHp += ac;
    }
    // 潜在のHP（HP強化1.5%/枠、＋4.5%、＋＋10%）
    hp *= 1 + (b.latentHp ?? 0) / 100;
    // 全パラ系の覚醒（通常覚醒・選んだ超覚醒・シンクロ覚醒）。アシスト共鳴は主属性とタイプが一致したときだけ、自力はアシストなしのときだけ
    const ids = ownAwk.filter((a) => a !== 63);
    if (b.super) ids.push(b.super);
    if (row[26] && b.synchro !== false) ids.push(row[26]);
    const mults = [];
    for (const id of ids) {
      const v = STAT_MULT[id];
      if (!v) continue;
      if (id === 138 && !(an && a && a[2] === row[2] && String(a[13] ?? "").split(".").some((x) => x && String(row[13] ?? "").split(".").includes(x)))) continue;
      if (id === 139 && an) continue;
      // 陽・陰の加護: ダンジョンに対応する加護があるときだけ、そのキャラのHPが加護1つにつき2倍
      if (id === 128 && dungeonKago !== "陽") continue;
      if (id === 129 && dungeonKago !== "陰") continue;
      hp *= v;
      mults.push(`${STAT_NAME[id]}×${v}`);
    }
    const lsm = hpMultFor(row, lsL) * hpMultFor(row, lsF);
    // ＋値のHP1あたりのHP（10 × 潜在 × 全パラ系 × LS）。チームHP強化は最後に掛ける
    const perPlus = 10 * (1 + (b.latentHp ?? 0) / 100) * mults.reduce((x, t) => x * Number(t.split("×")[1]), 1) * lsm;
    const hpPlus = Math.min(297, Math.round((b.plus ?? 297) / 3));
    detail.push({ no, name: row[1], hp: Math.round(hp * lsm), mults, lv, latentHp: b.latentHp ?? 0, known: !!m.build, perPlus, hpPlus });
    total += Math.max(1, hp) * lsm;
  }
  total = total * (1 + 0.05 * teamHp);
  if (badge?.hp) {
    // 全体に効くバッジはチームHPに掛ける。コラボバッジなど対象キャラ限定はそのキャラのHPだけ
    if (!badge.targetNos) total *= 1 + badge.hp / 100;
    else total += detail.filter((x) => badge.targetNos.includes(x.no)).reduce((n, x) => n + x.hp * (1 + 0.05 * teamHp) * (badge.hp / 100), 0);
  }
  total = Math.round(total);
  return { total, teamHp, unknown, detail };
  };
  const { total, teamHp, unknown, detail } = teamHpWith();
  const reduce = 1 - (1 - lsL.red / 100) * (1 - lsF.red / 100);
  // 回復: 毎ターン使うスキルが回復ドロップを生成するか
  const everyTurn = (t.constraints ?? []).filter((c) => c.type === "skillEveryTurn").map((c) => c.target);
  const genRows = (no) => (MDB.get(no)?.[9] ? familyRows.get(MDB.get(no)[9]) : [MDB.get(no)]).filter(Boolean);
  const healGen = everyTurn.some((no) => genRows(no).some((r) => String(r[16] ?? "").split(":")[1] === "1"));
  // スキルの軽減: 同じ効果は上書きされるので一番大きい1つ。作者が「スキルは使わない」とした武器は除く
  const unusedSkill = new Set((t.slotRoles ?? []).filter((sr) => sr.part === "assist" && sr.roles.some((r) => r.cap === "skillFree")).map((sr) => familyOf(sr.target)));
  // スキルの軽減・最大HPアップ（本人指定）: レシートに使う階が書かれているものだけ、スキルに書かれたターン数の間だけ効く。
  // 書かれていないものは使っていない扱い。重なった場合は最後に使ったもの（receiptUses の階が後、同じ階なら後ろに書いたもの）
  let skillRed = 0;
  let skillRedFrom = "";
  const reductions = [];
  const hpUps = [];
  const selfAttr = [];
  const enemyAttr = [];
  const awakenGrants = [];
  for (const [fl, nos] of Object.entries(t.receiptUses ?? {})) {
    nos.forEach((no, idx) => {
      const r = MDB.get(no);
      if (!r) return;
      const [, , red, hpm] = String(r[16] ?? "").split(":").map(Number);
      const order = Number(fl) * 100 + idx;
      if (red) {
        const awC = String(r[28] ?? "").split("|").find((x) => x.startsWith("目覚め条件:"))?.split(":");
        reductions.push({ red, dur: capDur(no, "reduce", false) ?? 1, name: r[1], floor: Number(fl), order, awaken: awC && awC[2].split("+").includes("red") ? awC[1] : null });
        if (red > skillRed) {
          skillRed = red;
          skillRedFrom = r[1];
        }
      }
      // 属性変更・条件（「敵が◯属性の時、効果が◯倍」）
      const ac = Object.fromEntries(String(r[28] ?? "").split("|").filter(Boolean).map((x) => { const [k, at, v] = x.split(":"); return [k, { attr: at, v: Number(v) }]; }));
      // ドロップ目覚めが条件の効果（「[◯目覚め]発動中、…」）
      const awCond = String(r[28] ?? "").split("|").find((x) => x.startsWith("目覚め条件:"))?.split(":");
      const awFor = (eff) => (awCond && awCond[2].split("+").includes(eff) ? awCond[1] : null);
      if (hpm) hpUps.push({ mult: hpm, dur: capDur(no, "hpUp", false) ?? 1, name: r[1], floor: Number(fl), order, cond: ac["条件"] ?? null, awaken: awFor("hp") });
      // ドロップ目覚めを付けるスキル
      const awGive = String(r[28] ?? "").split("|").find((x) => x.startsWith("目覚め付与:"))?.split(":");
      if (awGive) awakenGrants.push({ name: r[1], names: awGive[1].split(","), dur: Number(awGive[2]) || 1, floor: Number(fl), order });
      if (ac["自分"]) {
        // スキルの持ち主（本体、または武器を付けた本体）の主属性が変わる
        const mi = mems.findIndex((m) => monster(m.id)?.no === no || familyOf(monster(m.id)?.no) === familyOf(no) || assistNoOf(m) === no);
        if (mi >= 0) {
          const ratio = teamHpWith(new Map([[mi, ac["自分"].attr]])).total / Math.max(1, teamHpWith().total);
          selfAttr.push({ name: r[1], member: mi, attr: ac["自分"].attr, dur: ac["自分"].v || 99, floor: Number(fl), order, ratio });
        }
      }
      if (ac["敵"]) enemyAttr.push({ name: r[1], attr: ac["敵"].attr, dur: ac["敵"].v || 1, floor: Number(fl), order });
    });
  }
  if (!skillRed && (hpUps.length || selfAttr.length || enemyAttr.length)) skillRed = 1; // HPアップや属性変更だけでも「レシートどおり」の計算をする
  let regen = 0;
  let regenFrom = "";
  for (const m of mems) {
    for (const r of [...genRows(monster(m.id)?.no), ...(assistNoOf(m) ? [MDB.get(assistNoOf(m))].filter(Boolean) : [])]) {
      const v = Number(String(r[16] ?? "0").split(":")[0]) || 0;
      if (v > regen) {
        regen = v;
        regenFrom = r[1];
      }
    }
  }
  // 超根性を割合ダメージで剥がしてワンパンする階（作者の役割: gravity を◯Fで使う）→ 超根性発動時の攻撃は来ない
  const strip = new Map();
  for (const sr of t.slotRoles ?? []) {
    for (const r of sr.roles) if (r.cap === "gravity" && r.fireAtFloor) strip.set(r.fireAtFloor, MDB.get(sr.target)?.[1] ?? "");
  }
  // 属性ダメージ軽減の覚醒（1個7%）。武器は覚醒アシストのときだけ
  const awkAttr = Object.fromEntries(ATTRS5.map((a) => [a, 0]));
  let autoLatent = 0;
  for (const m of mems) {
    const rows = [MDB.get(monster(m.id)?.no)];
    const a = MDB.get(assistNoOf(m));
    if (a?.[8]) rows.push(a);
    for (const r of rows.filter(Boolean)) {
      String(r[22] || "0.0.0.0.0").split(".").forEach((n, i) => (awkAttr[ATTRS5[i]] += Number(n) * 7));
    }
    // レシートで読み取った潜在の属性軽減（盾に＋＝属性軽減＋ 2.5%/2枠）
    // 属性が分からない属性軽減＋（auto）は、あとでダンジョンに合わせて一番効く属性へ自動で振る
    for (const [a, v] of Object.entries(m.build?.latentAttr ?? {})) {
      if (a === "auto") autoLatent += v;
      else awkAttr[a] += v;
    }
  }
  const teamHpMult = (1 + 0.05 * teamHp) * (badge?.hp && !badge.targetNos ? 1 + badge.hp / 100 : 1);
  for (const x of detail) x.perPlus *= teamHpMult;
  return { badge, reductions, hpUps, selfAttr, enemyAttr, awakenGrants, autoLatent, estHp: total, unknown, reduce, healGen, regen, regenFrom, teamHp, skillRed, skillRedFrom, strip, awkAttr, detail, uses: t.receiptUses ?? {}, hasBuilds: mems.some((m) => m.build) };
}

const ATTRS5 = ["火", "水", "木", "光", "闇"];
// 全パラメータを掛ける覚醒（127 全パラ強化、142 全パラ強化＋、138 アシスト共鳴、139 自力、146/147 ソウル）
const STAT_MULT = { 127: 1.5, 142: 1.8, 138: 3, 139: 3, 146: 1.5, 147: 1.5, 128: 2, 129: 2 };
const STAT_NAME = { 127: "全パラ強化", 142: "全パラ強化＋", 138: "アシスト共鳴", 139: "自力", 146: "勇気のソウル", 147: "幸運のソウル", 128: "陽の加護", 129: "陰の加護" };
// 潜在の属性軽減: 1枠で1%、「＋」は2枠で2.5%。n枠で出せる最大の%
const latentPct = (slots) => Math.floor(slots / 2) * 2.5 + (slots % 2);
const latentText = (slots) => {
  const plus = Math.floor(slots / 2);
  const one = slots % 2;
  return [plus ? `属性軽減＋×${plus}` : "", one ? `属性軽減×${one}` : ""].filter(Boolean).join("・");
};

// useSkill（旧 skillRed）: 0 ならスキルの軽減なし、0以外なら各スキルの軽減を効果ターンの間だけ乗せる
// ターンの数え方: 先制は前の階の最後のターンの敵の行動扱い。超根性を剥がさない階は2ターン。突破時の1ターン経過（マイクロ）で1ターン進む
// 同じ効果は上書きされるので、そのターンに効いている軽減のうち最後に使ったものだけ（同じ階なら大きい方）
// latent: 潜在の属性軽減%（属性 → %）。属性軽減は覚醒と潜在の合計で、LS・スキルの軽減と掛け合わせる
// 敵が数体のうち1体の攻撃（attrs が複数）は、一番軽減が少ない属性で計算する（どれが出ても耐えられるか）
function simulateEndurance(d, setup, maxHp, useSkill = 0, latent = {}) {
  const attrRed = (a) => (ATTRS5.includes(a) ? Math.min(100, (setup.awkAttr?.[a] ?? 0) + (latent[a] ?? 0)) : 0);
  let hp = maxHp;
  const rows = [];
  let deadAt = null;
  let fail = null;
  let turn = 0;
  const firstTurn = {};
  // 条件（敵の属性）は使った時点で判定。満たすと効果も効果ターンも◯倍（日番谷など）
  const floorAttrMap = Object.fromEntries(d.damage.floors.map((f) => [f.floor, [...new Set(f.hits.flatMap((h) => h.attrs ?? []))]]));
  const condMet = (r) => {
    if (!r.cond) return false;
    const at = firstTurn[r.floor];
    const e = (setup.enemyAttr ?? []).filter((x) => firstTurn[x.floor] != null && firstTurn[x.floor] <= at && at <= firstTurn[x.floor] + x.dur - 1 && (x.floor < r.floor || x.order < r.order)).sort((a, b) => b.order - a.order)[0];
    const fa = e ? [e.attr] : floorAttrMap[r.floor] ?? [];
    return fa.length > 0 && fa.every((a) => a === r.cond.attr);
  };
  const durOf = (r) => (condMet(r) ? r.dur * r.cond.v : r.dur);
  // ドロップ目覚め: 味方のスキル（レシートの階から効果ターンの間）と、敵の先制（その階に着いた時から◯ターン）
  const enemyAwaken = [];
  const awakenAt = (name, tn) =>
    (useSkill && (setup.awakenGrants ?? []).some((g) => g.names.includes(name) && firstTurn[g.floor] != null && firstTurn[g.floor] <= tn && tn <= firstTurn[g.floor] + g.dur - 1)) ||
    enemyAwaken.some((g) => g.names.includes(name) && g.from <= tn && tn <= g.from + g.dur - 1);
  // そのターンに効いている効果のうち、最後に使ったもの（目覚めが条件の効果は、目覚めが出ている時だけ）
  const lastActive = (list, tn) => {
    const active = (list ?? []).filter((r) => firstTurn[r.floor] != null && firstTurn[r.floor] <= tn && tn <= firstTurn[r.floor] + durOf(r) - 1 && (!r.awaken || awakenAt(r.awaken, tn)));
    return active.sort((a, b) => b.order - a.order)[0] ?? null;
  };
  const skillAt = (tn) => (useSkill ? lastActive(setup.reductions, tn)?.red ?? 0 : 0);
  // 最大HPアップ: かかった時は今のHPも同じ倍率で増え、切れた時は新しい最大HPで頭打ち
  let hpMult = 1;
  const maxAt = () => maxHp * hpMult;
  // 敵の属性変更（その間は敵の属性が変わる）
  const enemyAttrAt = (tn, attrs) => {
    const e = useSkill ? lastActive(setup.enemyAttr, tn) : null;
    return e ? [e.attr] : attrs;
  };
  let floorAttrs = [];
  const updateHpMult = (tn) => {
    const up = useSkill ? lastActive(setup.hpUps, tn) : null;
    // 「敵が◯属性の時、効果が◯倍」: その階の敵がすべてその属性なら倍率の効果を倍にする
    let m = up ? (condMet(up) ? up.mult * up.cond.v : up.mult) : 1;
    // 自分の属性変更でアシスト共鳴などが変わる分（その間だけチームHPが ratio 倍）
    if (useSkill) {
      const byMember = new Map();
      for (const x of (setup.selfAttr ?? []).filter((x) => firstTurn[x.floor] != null && firstTurn[x.floor] <= tn && tn <= firstTurn[x.floor] + x.dur - 1)) {
        if (!byMember.has(x.member) || byMember.get(x.member).order < x.order) byMember.set(x.member, x);
      }
      for (const x of byMember.values()) m *= x.ratio;
    }
    if (m !== hpMult) {
      hp = m > hpMult ? (hp * m) / hpMult : Math.min(hp, maxHp * m);
      hpMult = m;
    }
  };
  const stripBy = (f, h) => {
    const used = (setup.uses?.[f.floor] ?? []).map((n) => MDB.get(n)).filter((r) => r?.[23]);
    const remain = used.reduce((x, r) => x * (1 - r[23] / 100), 1);
    return setup.strip?.get(f.floor) ?? (used.length && remain <= (h.threshold ?? 50) / 100 ? used.map((r) => r[1]).join("・") : null);
  };
  const hit = (f, h, tn) => {
    updateHpMult(tn);
    const raw = h.ratio ? (hp * h.ratio) / 100 : h.dmg;
    // 割合ダメージには属性軽減を乗せない（安全側）
    const attrs = enemyAttrAt(tn, h.attrs ?? []);
    const worst = h.ratio || !attrs.length ? null : attrs.reduce((w, a) => (attrRed(a) < attrRed(w) ? a : w), attrs[0]);
    const ar = worst ? attrRed(worst) : 0;
    const sk = skillAt(tn);
    // マイクロ後（noLsReduce）はLSの軽減だけ剥がれ、スキルの軽減は効果ターンが残っていれば効く
    const base = h.noLsReduce ? sk / 100 : 1 - (1 - setup.reduce) * (1 - sk / 100);
    const red = 1 - (1 - base) * (1 - ar / 100);
    const taken = Math.round(raw * (1 - red));
    hp -= taken;
    rows.push({ floor: f.floor, label: h.label, turn: tn, sk, hpMult, attrs, worst, ar, noLs: !!h.noLsReduce, raw: Math.round(raw), taken, left: Math.max(0, Math.round(hp)), ok: hp > 0 });
    if (hp <= 0) {
      deadAt = f.floor;
      fail = { attrs: h.ratio ? [] : attrs };
    }
    return hp > 0;
  };
  for (const f of d.damage.floors) {
    floorAttrs = [...new Set(f.hits.flatMap((h) => h.attrs ?? []))];
    // 敵の先制で付くドロップ目覚め（着いた時から）
    for (const a of f.awaken ?? []) enemyAwaken.push({ names: a.names, dur: a.dur, from: turn + 1 });
    // 到着時の先制（前の階の最後のターンの敵の行動）
    for (const h of f.hits.filter((x) => x.kind !== "turn" && x.kind !== "superResolve")) if (!hit(f, h, turn)) return { rows, deadAt, fail };
    for (const h of f.hits.filter((x) => x.kind === "turn")) {
      rows.push({ floor: f.floor, label: h.label, skipped: "ワンパンする前提なので受けない（1ターンで倒せないと受ける）" });
    }
    const sr = f.hits.filter((x) => x.kind === "superResolve");
    const stripped = sr.length ? stripBy(f, sr[0]) : null;
    const turns = sr.length && !stripped ? 2 : 1;
    for (let i = 0; i < turns; i++) {
      turn++;
      if (i === 0) firstTurn[f.floor] = turn;
      updateHpMult(turn);
      // 味方のターン: 回復（毎ターン回復生成なら満タン、なければリジェネ）
      hp = setup.healGen ? maxAt() : Math.min(maxAt(), hp + (maxAt() * setup.regen) / 100);
      if (i === 0) {
        for (const h of sr) {
          if (stripped) rows.push({ floor: f.floor, label: h.label, skipped: `${stripped}で超根性を剥がしてワンパンするため受けない` });
          else if (!hit(f, h, turn)) return { rows, deadAt, fail };
        }
      }
    }
    // 突破時の1ターン経過（マイクロ）
    if (f.turnPassOnClear) turn++;
  }
  return { rows, deadAt, fail };
}

// 倒れる場合に、何属性の軽減潜在を何枠ぶん振れば全フロア耐えられるか（少ない枠から順に試す）
function suggestLatents(d, setup, maxHp, skillRed, latent0) {
  const slots = Object.fromEntries(ATTRS5.map((a) => [a, 0]));
  const current = () => Object.fromEntries(ATTRS5.map((a) => [a, (latent0[a] ?? 0) + latentPct(slots[a])]));
  // パーティーの潜在枠は最大48（6体×8枠）
  for (let i = 0; i <= 48; i++) {
    const sim = simulateEndurance(d, setup, maxHp, skillRed, current());
    if (sim.deadAt == null) return { ok: true, slots };
    const cand = (sim.fail?.attrs ?? []).filter((a) => ATTRS5.includes(a));
    if (!cand.length) return { ok: false, slots, floor: sim.deadAt, reason: "属性軽減が効かない攻撃（無属性・割合ダメージ）" };
    // 敵が数体のうち1体の場合は、一番軽減が少ない属性に1枠足す
    const cur = current();
    const a = cand.reduce((w, x) => ((setup.awkAttr[x] ?? 0) + cur[x] < (setup.awkAttr[w] ?? 0) + cur[w] ? x : w), cand[0]);
    slots[a]++;
  }
  return { ok: false, slots, reason: "パーティーの潜在枠（最大48枠）を全部属性軽減にしても足りない" };
}

// 全員＋297で足りない場合の＋値の振り方: ＋値を上げると一番HPが伸びるキャラから順に（＋値の合計が最小になる）
// ＋300からは3ステータスに均等に振る前提（＋3ごとにHP＋1）。1体あたり最大＋891（HP＋297）
function plusAdvice(setup, maxHp, need) {
  if (need == null || maxHp >= need) return null;
  let deficit = need - maxHp;
  const plan = [];
  for (const x of [...setup.detail].sort((a, b) => b.perPlus - a.perPlus)) {
    if (deficit <= 0) break;
    const room = 297 - x.hpPlus;
    if (room <= 0) continue;
    const pts = Math.min(room, Math.ceil(deficit / x.perPlus));
    deficit -= pts * x.perPlus;
    plan.push({ name: x.name, from: x.hpPlus * 3, to: (x.hpPlus + pts) * 3 });
  }
  return { ok: deficit <= 0, plan, extra: plan.reduce((n, p) => n + p.to - p.from, 0) };
}

function renderPlusAdvice(setup, maxHp, need, label = "") {
  const pa = plusAdvice(setup, maxHp, need);
  if (!pa) return "";
  if (!pa.ok) return `<p class="hint">${label}全員を＋891まで上げても足りません。</p>`;
  return `<p class="advice">${label}＋値で足りるようにするなら: ${pa.plan.map((p) => `<strong>${esc(p.name)}</strong>を＋${p.from}→＋${p.to}`).join("、")}（＋値を合計${pa.extra}上げる。3ステータスに均等に振る前提）</p>`;
}

function renderLatentAdvice(d, setup, maxHp, skillRed, latent, sim) {
  if (sim.deadAt == null) return "";
  const sg = suggestLatents(d, setup, maxHp, skillRed, latent);
  const used = ATTRS5.filter((a) => sg.slots[a]);
  if (!sg.ok) return `<p class="hint">属性軽減の潜在では足りません（${sg.floor ? `${sg.floor}Fの` : ""}${esc(sg.reason)}）。</p>`;
  const total = used.reduce((n, a) => n + sg.slots[a], 0);
  return `<p class="advice">潜在覚醒の枠が空いていれば: ${used.map((a) => `<strong>${a}</strong>の${latentText(sg.slots[a])}（${latentPct(sg.slots[a])}%・${sg.slots[a]}枠）`).join("、")}を振れば全フロア耐えられる計算です（合計${total}枠。パーティー全体で振り分けてOK）</p>`;
}

// 全フロア耐えるのに必要な最低HP（二分探索）。無理な場合は null
function requiredHp(d, setup, skillRed, latent) {
  const ok = (hp) => simulateEndurance(d, setup, hp, skillRed, latent).deadAt == null;
  let hi = 1e8;
  if (!ok(hi)) return null;
  let lo = 1;
  while (hi - lo > 500) {
    const mid = Math.floor((lo + hi) / 2);
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi / 1000) * 1000;
}

// 属性が分からない属性軽減潜在（2.5%ずつ）を、必要HPが一番下がる属性へ1個ずつ振る
function allocateAutoLatent(d, setup, skillRed) {
  const units = Math.round((setup.autoLatent ?? 0) / 2.5);
  const alloc = Object.fromEntries(ATTRS5.map((a) => [a, 0]));
  if (!units) return alloc;
  const score = (extra) => {
    const s = { ...setup, awkAttr: Object.fromEntries(ATTRS5.map((a) => [a, setup.awkAttr[a] + extra[a]])) };
    return requiredHp(d, s, skillRed, {}) ?? Infinity;
  };
  for (let i = 0; i < units; i++) {
    let best = null;
    let bestScore = Infinity;
    for (const a of ATTRS5) {
      const trial = { ...alloc, [a]: alloc[a] + 2.5 };
      const sc = score(trial);
      if (sc < bestScore) {
        bestScore = sc;
        best = a;
      }
    }
    alloc[best ?? ATTRS5[0]] += 2.5;
  }
  return alloc;
}

function renderEnduranceResult(t, d, maxHp, latent = {}, kago) {
  const setup0 = enduranceSetup(t, { kago });
  // 属性不明の潜在は、スキル軽減ありの想定（あれば）で一番効く属性に振って固定する
  const auto = allocateAutoLatent(d, setup0, setup0.skillRed);
  const setup = { ...setup0, awkAttr: Object.fromEntries(ATTRS5.map((a) => [a, setup0.awkAttr[a] + auto[a]])) };
  const autoNote = setup0.autoLatent
    ? `<p class="hint">属性が判別できない属性軽減＋の潜在（合計${setup0.autoLatent}%）は、このダンジョンで一番効くように自動で振りました: ${ATTRS5.filter((a) => auto[a]).map((a) => `${a}${auto[a]}%`).join("・") || "どこに振っても変わらないため振り分けなし"}</p>`
    : "";
  const sim = simulateEndurance(d, setup, maxHp, 0, latent);
  // スキルの軽減ありの場合（効果が最後まで続く前提）
  const withSkill = setup.skillRed ? simulateEndurance(d, setup, maxHp, setup.skillRed, latent) : null;
  const skillLine = withSkill
    ? `<p class="${withSkill.deadAt == null ? "ok" : "ng"}">レシートどおりにスキルを使うと（${[
        ...setup.reductions.map((r) => `${esc(r.name)}の軽減${r.red}%`),
        ...setup.hpUps.map((r) => `${esc(r.name)}の最大HP${r.mult}倍${r.cond ? `（敵が${r.cond.attr}属性なら効果${r.cond.v}倍）` : ""}`),
        ...setup.selfAttr.map((r) => `${esc(r.name)}で${r.attr}属性に変化（チームHP×${r.ratio.toFixed(2)}）`),
        ...setup.enemyAttr.map((r) => `${esc(r.name)}で敵を${r.attr}属性に変化`),
      ].join("・")}）: ${withSkill.deadAt == null ? "全フロア耐えられる" : `${withSkill.deadAt}Fで倒れる`}計算です</p>
       ${renderLatentAdvice(d, setup, maxHp, setup.skillRed, latent, withSkill).replace("潜在覚醒の枠が空いていれば", "レシートどおりのスキルで、潜在覚醒の枠が空いていれば")}`
    : "";
  const heal = setup.healGen
    ? "毎ターン使うスキルで回復ドロップを生成 → 毎ターンHP満タンとして計算"
    : setup.regen
      ? `回復ドロップの毎ターン生成なし → リジェネ（${esc(setup.regenFrom)}の${setup.regen}%）で計算`
      : "回復ドロップの毎ターン生成・リジェネなし → 回復なしで計算";
  const awk = ATTRS5.filter((a) => setup.awkAttr[a]).map((a) => `${a}${setup.awkAttr[a]}%`).join("・");
  const verdict = sim.deadAt == null
    ? `<p class="ok"><strong>全フロア耐えられる計算です</strong></p>`
    : `<p class="ng"><strong>${sim.deadAt}Fで倒れる計算です</strong></p>`;
  const attrCell = (r) => (r.worst ? `${esc(r.worst)}${r.attrs.length > 1 ? `<small class="muted">（${esc(r.attrs.join("・"))}のどれか）</small>` : ""}${r.ar ? `<small> −${r.ar}%</small>` : ""}` : r.attrs?.includes("無") ? "無" : "―");
  const need0 = requiredHp(d, setup, 0, latent);
  const need1 = setup.skillRed ? requiredHp(d, setup, setup.skillRed, latent) : null;
  const fmt = (n) => (n == null ? "―（HPでは耐えられない）" : `${n.toLocaleString("ja-JP")}`);
  const need = `<p class="need">全フロア耐えるのに必要なHP: スキルなし <strong>${fmt(need0)}</strong>${setup.skillRed ? `／レシートどおり <strong>${fmt(need1)}</strong>` : ""}
    <small class="muted">（実際にクリアできている編成で推定HPが足りない場合は、潜在・超覚醒・Lv120などでこのHPまで補っているはずです）</small></p>`;
  const plusLines = renderPlusAdvice(setup, maxHp, need0, "スキルなしで、") + (setup.skillRed ? renderPlusAdvice(setup, maxHp, need1, "レシートどおりのスキルで、") : "");
  return `${need}${autoNote}${verdict}${renderLatentAdvice(d, setup, maxHp, 0, latent, sim)}${skillLine}${plusLines}
    <p class="hint">%指定のない「軽減」は35%として計算。スキルの軽減・最大HPアップは、レシートに使う階が書かれているものだけを、スキルに書かれたターン数の間だけ乗せています（重なった場合は最後に使ったもの。書かれていないスキルは使っていない扱い）。属性軽減は覚醒（${awk || "なし"}）と、上で入力した潜在の合計。割合ダメージには属性軽減を乗せていません。<br>下の表は${withSkill ? "レシートどおりにスキルを使った場合" : "スキルなし"}。軽減: リーダー・フレンドのLSで${Math.round(setup.reduce * 1000) / 10}%（LSの条件を毎ターン満たす前提）／${heal}</p>
    <div class="table-wrap"><table class="end-table"><thead><tr><th>階</th><th>攻撃</th><th>スキル軽減</th><th>属性</th><th>ダメージ</th><th>軽減後</th><th>残りHP</th></tr></thead><tbody>
    ${(withSkill ?? sim).rows.map((r) => r.skipped ? `<tr class="muted"><td>${r.floor}F</td><td>${esc(r.label)}</td><td colspan="5">${esc(r.skipped)}</td></tr>` : `<tr class="${r.ok ? "" : "ng"}"><td>${r.floor}F<small class="muted">（${r.turn}T）</small></td><td>${esc(r.label)}${r.noLs ? ` <span class="st st-ng">LS軽減なし</span>` : ""}</td><td>${r.sk ? `${r.sk}%` : "―"}</td><td>${attrCell(r)}</td><td>${r.raw.toLocaleString("ja-JP")}</td><td>${r.taken.toLocaleString("ja-JP")}</td><td>${r.ok ? r.left.toLocaleString("ja-JP") : "✗ 倒れる"}</td></tr>`).join("")}
    </tbody></table></div>`;
}

function renderEndurance(t, d) {
  if (!d?.damage?.floors?.length || t.multi) return "";
  const setup = enduranceSetup(t);
  const notes = d.damage.floors.filter((f) => f.note).map((f) => `${f.floor}F: ${esc(f.note)}`).join("／");
  const warn = `<p class="end-warn">⚠ この計算は攻略サイトのデータと推定値にもとづく<strong>目安</strong>で、間違っている可能性があります（敵の行動の抜け・条件の読み違い・HPの推定誤差など）。実際に挑む前にPDCやゲーム内で必ず確認してください。${d.damage.auto ? "このダンジョンの敵の攻撃は攻略サイトの表から自動で取り込んだもので、未確認です。" : ""}${t.members.some((m) => m.build) ? "" : "この編成はレシートの超覚醒・潜在・レベルが未登録のため、HPは低めに出ます。"}</p>`;
  return `<details class="endurance" data-team="${esc(t.id)}"><summary>耐久チェック（試作）</summary>
    ${warn}
    <div class="end-hp-label">
      <label>チームHP <input type="number" class="end-hp" data-team="${esc(t.id)}" min="1" step="1000" value="${setup.estHp}"></label>
      <label>ダンジョンの加護 <select class="end-kago">
        ${["", "陽", "陰"].map((k) => `<option value="${k}"${(d.kago ?? "") === k ? " selected" : ""}>${k ? `${k}の加護あり` : "なし"}</option>`).join("")}
      </select></label>
    </div>
    <p class="hint">初期値は推定です（レシートのレベル・＋値・超覚醒・潜在、HP覚醒、LSのHP倍率、チームHP強化${setup.teamHp}個${setup.badge?.hp ? `、バッジ「${esc(setup.badge.name)}」HP${setup.badge.hp}%` : ""}${setup.unknown ? `、図鑑にない${setup.unknown}体を除外` : ""}）。ゲーム内の実際のHPを入れると正確になります。</p>
    <div class="end-lat"><span class="label">振っている潜在の属性軽減（パーティー合計%）</span>
      ${ATTRS5.map((a) => `<label>${a}<input type="number" class="end-lat-in" data-attr="${a}" min="0" max="100" step="0.5" value="0">%</label>`).join("")}
    </div>
    <div class="end-result" data-pending="1"><p class="hint">計算中…</p></div>
    <p class="hint">敵の攻撃: <a href="${esc(d.damage.source.url)}" target="_blank" rel="noopener">${esc(d.damage.source.site)}</a>（${esc(d.damage.note)}）${notes ? `<br>${notes}` : ""}</p>
  </details>`;
}

// ---------- BOX ----------
function renderBox() {
  const f = $("#box-filter").value.trim();
  const list = db.monsters.filter((m) => !f || m.name.includes(f) || m.tags.some((t) => t.includes(f)));
  $("#box-list").innerHTML = list
    .map(
      (m) => `<label class="box-item ${box.has(m.id) ? "on" : ""}">
      <input type="checkbox" data-id="${esc(m.id)}" ${box.has(m.id) ? "checked" : ""}>
      ${iconHTML(m)}
      <span class="mname">${esc(m.name)}</span>${noLabel(m)}
      <span class="tags">${m.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</span>
    </label>`
    )
    .join("");
  $("#box-count").textContent = `${box.size} / ${db.monsters.length}体 所持`;
}

function renderMdbResults() {
  const el = $("#mdb-results");
  const q = $("#mdb-q").value;
  const hits = searchMonsterDB(q);
  el.innerHTML = hits
    .map((r) => {
      const owned = db.monsters.some((m) => m.no === r[0] && box.has(m.id));
      return `<li data-no="${r[0]}">${iconHTML(r[0])}${esc(r[1])}
        <small>No.${r[0]}${r[4] ? "・アシスト可" : ""}${owned ? "・所持済み" : ""}</small></li>`;
    })
    .join("");
  el.hidden = !q.trim() || !hits.length;
}

function saveBox() {
  saveJSON(BOX_KEY, [...box]);
  renderBox();
}

// ---------- データ管理 ----------
function nextId(prefix, list) {
  let n = list.length + 1;
  while (list.some((x) => x.id === `${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

function findOrCreateMonster(nameOrNo, tags = []) {
  const row = lookupMonster(nameOrNo);
  let m = row
    ? db.monsters.find((x) => x.no === row[0]) ?? db.monsters.find((x) => !x.no && x.name === row[1])
    : db.monsters.find((x) => x.name === nameOrNo.trim());
  if (!m) {
    m = row
      ? { id: `n${row[0]}`, no: row[0], name: row[1], attr: row[2], tags: [] }
      : { id: nextId("m", db.monsters), name: nameOrNo.trim(), attr: "", tags: [] };
    db.monsters.push(m);
  } else if (row && !m.no) {
    Object.assign(m, { no: row[0], name: row[1], attr: row[2] });
  }
  for (const t of tags) if (!m.tags.includes(t)) m.tags.push(t);
  return m;
}

function findOrCreateItem(name) {
  name = canonicalName(name);
  let it = matchRecords(db.items, name).find((x) => namesOf(x).includes(norm(name)));
  if (!it) {
    it = { id: nextId("i", db.items), name, category: "", aliases: [] };
    db.items.push(it);
  }
  return it;
}

// ---------- 重複チェック ----------
// 編成の中身（役割ごとの本体No.＋アシストNo.）。サブの並び順は問わない
function teamSignature(members) {
  return members
    .map((m) => `${m.role}${m.p ?? ""}:${familyOf(monster(m.id)?.no) ?? m.id}+${familyOf(assistNoOf(m)) ?? ""}`)
    .sort()
    .join("|");
}

// 参考元URLの比較用（Xはポストの番号、それ以外はクエリを外したURL）
function sourceKey(url) {
  const u = String(url ?? "").trim();
  if (!u) return "";
  const x = u.match(/(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/);
  return x ? `x:${x[1]}` : u.replace(/[?#].*$/, "").replace(/\/$/, "");
}

// 同じダンジョンで同じ編成、または同じ参考元の編成がすでにあれば返す
function findDuplicateTeam({ dungeonId, members, source, excludeId }) {
  const sig = teamSignature(members);
  const src = sourceKey(source);
  for (const t of db.teams) {
    if (t.id === excludeId) continue;
    if (dungeonId && t.dungeonId === dungeonId && teamSignature(t.members) === sig) return { team: t, reason: "同じダンジョンで同じ編成" };
    if (src && sourceKey(t.source) === src) return { team: t, reason: "同じ参考元" };
  }
  return null;
}

function duplicateMessage(dup) {
  const d = db.dungeons.find((x) => x.id === dup.team.dungeonId);
  return `すでに登録されています（${dup.reason}）: 「${dup.team.title}」${d ? `／${d.name}` : ""}。新規登録はしませんでした。`;
}

// 「キー: 値」形式の編成テキストを1件取り込む
function importText(text) {
  const t = { members: [], steps: [] };
  let dungeonName = "";
  let stamina = 0;
  const drops = [];
  const aliases = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const mm = line.match(/^([^:：]+)[:：]\s*(.*)$/);
    if (!mm) continue;
    const key = mm[1].trim();
    const val = mm[2].trim();
    if (/^[LFS]$/i.test(key)) {
      const [body, assistStr] = val.split(/[@＠]/);
      const [, name, tagStr] = body.match(/^(.*?)\s*(?:[\[［](.*)[\]］])?$/);
      const tags = tagStr ? tagStr.split(/[,、，]/).map((s) => s.trim()).filter(Boolean) : [];
      const assist = assistStr?.trim();
      if (name.trim()) t.members.push({ name: name.trim(), role: key.toUpperCase(), need: tags, assist });
    } else if (key === "ダンジョン") dungeonName = val;
    else if (key === "素材") {
      const [, name, pct] = val.match(/^(.*?)\s*(?:([\d.]+)\s*%)?$/);
      drops.push({ name: name.trim(), rate: pct ? Number(pct) / 100 : 1 });
    } else if (key === "別名") aliases.push(...val.split(/[,、，]/).map((s) => s.trim()).filter(Boolean));
    else if (key === "スタミナ") stamina = Number(val.replace(/\D/g, "")) || 0;
    else if (key === "タイトル") t.title = val;
    else if (key === "時間") t.timeSec = Number(val.replace(/[^\d.]/g, ""));
    else if (key === "楽さ") t.ease = Math.min(5, Math.max(1, Number(val) || 3));
    else if (key === "安定") t.stability = Math.min(100, Math.max(0, Number(val.replace(/[^\d.]/g, "")) || 80));
    else if (key === "手順") t.steps.push(...val.split(/[\/／]/).map((s) => s.trim()).filter(Boolean));
    else if (key === "出典") t.source = val;
    else if (key === "作者") t.authorName = val;
  }
  if (!dungeonName) throw new Error("「ダンジョン:」の行がありません");
  if (!t.timeSec) throw new Error("「時間:」の行がありません");
  const cnt = (role) => t.members.filter((m) => m.role === role).length;
  if (cnt("L") !== 1) throw new Error("「L:」（リーダー）は1行だけ書いてください");
  if (cnt("F") > 1) throw new Error("「F:」（フレンド）は1行までです");
  if (cnt("S") > SUB_SLOTS) throw new Error(`「S:」（サブ）は${SUB_SLOTS}行までです（今${cnt("S")}行）`);

  const members = t.members.map(({ name, role, need, assist }) => {
    const mem = { id: findOrCreateMonster(name, need).id, role, need };
    if (assist) {
      const row = lookupMonster(assist);
      mem.assist = row ? `${row[1]} No.${row[0]}` : assist;
    }
    return mem;
  });

  const dup = findDuplicateTeam({
    dungeonId: db.dungeons.find((x) => x.name === dungeonName)?.id,
    members,
    source: t.source,
  });
  if (dup) throw new Error(duplicateMessage(dup));

  let d = db.dungeons.find((x) => x.name === dungeonName);
  if (!d) {
    d = { id: nextId("d", db.dungeons), name: dungeonName, stamina, battles: 0, drops: [] };
    db.dungeons.push(d);
  }
  if (stamina) d.stamina = stamina;
  drops.forEach((drop, i) => {
    const it = findOrCreateItem(drop.name);
    // 「別名:」は最初の素材に付ける
    if (i === 0) {
      it.aliases ??= [];
      for (const a of aliases) if (norm(a) !== norm(it.name) && !it.aliases.includes(a)) it.aliases.push(a);
    }
    const existing = d.drops.find((x) => x.itemId === it.id);
    if (existing) existing.rate = drop.rate;
    else d.drops.push({ itemId: it.id, rate: drop.rate });
  });
  db.teams.push({
    id: nextId("t", db.teams),
    dungeonId: d.id,
    title: t.title || `${dungeonName} 編成`,
    timeSec: t.timeSec,
    ease: t.ease ?? 3,
    stability: t.stability ?? 80,
    members,
    steps: t.steps,
    source: t.source || "",
    ...(t.authorName ? { author: { name: t.authorName } } : {}),
  });
  persist();
  return d.name;
}

// 未登録の素材/ダンジョンから、テンプレを埋めた状態で取り込み画面を開く
function openRegister({ item, dungeon, alias }) {
  const lines = [
    `ダンジョン: ${dungeon ?? ""}`,
    `素材: ${item ?? ""} `,
    ...(alias ? [`別名: ${alias}`] : []),
    "スタミナ: ",
    "タイトル: ",
    "時間: 秒",
    "楽さ: 3",
    "安定: 90",
    "L: ",
    "S: ",
    "S: ",
    "S: ",
    "S: ",
    "F: ",
    "手順: ",
    "出典: ",
    "作者: ",
  ];
  $("#text-import").value = lines.join("\n");
  document.querySelector('.tab[data-tab="data"]').click();
  $("#text-import").focus();
}

// JSONを取り込み。同じidは上書き、新しいidは追加
function importJSON(obj) {
  const keys = ["monsters", "items", "dungeons", "teams"];
  if (!keys.some((k) => Array.isArray(obj[k]))) throw new Error("monsters / items / dungeons / teams のいずれかが必要です");
  const counts = {};
  for (const k of keys) {
    for (const rec of obj[k] ?? []) {
      if (!rec.id) continue;
      const i = db[k].findIndex((x) => x.id === rec.id);
      if (i >= 0) db[k][i] = rec;
      else db[k].push(rec);
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }
  persist();
  return counts;
}

function renderData() {
  $("#sample-banner").hidden = !db.seed;
  $("#data-summary").innerHTML = `<p>モンスター ${db.monsters.length} / 素材 ${db.items.length} / ダンジョン ${db.dungeons.length} / 編成 ${db.teams.length}</p>`;
  renderSuggestions();
}

// 候補リスト：1つのダンジョン/素材につき1行。略称で入力しても正式名の行が出る
let suggestIndex = -1;

function suggestionsFor(q) {
  const list = searchType === "dungeon" ? db.dungeons : db.items;
  if (!q.trim()) return list;
  const n = norm(canonicalName(q));
  const raw = norm(q);
  return list.filter((r) => namesOf(r).some((x) => x.includes(raw) || x.includes(n)));
}

function renderSuggestions() {
  const el = $("#q-suggest");
  if (document.activeElement !== $("#q")) {
    el.hidden = true;
    return;
  }
  const hits = suggestionsFor($("#q").value);
  suggestIndex = Math.min(suggestIndex, hits.length - 1);
  el.innerHTML = hits
    .map((r, i) => {
      const aka = r.aliases?.length ? `<small>${r.aliases.map(esc).join("・")}</small>` : "";
      return `<li role="option" data-name="${esc(r.name)}" class="${i === suggestIndex ? "active" : ""}">${esc(r.name)}${aka}</li>`;
    })
    .join("");
  el.hidden = hits.length === 0;
  $("#q").setAttribute("aria-expanded", String(!el.hidden));
}

function pickSuggestion(name) {
  $("#q").value = name;
  $("#q-suggest").hidden = true;
  suggestIndex = -1;
  search();
}

// ---------- アイコン（自作。公式イラストは使わない） ----------
const ATTR_KEY = { 火: "fire", 水: "water", 木: "wood", 光: "light", 闇: "dark" };

// 名前から1文字: 【】［］「」の飾りを外し、「・」の後ろ（キャラ名）の先頭を使う
function glyphOf(name) {
  const plain = String(name ?? "").replace(/[【［「\[].*?[】］」\]]/g, "").trim();
  const part = plain.split(/[・＆&＝=]/).map((x) => x.trim()).filter(Boolean);
  // 「完全卍解・日番谷」のように前が肩書きなら後ろ、「リルトット・ランパード」のようなフルネームなら前
  const before = plain.split("・")[0];
  const titled = plain.includes("・") && /[\u4e00-\u9fff\u3041-\u3096]/.test(before);
  const pick = titled ? part[part.length - 1] : part[0];
  return (pick || plain || "?").replace(/^[のはがを]/, "").charAt(0) || "?";
}

// no か monster から宝珠アイコンを作る。assist=true で小さい四角
function iconHTML(ref, { assist = false } = {}) {
  const row = typeof ref === "number" ? MDB.get(ref) : ref?.no ? MDB.get(ref.no) : null;
  const name = row?.[1] ?? ref?.name ?? "";
  const main = ATTR_KEY[row?.[2] ?? ref?.attr] ?? "none";
  const sub = ATTR_KEY[row?.[3]];
  // スキルの最短ターンを右下に表示（PDCのアイコンの代わりに一目で分かるように）
  const ct = row?.[5] ? `<b class="ct">${row[5]}</b>` : "";
  return `<span class="icon ${assist ? "icon-assist" : ""} a-${main}" title="${esc(name)}${row?.[5] ? `（スキル${row[5]}ターン）` : ""}" aria-hidden="true">${esc(glyphOf(name))}${
    sub ? `<i class="sub a-${sub}"></i>` : ""
  }${ct}</span>`;
}

// ---------- 編成登録 ----------
const REG_ROLES = ["L", "S", "S", "S", "S", "F"];
let regEditingId = null;

// 入力欄に図鑑の候補リストを付ける（assistOnly: アシスト可のものだけ）
function attachMonsterSuggest(input, { assistOnly = false, onPick } = {}) {
  const wrap = input.parentElement;
  const list = document.createElement("ul");
  list.className = "suggest";
  list.hidden = true;
  wrap.appendChild(list);
  const show = () => {
    const hits = searchMonsterDB(input.value, 30).filter((r) => !assistOnly || r[4]).slice(0, 8);
    list.innerHTML = hits
      .map((r) => `<li data-no="${r[0]}">${iconHTML(r[0], { assist: assistOnly })}<span>${esc(r[1])}<small>No.${r[0]}</small></span></li>`)
      .join("");
    list.hidden = !input.value.trim() || !hits.length;
  };
  input.addEventListener("input", () => {
    delete input.dataset.no;
    show();
    onPick?.();
  });
  input.addEventListener("focus", show);
  input.addEventListener("blur", () => setTimeout(() => (list.hidden = true), 150));
  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    e.preventDefault();
    setSlotValue(input, Number(li.dataset.no));
    list.hidden = true;
    onPick?.();
  });
}

function setSlotValue(input, no) {
  const row = MDB.get(no);
  input.value = row ? row[1] : "";
  if (row) input.dataset.no = String(no);
  else delete input.dataset.no;
}

// 入力欄の値を図鑑No.に解決（候補から選んでいなくても No. か正式名なら通す）
function resolveSlot(input) {
  if (input.dataset.no) return Number(input.dataset.no);
  if (!input.value.trim()) return null;
  const row = lookupMonster(input.value);
  return row ? row[0] : NaN;
}

function renderRegSlots() {
  const label = { L: "リーダー", S: "サブ", F: "フレンド" };
  $("#reg-slots").innerHTML = REG_ROLES.map(
    (role, i) => `<li class="reg-slot">
      <span class="role">${label[role]}</span>
      <span class="reg-preview" id="reg-prev-${i}">${iconHTML(null)}</span>
      <div class="suggest-wrap"><input id="reg-m-${i}" placeholder="${role === "S" ? "モンスター（空欄なら自由枠）" : "モンスター"}" autocomplete="off" aria-label="${label[role]}のモンスター"></div>
      <div class="suggest-wrap"><input id="reg-a-${i}" placeholder="アシスト（任意）" autocomplete="off" aria-label="${label[role]}のアシスト"></div>
    </li>`
  ).join("");
  REG_ROLES.forEach((_, i) => {
    const update = () => updateSlotPreview(i);
    attachMonsterSuggest($(`#reg-m-${i}`), { onPick: update });
    attachMonsterSuggest($(`#reg-a-${i}`), { assistOnly: true, onPick: update });
  });
}

function updateSlotPreview(i) {
  const m = resolveSlot($(`#reg-m-${i}`));
  const a = resolveSlot($(`#reg-a-${i}`));
  $(`#reg-prev-${i}`).innerHTML = (Number.isFinite(m) ? iconHTML(m) : iconHTML(null)) + (Number.isFinite(a) ? iconHTML(a, { assist: true }) : "");
}

function renderRegDungeons(selected) {
  $("#reg-dungeon").innerHTML =
    db.dungeons.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("") +
    `<option value="__new">＋ 新しいダンジョン…</option>`;
  // 指定がなければ最初のダンジョン（「新しいダンジョン」は明示的に選んだときだけ）
  $("#reg-dungeon").value = selected && selected !== "__new" ? selected : db.dungeons[0]?.id ?? "__new";
  if (selected === "__new") $("#reg-dungeon").value = "__new";
  $("#reg-new-dungeon").hidden = $("#reg-dungeon").value !== "__new";
}

// 立ち回りの文章から楽さの指標を出す（tools/receipt-metrics.py と同じ考え方）
function metricsFromText(text, plus891Choice) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const all = lines.join("\n");
  const count = (re) => (all.match(re) ?? []).length;
  const plus891 = { required: 1, some: 0.5, "not-required": 0 }[plus891Choice] ?? 0;
  return {
    chars: lines.reduce((n, l) => n + l.replace(/\s/g, "").length, 0),
    puzzle: count(/L字|T字|十字|光T|光L|[水火木光闇]L|way|列|盤面\s*\d+\s*[cC]|\+?\s*\d\s*[cC](?![a-z])|コンボ|全力|回復\s*[4４]|[4４]つ消し|[4４]消し/g),
    branch: count(/乱入|分岐|場合|通常|\bor\b/g),
    caution: count(/⚠|注意|耐久|ルーレット|ルレ|タゲ|ターゲット|順番/g),
    zurashi: count(/ずらし|ズラし|ズラシ/g),
    plus891,
    plus891Text: plus891Choice === "required" || plus891Choice === "not-required" ? plus891Choice : null,
  };
}

function regMessage(text, ok) {
  $("#reg-msg").className = `msg ${ok ? "ok" : "err"}`;
  $("#reg-msg").textContent = text;
}

function clearRegForm() {
  regEditingId = null;
  $("#reg-form").reset();
  REG_ROLES.forEach((_, i) => {
    delete $(`#reg-m-${i}`).dataset.no;
    delete $(`#reg-a-${i}`).dataset.no;
    updateSlotPreview(i);
  });
  renderRegDungeons();
  $("#reg-heading").textContent = "編成を登録";
  $("#reg-submit").textContent = "登録する";
}

async function saveRegForm() {
  // ダンジョン
  let dungeonId = $("#reg-dungeon").value;
  if (dungeonId === "__new") {
    const name = $("#reg-dungeon-name").value.trim();
    if (!name) return regMessage("新しいダンジョン名を入力してください。", false);
  }
  const min = Number($("#reg-min").value || 0);
  const sec = Number($("#reg-sec").value || 0);
  const timeSec = Math.round(min * 60 + sec);
  if (!timeSec) return regMessage("1周のタイムを入力してください。", false);

  // モンスター
  const members = [];
  for (let i = 0; i < REG_ROLES.length; i++) {
    const m = resolveSlot($(`#reg-m-${i}`));
    const a = resolveSlot($(`#reg-a-${i}`));
    const label = ["リーダー", "サブ1", "サブ2", "サブ3", "サブ4", "フレンド"][i];
    if (Number.isNaN(m)) return regMessage(`${label}の「${$(`#reg-m-${i}`).value}」が図鑑で見つかりません。候補から選ぶか図鑑No.を入力してください。`, false);
    if (Number.isNaN(a)) return regMessage(`${label}のアシスト「${$(`#reg-a-${i}`).value}」が図鑑で見つかりません。`, false);
    if (m == null) {
      if (REG_ROLES[i] === "L") return regMessage("リーダーを入力してください。", false);
      if (a != null) return regMessage(`${label}はアシストだけ入っています。モンスターも入力してください。`, false);
      continue;
    }
    const mem = { id: findOrCreateMonster(String(m)).id, role: REG_ROLES[i] };
    if (a != null) mem.assist = `${MDB.get(a)[1]} No.${a}`;
    members.push(mem);
  }

  const newName = $("#reg-dungeon-name").value.trim();
  let newDungeon = null;
  const dup = findDuplicateTeam({
    dungeonId: dungeonId === "__new" ? db.dungeons.find((d) => norm(d.name) === norm(newName))?.id : dungeonId,
    members,
    source: $("#reg-src").value,
    excludeId: regEditingId,
  });
  if (dup) return regMessage(regEditingId ? duplicateMessage(dup).replace("新規登録はしませんでした", "更新はしませんでした") : duplicateMessage(dup), false);

  if (dungeonId === "__new") {
    const name = newName;
    const existing = db.dungeons.find((d) => norm(d.name) === norm(name));
    if (existing) dungeonId = existing.id;
    else {
      dungeonId = `ud${Date.now()}`;
      newDungeon = { id: dungeonId, name, aliases: [], stamina: Number($("#reg-stamina").value || 0), battles: 0, drops: [], userAdded: true };
      db.dungeons.push(newDungeon);
    }
  }
  const dungeon = db.dungeons.find((d) => d.id === dungeonId);

  // 報酬: ダンジョンに素材がなければ追加、編成ごとの値は yields に
  const yields = {};
  for (const [inputId, itemId] of [["#reg-plus", "plus"], ["#reg-exp", "exp"]]) {
    const v = Number($(inputId).value || 0);
    if (!v || !db.items.some((it) => it.id === itemId)) continue;
    yields[itemId] = v;
    if (!dungeon.drops.some((d) => d.itemId === itemId)) dungeon.drops.push({ itemId, rate: v });
  }

  const stepsText = $("#reg-steps").value;
  const turns = Number($("#reg-turns").value || 0) || undefined;
  const team = {
    id: regEditingId ?? `u${Date.now()}`,
    userAdded: true,
    dungeonId,
    title: $("#reg-title").value.trim() || `${dungeon.name} 編成`,
    timeSec,
    ...(turns ? { turns } : {}),
    ...(Object.keys(yields).length ? { yields } : {}),
    members,
    steps: stepsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    source: $("#reg-src").value.trim(),
    ...($("#reg-author").value.trim() ? { author: { name: $("#reg-author").value.trim() } } : {}),
    sourceDate: new Date().toISOString().slice(0, 10),
    metrics: metricsFromText(stepsText, $("#reg-891").value),
    plus891Choice: $("#reg-891").value,
  };
  const verb = regEditingId ? "更新" : "登録";
  const editingShared = regEditingId && db.teams.find((t) => t.id === regEditingId)?.shared;
  let where = "local";
  if (shared.mode === "firebase") {
    if (!shared.fb.user) return regMessage("共有登録にはGoogleでログインしてください（上の「Googleでログイン」）。", false);
    $("#reg-submit").disabled = true;
    try {
      await shared.fb.submit({ ...toSharedTeam(team), ...(newDungeon ? { newDungeon: toSharedDungeon(newDungeon) } : {}) });
      where = "pending";
    } catch (e) {
      $("#reg-submit").disabled = false;
      const tooFast = e?.code === "permission-denied";
      return regMessage(tooFast ? "登録できませんでした。連続登録は1分に1件までです。少し待ってからもう一度試してください。" : `登録に失敗しました（${e?.message ?? e}）。`, false);
    }
    $("#reg-submit").disabled = false;
    if (newDungeon) db.dungeons = db.dungeons.filter((d) => d.id !== newDungeon.id);
    persist();
    clearRegForm();
    renderRegList();
    return regMessage(`「${team.title}」を承認待ちで登録しました。管理者が確認して承認すると、他の人の編成検索にも表示されます。`, true);
  } else if (shared.db && shared.canWrite !== false) {
    $("#reg-submit").disabled = true;
    try {
      if (newDungeon) await shared.db.doc(`dungeons/${newDungeon.id}`).set(toSharedDungeon(newDungeon));
      await shared.db.doc(`teams/${team.id}`).set(toSharedTeam(team));
      where = "shared";
    } catch (e) {
      // 書き込み権限がない（外部の閲覧者など）→ このブラウザにだけ保存
      if (e?.code === "invalid_argument") shared.canWrite = false;
      else if (editingShared) {
        $("#reg-submit").disabled = false;
        return regMessage("共有データへの保存に失敗しました。時間をおいてもう一度試してください。", false);
      }
    } finally {
      $("#reg-submit").disabled = false;
    }
  }
  if (where === "shared") {
    team.shared = true;
    if (newDungeon) newDungeon.shared = true;
  }
  const i = db.teams.findIndex((t) => t.id === team.id);
  if (i >= 0) db.teams[i] = team;
  else db.teams.push(team);
  persist();
  renderData();
  clearRegForm();
  renderRegList();
  regMessage(
    where === "shared"
      ? `「${team.title}」を${verb}しました。他の人の編成検索にも「${dungeon.name}」で表示されます。`
      : `「${team.title}」を${verb}しました（このブラウザにだけ保存。他の人には表示されません）。`,
    true
  );
}

// ---------- 共有データ（公開ページの共有DB） ----------
// 作成者（と招待された編集者）が登録した編成を、ページを開いた全員の検索に出す。
// ローカル（localhost）や共有DBが使えない閲覧では何もしない
const shared = { db: null, canWrite: null, teams: [], dungeons: [] };

// 共有DBに保存する形: モンスターは図鑑No.で持つ（閲覧者ごとの内部idに依存しない）
function toSharedTeam(t) {
  const { shared: _s, ...rest } = t;
  return {
    ...rest,
    members: t.members.map((m) => ({ no: monster(m.id)?.no ?? null, name: monster(m.id)?.name ?? "", role: m.role, ...(m.p ? { p: m.p } : {}), ...(m.assist ? { assist: m.assist } : {}) })),
  };
}
function toSharedDungeon(d) {
  const { shared: _s, ...rest } = d;
  return rest;
}
function fromSharedTeam(doc) {
  return {
    ...doc,
    shared: true,
    userAdded: true,
    members: (doc.members ?? []).map((m) => ({
      id: findOrCreateMonster(m.no ? String(m.no) : m.name || "?").id,
      role: m.role,
      ...(m.p ? { p: m.p } : {}),
      ...(m.assist ? { assist: m.assist } : {}),
    })),
  };
}

function applyShared() {
  const embedded = shared.teams.filter((t) => t.newDungeon && !shared.dungeons.some((d) => d.id === t.newDungeon.id)).map((t) => t.newDungeon);
  const sharedDungeons = [...shared.dungeons, ...embedded].filter((d, i, a) => a.findIndex((x) => x.id === d.id) === i);
  db.dungeons = [...db.dungeons.filter((d) => !d.shared), ...sharedDungeons.map((d) => ({ ...d, shared: true }))];
  const localIds = new Set(db.teams.filter((t) => !t.shared).map((t) => t.id));
  db.teams = [...db.teams.filter((t) => !t.shared), ...shared.teams.filter((t) => !localIds.has(t.id)).map(fromSharedTeam)];
  easeRangeCache = null;
  renderData();
  if (!$("#tab-register").hidden) {
    renderRegDungeons($("#reg-dungeon").value);
    renderRegList();
  }
  if (!$("#tab-search").hidden && $("#q").value.trim() && $("#results").children.length) search();
}

async function initShared() {
  if (window.PAD_FIREBASE) {
    shared.mode = "firebase";
    shared.fb = window.PAD_FIREBASE;
    shared.canWrite = true;
    shared.fb.onAuth.push(() => {
      updateRegMode();
      renderAdminPanel();
    });
    shared.fb.watchTeams((teams) => {
      shared.teams = teams;
      applyShared();
    });
    updateRegMode();
    return;
  }
  const use = window.claude?.use;
  if (!use) return;
  const [dbApi, user] = await Promise.all([use("db"), use("user")]);
  if (!dbApi) return;
  shared.db = dbApi;
  shared.canWrite = user?.can ? await user.can("data.write") : null;
  updateRegMode();
  const watch = (name) =>
    dbApi.collection(name).onSnapshot(
      (snap) => {
        shared[name] = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        applyShared();
      },
      () => {}
    );
  watch("dungeons");
  watch("teams");
}

// 管理者パネル（承認待ち・通報）
let adminUnsubs = [];
function renderAdminPanel() {
  const panel = $("#admin-panel");
  adminUnsubs.forEach((u) => u?.());
  adminUnsubs = [];
  if (shared.mode !== "firebase" || !shared.fb.isAdmin) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  adminUnsubs.push(
    shared.fb.watchPending((list) => {
      $("#admin-pending").innerHTML = list.length
        ? `<ul class="reg-list">${list
            .map((t) => `<li><div class="reg-info"><strong>${esc(t.title)}</strong>
              <span class="muted">${esc(db.dungeons.find((d) => d.id === t.dungeonId)?.name ?? t.newDungeon?.name ?? t.dungeonId)} ・ ${formatTime(t.timeSec)} ・ 登録者 ${esc(t.ownerName ?? "")}</span>
              ${t.source ? `<a href="${esc(t.source)}" target="_blank" rel="noopener">参考元</a>` : ""}
              <span class="muted">${esc((t.members ?? []).map((m) => m.name).join(" / "))}</span></div>
              <div class="row"><button type="button" class="primary" data-approve="${esc(t.id)}">承認して公開</button>
              <button type="button" data-reject="${esc(t.id)}">却下</button>
              <button type="button" class="danger" data-purge="${esc(t.id)}">削除</button></div></li>`)
            .join("")}</ul>`
        : `<p class="hint">承認待ちはありません。</p>`;
    })
  );
  adminUnsubs.push(
    shared.fb.watchReports((list) => {
      $("#admin-reports").innerHTML = list.length
        ? `<ul class="reg-list">${list
            .map((r) => `<li><div class="reg-info"><strong>${esc(db.teams.find((t) => t.id === r.teamId)?.title ?? r.teamId)}</strong>
              <span class="muted">${esc(r.reason)}</span></div>
              <div class="row"><button type="button" data-hide="${esc(r.teamId)}">編成を非公開にする</button>
              <button type="button" data-resolve="${esc(r.id)}">対応済みにする</button></div></li>`)
            .join("")}</ul>`
        : `<p class="hint">通報はありません。</p>`;
    })
  );
  adminUnsubs.push(
    shared.fb.watchFeedback((list) => {
      $("#admin-feedback").innerHTML = list.length
        ? `<ul class="reg-list">${list
            .map((f) => `<li><div class="reg-info"><span>${esc(f.text)}</span>
              <span class="muted">${f.contact ? `連絡先: ${esc(f.contact)} ・ ` : ""}${f.createdAt?.toDate ? esc(f.createdAt.toDate().toLocaleString("ja-JP")) : ""}</span></div>
              <div class="row"><button type="button" data-fbdel="${esc(f.id)}">対応済みにする（削除）</button></div></li>`)
            .join("")}</ul>`
        : `<p class="hint">感想はまだありません。</p>`;
    })
  );
}

function updateRegMode() {
  const el = $("#reg-mode");
  if (!el) return;
  const authBox = $("#reg-auth");
  if (shared.mode === "firebase") {
    const u = shared.fb.user;
    el.textContent = "登録した編成は管理者の確認後に公開され、他の人の編成検索にも表示されます（Googleログインが必要です）。";
    el.className = "note";
    authBox.hidden = false;
    authBox.innerHTML = u
      ? `<span class="muted">ログイン中: ${esc(u.displayName || u.email || "")}${shared.fb.isAdmin ? "（管理者）" : ""}</span> <button type="button" id="fb-signout">ログアウト</button>`
      : `<button type="button" class="primary" id="fb-signin">Googleでログイン</button>`;
    return;
  }
  if (shared.db && shared.canWrite !== false) {
    el.textContent = "登録した編成は、このページを開いた他の人の編成検索にも表示されます。";
    el.className = "note";
  } else if (shared.db) {
    el.textContent = "このページでは共有の登録ができないため、登録した編成はこのブラウザにだけ保存されます（他の人には表示されません）。";
    el.className = "note";
  } else {
    el.textContent = "登録した編成はこのブラウザに保存され、編成検索に並びます。";
    el.className = "hint";
  }
}

function loadIntoRegForm(id) {
  const t = db.teams.find((x) => x.id === id);
  if (!t) return;
  clearRegForm();
  regEditingId = t.id;
  renderRegDungeons(t.dungeonId);
  $("#reg-title").value = t.title;
  $("#reg-min").value = Math.floor(t.timeSec / 60);
  $("#reg-sec").value = t.timeSec % 60;
  $("#reg-turns").value = t.turns ?? "";
  $("#reg-plus").value = t.yields?.plus ?? "";
  $("#reg-exp").value = t.yields?.exp ?? "";
  $("#reg-891").value = t.plus891Choice ?? "";
  const order = { L: 0, S: 1, F: 2 };
  const sorted = [...t.members].sort((a, b) => order[a.role] - order[b.role]);
  const slots = { L: [0], S: [1, 2, 3, 4], F: [5] };
  for (const mem of sorted) {
    const i = slots[mem.role].shift();
    if (i == null) continue;
    const no = monster(mem.id)?.no;
    if (no) setSlotValue($(`#reg-m-${i}`), no);
    const a = assistNoOf(mem);
    if (a) setSlotValue($(`#reg-a-${i}`), a);
    updateSlotPreview(i);
  }
  $("#reg-steps").value = (t.steps ?? []).join("\n");
  $("#reg-src").value = t.source ?? "";
  $("#reg-author").value = t.author?.name ?? "";
  $("#reg-heading").textContent = "編成を編集";
  $("#reg-submit").textContent = "更新する";
  $("#reg-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

let regDeleteArmed = null;
function renderRegList() {
  const mine = db.teams.filter((t) => t.userAdded);
  $("#reg-list-title").textContent = shared.db ? "登録された編成" : "自分で登録した編成";
  $("#reg-list").innerHTML = mine.length
    ? `<ul class="reg-list">${mine
        .map((t) => {
          const d = db.dungeons.find((x) => x.id === t.dungeonId);
          const icons = t.members.map((m) => iconHTML(monster(m.id))).join("");
          const canEdit = !t.shared || (shared.mode === "firebase" ? t.status === "pending" && t.ownerUid === shared.fb.user?.uid : shared.canWrite !== false);
          const badge = !t.shared
            ? `<span class="badge badge-local">このブラウザのみ</span>`
            : t.status === "pending"
              ? `<span class="badge badge-pending">承認待ち</span>`
              : t.status === "rejected"
                ? `<span class="badge badge-local">非公開</span>`
                : `<span class="badge">公開中</span>`;
          const buttons = canEdit
            ? `<div class="row"><button type="button" data-edit="${esc(t.id)}">編集</button>
               <button type="button" class="danger" data-del="${esc(t.id)}">${regDeleteArmed === t.id ? "もう一度押すと削除" : "削除"}</button></div>`
            : "";
          return `<li><div class="reg-icons">${icons}</div>
            <div class="reg-info"><strong>${badge}${esc(t.title)}</strong><span class="muted">${esc(d?.name ?? "")} ・ ${formatTime(t.timeSec)}</span></div>
            ${buttons}</li>`;
        })
        .join("")}</ul>`
    : `<p class="hint">まだありません。上のフォームから登録できます。</p>`;
}

// ---------- イベント ----------
document.querySelectorAll(".tab").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === b));
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== `tab-${b.dataset.tab}`));
    if (b.dataset.tab === "box") renderBox();
    if (b.dataset.tab === "register") {
      renderRegDungeons($("#reg-dungeon").value);
      renderRegList();
    }
  })
);

function updateModeLabels() {
  const b1 = $('#mode [data-mode="expHour"]');
  const b2 = $('#mode [data-mode="expStamina"]');
  if (searchType === "dungeon") {
    b1.textContent = "経験値/時";
    b2.textContent = "経験値/スタミナ";
  } else {
    b1.textContent = "素材/時";
    b2.textContent = "素材/スタミナ";
  }
}

function setSearchType(type) {
  searchType = type;
  updateModeLabels();
  const t = SEARCH_TYPES[type];
  document.querySelectorAll("#search-type button").forEach((x) => x.classList.toggle("active", x.dataset.type === type));
  $("#q-label").textContent = t.label;
  $("#q").placeholder = t.placeholder;
  renderSuggestions();
}

document.querySelectorAll("#search-type button").forEach((b) =>
  b.addEventListener("click", () => {
    if (b.dataset.type === searchType) return;
    setSearchType(b.dataset.type);
    $("#q").value = "";
    $("#results").innerHTML = "";
    $("#q").focus();
  })
);

document.querySelectorAll("#mode button").forEach((b) =>
  b.addEventListener("click", () => {
    mode = b.dataset.mode;
    document.querySelectorAll("#mode button").forEach((x) => x.classList.toggle("active", x === b));
    if ($("#q").value.trim()) search();
  })
);

$("#run").addEventListener("click", search);
async function loadVotes(teamId) {
  if (shared.mode !== "firebase") return;
  const list = await shared.fb.getVotes(teamId).catch(() => []);
  for (const k of [...subVotes.keys()]) if (k.startsWith(teamId + "|")) subVotes.delete(k);
  for (const v of list) {
    const k = `${v.teamId}|${v.baseNo}|${v.candFamily}`;
    const cur = subVotes.get(k) ?? { ok: 0, ng: 0, reasons: {}, notes: [] };
    v.ok ? cur.ok++ : cur.ng++;
    if (!v.ok && v.reason) cur.reasons[v.reason] = (cur.reasons[v.reason] ?? 0) + 1;
    if (!v.ok && v.note && cur.notes.length < 3) cur.notes.push(v.note);
    subVotes.set(k, cur);
  }
}

// 耐久チェックは開いたときに初めて計算する（属性不明の潜在の自動振り分けが重いため）
$("#results").addEventListener(
  "toggle",
  (e) => {
    const box = e.target;
    if (!box.matches?.(".endurance") || !box.open) return;
    const res = box.querySelector(".end-result");
    if (!res?.dataset.pending) return;
    delete res.dataset.pending;
    const t = db.teams.find((x) => x.id === box.dataset.team);
    const d = t && db.dungeons.find((x) => x.id === t.dungeonId);
    if (!t || !d) return;
    setTimeout(() => (res.innerHTML = renderEnduranceResult(t, d, Number(box.querySelector(".end-hp").value), {}, box.querySelector(".end-kago").value)), 0);
  },
  true
);

// 耐久チェック: HPを書き換えたら再計算
$("#results").addEventListener("input", (e) => {
  const box = e.target.closest(".endurance");
  if (!box || !e.target.matches(".end-hp, .end-lat-in, .end-kago")) return;
  const t = db.teams.find((x) => x.id === box.dataset.team);
  const d = t && db.dungeons.find((x) => x.id === t.dungeonId);
  const hp = Number(box.querySelector(".end-hp").value);
  if (!t || !d || !(hp > 0)) return;
  const latent = Object.fromEntries([...box.querySelectorAll(".end-lat-in")].map((i) => [i.dataset.attr, Math.max(0, Number(i.value) || 0)]));
  const kago = box.querySelector(".end-kago").value;
  // 加護を変えたら推定HPも変わるので入れ直す
  if (e.target.matches(".end-kago")) box.querySelector(".end-hp").value = enduranceSetup(t, { kago }).estHp;
  box.querySelector(".end-result").innerHTML = renderEnduranceResult(t, d, Number(box.querySelector(".end-hp").value), latent, kago);
});

// 「回れなかった」の理由フォーム
$("#results").addEventListener("submit", (e) => {
  const form = e.target.closest(".vote-ng-form");
  if (!form) return;
  e.preventDefault();
  const box = form.closest(".alt-search");
  const btn = box.querySelector(".alt-btn");
  const team = db.teams.find((t) => t.id === btn.dataset.team);
  const mem = team.members[Number(btn.dataset.idx)];
  if (!shared.fb?.user) return window.alert?.("評価にはGoogleログインが必要です（編成登録タブからログインできます）");
  shared.fb
    .vote({ teamId: team.id, baseNo: monster(mem.id)?.no ?? 0, candFamily: familyOf(Number(form.dataset.cand)), ok: false, reason: form.reason.value, note: form.note.value.trim() })
    .then(() => loadVotes(team.id))
    .then(() => (box.querySelector(".alt-out").innerHTML = searchAltFor(team.id, Number(btn.dataset.idx))))
    .catch((err) => window.alert?.(`評価できませんでした: ${err.message}`));
});

$("#results").addEventListener("click", (e) => {
  const ngOpen = e.target.closest(".vote-ng-open");
  if (ngOpen) {
    const form = ngOpen.closest("li").querySelector(`.vote-ng-form[data-cand="${ngOpen.dataset.cand}"]`);
    if (form) form.hidden = !form.hidden;
    return;
  }
  const vb = e.target.closest(".vote-btn");
  if (vb) {
    const box = vb.closest(".alt-search");
    const btn = box.querySelector(".alt-btn");
    const team = db.teams.find((t) => t.id === btn.dataset.team);
    const mem = team.members[Number(btn.dataset.idx)];
    if (!shared.fb?.user) return window.alert?.("評価にはGoogleログインが必要です（編成登録タブからログインできます）");
    shared.fb
      .vote({ teamId: team.id, baseNo: monster(mem.id)?.no ?? 0, candFamily: familyOf(Number(vb.dataset.cand)), ok: vb.dataset.ok === "1" })
      .then(() => loadVotes(team.id))
      .then(() => (box.querySelector(".alt-out").innerHTML = searchAltFor(team.id, Number(btn.dataset.idx))))
      .catch((err) => window.alert?.(`評価できませんでした: ${err.message}`));
    return;
  }
  const rep = e.target.closest(".report-btn");
  if (rep) {
    if (!shared.fb.user) return window.alert?.("報告にはGoogleログインが必要です（編成登録タブからログインできます）");
    const reason = window.prompt?.("問題の内容を書いてください（誤り・無断転載・荒らしなど）");
    if (reason) shared.fb.report(rep.dataset.report, reason).then(() => (rep.textContent = "報告しました"));
    return;
  }
  const btn = e.target.closest(".alt-btn");
  if (!btn) return;
  const out = btn.nextElementSibling;
  if (out.innerHTML) {
    out.innerHTML = "";
    btn.textContent = btn.dataset.label;
    return;
  }
  btn.disabled = true;
  btn.textContent = "探しています…";
  // 図鑑1.4万体を調べるので、表示を更新してから計算する
  setTimeout(async () => {
    await loadVotes(btn.dataset.team);
    out.innerHTML = searchAltFor(btn.dataset.team, Number(btn.dataset.idx));
    btn.disabled = false;
    btn.textContent = "代用候補を閉じる";
  }, 20);
});
$("#q").addEventListener("input", () => {
  suggestIndex = -1;
  renderSuggestions();
});
$("#q").addEventListener("focus", renderSuggestions);
$("#q").addEventListener("blur", () => setTimeout(renderSuggestions, 150));
$("#q").addEventListener("keydown", (e) => {
  const items = [...document.querySelectorAll("#q-suggest li")];
  const open = !$("#q-suggest").hidden && items.length;
  if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    e.preventDefault();
    suggestIndex = (suggestIndex + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    renderSuggestions();
  } else if (e.key === "Escape") {
    $("#q-suggest").hidden = true;
  } else if (e.key === "Enter" && !e.isComposing) {
    if (open && suggestIndex >= 0) pickSuggestion(items[suggestIndex].dataset.name);
    else {
      $("#q-suggest").hidden = true;
      search();
    }
  }
});
$("#q-suggest").addEventListener("mousedown", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  e.preventDefault();
  pickSuggestion(li.dataset.name);
});
$("#owned-only").addEventListener("change", () => $("#q").value.trim() && search());

$("#box-filter").addEventListener("input", renderBox);
$("#mdb-q").addEventListener("input", renderMdbResults);
$("#mdb-q").addEventListener("blur", () => setTimeout(() => ($("#mdb-results").hidden = true), 150));
$("#mdb-results").addEventListener("mousedown", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  e.preventDefault();
  const m = findOrCreateMonster(li.dataset.no);
  box.add(m.id);
  persist();
  saveBox();
  $("#mdb-q").value = "";
  $("#mdb-results").hidden = true;
});
$(".mdb-credit").textContent = MDB_ROWS.length
  ? `図鑑データ: みんなで作るパズドラモンスターデータベース（${MDB_ROWS.length}体、${window.PAD_MONSTER_DB.updated}時点）`
  : "図鑑データが読み込めていません";
$("#box-list").addEventListener("change", (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  e.target.checked ? box.add(id) : box.delete(id);
  saveBox();
});
$("#box-all").addEventListener("click", () => {
  db.monsters.forEach((m) => box.add(m.id));
  saveBox();
});
$("#box-none").addEventListener("click", () => {
  box.clear();
  saveBox();
});

$("#text-import-run").addEventListener("click", () => {
  const msg = $("#text-import-msg");
  try {
    const name = importText($("#text-import").value);
    msg.className = "msg ok";
    msg.textContent = `「${name}」に編成を追加しました。`;
    $("#text-import").value = "";
    renderData();
  } catch (err) {
    msg.className = "msg err";
    msg.textContent = err.message;
  }
});

$("#json-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const msg = $("#json-msg");
  try {
    const counts = importJSON(JSON.parse(await file.text()));
    msg.className = "msg ok";
    msg.textContent = `取り込み完了: ${Object.entries(counts).map(([k, v]) => `${k} ${v}件`).join(" / ") || "0件"}`;
    renderData();
  } catch (err) {
    msg.className = "msg err";
    msg.textContent = `取り込み失敗: ${err.message}`;
  }
  e.target.value = "";
});

// 公開ページではファイルのダウンロードができないので、クリップボードへのコピーで書き出す
$("#json-export").addEventListener("click", async () => {
  const json = JSON.stringify(db, null, 2);
  const msg = $("#json-msg");
  try {
    await navigator.clipboard.writeText(json);
    msg.className = "msg ok";
    msg.textContent = "データをクリップボードにコピーしました。メモ帳などに貼り付けて .json で保存してください。";
  } catch {
    const box = $("#json-out");
    box.hidden = false;
    box.value = json;
    box.select();
    msg.className = "msg";
    msg.textContent = "自動でコピーできなかったので、下の枠の中身を選択してコピーしてください。";
  }
});

// confirm() が使えない環境があるので、確認はボタンを2回押す形にする
let resetArmed = null;
$("#reset").addEventListener("click", () => {
  const btn = $("#reset");
  if (!resetArmed) {
    btn.textContent = "もう一度押すと初期データに戻します";
    resetArmed = setTimeout(() => {
      btn.textContent = "初期データに戻す";
      resetArmed = null;
    }, 4000);
    return;
  }
  clearTimeout(resetArmed);
  resetArmed = null;
  btn.textContent = "初期データに戻す";
  db = structuredClone(window.PAD_SEED);
  persist();
  renderData();
  $("#results").innerHTML = "";
  $("#json-msg").className = "msg ok";
  $("#json-msg").textContent = "初期データに戻しました。";
});

renderRegSlots();
renderRegDungeons();
$("#reg-auth").addEventListener("click", (e) => {
  if (e.target.id === "fb-signin") shared.fb.signIn().catch((err) => regMessage(`ログインできませんでした（${err.message}）`, false));
  if (e.target.id === "fb-signout") shared.fb.signOut();
});
$("#admin-panel").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  try {
    if (b.dataset.approve) await shared.fb.setStatus(b.dataset.approve, "approved");
    if (b.dataset.reject) await shared.fb.setStatus(b.dataset.reject, "rejected");
    if (b.dataset.purge) await shared.fb.remove(b.dataset.purge);
    if (b.dataset.hide) await shared.fb.setStatus(b.dataset.hide, "rejected");
    if (b.dataset.resolve) await shared.fb.resolveReport(b.dataset.resolve);
    if (b.dataset.fbdel) await shared.fb.removeFeedback(b.dataset.fbdel);
  } catch (err) {
    alert?.(`操作に失敗しました: ${err.message}`);
  }
});
updateRegMode();
initShared();
$("#reg-dungeon").addEventListener("change", () => ($("#reg-new-dungeon").hidden = $("#reg-dungeon").value !== "__new"));
$("#reg-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  saveRegForm();
});
$("#reg-reset").addEventListener("click", () => {
  clearRegForm();
  $("#reg-msg").textContent = "";
});
$("#reg-list").addEventListener("click", async (e) => {
  const edit = e.target.closest("[data-edit]");
  if (edit) return loadIntoRegForm(edit.dataset.edit);
  const del = e.target.closest("[data-del]");
  if (!del) return;
  const id = del.dataset.del;
  if (regDeleteArmed !== id) {
    regDeleteArmed = id;
    renderRegList();
    setTimeout(() => {
      if (regDeleteArmed === id) {
        regDeleteArmed = null;
        renderRegList();
      }
    }, 4000);
    return;
  }
  regDeleteArmed = null;
  const target = db.teams.find((t) => t.id === id);
  if (target?.shared) {
    try {
      if (shared.mode === "firebase") await shared.fb.remove(id);
      else await shared.db.doc(`teams/${id}`).delete();
    } catch {
      return regMessage("共有データから削除できませんでした（削除できるのは作成者と編集者だけです）。", false);
    }
  }
  db.teams = db.teams.filter((t) => t.id !== id);
  persist();
  renderData();
  renderRegList();
  regMessage("編成を削除しました。", true);
});

renderData();

// ---------- 画像から自動入力（PDCのレシート＋クリア画像） ----------
// 読み取りはブラウザ内（Tesseract.js）。画像はどこにも送らない
let tesseractLoading = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  tesseractLoading ??= new Promise((ok, ng) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    s.onload = ok;
    s.onerror = () => ng(new Error("読み取りライブラリを読み込めませんでした"));
    document.head.appendChild(s);
  });
  return tesseractLoading;
}

// 小さい文字を読みやすくするため2倍に拡大して白黒寄りにする
async function imageToCanvas(file, scale = 2) {
  const bmp = await createImageBitmap(file);
  const c = document.createElement("canvas");
  c.width = bmp.width * scale;
  c.height = bmp.height * scale;
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(bmp, 0, 0, c.width, c.height);
  // 白黒にしてコントラストを上げる。暗い画面（クリア画像）は白文字なので反転して黒文字にする
  const img = g.getImageData(0, 0, c.width, c.height);
  const px = img.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
  const dark = sum / (px.length / 4) < 110;
  // 白い背景（PDCのレシート）はそのまま読んだ方が正確
  if (!dark) return c;
  for (let i = 0; i < px.length; i += 4) {
    let v = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    if (dark) v = 255 - v;
    v = Math.max(0, Math.min(255, (v - 128) * 1.6 + 128));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  return c;
}

async function ocr(file, lang, onStep) {
  // 小さい画像（横1000px未満）は3倍に拡大すると小さい文字が読める
  const bmp = await createImageBitmap(file);
  const canvas = await imageToCanvas(file, bmp.width < 1000 ? 3 : 2);
  const { data } = await Tesseract.recognize(canvas, lang, {
    logger: (m) => m.status === "recognizing text" && onStep?.(Math.round(m.progress * 100)),
  });
  return { ...data, imageWidth: canvas.width };
}

// 読み違えやすい文字を数字に（T→1、O→0 など）
const OCR_DIGIT = { T: "1", I: "1", l: "1", "|": "1", i: "1", O: "0", o: "0", D: "0", Q: "0", S: "5", s: "5", B: "8", Z: "2", z: "2", G: "6", g: "9", q: "9", A: "4" };
// 読み違えやすい数字どうし（3↔8 など）。図鑑にない番号のときに1文字ずつ入れ替えて探す
const OCR_SWAP = { 3: "8", 8: "30", 1: "7", 7: "1", 0: "8", 5: "6", 6: "58", 9: "8" };
function fixNo(raw, want) {
  const ok = (n) => {
    const r = MDB.get(n);
    return r && (want === "assist" ? r[4] === 1 : want === "base" ? !r[8] : true);
  };
  // 前後に余計な文字が混ざることがあるので、4〜5桁の窓をいくつか試す
  const wins = [...new Set([raw.length <= 5 ? raw : null, raw.slice(-5), raw.slice(0, 5), raw.slice(-4), raw.slice(0, 4)].filter((w) => w && w.length >= 3))];
  const swaps = (w) =>
    [...w].flatMap((c, i) => [...(OCR_SWAP[c] ?? "")].map((d) => w.slice(0, i) + d + w.slice(i + 1)));
  // 長い窓（5桁）を先に、完全一致→1文字入れ替え→2文字入れ替えの順で試す
  for (const len of [5, 4, 3]) {
    const ws = wins.filter((w) => w.length === len);
    for (const w of ws) if (ok(Number(w))) return Number(w);
    for (const w of ws) for (const x of swaps(w)) if (ok(Number(x))) return Number(x);
    for (const w of ws) for (const x of swaps(w)) for (const y of swaps(x)) if (ok(Number(y))) return Number(y);
  }
  return null;
}

// PDCのレシート: 「No12848」の位置から、上の段＝アシスト、下の段＝本体を6枠ずつ並べる
function parsePdcNumbers(data) {
  const hits = [];
  for (const w of data.words ?? []) {
    const m = w.text.match(/N[oO0]\.?(.{3,6})$/) ?? w.text.match(/N[oO0]\.?([\dTIl|OoDQSsBZzGgqA]{3,6})/);
    if (!m) continue;
    // 数字の後ろに付くゴミ文字（S や F など）は落とす。数字の途中の読み違えだけ直す
    const core = m[1].replace(/[^\dTIl|iOoDQSsBZzGgqA]/g, "").replace(/[A-Za-z|]+$/, "");
    const raw = core.replace(/[TIl|iOoDQSsBZzGgqA]/g, (c) => OCR_DIGIT[c]).slice(0, 6);
    if (raw.length < 3) continue;
    hits.push({ raw, x: (w.bbox.x0 + w.bbox.x1) / 2, y: (w.bbox.y0 + w.bbox.y1) / 2, lv: (w.text.match(/LV(\d{2,3})/i) ?? [])[1] });
  }
  if (!hits.length) return null;
  // 行ごとにまとめる（y が近いもの）
  hits.sort((a, b) => a.y - b.y);
  const rows = [];
  for (const h of hits) {
    const r = rows.find((r) => Math.abs(r.y - h.y) < 60);
    if (r) r.items.push(h);
    else rows.push({ y: h.y, items: [h] });
  }
  const [top, bottom] = rows.length >= 2 ? [rows[0], rows[1]] : [null, rows[0]];
  // 段が分かったので、上の段はアシストに付けられるもの、下の段は武器以外で番号を確かめる
  for (const h of top?.items ?? []) h.no = fixNo(h.raw, "assist");
  for (const h of bottom.items) h.no = fixNo(h.raw, "base");
  if (top) top.items = top.items.filter((h) => h.no);
  bottom.items = bottom.items.filter((h) => h.no);
  const bases = bottom.items.sort((a, b) => a.x - b.x);
  const width = data.imageWidth ?? Math.max(...hits.map((h) => h.x)) + 1;
  const col = (x) => Math.min(5, Math.floor((x / width) * 6));
  const slots = Array.from({ length: 6 }, () => ({}));
  for (const b of bases) slots[bases.length === 6 ? bases.indexOf(b) : col(b.x)].base = b;
  for (const a of top?.items ?? []) {
    // アシストは真下の本体と同じ列
    const near = bases.reduce((best, b) => (Math.abs(b.x - a.x) < Math.abs(best.x - a.x) ? b : best), bases[0]);
    slots[slots.findIndex((s) => s.base === near)].assist = a;
  }
  return slots;
}

// PDCのレシートの立ち回り（「Created by PDC」より下の行）
function parsePdcSteps(data) {
  const lines = (data.text ?? "").split("\n").map((l) => l.trim());
  const i = lines.findIndex((l) => /PDC|パズドラダメージ計算/.test(l));
  // 日本語の文字の間に入る余計な空白を消す
  const jp = /[^\x00-\x7F]/;
  return (i >= 0 ? lines.slice(i + 1) : [])
    .filter(Boolean)
    .map((l) => l.replace(/ +/g, (sp, at, str) => (jp.test(str[at - 1] ?? "") || jp.test(str[at + sp.length] ?? "") ? "" : " ")))
    // 「→」が「っ」「う」と読まれやすい（キャラ名の後ろに付くひらがなは矢印とみなす）
    .map((l) => l.replace(/(?<=[\u30A0-\u30FF\u4E00-\u9FFF)）])[っうぅ]{1,3}/g, "→"))
    .join("\n");
}

function parseClear(data) {
  const t = (data.text ?? "").replace(/[ 　]/g, "");
  const num = (re) => Number(((t.match(re) ?? [])[1] ?? "").replace(/[,，]/g, "")) || null;
  const tm = t.match(/タイム[:：]?(\d+)分([\d.]+)/);
  const dungeon = [...db.dungeons]
    .map((d) => ({ d, keys: [d.name, ...(d.aliases ?? [])].map((k) => k.replace(/[\s【】()（）]/g, "")).filter((k) => k.length >= 3) }))
    .find(({ keys }) => keys.some((k) => t.replace(/[【】()（）]/g, "").includes(k)))?.d;
  return {
    min: tm ? Number(tm[1]) : null,
    sec: tm ? Number(tm[2]) : null,
    turns: num(/ターン[:：]?(\d+)/),
    plus: num(/ポイント[:：]?([\d,，]+)/),
    exp: num(/EXP[:：]?([\d,，]+)/i),
    dungeon,
  };
}

// 投稿のリンクから作者名（Xの埋め込み用の公開情報。JSONP）
function fetchTweetAuthor(url) {
  return new Promise((ok) => {
    if (!/(x|twitter)\.com\/[^/]+\/status\/\d+/.test(url)) return ok(null);
    const cb = `oembed${Date.now()}`;
    const s = document.createElement("script");
    window[cb] = (d) => {
      ok(d?.author_name ?? null);
      delete window[cb];
      s.remove();
    };
    s.src = `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(url.replace("x.com", "twitter.com"))}&callback=${cb}`;
    s.onerror = () => ok(null);
    document.head.appendChild(s);
    setTimeout(() => ok(null), 8000);
  });
}

function setSlot(input, no) {
  if (!no) return;
  input.value = `${MDB.get(no)?.[1] ?? ""} No.${no}`;
  input.dataset.no = String(no);
}

async function runRegOcr() {
  const pdc = $("#reg-img-pdc").files[0];
  const clear = $("#reg-img-clear").files[0];
  const url = $("#reg-ocr-url").value.trim();
  const msg = (t) => ($("#reg-ocr-msg").textContent = t);
  if (!pdc && !clear) return msg("画像を選んでください。");
  $("#reg-ocr-run").disabled = true;
  const notes = [];
  try {
    msg("読み取りの準備中…（初回は数十秒かかります）");
    await loadTesseract();
    if (pdc) {
      const d = await ocr(pdc, "jpn+eng", (p) => msg(`PDCのレシートを読み取り中… ${p}%`));
      const slots = parsePdcNumbers(d);
      if (slots) {
        slots.forEach((s, i) => {
          setSlot($(`#reg-m-${i}`), s.base?.no);
          setSlot($(`#reg-a-${i}`), s.assist?.no);
          updateSlotPreview(i);
        });
        notes.push(`モンスター${slots.filter((s) => s.base).length}体・アシスト${slots.filter((s) => s.assist).length}体`);
      } else notes.push("図鑑No.が読み取れませんでした（手で入力してください）");
      const steps = parsePdcSteps(d);
      if (steps) {
        $("#reg-steps").value = steps;
        notes.push("立ち回り");
      }
    }
    if (clear) {
      const c = parseClear(await ocr(clear, "jpn+eng", (p) => msg(`クリア画像を読み取り中… ${p}%`)));
      if (c.min != null) {
        $("#reg-min").value = c.min;
        $("#reg-sec").value = c.sec;
        notes.push("タイム");
      }
      if (c.turns) ($("#reg-turns").value = c.turns), notes.push("クリアターン");
      if (c.plus) $("#reg-plus").value = c.plus;
      if (c.exp) $("#reg-exp").value = c.exp;
      if (c.plus || c.exp) notes.push("報酬");
      if (c.dungeon) {
        renderRegDungeons(c.dungeon.id);
        notes.push(`ダンジョン（${c.dungeon.name}）`);
      } else notes.push("ダンジョンは一覧から選んでください");
    }
    if (url) {
      $("#reg-src").value = url;
      const author = await fetchTweetAuthor(url);
      if (author) ($("#reg-author").value = author), notes.push("作者");
    }
    msg(`読み取りました: ${notes.join("・")}。内容を確認してから登録してください。`);
  } catch (e) {
    msg(`読み取りに失敗しました: ${e.message}`);
  } finally {
    $("#reg-ocr-run").disabled = false;
  }
}
$("#reg-ocr-run")?.addEventListener("click", runRegOcr);

// ---------- 感想・要望 ----------
// Firebase が使える時だけ（claude.ai 版などでは非表示）
$("#feedback").hidden = !window.PAD_FIREBASE;
$("#fb-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("#fb-text").value.trim();
  const msg = (t, ok) => ($("#fb-msg").className = `msg ${ok ? "ok" : "err"}`, ($("#fb-msg").textContent = t));
  if (!text) return msg("感想を書いてください。", false);
  try {
    await shared.fb.sendFeedback(text, $("#fb-contact").value.trim());
    $("#fb-text").value = "";
    msg("送りました。ありがとうございます！", true);
  } catch (err) {
    msg(`送れませんでした: ${err.message}`, false);
  }
});
