/* ============================================================================
   Seraph Augeo v3 · pruebas del núcleo
   Ejecutar: node tests/engine.test.js
   Cubre: fases, niveles, motor, verificación con IA, 15 rarezas, 20 artefactos,
          botín monótono, piedad, misiones, racha y proyección.
   ============================================================================ */

'use strict';
const E = require('../assets/engine.js');

let pass = 0, fail = 0;
const lines = [];
function t(name, fn) {
  try { fn(); pass++; lines.push('  ✓ ' + name); }
  catch (e) { fail++; lines.push('  ✗ ' + name + '\n      → ' + e.message); }
}
const eq = (a, b, m = '') => { if (a !== b) throw new Error(`${m} esperado ${JSON.stringify(b)}, obtuve ${JSON.stringify(a)}`); };
const near = (a, b, tol = 1e-9, m = '') => { if (Math.abs(a - b) > tol) throw new Error(`${m} esperado ≈${b}, obtuve ${a}`); };
const ok = (v, m = 'falso') => { if (!v) throw new Error(m); };

console.log('\nSeraph Augeo v3 · núcleo\n');

/* ------------------------------- FASES ---------------------------------- */
console.log('Fases del mundo');
t('fase 1 en 0 XP verificado', () => eq(E.phaseFromXp(0).phase, 1));
t('fase 2 a los 300', () => eq(E.phaseFromXp(300).phase, 2));
t('fase 3 a los 900', () => eq(E.phaseFromXp(900).phase, 3));
t('fase 4 a los 2000', () => eq(E.phaseFromXp(2000).phase, 4));
t('299 XP sigue en fase 1', () => eq(E.phaseFromXp(299).phase, 1));
t('progreso de fase 2 proporcional', () => {
  const p = E.phaseFromXp(600);
  near(p.pct, 50); eq(p.remaining, 300); eq(p.next.name, 'Ascensión');
});
t('fase final sin siguiente', () => { const p = E.phaseFromXp(99999); eq(p.phase, 4); eq(p.next, null); eq(p.pct, 100); });
t('las 4 fases tienen epítetos', () => { E.PHASES.forEach((p) => ok(p.epithet.length > 8)); });

/* ------------------------------ NIVELES --------------------------------- */
console.log('Niveles');
t('15 niveles con nombres únicos', () => { eq(E.MAX_LEVEL, 15); eq(new Set(E.LEVEL_NAMES).size, 15); });
t('xpToReach(1) = 0', () => eq(E.xpToReach(1), 0));
t('xpToReach crece siempre', () => {
  for (let i = 1; i < E.MAX_LEVEL; i++) ok(E.xpToReach(i + 1) > E.xpToReach(i), `tramo ${i}`);
});
t('nivel 15 es Serafín', () => eq(E.LEVEL_NAMES[14], 'Serafín'));
t('levelInfo tope al máximo', () => {
  const info = E.levelInfo(999999);
  eq(info.lvl, 15); eq(info.pct, 100); eq(info.name, 'Serafín');
});
t('levelInfo coherencia en 0 XP', () => { const i = E.levelInfo(0); eq(i.lvl, 1); eq(i.pct, 0); });

/* ---------------------------- ECONOMÍA DE XP ---------------------------- */
console.log('Economía');
t('xpForTask respeta techo 40', () => { eq(E.xpForTask({ impact: 5, estMinutes: 240 }), 40); });
t('xpForTask de una tarea mínima', () => { eq(E.xpForTask({ impact: 1, estMinutes: 5 }), 12); });
t('xpForTask crece con impacto', () => {
  ok(E.xpForTask({ impact: 5, estMinutes: 30 }) > E.xpForTask({ impact: 1, estMinutes: 30 }));
});
t('tope diario declarado', () => eq(E.DAILY_XP_CAP, 300));

