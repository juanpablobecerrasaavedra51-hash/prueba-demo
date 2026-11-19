/* ============================================================================
   SERAPH AUgeo v3 — Núcleo determinista
   Sin DOM, sin red. Se usa en navegador (window.SeraphEngine) y en Node.
   Incluye: fases, niveles, motor, verificación, 15 rarezas, artefactos,
   misiones diarias y proyección.
   ============================================================================ */

(function (root) {
  'use strict';

  /* ------------------------------- Utilidades ------------------------------ */
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
  const ymd = (d = new Date()) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
  const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000);

  /* --------------------------------- Niveles ------------------------------- */
  const LEVEL_NAMES = ['Ceniza', 'Yesca', 'Brote', 'Tallo', 'Hoja', 'Rama', 'Copa', 'Árbol',
    'Roble', 'Fresno', 'Cedro', 'Baobab', 'Ceiba', 'Alba', 'Serafín'];
  const MAX_LEVEL = LEVEL_NAMES.length;
  const xpToReach = (n) => (n <= 1 ? 0 : 100 * (n - 1) + 25 * (n - 1) * (n - 2));
  function levelFromXp(xp) { let n = 1; while (n < MAX_LEVEL && xp >= xpToReach(n + 1)) n++; return n; }
  function levelInfo(xp) {
    const lvl = levelFromXp(xp);
    const cur = xpToReach(lvl), next = lvl < MAX_LEVEL ? xpToReach(lvl + 1) : cur;
    const pct = lvl >= MAX_LEVEL ? 100 : clamp(((xp - cur) / (next - cur)) * 100, 0, 100);
    return { lvl, name: LEVEL_NAMES[lvl - 1], cur, next, pct, xp };
  }

  /* ---------------------------------- Fases -------------------------------- */
  const PHASES = [
    { phase: 1, name: 'Umbral',    epithet: 'El ojo aún duerme entre ceniza',     at: 0,    note: 'Paleta pálida, movimiento entrecortado, alas plegadas.' },
    { phase: 2, name: 'Despertar', epithet: 'Las alas reconocen la luz',          at: 300,  note: 'El violeta entra, el brillo nace, la ceniza se eleva.' },
    { phase: 3, name: 'Ascensión', epithet: 'Cuatro alas abiertas sobre el mundo', at: 900,  note: 'Aurora, motas de luz, transiciones fluidas.' },
    { phase: 4, name: 'Serafín',   epithet: 'Todo lo ve y todo lo sostiene',       at: 2000, note: 'El ojo arde, el aura respira, el serafín vive.' },
  ];
  function phaseFromXp(verifiedXp) {
    let idx = 0;
    for (let i = 0; i < PHASES.length; i++) if (verifiedXp >= PHASES[i].at) idx = i;
    const cur = PHASES[idx], next = PHASES[idx + 1] || null;
    const span = next ? next.at - cur.at : 1;
    const pct = next ? clamp(((verifiedXp - cur.at) / span) * 100, 0, 100) : 100;
    return { ...cur, index: idx, next, pct, remaining: next ? Math.max(0, next.at - verifiedXp) : 0 };
  }

  /* --------------------------- Economía de XP ----------------------------- */
  const DAILY_XP_CAP = 300;
  function xpForTask(t) {
    const impact = t.impact || 3, mins = t.estMinutes || 15;
    return Math.min(40, 10 + 2 * impact + 5 * Math.min(Math.round(mins / 15), 4));
  }

  /* -------------------------- Motor siguiente paso ------------------------ */
  const WEIGHTS = { urgencia: .35, impacto: .25, desbloqueo: .20, facilidad: .15, racha: .05 };
  const WEIGHT_SUM = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

  function scoreTask(task, goal, dependents, ctx) {
    const dueIn = task.dueDate ? ctx.daysUntil(task.dueDate) : null;
    const urgencia = dueIn === null ? .3 : clamp(1 / (1 + Math.max(0, dueIn)));
    const impacto = ((task.impact || 3) / 5) * ((goal && goal.priority ? goal.priority : 3) / 5);
    const desbloqueo = clamp((dependents || 0) / 3);
    const facilidad = clamp(1 - ((task.effort || 3) - 1) / 4);
    const racha = ctx.streakAtRisk && (task.impact || 3) >= 4 ? 1 : 0;
    const score = WEIGHTS.urgencia * urgencia + WEIGHTS.impacto * impacto +
      WEIGHTS.desbloqueo * desbloqueo + WEIGHTS.facilidad * facilidad + WEIGHTS.racha * racha;
    return { score, dueIn, f: { urgencia, impacto, desbloqueo, facilidad, racha } };
  }

  /* --------------------------------- Racha -------------------------------- */
  const dayCounts = (entry, strict = false) => !!entry && (entry.high >= 1 || (!strict && entry.tasks >= 2));
  function streak(days, fromDate = new Date(), opts = {}) {
    const strict = !!opts.strict;
    let n = 0, cursor = new Date(fromDate);
    if (!dayCounts(days[ymd(cursor)], strict)) cursor = addDays(cursor, -1);
    for (let g = 0; g < 3000; g++) {
      if (!dayCounts(days[ymd(cursor)], strict)) break;
      n++; cursor = addDays(cursor, -1);
    }
    return n;
  }

  /* ------------------------------ Proyección ------------------------------ */
  function projection(pct, elapsedDays, targetDate, today) {
    const pace = pct / Math.max(1, elapsedDays);
    if (pace <= 0) return { eta: null, late: false, lateDays: 0, pace };
    const need = Math.ceil((100 - pct) / pace);
    const eta = ymd(addDays(parseDay(today), need));
    const lateDays = targetDate ? daysBetween(targetDate, eta) : 0;
    return { eta, late: lateDays > 0, lateDays: Math.max(0, lateDays), pace };
  }

  /* =============================== VERIFICACIÓN ===========================
     Misma matemática que v2: el servidor puede añadir la señal de la IA,
     pero esta base garantiza que la app funciona sin red.
  ------------------------------------------------------------------------ */
  const EVIDENCE = [
    { id: 0, label: 'Nada, lo hice de memoria', points: 0 },
    { id: 1, label: 'Una nota, archivo o captura', points: 30 },
    { id: 2, label: 'Un resultado visible o un testigo', points: 45 },
  ];
  const TIERS = {
    verified: { id: 'verified', label: 'Verificado',   mult: 1.00 },
    probable: { id: 'probable', label: 'Probable',     mult: 0.75 },
    dudoso:   { id: 'dudoso',   label: 'Dudoso',       mult: 0.50 },
    none:     { id: 'none',     label: 'Sin verificar', mult: 0.25 },
  };

  const tokenize = (text) => String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/).filter((w) => w.length > 2);

  function similarity(a, b) {
    const A = new Set(tokenize(a)), B = new Set(tokenize(b));
    if (!A.size || !B.size) return 0;
    let inter = 0;
    A.forEach((w) => { if (B.has(w)) inter++; });
    return inter / Math.min(A.size, B.size);
  }

  function verifyScore(ans, ctx = {}) {
    const evidencia = (EVIDENCE[ans.evidence] || EVIDENCE[0]).points;
    const text = String(ans.text || '').trim();
    const uniq = new Set(tokenize(text)).size;
    const base = clamp((text.length - 15) / 85) * 20;
    const specificity = (/\d/.test(text) ? 3 : 0) + (uniq >= 8 ? 2 : 0);
    const repeated = (ctx.prevTexts || []).some((t) => similarity(t, text) > 0.75);
    const texto = round(base + specificity + (repeated ? -15 : 0), 2);

    const est = Math.max(1, ctx.estMinutes || 15);
    const ratio = (ctx.elapsedSec || 0) / (est * 60);
    const timeLenient = !!ctx.timeLenient;
    const tiempo = ratio >= (timeLenient ? .5 : .8) ? 15 : ratio >= (timeLenient ? .2 : .4) ? 12 : ratio >= .15 ? 7 : 0;

    let castigos = 0;
    if (ratio < (timeLenient ? .02 : .05)) castigos -= 10;
    if (ans.timeFit === 'more' && ratio < .2) castigos -= 12;
    if (ans.timeFit === 'less' && ratio > 1.6) castigos -= 4;
    if (ans.attention === false) castigos -= 8;

    const historial = (clamp(ctx.trustPrev ?? 60, 0, 100) / 100) * 15;
    const raw = evidencia + texto + tiempo + historial + castigos;
    let score = Math.round(clamp(raw, 0, 100));

    // señal de la IA (0-100). Pesa el 45% cuando existe.
    let ai = null;
    if (typeof ans.aiScore === 'number' && isFinite(ans.aiScore)) {
      ai = Math.round(clamp(ans.aiScore, 0, 100));
      score = Math.round(clamp(score * 0.55 + ai * 0.45, 0, 100));
    }

    const tier = score >= 80 ? TIERS.verified : score >= 55 ? TIERS.probable : score >= 30 ? TIERS.dudoso : TIERS.none;
    const chestChance = score >= 55 ? round(clamp(0.22 + ((score - 55) / 45) * 0.58, 0, 0.85), 3) : 0;
    return {
      score, tier, mult: tier.mult, chestChance, ai,
      breakdown: {
        evidencia, texto: round(texto, 1), tiempo, historial: round(historial, 1),
        castigos, repetido: repeated, ratio: round(ratio, 2), ai,
      },
    };
  }

  function nextTrust(prev, score, flagged, opts = {}) {
    const target = flagged ? Math.min(35, score * 0.6) : score;
    const weight = flagged ? 0.45 : 0.18;
    const gainCap = opts.gainCap ?? 12;      // techo de subida por verificación
    const delta = (target - prev) * weight;
    const capped = delta > 0 ? Math.min(delta, gainCap) : delta;
    return Math.round(clamp(prev + capped, 0, 100));
  }

  /* ============================ 15 RAREZAS ================================ */
  const RARITIES = [
    { id: 'ceniza',     name: 'Ceniza',      weight: 30,    color: '#7c7a74', glow: .05, tier: 1 },
    { id: 'comun',      name: 'Común',       weight: 22,    color: '#9aa3b2', glow: .12, tier: 2 },
    { id: 'pulido',     name: 'Pulido',      weight: 15,    color: '#b7c0cd', glow: .20, tier: 3 },
    { id: 'raro',       name: 'Raro',        weight: 11,    color: '#60a5fa', glow: .32, tier: 4 },
    { id: 'preciado',   name: 'Preciado',    weight: 8,     color: '#38bdf8', glow: .42, tier: 5 },
    { id: 'epico',      name: 'Épico',       weight: 5.5,   color: '#a78bfa', glow: .52, tier: 6 },
    { id: 'iluminado',  name: 'Iluminado',   weight: 3.5,   color: '#c4b5fd', glow: .60, tier: 7 },
    { id: 'ancestral',  name: 'Ancestral',   weight: 2,     color: '#34d399', glow: .66, tier: 8 },
    { id: 'celestial',  name: 'Celestial',   weight: 1.2,   color: '#2dd4bf', glow: .72, tier: 9 },
    { id: 'serafico',   name: 'Seráfico',    weight: .7,    color: '#f5c451', glow: .78, tier: 10 },
    { id: 'etereo',     name: 'Etéreo',      weight: .4,    color: '#ffe08a', glow: .84, tier: 11 },
    { id: 'astral',     name: 'Astral',      weight: .25,   color: '#ff9ee8', glow: .88, tier: 12 },
    { id: 'primigenio', name: 'Primigenio',  weight: .15,   color: '#ff7ba8', glow: .92, tier: 13 },
    { id: 'divino',     name: 'Divino',      weight: .1,    color: '#fff6d8', glow: .96, tier: 14 },
    { id: 'inefable',   name: 'Inefable',    weight: .2,    color: '#ffffff', glow: 1,   tier: 15 },
  ];
  const RARITY_BY_ID = Object.fromEntries(RARITIES.map((r) => [r.id, r]));
  const rarityIndex = (id) => RARITIES.findIndex((r) => r.id === id);

  const CHEST_DAILY_CAP = 3;
  const PITY_LIMIT = 12;          // 12 sin raro+ → garantía
  const CHEST_PRICES = { buy: 240, essence: 6 };
  const BOOST_MINUTES = 90;

  // Botín por nivel de rareza (monótono: a más rareza, más botín).
  const LOOT = {};
  RARITIES.forEach((r, i) => {
    const k = i + 1;                       // 1..15
    LOOT[r.id] = {
      coins: [8 + k * 12, 18 + k * 26],
      xp: [4 + k * 8, 12 + k * 18],
      esencia: [k >= 4 ? 1 : 0, Math.max(1, Math.floor(k / 3))],
      boost: clamp(0.03 + k * 0.045, 0, .9),
      freeze: clamp(k >= 6 ? 0.08 + (k - 6) * 0.07 : 0, 0, 1),
      relic: clamp(k >= 5 ? 0.04 + (k - 5) * 0.075 : 0, 0, 1),
    };
  });

  /* --------------------------- Artefactos únicos -------------------------- */
  /* No se crean: sólo se hallan. Cada uno existe una vez. Todos sirven. */
  const ARTIFACTS = [
    { code: 'sello',     name: 'Sello de tiempo',     rarity: 'raro',       icon: 'shield', effect: 'freeze+1',        desc: '+1 congelación de racha.' },
    { code: 'caliz',     name: 'Cáliz de enfoque',    rarity: 'epico',      icon: 'flame',  effect: 'boost',           desc: 'Duplica tu XP durante 90 minutos.' },
    { code: 'ojo_doble', name: 'Ojo doble',           rarity: 'preciado',   icon: 'eye',    effect: 'alt5',            desc: 'Ves 5 alternativas en lugar de 3.' },
    { code: 'pluma',     name: 'Pluma de diagnóstico',rarity: 'iluminado',  icon: 'feather',effect: 'diagnose',        desc: 'Invoca un diagnóstico del Guardián.' },
    { code: 'amuleto',   name: 'Amuleto del olvido',  rarity: 'raro',       icon: 'spark',  effect: 'clearFlag',       desc: 'Limpia un registro dudoso y sube la confianza.' },
    { code: 'llave',     name: 'Llave del umbral',    rarity: 'ancestral',  icon: 'lock',   effect: 'chest+1/day',     desc: '+1 cofre diario.' },
    { code: 'corona',    name: 'Corona de constancia',rarity: 'serafico',   icon: 'trophy', effect: 'chestSlot+1',     desc: '+1 espacio de cofres pendientes.' },
    { code: 'espejo',    name: 'Espejo de verdad',    rarity: 'celestial',  icon: 'eye',    effect: 'trustGain+10',    desc: '+10 al techo de confianza por verificación.' },
    { code: 'velo',      name: 'Velo del peregrino',  rarity: 'comun',      icon: 'moon',   effect: 'xpCapSoften',     desc: 'El tope diario castiga la mitad.' },
    { code: 'brasero',   name: 'Brasero del alba',    rarity: 'pulido',     icon: 'flame',  effect: 'quest+1',         desc: '+1 misión diaria.' },
    { code: 'cetro',     name: 'Cetro del Guardián',  rarity: 'etereo',     icon: 'target', effect: 'suggest',         desc: 'El Guardián sugiere tu siguiente tarea.' },
    { code: 'tunica',    name: 'Túnica de seda',      rarity: 'preciado',   icon: 'feather',effect: 'upgradeTier',     desc: '1 vez al día: un «dudoso» pasa a «probable».' },
    { code: 'reloj',     name: 'Reloj de arena',      rarity: 'ancestral',  icon: 'clock',  effect: 'timeLenient',     desc: 'El tiempo apremia menos: ventana más generosa.' },
    { code: 'candil',    name: 'Candil del ojo',      rarity: 'iluminado',  icon: 'sparkles',effect: 'chestOdds',      desc: 'Ves la probabilidad exacta del próximo cofre.' },
    { code: 'anillo',    name: 'Anillo de ecos',      rarity: 'epico',      icon: 'target', effect: 'reroll',          desc: 'Repite una pregunta de verificación que fallaste.' },
    { code: 'estandarte',name: 'Estandarte de racha', rarity: 'celestial',  icon: 'flag',   effect: 'streakLenient',   desc: 'La racha cuenta con una sola tarea.' },
    { code: 'orbe',      name: 'Orbe del Ojo',        rarity: 'astral',     icon: 'eye',    effect: 'chestProb+0.06',  desc: '+6% de probabilidad de cofre.' },
    { code: 'grimorio',  name: 'Grimorio',            rarity: 'primigenio', icon: 'feather',effect: 'memory',          desc: 'El Guardián recuerda 2 respuestas más.' },
    { code: 'diadema',   name: 'Diadema de aurora',   rarity: 'divino',     icon: 'star',   effect: 'aura',            desc: 'El serafín gana un aura permanente.' },
    { code: 'ojo_inefable', name: 'Ojo Inefable',     rarity: 'inefable',   icon: 'eye',    effect: 'all',             desc: 'Contiene el efecto de todos los artefactos.' },
  ];
  const artifactByCode = (c) => ARTIFACTS.find((a) => a.code === c);
  const effectIndex = (owned) => {
    const set = new Set(owned || []);
    const has = (eff) => set.has('ojo_inefable') || [...set].some((c) => (artifactByCode(c) || {}).effect === eff);
    return {
      has,
      freezeBonus: has('freeze+1') ? 1 : 0,
      dailyChests: CHEST_DAILY_CAP + (has('chest+1/day') ? 1 : 0),
      chestSlots: 5 + (has('chestSlot+1') ? 1 : 0),
      trustGainCap: 12 + (has('trustGain+10') ? 10 : 0),
      xpCapSoften: has('xpCapSoften'),
      extraQuests: has('quest+1') ? 1 : 0,
      timeLenient: has('timeLenient'),
      chestProbBonus: has('chestProb+0.06') ? 0.06 : 0,
      streakLenient: has('streakLenient'),
      altCount: has('alt5') ? 5 : 3,
      showChestOdds: has('chestOdds'),
      hasBoost: has('boost'),
      canDiagnose: has('diagnose'),
      canSuggest: has('suggest'),
      canUpgrade: has('upgradeTier'),
      canReroll: has('reroll'),
      memory: 12 + (has('memory') ? 2 : 0),
    };
  };

  /* ----------------------------- Cofres (roll) ---------------------------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rollRarity(rng, pity = 0, minTier = 0) {
    const guarded = pity >= PITY_LIMIT - 1;
    const pool = RARITIES.filter((r) => r.tier >= minTier && (!guarded || r.tier >= 4));
    const total = pool.reduce((a, r) => a + r.weight, 0);
    let x = rng() * total;
    for (const r of pool) { x -= r.weight; if (x <= 0) return r; }
    return pool[pool.length - 1];
  }

  const inRange = (rng, [a, b]) => Math.round(a + rng() * (b - a));

  function rollLoot(rarityId, rng) {
    const t = LOOT[rarityId] || LOOT.comun;
    return {
      coins: inRange(rng, t.coins),
      xp: inRange(rng, t.xp),
      esencia: inRange(rng, t.esencia),
      boost: rng() < t.boost ? 1 : 0,
      freeze: rng() < t.freeze ? 1 : 0,
      relic: rng() < t.relic,
    };
  }

  /** Decide si el cofre suelta un artefacto único no poseído. */
  function pickArtifact(rng, rarityId, owned) {
    const rar = RARITY_BY_ID[rarityId];
    const have = new Set(owned || []);
    const pool = ARTIFACTS.filter((a) => !have.has(a.code) && rarityIndex(a.rarity) + 1 <= rar.tier + 1);
    if (!pool.length) return null;
    // sesgo hacia lo raro: cuanto más alta su rareza, menos probable
    const weights = pool.map((a) => 1 / (rarityIndex(a.rarity) + 2));
    const total = weights.reduce((x, y) => x + y, 0);
    let x = rng() * total;
    for (let i = 0; i < pool.length; i++) { x -= weights[i]; if (x <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  /* --------------------------- Misiones diarias --------------------------- */
  /* Deterministas por fecha: todos los días hay 3 (+1 con artefacto). */
  const QUEST_POOL = [
    { id: 'verify2',   title: 'Verifica 2 tareas',            need: 2, kind: 'verified', coins: 30, xp: 20 },
    { id: 'impact1',   title: 'Completa una tarea de alto impacto', need: 1, kind: 'high', coins: 40, xp: 25 },
    { id: 'habit1',    title: 'Registra un hábito',            need: 1, kind: 'habit', coins: 20, xp: 10 },
    { id: 'longtext',  title: 'Escribe una respuesta de 120 caracteres', need: 1, kind: 'long', coins: 35, xp: 20 },
    { id: 'evidence2', title: 'Aporta evidencia visible en una tarea', need: 1, kind: 'evidence', coins: 35, xp: 20 },
    { id: 'verify4',   title: 'Verifica 4 tareas',             need: 4, kind: 'verified', coins: 60, xp: 40 },
    { id: 'nocommon',  title: 'Abre un cofre',                  need: 1, kind: 'chest', coins: 25, xp: 15 },
    { id: 'honest',    title: 'Mantén la confianza ≥ 70',       need: 1, kind: 'trust', coins: 45, xp: 30 },
  ];

  function questsFor(dateStr, count = 3) {
    let seed = 0;
    for (let i = 0; i < dateStr.length; i++) seed = (seed * 31 + dateStr.charCodeAt(i)) >>> 0;
    const rng = mulberry32(seed);
    const pool = [...QUEST_POOL];
    const out = [];
    while (out.length < Math.min(count, pool.length)) {
      const i = Math.floor(rng() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  /* -------------------------------- Export -------------------------------- */
  const Engine = {
    clamp, round, ymd, parseDay, addDays, daysBetween,
    LEVEL_NAMES, MAX_LEVEL, xpToReach, levelFromXp, levelInfo,
    PHASES, phaseFromXp,
    xpForTask, DAILY_XP_CAP,
    WEIGHTS, WEIGHT_SUM, scoreTask,
    dayCounts, streak, projection,
    EVIDENCE, TIERS, verifyScore, nextTrust, similarity, tokenize,
    RARITIES, RARITY_BY_ID, rarityIndex, LOOT, CHEST_DAILY_CAP, PITY_LIMIT, CHEST_PRICES, BOOST_MINUTES,
    ARTIFACTS, artifactByCode, effectIndex,
    mulberry32, rollRarity, rollLoot, pickArtifact,
    QUEST_POOL, questsFor,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.SeraphEngine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
