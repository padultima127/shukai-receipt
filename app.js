"use strict";

const DATA_KEY = "pad-farming:data";
const BOX_KEY = "pad-farming:box"; // 廃止した手持ちBOXの保存先（読み込み時に消す）
try {
  localStorage.removeItem(BOX_KEY);
} catch {}
// ロード・リザルト画面などダンジョン外で1周ごとにかかる秒数
const RUN_OVERHEAD_SEC = 20;
// 経験値効率で並べるモード → evaluate() の値の名前
// 効率順のモード。素材で探す時は探している素材の効率、ダンジョンで探す時は経験値の効率で並べる
const EXP_MODES = { expHour: "effPerHour", perRun: "effPerRun" };
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
  // 初期データ側でまとめた素材（6枠潜在など）は消す
  const removedItems = new Set(window.PAD_SEED.removed?.items ?? []);
  db.items = db.items.filter((x) => !removedItems.has(x.id));
  for (const t of db.teams) {
    if (!removed.has(t.dungeonId)) continue;
    const seedTeam = window.PAD_SEED.teams.find((x) => x.id === t.id);
    if (seedTeam) t.dungeonId = seedTeam.dungeonId;
  }
  db.version = window.PAD_SEED.version;
  saveJSON(DATA_KEY, db);
}
// 手持ちBOXは廃止（2026-10-01）。所持チェックまわりの処理は空のBOXとして動かす
const box = new Set();
// 画像から登録された編成に付いているアイコン（承認済みの編成から集める）{ 図鑑No.: data URL }
const SHARED_ICONS = {};
// 画像から登録した時に切り抜いたアイコン { 枠の番号: { base: data URL, assist: data URL } }
// （OCRがNo.を読み違えても、登録時にその枠に入っているキャラのアイコンとして保存する）
let regIcons = {};
// 画像から読み取った超覚醒 { 枠の番号: { no: 本体No., super: 覚醒No.（0＝なし） } }
let regSupers = {};
// 画像から読み取ったバッジ（data URL）
let regBadge = null;
// PDCのQRコードから読み取った編成（枠ごとのレベル・＋値・超覚醒・潜在）
let regQr = null;
// レシートから分からない超覚醒を、見る人が超覚醒一覧から選んだもの（このブラウザだけに保存）。{ "編成id:枠": 覚醒No. }
const SUPER_PICK_KEY = "pad-farming-super-picks";
let superPicks = loadJSON(SUPER_PICK_KEY, {});
// 選んだ超覚醒を編成データに反映する（build.userPicked 付き。レシート由来の超覚醒は上書きしない）
function applySuperPicks() {
  for (const t of db.teams) {
    t.members.forEach((m, i) => {
      if (m.build?.userPicked) {
        const { super: _s, userPicked: _u, ...rest } = m.build;
        if (Object.keys(rest).length) m.build = rest;
        else delete m.build;
      }
      const pick = superPicks[`${t.id}:${i}`];
      if (pick != null && m.build?.super == null) m.build = { ...(m.build ?? {}), super: pick, userPicked: true };
    });
  }
}
applySuperPicks();
// 耐久チェックで「レシートのビルドが分かっている」とみなすか（超覚醒だけ分かった・自分で選んだだけの枠は含めない）
const isFullBuild = (b) => !!b && !b.superOnly && !b.userPicked;
let mode = "speed";
let fastFilter = "all"; // 高速モード: "all"（どちらも）| "on" | "off"
// 編成のタイム。times があれば高速ON/OFFそれぞれ、なければ fastMode と timeSec から（不明は any）
function teamTimes(t) {
  if (t.times) return { on: t.times.on ?? null, off: t.times.off ?? null, any: null };
  if (t.fastMode === true) return { on: t.timeSec, off: null, any: null };
  if (t.fastMode === false) return { on: null, off: t.timeSec, any: null };
  return { on: null, off: null, any: t.timeSec };
}
// 検索の条件で使うタイム: ONのみ→ON、OFFのみ→OFF、どちらも→速い方（その条件のタイムがなければ null）
function effTime(t, f = fastFilter) {
  const tt = teamTimes(t);
  if (f === "on") return tt.on;
  if (f === "off") return tt.off;
  const v = [tt.on, tt.off, tt.any].filter((x) => x != null);
  return v.length ? Math.min(...v) : t.timeSec;
}
let searchType = "item"; // "item"(素材で探す) | "dungeon"(ダンジョンで探す)
const SEARCH_TYPES = {
  item: { label: "集めたい素材", placeholder: "例: スパノエ、プラス", noun: "素材" },
  dungeon: { label: "周回したいダンジョン", placeholder: "例: 万寿、ノエル大集合", noun: "ダンジョン" },
  leader: { label: "リーダー・フレンドのモンスター", placeholder: "例: 14098、ダイン、キコル", noun: "モンスター" },
};