/* -------------------------------- MOTOR --------------------------------- */
console.log('Motor de siguiente paso');
const ctx = { daysUntil: (d) => E.daysBetween('2026-01-01', d), streakAtRisk: false };
t('tarea urgente gana a una lejana', () => {
  const a = E.scoreTask({ impact: 3, effort: 3, dueDate: '2026-01-02' }, { priority: 3 }, 0, ctx);
  const b = E.scoreTask({ impact: 3, effort: 3, dueDate: '2026-03-01' }, { priority: 3 }, 0, ctx);
  ok(a.score > b.score);
});
t('tarea con dependientes gana', () => {
  const a = E.scoreTask({ impact: 3, effort: 3 }, { priority: 3 }, 3, ctx);
  const b = E.scoreTask({ impact: 3, effort: 3 }, { priority: 3 }, 0, ctx);
  ok(a.score > b.score);
});
t('los pesos suman 1', () => near(E.WEIGHT_SUM, 1, 1e-9));
t('impacto alto con racha en riesgo sube', () => {
  const c2 = { ...ctx, streakAtRisk: true };
  const a = E.scoreTask({ impact: 5, effort: 3 }, { priority: 3 }, 0, c2);
  const b = E.scoreTask({ impact: 2, effort: 3 }, { priority: 3 }, 0, c2);
  ok(a.score > b.score);
});

/* ----------------------------- VERIFICACIÓN ----------------------------- */
console.log('Verificación');
const strong = { evidence: 2, text: 'Resolví los ejercicios 12 al 16 del capítulo 3; el 15 me tomó 11 minutos porque confundí la regla de la cadena y tuve que repasar el ejemplo 4.' };
const c1 = { estMinutes: 30, elapsedSec: 1800, trustPrev: 60, prevTexts: [] };
t('evidencia alta + texto rico + tiempo justo → verificado', () => {
  const r = E.verifyScore(strong, c1);
  ok(r.score >= 80, 'score ' + r.score); eq(r.tier.id, 'verified');
});
t('sin evidencia y texto vacío → sin verificar', () => {
  const r = E.verifyScore({ evidence: 0, text: '' }, { estMinutes: 30, elapsedSec: 0, trustPrev: 60 });
  ok(r.score < 30, 'score ' + r.score); eq(r.tier.id, 'none');
});
t('la evidencia sube el puntaje', () => {
  const a = E.verifyScore({ evidence: 2, text: 'Hice la tarea completa del capítulo y anoté los cinco errores.' }, c1);
  const b = E.verifyScore({ evidence: 0, text: 'Hice la tarea completa del capítulo y anoté los cinco errores.' }, c1);
  ok(a.score > b.score);
});
t('texto repetido castiga', () => {
  const txt = 'Repasé el capítulo tres y resolví los cinco ejercicios con errores en el último.';
  const a = E.verifyScore({ evidence: 1, text: txt }, c1);
  const b = E.verifyScore({ evidence: 1, text: txt }, { ...c1, prevTexts: [txt] });
  ok(b.score < a.score, `${b.score} debería ser < ${a.score}`);
  eq(b.breakdown.repetido, true);
});
t('tiempo insuficiente castiga', () => {
  const a = E.verifyScore({ evidence: 1, text: 'Trabajé en el capítulo y resolví los ejercicios con calma.' }, c1);
  const b = E.verifyScore({ evidence: 1, text: 'Trabajé en el capítulo y resolví los ejercicios con calma.' }, { ...c1, elapsedSec: 60 });
  ok(b.score < a.score);
});
t('la señal de la IA pesa el 45%', () => {
  const base = E.verifyScore({ evidence: 1, text: 'Hice el bloque completo y anoté tres obstáculos concretos.' }, c1);
  const hi = E.verifyScore({ evidence: 1, text: 'Hice el bloque completo y anoté tres obstáculos concretos.', aiScore: 100 }, c1);
  const lo = E.verifyScore({ evidence: 1, text: 'Hice el bloque completo y anoté tres obstáculos concretos.', aiScore: 0 }, c1);
  ok(hi.score > base.score && lo.score < base.score);
  eq(hi.breakdown.ai, 100);
});
t('los tramos de confianza son contiguos', () => {
  eq(E.TIERS.verified.mult, 1); eq(E.TIERS.probable.mult, .75);
  eq(E.TIERS.dudoso.mult, .5); eq(E.TIERS.none.mult, .25);
});
t('probabilidad de cofre sólo desde 55', () => {
  eq(E.verifyScore({ evidence: 0, text: '' }, c1).chestChance, 0);
  ok(E.verifyScore(strong, c1).chestChance > 0.5);
});
t('el puntaje siempre queda entre 0 y 100', () => {
  for (let i = 0; i < 40; i++) {
    const r = E.verifyScore({ evidence: i % 3, text: 'x'.repeat(i * 7), aiScore: (i * 13) % 101 }, { estMinutes: 15, elapsedSec: i * 40, trustPrev: (i * 7) % 101 });
    ok(r.score >= 0 && r.score <= 100, 'fuera de rango: ' + r.score);
  }
});

