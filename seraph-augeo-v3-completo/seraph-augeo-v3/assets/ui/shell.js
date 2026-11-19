/* ============================================================================
   ui/shell — Armazón: render, pestañas, modales y avisos
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const $ = A.$;
  const S = A.S;
  const UI = A.UI;
  const doc = A.doc;
  const esc = A.esc;
  const fmt = A.fmt;
  const sigilSVG = A.sigilSVG;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const hasArtifact = (...args) => A.hasArtifact(...args);
  const ico = (...args) => A.ico(...args);
  const level = (...args) => A.level(...args);
  const onboardingView = (...args) => A.onboardingView(...args);
  const openDiagnose = (...args) => A.openDiagnose(...args);
  const openPlans = (...args) => A.openPlans(...args);
  const openSettings = (...args) => A.openSettings(...args);
  const phase = (...args) => A.phase(...args);
  const stopVerifyTimer = (...args) => A.stopVerifyTimer(...args);
  const streakN = (...args) => A.streakN(...args);
  const viewAltar = (...args) => A.viewAltar(...args);
  const viewCofres = (...args) => A.viewCofres(...args);
  const viewGuardian = (...args) => A.viewGuardian(...args);
  const viewHoy = (...args) => A.viewHoy(...args);
  const viewMetas = (...args) => A.viewMetas(...args);


  /* ------------------------------- Render base ---------------------------- */
  const TABS = [
    { id: 'hoy', name: 'Hoy', icon: 'home' },
    { id: 'metas', name: 'Metas', icon: 'target' },
    { id: 'cofres', name: 'Cofres', icon: 'gift' },
    { id: 'guardian', name: 'Guardián', icon: 'eye' },
    { id: 'altar', name: 'Altar', icon: 'sparkles' },
  ];

  function greeting() {
    const h = new Date().getHours();
    return h < 6 ? 'Aún de madrugada' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  }

  function setPhaseAttr() {
    const ph = phase();
    if (doc.documentElement.dataset.phase !== String(ph.phase)) {
      doc.documentElement.dataset.phase = String(ph.phase);
    }
    doc.documentElement.style.setProperty('--aura', String((ph.index + ph.pct / 100) / 4 * (hasArtifact('diadema') ? 1.3 : 1)));
    return ph;
  }

  function topbar() {
    const ph = phase();
    const lv = level();
    const aiClass = UI.online === true ? 'chip-ai' : (UI.online === false ? 'chip-ai off' : 'chip-ai');
    return `<header class="topbar">
      <div class="brand">
        <div class="brand-mark">${sigilSVG(44, { phase: ph.phase })}</div>
        <div class="brand-text">
          <div class="brand-name">Seraph <em style="font-style:italic;color:var(--gold-2)">Augeo</em></div>
          <div class="brand-sub">Nivel <b>${lv.lvl}</b> · ${esc(lv.name)}</div>
        </div>
      </div>
      <button class="chip ${aiClass}" data-act="openGuardian" title="Estado del Guardián">
        ${ico('cpu', 12)}<span>${UI.online === true ? 'Guardián' : UI.online === false ? 'Local' : '···'}</span>
      </button>
      <button class="chip chip-streak" id="streakChip" data-act="goAltar" title="Racha de días">${ico('flame', 12)}<span>${streakN()}</span></button>
      <button class="chip chip-coins" id="coinChip" data-act="goCofres" title="Monedas">${ico('coin', 12)}<span>${fmt(S.coins)}</span></button>
      <button class="chip chip-xp" data-act="goAltar" title="XP verificado">${ico('zap', 12)}<span>${fmt(S.verifiedXp)}</span></button>
      <button class="icon-btn" data-act="openSettings" aria-label="Ajustes">${ico('gear', 17)}</button>
    </header>`;
  }

  function tabbar() {
    return TABS.map((t) => {
      const on = UI.tab === t.id;
      const dot = t.id === 'cofres' && S.chests.length ? '<i class="tab-dot"></i>' : '';
      return `<button class="tab ${on ? 'active' : ''}" data-act="tab" data-tab="${t.id}" aria-current="${on ? 'page' : 'false'}">
        ${ico(t.icon, 20)}<span>${t.name}</span>${dot}</button>`;
    }).join('');
  }

  function render() {
    setPhaseAttr();
    const app = $('#app');
    if (!app) return;
    if (!S.goals.length) {
      $('#tabs').innerHTML = '';
      app.className = 'onb';
      app.innerHTML = onboardingView();
      /* El abismo y el serafín sólo se quedan detrás del portal (paso 0). */
      if (A.abyss) A.abyss.show(!UI.onb || UI.onb.step === 0);
      if (A.Angel3D) A.Angel3D.show(!UI.onb || UI.onb.step === 0);
      bindModalHost();
      return;
    }
    if (A.abyss) A.abyss.show(false);
    if (A.Angel3D) A.Angel3D.show(false);
    app.className = 'shell';
    $('#tabs').innerHTML = tabbar();
    const view = UI.tab === 'hoy' ? viewHoy()
      : UI.tab === 'metas' ? viewMetas()
      : UI.tab === 'cofres' ? viewCofres()
      : UI.tab === 'guardian' ? viewGuardian()
      : viewAltar();
    app.innerHTML = topbar() + `<main class="page">${view}</main>` + appFoot();
    bindModalHost();
  }

  function appFoot() {
    return `<footer class="app-foot">
      <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap">
        <button class="foot-link" data-act="openPlans">Planes</button>
        <span class="dot" style="background:var(--line-3)"></span>
        <button class="foot-link" data-act="openSettings">Ajustes</button>
        <span class="dot" style="background:var(--line-3)"></span>
        <button class="foot-link" data-act="openDiagnose">Diagnóstico</button>
      </div>
      <p class="foot-note">La verificación es una estimación transparente, no un detector de mentiras.
        Tu progreso se queda en este dispositivo.</p>
    </footer>`;
  }

  function bindModalHost() {
    // placeholder para futuros listeners directos; la app usa delegación global
  }


  /* -------------------------------- Modales ------------------------------- */
  function clearToasts() {
    const t = $('#toasts');
    if (t) t.innerHTML = '';
  }

  function openModal(html, opt) {
    const o = opt || {};
    clearToasts();
    const host = $('#modals');
    host.innerHTML = `<div class="modal-wrap" data-act="closeModalBg">
      <div class="modal" role="dialog" aria-modal="true" ${o.label ? `aria-label="${esc(o.label)}"` : ''}>${html}</div>
    </div>`;
    doc.body.classList.add('modal-open');
    const first = host.querySelector('input, textarea, button.btn-primary');
    if (first && !o.noFocus) setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) {} }, 120);
  }
  function closeModal() {
    const host = $('#modals');
    if (host) host.innerHTML = '';
    doc.body.classList.remove('modal-open');
    stopVerifyTimer();
    UI.modal = null;
    if (UI.toastQueue && UI.toastQueue.length) {
      const pending = UI.toastQueue.splice(0, UI.toastQueue.length);
      pending.forEach((t, i) => setTimeout(() => toast(t[0], t[1]), 260 + i * 320));
    }
  }
  function modalHead(step, total, title, sub) {
    return `<div class="steps">${Array.from({ length: total }, (_, i) =>
      `<span class="step ${i + 1 === step ? 'on' : i + 1 < step ? 'done' : ''}"></span>`).join('')}</div>
      <h2 class="modal-title">${title}</h2><p class="modal-sub">${sub}</p>`;
  }

  function findTask(id) {
    for (const g of S.goals) {
      const t = g.tasks.find((x) => x.id === id);
      if (t) return { task: t, goal: g };
    }
    return null;
  }
  function taskById(id) {
    const r = findTask(id);
    return r ? Object.assign({}, r.task, { goal: r.goal.title, goalObj: r.goal }) : null;
  }


  /* -------------------------------- Toasts -------------------------------- */
  function toast(msg, kind) {
    // Con un modal abierto, los avisos esperan: no deben tapar el contenido.
    const modals = $('#modals');
    if (modals && modals.children.length) {
      UI.toastQueue.push([msg, kind]);
      if (UI.toastQueue.length > 6) UI.toastQueue.shift();
      return;
    }
    const host = $('#toasts');
    if (!host) return;
    while (host.children.length >= 2) host.removeChild(host.firstChild);
    const el = doc.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = `${ico(kind === 'err' ? 'info' : kind === 'xp' ? 'zap' : kind === 'ai' ? 'eye' : 'sparkles', 14)}<span>${esc(msg)}</span>`;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 240);
    }, 3600);
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.TABS = TABS;
  A.greeting = greeting;
  A.setPhaseAttr = setPhaseAttr;
  A.topbar = topbar;
  A.tabbar = tabbar;
  A.render = render;
  A.appFoot = appFoot;
  A.bindModalHost = bindModalHost;
  A.clearToasts = clearToasts;
  A.openModal = openModal;
  A.closeModal = closeModal;
  A.modalHead = modalHead;
  A.findTask = findTask;
  A.taskById = taskById;
  A.toast = toast;

})(window.Seraph = window.Seraph || {});
