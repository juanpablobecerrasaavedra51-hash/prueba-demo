/* ============================================================================
   actions — Acciones, ajustes, planes, exportar/importar y reinicio
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const $ = A.$;
  const E = A.E;
  const KEY = A.KEY;
  const S = A.S;
  const UI = A.UI;
  const clamp = A.clamp;
  const doc = A.doc;
  const esc = A.esc;
  const today = A.today;
  const uid = A.uid;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const probeAI = (...args) => A.probeAI(...args);
  const askDiagnose = (...args) => A.askDiagnose(...args);
  const askSuggest = (...args) => A.askSuggest(...args);
  const submitVerification = (...args) => A.submitVerification(...args);
  const addCoins = (...args) => A.addCoins(...args);
  const addXp = (...args) => A.addXp(...args);
  const buildPlan = (...args) => A.buildPlan(...args);
  const checkAchievements = (...args) => A.checkAchievements(...args);
  const closeModal = (...args) => A.closeModal(...args);
  const dayEntry = (...args) => A.dayEntry(...args);
  const defaultState = (...args) => A.defaultState(...args);
  const ensureQuests = (...args) => A.ensureQuests(...args);
  const finishVerification = (...args) => A.finishVerification(...args);
  const fx = (...args) => A.fx(...args);
  const goalStats = (...args) => A.goalStats(...args);
  const horizonDate = (...args) => A.horizonDate(...args);
  const ico = (...args) => A.ico(...args);
  const log = (...args) => A.log(...args);
  const openArtifact = (...args) => A.openArtifact(...args);
  const openChest = (...args) => A.openChest(...args);
  const openDiagnose = (...args) => A.openDiagnose(...args);
  const openModal = (...args) => A.openModal(...args);
  const openNewGoal = (...args) => A.openNewGoal(...args);
  const openNewTask = (...args) => A.openNewTask(...args);
  const openPickOther = (...args) => A.openPickOther(...args);
  const openVerify = (...args) => A.openVerify(...args);
  const questCounters = (...args) => A.questCounters(...args);
  const questDef = (...args) => A.questDef(...args);
  const render = (...args) => A.render(...args);
  const renderGoalModal = (...args) => A.renderGoalModal(...args);
  const renderVerify = (...args) => A.renderVerify(...args);
  const save = (...args) => A.save(...args);
  const saveGoal = (...args) => A.saveGoal(...args);
  const saveTask = (...args) => A.saveTask(...args);
  const showIntro = (...args) => A.showIntro(...args);
  const sparkBurst = (...args) => A.sparkBurst(...args);
  const startVerifyTimer = (...args) => A.startVerifyTimer(...args);
  const toast = (...args) => A.toast(...args);
  const useArtifact = (...args) => A.useArtifact(...args);


  /* -------------------------------- Ajustes ------------------------------- */
  /* La clave vive sólo en este dispositivo: se guarda en localStorage y viaja
     directo al proveedor (Google o OpenRouter). Nunca pasa por un servidor de
     la app. El proveedor se elige solo según el prefijo de la clave. */
  function aiKeyMarkup() {
    const G = A.AIClient;
    const s = G && G.status ? G.status() : null;
    if (!s) return '';

    const tone = s.ready ? 'ok' : 'err';
    const detail = s.ready
      ? `Activo: ${s.providerName} · respondió en ${s.ms} ms.`
      : s.profiles.length
        ? 'Ningún proveedor respondió todavía. Vuelve a probar o elige otro.'
        : 'Sin IA configurada: la app usa su motor local para preguntar y diagnosticar.';

    return `<p class="tiny mono" style="margin:0 0 8px;color:var(--muted)">${s.profiles.length ? `${s.profiles.length} proveedor${s.profiles.length === 1 ? '' : 'es'} guardado${s.profiles.length === 1 ? '' : 's'} en este dispositivo` : 'Ningún proveedor guardado'}</p>
      <div class="row wrap" style="gap:8px">
        <button class="btn btn-sm" data-act="openAiSetup">${ico('cpu', 13)} Configurar proveedores</button>
        <button class="btn btn-sm btn-ghost" data-act="probeAI">${ico('refresh', 13)} Probar</button>
        ${s.profiles.length ? `<button class="btn btn-sm btn-ghost" data-act="clearAiKey">${ico('trash', 13)} Borrar todo</button>` : ''}
      </div>
      <p class="hint ${tone}">${esc(detail)}</p>`;
  }

  function openSettings() {
    const bk = backupStatus();
    openModal(`
      <h2 class="modal-title">Ajustes</h2>
      <p class="modal-sub">Todo vive en tu navegador. Puedes exportarlo o borrarlo cuando quieras.</p>
      <div class="field"><label>Tu nombre</label>
        <input class="input" id="sName" maxlength="24" value="${esc(S.name)}" placeholder="Cómo te llama el ojo"></div>
      <div class="field"><label>El Guardián (IA)</label>
        <button class="opt ${S.ai.enabled ? 'on' : ''}" data-act="toggleAI">
          <span class="opt-mark"></span>
          <span class="opt-text"><span class="opt-title">Usar el Guardián en línea</span>
            <span class="opt-hint">Con tu clave de Gemini u OpenRouter, las preguntas y el diagnóstico los redacta la IA. Si falla, la app sigue sola.</span></span>
        </button>
      </div>
      <div class="field"><label>Clave de IA (Gemini u OpenRouter)</label>
        ${aiKeyMarkup()}
      </div>
      <div class="field"><label>Movimiento</label>
        <button class="opt ${S.settings.motion ? 'on' : ''}" data-act="toggleMotion">
          <span class="opt-mark"></span>
          <span class="opt-text"><span class="opt-title">Animaciones completas</span>
            <span class="opt-hint">Desactívalas si te marea el brillo o el ruido visual.</span></span>
        </button>
      </div>
      <div class="divider"><i></i></div>
      <div class="row wrap" style="gap:8px">
        <button class="btn btn-sm" data-act="exportData">${ico('download', 13)} Descargar copia</button>
        <button class="btn btn-sm" data-act="importData">${ico('book', 13)} Importar</button>
        <button class="btn btn-sm" data-act="replayIntro">${ico('play', 13)} Ver intro otra vez</button>
        <button class="btn btn-sm btn-danger" data-act="resetAll">${ico('trash', 13)} Borrar todo</button>
      </div>
      <p class="hint ${bk.stale ? 'err' : ''}">${esc(bk.text)}${bk.stale ? ' Si limpias el navegador, se pierde todo el progreso.' : ' Guardado fuera del navegador, ese archivo es tu respaldo.'}</p>
      <div class="divider"><i></i></div>
      <p class="tiny dim">Seraph Augeo v3 · El ojo no miente, pero tampoco es un detector de mentiras. La verificación es una estimación honesta y transparente, no una prueba judicial. Tu clave de IA se queda en este navegador; no hay servidor que la reciba.</p>
      <button class="btn btn-block mt-16" data-act="closeModal">Cerrar</button>
    `);
  }

  /* --------------------------------- Planes ------------------------------- */
  function openPlans() {
    openModal(`
      <h2 class="modal-title">Planes</h2>
      <p class="modal-sub">Nada esencial está bloqueado. El acceso completo se gana, no se paga.</p>
      <div class="plan">
        <div class="plan-name">Peregrino</div>
        <div class="plan-price">Gratis <span>para siempre</span></div>
        <ul>
          <li>${ico('check', 13)} 15 rarezas y 20 artefactos únicos</li>
          <li>${ico('check', 13)} Verificación con evidencia y tiempo</li>
          <li>${ico('check', 13)} Guardián con Gemini u OpenRouter, directo desde tu navegador</li>
          <li>${ico('check', 13)} Diagnóstico local siempre disponible</li>
          <li>${ico('check', 13)} Exportar tus datos en JSON</li>
        </ul>
      </div>
      <div class="plan pro">
        <div class="plan-name">Serafín</div>
        <div class="plan-price">Próximamente <span>· sin cobro todavía</span></div>
        <ul>
          <li>${ico('check', 13)} Diagnóstico profundo con memoria larga</li>
          <li>${ico('check', 13)} Preguntas adaptadas a tu historial completo</li>
          <li>${ico('check', 13)} Copias de seguridad cifradas</li>
          <li class="off">${ico('x', 13)} Nada de lo gratuito se retira</li>
        </ul>
      </div>
      <p class="tiny dim mt-12">No hay cobro activo ni suscripción real. Esta pantalla describe el rumbo, no una venta.</p>
      <button class="btn btn-primary btn-block mt-16" data-act="closeModal">Entendido</button>
    `);
  }


  /* ------------------------------ Exportar -------------------------------- */
  /* Copia de seguridad: es lo único que protege el progreso si se limpia el
     navegador. Se marca la fecha para poder avisar cuando toca otra. */
  function backupStatus() {
    if (!S.lastBackup) return { text: 'Nunca has descargado una copia.', stale: true };
    const days = Math.floor((Date.now() - S.lastBackup) / 86400000);
    if (days <= 0) return { text: 'Última copia: hoy.', stale: false };
    return { text: `Última copia: hace ${days} día${days === 1 ? '' : 's'}.`, stale: days >= 7 };
  }

  function exportData() {
    try {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a = doc.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `seraph-augeo-${today()}.json`;
      doc.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      S.lastBackup = Date.now();
      save();
      toast('Copia descargada. Guárdala fuera del navegador.', 'xp');
    } catch (e) { toast('No se pudo exportar.', 'err'); }
  }

  function importData() {
    const inp = doc.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const p = JSON.parse(rd.result);
          if (!p || p.v !== 3) throw new Error('formato');
          A.setState(Object.assign(defaultState(), p));
          S.lastBackup = Date.now();
          save(); closeModal(); render();
          toast('Datos importados.', 'xp');
        } catch (e) { toast('Archivo no válido.', 'err'); }
      };
      rd.readAsText(f);
    };
    inp.click();
  }

  function resetAll() {
    openModal(`
      <h2 class="modal-title">¿Borrar todo?</h2>
      <p class="modal-sub">Se pierden metas, tareas, XP, cofres y artefactos. No se puede deshacer. Exporta antes si quieres conservarlo.</p>
      <div class="row" style="gap:8px">
        <button class="btn btn-ghost" data-act="closeModal">Cancelar</button>
        <button class="btn btn-danger" style="flex:1" data-act="confirmReset">Borrar definitivamente</button>
      </div>
    `);
  }

  /* ------------------------------- Acciones ------------------------------- */
  function go(tab) { UI.tab = tab; closeModal(); render(); window.scrollTo(0, 0); }

  function dispatch(act, el) {
    const d = (k) => el.getAttribute(k);
    switch (act) {
      case 'noop': case 'stop': return;
      case 'tab': go(d('data-tab')); return;
      case 'goAltar': go('altar'); return;
      case 'goCofres': go('cofres'); return;
      case 'goMetas': go('metas'); return;
      case 'openGuardian': go('guardian'); return;
      case 'goGuardianDiag': closeModal(); UI.tab = 'guardian'; render(); askDiagnose(); return;

      /* onboarding */
      case 'onbNext': {
        /* La puerta: sin una IA que haya respondido, el paso es configurarla. */
        const gate = !(A.AIClient && A.AIClient.isReady());
        const next = gate ? 'ai' : 1;
        /* Si el serafín está vivo, entrar es atravesar su halo. */
        if (UI.onb.step === 0 && A.Angel3D && A.Angel3D.ok) {
          if (A.Angel3D.enter(() => { UI.onb.step = next; render(); })) return;
        }
        UI.onb.step = next; render(); return;
      }
      case 'onbBack': {
        if (UI.onb.step === 'ai') { UI.onb.step = 0; render(); return; }
        if (UI.onb.step === 1) {
          const t = $('#onbTitle'); if (t) UI.onb.title = t.value;
          UI.onb.step = 'ai'; render(); return;
        }
        UI.onb.step = Math.max(0, UI.onb.step - 1);
        render(); return;
      }
      case 'onbArea': UI.onb.area = d('data-area'); UI.onb.plan = null; render(); return;
      case 'onbHorizon': UI.onb.horizon = Number(d('data-d')); render(); return;
      case 'onbMinutes': UI.onb.minutes = Number(d('data-m')); render(); return;
      case 'onbPlan': {
        const name = ($('#onbName') || {}).value || '';
        const title = ($('#onbTitle') || {}).value || '';
        const why = ($('#onbWhy') || {}).value || '';
        UI.onb.name = name.trim(); UI.onb.title = title.trim(); UI.onb.why = why.trim();
        if (UI.onb.title.length < 4) { toast('Escribe una meta concreta (mínimo 4 letras).', 'err'); return; }
        UI.onb.plan = buildPlan({ area: UI.onb.area });
        UI.onb.step = 2; render(); return;
      }
      case 'onbStart': {
        const o = UI.onb;
        const plan = o.plan || buildPlan({ area: o.area });
        S.name = o.name || '';
        const goal = {
          id: 'g' + uid(), title: o.title, why: o.why, area: o.area,
          priority: 4, createdAt: Date.now(), targetDate: horizonDate(o.horizon),
          milestones: plan.milestones, tasks: plan.tasks, archived: false,
        };
        S.goals.push(goal);
        if (plan.habit) S.habits.push({ id: 'h' + uid(), title: plan.habit.title, target: plan.habit.target, log: {} });
        UI.expandedGoal = goal.id;
        UI.tab = 'hoy';
        log('goal', `Meta inicial: «${o.title}»`);
        toast('El altar está encendido.', 'xp');
        save(); render();
        sparkBurst('var(--gold-2)', 20);
        setTimeout(() => toast('Tu primera tarea ya está elegida.', 'info'), 1200);
        return;
      }

      /* verificación */
      case 'openVerify': {
        const id = d('data-task');
        closeModal();
        setTimeout(() => openVerify(id), 60);
        return;
      }
      case 'vEvidence': UI.verify.evidence = Number(d('data-e')); renderVerify(); return;
      case 'vMinus': UI.verify.declaredMin = clamp((Number(UI.verify.declaredMin) || 0) - 5, 1, 240); renderVerify(); return;
      case 'vPlus': UI.verify.declaredMin = clamp((Number(UI.verify.declaredMin) || 0) + 5, 1, 240); renderVerify(); return;
      case 'submitVerify': submitVerification(); return;
      case 'retryVerify': {
        const v = UI.verify;
        if (!v) return;
        v.step = 'answer'; v.result = null; v.answer = ''; v.evidence = v.evidence;
        v.startedAt = Date.now();
        renderVerify(); startVerifyTimer();
        return;
      }
      case 'finishVerify': finishVerification(); return;
      case 'pickOther': openPickOther(); return;

      /* cofres */
      case 'openChest': openChest(Number(d('data-i'))); return;
      case 'closeChest': UI.opening = null; closeModal(); render(); return;
      case 'buyChest': {
        const mode = d('data-mode');
        if (S.purchasesToday.date !== today()) S.purchasesToday = { date: today(), n: 0 };
        if (S.purchasesToday.n >= 2) { toast('Dos compras al día es el límite.', 'err'); return; }
        if (mode === 'coins') {
          if (S.coins < E.CHEST_PRICES.buy) { toast('No tienes monedas suficientes.', 'err'); return; }
          S.coins -= E.CHEST_PRICES.buy;
        } else {
          if (S.essence < E.CHEST_PRICES.essence) { toast('No tienes esencia suficiente.', 'err'); return; }
          S.essence -= E.CHEST_PRICES.essence;
        }
        if (S.chests.length >= fx().chestSlots) { toast('La cámara está llena. Abre un cofre primero.', 'err'); return; }
        S.chests.push({ id: 'c' + uid(), at: Date.now() });
        S.purchasesToday.n++;
        log('buy', 'Compraste un cofre');
        save(); render();
        toast('Cofre comprado.', 'xp');
        return;
      }

      /* metas y tareas */
      case 'toggleGoal': {
        const id = d('data-goal');
        UI.expandedGoal = UI.expandedGoal === id ? null : id;
        render();
        return;
      }
      case 'openNewGoal': openNewGoal(); return;
      case 'editGoal': openNewGoal(d('data-goal')); return;
      case 'delGoal': {
        const id = d('data-goal');
        const g = S.goals.find((x) => x.id === id);
        if (!g) return;
        if (goalStats(g).done > 0) { g.archived = true; toast('Meta archivada (tenía progreso).', 'info'); }
        else { S.goals = S.goals.filter((x) => x.id !== id); toast('Meta eliminada.', 'info'); }
        save(); render(); return;
      }
      case 'restoreGoal': {
        const g = S.goals.find((x) => x.id === d('data-goal'));
        if (g) { g.archived = false; save(); render(); }
        return;
      }
      case 'goalArea': UI.goalDraft.area = d('data-area'); renderGoalModal(); return;
      case 'goalHorizon': UI.goalDraft.horizon = Number(d('data-d')); renderGoalModal(); return;
      case 'goalPriority': UI.goalDraft.priority = Number(d('data-p')); renderGoalModal(); return;
      case 'saveGoal': saveGoal(); return;
      case 'openNewTask': openNewTask(d('data-goal')); return;
      case 'saveTask': saveTask(); return;

      /* misiones y hábitos */
      case 'claimQuest': {
        const id = d('data-q');
        const q = ensureQuests().find((x) => x.id === id);
        if (!q || q.claimed) return;
        const def = questDef(id);
        const c = questCounters();
        if ((c[def.kind] || 0) < def.need) { toast('Todavía no está cumplida.', 'err'); return; }
        q.claimed = true;
        addCoins(def.coins);
        const gained = addXp(def.xp, { verified: false });
        S.questCount = (S.questCount || 0) + 1;
        log('quest', `Misión cumplida: ${def.title}`);
        save(); render();
        toast(`Misión reclamada: +${def.coins} monedas, +${gained} XP.`, 'xp');
        const fresh = checkAchievements();
        fresh.forEach((a) => toast(`Logro: ${a.name}`, 'ai'));
        return;
      }
      case 'toggleHabit': {
        const h = S.habits.find((x) => x.id === d('data-h'));
        if (!h) return;
        h.log = h.log || {};
        const key = today();
        const de = dayEntry();
        if (h.log[key]) {
          delete h.log[key];
          de.habits = Math.max(0, (de.habits || 1) - 1);
          toast('Hábito desmarcado.', 'info');
        } else {
          h.log[key] = 1;
          de.habits = (de.habits || 0) + 1;
          const gained = addXp(8, { verified: false });
          if (de.habits >= 3) de.high = Math.max(de.high || 0, 1);
          log('habit', `Hábito: ${h.title}`);
          toast(`Hábito registrado. +${gained} XP`, 'xp');
        }
        save(); render(); return;
      }

      /* artefactos */
      case 'openArtifact': openArtifact(d('data-art')); return;
      case 'useArtifact': useArtifact(d('data-art')); return;

      /* guardián */
      case 'probeAI': probeAI(); return;
      case 'askDiagnose': askDiagnose(); return;
      case 'openDiagnose': openDiagnose(); return;
      case 'askSuggest': askSuggest(); return;

      /* sistema */
      case 'openSettings': openSettings(); return;
      case 'openPlans': openPlans(); return;
      case 'toggleAI': S.ai.enabled = !S.ai.enabled; save(); openSettings(); return;
      case 'clearAiKey':
        A.AIClient.clearKey();
        UI.online = false; UI.health = null;
        S.ai.lastProvider = ''; S.ai.lastMode = 'local'; S.ai.health = null;
        save();
        toast('Clave borrada de este dispositivo.', 'info');
        openSettings();
        return;
      case 'toggleMotion': S.settings.motion = !S.settings.motion; save(); openSettings(); return;
      case 'exportData': exportData(); return;
      case 'importData': importData(); return;
      case 'resetAll': resetAll(); return;
      case 'confirmReset': {
        try { localStorage.removeItem(KEY); } catch (e) {}
        location.reload();
        return;
      }
      case 'replayIntro': closeModal(); showIntro(); return;
      case 'closeModal': closeModal(); return;
      case 'closeModalBg': {
        if (UI.opening) return;
        closeModal(); return;
      }
      default:
        /* La configuración de IA vive en assets/ai/setup.js. */
        if (A.AISetup && A.AISetup.handle(act, el)) return;
        return;
    }
  }

  doc.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const act = el.getAttribute('data-act');
    if (act === 'closeModalBg' && ev.target !== el) return;
    if (act === 'stop') return;
    ev.preventDefault();
    try { dispatch(act, el); }
    catch (e) {
      console.error(e);
      toast('Algo falló. Inténtalo otra vez.', 'err');
    }
  });

  // Evita que un re-render borre lo que la persona está escribiendo.
  doc.addEventListener('input', (ev) => {
    const t = ev.target;
    const id = t && t.id;
    if (!id) return;
    if (UI.onb && (id === 'onbName' || id === 'onbTitle' || id === 'onbWhy')) {
      UI.onb[id === 'onbName' ? 'name' : id === 'onbTitle' ? 'title' : 'why'] = t.value;
    }
    if (UI.goalDraft && (id === 'gTitle' || id === 'gWhy')) {
      UI.goalDraft[id === 'gTitle' ? 'title' : 'why'] = t.value;
    }
    if (UI.taskDraft && (id === 'tTitle')) UI.taskDraft.title = t.value;
    if (UI.verify && id === 'vMin') {
      UI.verify.declaredMin = clamp(Number(t.value) || 1, 1, 240);
      UI.verify.answer = $('#vAnswer') ? $('#vAnswer').value : UI.verify.answer;
    }
  });

  doc.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (UI.verify && UI.verify.step === 'checking') return;
      if (UI.verify) { UI.verify = null; closeModal(); render(); }
      else if (UI.opening) { UI.opening = null; closeModal(); render(); }
      else closeModal();
    }
  });


  /* ------------------------------ Exportación ------------------------------ */
  A.openSettings = openSettings;
  A.openPlans = openPlans;
  A.exportData = exportData;
  A.importData = importData;
  A.resetAll = resetAll;
  A.go = go;
  A.dispatch = dispatch;

})(window.Seraph = window.Seraph || {});
