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
      global.navigator.serviceWorker.register(swUrl).catch(function (err) {
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
    safeCopyText
  });
})(window);
