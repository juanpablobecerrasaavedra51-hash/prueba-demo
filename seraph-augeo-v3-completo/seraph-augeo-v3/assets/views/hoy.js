/* ============================================================================
   views/hoy — Vista Hoy, misiones, hábitos y gráfico semanal
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
  const fmt = A.fmt;
  const sigilSVG = A.sigilSVG;
  const today = A.today;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const activeGoals = (...args) => A.activeGoals(...args);
  const fx = (...args) => A.fx(...args);
  const greeting = (...args) => A.greeting(...args);
  const ico = (...args) => A.ico(...args);
  const level = (...args) => A.level(...args);
  const log = (...args) => A.log(...args);
  const nextBestTask = (...args) => A.nextBestTask(...args);
  const openDiagnose = (...args) => A.openDiagnose(...args);
  const openNewTask = (...args) => A.openNewTask(...args);
  const openVerify = (...args) => A.openVerify(...args);
  const phase = (...args) => A.phase(...args);
  const streakN = (...args) => A.streakN(...args);


  /* --------------------------------- Hoy ---------------------------------- */
  function viewHoy() {
    const ph = phase();
    const todayD = new Date();
    const rank = nextBestTask();
    const main = rank && rank[0];
    // Lo pendiente primero; lo ya verificado hoy queda visible al final.
    const doneToday = [];
    activeGoals().forEach((g) => g.tasks.forEach((t) => {
      if (t.done && t.completedAt && E.ymd(new Date(t.completedAt)) === today()) {
        doneToday.push(Object.assign({}, t, { goal: g.title }));
      }
    }));
    const list = (rank || []).slice(0, 6).concat(doneToday.slice(-3));
    const lv = level();
    const st = streakN();
    const de = S.days[today()] || { tasks: 0, xp: 0 };
    const g = main ? main.goalObj : null;

    const reason = main ? whyThis(main, g) : '';
    const goalsTxt = activeGoals().length;

    return `<div class="head row wrap" style="justify-content:space-between;align-items:flex-end">
        <div>
          <p class="eyebrow"><i class="diamond"></i> ${greeting()}${S.name ? ', ' + esc(S.name) : ''} · ${ph.name}</p>
          <h1 class="title">${main ? 'El siguiente paso' : 'Todo en orden'}</h1>
          <p class="sub">${main ? esc(main.title) : 'No queda nada pendiente. Respira: también cuenta.'}</p>
        </div>
        <button class="icon-btn" data-act="openDiagnose" title="Diagnóstico rápido">${ico('eye', 17)}</button>
      </div>

      ${main ? `<section class="hero">
        <div class="hero-eyebrow"><span class="pip"></span> Tarea elegida por el motor</div>
        <h2 class="hero-title">${esc(main.title)}</h2>
        <div class="hero-meta">
          <span class="chip">${ico('clock', 12)} ${main.estMinutes} min</span>
          <span class="chip">${ico('zap', 12)} ${E.xpForTask(main)} XP</span>
          <span class="chip">${ico('target', 12)} ${esc(main.goal)}</span>
          ${main.dueDate ? `<span class="chip">${ico('calendar', 12)} ${fmtDue(main.dueDate)}</span>` : ''}
        </div>
        <div class="hero-reason"><b>Por qué esta:</b> ${reason}</div>
        <div class="factors">
          ${factor('Urgencia', main._f.urgencia)}
          ${factor('Impacto', main._f.impacto)}
          ${factor('Desbloqueo', main._f.desbloqueo)}
          ${factor('Facilidad', main._f.facilidad)}
        </div>
        <div class="hero-actions">
          <button class="btn btn-primary" data-act="openVerify" data-task="${main.id}">${ico('shieldCheck', 15)} Hacer y verificar</button>
          <button class="btn" data-act="pickOther">${ico('list', 15)} Otra tarea</button>
        </div>
      </section>` : `<section class="card ornate center" style="padding:34px 22px">
        <div style="width:80px;margin:0 auto 12px">${sigilSVG(80, { phase: ph.phase })}</div>
        <p class="serif" style="font-size:19px;margin:0 0 6px">Sin pendientes</p>
        <p class="small muted" style="margin:0 0 18px">Puedes añadir una tarea nueva o cerrar una meta.</p>
        <button class="btn btn-primary" data-act="openNewTask">${ico('plus', 15)} Añadir tarea</button>
      </section>`}

      <div class="stats mt-24">
        ${stat('Nivel ' + lv.lvl, lv.name, 'gold', `${Math.round(lv.pct)}% hacia ${lv.lvl < E.MAX_LEVEL ? E.LEVEL_NAMES[lv.lvl] : 'el cielo'}`, lv.pct)}
        ${stat('Confianza', S.trust + '', S.trust >= 75 ? 'celeste' : S.trust >= 55 ? 'violeta' : 'amber', trustLabel(S.trust), S.trust)}
        ${stat('Racha', st + (st === 1 ? ' día' : ' días'), 'amber', st > 0 ? 'Se reinicia sin actividad' : 'Enciéndela hoy', Math.min(100, st * 14))}
        ${stat('Hoy', fmt(de.xp || 0) + ' XP', 'celeste', `${de.tasks || 0} tarea${(de.tasks || 0) === 1 ? '' : 's'} · tope ${E.DAILY_XP_CAP} XP`, ((de.xp || 0) / E.DAILY_XP_CAP) * 100)}
      </div>

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Cola de hoy</h3><span class="sec-note">${list.length} pendientes · ${goalsTxt} meta${goalsTxt === 1 ? '' : 's'}</span></div>
        <div class="tasks">
          ${list.length ? list.map((t, i) => taskRow(t, { main: i === 0 })).join('')
            : '<p class="small dim center" style="padding:18px">Nada en la cola.</p>'}
        </div>
        ${list.length > 3 ? `<button class="btn btn-ghost btn-block mt-12" data-act="goMetas">Ver todas las tareas ${ico('right', 14)}</button>` : ''}
      </section>

      ${questsBlock()}

      ${habitsBlock()}

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Últimos 7 días</h3><span class="sec-note">XP verificado</span></div>
        <div class="card card-flat">${weekChart()}</div>
      </section>

      ${UI.online === false ? `<div class="note mt-24">${ico('info', 12)} <b>Modo local.</b> El Guardián no responde ahora mismo (sin servidor o sin red). La verificación funciona con la matemática local; las preguntas las genera la app a partir de tu meta.</div>` : ''}`;
  }

  function fmtDue(d) {
    const n = E.daysBetween(today(), d);
    if (n < 0) return `vencida hace ${Math.abs(n)} d`;
    if (n === 0) return 'hoy';
    if (n === 1) return 'mañana';
    return `en ${n} días`;
  }

  function factor(name, v) {
    return `<div class="factor"><span class="factor-name">${name}</span>
      <span class="factor-track"><span class="factor-fill" style="width:${Math.round(clamp(v, 0, 1) * 100)}%"></span></span>
      <span class="factor-val">${Math.round(v * 100)}</span></div>`;
  }

  function whyThis(t, g) {
    const parts = [];
    if (t._dueIn !== null && t._dueIn !== undefined) {
      if (t._dueIn <= 0) parts.push('vence hoy o ya venció');
      else if (t._dueIn <= 3) parts.push(`vence en ${t._dueIn} día${t._dueIn === 1 ? '' : 's'}`);
    }
    if ((t.impact || 0) >= 4) parts.push('es de alto impacto');
    if (t._f && t._f.desbloqueo >= .34) parts.push('desbloquea otras tareas');
    if ((t.estMinutes || 15) <= 20) parts.push(`cabe en ${t.estMinutes} minutos`);
    if (g && g.why && parts.length < 2) parts.push(`te acerca a «${g.why}»`);
    if (!parts.length) parts.push('equilibra urgencia, impacto y esfuerzo mejor que el resto');
    return parts.slice(0, 3).join(', ') + '.';
  }

  function stat(label, value, tone, foot, pct) {
    return `<div class="stat">
      <div class="stat-label">${label}</div>
      <div class="stat-value ${tone || ''}">${value}</div>
      ${pct !== undefined ? `<div class="bar"><span style="width:${clamp(pct, 0, 100)}%"></span></div>` : ''}
      <div class="stat-foot">${foot || ''}</div>
    </div>`;
  }

  function trustLabel(t) {
    if (t >= 85) return 'El ojo te cree sin dudar';
    if (t >= 70) return 'Relación sólida';
    if (t >= 55) return 'Confianza en construcción';
    if (t >= 35) return 'El ojo duda de ti';
    return 'Casi todo se marca como dudoso';
  }

  function taskRow(t, opt) {
    const o = opt || {};
    const tierBadge = t.tier === 'verified' ? '<span class="badge b-verified">Verificado</span>'
      : t.tier === 'probable' ? '<span class="badge b-probable">Probable</span>'
      : t.tier === 'dudoso' ? '<span class="badge b-dudoso">Dudoso</span>'
      : t.tier === 'none' ? '<span class="badge b-none">Sin verificar</span>' : '';
    return `<div class="task ${t.done ? 'is-done' : ''} ${o.main ? 'is-main' : ''}" data-task-row="${t.id}">
      <button class="check" data-act="${t.done ? 'noop' : 'openVerify'}" data-task="${t.id}" aria-label="Verificar ${esc(t.title)}">
        ${ico('check', 13)}</button>
      <div class="task-body">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-sub">
          <span>${t.estMinutes} min</span>
          ${o.hideGoal ? '' : `<span class="dot" style="background:var(--dim)"></span><span>${esc(t.goal || '')}</span>`}
          <span class="dot" style="background:var(--dim)"></span>
          <span class="task-xp">${E.xpForTask(t)} XP</span>
          ${t.dueDate ? `<span class="dot" style="background:var(--dim)"></span><span>${fmtDue(t.dueDate)}</span>` : ''}
          ${tierBadge}
        </div>
      </div>
      ${t.done ? '' : `<button class="icon-btn" style="width:32px;height:32px" data-act="openVerify" data-task="${t.id}" aria-label="Verificar">${ico('shieldCheck', 15)}</button>`}
    </div>`;
  }

  /* -------------------------------- Misiones ------------------------------ */
  function ensureQuests() {
    const d = today();
    if (S.questState.date !== d) {
      const list = E.questsFor(d, 3 + fx().extraQuests).map((q) => ({ id: q.id, claimed: false }));
      S.questState = { date: d, list };
    }
    return S.questState.list;
  }

  function questCounters() {
    const d = S.days[today()] || {};
    return {
      verified: d.verified || 0, high: d.high || 0, habit: d.habits || 0,
      long: d.long || 0, evidence: d.evidence || 0, chest: d.chest || 0,
      trust: S.trust >= 70 ? 1 : 0,
    };
  }

  function questDef(id) { return E.QUEST_POOL.find((q) => q.id === id) || { id, title: id, need: 1, coins: 0, xp: 0 }; }

  function questsBlock() {
    const list = ensureQuests();
    const c = questCounters();
    const ready = list.filter((q) => !q.claimed && (c[questDef(q.id).kind] || 0) >= questDef(q.id).need).length;
    return `<section class="sec">
      <div class="sec-head"><h3 class="sec-title">Misiones del día</h3>
        <span class="sec-note">${ready ? ready + ' por reclamar' : `${list.filter((q) => q.claimed).length}/${list.length}`}</span></div>
      <div class="tasks">
        ${list.map((q) => {
          const def = questDef(q.id);
          const prog = Math.min(c[def.kind] || 0, def.need);
          const done = prog >= def.need;
          return `<div class="quest ${q.claimed ? 'done' : ''}">
            <div class="quest-mark">${q.claimed ? ico('check', 12) : ico('target', 12)}</div>
            <div class="quest-body">
              <div class="quest-title">${esc(def.title)}</div>
              <div class="quest-sub">${prog}/${def.need} · ${def.coins} monedas · ${def.xp} XP</div>
            </div>
            ${q.claimed ? '<span class="badge b-verified">Hecha</span>'
              : done ? `<button class="btn btn-sm btn-primary" data-act="claimQuest" data-q="${q.id}">Reclamar</button>`
              : `<span class="tiny dim">${prog}/${def.need}</span>`}
          </div>`;
        }).join('')}
      </div>
    </section>`;
  }

  /* -------------------------------- Hábitos ------------------------------- */
  function habitsBlock() {
    if (!S.habits.length) return '';
    return `<section class="sec">
      <div class="sec-head"><h3 class="sec-title">Hábitos</h3><span class="sec-note">Sostienen la racha</span></div>
      <div class="tasks">
        ${S.habits.map((h) => {
          const log = h.log || {};
          const doneToday = !!log[today()];
          const last7 = Array.from({ length: 7 }, (_, i) => log[E.ymd(E.addDays(new Date(), -6 + i))]).filter(Boolean).length;
          return `<div class="habit ${doneToday ? 'done' : ''}">
            <div class="habit-main">
              <div class="habit-title">${esc(h.title)}</div>
              <div class="habit-sub"><span>${last7}/7 esta semana</span>
                <span class="week-dots">${Array.from({ length: 7 }, (_, i) => {
                  const d = E.ymd(E.addDays(new Date(), -6 + i));
                  return `<span class="wd ${log[d] ? 'on' : ''}"></span>`;
                }).join('')}</span></div>
            </div>
            <button class="habit-btn" data-act="toggleHabit" data-h="${h.id}" aria-label="${doneToday ? 'Desmarcar' : 'Marcar'} hábito">${ico('check', 16)}</button>
          </div>`;
        }).join('')}
      </div>
    </section>`;
  }

  function weekChart() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = E.ymd(E.addDays(new Date(), -i));
      const e = S.days[d];
      days.push({ d, xp: e ? e.xp || 0 : 0, tasks: e ? e.tasks || 0 : 0 });
    }
    const max = Math.max(60, ...days.map((x) => x.xp));
    const W = 300, H = 92, pad = 4;
    const bw = (W - pad * 2) / 7;
    const bars = days.map((x, i) => {
      const h = Math.max(2, (x.xp / max) * (H - 26));
      const y = H - 18 - h;
      const isToday = i === 6;
      return `<g>
        <rect x="${(pad + i * bw + bw * .22).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * .56).toFixed(1)}" height="${h.toFixed(1)}" rx="2"
          fill="${isToday ? 'var(--gold-2)' : 'rgba(201,169,97,.32)'}" />
        <text x="${(pad + i * bw + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle"
          font-size="7.5" fill="var(--dim)" font-family="var(--mono)">${['D', 'L', 'M', 'M', 'J', 'V', 'S'][E.parseDay(x.d).getDay()]}</text>
        ${x.xp ? `<text x="${(pad + i * bw + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="7" fill="var(--muted)" font-family="var(--mono)">${x.xp}</text>` : ''}
      </g>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="92" preserveAspectRatio="none" role="img" aria-label="XP de los últimos 7 días">${bars}</svg>`;
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.viewHoy = viewHoy;
  A.fmtDue = fmtDue;
  A.factor = factor;
  A.whyThis = whyThis;
  A.stat = stat;
  A.trustLabel = trustLabel;
  A.taskRow = taskRow;
  A.ensureQuests = ensureQuests;
  A.questCounters = questCounters;
  A.questDef = questDef;
  A.questsBlock = questsBlock;
  A.habitsBlock = habitsBlock;
  A.weekChart = weekChart;

})(window.Seraph = window.Seraph || {});
