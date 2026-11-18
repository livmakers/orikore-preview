/* ============================================================
   折りこれ orikore.js — 計測（GA4）・扉のクリック・フォーム送信・サンクス
   外部ライブラリなし。GA4 / Turnstile のみ外部読み込み。
   KPIイベント: sample_request / consult_submit / consult_photo / thanks_view
   補助イベント: cta_click（cta_position=設置位置, cta_door=sample|contact）
   ============================================================ */
(function () {
  "use strict";
  var C = window.ORIKORE || {};
  var root = document.documentElement.getAttribute("data-root") || "./";

  /* ---------------- GA4 ---------------- */
  window.dataLayer = window.dataLayer || [];
  var live = (C.gaHosts || []).indexOf(location.hostname) !== -1;
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.__orikoreEvents = [];
  if (live && C.ga4Id) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(C.ga4Id);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", C.ga4Id, { page_path: location.pathname });
  }
  /* イベント送信。callback は GA 応答 or タイムアウトの早い方で1回だけ呼ぶ */
  function track(name, params, callback) {
    params = params || {};
    params.page_path = params.page_path || location.pathname;
    window.__orikoreEvents.push({ name: name, params: params });
    var done = false;
    function fin() { if (!done) { done = true; if (callback) callback(); } }
    if (live && C.ga4Id) {
      params.event_callback = fin;
      params.event_timeout = 1200;
      gtag("event", name, params);
      setTimeout(fin, 1300);
    } else {
      if (window.console) console.info("[orikore:ga4]", name, params);
      setTimeout(fin, 0);
    }
  }
  window.orikoreTrack = track;

  /* ---------------- 写真のめくれ・浮き上がり・帯のパララックス ---------------- */
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".wipe,.rise");
  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
    var bands = document.querySelectorAll(".band-ph > .ph img");
    if (bands.length) {
      var tick = false;
      var move = function () {
        bands.forEach(function (img) {
          var r = img.parentNode.parentNode.getBoundingClientRect();
          var p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
          img.style.transform = "translateY(" + (p * -60).toFixed(1) + "px)";
        });
        tick = false;
      };
      addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(move); } }, { passive: true });
      move();
    }
  }

  /* ---------------- 扉のクリック（全ページ） ---------------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-cta]");
    if (!a) return;
    track("cta_click", {
      cta_position: a.getAttribute("data-cta"),
      cta_door: a.getAttribute("data-door") || "",
      link_url: a.getAttribute("href") || ""
    });
  });

  /* ---------------- サンクス ---------------- */
  var thanks = document.querySelector("[data-thanks]");
  if (thanks) {
    var q = new URLSearchParams(location.search);
    var door = q.get("door") === "contact" ? "contact" : (q.get("door") === "sample" ? "sample" : "");
    var sid = q.get("sid") || "";
    var h1 = thanks.querySelector("h1");
    if (h1 && door && h1.getAttribute("data-h1-" + door)) h1.textContent = h1.getAttribute("data-h1-" + door);
    document.querySelectorAll("[data-show-door]").forEach(function (el) {
      el.hidden = el.getAttribute("data-show-door") !== (door || "none");
    });
    /* 送信直後の到達だけを数える（直アクセス・再読込では数えない） */
    var key = "orikore_thanks_" + sid;
    var seen = false;
    try { seen = !!sessionStorage.getItem(key); } catch (err) {}
    var mine = "";
    try { mine = sessionStorage.getItem("orikore_sent_sid") || ""; } catch (err) {}
    /* 直前に自分が送信した sid と一致するときだけ数える（URL直打ち・ボットを除外） */
    if (door && sid && sid === mine && !seen) {
      try { sessionStorage.setItem(key, "1"); } catch (err) {}
      track("thanks_view", { door: door });
    }
  }

  /* ---------------- フォーム ---------------- */
  var form = document.querySelector("form[data-door]");
  if (!form) return;
  var door = form.getAttribute("data-door");
  var status = form.querySelector(".form-status");
  var submitBtn = form.querySelector("[type=submit]");
  var startedAt = Date.now();
  var startTracked = false;
  form.querySelector("[name=_t]").value = String(Math.floor(startedAt / 1000));
  form.addEventListener("focusin", function () {
    if (startTracked) return;
    startTracked = true;
    track("form_start", { door: door });
    loadTurnstile();
  });

  /* Turnstile（設定時のみ） */
  var tsLoaded = false;
  function loadTurnstile() {
    var box = form.querySelector(".ts-box");
    if (tsLoaded || !box || !C.turnstileSitekey) return;
    tsLoaded = true;
    window.__orikoreTs = function () {
      window.turnstile.render(box, { sitekey: C.turnstileSitekey, appearance: "interaction-only" });
    };
    var t = document.createElement("script");
    t.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__orikoreTs";
    t.async = true; t.defer = true;
    document.head.appendChild(t);
  }
  if (location.hash === "#form") loadTurnstile();
  setTimeout(loadTurnstile, 2500);

  /* 写真（相談フォームのみ） */
  var photos = [];
  var fileInput = form.querySelector("input[type=file]");
  var thumbs = form.querySelector(".thumbs");
  var drop = form.querySelector(".drop");
  var max = C.maxPhotos || 3;
  function renderThumbs() {
    if (!thumbs) return;
    thumbs.innerHTML = "";
    photos.forEach(function (f, i) {
      var d = document.createElement("div");
      d.className = "thumb";
      var img = document.createElement("img");
      img.alt = "添付する写真 " + (i + 1);
      img.src = URL.createObjectURL(f);
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "写真" + (i + 1) + "を外す");
      b.textContent = "×";
      b.addEventListener("click", function () { photos.splice(i, 1); renderThumbs(); });
      d.appendChild(img); d.appendChild(b); thumbs.appendChild(d);
    });
    var cnt = form.querySelector(".photo-count");
    if (cnt) cnt.textContent = photos.length ? photos.length + "枚 選択中（最大" + max + "枚）" : "";
  }
  function addFiles(list) {
    var over = false;
    Array.prototype.forEach.call(list, function (f) {
      if (!/^image\//.test(f.type) && !/\.(heic|heif)$/i.test(f.name)) return;
      if (photos.length >= max) { over = true; return; }
      photos.push(f);
    });
    renderThumbs();
    if (over) say("写真は" + max + "枚までです。", true);
  }
  if (fileInput) {
    fileInput.addEventListener("change", function () { addFiles(fileInput.files); fileInput.value = ""; });
  }
  if (drop) {
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); });
    });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer) addFiles(e.dataTransfer.files); });
  }

  /* ブラウザ内で長辺を縮めてJPEG化（重い写真でも確実に届ける）。失敗時は原本 */
  function shrink(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var edge = C.photoMaxEdge || 2000;
        var r = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
        if (r === 1 && file.size < 1.5 * 1024 * 1024 && /jpe?g|png|webp/.test(file.type)) { resolve(file); return; }
        var cv = document.createElement("canvas");
        cv.width = Math.round(img.naturalWidth * r);
        cv.height = Math.round(img.naturalHeight * r);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(function (b) {
          URL.revokeObjectURL(url);
          if (!b) { resolve(file); return; }
          resolve(new File([b], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function say(msg, isErr) {
    if (!status) return;
    status.textContent = msg;
    status.classList.toggle("is-error", !!isErr);
  }
  function fieldErr(el, msg) {
    var wrap = el.closest(".field");
    var e = wrap && wrap.querySelector(".err");
    if (e) e.textContent = msg || "";
    if (el.setAttribute) el.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function validate() {
    var first = null;
    form.querySelectorAll("[data-required]").forEach(function (el) {
      var v = (el.value || "").trim();
      var msg = "";
      if (!v) msg = "入力してください。";
      else if (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = "メールアドレスの形式を確認してください。";
      fieldErr(el, msg);
      if (msg && !first) first = el;
    });
    var group = form.querySelector("[data-required-group]");
    if (group) {
      var any = group.querySelector("input:checked");
      var ge = group.querySelector(".err");
      if (ge) ge.textContent = any ? "" : "1つ以上選んでください。";
      if (!any && !first) first = group.querySelector("input");
    }
    if (first) { first.focus(); say("入力内容を確認してください。", true); return false; }
    return true;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;
    submitBtn.disabled = true;
    say("送信しています…", false);
    var fd = new FormData(form);
    fd.delete("photos[]");
    Promise.all(photos.map(shrink)).then(function (files) {
      files.forEach(function (f) { fd.append("photos[]", f, f.name); });
      return fetch(root + (C.endpoint || "send.php"), {
        method: "POST", body: fd, headers: { "Accept": "application/json" }, credentials: "same-origin"
      });
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, message: "通信エラーが発生しました。" }; });
    }).then(function (res) {
      if (!res || !res.ok) {
        submitBtn.disabled = false;
        say((res && res.message) || "送信できませんでした。時間をおいて再度お試しください。", true);
        if (window.turnstile) { try { window.turnstile.reset(); } catch (err) {} }
        return;
      }
      var sid = res.sid || String(Date.now());
      if (res.dropped) { location.href = root + "thanks/?door=" + door; return; } /* 破棄扱いは計測しない */
      try { sessionStorage.setItem("orikore_sent_sid", sid); } catch (err) {}
      var next = root + "thanks/?door=" + door + "&sid=" + encodeURIComponent(sid);
      var go = function () { location.href = next; };
      if (door === "sample") {
        track("sample_request", { door: "sample", sample_kinds: fd.getAll("kinds[]").length }, go);
      } else {
        var n = photos.length;
        var pending = n ? 2 : 1;
        var one = function () { pending -= 1; if (pending === 0) go(); };
        track("consult_submit", { door: "contact", photo_count: n }, one);
        if (n) track("consult_photo", { door: "contact", photo_count: n }, one);
      }
    }).catch(function () {
      submitBtn.disabled = false;
      say("通信エラーが発生しました。電波の良い場所で再度お試しください。", true);
    });
  });
})();
