/* ============================================================================
   views/cofres — Cofres: cámara, rarezas y apertura con botín
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
  const doc = A.doc;
  const esc = A.esc;
  const fmt = A.fmt;
  const today = A.today;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const addCoins = (...args) => A.addCoins(...args);
  const addXp = (...args) => A.addXp(...args);
  const checkAchievements = (...args) => A.checkAchievements(...args);
  const clearToasts = (...args) => A.clearToasts(...args);
  const dayEntry = (...args) => A.dayEntry(...args);
  const fx = (...args) => A.fx(...args);
  const ico = (...args) => A.ico(...args);
  const log = (...args) => A.log(...args);
  const save = (...args) => A.save(...args);
  const stat = (...args) => A.stat(...args);


  /* -------------------------------- Cofres -------------------------------- */
  function foundRarities() { if (!S.foundRarities) S.foundRarities = []; return S.foundRarities; }
  function chestsEarnedToday() {
    if (S.chestsToday.date !== today()) S.chestsToday = { date: today(), n: 0 };
    return S.chestsToday.n;
  }

  function chestSVG(color, tier) {
    const glow = tier >= 10 ? 'url(#cg)' : '';
    return `<svg class="chest-svg" viewBox="0 0 64 64" aria-hidden="true">
      <defs><radialGradient id="cg"><stop offset="0" stop-color="${color}" stop-opacity=".9"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>
      <circle cx="32" cy="34" r="26" fill="${glow}" opacity="${tier >= 10 ? .5 : .18}"/>
      <rect x="11" y="27" width="42" height="24" rx="4" fill="#171420" stroke="${color}" stroke-width="1.6"/>
      <path d="M11 29c0-7.2 5.8-13 21-13s21 5.8 21 13v3H11z" fill="#221d2e" stroke="${color}" stroke-width="1.6"/>
      <path d="M11 40h42" stroke="${color}" stroke-width="1" stroke-opacity=".45"/>
      <rect x="28" y="33" width="8" height="11" rx="1.6" fill="${color}" opacity=".9"/>
      <circle cx="32" cy="38" r="1.6" fill="#0b0910"/>
      <path d="M18 21v-3M46 21v-3M32 14v-3" stroke="${color}" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>
    </svg>`;
  }

  function viewCofres() {
    const f = fx();
    const capToday = f.dailyChests;
    const earned = chestsEarnedToday();
    const slots = f.chestSlots;
    const pityLeft = Math.max(0, E.PITY_LIMIT - S.pity);
    const owned = S.artifacts.length;

    return `<div class="head">
        <p class="eyebrow"><i class="diamond"></i> ${S.chestStats.total} cofres abiertos · ${owned}/20 artefactos</p>
        <h1 class="title">La <em>cámara</em> de cofres</h1>
        <p class="sub">Los cofres no se fabrican: se ganan verificando tareas o se compran con lo que ya tienes. Dentro hay 15 rarezas, y cada artefacto existe una sola vez.</p>
      </div>

      <section class="sec" style="margin-top:0">
        <div class="sec-head"><h3 class="sec-title">Pendientes</h3><span class="sec-note">${S.chests.length}/${slots} espacios</span></div>
        ${S.chests.length ? `<div class="chest-grid">
          ${S.chests.map((c, i) => `<button class="chest" data-act="openChest" data-i="${i}">
            ${chestSVG('var(--gold)', 6)}
            <div class="chest-name">Cofre ${i + 1}</div>
            <div class="chest-note">Toca para abrir</div>
            ${c.free ? '<span class="chest-badge">+1</span>' : ''}
          </button>`).join('')}
        </div>` : `<div class="card card-flat center" style="padding:24px">
          <p class="small muted" style="margin:0 0 4px">No hay cofres esperando.</p>
          <p class="tiny dim" style="margin:0">Verifica una tarea con una respuesta específica: la probabilidad de cofre sube con la puntuación.</p>
        </div>`}
      </section>

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Hoy</h3><span class="sec-note">${earned}/${capToday} ganados</span></div>
        <div class="card card-flat">
          <div class="row" style="justify-content:space-between">
            <div><div class="stat-label">Tope diario</div><div class="small" style="margin-top:4px">${earned >= capToday ? 'Alcanzado. Mañana el ojo vuelve a mirar.' : `Puedes ganar ${capToday - earned} más hoy.`}</div></div>
            <div class="mono" style="font-size:20px;color:var(--gold-2)">${earned}/${capToday}</div>
          </div>
          <div class="bar" style="margin-top:12px"><span style="width:${(earned / capToday) * 100}%"></span></div>
          <div class="divider"><i></i></div>
          <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
            <div><div class="stat-label">Piedad</div><div class="small" style="margin-top:4px">${pityLeft} aperturas sin Raro+ · al llegar a 0 se garantiza</div></div>
            <div class="mono" style="font-size:20px;color:var(--celeste)">${pityLeft}</div>
          </div>
          <div class="bar" style="margin-top:12px"><span style="width:${(S.pity / E.PITY_LIMIT) * 100}%;background:linear-gradient(90deg,#60a5fa,#a78bfa)"></span></div>
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Comprar cofre</h3><span class="sec-note">${S.purchasesToday.date === today() ? S.purchasesToday.n : 0}/2 hoy</span></div>
        <div class="chest-grid">
          <button class="chest" data-act="buyChest" data-mode="coins" ${S.coins < E.CHEST_PRICES.buy || (S.purchasesToday.date === today() && S.purchasesToday.n >= 2) ? 'disabled style="opacity:.45"' : ''}>
            ${chestSVG('var(--gold-2)', 8)}
            <div class="chest-name">${fmt(E.CHEST_PRICES.buy)} monedas</div>
            <div class="chest-note">Tienes ${fmt(S.coins)}</div>
          </button>
          <button class="chest" data-act="buyChest" data-mode="essence" ${S.essence < E.CHEST_PRICES.essence ? 'disabled style="opacity:.45"' : ''}>
            ${chestSVG('var(--violeta)', 9)}
            <div class="chest-name">${E.CHEST_PRICES.essence} esencia</div>
            <div class="chest-note">Tienes ${fmt(S.essence)}</div>
          </button>
        </div>
        <p class="tiny dim mt-8">Comprar no rompe el tope diario de cofres ganados, pero sí el de compras (2 al día).</p>
      </section>

      ${f.showChestOdds ? `<section class="sec">
        <div class="sec-head"><h3 class="sec-title">Probabilidades reales</h3><span class="sec-note">Candil del ojo</span></div>
        <div class="card card-flat">
          ${E.RARITIES.map((r) => {
            const total = E.RARITIES.reduce((a, x) => a + x.weight, 0);
            const pct = (r.weight / total) * 100;
            return `<div class="bar-row" style="margin-bottom:7px">
              <span class="label" style="color:${r.color}">${r.name}</span>
              <span class="track"><span class="fill" style="width:${Math.min(100, pct * 4.2)}%;background:${r.color}"></span></span>
              <span class="val">${pct < 0.1 ? pct.toFixed(2) : pct.toFixed(1)}%</span></div>`;
          }).join('')}
        </div>
      </section>` : `<div class="note note-gold mt-24">${ico('info', 12)} El <b>Candil del ojo</b> revela las probabilidades exactas de cada rareza. Es un artefacto: no se puede fabricar.</div>`}

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Las 15 rarezas</h3><span class="sec-note">${foundRarities().length}/15 descubiertas</span></div>
        <div class="art-grid">
          ${E.RARITIES.map((r) => {
            const found = foundRarities().indexOf(r.id) !== -1;
            return `<div class="art ${found ? 'owned' : ''}" style="${found ? `border-color:${r.color}55` : ''}">
              <div class="art-icon" style="color:${r.color}">${ico(r.tier >= 10 ? 'star' : r.tier >= 6 ? 'sparkles' : 'spark', r.tier >= 12 ? 22 : 18)}</div>
              <div class="art-name" style="${found ? `color:${r.color}` : 'color:var(--dim)'}">${found ? r.name : '— — —'}</div>
              <div class="art-rar" style="color:${found ? r.color : 'var(--dim)'}">Nivel ${r.tier}</div>
              ${found ? '' : '<div class="art-lock">Sin descubrir</div>'}
            </div>`;
          }).join('')}
        </div>
      </section>`;
  }


  /* ------------------------------ Abrir cofre ----------------------------- */
  function openChest(i) {
    const chest = S.chests[i];
    if (!chest) return;
    UI.opening = { index: i, stage: 'shake', result: null };
    renderChestModal();
    setTimeout(() => {
      if (!UI.opening) return;
      const result = rollChestReward();
      UI.opening.stage = 'reveal';
      UI.opening.result = result;
      S.chests.splice(i, 1);
      const de = dayEntry();
      de.chest = (de.chest || 0) + 1;
      const rar = E.RARITY_BY_ID[result.rarityId];
      S.chestStats.total++;
      S.chestStats.best = Math.max(S.chestStats.best || 1, rar.tier);
      const fr = foundRarities();
      if (fr.indexOf(rar.id) === -1) fr.push(rar.id);
      if (result.artifact) {
        S.artifacts.push(result.artifact.code);
        S.chestStats.artifacts = S.artifacts.length;
        log('artifact', `Hallaste «${result.artifact.name}» (${rar.name})`);
      }
      S.pity = rar.tier >= 4 ? 0 : S.pity + 1;
      save();
      renderChestModal();
      if (rar.tier >= 12) {
        // Se sacude la app, nunca el body: un transform en body rompería los modales fijos.
        const app = $('#app');
        const stage = $('.stage');
        [app, stage].forEach((el) => { if (el) el.classList.add('shake-screen'); });
        setTimeout(() => [app, stage].forEach((el) => { if (el) el.classList.remove('shake-screen'); }), 460);
      }
      if (rar.tier >= 10) sparkBurst(rar.color, 26);
      checkAchievements();
    }, 1250);
  }

  function rollChestReward() {
    const rng = E.mulberry32((Math.random() * 1e9) | 0);
    const rarity = E.rollRarity(rng, S.pity);
    const loot = E.rollLoot(rarity.id, rng);
    let artifact = null;
    if (loot.relic) {
      artifact = E.pickArtifact(rng, rarity.id, S.artifacts);
    }
    addCoins(loot.coins);
    if (loot.esencia) S.essence += loot.esencia;
    if (loot.xp) addXp(loot.xp, { verified: false });
    if (loot.boost) S.boostUntil = Math.max(Date.now(), S.boostUntil) + E.BOOST_MINUTES * 60000;
    if (loot.freeze) S.freezes += loot.freeze;
    log('chest', `Abriste un cofre ${rarity.name}`, { tier: rarity.tier });
    return { rarityId: rarity.id, loot, artifact };
  }

  function renderChestModal() {
    const o = UI.opening;
    if (!o) return;
    clearToasts();
    const rar = o.result ? E.RARITY_BY_ID[o.result.rarityId] : null;
    const color = rar ? rar.color : 'var(--gold)';
    const host = $('#modals');
    if (o.stage === 'shake') {
      host.innerHTML = `<div class="loot opening" style="color:${color}">
        <div class="loot-stage">
          <div class="loot-rays"></div>
          <div class="loot-chest">${chestSVG(color, 8)}</div>
          <p class="kicker mt-8" style="color:var(--gold)">Abriendo</p>
        </div></div>`;
      doc.body.classList.add('modal-open');
      return;
    }
    const r = o.result;
    host.innerHTML = `<div class="loot reveal" style="color:${color}">
      <div class="loot-stage">
        <div class="loot-rays"></div>
        <div class="loot-rings"><i></i><i></i><i></i></div>
        <div class="loot-chest" style="opacity:0;height:0"></div>
        <div class="loot-card">
          <div class="loot-emblem" style="color:${color};border-color:${color}55;background:${color}14">
            ${ico(rar.tier >= 12 ? 'star' : rar.tier >= 8 ? 'sparkles' : rar.tier >= 5 ? 'spark' : 'shield', 26)}
          </div>
          <div class="loot-rarity" style="color:${color}">${rar.name} · nivel ${rar.tier}</div>
          <div class="loot-name">${r.artifact ? esc(r.artifact.name) : 'Tesoro ' + rar.name}</div>
          <p class="loot-desc">${r.artifact ? esc(r.artifact.desc) : 'Monedas, esencia y tiempo. Nada se fabrica: todo se halla.'}</p>
          <div class="loot-items">
            <span class="loot-item">${ico('coin', 12)} +${fmt(r.loot.coins)}</span>
            ${r.loot.xp ? `<span class="loot-item">${ico('zap', 12)} +${r.loot.xp} XP</span>` : ''}
            ${r.loot.esencia ? `<span class="loot-item">${ico('sparkles', 12)} +${r.loot.esencia} esencia</span>` : ''}
            ${r.loot.boost ? `<span class="loot-item">${ico('flame', 12)} XP ×2 · 90 min</span>` : ''}
            ${r.loot.freeze ? `<span class="loot-item">${ico('shield', 12)} +${r.loot.freeze} congelación</span>` : ''}
          </div>
          ${r.artifact ? `<div class="loot-tier" style="color:${color}">ARTEFACTO ÚNICO · ${esc(E.RARITY_BY_ID[r.artifact.rarity].name)}</div>` : ''}
          <button class="btn btn-primary btn-block mt-16" data-act="closeChest">Guardar</button>
        </div>
      </div></div>`;
    doc.body.classList.add('modal-open');
  }

  function sparkBurst(color, n) {
    let host = $('#sparks');
    if (!host) {
      host = doc.createElement('div');
      host.id = 'sparks';
      host.className = 'sparks';
      doc.body.appendChild(host);
    }
    for (let i = 0; i < n; i++) {
      const s = doc.createElement('i');
      s.style.left = (10 + Math.random() * 80) + 'vw';
      s.style.top = '-4vh';
      s.style.background = color;
      s.style.animationDelay = (Math.random() * 500) + 'ms';
      s.style.animationDuration = (1400 + Math.random() * 1200) + 'ms';
      s.style.opacity = (.5 + Math.random() * .5).toFixed(2);
      host.appendChild(s);
      setTimeout(() => s.remove(), 3200);
    }
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.foundRarities = foundRarities;
  A.chestsEarnedToday = chestsEarnedToday;
  A.chestSVG = chestSVG;
  A.viewCofres = viewCofres;
  A.openChest = openChest;
  A.rollChestReward = rollChestReward;
  A.renderChestModal = renderChestModal;
  A.sparkBurst = sparkBurst;

})(window.Seraph = window.Seraph || {});