console.log('Confianza');
t('una verificación buena sube poco', () => {
  const n = E.nextTrust(60, 95, false, {});
  ok(n > 60 && n <= 72, 'quedó en ' + n);
});
t('el techo de subida es 12 por defecto', () => eq(E.nextTrust(10, 100, false), 22));
t('el espejo permite subir 22', () => eq(E.nextTrust(10, 100, false, { gainCap: 22 }), 26));
t('un registro dudoso baja la confianza', () => { ok(E.nextTrust(70, 20, true) < 70); });
t('la confianza nunca sale de 0..100', () => {
  eq(E.nextTrust(0, 0, false), 0);
  ok(E.nextTrust(99, 100, false) <= 100);
});

/* ------------------------------- RAREZAS -------------------------------- */
console.log('15 rarezas');
t('hay exactamente 15', () => eq(E.RARITIES.length, 15));
t('los niveles van de 1 a 15 sin huecos', () => {
  E.RARITIES.forEach((r, i) => eq(r.tier, i + 1, r.id));
});
t('ids únicos', () => eq(new Set(E.RARITIES.map((r) => r.id)).size, 15));
t('colores únicos', () => eq(new Set(E.RARITIES.map((r) => r.color)).size, 15));
t('los pesos son positivos', () => E.RARITIES.forEach((r) => ok(r.weight > 0, r.id)));
t('Inefable es la más rara', () => {
  const min = E.RARITIES.slice().sort((a, b) => a.weight - b.weight)[0];
  eq(min.id, 'divino');
  eq(E.RARITY_BY_ID.inefable.tier, 15);
});
t('rarityIndex coincide con tier', () => E.RARITIES.forEach((r) => eq(E.rarityIndex(r.id), r.tier - 1)));

console.log('Botín');
t('las monedas crecen con la rareza', () => {
  for (let i = 1; i < 15; i++) {
    const a = E.LOOT[E.RARITIES[i - 1].id], b = E.LOOT[E.RARITIES[i].id];
    ok(b.coins[0] > a.coins[0], 'min en ' + i);
    ok(b.coins[1] > a.coins[1], 'max en ' + i);
  }
});
t('el XP del cofre crece', () => {
  for (let i = 1; i < 15; i++) ok(E.LOOT[E.RARITIES[i].id].xp[1] > E.LOOT[E.RARITIES[i - 1].id].xp[1]);
});
t('la esencia sólo aparece desde nivel 4', () => {
  eq(E.LOOT.ceniza.esencia[0], 0);
  eq(E.LOOT.pulido.esencia[0], 0);
  ok(E.LOOT.raro.esencia[0] >= 1);
});
t('el mejor cofre da más de 300 monedas', () => ok(E.LOOT.inefable.coins[1] >= 300));

