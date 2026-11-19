/* ============================================================================
   views/onboarding — Onboarding: meta, porqué, área, horizonte y plan
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const $ = A.$;
  const AREAS = A.AREAS;
  const S = A.S;
  const UI = A.UI;
  const esc = A.esc;
  const sigilSVG = A.sigilSVG;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const buildPlan = (...args) => A.buildPlan(...args);
  const ico = (...args) => A.ico(...args);
  const phase = (...args) => A.phase(...args);


  /* ------------------------------ Onboarding ------------------------------ */
  function onboardingView() {
    const o = UI.onb || (UI.onb = { step: 0, name: '', title: '', why: '', area: 'estudio', horizon: 60, priority: 4, minutes: 25 });
    /* La puerta de la IA: sin un proveedor que responda, no se entra. */
    if (o.step === 'ai' && A.AISetup) return A.AISetup.gateView();
    if (o.step === 0) {
      return `<div class="menu">
          <div class="menu-crest">${sigilSVG(230, { phase: 4 })}</div>
          <p class="menu-kicker">Seraph Augeo</p>
          <h1 class="menu-title">El ojo que recuerda<br><em>lo que hiciste</em></h1>
          <p class="menu-tag">Un sistema que no cree en promesas: mide lo que realmente ocurrió y te dice la verdad sin humillarte.</p>
          <button class="glass-btn" data-act="onbNext">Entrar</button>
          <p class="menu-note">Tu progreso vive en este dispositivo · sin cuentas ni correo</p>
        </div>`;
    }
    if (o.step === 1) {
      return `<div class="head">
          <p class="eyebrow"><i class="diamond"></i> Paso 2 de 3 · La meta</p>
          <h1 class="title">¿Qué quieres <em>conseguir</em>?</h1>
          <p class="sub">Una sola meta clara vence a diez deseos difusos. Escríbela como algo que se pueda terminar.</p>
        </div>
        <div class="card ornate">
          <div class="field">
            <label>Tu nombre (opcional)</label>
            <input class="input" id="onbName" maxlength="24" placeholder="Cómo quieres que te llame el ojo" value="${esc(o.name)}">
          </div>
          <div class="field">
            <label>La meta</label>
            <input class="input" id="onbTitle" maxlength="80" placeholder="Ej: Aprobar el examen de cálculo en diciembre" value="${esc(o.title)}">
          </div>
          <div class="field">
            <label>¿Por qué esta meta?</label>
            <textarea class="textarea" id="onbWhy" maxlength="180" placeholder="El motivo real. El Guardián lo usará para hacerte preguntas con sentido.">${esc(o.why)}</textarea>
            <p class="hint">Sin el porqué, las preguntas de verificación se vuelven genéricas. Con él, apuntan a lo que de verdad te importa.</p>
          </div>
          <div class="field">
            <label>Área</label>
            <div class="chips" id="onbAreas">
              ${AREAS.map((a) => `<button class="chip-sel ${o.area === a.id ? 'on' : ''}" data-act="onbArea" data-area="${a.id}">${ico(a.icon, 13)} ${a.name}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label>Horizonte</label>
            <div class="chips" id="onbHorizon">
              ${[30, 60, 90, 180].map((d) => `<button class="chip-sel ${o.horizon === d ? 'on' : ''}" data-act="onbHorizon" data-d="${d}">${d} días</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label>Tiempo diario realista</label>
            <div class="chips" id="onbMinutes">
              ${[15, 25, 45, 75].map((m) => `<button class="chip-sel ${o.minutes === m ? 'on' : ''}" data-act="onbMinutes" data-m="${m}">${m} min</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="row mt-16">
          <button class="btn btn-ghost" data-act="onbBack">Atrás</button>
          <button class="btn btn-primary" style="flex:1" data-act="onbPlan">Ver mi plan</button>
        </div>`;
    }
    // step 2: preview
    const plan = o.plan || (o.plan = buildPlan({ area: o.area }));
    return `<div class="head">
        <p class="eyebrow"><i class="diamond"></i> Paso 3 de 3 · El plan</p>
        <h1 class="title">Tu primer <em>tramo</em></h1>
        <p class="sub">Este es el plan que el ojo propone. Todo se puede editar, mover o borrar después.</p>
      </div>
      <div class="card ornate">
        <div class="row"><div style="flex:1"><div class="tiny dim">META</div><div class="serif" style="font-size:19px">${esc(o.title || 'Meta sin nombre')}</div></div></div>
        ${o.why ? `<p class="goal-why">«${esc(o.why)}»</p>` : ''}
        <div class="divider"><i></i></div>
        ${plan.milestones.map((m, i) => `<div class="ms-head"><span class="ms-idx">${i + 1}</span>${esc(m.title)}</div>
          <div class="tasks" style="margin-bottom:12px">
            ${plan.tasks.filter((t) => t.ms === i).map((t) => `<div class="task">
              <div class="check" style="opacity:.4">${ico('check', 13)}</div>
              <div class="task-body"><div class="task-title">${esc(t.title)}</div>
                <div class="task-sub"><span>${t.estMinutes} min</span><span class="dot" style="background:var(--dim)"></span><span>impacto ${t.impact}/5</span></div>
              </div></div>`).join('')}
          </div>`).join('')}
        <div class="note note-gold"><b>Hábito sugerido:</b> ${esc(plan.habit.title)} · ${plan.habit.target} días por semana.</div>
      </div>
      <div class="row mt-16">
        <button class="btn btn-ghost" data-act="onbBack">Atrás</button>
        <button class="btn btn-primary" style="flex:1" data-act="onbStart">Encender el altar</button>
      </div>`;
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.onboardingView = onboardingView;

})(window.Seraph = window.Seraph || {});
