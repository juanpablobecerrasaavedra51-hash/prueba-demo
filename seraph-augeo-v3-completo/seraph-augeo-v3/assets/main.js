/* ============================================================================
   main — Arranque: estado inicial, boot y API para pruebas
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const AI = A.AI;
  const E = A.E;
  const S = A.S;
  const UI = A.UI;
  const doc = A.doc;
  const today = A.today;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const submitVerification = (...args) => A.submitVerification(...args);
  const activeGoals = (...args) => A.activeGoals(...args);
  const buildPlan = (...args) => A.buildPlan(...args);
  const buildStage = (...args) => A.buildStage(...args);
  const checkAchievements = (...args) => A.checkAchievements(...args);
  const defaultState = (...args) => A.defaultState(...args);
  const ensureQuests = (...args) => A.ensureQuests(...args);
  const finishVerification = (...args) => A.finishVerification(...args);
  const goalStats = (...args) => A.goalStats(...args);
  const load = (...args) => A.load(...args);
  const localDiagnosis = (...args) => A.localDiagnosis(...args);
  const nextBestTask = (...args) => A.nextBestTask(...args);
  const openVerify = (...args) => A.openVerify(...args);
  const render = (...args) => A.render(...args);
  const save = (...args) => A.save(...args);
  const showIntro = (...args) => A.showIntro(...args);
  const toast = (...args) => A.toast(...args);


  /* --------------------------------- Boot --------------------------------- */
  function ensureState() {
    if (!Array.isArray(S.goals)) S.goals = [];
    if (!Array.isArray(S.habits)) S.habits = [];
    if (!Array.isArray(S.chests)) S.chests = [];
    if (!Array.isArray(S.artifacts)) S.artifacts = [];
    if (!Array.isArray(S.memory)) S.memory = [];
    if (!Array.isArray(S.flags)) S.flags = [];
    if (!Array.isArray(S.achievements)) S.achievements = [];
    if (!Array.isArray(S.log)) S.log = [];
    if (!Array.isArray(S.foundRarities)) S.foundRarities = [];
    if (!Array.isArray(S.answers)) S.answers = [];
    if (!S.chestStats) S.chestStats = { total: 0, best: 1, artifacts: S.artifacts.length };
    if (!S.verdicts) S.verdicts = { verified: 0, probable: 0, dudoso: 0, none: 0 };
    if (!S.questCount) S.questCount = 0;
    if (!S.artifactUses) S.artifactUses = {};
    if (!S.questState) S.questState = { date: '', list: [] };
    if (!S.ai) S.ai = { enabled: true, lastProvider: '', lastMode: 'unknown', health: null };
    if (!S.settings) S.settings = { motion: true };
    if (!S.daily) S.daily = { date: today(), xp: 0 };
    S.goals.forEach((g) => {
      g.tasks = g.tasks || [];
      g.milestones = g.milestones || [{ title: 'General' }];
      g.tasks.forEach((t) => {
        if (t.done === undefined) t.done = false;
        if (t.tier === undefined) t.tier = '';
      });
    });
  }

  /* Si el navegador no deja guardar (file:// en algunos, o modo privado), se
     avisa en pantalla: es la diferencia entre perder el progreso y saberlo. */
  function noStoreBanner() {
    if (doc.getElementById('noStore')) return;
    if (!A.canStore || A.canStore()) return;
    const el = doc.createElement('div');
    el.id = 'noStore';
    el.className = 'no-store';
    el.innerHTML = '<b>Este navegador no deja guardar datos con el archivo abierto directamente.</b> '
      + 'Al cerrar la pestaña se pierde el progreso. Prueba con Chrome, Edge o Firefox, o descarga una copia antes de salir.'
      + '<button class="linkbtn" data-act="openSettings">Descargar copia</button>'
      + '<button class="no-store-x" aria-label="Cerrar aviso">×</button>';
    doc.body.appendChild(el);
    el.querySelector('.no-store-x').addEventListener('click', () => el.remove());
  }

  function boot() {
    const had = load();
    ensureState();
    if (!had) S.seenIntro = false;
    ensureQuests();
    const params = new URLSearchParams(location.search);
    const forced = params.has('intro');
    const onbOnly = params.has('onboarding');
    if (onbOnly) { S.goals = []; S.seenIntro = true; }
    buildStage();
    const showIt = forced || (!S.seenIntro && S.goals.length === 0);
    if (showIt) {
      showIntro();
      render();
    } else {
      render();
    }
    noStoreBanner();
    /* El serafín se prepara en cuanto hay DOM: si el usuario ya vio la intro,
       aparece igualmente detrás del menú. Sin WebGL, no pasa nada. */
    if (A.Angel3D) {
      A.Angel3D.init().then(() => {
        if (!A.Angel3D.ok) return;
        if (showIt) return;                 /* la intro lo arranca ella misma */
        if (!S.goals.length && (!UI.onb || UI.onb.step === 0)) A.Angel3D.show(true);
      });
    }
    // estado del Guardián en segundo plano
    AI.probe().then(() => {
      S.ai.lastMode = AI.mode;
      if (S.ai.health) S.ai.health = UI.health;
      save();
      render();
    });
    /* La única protección real del progreso es una copia descargada. Si hay
       trabajo guardado y la última fue hace una semana, se recuerda una vez. */
    const stale = !S.lastBackup || Date.now() - S.lastBackup > 7 * 86400000;
    if (S.goals.length && stale) {
      setTimeout(() => toast('Llevas más de una semana sin copia. Ajustes → Descargar copia.', 'info'), 2600);
    }

    // marcar el día como visitado no cuenta como actividad; sólo registra la jornada.
    setInterval(() => { if (S.daily.date !== today()) { S.daily = { date: today(), xp: 0 }; save(); } }, 60000);
  }

  /* --------------------------- API para pruebas --------------------------- */
  window.SeraphApp = {
    get state() { return S; },
    set state(v) { A.setState(v); },
    ui: UI,
    engine: E,
    render, save, load, boot,
    openVerify, submitVerification, finishVerification, localDiagnosis,
    buildPlan, checkAchievements, nextBestTask, activeGoals, goalStats,
    setTab(t) { UI.tab = t; render(); },
    seed(n) {
      const rng = E.mulberry32(n >>> 0);
      Math.random = rng;
      return n;
    },
    reset() { A.setState(defaultState()); ensureState(); save(); render(); },
  };

  /* ------------------------------ Exportación ------------------------------ */
  A.ensureState = ensureState;
  A.boot = boot;
  /* boot.js (o el HTML de un solo archivo) llama a start() cuando el DOM está listo. */
  A.start = boot;

})(window.Seraph = window.Seraph || {});
