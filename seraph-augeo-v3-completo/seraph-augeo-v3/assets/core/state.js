/* ============================================================================
   core/state — Estado, persistencia (localStorage) y registro
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const today = A.today;


  /* -------------------------------- Estado -------------------------------- */
  const KEY = 'seraph-augeo-v3';

  function defaultState() {
    return {
      v: 3, createdAt: Date.now(), name: '',
      xp: 0, verifiedXp: 0, coins: 120, essence: 0, trust: 60,
      goals: [], habits: [], days: {},
      chests: [], pity: 0, chestsToday: { date: today(), n: 0 }, purchasesToday: { date: today(), n: 0 },
      chestStats: { total: 0, best: 1, artifacts: 0 },
      artifacts: [], artifactUses: {},
      questState: { date: '', list: [] },
      memory: [], flags: [], achievements: [],
      verdicts: { verified: 0, probable: 0, dudoso: 0, none: 0 },
      boostUntil: 0, freezes: 0,
      daily: { date: today(), xp: 0 },
      ai: { enabled: true, lastProvider: '', lastMode: 'unknown', health: null },
      settings: { motion: true },
      seenIntro: false,
      lastBackup: 0,
      log: [],
    };
  }

  /* El estado es un objeto estable: se muta en sitio, nunca se reemplaza.
     Así los demás módulos guardan una referencia y siempre ven lo mismo. */
  const S = defaultState();

  function setState(next) {
    for (const k of Object.keys(S)) delete S[k];
    Object.assign(S, next);
    return S;
  }

  const UI = {
    tab: 'hoy', modal: null, busy: null, toastTimers: [],
    online: null, health: null, aiError: '',
    lastVerdict: null, verify: null, lastDiag: null, diagLocal: null,
    chestQueue: [], opening: null, reveal: null,
    expandedGoal: null, suggest: null, started: false, toastQueue: [],
  };

  /* Algunos navegadores bloquean el almacenamiento cuando el archivo se abre
     con file:// (o en modo privado). Se comprueba una vez para poder avisar
     en pantalla en vez de perder el progreso en silencio. */
  let storageOk = null;
  function canStore() {
    if (storageOk !== null) return storageOk;
    try {
      localStorage.setItem(KEY + '-probe', '1');
      localStorage.removeItem(KEY + '-probe');
      storageOk = true;
    } catch (e) { storageOk = false; }
    return storageOk;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* modo privado */ }
    /* Si hay cuenta en la nube, el mismo cambio se sube (con retardo). */
    try { if (A.Cloud && A.Cloud.touch) A.Cloud.touch(); } catch (e) { /* sin nube */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const p = JSON.parse(raw);
      if (!p || p.v !== 3) return false;
      const next = Object.assign(defaultState(), p);
      next.ai = Object.assign({ enabled: true, lastProvider: '', lastMode: 'unknown', health: null }, p.ai || {});
      next.settings = Object.assign({ motion: true }, p.settings || {});
      next.daily = p.daily && p.daily.date === today() ? p.daily : { date: today(), xp: 0 };
      next.chestsToday = p.chestsToday && p.chestsToday.date === today() ? p.chestsToday : { date: today(), n: 0 };
      setState(next);
      return true;
    } catch (e) { return false; }
  }

  function log(kind, txt, extra) {
    S.log.unshift({ t: Date.now(), kind, txt, extra: extra || null });
    if (S.log.length > 220) S.log.length = 220;
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.KEY = KEY;
  A.defaultState = defaultState;
  A.S = S;
  A.setState = setState;
  A.UI = UI;
  A.save = save;
  A.load = load;
  A.canStore = canStore;
  A.log = log;

})(window.Seraph = window.Seraph || {});
