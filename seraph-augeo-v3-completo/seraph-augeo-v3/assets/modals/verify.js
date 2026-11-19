/* ============================================================================
   modals/verify — Verificación: pregunta, respuesta, veredicto y botín
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const $ = A.$;
  const AI = A.AI;
  const E = A.E;
  const S = A.S;
  const UI = A.UI;
  const clamp = A.clamp;
  const esc = A.esc;
  const sigilSVG = A.sigilSVG;
  const uid = A.uid;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const addCoins = (...args) => A.addCoins(...args);
  const addXp = (...args) => A.addXp(...args);
  const boostActive = (...args) => A.boostActive(...args);
  const checkAchievements = (...args) => A.checkAchievements(...args);
  const chestsEarnedToday = (...args) => A.chestsEarnedToday(...args);
  const closeModal = (...args) => A.closeModal(...args);
  const dayEntry = (...args) => A.dayEntry(...args);
  const factor = (...args) => A.factor(...args);
  const findTask = (...args) => A.findTask(...args);
  const fx = (...args) => A.fx(...args);
  const ico = (...args) => A.ico(...args);
  const localFeedback = (...args) => A.localFeedback(...args);
  const localQuestion = (...args) => A.localQuestion(...args);
  const log = (...args) => A.log(...args);
  const modalHead = (...args) => A.modalHead(...args);
  const nextLocalQuestion = (...args) => A.nextLocalQuestion(...args);
  const openModal = (...args) => A.openModal(...args);
  const phase = (...args) => A.phase(...args);
  const pushMemory = (...args) => A.pushMemory(...args);
  const render = (...args) => A.render(...args);
  const save = (...args) => A.save(...args);
  const stat = (...args) => A.stat(...args);
  const toast = (...args) => A.toast(...args);


  /* ---------------------------- Verificación ------------------------------ */
  let verifyTimer = null;
  function startVerifyTimer() {
    stopVerifyTimer();
    verifyTimer = setInterval(() => {
      const el = $('#vTimer');
      if (!el || !UI.verify) return;
      const s = Math.floor((Date.now() - UI.verify.startedAt) / 1000);
      el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    }, 1000);
  }
  function stopVerifyTimer() { if (verifyTimer) { clearInterval(verifyTimer); verifyTimer = null; } }

  function openVerify(taskId) {
    const ref = findTask(taskId);
    if (!ref) return;
    const { task, goal } = ref;
    if (task.done) { toast('Esa tarea ya está registrada.', 'info'); return; }
    UI.verify = {
      taskId, goalId: goal.id, step: 'answer', evidence: 0, answer: '',
      startedAt: Date.now(), question: null, qLoading: true, result: null, error: '',
      declaredMin: task.estMinutes || 15,
    };
    renderVerify();
    startVerifyTimer();
    loadQuestion();
  }

  async function loadQuestion() {
    const v = UI.verify;
    if (!v) return;
    const ref = findTask(v.taskId);
    if (!ref) return;
    const { task, goal } = ref;
    const recent = (S.answers || []).slice(0, 3);
    let q = null;
    if (S.ai.enabled && UI.online) {
      const r = await AI.ask('challenge', {
        goal: { title: goal.title, area: goal.area, why: goal.why },
        task: { title: task.title, estMinutes: task.estMinutes, impact: task.impact, milestone: (goal.milestones[task.ms] || {}).title },
        recent,
      });
      if (r && r.ok) q = r;
    }
    if (!q) q = localQuestion(task, goal);
    if (!UI.verify || UI.verify.taskId !== v.taskId) return;
    UI.verify.question = q;
    UI.verify.qLoading = false;
    pushMemory(q.question);
    renderVerify();
  }

  function renderVerify() {
    const v = UI.verify;
    if (!v) return;
    const ref = findTask(v.taskId);
    if (!ref) { closeModal(); return; }
    const { task, goal } = ref;

    if (v.step === 'answer') {
      const q = v.question;
      openModal(`
        ${modalHead(1, 3, esc(task.title), `${esc(goal.title)} · ${task.estMinutes} min · ${E.xpForTask(task)} XP base`)}
        <div class="field">
          <label>¿Cuánto tiempo le dedicaste de verdad?</label>
          <div class="row" style="gap:8px">
            <button class="btn btn-sm btn-ghost" data-act="vMinus" aria-label="Cinco minutos menos">−5</button>
            <input class="input" id="vMin" type="number" min="1" max="240" step="5" value="${v.declaredMin}"
              style="width:86px;text-align:center;padding:9px 6px" aria-label="Minutos dedicados">
            <button class="btn btn-sm btn-ghost" data-act="vPlus" aria-label="Cinco minutos más">+5</button>
            <span class="tiny dim" style="margin-left:4px">min · estimado ${task.estMinutes}</span>
          </div>
          <p class="tiny dim" style="margin:6px 0 0">Con esta ventana abierta: <b class="mono" id="vTimer">00:00</b>. El tiempo que cuenta es el que declaras tú.</p>
          <p class="hint">Sé honesto: el tiempo es una de las cuatro señales. Si lo inflas, el detalle de tu respuesta lo delata igual.</p>
        </div>
        <div class="guardian-question">
          <div class="gq-label">${ico('eye', 11)} El Guardián pregunta ${q && q.local ? '· local' : ''}</div>
          ${v.qLoading ? `<div class="gq-loading"><span class="typing"><i></i><i></i><i></i></span> Redactando una pregunta sobre tu meta…</div>`
            : `<p class="gq-text">${esc(q.question)}</p>${q.focus ? `<p class="gq-focus">Busca: ${esc(q.focus)}</p>` : ''}`}
        </div>
        <div class="field">
          <label>Tu respuesta</label>
          <textarea class="textarea" id="vAnswer" maxlength="600" placeholder="Sé concreto: qué hiciste, qué número salió, qué te frenó.">${esc(v.answer)}</textarea>
          <div class="row" style="justify-content:space-between;margin-top:6px">
            <p class="hint" style="margin:0">Una respuesta vaga se nota. Un detalle verificable pesa más.</p>
            <span class="mini mono dim" id="vCount">${v.answer.length}/600</span>
          </div>
        </div>
        <div class="field">
          <label>Evidencia</label>
          ${E.EVIDENCE.map((e) => `<button class="opt ${v.evidence === e.id ? 'on' : ''}" data-act="vEvidence" data-e="${e.id}">
            <span class="opt-mark"></span>
            <span class="opt-text"><span class="opt-title">${e.label}</span>
              <span class="opt-hint">${e.points ? `+${e.points} puntos de verificación` : 'Sin puntos de evidencia'}</span></span>
            <span class="opt-pts">${e.points ? '+' + e.points : '0'}</span>
          </button>`).join('')}
        </div>
        ${v.error ? `<p class="hint err">${esc(v.error)}</p>` : ''}
        <div class="row" style="gap:8px">
          <button class="btn btn-ghost" data-act="closeModal">Cancelar</button>
          <button class="btn btn-primary" style="flex:1" data-act="submitVerify">${ico('shieldCheck', 15)} Enviar al ojo</button>
        </div>
        <p class="tiny dim center mt-12">${consentLine()}</p>
      `);
      const ta = $('#vAnswer');
      if (ta) {
        ta.addEventListener('input', () => {
          v.answer = ta.value;
          const c = $('#vCount');
          if (c) c.textContent = `${ta.value.length}/600`;
        });
      }
      const t = $('#vTimer');
      if (t) {
        const s = Math.floor((Date.now() - v.startedAt) / 1000);
        t.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      }
      return;
    }

    if (v.step === 'checking') {
      openModal(`
        <div class="center" style="padding:26px 6px">
          <div style="width:92px;height:92px;margin:0 auto 16px">${sigilSVG(92, { phase: phase().phase })}</div>
          <p class="kicker">El ojo está mirando</p>
          <p class="small muted" style="max-width:300px;margin:10px auto 0">Comparando tu respuesta con el tiempo, la evidencia y tu historial.</p>
          <div class="row center" style="justify-content:center;margin-top:16px"><span class="typing"><i></i><i></i><i></i></span></div>
        </div>`, { noFocus: true });
      return;
    }

    // veredicto
    const r = v.result;
    if (!r) return;
    const tone = r.tier.id === 'verified' ? 'var(--verde)' : r.tier.id === 'probable' ? 'var(--gold-2)' : r.tier.id === 'dudoso' ? 'var(--amber)' : 'var(--rojo)';
    const circ = 2 * Math.PI * 42;
    openModal(`
      <div class="center" style="padding:6px 0 2px">
        <div style="position:relative;width:112px;height:112px;margin:0 auto 10px">
          <svg viewBox="0 0 100 100" width="112" height="112" style="transform:rotate(-90deg)">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke="${tone}" stroke-width="5" stroke-linecap="round"
              stroke-dasharray="${circ}" stroke-dashoffset="${circ}" style="animation:ringFill 900ms var(--fx) forwards;--to:${circ - (r.score / 100) * circ}"/>
          </svg>
          <div style="position:absolute;inset:0;display:grid;place-items:center">
            <div><div class="serif" style="font-size:31px;line-height:1;color:${tone}">${r.score}</div>
            <div class="mini dim mono">/100</div></div>
          </div>
        </div>
        <span class="badge b-${r.tier.id === 'verified' ? 'verified' : r.tier.id === 'probable' ? 'probable' : r.tier.id === 'dudoso' ? 'dudoso' : 'none'}" style="font-size:10px;padding:4px 11px">${r.tier.label}</span>
        <h2 class="modal-title" style="margin-top:12px;font-size:20px">${r.score >= 80 ? 'Prueba aceptada' : r.score >= 55 ? 'Prueba razonable' : r.score >= 30 ? 'Prueba débil' : 'No se pudo verificar'}</h2>
        <p class="small muted" style="margin:6px auto 0;max-width:330px">${esc(r.feedback || '')}</p>
      </div>

      <div class="divider"><i></i></div>

      <div class="stat-label">Cómo se compuso</div>
      <div class="factors" style="margin-top:10px">
        ${bRow('Evidencia', r.breakdown.evidencia, 45)}
        ${bRow('Detalle del texto', r.breakdown.texto, 25)}
        ${bRow('Tiempo real', r.breakdown.tiempo, 15)}
        ${bRow('Historial', r.breakdown.historial, 15)}
        ${r.breakdown.ai !== null && r.breakdown.ai !== undefined ? bRow('Señal del Guardián', r.breakdown.ai, 100) : ''}
        ${r.breakdown.castigos ? `<div class="row" style="justify-content:space-between"><span class="tiny" style="color:var(--rojo)">Castigos aplicados</span><span class="mono tiny" style="color:var(--rojo)">${r.breakdown.castigos}</span></div>` : ''}
      </div>

      <div class="divider"><i></i></div>

      <div class="loot-items" style="justify-content:flex-start">
        ${r.gainedXp > 0 ? `<span class="loot-item" style="color:var(--gold-2)">${ico('zap', 12)} +${r.gainedXp} XP</span>` : '<span class="loot-item" style="color:var(--rojo)">Sin XP</span>'}
        <span class="loot-item">${ico('scale', 12)} Confianza ${r.trustDelta >= 0 ? '+' : ''}${r.trustDelta}</span>
        ${r.chest ? `<span class="loot-item" style="color:var(--gold-2)">${ico('gift', 12)} Cofre conseguido</span>` : ''}
        ${r.boost ? `<span class="loot-item" style="color:var(--violeta)">${ico('flame', 12)} XP ×2</span>` : ''}
        <span class="loot-item" style="color:${r.aiUsed ? 'var(--violeta)' : 'var(--dim)'}">${ico('cpu', 12)} ${r.aiUsed ? 'Guardián en línea' : 'Motor local'}</span>
      </div>

      ${r.nextQuestion ? `<div class="note mt-16">${ico('eye', 12)} <b>Para la próxima:</b> ${esc(r.nextQuestion)}</div>` : ''}
      ${r.tier.id === 'dudoso' ? `<div class="note note-gold mt-12">${ico('info', 12)} Quedó marcada como dudosa. Puedes limpiarla con el <b>Amuleto del olvido</b> o subir la confianza verificando con evidencia.</div>` : ''}

      <div class="row mt-16" style="gap:8px">
        ${r.score < 55 ? `<button class="btn btn-ghost" data-act="retryVerify">Reintentar</button>` : ''}
        <button class="btn btn-primary" style="flex:1" data-act="finishVerify">Continuar</button>
      </div>
    `, { noFocus: true });
  }

  /* Qué pasa con el texto que escribe la persona. Sin ambigüedades y sin
     hablar de servidores que no existen. */
  function consentLine() {
    const G = A.AIClient;
    const prov = G && G.providerName ? G.providerName() : '';
    const helps = S.ai.enabled && UI.online && prov && G.hasKey();
    return helps
      ? `Tu respuesta se envía a <b>${esc(prov)}</b> para redactar la pregunta y el veredicto. Se guarda en este dispositivo. <button class="linkbtn" data-act="openSettings">cambiar</button>`
      : 'El veredicto se calcula en este dispositivo, sin conexión: tu respuesta no sale de aquí.';
  }

  function bRow(name, val, max) {
    const pct = clamp((val / max) * 100, 0, 100);
    const neg = val < 0;
    return `<div class="factor">
      <span class="factor-name">${name}</span>
      <span class="factor-track"><span class="factor-fill" style="width:${Math.abs(pct)}%;${neg ? 'background:linear-gradient(90deg,rgba(255,113,134,.6),var(--rojo))' : ''}"></span></span>
      <span class="factor-val">${Math.round(val)}</span></div>`;
  }

  async function submitVerification() {
    const v = UI.verify;
    if (!v || v.step !== 'answer') return;
    const ref = findTask(v.taskId);
    if (!ref) return;
    const answer = (v.answer || '').trim();
    if (answer.length < 12) { v.error = 'Escribe al menos una frase concreta.'; renderVerify(); return; }
    const { task, goal } = ref;
    const declared = clamp(Number(v.declaredMin) || task.estMinutes || 15, 1, 240);
    const elapsedSec = Math.round(declared * 60);
    v.error = '';
    v.step = 'checking';
    stopVerifyTimer();
    renderVerify();

    const recent = (S.answers || []).slice(0, 4);
    const f = fx();
    let remote = null;
    if (S.ai.enabled && UI.online) {
      remote = await AI.ask('verdict', {
        goal: { title: goal.title, area: goal.area },
        task: { title: task.title, estMinutes: task.estMinutes, impact: task.impact },
        answer, evidence: v.evidence, elapsedSec, estMinutes: task.estMinutes,
        trustPrev: S.trust, recent, timeLenient: f.timeLenient, trustGainCap: f.trustGainCap,
      });
    }

    let res;
    if (remote && remote.ok) {
      res = {
        score: remote.score, tier: remote.tier, mult: remote.mult, chestChance: remote.chestChance,
        breakdown: remote.breakdown, feedback: remote.feedback, nextQuestion: remote.nextQuestion,
        trust: remote.trust, flagged: remote.flagged, aiUsed: !!remote.aiUsed, provider: remote.provider || '',
      };
    } else {
      const local = E.verifyScore({ evidence: v.evidence, text: answer, timeFit: 'as' }, {
        estMinutes: task.estMinutes, elapsedSec, trustPrev: S.trust, prevTexts: recent, timeLenient: f.timeLenient,
      });
      const flagged = local.tier.id === 'dudoso' || local.tier.id === 'none';
      res = {
        score: local.score, tier: local.tier, mult: local.mult, chestChance: local.chestChance,
        breakdown: local.breakdown, feedback: localFeedback(local),
        nextQuestion: nextLocalQuestion(task, goal),
        trust: E.nextTrust(S.trust, local.score, flagged, { gainCap: f.trustGainCap }),
        flagged, aiUsed: false, provider: '',
      };
    }

    // --- aplicación de consecuencias (una sola vez) ---
    const prevTrust = S.trust;
    const boost = boostActive() && f.hasBoost;
    let gained = 0;
    if (res.score >= 30) {
      const base = E.xpForTask(task);
      gained = addXp(base * res.mult * (boost ? 2 : 1), { high: (task.impact || 0) >= 4, verified: res.tier.id === 'verified' || res.tier.id === 'probable' });
      task.done = true;
      task.completedAt = Date.now();
      task.answer = answer.slice(0, 600);
      task.evidence = v.evidence;
      task.elapsedSec = elapsedSec;
      task.screenSec = Math.round((Date.now() - v.startedAt) / 1000);
      task.tier = res.tier.id;
      task.score = res.score;
      task.aiUsed = res.aiUsed;
      if (!Array.isArray(S.answers)) S.answers = [];
      S.answers.unshift(answer.slice(0, 300));
      if (S.answers.length > 40) S.answers.length = 40;
      S.verdicts[res.tier.id] = (S.verdicts[res.tier.id] || 0) + 1;
      const de = dayEntry();
      de.tasks = (de.tasks || 0) + 1;
      if (answer.length >= 120) de.long = (de.long || 0) + 1;
      if (v.evidence >= 1) de.evidence = (de.evidence || 0) + 1;
      if (res.tier.id === 'verified' || res.tier.id === 'probable') de.verified = (de.verified || 0) + 1;
      if (res.flagged) {
        S.flags.unshift({ taskId: task.id, goalId: goal.id, title: task.title, score: res.score, at: Date.now() });
        if (S.flags.length > 30) S.flags.length = 30;
      }
      addCoins(6 + Math.round(res.score / 12));
      log('verify', `Verificaste «${task.title}» (${res.score}/100)`, { score: res.score });
    } else {
      S.verdicts.none++;
      pushMemory(`Respuesta insuficiente en «${task.title}».`);
      log('verify-fail', `No pasó la verificación: «${task.title}»`);
    }

    S.trust = res.trust;
    // cofre
    let chest = false;
    const chance = clamp((res.score >= 55 ? res.chestChance : 0) + f.chestProbBonus, 0, .9);
    if (gained > 0 && Math.random() < chance && S.chests.length < f.chestSlots && chestsEarnedToday() < f.dailyChests) {
      S.chests.push({ id: 'c' + uid(), at: Date.now() });
      S.chestsToday.n++;
      chest = true;
    }

    v.result = Object.assign({}, res, {
      gainedXp: gained, chest, boost, trustDelta: S.trust - prevTrust,
    });
    v.step = 'verdict';
    save();
    const fresh = checkAchievements();
    renderVerify();
    if (chest) setTimeout(() => toast('Cofre añadido a la cámara.', 'xp'), 500);
    fresh.forEach((a, i) => setTimeout(() => toast(`Logro: ${a.name}`, 'ai'), 900 + i * 700));
  }

  function finishVerification() {
    UI.verify = null;
    closeModal();
    render();
    if (S.chests.length) setTimeout(() => toast('Tienes cofres esperando en la cámara.', 'info'), 700);
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.verifyTimer = verifyTimer;
  A.startVerifyTimer = startVerifyTimer;
  A.stopVerifyTimer = stopVerifyTimer;
  A.openVerify = openVerify;
  A.renderVerify = renderVerify;
  A.bRow = bRow;
  A.loadQuestion = loadQuestion;
  A.submitVerification = submitVerification;
  A.finishVerification = finishVerification;

})(window.Seraph = window.Seraph || {});
