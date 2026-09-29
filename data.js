// 初期データ。攻略サイトに載っている実在のダンジョン・編成をもとにしている（出典は各編成の source）。
//
// monsters.tags : そのモンスターが編成にもたらす役割（代用検索に使う）
// teams.members : role = L(リーダー)1 / S(サブ)最大4 / F(フレンド)1 の計6体。サブが4未満なら残りは自由枠
//                 need = その枠に必須の役割。空なら代用検索はしない
//                 assist = アシスト装備（任意）
// teams.source  : 出典URL。author.name で表示名（Xならアカウント名）を指定できる
// teams.yields  : 編成ごとに報酬が違う場合の上書き（例: 部位破壊の数で経験値が変わる）{ 素材id: 1周の数 }
// teams.metrics : 楽さの指標（tools/receipt-metrics.py でPDCレシートをOCRして算出）
//                 chars=レシート文字数 / puzzle=パズル指定数 / branch=分岐数 / caution=注意書き数
//                 zurashi=「ずらし」の数 / plus891=+891の割合(0〜1)。metrics がある編成は ease/stability を使わない
// teams.ease    : metrics がない編成用。1〜5（5ほど楽。ワンパン/パズル不要なら5）
// teams.stability : 0〜100（安定率 %）
// estimated     : 出典に記載がなく推定した項目（画面に「推定」と表示する）
//                 teams: "timeSec" / "ease" / "stability"、drops: estimated: true
window.PAD_SEED = {
  "version": 55,
  "seed": true,
  "monsters": [
    {
      "id": "saeki",
      "no": 5505,
      "name": "不動の精神・冴木創",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "daisy",
      "no": 6043,
      "name": "デイジーダック【クラシック】",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "weldol",
      "no": 2940,
      "name": "絶海龍・ウェルドール",
      "attr": "水",
      "tags": []
    },
    {
      "id": "satanvoid",
      "name": "サタン＝ヴォイド",
      "attr": "闇",
      "tags": [],
      "noUncertain": "4285（進化前）か4286（壊獄の魔神王）か出典から判別できない"
    },
    {
      "id": "kaido",
      "no": 9148,
      "name": "百獣のカイドウ",
      "attr": "水",
      "tags": []
    },
    {
      "id": "flameknight",
      "no": 8396,
      "name": "超フレイムナイト",
      "attr": "火",
      "tags": []
    },
    {
      "id": "kanburi",
      "no": 5214,
      "name": "超寒ブリ",
      "attr": "水",
      "tags": []
    },
    {
      "id": "tierra",
      "no": 9386,
      "name": "幻庭の龍衛士・ティエラ",
      "attr": "木",
      "tags": []
    },
    {
      "id": "chopper",
      "no": 9163,
      "name": "トニートニー・チョッパー",
      "attr": "光",
      "tags": []
    },
    {
      "id": "cyclops",
      "name": "究極サイクロップス",
      "attr": "水",
      "tags": [],
      "noUncertain": "サイクロップスは5種類あり、出典の「究極」がどれか判別できない"
    },
    {
      "id": "hathor",
      "no": 8729,
      "name": "超転生ハトホル",
      "attr": "光",
      "tags": []
    },
    {
      "id": "droidragon",
      "no": 660,
      "name": "ドロイドラゴン",
      "attr": "木",
      "tags": []
    },
    {
      "id": "dain",
      "no": 14098,
      "name": "【ダイヤK】の王者・ダイン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "hitsugaya",
      "no": 14068,
      "name": "完全卍解・日番谷冬獅郎",
      "attr": "水",
      "tags": []
    },
    {
      "id": "izuna",
      "no": 14142,
      "name": "碧鼬の式神使い・イズナ",
      "attr": "水",
      "tags": []
    },
    {
      "id": "liltotto",
      "no": 14074,
      "name": "リルトット・ランパード",
      "attr": "光",
      "tags": []
    },
    {
      "id": "shibuyarin",
      "no": 13571,
      "name": "［インペリウム・セレスト］渋谷凛",
      "attr": "水",
      "tags": []
    },
    {
      "id": "diamos",
      "no": 14113,
      "name": "ダイヤ龍・ダイアモス",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n14101",
      "no": 14101,
      "name": "【ハートQ】の女王・ハーティア",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n14010",
      "no": 14010,
      "name": "川釣りの情星霊・セッカ",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n14005",
      "no": 14005,
      "name": "渚の激闘・エルフリーデ VS フィアメル",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n14135",
      "no": 14135,
      "name": "滅機の鳳凰帝・ディスペアーフェニックス",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n14110",
      "no": 14110,
      "name": "ハート龍・セイハーツ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n12925",
      "no": 12925,
      "name": "保科宗四郎",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13462",
      "no": 13462,
      "name": "ゼーリエ",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n11714",
      "no": 11714,
      "name": "オメガモン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n11327",
      "no": 11327,
      "name": "深紅の花嫁・シルク",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n12206",
      "no": 12206,
      "name": "ガンダムヴァサーゴチェストブレイク",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n12853",
      "no": 12853,
      "name": "技芸の超越神・アメノウズメ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13341",
      "no": 13341,
      "name": "プリシラ・バーリエル",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13094",
      "no": 13094,
      "name": "井ノ上京＆アクィラモン",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13999",
      "no": 13999,
      "name": "ゼロ＆ランスロット・アルビオンゼロ",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13964",
      "no": 13964,
      "name": "サクヤとアッシュ＆Zi-オルテギア",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12804",
      "no": 12804,
      "name": "豊麗の超越神・フレイヤ",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n13305",
      "no": 13305,
      "name": "ナツキ・スバル＆エミリア",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12279",
      "no": 12279,
      "name": "烏野高校・日向 翔陽",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13998",
      "no": 13998,
      "name": "カレン＆紅蓮聖天八極式 出力全開",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13826",
      "no": 13826,
      "name": "勇者兼業執事・グレオン＆ダイヤ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13136",
      "no": 13136,
      "name": "トノサマゲコモン",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n13419",
      "no": 13419,
      "name": "アイゼンの弟子・シュタルク",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n12956",
      "no": 12956,
      "name": "プレオンダクティル",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12729",
      "no": 12729,
      "name": "かき氷屋の店員・メニット＆チャオリン",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n12903",
      "no": 12903,
      "name": "日比野カフカ＆市川レノ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13416",
      "no": 13416,
      "name": "フリーレンの弟子・フェルン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13426",
      "no": 13426,
      "name": "アイゼン",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13243",
      "no": 13243,
      "name": "新春万福・執行者メタトロン＆代行者メタトロン",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13407",
      "no": 13407,
      "name": "フリーレン＆フェルン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13325",
      "no": 13325,
      "name": "ラインハルト・ヴァン・アストレア",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n4207",
      "no": 4207,
      "name": "バレンタインの深蒼姫・カラット",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n10439",
      "no": 10439,
      "name": "静寂鍵の勇者・ミヤ",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n9730",
      "no": 9730,
      "name": "Zガンダム",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n13483",
      "no": 13483,
      "name": "命天の超越龍・ゼルクレア",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13364",
      "no": 13364,
      "name": "剣聖 テレシア・ヴァン・アストレア",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13403",
      "no": 13403,
      "name": "張り切る守護神・アテナ",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13838",
      "no": 13838,
      "name": "ぐうたらメイド・アマテラスオオカミ",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13757",
      "no": 13757,
      "name": "アジサイの桃淡星霊・ナツル",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n14063",
      "no": 14063,
      "name": "卍解・平子真子",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n14016",
      "no": 14016,
      "name": "青緑海の女神・イシス＆ネフティス",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n14038",
      "no": 14038,
      "name": "滅却師完聖体・石田雨竜",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n9066",
      "no": 9066,
      "name": "納涼の箏龍楽士・ミナカ",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n14055",
      "no": 14055,
      "name": "瞬神・四楓院夜一",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n14028",
      "no": 14028,
      "name": "黒崎一護＆井上織姫",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n14107",
      "no": 14107,
      "name": "スペード龍・スペディオル",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n14035",
      "no": 14035,
      "name": "半虚化・黒崎一護",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n14076",
      "no": 14076,
      "name": "ジゼル・ジュエル",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n14032",
      "no": 14032,
      "name": "特記戦力・藍染惣右介",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n14043",
      "no": 14043,
      "name": "卍解・更木剣八",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n9087",
      "no": 9087,
      "name": "紫膏の幻忍・児雷也",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n14149",
      "no": 14149,
      "name": "#UNICUS",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13559",
      "no": 13559,
      "name": "HappyHappyTwin",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13581",
      "no": 13581,
      "name": "北条加蓮",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n13904",
      "no": 13904,
      "name": "魔法少女・暁美ほむら",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12907",
      "no": 12907,
      "name": "鳴海弦＆怪獣8号",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13550",
      "no": 13550,
      "name": "眷恋の蛇王姫・クチナ",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12377",
      "no": 12377,
      "name": "西の高校生探偵・服部平次",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n2390",
      "no": 2390,
      "name": "想紡の時女神・ヴェルダンディ",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n7327",
      "no": 7327,
      "name": "アジサイの淡星霊・ナツル",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n13866",
      "no": 13866,
      "name": "思いやり執事・カイシュウ",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13916",
      "no": 13916,
      "name": "破壊の超越神・シヴァ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n14080",
      "no": 14080,
      "name": "リジェ・バロ",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n12972",
      "no": 12972,
      "name": "夕饗の神王妃・ヘラ-LUNA-",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n12558",
      "no": 12558,
      "name": "誠心メイド・ラビリル",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n11371",
      "no": 11371,
      "name": "ロゼ＆アッシュ",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13708",
      "no": 13708,
      "name": "死神太夫・月詠",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12946",
      "no": 12946,
      "name": "出雲ハルイチ",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n13929",
      "no": 13929,
      "name": "美愛精モルガン",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13828",
      "no": 13828,
      "name": "刺激的な執事とメイド・ソロモン＆メルナ",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13724",
      "no": 13724,
      "name": "朧",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13923",
      "no": 13923,
      "name": "マブ友の撮神ニスカ＆ダネット",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13924",
      "no": 13924,
      "name": "マブ友の撮神ニスカ＆ダネット【デフォルメ】",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13967",
      "no": 13967,
      "name": "ロゼ＆Zi-アルテミス",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13860",
      "no": 13860,
      "name": "オシャレ選定執事・パイモン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13945",
      "no": 13945,
      "name": "命古龍・ブレイブXドラゴン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13943",
      "no": 13943,
      "name": "命古神・ブレイブXゴッド",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n12914",
      "no": 12914,
      "name": "怪獣8号",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n12808",
      "no": 12808,
      "name": "竈門炭治郎＆竈門禰豆子",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n6549",
      "no": 6549,
      "name": "水柱・冨岡義勇",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n14012",
      "no": 14012,
      "name": "端居の筆龍楽士・ミナカ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13116",
      "no": 13116,
      "name": "ライドラモン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n14095",
      "no": 14095,
      "name": "【スペードA】の騎士・エスペル",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n14072",
      "no": 14072,
      "name": "バンビエッタ・バスターバイン",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n14040",
      "no": 14040,
      "name": "卍解・山本元柳斎重國",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n12499",
      "no": 12499,
      "name": "ライル≒ランスロット",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n14088",
      "no": 14088,
      "name": "兵主部一兵衛",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n7629",
      "no": 7629,
      "name": "轟天の幻龍王・ゼローグ∞ -CORE-",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n13931",
      "no": 13931,
      "name": "道化焔竜オズ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n6415",
      "no": 6415,
      "name": "憤怒の大罪龍王・バルディターン",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n6669",
      "no": 6669,
      "name": "引導の陰陽師・クウカン",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n13692",
      "no": 13692,
      "name": "万事屋・神楽",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13676",
      "no": 13676,
      "name": "神楽＆ミヤ衣装",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13085",
      "no": 13085,
      "name": "本宮大輔＆フレイドラモン",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13193",
      "no": 13193,
      "name": "爆豪勝己：ライジング",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13681",
      "no": 13681,
      "name": "坂田銀時＆スオウ衣装",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n14034",
      "no": 14034,
      "name": "特記戦力・黒崎一護",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n14067",
      "no": 14067,
      "name": "卍解・日番谷冬獅郎",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n12439",
      "no": 12439,
      "name": "黒薔薇の憎邪霊・ロゼッタ",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12298",
      "no": 12298,
      "name": "東峰 旭",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12450",
      "no": 12450,
      "name": "ダリアの黒絢星霊・フィリス",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n11137",
      "no": 11137,
      "name": "デスティニーガンダムSpecll",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13326",
      "no": 13326,
      "name": "剣聖 ラインハルト・ヴァン・アストレア",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13199",
      "no": 13199,
      "name": "「新秩序」スターアンドストライプ",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n11666",
      "no": 11666,
      "name": "呪詛師・夏油傑",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12270",
      "no": 12270,
      "name": "日向 翔陽＆影山 飛雄",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12917",
      "no": 12917,
      "name": "第3部隊隊長・亜白ミナ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n14048",
      "no": 14048,
      "name": "ユーグラム・ハッシュヴァルト",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13876",
      "no": 13876,
      "name": "駆け回るメイド・ディーナ",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n9731",
      "no": 9731,
      "name": "Zガンダム・ウェイブライダー",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n12115",
      "no": 12115,
      "name": "風林火山の超越神・武田信玄",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13596",
      "no": 13596,
      "name": "愛弟子の入学記念・ゼラ＆チェルン",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n10421",
      "no": 10421,
      "name": "武の鍵の継承者・ベルガー",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13444",
      "no": 13444,
      "name": "ザイン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13513",
      "no": 13513,
      "name": "翠紅鍵の勇者・チャオリン",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n10820",
      "no": 10820,
      "name": "甘露寺蜜璃",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13099",
      "no": 13099,
      "name": "火田伊織＆アンキロモン",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n13366",
      "no": 13366,
      "name": "エキドナ",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13840",
      "no": 13840,
      "name": "料理下手なメイド・メタトロン",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13567",
      "no": 13567,
      "name": "［キャッチミー・オールタイム］島村卯月",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13141",
      "no": 13141,
      "name": "インペリアルドラモン：パラディンモード",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n12550",
      "no": 12550,
      "name": "清廉メイド・イシス",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n13349",
      "no": 13349,
      "name": "フェルト",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13339",
      "no": 13339,
      "name": "ヴィルヘルム・ヴァン・アストレア",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n12536",
      "no": 12536,
      "name": "礼節執事・クロトビ",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n12832",
      "no": 12832,
      "name": "上弦の弐・童磨",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n12274",
      "no": 12274,
      "name": "及川 徹＆岩泉 一",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n12844",
      "no": 12844,
      "name": "「水の呼吸」の使い手・冨岡義勇",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n13722",
      "no": 13722,
      "name": "春雨第七師団・神威",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13149",
      "no": 13149,
      "name": "アーマゲモン",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13337",
      "no": 13337,
      "name": "フェリス",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n13484",
      "no": 13484,
      "name": "死天の超越龍・アークヴェルザ",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13076",
      "no": 13076,
      "name": "ブラックウォーグレイモン",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12847",
      "no": 12847,
      "name": "刀鍛冶・鋼鐵塚蛍",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n6546",
      "no": 6546,
      "name": "鬼殺隊・嘴平伊之助",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n12202",
      "no": 12202,
      "name": "カバカーリー",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12192",
      "no": 12192,
      "name": "ガンダムX",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13323",
      "no": 13323,
      "name": "大精霊 ベアトリス",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13072",
      "no": 13072,
      "name": "インペリアルドラモン：ファイターモード",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13196",
      "no": 13196,
      "name": "轟焦凍：ライジング",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n14060",
      "no": 14060,
      "name": "卯ノ花烈",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13737",
      "no": 13737,
      "name": "ヒトヨタケの滅邪霊・ディケイル",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13972",
      "no": 13972,
      "name": "琉高ハルカ＆蛍雪",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n14070",
      "no": 14070,
      "name": "卍解・涅マユリ",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12773",
      "no": 12773,
      "name": "バカンスの獣使い・パネラ",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n14097",
      "no": 14097,
      "name": "【ダイヤK】を宿す者・ダイン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13415",
      "no": 13415,
      "name": "フェルン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n14037",
      "no": 14037,
      "name": "聖文字“A”・石田雨竜",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13950",
      "no": 13950,
      "name": "タマゾーX命天龍・ゼルクレア",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n14112",
      "no": 14112,
      "name": "【ダイヤ】スピリット",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13397",
      "no": 13397,
      "name": "照れ屋な癒し手・アリナ",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13353",
      "no": 13353,
      "name": "ライ・バテンカイトス",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12960",
      "no": 12960,
      "name": "四ノ宮功",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13074",
      "no": 13074,
      "name": "マグナモン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n6978",
      "no": 6978,
      "name": "全知全能・サノス",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13003",
      "no": 13003,
      "name": "樹望龍の癒し手・アリナウィッシュミーメル",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n12930",
      "no": 12930,
      "name": "四ノ宮キコル",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n9927",
      "no": 9927,
      "name": "冥界龍・ハーデス＝ドラゴン",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n14014",
      "no": 14014,
      "name": "夕凪の魔女・ドーナ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13549",
      "no": 13549,
      "name": "絶天の超越龍・ゼローグ∞ -CORE-",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n13978",
      "no": 13978,
      "name": "ディボック＆エルカルマル",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n8928",
      "no": 8928,
      "name": "純鋏の花嫁・断龍喚士ロシェ",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n11149",
      "no": 11149,
      "name": "マスターガンダム 明鏡止水",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12530",
      "no": 12530,
      "name": "なりきりメイド・ネレ",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n10935",
      "no": 10935,
      "name": "お菓子作りの結星霊・メアリス",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n14078",
      "no": 14078,
      "name": "バズビー",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n10835",
      "no": 10835,
      "name": "小鉄",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n9912",
      "no": 9912,
      "name": "GS・デイトナ",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n13536",
      "no": 13536,
      "name": "荒嵐神・ミニすさのおのみこと",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n13569",
      "no": 13569,
      "name": "渋谷凛",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n11545",
      "no": 11545,
      "name": "国造の超越神・オオクニヌシ",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n12582",
      "no": 12582,
      "name": "執事・ゼウス＆メイド・ヘラ",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n8327",
      "no": 8327,
      "name": "ウルトラマンタロウ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n13846",
      "no": 13846,
      "name": "駿足の配膳メイド・ファスカ",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n8304",
      "no": 8304,
      "name": "ウルトラマン",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n14090",
      "no": 14090,
      "name": "黒崎一護＆井上織姫【報酬】",
      "attr": "闇",
      "tags": []
    },
    {
      "id": "n11340",
      "no": 11340,
      "name": "ウルトラマン（Ultraman: Rising）【スペシウム光線】",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n12843",
      "no": 12843,
      "name": "「雷の呼吸」の使い手・我妻善逸",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n12834",
      "no": 12834,
      "name": "獪岳",
      "attr": "光",
      "tags": []
    },
    {
      "id": "n12849",
      "no": 12849,
      "name": "珠世によって鬼化された少年・愈史郎",
      "attr": "木",
      "tags": []
    },
    {
      "id": "n12715",
      "no": 12715,
      "name": "解放の伉龍契士・アルトゥラ",
      "attr": "火",
      "tags": []
    },
    {
      "id": "n9281",
      "no": 9281,
      "name": "磯の鍵の継承者・チャーミーキティ",
      "attr": "水",
      "tags": []
    },
    {
      "id": "n12812",
      "no": 12812,
      "name": "冨岡義勇＆竈門炭治郎",
      "attr": "水",
      "tags": []
    }
  ],
  "items": [
    {
      "id": "supernoel",
      "name": "スーパーノエルドラゴン",
      "category": "強化",
      "aliases": [
        "スパノエ",
        "スーパーノエル"
      ]
    },
    {
      "id": "plus",
      "name": "プラスポイント",
      "category": "強化",
      "aliases": [
        "プラス",
        "+ポイント",
        "プラポ"
      ]
    },
    {
      "id": "exp",
      "name": "ランク経験値",
      "category": "経験値",
      "aliases": [
        "経験値",
        "EXP",
        "ランク上げ"
      ]
    },
    {
      "id": "delay",
      "name": "遅延耐性たまドラ",
      "category": "潜在",
      "aliases": [
        "遅延耐性",
        "スキル遅延耐性",
        "遅延",
        "潜在たまドラ☆スキル遅延耐性"
      ]
    },
    {
      "id": "nijipii",
      "name": "ニジピィ",
      "category": "強化",
      "aliases": [
        "虹ピィ"
      ]
    },
    {
      "id": "pii",
      "name": "属性ピィ",
      "category": "強化",
      "aliases": [
        "ピィ",
        "ホノピィ",
        "ミズピィ",
        "モクピィ",
        "ヒカピィ",
        "ヤミピィ"
      ]
    },
    {
      "id": "sagepii",
      "name": "サゲピィ",
      "category": "強化",
      "aliases": []
    },
    {
      "id": "kingtama",
      "name": "キングたまドラ",
      "category": "強化",
      "aliases": [
        "キンたま"
      ]
    },
    {
      "id": "waku",
      "name": "枠解放たまドラ",
      "category": "潜在",
      "aliases": [
        "枠解放",
        "潜在たまドラ☆枠解放"
      ]
    },
    {
      "id": "puredra",
      "name": "ぷれドラ",
      "category": "強化",
      "aliases": []
    },
    {
      "id": "kingdragon",
      "name": "超キング・極キング系ドラゴン",
      "category": "経験値",
      "aliases": [
        "キンメタ",
        "キングメタル",
        "超キング",
        "極キング",
        "キングゴールド",
        "キングルビー",
        "キングエメラルド",
        "キングサファイア"
      ]
    },
    {
      "id": "latentpp",
      "name": "強化++潜在たまドラ（HP・攻撃・回復）",
      "category": "潜在",
      "aliases": [
        "HP強化++",
        "攻撃強化++",
        "回復強化++",
        "強化++"
      ]
    },
    {
      "id": "latentp",
      "name": "強化+潜在たまドラ（HP・攻撃・回復）",
      "category": "潜在",
      "aliases": [
        "HP強化+",
        "攻撃強化+",
        "回復強化+",
        "強化+",
        "全パラメータ強化+",
        "全パラ強化+"
      ]
    },
    {
      "id": "reducep",
      "name": "ダメージ軽減+潜在たまドラ",
      "category": "潜在",
      "aliases": [
        "軽減+",
        "軽減潜在",
        "色軽減"
      ]
    },
    {
      "id": "skbpp",
      "name": "スキルブースト++潜在たまドラ",
      "category": "潜在",
      "aliases": [
        "スキブ++",
        "スキルブースト++"
      ]
    },
    {
      "id": "attrpierce",
      "name": "属性吸収貫通潜在たまドラ",
      "category": "潜在",
      "aliases": [
        "属性吸収貫通"
      ]
    },
    {
      "id": "defignore",
      "name": "防御力無視潜在たまドラ",
      "category": "潜在",
      "aliases": [
        "防御力無視"
      ]
    },
    {
      "id": "lchange",
      "name": "リーダーチェンジ耐性潜在たまドラ",
      "category": "潜在",
      "aliases": [
        "リーダーチェンジ耐性"
      ]
    },
    {
      "id": "tojitama",
      "name": "とじたまドラ",
      "category": "強化",
      "aliases": []
    },
    {
      "id": "capup",
      "name": "ダメージ上限解放5倍たまドラ（旧4倍）",
      "category": "潜在",
      "aliases": [
        "上限解放",
        "ダメージ上限解放",
        "上限解放潜在",
        "上限解放5倍",
        "潜在たまドラ☆ダメージ上限解放"
      ]
    },
    {
      "id": "souso",
      "name": "創装の宝玉",
      "category": "進化",
      "aliases": [
        "宝玉",
        "創装"
      ]
    },
    {
      "id": "diafruit",
      "name": "ダイヤドラゴンフルーツ",
      "category": "進化",
      "aliases": [
        "ドラゴンフルーツ",
        "ダイヤフルーツ"
      ]
    },
    {
      "id": "sanjin",
      "name": "古代の三神面",
      "category": "進化",
      "aliases": [
        "三神面"
      ]
    },
    {
      "id": "kyodai",
      "name": "希石【巨大】（5属性）",
      "category": "進化",
      "aliases": [
        "巨大希石",
        "希石【巨大】",
        "巨大"
      ]
    },
    {
      "id": "sixslot",
      "name": "6枠潜在たまドラ",
      "category": "潜在",
      "aliases": [
        "6枠潜在",
        "6枠",
        "六枠潜在"
      ],
      "includes": [
        "capup",
        "skbpp",
        "attrpierce"
      ]
    },
    {
      "id": "rainbowmetal",
      "name": "レインボーメタルドラゴン",
      "category": "強化",
      "aliases": [
        "レインボーメタル",
        "虹メタ"
      ]
    },
    {
      "id": "killer",
      "name": "キラー潜在たまドラ",
      "category": "潜在",
      "aliases": [
        "キラー潜在",
        "キラー",
        "神キラー",
        "ドラゴンキラー",
        "悪魔キラー",
        "マシンキラー",
        "バランスキラー",
        "攻撃キラー",
        "体力キラー",
        "回復キラー"
      ]
    },
    {
      "id": "jammerresist",
      "name": "お邪魔目覚め耐性潜在たまドラ",
      "category": "潜在",
      "aliases": [
        "お邪魔目覚め耐性"
      ]
    },
    {
      "id": "modoritto",
      "name": "モドリット",
      "category": "強化",
      "aliases": []
    },
    {
      "id": "tokudai",
      "name": "希石【特大】（5属性）",
      "category": "進化",
      "aliases": [
        "特大希石",
        "希石【特大】"
      ]
    },
    {
      "id": "goldtama",
      "name": "ゴールドたまドラ",
      "category": "強化",
      "aliases": [
        "ゴールドたまドラ"
      ]
    }
  ],
  "dungeons": [
    {
      "id": "noel",
      "name": "ノエルドラゴン大集合",
      "aliases": [
        "ノエル大集合"
      ],
      "stamina": 99,
      "battles": 5,
      "note": "ゲリラ開催（1時間限定）。スーパーノエルは確定出現ではない",
      "drops": [
        {
          "itemId": "supernoel",
          "rate": 1,
          "estimated": true
        }
      ],
      "gimmicks": {
        "all": [],
        "partial": [],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/263590",
            "date": "2026-09-07"
          },
          {
            "site": "AppMedia",
            "url": "https://appmedia.jp/pazudora/6199525",
            "date": "2026-09-27"
          }
        ],
        "notes": [
          "両サイトともギミックなし。AppMediaは敵のHP30億・防御力5億が高いと記載"
        ]
      }
    },
    {
      "id": "banryu",
      "name": "永刻の万龍",
      "aliases": [
        "万寿",
        "万龍",
        "万寿チャレンジ"
      ],
      "stamina": 0,
      "battles": 15,
      "note": "テクニカルダンジョン。クリア報酬でスーパーノエル10体",
      "drops": [
        {
          "itemId": "supernoel",
          "rate": 10
        }
      ],
      "gimmicks": {
        "all": [
          "skillDelay",
          "awakenVoid",
          "atkDown",
          "comboDown",
          "dmgVoid",
          "board54",
          "resolve",
          "poison",
          "attrAbsorb",
          "dmgAbsorb",
          "assistVoid",
          "roulette",
          "darkness",
          "unerasable",
          "skillSeal",
          "weakenAwaken",
          "bigHit"
        ],
        "partial": [
          {
            "key": "cloud",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "buffClear",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "maxHpDown",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "timeDown",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "comboAbsorb",
            "sites": [
              "ゲームエイト"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/493395",
            "date": "2026-09-25"
          },
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/372893",
            "date": "2026-09-27"
          }
        ],
        "notes": [
          "ゲームウィズはB9〜B15を詳しく書いていない",
          "10Fの盤面: ゲームエイトは「5×6マス」と記載"
        ]
      }
    },
    {
      "id": "plusparadise",
      "name": "プラスポイントの楽園",
      "aliases": [
        "プラス楽園"
      ],
      "stamina": 120,
      "battles": 6,
      "note": "1周875〜1,358プラスを確認（ゲームエイト）",
      "drops": [
        {
          "itemId": "plus",
          "rate": 1100,
          "estimated": true
        }
      ],
      "gimmicks": {
        "all": [],
        "partial": [],
        "sources": [
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/477837",
            "date": "2026-09-25"
          },
          {
            "site": "AppMedia",
            "url": "https://appmedia.jp/pazudora/75916048",
            "date": "2026-09-27"
          }
        ],
        "notes": [
          "両サイトとも厄介なギミックなし",
          "ゲームエイトは敵（たまドラベビー）が闇半減と記載、AppMediaは記載なし"
        ]
      }
    },
    {
      "id": "kirisame",
      "name": "霧雨の魔王【超重力】",
      "aliases": [
        "霧雨の魔王",
        "天空の儚域",
        "儚域",
        "天空の儚域【超高度】"
      ],
      "stamina": 99,
      "battles": 0,
      "note": "天空の儚域【超高度】。乱入による分岐あり",
      "drops": [
        {
          "itemId": "plus",
          "rate": 6666
        },
        {
          "itemId": "exp",
          "rate": 220500000
        },
        {
          "itemId": "delay",
          "rate": 11,
          "siteSource": [
            "ゲームウィズ"
          ],
          "note": "最大11体"
        },
        {
          "itemId": "skbpp",
          "rate": 1,
          "observed": true
        },
        {
          "itemId": "attrpierce",
          "rate": 2,
          "observed": true
        },
        {
          "itemId": "defignore",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "capup",
          "rate": 3,
          "observed": true
        },
        {
          "itemId": "sixslot",
          "rate": 8,
          "siteSource": [
            "ゲームウィズ"
          ],
          "note": "いずれか最大8体"
        },
        {
          "itemId": "lchange",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        },
        {
          "itemId": "jammerresist",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        }
      ],
      "gimmicks": {
        "all": [
          "resolve",
          "skillDelay",
          "awakenVoid",
          "dmgAbsorb",
          "attrAbsorb",
          "assistVoid",
          "unerasable",
          "comboAbsorb",
          "dmgVoid",
          "weakenAwaken",
          "cloud",
          "darkness",
          "bomb",
          "timeDown",
          "atkDown",
          "comboDown",
          "spike",
          "defenseUp"
        ],
        "partial": [
          {
            "key": "bigHit",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "lock",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "damageCap",
            "sites": [
              "AppMedia"
            ]
          },
          {
            "key": "shield",
            "sites": [
              "AppMedia"
            ]
          },
          {
            "key": "roulette",
            "sites": [
              "AppMedia"
            ]
          },
          {
            "key": "poison",
            "sites": [
              "AppMedia"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/562297",
            "date": "2026-09-27"
          },
          {
            "site": "AppMedia",
            "url": "https://appmedia.jp/pazudora/80048764",
            "date": "2026-09-27"
          }
        ],
        "notes": [
          "アシスト無効の階層: ゲームウィズはB3・B14、AppMediaはB4・B14と記載",
          "ダメージ無効の階層: ゲームウィズはB4・B7・B13、AppMediaはB5〜6・B13と記載"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    },
    {
      "id": "fuun",
      "name": "風雲の龍王【超重力】",
      "aliases": [
        "風雲",
        "風雲の龍王",
        "天空の儚域",
        "儚域",
        "「風雲」チャレンジ！【制限時間60分】",
        "風雲チャレンジ",
        "風雲の龍王【超重力/超高度】"
      ],
      "stamina": 99,
      "battles": 12,
      "note": "天空の儚域【超高度】。乱入・分岐あり。「チャレンジ」は開催期間が違うだけの同じダンジョン",
      "drops": [
        {
          "itemId": "plus",
          "rate": 2970
        },
        {
          "itemId": "exp",
          "rate": 149940000
        },
        {
          "itemId": "supernoel",
          "rate": 10,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "nijipii",
          "rate": 4,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "puredra",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ]
        }
      ],
      "gimmicks": {
        "all": [
          "skillDelay",
          "weakenAwaken",
          "damageCap",
          "comboAbsorb",
          "comboDown",
          "resolve",
          "lock",
          "dmgAbsorb",
          "dmgVoid",
          "awakenVoid",
          "poison",
          "atkDown",
          "maxHpDown",
          "unerasable",
          "attrAbsorb",
          "darkness",
          "spike",
          "assistVoid",
          "cloud",
          "tape",
          "roulette"
        ],
        "partial": [
          {
            "key": "bigHit",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "shield",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "bind",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "board54",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "bomb",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "healDown",
            "sites": [
              "ゲームウィズ"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/545668",
            "date": "2026-09-27"
          },
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/763553",
            "date": "2026-09-25"
          }
        ],
        "notes": [
          "5×4盤面: ゲームウィズはB8・B12に記載、ゲームエイトは記載なし",
          "回復力低下（回復力16分の1）: 攻略サイトの概要で言及、ゲームエイトのギミック表には記載なし"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    },
    {
      "id": "tenkyu",
      "name": "天穹の神王【超重力】",
      "aliases": [
        "天穹",
        "天穹の神王",
        "天空の儚域",
        "儚域",
        "「天穹」チャレンジ！【制限時間60分】",
        "天穹チャレンジ",
        "天穹の神王【超重力/超高度】"
      ],
      "stamina": 99,
      "battles": 15,
      "note": "天空の儚域【超高度】。乱入・分岐あり。「チャレンジ」は開催期間が違うだけの同じダンジョン",
      "drops": [
        {
          "itemId": "plus",
          "rate": 2970
        },
        {
          "itemId": "exp",
          "rate": 235200000
        },
        {
          "itemId": "nijipii",
          "rate": 5,
          "observed": true
        },
        {
          "itemId": "reducep",
          "rate": 4,
          "observed": true
        },
        {
          "itemId": "delay",
          "rate": 3,
          "observed": true
        },
        {
          "itemId": "kingdragon",
          "rate": 3,
          "observed": true
        }
      ],
      "gimmicks": {
        "all": [
          "dmgVoid",
          "damageCap",
          "bigHit",
          "attrAbsorb",
          "comboAbsorb",
          "skillDelay",
          "skillSeal",
          "awakenVoid",
          "assistVoid",
          "weakenAwaken",
          "roulette",
          "timeDown",
          "defenseUp",
          "bind",
          "spike",
          "jammer",
          "unerasable",
          "dmgAbsorb"
        ],
        "partial": [
          {
            "key": "resolve",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "darkness",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "board54",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "shield",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "comboDown",
            "sites": [
              "ゲームウィズ"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/812343",
            "date": "2026-09-25"
          },
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/574144",
            "date": "2026-09-27"
          }
        ],
        "notes": [
          "5×4盤面: ゲームウィズはB6/B8に記載、ゲームエイトは記載なし"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    },
    {
      "id": "guren",
      "name": "紅蓮の機王【灼熱】",
      "aliases": [
        "紅蓮",
        "紅蓮の機王",
        "奈落の重界",
        "重界"
      ],
      "stamina": 99,
      "battles": 12,
      "note": "奈落の重界【超重力】",
      "drops": [
        {
          "itemId": "plus",
          "rate": 2970
        },
        {
          "itemId": "exp",
          "rate": 161700000
        },
        {
          "itemId": "latentpp",
          "rate": 6,
          "observed": true
        },
        {
          "itemId": "reducep",
          "rate": 5,
          "observed": true
        },
        {
          "itemId": "kingdragon",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        }
      ],
      "gimmicks": {
        "all": [
          "resolve",
          "assistVoid",
          "skillDelay",
          "skillSeal",
          "awakenVoid",
          "dmgAbsorb",
          "dmgVoid",
          "attrAbsorb",
          "comboAbsorb",
          "board54",
          "roulette",
          "cloud",
          "weakenAwaken",
          "comboDown",
          "defenseUp",
          "bomb",
          "poison",
          "jammer",
          "maxHpDown"
        ],
        "partial": [
          {
            "key": "healDown",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "spike",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "shield",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "unerasable",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "timeDown",
            "sites": [
              "ゲームエイト"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/551905",
            "date": "2026-09-27"
          },
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/775411",
            "date": "2026-09-25"
          }
        ],
        "notes": [
          "灼熱（HP10%減少・回復力半減）: ゲームウィズに記載、ゲームエイトのギミック表には記載なし",
          "スキル封印の階層: ゲームウィズはB5・B10、ゲームエイトは10F（超根性後）"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    },
    {
      "id": "taiju",
      "name": "大樹の霊王【深緑】",
      "aliases": [
        "大樹",
        "大樹の霊王",
        "奈落の重界",
        "重界",
        "「大樹」チャレンジ！【制限時間60分】",
        "大樹チャレンジ",
        "大樹の霊王【超重力/深緑】"
      ],
      "stamina": 99,
      "battles": 15,
      "note": "奈落の重界【超重力】。7F・8Fで乱入あり。「チャレンジ」は開催期間が違うだけの同じダンジョン",
      "drops": [
        {
          "itemId": "plus",
          "rate": 2970
        },
        {
          "itemId": "exp",
          "rate": 220500000
        },
        {
          "itemId": "waku",
          "rate": 10,
          "observed": true
        },
        {
          "itemId": "souso",
          "rate": 4,
          "observed": true
        },
        {
          "itemId": "sanjin",
          "rate": 2,
          "observed": true
        },
        {
          "itemId": "diafruit",
          "rate": 2,
          "observed": true
        }
      ],
      "gimmicks": {
        "all": [
          "resolve",
          "dmgVoid",
          "dmgAbsorb",
          "attrAbsorb",
          "skillDelay",
          "awakenVoid",
          "assistVoid",
          "board54",
          "weakenAwaken",
          "bigHit",
          "defenseUp",
          "spike",
          "comboAbsorb",
          "unerasable"
        ],
        "partial": [
          {
            "key": "jammer",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "cloud",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "tape",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "darkness",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "bomb",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "roulette",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "healDown",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "atkDown",
            "sites": [
              "ゲームエイト"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/564989",
            "date": "2026-09-27"
          },
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/793612",
            "date": "2026-09-25"
          }
        ],
        "notes": [
          "超根性の階層: ゲームウィズは乱入とB15、ゲームエイトは13Fと15F",
          "5×4盤面: ゲームウィズはB2・B10・B15、ゲームエイトは2F・10F"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    },
    {
      "id": "jupiter",
      "name": "木星の守護者【超高度】",
      "aliases": [
        "木星",
        "木星の守護者",
        "守霊の天体",
        "天体",
        "「木星」チャレンジ！【制限時間40分】",
        "木星チャレンジ",
        "木星の守護者【超重力/超高度】"
      ],
      "stamina": 99,
      "battles": 12,
      "note": "守霊の天体【超重力】。3F・6Fで乱入あり。「チャレンジ」は開催期間が違うだけの同じダンジョン",
      "drops": [
        {
          "itemId": "plus",
          "rate": 2970
        },
        {
          "itemId": "exp",
          "rate": 68670000
        },
        {
          "itemId": "nijipii",
          "rate": 4,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "latentp",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "latentpp",
          "rate": 7,
          "siteSource": [
            "ゲームウィズ"
          ],
          "note": "7〜8体"
        },
        {
          "itemId": "sagepii",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        },
        {
          "itemId": "tojitama",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        },
        {
          "itemId": "modoritto",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        }
      ],
      "gimmicks": {
        "all": [
          "resolve",
          "jammer",
          "skillDelay",
          "atkDown",
          "awakenVoid",
          "timeDown",
          "skillSeal",
          "comboAbsorb",
          "bind",
          "dmgVoid",
          "dmgAbsorb",
          "attrAbsorb",
          "shield",
          "comboDown",
          "unerasable",
          "buffClear",
          "board54",
          "roulette",
          "bigHit",
          "assistVoid",
          "damageCap"
        ],
        "partial": [
          {
            "key": "healDown",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "maxHpDown",
            "sites": [
              "ゲームウィズ"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/493989",
            "date": "2026-09-27"
          },
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/682138",
            "date": "2026-09-25"
          }
        ],
        "notes": [
          "5×4盤面: ゲームエイトは1F・7F、ゲームウィズはB7のみ",
          "B7のスキル効果解除でループ系のスキルが切れる（両サイト）"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    },
    {
      "id": "mercury",
      "name": "水星の守護者【超高度】",
      "aliases": [
        "水星",
        "水星の守護者",
        "水星チャレンジ",
        "守霊の天体",
        "天体"
      ],
      "stamina": 99,
      "battles": 13,
      "note": "守霊の天体【超重力】。6F・7Fで乱入あり",
      "drops": [
        {
          "itemId": "plus",
          "rate": 2970
        },
        {
          "itemId": "exp",
          "rate": 157500000
        },
        {
          "itemId": "delay",
          "rate": 10,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "kingdragon",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "nijipii",
          "rate": 1,
          "observed": true
        },
        {
          "itemId": "kyodai",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "sagepii",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        },
        {
          "itemId": "modoritto",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        },
        {
          "itemId": "tojitama",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        }
      ],
      "gimmicks": {
        "all": [
          "healDown",
          "resolve",
          "skillDelay",
          "poison",
          "weakenAwaken",
          "bind",
          "dmgVoid",
          "dmgAbsorb",
          "spike",
          "damageCap",
          "awakenVoid",
          "attrAbsorb",
          "cloud",
          "comboDown",
          "shield",
          "skillSeal",
          "unerasable",
          "assistVoid",
          "timeDown",
          "darkness",
          "maxHpDown",
          "comboAbsorb",
          "roulette"
        ],
        "partial": [
          {
            "key": "bigHit",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "board54",
            "sites": [
              "ゲームウィズ"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/505138",
            "date": "2026-09-29"
          },
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/701244",
            "date": "2026-09-25"
          }
        ],
        "notes": [
          "5×4盤面: ゲームウィズはB11（1ターン）に記載、ゲームエイトは記載なし",
          "超暗闇: ゲームウィズはB11、ゲームエイトは7Fと記載",
          "属性吸収: ゲームエイトは7Fで光闇吸収、ゲームウィズはB7のシールド破壊時に火水木吸収と記載"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    },
    {
      "id": "venus",
      "name": "金星の守護者【超高度】",
      "aliases": [
        "金星",
        "金星の守護者",
        "金星チャレンジ",
        "「金星」チャレンジ！【制限時間60分】",
        "守霊の天体",
        "天体"
      ],
      "stamina": 99,
      "battles": 13,
      "note": "守霊の天体【超重力】。2Fで乱入（ソフィ）あり",
      "drops": [
        {
          "itemId": "plus",
          "rate": 7777
        },
        {
          "itemId": "exp",
          "rate": 183750000
        },
        {
          "itemId": "supernoel",
          "rate": 10,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "skbpp",
          "rate": 2,
          "observed": true
        },
        {
          "itemId": "lchange",
          "rate": 1,
          "observed": true
        },
        {
          "itemId": "capup",
          "rate": 1,
          "observed": true
        },
        {
          "itemId": "sixslot",
          "rate": 3,
          "observed": true
        },
        {
          "itemId": "diafruit",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        }
      ],
      "gimmicks": {
        "all": [
          "dmgVoid",
          "resolve",
          "atkDown",
          "darkness",
          "tape",
          "weakenAwaken",
          "damageCap",
          "attrAbsorb",
          "awakenVoid",
          "dmgAbsorb",
          "timeDown",
          "skillDelay",
          "skillSeal",
          "bind",
          "unerasable",
          "healDown",
          "bigHit",
          "poison",
          "jammer",
          "comboDown",
          "shield",
          "assistVoid",
          "spike",
          "board54"
        ],
        "partial": [
          {
            "key": "lock",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "cloud",
            "sites": [
              "ゲームウィズ"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/516407",
            "date": "2026-09-29"
          },
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/713759",
            "date": "2026-09-25"
          }
        ],
        "notes": [
          "ロック目覚め（B2）: ゲームウィズのみ記載",
          "雲: ゲームウィズはB2・B11に記載、ゲームエイトは記載なし（操作不可は両サイトに記載）",
          "B3・B7・B11・B13は溜め行動の後に大ダメージ（両サイト）"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    },
    {
      "id": "moon",
      "name": "月の守護者【超高度】",
      "aliases": [
        "月",
        "月の守護者",
        "月チャレンジ",
        "守霊の天体",
        "天体"
      ],
      "stamina": 99,
      "battles": 14,
      "note": "守霊の天体【超重力】。7F・8Fで乱入（ソフィ）あり",
      "drops": [
        {
          "itemId": "plus",
          "rate": 5000
        },
        {
          "itemId": "exp",
          "rate": 210000000
        },
        {
          "itemId": "kingdragon",
          "rate": 9,
          "siteSource": [
            "ゲームウィズ"
          ],
          "note": "8〜10体"
        },
        {
          "itemId": "pii",
          "rate": 5,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "tojitama",
          "rate": 1,
          "observed": true
        },
        {
          "itemId": "souso",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "sagepii",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        },
        {
          "itemId": "modoritto",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        },
        {
          "itemId": "goldtama",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        }
      ],
      "gimmicks": {
        "all": [
          "dmgVoid",
          "dmgAbsorb",
          "attrAbsorb",
          "comboAbsorb",
          "damageCap",
          "resolve",
          "skillDelay",
          "awakenVoid",
          "assistVoid",
          "board54",
          "cloud",
          "tape",
          "roulette",
          "darkness",
          "weakenAwaken",
          "poison",
          "jammer",
          "healDown",
          "atkDown",
          "maxHpDown",
          "comboDown",
          "shield",
          "bigHit"
        ],
        "partial": [
          {
            "key": "skillSeal",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "lock",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "bomb",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "spike",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "timeDown",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "buffClear",
            "sites": [
              "ゲームウィズ"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/531389",
            "date": "2026-09-29"
          },
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/745795",
            "date": "2026-09-25"
          }
        ],
        "notes": [
          "スキル封印・ロック・爆弾・トゲ・操作時間減少・スキル効果解除（B10超根性時）: ゲームウィズのみ記載",
          "B2・B6・B14で2000万超えの大ダメージ（攻略サイトの概要より）"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    },
    {
      "id": "sun",
      "name": "太陽の守護者【超高度】",
      "aliases": [
        "太陽",
        "太陽の守護者",
        "太陽チャレンジ",
        "「太陽」チャレンジ！【制限時間60分】",
        "守霊の天体",
        "天体"
      ],
      "stamina": 99,
      "battles": 15,
      "note": "守霊の天体【超重力】。5F・6Fで乱入（ソフィ）あり",
      "drops": [
        {
          "itemId": "plus",
          "rate": 9999
        },
        {
          "itemId": "exp",
          "rate": 441000000
        },
        {
          "itemId": "pii",
          "rate": 5,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "sagepii",
          "rate": 1,
          "observed": true
        },
        {
          "itemId": "skbpp",
          "rate": 2,
          "observed": true
        },
        {
          "itemId": "souso",
          "rate": 2,
          "observed": true
        },
        {
          "itemId": "sanjin",
          "rate": 2,
          "observed": true
        },
        {
          "itemId": "diafruit",
          "rate": 1,
          "observed": true
        },
        {
          "itemId": "kyodai",
          "rate": 2,
          "observed": true
        },
        {
          "itemId": "sixslot",
          "rate": 4,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "tokudai",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ],
          "note": "2〜3体"
        },
        {
          "itemId": "modoritto",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        },
        {
          "itemId": "goldtama",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ],
          "countUnknown": true
        }
      ],
      "gimmicks": {
        "all": [
          "resolve",
          "dmgAbsorb",
          "attrAbsorb",
          "comboAbsorb",
          "assistVoid",
          "skillDelay",
          "awakenVoid",
          "unerasable",
          "weakenAwaken",
          "board54",
          "roulette",
          "tape",
          "spike",
          "healDown",
          "comboDown",
          "atkDown",
          "damageCap"
        ],
        "partial": [
          {
            "key": "dmgVoid",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "buffClear",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "cloud",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "poison",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "darkness",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "timeDown",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "bigHit",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "shield",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "maxHpDown",
            "sites": [
              "ゲームエイト"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/542373",
            "date": "2026-09-29"
          },
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/759417",
            "date": "2026-09-25"
          }
        ],
        "notes": [
          "ダメージ無効: ゲームウィズは20億以上7〜10ターンと記載、ゲームエイトはダメージ上限値変更（20億・50億）として記載",
          "スキル効果解除（B5/B6乱入の先制）・雲・毒・超暗闇: ゲームウィズのみ記載",
          "シールド・最大HP半減: ゲームエイトのみ記載",
          "最大4500万の大ダメージあり（攻略サイトの概要より）"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    },
    {
      "id": "hyakushiki",
      "name": "煉燼の百龍【超重力】",
      "aliases": [
        "新百式",
        "煉燼の百龍",
        "新百式チャレンジ",
        "再臨の超星",
        "超星"
      ],
      "stamina": 99,
      "battles": 9,
      "note": "再臨の超星【超重力】（超重力625分の1）。リーダーチェンジあり、スキル遅延なし",
      "drops": [
        {
          "itemId": "plus",
          "rate": 2970
        },
        {
          "itemId": "exp",
          "rate": 63003413
        },
        {
          "itemId": "supernoel",
          "rate": 2,
          "observed": true
        },
        {
          "itemId": "kingtama",
          "rate": 2,
          "observed": true
        },
        {
          "itemId": "reducep",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "delay",
          "rate": 3,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "latentpp",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "rainbowmetal",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ",
            "ゲームエイト"
          ]
        },
        {
          "itemId": "killer",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ",
            "ゲームエイト"
          ]
        }
      ],
      "gimmicks": {
        "all": [
          "resolve",
          "bigHit",
          "darkness",
          "jammer",
          "poison",
          "dmgAbsorb",
          "attrAbsorb",
          "awakenVoid",
          "unerasable",
          "bind",
          "timeDown",
          "skillSeal",
          "weakenAwaken",
          "assistVoid",
          "board54",
          "cloud",
          "tape",
          "atkDown",
          "comboAbsorb",
          "comboDown",
          "roulette",
          "spike",
          "shield"
        ],
        "partial": [
          {
            "key": "bomb",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "healDown",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "dmgVoid",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "lock",
            "sites": [
              "ゲームエイト"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/444087",
            "date": "2026-09-28"
          },
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/603175",
            "date": "2026-09-25"
          }
        ],
        "notes": [
          "リーダーチェンジ: 両サイトに記載（代用やアシストで対策が必要）",
          "スキル遅延はなし（ゲームエイト）。ボスのシールドは4ターンごとに復活（両サイト）",
          "爆弾・回復力減少: ゲームウィズのみ記載。ダメージ無効・ロック: ゲームエイトのみ記載",
          "ダメージ吸収は6F（編成作者 @pad_ultima127 の説明）",
          "2F突破時にマイクロ（LSの軽減が剥がれる）が入り、1ターン経過扱いになる。効果ターンのあるスキル・「◯ターン後に発動」も1ターン進む（@pad_ultima127 の説明）"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算",
      "gimmickFloors": {
        "assistVoid": [
          2
        ],
        "dmgAbsorb": [
          6
        ],
        "turnPass": [
          2
        ]
      },
      "damage": {
        "source": {
          "site": "ゲームウィズ",
          "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/444087",
          "date": "2026-09-30"
        },
        "note": "先制行動と超根性発動時の攻撃のみ。味方の攻撃→敵の攻撃の順なので、ワンパンする階は先制以外受けない前提（通常攻撃は数えない）",
        "floors": [
          {
            "floor": 1,
            "hits": []
          },
          {
            "floor": 2,
            "hits": [
              {
                "label": "超根性発動時 現HP500%割合",
                "ratio": 500,
                "kind": "superResolve"
              }
            ],
            "note": "リーダーチェンジ済みで2,050,000ダメージの行動あり／2F突破時にLSの軽減が剥がれ、1ターン経過扱いになる（効果ターンのあるスキル・「◯ターン後に発動」も1ターン進む。@pad_ultima127 の説明）",
            "turnPassOnClear": true
          },
          {
            "floor": 3,
            "hits": [
              {
                "label": "先制（マイクロ）",
                "dmg": 154000,
                "noLsReduce": true,
                "kind": "preemptive"
              }
            ],
            "note": "2F突破時にLSの軽減が剥がれ、その状態で受ける（ゲームウィズ「リーダースキル無しで154,000ダメージ」）"
          },
          {
            "floor": 4,
            "hits": [
              {
                "label": "先制",
                "dmg": 550000,
                "kind": "preemptive"
              }
            ]
          },
          {
            "floor": 5,
            "hits": [
              {
                "label": "先制（14コンボ吸収の敵）",
                "dmg": 2250000,
                "kind": "preemptive"
              },
              {
                "label": "初回行動時（攻撃力2.5倍の敵）",
                "dmg": 5000000,
                "kind": "turn"
              }
            ],
            "note": "出る敵は3体のうち1体。2,250,000の先制は1体だけ（ほかは先制でダメージなし、または初回行動時）"
          },
          {
            "floor": 6,
            "hits": [
              {
                "label": "先制",
                "dmg": 2300000,
                "kind": "preemptive"
              }
            ]
          },
          {
            "floor": 7,
            "hits": [
              {
                "label": "先制（2体目）",
                "dmg": 2350000,
                "kind": "preemptive"
              }
            ]
          },
          {
            "floor": 8,
            "hits": [
              {
                "label": "超根性発動時",
                "dmg": 3720000,
                "kind": "superResolve"
              }
            ]
          },
          {
            "floor": 9,
            "hits": [
              {
                "label": "先制 現HP200%割合",
                "ratio": 200,
                "kind": "preemptive"
              },
              {
                "label": "先制",
                "dmg": 2375000,
                "kind": "preemptive"
              }
            ],
            "note": "以降4ターン毎に2,650,000。20ターン目以降は毎ターン25,000,000"
          }
        ]
      }
    },
    {
      "id": "senju",
      "name": "浄罪の千龍【超重力】",
      "aliases": [
        "新千手",
        "浄罪の千龍",
        "新千手チャレンジ",
        "千手",
        "再臨の超星",
        "超星"
      ],
      "stamina": 99,
      "battles": 10,
      "note": "再臨の超星【超重力】。リーダーチェンジあり、ダメージ上限値変更あり",
      "drops": [
        {
          "itemId": "plus",
          "rate": 2970
        },
        {
          "itemId": "exp",
          "rate": 68302017
        },
        {
          "itemId": "delay",
          "rate": 5,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "pii",
          "rate": 3,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "waku",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "nijipii",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "kingdragon",
          "rate": 1,
          "siteSource": [
            "ゲームウィズ"
          ]
        },
        {
          "itemId": "kyodai",
          "rate": 2,
          "siteSource": [
            "ゲームウィズ"
          ]
        }
      ],
      "gimmicks": {
        "all": [
          "dmgVoid",
          "dmgAbsorb",
          "attrAbsorb",
          "damageCap",
          "bigHit",
          "resolve",
          "board54",
          "unerasable",
          "lock",
          "roulette",
          "jammer",
          "poison",
          "timeDown",
          "assistVoid",
          "awakenVoid",
          "skillDelay",
          "comboDown",
          "atkDown",
          "healDown",
          "shield",
          "weakenAwaken"
        ],
        "partial": [
          {
            "key": "maxHpDown",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "bind",
            "sites": [
              "ゲームウィズ"
            ]
          },
          {
            "key": "comboAbsorb",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "skillSeal",
            "sites": [
              "ゲームエイト"
            ]
          },
          {
            "key": "tape",
            "sites": [
              "ゲームエイト"
            ]
          }
        ],
        "sources": [
          {
            "site": "ゲームウィズ",
            "url": "https://xn--0ck4aw2h.gamewith.jp/article/show/451977",
            "date": "2026-09-28"
          },
          {
            "site": "ゲームエイト",
            "url": "https://game8.jp/pazudora/612634",
            "date": "2026-09-25"
          }
        ],
        "notes": [
          "リーダーチェンジ・ダメージ上限値変更・シールド: 両サイトに記載",
          "コンボ吸収・スキル封印・操作不可: ゲームエイトのみ記載。バインド・最大HP減少: ゲームウィズのみ記載",
          "盤面変化: ゲームウィズは5×4マスと6×5マスの両方を記載"
        ]
      },
      "rewardNote": "報酬はゲームウィズの「特徴とドロップ」の記載を優先。個数の記載がないものはプレイ履歴1周分の実績、どちらもないものは1体で計算"
    }
  ],
  "teams": [
    {
      "id": "noel-saeki",
      "dungeonId": "noel",
      "title": "不動の精神・冴木創 周回編成",
      "timeSec": 60,
      "ease": 4,
      "stability": 90,
      "estimated": [
        "timeSec",
        "ease",
        "stability"
      ],
      "members": [
        {
          "id": "saeki",
          "role": "L"
        },
        {
          "id": "daisy",
          "role": "S",
          "assist": "ガウェイン（No.未確定）"
        },
        {
          "id": "weldol",
          "role": "S",
          "assist": "サタン＝ヴォイド（No.未確定）"
        },
        {
          "id": "satanvoid",
          "role": "S"
        },
        {
          "id": "satanvoid",
          "role": "S"
        },
        {
          "id": "saeki",
          "role": "F"
        }
      ],
      "steps": [
        "B1〜B4: ウェルドール（サタン＝ヴォイド装備）で攻撃",
        "B5: 冴木創で攻撃",
        "アシストの付け方は出典で確認"
      ],
      "source": "https://xn--0ck4aw2h.gamewith.jp/article/show/263590",
      "sourceDate": "2026-09-07"
    },
    {
      "id": "banryu-kaido",
      "dungeonId": "banryu",
      "title": "百獣のカイドウ 周回編成",
      "timeSec": 900,
      "ease": 1,
      "stability": 85,
      "estimated": [
        "timeSec",
        "ease",
        "stability"
      ],
      "members": [
        {
          "id": "kaido",
          "role": "L"
        },
        {
          "id": "flameknight",
          "role": "S"
        },
        {
          "id": "kanburi",
          "role": "S"
        },
        {
          "id": "tierra",
          "role": "S"
        },
        {
          "id": "chopper",
          "role": "S"
        },
        {
          "id": "kaido",
          "role": "F"
        }
      ],
      "steps": [
        "1F: チョッパーのスキルで右をターゲット",
        "3F: ガランゴルム装備で7×6化",
        "15F: ダメージ無効貫通スキルで即死対策",
        "全15フロア。各フロアの詳細は出典を確認"
      ],
      "source": "https://kamigame.jp/puzzle-dragons/%E3%83%80%E3%83%B3%E3%82%B8%E3%83%A7%E3%83%B3/%E3%83%86%E3%82%AF%E3%83%8B%E3%82%AB%E3%83%AB%E3%83%80%E3%83%B3%E3%82%B8%E3%83%A7%E3%83%B3/%E6%B0%B8%E5%88%BB%E3%81%AE%E4%B8%87%E9%BE%8D-%E3%82%AB%E3%82%A4%E3%83%89%E3%82%A6%E3%83%91%E3%83%BC%E3%83%86%E3%82%A3.html",
      "sourceDate": "2024-07-08"
    },
    {
      "id": "plus-cyclops",
      "dungeonId": "plusparadise",
      "title": "究極サイクロップス ずらし編成",
      "timeSec": 70,
      "ease": 5,
      "stability": 95,
      "estimated": [
        "timeSec",
        "stability"
      ],
      "members": [
        {
          "id": "cyclops",
          "role": "L"
        },
        {
          "id": "droidragon",
          "role": "S"
        },
        {
          "id": "droidragon",
          "role": "S"
        },
        {
          "id": "droidragon",
          "role": "S"
        },
        {
          "id": "hathor",
          "role": "F"
        }
      ],
      "steps": [
        "アシスト: アジサイのハーバリウム No.7371（出典では「全体」）",
        "1F: サイクロップスのスキル",
        "2〜6F: アジサイのハーバリウムの効果でずらし",
        "先制・根性などの厄介なギミックなし"
      ],
      "source": "https://game8.jp/pazudora/477837",
      "sourceDate": "2026-09-25"
    },
    {
      "id": "kirisame-dain",
      "dungeonId": "kirisame",
      "title": "ダイン×ダイアモス 全部位破壊",
      "timeSec": 569,
      "turns": 23,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "izuna",
          "role": "S",
          "assist": "［ワールドエンド・ブライド］北条加蓮のCD No.13584"
        },
        {
          "id": "liltotto",
          "role": "S",
          "assist": "ホワイトレディの宝杯 No.12634"
        },
        {
          "id": "shibuyarin",
          "role": "S",
          "assist": "西谷のユニフォーム No.12301"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "黒猫アーサー No.11384"
        }
      ],
      "steps": [
        "全部位破壊・ノーコン23ターン。基本は光T消費。6Fで乱入あり",
        "ボスの超根性の後、西谷のコンボ加算が切れるので+1コンボ必要",
        "1F《クラーケン、クロノタートル、クラーケン》リルトット裏 → ダイアモス裏 → ダイン変身 → 日番谷変身 → イズナ裏 → ダイン → 渋谷凛裏 → ダイアモス変身",
        "2F《デビル＋ベルゼブブ or メフィストフェレス》イズナ、日番谷、ダイアモス",
        "3F《ディアボロス》ダイアモス、ダイン【光L字×2】",
        "4F《ラタトスク》渋谷凛、ダイアモス",
        "5F《クロエ》ダイアモス【+4コンボ】",
        "6F《【乱入】グレーシス》①日番谷、ダイアモス ②ダイアモス【+2コンボ】",
        "7F《河童、センボウ》ダイアモス（ダインを間違って打たない）",
        "8F《デーモン》リルトット裏、ダイアモス、ダイン",
        "9F《ヒカりん＆ワルりん》イズナ、日番谷、ダイアモス",
        "10F《ノルザ》ダイアモス",
        "11F《ジル＝レガート》渋谷凛、ダイアモス",
        "12F《クトゥルフ or ニャルラトホテプ》ダイアモス【水+2コンボ、木+3コンボ】",
        "13F《アザトース》①ダイン、イズナ、日番谷【1コンボ耐久】 ②ダイアモス",
        "14F《グレゴウル》①ダイアモス、リルトット【盤面配置は出典の画像を参照】 ②ダイアモス",
        "15F《黒雲の霧雨魔王・グレゴウル》①渋谷凛、イズナ、日番谷、ダイアモス【お好みで水十字】 ②ダイアモス、ダイン ③ダイアモス ④ダイアモス【光を消せない時間way、+1コンボ】 ⑤イズナ、日番谷、ダイアモス【+1コンボ】 ⑥ダイアモス、リルトット【+4コンボ】"
      ],
      "source": "https://x.com/break_my_teeth/status/2103470211643129952",
      "author": {
        "name": "前歯ニキ"
      },
      "sourceDate": "2026-09-25",
      "metrics": {
        "chars": 622,
        "puzzle": 11,
        "branch": 3,
        "caution": 0,
        "zurashi": 1,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "kirisame-heartia-supermikan",
      "dungeonId": "kirisame",
      "title": "ハーティア×セイハーツ（フェニックス入り）",
      "timeSec": 505,
      "turns": 21,
      "estimated": [],
      "members": [
        {
          "id": "n14101",
          "role": "L",
          "assist": "チューリップの標本 No.12447"
        },
        {
          "id": "n14010",
          "role": "S",
          "assist": "無一郎と蜜璃の鎹鴉 No.12817"
        },
        {
          "id": "n14005",
          "role": "S",
          "assist": "エルフリーデの竹刀とフィアメルの木剣 No.14006"
        },
        {
          "id": "n14135",
          "role": "S",
          "assist": "ユラの封呪符 No.14139"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "ヘッドマウントディスプレイ No.13081"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "FAIRY TAILの単行本50巻【ナツ・ドラグニル】 No.11947"
        }
      ],
      "steps": [
        "高速モードで8分24秒・21ターン（プレイ履歴より）",
        "回復4消しが要らない",
        "スキルLv1: ハーティア、各武器、セイハーツB。フェニックスはスキルLv4",
        "1F: フェニックス → セイハーツA → セッカ → セイハーツB → エルフリーデ → … → フェニックス（盤面4コンボ）",
        "以降は基本セイハーツ中心。5F/6Fは乱入で分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/supermikan22/status/2098711202381918417",
      "author": {
        "name": "夏みかん"
      },
      "sourceDate": "2026-09-12",
      "metrics": {
        "chars": 456,
        "puzzle": 13,
        "branch": 4,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0.83,
        "plus891Text": null
      }
    },
    {
      "id": "kirisame-dain-nanaminn",
      "dungeonId": "kirisame",
      "title": "ダイン×ダイアモス 全部位破壊（オメガモン入り）",
      "timeSec": 766,
      "turns": 28,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "スザクの騎士証 No.11383"
        },
        {
          "id": "n14010",
          "role": "S",
          "assist": "霊妙鍵の装具・霊泉の薙刀 No.13510"
        },
        {
          "id": "n12925",
          "role": "S",
          "assist": "平次のバイク No.12368"
        },
        {
          "id": "n13462",
          "role": "S",
          "assist": "無一郎と蜜璃の鎹鴉 No.12817"
        },
        {
          "id": "n11714",
          "role": "S",
          "assist": "極醒の裁秤神・エスカマリのティアラ No.7658"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "豊臣秀吉おさるのもんきち No.13024"
        }
      ],
      "steps": [
        "1周12〜13分台で全部位破壊（プレイ履歴は12分46秒・28ターン）",
        "エスカマリ武器はスキルLv5。指定のないところは光Tのみ",
        "4F〜6Fは棘になるべく触らない。5F・6Fはコンボ無効に注意",
        "15F超根性後: 保科、ゼーリエ、オメガモン2、ダイアモス、+光",
        "半分時に光を消せない時は、ゼーリエを使わず火or水way+光Tで殴り、次ターンにゼーリエ",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2088567931990921433",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-08-15",
      "metrics": {
        "chars": 574,
        "puzzle": 16,
        "branch": 0,
        "caution": 2,
        "zurashi": 0,
        "plus891": 0.67,
        "plus891Text": null
      }
    },
    {
      "id": "kirisame-heartia-370id",
      "dungeonId": "kirisame",
      "title": "ハーティア×セイハーツ（シルク・ヴァサーゴ入り）",
      "timeSec": 537,
      "turns": 28,
      "estimated": [],
      "members": [
        {
          "id": "n14101",
          "role": "L",
          "assist": "FAIRY TAILの単行本50巻【ナツ・ドラグニル】 No.11947"
        },
        {
          "id": "n14010",
          "role": "S",
          "assist": "ハイビスカスの標本 No.7324"
        },
        {
          "id": "n11327",
          "role": "S",
          "assist": "たまのネジ No.13717"
        },
        {
          "id": "n12206",
          "role": "S",
          "assist": "古城の女主神・カーリーのキャンディ No.7991"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "エルフリーデの竹刀とフィアメルの木剣 No.14006"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "ヘッドマウントディスプレイ No.13081"
        }
      ],
      "steps": [
        "8分56秒・28ターン（プレイ履歴より）",
        "ナツ武器、エルフリーデ武器、フレンドのセイハーツはスキルLv1、他はスキルマ",
        "ほぼ毎フロア火列を組む",
        "13F: 1〜3ターン目で上2・3列目に火を残す",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/370id/status/2092986864995278897",
      "author": {
        "name": "みなも"
      },
      "sourceDate": "2026-08-27",
      "metrics": {
        "chars": 703,
        "puzzle": 41,
        "branch": 0,
        "caution": 1,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "kirisame-elfriede-agepan",
      "dungeonId": "kirisame",
      "title": "エルフリーデvsフィアメル×試練アメノウズメ 完全ずらし",
      "timeSec": 705,
      "turns": 31,
      "estimated": [],
      "yields": {
        "exp": 157500000
      },
      "members": [
        {
          "id": "n14005",
          "role": "L",
          "assist": "エルフリーデの竹刀とフィアメルの木剣 No.14006"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "緋窮の億兆龍・アグリゲートのブローチ No.11561"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "グレた元サッカー部員・真田幸村の学生証 No.12359"
        },
        {
          "id": "n14135",
          "role": "S",
          "assist": "ロザリンのティーセット No.13857"
        },
        {
          "id": "n11327",
          "role": "S",
          "assist": "Dフェニックスの起動キー No.14136"
        },
        {
          "id": "n12853",
          "role": "F",
          "assist": "古城の女主神・カーリーのキャンディ No.7991"
        }
      ],
      "steps": [
        "部位破壊周回。11分45秒・31ターン（プレイ履歴より）",
        "1F初手のセイハーツ陣殴り、3F・14Fのアシスト無効解除以外は完全ずらし（回復4消しも不要）",
        "セイハーツ、アグリ武器、真田武器、フィアエル武器はスキルLv1、他はスキルマ",
        "ウズメ継承とフィアエルはセイハーツより必ず先に打つ",
        "代用: フェニックスのアシストは紅蓮の起動キー No.11387（カレン装備）でも可。真田武器→シュタルク装備（スキルLv1）、Dフェニックス装備→火付与ヘイスト3武器・カレン武器・のりん武器など",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/agepan_eropan/status/2099127078243446806",
      "author": {
        "name": "あげぱん🦐"
      },
      "sourceDate": "2026-09-13",
      "metrics": {
        "chars": 342,
        "puzzle": 5,
        "branch": 1,
        "caution": 0,
        "zurashi": 31,
        "plus891": 0,
        "plus891Text": null
      },
      "endorsedAlts": [
        {
          "target": 14136,
          "part": "assist",
          "nos": [
            11387
          ],
          "text": "Dフェニックスの起動キーの代わりに紅蓮の起動キー（カレン装備）。ほかに火付与ヘイスト3武器・カレン武器・のりん武器など"
        },
        {
          "target": 12359,
          "part": "assist",
          "nos": [
            13420
          ],
          "text": "真田武器の代わりにシュタルク装備（スキルLv1）"
        }
      ]
    },
    {
      "id": "kirisame-heartia-eriryuu",
      "dungeonId": "kirisame",
      "title": "ハーティア×夏休みエルフリーデ 全部位破壊",
      "timeSec": 656,
      "turns": 32,
      "estimated": [],
      "members": [
        {
          "id": "n14101",
          "role": "L",
          "assist": "チューリップの標本 No.12447"
        },
        {
          "id": "n13341",
          "role": "S",
          "assist": "骨棍棒 No.11756"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "南魔王パイモンのカード No.12477"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "勇気のデジメンタル No.13088"
        },
        {
          "id": "n13094",
          "role": "S",
          "assist": "想海の師弟愛・ノルザ＆マールのショコラ No.13388"
        },
        {
          "id": "n14005",
          "role": "F",
          "assist": "炎獄竜ヒノカグツチのカード No.11897"
        }
      ],
      "steps": [
        "通常モード13分台（13分16秒）、高速モード10〜11分台（10分56秒）・32ターン",
        "基本全部ずらし。弱化ドロップに注意",
        "コンボ減少・吸収・無効の時はしっかりパズル（回復4消しはアシスト無効時と15F超根性後）",
        "セイハーツとハーティアの本体と武器はスキルLv1。セイハーツは左が1、右が2",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/eri_ryuu_pad/status/2093946722938753193",
      "author": {
        "name": "えりりゅー"
      },
      "sourceDate": "2026-08-30",
      "metrics": {
        "chars": 693,
        "puzzle": 19,
        "branch": 0,
        "caution": 7,
        "zurashi": 2,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "kirisame-hinata-nanaminn",
      "dungeonId": "kirisame",
      "title": "日向ずらし編成",
      "timeSec": 1003,
      "turns": 36,
      "estimated": [],
      "yields": {
        "exp": 157500000
      },
      "members": [
        {
          "id": "n13999",
          "role": "L",
          "assist": "ひとり読書の地王神・クロノスの弁当箱 No.13619"
        },
        {
          "id": "n13964",
          "role": "S",
          "assist": "アームド・アーマーDE No.12199"
        },
        {
          "id": "n12804",
          "role": "S",
          "assist": "トメノスケ・ヒート・ホーク No.12176"
        },
        {
          "id": "n13305",
          "role": "S",
          "assist": "炎天魔龍・ブラムベルのブレスレット No.13486"
        },
        {
          "id": "n12279",
          "role": "S",
          "assist": "日向のユニフォーム No.12280"
        },
        {
          "id": "n13964",
          "role": "F",
          "assist": "仮装祭の紅剣姫・エルフリーデのキャンディ No.11598"
        }
      ],
      "steps": [
        "16分42秒・36ターン（プレイ履歴より）。回復4消しすら不要",
        "パズルは指定のない限り全部ずらし。指定のあるところは闇列＋回復列以外に+で組む",
        "+891は全キャラ必須ではないが、回復力的にあった方が良い",
        "5F・6Fのコンボ無効は+でコンボを組む。11Fからルーレット注意",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2084104839546769802",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-08-03",
      "metrics": {
        "chars": 873,
        "puzzle": 15,
        "branch": 0,
        "caution": 5,
        "zurashi": 2,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "kirisame-heartia-underbar",
      "dungeonId": "kirisame",
      "title": "ハーティア セイハーツループ 全部位破壊（改良版）",
      "timeSec": 777,
      "turns": 30,
      "estimated": [],
      "members": [
        {
          "id": "n14101",
          "role": "L",
          "assist": "チューリップの標本 No.12447"
        },
        {
          "id": "n14010",
          "role": "S",
          "assist": "水ヨーヨーの女神・ミネルヴァの常夏ジュース No.12770"
        },
        {
          "id": "n13998",
          "role": "S",
          "assist": "プリシラ・バーリエル No.13341"
        },
        {
          "id": "n14005",
          "role": "S",
          "assist": "創造神・アトゥムの首飾り No.13282"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "極醒の裁秤神・エスカマリのティアラ No.7658"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "甘味の撫子・クシナダヒメのショコラ No.8369"
        }
      ],
      "steps": [
        "基本13分で周回可能（12分57秒・30ターン）",
        "セイハーツループ。回復4消しか回復を大量に消す",
        "1Fは亀をターゲットに。火の弱化に注意",
        "13F突破時と15Fの立ち回りに注意（15Fはカレン裏まで翼ターゲット）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/iwTDcjJkdsZ1qDT/status/2091720334731080107",
      "author": {
        "name": "アンダーバー"
      },
      "sourceDate": "2026-08-24",
      "metrics": {
        "chars": 874,
        "puzzle": 18,
        "branch": 8,
        "caution": 9,
        "zurashi": 1,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "kirisame-heartia-furuki",
      "dungeonId": "kirisame",
      "title": "ハーティア×エルフリーデ セイハーツループ（部位破壊9）",
      "timeSec": 684,
      "turns": 32,
      "estimated": [],
      "yields": {
        "exp": 210000000
      },
      "members": [
        {
          "id": "n14101",
          "role": "L",
          "assist": "チューリップの標本 No.12447"
        },
        {
          "id": "n13826",
          "role": "S",
          "assist": "無一郎と蜜璃の鎹鴉 No.12817"
        },
        {
          "id": "n13136",
          "role": "S",
          "assist": "木星の魔導神機・ジュピトールのブレスレット No.10527"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "緋窮の億兆龍・アグリゲートのブローチ No.11561"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "勇気のデジメンタル No.13088"
        },
        {
          "id": "n14005",
          "role": "F",
          "assist": "水ヨーヨーの女神・ミネルヴァの常夏ジュース No.12770"
        }
      ],
      "steps": [
        "部位破壊9。11分23秒・32ターン（プレイ履歴より）",
        "+を減らす時はHPを増やす",
        "1F: セイハーツ変身 → グレダイ進化 → セイハーツ変身 → エルフィア進化 → ハーティア変身 → 以降ループ。弱化に注意しつつたくさん消す",
        "5F〜8Fはクロエ／グレーシスで分岐",
        "立ち回りと注意点は出典で画像が分かれている",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/furuki_yokiyoki/status/2101593348184359101",
      "author": {
        "name": "古城よき"
      },
      "sourceDate": "2026-09-20",
      "metrics": {
        "chars": 687,
        "puzzle": 17,
        "branch": 2,
        "caution": 1,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "fuun-dain-nanaminn",
      "dungeonId": "fuun",
      "title": "ダイン×ダイアモス 全部位破壊",
      "timeSec": 837,
      "turns": 28,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "スザクの騎士証 No.11383"
        },
        {
          "id": "n13419",
          "role": "S",
          "assist": "霊妙鍵の装具・霊泉の薙刀 No.13510"
        },
        {
          "id": "n12956",
          "role": "S",
          "assist": "死天龍・アークヴェルザのブレスレット No.11213"
        },
        {
          "id": "n13462",
          "role": "S",
          "assist": "Bros No.13200"
        },
        {
          "id": "n12729",
          "role": "S",
          "assist": "ゼウスの仕掛け絵本 No.12011"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "雷神の玉 No.12407"
        }
      ],
      "steps": [
        "1周13〜14分台で全部位破壊（プレイ履歴は13分57秒・28ターン）",
        "乱入や分岐で立ち回りがほぼ変わらない。弱化泥・攻撃デバフ・盤面荒らし・超高度を完全に拒否できる",
        "指定のないところは光Tのみ",
        "1Fは右ターゲット。5F・6Fの乱入は部位ターゲット、9Fは真ん中、12Fは盾玉（左部位）ターゲット",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2088950893089538205",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-08-16",
      "metrics": {
        "chars": 676,
        "puzzle": 19,
        "branch": 4,
        "caution": 8,
        "zurashi": 3,
        "plus891": 0.83,
        "plus891Text": null
      }
    },
    {
      "id": "fuun-heartia-yu",
      "dungeonId": "fuun",
      "title": "ハーティア×セイハーツ 部位全破壊",
      "timeSec": 585,
      "turns": 27,
      "estimated": [],
      "yields": {
        "exp": 140000000
      },
      "members": [
        {
          "id": "n14101",
          "role": "L",
          "assist": "チューリップの標本 No.12447"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "極醒の幻術神・オーディンのティアラ No.7638"
        },
        {
          "id": "n12903",
          "role": "S",
          "assist": "ポチャッコのアイスクリーム No.11654"
        },
        {
          "id": "n13998",
          "role": "S",
          "assist": "ビクトリーランサー No.11344"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "極醒の裁秤神・エスカマリのティアラ No.7658"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "武田信玄の櫛 No.9991"
        }
      ],
      "steps": [
        "6F乱入で最速9分台〜10分台（プレイ履歴は9分45秒・27ターン）",
        "スキブ11。母体はセイハーツAのみスキルLv2〜4、その他はスキルマでOK",
        "アシストはエスカマリのみスキルLv13（スキルマなら1F2T目ポチャッコの後に空打ち）",
        "回復4消しのターン以外は火列＋回復列で削る",
        "5F乱入／6F乱入で立ち回りが分岐。12Fは部位グラビティのダメージ表示で突破タイミングを判断",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/yu_984/status/2104068339958264231",
      "author": {
        "name": "yゆう"
      },
      "sourceDate": "2026-09-27",
      "metrics": {
        "chars": 1080,
        "puzzle": 29,
        "branch": 2,
        "caution": 3,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "fuun-challenge-fern",
      "dungeonId": "fuun",
      "title": "フェルン編成 ボス部位破壊",
      "timeSec": 1524,
      "turns": 42,
      "estimated": [],
      "members": [
        {
          "id": "n13416",
          "role": "L",
          "assist": "ヴィルヘルムの剣 No.13340"
        },
        {
          "id": "n13426",
          "role": "S",
          "assist": "パック No.13306"
        },
        {
          "id": "n13094",
          "role": "S",
          "assist": "木星の魔導神機・ジュピトールのブレスレット No.10527"
        },
        {
          "id": "n13243",
          "role": "S",
          "assist": "ミルコのヒーロースーツ No.11061"
        },
        {
          "id": "n13462",
          "role": "S",
          "assist": "リズレットのビターチョコ No.10932"
        },
        {
          "id": "n13407",
          "role": "F",
          "assist": "遊びの空間・ジントニックの宝杯 No.13291"
        }
      ],
      "steps": [
        "25分くらいで周回（プレイ履歴は25分24秒・42ターン）",
        "とにかく毎回全力で回復4消しと光を消す",
        "7〜8階のルーレットパズルが少し面倒",
        "ギミック対応が間に合えばメタトロンとフリフェルは自由に使える",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2026250519233413471",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-02-24",
      "metrics": {
        "chars": 603,
        "puzzle": 8,
        "branch": 2,
        "caution": 10,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      },
      "yields": {
        "exp": 157500000
      }
    },
    {
      "id": "fuun-multi-reinhard-v1",
      "dungeonId": "fuun",
      "title": "ラインハルト編成（部位破壊9）",
      "multi": true,
      "timeSec": 867,
      "turns": 20,
      "estimated": [],
      "yields": {
        "exp": 144000000
      },
      "members": [
        {
          "id": "n13325",
          "role": "L",
          "p": "A",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n4207",
          "role": "S",
          "p": "A",
          "assist": "巴御前の強弓 No.12112"
        },
        {
          "id": "n13426",
          "role": "S",
          "p": "A",
          "assist": "日向のユニフォーム No.12280"
        },
        {
          "id": "n10439",
          "role": "S",
          "p": "A",
          "assist": "暗殺道具 No.10225"
        },
        {
          "id": "n9730",
          "role": "S",
          "p": "A",
          "assist": "溟海龍・グラシオスの首飾り No.10504"
        },
        {
          "id": "n13325",
          "role": "L",
          "p": "B",
          "assist": "リズレット＆エルシャのクリスマスプレゼント No.13156"
        },
        {
          "id": "n13483",
          "role": "S",
          "p": "B",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n13462",
          "role": "S",
          "p": "B",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "n13364",
          "role": "S",
          "p": "B",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "n13403",
          "role": "S",
          "p": "B",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        }
      ],
      "steps": [
        "協力プレイで14分27秒・20ターン（プレイ履歴より）",
        "Aは特に記載がない場合は無限パス",
        "Bは基本的にラインハルトを打って光1列＋回復4",
        "グラシオス武器はスキルLv1、他は全てスキルマ",
        "弱化目覚めを完封できていないので弱化に注意。回復花火された時の組み方は4枚目の画像",
        "ラインハルト・Zガンダムは変身前のNo.（変身後は13326・9731）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pandora_danna/status/2031962340535762961",
      "author": {
        "name": "旦那(￣▽￣;)"
      },
      "sourceDate": "2026-03-12",
      "metrics": {
        "chars": 389,
        "puzzle": 10,
        "branch": 1,
        "caution": 4,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "fuun-multi-reinhard-v2",
      "dungeonId": "fuun",
      "title": "ラインハルト編成 改良版（6Fブルッカ以外部位破壊）",
      "multi": true,
      "timeSec": 818,
      "turns": 20,
      "estimated": [],
      "yields": {
        "exp": 144000000
      },
      "members": [
        {
          "id": "n13325",
          "role": "L",
          "p": "A",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n13838",
          "role": "S",
          "p": "A",
          "assist": "ネモフィラの種子 No.13751"
        },
        {
          "id": "n13426",
          "role": "S",
          "p": "A",
          "assist": "暗殺道具 No.10225"
        },
        {
          "id": "n9730",
          "role": "S",
          "p": "A",
          "assist": "不死川実弥の日輪刀 No.12827"
        },
        {
          "id": "n10439",
          "role": "S",
          "p": "A",
          "assist": "日向のユニフォーム No.12280"
        },
        {
          "id": "n13325",
          "role": "L",
          "p": "B",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n13483",
          "role": "S",
          "p": "B",
          "assist": "アレキサンダーのティーセット No.13863"
        },
        {
          "id": "n13462",
          "role": "S",
          "p": "B",
          "assist": "科学部の怪異・ユラの弁当箱 No.13617"
        },
        {
          "id": "n13757",
          "role": "S",
          "p": "B",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n13403",
          "role": "S",
          "p": "B",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        }
      ],
      "steps": [
        "協力プレイで13分38秒・20ターン。最初の編成より圧倒的に快適",
        "乱入の部位破壊は5F乱入の場合しかできない（6F出現のブルッカだけ部位破壊不可）",
        "弱化目覚め完封（全ドロ強60以上）、紅茶覚醒×5で2wayでの消せない回復が不要",
        "ネモフィラの回復力3倍で回復を多めに消せば回復4消し不要。リューネシルヴィでの釘消しも不要",
        "Aは特に記載がない場合は無限パス、Bは基本ラインハルトを打って光1列＋回復4",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pandora_danna/status/2071195286941413466",
      "author": {
        "name": "旦那(￣▽￣;)"
      },
      "sourceDate": "2026-06-28",
      "metrics": {
        "chars": 352,
        "puzzle": 9,
        "branch": 1,
        "caution": 3,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "tenkyu-dain-oreha-v2",
      "dungeonId": "tenkyu",
      "title": "ダイン×ダイアモス 全部位破壊＆部位破壊100%（改良版）",
      "timeSec": 714,
      "turns": 29,
      "estimated": [],
      "yields": {
        "exp": 224000000
      },
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "スザクの騎士証 No.11383"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "千本桜 No.14066"
        },
        {
          "id": "n14063",
          "role": "S",
          "assist": "脱出用ゴーレム No.13437"
        },
        {
          "id": "n14016",
          "role": "S",
          "assist": "雷神の玉 No.12407"
        },
        {
          "id": "n14010",
          "role": "S",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "千本桜 No.14066"
        }
      ],
      "steps": [
        "11分台〜12分台で周回（プレイ履歴は11分53秒・29ターン）。石田なしで組める。プラスはそこまで振らなくても大丈夫",
        "邪帯100%・封印完全耐性。基本は光T字＋1コンボ",
        "日番谷を使う時はイシス→日番谷→ダイアモスの順で必ず使う",
        "B3・B9・B13は初手セッカ推奨。乱入は基本3パン",
        "B15ボス半分までは水全体攻撃を含めない",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/orehaoredaMD1/status/2098954184670462270",
      "author": {
        "name": "orehaoreda"
      },
      "sourceDate": "2026-09-13",
      "metrics": {
        "chars": 326,
        "puzzle": 6,
        "branch": 2,
        "caution": 1,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "tenkyu-dain-hani",
      "dungeonId": "tenkyu",
      "title": "ダイン×ダイアモス（ミナカで落ちコン防止）",
      "timeSec": 658,
      "turns": 32,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "n14010",
          "role": "S",
          "assist": "霊妙鍵の装具・霊泉の薙刀 No.13510"
        },
        {
          "id": "n14038",
          "role": "S",
          "assist": "アルティメットまどかの弓＆ダークオーブ No.13888"
        },
        {
          "id": "n9066",
          "role": "S",
          "assist": "クロトビの宝杯 No.10951"
        },
        {
          "id": "n14055",
          "role": "S",
          "assist": "雷神の玉 No.12407"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "『龍剣』レイド No.13327"
        }
      ],
      "steps": [
        "10分57秒・32ターン（プレイ履歴より）",
        "ミナカで落ちコン事故を防止",
        "光軽減+14、光軽減1。基本は光T字。夜一とダイアモスの打つ順番は盤面次第で変更",
        "11F以降、夜一と石田は基本ループ（15F⑥に合わせる）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/ha_ni911/status/2095533907227849160",
      "author": {
        "name": "はに"
      },
      "sourceDate": "2026-09-03",
      "metrics": {
        "chars": 930,
        "puzzle": 14,
        "branch": 0,
        "caution": 6,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "tenkyu-hitsugaya-frst",
      "dungeonId": "tenkyu",
      "title": "日番谷×日番谷",
      "timeSec": 657,
      "turns": 29,
      "estimated": [],
      "yields": {
        "exp": 163200000
      },
      "members": [
        {
          "id": "hitsugaya",
          "role": "L",
          "assist": "新聞部の特命記者・猿飛佐助の学生証 No.7139"
        },
        {
          "id": "n14063",
          "role": "S",
          "assist": "熱血の龍喚士・エースのスクロール No.13955"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "聖片の花嫁・サフィーラの指輪 No.12602"
        },
        {
          "id": "n14107",
          "role": "S",
          "assist": "帝人の携帯電話 No.11292"
        },
        {
          "id": "n14107",
          "role": "S",
          "assist": "想海の師弟愛・ノルザ＆マールのショコラ No.13388"
        },
        {
          "id": "hitsugaya",
          "role": "F",
          "assist": "波遊び天鬼姫・風神のうちわ No.7589"
        }
      ],
      "steps": [
        "最速で10分台（プレイ履歴は10分56秒・29ターン）",
        "スペディオル1のみスキルLv1",
        "道中の部位破壊なしでもクリアはできる“はず”（未確定）",
        "6F乱入／8F乱入で分岐。12F以降はブレが激しいので理想ムーブ＋要所解説",
        "アシストのNo.は画像が小さく、4つは候補からアイコンで判断（7139・13955・12602・7589）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/frstgw/status/2098593508491923906",
      "author": {
        "name": "フロストハーピー娘"
      },
      "sourceDate": "2026-09-12",
      "metrics": {
        "chars": 757,
        "puzzle": 4,
        "branch": 9,
        "caution": 2,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "tenkyu-dain-oreha-sekka",
      "dungeonId": "tenkyu",
      "title": "ダイン×ダイアモス セッカ入り（石田・さやか武器なし）",
      "timeSec": 944,
      "turns": 33,
      "estimated": [],
      "yields": {
        "exp": 224000000
      },
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "スザクの騎士証 No.11383"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "千本桜 No.14066"
        },
        {
          "id": "n14063",
          "role": "S",
          "assist": "脱出用ゴーレム No.13437"
        },
        {
          "id": "n14016",
          "role": "S",
          "assist": "星砕の凶兆龍・ゼンチョウガのブレスレット No.11550"
        },
        {
          "id": "n14010",
          "role": "S",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "ダイヤ龍・ダイアモスのトランプ No.14114"
        }
      ],
      "steps": [
        "15分台で全部位破壊＆部位破壊100%（プレイ履歴は15分44秒・33ターン）",
        "石田とさやか武器を持っていない人向け。HPに余裕があるので武器は色々代用できる",
        "基本は光T字＋1コンボ。日番谷使用時はイシス→日番谷→ダイアモスの順",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/orehaoredaMD1/status/2097886456610275701",
      "author": {
        "name": "orehaoreda"
      },
      "sourceDate": "2026-09-10",
      "metrics": {
        "chars": 311,
        "puzzle": 6,
        "branch": 2,
        "caution": 1,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "tenkyu-ichigo-jakusha",
      "dungeonId": "tenkyu",
      "title": "黒崎一護 全部位破壊",
      "timeSec": 902,
      "turns": 37,
      "estimated": [],
      "yields": {
        "exp": 252000000
      },
      "members": [
        {
          "id": "n14035",
          "role": "L",
          "assist": "Zi-アポロの起動キー No.13971"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "栗花落カナヲの日輪刀 No.10859"
        },
        {
          "id": "n14076",
          "role": "S",
          "assist": "科学部の怪異・ユラの弁当箱 No.13617"
        },
        {
          "id": "n14032",
          "role": "S",
          "assist": "リズレット＆エルシャのクリスマスプレゼント No.13156"
        },
        {
          "id": "n14076",
          "role": "S",
          "assist": "織姫のヘアピン No.14029"
        },
        {
          "id": "n14043",
          "role": "F",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        }
      ],
      "steps": [
        "15分01秒・37ターン（プレイ履歴より）",
        "武器・潜在は耐久が足りれば何でも可（弱化目覚めは返した方が強い）",
        "一護が余っていたら武器にして藍染以外に付けると強い",
        "耐久ができないので、敵を倒すとターン調整できない場面がある。6F〜10F・12F〜14Fは乱入・敵ごとに細かく分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/nRXXSsgMY05794/status/2096914633047339199",
      "author": {
        "name": "弱者男性"
      },
      "sourceDate": "2026-09-07",
      "metrics": {
        "chars": 826,
        "puzzle": 4,
        "branch": 10,
        "caution": 8,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "tenkyu-challenge-dain-pmaru",
      "dungeonId": "tenkyu",
      "title": "ダイン×ダイアモス 全部位破壊（フェルン・雨竜入り）",
      "timeSec": 905,
      "turns": 37,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "戦馬の支援機・スティード No.11458"
        },
        {
          "id": "n14010",
          "role": "S",
          "assist": "ゾッダ虫 No.13334"
        },
        {
          "id": "n14038",
          "role": "S",
          "assist": "ケリ姫＆飛行士の写真 No.11866"
        },
        {
          "id": "n9087",
          "role": "S",
          "assist": "雷神の玉 No.12407"
        },
        {
          "id": "n13416",
          "role": "S",
          "assist": "『龍剣』レイド No.13327"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "命天龍のソウル No.11578"
        }
      ],
      "steps": [
        "14分台が出ることも（プレイ履歴は15分04秒・37ターン）",
        "基本は光T字＋光1セット。ゼルクレアはスキルLvマックス",
        "6〜8Fは乱入時に雨竜を9Fまで温存。9Fはダイン温存。15Fは半分までセッカ温存",
        "代用は聞かれても答えられないとのこと",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/P_maru_pad/status/2093410956416258536",
      "author": {
        "name": "ぴぃまる。"
      },
      "sourceDate": "2026-08-28",
      "metrics": {
        "chars": 704,
        "puzzle": 17,
        "branch": 6,
        "caution": 0,
        "zurashi": 8,
        "plus891": 0.67,
        "plus891Text": null
      }
    },
    {
      "id": "tenkyu-dain-amami",
      "dungeonId": "tenkyu",
      "title": "ダイン×ダイアモス 部位確定ドロップ（一護織姫入り）",
      "timeSec": 818,
      "turns": 35,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "千本桜 No.14066"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "GS-3305 No.12921"
        },
        {
          "id": "n14063",
          "role": "S",
          "assist": "ジェントルの紅茶 No.13224"
        },
        {
          "id": "n14016",
          "role": "S",
          "assist": "たまのネジ No.13717"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "ダイヤ龍・ダイアモスのトランプ No.14114"
        }
      ],
      "steps": [
        "14分前後（プレイ履歴は13分37秒・35ターン）。オーガちゃんねるさんの編成のアレンジ",
        "基本はT字＋1コンボのみ",
        "敵の行動次第で平子が使えず耐久が必要になるので、6F以降は基本の立ち回り",
        "4F以降はイシス・日番谷・ダインをループ、13F以降は一護ループ",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/nenndou_opi/status/2098694854889128195",
      "author": {
        "name": "あまみ"
      },
      "sourceDate": "2026-09-12",
      "metrics": {
        "chars": 574,
        "puzzle": 11,
        "branch": 3,
        "caution": 1,
        "zurashi": 1,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "tenkyu-unicus-schwarze",
      "dungeonId": "tenkyu",
      "title": "アイマス #UNICUS ヘイストループ（耐久）",
      "timeSec": 1650,
      "turns": 35,
      "estimated": [],
      "yields": {
        "exp": 257040000
      },
      "members": [
        {
          "id": "n14149",
          "role": "L",
          "assist": "グリーフシード No.13890"
        },
        {
          "id": "n14149",
          "role": "S",
          "assist": "イルミナのお手製クッキー No.13853"
        },
        {
          "id": "n14149",
          "role": "S",
          "assist": "炎翔神・ミニほるすのノート No.13535"
        },
        {
          "id": "n13559",
          "role": "S",
          "assist": "戦馬の支援機・スティード No.11458"
        },
        {
          "id": "n13581",
          "role": "S",
          "assist": "鎌鼬の式札 No.10047"
        },
        {
          "id": "n13904",
          "role": "F",
          "assist": "神罰の審理者・ミニめたとろんのノート No.13542"
        }
      ],
      "steps": [
        "27分30秒・35ターン（プレイ履歴より）。熟成発動後は常時6500万ダメージを耐久できる",
        "ループするバフ: 無効貫通、ダメージ吸収・属性吸収無効、覚醒無効回復、ダメージ上限5100億、ドロップ生成、シールド破壊、7×6盤面、ルーレット、最大HP1.5倍、40%軽減、エンハンス",
        "開幕のスキル順（リーダー側から何番目）: 6 5 1 2 1 3 2 6 1 5 4 3 1 2",
        "注意: アシスト無効時の封印耐性60%、固定1300万ダメージ、ドロ強30%。スキル1巡目はほむらが早く溜まるので間違えない",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/schwarze_3010/status/2104138914089128267",
      "author": {
        "name": "シュバル⁂Vtuber"
      },
      "sourceDate": "2026-09-27",
      "metrics": {
        "chars": 315,
        "puzzle": 0,
        "branch": 0,
        "caution": 2,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "guren-unicus-schwarze",
      "dungeonId": "guren",
      "title": "アイマス #UNICUS ヘイストループ（耐久）",
      "timeSec": 1552,
      "turns": 30,
      "estimated": [],
      "members": [
        {
          "id": "n14149",
          "role": "L",
          "assist": "グリーフシード No.13890"
        },
        {
          "id": "n14149",
          "role": "S",
          "assist": "イルミナのお手製クッキー No.13853"
        },
        {
          "id": "n14149",
          "role": "S",
          "assist": "炎翔神・ミニほるすのノート No.13535"
        },
        {
          "id": "n13559",
          "role": "S",
          "assist": "戦馬の支援機・スティード No.11458"
        },
        {
          "id": "n13581",
          "role": "S",
          "assist": "鎌鼬の式札 No.10047"
        },
        {
          "id": "n13904",
          "role": "F",
          "assist": "神罰の審理者・ミニめたとろんのノート No.13542"
        }
      ],
      "steps": [
        "25分52秒・30ターン（プレイ履歴より）。熟成パの天敵・紅蓮のアニマも破壊可能",
        "天穹と同じ編成・同じスキル回し（天穹版の立ち回りを参照）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/schwarze_3010/status/2104138914089128267",
      "author": {
        "name": "シュバル⁂Vtuber"
      },
      "sourceDate": "2026-09-27",
      "yields": {
        "exp": 176715000
      },
      "metrics": {
        "chars": 315,
        "puzzle": 0,
        "branch": 0,
        "caution": 2,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "tenkyu-challenge-dain-malabolo",
      "dungeonId": "tenkyu",
      "title": "ダイン×ダイアモス 全部位破壊（鳴海入り）",
      "timeSec": 885,
      "turns": 35,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "ダイヤ龍・ダイアモスのトランプ No.14114"
        },
        {
          "id": "n14055",
          "role": "S",
          "assist": "雷神の玉 No.12407"
        },
        {
          "id": "n14038",
          "role": "S",
          "assist": "ケリ姫＆飛行士の写真 No.11866"
        },
        {
          "id": "n12907",
          "role": "S",
          "assist": "想海の師弟愛・ノルザ＆マールのショコラ No.13388"
        },
        {
          "id": "n13462",
          "role": "S",
          "assist": "命古神・ブレイブXゴッドの宝剣 No.13944"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "ヒトヨタケの胞子 No.13739"
        }
      ],
      "steps": [
        "14分台（プレイ履歴は14分44秒・35ターン）",
        "基本的にダイアモスは毎ターン使う。スキルの使用順がある時のみ記載",
        "6F乱入／8F乱入、9Fの敵（紫／黄）で分岐",
        "15F④と⑤は1発は14コンボ以下、1発は14コンボ以上にする",
        "プレイ履歴の経験値4億4,800万は経験値アップ中の値と思われるので未反映",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/malabolo_pad/status/2093958777842344098",
      "author": {
        "name": "まぁぼぉ🫧"
      },
      "sourceDate": "2026-08-30",
      "metrics": {
        "chars": 585,
        "puzzle": 5,
        "branch": 4,
        "caution": 2,
        "zurashi": 3,
        "plus891": 0,
        "plus891Text": null
      },
      "yields": {
        "exp": 448000000
      }
    },
    {
      "id": "tenkyu-dain-ogach",
      "dungeonId": "tenkyu",
      "title": "ダイン×ダイアモス with日番谷（891不要）",
      "timeSec": 800,
      "turns": 36,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "戦馬の支援機・スティード No.11458"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "深愛の新郎・明智光秀の指輪 No.7397"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "一文字 No.14089"
        },
        {
          "id": "n14063",
          "role": "S",
          "assist": "シャオチューフの酒壺 No.12618"
        },
        {
          "id": "n14016",
          "role": "S",
          "assist": "無一郎と蜜璃の鎹鴉 No.12817"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "聖天龍のソウル No.11576"
        }
      ],
      "steps": [
        "常時5000億。+891不要、アシスト易しめ（プレイ履歴は13分20秒・36ターン）",
        "日番谷の属性相性無視3000億ループが強い。T字パズルと虚無以外は楽しい",
        "B1: 日番谷→一護織姫1→シャオチューフ→ダイアモス→ダイン→日番谷→一護織姫2→平子→無一郎→ダイアモス",
        "以降イシス・日番谷・ダインはループ。平子・ダイアモスはターンの最後に使う",
        "B15は殴るだけ。14コンボ吸収に引っ掛ければ部位全破壊可能",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/h_ppon/status/2095803343461560748",
      "author": {
        "name": "オーガch.@パズドラまとめブログ"
      },
      "sourceDate": "2026-09-04",
      "metrics": {
        "chars": 560,
        "puzzle": 8,
        "branch": 0,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": "not-required"
      }
    },
    {
      "id": "guren-dain-run-v2",
      "dungeonId": "guren",
      "title": "ダイン×ダイアモス 全部位破壊（改良版）",
      "timeSec": 694,
      "turns": 29,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "スザクの騎士証 No.11383"
        },
        {
          "id": "n13550",
          "role": "S",
          "assist": "霊妙鍵の装具・霊泉の薙刀 No.13510"
        },
        {
          "id": "n12377",
          "role": "S",
          "assist": "フリーレンの杖 No.13411"
        },
        {
          "id": "n2390",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "liltotto",
          "role": "S",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "雷神の玉 No.12407"
        }
      ],
      "steps": [
        "最短29ターン（プレイ履歴は11分33秒・29ターン）",
        "1F: リルトット裏→ダイアモス裏→ダイン変身→クチナ変身→リルトット→ヴェルダンディ裏→ダイン→服部変身→ダイアモス（+光1コンボ）",
        "5F・6Fは乱入の有無で分岐。10Fは必ず回復を追い打ち1つ",
        "ボスの行動による変化: 無効貫通切れは気にせず削る／超根性前に攻撃力デバフで服部で返せない時は毎ターン全力コンボ／光吸収は防御力アップ中なら削る／攻撃力デバフ3回以上ならヴェルダンディが溜まるのを待つ",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/rune3939/status/2100058647762288693",
      "author": {
        "name": "Run"
      },
      "sourceDate": "2026-09-16",
      "metrics": {
        "chars": 855,
        "puzzle": 12,
        "branch": 2,
        "caution": 2,
        "zurashi": 0,
        "plus891": 0.4,
        "plus891Text": null
      }
    },
    {
      "id": "guren-dain-kinoko",
      "dungeonId": "guren",
      "title": "ダイン 石田雨竜入り 全部位破壊",
      "timeSec": 708,
      "turns": 31,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "戦馬の支援機・スティード No.11458"
        },
        {
          "id": "n14010",
          "role": "S",
          "assist": "ゾッダ虫 No.13334"
        },
        {
          "id": "n13136",
          "role": "S",
          "assist": "極醒の裁秤神・エスカマリのティアラ No.7658"
        },
        {
          "id": "n14038",
          "role": "S",
          "assist": "ケリ姫＆飛行士の写真 No.11866"
        },
        {
          "id": "n13416",
          "role": "S",
          "assist": "Can't stop twinkling.のサポートアイテム No.13232"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "命天龍のソウル No.11578"
        }
      ],
      "steps": [
        "高速モードで大体11〜12分（プレイ履歴は11分47秒・31ターン）",
        "L字も組んでセッカの火力を使いつつクリアターンを短くする",
        "石田雨竜は+300でも行けるが+891の方が安心",
        "フェルンのスキルLv1、フェルン（裏）はMAX",
        "3Fでフェルンは5Fまで温存。8F以降10Fまでフェルン温存。12Fで光吸収を引いたら2ターンずらし耐久",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/kinoko_pazz/status/2093908491035619379",
      "author": {
        "name": "きのこ@パズドラ"
      },
      "sourceDate": "2026-08-30",
      "metrics": {
        "chars": 811,
        "puzzle": 31,
        "branch": 6,
        "caution": 7,
        "zurashi": 2,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "guren-hitsugaya-jones",
      "dungeonId": "guren",
      "title": "日番谷×イズナ2積み",
      "timeSec": 769,
      "turns": 33,
      "estimated": [],
      "yields": {
        "exp": 115500000
      },
      "members": [
        {
          "id": "hitsugaya",
          "role": "L",
          "assist": "ウッソ・エヴィン No.12186"
        },
        {
          "id": "izuna",
          "role": "S",
          "assist": "遊びの空間・クロトビの宝杯 No.13290"
        },
        {
          "id": "n7327",
          "role": "S",
          "assist": "ナツル＆ミリアのティアラ No.11329"
        },
        {
          "id": "n13866",
          "role": "S",
          "assist": "ヤマトのデジヴァイス No.11725"
        },
        {
          "id": "izuna",
          "role": "S",
          "assist": "死天龍・アークヴェルザのブレスレット No.11213"
        },
        {
          "id": "hitsugaya",
          "role": "F",
          "assist": "バレンタインの星海神・アンドロメダのショコラ No.8382"
        }
      ],
      "steps": [
        "高速モードで12分台の全部位破壊（プレイ履歴は12分49秒・33ターン）",
        "ドロ強は闇以外100%、闇も60%で安定感あり。+891はなくてもいいかも",
        "イズナ1・日番谷1→ナツル→イズナ2・日番谷2でループ。アシスト無効はL字を1〜2個組んで返す",
        "5F乱入／6F乱入で分岐。12Fは2ターン目左盾タゲ、4ターン目真ん中本体タゲで水単体攻撃",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/jonepuzzle/status/2098599145288478829",
      "author": {
        "name": "ジョネス"
      },
      "sourceDate": "2026-09-12",
      "metrics": {
        "chars": 434,
        "puzzle": 5,
        "branch": 2,
        "caution": 4,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": "not-required"
      }
    },
    {
      "id": "guren-dain-run-v1",
      "dungeonId": "guren",
      "title": "ダイン×ダイアモス（ザイラスワンパン）",
      "timeSec": 748,
      "turns": 31,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "スザクの騎士証 No.11383"
        },
        {
          "id": "n13550",
          "role": "S",
          "assist": "千本桜 No.14066"
        },
        {
          "id": "n12377",
          "role": "S",
          "assist": "神威の衣装 No.13723"
        },
        {
          "id": "n2390",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "liltotto",
          "role": "S",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "雷神の玉 No.12407"
        }
      ],
      "steps": [
        "高速モードで12分〜（プレイ履歴は12分28秒・31ターン）",
        "ザイラスはワンパン、変身前ボスはシールド含め2パン",
        "基本T字1コンボでいいので気楽に周回できる。ボスのランダム行動でたまにグダる",
        "同じ作者の改良版（29ターン）もあり",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/rune3939/status/2099856406275104893",
      "author": {
        "name": "Run"
      },
      "sourceDate": "2026-09-15",
      "metrics": {
        "chars": 757,
        "puzzle": 16,
        "branch": 3,
        "caution": 5,
        "zurashi": 0,
        "plus891": 0.5,
        "plus891Text": null
      },
      "yields": {
        "exp": 323400000
      }
    },
    {
      "id": "guren-shiva-underbar",
      "dungeonId": "guren",
      "title": "シヴァ×セイハーツ 約9割全部位破壊",
      "timeSec": 700,
      "turns": 33,
      "estimated": [],
      "members": [
        {
          "id": "n13916",
          "role": "L",
          "assist": "科学部の怪異・ユラの弁当箱 No.13617"
        },
        {
          "id": "n14080",
          "role": "S",
          "assist": "ひとり読書の地王神・クロノスの弁当箱 No.13619"
        },
        {
          "id": "n13998",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "織姫のヘアピン No.14029"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "放課後の寄り道・ユリシャ＆アリーシアの弁当箱 No.13604"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "放課後の寄り道・ユリシャ＆アリーシアの弁当箱 No.13604"
        }
      ],
      "steps": [
        "11分39秒・33ターン（プレイ履歴より）。セイハーツループ、全員+891必須",
        "ボス2のランダム行動のダメージ無効に合わせてリジェを使うので、無効が来ないと壊せない（約9割）",
        "1Fは自力パズルで火列と回復。4Fでコンボ無効にかかったら分岐",
        "画像が小さいためNo.は読み取りを図鑑と立ち回りのキャラ名で照合済み",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/iwTDcjJkdsZ1qDT/status/2098242675967410374",
      "author": {
        "name": "アンダーバー"
      },
      "sourceDate": "2026-09-11",
      "metrics": {
        "chars": 658,
        "puzzle": 14,
        "branch": 4,
        "caution": 7,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": "required"
      }
    },
    {
      "id": "taiju-dain-matsu-v1",
      "dungeonId": "taiju",
      "title": "ダイン×ダイアモス 部位破壊（全ワンパン）",
      "timeSec": 592,
      "turns": 28,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "n12972",
          "role": "S",
          "assist": "霊妙鍵の装具・霊泉の薙刀 No.13510"
        },
        {
          "id": "n12558",
          "role": "S",
          "assist": "仮装祭の魔女・チャコルのキャンディ No.7961"
        },
        {
          "id": "liltotto",
          "role": "S",
          "assist": "雷神の玉 No.12407"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        }
      ],
      "steps": [
        "9分52秒・28ターン（プレイ履歴より）",
        "ボス前まで乱入リータも含めて全部ワンパン火力で吹き飛ばす",
        "潜在の水軽減は多いほどいい",
        "同じ作者の確定版（8分53秒）もあり",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/matsuda____/status/2094781105551630678",
      "author": {
        "name": "まつりーた"
      },
      "sourceDate": "2026-09-01",
      "metrics": {
        "chars": 505,
        "puzzle": 0,
        "branch": 3,
        "caution": 0,
        "zurashi": 7,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "taiju-dain-nanaminn",
      "dungeonId": "taiju",
      "title": "ダイン×ダイアモス 部位破壊100%（全階層ワンパン）",
      "timeSec": 516,
      "turns": 21,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "Bros No.13200"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "n11371",
          "role": "S",
          "assist": "雷神の玉 No.12407"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n13708",
          "role": "S",
          "assist": "魔導書ネクロノミコン No.12980"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "スザクの騎士証 No.11383"
        }
      ],
      "steps": [
        "慣れたら8分半〜9分（プレイ履歴は8分36秒・21ターン）。道中足踏みなしの全階層ワンパン",
        "指定のないところは光Tのみ、+は光T+αで組む。全員+891の方が安定",
        "（ダイアモス）のところは盤面に光5あれば使わなくてもいい",
        "7F乱入／8F乱入で分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2104124707834671565",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-09-27",
      "metrics": {
        "chars": 533,
        "puzzle": 10,
        "branch": 2,
        "caution": 2,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": "required"
      },
      "yields": {
        "exp": 441000000
      }
    },
    {
      "id": "taiju-suzaku-nanaminn",
      "dungeonId": "taiju",
      "title": "スザク×サクヤアッシュ ずらし（35T確定）",
      "timeSec": 1093,
      "turns": 35,
      "estimated": [],
      "yields": {
        "exp": 157500000
      },
      "members": [
        {
          "id": "n13999",
          "role": "L",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n13964",
          "role": "S",
          "assist": "九兵衛の刀 No.13711"
        },
        {
          "id": "n12804",
          "role": "S",
          "assist": "トメノスケ・ヒート・ホーク No.12176"
        },
        {
          "id": "n13305",
          "role": "S",
          "assist": "新型フレイヤ・エリミネーター No.13965"
        },
        {
          "id": "n12279",
          "role": "S",
          "assist": "黒鉄の銀機士・クラウディアのブレスレット No.12127"
        },
        {
          "id": "n13964",
          "role": "F",
          "assist": "柳蔭の宝杯 No.12652"
        }
      ],
      "steps": [
        "1周18分程度、確定35ターン（プレイ履歴は18分12秒）",
        "基本溜まったスキルを全部使うだけ",
        "1Fで日向が変身できないことがあるので、あくまでネタ編成とのこと",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2080608152454893856",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-07-24",
      "metrics": {
        "chars": 879,
        "puzzle": 8,
        "branch": 0,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "taiju-dain-matsu-final",
      "dungeonId": "taiju",
      "title": "ダイン×ダイアモス 部位破壊（確定版）",
      "timeSec": 534,
      "estimated": [],
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "n12972",
          "role": "S",
          "assist": "霊妙鍵の装具・霊泉の薙刀 No.13510"
        },
        {
          "id": "n12558",
          "role": "S",
          "assist": "防衛隊のスーツ No.12904"
        },
        {
          "id": "liltotto",
          "role": "S",
          "assist": "雷神の玉 No.12407"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        }
      ],
      "steps": [
        "8分53秒（画像タイトルより）。編成・立ち回り確定版",
        "同じ編成の旧版（9分18秒・26ターン）: https://x.com/matsuda____/status/2094963925360222402",
        "ダイアモスを打たなくていいところを記載。最後のリルトットのターンを変更し、リルトットを使うターンは棘をだいぶ触ってよくなった",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/matsuda____/status/2095703714468389297",
      "author": {
        "name": "まつりーた"
      },
      "sourceDate": "2026-09-04",
      "metrics": {
        "chars": 903,
        "puzzle": 1,
        "branch": 3,
        "caution": 1,
        "zurashi": 5,
        "plus891": 0,
        "plus891Text": null
      },
      "turns": 26
    },
    {
      "id": "taiju-heartia-frst",
      "dungeonId": "taiju",
      "title": "ハーティア×セイハーツ 全部位破壊（ずらし多め）",
      "timeSec": 599,
      "turns": 29,
      "estimated": [],
      "yields": {
        "exp": 210000000
      },
      "members": [
        {
          "id": "n14101",
          "role": "L",
          "assist": "チューリップの標本 No.12447"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "勇気のデジメンタル No.13088"
        },
        {
          "id": "n12946",
          "role": "S",
          "assist": "冨岡義勇の日輪刀 No.10857"
        },
        {
          "id": "izuna",
          "role": "S",
          "assist": "清らかな花嫁・ハクの指輪 No.13815"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "勇気のデジメンタル No.13088"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "Dフェニックスの起動キー No.14136"
        }
      ],
      "steps": [
        "最速9分台（プレイ履歴は9分58秒・29ターン）。基本ずらし",
        "13Fで青の場合は回復4つ消し＋α（配置図あり）",
        "7F乱入／8F乱入で分岐",
        "画像が小さいため、フレンドのアシストのNo.は読み取りに自信なし（Dフェニックスの起動キーと判断）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/frstgw/status/2103417457809805345",
      "author": {
        "name": "フロストハーピー娘"
      },
      "sourceDate": "2026-09-25",
      "metrics": {
        "chars": 550,
        "puzzle": 6,
        "branch": 3,
        "caution": 2,
        "zurashi": 1,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "taiju-suzaku-matsu",
      "dungeonId": "taiju",
      "title": "スザク×サクヤアッシュ 部位9部位破壊（ほぼずらし）",
      "timeSec": 1180,
      "turns": 36,
      "estimated": [],
      "yields": {
        "exp": 157500000
      },
      "members": [
        {
          "id": "n13999",
          "role": "L",
          "assist": "遊びの空間・ジントニックの宝杯 No.13291"
        },
        {
          "id": "n12804",
          "role": "S",
          "assist": "新型フレイヤ・エリミネーター No.13965"
        },
        {
          "id": "n12279",
          "role": "S",
          "assist": "屋台巡りの魔帽子・ランヴィ＆オム No.12736"
        },
        {
          "id": "n13305",
          "role": "S",
          "assist": "Zi-アポロの起動キー No.13971"
        },
        {
          "id": "n13964",
          "role": "S",
          "assist": "Zi-アポロの起動キー No.13971"
        },
        {
          "id": "n13964",
          "role": "F",
          "assist": "Zi-アポロの起動キー No.13971"
        }
      ],
      "steps": [
        "19分40秒・36ターン（プレイ履歴より）。ほぼずらし。動画のテロップで解説あり",
        "ドロ強の水欠け、猛毒落下耐性なし。それでもいい人向け",
        "闇列＋闇3消しでフルカンスト。13F回復激減時のみ猛毒オチコン3連続まで許容",
        "プラスは最低限振る。オール891が理想",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/matsuda____/status/2083352078089617674",
      "author": {
        "name": "まつりーた"
      },
      "sourceDate": "2026-08-01",
      "metrics": {
        "chars": 689,
        "puzzle": 12,
        "branch": 7,
        "caution": 0,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": "required"
      }
    },
    {
      "id": "taiju-challenge-morgan",
      "dungeonId": "taiju",
      "title": "モルガン（紅茶覚醒5）",
      "timeSec": 1022,
      "turns": 40,
      "estimated": [],
      "members": [
        {
          "id": "n13929",
          "role": "L",
          "assist": "イルミナのお手製クッキー No.13853"
        },
        {
          "id": "n13828",
          "role": "S",
          "assist": "黒薔薇の標本 No.12440"
        },
        {
          "id": "n13724",
          "role": "S",
          "assist": "科学部の怪異・ユラの弁当箱 No.13617"
        },
        {
          "id": "n13923",
          "role": "S",
          "assist": "九兵衛の刀 No.13711"
        },
        {
          "id": "n13924",
          "role": "S",
          "assist": "ネモフィラの種子 No.13751"
        },
        {
          "id": "n13929",
          "role": "F",
          "assist": "ファスカのティーセット No.13847"
        }
      ],
      "steps": [
        "17分02秒・40ターン（プレイ履歴より）",
        "ラインハルトの列と朧のリジェネの手軽さを併せ持つ闇リーダー。紅茶覚醒5個で棘も安心",
        "モルガンはスキルLv1。モルガンループ→闇列＋お邪魔（ネモフィラが切れた後はコンボ数注意）",
        "1Fでイルミナ武器の後に1コンボを2回挟むと7F乱入時の落ちコン事故を防げる",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/nekopazznisei/status/2073324318696878243",
      "author": {
        "name": "ねこまる"
      },
      "sourceDate": "2026-07-04",
      "metrics": {
        "chars": 660,
        "puzzle": 12,
        "branch": 7,
        "caution": 4,
        "zurashi": 0,
        "plus891": 0.25,
        "plus891Text": null
      },
      "yields": {
        "exp": 308700000
      }
    },
    {
      "id": "taiju-rose-nekomaru",
      "dungeonId": "taiju",
      "title": "ロゼ×ブレイブXゴッド（十字）",
      "timeSec": 1031,
      "turns": 40,
      "estimated": [],
      "yields": {
        "exp": 236250000
      },
      "members": [
        {
          "id": "n13967",
          "role": "L",
          "assist": "ダリアの球根 No.9979"
        },
        {
          "id": "n13838",
          "role": "S",
          "assist": "グリーフシード No.13890"
        },
        {
          "id": "n13860",
          "role": "S",
          "assist": "希望のデジメンタル No.13105"
        },
        {
          "id": "n13945",
          "role": "S",
          "assist": "炎翔神・ミニほるすのノート No.13535"
        },
        {
          "id": "n13945",
          "role": "S",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "n13943",
          "role": "F",
          "assist": "イルミナの魔導書 No.7178"
        }
      ],
      "steps": [
        "17分11秒・40ターン（プレイ履歴より）",
        "Xドラゴンの横列生成と十字の相性が良く、ほぼパズルなしで攻略可能。カフェコンビで棘も完封",
        "Xドラゴンループ→十字。十字を組まずに耐久する時・回復激減・回復ドロ強がない時は必ず回復4つ消し",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/nekopazznisei/status/2083920979739496822",
      "author": {
        "name": "ねこまる"
      },
      "sourceDate": "2026-08-02",
      "metrics": {
        "chars": 622,
        "puzzle": 9,
        "branch": 7,
        "caution": 7,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "taiju-tanjiro-nanaminn",
      "dungeonId": "taiju",
      "title": "怪獣8号×炭治郎禰豆子 ずらし多め",
      "timeSec": 1013,
      "turns": 34,
      "estimated": [],
      "yields": {
        "exp": 204750000
      },
      "members": [
        {
          "id": "n12914",
          "role": "L",
          "assist": "ポピーの標本 No.13746"
        },
        {
          "id": "n12808",
          "role": "S",
          "assist": "霊妙鍵の装具・霊泉の薙刀 No.13510"
        },
        {
          "id": "n6549",
          "role": "S",
          "assist": "グリーフシード No.13890"
        },
        {
          "id": "n14012",
          "role": "S",
          "assist": "緋天龍のソウル No.11573"
        },
        {
          "id": "n12808",
          "role": "S",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "n14005",
          "role": "F",
          "assist": "エルフリーデの紅焔剣 No.9354"
        }
      ],
      "steps": [
        "1周16〜17分台（プレイ履歴は16分53秒・34ターン）。炭禰豆の最大値とのこと",
        "昔のキャラが多く耐久がカツカツなので+891必須",
        "指定のない限り火列＋回復列。1F以降、炭禰豆は1→2の順にループし、ミナカより先に使う",
        "炭禰豆とカフカ以外の3体を魔夏プラコロで育成できる編成も出典に掲載",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2086591636989997338",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-08-09",
      "metrics": {
        "chars": 719,
        "puzzle": 17,
        "branch": 6,
        "caution": 3,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": "required"
      }
    },
    {
      "id": "jupiter-shiva-kasajizo",
      "dungeonId": "jupiter",
      "title": "シヴァ×セイハーツ 全部位破壊（11F以外全ずらし）",
      "timeSec": 375,
      "turns": 17,
      "estimated": [],
      "members": [
        {
          "id": "n13916",
          "role": "L",
          "assist": "科学部の怪異・ユラの弁当箱 No.13617"
        },
        {
          "id": "n13998",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "n13116",
          "role": "S",
          "assist": "クラウディアの掃除機 No.13851"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "シャア・アズナブル（GQuuuuuuX） No.12239"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "シャア・アズナブル（GQuuuuuuX） No.12239"
        }
      ],
      "steps": [
        "高速モードで1周6分程度（プレイ履歴は6分15秒・17ターン）",
        "11Fの①（1コンボ）以外は全ずらし",
        "スキブ22、全キャラスキルマでOK。HPはボスの1020万ダメージを受けられる程度",
        "代用: ユラ装備⇔正月メタトロン装備、カフェクラウディア装備→5T継続の属性吸収武器（3Fエルゲヌビで追加1コンボ必要）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/kasajizo_pad/status/2095849147110920562",
      "author": {
        "name": "かさじぞう"
      },
      "sourceDate": "2026-09-04",
      "metrics": {
        "chars": 482,
        "puzzle": 1,
        "branch": 4,
        "caution": 2,
        "zurashi": 1,
        "plus891": 0,
        "plus891Text": null
      },
      "endorsedAlts": [
        {
          "target": 13617,
          "part": "assist",
          "nos": [
            13244
          ],
          "text": "ユラ装備と正月メタトロン装備は入れ替え可"
        },
        {
          "target": 13244,
          "part": "assist",
          "nos": [
            13617
          ],
          "text": "正月メタトロン装備とユラ装備は入れ替え可"
        },
        {
          "target": 13851,
          "part": "assist",
          "nos": [],
          "text": "カフェクラウディア装備の代わりに5ターン継続の属性吸収無効武器（3Fエルゲヌビで追加1コンボが必要）"
        }
      ]
    },
    {
      "id": "jupiter-hitsugaya-yamajun",
      "dungeonId": "jupiter",
      "title": "日番谷×スペディオル ほぼずらし全部位破壊",
      "timeSec": 387,
      "turns": 17,
      "estimated": [],
      "yields": {
        "plus": 3861,
        "exp": 70043400
      },
      "members": [
        {
          "id": "hitsugaya",
          "role": "L",
          "assist": "袖白雪 No.14052"
        },
        {
          "id": "n13116",
          "role": "S",
          "assist": "ロボット研究部・メノアの学生証 No.12357"
        },
        {
          "id": "n14095",
          "role": "S",
          "assist": "メニットのおみくじ道具 No.10873"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "奇怪冠の聖魔王・パイモンのキャンディ No.10646"
        },
        {
          "id": "n14107",
          "role": "S",
          "assist": "スペード龍・スペディオルのトランプ No.14108"
        },
        {
          "id": "n14107",
          "role": "F",
          "assist": "スペード龍・スペディオルのトランプ No.14108"
        }
      ],
      "steps": [
        "バッジ自由で最速6分半（プレイ履歴は6分26秒・17ターン）",
        "ひたすら水2コンボ。スキルを打つ順番は厳守",
        "7Fはルーレットを利用して全体を含む水の2コンボ",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2095049095039869250",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-09-02",
      "metrics": {
        "chars": 259,
        "puzzle": 4,
        "branch": 0,
        "caution": 3,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "jupiter-bambi-onsen",
      "dungeonId": "jupiter",
      "title": "バンビ×山本元柳斎 ほぼずらし（部位ボ7）",
      "timeSec": 510,
      "turns": 24,
      "estimated": [],
      "yields": {
        "exp": 65400000
      },
      "members": [
        {
          "id": "n14072",
          "role": "L",
          "assist": "神威の衣装 No.13723"
        },
        {
          "id": "n14040",
          "role": "S",
          "assist": "山本のユニフォーム No.12327"
        },
        {
          "id": "n12499",
          "role": "S",
          "assist": "戦魂獣・エンキドゥ＝クルのブローチ No.10198"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "ヒトヨタケの胞子 No.13739"
        },
        {
          "id": "n14088",
          "role": "S",
          "assist": "爆豪のサポートアイテム No.6303"
        },
        {
          "id": "n14040",
          "role": "F",
          "assist": "山本のユニフォーム No.12327"
        }
      ],
      "steps": [
        "高速モードでだいたい8分台（プレイ履歴は8分30秒・24ターン）。+297のみ、全部位破壊",
        "基本は山爺・バンビを撃ってずらし",
        "代用: ライル本体→ラント、旧爆豪→恋次など火共鳴で火列強×3と部位ボがある武器、山本ユニフォーム→リアナ武器（1枚まで）、ヒトヨタケ→部位ボがあるもの（最後の立ち回りが変わる）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/onsen_pad/status/2100963235910529271",
      "author": {
        "name": "おんせん♨️パズドラ"
      },
      "sourceDate": "2026-09-18",
      "metrics": {
        "chars": 583,
        "puzzle": 8,
        "branch": 7,
        "caution": 0,
        "zurashi": 1,
        "plus891": 0,
        "plus891Text": "not-required"
      },
      "endorsedAlts": [
        {
          "target": 12499,
          "part": "base",
          "nos": [
            13430
          ],
          "text": "ライル本体の代わりにラント"
        },
        {
          "target": 6303,
          "part": "assist",
          "nos": [
            14053
          ],
          "text": "旧爆豪の代わりに恋次など、火共鳴で火列強×3と部位ボがある武器"
        },
        {
          "target": 12327,
          "part": "assist",
          "nos": [],
          "text": "山本ユニフォームの代わりにリアナ武器（1枚まで）"
        },
        {
          "target": 13739,
          "part": "assist",
          "nos": [],
          "text": "ヒトヨタケの代わりに部位ボがある武器（最後の立ち回りが変わる）"
        }
      ]
    },
    {
      "id": "jupiter-shiva-pmaru",
      "dungeonId": "jupiter",
      "title": "シヴァ×セイハーツ 立ち回り分岐なし",
      "timeSec": 343,
      "turns": 16,
      "estimated": [],
      "members": [
        {
          "id": "n13916",
          "role": "L",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "hitsugaya",
          "role": "S",
          "assist": "セイナ専従の式神アゴウ No.12561"
        },
        {
          "id": "n7629",
          "role": "S",
          "assist": "冥境の黒熾龍・ゴウテンの櫛 No.10305"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "月の守護妖魔・セレナディアのブローチ No.13054"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "シャア・アズナブル（GQuuuuuuX） No.12239"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "シャア・アズナブル（GQuuuuuuX） No.12239"
        }
      ],
      "steps": [
        "5分42秒・16ターン（プレイ履歴より）。立ち回りの分岐なし",
        "代用はシヴァ裏、日番谷裏、一護織姫裏しかないとのこと",
        "11Fの①は日番谷→1コンボ",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/P_maru_pad/status/2100793367718416475",
      "author": {
        "name": "ぴぃまる。"
      },
      "sourceDate": "2026-09-18",
      "metrics": {
        "chars": 208,
        "puzzle": 1,
        "branch": 0,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0.75,
        "plus891Text": null
      }
    },
    {
      "id": "jupiter-seiheart-a",
      "dungeonId": "jupiter",
      "title": "セイハーツ×セイハーツ オズ入り 全ずらし",
      "timeSec": 347,
      "turns": 15,
      "estimated": [],
      "members": [
        {
          "id": "n14110",
          "role": "L",
          "assist": "ハート龍・セイハーツのトランプ No.14111"
        },
        {
          "id": "n13998",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n13931",
          "role": "S",
          "assist": "エリカの占星器 No.5561"
        },
        {
          "id": "n6415",
          "role": "S",
          "assist": "轟天の幻龍王・ゼローグ∞ -CORE-のブローチ No.7630"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "終焉の親子神・ロキ＆フェンリルのブレスレット No.13764"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "シャア・アズナブル（GQuuuuuuX） No.12239"
        }
      ],
      "steps": [
        "5分台（プレイ履歴は5分47秒・15ターン）。落ちコンなし、全ずらし、ノンストップ",
        "潜在は闇軽減+10個、水軽減+5個。フレンドの裏セイハーツはスキルLv1必須",
        "8Fは必ず一護2から打つ",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/jmtwmgmgjgmgjpm/status/2101380656605585778",
      "author": {
        "name": "あ"
      },
      "sourceDate": "2026-09-19",
      "metrics": {
        "chars": 244,
        "puzzle": 0,
        "branch": 0,
        "caution": 1,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "jupiter-heartia-momiji",
      "dungeonId": "jupiter",
      "title": "ハーティア×セイハーツ（部位を割らない代わりに速い）",
      "timeSec": 355,
      "turns": 16,
      "estimated": [],
      "yields": {
        "exp": 96138000
      },
      "members": [
        {
          "id": "n14101",
          "role": "L",
          "assist": "チューリップの標本 No.12447"
        },
        {
          "id": "n13998",
          "role": "S",
          "assist": "陶砲の聖炉神・ヘスティア No.5058"
        },
        {
          "id": "n6669",
          "role": "S",
          "assist": "キング・オブ・ハートの紋章 No.11129"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "シャア・アズナブル（GQuuuuuuX） No.12239"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "シャア・アズナブル（GQuuuuuuX） No.12239"
        }
      ],
      "steps": [
        "5分55秒・16ターン（プレイ履歴より）。部位は割らない代わりに速い",
        "5Fのほのあわを受けられるまでプラス・水軽減を盛る。カレン裏はスキルLv4、ハーティア裏はスキルLv1",
        "1〜6Fはずらし、7F以降は追加1コンボ",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/chicken_momiji/status/2095448446283166083",
      "author": {
        "name": "もみ～じ🐓"
      },
      "sourceDate": "2026-09-03",
      "metrics": {
        "chars": 345,
        "puzzle": 8,
        "branch": 0,
        "caution": 0,
        "zurashi": 8,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "jupiter-gintoki-yamajun",
      "dungeonId": "jupiter",
      "title": "神楽×銀さん ほぼずらし（部位破壊なし）",
      "timeSec": 441,
      "turns": 18,
      "estimated": [],
      "members": [
        {
          "id": "n13692",
          "role": "L",
          "assist": "チューリップの球根 No.12448"
        },
        {
          "id": "n13676",
          "role": "S",
          "assist": "緋天龍のソウル No.11573"
        },
        {
          "id": "n13085",
          "role": "S",
          "assist": "勇気のデジメンタル No.13088"
        },
        {
          "id": "n13193",
          "role": "S",
          "assist": "エンデヴァー人形 No.13185"
        },
        {
          "id": "n13681",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n13681",
          "role": "F",
          "assist": "渋谷凛のCD No.13570"
        }
      ],
      "steps": [
        "最速7分半切り（プレイ履歴は7分20秒・18ターン）",
        "部位破壊はしないので、ピィや潜在目当ての人向け。+891必須",
        "スキルを打つ順番を間違えないこと",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2049772148110332152",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-04-30",
      "metrics": {
        "chars": 330,
        "puzzle": 7,
        "branch": 2,
        "caution": 5,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": "required"
      }
    },
    {
      "id": "jupiter-ichigo-onsen",
      "dungeonId": "jupiter",
      "title": "一護×兵主部 完全部位破壊（部位ボ8）",
      "timeSec": 511,
      "turns": 25,
      "estimated": [],
      "yields": {
        "exp": 103005000
      },
      "members": [
        {
          "id": "n14034",
          "role": "L",
          "assist": "コーネリアの銃 No.11402"
        },
        {
          "id": "n14076",
          "role": "S",
          "assist": "ヒトヨタケの胞子 No.13739"
        },
        {
          "id": "n14067",
          "role": "S",
          "assist": "SW-2033 No.12926"
        },
        {
          "id": "n14076",
          "role": "S",
          "assist": "月詠のクナイ No.13709"
        },
        {
          "id": "n13828",
          "role": "S",
          "assist": "バンビエッタのサーベル No.14073"
        },
        {
          "id": "n14088",
          "role": "F",
          "assist": "マミのマスケット銃 No.13899"
        }
      ],
      "steps": [
        "高速モードでだいたい8〜9分（プレイ履歴は8分31秒・25ターン）。+297のみ",
        "基本はジゼル→闇ドロ1個をずらして4つ消し。複雑なスキル回しなし",
        "一護をいつでも使えるよう盤面真ん中に闇3個を確保。日番谷と一護は溜まり次第ループ（一護は盤面に闇8個ある時に）",
        "B3・7・10は日番谷が溜まっても使わない",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/onsen_pad/status/2103881911584293048",
      "author": {
        "name": "おんせん♨️パズドラ"
      },
      "sourceDate": "2026-09-26",
      "metrics": {
        "chars": 784,
        "puzzle": 5,
        "branch": 13,
        "caution": 8,
        "zurashi": 2,
        "plus891": 0,
        "plus891Text": "not-required"
      }
    },
    {
      "id": "jupiter-rosetta-rikopin",
      "dungeonId": "jupiter",
      "title": "ロゼッタ（回復力重視）",
      "timeSec": 635,
      "turns": 31,
      "estimated": [],
      "members": [
        {
          "id": "n12439",
          "role": "L",
          "assist": "死天龍のソウル No.11579"
        },
        {
          "id": "n12298",
          "role": "S",
          "assist": "始祖リリンのカード No.11856"
        },
        {
          "id": "n12450",
          "role": "S",
          "assist": "黒薔薇の種子 No.12441"
        },
        {
          "id": "n11137",
          "role": "S",
          "assist": "カルトの扇子 No.10899"
        },
        {
          "id": "n12439",
          "role": "S",
          "assist": "死天龍のソウル No.11579"
        },
        {
          "id": "n12439",
          "role": "F",
          "assist": "死天龍のソウル No.11579"
        }
      ],
      "steps": [
        "10分35秒・31ターン（プレイ履歴より）。回復力をできるだけ高くした",
        "Fの黒薔薇・フィリス・東峰はスキルマ、他はスキルLv1",
        "闇3セット＋回復（盤面4コンボ）が基本。6Fの闇消せないに対応",
        "投稿では木星チャレンジとあるが、プレイ履歴は通常の守霊の天体",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/detteiuRIKOPIN/status/1921425329337319699",
      "author": {
        "name": "リコピン"
      },
      "sourceDate": "2025-05-11",
      "metrics": {
        "chars": 721,
        "puzzle": 16,
        "branch": 3,
        "caution": 2,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "jupiter-reinhard-yamajun",
      "dungeonId": "jupiter",
      "title": "ラインハルト ボス2パン7500億",
      "timeSec": 588,
      "turns": 23,
      "estimated": [],
      "yields": {
        "exp": 98884800
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n13116",
          "role": "S",
          "assist": "オーディン＆フリッグの聖装神器 No.13153"
        },
        {
          "id": "n13199",
          "role": "S",
          "assist": "ヴィルヘルムの剣 No.13340"
        },
        {
          "id": "n12907",
          "role": "S",
          "assist": "聖夜の聖装斧姫・ミリーのスノードーム No.13162"
        },
        {
          "id": "n13199",
          "role": "S",
          "assist": "オメガブレード No.13142"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "エキドナのお茶 No.13367"
        }
      ],
      "steps": [
        "9分47秒・23ターン（プレイ履歴より）。ボスを2パン",
        "ソフィを確実にワンパンしたい場合は攻撃かドラゴンバッジに",
        "木軽減+4、水軽減+8。リーダーのラインハルトはスキルLv1、他は最大",
        "基本は列＋回復4消し。スキルを打つ順番に注意",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2016401165072925055",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-01-28",
      "metrics": {
        "chars": 669,
        "puzzle": 13,
        "branch": 2,
        "caution": 9,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "jupiter-challenge-rosetta-yamajun",
      "dungeonId": "jupiter",
      "title": "ロゼッタ 11分台安定",
      "timeSec": 678,
      "turns": 29,
      "estimated": [],
      "members": [
        {
          "id": "n12439",
          "role": "L",
          "assist": "死天龍のソウル No.11579"
        },
        {
          "id": "n12450",
          "role": "S",
          "assist": "黒薔薇の種子 No.12441"
        },
        {
          "id": "n11666",
          "role": "S",
          "assist": "ブルーロックの単行本5巻【凪 誠士郎】 No.11979"
        },
        {
          "id": "n12270",
          "role": "S",
          "assist": "サノス【コミックカバー・2】 No.9116"
        },
        {
          "id": "n12439",
          "role": "S",
          "assist": "死天龍のソウル No.11579"
        },
        {
          "id": "n12439",
          "role": "F",
          "assist": "永久竜カナンのカード No.11872"
        }
      ],
      "steps": [
        "11分17秒・29ターン（プレイ履歴より）",
        "回復とスキル順だけ注意",
        "木軽減6、火と水軽減2ずつ",
        "12Fはずっと頭をターゲット",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/1918613255528042657",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2025-05-03",
      "metrics": {
        "chars": 385,
        "puzzle": 9,
        "branch": 2,
        "caution": 3,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "mercury-mina-shion",
      "dungeonId": "mercury",
      "title": "亜白ミナ×怪獣8号 部位破壊100%（カフカ入り）",
      "timeSec": 809,
      "turns": 28,
      "yields": {
        "exp": 195000000
      },
      "members": [
        {
          "id": "n12917",
          "role": "L",
          "assist": "ヘスティア・ナイフ No.12032"
        },
        {
          "id": "n12917",
          "role": "S",
          "assist": "防衛隊のガトリングガン No.12939"
        },
        {
          "id": "n12903",
          "role": "S",
          "assist": "裁盤の鋼星神・エルゲヌビの首飾り No.7187"
        },
        {
          "id": "n12808",
          "role": "S",
          "assist": "FAIRY TAILのコラボ単行本【ナツ＆イグニール】 No.11938"
        },
        {
          "id": "n12808",
          "role": "S",
          "assist": "炎の精霊イフリート No.11253"
        },
        {
          "id": "n12914",
          "role": "F",
          "assist": "黒尾のユニフォーム No.12303"
        }
      ],
      "steps": [
        "慣れたら13〜14分（プレイ履歴は13分29秒・28ターン）。タイプバッジを使っていないので比較的組みやすい",
        "基本ずらし。回復が厳しそうなら4つ消し（回復4消し11コンボで60万くらい回復）",
        "アシストの東雲りん武器・エルゲヌビはスキルマ。エルゲヌビを使う時は炭治郎より先に",
        "6F・7Fはソフィ乱入と色で分岐。9Fから軽減とコンボ加算が切れ始めるので注意",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/shion_qq/status/1975858219840073825",
      "author": {
        "name": "しおん"
      },
      "sourceDate": "2025-10-08",
      "metrics": {
        "chars": 1360,
        "puzzle": 18,
        "branch": 13,
        "caution": 13,
        "zurashi": 1,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "mercury-reinhard-mori",
      "dungeonId": "mercury",
      "title": "ラインハルト ほぼずらし（7分台）",
      "timeSec": 475,
      "turns": 22,
      "yields": {
        "exp": 226800000
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "極醒の裁秤神・エスカマリのティアラ No.7658"
        },
        {
          "id": "n14048",
          "role": "S",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "n14063",
          "role": "S",
          "assist": "タマゾーX命天龍・ゼルクレアのスクロール No.13959"
        },
        {
          "id": "n14088",
          "role": "S",
          "assist": "星砕の凶兆龍・ゼンチョウガのブレスレット No.11550"
        },
        {
          "id": "diamos",
          "role": "S",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "照れ屋な癒し手・アリナのショコラ No.13398"
        }
      ],
      "steps": [
        "7分54秒・22ターン（プレイ履歴より）",
        "エスカマリ・アリナはスキルマ",
        "基本ダイアモス＋ずらし。5Fの突破タイミングで6F・7Fの立ち回りが分岐",
        "突破ライン: 9F・10Fは光8個・泥強8個（光を1増やすごとに泥強を1減らしてもOK）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/WENkNdC2Y9CVbvQ/status/2097253336898777099",
      "author": {
        "name": "もり"
      },
      "sourceDate": "2026-09-08",
      "metrics": {
        "chars": 659,
        "puzzle": 7,
        "branch": 5,
        "caution": 0,
        "zurashi": 16,
        "plus891": 0.16666666666666666,
        "plus891Text": null
      }
    },
    {
      "id": "mercury-dain-cclemon",
      "dungeonId": "mercury",
      "title": "ダイン×ダイアモス 18ターン固定（部位破壊9）",
      "timeSec": 466,
      "turns": 18,
      "yields": {
        "exp": 220500000
      },
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "極醒の黄龍契士・シルヴィのブレスレット No.13910"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "竜神ヒスイのカード No.11880"
        },
        {
          "id": "n13136",
          "role": "S",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        },
        {
          "id": "n14038",
          "role": "S",
          "assist": "ケリ姫＆飛行士の写真 No.11866"
        },
        {
          "id": "n14055",
          "role": "S",
          "assist": "ドーナ＆ヴェロアのハピネスドール No.13805"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "逆撫 No.14064"
        }
      ],
      "steps": [
        "18ターン固定・部位破壊9（プレイ履歴は7分45秒）",
        "乱入の分岐なし。乱入もユラもワンパン",
        "潜在は全て木軽減+。ダイアモスは毎ターン、ダインの前に打つ",
        "消し方はT字1コンボのみ",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/watacc/status/2095285346758164853",
      "author": {
        "name": "CCLemon"
      },
      "sourceDate": "2026-09-02",
      "metrics": {
        "chars": 287,
        "puzzle": 10,
        "branch": 2,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0.33,
        "plus891Text": null
      }
    },
    {
      "id": "mercury-gintoki-tension",
      "dungeonId": "mercury",
      "title": "スオウ銀時 部位破壊9",
      "timeSec": 578,
      "turns": 24,
      "yields": {
        "exp": 157500000
      },
      "members": [
        {
          "id": "n13681",
          "role": "L",
          "assist": "全ての鬼を滅するために作った刀 No.12848"
        },
        {
          "id": "n13692",
          "role": "S",
          "assist": "法陣 No.11705"
        },
        {
          "id": "n13876",
          "role": "S",
          "assist": "教師ミオンのサポート龍・ストラ No.13606"
        },
        {
          "id": "n12903",
          "role": "S",
          "assist": "フチャの式札 No.7783"
        },
        {
          "id": "n9731",
          "role": "S",
          "assist": "護霊筆の玄武・メイメイのカード No.12793"
        },
        {
          "id": "n13681",
          "role": "F",
          "assist": "たまのネジ No.13717"
        }
      ],
      "steps": [
        "1周9分半程度（プレイ履歴は9分37秒・24ターン）",
        "ドラゴンバッジより攻撃バッジの方が良い",
        "基本ずらし、6Fと8Fでパズル指定あり",
        "ソフィがB6かB7かで立ち回りが分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/tension_Pads/status/2067423809259585628",
      "author": {
        "name": "てんしおん"
      },
      "sourceDate": "2026-06-18",
      "metrics": {
        "chars": 514,
        "puzzle": 7,
        "branch": 8,
        "caution": 5,
        "zurashi": 1,
        "plus891": 0.6666666666666666,
        "plus891Text": null
      }
    },
    {
      "id": "mercury-gintoki-mori",
      "dungeonId": "mercury",
      "title": "銀さん 11分台安定",
      "timeSec": 684,
      "turns": 25,
      "yields": {
        "exp": 150000000
      },
      "members": [
        {
          "id": "n13681",
          "role": "L",
          "assist": "たまのネジ No.13717"
        },
        {
          "id": "n13193",
          "role": "S",
          "assist": "空のデジヴァイス No.11736"
        },
        {
          "id": "n13757",
          "role": "S",
          "assist": "二ケの戦勝旗 No.13284"
        },
        {
          "id": "n12115",
          "role": "S",
          "assist": "チューリップの球根 No.12448"
        },
        {
          "id": "n13596",
          "role": "S",
          "assist": "木星の魔導神機・ジュピトールのブレスレット No.10527"
        },
        {
          "id": "n13681",
          "role": "F",
          "assist": "織姫の櫛 No.11201"
        }
      ],
      "steps": [
        "11分台安定（プレイ履歴は11分23秒・25ターン）",
        "銀さんは毎ターン最後にスキルを使う。何も書いていないところはずらし",
        "6F・7Fは乱入の有無で分岐",
        "13Fは頭の部位をターゲット",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/WENkNdC2Y9CVbvQ/status/2062069317391499268",
      "author": {
        "name": "もり"
      },
      "sourceDate": "2026-06-03",
      "metrics": {
        "chars": 346,
        "puzzle": 4,
        "branch": 5,
        "caution": 1,
        "zurashi": 1,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "mercury-berger-ao-v2",
      "dungeonId": "mercury",
      "title": "ベルガー×チャオリンループ 第2弾（部位破壊9）",
      "timeSec": 979,
      "turns": 51,
      "yields": {
        "exp": 157500000
      },
      "members": [
        {
          "id": "n10421",
          "role": "L",
          "assist": "T-25101985 No.12918"
        },
        {
          "id": "n13444",
          "role": "S",
          "assist": "麒麟の化身・ミニさくや No.1789"
        },
        {
          "id": "n13513",
          "role": "S",
          "assist": "不死川実弥の日輪刀 No.12827"
        },
        {
          "id": "n10820",
          "role": "S",
          "assist": "双頭犬の支援機・オルトス No.11460"
        },
        {
          "id": "n13513",
          "role": "S",
          "assist": "迎春の妖精王・アルバートの年賀状 No.12106"
        },
        {
          "id": "n10421",
          "role": "F",
          "assist": "T-25101985 No.12918"
        }
      ],
      "steps": [
        "部位破壊9で確定ドロップ（プレイ履歴は16分19秒・51ターン）",
        "攻撃はずらし、耐久は1コンボでパズルが楽（コンボ吸収だけは運）",
        "ベルガー・チャオリン・ザイン・甘露寺をループ",
        "6F・7Fの乱入は甘露寺を使って必ず部位破壊",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/KFerTNnZCgtlhQL/status/2033863380810010807",
      "author": {
        "name": "あお"
      },
      "sourceDate": "2026-03-17",
      "metrics": {
        "chars": 466,
        "puzzle": 13,
        "branch": 1,
        "caution": 9,
        "zurashi": 1,
        "plus891": 0.83,
        "plus891Text": null
      }
    },
    {
      "id": "mercury-berger-ao-v1",
      "dungeonId": "mercury",
      "title": "ベルガー×チャオリンループ（部位破壊9）",
      "timeSec": 1069,
      "turns": 56,
      "yields": {
        "exp": 157500000
      },
      "members": [
        {
          "id": "n10421",
          "role": "L",
          "assist": "T-25101985 No.12918"
        },
        {
          "id": "n13444",
          "role": "S",
          "assist": "お面屋の太陽神・ラーの常夏ジュース No.12764"
        },
        {
          "id": "n13513",
          "role": "S",
          "assist": "不死川実弥の日輪刀 No.12827"
        },
        {
          "id": "n13099",
          "role": "S",
          "assist": "風雪魔獣・スノーティアの耳飾り No.13489"
        },
        {
          "id": "n13513",
          "role": "S",
          "assist": "魔獣グラシャラボラスのカード No.8830"
        },
        {
          "id": "n10421",
          "role": "F",
          "assist": "T-25101985 No.12918"
        }
      ],
      "steps": [
        "部位破壊9で確定ドロップ（プレイ履歴は17分49秒・56ターン）",
        "攻撃はずらし、耐久は1コンボ。アシスト無効は木L字を2つ組む",
        "ベルガー・チャオリン・ザイン・火田をループ。乱入のソフィは火田で必ず部位破壊",
        "13Fボスは火田ループを計4回使って部位破壊（約20ターン、ずっと1コンボ耐久）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/KFerTNnZCgtlhQL/status/2032603063949955191",
      "author": {
        "name": "あお"
      },
      "sourceDate": "2026-03-13",
      "metrics": {
        "chars": 651,
        "puzzle": 4,
        "branch": 1,
        "caution": 7,
        "zurashi": 1,
        "plus891": 0.6666666666666666,
        "plus891Text": null
      }
    },
    {
      "id": "mercury-rosetta-dog",
      "dungeonId": "mercury",
      "title": "ロゼッタ 6分台",
      "timeSec": 404,
      "turns": 20,
      "yields": {
        "exp": 150000000
      },
      "members": [
        {
          "id": "n12439",
          "role": "L",
          "assist": "清海の女神・イシス＆ネフティスのうちわ No.11451"
        },
        {
          "id": "n12439",
          "role": "S",
          "assist": "双頭犬の支援機・オルトス No.11460"
        },
        {
          "id": "n14088",
          "role": "S",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "n13366",
          "role": "S",
          "assist": "ポチャッコのアイスクリーム No.11654"
        },
        {
          "id": "n13840",
          "role": "S",
          "assist": "呪水剣・カレドヴールフ No.5064"
        },
        {
          "id": "n12439",
          "role": "F",
          "assist": "栗花落カナヲの日輪刀 No.10859"
        }
      ],
      "steps": [
        "6分台（プレイ履歴は6分44秒・20ターン）。高速モードなしでも8分台（8分14秒・19ターン）",
        "1Fは左から1→5→6→2→1の順にスキルを打って殴る",
        "3Fからロゼッタを毎ターン打って殴る",
        "9Fはアシスト解除しつつ落としを組んでワンパン",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/Iamdog564705/status/2101607424625201206",
      "author": {
        "name": "I am dog"
      },
      "sourceDate": "2026-09-20",
      "metrics": {
        "chars": 240,
        "puzzle": 2,
        "branch": 5,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "venus-seiheart-yamajun-shimamura",
      "dungeonId": "venus",
      "title": "セイハーツ 島村採用（7分台）",
      "timeSec": 459,
      "turns": 21,
      "yields": {
        "exp": 183750000,
        "plus": 7777
      },
      "members": [
        {
          "id": "n14110",
          "role": "L",
          "assist": "ヘッドマウントディスプレイ No.13081"
        },
        {
          "id": "n13998",
          "role": "S",
          "assist": "Dフェニックスの起動キー No.14136"
        },
        {
          "id": "n13567",
          "role": "S",
          "assist": "ゾッダ虫 No.13334"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "カルーアミルク側仕えのメイド牛 No.12579"
        },
        {
          "id": "n13116",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "ハート龍・セイハーツのトランプ No.14111"
        }
      ],
      "steps": [
        "7分台（プレイ履歴は7分38秒・21ターン）。島村がとにかく強い",
        "潜在は木軽減+5、光軽減+6",
        "スキルを使う順番に注意",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2103468229750644846",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-09-25",
      "metrics": {
        "chars": 338,
        "puzzle": 3,
        "branch": 2,
        "caution": 3,
        "zurashi": 0,
        "plus891": 0.5,
        "plus891Text": null
      }
    },
    {
      "id": "venus-seiheart-yamajun-zurashi",
      "dungeonId": "venus",
      "title": "シヴァ×セイハーツ ルシファー以外ずらし",
      "timeSec": 488,
      "turns": 23,
      "yields": {
        "exp": 183750000,
        "plus": 7777
      },
      "members": [
        {
          "id": "n13916",
          "role": "L",
          "assist": "科学部の怪異・ユラの弁当箱 No.13617"
        },
        {
          "id": "n13999",
          "role": "S",
          "assist": "ゾッダ虫 No.13334"
        },
        {
          "id": "n13998",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "放課後の寄り道・ユリシャ＆アリーシアの弁当箱 No.13604"
        }
      ],
      "steps": [
        "8分くらい（プレイ履歴は8分07秒・23ターン）",
        "ルシファー以外はずらし",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2100539368519975080",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-09-17",
      "metrics": {
        "chars": 380,
        "puzzle": 3,
        "branch": 4,
        "caution": 8,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "venus-reinhard-yamajun-10",
      "dungeonId": "venus",
      "title": "ラインハルト 10分台安定（ルシファー入り）",
      "timeSec": 643,
      "turns": 22,
      "yields": {
        "exp": 264600000,
        "plus": 7777
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "ラジョアの大筆 No.6866"
        },
        {
          "id": "n11714",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n13199",
          "role": "S",
          "assist": "オールマイトねつけ No.13183"
        },
        {
          "id": "n12907",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n13116",
          "role": "S",
          "assist": "Gファルコン No.12195"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "アグリゲートの天弓 No.11555"
        }
      ],
      "steps": [
        "10分台安定（プレイ履歴は10分42秒・22ターン）",
        "1Fの超根性無視、ソフィワンパン、ルシファー威嚇、シールド2枚スキップ、ボスは部位ごと2パン",
        "基本は列＋回復。大ダメージが来る時は4消し推奨。光軽減+15、光軽減1",
        "基本+297では不可。ただしソフィ階層を初手ラインハルトのみで削って部位破壊すれば耐久に余裕が出る",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2019379336357597245",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-02-05",
      "metrics": {
        "chars": 482,
        "puzzle": 5,
        "branch": 4,
        "caution": 4,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "venus-reinhard-yamajun-11",
      "dungeonId": "venus",
      "title": "ラインハルト 最速11分台（891不要・訂正版）",
      "timeSec": 714,
      "turns": 25,
      "yields": {
        "exp": 264600000,
        "plus": 7777
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n11714",
          "role": "S",
          "assist": "ガルルキャノン No.13145"
        },
        {
          "id": "n13199",
          "role": "S",
          "assist": "オールマイトねつけ No.13183"
        },
        {
          "id": "n13141",
          "role": "S",
          "assist": "聖天龍のソウル No.11576"
        },
        {
          "id": "n12550",
          "role": "S",
          "assist": "大輔のD-3 No.13087"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "エキドナのお茶 No.13367"
        }
      ],
      "steps": [
        "最速11分台（プレイ履歴は11分53秒・25ターン）。列を組むだけで回れる",
        "+891不要なのでタイハクセイ集めにおすすめ。光軽減+14、水軽減+2",
        "スキルを打つ順番に注意",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2018711941443702989",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-02-03",
      "metrics": {
        "chars": 387,
        "puzzle": 4,
        "branch": 4,
        "caution": 7,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": "not-required"
      }
    },
    {
      "id": "venus-reinhard-nanaminn",
      "dungeonId": "venus",
      "title": "ラインハルト フェルト入り 部位100%",
      "timeSec": 751,
      "turns": 27,
      "yields": {
        "exp": 529200000,
        "plus": 7777
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "ラジョアの大筆 No.6866"
        },
        {
          "id": "n12903",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n13199",
          "role": "S",
          "assist": "ミルコのヒーロースーツ No.11061"
        },
        {
          "id": "n13349",
          "role": "S",
          "assist": "ヴィルヘルムの剣 No.13340"
        },
        {
          "id": "n13349",
          "role": "S",
          "assist": "スザクの騎士証 No.11383"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "オールマイトねつけ No.13183"
        }
      ],
      "steps": [
        "プレイ履歴は12分30秒・27ターン。フェルトのおかげでパズルらしいパズルなく、ずらし感覚で回れる",
        "本体はスキルMAX、武器はスキルLv適当。大ダメージ前は回復4消し",
        "指定のないところは光列＋回復",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2015102696299323777",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-01-24",
      "metrics": {
        "chars": 536,
        "puzzle": 9,
        "branch": 1,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "venus-reinhard-yamajun-rabiril",
      "dungeonId": "venus",
      "title": "ラインハルト ラビリル＆ヴィルヘルム採用",
      "timeSec": 707,
      "turns": 24,
      "yields": {
        "exp": 264600000,
        "plus": 7777
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n11714",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n13199",
          "role": "S",
          "assist": "オールマイトねつけ No.13183"
        },
        {
          "id": "n13339",
          "role": "S",
          "assist": "稽古のご飯 No.12821"
        },
        {
          "id": "n12558",
          "role": "S",
          "assist": "誠実のデジメンタル No.13121"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "エキドナのお茶 No.13367"
        }
      ],
      "steps": [
        "慣れると11分台安定（プレイ履歴は11分47秒・24ターン）",
        "イシスとドラモン採用型より回復力が高くクリアターンも短い。暗闇目覚めも返せる（メイドイシス未所持向け）",
        "光軽減+17",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2018957493200965878",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-02-04",
      "metrics": {
        "chars": 412,
        "puzzle": 4,
        "branch": 4,
        "caution": 7,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "venus-kaiju8-nanaminn",
      "dungeonId": "venus",
      "title": "怪獣8号 ほぼずらし 部位破壊100%",
      "timeSec": 746,
      "turns": 29,
      "yields": {
        "exp": 621075000,
        "plus": 7777
      },
      "members": [
        {
          "id": "n12914",
          "role": "L",
          "assist": "紅翼龍・ボルフィードのブレスレット No.10502"
        },
        {
          "id": "n12808",
          "role": "S",
          "assist": "屋台巡りの魔帽子・ランヴィ＆オム No.12736"
        },
        {
          "id": "n12536",
          "role": "S",
          "assist": "月光 【額当】 No.11493"
        },
        {
          "id": "n12903",
          "role": "S",
          "assist": "防衛隊のスーツ No.12904"
        },
        {
          "id": "n12808",
          "role": "S",
          "assist": "GS-3305 No.12921"
        },
        {
          "id": "n12914",
          "role": "F",
          "assist": "紅翼龍・ボルフィードのブレスレット No.10502"
        }
      ],
      "steps": [
        "1周12分半切り（プレイ履歴は12分26秒・29ターン）。ほぼずらしで楽",
        "ねこまるさんの編成を参考にしたもの",
        "炭禰豆はループし、他のスキルの後に1→2の順で使う",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/1972365344489746591",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2025-09-28",
      "metrics": {
        "chars": 313,
        "puzzle": 5,
        "branch": 0,
        "caution": 1,
        "zurashi": 1,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "venus-reinhard-yamajun-final",
      "dungeonId": "venus",
      "title": "ラインハルト 最速11分前半（最終版・カフカ武器）",
      "timeSec": 675,
      "turns": 23,
      "yields": {
        "exp": 264600000,
        "plus": 7777
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n11714",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n13199",
          "role": "S",
          "assist": "オールマイトねつけ No.13183"
        },
        {
          "id": "n13339",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n12558",
          "role": "S",
          "assist": "誠実のデジメンタル No.13121"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "エキドナのお茶 No.13367"
        }
      ],
      "steps": [
        "最速11分前半（プレイ履歴は11分15秒・23ターン）",
        "カフカ武器で1Fの超根性をスキップし、スターを打つ回数も減らした最終版",
        "光軽減+17",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2018994630084473305",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-02-04",
      "metrics": {
        "chars": 399,
        "puzzle": 4,
        "branch": 4,
        "caution": 7,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "venus-douma-nanaminn",
      "dungeonId": "venus",
      "title": "童磨 All+297",
      "timeSec": 817,
      "turns": 29,
      "yields": {
        "exp": 183750000,
        "plus": 7777
      },
      "members": [
        {
          "id": "n12832",
          "role": "L",
          "assist": "渚の守護者・エレインのうちわ No.11453"
        },
        {
          "id": "n12274",
          "role": "S",
          "assist": "伊黒小芭内の日輪刀 No.12830"
        },
        {
          "id": "n12844",
          "role": "S",
          "assist": "玉壺の壺 No.10829"
        },
        {
          "id": "n12844",
          "role": "S",
          "assist": "波遊び天鬼姫・風神のうちわ No.7589"
        },
        {
          "id": "n12729",
          "role": "S",
          "assist": "赤井のライフル No.12381"
        },
        {
          "id": "n12832",
          "role": "F",
          "assist": "不死川実弥の日輪刀 No.12827"
        }
      ],
      "steps": [
        "1周13分半くらい（プレイ履歴は13分37秒・29ターン、「金星」チャレンジで記録）",
        "All+297で組めるので+891を作っていない人向け",
        "基本は水十字＋1コンボ（攻撃力減少時やアシスト無効時は水十字＋水3）。伊黒武器はスキルMAX",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/1966128585934324215",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2025-09-11",
      "metrics": {
        "chars": 467,
        "puzzle": 13,
        "branch": 2,
        "caution": 4,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": "not-required"
      }
    },
    {
      "id": "venus-reinhard-mirei",
      "dungeonId": "venus",
      "title": "ラインハルト 21ターン全部位破壊",
      "timeSec": 660,
      "turns": 21,
      "estimated": [
        "timeSec"
      ],
      "yields": {
        "plus": 7777
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "曲刃剣・コピス No.4235"
        },
        {
          "id": "n12907",
          "role": "S",
          "assist": "ゾッダ虫 No.13334"
        },
        {
          "id": "n13199",
          "role": "S",
          "assist": "双児機・メタルカストルのブレスレット No.10664"
        },
        {
          "id": "n11714",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n13116",
          "role": "S",
          "assist": "極醒の日龍喚士・カンナのティアラ No.7654"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "キャプテン・マーベル【クラシックカバー】 No.6916"
        }
      ],
      "steps": [
        "21ターン全部位破壊（レシート記載）。プレイ履歴がないため1周のタイムは推定",
        "代理投稿。作成者は使ってみた人の感想を募集中、欠陥の可能性ありと明記",
        "基本は光1列＋回復の10コンボ以上。10Fまでハルトの打ち方を守る。L・Fハルト裏はスキルLv1",
        "9Fは運要素があるため、補足画像の立ち回り（Fハルト→ライドラ10コンボ以下→鳴八①→Fハルト→Lハルト）を推奨",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/Ilmina_Grimoire/status/2029121979371143535",
      "author": {
        "name": "みれい"
      },
      "sourceDate": "2026-03-04",
      "metrics": {
        "chars": 510,
        "puzzle": 6,
        "branch": 4,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0.5,
        "plus891Text": null
      }
    },
    {
      "id": "moon-shiva-yamajun",
      "dungeonId": "moon",
      "title": "シヴァ×セイハーツ（高速モード10分台）",
      "timeSec": 603,
      "turns": 27,
      "yields": {
        "exp": 210000000,
        "plus": 5000
      },
      "members": [
        {
          "id": "n13916",
          "role": "L",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "n13999",
          "role": "S",
          "assist": "ひとり読書の地王神・クロノスの弁当箱 No.13619"
        },
        {
          "id": "n13998",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "科学部の怪異・ユラの弁当箱 No.13617"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "放課後の寄り道・ユリシャ＆アリーシアの弁当箱 No.13604"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "謎の幼獣 No.12915"
        }
      ],
      "steps": [
        "高速モードで10分台安定（プレイ履歴は10分02秒・27ターン）。アンダーバーさんの編成が参考",
        "アルテミスで3秒パズルができれば27ターン確定クリアも可能",
        "全泥強60%以上、火軽減4。スキルを打つ順番に注意",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/junyama_sub/status/2097576676603711905",
      "author": {
        "name": "ヤマジュン"
      },
      "sourceDate": "2026-09-09",
      "metrics": {
        "chars": 461,
        "puzzle": 8,
        "branch": 3,
        "caution": 8,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "moon-gintoki-nanaminn",
      "dungeonId": "moon",
      "title": "銀時×神楽 全部位破壊（基本ずらし）",
      "timeSec": 889,
      "turns": 38,
      "yields": {
        "exp": 210000000,
        "plus": 5000
      },
      "members": [
        {
          "id": "n13692",
          "role": "L",
          "assist": "デジタルアートチョコ No.13395"
        },
        {
          "id": "n13722",
          "role": "S",
          "assist": "シュタルクの斧 No.13420"
        },
        {
          "id": "n13419",
          "role": "S",
          "assist": "勇気のデジメンタル No.13088"
        },
        {
          "id": "n13676",
          "role": "S",
          "assist": "勇気のデジメンタル No.13088"
        },
        {
          "id": "n13681",
          "role": "S",
          "assist": "無一郎と蜜璃の鎹鴉 No.12817"
        },
        {
          "id": "n13681",
          "role": "F",
          "assist": "ワルりんの宝杯 No.10955"
        }
      ],
      "steps": [
        "1周14〜15分台で全部位破壊（プレイ履歴は14分49秒・38ターン）。基本ずらしで楽",
        "部位ボーナス10個",
        "7F・8Fは弱化とコンボ吸収に注意。10Fは突破ターンに棘を全部消す",
        "シュタルク以外の5体を+891育成できるずらし編成（+限界突破）も出典に掲載",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2047689091781894374",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-04-24",
      "metrics": {
        "chars": 526,
        "puzzle": 15,
        "branch": 4,
        "caution": 7,
        "zurashi": 0,
        "plus891": 0.16666666666666666,
        "plus891Text": null
      }
    },
    {
      "id": "moon-rosetta-kuma",
      "dungeonId": "moon",
      "title": "ロゼッタ 部位破壊100%（11分台）",
      "timeSec": 698,
      "turns": 31,
      "yields": {
        "exp": 210000000,
        "plus": 5000
      },
      "members": [
        {
          "id": "n12439",
          "role": "L",
          "assist": "死天龍のソウル No.11579"
        },
        {
          "id": "n12439",
          "role": "S",
          "assist": "ベルモットのバイク No.12405"
        },
        {
          "id": "n12907",
          "role": "S",
          "assist": "ネレ専従の謎獣 No.12531"
        },
        {
          "id": "n13149",
          "role": "S",
          "assist": "星砕の凶兆龍・ゼンチョウガのブレスレット No.11550"
        },
        {
          "id": "n11137",
          "role": "S",
          "assist": "冥境の黒熾龍・ゴウテンの櫛 No.10305"
        },
        {
          "id": "n12439",
          "role": "F",
          "assist": "ヒトヨタケの標本 No.13738"
        }
      ],
      "steps": [
        "11分台（プレイ履歴は11分37秒・31ターン）。上限値200億強化と勇気のソウルの全パラ1.5倍が強い",
        "基本は闇3セット＋回復（複数体は闇5消し込み）",
        "メルナの希石集めに",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/honey7_pad/status/2098228993191547167",
      "author": {
        "name": "kuma🧸"
      },
      "sourceDate": "2026-09-11",
      "metrics": {
        "chars": 503,
        "puzzle": 6,
        "branch": 5,
        "caution": 2,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": "required"
      }
    },
    {
      "id": "moon-gintoki-runriri",
      "dungeonId": "moon",
      "title": "神楽×スオウ銀時 部位破壊9（最終見直し）",
      "timeSec": 1090,
      "turns": 40,
      "yields": {
        "exp": 200000000,
        "plus": 5000
      },
      "members": [
        {
          "id": "n13692",
          "role": "L",
          "assist": "エンデヴァー人形 No.13185"
        },
        {
          "id": "n13722",
          "role": "S",
          "assist": "FAIRY TAILの単行本50巻【ナツ・ドラグニル】 No.11947"
        },
        {
          "id": "n13419",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n13676",
          "role": "S",
          "assist": "シュタルクの斧 No.13420"
        },
        {
          "id": "n13681",
          "role": "S",
          "assist": "無一郎と蜜璃の鎹鴉 No.12817"
        },
        {
          "id": "n13681",
          "role": "F",
          "assist": "アレキサンダーの見聞録 No.8443"
        }
      ],
      "steps": [
        "プレイ履歴は18分09秒・40ターン",
        "回復ドロ強でうさぎ対策。消せない回復対策の潜在と、S銀時に神キラー",
        "スキブ22。武器の攻撃力・火力覚醒によっては火力不足の階があるので要調整",
        "シュタルク裏は本宮武器なしなら浮遊推奨",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/sirocat_42gs/status/2052700332615139330",
      "author": {
        "name": "るんりり"
      },
      "sourceDate": "2026-05-08",
      "metrics": {
        "chars": 832,
        "puzzle": 31,
        "branch": 6,
        "caution": 2,
        "zurashi": 7,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "moon-reinhard-nekomaru",
      "dungeonId": "moon",
      "title": "ラインハルト 部位破壊7（100%）",
      "timeSec": 1169,
      "turns": 42,
      "yields": {
        "exp": 302400000,
        "plus": 5000
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "リーベの龍喚石 No.8856"
        },
        {
          "id": "n13141",
          "role": "S",
          "assist": "迎春の扇子と和傘 No.12104"
        },
        {
          "id": "n13199",
          "role": "S",
          "assist": "ミルコのヒーロースーツ No.11061"
        },
        {
          "id": "n13337",
          "role": "S",
          "assist": "第1部隊章 No.12935"
        },
        {
          "id": "n13199",
          "role": "S",
          "assist": "宇髄の額当て No.12815"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "神刀・天極星黄龍 No.5632"
        }
      ],
      "steps": [
        "プレイ履歴は19分29秒・42ターン。火力は3200億⇄4300億",
        "ラインハルトループ＋スターアンドストライプループ。光は列、棘がある時などは回復4消し",
        "+限界突破はスターなら390以上、ラインハルトかインドラなら+450以上",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/nekopazznisei/status/2014553140713107725",
      "author": {
        "name": "ねこまる"
      },
      "sourceDate": "2026-01-23",
      "metrics": {
        "chars": 448,
        "puzzle": 5,
        "branch": 1,
        "caution": 1,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "moon-arkvelza-nekomaru",
      "dungeonId": "moon",
      "title": "試練アークヴェルザ ほぼずらし",
      "timeSec": 1239,
      "turns": 43,
      "yields": {
        "exp": 210000000,
        "plus": 5000
      },
      "members": [
        {
          "id": "n13484",
          "role": "L",
          "assist": "アレキサンダーの見聞録 No.8443"
        },
        {
          "id": "n13076",
          "role": "S",
          "assist": "ジェントルの紅茶 No.13224"
        },
        {
          "id": "n13076",
          "role": "S",
          "assist": "グラントリノのマント No.11052"
        },
        {
          "id": "n12907",
          "role": "S",
          "assist": "日向のユニフォーム No.12280"
        },
        {
          "id": "n13484",
          "role": "S",
          "assist": "仮装祭の後援・ねねのキャンディ No.7977"
        },
        {
          "id": "n13484",
          "role": "F",
          "assist": "至福の魔女・ポンノのショコラ No.8384"
        }
      ],
      "steps": [
        "プレイ履歴は20分38秒・43ターン。アークヴェルザ3枚の大量生成＆60%回復ループ",
        "陰の加護×10で耐久力が高く、常時3500億",
        "列を含む闇10以上消しが基本。無効の敵のみ＋正方形。ウォーグレイモンはアークヴェルザの前に使う",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/nekopazznisei/status/2028791298308857949",
      "author": {
        "name": "ねこまる"
      },
      "sourceDate": "2026-03-03",
      "metrics": {
        "chars": 738,
        "puzzle": 8,
        "branch": 2,
        "caution": 2,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "moon-multi-danna",
      "dungeonId": "moon",
      "title": "マルチ 怪獣8号×炭治郎禰豆子（部位破壊9）",
      "multi": true,
      "timeSec": 1068,
      "turns": 28,
      "yields": {
        "exp": 338000000,
        "plus": 5000
      },
      "members": [
        {
          "id": "n12914",
          "role": "L",
          "p": "A",
          "assist": "エルフリーデの紅焔剣 No.9354"
        },
        {
          "id": "n12808",
          "role": "S",
          "p": "A",
          "assist": "治のユニフォーム No.12315"
        },
        {
          "id": "n12808",
          "role": "S",
          "p": "A",
          "assist": "リクウの宝杯 No.12675"
        },
        {
          "id": "n12907",
          "role": "S",
          "p": "A",
          "assist": "ウルカの宝剣 No.6049"
        },
        {
          "id": "n12847",
          "role": "S",
          "p": "A",
          "assist": "ポジトロンレーザー No.13073"
        },
        {
          "id": "n12914",
          "role": "L",
          "p": "B",
          "assist": "エルフリーデの紅焔剣 No.9354"
        },
        {
          "id": "n12536",
          "role": "S",
          "p": "B",
          "assist": "プルメリアの標本 No.12444"
        },
        {
          "id": "n6546",
          "role": "S",
          "p": "B",
          "assist": "教祖クロウリーのカード No.11869"
        },
        {
          "id": "n12202",
          "role": "S",
          "p": "B",
          "assist": "竈門炭治郎の日輪刀 No.10852"
        },
        {
          "id": "n12192",
          "role": "S",
          "p": "B",
          "assist": "極醒の龍帝王・シェリアス＝ルーツのティアラ No.7641"
        }
      ],
      "steps": [
        "協力プレイで17分48秒・28ターン（プレイ履歴より）",
        "カフカ・炭禰豆でパズルは楽",
        "メリル武器・エルフリーデ武器はスキルLv最大、クロトビはスキルLv1",
        "立ち回りは出典のリプライを参照",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pandora_danna/status/2001686159903375587",
      "author": {
        "name": "旦那(￣▽￣;)"
      },
      "sourceDate": "2025-12-18",
      "metrics": {
        "chars": 27,
        "puzzle": 0,
        "branch": 0,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0.43,
        "plus891Text": null
      }
    },
    {
      "id": "moon-rosetta-reall",
      "dungeonId": "moon",
      "title": "ロゼッタ×ベアトリス 38ターン固定（部位破壊8）",
      "timeSec": 1042,
      "turns": 38,
      "yields": {
        "exp": 294000000,
        "plus": 5000
      },
      "members": [
        {
          "id": "n12439",
          "role": "L",
          "assist": "無聖人ニコラスのカード No.12458"
        },
        {
          "id": "n12439",
          "role": "S",
          "assist": "ハクの誓いのチョーカー No.11323"
        },
        {
          "id": "n13149",
          "role": "S",
          "assist": "不死川実弥の日輪刀 No.12827"
        },
        {
          "id": "n13366",
          "role": "S",
          "assist": "戦馬の支援機・スティード No.11458"
        },
        {
          "id": "n12907",
          "role": "S",
          "assist": "SW-2033 No.12926"
        },
        {
          "id": "n13323",
          "role": "F",
          "assist": "遊びの空間・ジントニックの宝杯 No.13291"
        }
      ],
      "steps": [
        "エキドナとベアトリスで敵の分岐によらない固定38ターン（プレイ履歴は17分22秒）",
        "本体は12439のみスキルLv1、他はMAX。武器は12926・13291がMAX、他はLv1",
        "7〜8Fのソフィ乱入時は部位破壊のため闇は全体攻撃で",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/Pad_Reall/status/2017640378435019172",
      "author": {
        "name": "Re.all"
      },
      "sourceDate": "2026-01-31",
      "metrics": {
        "chars": 920,
        "puzzle": 51,
        "branch": 7,
        "caution": 3,
        "zurashi": 0,
        "plus891": 0.6666666666666666,
        "plus891Text": null
      }
    },
    {
      "id": "sun-imperial-nanaminn",
      "dungeonId": "sun",
      "title": "インペリアルドラモン 部位破壊100%",
      "timeSec": 1074,
      "turns": 41,
      "yields": {
        "exp": 532350000,
        "plus": 9999
      },
      "members": [
        {
          "id": "n13072",
          "role": "L",
          "assist": "黒鉄の銀機士・クラウディアのブレスレット No.12127"
        },
        {
          "id": "n13196",
          "role": "S",
          "assist": "無一郎と蜜璃の鎹鴉 No.12817"
        },
        {
          "id": "n13085",
          "role": "S",
          "assist": "大輔のD-3 No.13087"
        },
        {
          "id": "n13094",
          "role": "S",
          "assist": "パック No.13306"
        },
        {
          "id": "n13072",
          "role": "S",
          "assist": "ロズワール邸メイド服 No.13308"
        },
        {
          "id": "n13072",
          "role": "F",
          "assist": "空のデジヴァイス No.11736"
        }
      ],
      "steps": [
        "慣れたら17〜18分台（プレイ履歴は17分53秒・41ターン、「太陽」チャレンジで記録）",
        "火光軽減+5、闇軽減+1。指定のない限り火水木回復の盤面4コンボ",
        "5F・6Fは乱入の有無とコンボ減算で分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2017587560663646587",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-01-31",
      "metrics": {
        "chars": 751,
        "puzzle": 19,
        "branch": 2,
        "caution": 3,
        "zurashi": 0,
        "plus891": 0.8333333333333334,
        "plus891Text": null
      }
    },
    {
      "id": "sun-dain-kinoko",
      "dungeonId": "sun",
      "title": "ダイン×ダイアモス 全部位破壊（12〜13分台）",
      "timeSec": 721,
      "turns": 35,
      "yields": {
        "exp": 441000000,
        "plus": 9999
      },
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "Bros No.13200"
        },
        {
          "id": "n13483",
          "role": "S",
          "assist": "ユーハバッハ No.14030"
        },
        {
          "id": "n14038",
          "role": "S",
          "assist": "滅却師の弓 No.14039"
        },
        {
          "id": "n14055",
          "role": "S",
          "assist": "月詠のクナイ No.13709"
        },
        {
          "id": "n14060",
          "role": "S",
          "assist": "デュークカノン No.9309"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "命天龍のソウル No.11578"
        }
      ],
      "steps": [
        "全部位破壊で12〜13分（プレイ履歴は12分01秒・35ターン）",
        "12Fのラードラをワンパンするためユーハバッハ付きゼルクレアを採用",
        "ダイアモス裏のスキルLv1、他MAX。基本T字＋1コンボ",
        "+891が減る場合は10F初手とボス超根性で回復を消す",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/kinoko_pazz/status/2096576181579739236",
      "author": {
        "name": "きのこ@パズドラ"
      },
      "sourceDate": "2026-09-06",
      "metrics": {
        "chars": 718,
        "puzzle": 19,
        "branch": 5,
        "caution": 3,
        "zurashi": 6,
        "plus891": 0.8333333333333334,
        "plus891Text": null
      }
    },
    {
      "id": "sun-ichigo-jones",
      "dungeonId": "sun",
      "title": "一護×剣八（安定版）",
      "timeSec": 794,
      "turns": 31,
      "yields": {
        "exp": 472500000,
        "plus": 9999
      },
      "members": [
        {
          "id": "n14035",
          "role": "L",
          "assist": "ハクのペット飼育道具 No.12569"
        },
        {
          "id": "n13737",
          "role": "S",
          "assist": "タマゾーX死天龍・アークヴェルザのスクロール No.13960"
        },
        {
          "id": "n14028",
          "role": "S",
          "assist": "アスキンの腕輪 No.14087"
        },
        {
          "id": "n13972",
          "role": "S",
          "assist": "科学部の怪異・ユラの弁当箱 No.13617"
        },
        {
          "id": "n14070",
          "role": "S",
          "assist": "ペルセポネ側仕えのニュンペー No.12571"
        },
        {
          "id": "n14043",
          "role": "F",
          "assist": "京極の絆創膏 No.13779"
        }
      ],
      "steps": [
        "前のレシートから立ち回りを修正して安定性を高めた最新版（プレイ履歴は13分13秒・31ターン）",
        "基本は闇4＋回復。5F乱入／6F乱入で分岐",
        "15Fは左をターゲット",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/jonepuzzle/status/2101287543232987405",
      "author": {
        "name": "ジョネス"
      },
      "sourceDate": "2026-09-19",
      "metrics": {
        "chars": 605,
        "puzzle": 19,
        "branch": 4,
        "caution": 2,
        "zurashi": 0,
        "plus891": 0.8333333333333334,
        "plus891Text": null
      }
    },
    {
      "id": "sun-elfriede-agepan",
      "dungeonId": "sun",
      "title": "エルフリーデVSフィアメル×セイハーツ 部位破壊",
      "timeSec": 649,
      "turns": 33,
      "yields": {
        "exp": 315000000,
        "plus": 9999
      },
      "members": [
        {
          "id": "n14005",
          "role": "L",
          "assist": "山本のユニフォーム No.12327"
        },
        {
          "id": "n12773",
          "role": "S",
          "assist": "端居の筆龍楽士・ミナカの常夏ジュース No.14013"
        },
        {
          "id": "n13998",
          "role": "S",
          "assist": "灼魔鍵の装具・灼火の魔法書 No.7234"
        },
        {
          "id": "n13483",
          "role": "S",
          "assist": "アレキサンダーの見聞録 No.8443"
        },
        {
          "id": "n14110",
          "role": "S",
          "assist": "ハート龍・セイハーツのトランプ No.14111"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "ハート龍・セイハーツのトランプ No.14111"
        }
      ],
      "steps": [
        "タイムは11分前後（プレイ履歴は10分49秒・33ターン）",
        "スキブ20以上。+891はレシート通りだとギリギリなので必須",
        "代用: 夏休みパネラ→L字持ち属性吸収無効＋ヘイスト（極性光シルヴィ等）、山本猛虎装備→火付与浮遊武器、グレオン装備→爆豪装備等（1Fの立ち回りが変わる）",
        "7Fは前の階層（シャマシュ／ルー or ソフィ）で分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/agepan_eropan/status/2094019344317689936",
      "author": {
        "name": "あげぱん🦐"
      },
      "sourceDate": "2026-08-30",
      "metrics": {
        "chars": 894,
        "puzzle": 5,
        "branch": 5,
        "caution": 5,
        "zurashi": 3,
        "plus891": 1,
        "plus891Text": null
      },
      "endorsedAlts": [
        {
          "target": 12773,
          "part": "base",
          "nos": [
            13909
          ],
          "text": "L字持ち属性吸収無効＋ヘイストのキャラ（超覚醒L字の極性光シルヴィ等）。代用時はボス1のアシスト無効解除にL字消しを追加"
        },
        {
          "target": 12327,
          "part": "assist",
          "nos": [
            12770
          ],
          "text": "山本猛虎装備の代わりに火付与浮遊武器（夏休みミネルヴァ装備など）"
        },
        {
          "target": 14013,
          "part": "assist",
          "nos": [
            6303
          ],
          "text": "グレオン装備の代わりに爆豪装備など（1Fのワンパンは諦める）"
        },
        {
          "target": 8443,
          "part": "assist",
          "nos": [
            10646
          ],
          "text": "アレキサンダー装備の代わりにチームHPと水木光闇ドロ強付きの武器（ハロウィンパイモン装備等）"
        }
      ]
    },
    {
      "id": "sun-dain-ana",
      "dungeonId": "sun",
      "title": "ダイン×ダイアモス 石田・フェルン入り 1Fスキップ",
      "timeSec": 881,
      "turns": 37,
      "yields": {
        "exp": 441000000,
        "plus": 9999
      },
      "members": [
        {
          "id": "n14097",
          "role": "L",
          "assist": "戦馬の支援機・スティード No.11458"
        },
        {
          "id": "n13415",
          "role": "S",
          "assist": "ダインの豪斧ダイヤアクス No.14099"
        },
        {
          "id": "n14037",
          "role": "S",
          "assist": "ケリ姫＆飛行士の写真 No.11866"
        },
        {
          "id": "n13483",
          "role": "S",
          "assist": "謎の幼獣 No.12915"
        },
        {
          "id": "n13950",
          "role": "S",
          "assist": "デュークカノン No.9309"
        },
        {
          "id": "n14112",
          "role": "F",
          "assist": "ダイヤ龍・ダイアモスのトランプ No.14114"
        }
      ],
      "steps": [
        "全部位破壊、ゆっくりパズルでも大体14分台安定（プレイ履歴は14分41秒・37ターン）",
        "ループ: ダイン・石田・フェルン・ダイアモス。基本コンボは光T＋光",
        "代用も潜在も自由度が高い。タマゾーは道中ループさせない",
        "PDC画像は各モンスターの進化前のNo.で登録されている（ダイン14097・フェルン13415・石田14037・ダイアモス14112）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/ana_inori/status/2094788826124501475",
      "author": {
        "name": "❀*⸜𝑎𝑛𝑎⸝*❀"
      },
      "sourceDate": "2026-09-01",
      "metrics": {
        "chars": 365,
        "puzzle": 7,
        "branch": 2,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0.8333333333333334,
        "plus891Text": null
      }
    },
    {
      "id": "sun-reinhard-hani",
      "dungeonId": "sun",
      "title": "ラインハルト（コンボ加算あり）",
      "timeSec": 928,
      "turns": 35,
      "yields": {
        "exp": 453600000,
        "plus": 9999
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "オールマイトねつけ No.13183"
        },
        {
          "id": "n13326",
          "role": "S",
          "assist": "召雷剣【麒麟帝】 No.4141"
        },
        {
          "id": "n13403",
          "role": "S",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        },
        {
          "id": "n13364",
          "role": "S",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        },
        {
          "id": "n13397",
          "role": "S",
          "assist": "竈門禰豆子の竹筒 No.10854"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "ローレンスの閃甲盾 No.9376"
        }
      ],
      "steps": [
        "1周15分台（プレイ履歴は15分27秒・35ターン、「太陽」チャレンジで記録）",
        "3〜4Fのコンボ減算、アマテラスの初手コンボ吸収、ラーホルスのコンボ無効をコンボ加算で対策",
        "キリン武器スキルLv12。基本は光列＋回復の盤面2コンボ",
        "ラードラ階層の組み方の例は出典のツリーを参照",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/ha_ni911/status/2021483283499057462",
      "author": {
        "name": "はに"
      },
      "sourceDate": "2026-02-11",
      "metrics": {
        "chars": 361,
        "puzzle": 19,
        "branch": 2,
        "caution": 2,
        "zurashi": 2,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "sun-dain-yomogi",
      "dungeonId": "sun",
      "title": "ダイン×ダイアモス 部位破壊9",
      "timeSec": 788,
      "turns": 31,
      "yields": {
        "exp": 420000000,
        "plus": 9999
      },
      "members": [
        {
          "id": "dain",
          "role": "L",
          "assist": "戦馬の支援機・スティード No.11458"
        },
        {
          "id": "n14038",
          "role": "S",
          "assist": "ケリ姫＆飛行士の写真 No.11866"
        },
        {
          "id": "n14060",
          "role": "S",
          "assist": "ヒカリのデジヴァイス No.11732"
        },
        {
          "id": "n14080",
          "role": "S",
          "assist": "千本桜 No.14066"
        },
        {
          "id": "n13416",
          "role": "S",
          "assist": "スザクの騎士証 No.11383"
        },
        {
          "id": "diamos",
          "role": "F",
          "assist": "逆撫 No.14064"
        }
      ],
      "steps": [
        "部位破壊9（プレイ履歴は13分07秒・31ターン）",
        "ダイアモスとフェルンは毎ターン使う（順番は盤面次第）。T＋光1コンボ以上で計算",
        "作者いわく立ち回りにミスがあるかもしれないとのこと",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/yomogi_72682/status/2097898365161967682",
      "author": {
        "name": "よもぎぃ"
      },
      "sourceDate": "2026-09-10",
      "metrics": {
        "chars": 401,
        "puzzle": 8,
        "branch": 6,
        "caution": 1,
        "zurashi": 0,
        "plus891": 0.5,
        "plus891Text": null
      }
    },
    {
      "id": "sun-reinhard-nekomaru",
      "dungeonId": "sun",
      "title": "フェルン入りラインハルト 部位破壊5（100%）",
      "timeSec": 1153,
      "turns": 42,
      "yields": {
        "exp": 453600000,
        "plus": 9999
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "リーベの龍喚石 No.8856"
        },
        {
          "id": "n13416",
          "role": "S",
          "assist": "フェルンの髪飾り No.13408"
        },
        {
          "id": "n13403",
          "role": "S",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        },
        {
          "id": "n13339",
          "role": "S",
          "assist": "張り切る守護神・アテナのショコラ No.13404"
        },
        {
          "id": "n13397",
          "role": "S",
          "assist": "古城の幻想・龍喚士ソニア＝グランのキャンディ No.7984"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "神刀・天極星黄龍 No.5632"
        }
      ],
      "steps": [
        "プレイ履歴は19分13秒・42ターン",
        "ラインハルトループ＋フェルンループ。毎ターンの追加生成でほぼずらしで行ける場面が増えた",
        "光は列、危険な時だけ回復4を意識",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/nekopazznisei/status/2024685869874204751",
      "author": {
        "name": "ねこまる"
      },
      "sourceDate": "2026-02-20",
      "metrics": {
        "chars": 487,
        "puzzle": 7,
        "branch": 1,
        "caution": 2,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "sun-rosetta-reall",
      "dungeonId": "sun",
      "title": "ロゼッタ 41〜42ターン 部位破壊8",
      "timeSec": 1077,
      "turns": 41,
      "yields": {
        "exp": 441000000,
        "plus": 9999
      },
      "members": [
        {
          "id": "n12439",
          "role": "L",
          "assist": "ハクの誓いのチョーカー No.11323"
        },
        {
          "id": "n12439",
          "role": "S",
          "assist": "永久竜カナンのカード No.11872"
        },
        {
          "id": "n13149",
          "role": "S",
          "assist": "シャッコウモンの翼 No.13083"
        },
        {
          "id": "n13353",
          "role": "S",
          "assist": "科学部の怪異・ユラの弁当箱 No.13617"
        },
        {
          "id": "n12907",
          "role": "S",
          "assist": "悪戯霊・ロキ＝ウィルドのブレスレット No.13062"
        },
        {
          "id": "n13323",
          "role": "F",
          "assist": "遊びの空間・ジントニックの宝杯 No.13291"
        }
      ],
      "steps": [
        "部位破壊8つ＋全ドロ強40%以上＋邪帯搭載（プレイ履歴は17分56秒・41ターン）",
        "ライ・バテンカイトスとアーマゲモンの2重吸収対策で分岐もあまり関係なく、追加コンボもほぼ不要",
        "本体は12439のみスキルLv1、他MAX",
        "10〜11Fはアウラ／メリディスで闇3コンボ攻撃ができたかで分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/Pad_Reall/status/2054951154493358479",
      "author": {
        "name": "Re.all"
      },
      "sourceDate": "2026-05-14",
      "metrics": {
        "chars": 861,
        "puzzle": 59,
        "branch": 4,
        "caution": 5,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      }
    },
    {
      "id": "hyaku-kikoru-nanaminn",
      "dungeonId": "hyakushiki",
      "title": "キコル 最速3分台",
      "timeSec": 240,
      "turns": 10,
      "yields": {
        "exp": 63003413,
        "plus": 2970
      },
      "members": [
        {
          "id": "n12960",
          "role": "L",
          "assist": "FS-1002 No.12961"
        },
        {
          "id": "n13074",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n6978",
          "role": "S",
          "assist": "イッポンカタナ No.6847"
        },
        {
          "id": "n13003",
          "role": "S",
          "assist": "EXディノイエロヘルムα No.11485"
        },
        {
          "id": "n12930",
          "role": "S",
          "assist": "ミッキーマウス＆プルート No.6010"
        },
        {
          "id": "n12930",
          "role": "F",
          "assist": "呪剣の溟手神・ネヴァンの首飾り No.7266"
        }
      ],
      "steps": [
        "最速3分台（プレイ履歴は3分59秒・10ターン）。報酬がとても美味しい",
        "基本キコルを打って殴る。消せない・覚醒無効はウィッシュミーメルで対応",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/1991693192786506179",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2025-11-21",
      "metrics": {
        "chars": 150,
        "puzzle": 1,
        "branch": 0,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "hyaku-kagura-ktz",
      "dungeonId": "hyakushiki",
      "title": "神楽×銀時 高速モード3分半安定",
      "timeSec": 216,
      "turns": 9,
      "yields": {
        "exp": 61203315,
        "plus": 2970
      },
      "members": [
        {
          "id": "n13692",
          "role": "L",
          "assist": "六人の少年少女のカード No.12149"
        },
        {
          "id": "n9927",
          "role": "S",
          "assist": "テミスの天秤 No.12244"
        },
        {
          "id": "n9927",
          "role": "S",
          "assist": "アレキサンダーの見聞録 No.8443"
        },
        {
          "id": "n13681",
          "role": "S",
          "assist": "陶芸部の女神・ヘスティアの学生証 No.7145"
        },
        {
          "id": "n12853",
          "role": "S",
          "assist": "月の守護妖魔・セレナディアの耳飾り No.13053"
        },
        {
          "id": "n13681",
          "role": "F",
          "assist": "虚栄の汰魔悟 No.13505"
        }
      ],
      "steps": [
        "高速モードで3分半安定（プレイ履歴は3分35秒・9ターン）。色軽減潜在などの素材集めに",
        "+300の場合はマシンキラー潜在を神楽か銀時に付与。スキブ20以上",
        "代用: 六人の少年少女→覚醒無効回復＋泥強＋10c、テミス・アレキサンダー→泥強、メルナ→加蓮・ブラムベル、虚栄→大王クロミ・ナツイグ・イシネフ（落ちコンあり）",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/itigotyokobo_/status/2104138314173616578",
      "author": {
        "name": "KTZ"
      },
      "sourceDate": "2026-09-27",
      "metrics": {
        "chars": 277,
        "puzzle": 3,
        "branch": 3,
        "caution": 0,
        "zurashi": 0,
        "plus891": 1,
        "plus891Text": null
      },
      "endorsedAlts": [
        {
          "target": 12149,
          "part": "assist",
          "nos": [],
          "text": "六人の少年少女の代わりに覚醒無効回復＋泥強＋10コンボの武器（1Fで打てるように）"
        },
        {
          "target": 12244,
          "part": "assist",
          "nos": [],
          "text": "テミス武器の代わりに泥強武器"
        },
        {
          "target": 8443,
          "part": "assist",
          "nos": [],
          "text": "アレキサンダー武器の代わりに泥強武器"
        },
        {
          "target": 13053,
          "part": "assist",
          "nos": [
            13584,
            13486
          ],
          "text": "メルナ武器の代わりに加蓮武器・ブラムベル武器"
        },
        {
          "target": 13505,
          "part": "assist",
          "nos": [
            11938,
            11443
          ],
          "text": "虚栄の代わりに大王クロミ・ナツイグ・イシネフ（落ちコンあり）"
        }
      ]
    },
    {
      "id": "hyaku-kikoru-mori",
      "dungeonId": "hyakushiki",
      "title": "キコル 3分（ロシェ・ゼローグ入り）",
      "timeSec": 189,
      "turns": 10,
      "yields": {
        "exp": 64263481,
        "plus": 2970
      },
      "members": [
        {
          "id": "n12930",
          "role": "L",
          "assist": "ナラ＆クインアスラ No.13980"
        },
        {
          "id": "n14014",
          "role": "S",
          "assist": "聖片の花嫁・サフィーラの指輪 No.12602"
        },
        {
          "id": "n13549",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n13978",
          "role": "S",
          "assist": "女神官の鎖帷子 No.12046"
        },
        {
          "id": "n8928",
          "role": "S",
          "assist": "［ワールドエンド・ブライド］北条加蓮のCD No.13584"
        },
        {
          "id": "n12930",
          "role": "F",
          "assist": "ファイズギア No.5764"
        }
      ],
      "steps": [
        "3分（プレイ履歴は3分08秒・10ターン）",
        "スパノエ・たまドラ・遅延・2枠ステ潜在・キラー・軽減など幅広い素材を短時間で集められる",
        "2Fは2パン。消せない覚醒無効が来たらドーナ。3F・7Fはコンボ吸収が来たらロシェ",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/WENkNdC2Y9CVbvQ/status/2103450675128730040",
      "author": {
        "name": "もり"
      },
      "sourceDate": "2026-09-25",
      "metrics": {
        "chars": 147,
        "puzzle": 2,
        "branch": 0,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "hyaku-kikoru-ultima",
      "dungeonId": "hyakushiki",
      "title": "キコル 功1枚（最速3分55秒）",
      "timeSec": 236,
      "turns": 10,
      "yields": {
        "exp": 63003413,
        "plus": 2970
      },
      "members": [
        {
          "id": "n12960",
          "role": "L",
          "assist": "全ての鬼を滅するために作った刀 No.12848"
        },
        {
          "id": "n13003",
          "role": "S",
          "assist": "射止める銃士・リズレットのショコラ No.10939"
        },
        {
          "id": "n13074",
          "role": "S",
          "assist": "聖人会議長ラウフェイのカード No.12873"
        },
        {
          "id": "n6978",
          "role": "S",
          "assist": "ヴィーナスのブレスレット No.7544"
        },
        {
          "id": "n12930",
          "role": "S",
          "assist": "呪剣の溟手神・ネヴァンの首飾り No.7266"
        },
        {
          "id": "n12930",
          "role": "F",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        }
      ],
      "steps": [
        "現状最速3分55秒、平均4分（プレイ履歴は3分55秒・10ターン）",
        "2F・4F・5Fは敵の色で分岐",
        "代用は聞かれれば分かる範囲で答えるとのこと",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_ultima127/status/1993569617726636345",
      "author": {
        "name": "Ultina編成垢"
      },
      "sourceDate": "2025-11-26",
      "metrics": {
        "chars": 112,
        "puzzle": 0,
        "branch": 0,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      },
      "slotRoles": [
        {
          "target": 7266,
          "part": "assist",
          "source": "作者本人（@pad_ultima127）の説明",
          "roles": [
            {
              "cap": "reduce",
              "why": "軽減はなくてもよい。ただし、軽減なし＋割合回復だけでダンジョン内の全ダメージを耐えられるかは要確認",
              "optional": true
            },
            {
              "cap": "voidPierce",
              "why": "1Fから最後まで続くダメージ無効貫通（クリア10ターン＋2F突破時のマイクロで1ターン経過扱い＝実質11ターン必要）",
              "minDur": 11
            },
            {
              "cap": "haste",
              "why": "キコルを1Fからクリアまで毎ターン使えるようにするため、1Fで使うヘイスト（同じ分をほかの枠で補えればOK）",
              "teamWide": false,
              "minHaste": 2,
              "fireAtFloor": 1
            },
            {
              "cap": "lShape",
              "why": "L字消し攻撃+は火力の補強になるのであると助かるが必須ではない",
              "optional": true
            },
            {
              "cap": "jammerResist",
              "why": "お邪魔耐性は必須。ただしパーティー全体で100%あれば問題ない",
              "teamWide": true
            },
            {
              "cap": "hpAwkNote",
              "why": "HP強化は耐久が足りていれば不要",
              "note": true
            },
            {
              "cap": "defZeroNote",
              "why": "防御0は状態異常無効の敵に効かないので役割ではない",
              "note": true
            }
          ],
          "notRoles": [
            "defBreak",
            "defZero"
          ]
        },
        {
          "target": 12960,
          "part": "base",
          "source": "作者本人（@pad_ultima127）の説明",
          "roles": [
            {
              "cap": "leaderSkill",
              "why": "リーダーの一番の理由は、L字消しで入る固定2000万ダメージ",
              "note": true
            },
            {
              "cap": "enhanceType:攻撃",
              "why": "主な役割は攻撃タイプの全体エンハンス（5ターン）をループさせること。キコルのコンボ吸収無効は「攻撃タイプエンハンス発動中」が条件なので、個別エンハンス（全員・自分など）では代わりにならない。全体の攻撃デバフが来たら功で上書きする"
            },
            {
              "cap": "enhanceNote",
              "why": "覚醒無効回復に功を使わず、エンハンス用に温存するためにミーメルを採用",
              "note": true
            }
          ]
        },
        {
          "target": 13003,
          "part": "base",
          "source": "作者本人（@pad_ultima127）の説明",
          "roles": [
            {
              "cap": "regen",
              "why": "変身前のスキルで、クリアまで（10ターン）続く割合回復。一番の理由",
              "minDur": 10
            },
            {
              "cap": "unerasableHeal",
              "why": "変身後のスキル（3ターン）で消せないドロップを回復"
            },
            {
              "cap": "awakenHeal",
              "why": "変身後のスキル（3ターン）で覚醒無効を回復"
            },
            {
              "cap": "dropEnhanceAwk",
              "why": "強化ドロップ目覚めはおまけ（キコルのスキルにドロップ強化があるため）",
              "optional": true
            },
            {
              "cap": "altNote",
              "why": "代用するなら「スキルターンの短い覚醒無効回復キャラ」＋「クリアまで続く割合回復の武器」の組み合わせでもよい",
              "note": true
            },
            {
              "cap": "haste",
              "why": "変身前スキルのヘイスト（2ターン）で、1Fにキコルより先に功を使えるようにする（ほかの枠で同じ分を補えればOK）",
              "minHaste": 2,
              "fireAtFloor": 1
            }
          ]
        },
        {
          "target": 13074,
          "part": "base",
          "source": "作者本人（@pad_ultima127）の説明",
          "roles": [
            {
              "cap": "shieldBreak",
              "why": "ボス（9F）のシールド2枚を割る。武器（アシスト）だと2Fのアシスト無効でスキルターンがリセットされ、ボスに間に合わないので本体で持つ",
              "fireAtFloor": 9,
              "mustBeBase": true
            },
            {
              "cap": "magnaNote",
              "why": "道中で使わないのは、功の上限値で超根性以外はワンパンで抜けるため",
              "note": true
            }
          ]
        },
        {
          "target": 12873,
          "part": "assist",
          "source": "作者本人（@pad_ultima127）の説明",
          "roles": [
            {
              "cap": "skillBoost",
              "why": "覚醒のスキブ目的。サノスを8Fで使えるようにするためのスキブ確保（チーム全体の合計で足りればOK）",
              "teamWide": true
            },
            {
              "cap": "dropEnhance",
              "why": "覚醒のドロップ強化はおまけ（キコルのドロップ強化の処理時間を短縮）",
              "optional": true
            },
            {
              "cap": "skillFree",
              "why": "スキルは使わないので何でもよい。副属性変更（水）も関係ない",
              "note": true
            }
          ],
          "onlyListed": true
        },
        {
          "target": 6978,
          "part": "base",
          "source": "作者本人（@pad_ultima127）の説明",
          "roles": [
            {
              "cap": "gravity",
              "why": "8Fの超根性を剥がす（敵の残りHP50%減少）。超根性はどれだけ大きいダメージでも最大HPの一定割合（原則50%）で一度止まるので、先にサノスで削ってワンパンにする",
              "fireAtFloor": 8
            },
            {
              "cap": "thanosNote",
              "why": "攻撃タイプだが火力覚醒的に火力枠ではない。功のHP倍率（攻撃タイプ2.7倍）が乗るのでHP条件が緩和される",
              "note": true
            }
          ]
        },
        {
          "target": 7544,
          "part": "assist",
          "source": "作者本人（@pad_ultima127）の説明",
          "roles": [
            {
              "cap": "poisonResist",
              "why": "編成全体で毒耐性を盛るため（キコルの生成は光5個だけで毒・爆弾を消しにくく、毒ダメージでHPが計算とずれる事故を防ぐ）",
              "teamWide": true
            },
            {
              "cap": "darkResist",
              "why": "編成全体で暗闇耐性を盛るため",
              "teamWide": true
            },
            {
              "cap": "dropEnhance",
              "why": "スキルのドロップ強化はおまけ",
              "optional": true
            },
            {
              "cap": "teamHp",
              "why": "チームHP強化は耐久が足りていれば不要",
              "optional": true
            },
            {
              "cap": "jammerResist",
              "why": "毒・お邪魔・暗闇耐性をパーティー全体で盛る（全体で100%あれば問題ない）",
              "teamWide": true
            }
          ]
        },
        {
          "target": 12930,
          "part": "base",
          "source": "作者本人（@pad_ultima127）の説明",
          "noSubstitute": "毎ターン使う生成キャラ（L字の光生成）は原則として代用できない",
          "roles": [
            {
              "cap": "lShapeGen",
              "why": "毎ターン確実にL字（光）を生成し、功とキコルのリーダースキル（軽減・倍率・固定2000万）を発動させる",
              "note": true
            },
            {
              "cap": "comboAbsorbNull",
              "why": "攻撃タイプエンハンス中、毎ターンのコンボ吸収を無効化"
            },
            {
              "cap": "kikoruNote",
              "why": "サブとフレンドの2体を交互に使って毎ターン使用。フレンドはリーダースキル（落ちコンなし・L字で82%軽減・200倍）も担う",
              "note": true
            }
          ]
        },
        {
          "target": 7265,
          "part": "assist",
          "source": "作者本人（@pad_ultima127）の説明",
          "roles": [
            {
              "cap": "haste",
              "why": "1Fで使うヘイスト（3ターン）",
              "minHaste": 3,
              "fireAtFloor": 1
            },
            {
              "cap": "attrAbsorbNull",
              "why": "1Fから使ってクリアまで続く属性吸収無効（18ターン）（クリア10ターン＋2F突破時のマイクロで1ターン経過扱い＝実質11ターン必要）",
              "minDur": 11
            },
            {
              "cap": "cloudResist",
              "why": "雲耐性で、L字（覚醒）がつながっているか確認しやすくする"
            },
            {
              "cap": "skillBoost",
              "why": "スキブはサノスを8Fで使うため＆初手で功などの武器を使えるようにするため",
              "teamWide": true
            },
            {
              "cap": "otherNote",
              "why": "操作時間3倍・火列強化などその他の覚醒はおまけ",
              "note": true
            }
          ]
        },
        {
          "target": 12848,
          "part": "assist",
          "source": "作者本人（@pad_ultima127）の説明",
          "roles": [
            {
              "cap": "dmgAbsorbNull",
              "why": "6Fのダメージ吸収を無効化",
              "fireAtFloor": 6
            },
            {
              "cap": "skillBoost",
              "why": "スキブ覚醒（サノスを8Fで使えるだけのスキブが他で足りていれば不要）",
              "optional": true,
              "teamWide": true
            },
            {
              "cap": "teamHp",
              "why": "チームHP強化覚醒（HPが足りていれば不要）",
              "optional": true
            },
            {
              "cap": "placement",
              "why": "功に持たせた理由: サノスに付けると武器を使った後に本体スキルを溜め直せず8Fに間に合わない／ミーメルは共鳴で耐久値を持っていて、武器を付けると共鳴が発動しない／キコルの武器はヘイスト役。そこでヘイストのない武器を功に付け、キコルの武器などのヘイストで1Fから功を使えるようにした",
              "note": true
            },
            {
              "cap": "delayNote",
              "why": "遅延は状態異常無効の敵には効かないので役割ではない。コンボ吸収無効も、同じ効果のスキルはターン数が上書きされるだけなので役割ではない",
              "note": true
            }
          ],
          "notRoles": [
            "comboAbsorbNull",
            "delay"
          ]
        },
        {
          "target": 10939,
          "part": "assist",
          "source": "作者本人（@pad_ultima127）の説明",
          "roles": [
            {
              "cap": "teamHp",
              "why": "チームHP強化×3で耐久を盛る（共鳴なしでも耐久が足りるなら不要）",
              "optional": true
            },
            {
              "cap": "resonance",
              "why": "ミーメルと共鳴（主属性が同じ＋タイプが1つ以上一致）してHPを上乗せ（共鳴なしでも耐久が足りるなら不要）",
              "optional": true
            },
            {
              "cap": "dropEnhance",
              "why": "ドロップ強化はおまけ",
              "optional": true
            },
            {
              "cap": "skillFree",
              "why": "スキルは使わないので何でもよい",
              "note": true
            }
          ],
          "onlyListed": true
        }
      ],
      "constraints": [
        {
          "type": "skillEveryTurn",
          "target": 12930,
          "from": 1,
          "why": "キコルを1Fからクリアまで毎ターン使う（リーダー・フレンドの倍率と火力の前提）",
          "source": "作者本人（@pad_ultima127）の説明"
        },
        {
          "type": "enhanceActive",
          "why": "攻撃タイプエンハンス中でないと、キコルのコンボ吸収無効とドロップ強化が働かない（この編成では両方必須）",
          "source": "作者本人（@pad_ultima127）の説明"
        },
        {
          "type": "order",
          "why": "1Fでキコル本体のスキルより先に功を使い、以降も功のエンハンスを切らさずループさせる（そのための1Fのヘイスト）",
          "source": "作者本人（@pad_ultima127）の説明"
        }
      ]
    },
    {
      "id": "hyaku-mastergundam-nanaminn",
      "dungeonId": "hyakushiki",
      "title": "マスターガンダム（落ちコンあり・安定版）",
      "timeSec": 317,
      "turns": 13,
      "yields": {
        "exp": 63003413,
        "plus": 2970
      },
      "members": [
        {
          "id": "n11149",
          "role": "L",
          "assist": "デッドプール＆ウルヴァリン 【コラボカバー・1】 No.11525"
        },
        {
          "id": "n11149",
          "role": "S",
          "assist": "ゼロの仮面 No.11377"
        },
        {
          "id": "n11149",
          "role": "S",
          "assist": "リチアの龍喚石 No.12714"
        },
        {
          "id": "n12530",
          "role": "S",
          "assist": "清海の女神・イシス＆ネフティスのうちわ No.11451"
        },
        {
          "id": "n10935",
          "role": "S",
          "assist": "FAIRY TAILのコラボ単行本【ナツ＆イグニール】 No.11938"
        },
        {
          "id": "n11149",
          "role": "F",
          "assist": "黒薔薇の種子 No.12441"
        }
      ],
      "steps": [
        "最速4分台後半、最遅でも5分前半（落ちコンあり版のプレイ履歴は5分16秒・13ターン）",
        "落ちコンなし版（4分51秒・12ターン）もあるが、タイム差は小さいので安定する落ちコンあり版がおすすめとのこと",
        "基本は闇正方形",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/1964101463040303524",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2025-09-05",
      "metrics": {
        "chars": 282,
        "puzzle": 3,
        "branch": 0,
        "caution": 1,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "hyaku-bazzb-totakke",
      "dungeonId": "hyakushiki",
      "title": "バズビー",
      "timeSec": 197,
      "turns": 10,
      "yields": {
        "plus": 2970
      },
      "members": [
        {
          "id": "n14078",
          "role": "L",
          "assist": "ナラ＆クインアスラ No.13980"
        },
        {
          "id": "n6978",
          "role": "S",
          "assist": "料理部の新鋭・ハトホルの学生証 No.7142"
        },
        {
          "id": "n10835",
          "role": "S",
          "assist": "夢幻空間の名探偵・シェリング・フォードのカード No.5619"
        },
        {
          "id": "n9912",
          "role": "S",
          "assist": "アレキサンダーの見聞録 No.8443"
        },
        {
          "id": "n13536",
          "role": "S",
          "assist": "［ワールドエンド・ブライド］北条加蓮のCD No.13584"
        },
        {
          "id": "n14078",
          "role": "F",
          "assist": "FAIRY TAILのコラボ単行本【ナツ＆イグニール】 No.11938"
        }
      ],
      "steps": [
        "バズビー編成の中では一番早いと思うとのこと（プレイ履歴は3分16秒・10ターン）",
        "基本は火の4と5の2コンボ。小鉄とリュウメイは適宜",
        "代用: 2・3・4番目のアシストは泥強を盛りつつ。5番目はシールド2枚破壊できるキャラ（盤面変更しないもの）、4番目はリュウメイに変更可",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/totqkke/status/2103265133426544753",
      "author": {
        "name": "とたっけ"
      },
      "sourceDate": "2026-09-24",
      "metrics": {
        "chars": 1073,
        "puzzle": 10,
        "branch": 3,
        "caution": 2,
        "zurashi": 0,
        "plus891": 0.16666666666666666,
        "plus891Text": null
      }
    },
    {
      "id": "senju-seiheart-kasajizo",
      "dungeonId": "senju",
      "title": "セイハーツ 全ずらし（4分前後）",
      "timeSec": 237,
      "turns": 10,
      "yields": {
        "exp": 68302017,
        "plus": 2970
      },
      "members": [
        {
          "id": "n14110",
          "role": "L",
          "assist": "ローネのトロンボーン No.8042"
        },
        {
          "id": "n13569",
          "role": "S",
          "assist": "冥境の黒熾龍・ゴウテンの櫛 No.10305"
        },
        {
          "id": "n12729",
          "role": "S",
          "assist": "おでん漫遊記 No.9205"
        },
        {
          "id": "n11545",
          "role": "S",
          "assist": "[うつつの華模様]塩見周子 No.14167"
        },
        {
          "id": "n12582",
          "role": "S",
          "assist": "アジサイの標本 No.7328"
        },
        {
          "id": "n14110",
          "role": "F",
          "assist": "ロザリンのティーセット No.13857"
        }
      ],
      "steps": [
        "全ずらしで1周4分前後（プレイ履歴は3分57秒・10ターン）",
        "スキルを押す数が少なく、キコルより考えることが少ない。超重力無効15ターンが強い",
        "試走は一部代用＆+891ありとのこと",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/kasajizo_pad/status/2103386046625132820",
      "author": {
        "name": "かさじぞう"
      },
      "sourceDate": "2026-09-25",
      "metrics": {
        "chars": 364,
        "puzzle": 0,
        "branch": 2,
        "caution": 5,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "senju-gintoki-nanaminn",
      "dungeonId": "senju",
      "title": "銀時 ずらし",
      "timeSec": 310,
      "turns": 11,
      "yields": {
        "exp": 69668057,
        "plus": 2970
      },
      "members": [
        {
          "id": "n13681",
          "role": "L",
          "assist": "キャプテンカツーラ＆ティーチ衣装の写真 No.13679"
        },
        {
          "id": "n12847",
          "role": "S",
          "assist": "ラクシュミー＆パールヴァティーの絵馬 No.13250"
        },
        {
          "id": "n6978",
          "role": "S",
          "assist": "奇怪冠の聖魔王・パイモンのキャンディ No.10646"
        },
        {
          "id": "n8327",
          "role": "S",
          "assist": "想星の健勇者・フェルルのショコラ No.13393"
        },
        {
          "id": "n13596",
          "role": "S",
          "assist": "水柱・冨岡義勇 No.6549"
        },
        {
          "id": "n13681",
          "role": "F",
          "assist": "虚栄の汰魔悟 No.13505"
        }
      ],
      "steps": [
        "プレイ履歴は5分10秒・11ターン",
        "基本はずらし。6Fで降三世明王の時のみ火L",
        "7Fは敵の色で分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2050494416302055720",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-05-02",
      "metrics": {
        "chars": 163,
        "puzzle": 2,
        "branch": 0,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "senju-gintoki-yp",
      "dungeonId": "senju",
      "title": "スオウ銀時（塩見入り・3分50秒）",
      "timeSec": 227,
      "turns": 11,
      "yields": {
        "exp": 68302017,
        "plus": 2970
      },
      "members": [
        {
          "id": "n13681",
          "role": "L",
          "assist": "[うつつの華模様]塩見周子 No.14167"
        },
        {
          "id": "n13596",
          "role": "S",
          "assist": "ダインの豪斧ダイヤアクス No.14099"
        },
        {
          "id": "n13846",
          "role": "S",
          "assist": "バフォメットのカード No.13936"
        },
        {
          "id": "n8304",
          "role": "S",
          "assist": "夏祭りの思い出・ラビリル＆ルゥの常夏ジュース No.14004"
        },
        {
          "id": "n6978",
          "role": "S",
          "assist": "奇怪冠の聖魔王・パイモンのキャンディ No.10646"
        },
        {
          "id": "n13681",
          "role": "F",
          "assist": "戦馬の支援機・スティード No.11458"
        }
      ],
      "steps": [
        "3分50秒くらい（プレイ履歴は3分47秒・11ターン）",
        "塩見の実装で10コンボしなくても火力が安定。バフォメット武器でコンボ吸収も無視できる",
        "7Fは敵の色で分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/YP_Pad_Hensei/status/2103428167151325628",
      "author": {
        "name": "YP(レシート投稿用)"
      },
      "sourceDate": "2026-09-25",
      "metrics": {
        "chars": 144,
        "puzzle": 2,
        "branch": 1,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0.3333333333333333,
        "plus891Text": null
      }
    },
    {
      "id": "senju-bambi-shion",
      "dungeonId": "senju",
      "title": "バンビエッタ×山爺 完全ずらし",
      "timeSec": 287,
      "turns": 11,
      "yields": {
        "exp": 65049540,
        "plus": 2970
      },
      "members": [
        {
          "id": "n14072",
          "role": "L",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n14090",
          "role": "S",
          "assist": "クウカンの封呪符 No.6693"
        },
        {
          "id": "n14063",
          "role": "S"
        },
        {
          "id": "n14040",
          "role": "S",
          "assist": "メタトロンのおせち料理 No.13244"
        },
        {
          "id": "n13828",
          "role": "S"
        },
        {
          "id": "n14040",
          "role": "F",
          "assist": "メタトロンのおせち料理 No.13244"
        }
      ],
      "steps": [
        "高速モードで4〜5分台（プレイ履歴は4分47秒・11ターン）。編成難易度はそこそこ低め",
        "完全ずらし、武器は全部スキルマ。一護織姫は報酬でOK",
        "代用: エキドナ武器→消滅3ヘイスト武器、メタトロン武器→消滅ヘイスト武器（泥強持ち推奨）。平子とソロメルの武器は自由",
        "1〜4Fはスキル順あり、以降バンビ山爺ループ",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/shion_3902/status/2102585853843587408",
      "author": {
        "name": "紫苑"
      },
      "sourceDate": "2026-09-23",
      "metrics": {
        "chars": 279,
        "puzzle": 3,
        "branch": 1,
        "caution": 0,
        "zurashi": 2,
        "plus891": 0,
        "plus891Text": null
      },
      "endorsedAlts": [
        {
          "target": 13367,
          "part": "assist",
          "nos": [],
          "text": "エキドナ武器の代わりに消滅3ヘイスト武器"
        },
        {
          "target": 13244,
          "part": "assist",
          "nos": [],
          "text": "メタトロン武器の代わりに消滅ヘイスト武器（泥強持ち推奨）"
        }
      ]
    },
    {
      "id": "senju-reinhard-nanaminn",
      "dungeonId": "senju",
      "title": "ラインハルト ずらし多め",
      "timeSec": 311,
      "turns": 10,
      "yields": {
        "exp": 98354904,
        "plus": 2970
      },
      "members": [
        {
          "id": "n13326",
          "role": "L",
          "assist": "命天龍・ゼルクレアの首飾り No.11211"
        },
        {
          "id": "n13403",
          "role": "S",
          "assist": "エキドナのお茶 No.13367"
        },
        {
          "id": "n11340",
          "role": "S",
          "assist": "赤霊の命央神・タカミムスビの耳飾り No.7265"
        },
        {
          "id": "n13349",
          "role": "S",
          "assist": "聖夜の聖装斧姫・ミリーのスノードーム No.13162"
        },
        {
          "id": "n6978",
          "role": "S",
          "assist": "奇怪冠の聖魔王・パイモンのキャンディ No.10646"
        },
        {
          "id": "n13326",
          "role": "F",
          "assist": "命天龍のソウル No.11578"
        }
      ],
      "steps": [
        "プレイ履歴は5分10秒・10ターン。キコルやネヴァン武器がない人向け",
        "助っ人ゼルクレアはスキルLv1、他はMAX。毎ターン光列＋回復",
        "2Fはルーレットが変わる前にずらす",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/2019600326165426662",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2026-02-06",
      "metrics": {
        "chars": 240,
        "puzzle": 2,
        "branch": 0,
        "caution": 1,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "senju-zenitsu-yu",
      "dungeonId": "senju",
      "title": "善逸 パズル楽（5分前半〜5分半）",
      "timeSec": 310,
      "turns": 10,
      "yields": {
        "exp": 66350531,
        "plus": 2970
      },
      "members": [
        {
          "id": "n12843",
          "role": "L",
          "assist": "ウルヴァリン【コミックカバー・2】 No.9114"
        },
        {
          "id": "n12834",
          "role": "S",
          "assist": "メタルドラゴンの宝杯 No.12616"
        },
        {
          "id": "n12849",
          "role": "S",
          "assist": "冥境の黒熾龍・ゴウテンの櫛 No.10305"
        },
        {
          "id": "n12715",
          "role": "S",
          "assist": "流華龍の神器・カヌー No.10554"
        },
        {
          "id": "n6978",
          "role": "S",
          "assist": "奇怪冠の聖魔王・パイモンのキャンディ No.10646"
        },
        {
          "id": "n12843",
          "role": "F",
          "assist": "雷神の玉 No.12407"
        }
      ],
      "steps": [
        "5分前半〜5分半（プレイ履歴は5分09秒・10ターン、別の周回は5分37秒・11ターン）",
        "基本は光4＋1コンボ。10コンボ吸収の敵には＋2コンボ",
        "6F・7Fは敵の色で分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/yu_mopa25/status/1959505953419907375",
      "author": {
        "name": "yu"
      },
      "sourceDate": "2025-08-24",
      "metrics": {
        "chars": 330,
        "puzzle": 5,
        "branch": 2,
        "caution": 1,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    },
    {
      "id": "senju-douma-nanaminn",
      "dungeonId": "senju",
      "title": "童磨 LF武器自由（水十字）",
      "timeSec": 337,
      "turns": 10,
      "yields": {
        "exp": 68302017,
        "plus": 2970
      },
      "members": [
        {
          "id": "n12832",
          "role": "L"
        },
        {
          "id": "n6978",
          "role": "S",
          "assist": "凶禍龍・アマージュ No.7549"
        },
        {
          "id": "n9281",
          "role": "S",
          "assist": "木星の魔導神機・ジュピトールのブレスレット No.10527"
        },
        {
          "id": "n12729",
          "role": "S",
          "assist": "奇怪冠の聖魔王・パイモンのキャンディ No.10646"
        },
        {
          "id": "n12812",
          "role": "S",
          "assist": "ソー＆ザ・マイティ・ソー【コラボカバー・1】 No.11528"
        },
        {
          "id": "n12832",
          "role": "F"
        }
      ],
      "steps": [
        "5分半〜5分後半（プレイ履歴は5分36秒・10ターン）",
        "パズルは水十字1コンボを組むだけ。2Fの変色ルーレットも返せる",
        "リーダー・フレンドの武器は自由。ジュピトール武器以外は全て代用あり。サノスもアークヴェルザ武器で代用可能かも",
        "7Fは敵の色で分岐",
        "全フロアの手順は出典の画像を参照"
      ],
      "source": "https://x.com/pad_nanaminn/status/1959523580016013626",
      "author": {
        "name": "七海黄猿"
      },
      "sourceDate": "2025-08-24",
      "metrics": {
        "chars": 174,
        "puzzle": 3,
        "branch": 0,
        "caution": 0,
        "zurashi": 0,
        "plus891": 0,
        "plus891Text": null
      }
    }
  ],
  "removed": {
    "dungeons": [
      "fuun-challenge",
      "tenkyu-challenge",
      "taiju-challenge",
      "jupiter-challenge"
    ],
    "teams": [
      "taiju-dain-matsu-918"
    ]
  }
};
