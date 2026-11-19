/* ============================================================================
   Pruebas del Guardián sin servidor (assets/ai/client.js)
   Ejecutar: node tests/client.test.js
   No hace llamadas reales: simula `fetch` para cada caso, incluido el error.
   Cubre los dos proveedores: Gemini (clave AIza…) y OpenRouter (clave sk-or-…).
   ============================================================================ */

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets/ai/client.js'), 'utf8');
const KEY_STORE = 'seraph-augeo-v3-ai-key';
const LEGACY_KEY_STORE = 'seraph-augeo-v3-gemini-key';
const BUDGET_STORE = 'seraph-augeo-v3-ai-budget';

const GEMINI_KEY = 'AIza-clave-de-prueba-123456';
const OPENROUTER_KEY = 'sk-or-v1-' + 'a'.repeat(64);

function memoryStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    _map: m,
  };
}

/* Respuesta de Gemini tal como llega de verdad: candidates[0].content.parts */
function reply(payload, status = 200) {
  return replyText(typeof payload === 'string' ? payload : JSON.stringify(payload), status);
}
function replyText(text, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  };
}
/* Respuesta de OpenRouter: choices[0].message.content */
function orReply(payload, status = 200) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ choices: [{ message: { role: 'assistant', content: text } }] }),
  };
}
function httpFail(status, message = 'error de prueba') {
  return { ok: false, status, json: async () => ({ error: { message, status } }) };
}

function load(fetchImpl, opts = {}) {
  const store = opts.store || memoryStore();
  if (opts.budget) store.setItem(BUDGET_STORE, JSON.stringify(opts.budget));
  if (opts.legacyKey) store.setItem(LEGACY_KEY_STORE, opts.legacyKey);
  const win = {};
  const sandbox = {
    window: win,
    localStorage: store,
    fetch: fetchImpl,
    AbortController,
    setTimeout,
    clearTimeout,
    console,
    Date,
    JSON,
    Math,
    Object,
    Array,
    String,
    Number,
    Error,
    encodeURIComponent,
  };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  return { G: win.Seraph.AIClient, store, win };
}

let pass = 0;
let fail = 0;
const lines = [];

async function t(name, fn) {
  try { await fn(); pass += 1; lines.push('  ✓ ' + name); }
  catch (e) { fail += 1; lines.push('  ✗ ' + name + '\n      → ' + e.message); }
}
const eq = (a, b, m = '') => { if (a !== b) throw new Error(`${m} esperado ${JSON.stringify(b)}, obtuve ${JSON.stringify(a)}`); };
const ok = (v, m = 'falso') => { if (!v) throw new Error(m); };

