// Xのポストから編成を登録する（人が貼ったリンクだけ。検索・巡回はしない）
//
// 使い方:
//   node tools/import-x.js fetch URL [URL ...]
//     ポストの本文・画像（原寸）を取り、QRコード・文字を読んで、下書き .work/x/<ポストID>.json を作る。
//     読めたこと・読めなかったこと・レシートの文字を表示する
//   （下書きの title・steps などを直す。dungeonId が null なら、ダンジョンを先に data.js に足す）
//   node tools/import-x.js apply ID [ID ...]
//     下書きを data.js に入れ、レシートの呼び出し（tools/receipt-calls.py）を読み取って入れる。
//     アイコンがまだないキャラがいれば tools/crop-icons.py も動かす（--no-icons で飛ばす）
//
// サイトの「Xのリンクで登録を依頼」に届いたリンクも、管理画面の「まとめてコピー」で貼って同じように使える
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const WORK = path.join(ROOT, ".work");
const XDIR = path.join(WORK, "x");
const IMG = path.join(WORK, "tw_x"); // crop-icons.py は .work/tw*/ の画像を探す
const DATA = process.env.PAD_DATA || path.join(ROOT, "data.js"); // 試す時は PAD_DATA=コピー
const ROUTE = "全フロアの手順は出典の画像を参照";

// ---------- data.js ----------
function loadSeed() {
  const src = fs.readFileSync(DATA, "utf8");
  const win = {};
  new Function("window", src)(win);
  return { src, seed: win.PAD_SEED };
}
function saveSeed(src, seed) {
  const head = "window.PAD_SEED = ";
  const i = src.indexOf(head) + head.length;
  const j = src.lastIndexOf("};") + 1;
  fs.writeFileSync(DATA, src.slice(0, i) + JSON.stringify(seed, null, 2) + src.slice(j));
}
function loadMdb() {
  const win = {};
  new Function("window", fs.readFileSync(path.join(ROOT, "monsters-db.js"), "utf8"))(win);
  return new Map(win.PAD_MONSTER_DB.rows.map((r) => [r[0], r]));
}

// ---------- ポストと画像 ----------
async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}
const swift = (file, args) => execFileSync("swift", [path.join(ROOT, "tools", file), ...args], { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] });

// ---------- PDCのQRコード ----------
const n36 = (v) => (v == null || v === "" ? null : parseInt(v, 36));
function parseQr(text) {
  const badge = Number(text.match(/^\d+,\d+\](\d+)\}/)?.[1]) || null;
  const ms = text
    .slice(text.indexOf("}") + 1)
    .split("}")
    .map((p) => Object.fromEntries(p.split(",").filter((t) => t.length >= 2 && t[0] === "0").map((t) => [t[1], t.slice(2)])))
    .filter((m) => m["0"])
    .map((m) => ({
      slot: n36(m.f) ?? 0,
      no: n36(m["0"]),
      assist: n36(m["9"]) > 0 ? n36(m["9"]) : null,
      lv: n36(m["3"]),
      plus: (n36(m["4"]) ?? 0) + (n36(m["5"]) ?? 0) + (n36(m["6"]) ?? 0),
      super: n36(m["8"]) > 0 ? n36(m["8"]) : 0,
      latents: (m["2"] ?? "").match(/.{2}/g)?.map((x) => parseInt(x, 36)).filter((x) => x > 0) ?? [],
    }))
    .sort((a, b) => a.slot - b.slot);
  return { badge, ms };
}

// ---------- クリア画像（プレイ履歴） ----------
const lineTexts = (ocr) => [...ocr].sort((a, b) => a.y - b.y || a.x - b.x).map((l) => l.t);
function parseClear(lines) {
  const all = lines.join("\n").replace(/[：:]/g, ":").replace(/，/g, ",");
  const num = (re) => {
    const m = all.match(re);
    return m ? Number(m[1].replace(/[,，.\s]/g, "")) : null;
  };
  const t = all.match(/クリアタイム\s*:?\s*(?:(\d+)\s*分)?\s*([\d.]+)\s*秒/);
  const di = lines.findIndex((l) => /^\d{4}\/\d{1,2}\/\d{1,2}/.test(l.trim()));
  return {
    timeSec: t ? (Number(t[1] ?? 0) * 60 + Number(t[2])) : null,
    turns: num(/クリアターン\s*:?\s*(\d+)/),
    exp: num(/EXP\s*:?\s*([\d,]+)/),
    plus: num(/ポイント\s*:?\s*([\d,]+)/),
    date: di >= 0 ? lines[di].trim().slice(0, 10) : null,
    // 日付の次の2行がダンジョン名（シリーズ名・フロア名）
    dungeonLines: di >= 0 ? lines.slice(di + 1, di + 3) : [],
  };
}
// ダンジョン名（【】の前）か、そのダンジョンにしかない別名がクリア画像・本文にあるもの。長く一致したもの優先
function guessDungeon(seed, texts) {
  const all = texts.join("\n");
  const count = new Map();
  for (const d of seed.dungeons) for (const a of d.aliases ?? []) count.set(a, (count.get(a) ?? 0) + 1);
  let best = null;
  for (const d of seed.dungeons) {
    const keys = [d.name.replace(/【.*$/, ""), ...(d.aliases ?? []).filter((a) => count.get(a) === 1 && a.length >= 2)];
    for (const k of keys) if (k && all.includes(k) && (!best || k.length > best.len)) best = { id: d.id, key: k, len: k.length };
  }
  return best;
}

