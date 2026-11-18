/* クリックジャッキング対策（metaでは frame-ancestors が効かないため） */
if (self !== top) { try { top.location = self.location; } catch (e) { document.documentElement.style.display = "none"; } }
/* JSが動く環境だけスクロール演出を有効にする（無い環境では最初から全部見える） */
document.documentElement.classList.add("js");
