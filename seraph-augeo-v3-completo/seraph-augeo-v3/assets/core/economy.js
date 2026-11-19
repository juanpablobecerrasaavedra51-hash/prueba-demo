/* ============================================================================
   core/economy — Economía: nivel, fase, racha, XP, monedas y tareas
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const E = A.E;
  const S = A.S;
  const cap = A.cap;
  const today = A.today;


  /* ------------------------------- Economía -------------------------------- */
  function fx() { return E.effectIndex(S.artifacts); }
  function hasArtifact(code) { return S.artifacts.indexOf(code) !== -1; }
  function boostActive() { return S.boostUntil > Date.now(); }
  function level() { return E.levelInfo(S.verifiedXp); }
  function phase() { return E.phaseFromXp(S.verifiedXp); }
  function streakN() { return E.streak(S.days, new Date(), { strict: fx().streakLenient ? false : true }); }

  function goalStats(g) {
    const total = g.tasks.length;
    const done = g.tasks.filter((t) => t.done).length;
    const verified = g.tasks.filter((t) => t.tier === 'verified' || t.tier === 'probable').length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const elapsed = Math.max(1, E.daysBetween(E.ymd(new Date(g.createdAt)), today()));
    return { total, done, verified, pct, elapsed, projection: E.projection(pct, elapsed, g.targetDate, today()) };
  }

  function activeGoals() { return S.goals.filter((g) => !g.archived); }

  function pendingTasks() {
    const out = [];
    activeGoals().forEach((g) => g.tasks.forEach((t) => {
      if (!t.done) out.push(Object.assign({}, t, { goalId: g.id, goal: g.title, goalObj: g }));
    }));
    return out;
  }

  function nextBestTask() {
    const pend = pendingTasks();
    if (!pend.length) return null;
    const daysUntil = (d) => E.daysBetween(today(), d);
    const ctx = { daysUntil, streakAtRisk: new Date().getHours() >= 18 && S.days[today()] === undefined };
    pend.forEach((t) => {
      const g = t.goalObj;
      const dependents = g.tasks.filter((x) => !x.done && x.ms > t.ms && x.impact >= 4).length;
      const sc = E.scoreTask(t, g, dependents, ctx);
      t._score = sc.score; t._f = sc.f; t._dueIn = sc.dueIn;
    });
    pend.sort((a, b) => b._score - a._score);
    return pend;
  }

  function dayEntry(date) {
    const d = date || today();
    if (!S.days[d]) S.days[d] = { tasks: 0, xp: 0, high: 0, habits: 0 };
    return S.days[d];
  }

  function addXp(amount, opts) {
    const o = opts || {};
    const cap = E.DAILY_XP_CAP;
    const soften = fx().xpCapSoften ? .5 : .25;
    if (S.daily.date !== today()) S.daily = { date: today(), xp: 0 };
    let gain = Math.round(amount);
    if (S.daily.xp >= cap) gain = Math.round(gain * soften);
    else if (S.daily.xp + gain > cap) {
      const over = S.daily.xp + gain - cap;
      gain = Math.round((cap - S.daily.xp) + over * soften);
    }
    S.daily.xp += gain;
    S.xp += gain;
    if (o.verified !== false) S.verifiedXp += gain;
    if (o.day !== false) { const de = dayEntry(); de.xp += gain; if (o.high) de.high += 1; }
    return gain;
  }

  function addCoins(n) {
    S.coins = Math.max(0, Math.round(S.coins + n));
  }

  function pushMemory(text) {
    if (!text) return;
    S.memory.unshift({ t: Date.now(), text: String(text).slice(0, 260) });
    const max = fx().memory;
    if (S.memory.length > max) S.memory.length = max;
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.fx = fx;
  A.hasArtifact = hasArtifact;
  A.boostActive = boostActive;
  A.level = level;
  A.phase = phase;
  A.streakN = streakN;
  A.goalStats = goalStats;
  A.activeGoals = activeGoals;
  A.pendingTasks = pendingTasks;
  A.nextBestTask = nextBestTask;
  A.dayEntry = dayEntry;
  A.addXp = addXp;
  A.addCoins = addCoins;
  A.pushMemory = pushMemory;

})(window.Seraph = window.Seraph || {});
