/* ============================================================
   JWP ポータブルブロック共通 motion.js
   準拠: JWPブロック量産 実行プロンプト v1.0 §4
   外部ライブラリ禁止・transform/opacity のみ・LCP要素には触れない。
   ============================================================ */
(function(){
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return; /* 完成形はCSS側で最初から表示済み */

  var hasScrollTimeline = CSS.supports && CSS.supports("animation-timeline: view()");

  /* ---- リビール: scroll-driven 非対応時のみ IO フォールバック ---- */
  if (!hasScrollTimeline) {
    document.documentElement.classList.add("no-scroll-timeline");
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        var el = e.target;
        el.style.willChange = "opacity, transform";
        el.classList.add("is-inview");
        el.addEventListener("transitionend", function h(){
          el.style.willChange = "";
          el.removeEventListener("transitionend", h);
        });
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    document.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });
  }

  /* ---- ダイライン: スクロール連動で折り線が引かれる ---- */
  var dielines = document.querySelectorAll(".dieline[data-draw] svg");
  if (dielines.length) {
    dielines.forEach(function(svg){
      svg.querySelectorAll(".cut,.crease,.perf,.half").forEach(function(p){
        var len = 0;
        try { len = p.getTotalLength(); } catch(e){ return; }
        p.dataset.len = len;
        /* 破線パターンを殺さないよう pathLength を正規化して上書き描画 */
        p.style.strokeDasharray = len + " " + len;
        p.style.strokeDashoffset = len;
      });
    });
    var draw = function(){
      dielines.forEach(function(svg){
        var r = svg.getBoundingClientRect();
        var vh = window.innerHeight;
        /* 要素上端が画面80%位置に来てから、40%位置までで描き切る */
        var t = (vh * 0.8 - r.top) / (vh * 0.4);
        t = Math.max(0, Math.min(1, t));
        svg.querySelectorAll(".cut,.crease,.perf,.half").forEach(function(p){
          var len = parseFloat(p.dataset.len || 0);
          if (!len) return;
          p.style.strokeDashoffset = String(len * (1 - t));
          if (t >= 1) {
            /* 描き切ったら本来の破線パターンへ戻す */
            p.style.strokeDasharray = "";
            p.style.strokeDashoffset = "";
            p.removeAttribute("data-len");
          }
        });
      });
      dielines = Array.prototype.filter.call(dielines, function(svg){
        return svg.querySelector("[data-len]");
      });
      if (dielines.length) requestAnimationFrame(function(){ ticking = false; });
      else window.removeEventListener("scroll", onScroll);
    };
    var ticking = false;
    var onScroll = function(){
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function(){ draw(); ticking = false; });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    draw();
  }

  /* ---- 箔ハイライト: スクロール量に角度連動（デスクトップのみ）---- */
  var fine = window.matchMedia("(pointer: fine)").matches;
  if (fine && CSS.supports && CSS.supports("background-clip: text")) {
    var foils = document.querySelectorAll(".foil,.foil--gin");
    if (foils.length) {
      var lastY = -1;
      var foilTick = false;
      window.addEventListener("scroll", function(){
        if (foilTick) return;
        foilTick = true;
        requestAnimationFrame(function(){
          var y = window.scrollY;
          if (y !== lastY) {
            lastY = y;
            var angle = (120 + y * 0.15) % 360;
            foils.forEach(function(el){ el.style.setProperty("--foil-angle", angle + "deg"); });
          }
          foilTick = false;
        });
      }, { passive: true });
    }
  }
})();