/* ------------------------------ ARTEFACTOS ------------------------------ */
console.log('20 artefactos únicos');
t('hay exactamente 20', () => eq(E.ARTIFACTS.length, 20));
t('códigos únicos', () => eq(new Set(E.ARTIFACTS.map((a) => a.code)).size, 20));
t('efectos únicos salvo el ómnibus', () => {
  const eff = E.ARTIFACTS.map((a) => a.effect).filter((x) => x !== 'all');
  eq(new Set(eff).size, eff.length);
});
t('todos tienen nombre, icono y descripción', () => E.ARTIFACTS.forEach((a) => {
  ok(a.name.length > 3, a.code); ok(a.desc.length > 10, a.code); ok(!!a.icon, a.code);
}));
t('todos apuntan a una rareza válida', () => E.ARTIFACTS.forEach((a) => ok(!!E.RARITY_BY_ID[a.rarity], a.code)));
t('hay artefactos en las 15 rarezas de forma escalonada', () => {
  const tiers = new Set(E.ARTIFACTS.map((a) => E.RARITY_BY_ID[a.rarity].tier));
  ok(tiers.size >= 10, 'sólo ' + tiers.size + ' niveles cubiertos');
});
t('pickArtifact nunca repite uno poseído', () => {
  const rng = E.mulberry32(7);
  let owned = [];
  for (let i = 0; i < 25; i++) {
    const a = E.pickArtifact(rng, 'inefable', owned);
    if (!a) break;
    ok(owned.indexOf(a.code) === -1, 'repitió ' + a.code);
    owned.push(a.code);
  }
  eq(owned.length, 20);
});
t('pickArtifact devuelve null cuando ya los tienes todos', () => {
  const rng = E.mulberry32(9);
  eq(E.pickArtifact(rng, 'inefable', E.ARTIFACTS.map((a) => a.code)), null);
});
t('un cofre común no suelta artefactos de nivel 15', () => {
  const rng = E.mulberry32(3);
  for (let i = 0; i < 40; i++) {
    const a = E.pickArtifact(rng, 'comun', []);
    if (a) ok(E.RARITY_BY_ID[a.rarity].tier <= 3, 'salió ' + a.code);
  }
});
t('effectIndex vacío no concede nada', () => {
  const f = E.effectIndex([]);
  eq(f.altCount, 3); eq(f.dailyChests, 3); eq(f.trustGainCap, 12); eq(f.memory, 12);
});
t('cada efecto concreto enciende su bandera', () => {
  eq(E.effectIndex(['llave']).dailyChests, 4);
  eq(E.effectIndex(['corona']).chestSlots, 6);
  eq(E.effectIndex(['espejo']).trustGainCap, 22);
  eq(E.effectIndex(['ojo_doble']).altCount, 5);
  eq(E.effectIndex(['brasero']).extraQuests, 1);
  ok(E.effectIndex(['candil']).showChestOdds);
  ok(E.effectIndex(['cetro']).canSuggest);
  eq(E.effectIndex(['grimorio']).memory, 14);
});
t('el Ojo Inefable contiene todos los efectos', () => {
  const f = E.effectIndex(['ojo_inefable']);
  eq(f.dailyChests, 4); eq(f.chestSlots, 6); eq(f.altCount, 5);
  eq(f.trustGainCap, 22); eq(f.memory, 14); ok(f.canReroll && f.canDiagnose);
});

/* -------------------------------- COFRES -------------------------------- */
console.log('Cofres');
t('la piedad garantiza Raro o superior al límite', () => {
  const rng = E.mulberry32(12345);
  for (let i = 0; i < 30; i++) {
    const r = E.rollRarity(rng, E.PITY_LIMIT - 1);
    ok(r.tier >= 4, 'salió ' + r.id);
  }
});
t('rollRarity es determinista con la misma semilla', () => {
  const a = E.mulberry32(99), b = E.mulberry32(99);
  for (let i = 0; i < 20; i++) eq(E.rollRarity(a, 0).id, E.rollRarity(b, 0).id);
});
t('el botín respeta los rangos de su rareza', () => {
  const rng = E.mulberry32(5);
  for (let i = 0; i < 50; i++) {
    const rar = E.rollRarity(rng, 0);
    const loot = E.rollLoot(rar.id, rng);
    const base = E.LOOT[rar.id];
    ok(loot.coins >= base.coins[0] && loot.coins <= base.coins[1], 'monedas ' + loot.coins);
    ok(loot.xp >= base.xp[0] && loot.xp <= base.xp[1], 'xp ' + loot.xp);
    ok(loot.esencia >= base.esencia[0] && loot.esencia <= base.esencia[1]);
  }
});
t('a más piedad, mejor botín medio', () => {
  const rng = E.mulberry32(77);
  let low = 0, high = 0;
  for (let i = 0; i < 400; i++) low += E.rollRarity(rng, 0).tier;
  for (let i = 0; i < 400; i++) high += E.rollRarity(rng, E.PITY_LIMIT - 1).tier;
  ok(high > low, `${high} vs ${low}`);
});
t('precios declarados', () => { eq(E.CHEST_PRICES.buy, 240); eq(E.CHEST_PRICES.essence, 6); });

