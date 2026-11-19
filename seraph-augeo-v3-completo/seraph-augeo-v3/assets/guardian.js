/* ============================================================================
   guardian — El Ángel Guardián: IA en el navegador y respaldo local
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const $ = A.$;
  const E = A.E;
  const S = A.S;
  const UI = A.UI;
  const clamp = A.clamp;
  const esc = A.esc;
  const today = A.today;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const activeGoals = (...args) => A.activeGoals(...args);
  const closeModal = (...args) => A.closeModal(...args);
  const goalStats = (...args) => A.goalStats(...args);
  const ico = (...args) => A.ico(...args);
  const nextBestTask = (...args) => A.nextBestTask(...args);
  const openModal = (...args) => A.openModal(...args);
  const openSettings = (...args) => A.openSettings(...args);
  const openVerify = (...args) => A.openVerify(...args);
  const render = (...args) => A.render(...args);
  const save = (...args) => A.save(...args);
  const streakN = (...args) => A.streakN(...args);
  const toast = (...args) => A.toast(...args);


  /* ------------------------------- El Guardián ---------------------------- */
  /* Sin servidor: la IA se llama directo desde el navegador con la clave del
     dispositivo (assets/ai/client.js). Si no hay clave o falla la red, la app
     aplica el 100% de su fórmula local, igual que antes. */
  const AI = {
    mode: 'unknown',
    health: null,
    async probe() {
      const G = A.AIClient;
      if (!G || !G.isReady()) {
        AI.mode = 'local';
        AI.health = null;
        UI.health = null;
        UI.online = false;
        return false;
      }
      const r = await G.probe();
      AI.health = {
        mode: r.ok ? 'ia' : 'local',
        providers: [{ id: (r.provider ? r.provider + ' · ' : '') + (r.model || ''), status: r.ok ? 'ok' : 'fail', ms: r.ms || 0 }],
        budget: G.budgetLeft(),
        error: r.error || '',
        at: Date.now(),
      };
      UI.health = AI.health;
      AI.mode = r.ok ? 'ia' : 'local';
      UI.online = r.ok;
      return r.ok;
    },

    /* Misma forma de respuesta que tenía el servidor, para que la interfaz no
       cambie: el veredicto se recalcula aquí con el motor determinista.
       Ojo: no hay ninguna llamada a /api; `kind` es sólo el tipo de pregunta. */
    async ask(kind, body) {
      const G = A.AIClient;
      if (!G || !G.isReady()) return { ok: false, offline: true, reason: 'sin-clave' };

      const data = body || {};
      const out = await G.ask(kind, data);
      if (!out.ok) return { ok: false, unavailable: true, reason: out.reason, attempts: out.attempts || [] };
      const d = out.data || {};

      if (kind === 'challenge') {
        return {
          ok: true,
          question: String(d.question || '').slice(0, 300),
          lookingFor: (d.lookingFor || []).slice(0, 5).map((x) => String(x).slice(0, 60)),
          focus: String(d.focus || '').slice(0, 160),
          provider: out.provider || '',
          cached: !!out.cached,
        };
      }

      if (kind === 'diagnose') {
        return {
          ok: true,
          headline: String(d.headline || '').slice(0, 140),
          diagnosis: String(d.diagnosis || '').slice(0, 500),
          risks: (d.risks || []).slice(0, 4).map((r) => String(r).slice(0, 120)),
          actions: (d.actions || []).slice(0, 3).map((a) => ({
            title: String((a && a.title) || '').slice(0, 90),
            why: String((a && a.why) || '').slice(0, 160),
          })),
          provider: out.provider || '',
          cached: !!out.cached,
        };
      }

      if (kind === 'suggest') {
        const pending = data.pending || [];
        return {
          ok: true,
          index: clamp(Math.round(d.index), 1, Math.max(1, pending.length)),
          reason: String(d.reason || '').slice(0, 200),
          provider: out.provider || '',
        };
      }

      /* verdict: la IA aporta la señal 0-100, la matemática decide el resto. */
      const aiScore = Math.round(clamp(Number(d.score) || 0, 0, 100));
      const local = E.verifyScore(
        { evidence: data.evidence, text: data.answer, timeFit: 'as', aiScore },
        {
          estMinutes: data.estMinutes, elapsedSec: data.elapsedSec, trustPrev: data.trustPrev,
          prevTexts: data.recent || [], timeLenient: !!data.timeLenient,
        }
      );
      const flagged = local.tier.id === 'dudoso' || local.tier.id === 'none';
      return {
        ok: true, aiUsed: true,
        score: local.score, tier: local.tier, mult: local.mult, chestChance: local.chestChance,
        breakdown: local.breakdown,
        trust: E.nextTrust(data.trustPrev, local.score, flagged, { gainCap: data.trustGainCap }),
        flagged,
        feedback: String(d.feedback || '').slice(0, 260),
        nextQuestion: String(d.nextQuestion || '').slice(0, 260),
        signals: { specific: !!d.specific, coherent: !!d.coherent, depth: String(d.depth || '') },
        provider: out.provider || '',
      };
    },
  };

  /* --- preguntas locales: siempre atadas a la tarea y a la meta --- */
  const Q_TEMPLATES = [
    { f: (t, g) => `¿Qué parte exacta de «${t}» te costó más, y qué detalle concreto lo demuestra?`, focus: 'obstáculo real' },
    { f: (t, g) => `Describe el primer obstáculo que apareció al hacer «${t}» y cómo lo resolviste.`, focus: 'resolución' },
    { f: (t, g) => `¿Qué número, nombre o resultado exacto salió de «${t}»?`, focus: 'prueba concreta' },
    { f: (t, g) => `Si tuvieras que enseñarle «${t}» a alguien hoy, ¿qué dos pasos describirías?`, focus: 'comprensión' },
    { f: (t, g) => `¿Qué quedó distinto en tu avance hacia «${g}» después de «${t}»?`, focus: 'efecto en la meta' },
    { f: (t, g) => `¿En qué minuto de «${t}» perdiste el hilo, y cómo volviste?`, focus: 'atención' },
  ];
  function localQuestion(task, goal) {
    const seed = (task.id + '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const q = Q_TEMPLATES[seed % Q_TEMPLATES.length];
    return { question: q.f(task.title, goal.title), focus: q.focus, lookingFor: [], local: true };
  }

  const FB = {
    high: [
      'Respuesta específica y coherente con el tiempo dedicado. Sigue así.',
      'Hay detalle verificable: eso es lo que distingue el trabajo real.',
      'Coincide con tu ritmo y con lo que declaraste. Bien medido.',
    ],
    mid: [
      'Se sostiene, pero un detalle concreto lo volvería más sólido.',
      'Creíble. La próxima vez incluye un número o un nombre.',
      'Aceptable. Falta la prueba que lo haga indiscutible.',
    ],
    low: [
      'Muy general: no se puede confirmar que ocurriera.',
      'Coincide poco con la tarea. Describe algo concreto que sí hiciste.',
      'Falta sustancia. Reintenta con un hecho comprobable.',
    ],
    rep: [
      'Se parece demasiado a una respuesta anterior. ¿Qué fue distinto esta vez?',
      'Esto ya lo escribiste antes: el ojo lo recuerda.',
    ],
  };
  function localFeedback(v) {
    if (v.breakdown && v.breakdown.repetido) return FB.rep[(v.score || 0) % FB.rep.length];
    const key = v.score >= 80 ? 'high' : v.score >= 55 ? 'mid' : 'low';
    return FB[key][(v.score || 0) % FB[key].length];
  }

  function nextLocalQuestion(task, goal) {
    const pool = [
      `¿Cuál fue el resultado medible de «${task.title}»?`,
      `¿Qué harías distinto si repitieras «${task.title}» mañana?`,
      `¿Qué evidencia dejarías para que otro pueda comprobar «${task.title}»?`,
    ];
    return pool[(String(task.id).charCodeAt(0) + (task.title || '').length) % pool.length];
  }

  /* --- diagnóstico local determinista: útil sin red --- */
  function localDiagnosis() {
    const goals = activeGoals();
    const stats = {
      trust: S.trust, verifiedXp: S.verifiedXp,
      verified: S.verdicts.verified, flagged: S.flags.length,
      weakestArea: '', constancy: 0,
    };
    const week = weekSummary();

    if (!goals.length) {
      return {
        headline: 'Aún no hay una meta encendida',
        diagnosis: 'Sin una meta concreta, el ojo no tiene hacia dónde mirar. Escribe una sola meta que puedas empezar esta semana.',
        risks: ['El sistema queda sin propósito'],
        actions: [
          { title: 'Escribe una meta con fecha', why: 'Una meta con plazo convierte el deseo en calendario.' },
          { title: 'Añade tres tareas pequeñas', why: 'Tres pasos de 15 minutos ya producen movimiento real.' },
          { title: 'Vuelve mañana a registrar algo', why: 'El ojo mide constancia, no intenciones.' },
        ],
        local: true,
      };
    }

    // área más descuidada: menor progreso y sin actividad reciente
    const byArea = {};
    goals.forEach((g) => {
      const st = goalStats(g);
      if (!byArea[g.area]) byArea[g.area] = { pct: 0, n: 0, titles: [] };
      byArea[g.area].pct += st.pct; byArea[g.area].n++;
      byArea[g.area].titles.push(g.title);
    });
    const areas = Object.keys(byArea).sort((a, b) => (byArea[a].pct / byArea[a].n) - (byArea[b].pct / byArea[b].n));
    const weak = areas[0];
    stats.weakestArea = weak;

    const lastDays = [];
    for (let i = 0; i < 14; i++) lastDays.push(S.days[E.ymd(E.addDays(new Date(), -i))]);
    const activeDays = lastDays.filter(Boolean).length;
    stats.constancy = Math.round((activeDays / 14) * 100);

    const worstGoal = goals.slice().sort((a, b) => goalStats(a).pct - goalStats(b).pct)[0];
    const ws = goalStats(worstGoal);
    const risks = [];
    if (!S.days[today()]) risks.push('Hoy todavía no registras nada');
    if (stats.constancy < 45) risks.push(`Constancia baja: ${stats.constancy}% de los últimos 14 días`);
    if (ws.projection.late) risks.push(`«${worstGoal.title}» va ${ws.projection.lateDays} días atrasada`);
    if (S.trust < 55) risks.push('La confianza del ojo está frágil');
    if (S.flags.length >= 3) risks.push(`${S.flags.length} registros dudosos sin resolver`);
    if (!risks.length) risks.push('Sin riesgos graves: el riesgo ahora es el exceso de confianza');

    const pend = nextBestTask();
    const actions = [];
    if (pend && pend[0]) actions.push({ title: `Haz «${pend[0].title}» (${pend[0].estMinutes} min)`, why: 'Es la tarea que más desbloquea según urgencia, impacto y esfuerzo.' });
    actions.push({ title: `Baja el listón en ${weak}`, why: `Tu avance en ${weak} es el más bajo. Un paso de 10 minutos rompe el bloqueo mejor que un plan grande.` });
    if (S.trust < 60) actions.push({ title: 'Verifica una tarea con evidencia', why: 'Aportar una nota o un testigo sube la confianza más rápido que repetir tareas.' });
    else actions.push({ title: 'Añade un hito intermedio', why: `«${worstGoal.title}» necesita un punto de control antes de la fecha límite.` });

    const headline = stats.constancy >= 70 ? 'El pulso se sostiene' : stats.constancy >= 40 ? 'Hay movimiento, falta ritmo' : 'El altar está frío';
    const diagnosis = `Tu constancia es del ${stats.constancy}% en dos semanas y la confianza del ojo está en ${S.trust}/100. ` +
      `El área con menos avance es ${weak}; «${worstGoal.title}» va al ${ws.pct}% completada.`;

    return { headline, diagnosis, risks: risks.slice(0, 3), actions: actions.slice(0, 3), local: true, stats };
  }

  function weekSummary() {
    let tasks = 0, xp = 0;
    for (let i = 0; i < 7; i++) {
      const d = S.days[E.ymd(E.addDays(new Date(), -i))];
      if (d) { tasks += d.tasks || 0; xp += d.xp || 0; }
    }
    return { tasks, xp, streak: streakN() };
  }


  /* -------------------------------- Guardián ------------------------------ */
  async function probeAI() {
    const G = A.AIClient;
    if (G && !G.isReady()) {
      UI.online = false; UI.health = null; AI.health = null; AI.mode = 'local';
      toast('Falta configurar la IA: elige un proveedor y pruébalo.', 'err');
      if (A.AISetup) A.AISetup.open();
      else if ($('#sName')) openSettings(); else render();
      return;
    }
    toast('Probando el Guardián…', 'info');
    const ok = await AI.probe();
    S.ai.lastMode = AI.mode;
    S.ai.health = AI.health;
    S.ai.lastProvider = ok && AI.health && AI.health.providers[0] ? AI.health.providers[0].id : '';
    save();
    render();
    if ($('#sName')) openSettings();
    toast(ok ? 'Guardián en línea.' : 'El Guardián no respondió: modo local.', ok ? 'ai' : 'err');
  }

  function diagPayload() {
    const goals = activeGoals().map((g) => {
      const st = goalStats(g);
      const daysLeft = g.targetDate ? E.daysBetween(today(), g.targetDate) : 30;
      return { title: g.title, area: g.area, pct: st.pct, daysLeft: Math.max(0, daysLeft) };
    });
    const loc = localDiagnosis();
    return {
      goals,
      stats: {
        trust: S.trust, verifiedXp: S.verifiedXp,
        verified: S.verdicts.verified, flagged: S.flags.length,
        weakestArea: (loc.stats && loc.stats.weakestArea) || '',
        constancy: (loc.stats && loc.stats.constancy) || 0,
      },
      week: weekSummary(),
    };
  }

  async function askDiagnose() {
    if (UI.busy === 'diag') return;
    if (!S.ai.enabled) { toast('El Guardián está desactivado en ajustes.', 'err'); return; }
    if (!UI.online) {
      const ok = await AI.probe();
      if (!ok) { toast('No hay Guardián en línea. Este es el diagnóstico local.', 'err'); UI.tab = 'guardian'; render(); return; }
    }
    UI.busy = 'diag';
    render();
    const r = await AI.ask('diagnose', diagPayload());
    UI.busy = null;
    if (r && r.ok) {
      UI.lastDiag = Object.assign({}, r, { local: false });
      S.ai.lastProvider = r.provider || '';
      save();
      toast('Diagnóstico recibido.', 'ai');
    } else {
      UI.lastDiag = null;
      toast('El Guardián no respondió. Se mantiene el diagnóstico local.', 'err');
    }
    render();
  }

  async function askSuggest() {
    const pend = nextBestTask() || [];
    if (!pend.length) { toast('No hay tareas pendientes.', 'err'); return; }
    let pick = pend[0];
    let reason = 'Es la que más desbloquea ahora mismo según urgencia, impacto y esfuerzo.';
    if (UI.online) {
      const r = await AI.ask('suggest', {
        goals: activeGoals().map((g) => ({ title: g.title })),
        pending: pend.slice(0, 8).map((t) => ({ title: t.title, estMinutes: t.estMinutes, impact: t.impact, goal: t.goal })),
        trust: S.trust,
      });
      if (r && r.ok) { pick = pend[clamp(r.index - 1, 0, pend.length - 1)]; reason = r.reason || reason; }
    }
    openModal(`
      <p class="kicker">El cetro señala</p>
      <h2 class="modal-title" style="margin-top:6px">${esc(pick.title)}</h2>
      <p class="modal-sub">${esc(reason)}</p>
      <div class="hero-meta"><span class="chip">${ico('clock', 12)} ${pick.estMinutes} min</span>
        <span class="chip">${ico('zap', 12)} ${E.xpForTask(pick)} XP</span>
        <span class="chip">${ico('target', 12)} ${esc(pick.goal)}</span></div>
      <div class="row mt-16" style="gap:8px">
        <button class="btn btn-ghost" data-act="closeModal">Después</button>
        <button class="btn btn-primary" style="flex:1" data-act="openVerify" data-task="${pick.id}">Empezar ahora</button>
      </div>
    `);
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.AI = AI;
  A.Q_TEMPLATES = Q_TEMPLATES;
  A.localQuestion = localQuestion;
  A.FB = FB;
  A.localFeedback = localFeedback;
  A.nextLocalQuestion = nextLocalQuestion;
  A.localDiagnosis = localDiagnosis;
  A.weekSummary = weekSummary;
  A.diagPayload = diagPayload;
  A.probeAI = probeAI;
  A.askDiagnose = askDiagnose;
  A.askSuggest = askSuggest;

})(window.Seraph = window.Seraph || {});
