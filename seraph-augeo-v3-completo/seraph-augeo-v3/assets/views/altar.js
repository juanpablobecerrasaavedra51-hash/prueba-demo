/* ============================================================================
   views/altar — Altar, artefactos, logros y constancia
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const $ = A.$;
  const AREAS = A.AREAS;
  const ART_ICON = A.ART_ICON;
  const E = A.E;
  const S = A.S;
  const UI = A.UI;
  const clamp = A.clamp;
  const esc = A.esc;
  const fmt = A.fmt;
  const sigilSVG = A.sigilSVG;
  const today = A.today;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const askDiagnose = (...args) => A.askDiagnose(...args);
  const askSuggest = (...args) => A.askSuggest(...args);
  const activeGoals = (...args) => A.activeGoals(...args);
  const addXp = (...args) => A.addXp(...args);
  const closeModal = (...args) => A.closeModal(...args);
  const exportData = (...args) => A.exportData(...args);
  const fx = (...args) => A.fx(...args);
  const goalStats = (...args) => A.goalStats(...args);
  const hasArtifact = (...args) => A.hasArtifact(...args);
  const ico = (...args) => A.ico(...args);
  const level = (...args) => A.level(...args);
  const nextBestTask = (...args) => A.nextBestTask(...args);
  const openModal = (...args) => A.openModal(...args);
  const openPlans = (...args) => A.openPlans(...args);
  const openSettings = (...args) => A.openSettings(...args);
  const openVerify = (...args) => A.openVerify(...args);
  const phase = (...args) => A.phase(...args);
  const render = (...args) => A.render(...args);
  const save = (...args) => A.save(...args);
  const stat = (...args) => A.stat(...args);
  const streakN = (...args) => A.streakN(...args);
  const toast = (...args) => A.toast(...args);
  const weekSummary = (...args) => A.weekSummary(...args);


  /* --------------------------------- Altar -------------------------------- */
  const ACHIEVEMENTS = [
    { id: 'first', name: 'Primera prueba', desc: 'Verifica una tarea', icon: 'shieldCheck', test: () => S.verdicts.verified + S.verdicts.probable >= 1 },
    { id: 'verified10', name: 'Diez pruebas', desc: '10 tareas verificadas', icon: 'shield', test: () => S.verdicts.verified >= 10 },
    { id: 'verified50', name: 'Cincuenta', desc: '50 verificadas', icon: 'trophy', test: () => S.verdicts.verified >= 50 },
    { id: 'streak7', name: 'Siete días', desc: 'Racha de 7 días', icon: 'flame', test: () => streakN() >= 7 },
    { id: 'streak30', name: 'Treinta días', desc: 'Racha de 30 días', icon: 'sun', test: () => streakN() >= 30 },
    { id: 'lvl5', name: 'Hoja', desc: 'Llega al nivel 5', icon: 'sparkles', test: () => level().lvl >= 5 },
    { id: 'lvl10', name: 'Fresno', desc: 'Llega al nivel 10', icon: 'crown', test: () => level().lvl >= 10 },
    { id: 'phase2', name: 'Despertar', desc: 'Entra en la fase 2', icon: 'feather', test: () => phase().phase >= 2 },
    { id: 'phase4', name: 'Serafín', desc: 'Entra en la fase 4', icon: 'eye', test: () => phase().phase >= 4 },
    { id: 'chest10', name: 'Diez cofres', desc: 'Abre 10 cofres', icon: 'gift', test: () => S.chestStats.total >= 10 },
    { id: 'artifact1', name: 'Primer artefacto', desc: 'Halla un artefacto', icon: 'key', test: () => S.artifacts.length >= 1 },
    { id: 'artifact5', name: 'Coleccionista', desc: 'Halla 5 artefactos', icon: 'book', test: () => S.artifacts.length >= 5 },
    { id: 'rare10', name: 'Toca el cielo', desc: 'Abre un cofre Seráfico o superior', icon: 'star', test: () => S.chestStats.best >= 10 },
    { id: 'trust80', name: 'Confianza alta', desc: 'Alcanza 80 de confianza', icon: 'scale', test: () => S.trust >= 80 },
    { id: 'goal100', name: 'Meta cerrada', desc: 'Completa el 100% de una meta', icon: 'flag', test: () => S.goals.some((g) => goalStats(g).total > 0 && goalStats(g).pct === 100) },
    { id: 'quests20', name: 'Veinte misiones', desc: 'Reclama 20 misiones', icon: 'target', test: () => (S.questCount || 0) >= 20 },
  ];

  function checkAchievements() {
    const fresh = [];
    ACHIEVEMENTS.forEach((a) => {
      if (S.achievements.indexOf(a.id) === -1) {
        let ok = false;
        try { ok = a.test(); } catch (e) { ok = false; }
        if (ok) { S.achievements.push(a.id); fresh.push(a); }
      }
    });
    return fresh;
  }

  function viewAltar() {
    const ph = phase();
    const lv = level();
    const a = fx();
    const week = weekSummary();
    const goals = activeGoals();
    const areaRows = AREAS.map((ar) => {
      const gs = goals.filter((g) => g.area === ar.id);
      if (!gs.length) return null;
      const pct = gs.reduce((x, g) => x + goalStats(g).pct, 0) / gs.length;
      return { name: ar.name, pct };
    }).filter(Boolean).sort((x, y) => y.pct - x.pct);

    return `<div class="head">
        <p class="eyebrow"><i class="diamond"></i> ${ph.name} · Fase ${ph.phase} de 4</p>
        <h1 class="title">El <em>altar</em></h1>
        <p class="sub">${esc(ph.epithet)}.</p>
      </div>

      <section class="hero" style="text-align:center;padding-top:30px">
        <div class="phase-stage"><div class="sigil-wrap" style="width:190px;height:190px">
          <div class="sigil-halo" style="width:190px;height:190px"></div>
          ${sigilSVG(190, { phase: ph.phase })}
        </div></div>
        <div class="phase-name">${esc(lv.name)}</div>
        <p class="phase-epithet">«${esc(ph.epithet)}»</p>
        <div class="bar" style="margin:0 0 7px"><span style="width:${lv.pct}%"></span></div>
        <div class="phase-labels"><span>${fmt(S.verifiedXp)} XP</span>
          <span>${lv.lvl < E.MAX_LEVEL ? `${fmt(lv.next - S.verifiedXp)} para nivel ${lv.lvl + 1}` : 'Nivel máximo'}</span></div>
        ${ph.next ? `<div class="divider"><i></i></div>
          <p class="tiny dim" style="margin:0">Faltan <b style="color:var(--gold-2)">${fmt(ph.remaining)} XP verificados</b> para la fase ${ph.next.phase}: ${ph.next.name}.</p>` : ''}
      </section>

      <div class="stats mt-24">
        ${stat('XP verificado', fmt(S.verifiedXp), 'gold', `${fmt(S.xp)} XP total`)}
        ${stat('Pruebas', fmt(S.verdicts.verified + S.verdicts.probable), 'celeste', `${S.verdicts.dudoso + S.verdicts.none} dudosas`)}
        ${stat('Cofres', fmt(S.chestStats.total), 'violeta', `Mejor: ${E.RARITIES[(S.chestStats.best || 1) - 1].name}`)}
        ${stat('Artefactos', S.artifacts.length + '/20', 'amber', `${20 - S.artifacts.length} por hallar`)}
      </div>

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Artefactos</h3><span class="sec-note">Únicos · no se fabrican</span></div>
        <div class="art-grid">
          ${E.ARTIFACTS.map((art) => {
            const owned = hasArtifact(art.code);
            const rar = E.RARITY_BY_ID[art.rarity];
            const usedToday = S.artifactUses[art.code] === today();
            const active = ['boost', 'diagnose', 'clearFlag', 'upgradeTier', 'suggest', 'reroll'].indexOf(art.effect) !== -1;
            return `<div class="art ${owned ? 'owned' : ''} ${owned && active && usedToday ? 'used' : ''}"
              ${owned ? `data-act="openArtifact" data-art="${art.code}"` : ''} style="${owned ? `border-color:${rar.color}44` : ''}">
              <div class="art-icon" style="color:${owned ? rar.color : 'var(--dim)'}">${ico(ART_ICON[art.icon] || 'spark', 19)}</div>
              <div class="art-name" style="${owned ? '' : 'color:var(--dim)'}">${owned ? esc(art.name) : '· · ·'}</div>
              <div class="art-rar" style="color:${owned ? rar.color : 'var(--dim)'}">${owned ? rar.name : 'Sin hallar'}</div>
              ${owned ? `<div class="art-eff">${esc(art.desc)}</div>${active ? `<div class="art-cta">${usedToday ? 'Usado hoy' : 'Usar'}</div>` : ''}` : `<div class="art-lock">${rar.name} o superior</div>`}
            </div>`;
          }).join('')}
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Logros</h3><span class="sec-note">${S.achievements.length}/${ACHIEVEMENTS.length}</span></div>
        <div class="ach-grid">
          ${ACHIEVEMENTS.map((ac) => `<div class="ach ${S.achievements.indexOf(ac.id) !== -1 ? 'on' : ''}">
            <div class="ach-icon" style="color:${S.achievements.indexOf(ac.id) !== -1 ? 'var(--gold-2)' : 'var(--dim)'}">${ico(ac.icon, 19)}</div>
            <div class="ach-name">${esc(ac.name)}</div>
            <div class="ach-desc">${esc(ac.desc)}</div>
          </div>`).join('')}
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Equilibrio por área</h3><span class="sec-note">${areaRows.length} áreas</span></div>
        <div class="card card-flat">
          ${areaRows.length ? `<div class="bars">
            ${areaRows.map((r) => `<div class="bar-row">
              <span class="label">${esc(r.name)}</span>
              <span class="track"><span class="fill" style="width:${r.pct}%;background:linear-gradient(90deg,var(--gold),var(--gold-3))"></span></span>
              <span class="val">${Math.round(r.pct)}%</span></div>`).join('')}
          </div>` : '<p class="small dim">Sin datos todavía.</p>'}
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Constancia</h3><span class="sec-note">${week.tasks} tareas esta semana</span></div>
        <div class="card card-flat">${heatmap()}</div>
      </section>

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Registro</h3><span class="sec-note">${S.log.length} eventos</span></div>
        <div class="card card-flat" style="max-height:230px;overflow:auto">
          ${S.log.slice(0, 14).map((l) => `<div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)">
            <span class="tiny" style="color:var(--muted)">${esc(l.txt)}</span>
            <span class="mini mono dim">${new Date(l.t).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>`).join('') || '<p class="small dim">Sin eventos.</p>'}
        </div>
      </section>

      <div class="row mt-24 wrap">
        <button class="btn btn-ghost" data-act="openSettings">${ico('gear', 14)} Ajustes</button>
        <button class="btn btn-ghost" data-act="openPlans">${ico('crown', 14)} Planes</button>
        <button class="btn btn-ghost" data-act="exportData">${ico('download', 14)} Exportar</button>
      </div>`;
  }

  function heatmap() {
    const weeks = 9;
    let cells = '';
    const start = E.addDays(new Date(), -(weeks * 7 - 1));
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = E.addDays(start, w * 7 + d);
        const key = E.ymd(date);
        const e = S.days[key];
        const xp = e ? e.xp || 0 : 0;
        const lv = xp <= 0 ? 0 : xp < 40 ? 1 : xp < 80 ? 2 : xp < 140 ? 3 : 4;
        const bg = ['rgba(255,255,255,.06)', 'rgba(201,169,97,.28)', 'rgba(201,169,97,.5)', 'rgba(232,207,149,.72)', 'rgba(255,242,205,.95)'][lv];
        cells += `<span class="heat-cell" style="background:${bg}" title="${key}: ${xp} XP"></span>`;
      }
    }
    return `<div class="heat">${cells}</div>
      <div class="legend"><span class="legend-item"><span class="legend-dot" style="background:rgba(255,255,255,.06)"></span> 0</span>
      <span class="legend-item"><span class="legend-dot" style="background:rgba(201,169,97,.5)"></span> &lt;80 XP</span>
      <span class="legend-item"><span class="legend-dot" style="background:rgba(255,242,205,.95)"></span> 140+ XP</span></div>`;
  }


  /* ------------------------------- Artefacto ------------------------------ */
  function openArtifact(code) {
    const art = E.artifactByCode(code);
    if (!art || !hasArtifact(code)) return;
    const rar = E.RARITY_BY_ID[art.rarity];
    const active = ['boost', 'diagnose', 'clearFlag', 'upgradeTier', 'suggest', 'reroll'].indexOf(art.effect) !== -1;
    const used = S.artifactUses[code] === today();
    const labels = {
      boost: 'Duplicar XP 90 min', diagnose: 'Invocar diagnóstico', clearFlag: 'Limpiar un registro dudoso',
      upgradeTier: 'Mejorar un «dudoso»', suggest: 'Pedir la siguiente tarea', reroll: 'Repetir una pregunta',
    };
    openModal(`
      <div class="row" style="gap:14px;margin-bottom:6px">
        <div style="width:52px;height:52px;border-radius:12px;display:grid;place-items:center;border:1px solid ${rar.color}55;background:${rar.color}14;color:${rar.color}">${ico(ART_ICON[art.icon] || 'spark', 24)}</div>
        <div><div class="mini" style="letter-spacing:.2em;text-transform:uppercase;color:${rar.color}">${rar.name} · único</div>
        <h2 class="modal-title" style="margin:2px 0 0">${esc(art.name)}</h2></div>
      </div>
      <p class="modal-sub">${esc(art.desc)}</p>
      ${active ? `<button class="btn btn-primary btn-block" data-act="useArtifact" data-art="${code}" ${used ? 'disabled' : ''}>
        ${used ? 'Ya lo usaste hoy' : labels[art.effect] || 'Usar'}</button>
        <p class="tiny dim center mt-8">Se puede usar una vez al día.</p>`
        : `<div class="note note-gold">${ico('info', 12)} Este artefacto actúa solo: está siempre activo mientras lo poseas.</div>`}
      <button class="btn btn-block mt-12" data-act="closeModal">Cerrar</button>
    `);
  }

  function useArtifact(code) {
    const art = E.artifactByCode(code);
    if (!art) return;
    const f = fx();
    if (art.effect === 'boost') {
      S.boostUntil = Date.now() + E.BOOST_MINUTES * 60000;
      toast('XP ×2 durante 90 minutos.', 'xp');
    } else if (art.effect === 'diagnose') {
      S.artifactUses[code] = today();
      save(); closeModal(); UI.tab = 'guardian'; render(); askDiagnose(true);
      return;
    } else if (art.effect === 'clearFlag') {
      if (!S.flags.length) { toast('No hay registros dudosos que limpiar.', 'err'); return; }
      const fl = S.flags.shift();
      S.trust = clamp(S.trust + 6, 0, f.trustGainCap + 100);
      toast(`Registro limpiado: «${fl.title}». Confianza +6.`, 'ai');
    } else if (art.effect === 'upgradeTier') {
      const cand = [];
      S.goals.forEach((g) => g.tasks.forEach((t) => { if (t.done && t.tier === 'dudoso') cand.push({ t, g }); }));
      if (!cand.length) { toast('No hay tareas dudosas que mejorar.', 'err'); return; }
      const c = cand[cand.length - 1];
      c.t.tier = 'probable';
      S.verdicts.dudoso = Math.max(0, S.verdicts.dudoso - 1);
      S.verdicts.probable++;
      const extra = addXp(E.xpForTask(c.t) * .25);
      toast(`«${c.t.title}» pasó a Probable. +${extra} XP.`, 'xp');
    } else if (art.effect === 'suggest') {
      S.artifactUses[code] = today();
      save(); closeModal(); askSuggest();
      return;
    } else if (art.effect === 'reroll') {
      const cand = [];
      S.goals.forEach((g) => g.tasks.forEach((t) => { if (t.done && (t.tier === 'dudoso' || t.tier === 'none')) cand.push({ t, g }); }));
      if (!cand.length) { toast('No hay tareas para repetir.', 'err'); return; }
      const c = cand[cand.length - 1];
      c.t.done = false; c.t.tier = ''; c.t.score = 0;
      S.artifactUses[code] = today();
      save(); closeModal(); render();
      setTimeout(() => openVerify(c.t.id), 280);
      return;
    }
    S.artifactUses[code] = today();
    save();
    closeModal();
    render();
  }

  /* ------------------------------- Elegir otra ---------------------------- */
  function openPickOther() {
    const rank = nextBestTask() || [];
    const n = fx().altCount;
    openModal(`
      <h2 class="modal-title">Elige otra tarea</h2>
      <p class="modal-sub">El motor ordena por urgencia, impacto y desbloqueo. Tú puedes saltarte el orden: es tu vida.</p>
      <div class="tasks">
        ${rank.slice(0, n).map((t) => `<button class="task" data-act="openVerify" data-task="${t.id}" style="text-align:left;width:100%">
          <div class="check" style="border-color:var(--line-2)">${ico('right', 12)}</div>
          <div class="task-body"><div class="task-title">${esc(t.title)}</div>
            <div class="task-sub"><span>${t.estMinutes} min</span><span class="dot" style="background:var(--dim)"></span><span>${esc(t.goal)}</span><span class="dot" style="background:var(--dim)"></span><span class="task-xp">${E.xpForTask(t)} XP</span></div>
          </div></button>`).join('')}
      </div>
      <button class="btn btn-block mt-16" data-act="closeModal">Cerrar</button>
    `);
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.ACHIEVEMENTS = ACHIEVEMENTS;
  A.checkAchievements = checkAchievements;
  A.viewAltar = viewAltar;
  A.heatmap = heatmap;
  A.openArtifact = openArtifact;
  A.useArtifact = useArtifact;
  A.openPickOther = openPickOther;

})(window.Seraph = window.Seraph || {});