async function fetchCmd(urls) {
  fs.mkdirSync(XDIR, { recursive: true });
  fs.mkdirSync(IMG, { recursive: true });
  const { seed } = loadSeed();
  const M = loadMdb();
  for (const url of urls) {
    const m = url.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status\/(\d+)/);
    if (!m) { console.log(`== スキップ（ポストのリンクではない）: ${url}\n`); continue; }
    const [, handle, tid] = m;
    if (!process.env.FORCE && seed.teams.some((t) => (t.source ?? "").includes(`/status/${tid}`))) { console.log(`== 登録済み: ${url}\n`); continue; }
    let tw;
    try {
      tw = JSON.parse(await get(`https://cdn.syndication.twimg.com/tweet-result?id=${tid}&token=a`));
    } catch (e) { console.log(`== 取得できない（削除・鍵アカウントなど）: ${url} ${e.message}\n`); continue; }
    const imgs = [];
    for (const [i, md] of (tw.mediaDetails ?? []).filter((x) => x.type === "photo").entries()) {
      const f = path.join(IMG, `${tid}_${i + 1}.jpg`);
      if (!fs.existsSync(f)) fs.writeFileSync(f, await get(`${md.media_url_https}?name=orig`));
      imgs.push(f);
    }
    // QRコード（PDC画像）と文字（全部の画像）
    const qr = {};
    if (imgs.length) for (const l of swift("qr.swift", imgs).trim().split("\n")) { const [k, ...v] = l.split(" "); if (v.join(" ") !== "NONE") qr[k] = v.join(" "); }
    const ocr = imgs.length ? JSON.parse(swift("ocr.swift", imgs)) : {};
    fs.writeFileSync(path.join(WORK, `ocr_x_${tid}.json`), JSON.stringify(ocr));
    const names = imgs.map((f) => path.basename(f));
    const clearName = names.find((k) => lineTexts(ocr[k] ?? []).some((l) => /クリアタイム|プレイ履歴/.test(l)));
    const clear = clearName ? parseClear(lineTexts(ocr[clearName])) : null;
    const qrName = names.find((k) => qr[k]);
    const q = qrName ? parseQr(qr[qrName]) : null;
    // 立ち回りの文字（「Created by PDC」より下。階の行が一番多い画像）
    const rcName = names.filter((k) => k !== clearName).sort((a, b) => lineTexts(ocr[b] ?? []).filter((l) => /\d+\s*[FＦ階]/.test(l)).length - lineTexts(ocr[a] ?? []).filter((l) => /\d+\s*[FＦ階]/.test(l)).length)[0];
    const rcLines = rcName ? lineTexts(ocr[rcName]) : [];
    const pdcAt = rcLines.findIndex((l) => /PDC/.test(l));
    const receipt = rcLines.slice(pdcAt + 1);
    const titleLine = rcLines.find((l, i) => i < Math.max(1, pdcAt) && l.length >= 4 && !/^No|^LV|継承|^\+\d/.test(l)) ?? "";
    const dg = guessDungeon(seed, [...(clear?.dungeonLines ?? []), tw.text ?? "", titleLine]);
    const ROLES = ["L", "S", "S", "S", "S", "F"];
    const members = (q?.ms ?? []).map((x, i) => ({
      no: x.no, name: M.get(x.no)?.[1] ?? "（図鑑にない）", role: ROLES[i] ?? "S",
      assist: x.assist ? `${M.get(x.assist)?.[1] ?? "（図鑑にない）"} No.${x.assist}` : null,
      build: { lv: x.lv, plus: x.plus, super: x.super, latents: x.latents, fromQr: true },
    }));
    const t = clear?.timeSec;
    const draft = {
      id: `${dg?.id ?? "new"}-${handle.toLowerCase()}-${tid.slice(-4)}`,
      dungeonId: dg?.id ?? null,
      title: "",
      timeSec: t ?? null,
      turns: clear?.turns ?? null,
      fastMode: null,
      yields: Object.fromEntries([["exp", clear?.exp], ["plus", clear?.plus]].filter(([, v]) => v)),
      badgeId: q?.badge ?? null,
      members,
      steps: [t ? `1周${Math.floor(t / 60)}分${+(t % 60).toFixed(1)}秒${clear?.turns ? `・${clear.turns}ターン` : ""}（プレイ履歴）` : "", ROUTE].filter(Boolean),
      source: `https://x.com/${tw.user?.screen_name ?? handle}/status/${tid}`,
      author: { name: tw.user?.name ?? handle },
      sourceDate: (tw.created_at ?? "").slice(0, 10),
    };
    const file = path.join(XDIR, `${tid}.json`);
    // 直した下書きは上書きしない
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(draft, null, 1));
    const icons = fs.readFileSync(path.join(ROOT, "icons.js"), "utf8");
    const noIcon = [...new Set(members.flatMap((x) => [x.no, Number(x.assist?.match(/No\.(\d+)/)?.[1])]).filter(Boolean))].filter((no) => !icons.includes(`"${no}": `));
    console.log(`== ${tid}  ${draft.source}`);
    console.log(`作者: ${draft.author.name}（${draft.sourceDate}）  画像${imgs.length}枚`);
    console.log("本文: " + (tw.text ?? "").replace(/\s*https:\/\/t\.co\/\w+$/, "").replace(/\n+/g, " / "));
    console.log(`ダンジョン: ${dg ? `${dg.id}（「${dg.key}」で判定）` : `不明 → 新ダンジョンかも: ${(clear?.dungeonLines ?? []).join(" ／ ") || "（クリア画像なし）"}`}`);
    console.log(`クリア画像: ${clear ? `${t ?? "?"}秒・${clear.turns ?? "?"}ターン・経験値${clear.exp ?? "?"}・+${clear.plus ?? "?"}` : "なし（タイムは手入力）"}`);
    console.log(`QR: ${q ? `読めた（バッジ${q.badge ?? "なし"}）` : "読めない（キャラは手入力）"}`);
    for (const x of members) console.log(`  ${x.role} ${x.no} ${x.name} @ ${x.assist ?? "なし"}  +${x.build.plus} 超覚醒${x.build.super} 潜在${x.build.latents.join(".")}`);
    if (noIcon.length) console.log(`アイコンがないキャラ: ${noIcon.join(", ")}（apply の時に切り抜く）`);
    console.log(`レシートの題: ${titleLine}`);
    console.log("レシートの文字:\n  " + receipt.join("\n  "));
    console.log(`下書き: ${path.relative(ROOT, file)}\n`);
  }
}