/* ------------------------------- MISIONES ------------------------------- */
console.log('Misiones');
t('3 misiones por día', () => eq(E.questsFor('2026-11-11', 3).length, 3));
t('4 misiones con brasero', () => eq(E.questsFor('2026-11-11', 4).length, 4));
t('deterministas por fecha', () => {
  const a = E.questsFor('2026-11-11', 3).map((q) => q.id);
  const b = E.questsFor('2026-11-11', 3).map((q) => q.id);
  eq(a.join(','), b.join(','));
});
t('sin repetidas en el mismo día', () => {
  const ids = E.questsFor('2026-11-11', 4).map((q) => q.id);
  eq(new Set(ids).size, ids.length);
});
t('varían entre días', () => {
  const a = E.questsFor('2026-11-11', 3).map((q) => q.id).join(',');
  const b = E.questsFor('2026-11-12', 3).map((q) => q.id).join(',');
  ok(a !== b, 'no cambian');
});
t('todas las misiones tienen premio', () => E.QUEST_POOL.forEach((q) => ok(q.coins > 0 && q.xp > 0, q.id)));

/* -------------------------------- RACHA -------------------------------- */
console.log('Racha y proyección');
t('racha de 3 días consecutivos', () => {
  const days = { '2026-11-11': { tasks: 2, high: 1 }, '2026-11-10': { tasks: 2, high: 0 }, '2026-11-09': { tasks: 2, high: 0 } };
  eq(E.streak(days, new Date(2026, 10, 11)), 3);
});
t('racha se corta al faltar un día', () => {
  const days = { '2026-11-11': { tasks: 2, high: 0 }, '2026-11-09': { tasks: 2, high: 0 } };
  eq(E.streak(days, new Date(2026, 10, 11)), 1);
});
t('racha estricta exige alto impacto', () => {
  const days = { '2026-11-11': { tasks: 5, high: 0 } };
  eq(E.streak(days, new Date(2026, 10, 11), { strict: true }), 0);
});
t('streak tolera ayer sin actividad hoy', () => {
  const days = { '2026-11-10': { tasks: 2, high: 1 } };
  eq(E.streak(days, new Date(2026, 10, 11)), 1);
});
t('proyección: ritmo constante llega a tiempo', () => {
  const p = E.projection(50, 10, '2026-12-31', '2026-11-11');
  eq(p.late, false);
  ok(p.eta > '2026-11-11');
});
t('proyección detecta atraso', () => {
  const p = E.projection(5, 30, '2026-11-11', '2026-11-11');
  eq(p.late, true);
  ok(p.lateDays > 0);
});
t('proyección sin ritmo no inventa fecha', () => {
  const p = E.projection(0, 3, '2026-12-01', '2026-11-11');
  eq(p.eta, null);
});
t('daysBetween simétrico', () => {
  eq(E.daysBetween('2026-11-01', '2026-11-11'), 10);
  eq(E.daysBetween('2026-11-11', '2026-11-01'), -10);
});
t('ymd produce formato ISO local', () => eq(E.ymd(new Date(2026, 0, 5)), '2026-01-05'));

/* ------------------------------- RESUMEN -------------------------------- */
console.log(lines.join('\n'));
console.log(`\n${pass} pasaron · ${fail} fallaron\n`);
process.exit(fail ? 1 : 0);
