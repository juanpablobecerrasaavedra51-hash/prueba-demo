/* ============================================================================
   views/metas — Metas, archivadas y editor de metas y tareas
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const $ = A.$;
  const AREAS = A.AREAS;
  const E = A.E;
  const S = A.S;
  const UI = A.UI;
  const cap = A.cap;
  const clamp = A.clamp;
  const esc = A.esc;
  const uid = A.uid;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const activeGoals = (...args) => A.activeGoals(...args);
  const buildPlan = (...args) => A.buildPlan(...args);
  const closeModal = (...args) => A.closeModal(...args);
  const goalStats = (...args) => A.goalStats(...args);
  const horizonDate = (...args) => A.horizonDate(...args);
  const ico = (...args) => A.ico(...args);
  const log = (...args) => A.log(...args);
  const openModal = (...args) => A.openModal(...args);
  const render = (...args) => A.render(...args);
  const save = (...args) => A.save(...args);
  const taskRow = (...args) => A.taskRow(...args);
  const toast = (...args) => A.toast(...args);


  /* -------------------------------- Metas --------------------------------- */
  function viewMetas() {
    const goals = activeGoals();
    return `<div class="head">
        <p class="eyebrow"><i class="diamond"></i> ${goals.length} meta${goals.length === 1 ? '' : 's'} activa${goals.length === 1 ? '' : 's'}</p>
        <h1 class="title">Tus <em>metas</em></h1>
        <p class="sub">Cada meta tiene hitos y tareas. El motor decide cuál toca hoy según urgencia, impacto y esfuerzo.</p>
      </div>
      <div class="goals">
        ${goals.map(goalCard).join('')}
      </div>
      <div class="row mt-16" style="gap:9px">
        <button class="btn btn-primary" style="flex:1" data-act="openNewGoal">${ico('plus', 15)} Nueva meta</button>
        <button class="btn" data-act="openNewTask">${ico('plus', 15)} Tarea</button>
      </div>
      ${viewArchived()}`;
  }

  function goalCard(g) {
    const st = goalStats(g);
    const area = AREAS.find((a) => a.id === g.area) || AREAS[2];
    const open = UI.expandedGoal === g.id;
    const pr = st.projection;
    return `<div class="goal" data-act="toggleGoal" data-goal="${g.id}">
      <div class="goal-top">
        <div class="goal-title">${esc(g.title)}</div>
        <span class="chip">${ico(area.icon, 12)} ${area.name}</span>
      </div>
      ${g.why ? `<p class="goal-why">«${esc(g.why)}»</p>` : ''}
      <div class="bar" style="margin-top:12px"><span style="width:${st.pct}%"></span></div>
      <div class="goal-foot"><span><b>${st.pct}%</b> · ${st.done}/${st.total} tareas</span>
        <span>${g.targetDate ? `Meta: ${fmtDate(g.targetDate)}` : 'Sin fecha'}</span></div>
      <div class="goal-meta">
        <span>${ico('target', 11)} Prioridad ${g.priority}/5</span>
        <span>${ico('clock', 11)} ${st.elapsed} día${st.elapsed === 1 ? '' : 's'}</span>
        ${g.targetDate ? `<span>${ico('calendar', 11)} ${pr.eta ? (pr.late ? `Va ${pr.lateDays} días tarde` : `Llegas el ${fmtDate(pr.eta)}`) : 'Sin ritmo aún'}</span>` : ''}
      </div>
      ${open ? goalOpen(g, st) : ''}
    </div>`;
  }

  function goalOpen(g, st) {
    return `<div class="milestone" data-act="stop">
      ${g.milestones.map((m, i) => {
        const tasks = g.tasks.filter((t) => t.ms === i);
        const done = tasks.filter((t) => t.done).length;
        return `<div class="ms-head"><span class="ms-idx">${i + 1}</span>${esc(m.title)}
          <span style="margin-left:auto;font-family:var(--mono);font-size:9px;color:var(--dim)">${done}/${tasks.length}</span></div>
          <div class="tasks">${tasks.map((t) => taskRow(Object.assign({}, t, { goal: g.title }), { hideGoal: true })).join('')}</div>`;
      }).join('')}
      <div class="row mt-12" style="gap:8px">
        <button class="btn btn-sm" data-act="openNewTask" data-goal="${g.id}">${ico('plus', 13)} Tarea</button>
        <button class="btn btn-sm btn-ghost" data-act="editGoal" data-goal="${g.id}">${ico('edit', 13)} Editar</button>
        <span class="spacer"></span>
        <button class="btn btn-sm btn-danger" data-act="delGoal" data-goal="${g.id}">${ico('trash', 13)}</button>
      </div>
    </div>`;
  }

  function fmtDate(d) {
    try {
      return E.parseDay(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    } catch (e) { return d; }
  }

  function viewArchived() {
    const arch = S.goals.filter((g) => g.archived);
    if (!arch.length) return '';
    return `<section class="sec">
      <div class="sec-head"><h3 class="sec-title">Archivadas</h3><span class="sec-note">${arch.length}</span></div>
      <div class="tasks">${arch.map((g) => `<div class="task">
        <div class="task-body"><div class="task-title">${esc(g.title)}</div>
          <div class="task-sub">${goalStats(g).pct}% completada</div></div>
        <button class="btn btn-sm btn-ghost" data-act="restoreGoal" data-goal="${g.id}">Restaurar</button>
      </div>`).join('')}</div>
    </section>`;
  }


  /* ------------------------------- Nueva meta ----------------------------- */
  function openNewGoal(goalId) {
    const g = goalId ? S.goals.find((x) => x.id === goalId) : null;
    UI.goalDraft = g
      ? { id: g.id, title: g.title, why: g.why, area: g.area, horizon: 60, priority: g.priority }
      : { id: '', title: '', why: '', area: 'estudio', horizon: 60, priority: 4 };
    renderGoalModal();
  }
  function renderGoalModal() {
    const d = UI.goalDraft;
    openModal(`
      <h2 class="modal-title">${d.id ? 'Editar meta' : 'Nueva meta'}</h2>
      <p class="modal-sub">El porqué importa: el Guardián lo usa para preguntarte cosas que sí tienen sentido.</p>
      <div class="field"><label>Meta</label>
        <input class="input" id="gTitle" maxlength="80" placeholder="Qué quieres terminar" value="${esc(d.title)}"></div>
      <div class="field"><label>Por qué</label>
        <textarea class="textarea" id="gWhy" maxlength="180" placeholder="El motivo real, en tus palabras">${esc(d.why)}</textarea></div>
      <div class="field"><label>Área</label><div class="chips">
        ${AREAS.map((a) => `<button class="chip-sel ${d.area === a.id ? 'on' : ''}" data-act="goalArea" data-area="${a.id}">${a.name}</button>`).join('')}
      </div></div>
      <div class="field"><label>Horizonte</label><div class="chips">
        ${[30, 60, 90, 180].map((h) => `<button class="chip-sel ${d.horizon === h ? 'on' : ''}" data-act="goalHorizon" data-d="${h}">${h} días</button>`).join('')}
      </div></div>
      <div class="field"><label>Prioridad</label><div class="chips">
        ${[1, 2, 3, 4, 5].map((p) => `<button class="chip-sel ${d.priority === p ? 'on' : ''}" data-act="goalPriority" data-p="${p}">${p}</button>`).join('')}
      </div></div>
      <div class="row" style="gap:8px">
        <button class="btn btn-ghost" data-act="closeModal">Cancelar</button>
        <button class="btn btn-primary" style="flex:1" data-act="saveGoal">${d.id ? 'Guardar' : 'Crear meta y plan'}</button>
      </div>
    `);
  }

  function saveGoal() {
    const d = UI.goalDraft;
    const title = ($('#gTitle') || {}).value ? $('#gTitle').value.trim() : d.title;
    const why = $('#gWhy') ? $('#gWhy').value.trim() : d.why;
    if (title.length < 4) { toast('Escribe una meta concreta.', 'err'); return; }
    if (d.id) {
      const g = S.goals.find((x) => x.id === d.id);
      if (g) { g.title = title; g.why = why; g.area = d.area; g.priority = d.priority; }
      log('goal-edit', `Editaste «${title}»`);
    } else {
      const plan = buildPlan({ area: d.area });
      const goal = {
        id: 'g' + uid(), title, why, area: d.area, priority: d.priority,
        createdAt: Date.now(), targetDate: horizonDate(d.horizon),
        milestones: plan.milestones, tasks: plan.tasks, archived: false,
      };
      S.goals.push(goal);
      if (plan.habit && !S.habits.some((h) => h.title === plan.habit.title)) {
        S.habits.push({ id: 'h' + uid(), title: plan.habit.title, target: plan.habit.target, log: {} });
      }
      UI.expandedGoal = goal.id;
      log('goal', `Nueva meta: «${title}»`);
      toast('Meta creada con ' + plan.tasks.length + ' tareas.', 'xp');
    }
    save();
    closeModal();
    render();
  }

  /* ------------------------------- Nueva tarea ---------------------------- */
  function openNewTask(goalId) {
    const goals = activeGoals();
    if (!goals.length) { toast('Primero crea una meta.', 'err'); return; }
    UI.taskDraft = { goalId: goalId || goals[0].id, title: '', minutes: 25, impact: 4, ms: 0, due: '' };
    renderTaskModal();
  }
  function renderTaskModal() {
    const d = UI.taskDraft;
    const g = S.goals.find((x) => x.id === d.goalId) || activeGoals()[0];
    openModal(`
      <h2 class="modal-title">Nueva tarea</h2>
      <p class="modal-sub">Pequeña y verificable. Si no se puede comprobar en una frase, pártela.</p>
      <div class="field"><label>Meta</label>
        <select class="select" id="tGoal">${activeGoals().map((x) => `<option value="${x.id}" ${x.id === d.goalId ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></div>
      <div class="field"><label>Tarea</label>
        <input class="input" id="tTitle" maxlength="90" placeholder="Ej: Resolver 5 ejercicios del capítulo 3" value="${esc(d.title)}"></div>
      <div class="field"><label>Hito</label>
        <select class="select" id="tMs">${(g.milestones || []).map((m, i) => `<option value="${i}" ${i === d.ms ? 'selected' : ''}>${i + 1}. ${esc(m.title)}</option>`).join('')}</select></div>
      <div class="row" style="gap:12px">
        <div class="field" style="flex:1"><label>Minutos</label>
          <input class="input" id="tMin" type="number" min="5" max="240" step="5" value="${d.minutes}"></div>
        <div class="field" style="flex:1"><label>Impacto (1-5)</label>
          <input class="input" id="tImp" type="number" min="1" max="5" value="${d.impact}"></div>
      </div>
      <div class="field"><label>Fecha límite (opcional)</label>
        <input class="input" id="tDue" type="date" value="${d.due}"></div>
      <div class="row" style="gap:8px">
        <button class="btn btn-ghost" data-act="closeModal">Cancelar</button>
        <button class="btn btn-primary" style="flex:1" data-act="saveTask">Añadir</button>
      </div>
    `);
  }
  function saveTask() {
    const d = UI.taskDraft;
    const title = ($('#tTitle') || {}).value ? $('#tTitle').value.trim() : '';
    if (title.length < 3) { toast('La tarea necesita un nombre.', 'err'); return; }
    const goalId = $('#tGoal') ? $('#tGoal').value : d.goalId;
    const g = S.goals.find((x) => x.id === goalId);
    if (!g) return;
    const t = {
      id: 't' + uid(), title,
      estMinutes: clamp(parseInt(($('#tMin') || {}).value, 10) || 25, 5, 240),
      impact: clamp(parseInt(($('#tImp') || {}).value, 10) || 4, 1, 5),
      effort: 3, ms: parseInt(($('#tMs') || {}).value, 10) || 0,
      dueDate: ($('#tDue') || {}).value || '',
      done: false, tier: '', score: 0, answer: '', evidence: 0, completedAt: null, elapsedSec: 0, aiUsed: false,
    };
    g.tasks.push(t);
    log('task', `Nueva tarea: «${title}»`);
    save();
    closeModal();
    render();
    toast('Tarea añadida.', 'xp');
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.viewMetas = viewMetas;
  A.goalCard = goalCard;
  A.goalOpen = goalOpen;
  A.fmtDate = fmtDate;
  A.viewArchived = viewArchived;
  A.openNewGoal = openNewGoal;
  A.renderGoalModal = renderGoalModal;
  A.saveGoal = saveGoal;
  A.openNewTask = openNewTask;
  A.renderTaskModal = renderTaskModal;
  A.saveTask = saveTask;

})(window.Seraph = window.Seraph || {});