(async () => {
  console.log('\nSeraph Augeo v3 · Guardián sin servidor\n');

  await t('sin clave no llama a nadie y avisa', async () => {
    let calls = 0;
    const { G } = load(async () => { calls += 1; return reply({ ok: true }); });
    eq(G.hasKey(), false);
    eq(G.providerId(), '');
    const p = await G.probe();
    eq(p.ok, false);
    eq(p.reason, 'sin-clave');
    const r = await G.ask('challenge', { goal: { title: 'Meta' }, task: { title: 'Tarea' } });
    eq(r.ok, false);
    eq(r.reason, 'sin-clave');
    eq(calls, 0, 'no debió llamar a fetch');
  });

  await t('una clave AIza… usa Gemini, con su endpoint y su cabecera', async () => {
    const seen = {};
    const { G } = load(async (url, init) => {
      seen.url = url;
      seen.headers = init.headers;
      seen.body = JSON.parse(init.body);
      return reply({ ok: true });
    });
    G.setKey(GEMINI_KEY);
    eq(G.providerId(), 'gemini');
    eq(G.providerName(), 'Gemini');
    const p = await G.probe();
    eq(p.ok, true);
    eq(p.status, 200);
    eq(p.provider, 'Gemini');
    ok(p.model, 'sin modelo');
    ok(typeof p.ms === 'number', 'sin latencia');
    ok(seen.url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/'), seen.url);
    ok(seen.url.includes(':generateContent'), seen.url);
    eq(seen.headers['x-goog-api-key'], GEMINI_KEY);
    eq(seen.headers.Authorization, undefined);
    ok(seen.body.generationConfig, 'sin generationConfig');
    eq(seen.body.generationConfig.responseMimeType, 'application/json');
  });

  await t('una clave sk-or-… usa OpenRouter, con Bearer y messages', async () => {
    const seen = {};
    const { G } = load(async (url, init) => {
      seen.url = url;
      seen.headers = init.headers;
      seen.body = JSON.parse(init.body);
      return orReply({ ok: true });
    });
    G.setKey(OPENROUTER_KEY);
    eq(G.providerId(), 'openrouter');
    eq(G.providerName(), 'OpenRouter');
    const p = await G.probe();
    eq(p.ok, true, JSON.stringify(p));
    eq(p.provider, 'OpenRouter');
    eq(seen.url, 'https://openrouter.ai/api/v1/chat/completions');
    eq(seen.headers.Authorization, 'Bearer ' + OPENROUTER_KEY);
    eq(seen.headers['x-goog-api-key'], undefined);
    eq(seen.body.model, G.MODELS[0], 'el body debe llevar el modelo elegido');
    ok(Array.isArray(seen.body.messages), 'sin messages');
    eq(seen.body.messages[0].role, 'system');
    eq(seen.body.messages[1].role, 'user');
    ok(seen.body.max_tokens > 0, 'sin max_tokens');
    eq(seen.body.response_format, undefined, 'no debe exigir response_format');
  });

  await t('OpenRouter devuelve JSON envuelto en bloque y se acepta', async () => {
    const { G } = load(async () => orReply('```json\n{"score":71,"feedback":"Concreto y medible.","specific":true}\n```'));
    G.setKey(OPENROUTER_KEY);
    const r = await G.ask('verdict', { goal: {}, task: {}, answer: 'x' });
    eq(r.ok, true, JSON.stringify(r));
    eq(r.data.score, 71);
    ok(r.provider.startsWith('OpenRouter · '), r.provider);
  });

  await t('el ranking de modelos depende del proveedor', async () => {
    const { G } = load(async () => orReply({ ok: true }));
    G.setKey(OPENROUTER_KEY);
    const or = G.MODELS;
    G.setKey(GEMINI_KEY);
    const ge = G.MODELS;
    G.clearKey();
    ok(or.every((m) => m.includes('/')), 'los modelos de OpenRouter llevan espacio de nombres: ' + or.join(', '));
    ok(ge.every((m) => m.startsWith('gemini')), 'los de Gemini empiezan por gemini: ' + ge.join(', '));
    ok(or[0] !== ge[0], 'no deben compartir el primer modelo');
    G.setKey(OPENROUTER_KEY);
    eq(G.MODELS[0], or[0]);
  });

  await t('sin saldo en OpenRouter (402) no se reintenta y se explica', async () => {
    let calls = 0;
    const { G } = load(async () => { calls += 1; return httpFail(402, 'Insufficient credits'); });
    G.setKey(OPENROUTER_KEY);
    const p = await G.probe();
    eq(p.ok, false);
    eq(p.reason, 'credito');
    ok(p.error.includes('Insufficient'), p.error);
    eq(calls, 1, 'no debía probar el segundo modelo');
  });

  await t('una pregunta válida se acepta y se guarda en caché', async () => {
    let calls = 0;
    const { G } = load(async () => { calls += 1; return reply({ question: '¿Qué ejercicio resolviste?', lookingFor: ['número'], focus: 'prueba' }); });
    G.setKey(GEMINI_KEY);
    const a = await G.ask('challenge', { goal: { title: 'Cálculo' }, task: { title: 'Ejercicios' } });
    eq(a.ok, true);
    ok(a.data.question.includes('ejercicio'), a.data.question);
    ok(a.provider.startsWith('Gemini · '), a.provider);
    const b = await G.ask('challenge', { goal: { title: 'Cálculo' }, task: { title: 'Ejercicios' } });
    eq(b.ok, true);
    eq(b.cached, true);
    eq(calls, 1, 'la segunda debía salir de caché');
  });

  await t('la caché no se comparte entre proveedores', async () => {
    let calls = 0;
    const { G } = load(async (url) => {
      calls += 1;
      const body = { question: '¿Qué número salió?', lookingFor: [] };
      return url.includes('openrouter') ? orReply(body) : reply(body);
    });
    const payload = { goal: { title: 'A' }, task: { title: 'B' } };
    G.setKey(GEMINI_KEY);
    await G.ask('challenge', payload);
    G.setKey(OPENROUTER_KEY);
    await G.ask('challenge', payload);
    eq(calls, 2, 'cambiar de proveedor debe invalidar la caché');
  });

  await t('tolera el JSON envuelto en un bloque de código', async () => {
    const { G } = load(async () => reply('```json\n{"score":62,"feedback":"Concreto y creíble.","specific":true}\n```'));
    G.setKey(GEMINI_KEY);
    const r = await G.ask('verdict', { goal: {}, task: {}, answer: 'x' });
    eq(r.ok, true);
    eq(r.data.score, 62);
  });

  await t('un JSON inválido no se acepta y pasa al modelo de respaldo', async () => {
    let calls = 0;
    const { G } = load(async () => {
      calls += 1;
      return calls === 1 ? reply('esto no es json') : reply({ question: '¿Cuál fue el resultado exacto?', lookingFor: [] });
    });
    G.setKey(GEMINI_KEY);
    const r = await G.ask('challenge', { goal: { title: 'A' }, task: { title: 'B' } });
    eq(r.ok, true);
    eq(calls, 2, 'debía intentar el segundo modelo');
    eq(r.attempts[0].reason, 'json-invalido');
  });

  await t('los dos modelos fallando dejan el modo local con motivo', async () => {
    let calls = 0;
    const { G } = load(async () => { calls += 1; return reply({ nope: true }); });
    G.setKey(GEMINI_KEY);
    const r = await G.ask('solve', {});
    eq(r.ok, false);
    const r2 = await G.ask('verdict', { goal: {}, task: {}, answer: 'a' });
    eq(r2.ok, false);
    eq(r2.reason, 'json-invalido');
    eq(calls, 2, 'dos modelos, dos intentos');
  });

  await t('una clave rechazada no se reintenta con otro modelo', async () => {
    let calls = 0;
    const { G } = load(async () => { calls += 1; return httpFail(400, 'API key not valid'); });
    G.setKey(GEMINI_KEY);
    const p = await G.probe();
    eq(p.ok, false);
    eq(p.reason, 'clave-rechazada');
    ok(p.error.includes('API key not valid'), p.error);
    eq(calls, 1, 'no debía probar el segundo modelo');
  });

  await t('distingue cuota agotada de clave inválida', async () => {
    const { G } = load(async () => httpFail(429, 'quota exceeded'));
    G.setKey(GEMINI_KEY);
    const p = await G.probe();
    eq(p.ok, false);
    eq(p.reason, 'cuota');
    ok(p.error.includes('quota'), p.error);
  });

  await t('una caída de red se reporta como CORS o falta de conexión', async () => {
    const { G } = load(async () => { const e = new TypeError('Failed to fetch'); throw e; });
    G.setKey(GEMINI_KEY);
    const p = await G.probe();
    eq(p.ok, false);
    eq(p.reason, 'cors-o-red');
    ok(p.error.length > 20, p.error);
  });

  await t('el timeout se reporta como timeout', async () => {
    const { G } = load(async () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    });
    G.setKey(GEMINI_KEY);
    const p = await G.probe();
    eq(p.ok, false);
    eq(p.reason, 'timeout');
  });

  await t('el presupuesto diario corta las llamadas', async () => {
    let calls = 0;
    const today = new Date().toISOString().slice(0, 10);
    const { G } = load(async () => { calls += 1; return reply({ question: 'x', lookingFor: [] }); }, { budget: { day: today, used: 500 } });
    G.setKey(GEMINI_KEY);
    eq(G.budgetLeft(), 0);
    const r = await G.ask('challenge', { goal: { title: 'A' }, task: { title: 'B' } });
    eq(r.ok, false);
    eq(r.reason, 'presupuesto');
    eq(calls, 0);
  });

  await t('borrar la clave también borra la caché', async () => {
    let calls = 0;
    const { G } = load(async () => { calls += 1; return reply({ question: '¿Qué numero salió?', lookingFor: [] }); });
    G.setKey(GEMINI_KEY);
    await G.ask('challenge', { goal: { title: 'A' }, task: { title: 'B' } });
    eq(calls, 1);
    G.clearKey();
    eq(G.hasKey(), false);
    await G.ask('challenge', { goal: { title: 'A' }, task: { title: 'B' } });
    eq(calls, 1, 'sin clave no debe llamar');
  });

  await t('migra una clave antigua guardada como «gemini»', async () => {
    const { G, store } = load(async () => reply({ ok: true }), { legacyKey: GEMINI_KEY });
    eq(G.hasKey(), true);
    eq(G.providerId(), 'gemini');
    G.setKey(GEMINI_KEY);
    eq(store.getItem(KEY_STORE), GEMINI_KEY);
    eq(store.getItem(LEGACY_KEY_STORE), null, 'la clave antigua debe quedar limpia');
  });

  await t('un veredicto fuera de rango se rechaza', async () => {
    const { G } = load(async () => reply({ score: 400, feedback: 'x' }));
    G.setKey(GEMINI_KEY);
    const r = await G.ask('verdict', { goal: {}, task: {}, answer: 'a' });
    eq(r.ok, false);
    eq(r.reason, 'json-invalido');
  });

  console.log(lines.join('\n'));
  console.log(`\n${pass} pasaron · ${fail} fallaron\n`);
  if (fail) process.exitCode = 1;
})();