// ---------- 取り込み ----------
function applyCmd(ids, { icons = true } = {}) {
  const { src, seed } = loadSeed();
  const M = loadMdb();
  const added = [];
  for (const tid of ids) {
    const d = JSON.parse(fs.readFileSync(path.join(XDIR, `${tid}.json`), "utf8"));
    const miss = ["dungeonId", "title", "timeSec"].filter((k) => !d[k]);
    if (miss.length) { console.log(`== ${tid}: ${miss.join("・")} が空なので飛ばす`); continue; }
    if (!seed.dungeons.some((x) => x.id === d.dungeonId)) { console.log(`== ${tid}: ダンジョン ${d.dungeonId} が data.js にない`); continue; }
    if (seed.teams.some((x) => x.id === d.id || x.source === d.source)) { console.log(`== ${tid}: 登録済み（${d.id}）`); continue; }
    const members = d.members.map((x) => {
      if (!seed.monsters.some((m) => m.no === x.no)) {
        const r = M.get(x.no);
        if (!r) throw new Error(`図鑑にない No.${x.no}`);
        seed.monsters.push({ id: `n${x.no}`, no: x.no, name: r[1], attr: r[2], tags: [] });
      }
      return { id: seed.monsters.find((m) => m.no === x.no).id, role: x.role, ...(x.assist ? { assist: x.assist } : {}), build: x.build };
    });
    const steps = d.steps.join("");
    const t = {
      id: d.id, dungeonId: d.dungeonId, title: d.title, timeSec: d.timeSec, turns: d.turns ?? undefined,
      fastMode: d.fastMode ?? null, times: d.fastMode === true ? { on: d.timeSec } : d.fastMode === false ? { off: d.timeSec } : {},
      ...(Object.keys(d.yields ?? {}).length ? { yields: d.yields } : {}), ...(d.badgeId ? { badgeId: d.badgeId } : {}),
      members, steps: d.steps, source: d.source, author: d.author, sourceDate: d.sourceDate,
      ...Object.fromEntries(["partBreak", "endorsedAlts", "receiptBranches"].filter((k) => d[k]).map((k) => [k, d[k]])),
      metrics: { chars: steps.length, puzzle: 1, branch: 0, caution: 0, zurashi: /ずらし/.test(steps) ? 1 : 0, plus891: 0, plus891Text: null },
    };
    seed.teams.push(t);
    added.push(t);
  }
  if (!added.length) return;
  seed.version++;
  saveSeed(src, seed);
  // レシートの呼び出し（足した編成の分だけ入れる）
  const out = (k) => path.join(XDIR, `_${k}.json`);
  execFileSync("python3", [path.join(ROOT, "tools", "receipt-calls.py"), out("calls"), out("loops"), out("waits")], { stdio: "ignore" });
  const calls = JSON.parse(fs.readFileSync(out("calls"), "utf8"));
  const loops = JSON.parse(fs.readFileSync(out("loops"), "utf8"));
  const waits = JSON.parse(fs.readFileSync(out("waits"), "utf8"));
  const after = loadSeed();
  for (const a of added) {
    const t = after.seed.teams.find((x) => x.id === a.id);
    const c = calls[t.id];
    if (c) t.receiptCalls = Object.fromEntries(Object.entries(c).map(([fl, v]) => [fl, v.map(({ raw, why, ...x }) => x)]));
    if (loops[t.id]) t.receiptLoops = loops[t.id].map(({ raw, ...x }) => x);
    if (waits[t.id]) t.receiptWaits = waits[t.id];
    console.log(`== ${t.id}（${t.title}）`);
    if (!c) { console.log("  レシートの呼び出しは読めなかった"); continue; }
    const nm = (mi) => {
      const m = t.members[mi];
      return `${m.role === "L" || m.role === "F" ? m.role : ""}${after.seed.monsters.find((x) => x.id === m.id)?.name ?? "?"}`;
    };
    for (const [fl, v] of Object.entries(c)) console.log(`  ${fl}F: ${v.map((x) => `${x.turn ? `(${x.turn + 1})` : ""}${nm(x.mi)}${x.part === "assist" ? "裏" : ""}「${x.raw}」`).join(" → ")}`);
    if (waits[t.id]) console.log(`  耐久: ${JSON.stringify(waits[t.id])}`);
    if (loops[t.id]) console.log(`  ループ: ${JSON.stringify(loops[t.id].map(({ raw, ...x }) => x))}`);
  }
  saveSeed(after.src, after.seed);
  // アイコン
  const iconsJs = fs.readFileSync(path.join(ROOT, "icons.js"), "utf8");
  const need = added.flatMap((t) => t.members.flatMap((m) => [Number(m.id.slice(1)), Number(m.assist?.match(/No\.(\d+)/)?.[1])])).filter((no) => no && !iconsJs.includes(`"${no}": `));
  if (need.length && icons) {
    console.log(`アイコンを切り抜く: ${[...new Set(need)].join(", ")}（数分かかる）`);
    execFileSync("python3", [path.join(ROOT, "tools", "crop-icons.py")], { stdio: "ignore" });
    const now = fs.readFileSync(path.join(ROOT, "icons.js"), "utf8");
    const still = [...new Set(need)].filter((no) => !now.includes(`"${no}": `));
    console.log(still.length ? `切り抜けなかった: ${still.join(", ")}` : "アイコンは全部そろった");
  } else if (need.length) console.log(`アイコンがないキャラ: ${[...new Set(need)].join(", ")}（--no-icons なので切り抜いていない）`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "fetch") fetchCmd(args).catch((e) => { console.error(e); process.exit(1); });
else if (cmd === "apply") applyCmd(args.filter((a) => !a.startsWith("--")), { icons: !args.includes("--no-icons") });
else console.log("使い方: node tools/import-x.js fetch URL... ／ node tools/import-x.js apply ID... [--no-icons]");
