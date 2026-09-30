// Firebase（Firestore + Googleログイン）による共有登録。GitHub Pages 版で使う。
// firebase-config.js に設定がない、または SDK が読み込めない環境（claude.ai の公開ページ等）では何もしない。
//
// データ構成（Firestore）
//   teams/{id}    : 登録された編成。status = "pending"（承認待ち）/ "approved"（公開）/ "rejected"
//                   ownerUid・ownerName・createdAt、新しいダンジョンは newDungeon に埋め込み
//   users/{uid}   : 連投制限用。lastSubmitAt（最後に登録した時刻）
//   reports/{id}  : 通報。teamId・reason・reporterUid・createdAt（管理者だけが読める）
// 公開・非公開の判定は Firestore のセキュリティルール（firestore.rules）でサーバー側でも強制する。
(function () {
  const cfg = window.PAD_FIREBASE_CONFIG;
  if (!cfg?.apiKey || !window.firebase) return;

  firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const fs = firebase.firestore();
  const ts = () => firebase.firestore.FieldValue.serverTimestamp();
  const admins = new Set((window.PAD_ADMIN_EMAILS ?? []).map((e) => e.toLowerCase()));

  const api = {
    user: null,
    isAdmin: false,
    onAuth: [],
    // 公開済み（approved）＋自分の承認待ちを購読
    watchTeams(cb) {
      let approved = [];
      let mine = [];
      let unsubMine = null;
      const emit = () => {
        const ids = new Set(approved.map((t) => t.id));
        cb([...approved, ...mine.filter((t) => !ids.has(t.id))]);
      };
      fs.collection("teams").where("status", "==", "approved").onSnapshot(
        (snap) => {
          approved = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          emit();
        },
        (e) => console.warn("teams", e)
      );
      api.onAuth.push((user) => {
        unsubMine?.();
        mine = [];
        if (user) {
          unsubMine = fs.collection("teams").where("ownerUid", "==", user.uid).onSnapshot(
            (snap) => {
              mine = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
              emit();
            },
            (e) => console.warn("mine", e)
          );
        }
        emit();
      });
    },
    signIn() {
      return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    },
    signOut() {
      return auth.signOut();
    },
    // 新規登録は必ず承認待ち。users/{uid}.lastSubmitAt と同時に書き込み、ルールで1分に1件に制限する
    async submit(team) {
      const u = auth.currentUser;
      if (!u) throw Object.assign(new Error("ログインしてください"), { code: "unauthenticated" });
      const batch = fs.batch();
      const ref = fs.collection("teams").doc(team.id);
      batch.set(ref, {
        ...team,
        status: "pending",
        ownerUid: u.uid,
        ownerName: u.displayName || "名無し",
        createdAt: ts(),
      });
      batch.set(fs.collection("users").doc(u.uid), { lastSubmitAt: ts() }, { merge: true });
      await batch.commit();
    },
    remove(id) {
      return fs.collection("teams").doc(id).delete();
    },
    setStatus(id, status) {
      return fs.collection("teams").doc(id).update({ status, reviewedAt: ts() });
    },
    watchPending(cb) {
      return fs.collection("teams").where("status", "==", "pending").onSnapshot(
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        (e) => console.warn("pending", e)
      );
    },
    report(teamId, reason) {
      const u = auth.currentUser;
      if (!u) throw Object.assign(new Error("ログインしてください"), { code: "unauthenticated" });
      return fs.collection("reports").add({ teamId, reason: String(reason).slice(0, 500), reporterUid: u.uid, createdAt: ts() });
    },
    watchReports(cb) {
      return fs.collection("reports").orderBy("createdAt", "desc").limit(100).onSnapshot(
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        (e) => console.warn("reports", e)
      );
    },
    // 代用の評価。1人1候補につき1票（上書き）
    // 「回れなかった」には理由（選択）と自由記述（任意）を付けられる
    vote({ teamId, baseNo, candFamily, ok, reason, note }) {
      const u = auth.currentUser;
      if (!u) throw Object.assign(new Error("ログインしてください"), { code: "unauthenticated" });
      const id = `${teamId}_${baseNo}_${candFamily}_${u.uid}`.replace(/[^\w-]/g, "-");
      const doc = { teamId, baseNo, candFamily, ok: !!ok, uid: u.uid, at: ts() };
      if (!ok && reason) doc.reason = String(reason).slice(0, 30);
      if (!ok && note) doc.note = String(note).slice(0, 200);
      return fs.collection("subVotes").doc(id).set(doc);
    },
    async getVotes(teamId) {
      const snap = await fs.collection("subVotes").where("teamId", "==", teamId).limit(500).get();
      return snap.docs.map((d) => d.data());
    },
    resolveReport(id) {
      return fs.collection("reports").doc(id).delete();
    },
  };

  auth.onAuthStateChanged((user) => {
    api.user = user;
    api.isAdmin = !!(user?.email && user.emailVerified && admins.has(user.email.toLowerCase()));
    for (const fn of api.onAuth) fn(user);
  });

  window.PAD_FIREBASE = api;
})();
