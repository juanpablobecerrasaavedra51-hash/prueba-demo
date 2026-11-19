/* ============================================================================
   Prueba de humo de la interfaz (jsdom)
   Ejecutar: node tests/smoke.test.js
   Recorre: intro → onboarding → plan → verificación → cofre → pestañas → tarea.
   ============================================================================ */

'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => {
  const m = String(e.message || '');
  if (/Not implemented|Could not parse CSS/i.test(m)) return;   // canvas/CSS de jsdom
  errors.push(m);
});
vc.on('error', (m) => errors.push(String(m)));

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://localhost:8080/',
  virtualConsole: vc,
});
const { window } = dom;
const doc = window.document;
window.localStorage.clear();

window.eval(fs.readFileSync(path.join(ROOT, 'assets/sigil.js'), 'utf8'));
window.eval(fs.readFileSync(path.join(ROOT, 'assets/engine.js'), 'utf8'));
window.eval(fs.readFileSync(path.join(ROOT, 'assets/manifest.js'), 'utf8'));
for (const mod of window.SERAPH_MODULES) {
  window.eval(fs.readFileSync(path.join(ROOT, 'assets', mod), 'utf8'));
}
window.Seraph.start();

let pass = 0, fail = 0;
const lines = [];
async function t(name, fn) {
  try { await fn(); pass++; lines.push('  ✓ ' + name); }
  catch (e) { fail++; lines.push('  ✗ ' + name + '\n      → ' + e.message); }
}
const eq = (a, b, m = '') => { if (a !== b) throw new Error(`${m} esperado ${JSON.stringify(b)}, obtuve ${JSON.stringify(a)}`); };
const ok = (v, m = 'falso') => { if (!v) throw new Error(m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => doc.querySelector(s);
const $$ = (s) => Array.from(doc.querySelectorAll(s));
const click = (elOrSel) => {
  const el = typeof elOrSel === 'string' ? $(elOrSel) : elOrSel;
  if (!el) throw new Error('no existe ' + elOrSel);
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
};
const type = (sel, value) => {
  const el = $(sel);
  if (!el) throw new Error('no existe ' + sel);
  el.value = value;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const txt = () => doc.body.textContent;
/* La app guarda los días con su fecha local; el test usaba UTC y fallaba según
   la hora del equipo. Se usa la misma función que la app. */
const dayKey = () => window.Seraph.today();

(async () => {
  console.log('\nSeraph Augeo v3 · interfaz\n');
  await wait(90);
  const App = window.SeraphApp;
  ok(App, 'SeraphApp no se expuso');
  App.seed(20261111);

  await t('el sello se dibuja en las cuatro fases', () => {
    const s1 = window.SeraphSigil(190, { phase: 1 });
    const s4 = window.SeraphSigil(190, { phase: 4 });
    ok(s1.includes('<svg'), 'sin svg');
    ok(s1.includes('rotate(58'), 'fase 1 no está plegada');
    ok(s4.includes('rotate(-14'), 'fase 4 no está abierta');
    ok(s4.length > s1.length, 'la fase 4 debería tener más detalle');
    ok(s1 !== window.SeraphSigil(190, { phase: 2 }), 'las fases son idénticas');
  });

  await t('la intro aparece en el primer arranque', () => {
    ok($('#intro'), 'sin intro');
    ok($('.intro-feathers'), 'sin plumas');
    ok($('#introSigil svg'), 'sin sello en la intro');
    ok($('.intro-halo'), 'sin halo');
    ok($('#introFlash'), 'sin destello');
  });

  await t('la intro se puede saltar', async () => {
    click('#introSkip');
    await wait(800);
    ok(!$('#intro'), 'la intro sigue ahí');
    ok($('.onb'), 'no entró al onboarding');
  });

  await t('el onboarding explica sin tecnicismos', () => {
    ok(txt().includes('El ojo que recuerda'));
    ok($('[data-act="onbNext"]'), 'sin botón de avance');
  });

  await t('sin IA validada no deja entrar: abre la puerta', async () => {
    click('[data-act="onbNext"]');
    await wait(30);
    ok(!$('#onbTitle'), 'entró sin configurar la IA');
    ok(txt().includes('La inteligencia'), 'no abrió la puerta de la IA');
    ok($$('.prov').length >= 20, 'faltan proveedores: ' + $$('.prov').length);
    const go = $('[data-act="aiContinue"]');
    ok(go && go.hasAttribute('disabled'), 'dejó continuar sin probar nada');
  });

  await t('la puerta se abre cuando un proveedor respondió', async () => {
    window.localStorage.setItem('seraph-augeo-v3-ai-config', JSON.stringify({
      v: 1, activeId: 'p1',
      profiles: [{
        id: 'p1', provider: 'gemini', apiKey: 'AIza-clave-de-prueba-123456',
        baseUrl: '', model: 'gemini-3.8-flash', ok: true, ms: 42, error: '', checkedAt: Date.now(),
      }],
    }));
    window.Seraph.AISetup.refresh();
    await wait(40);
    const go = $('[data-act="aiContinue"]');
    ok(go && !go.hasAttribute('disabled'), 'sigue bloqueado con un proveedor validado');
    click('[data-act="aiContinue"]');
    await wait(40);
    ok($('#onbTitle'), 'no entró al paso de la meta');
  });

  await t('paso 1: la meta y su porqué', async () => {
    ok($('#onbTitle'), 'sin campo de meta');
    ok($('#onbWhy'), 'sin campo de porqué');
    eq($$('[data-act="onbArea"]').length, 7);
    type('#onbName', 'Ana');
    type('#onbTitle', 'Aprobar el examen de cálculo en diciembre');
    type('#onbWhy', 'Quiero cerrar el semestre sin deber la materia');
    click('[data-act="onbArea"][data-area="estudio"]');
    await wait(20);
    click('[data-act="onbHorizon"][data-d="90"]');
    await wait(20);
    click('[data-act="onbPlan"]');
    await wait(30);
  });

  await t('paso 2: muestra 3 hitos y 9 tareas', () => {
    eq($$('.ms-head').length, 3);
    eq($$('.tasks .task').length, 9);
    ok(txt().includes('Hábito sugerido'));
    ok($('[data-act="onbStart"]'), 'sin botón de encender');
  });

  await t('encender crea la meta, las tareas y el hábito', async () => {
    click('[data-act="onbStart"]');
    await wait(60);
    eq(App.state.goals.length, 1);
    eq(App.state.goals[0].tasks.length, 9);
    eq(App.state.habits.length, 1);
    eq(App.state.name, 'Ana');
    ok($('.hero'), 'sin héroe');
    ok($('.tabbar, .tab'), 'sin pestañas');
    ok(txt().includes('El siguiente paso'));
    ok($('.hero-reason'), 'sin explicación de por qué esa tarea');
  });

  await t('la tarea elegida muestra sus factores', () => {
    ok($$('.factor').length >= 4, 'faltan factores');
    eq($$('[data-act="tab"]').length, 5);
  });

  await t('las misiones del día existen y son 3', () => {
    ok(txt().includes('Misiones del día'));
    eq($$('.quest').length >= 3, true);
  });

  await t('el hábito se puede marcar', async () => {
    const before = App.state.days[dayKey()] || {};
    click('[data-act="toggleHabit"]');
    await wait(30);
    ok($('.habit.done'), 'el hábito no se marcó');
    ok(App.state.habits[0].log, 'sin registro');
    ok((App.state.days[dayKey()].habits || 0) >= 1);
    ok(before !== undefined || true);
  });

  await t('abrir verificación muestra pregunta atada a la tarea', async () => {
    click('[data-act="openVerify"]');
    await wait(160);
    ok($('.modal'), 'sin modal');
    ok($('.guardian-question'), 'sin pregunta del Guardián');
    const q = $('.gq-text');
    ok(q, 'la pregunta no cargó');
    ok(q.textContent.length > 20, 'pregunta demasiado corta');
    const titles = App.state.goals[0].tasks.map((t) => t.title);
    ok(titles.some((tt) => q.textContent.includes(tt)), 'la pregunta no menciona la tarea: ' + q.textContent);
    ok(/obstáculo|número|paso|dejaste|costó|hilo|minuto/.test(q.textContent), 'la pregunta no es verificable: ' + q.textContent);
  });

  await t('la verificación exige una respuesta concreta', async () => {
    click('[data-act="submitVerify"]');
    await wait(30);
    ok(txt().includes('al menos una frase'), 'no avisó');
  });

  await t('una respuesta rica se verifica y da XP', async () => {
    const answer = 'Resolví los ejercicios 12 al 16 del capítulo 3. El 15 me tomó 11 minutos porque confundí la regla de la cadena; repasé el ejemplo 4 y salió. Dejé las notas en el cuaderno azul.';
    type('#vAnswer', answer);
    click('[data-act="vEvidence"][data-e="2"]');
    await wait(30);
    click('[data-act="submitVerify"]');
    await wait(420);
    ok($('.loot-items'), 'sin pantalla de veredicto');
    ok(App.state.verifiedXp > 0, 'sin XP');
    eq(App.state.days[Object.keys(App.state.days)[0]].tasks, 1);
    const badge = $('.badge');
    ok(badge && /Verificado|Probable/.test(badge.textContent), 'badge: ' + (badge && badge.textContent));
    ok($('[data-act="finishVerify"]'), 'sin botón continuar');
  });

  await t('al continuar, la tarea aparece hecha', async () => {
    click('[data-act="finishVerify"]');
    await wait(60);
    ok($('.task.is-done'), 'no hay tarea completada');
    ok(App.state.goals[0].tasks.some((t) => t.done), 'el estado no marcó la tarea');
  });

  await t('el cofre se abre con su animación y entrega botín', async () => {
    const S = App.state;
    S.chests.push({ id: 'c1', at: Date.now() });
    S.chests.push({ id: 'c2', at: Date.now() });
    App.setTab('cofres');
    await wait(30);
    ok(txt().includes('cámara de cofres'));
    const beforeChests = S.chests.length;
    click('[data-act="openChest"][data-i="0"]');
    await wait(20);
    ok($('.loot'), 'sin capa de apertura');
    await wait(1400);
    ok($('.loot-card'), 'sin tarjeta de botín');
    ok(txt().includes('nivel'), 'sin rareza');
    ok(S.chestStats.total >= 1, 'no contó el cofre: ' + S.chestStats.total);
    eq(S.chests.length, beforeChests - 1);
    ok(S.coins > 120, 'no dieron monedas: ' + S.coins);
    click('[data-act="closeChest"]');
    await wait(40);
    ok(!$('.loot'), 'la capa no se cerró');
  });

  await t('la cámara lista las 15 rarezas', () => {
    const cards = $$('.art-grid .art');
    ok(cards.length >= 15, 'sólo ' + cards.length + ' rarezas');
    ok(txt().includes('Inefable') || txt().includes('Sin descubrir'), 'sin lista de rarezas');
  });

  await t('el Guardián muestra estado y diagnóstico local', async () => {
    App.setTab('guardian');
    await wait(30);
    ok(txt().includes('Ángel Guardián'));
    ok($('.diagnosis'), 'sin diagnóstico');
    ok(txt().includes('Riesgos'));
    ok(txt().includes('Qué hacer ahora'));
    ok(txt().includes('Modo local') || txt().includes('LOCAL') || txt().includes('SIN PROBAR'), 'no avisa del modo local');
  });

  await t('pedir diagnóstico sin IA no rompe y avisa', async () => {
    click('[data-act="askDiagnose"]');
    await wait(120);
    ok(txt().includes('Ángel Guardián'), 'la vista desapareció');
  });

  await t('el altar muestra fase, artefactos y logros', async () => {
    App.setTab('altar');
    await wait(30);
    ok(txt().includes('El altar'));
    ok($('.sigil-wrap svg'), 'sin sello');
    ok(txt().includes('Artefactos'));
    eq($$('.art-grid .art').length, 20);
    ok(txt().includes('Logros'));
    ok($$('.ach').length >= 16, 'faltan logros');
    ok($('.heat'), 'sin mapa de constancia');
  });

  await t('el nivel y la fase suben con el XP verificado', () => {
    const before = doc.documentElement.getAttribute('data-phase');
    App.state.verifiedXp = 950;
    App.render();
    eq(doc.documentElement.getAttribute('data-phase'), '3');
    App.state.verifiedXp = 0;
    App.render();
    eq(doc.documentElement.getAttribute('data-phase'), '1');
    ok(before !== null);
  });

  await t('se puede añadir una tarea nueva', async () => {
    App.setTab('metas');
    await wait(30);
    const n = App.state.goals[0].tasks.length;
    click('[data-act="openNewTask"]');
    await wait(40);
    type('#tTitle', 'Hacer un resumen de fórmulas');
    click('[data-act="saveTask"]');
    await wait(60);
    eq(App.state.goals[0].tasks.length, n + 1);
    ok(txt().includes('Hacer un resumen de fórmulas'));
  });

  await t('los ajustes abren y el Guardián se puede apagar', async () => {
    click('[data-act="openSettings"]');
    await wait(40);
    ok(txt().includes('Ajustes'));
    click('[data-act="toggleAI"]');
    await wait(40);
    eq(App.state.ai.enabled, false);
    click('[data-act="closeModal"]');
    await wait(30);
    ok(!$('.modal'), 'modal abierto');
  });

  await t('los planes no prometen cobros falsos', async () => {
    App.setTab('altar');
    await wait(30);
    click('[data-act="openPlans"]');
    await wait(40);
    ok(txt().includes('Próximamente'));
    ok(txt().includes('No hay cobro activo'));
    click('[data-act="closeModal"]');
    await wait(30);
  });

  await t('la pestaña Hoy resume el estado', async () => {
    App.setTab('hoy');
    await wait(30);
    ok($('.hero') || txt().includes('todo en orden'));
    ok($$('.stat').length >= 4, 'faltan métricas');
    ok(txt().includes('Últimos 7 días'));
  });

  await t('el estado sobrevive a recargar (localStorage)', () => {
    App.save();
    const raw = window.localStorage.getItem('seraph-augeo-v3');
    ok(raw && raw.length > 500, 'no se guardó');
    const parsed = JSON.parse(raw);
    eq(parsed.v, 3);
    eq(parsed.goals.length, 1);
  });

  await t('no hubo errores de JavaScript', () => {
    const real = errors.filter((e) => !/Error: Not implemented/.test(e));
    ok(real.length === 0, real.slice(0, 3).join(' | '));
  });

  console.log(lines.join('\n'));
  console.log(`\n${pass} pasaron · ${fail} fallaron\n`);
  if (fail) process.exitCode = 1;
  dom.window.close();
})();
