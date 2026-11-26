/**
 * RBN Kingshot ツール群 共通Firebase初期化・共通設定ユーティリティ
 * - 既存のFirebaseプロジェクト設定・RTDBデータパス・localStorageキーをそのまま維持します。
 * - サブディレクトリ構成（map/・bear/・notice/）移行前の旧相対パスを自動補正します。
 */
(function (global) {
  "use strict";

  const SHARED_SETTINGS_KEY = "rbn_suite_shared_settings_v1";

  const FIREBASE_CONFIG = Object.freeze({
    apiKey: "AIzaSyCeqmlkZZNDhMJA1RZc8t93OqqJ4f8xfT8",
    authDomain: "kingshot-rbn-map.firebaseapp.com",
    databaseURL: "https://kingshot-rbn-map-default-rtdb.firebaseio.com",
    projectId: "kingshot-rbn-map",
    storageBucket: "kingshot-rbn-map.firebasestorage.app",
    messagingSenderId: "1027580412556",
    appId: "1:1027580412556:web:a3e4bf85330b9dcda131a9",
    measurementId: "G-4VWDX8BCKN"
  });

  const DB_PATHS = Object.freeze({
    cityMap: "alliances/main_map_40x40",
    bearMaster: "bear_master",
    noticeHistory: "kingshot_notice_history"
  });

  const SUBPAGE_DEFAULT_LINKS = Object.freeze({
    cityMapUrl: "../map/",
    bearNavUrl: "../bear/",
    noticeGenUrl: "../notice/"
  });

  const ROOT_DEFAULT_LINKS = Object.freeze({
    cityMapUrl: "./map/",
    bearNavUrl: "./bear/",
    noticeGenUrl: "./notice/"
  });

  const LEGACY_LINK_PATTERNS = Object.freeze({
    cityMapUrl: /^(?:\.\/)?index\.html$|^(\.\.\/|\.\/)?map(?:\/(?:index\.html)?)?$/i,
    bearNavUrl: /^(?:\.\/)?rbn-bear\.html$|^(\.\.\/|\.\/)?bear(?:\/(?:index\.html)?)?$/i,
    noticeGenUrl: /^(?:\.\/)?rbn-notice\.html$|^(\.\.\/|\.\/)?notice(?:\/(?:index\.html)?)?$/i
  });

  function safeStorageGet(key) {
    try {
      return global.localStorage ? global.localStorage.getItem(key) : null;
    } catch (_) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      if (global.localStorage) {
        global.localStorage.setItem(key, value);
        return true;
      }
    } catch (err) {
      console.warn("[RBNSuite] localStorage 書き込み失敗:", key, err);
    }
    return false;
  }

  function normalizeDatabaseUrl(raw) {
    return String(raw || "")
      .trim()
      .replace(/\/+$/, "")
      .replace(/\/bear_master$/, "")
      .replace(/\/kingshot_notice_history$/, "")
      .replace(/\/alliances\/main_map_40x40$/, "");
  }

  function getNoticeRestBaseUrl(raw) {
    const trimmed = String(raw || "").trim().replace(/\/+$/, "");
    if (!trimmed) {
      return `${FIREBASE_CONFIG.databaseURL}/${DB_PATHS.noticeHistory}`;
    }
    if (trimmed.endsWith(`/${DB_PATHS.noticeHistory}`)) {
      return trimmed;
    }
    const rootUrl = normalizeDatabaseUrl(trimmed) || FIREBASE_CONFIG.databaseURL;
    return `${rootUrl}/${DB_PATHS.noticeHistory}`;
  }

  function normalizeToolLink(rawUrl, toolKey, options) {
    const fromRoot = Boolean(options && options.fromRoot);
    const defaults = fromRoot ? ROOT_DEFAULT_LINKS : SUBPAGE_DEFAULT_LINKS;
    const fallback = defaults[toolKey] || "";
    const trimmed = String(rawUrl || "").trim();

    if (!trimmed) {
      return fallback;
    }
    // 外部URL（https:// 等）はユーザーのカスタム設定としてそのまま尊重
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    const pattern = LEGACY_LINK_PATTERNS[toolKey];
    if (pattern && pattern.test(trimmed)) {
      return fallback;
    }
    return trimmed;
  }

  function getDefaultSharedSettings(options) {
    const fromRoot = Boolean(options && options.fromRoot);
    const links = fromRoot ? ROOT_DEFAULT_LINKS : SUBPAGE_DEFAULT_LINKS;
    return {
      links: {
        cityMapUrl: links.cityMapUrl,
        bearNavUrl: links.bearNavUrl,
        noticeGenUrl: links.noticeGenUrl
      },
      firebase: {
        databaseUrl: FIREBASE_CONFIG.databaseURL
      },
      ai: {
        studioApiKey: ""
      }
    };
  }

  function loadSharedSettings(options) {
    const base = getDefaultSharedSettings(options);
    const raw = safeStorageGet(SHARED_SETTINGS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          base.links = {
            cityMapUrl: normalizeToolLink(parsed.links && parsed.links.cityMapUrl, "cityMapUrl", options),
            bearNavUrl: normalizeToolLink(parsed.links && parsed.links.bearNavUrl, "bearNavUrl", options),
            noticeGenUrl: normalizeToolLink(parsed.links && parsed.links.noticeGenUrl, "noticeGenUrl", options)
          };
          base.firebase = {
            databaseUrl:
              normalizeDatabaseUrl(parsed.firebase && parsed.firebase.databaseUrl) || FIREBASE_CONFIG.databaseURL
          };
          base.ai = {
            studioApiKey: String((parsed.ai && parsed.ai.studioApiKey) || "").trim()
          };
        }
      } catch (err) {
        console.warn("[RBNSuite] 共通設定JSONの読込に失敗したため既定値を使用します:", err);
      }
    }

    const legacyKey = safeStorageGet("ks_gemini_api_key");
    if (!base.ai.studioApiKey && legacyKey) {
      base.ai.studioApiKey = String(legacyKey).trim();
    }
    return base;
  }

  function saveSharedSettings(nextSettings, options) {
    const next = nextSettings && typeof nextSettings === "object" ? nextSettings : {};
    const saved = {
      links: {
        cityMapUrl: normalizeToolLink(next.links && next.links.cityMapUrl, "cityMapUrl", options),
        bearNavUrl: normalizeToolLink(next.links && next.links.bearNavUrl, "bearNavUrl", options),
        noticeGenUrl: normalizeToolLink(next.links && next.links.noticeGenUrl, "noticeGenUrl", options)
      },
      firebase: {
        databaseUrl:
          normalizeDatabaseUrl(next.firebase && next.firebase.databaseUrl) || FIREBASE_CONFIG.databaseURL
      },
      ai: {
        studioApiKey: String((next.ai && next.ai.studioApiKey) || "").trim()
      }
    };

    safeStorageSet(SHARED_SETTINGS_KEY, JSON.stringify(saved));
    if (saved.ai.studioApiKey) {
      safeStorageSet("ks_gemini_api_key", saved.ai.studioApiKey);
    }
    return saved;
  }

  function getFirebaseConfig(customDbUrl) {
    const cleanUrl = normalizeDatabaseUrl(customDbUrl) || FIREBASE_CONFIG.databaseURL;
    return {
      apiKey: FIREBASE_CONFIG.apiKey,
      authDomain: FIREBASE_CONFIG.authDomain,
      databaseURL: cleanUrl,
      projectId: FIREBASE_CONFIG.projectId,
      storageBucket: FIREBASE_CONFIG.storageBucket,
      messagingSenderId: FIREBASE_CONFIG.messagingSenderId,
      appId: FIREBASE_CONFIG.appId,
      measurementId: FIREBASE_CONFIG.measurementId
    };
  }

  function initRealtimeDatabase(options) {
    const opts = options || {};
    const cleanUrl = normalizeDatabaseUrl(opts.databaseUrl) || FIREBASE_CONFIG.databaseURL;
    const cfg = getFirebaseConfig(cleanUrl);

    const hasValidConfig =
      cfg &&
      typeof cfg.apiKey === "string" &&
      cfg.apiKey.length > 0 &&
      !cfg.apiKey.startsWith("YOUR_") &&
      typeof cleanUrl === "string" &&
      /^https?:\/\//i.test(cleanUrl);

    if (!hasValidConfig) {
      return { ok: false, reason: "invalid-config", databaseUrl: cleanUrl };
    }

    if (typeof global.firebase === "undefined" || typeof global.firebase.initializeApp !== "function") {
      return { ok: false, reason: "sdk-missing", databaseUrl: cleanUrl };
    }

    try {
      const fb = global.firebase;
      let app;
      if (!fb.apps.length) {
        app = fb.initializeApp(cfg);
      } else {
        const matched = fb.apps.find(
          (a) => a && a.options && normalizeDatabaseUrl(a.options.databaseURL) === cleanUrl
        );
        if (matched) {
          app = matched;
        } else {
          const baseName = opts.customAppName || "rbnCustomApp";
          let appName = baseName;
          let seq = 1;
          while (fb.apps.some((a) => a.name === appName)) {
            appName = `${baseName}_${seq++}`;
          }
          app = fb.initializeApp(cfg, appName);
        }
      }
      const db = fb.database(app);
      return { ok: true, app, db, databaseUrl: cleanUrl };
    } catch (error) {
      console.warn("[RBNSuite] Firebase 初期化エラー:", error);
      return { ok: false, reason: "init-error", error, databaseUrl: cleanUrl };
    }
  }

  async function safeCopyText(text) {
    const str = String(text ?? "");
    if (global.navigator && global.navigator.clipboard && typeof global.navigator.clipboard.writeText === "function") {
      try {
        await global.navigator.clipboard.writeText(str);
        return true;
      } catch (_) {
        // fallback へ
      }
    }
    try {
      const ta = global.document.createElement("textarea");
      ta.value = str;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.opacity = "0";
      global.document.body.appendChild(ta);
      ta.select();
      const ok = global.document.execCommand("copy");
      global.document.body.removeChild(ta);
      return Boolean(ok);
    } catch (err) {
      console.warn("[RBNSuite] クリップボードコピー失敗:", err);
      return false;
    }
  }

  let toastHideTimer = null;

  // ==================== メンバーアイコン遊び心演出（共通モジュール） ====================
  const PLAYFUL_PREFS_KEY = "rbn_playful_prefs_v1";
  const AVATAR_CACHE_KEY = "rbn_member_avatars_cache_v1";
  const ROSTER_LOCAL_KEY = "kingshot_40x40_roster_facilities_v4";
  const AVATAR_CACHE_TTL_MS = 15 * 60 * 1000;

  const PLAYFUL_FEATURE_DEFS = Object.freeze([
    { key: "portalPeek", group: "🏠 トップページ", label: "👀 ひょっこり顔出し", desc: "画面端からランダムなメンバーがひょっこり一言つぶやきます" },
    { key: "portalPickup", group: "🏠 トップページ", label: "🌟 本日のピックアップ", desc: "日替わりで選ばれたメンバーをアイコン付きで紹介します" },
    { key: "portalRibbon", group: "🏠 トップページ", label: "🎞️ フッターのアイコン帯", desc: "下部に同盟メンバーのアイコンがゆっくり流れます" },
    { key: "mapPeekJump", group: "🗺️ 都市マップ", label: "📍 ひょっこり→都市へジャンプ", desc: "たまに現れるメンバーをタップするとその都市へ移動します" },
    { key: "bearCheer", group: "🐻 熊編成ナビ", label: "🔥 コピー時の熊出陣応援", desc: "編成コピー時にメンバーが応援カットインします" },
    { key: "bearGuide", group: "🐻 熊編成ナビ", label: "🎖️ 本日の熊ナビ案内役", desc: "ヘッダー横にランダムな案内役メンバーを表示します" },
    { key: "noticeWriting", group: "📢 同盟通知作成", label: "✍️ AI生成中の代筆演出", desc: "AI解析の待ち時間にメンバーが代筆中コメントを出します" },
    { key: "noticeCopyReact", group: "📢 同盟通知作成", label: "📣 コピー完了のひとこと反応", desc: "通知文コピー後にメンバーがひとことリアクションします" },
    { key: "toastAvatar", group: "🎁 全ツール共通", label: "💬 通知トーストにアイコン添え", desc: "保存やコピー通知にランダムなアイコンを添えます" },
    { key: "titleShower", group: "🎁 全ツール共通", label: "🎉 タイトル5連打シャワー", desc: "各画面タイトルを5連打すると全員のアイコンが降ります" }
  ]);

  let cachedAvatarsMem = null;
  let avatarFetchPromise = null;
  const avatarListeners = new Set();
  const prefsListeners = new Set();

  function getDefaultPlayfulPrefs() {
    const prefs = {};
    PLAYFUL_FEATURE_DEFS.forEach(function (d) {
      prefs[d.key] = true;
    });
    return prefs;
  }

  function loadPlayfulPrefs() {
    const base = getDefaultPlayfulPrefs();
    const raw = safeStorageGet(PLAYFUL_PREFS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          PLAYFUL_FEATURE_DEFS.forEach(function (d) {
            if (typeof parsed[d.key] === "boolean") {
              base[d.key] = parsed[d.key];
            }
          });
        }
      } catch (_) {}
    }
    return base;
  }

  function isPlayfulEnabled(key) {
    const prefs = loadPlayfulPrefs();
    return Boolean(prefs[key]);
  }

  function savePlayfulPrefs(nextPrefs) {
    const merged = loadPlayfulPrefs();
    if (nextPrefs && typeof nextPrefs === "object") {
      PLAYFUL_FEATURE_DEFS.forEach(function (d) {
        if (typeof nextPrefs[d.key] === "boolean") {
          merged[d.key] = nextPrefs[d.key];
        }
      });
    }
    safeStorageSet(PLAYFUL_PREFS_KEY, JSON.stringify(merged));
    prefsListeners.forEach(function (fn) {
      try { fn(merged); } catch (_) {}
    });
    return merged;
  }

  function onPlayfulPrefsChange(fn) {
    if (typeof fn === "function") prefsListeners.add(fn);
    return function () { prefsListeners.delete(fn); };
  }

  function sanitizeAvatarEntry(m) {
    if (!m || typeof m !== "object") return null;
    const icon = typeof m.icon === "string" ? m.icon.trim() : "";
    const name = typeof m.name === "string" ? m.name.trim() : "";
    if (!icon || !icon.startsWith("data:image/")) return null;
    return {
      id: Number.isInteger(m.id) ? m.id : null,
      name: name || "RBNメンバー",
      power: Number.isFinite(Number(m.power)) ? Number(m.power) : 0,
      x: Number.isInteger(m.x) ? m.x : null,
      y: Number.isInteger(m.y) ? m.y : null,
      icon: icon
    };
  }

  function readLocalAvatarsSync() {
    // 1. 都市マップのローカル保存データから最優先で取得
    const rosterRaw = safeStorageGet(ROSTER_LOCAL_KEY);
    if (rosterRaw) {
      try {
        const parsed = JSON.parse(rosterRaw);
        if (parsed && Array.isArray(parsed.members)) {
          const list = parsed.members.map(sanitizeAvatarEntry).filter(Boolean);
          if (list.length > 0) {
            cachedAvatarsMem = list;
            return list;
          }
        }
      } catch (_) {}
    }
    // 2. 軽量アバターキャッシュから取得
    const cacheRaw = safeStorageGet(AVATAR_CACHE_KEY);
    if (cacheRaw) {
      try {
        const parsed = JSON.parse(cacheRaw);
        if (parsed && Array.isArray(parsed.list)) {
          const list = parsed.list.map(sanitizeAvatarEntry).filter(Boolean);
          if (list.length > 0) {
            cachedAvatarsMem = list;
            return list;
          }
        }
      } catch (_) {}
    }
    return Array.isArray(cachedAvatarsMem) ? cachedAvatarsMem : [];
  }

  function notifyAvatarListeners(list) {
    avatarListeners.forEach(function (fn) {
      try { fn(list); } catch (_) {}
    });
  }

  function refreshPlayfulAvatarsFromLocal() {
    const list = readLocalAvatarsSync();
    if (list.length > 0) {
      safeStorageSet(AVATAR_CACHE_KEY, JSON.stringify({ updatedAt: Date.now(), list: list }));
    }
    notifyAvatarListeners(list);
    return list;
  }

  async function ensureMemberAvatarsLoaded(forceRemote) {
    const localList = readLocalAvatarsSync();
    let cacheFresh = false;
    try {
      const cacheRaw = safeStorageGet(AVATAR_CACHE_KEY);
      if (cacheRaw) {
        const parsed = JSON.parse(cacheRaw);
        if (parsed && Number.isFinite(parsed.updatedAt) && Date.now() - parsed.updatedAt < AVATAR_CACHE_TTL_MS && Array.isArray(parsed.list) && parsed.list.length > 0) {
          cacheFresh = true;
        }
      }
    } catch (_) {}

    if (!forceRemote && localList.length > 0 && cacheFresh) {
      return localList;
    }

    if (!avatarFetchPromise) {
      avatarFetchPromise = (async function () {
        try {
          const settings = loadSharedSettings();
          const dbUrl = normalizeDatabaseUrl(settings.firebase && settings.firebase.databaseUrl) || FIREBASE_CONFIG.databaseURL;
          const url = `${dbUrl}/${DB_PATHS.cityMap}/members.json`;
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data && typeof data === "object" ? Object.values(data) : [];
            const list = arr.map(sanitizeAvatarEntry).filter(Boolean);
            if (list.length > 0) {
              cachedAvatarsMem = list;
              safeStorageSet(AVATAR_CACHE_KEY, JSON.stringify({ updatedAt: Date.now(), list: list }));
              notifyAvatarListeners(list);
              return list;
            }
          }
        } catch (_) {
          // オフライン時はローカル分で静かに継続
        } finally {
          avatarFetchPromise = null;
        }
        return readLocalAvatarsSync();
      })();
    }

    if (localList.length > 0 && !forceRemote) {
      // バックグラウンド更新を走らせつつ、即座にローカル分を返す
      return localList;
    }
    return avatarFetchPromise;
  }

  function pickRandomAvatars(count, filterFn) {
    const base = readLocalAvatarsSync();
    const pool = typeof filterFn === "function" ? base.filter(filterFn) : base.slice();
    if (pool.length === 0) return [];
    const copy = pool.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy.slice(0, Math.min(count, copy.length));
  }

  function pickDailyAvatars(count) {
    const pool = readLocalAvatarsSync();
    if (pool.length === 0) return [];
    const now = new Date();
    const seedStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let seed = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      seed ^= seedStr.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    const seededRand = function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const copy = pool.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(seededRand() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy.slice(0, Math.min(count, copy.length));
  }

  function triggerAvatarShower() {
    if (!global.document || !global.document.body) return false;
    const pool = readLocalAvatarsSync();
    if (pool.length === 0) {
      showToast("🖼️ 都市マップでメンバーアイコンを登録するとシャワーが楽しめます！", "info", 2800);
      return false;
    }
    const existing = global.document.getElementById("rbnAvatarShowerLayer");
    if (existing) existing.remove();

    const layer = global.document.createElement("div");
    layer.id = "rbnAvatarShowerLayer";
    layer.className = "rbn-shower-layer";

    const dropCount = Math.min(44, Math.max(14, pool.length * 2));
    for (let i = 0; i < dropCount; i++) {
      const m = pool[i % pool.length];
      const img = global.document.createElement("img");
      img.className = "rbn-shower-drop";
      img.src = m.icon;
      img.alt = m.name;
      const leftPct = 2 + Math.random() * 92;
      const dur = 2.1 + Math.random() * 1.5;
      const delay = Math.random() * 1.1;
      const size = 34 + Math.floor(Math.random() * 14);
      img.style.left = `${leftPct}%`;
      img.style.width = `${size}px`;
      img.style.height = `${size}px`;
      img.style.animationDuration = `${dur.toFixed(2)}s`;
      img.style.animationDelay = `${delay.toFixed(2)}s`;
      layer.appendChild(img);
    }

    global.document.body.appendChild(layer);
    showToast(`🎉 RBN メンバー大集合！（アイコン ${pool.length}名）`, "ok", 2600);
    global.setTimeout(function () {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, 4800);
    return true;
  }

  function attachTitleShowerEasterEgg(targetEl) {
    if (!targetEl) return;
    let tapCount = 0;
    let lastTapAt = 0;
    targetEl.addEventListener("click", function () {
      if (!isPlayfulEnabled("titleShower")) return;
      const now = Date.now();
      if (now - lastTapAt > 1200) {
        tapCount = 0;
      }
      tapCount++;
      lastTapAt = now;
      if (tapCount >= 5) {
        tapCount = 0;
        triggerAvatarShower();
      }
    });
  }

  function showPeekToast(options) {
    const opts = options || {};
    if (!global.document || !global.document.body) return null;
    const member = opts.member || pickRandomAvatars(1)[0];
    if (!member) return null;

    const elId = opts.id || "rbnGlobalPeekWidget";
    let wrap = global.document.getElementById(elId);
    if (!wrap) {
      wrap = global.document.createElement("div");
      wrap.id = elId;
      wrap.className = "rbn-peek-widget" + (opts.leftSide ? " left-side" : "");
      global.document.body.appendChild(wrap);
    } else {
      wrap.className = "rbn-peek-widget" + (opts.leftSide ? " left-side" : "");
    }

    if (wrap._hideTimer) {
      global.clearTimeout(wrap._hideTimer);
      wrap._hideTimer = null;
    }

    wrap.innerHTML = "";
    const card = global.document.createElement("div");
    card.className = "rbn-peek-card";

    const img = global.document.createElement("img");
    img.className = "rbn-peek-avatar";
    img.src = member.icon;
    img.alt = member.name;

    const body = global.document.createElement("div");
    body.className = "rbn-peek-body";

    const nameEl = global.document.createElement("div");
    nameEl.className = "rbn-peek-name";
    nameEl.textContent = member.name;

    const msgEl = global.document.createElement("div");
    msgEl.className = "rbn-peek-msg";
    msgEl.textContent = opts.message || "今日もよろしく！";

    body.append(nameEl, msgEl);
    if (opts.hint) {
      const hintEl = global.document.createElement("div");
      hintEl.className = "rbn-peek-hint";
      hintEl.textContent = opts.hint;
      body.appendChild(hintEl);
    }

    const closeBtn = global.document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "rbn-peek-close";
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "閉じる");
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      wrap.classList.remove("show");
      if (wrap._hideTimer) {
        global.clearTimeout(wrap._hideTimer);
        wrap._hideTimer = null;
      }
    });

    card.addEventListener("click", function () {
      if (typeof opts.onClick === "function") {
        opts.onClick(member, wrap);
      }
    });

    card.append(img, body, closeBtn);
    wrap.appendChild(card);

    global.requestAnimationFrame(function () {
      wrap.classList.add("show");
    });

    const dur = Number(opts.durationMs) > 0 ? Number(opts.durationMs) : 5500;
    wrap._hideTimer = global.setTimeout(function () {
      wrap.classList.remove("show");
      wrap._hideTimer = null;
    }, dur);

    return wrap;
  }

  function hidePeekToast(elId) {
    if (!global.document) return;
    const wrap = global.document.getElementById(elId || "rbnGlobalPeekWidget");
    if (wrap) {
      wrap.classList.remove("show");
      if (wrap._hideTimer) {
        global.clearTimeout(wrap._hideTimer);
        wrap._hideTimer = null;
      }
    }
  }

  function showBearCheerCutin() {
    if (!isPlayfulEnabled("bearCheer") || !global.document || !global.document.body) return;
    const picked = pickRandomAvatars(4);
    if (picked.length === 0) return;

    const lines = [
      "集結乗ります！🐻",
      "熊狩りいくぞー🔥",
      "火力ぶちかまそう！",
      "バフ準備OK！⚔️",
      "右よし左よし出陣！",
      "ベストスコア狙おう✨"
    ];

    let bar = global.document.getElementById("rbnBearCheerBar");
    if (!bar) {
      bar = global.document.createElement("div");
      bar.id = "rbnBearCheerBar";
      bar.className = "rbn-cheer-bar";
      global.document.body.appendChild(bar);
    }
    if (bar._hideTimer) global.clearTimeout(bar._hideTimer);

    bar.innerHTML = "";
    picked.forEach(function (m, idx) {
      const chip = global.document.createElement("div");
      chip.className = "rbn-cheer-chip";
      const img = global.document.createElement("img");
      img.src = m.icon;
      img.alt = m.name;
      const span = global.document.createElement("span");
      span.textContent = `${m.name}「${lines[(idx + Math.floor(Math.random() * lines.length)) % lines.length]}」`;
      chip.append(img, span);
      bar.appendChild(chip);
    });

    global.requestAnimationFrame(function () {
      bar.classList.add("show");
    });
    bar._hideTimer = global.setTimeout(function () {
      bar.classList.remove("show");
    }, 3400);
  }

  function renderPlayfulSettingsPanel(containerEl) {
    if (!containerEl || !global.document) return;

    const build = function () {
      const prefs = loadPlayfulPrefs();
      const avatars = readLocalAvatarsSync();
      containerEl.innerHTML = "";
      containerEl.className = "rbn-playful-panel";

      const head = global.document.createElement("div");
      head.className = "rbn-playful-panel-head";

      const countSpan = global.document.createElement("span");
      countSpan.textContent =
        avatars.length > 0
          ? `🖼️ 登録済みメンバーアイコン：${avatars.length}名（変更は即反映・全ツール共通）`
          : "🖼️ 登録済みアイコン：0名（都市マップでアイコン登録すると各演出が表示されます）";

      const btns = global.document.createElement("div");
      btns.className = "rbn-playful-panel-btns";

      const allOnBtn = global.document.createElement("button");
      allOnBtn.type = "button";
      allOnBtn.className = "rbn-playful-mini-btn";
      allOnBtn.textContent = "すべてON";
      allOnBtn.addEventListener("click", function () {
        const next = {};
        PLAYFUL_FEATURE_DEFS.forEach(function (d) { next[d.key] = true; });
        savePlayfulPrefs(next);
        build();
      });

      const allOffBtn = global.document.createElement("button");
      allOffBtn.type = "button";
      allOffBtn.className = "rbn-playful-mini-btn";
      allOffBtn.textContent = "すべてOFF";
      allOffBtn.addEventListener("click", function () {
        const next = {};
        PLAYFUL_FEATURE_DEFS.forEach(function (d) { next[d.key] = false; });
        savePlayfulPrefs(next);
        build();
      });

      const testShowerBtn = global.document.createElement("button");
      testShowerBtn.type = "button";
      testShowerBtn.className = "rbn-playful-mini-btn";
      testShowerBtn.textContent = "🎉 シャワー試し押し";
      testShowerBtn.addEventListener("click", function () {
        triggerAvatarShower();
      });

      btns.append(allOnBtn, allOffBtn, testShowerBtn);
      head.append(countSpan, btns);
      containerEl.appendChild(head);

      const groups = [];
      const groupMap = new Map();
      PLAYFUL_FEATURE_DEFS.forEach(function (d) {
        if (!groupMap.has(d.group)) {
          groupMap.set(d.group, []);
          groups.push(d.group);
        }
        groupMap.get(d.group).push(d);
      });

      groups.forEach(function (gName) {
        const gTitle = global.document.createElement("div");
        gTitle.className = "rbn-playful-group-title";
        gTitle.textContent = gName;
        containerEl.appendChild(gTitle);

        const grid = global.document.createElement("div");
        grid.className = "rbn-playful-toggle-grid";

        groupMap.get(gName).forEach(function (def) {
          const item = global.document.createElement("label");
          item.className = "rbn-playful-toggle-item";

          const meta = global.document.createElement("div");
          meta.className = "rbn-playful-toggle-meta";

          const lbl = global.document.createElement("span");
          lbl.className = "rbn-playful-toggle-label";
          lbl.textContent = def.label;

          const desc = global.document.createElement("span");
          desc.className = "rbn-playful-toggle-desc";
          desc.textContent = def.desc;

          meta.append(lbl, desc);

          const chk = global.document.createElement("input");
          chk.type = "checkbox";
          chk.className = "rbn-playful-switch";
          chk.checked = Boolean(prefs[def.key]);
          chk.addEventListener("change", function () {
            const patch = {};
            patch[def.key] = chk.checked;
            savePlayfulPrefs(patch);
          });

          item.append(meta, chk);
          grid.appendChild(item);
        });

        containerEl.appendChild(grid);
      });
    };

    build();
    ensureMemberAvatarsLoaded(false).then(function () {
      if (containerEl.isConnected) build();
    });
    if (!containerEl._rbnPlayfulBound) {
      containerEl._rbnPlayfulBound = true;
      onPlayfulPrefsChange(function () {
        if (containerEl.isConnected) build();
      });
      avatarListeners.add(function () {
        if (containerEl.isConnected) build();
      });
    }
  }

  // 別タブでの遊び心ON/OFF変更を自動同期
  global.addEventListener("storage", function (ev) {
    if (!ev || !ev.key) return;
    if (ev.key === PLAYFUL_PREFS_KEY) {
      const latest = loadPlayfulPrefs();
      prefsListeners.forEach(function (fn) {
        try { fn(latest); } catch (_) {}
      });
    } else if (ev.key === ROSTER_LOCAL_KEY || ev.key === AVATAR_CACHE_KEY) {
      const list = readLocalAvatarsSync();
      notifyAvatarListeners(list);
    }
  });

  function showToast(message, type, durationMs) {
    const text = String(message || "").trim();
    if (!text || !global.document || !global.document.body) return;
    const tone = ["ok", "info", "warn", "error"].includes(type) ? type : "ok";
    const ms = Number(durationMs) > 0 ? Number(durationMs) : 2600;

    let el = global.document.getElementById("rbnGlobalToast");
    if (!el) {
      el = global.document.createElement("div");
      el.id = "rbnGlobalToast";
      el.className = "rbn-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      global.document.body.appendChild(el);
    }

    el.innerHTML = "";
    if (isPlayfulEnabled("toastAvatar")) {
      const m = pickRandomAvatars(1)[0];
      if (m && m.icon) {
        const av = global.document.createElement("img");
        av.className = "rbn-toast-avatar";
        av.src = m.icon;
        av.alt = m.name;
        av.title = m.name;
        el.appendChild(av);
      }
    }
    const textSpan = global.document.createElement("span");
    textSpan.className = "rbn-toast-text";
    textSpan.textContent = text;
    el.appendChild(textSpan);

    el.className = `rbn-toast rbn-toast--${tone} show`;
    if (toastHideTimer) {
      global.clearTimeout(toastHideTimer);
    }
    toastHideTimer = global.setTimeout(function () {
      el.classList.remove("show");
    }, ms);
  }

  function watchSharedSettings(onChange, options) {
    if (typeof onChange !== "function") return;
    global.addEventListener("storage", function (ev) {
      if (!ev || !ev.key) return;
      if (
        ev.key === SHARED_SETTINGS_KEY ||
        ev.key === "ks_gemini_api_key" ||
        ev.key === "ks_firebase_url" ||
        ev.key === "ks_city_map_url" ||
        ev.key === "ks_bear_sim_url"
      ) {
        try {
          const latest = loadSharedSettings(options);
          onChange(latest, ev);
        } catch (err) {
          console.warn("[RBNSuite] 別タブ設定同期エラー:", err);
        }
      }
    });
  }

  function watchConnectivity(callbacks) {
    const cbs = callbacks || {};
    global.addEventListener("offline", function () {
      showToast("⚠️ オフラインになりました（ローカル保存で継続動作）", "warn", 3200);
      if (typeof cbs.onOffline === "function") cbs.onOffline();
    });
    global.addEventListener("online", function () {
      showToast("🟢 オンラインに復帰しました", "info", 2400);
      if (typeof cbs.onOnline === "function") cbs.onOnline();
    });
  }

  function enableModalEscapeClose(closeFn) {
    if (typeof closeFn !== "function") return;
    global.document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeFn(e);
      }
    });
  }

  function registerPwaServiceWorker() {
    if (!global.navigator || !("serviceWorker" in global.navigator)) return;
    const proto = global.location && global.location.protocol;
    const host = global.location && global.location.hostname;
    const isSecure = proto === "https:" || host === "localhost" || host === "127.0.0.1";
    if (!isSecure) return;

    let swUrl = "./sw.js";
    try {
      const current = global.document && global.document.currentScript;
      if (current && current.src) {
        swUrl = new URL("../sw.js", current.src).href;
      } else {
        const scripts = global.document ? Array.from(global.document.scripts || []) : [];
        const matched = scripts.find((s) => s.src && s.src.includes("assets/firebase-init.js"));
        if (matched) {
          swUrl = new URL("../sw.js", matched.src).href;
        }
      }
    } catch (_) {}

    global.addEventListener("load", function () {
      global.navigator.serviceWorker
        .register(swUrl, { updateViaCache: "none" })
        .then(function (reg) {
          if (reg && typeof reg.update === "function") {
            reg.update().catch(function () {});
            global.document.addEventListener("visibilitychange", function () {
              if (global.document.visibilityState === "visible") {
                reg.update().catch(function () {});
              }
            });
          }
        })
        .catch(function (err) {
          console.warn("[RBNSuite] Service Worker 登録スキップ:", err);
        });
    });
  }

  registerPwaServiceWorker();

  global.RBNSuite = Object.freeze({
    SHARED_SETTINGS_KEY,
    FIREBASE_CONFIG,
    DB_PATHS,
    SUBPAGE_DEFAULT_LINKS,
    ROOT_DEFAULT_LINKS,
    safeStorageGet,
    safeStorageSet,
    normalizeDatabaseUrl,
    getNoticeRestBaseUrl,
    normalizeToolLink,
    getDefaultSharedSettings,
    loadSharedSettings,
    saveSharedSettings,
    getFirebaseConfig,
    initRealtimeDatabase,
    safeCopyText,
    showToast,
    watchSharedSettings,
    watchConnectivity,
    enableModalEscapeClose,
    PLAYFUL_PREFS_KEY,
    PLAYFUL_FEATURE_DEFS,
    loadPlayfulPrefs,
    savePlayfulPrefs,
    isPlayfulEnabled,
    onPlayfulPrefsChange,
    readLocalAvatarsSync,
    refreshPlayfulAvatarsFromLocal,
    ensureMemberAvatarsLoaded,
    pickRandomAvatars,
    pickDailyAvatars,
    triggerAvatarShower,
    attachTitleShowerEasterEgg,
    showPeekToast,
    hidePeekToast,
    showBearCheerCutin,
    renderPlayfulSettingsPanel
  });
})(window);