// リーダー・フレンドで探す: 入力（図鑑No.か名前）に合うモンスターの No.（変身前後も同じキャラとして含める）
function leaderNosFor(q) {
  const raw = q.trim();
  if (!raw) return new Set();
  const famOf = (no) => MDB.get(no)?.[9] || no;
  const used = new Map(); // 編成のリーダー・フレンドに使われているキャラ（変身グループ → No.）
  for (const t of db.teams) for (const m of t.members) if (m.role === "L" || m.role === "F") {
    const no = monster(m.id)?.no;
    if (no) used.set(famOf(no), no);
  }
  const num = Number(raw.replace(/^No\.?\s*/i, ""));
  const out = new Set();
  if (Number.isInteger(num) && num > 0) {
    out.add(famOf(num));
  } else {
    const n = norm(raw);
    for (const [fam, no] of used) {
      const names = [MDB.get(no)?.[1], ...(familyRows.get(fam) ?? []).map((r) => r[1])].filter(Boolean).map(norm);
      if (names.some((x) => x.includes(n))) out.add(fam);
    }
  }
  return out;
}
// 候補: 編成でリーダー・フレンドに使われているキャラ
function leaderSuggestions() {
  const famOf = (no) => MDB.get(no)?.[9] || no;
  const seen = new Map();
  for (const t of db.teams) for (const m of t.members) if (m.role === "L" || m.role === "F") {
    const no = monster(m.id)?.no;
    if (!no || seen.has(famOf(no))) continue;
    seen.set(famOf(no), { name: MDB.get(no)?.[1] ?? monster(m.id)?.name ?? String(no), aliases: [`No.${no}`] });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

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
        const dungeons = sortedDungeons(match(db.dungeons, key));
        if (dungeons.length) return { dungeons, item: null, canonical };
      } else {
        const item = match(db.items, key)[0];
        if (item) {
          const dungeons = sortedDungeons(db.dungeons.filter((d) => d.drops.some((x) => x.itemId === item.id)));
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
    const b0 = candNo && m === mem && part === "base" ? candNo : monster(m.id)?.no;
    // スキブはダンジョン潜入時に効くので、変身キャラは変身前の姿の覚醒で数える
    const fam = MDB.get(b0)?.[9];
    const b = fam && fam !== b0 && MDB.get(fam) ? fam : b0;
    const a = candNo && m === mem && part === "assist" ? candNo : assistNoOf(m);
    n += MDB.get(b)?.[15] ?? 0;
    const ar = a && MDB.get(a);
    if (ar?.[8]) n += ar[15] ?? 0;
  }
  return n;
}

// その覚醒を持てるか（通常覚醒・シンクロ覚醒・超覚醒の候補のどれか）
function canHaveAwk(no, awk) {
  const r = MDB.get(no);
  if (!r) return false;
  const has = (k) => String(r[k] ?? "").split(".").includes(String(awk));
  return has(27) || r[26] === awk || has(11);
}
// 元の編成でその枠の共鳴（138）・自力（139）が発動しているか
function statAwakenState(mem) {
  const no = monster(mem.id)?.no;
  const an = assistNoOf(mem);
  const r = MDB.get(no);
  if (!r) return {};
  const has = (awk) => String(r[27] ?? "").split(".").includes(String(awk)) || r[26] === awk || mem.build?.super === awk;
  return { resonance: has(138) && !!an && resonates(no, an), jiriki: has(139) && !an };
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
  // 元の編成で共鳴・自力が発動している枠は、代用でも必ず同じように発動するものだけ（本人指定）
  const statOn = statAwakenState(mem);
  for (const no of nos) {
    if (used.has(familyOf(no))) continue;
    const row = MDB.get(no);
    if (!row || (part === "assist" && !row[4])) continue;
    // 本体の代用に装備（覚醒アシスト持ちの武器）は使えない
    if (part === "base" && row[8]) continue;
    if (noTransform && row[9]) continue;
    if (statOn.resonance && !(part === "base" ? canHaveAwk(no, 138) && resonates(no, assistNo) : resonates(baseNo, no))) continue;
    if (statOn.jiriki && part === "base" && !canHaveAwk(no, 139)) continue;
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

// ダンジョンボーナス（覚醒No.64）の数: 本体の通常覚醒・シンクロ覚醒・選んだ超覚醒、覚醒アシストの武器の覚醒から数える。
// 超覚醒が分からない枠で、超覚醒の候補にダンボがあるときは max だけ増える（「◯〜◯個」表示）
function dungeonBonusOf(t) {
  return awakeningCountOf(t, 64);
}
// 覚醒の数（本体の通常覚醒・シンクロ覚醒・選んだ超覚醒、覚醒アシストの武器）。超覚醒が不明で候補にある枠は max だけ増える
function awakeningCountOf(t, awk) {
  const key = String(awk);
  const count = (row, k) => String(row?.[k] ?? "").split(".").filter((x) => x === key).length;
  let min = 0;
  let max = 0;
  for (const m of t.members) {
    if (m.role === "free") continue;
    const row = MDB.get(monster(m.id)?.no);
    if (!row) continue;
    let n = count(row, 27) + (row[26] === awk && m.build?.synchro !== false ? 1 : 0);
    const an = assistNoOf(m);
    const a = an ? MDB.get(an) : null;
    if (a?.[8]) n += count(a, 27);
    min += n;
    max += n;
    if (m.build?.super != null) {
      if (m.build.super === awk) (min += 1), (max += 1);
    } else if (String(row[11] ?? "").split(".").includes(key)) max += 1;
  }
  return { min, max };
}
const formatDungeonBonus = ({ min, max }) => (min === max ? `${min}個` : `${min}〜${max}個（超覚醒次第）`);
// 部位破壊: ダンジョンに parts がある時だけ。可否・確定はレシートや投稿の記載（team.partBreak）、
// 確定の記載がなければドロップ率を推定（ダンジョンの基本の率＋部位破壊ボーナス1つにつき10%。基本は新凶兆50%、それ以外は原則10%＝本人談）
// リーダー・フレンドで潜入した時のドロップ倍率（変身キャラは変身前の形で潜入するので、その形のLS）。{ egg, part, exp, coin }
function entryDropBonus(no) {
  const row = MDB.get(no);
  if (!row) return {};
  const entry = (row[9] && MDB.get(row[9])) || row;
  const text = entry[30] || row[30] || "";
  return Object.fromEntries(text.split(",").filter(Boolean).map((x) => { const [k, v] = x.split(":"); return [k, Number(v)]; }));
}
// リーダー×フレンドの潜入時倍率（掛け算）。{ egg, part, exp, coin }（なければ1）
function lfMultipliers(t) {
  const out = { egg: 1, part: 1, exp: 1, coin: 1 };
  for (const m of t.members) {
    if (m.role !== "L" && m.role !== "F") continue;
    const b = entryDropBonus(monster(m.id)?.no);
    for (const k of Object.keys(out)) if (b[k]) out[k] *= b[k];
  }
  return out;
}
// 部位ドロップ率（%）: (基本の率＋部位破壊ボーナス1つにつき10%) × リーダーの倍率 × フレンドの倍率（本人談）
function partRate(t, d, bonusCount) {
  const mult = lfMultipliers(t).part;
  return { rate: Math.min(100, Math.round((d.parts.baseRate + 10 * bonusCount) * mult)), mult };
}
const multLabel = (m) => `×${+m.toFixed(2)}`;
// 部位ドロップが確定か（投稿・レシートに確定の記載、または推定が超覚醒に関係なく100%）
function partDropSure(t, d) {
  if (!d?.parts) return false;
  const text = [t.title, ...(t.steps ?? [])].join(" ");
  const pb = t.partBreak ?? (/部位[^、。]{0,8}確定|凶玉確定|部位確ドロ/.test(text) ? { sure: true } : {});
  if (pb.can === false) return false;
  return !!pb.sure || partRate(t, d, awakeningCountOf(t, 131).min).rate >= 100;
}
// 編成の右上に出す「部位破壊した場合のドロップ率」（部位のあるダンジョンだけ）
function partRateBadge(t, d) {
  if (!d?.parts) return "";
  const text = [t.title, ...(t.steps ?? [])].join(" ");
  const pb = t.partBreak ?? (/部位[^、。]{0,8}確定|凶玉確定|部位確ドロ/.test(text) ? { sure: true } : {});
  if (pb.can === false) return "";
  let v;
  let multNote = "";
  if (pb.sure) v = "確定";
  else {
    // 超覚醒は元のレシートのもの（分からない枠は部位破壊ボーナスにしていない扱い）
    const b = awakeningCountOf(t, 131);
    const lo = partRate(t, d, b.min);
    v = `推定${lo.rate}%`;
    multNote = lo.mult !== 1 ? `×リーダー・フレンドの倍率${+lo.mult.toFixed(2)}` : "";
  }
  return `<span class="part-rate" title="部位破壊した場合の${esc(d.parts.item)}のドロップ率${pb.sure ? "（投稿・レシートの記載）" : `（(基本${d.parts.baseRate}%＋部位破壊ボーナス1つにつき10%)${multNote}で推定）`}">部位ドロップ<b>${v}</b></span>`;
}
function partBreakInfo(t, d) {
  if (!d?.parts) return null;
  // 登録データがなければ、立ち回り・タイトルの文から読み取る（画像から登録した編成など）
  const text = [t.title, ...(t.steps ?? [])].join(" ");
  const pb = t.partBreak ?? (/部位[^、。]{0,8}確定|凶玉確定|部位確ドロ/.test(text) ? { can: true, sure: true, sureNote: "レシートの記載より" } : /部位/.test(text) ? { can: true } : {});
  const bonus = awakeningCountOf(t, 131);
  const rate = (n) => partRate(t, d, n).rate;
  const mult = partRate(t, d, 0).mult;
  const can = pb.can === true ? "部位破壊できる" : pb.can === false ? "部位破壊しない" : "部位破壊の記載なし";
  let drop;
  if (pb.can === false) drop = "";
  else if (pb.sure) drop = `${d.parts.item}は確定ドロップ（${(pb.sureNote ?? "投稿者談").replace(/（(.*?)）/g, "・$1")}）`;
  else {
    const lo = rate(bonus.min);
    drop = `${pb.can ? "" : "壊せた場合の"}${d.parts.item}のドロップ率 推定${lo}%（基本${d.parts.baseRate}%・部位破壊ボーナス${bonus.min}個${bonus.max > bonus.min ? "（超覚醒が分からない枠は部位破壊ボーナスなしで計算）" : ""}${mult !== 1 ? `・リーダー/フレンドで×${+mult.toFixed(2)}` : ""}）`;
  }
  return { can, drop, note: pb.note ?? "" };
}

function evaluate(team, dungeon, item, boxActive) {
  // マルチは プレイヤーA / B がそれぞれ リーダー1 + サブ4（フレンド枠なし）
  const sides = team.multi ? ["A", "B"] : [null];
  const members = sides.flatMap((p) =>
    arrangeSide(p ? team.members.filter((m) => m.p === p) : team.members, team, boxActive, p, dungeon)
  );
  // 部位破壊の数などで編成ごとに報酬が違う場合は team.yields を優先
  // リーダー・フレンドの潜入時倍率（タマゴ＝モンスターのドロップ、コイン、ランク経験値）
  const lfm = lfMultipliers(team);
  const itemMult = !item ? 1 : item.id === "coin" ? lfm.coin : item.egg ? lfm.egg : 1;
  const rate = !item
    ? 1
    : (team.yields?.[item.id] ?? dungeon.drops.filter((d) => d.itemId === item.id).reduce((s, d) => s + d.rate, 0)) * itemMult;
  const runSec = effTime(team) + RUN_OVERHEAD_SEC;
  const perHour = (3600 / runSec) * rate;
  const staminaPer = rate > 0 ? dungeon.stamina / rate : Infinity;
  // 経験値効率（ランク経験値）。編成ごとの値があればそちらを優先。スタミナ未登録なら出さない
  // ダンジョンの基本の経験値（攻略サイト）× リーダー・フレンドの倍率。プレイ履歴の値はイベントなどの倍率込みなので使わない
  const expPerRun = (dungeon.drops.find((d) => d.itemId === "exp")?.rate ?? team.yields?.exp ?? 0) * lfm.exp;
  const expPerHour = expPerRun ? (3600 / runSec) * expPerRun : null;
  const expPerStamina = expPerRun && dungeon.stamina > 0 ? expPerRun / dungeon.stamina : null;
  // マルチは自分が担当する側だけ揃えばよいので、足りない枠が少ない側で数える
  const count = (status, p) => members.filter((r) => r.status === status && (!p || r.mem.p === p)).length;
  const side = team.multi ? (count("missing", "A") <= count("missing", "B") ? "A" : "B") : null;
  const missing = count("missing", side);
  const substituted = count("substitute", side) + count("partial", side);
  const ease = easeOf(team);
  return { team, dungeon, members, side, rate, runSec, perHour, staminaPer, expPerHour, expPerStamina, expPerRun: expPerRun || null, lfm, itemMult, missing, substituted, easeScore: ease.score, ease, dbonus: dungeonBonusOf(team) };
}

function search() {
  const q = $("#q").value;
  let { dungeons, item, canonical } = searchType === "leader" ? { dungeons: [], item: null, canonical: q } : resolveQuery(q, searchType);
  // リーダー・フレンドで探す: そのキャラがリーダーかフレンドの編成（ダンジョンはまたがる）
  const leaderFams = searchType === "leader" ? leaderNosFor(q) : null;
  const famOf = (no) => MDB.get(no)?.[9] || no;
  const leaderHit = (t) => t.members.some((m) => (m.role === "L" || m.role === "F") && leaderFams.has(famOf(monster(m.id)?.no)));
  // ダンジョン指定（リーダー・フレンドで探す時だけ。空なら一致する全てのダンジョン）
  const leaderDg = leaderFams ? $("#leader-dungeon").value : "";
  if (leaderFams) dungeons = db.dungeons.filter((d) => (!leaderDg || d.id === leaderDg) && db.teams.some((t) => t.dungeonId === d.id && leaderHit(t)));
  const boxActive = box.size > 0;
  // 部位破壊のあるダンジョンが対象の時だけ「部位ドロップ確定だけ」のチェックを出す
  const hasParts = dungeons.some((d) => d.parts);
  $("#parts-only-wrap").hidden = !hasParts;
  const partsOnly = hasParts && $("#parts-only").checked;
  const out = $("#results");

  if (!q.trim()) {
    out.innerHTML = `<p class="empty">${SEARCH_TYPES[searchType].noun}名を入力してください。</p>`;
    return;
  }

  let rows = dungeons.flatMap((d) =>
    // 高速モードONのみ・OFFのみの時は、その条件のタイムがある編成だけ
    db.teams.filter((t) => t.dungeonId === d.id && effTime(t) != null && (!leaderFams || leaderHit(t))).map((t) => evaluate(t, d, item, boxActive))
  );
  const total = rows.length;
  if (!total && leaderFams) {
    const dgName = leaderDg ? db.dungeons.find((d) => d.id === leaderDg)?.name : null;
    out.innerHTML = `<div class="card unregistered"><p>「${esc(q)}」がリーダーかフレンドの編成は${dgName ? `「${esc(dgName)}」に` : ""}見つかりませんでした。図鑑No.か名前の一部で探せます（候補はリーダー・フレンドに使われているキャラだけ）。</p></div>`;
    return;
  }
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
  if (partsOnly) rows = rows.filter((r) => partDropSure(r.team, r.dungeon));


  const maxPerHour = Math.max(...rows.map((r) => r.perHour), 1e-9);
  const penalty = (r) => r.missing * PENALTY_MISSING + r.substituted * PENALTY_SUBSTITUTE;
  for (const r of rows) r.speedScore = (r.perHour / maxPerHour) * 100;
  // 効率の対象: 素材で探す→その素材、ダンジョンで探す→経験値
  for (const r of rows) {
    r.effPerHour = item ? r.perHour : r.expPerHour;
    // 1周あたり（素材で探す→その素材の数、ダンジョンで探す→経験値）
    r.effPerRun = item ? (r.rate > 0 ? r.rate : null) : r.expPerRun;
  }
  // 点数評価はいったん廃止（本人指定）。選んだ指標で並べるだけ（点数は出さない）
  const expKey = EXP_MODES[mode];
  const timeOf = (r) => effTime(r.team) ?? Infinity;
  if (expKey) {
    // 効率順。データがない編成は最後に回す
    rows.sort((a, b) => (b[expKey] ?? -Infinity) - (a[expKey] ?? -Infinity) || timeOf(a) - timeOf(b));
  } else if (mode === "dbonus") {
    // ダンボ数順: 確定している数が多い順、同じなら1周が速い順
    rows.sort((a, b) => b.dbonus.min - a.dbonus.min || b.dbonus.max - a.dbonus.max || timeOf(a) - timeOf(b));
  } else {
    // 速さ: 1周のタイムが短い順
    rows.sort((a, b) => timeOf(a) - timeOf(b));
  }

  const head =
    (item
      ? `<p class="summary">「${esc(item.name)}」が出るダンジョン ${dungeons.length}件 / 編成 ${rows.length}件</p>`
      : leaderFams
        ? `<p class="summary">「${esc(q)}」がリーダーかフレンドの編成 ${rows.length}件（${leaderDg ? esc(db.dungeons.find((d) => d.id === leaderDg)?.name ?? "") : `${new Set(rows.map((r) => r.dungeon.id)).size}ダンジョン`}）</p>`
        : `<p class="summary">編成 ${rows.length}件</p>`) +
    `<p class="caution">⚠️ 編成・アシスト・立ち回りは要約や読み取りのため、誤りや省略があるかもしれません。参考にするときは<strong>必ず各編成の「元のポスト／元の記事」のリンク先を確認</strong>してください。</p>`;

  if (!rows.length) {
    out.innerHTML =
      head +
      `<p class="empty">条件に合う編成がありません（全${total}件）。高速モードや部位ドロップの絞り込みを外してみてください。</p>`;
    return;
  }
  out.innerHTML = head + rows.map((r, i) => renderResult(r, i, item)).join("");
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
  const sup = mem.build?.super ? `<span class="awk-sep">${mem.build.userPicked ? "超（自分で選択）" : "超"}</span>${awkIcon(mem.build.super, "awk-super")}` : "";
  const syn = row[26] ? `<span class="awk-sep">シンクロ</span>${awkIcon(row[26], "awk-super")}` : "";
  const a = MDB.get(assistNoOf(mem));
  const aIds = a?.[8] ? String(a[27] ?? "").split(".").filter(Boolean).map(Number).filter((x) => x !== 49) : [];
  const weapon = aIds.length ? `<div class="awk-row awk-weapon"><span class="awk-sep">武器</span>${aIds.map((x) => awkIcon(x)).join("")}</div>` : "";
  return `<div class="awk-row">${ids.map((x) => awkIcon(x)).join("")}${sup}${syn}</div>${weapon}`;
}

// 名前の横の「超覚醒一覧」: レシートで選ばれていない超覚醒も確認できる（選ばれているものは枠付き）
// レシートから分からない時は、一覧から選ぶとダンボ数・耐久チェックに反映される（このブラウザに保存）
function renderSuperList(r) {
  const mem = r.mem;
  const row = MDB.get(monster(mem.id)?.no);
  const ids = String(row?.[11] ?? "").split(".").filter(Boolean).map(Number);
  if (!ids.length) return "";
  const fromReceipt = mem.build?.super != null && !mem.build.userPicked;
  const key = `${r.teamId}:${r.idx}`;
  if (fromReceipt)
    return `<details class="awk-supers"><summary>超覚醒一覧（${ids.length}）</summary><div class="awk-row">${ids
      .map((id) => awkIcon(id, id === mem.build.super ? "awk-super" : ""))
      .join("")}</div><small class="muted">枠付きがレシートで選ばれている超覚醒</small></details>`;
  const picked = mem.build?.userPicked ? mem.build.super : null;
  return `<details class="awk-supers" data-super-key="${esc(key)}"><summary>超覚醒一覧（${ids.length}）${picked ? "・選択中" : ""}</summary><div class="awk-row">${ids
    .map((id) => `<button type="button" class="awk-pick${id === picked ? " on" : ""}" data-pick-key="${esc(key)}" data-pick-super="${id}" aria-pressed="${id === picked}">${awkIcon(id, id === picked ? "awk-super" : "")}</button>`)
    .join("")}</div><small class="muted">レシートからは選んだ超覚醒が分かりません。選ぶとダンボ数と耐久チェックに反映されます（このブラウザに保存）${picked ? ` ・ <button type="button" class="linkish" data-pick-key="${esc(key)}" data-pick-super="">選択を外す</button>` : ""}</small></details>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-pick-key]");
  if (!b) return;
  e.preventDefault();
  const key = b.dataset.pickKey;
  const id = Number(b.dataset.pickSuper);
  if (!id || superPicks[key] === id) delete superPicks[key];
  else superPicks[key] = id;
  saveJSON(SUPER_PICK_KEY, superPicks);
  applySuperPicks();
  // 結果を描き直して、開いていた一覧はそのまま開いておく
  const y = window.scrollY;
  if ($("#results").children.length) search();
  document.querySelectorAll(`details[data-super-key="${CSS.escape(key)}"]`).forEach((d) => (d.open = true));
  window.scrollTo(0, y);
});

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
    <div class="mem-main"><span class="mname">${esc(name)}</span>${noLabel(r.m)}${status}${renderSuperList(r)}
      ${renderAwakenings(r.mem)}${latentStripHTML(r.teamId, r.idx) || latentNamesHTML(r.mem)}
      ${renderChanges(r.mem, db.teams.find((t) => t.id === r.teamId) ?? {})}${assist}${extra}${altButton(r)}</div>
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
  const note = `<p class="hint">図鑑全体から探しています。</p>`;
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
// QRコードから読んだ潜在覚醒を名前で並べる（PDCの画像を切り抜いていない編成用）
function latentNamesHTML(mem) {
  const codes = mem.build?.latents;
  if (!codes?.length) return "";
  const count = new Map();
  for (const c of codes) count.set(c, (count.get(c) ?? 0) + 1);
  const text = [...count].map(([c, n]) => `${PDC_LATENT[c] ?? `不明(${c})`}${n > 1 ? `×${n}` : ""}`).join("・");
  return `<div class="awk-row"><span class="awk-sep">潜在</span><small>${esc(text)}</small></div>`;
}
// PDCレシートの潜在覚醒の欄（最大8枠）を切り抜いた画像
function latentStripHTML(teamId, idx) {
  const L = window.PAD_LATENTS;
  const i = L?.index?.[`${teamId}:${idx}`];
  if (i == null) return "";
  const pos = `${((i % L.cols) / Math.max(1, L.cols - 1)) * 100}% ${(Math.floor(i / L.cols) / Math.max(1, L.rows - 1)) * 100}%`;
  return `<div class="awk-row"><span class="awk-sep">潜在</span><span class="latent-strip" title="潜在覚醒（PDCレシートより）" style="background-image:url('latents.webp?v=${L.ver}');background-size:${L.cols * 100}% ${L.rows * 100}%;background-position:${pos}"></span></div>`;
}
// PDCで選んだバッジ（レシートのタイトルの左のアイコン。badges.webp から、画像から登録した編成は badgeIcon）
// PDCのQRコードのバッジ番号 → バッジ名（名前はゲームウィズのバッジ一覧の絵と見比べて確認）
const BADGE_NAMES = {
  2: "HP強化＋", 7: "落ちコンなし", 9: "全体攻撃", 18: "バインド耐性",
  41: "神タイプ強化", 42: "ドラゴンタイプ強化", 43: "悪魔タイプ強化", 44: "マシンタイプ強化", 46: "攻撃タイプ強化",
  61: "星を紡ぐ精霊", 86: "L字消し攻撃", 97: "銀魂", 98: "2体攻撃強化", 103: "火列強化", 104: "T字消し攻撃", 105: "水コンボ強化",
  110: "アイドル",
};
// バッジのHPアップ（ゲームウィズのバッジ一覧の効果から）。全体: チームHP%、タイプ強化: そのタイプのキャラだけHP5%
const BADGE_HP = { 2: 15, 86: 5, 98: 5, 104: 5 };
const BADGE_TYPE = { 41: 5, 42: 4, 43: 7, 44: 8, 46: 6 }; // 神・ドラゴン・悪魔・マシン・攻撃（タイプ番号）
const BADGE_TYPE_BY_NAME = { バランスタイプ強化: 1, 体力タイプ強化: 2, 回復タイプ強化: 3, ドラゴンタイプ強化: 4, 神タイプ強化: 5, 攻撃タイプ強化: 6, 悪魔タイプ強化: 7, マシンタイプ強化: 8 };
function badgeEffectOf(t, mems) {
  const p = pickedBadge(t);
  const id = p ? p.id : t.badgeId ?? window.PAD_BADGES?.idOf?.[t.id];
  const name = badgeNameOf(t);
  if (!name) return null;
  if (BADGE_HP[id]) return { name, hp: BADGE_HP[id] };
  if (BADGE_HP_BY_NAME[name]) return { name, hp: BADGE_HP_BY_NAME[name] };
  if (name === "HP強化＋") return { name, hp: 15 };
  const type = BADGE_TYPE[id] ?? BADGE_TYPE_BY_NAME[name];
  if (type == null) return null;
  const targetNos = mems.map((m) => monster(m.id)?.no).filter((no) => String(MDB.get(no)?.[13] ?? "").split(".").includes(String(type)));
  return targetNos.length ? { name, hp: 5, targetNos } : null;
}
// レシートからバッジが分からない編成で、見る人がバッジ一覧から選んだもの（このブラウザだけに保存）。{ 編成id: "id:104" | "name:回復強化＋" | "none" }
const BADGE_PICK_KEY = "pad-farming-badge-picks";
let badgePicks = loadJSON(BADGE_PICK_KEY, {});
// 選べるバッジ（番号が分かっているものは番号、それ以外は名前。HPに効くかどうかは BADGE_HP / BADGE_TYPE で判定）
const BADGE_CHOICES = [
  ...Object.entries(BADGE_NAMES).map(([id, name]) => ({ val: `id:${id}`, name })),
  ...["HP強化", "回復強化＋", "攻撃強化＋", "スキルブースト＋＋", "状態異常耐性", "十字消し攻撃", "4色攻撃強化", "3色攻撃強化", "5色攻撃強化", "ダメージ無効貫通",
    "バランスタイプ強化", "体力タイプ強化", "回復タイプ強化", "ブリーチ", "銀魂", "鬼滅の刃", "怪獣8号", "大罪龍と鍵の勇者", "フリーレン", "リゼロ", "呪術廻戦", "ガンダム"].map((name) => ({ val: `name:${name}`, name })),
];
const BADGE_HP_BY_NAME = { HP強化: 5, 十字消し攻撃: 5, "4色攻撃強化": 5, "3色攻撃強化": 5, "5色攻撃強化": 5, ダメージ無効貫通: 5 };
// レシート（QR・画像）でバッジが分かっているか
function badgeKnown(t) {
  return t.badgeId != null || t.badgeName != null || window.PAD_BADGES?.index?.[t.id] != null || window.PAD_BADGES?.idOf?.[t.id] != null || !!t.badgeIcon;
}
function pickedBadge(t) {
  if (badgeKnown(t)) return null;
  const v = badgePicks[t.id];
  if (!v || v === "none") return null;
  return v.startsWith("id:") ? { id: Number(v.slice(3)) } : { name: v.slice(5) };
}
function badgeNameOf(t) {
  const p = pickedBadge(t);
  if (p) return p.name ?? BADGE_NAMES[p.id] ?? null;
  const id = t.badgeId ?? window.PAD_BADGES?.idOf?.[t.id];
  return t.badgeName ?? (id != null ? BADGE_NAMES[id] : null) ?? null;
}
// バッジ一覧から選ぶ（超覚醒と同じ。レシートで分かっている編成には出さない）
function renderBadgePicker(t) {
  if (badgeKnown(t)) return "";
  const cur = badgePicks[t.id] ?? "";
  const B = window.PAD_BADGES;
  const icon = (val) => {
    const id = val.startsWith("id:") ? val.slice(3) : null;
    const i = id != null ? B?.byId?.[id] : null;
    if (i == null) return "";
    const pos = `${((i % B.cols) / Math.max(1, B.cols - 1)) * 100}% ${(Math.floor(i / B.cols) / Math.max(1, B.rows - 1)) * 100}%`;
    return `<span class="pdc-badge pdc-badge-sm" style="background-image:url('badges.webp?v=${B.ver}');background-size:${B.cols * 100}% ${B.rows * 100}%;background-position:${pos}"></span>`;
  };
  return `<details class="badge-pick" data-badge-team="${esc(t.id)}"><summary>バッジ不明${cur && cur !== "none" ? `・選択中: ${esc(badgeNameOf(t) ?? "")}` : cur === "none" ? "・なしを選択中" : "（一覧から選ぶ）"}</summary><div class="badge-pick-list">
    ${[...BADGE_CHOICES, { val: "none", name: "バッジなし" }].map((c) => `<button type="button" class="badge-pick-btn${c.val === cur ? " on" : ""}" data-badge-team="${esc(t.id)}" data-badge-val="${esc(c.val)}" aria-pressed="${c.val === cur}">${icon(c.val)}${esc(c.name)}</button>`).join("")}
    </div><small class="muted">レシートからはバッジが分かりません。選ぶと耐久チェック（バッジのHPアップ）に反映されます（このブラウザに保存）${cur ? ` ・ <button type="button" class="linkish" data-badge-team="${esc(t.id)}" data-badge-val="">選択を外す</button>` : ""}</small></details>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-badge-val]");
  if (!b) return;
  e.preventDefault();
  const id = b.dataset.badgeTeam;
  const v = b.dataset.badgeVal;
  if (!v || badgePicks[id] === v) delete badgePicks[id];
  else badgePicks[id] = v;
  saveJSON(BADGE_PICK_KEY, badgePicks);
  if ($("#results").children.length) search();
  document.querySelectorAll(`details.badge-pick[data-badge-team="${CSS.escape(id)}"]`).forEach((d) => (d.open = true));
});
function badgeIconHTML(t) {
  const B = window.PAD_BADGES;
  const p = pickedBadge(t);
  const i = B?.index?.[t.id] ?? (t.badgeId != null ? B?.byId?.[t.badgeId] : p?.id != null ? B?.byId?.[p.id] : null);
  const name = badgeNameOf(t);
  if (i == null && p && name) return `<span class="pdc-badge-wrap"><span class="pdc-badge-name">${esc(name)}（自分で選択）</span></span>`;
  const label = name ? `<span class="pdc-badge-name">${esc(name)}</span>` : "";
  const title = `PDCで選んだバッジ${name ? `: ${esc(name)}` : ""}`;
  if (i != null) {
    const pos = `${((i % B.cols) / Math.max(1, B.cols - 1)) * 100}% ${(Math.floor(i / B.cols) / Math.max(1, B.rows - 1)) * 100}%`;
    return `<span class="pdc-badge-wrap"><span class="pdc-badge" title="${title}" style="background-image:url('badges.webp?v=${B.ver}');background-size:${B.cols * 100}% ${B.rows * 100}%;background-position:${pos}"></span>${label}</span>`;
  }
  if (t.badgeIcon && /^data:image\/webp;base64,/.test(t.badgeIcon)) return `<span class="pdc-badge-wrap"><span class="pdc-badge" title="${title}" style="background-image:url('${t.badgeIcon}');background-size:cover"></span>${label}</span>`;
  return "";
}
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

// PDCのように横6枠で、上にアシスト・下に本体を大きく並べる（所持状況は色付きの札で一目で分かるように）
const PDC_STATUS = {
  owned: ["所持", "ok"], friend: ["フレンド", "friend"], missing: ["未所持", "ng"],
  substitute: ["代用あり", "sub"], partial: ["条件付き代用", "sub"], free: ["自由枠", "free"],
};
function renderPdcSlot(x) {
  const x0 = x;
  const role = ROLE_LABEL[x.mem.role] ?? x.mem.role;
  if (x.status === "free")
    return `<div class="pdc-slot pdc-free"><span class="pdc-role">サブ</span><div class="pdc-assist"></div><div class="pdc-base"><span class="pdc-empty">自由</span></div><span class="pdc-name muted">好きなキャラ</span></div>`;
  const an = assistNoOf(x.mem);
  const [label, cls] = PDC_STATUS[x.status] ?? ["", ""];
  const assistNg = x.status !== "owned" && x.assistOk === false;
  const name = x.m?.name ?? "";
  return `<div class="pdc-slot" title="${esc(name)}${x.mem.assist ? ` ／ アシスト: ${esc(x.mem.assist)}` : ""}">
    <span class="pdc-role">${esc(role)}</span>
    <div class="pdc-assist${assistNg ? " pdc-ng" : ""}">${an ? iconHTML(an) : `<span class="pdc-none">なし</span>`}</div>
    <div class="pdc-base${x.baseOk === false ? " pdc-ng" : ""}">${iconHTML(x.m)}</div>
    <span class="pdc-name">${esc(glyphName(name))}</span>
    ${(() => {
      const t = db.teams.find((x) => x.id === x0.teamId);
      const lb = t ? memberLabels(t)[x.idx] : "";
      return lb ? `<span class="pdc-label">${lb}</span>` : "";
    })()}
    ${label ? `<span class="pdc-st pdc-st-${cls}">${label}</span>` : ""}
  </div>`;
}
// 名前は短く（【】や「・」の前を落とす）
function glyphName(name, max = 10) {
  const n = String(name).replace(/【[^】]*】|［[^］]*］|\[[^\]]*\]/g, "");
  const parts = n.split(/[・]/).filter(Boolean);
  // 「エルフリーデ VS フィアメル」のような名前は最初の語だけ
  return (parts.at(-1) ?? n).split(/\s+|＆|&/).filter(Boolean)[0]?.slice(0, max) ?? "";
}
// 同じキャラが複数いて、レシートで「ノアA」「ハデドラB」のように呼び分けている時は、左から A・B・C…（レシートの「左からA,B,C」の書き方に合わせる）
const LABEL_CACHE = new Map();
function memberLabels(t) {
  if (LABEL_CACHE.has(t)) return LABEL_CACHE.get(t);
  const text = [t.title, ...(t.steps ?? [])].join(" ");
  const labels = t.members.map(() => "");
  const byNo = new Map();
  t.members.forEach((m, i) => {
    const no = monster(m.id)?.no;
    if (no) byNo.set(no, [...(byNo.get(no) ?? []), i]);
  });
  for (const [no, idx] of byNo) {
    if (idx.length < 2) continue;
    const short = glyphName(monster(t.members[idx[0]].id)?.name ?? "");
    const keys = [short, ...(String(MDB.get(no)?.[1] ?? "").match(/[\u30A0-\u30FFー]{2,}/g) ?? [])].filter((k) => k.length >= 2);
    if (!keys.some((k) => new RegExp(`${k}\\s*[A-DＡ-Ｄa-d]`).test(text))) continue;
    idx.forEach((i, j) => (labels[i] = "ABCD"[j] ?? ""));
  }
  LABEL_CACHE.set(t, labels);
  return labels;
}
function renderPdcRow(list) {
  return `<div class="pdc-row">${list.map(renderPdcSlot).join("")}</div>`;
}
// part: "row"（PDC風の横並び。カードの上の方）／"details"（キャラごとの詳細。下の方）
function renderMembers(r, part) {
  const details = (list) =>
    `<details class="mem-details"><summary>キャラごとの詳細（覚醒・超覚醒・代用）</summary><ul class="members">${list.map(renderMember).join("")}</ul></details>`;
  if (!r.team.multi) return part === "row" ? renderPdcRow(r.members) : details(r.members);
  return ["A", "B"]
    .map((p) => {
      const mine = r.side === p && box.size > 0 ? `<span class="st st-ok">手持ちで組みやすい側</span>` : "";
      const list = r.members.filter((x) => x.mem.p === p);
      return part === "row" ? `<p class="side-head">マルチ${p} ${mine}</p>${renderPdcRow(list)}` : details(list);
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
    const hl = mode === "perRun" ? "hl" : "";
    staminaLine = `<div class="${hl}"><dt>1周あたり</dt><dd>${formatCount(r.rate)}${item.id === "coin" ? "" : "個"}${r.itemMult !== 1 ? `<small class="muted">（L/F${item.id === "coin" ? "のコイン" : "のタマゴ"}${multLabel(r.itemMult)}込み）</small>` : ""}${dropEst}</dd></div>`;
  }
  const warn = r.missing
    ? `<p class="warn">代用できない枠が${r.missing}つあります。モンスターを入手するか、別の編成を検討してください。</p>`
    : "";
  const src = renderSource(t) + reportButton(t);
  return `<article class="result ${i === 0 ? "best" : ""}">
    <div class="res-head">
      <span class="rank">${i + 1}</span>
      <div><h3>${t.multi ? `<span class="badge">マルチ</span>` : ""}${t.userAdded ? (isMine(t) ? `<span class="badge badge-mine">自分で登録</span>` : `<span class="badge">ユーザー登録</span>`) : ""}${esc(t.title)}</h3><p class="muted">${esc(r.dungeon.name)}${r.dungeon.note ? ` ― ${esc(r.dungeon.note)}` : ""}</p><div class="gim-row">${badgeIconHTML(t)}${renderGimmicks(r.dungeon)}</div>${t.multi ? "" : renderBadgePicker(t)}</div>
      <div class="score-col">${partRateBadge(t, r.dungeon)}</div>
    </div>
    ${renderMembers(r, "row")}
    ${"" /* 点数評価（速さ・楽さの点数）は見直しのため表示しない（本人指定） */}
    <dl class="stats">
      <div><dt>1周</dt><dd>${formatTime(effTime(t))}${est("timeSec")}${(() => {
        const tt = teamTimes(t);
        return tt.on != null && tt.off != null ? `<small class="muted">（高速ON ${formatTime(tt.on)} ／ OFF ${formatTime(tt.off)}）</small>` : "";
      })()}</dd></div>
      ${item ? "" : `<div class="${mode === "expHour" ? "hl" : ""}"><dt>経験値/時</dt><dd>${r.expPerHour == null ? "―" : formatCount(r.expPerHour)}</dd></div>
      <div class="${mode === "perRun" ? "hl" : ""}"><dt>経験値/周</dt><dd>${r.expPerRun == null ? "―" : formatCount(r.expPerRun)}${r.lfm.exp !== 1 ? `<small class="muted">（L/F${multLabel(r.lfm.exp)}込み）</small>` : ""}</dd></div>`}
      ${t.turns ? `<div><dt>クリアターン</dt><dd>${t.turns}ターン</dd></div>` : ""}
      <div><dt>高速モード</dt><dd>${(() => {
        const tt = teamTimes(t);
        return tt.on != null && tt.off != null ? "ON・OFF両方" : tt.on != null ? "ON" : tt.off != null ? "OFF" : `<span class="muted">不明</span>`;
      })()}</dd></div>
      ${(() => {
        const pi = partBreakInfo(t, r.dungeon);
        return pi ? `<div class="wide"><dt>部位破壊</dt><dd>${esc(pi.can)}${pi.drop ? `・${esc(pi.drop)}` : ""}${pi.note ? `<br><small class="muted">${esc(pi.note)}</small>` : ""}</dd></div>` : "";
      })()}
      <div class="${mode === "dbonus" ? "hl" : ""}"><dt>ダンジョンボーナス</dt><dd>${formatDungeonBonus(r.dbonus ?? dungeonBonusOf(t))}</dd></div>
      <div class="${item && mode === "expHour" ? "hl" : ""}"><dt>${unit}</dt><dd>${formatCount(r.perHour)}${est("timeSec") || dropEst}</dd></div>
      ${r.ease.legacy
        ? `<div><dt>安定率</dt><dd>${t.stability}%${est("stability")}</dd></div>`
        : renderEaseStats(t.metrics)}
      ${staminaLine}
    </dl>
    ${warn}
    ${renderConstraints(t)}
    ${renderMembers(r, "details")}
    ${renderEndurance(t, r.dungeon)}
    ${t.steps?.length ? `<details><summary>立ち回り</summary><ul class="steps">${t.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></details>` : ""}
    ${src}
  </article>`;
}

// ---------- 耐久チェック（試作） ----------
// 回復の考え方（本人の指定）:
//   毎ターン使うスキルで回復ドロップを生成する → 毎ターンHP満タン（100%回復）として計算
//   そうでない → 編成内のリジェネ（◯ターンの間HPを◯%回復）の値で計算
function lsNumbers(no) {
  // 変身キャラの変身前（ダイヤKを宿す者・ダインなど）は潜入時のLSしかないので、変身後（スキルで変身した後）のLSを使う
  let ls = String(MDB.get(no)?.[19] ?? "");
  const fam = MDB.get(no)?.[9];
  if (!ls && fam) {
    const later = (familyRows.get(fam) ?? []).filter((r) => r[0] !== no && r[19]);
    if (later.length) ls = String(later[later.length - 1][19]);
  }
  const [red, hp, fx] = ls.split("|");
  const mults = (hp ?? "").split(",").filter(Boolean).map((x) => {
    const [cond, m] = x.split("=");
    return { cond, mult: Number(m) };
  });
  // fx: LSの固定ダメージの追い打ち（万）
  return { red: Number(red) || 0, mults, fixed: Number(String(fx ?? "").replace("fx", "")) || 0 };
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

// 進化スキル（スキルが進化）: k回目に使った時の段階の値に差し替えた行を返す。最後の段階はそのまま繰り返す
function stageRow(no, k) {
  const row = MDB.get(no);
  if (!row?.[29]) return row;
  const stages = String(row[29]).split("‖");
  const [ct, endu, durs, attrs, haste, grav] = stages[Math.min(k, stages.length - 1)].split("~");
  const r = [...row];
  r[5] = Number(ct) || row[5];
  r[16] = endu;
  r[21] = durs.replace(/;/g, ",");
  r[28] = attrs.replace(/\^/g, "|");
  r[6] = String(row[6] ?? "").split(",").filter((x) => !/^h\d+$/.test(x)).concat(Number(haste) ? [`h${haste}`] : []).join(",");
  r[23] = Number(grav) || 0;
  r.stage = Math.min(k, stages.length - 1) + 1;
  return r;
}

// レシートの「誰のスキルを使ったか」（receiptCalls）から、本体と武器のどちらを使ったかを判定して receiptUses を作る。
// 継承スキルの仕様（本人談）: 押すとまず武器（武器のターン分溜まっていれば）。本体＋武器の合計分溜まっていれば両方。
// 武器だけ使った後は、ターン経過やヘイストで本体のターン分溜まった時だけ本体を使ったとみなす。
// 溜まり: 最初はパーティーのスキブ、1ターンごとに＋1、ほかのキャラのヘイスト（自分以外が◯ターン溜まる）で＋◯
const receiptOrder = new Map();
function resolveReceiptUses(t) {
  if (!t.receiptCalls) return null;
  const sb = teamSkillBoost(t, t.members[0]);
  const st = t.members.map((m) => {
    const bNo = monster(m.id)?.no;
    const aNo = assistNoOf(m);
    return { bNo, aNo, bUse: 0, aUse: 0, charge: sb, phase: aNo ? "assist" : "base" };
  });
  const hasteOf = (row) => Math.max(0, ...String(row?.[6] ?? "").split(",").map((x) => (/^h\d+$/.test(x) ? Number(x.slice(1)) : 0)));
  const fire = (mi, rows) => {
    for (const r of rows) {
      const h = hasteOf(r);
      if (h) st.forEach((x, j) => j !== mi && (x.charge += h));
    }
  };
  // 敵の先制のスキル遅延（その階に着いた時）: 遅延ターン−潜在の遅延耐性の数だけ溜まりが減る（0より下にはならない＝本来のスキルターン以上は必要にならない。本人指定）
  const dungeon = db.dungeons.find((x) => x.id === t.dungeonId);
  const delayAt = Object.fromEntries((dungeon?.damage?.floors ?? []).filter((f) => f.delay).map((f) => [f.floor, f.delay]));
  const delayed = (mi, dl) => {
    const m = t.members[mi];
    const role = m.role === "L" || m.role === "F" ? "lf" : "sub";
    if (dl.target !== "all" && dl.target !== role) return 0;
    const x = st[mi];
    const bRow = x.bUse === 0 && MDB.get(MDB.get(x.bNo)?.[9]) ? MDB.get(MDB.get(x.bNo)[9]) : MDB.get(x.bNo);
    const aRow = x.aNo ? MDB.get(x.aNo) : null;
    // 覚醒のスキル遅延耐性（136）は1個で潜在の遅延耐性2つ分（本人談）。本体（超覚醒も）と、覚醒アシストの武器
    const awkN = (r) => String(r?.[27] ?? "").split(".").filter((x) => x === "136").length;
    const awk = awkN(bRow) + (m.build?.super === 136 ? 1 : 0) + (aRow?.[8] ? awkN(aRow) : 0);
    const lat = (m.build?.latents ?? []).filter((c) => c === 12).length;
    return Math.max(0, dl.turns - lat - awk * 2);
  };
  const applyDelay = (fl) => {
    const dl = delayAt[fl];
    if (!dl) return;
    st.forEach((x, mi) => {
      const n = delayed(mi, dl);
      if (!n) return;
      // 溜まりは最大（本体＋武器のスキルターン）までしか貯まらないので、そこから減らす
      const b = stageRow(x.bNo, x.bUse);
      const a = x.aNo ? stageRow(x.aNo, x.aUse) : null;
      const cap = (b?.[5] || 0) + (x.phase === "assist" ? a?.[5] || 0 : 0);
      x.charge = Math.max(0, Math.min(x.charge, cap || x.charge) - n);
    });
  };
  const uses = {};
  // 表示用: レシートに書かれた順（ターンの見積もりで並びが変わらないように）
  const order = {};
  let first = true;
  let prevFl = 0;
  for (const [fl, calls] of Object.entries(t.receiptCalls).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    // レシートに書かれていない階（スキルを使わず1ターンで抜けた階）も、1ターン経過と先制の遅延を入れる
    for (let f = prevFl + 1; f < Number(fl); f++) {
      if (!first) st.forEach((x) => x.charge++);
      first = false;
      applyDelay(f);
    }
    prevFl = Number(fl);
    // 同じキャラが何回出てくるかで、その階のターン数を見積もる
    // 同じキャラが何回出てくるかで、その階のターン数を見積もる
    // （レシートの区切りから読んだ c.turn も入っているが、編成によって良くも悪くもなるので調整が済むまで使わない）
    const seen = new Map();
    const withTurn = calls.map((c, idx) => {
      const k = seen.get(c.mi) ?? 0;
      seen.set(c.mi, k + 1);
      return { ...c, turn: k, idx };
    });
    const turns = Math.max(1, ...withTurn.map((c) => c.turn + 1));
    for (let tn = 0; tn < turns; tn++) {
      if (!first) st.forEach((x) => x.charge++);
      first = false;
      if (tn === 0) applyDelay(Number(fl));
      for (const c of withTurn.filter((c) => c.turn === tn)) {
        const x = st[c.mi];
        // 進化スキルは使った回数で段階が変わる（スキルターンも段階ごと）
        // 変身キャラは変身前の姿で始まるので、最初に押した時は変身前のスキル（セイハーツの「自分以外2ターン」など）
        const fam = MDB.get(x.bNo)?.[9];
        x.b = x.bUse === 0 && fam && fam !== x.bNo && MDB.get(fam) ? MDB.get(fam) : stageRow(x.bNo, x.bUse);
        x.a = x.aNo ? stageRow(x.aNo, x.aUse) : null;
        if (!x?.b) continue;
        const aCT = x.a?.[5] || 0;
        const bCT = x.b[5] || 0;
        let used;
        if (c.part === "assist" && x.a) used = [x.a];
        else if (!x.a) used = [x.b];
        else if (c.part === "base") used = x.phase === "assist" && x.charge >= aCT + bCT ? [x.a, x.b] : [x.b];
        // 武器の番でも、武器のスキルターン分たまっていなければ武器は撃てないので本体（セッカ8Fなど）
        else if (x.phase === "assist") used = x.charge >= aCT + bCT ? [x.a, x.b] : x.charge >= aCT ? [x.a] : [x.b];
        else used = [x.b];
        // 武器だけ使ったら、次は本体の番。本体を使ったら武器の番に戻る
        x.phase = used.length === 1 && used[0] === x.a ? "base" : x.a ? "assist" : "base";
        x.charge = 0;
        if (used.includes(x.a)) {
          x.aUse++;
          // 使うと消える武器は、以降はアシストなし（次から本体だけ）
          if (/(^|\|)消滅(\||$)/.test(String(x.a[28] ?? ""))) {
            x.aNo = null;
            x.phase = "base";
          }
        }
        if (used.includes(x.b)) x.bUse++;
        fire(c.mi, used);
        ((uses[fl] ??= [])[tn] ??= []).push(...used.map((r) => r[0]));
        ((order[fl] ??= [])[c.idx] = used.map((r) => r[0]));
      }
    }
  }
  // ターンごとの配列にそろえる（使っていないターンは空）
  for (const fl of Object.keys(uses)) uses[fl] = Array.from(uses[fl], (x) => x ?? []);
  receiptOrder.set(t.id, Object.fromEntries(Object.entries(order).map(([fl, v]) => [fl, v.filter(Boolean).flat()])));
  return uses;
}

function enduranceSetup(t0, opts = {}) {
  // 手で登録した receiptUses があればそれ、なければレシートの呼び出しから判定
  const t = t0.receiptUses || !t0.receiptCalls ? t0 : { ...t0, receiptUses: resolveReceiptUses(t0) };
  const mems = t.members.filter((m) => m.role !== "free");
  const leader = mems.find((m) => m.role === "L");
  const friend = mems.find((m) => m.role === "F");
  const lsL = lsNumbers(monster(leader?.id)?.no);
  const lsF = lsNumbers(monster(friend?.id)?.no);
  // HP推定: 最大HP（限界突破値）＋297の990、HP覚醒、LSのHP倍率、チームHP強化（5%/個）
  // バッジ（team.badge.hp: チームHP%、badge.targetNos があればそのキャラだけ）
  const badge = t.badge ?? badgeEffectOf(t, mems);
  // 加護: 耐久チェックでユーザーが選んだもの（なし/陽/陰）。未選択ならダンジョンのデータ
  const dungeonKago = opts.kago !== undefined ? opts.kago || null : db.dungeons.find((x) => x.id === t.dungeonId)?.kago ?? null;
  const dungeonBoost = db.dungeons.find((x) => x.id === t.dungeonId)?.typeBoost ?? null;
  // 属性変更スキル（自分の属性が◯属性に変化）で主属性が変わった時のHPも出せるように、関数にしておく
  // floor: 熟成（バトル5以降1.5倍、10以降2倍）の判定に使う階
  // parts: 部位を壊した後か（部位破壊ボーナス 1つにつき1.2倍、複数なら掛け算）
  // keepRes: 属性を変えても共鳴の判定だけは元の属性のまま（共鳴が付いた分を切り分けるため）
  // vanished: 使うと消える武器を使った枠 → 付与された覚醒（その枠はアシストなし扱いになり、自力が発動しうる）
  const teamHpWith = (overrides = new Map(), floor = 1, parts = false, keepRes = false, vanished = new Map()) => {
  let total = 0;
  let teamHp = 0;
  let unknown = 0;
  const detail = [];
  for (const [mi, m] of mems.entries()) {
    const no = monster(m.id)?.no;
    const row0 = MDB.get(no);
    // 主属性の上書き（アシスト共鳴・アシストボーナス・LSの属性HP倍率の判定に使う）
    const row = row0 && overrides.has(mi) ? Object.assign([...row0], { 2: overrides.get(mi) }) : row0;
    const resRow = keepRes ? row0 : row;
    if (!row) {
      unknown++;
      continue;
    }
    const b0 = m.build ?? {};
    // QRコードから読んだ潜在があれば、そこからHP%（手で登録した latentHp が優先）
    const b = b0.latents && b0.latentHp == null ? { ...b0, latentHp: latentFromCodes(b0.latents).hp } : b0;
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
    const gone = vanished.has(mi);
    const an = gone ? null : assistNoOf(m);
    const a = an ? MDB.get(an) : null;
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
    // 消える武器のスキルで付与された覚醒（熟成・全パラなど）
    if (gone) ids.push(...vanished.get(mi));
    // 武器（覚醒アシスト）の熟成も本体に付く
    if (a?.[8]) ids.push(...String(a[25] ?? "").split(".").filter(Boolean).map(Number).filter((x) => x === 130));
    if (b.super) ids.push(b.super);
    if (row[26] && b.synchro !== false) ids.push(row[26]);
    const mults = [];
    for (const id of ids) {
      // 熟成: バトル5以降1.5倍、10以降2倍（それより前の階は効かない）
      if (id === 130) {
        const v130 = floor >= 10 ? 2 : floor >= 5 ? 1.5 : 1;
        if (v130 > 1) {
          hp *= v130;
          mults.push(`熟成×${v130}`);
        }
        continue;
      }
      const v = STAT_MULT[id];
      if (!v) continue;
      if (id === 138 && !(an && a && a[2] === resRow[2] && String(a[13] ?? "").split(".").some((x) => x && String(resRow[13] ?? "").split(".").includes(x)))) continue;
      if (id === 139 && an) continue;
      // 陽・陰の加護: ダンジョンに対応する加護があるときだけ、そのキャラのHPが加護1つにつき2倍
      if (id === 128 && dungeonKago !== "陽") continue;
      if (id === 129 && dungeonKago !== "陰") continue;
      hp *= v;
      mults.push(`${STAT_NAME[id]}×${v}`);
    }
    // ダンジョンのタイプ強化（深遠の万龍【回復タイプ強化】なら回復タイプのHP1.5倍など）
    const tb = dungeonBoost;
    if (tb?.hp && String(row0[13] ?? "").split(".").some((x) => tb.types.includes(Number(x)))) {
      hp *= tb.hp;
      mults.push(`${tb.label}×${tb.hp}`);
    }
    // 部位破壊ボーナス（本体の通常覚醒・選んだ超覚醒・武器の覚醒）: 部位を壊した後、1つにつき1.2倍
    if (parts) {
      const pb =
        String(row[27] ?? "").split(".").filter((x) => x === "131").length +
        (b.super === 131 ? 1 : 0) +
        (a?.[8] ? String(a[27] ?? "").split(".").filter((x) => x === "131").length : 0);
      if (pb) {
        hp *= 1.2 ** pb;
        mults.push(`部位破壊ボーナス×${(1.2 ** pb).toFixed(2)}`);
      }
    }
    const lsm = hpMultFor(row, lsL) * hpMultFor(row, lsF);
    // ＋値のHP1あたりのHP（10 × 潜在 × 全パラ系 × LS）。チームHP強化は最後に掛ける
    const perPlus = 10 * (1 + (b.latentHp ?? 0) / 100) * mults.reduce((x, t) => x * Number(t.split("×")[1]), 1) * lsm;
    const hpPlus = Math.min(297, Math.round((b.plus ?? 297) / 3));
    detail.push({ no, name: row[1], hp: Math.round(hp * lsm), mults, lv, latentHp: b.latentHp ?? 0, known: isFullBuild(m.build), perPlus, hpPlus });
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
  // 熟成で階ごとにチームHPが変わる割合（1〜4階を基準）
  const r5 = teamHpWith(new Map(), 5).total / Math.max(1, total);
  const r10 = teamHpWith(new Map(), 10).total / Math.max(1, total);
  // 部位を壊した後の倍率（熟成と合わせた階ごと）
  const rp = { 1: teamHpWith(new Map(), 1, true).total / Math.max(1, total), 5: teamHpWith(new Map(), 5, true).total / Math.max(1, total), 10: teamHpWith(new Map(), 10, true).total / Math.max(1, total) };
  const floorRatio = (f, parts = false) => (parts ? rp[f >= 10 ? 10 : f >= 5 ? 5 : 1] : f >= 10 ? r10 : f >= 5 ? r5 : 1);
  const reduce = 1 - (1 - lsL.red / 100) * (1 - lsF.red / 100);
  // LSの固定ダメージの追い打ちがあれば、超根性（HP1で耐える）の敵もそのターンに倒せる
  const fixedFollow = lsL.fixed + lsF.fixed;
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
  const regens = [];
  const vanishes = [];
  const instantHeals = [];
  const healTurns = [];
  const selfAttr = [];
  const enemyAttr = [];
  const awakenGrants = [];
  // receiptUses: 階 → [ターン1のNo., …] または [No., …]（ターンの指定なし＝その階の1ターン目）
  const floorTurns = {};
  const useList = [];
  for (const [fl, v] of Object.entries(t.receiptUses ?? {})) {
    const turns = Array.isArray(v[0]) ? v : [v];
    floorTurns[fl] = turns.length;
    turns.forEach((nos, ti) => nos.forEach((no, idx) => useList.push({ fl, ti, idx, no })));
  }
  {
    const useCount = new Map();
    useList
      .sort((a, b) => Number(a.fl) - Number(b.fl) || a.ti - b.ti || a.idx - b.idx)
      .forEach(({ fl, ti, idx, no }) => {
      // 進化スキルは何回目に使ったかで段階を選ぶ（同じキャラが複数いる時は、その数で割って1体ごとの回数にする）
      const n = useCount.get(no) ?? 0;
      useCount.set(no, n + 1);
      const same = Math.max(1, mems.filter((m) => monster(m.id)?.no === no || assistNoOf(m) === no).length);
      const k = Math.floor(n / same);
      const r = stageRow(no, k);
      // その段階の能力ごとの効果ターン
      const sdur = (cap) => {
        const kv = String(r?.[21] ?? "").split(",").find((x) => x.startsWith(cap + ":"));
        return kv ? Number(kv.split(":")[1]) : null;
      };
      if (!r) return;
      const [, , red, hpm] = String(r[16] ?? "").split(":").map(Number);
      const order = Number(fl) * 1000 + ti * 50 + idx;
      if (red) {
        const awC = String(r[28] ?? "").split("|").find((x) => x.startsWith("目覚め条件:"))?.split(":");
        const rc = String(r[28] ?? "").split("|").find((x) => x.startsWith("条件:"))?.split(":");
        reductions.push({ red, dur: sdur("reduce") ?? 1, name: r[1], floor: Number(fl), ti, order, cond: rc ? { attr: rc[1], v: Number(rc[2]) } : null, awaken: awC && awC[2].split("+").includes("red") ? awC[1] : null });
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
      // リジェネ（◯ターンの間HPを◯%回復）: 軽減と同じく、レシートの使用から効果ターンの間。重なったら最後に使ったもの（本人談）
      const rg = Number(String(r[16] ?? "").split(":")[0]) || 0;
      if (rg) regens.push({ pct: rg, dur: sdur("regen") ?? 1, name: r[1], floor: Number(fl), ti, order, cond: ac["条件"] ?? null });
      // 即時回復（「◯ターンの間」がない「HPを◯%回復」「HPを全回復」）はリジェネとは別枠で、使ったターンに回復
      const inst = Number(String(r[16] ?? "").split(":")[4]) || 0;
      if (inst) instantHeals.push({ pct: inst, name: r[1], floor: Number(fl), ti, order });
      // 回復ドロップを作るスキル（[回復]を生成／盤面や[◯]を[回復]に変化）を使ったターンはHP全回復（本人指定）
      if (String(r[16] ?? "").split(":")[1] === "1") healTurns.push({ name: r[1], floor: Number(fl), ti, order });
      if (hpm) hpUps.push({ mult: hpm, dur: sdur("hpUp") ?? 1, name: r[1], floor: Number(fl), ti, order, cond: ac["条件"] ?? null, awaken: awFor("hp") });
      // ドロップ目覚めを付けるスキル
      const awGive = String(r[28] ?? "").split("|").find((x) => x.startsWith("目覚め付与:"))?.split(":");
      if (awGive) awakenGrants.push({ name: r[1], names: awGive[1].split(","), dur: Number(awGive[2]) || 1, floor: Number(fl), ti, order });
      // 味方の属性変更: 自分／右隣／左隣／両隣／味方全員／助っ人／リーダー（並びは L・サブ1〜4・F）
      const owner = mems.findIndex((m) => monster(m.id)?.no === no || familyOf(monster(m.id)?.no) === familyOf(no) || assistNoOf(m) === no);
      const changes = [];
      if (ac["自分"]) changes.push({ who: "自分", attr: ac["自分"].attr, dur: ac["自分"].v });
      for (const tok of String(r[28] ?? "").split("|").filter((x) => x.startsWith("味方:"))) {
        const [, who, attr, dur] = tok.split(":");
        changes.push({ who, attr, dur: Number(dur) });
      }
      for (const ch of changes) {
        if (owner < 0) continue;
        const targets =
          ch.who === "自分" ? [owner]
          : ch.who === "右隣" ? [owner + 1]
          : ch.who === "左隣" ? [owner - 1]
          : ch.who === "両隣" ? [owner - 1, owner + 1]
          : ch.who === "味方" ? mems.map((_, i) => i)
          : ch.who === "助っ人" ? [mems.findIndex((m) => m.role === "F")]
          : ch.who === "リーダー" ? [mems.findIndex((m) => m.role === "L")]
          : [];
        const valid = targets.filter((i) => i >= 0 && i < mems.length);
        if (!valid.length) continue;
        const ov = new Map(valid.map((i) => [i, ch.attr]));
        const withAll = teamHpWith(ov).total;
        const ratio = withAll / Math.max(1, teamHpWith().total);
        // 共鳴が付いた（外れた）ことによる分だけ。これが上がった時だけ今のHPも同じ割合で回復する（本人談）
        const ratioRes = withAll / Math.max(1, teamHpWith(ov, 1, false, true).total);
        selfAttr.push({ name: r[1], member: valid.join(","), who: ch.who, attr: ch.attr, dur: ch.dur || 99, floor: Number(fl), ti, order, ratio, ratioRes });
      }
      // 使うと消える武器: その枠はこのターン以降アシストなし（自力・付与覚醒・武器の覚醒やボーナスがなくなる）
      if (/(^|\|)消滅(\||$)/.test(String(r[28] ?? ""))) {
        const vmi = mems.findIndex((m) => assistNoOf(m) === no);
        if (vmi >= 0 && !vanishes.some((v) => v.member === vmi)) {
          const granted = (String(r[28]).split("|").find((x) => x.startsWith("付与:"))?.slice(3) ?? "").split(".").filter(Boolean).map(Number);
          const vm = new Map([[vmi, granted]]);
          const ratioAt = Object.fromEntries([1, 5, 10].map((f) => [f, teamHpWith(new Map(), f, false, false, vm).total / Math.max(1, teamHpWith(new Map(), f).total)]));
          vanishes.push({ name: r[1], member: vmi, floor: Number(fl), ti, order, ratioAt });
        }
      }
      if (ac["敵"]) enemyAttr.push({ name: r[1], attr: ac["敵"].attr, dur: ac["敵"].v || 1, floor: Number(fl), ti, order });
    });
  }
  if (!skillRed && (hpUps.length || selfAttr.length || enemyAttr.length || regens.length || instantHeals.length || vanishes.length || healTurns.length)) skillRed = 1; // HPアップや属性変更だけでも「レシートどおり」の計算をする
  // 超根性を割合ダメージで剥がしてワンパンする階（作者の役割: gravity を◯Fで使う）→ 超根性発動時の攻撃は来ない
  const strip = new Map();
  for (const sr of t.slotRoles ?? []) {
    for (const r of sr.roles) if (r.cap === "gravity" && r.fireAtFloor) strip.set(r.fireAtFloor, MDB.get(sr.target)?.[1] ?? "");
  }
  // 属性ダメージ軽減の覚醒（1個7%）。武器は覚醒アシストのときだけ
  const awkAttr = Object.fromEntries(ATTRS5.map((a) => [a, 0]));
  let autoLatent = 0;
  const latentPool = { n1: 0, n2: 0, orig: {} };
  for (const m of mems) {
    const rows = [MDB.get(monster(m.id)?.no)];
    const a = MDB.get(assistNoOf(m));
    if (a?.[8]) rows.push(a);
    for (const r of rows.filter(Boolean)) {
      String(r[22] || "0.0.0.0.0").split(".").forEach((n, i) => (awkAttr[ATTRS5[i]] += Number(n) * 7));
    }
    // レシートで読み取った潜在の属性軽減（盾に＋＝属性軽減＋ 2.5%/2枠）
    // 属性が分からない属性軽減＋（auto）は、あとでダンジョンに合わせて一番効く属性へ自動で振る
    // レシート（QR）の属性軽減潜在は、他の潜在はそのままで属性だけ自由に振り替えられる扱い（本人指定）→ 数だけ数えて、あとで一番効く属性へ振る
    if (!m.build?.latentAttr && m.build?.latents) {
      const lc = latentFromCodes(m.build.latents);
      latentPool.n1 += lc.n1;
      latentPool.n2 += lc.n2;
      for (const [a, v] of Object.entries(lc.attr)) latentPool.orig[a] = (latentPool.orig[a] ?? 0) + v;
      continue;
    }
    for (const [a, v] of Object.entries(m.build?.latentAttr ?? {})) {
      if (a === "auto") autoLatent += v;
      else awkAttr[a] += v;
    }
  }
  const teamHpMult = (1 + 0.05 * teamHp) * (badge?.hp && !badge.targetNos ? 1 + badge.hp / 100 : 1);
  for (const x of detail) x.perPlus *= teamHpMult;
  return { floorRatio, r5, r10, rp, badge, reductions, hpUps, selfAttr, enemyAttr, awakenGrants, autoLatent, latentPool, fixedFollow, estHp: total, unknown, reduce, healGen, regens, instantHeals, healTurns, vanishes, teamHp, skillRed, skillRedFrom, strip, awkAttr, detail, uses: Object.fromEntries(Object.entries(t.receiptUses ?? {}).map(([f, v]) => [f, v.flat()])), floorTurns, hasBuilds: mems.some((m) => isFullBuild(m.build)) };
}

const ATTRS5 = ["火", "水", "木", "光", "闇"];
// 全パラメータを掛ける覚醒（127 全パラ強化、142 全パラ強化＋、138 アシスト共鳴、139 自力、146/147 ソウル）
// 132 アフタヌーンティー: HP1.25倍（PDCの値との照合から。なつみかんさんの霧雨ハーティア編成のハーティアが 13,337×共鳴3×1.25＝50,013 で一致）
const STAT_MULT = { 127: 1.5, 142: 1.8, 138: 3, 139: 3, 146: 1.5, 147: 1.5, 128: 2, 129: 2, 132: 1.25 };
const STAT_NAME = { 127: "全パラ強化", 142: "全パラ強化＋", 138: "アシスト共鳴", 139: "自力", 146: "勇気のソウル", 147: "幸運のソウル", 128: "陽の加護", 129: "陰の加護", 132: "アフタヌーンティー" };
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
  const lastTurn = {};
  // 条件（敵の属性）は使った時点で判定。満たすと効果も効果ターンも◯倍（日番谷など）
  // 条件判定に使う敵の属性: その階に出る可能性のある敵全員（ダメージのない敵も含む）。なければ攻撃の属性から
  const floorAttrMap = Object.fromEntries(d.damage.floors.map((f) => [f.floor, f.enemyAttrs?.length ? f.enemyAttrs : [...new Set(f.hits.flatMap((h) => h.attrs ?? []))]]));
  // 超根性を持つ敵は、超根性の後（グラビティで剥がした場合も）副属性に変わる（本人談）。その階の最初の攻撃より後のターンは変化後の属性
  const floorAttrAfter = Object.fromEntries(d.damage.floors.filter((f) => f.enemyAttrsAfter?.length).map((f) => [f.floor, f.enemyAttrsAfter]));
  const floorAttrAt = (floor, tn) => (floorAttrAfter[floor] && firstTurn[floor] != null && tn > firstTurn[floor] ? floorAttrAfter[floor] : floorAttrMap[floor] ?? []);
  // スキルを使ったターン（その階の1ターン目＋レシートの何ターン目か）
  const startOf = (r) => (firstTurn[r.floor] == null ? null : firstTurn[r.floor] + (r.ti ?? 0));
  const activeAt = (r, tn, dur = r.dur) => startOf(r) != null && startOf(r) <= tn && tn <= startOf(r) + dur - 1;
  const condMet = (r) => {
    if (!r.cond) return false;
    const at = startOf(r);
    const e = (setup.enemyAttr ?? []).filter((x) => activeAt(x, at) && x.order < r.order).sort((a, b) => b.order - a.order)[0];
    const fa = e ? [e.attr] : floorAttrAt(r.floor, at);
    // 敵に1体でもその属性がいれば条件を満たす（本人談。完全卍解・日番谷は木が1体でもいればHP2.2倍・4ターン）
    return fa.some((a) => a === r.cond.attr);
  };
  const durOf = (r) => (condMet(r) ? r.dur * r.cond.v : r.dur);
  // ドロップ目覚め: 味方のスキル（レシートの階から効果ターンの間）と、敵の先制（その階に着いた時から◯ターン）
  const enemyAwaken = [];
  const awakenAt = (name, tn) =>
    (useSkill && (setup.awakenGrants ?? []).some((g) => g.names.includes(name) && activeAt(g, tn))) ||
    enemyAwaken.some((g) => g.names.includes(name) && g.from <= tn && tn <= g.from + g.dur - 1);
  // そのターンに効いている効果のうち、最後に使ったもの（目覚めが条件の効果は、目覚めが出ている時だけ）
  // flex: 軽減・最大HPアップは、レシートのターンの区切りが当てにならないので、その階の最後のターンに使った場合（次の階の先制まで効く）も含めて耐えられる方で見る
  const lastActive = (list, tn, flex = false) => {
    const inFlex = (r) => flex && lastTurn[r.floor] != null && startOf(r) <= tn && tn <= lastTurn[r.floor] + durOf(r) - 1;
    const active = (list ?? []).filter((r) => startOf(r) != null && (activeAt(r, tn, durOf(r)) || inFlex(r)) && (!r.awaken || awakenAt(r.awaken, tn)));
    return active.sort((a, b) => b.order - a.order)[0] ?? null;
  };
  // 「敵が◯属性の時、効果◯倍」は、敵に1体でもその属性がいれば数値も倍（軽減は100%まで）
  const condVal = (r, v) => (r && condMet(r) ? v * r.cond.v : v);
  const skillAt = (tn) => {
    const r = useSkill ? lastActive(setup.reductions, tn, true) : null;
    return r ? Math.min(100, condVal(r, r.red)) : 0;
  };
  // 最大HPの倍率（スキル・熟成・部位破壊ボーナス・属性変更）。切れて下がった時は新しい最大HPで頭打ち
  let hpMult = 1;
  let resMult = 1;
  // そのターンに効いている属性変更（同じ対象は最後に使ったもの）
  const activeAttr = (tn) => {
    const byMember = new Map();
    for (const x of (setup.selfAttr ?? []).filter((x) => activeAt(x, tn))) {
      if (!byMember.has(x.member) || byMember.get(x.member).order < x.order) byMember.set(x.member, x);
    }
    return byMember;
  };
  const maxAt = () => maxHp * hpMult;
  // 敵の属性変更（その間は敵の属性が変わる）
  const enemyAttrAt = (tn, attrs) => {
    const e = useSkill ? lastActive(setup.enemyAttr, tn) : null;
    return e ? [e.attr] : attrs;
  };
  let floorAttrs = [];
  let curFloor = 1;
  let curParts = false;
  // playerPhase: 味方のターン（スキル・回復）。部位はそのターンの攻撃で壊すので、最初のターンの回復はまだ壊す前
  const updateHpMult = (tn, playerPhase = false) => {
    const up = useSkill ? lastActive(setup.hpUps, tn, true) : null;
    // 「敵が◯属性の時、効果が◯倍」: その階の敵に1体でもその属性がいれば倍率の効果を倍にする
    let m = up ? (condMet(up) ? up.mult * up.cond.v : up.mult) : 1;
    // 熟成（階が進むとチームHPが上がる）と部位破壊ボーナス（部位のある階で、最初の攻撃の後）
    m *= setup.floorRatio?.(curFloor, curParts && firstTurn[curFloor] != null && (playerPhase ? tn > firstTurn[curFloor] : tn >= firstTurn[curFloor])) ?? 1;
    // 自分の属性変更でアシスト共鳴などが変わる分（その間だけチームHPが ratio 倍）
    if (useSkill) for (const x of activeAttr(tn).values()) m *= x.ratio;
    // 消える武器を使った後（以降ずっと）。今のHPは変えない
    if (useSkill) for (const v of setup.vanishes ?? []) if (startOf(v) != null && startOf(v) <= tn) m *= v.ratioAt[curFloor >= 10 ? 10 : curFloor >= 5 ? 5 : 1];
    // 最大HPが変わっても今のHPはそのまま（熟成・部位破壊ボーナス・スキルの最大HPアップ）。
    // 共鳴が未発動→発動に変わった時だけ、その分の割合で今のHPも回復する（本人談）
    const res = useSkill ? [...activeAttr(tn).values()].reduce((x, e) => x * (e.ratioRes ?? 1), 1) : 1;
    if (res > resMult) hp *= res / resMult;
    resMult = res;
    hpMult = m;
    hp = Math.min(hp, maxHp * m);
  };
  const stripBy = (f, h) => {
    const used = (setup.uses?.[f.floor] ?? []).map((n) => MDB.get(n)).filter((r) => r?.[23]);
    const remain = used.reduce((x, r) => x * (1 - r[23] / 100), 1);
    return setup.strip?.get(f.floor) ?? (used.length && remain <= (h.threshold ?? 50) / 100 ? used.map((r) => r[1]).join("・") : null);
  };
  const hit = (f, h, tn) => {
    updateHpMult(tn);
    const raw = h.ratio ? (hp * h.ratio) / 100 : h.dmg;
    // 割合ダメージにも属性軽減は乗る（本人談）
    const attrs = enemyAttrAt(tn, h.attrs ?? []);
    const worst = !attrs.length ? null : attrs.reduce((w, a) => (attrRed(a) < attrRed(w) ? a : w), attrs[0]);
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
      fail = { attrs };
    }
    return hp > 0;
  };
  for (const f of d.damage.floors) {
    floorAttrs = [...new Set(f.hits.flatMap((h) => h.attrs ?? []))];
    curFloor = f.floor;
    curParts = !!f.parts;
    // 敵の先制で付くドロップ目覚め（着いた時から）
    for (const a of f.awaken ?? []) enemyAwaken.push({ names: a.names, dur: a.dur, from: turn + 1 });
    // 到着時の先制（前の階の最後のターンの敵の行動）
    for (const h of f.hits.filter((x) => x.kind !== "turn" && x.kind !== "superResolve")) if (!hit(f, h, turn)) return { rows, deadAt, fail };
    for (const h of f.hits.filter((x) => x.kind === "turn")) {
      rows.push({ floor: f.floor, label: h.label, skipped: "ワンパンする前提なので受けない（1ターンで倒せないと受ける）" });
    }
    const sr = f.hits.filter((x) => x.kind === "superResolve");
    const stripped = sr.length ? (setup.fixedFollow ? `LSの固定追撃（${setup.fixedFollow.toLocaleString("ja-JP")}万）` : stripBy(f, sr[0])) : null;
    // その階のターン数: レシートに書かれたターン数（①②…）と、超根性を剥がさない場合の2ターンの大きい方
    const turns = Math.max(setup.floorTurns?.[f.floor] ?? 1, sr.length && !stripped ? 2 : 1);
    for (let i = 0; i < turns; i++) {
      turn++;
      if (i === 0) firstTurn[f.floor] = turn;
      updateHpMult(turn, true);
      // 味方のターン: 回復（毎ターン回復生成なら満タン、なければリジェネ）
      const rgR = useSkill ? lastActive(setup.regens, turn) : null;
      const rg = rgR ? condVal(rgR, rgR.pct) : 0;
      // 即時回復: このターンに使ったスキルの分（リジェネとは別枠で足す）
      const inst = useSkill ? (setup.instantHeals ?? []).filter((x) => startOf(x) === turn).reduce((n, x) => n + x.pct, 0) : 0;
      // 回復ドロップを作るスキル（セイハーツなど）をその階で使っていれば、その階は毎ターン全回復（レシートの何ターン目かは当てにならないため。本人指定）
      const fullHeal = useSkill && (setup.healTurns ?? []).some((x) => x.floor === curFloor);
      // 回復: 回復生成スキルを使った階は全回復。それ以外は%回復（リジェネ・即時回復）があればその分、なければ回復ドロップを組んで全回復（本人指定）
      hp = setup.healGen || fullHeal || rg + inst <= 0 ? maxAt() : Math.min(maxAt(), hp + (maxAt() * (rg + inst)) / 100);
      if (i === 0) {
        for (const h of sr) {
          if (stripped) rows.push({ floor: f.floor, label: h.label, skipped: setup.fixedFollow ? `${stripped}で、超根性でHP1で耐えた敵をそのターンに倒すため受けない` : `${stripped}で超根性を剥がしてワンパンするため受けない` });
          else if (!hit(f, h, turn)) return { rows, deadAt, fail };
        }
      }
    }
    lastTurn[f.floor] = turn;
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
    if (!cand.length) return { ok: false, slots, floor: sim.deadAt, reason: "属性軽減が効かない攻撃（無属性）" };
    // 敵が数体のうち1体の場合は、一番軽減が少ない属性に1枠足す
    const cur = current();
    const a = cand.reduce((w, x) => ((setup.awkAttr[x] ?? 0) + cur[x] < (setup.awkAttr[w] ?? 0) + cur[w] ? x : w), cand[0]);
    slots[a]++;
  }
  return { ok: false, slots, reason: "パーティーの潜在枠（最大48枠）を全部属性軽減にしても足りない" };
}

// ＋値（＋297〜＋891）とチームHP強化の妥協ライン: 全員＋297でも足りるか、最低どこまで＋値を上げればいいか、
// 全員＋891ならチームHP強化を何個減らせるか（＋300からは3ステータスに均等に振る前提で＋3ごとにHP＋1）
function hpBudget(setup, maxHp, need) {
  if (need == null) return null;
  const xs = setup.detail;
  const base297 = maxHp - xs.reduce((n, x) => n + (x.hpPlus - 99) * x.perPlus, 0);
  const max891 = maxHp + xs.reduce((n, x) => n + (297 - x.hpPlus) * x.perPlus, 0);
  // 最低限の＋値（全員＋297から、HPが伸びやすいキャラの順に上げる）
  let deficit = need - base297;
  const plan = [];
  if (deficit > 0) {
    for (const x of [...xs].sort((a, b) => b.perPlus - a.perPlus)) {
      if (deficit <= 0) break;
      const pts = Math.min(198, Math.ceil(deficit / x.perPlus));
      deficit -= pts * x.perPlus;
      plan.push({ name: x.name, to: (99 + pts) * 3 });
    }
  }
  // チームHP強化を減らせる数（今の＋値のまま／全員＋891）
  const tm = 1 + 0.05 * setup.teamHp;
  const cut = (hp) => {
    let k = 0;
    while (k < setup.teamHp && (hp * (1 + 0.05 * (setup.teamHp - k - 1))) / tm >= need) k++;
    return k;
  };
  return { need, base297, max891, minOk: deficit <= 0, plan, cutNow: maxHp >= need ? cut(maxHp) : null, cut891: max891 >= need ? cut(max891) : null };
}
function renderHpBudget(setup, maxHp, need, label) {
  const b = hpBudget(setup, maxHp, need);
  if (!b) return "";
  const lines = [];
  if (!b.plan.length && b.minOk) lines.push("＋値は全員＋297でも足ります");
  else if (b.minOk) lines.push(`＋値の最低ライン（全員＋297から、HPが伸びやすいキャラの順に）: ${b.plan.map((p) => `${esc(p.name)} ＋${p.to}`).join("、")}（ほかは＋297でOK）`);
  else lines.push("全員＋891にしても足りません");
  if (setup.teamHp) {
    if (b.cutNow) lines.push(`今の＋値のままなら、チームHP強化を<strong>${b.cutNow}個</strong>減らしても耐えられます（${setup.teamHp}個→${setup.teamHp - b.cutNow}個）`);
    if (b.cut891 != null && b.cut891 > (b.cutNow ?? 0)) lines.push(`全員＋891なら、チームHP強化を<strong>${b.cut891}個</strong>減らしても耐えられます（${setup.teamHp}個→${setup.teamHp - b.cut891}個）`);
  }
  return `<div class="advice"><p>${label}必要HP ${b.need.toLocaleString("ja-JP")}に対する＋値・チームHP強化の妥協ライン（全員＋297なら ${Math.round(b.base297).toLocaleString("ja-JP")}、全員＋891なら ${Math.round(b.max891).toLocaleString("ja-JP")}）</p><ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul></div>`;
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

// 属性軽減の潜在（レシートの分＋属性が分からない分）を、必要HPが一番下がる属性へ1個ずつ振る（＋2.5%から先に、次に1%）
// 差がない時は元の属性のまま。敵の攻撃に出てこない属性には振らない
function allocateLatentPool(d, setup, skillRed) {
  const pool = setup.latentPool ?? { n1: 0, n2: 0, orig: {} };
  const units = [...Array(Math.round(pool.n2 + (setup.autoLatent ?? 0) / 2.5)).fill(2.5), ...Array(pool.n1).fill(1)];
  const alloc = Object.fromEntries(ATTRS5.map((a) => [a, 0]));
  const count = Object.fromEntries(ATTRS5.map((a) => [a, { n1: 0, n2: 0 }]));
  if (!units.length) return { alloc, count };
  const used = new Set(d.damage.floors.flatMap((f) => [...(f.enemyAttrs ?? []), ...f.hits.flatMap((h) => h.attrs ?? [])]).filter((a) => ATTRS5.includes(a)));
  const cands = ATTRS5.filter((a) => used.has(a));
  const cache = new Map();
  const score = (al) => {
    const key = ATTRS5.map((a) => al[a]).join(",");
    if (!cache.has(key)) {
      const s = { ...setup, awkAttr: Object.fromEntries(ATTRS5.map((a) => [a, setup.awkAttr[a] + al[a]])) };
      cache.set(key, requiredHp(d, s, skillRed, {}) ?? Infinity);
    }
    return cache.get(key);
  };
  // 元の属性を優先する順（同点なら元の振り方に近い方）
  const origLeft = { ...pool.orig };
  for (const u of units) {
    const pref = ATTRS5.filter((a) => (origLeft[a] ?? 0) >= u);
    let best = null;
    let bestScore = Infinity;
    for (const a of [...pref, ...cands.filter((x) => !pref.includes(x))]) {
      const sc = score({ ...alloc, [a]: alloc[a] + u });
      if (sc < bestScore) {
        bestScore = sc;
        best = a;
      }
    }
    best ??= pref[0] ?? cands[0] ?? ATTRS5[0];
    alloc[best] += u;
    count[best][u === 1 ? "n1" : "n2"]++;
    if ((origLeft[best] ?? 0) >= u) origLeft[best] -= u;
  }
  return { alloc, count };
}

// レシートで使ったスキルを「本体の名前」「本体の名前裏（アシストのスキル）」だけで、最初に使った順に並べる
function usedSkillNames(t, setup) {
  // 図鑑No. → 表示名（本体は変身前後どちらのNo.でも同じ名前）
  const label = new Map();
  const ab = memberLabels(t);
  for (const [i, m] of t.members.entries()) {
    const no = monster(m.id)?.no;
    const base = glyphName(monster(m.id)?.name ?? "", 14);
    // 同じキャラの本体どうしは使用記録から区別できないので、本体は記号なし。武器（裏）はA・Bを付ける
    const name = base + (ab[i] ?? "");
    const fam = MDB.get(no)?.[9];
    if (no) label.set(no, base);
    if (fam) for (const r of familyRows.get(fam) ?? []) label.set(r[0], base);
    const an = assistNoOf(m);
    if (an && !label.has(an)) label.set(an, `${name}裏`);
  }
  const out = [];
  const byOrder = receiptOrder.get(t.id);
  const src = byOrder && Object.keys(byOrder).length ? byOrder : setup.uses ?? {};
  const floors = Object.keys(src).sort((a, b) => Number(a) - Number(b));
  for (const f of floors) for (const no of src[f]) {
    const l = label.get(no);
    if (l && !out.includes(l)) out.push(l);
  }
  return out.length ? out.map(esc).join("・") : "スキルの使用なし";
}
function renderEnduranceResult(t, d, maxHp, latent = {}, kago) {
  const setup0 = enduranceSetup(t, { kago });
  // 属性不明の潜在は、スキル軽減ありの想定（あれば）で一番効く属性に振って固定する
  const { alloc: auto, count: autoCount } = allocateLatentPool(d, setup0, setup0.skillRed);
  const setup = { ...setup0, awkAttr: Object.fromEntries(ATTRS5.map((a) => [a, setup0.awkAttr[a] + auto[a]])) };
  const pool = setup0.latentPool ?? { n1: 0, n2: 0, orig: {} };
  const latName = (c) => [c.n2 ? `軽減＋×${c.n2}` : "", c.n1 ? `軽減×${c.n1}` : ""].filter(Boolean).join("・");
  const origText = ATTRS5.filter((a) => pool.orig[a]).map((a) => `${a}${pool.orig[a]}%`).join("・");
  const newText = ATTRS5.filter((a) => auto[a]).map((a) => `<strong>${a}</strong>${latName(autoCount[a])}（${auto[a]}%）`).join("・");
  // 元の振り方のままの結果（比較用）
  const origSetup = { ...setup0, awkAttr: Object.fromEntries(ATTRS5.map((a) => [a, setup0.awkAttr[a] + (pool.orig[a] ?? 0)])) };
  const origSim = pool.n1 + pool.n2 ? simulateEndurance(d, origSetup, maxHp, setup0.skillRed, latent) : null;
  const autoNote = pool.n1 + pool.n2 + (setup0.autoLatent ? 1 : 0)
    ? `<p class="advice">属性軽減の潜在は、ほかの潜在はそのままで属性だけ振り替えて、このダンジョンで一番効く形にして計算しています: ${newText || "どこに振っても変わらないため元のまま"}${origText ? `<br><small class="muted">レシートの振り方: ${origText}${origSim ? `（このままだと${setup0.skillRed ? "レシートどおりのスキルで" : ""}${origSim.deadAt == null ? "全フロア耐えられる" : `${origSim.deadAt}Fで倒れる`}計算）` : ""}</small>` : ""}${setup0.autoLatent ? `<br><small class="muted">属性が判別できない属性軽減＋（合計${setup0.autoLatent}%）も含めて振っています</small>` : ""}</p>`
    : "";
  // 敵の属性で効果が変わるスキルを、敵がランダム（どちらか出現・乱入）の階で使っている時は、どちらになるか分からないので耐えられる方（効果が倍の方）で計算（本人指定）
  const ambiguous = [...new Map(
    [...(setup.hpUps ?? []), ...(setup.regens ?? []), ...(setup.reductions ?? [])]
      .filter((x) => x.cond)
      .map((x) => [x, d.damage.floors.find((f) => f.floor === x.floor)])
      .filter(([x, f]) => f && /ランダム|乱入|2通り|いずれか/.test(f.note ?? "") && (f.enemyAttrs ?? []).includes(x.cond.attr) && (f.enemyAttrs ?? []).some((a) => a !== x.cond.attr))
      .map(([x, f]) => [`${f.floor}:${x.name}`, `${f.floor}F（${esc(x.name)}）`])
  ).values()];
  const ambNote = ambiguous.length
    ? `<p class="hint">※ ${ambiguous.join("・")}: 敵がランダムに出るため、スキルの効果が倍になる属性の敵が出るか分かりません。耐えられる方（効果が倍になる方）で計算しています。</p>`
    : "";
  const sim = simulateEndurance(d, setup, maxHp, 0, latent);
  // スキルの軽減ありの場合（効果が最後まで続く前提）
  const withSkill = setup.skillRed ? simulateEndurance(d, setup, maxHp, setup.skillRed, latent) : null;
  const skillLine = withSkill
    ? `<p class="${withSkill.deadAt == null ? "ok" : "ng"}">レシートどおりにスキルを使うと（${usedSkillNames(t, setup)}）: ${withSkill.deadAt == null ? "全フロア耐えられる" : `${withSkill.deadAt}Fで倒れる`}計算です</p>
       ${renderLatentAdvice(d, setup, maxHp, setup.skillRed, latent, withSkill).replace("潜在覚醒の枠が空いていれば", "レシートどおりのスキルで、潜在覚醒の枠が空いていれば")}`
    : "";
  const heal = setup.healGen
    ? "毎ターン使うスキルで回復ドロップを生成 → 毎ターンHP満タンとして計算"
    : setup.regens.length
      ? `%回復（${[...new Set(setup.regens.map((r) => `${esc(r.name)}${r.pct}%・${r.dur}ターン`))].join("／")}）が効いているターンはその分だけ回復、それ以外のターンは回復ドロップを組んで全回復として計算（回復生成スキルを使った階は全回復）`
      : "%回復スキルなし → 毎ターン回復ドロップを組んで全回復として計算（回復生成スキルを使った階も全回復）";
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
  const plusLines = setup.skillRed ? renderHpBudget(setup, maxHp, need1, "レシートどおりのスキルで、") : renderHpBudget(setup, maxHp, need0, "スキルなしで、");
  return `${need}${autoNote}${ambNote}${verdict}${renderLatentAdvice(d, setup, maxHp, 0, latent, sim)}${skillLine}${plusLines}
    <p class="hint">%指定のない「軽減」は35%として計算。スキルの軽減・最大HPアップは、レシートに使う階が書かれているものだけを、スキルに書かれたターン数の間だけ乗せています（重なった場合は最後に使ったもの。書かれていないスキルは使っていない扱い）。属性軽減は覚醒（${awk || "なし"}）と、上で入力した潜在の合計（割合ダメージにも乗せています）。<br>下の表は${withSkill ? "レシートどおりにスキルを使った場合" : "スキルなし"}。軽減: リーダー・フレンドのLSで${Math.round(setup.reduce * 1000) / 10}%（LSの条件を毎ターン満たす前提）／${heal}</p>
    <div class="table-wrap"><table class="end-table"><thead><tr><th>階</th><th>攻撃</th><th>スキル軽減</th><th>属性</th><th>ダメージ</th><th>軽減後</th><th>残りHP</th></tr></thead><tbody>
    ${(withSkill ?? sim).rows.map((r) => r.skipped ? `<tr class="muted"><td>${r.floor}F</td><td>${esc(r.label)}</td><td colspan="5">${esc(r.skipped)}</td></tr>` : `<tr class="${r.ok ? "" : "ng"}"><td>${r.floor}F<small class="muted">（${r.turn}T）</small></td><td>${esc(r.label)}${r.noLs ? ` <span class="st st-ng">LS軽減なし</span>` : ""}</td><td>${r.sk ? `${r.sk}%` : "―"}</td><td>${attrCell(r)}</td><td>${r.raw.toLocaleString("ja-JP")}</td><td>${r.taken.toLocaleString("ja-JP")}</td><td>${r.ok ? r.left.toLocaleString("ja-JP") : "✗ 倒れる"}</td></tr>`).join("")}
    </tbody></table></div>`;
}

function renderEndurance(t, d) {
  if (!d?.damage?.floors?.length || t.multi) return "";
  const setup = enduranceSetup(t);
  const notes = d.damage.floors.filter((f) => f.note).map((f) => `${f.floor}F: ${esc(f.note)}`).join("／");
  const warn = `<p class="end-warn">⚠ この計算は攻略サイトのデータと推定値にもとづく<strong>目安</strong>で、間違っている可能性があります（敵の行動の抜け・条件の読み違い・HPの推定誤差など）。実際に挑む前にPDCやゲーム内で必ず確認してください。${d.damage.auto ? "このダンジョンの敵の攻撃は攻略サイトの表から自動で取り込んだもので、未確認です。" : ""}${t.members.some((m) => isFullBuild(m.build)) ? "" : "この編成はレシートの超覚醒・潜在・レベルが未登録のため、HPは低めに出ます。"}</p>`;
  return `<details class="endurance" data-team="${esc(t.id)}"><summary>耐久チェック（試作）</summary>
    ${warn}
    <div class="end-hp-label">
      <label>チームHP <input type="number" class="end-hp" data-team="${esc(t.id)}" min="1" step="1000" value="${setup.estHp}"></label>
      <label>ダンジョンの加護 <select class="end-kago">
        ${["", "陽", "陰"].map((k) => `<option value="${k}"${(d.kago ?? "") === k ? " selected" : ""}>${k ? `${k}の加護あり` : "なし"}</option>`).join("")}
      </select></label>
    </div>
    <p class="hint">初期値は推定です（レシートのレベル・＋値・超覚醒・潜在、HP覚醒、LSのHP倍率、チームHP強化${setup.teamHp}個${setup.badge?.hp ? `、バッジ「${esc(setup.badge.name)}」HP${setup.badge.hp}%` : ""}${setup.unknown ? `、図鑑にない${setup.unknown}体を除外` : ""}）。ゲーム内の実際のHPを入れると正確になります。</p>
    ${setup.r5 > 1.001 || setup.r10 > 1.001 ? `<p class="hint">熟成持ちがいるので、チームHPはバトル5〜9で×${setup.r5.toFixed(2)}、バトル10以降で×${setup.r10.toFixed(2)}になります（上の数値は1〜4階のHP）。</p>` : ""}
    ${setup.rp[1] > 1.001 && d.damage.floors.some((f) => f.parts) ? `<p class="hint">部位破壊ボーナス持ちがいるので、部位のある階（${d.damage.floors.filter((f) => f.parts).map((f) => f.floor + "F").join("・")}）では部位を壊した後（最初の攻撃の後）にチームHPが上がる計算です（1〜4階の基準で×${setup.rp[1].toFixed(2)}）。</p>` : ""}
    <div class="end-lat"><span class="label">振っている潜在の属性軽減（パーティー合計%）</span>
      ${ATTRS5.map((a) => `<label>${a}<input type="number" class="end-lat-in" data-attr="${a}" min="0" max="100" step="0.5" value="0">%</label>`).join("")}
    </div>
    <div class="end-result" data-pending="1"><p class="hint">計算中…</p></div>
    <p class="hint">敵の攻撃: <a href="${esc(d.damage.source.url)}" target="_blank" rel="noopener">${esc(d.damage.source.site)}</a>（${esc(d.damage.note)}）${notes ? `<br>${notes}` : ""}</p>
  </details>`;
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

// ダンジョンの区分と並び（区分も中身も実装順）。ここにないダンジョン（登録で増えたもの）は「その他」の最後
const DUNGEON_GROUPS = [
  ["未知の新星", ["banryu"]],
  ["再臨の超星", ["hyakushiki", "senju", "shinbanju", "kyouchou", "shinokuchou"]],
  ["守霊の天体", ["jupiter", "mercury", "venus", "moon", "sun"]],
  ["天空の儚域", ["fuun", "kirisame", "tenkyu"]],
  ["奈落の重界", ["guren", "taiju"]],
  ["その他", ["noel", "plusparadise"]],
];
function dungeonGroup(d) {
  const i = DUNGEON_GROUPS.findIndex(([, ids]) => ids.includes(d.id));
  return i < 0 ? { gi: DUNGEON_GROUPS.length - 1, oi: 999, name: "その他" } : { gi: i, oi: DUNGEON_GROUPS[i][1].indexOf(d.id), name: DUNGEON_GROUPS[i][0] };
}
function sortedDungeons(list = db.dungeons) {
  return [...list].sort((a, b) => {
    const x = dungeonGroup(a), y = dungeonGroup(b);
    return x.gi - y.gi || x.oi - y.oi;
  });
}

function suggestionsFor(q) {
  const list = searchType === "dungeon" ? sortedDungeons() : searchType === "leader" ? leaderSuggestions() : db.items;
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
  let lastGroup = null;
  el.innerHTML = hits
    .map((r, i) => {
      const aka = r.aliases?.length ? `<small>${r.aliases.map(esc).join("・")}</small>` : "";
      // ダンジョンは区分ごとに見出しを入れる
      const g = searchType === "dungeon" ? dungeonGroup(r).name : null;
      const head = g && g !== lastGroup ? `<li class="suggest-group" role="presentation">${esc(g)}</li>` : "";
      lastGroup = g;
      return `${head}<li role="option" data-name="${esc(r.name)}" class="${i === suggestIndex ? "active" : ""}">${esc(r.name)}${aka}</li>`;
    })
    .join("");
  el.hidden = hits.length === 0;
  $("#q").setAttribute("aria-expanded", String(!el.hidden));
}

function pickSuggestion(name) {
  $("#q").value = name;
  syncQClear();
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
  // 投稿のPDCレシート画像から切り抜いたアイコン（icons.webp に1枚にまとめたもの）。なければ名前の1文字
  const no = typeof ref === "number" ? ref : ref?.no;
  const pi = window.PAD_ICONS?.index?.[no];
  // 画像から登録された編成に付いていたアイコン
  const sharedIcon = pi == null ? SHARED_ICONS[no] : null;
  if (sharedIcon)
    return `<span class="icon icon-img icon-own ${assist ? "icon-assist" : ""} a-${main}" title="${esc(name)}${row?.[5] ? `（スキル${row[5]}ターン）` : ""}" aria-hidden="true" style="background-image:url('${sharedIcon}');background-size:cover;background-position:center">${ct}</span>`;
  if (pi != null) {
    const { cols, rows, ver } = window.PAD_ICONS;
    const pos = `${((pi % cols) / Math.max(1, cols - 1)) * 100}% ${(Math.floor(pi / cols) / Math.max(1, rows - 1)) * 100}%`;
    // 画像のURLに icons.js と同じ番号を付ける（並び順の表と画像がずれないように）
    return `<span class="icon icon-img ${assist ? "icon-assist" : ""} a-${main}" title="${esc(name)}${row?.[5] ? `（スキル${row[5]}ターン）` : ""}" aria-hidden="true" style="background-image:url('icons.webp?v=${ver ?? ""}');background-size:${cols * 100}% ${rows * 100}%;background-position:${pos}">${ct}</span>`;
  }
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
    sortedDungeons().map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("") +
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

// 1周あたりのドロップの入力欄（素材と個数を3行まで）
function renderDropRows(yields = {}) {
  const el = $("#reg-drops");
  if (!el) return;
  const skip = new Set(["plus", "exp", "coin"]);
  const items = db.items.filter((it) => !skip.has(it.id));
  const have = Object.entries(yields ?? {}).filter(([k]) => !skip.has(k));
  const rows = [...have, ...Array(Math.max(0, 3 - have.length)).fill(["", ""])].slice(0, Math.max(3, have.length));
  el.innerHTML = rows
    .map(([id, v]) => `<div class="form-row drop-row"><select><option value="">素材を選ぶ</option>${items.map((it) => `<option value="${esc(it.id)}"${it.id === id ? " selected" : ""}>${esc(it.name)}</option>`).join("")}</select><input type="number" min="0" step="0.1" inputmode="decimal" placeholder="個数" value="${esc(v)}"><span class="unit">個</span></div>`)
    .join("");
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
  // 登録は画像からだけ（読み取るまで入力欄は出さない）
  $("#reg-fields").hidden = true;
  $("#reg-ocr-msg").textContent = "";
  regIcons = {};
  regSupers = {};
  regBadge = null;
  regQr = null;
  renderDropRows();
}

async function saveRegForm() {
  // ダンジョン
  let dungeonId = $("#reg-dungeon").value;
  if (dungeonId === "__new") {
    const name = $("#reg-dungeon-name").value.trim();
    if (!name) return regMessage("新しいダンジョン名を入力してください。", false);
  }
  // 高速ON・OFFそれぞれのタイム（どちらか必須）
  const readTime = (k) => Math.round(Number($(`#reg-min-${k}`).value || 0) * 60 + Number($(`#reg-sec-${k}`).value || 0)) || null;
  const times = { on: readTime("on"), off: readTime("off") };
  if (!times.on && !times.off) return regMessage("1周のタイム（高速ONかOFFのどちらか）を入力してください。", false);
  const timeSec = Math.min(...[times.on, times.off].filter(Boolean));

  // モンスター
  const members = [];
  const slotNos = []; // [枠, 図鑑No., "base"|"assist"]（アイコンの保存用）
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
    slotNos.push([i, m, "base"], [i, a, "assist"]);
    // PDCのQRコードから読み取ったレベル・＋値・超覚醒・潜在（読み取った後に本体を変えていなければ）
    const q = regQr?.[i];
    if (q && q.no === m) {
      mem.build = { lv: q.lv, plus: q.plus[0] + q.plus[1] + q.plus[2], super: q.super, latents: q.latents, fromQr: true };
    }
    // PDCの画像から読み取った超覚醒（QRが読めなかった時）
    else if (regSupers[i] && regSupers[i].no === m) mem.build = { super: regSupers[i].super, superOnly: true };
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
  for (const [inputId, itemId] of [["#reg-plus", "plus"], ["#reg-exp", "exp"], ["#reg-coin", "coin"]]) {
    const v = Number($(inputId).value || 0);
    if (!v || !db.items.some((it) => it.id === itemId)) continue;
    yields[itemId] = v;
    if (!dungeon.drops.some((d) => d.itemId === itemId)) dungeon.drops.push({ itemId, rate: v });
  }
  // 1周あたりのドロップ（クリア画像がない時などに手で入力）
  document.querySelectorAll("#reg-drops .drop-row").forEach((row) => {
    const itemId = row.querySelector("select").value;
    const v = Number(row.querySelector("input").value || 0);
    if (!itemId || !v) return;
    yields[itemId] = (yields[itemId] ?? 0) + v;
    if (!dungeon.drops.some((d) => d.itemId === itemId)) dungeon.drops.push({ itemId, rate: v });
  });

  const stepsText = $("#reg-steps").value;
  const turns = Number($("#reg-turns").value || 0) || undefined;

  const team = {
    id: regEditingId ?? `u${Date.now()}`,
    userAdded: true,
    dungeonId,
    title: $("#reg-title").value.trim() || `${dungeon.name} 編成`,
    timeSec,
    ...(turns ? { turns } : {}),
    times: Object.fromEntries(Object.entries(times).filter(([, v]) => v)),
    ...(times.on && !times.off ? { fastMode: true } : !times.on && times.off ? { fastMode: false } : {}),
    ...(Object.keys(yields).length ? { yields } : {}),
    members,
    steps: stepsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    source: $("#reg-src").value.trim(),
    ...($("#reg-author").value.trim() ? { author: { name: $("#reg-author").value.trim() } } : {}),
    sourceDate: new Date().toISOString().slice(0, 10),
    metrics: metricsFromText(stepsText, $("#reg-891").value),
    plus891Choice: $("#reg-891").value,
  };
  // 画像から切り抜いたアイコン（枠ごと。登録時にその枠に入っているキャラの分で、まだサイトにアイコンがないもの）
  const icons = {};
  for (const [i, no, part] of slotNos) if (no && regIcons[i]?.[part] && window.PAD_ICONS?.index?.[no] == null) icons[no] = regIcons[i][part];
  if (Object.keys(icons).length) team.icons = icons;
  if (regQr?.badge) team.badgeId = regQr.badge;
  if (regBadge && !(regQr?.badge && window.PAD_BADGES?.byId?.[regQr.badge] != null)) team.badgeIcon = regBadge;
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
    members: t.members.map((m) => ({ no: monster(m.id)?.no ?? null, name: monster(m.id)?.name ?? "", role: m.role, ...(m.p ? { p: m.p } : {}), ...(m.assist ? { assist: m.assist } : {}), ...(m.build && !m.build.userPicked ? { build: m.build } : {}) })),
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
      ...(m.build ? { build: m.build } : {}),
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
  for (const t of shared.teams) for (const [no, url] of Object.entries(t.icons ?? {})) if (/^data:image\/webp;base64,/.test(url)) SHARED_ICONS[no] = url;
  applySuperPicks();
  if (!$("#admin-panel").hidden) renderNoIconList();
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

// 管理者用: 編成に出てくるのにアイコン画像がないキャラの一覧
function renderNoIconList() {
  const el = $("#admin-noicon");
  if (!el) return;
  const need = new Map();
  for (const t of db.teams) {
    for (const m of t.members) {
      for (const no of [monster(m.id)?.no, assistNoOf(m)]) {
        if (!no || window.PAD_ICONS?.index?.[no] != null || SHARED_ICONS[no]) continue;
        if (!need.has(no)) need.set(no, new Set());
        need.get(no).add(t.title);
      }
    }
  }
  const list = [...need].sort((a, b) => a[0] - b[0]);
  el.innerHTML = list.length
    ? `<p class="muted">${list.length}体</p><ul class="reg-list">${list
        .map(([no, ts]) => `<li><div class="reg-info"><strong>${esc(MDB.get(no)?.[1] ?? "不明")} <span class="muted">No.${no}</span></strong><span class="muted">${esc([...ts].slice(0, 2).join("／"))}${ts.size > 2 ? ` ほか${ts.size - 2}件` : ""}</span></div></li>`)
        .join("")}</ul>`
    : `<p class="hint">すべてのキャラに画像があります。</p>`;
}

// 管理者パネル（承認待ち・通報）
let adminUnsubs = [];
function renderAdminPanel() {
  const panel = $("#admin-panel");
  adminUnsubs.forEach((u) => u?.());
  adminUnsubs = [];
  // データ管理タブは管理者だけに出す（それ以外の人には不要）
  const isAdmin = shared.mode === "firebase" && shared.fb.isAdmin;
  const dataTab = document.querySelector('.tab[data-tab="data"]');
  dataTab.hidden = !isAdmin;
  if (!isAdmin && dataTab.classList.contains("active")) document.querySelector(".tab").click();
  if (!isAdmin) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  renderNoIconList();
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
  const tt = teamTimes(t);
  for (const k of ["on", "off"]) {
    const v = tt[k];
    $(`#reg-min-${k}`).value = v != null ? Math.floor(v / 60) : "";
    $(`#reg-sec-${k}`).value = v != null ? +(v % 60).toFixed(1) : "";
  }
  $("#reg-turns").value = t.turns ?? "";

  $("#reg-plus").value = t.yields?.plus ?? "";
  $("#reg-exp").value = t.yields?.exp ?? "";
  $("#reg-coin").value = t.yields?.coin ?? "";
  renderDropRows(t.yields);
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
  $("#reg-fields").hidden = false;
  $("#reg-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

let regDeleteArmed = null;
// ログイン中の自分が登録した編成か（Firebase 版は登録したアカウント、それ以外はこのブラウザで登録したもの）
function isMine(t) {
  if (!t.userAdded) return false;
  if (shared.mode !== "firebase" || !t.shared) return true;
  return !!shared.fb.user && t.ownerUid === shared.fb.user.uid;
}
function renderRegList() {
  // Firebase 版は自分（ログイン中のアカウント）が登録したものだけ。他の人の公開済み編成は編成検索に出る
  const mine = db.teams.filter(isMine);
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
    if (b.dataset.tab === "register") {
      renderRegDungeons($("#reg-dungeon").value);
      renderRegList();
    }
  })
);

function updateModeLabels() {
  const b1 = $('#mode [data-mode="expHour"]');
  const b2 = $('#mode [data-mode="perRun"]');
  if (searchType === "dungeon" || searchType === "leader") {
    b1.textContent = "経験値/時";
    b2.textContent = "経験値/周";
  } else {
    b1.textContent = "素材/時";
    b2.textContent = "素材/周";
  }
}

function setSearchType(type) {
  searchType = type;
  updateModeLabels();
  const t = SEARCH_TYPES[type];
  document.querySelectorAll("#search-type button").forEach((x) => x.classList.toggle("active", x.dataset.type === type));
  $("#q-label").textContent = t.label;
  $("#q").placeholder = t.placeholder;
  $("#leader-dungeon-wrap").hidden = type !== "leader";
  if (type === "leader") renderLeaderDungeons();
  renderSuggestions();
}
// リーダー・フレンドで探す時のダンジョン指定（区分ごと・実装順）
function renderLeaderDungeons() {
  const sel = $("#leader-dungeon");
  const cur = sel.value;
  const groups = new Map();
  for (const d of sortedDungeons()) {
    const g = dungeonGroup(d).name;
    (groups.get(g) ?? groups.set(g, []).get(g)).push(d);
  }
  sel.innerHTML = `<option value="">すべてのダンジョン</option>` + [...groups].map(([g, ds]) => `<optgroup label="${esc(g)}">${ds.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("")}</optgroup>`).join("");
  sel.value = cur;
}
$("#leader-dungeon").addEventListener("change", () => $("#q").value.trim() && search());

document.querySelectorAll("#search-type button").forEach((b) =>
  b.addEventListener("click", () => {
    if (b.dataset.type === searchType) return;
    setSearchType(b.dataset.type);
    $("#q").value = "";
    syncQClear();
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
// 入力を一括で消す×ボタン（文字がある時だけ表示）
const syncQClear = () => ($("#q-clear").hidden = !$("#q").value);
$("#q").addEventListener("input", () => {
  suggestIndex = -1;
  syncQClear();
  renderSuggestions();
});
$("#q-clear").addEventListener("mousedown", (e) => e.preventDefault());
$("#q-clear").addEventListener("click", () => {
  $("#q").value = "";
  syncQClear();
  suggestIndex = -1;
  $("#q").focus();
  renderSuggestions();
});
$("#q").addEventListener("focus", renderSuggestions);
$("#q").addEventListener("blur", () => setTimeout(renderSuggestions, 150));
$("#q").addEventListener("keydown", (e) => {
  const items = [...document.querySelectorAll("#q-suggest li[data-name]")];
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
  if (!li.dataset.name) return;
  pickSuggestion(li.dataset.name);
});
$("#parts-only").addEventListener("change", () => $("#q").value.trim() && search());
document.querySelectorAll("#fast-filter button").forEach((b) =>
  b.addEventListener("click", () => {
    fastFilter = b.dataset.fast;
    document.querySelectorAll("#fast-filter button").forEach((x) => x.classList.toggle("active", x === b));
    if ($("#q").value.trim()) search();
  })
);

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
  return { ...data, imageWidth: canvas.width, canvas };
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
    hits.push({ raw, x: (w.bbox.x0 + w.bbox.x1) / 2, y: (w.bbox.y0 + w.bbox.y1) / 2, y1: w.bbox.y1, lv: (w.text.match(/LV(\d{2,3})/i) ?? [])[1] });
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
async function readPdcStepsText(file, data, onStep) {
  const bmp = await createImageBitmap(file);
  const k = (data.imageWidth ?? bmp.width) / bmp.width;
  const line = (data.lines ?? []).find((l) => /PDC|パズドラダメージ計算/.test(l.text ?? ""));
  if (!line?.bbox) return null;
  const y0 = Math.min(bmp.height - 1, Math.round(line.bbox.y1 / k) + 2);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height - y0;
  if (c.height < 40) return null;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, y0, bmp.width, c.height, 0, 0, c.width, c.height);
  const { data: d2 } = await Tesseract.recognize(c, "jpn", { logger: (m) => m.status === "recognizing text" && onStep?.(Math.round(m.progress * 100)) });
  return cleanSteps((d2.text ?? "").split("\n"));
}
// 立ち回りの文字の後処理（空白・矢印・よくある読み違い）
function cleanSteps(lines) {
  const jp = /[^\x00-\x7F]/;
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/ +/g, (sp, at, str) => (jp.test(str[at - 1] ?? "") || jp.test(str[at + sp.length] ?? "") ? "" : " ")))
    // 「→」が「っ」「う」と読まれやすい（行頭やキャラ名の後ろのひらがなは矢印とみなす）
    .map((l) => l.replace(/^[っうぅ]{1,3}(?=[\u30A0-\u30FF\u4E00-\u9FFF])/, "→").replace(/(?<=[\u30A0-\u30FF\u4E00-\u9FFF)）])[っうぅ]{1,3}/g, "→"))
    // 「裏」が「衰」と読まれやすい
    .map((l) => l.replace(/衰/g, "裏"))
    // 丸数字が2つ続くのは読み違い（③⑫ → ③）
    .map((l) => l.replace(/^([①-⑳])[①-⑳]+/, "$1"))
    .join("\n");
}
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
    coin: num(/コイン[:：]?([\d,，]+)/),
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

// 本体アイコン右上の覚醒アイコンを、そのキャラの超覚醒・シンクロ覚醒の画像（高画質覚醒スキル様の画像）とずらしながら見比べる
// （tools/read-supers.py と同じ。一番近いのが超覚醒ならそれ、シンクロ覚醒なら超覚醒なし＝0）
const awkImgCache = new Map();
function loadAwkImage(id) {
  if (!AWK_IMG[id]) return Promise.resolve(null);
  if (!awkImgCache.has(id))
    awkImgCache.set(id, new Promise((ok) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => ok(img);
      img.onerror = () => ok(null);
      img.src = `${AWK_IMG_BASE}${AWK_IMG[id]}.png`;
    }));
  return awkImgCache.get(id);
}
function pixels(drawable, sx, sy, sw, sh, w, h, white = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (white) (g.fillStyle = "#fff"), g.fillRect(0, 0, w, h);
  g.drawImage(drawable, sx, sy, sw, sh, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}
async function readRegSupers(data, slots) {
  const src = data.canvas;
  if (!src) return {};
  const cell = src.width / 6;
  const out = {};
  for (const [col, sl] of slots.entries()) {
    const b = sl.base;
    const row = b?.no ? MDB.get(b.no) : null;
    const supers = String(row?.[11] ?? "").split(".").filter(Boolean).map(Number);
    if (!row || !supers.length || b.y1 == null) continue;
    const synchro = row[26] || 0;
    const top = b.y1 + cell * 0.04 - cell;
    if (top < 0) continue;
    const s = cell * 0.94, x0 = col * cell + cell * 0.03, y0 = top + cell * 0.03;
    const RW = 84, RH = 112;
    const region = pixels(src, x0 + s * 0.58, y0 + s * 0.18, s * 0.42, s * 0.56, RW, RH);
    const scores = [];
    for (const id of new Set([...supers, ...(synchro ? [synchro] : [])])) {
      const img = await loadAwkImage(id);
      if (!img) continue;
      let best = Infinity;
      for (const size of [46, 50, 54]) {
        const t = pixels(img, 0, 0, img.width, img.height, size, size, true);
        for (let oy = 0; oy + size <= RH; oy += 3)
          for (let ox = 0; ox + size <= RW; ox += 3) {
            let d = 0;
            for (let y = 0; y < size; y++)
              for (let x = 0; x < size; x++) {
                const i = (y * size + x) * 4, j = ((oy + y) * RW + ox + x) * 4;
                d += Math.abs(t[i] - region[j]) + Math.abs(t[i + 1] - region[j + 1]) + Math.abs(t[i + 2] - region[j + 2]);
              }
            d /= size * size * 3;
            if (d < best) best = d;
          }
      }
      scores.push([best, id]);
    }
    scores.sort((a, c) => a[0] - c[0]);
    if (!scores.length) continue;
    const [best, second] = [scores[0], scores[1] ?? [99]];
    if (best[0] < 65 && second[0] - best[0] >= 8) out[col] = { no: b.no, super: supers.includes(best[1]) && best[1] !== synchro ? best[1] : 0 };
  }
  return out;
}

// PDCで選んだバッジ（タイトルの左の色付きの札）を切り抜く（tools/crop-icons.py の crop_badges と同じ考え方）
function cropRegBadge(data, slots) {
  const src = data.canvas;
  const a = slots.find((x) => x.assist?.y1 != null)?.assist;
  if (!src || !a) return null;
  const cell = src.width / 6;
  const top = a.y1 + cell * 0.04 - cell;
  const y0 = Math.max(0, top - cell * 0.85);
  const w = Math.round(cell * 0.75), h = Math.round(top - y0);
  if (h < 10) return null;
  const px = pixels(src, 0, y0, w, h, w, h);
  const colored = (x, y) => { const i = (y * w + x) * 4; return Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) > 45; };
  const cols = Array.from({ length: w }, (_, x) => { let n = 0; for (let y = 0; y < h; y++) n += colored(x, y); return n; });
  let x0 = cols.findIndex((n) => n > h * 0.25);
  if (x0 < 0) return null;
  let x1 = x0;
  while (x1 + 1 < w && cols[x1 + 1] > h * 0.15) x1++;
  const rows = Array.from({ length: h }, (_, y) => { let n = 0; for (let x = x0; x <= x1; x++) n += colored(x, y); return n; });
  const ys = rows.map((n, y) => (n > (x1 - x0 + 1) * 0.25 ? y : -1)).filter((y) => y >= 0);
  if (!ys.length) return null;
  const by0 = ys[0], by1 = ys.at(-1), bw = x1 - x0 + 1, bh = by1 - by0 + 1;
  if (bw < w * 0.2 || bh < h * 0.2 || !(bw / bh > 0.9 && bw / bh < 2.6)) return null;
  const c = document.createElement("canvas");
  c.width = 72;
  c.height = 52;
  c.getContext("2d").drawImage(src, x0, y0 + by0, bw, bh, 0, 0, 72, 52);
  const url = c.toDataURL("image/webp", 0.85);
  return url.startsWith("data:image/webp") && url.length < 20000 ? url : null;
}

// PDCのレシート画像（OCRに使ったキャンバス）から、各枠の本体・アシストのアイコンを64pxで切り抜く
// 横6枠・文字「No.◯◯◯◯◯」の下端を枠の下端とする（tools/crop-icons.py と同じ考え方）
function cropRegIcons(data, slots) {
  const src = data.canvas;
  if (!src) return {};
  const cell = src.width / 6;
  const out = {};
  const cut = (hit, col, part) => {
    if (!hit || hit.y1 == null) return;
    const bottom = hit.y1 + cell * 0.04;
    const top = bottom - cell;
    if (top < 0) return;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    c.getContext("2d").drawImage(src, col * cell + cell * 0.03, top + cell * 0.03, cell * 0.94, cell * 0.94, 0, 0, 64, 64);
    const url = c.toDataURL("image/webp", 0.8);
    if (url.startsWith("data:image/webp") && url.length < 20000) (out[col] ??= {})[part] = url;
  };
  slots.forEach((s, col) => {
    cut(s.base, col, "base");
    cut(s.assist, col, "assist");
  });
  return out;
}

// PDCのQRコードの潜在覚醒の番号 → 種類（管理者に1つずつ確認して作っている対応表）
// 強化（1枠）・＋（2枠）・＋＋（超限界突破キャラだけ）の3種類。毒目覚め耐性は変身キャラ用(36)と超限界突破キャラ用(58)で番号が違う
const PDC_LATENT = {
  1: "HP強化", 2: "回復力強化", 4: "神キラー", 5: "ドラゴンキラー", 6: "悪魔キラー", 8: "バランスキラー", 9: "攻撃キラー", 10: "体力キラー", 11: "回復キラー", 12: "スキル遅延耐性",
  14: "火軽減", 15: "水軽減", 16: "木軽減", 17: "光軽減", 18: "闇軽減", 19: "操作時間延長",
  20: "HP＋", 21: "攻撃力＋", 22: "回復力＋", 23: "操作時間延長＋",
  26: "能力覚醒用キラー", 28: "火軽減＋", 29: "水軽減＋", 30: "木軽減＋", 31: "光軽減＋", 32: "闇軽減＋",
  34: "属性吸収貫通", 35: "リーダーチェンジ耐性", 36: "毒目覚め耐性", 38: "消せないドロップ回復", 39: "ルーレット回復",
  41: "ダメージ上限解放（4倍）", 42: "HP＋＋", 46: "属性吸収無効（上限値アップ版）", 47: "リーダーチェンジ耐性（上限値アップ版）", 48: "消せないドロップ回復（上限値アップ版）", 62: "防御力無視（上限値アップ版）", 43: "攻撃力＋＋", 44: "回復力＋＋", 53: "スキルブースト＋＋", 54: "スキルブースト＋＋（上限値アップ版）", 55: "アシスト無効解除", 56: "アシスト無効解除（上限値アップ版）", 58: "毒目覚め耐性", 60: "部位破壊ボーナス",
};
// QRコードの潜在から、耐久チェックに使うHP%と属性軽減%（HP強化1.5%・＋4.5%・＋＋10%、属性軽減1%・＋2.5%）
function latentFromCodes(codes = []) {
  const hpPct = { 1: 1.5, 20: 4.5, 42: 10 };
  const attrBase = { 14: "火", 15: "水", 16: "木", 17: "光", 18: "闇" };
  const attrPlus = { 28: "火", 29: "水", 30: "木", 31: "光", 32: "闇" };
  let hp = 0;
  const attr = {};
  for (const c of codes) {
    hp += hpPct[c] ?? 0;
    if (attrBase[c]) attr[attrBase[c]] = (attr[attrBase[c]] ?? 0) + 1;
    if (attrPlus[c]) attr[attrPlus[c]] = (attr[attrPlus[c]] ?? 0) + 2.5;
  }
  const n1 = codes.filter((c) => attrBase[c]).length;
  const n2 = codes.filter((c) => attrPlus[c]).length;
  return { hp, attr, n1, n2 };
}
// PDCのQRコード: 編成がそのまま入っている（枠ごとに 0:本体No. 9:アシストNo. 3:レベル 4/5/6:＋値(HP/攻撃/回復) 8:選んだ超覚醒 2:潜在（2文字ずつ）など、36進数）
let jsqrPromise = null;
function loadJsQR() {
  if (window.jsQR) return Promise.resolve();
  return (jsqrPromise ??= new Promise((ok, ng) => {
    const el = document.createElement("script");
    el.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    el.onload = ok;
    el.onerror = () => ng(new Error("QRコードの読み取りの準備に失敗しました"));
    document.head.appendChild(el);
  }));
}
function parsePdcQr(text) {
  const i = text.indexOf("}");
  if (i < 0 || !/^\d+,\d+\]/.test(text)) return null;
  const mems = text
    .slice(i + 1)
    .split("}")
    .map((part) => Object.fromEntries(part.split(",").filter((tok) => tok.length >= 2 && tok[0] === "0").map((tok) => [tok[1], tok.slice(2)])))
    .filter((m) => m["0"]);
  const n = (v) => (v == null || v === "" ? null : parseInt(v, 36));
  const out = mems
    .map((m) => ({
      slot: n(m.f) ?? 0,
      no: n(m["0"]),
      assist: n(m["9"]) > 0 ? n(m["9"]) : null,
      lv: n(m["3"]),
      plus: [n(m["4"]) ?? 0, n(m["5"]) ?? 0, n(m["6"]) ?? 0],
      super: n(m["8"]) > 0 ? n(m["8"]) : 0,
      latents: (m["2"] ?? "").match(/.{2}/g)?.map((x) => parseInt(x, 36)).filter((x) => x > 0) ?? [],
    }))
    .sort((a, b) => a.slot - b.slot);
  if (!out.length || !out.every((m) => MDB.get(m.no))) return null;
  // 先頭の「1,0]104}」の 104 がPDCで選んだバッジの番号
  out.badge = Number(text.match(/^\d+,\d+\](\d+)\}/)?.[1]) || null;
  return out;
}
async function readPdcQr(file) {
  await loadJsQR();
  const bmp = await createImageBitmap(file);
  // そのままの大きさ → QRがある上の方を2倍に拡大、の順に試す
  const tries = [
    [0, 0, bmp.width, bmp.height, 1],
    [0, 0, bmp.width, Math.min(bmp.height, bmp.width * 1.2), 2],
  ];
  for (const [sx, sy, sw, sh, k] of tries) {
    const c = document.createElement("canvas");
    c.width = Math.round(sw * k);
    c.height = Math.round(sh * k);
    const g = c.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const r = window.jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
    const parsed = r?.data ? parsePdcQr(r.data) : null;
    if (parsed) return parsed;
  }
  return null;
}

async function runRegOcr() {
  const pdc = $("#reg-img-pdc").files[0];
  const clear = $("#reg-img-clear").files[0];
  const url = $("#reg-ocr-url").value.trim();
  const msg = (t) => ($("#reg-ocr-msg").textContent = t);
  if (!pdc) return msg("PDCのレシート画像は必須です。クリア画像（プレイ履歴）は、あれば一緒に選んでください。");
  if (clear && !$("#reg-ocr-fast").value) return msg("クリア画像の高速モード（ON/OFF）を選んでください。タイムをどちらの欄に入れるかに使います。");
  $("#reg-ocr-run").disabled = true;
  const notes = [];
  try {
    msg("読み取りの準備中…（初回は数十秒かかります）");
    await loadTesseract();
    if (pdc) {
      // まずQRコード（キャラ・アシスト・レベル・＋値・超覚醒・潜在がそのまま入っている）
      msg("PDCのQRコードを読み取り中…");
      let qr = null;
      try {
        qr = await readPdcQr(pdc);
      } catch {
        qr = null;
      }
      regQr = qr;
      if (qr) {
        qr.slice(0, 6).forEach((m, i) => {
          setSlot($(`#reg-m-${i}`), m.no);
          setSlot($(`#reg-a-${i}`), m.assist);
          updateSlotPreview(i);
        });
        notes.push(`QRコードからモンスター${qr.length}体（レベル・＋値・超覚醒・潜在も）`);
      }
      const d = await ocr(pdc, "jpn+eng", (p) => msg(`PDCのレシートを読み取り中… ${p}%`));
      const slots = parsePdcNumbers(d);
      if (slots && qr) {
        // 切り抜き（アイコン・バッジ）用に位置だけ使う。キャラはQRの方が正確
        regIcons = cropRegIcons(d, slots);
        regBadge = cropRegBadge(d, slots);
      } else if (slots) {
        slots.forEach((s, i) => {
          setSlot($(`#reg-m-${i}`), s.base?.no);
          setSlot($(`#reg-a-${i}`), s.assist?.no);
          updateSlotPreview(i);
        });
        notes.push(`モンスター${slots.filter((s) => s.base).length}体・アシスト${slots.filter((s) => s.assist).length}体`);
        // キャラのアイコンを切り抜いて、編成と一緒に保存する（画像そのものは保存しない）
        regIcons = cropRegIcons(d, slots);
        regBadge = cropRegBadge(d, slots);
        msg("超覚醒を読み取り中…");
        try {
          regSupers = qr ? {} : await readRegSupers(d, slots);
          const n = Object.values(regSupers).filter((x) => x.super).length;
          if (n) notes.push(`超覚醒${n}体`);
        } catch {
          regSupers = {};
        }
      } else if (!qr) notes.push("図鑑No.が読み取れませんでした（手で入力してください）");
      // 立ち回りは「Created by PDC」より下だけを切り出して、拡大せず日本語だけで読み直す方が正確（拡大すると大きい文字が崩れる）
      let steps = null;
      try {
        steps = await readPdcStepsText(pdc, d, (p) => msg(`立ち回りを読み取り中… ${p}%`));
      } catch {
        steps = null;
      }
      steps ||= parsePdcSteps(d);
      if (steps) {
        $("#reg-steps").value = steps;
        notes.push("立ち回り");
      }
    }
    if (clear) {
      const c = parseClear(await ocr(clear, "jpn+eng", (p) => msg(`クリア画像を読み取り中… ${p}%`)));
      if (c.min != null) {
        const k = $("#reg-ocr-fast").value || "off";
        $(`#reg-min-${k}`).value = c.min;
        $(`#reg-sec-${k}`).value = c.sec;
        notes.push("タイム");
      }
      if (c.turns) ($("#reg-turns").value = c.turns), notes.push("クリアターン");
      if (c.plus) $("#reg-plus").value = c.plus;
      if (c.exp) $("#reg-exp").value = c.exp;
      if (c.coin) $("#reg-coin").value = c.coin;
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
    msg(`読み取りました: ${notes.join("・")}。下の内容を確認してから登録してください。`);
    $("#reg-fields").hidden = false;
  } catch (e) {
    msg(`読み取りに失敗しました: ${e.message}`);
  } finally {
    $("#reg-ocr-run").disabled = false;
  }
}
$("#reg-ocr-run")?.addEventListener("click", runRegOcr);
renderDropRows();

// ---------- 更新履歴 ----------
// 一番新しい日だけ開いておく
(() => {
  const list = window.PAD_CHANGELOG ?? [];
  const el = $("#changelog-list");
  if (!el) return;
  el.innerHTML = list
    .map((d, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(d.date)}${i === 0 ? ' <span class="badge">最新</span>' : ""}</summary><ul>${d.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>`)
    .join("");
})();

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

// 古い版のページが開かれたままになっていないか確認（アプリ内ブラウザなどでキャッシュされた古いページから登録するとエラーになるため）
// 開いた時・画面に戻ってきた時・10分ごとに version.json を見て、新しい版があれば読み直す
// （編成登録の入力途中は消えないように、自動では読み直さず案内だけ出す）
async function checkAppVersion() {
  try {
    const mine = new URL(document.querySelector('script[src*="app.js"]').src).searchParams.get("v");
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const { v } = await res.json();
    if (!v || !mine || v === mine) return;
    const reload = (tag) => {
      const u = new URL(location.href);
      u.searchParams.set("v", tag);
      location.replace(u.toString());
    };
    const typing = !$("#tab-register").hidden && [...document.querySelectorAll("#reg-form input, #reg-form textarea")].some((el) => el.type !== "file" && el.type !== "checkbox" && el.value.trim());
    const key = "pad-farming-reloaded-for";
    let tried = null;
    try {
      tried = sessionStorage.getItem(key);
    } catch {}
    if (!typing && tried !== v) {
      try {
        sessionStorage.setItem(key, v);
      } catch {}
      return reload(v);
    }
    if (document.querySelector(".update-banner")) return;
    const bar = document.createElement("div");
    bar.className = "banner update-banner";
    bar.innerHTML = `新しい版が公開されています。<button type="button" class="linkish">再読み込み</button>${typing ? "（入力中の内容は消えます）" : "（直らない時は、ブラウザのメニューから「ブラウザで開く」を選んでください）"}`;
    bar.querySelector("button").addEventListener("click", () => reload(`${v}-${Date.now()}`));
    document.body.prepend(bar);
  } catch {}
}
checkAppVersion();
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && checkAppVersion());
setInterval(checkAppVersion, 10 * 60 * 1000);
