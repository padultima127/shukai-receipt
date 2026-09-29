// Firebase の設定（Firebase コンソール → プロジェクトの設定 → マイアプリ の firebaseConfig）
// この値は公開して問題ない（秘密鍵ではない）。書き込みの制限は firestore.rules で行う。
window.PAD_FIREBASE_CONFIG = {
  apiKey: "AIzaSyASxzTU8d1iHErB-UpWcSNSlRMu-w6T4Nk",
  authDomain: "pad-network.firebaseapp.com",
  projectId: "pad-network",
  storageBucket: "pad-network.firebasestorage.app",
  messagingSenderId: "182395371047",
  appId: "1:182395371047:web:5f8b6b5073cf40fbf41802",
};

// 承認・却下ができる管理者の Google アカウント（firestore.rules の管理者と揃える）
window.PAD_ADMIN_EMAILS = ["amr.ultima127@gmail.com"];
