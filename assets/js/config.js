/* 折りこれ フロント設定（秘密情報は置かない。秘密は send-config.php 側） */
window.ORIKORE = {
  /* 既存 tnk-tanaka.co.jp と同じ GA4 プロパティに載せる（本番トップの gtag と同一ID） */
  ga4Id: "G-2XXY5JB1JP",
  /* GA を実送信するホスト。ここ以外（ローカル・LAN確認）では console に出すだけ */
  gaHosts: ["www.tnk-tanaka.co.jp", "tnk-tanaka.co.jp"],
  /* 送信先（相対パス＝/orikore/send.php） */
  endpoint: "send.php",   /* data-root（サイト直下）からの相対 */
  /* Cloudflare Turnstile のサイトキー（en-v2 と同一ドメイン用キー）。空なら描画しない */
  turnstileSitekey: "0x4AAAAAAEL2kK2bA3tss78K",
  /* 写真添付 */
  maxPhotos: 3,
  photoMaxEdge: 2000,      /* 長辺px。ブラウザ内で縮小してから送る */
  photoMaxBytes: 8 * 1024 * 1024
};
