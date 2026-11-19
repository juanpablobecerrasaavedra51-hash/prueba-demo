/* ============================================================================
   ai/client — El Guardián sin servidor
   Habla directo con la API de IA desde el navegador. La clave vive SÓLO en
   este dispositivo (localStorage) y nunca pasa por un servidor de la app.

   Acepta cualquier proveedor: los grandes de la nube (OpenAI, Anthropic,
   Gemini, OpenRouter, Groq, Mistral, DeepSeek, xAI, Together, Fireworks,
   Perplexity, Cerebras, DeepInfra, Hyperbolic, Nebius, SambaNova, Novita,
   GitHub Models, Moonshot, Z.ai, DashScope, SiliconFlow) y cualquier modelo
   local con API compatible con OpenAI (Ollama, LM Studio, llama.cpp, vLLM,
   Jan, GPT4All, KoboldCpp, text-generation-webui) o una URL propia.

   Cada proveedor se guarda como un «perfil». Un perfil sólo cuenta como
   listo si una llamada real respondió: así la app nunca dice «conectado»
   sin pruebas. Basta con que UN perfil funcione para entrar.

   En la versión de escritorio (Electron) las peticiones pasan por el proceso
   principal con `window.seraphDesktop.httpJson`: sin CORS y sin servidor.
   ============================================================================ */
(function (A) {
  'use strict';

  const KEY_STORE = 'seraph-augeo-v3-ai-key';
  const LEGACY_KEY_STORE = 'seraph-augeo-v3-gemini-key';
  const CONFIG_STORE = 'seraph-augeo-v3-ai-config';
  const CACHE_STORE = 'seraph-augeo-v3-ai-cache';
  const BUDGET_STORE = 'seraph-augeo-v3-ai-budget';

  const DAILY_LIMIT = 200;

  /* ----------------------------- Proveedores ----------------------------- */

  /* Un proveedor compatible con OpenAI sólo necesita su base y sus modelos. */
  function oa(o) {
    return Object.assign({
      kind: 'openai',
      keyless: false,
      local: false,
      keyHint: 'sk-…',
      timeoutMs: 15000,
      models: [],
      docs: '',
    }, o);
  }

  const PROVIDERS = {
    /* --- Nube ------------------------------------------------------------ */
    openai: oa({
      id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1',
      models: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'],
      docs: 'platform.openai.com/api-keys', keyHint: 'sk-proj-…',
    }),
    anthropic: oa({
      id: 'anthropic', name: 'Anthropic (Claude)', kind: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      models: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-3-5-haiku-latest'],
      docs: 'console.anthropic.com/settings/keys', keyHint: 'sk-ant-…',
    }),
    gemini: {
      id: 'gemini', name: 'Gemini', kind: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      docs: 'aistudio.google.com/apikey', keyHint: 'AIza…',
      models: ['gemini-3.8-flash', 'gemini-flash-lite-latest'],
      timeoutMs: 9000, keyless: false, local: false,
    },
    openrouter: {
      id: 'openrouter', name: 'OpenRouter', kind: 'openai',
      baseUrl: 'https://openrouter.ai/api/v1',
      docs: 'openrouter.ai/keys', keyHint: 'sk-or-v1-…',
      models: ['google/gemini-2.5-flash-lite', 'openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct'],
      timeoutMs: 15000, keyless: false, local: false,
    },
    groq: oa({
      id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1',
      models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-20b'],
      docs: 'console.groq.com/keys', keyHint: 'gsk_…',
    }),
    mistral: oa({
      id: 'mistral', name: 'Mistral', baseUrl: 'https://api.mistral.ai/v1',
      models: ['mistral-small-latest', 'ministral-8b-latest'],
      docs: 'console.mistral.ai/api-keys', keyHint: '…',
    }),
    deepseek: oa({
      id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1',
      models: ['deepseek-chat', 'deepseek-reasoner'],
      docs: 'platform.deepseek.com/api_keys', keyHint: 'sk-…',
    }),
    xai: oa({
      id: 'xai', name: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1',
      models: ['grok-2-latest', 'grok-beta'],
      docs: 'console.x.ai', keyHint: 'xai-…',
    }),
    together: oa({
      id: 'together', name: 'Together AI', baseUrl: 'https://api.together.xyz/v1',
      models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-7B-Instruct-Turbo'],
      docs: 'api.together.xyz/settings/api-keys',
    }),
    fireworks: oa({
      id: 'fireworks', name: 'Fireworks', baseUrl: 'https://api.fireworks.ai/inference/v1',
      models: ['accounts/fireworks/models/llama-v3p1-8b-instruct'],
      docs: 'fireworks.ai/account/api-keys',
    }),
    perplexity: oa({
      id: 'perplexity', name: 'Perplexity', baseUrl: 'https://api.perplexity.ai',
      models: ['sonar', 'sonar-pro'],
      docs: 'perplexity.ai/settings/api', keyHint: 'pplx-…',
    }),
    cerebras: oa({
      id: 'cerebras', name: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1',
      models: ['llama-3.3-70b', 'llama3.1-8b'],
      docs: 'cloud.cerebras.ai',
    }),
    deepinfra: oa({
      id: 'deepinfra', name: 'DeepInfra', baseUrl: 'https://api.deepinfra.com/v1/openai',
      models: ['meta-llama/Llama-3.3-70B-Instruct'],
      docs: 'deepinfra.com/dash/api_keys',
    }),
    hyperbolic: oa({
      id: 'hyperbolic', name: 'Hyperbolic', baseUrl: 'https://api.hyperbolic.xyz/v1',
      models: ['meta-llama/Llama-3.3-70B-Instruct'],
      docs: 'app.hyperbolic.xyz/settings',
    }),
    nebius: oa({
      id: 'nebius', name: 'Nebius', baseUrl: 'https://api.studio.nebius.ai/v1',
      models: ['meta-llama/Llama-3.3-70B-Instruct'],
      docs: 'studio.nebius.ai',
    }),
    sambanova: oa({
      id: 'sambanova', name: 'SambaNova', baseUrl: 'https://api.sambanova.ai/v1',
      models: ['Meta-Llama-3.3-70B-Instruct'],
      docs: 'cloud.sambanova.ai',
    }),
    novita: oa({
      id: 'novita', name: 'Novita', baseUrl: 'https://api.novita.ai/v3/openai',
      models: ['meta-llama/llama-3.3-70b-instruct'],
      docs: 'novita.ai/settings/key-management',
    }),
    github: oa({
      id: 'github', name: 'GitHub Models', baseUrl: 'https://models.inference.ai.azure.com',
      models: ['gpt-4o-mini', 'Phi-3.5-mini-instruct'],
      docs: 'github.com/settings/tokens', keyHint: 'ghp_…',
    }),
    moonshot: oa({
      id: 'moonshot', name: 'Moonshot (Kimi)', baseUrl: 'https://api.moonshot.ai/v1',
      models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
      docs: 'platform.moonshot.ai/console/api-keys',
    }),
    zhipu: oa({
      id: 'zhipu', name: 'Z.ai (GLM)', baseUrl: 'https://api.z.ai/api/paas/v4',
      models: ['glm-4-flash', 'glm-4-plus'],
      docs: 'z.ai/manage-apikey/apikey-list',
    }),
    dashscope: oa({
      id: 'dashscope', name: 'Alibaba (Qwen)', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      models: ['qwen-plus', 'qwen-turbo'],
      docs: 'bailian.console.alibabacloud.com',
    }),
    siliconflow: oa({
      id: 'siliconflow', name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1',
      models: ['Qwen/Qwen2.5-7B-Instruct'],
      docs: 'cloud.siliconflow.cn/account/ak',
    }),

    /* --- En tu equipo (sin clave) ---------------------------------------- */
    ollama: oa({
      id: 'ollama', name: 'Ollama', baseUrl: 'http://localhost:11434/v1',
      models: ['llama3.2', 'qwen2.5', 'gemma3'], keyless: true, local: true,
      timeoutMs: 60000, docs: 'ollama.com', keyHint: 'sin clave',
    }),
    lmstudio: oa({
      id: 'lmstudio', name: 'LM Studio', baseUrl: 'http://localhost:1234/v1',
      models: ['local-model'], keyless: true, local: true, timeoutMs: 60000,
      docs: 'lmstudio.ai', keyHint: 'sin clave',
    }),
    llamacpp: oa({
      id: 'llamacpp', name: 'llama.cpp', baseUrl: 'http://localhost:8080/v1',
      models: ['local-model'], keyless: true, local: true, timeoutMs: 60000,
      docs: '', keyHint: 'sin clave',
    }),
    vllm: oa({
      id: 'vllm', name: 'vLLM', baseUrl: 'http://localhost:8000/v1',
      models: ['local-model'], keyless: true, local: true, timeoutMs: 60000,
      docs: '', keyHint: 'sin clave',
    }),
    jan: oa({
      id: 'jan', name: 'Jan', baseUrl: 'http://localhost:1337/v1',
      models: ['local-model'], keyless: true, local: true, timeoutMs: 60000,
      docs: 'jan.ai', keyHint: 'sin clave',
    }),
    gpt4all: oa({
      id: 'gpt4all', name: 'GPT4All', baseUrl: 'http://localhost:4891/v1',
      models: ['local-model'], keyless: true, local: true, timeoutMs: 60000,
      docs: 'gpt4all.io', keyHint: 'sin clave',
    }),
    koboldcpp: oa({
      id: 'koboldcpp', name: 'KoboldCpp', baseUrl: 'http://localhost:5001/v1',
      models: ['local-model'], keyless: true, local: true, timeoutMs: 60000,
      docs: 'github.com/LostRuins/koboldcpp', keyHint: 'sin clave',
    }),
    textgen: oa({
      id: 'textgen', name: 'text-generation-webui', baseUrl: 'http://localhost:5000/v1',
      models: ['local-model'], keyless: true, local: true, timeoutMs: 60000,
      docs: 'github.com/oobabooga/text-generation-webui', keyHint: 'sin clave',
    }),
    custom: oa({
      id: 'custom', name: 'Otro (URL propia)', baseUrl: '',
      models: [], keyless: true, local: false, timeoutMs: 60000,
      docs: '', keyHint: 'opcional',
    }),
  };

  const LIST = Object.keys(PROVIDERS).map((k) => PROVIDERS[k]);

  const MESSAGES = {
    'sin-clave': 'No hay una IA configurada en este dispositivo.',
    'clave-rechazada': 'El proveedor rechazó la clave. Revisa que sea válida y que no esté restringida a otro sitio.',
    'cuota': 'La cuota de esa clave está agotada. Espera un rato o usa otra clave.',
    'credito': 'La clave no tiene saldo en ese proveedor. Usa un modelo gratuito o recarga la cuenta.',
    'timeout': 'La IA tardó demasiado en responder.',
    'cors-o-red': 'No se pudo conectar con la IA: sin internet, el modelo local apagado o la petición bloqueada por CORS.',
    'json-invalido': 'La IA respondió algo que no es un JSON válido.',
    'respuesta-vacia': 'La IA devolvió una respuesta vacía (puede ser un bloqueo de contenido).',
    'modelo-inexistente': 'Ese modelo no está disponible para esta clave. Escribe otro nombre de modelo.',
    'presupuesto': 'Presupuesto diario de llamadas agotado.',
    'red': 'Fallo de red al llamar a la IA.',
    'tipo-desconocido': 'Petición de IA desconocida.',
    'sin-respuesta': 'La IA no respondió.',
    'url-invalida': 'La dirección (URL) del proveedor no es válida.',
  };

  /* ------------------------------- Guardado ------------------------------- */

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* modo privado */ } },
  };

  function readConfig() {
    try {
      const raw = store.get(CONFIG_STORE);
      if (raw) {
        const c = JSON.parse(raw);
        if (c && Array.isArray(c.profiles)) {
          return { v: 1, activeId: c.activeId || '', profiles: c.profiles.filter((p) => p && p.provider) };
        }
      }
    } catch (e) { /* configuración corrupta: se empieza de cero */ }
    return { v: 1, activeId: '', profiles: [] };
  }

  function writeConfig(c) {
    store.set(CONFIG_STORE, JSON.stringify({ v: 1, activeId: c.activeId || '', profiles: c.profiles || [] }));
  }

  function legacyKey() {
    const k = (store.get(KEY_STORE) || '').trim();
    if (k) return k;
    return (store.get(LEGACY_KEY_STORE) || '').trim();
  }

  /* El prefijo decide el proveedor de una clave suelta. */
  function detectId(key) {
    const k = String(key || '').trim();
    if (!k) return '';
    if (/^sk-or-/i.test(k)) return 'openrouter';
    if (/^sk-ant-/i.test(k)) return 'anthropic';
    if (/^AIza/.test(k)) return 'gemini';
    if (/^gsk_/i.test(k)) return 'groq';
    if (/^xai-/i.test(k)) return 'xai';
    if (/^pplx-/i.test(k)) return 'perplexity';
    if (/^ghp_/i.test(k)) return 'github';
    if (/^sk-proj-|^sk-[A-Za-z0-9]{20,}/.test(k)) return 'openai';
    return k.length > 50 && k.indexOf('-') > 0 ? 'openrouter' : 'openai';
  }

  /* -------------------------------- Perfiles ------------------------------- */

  function activeProfile() {
    const c = readConfig();
    let p = c.profiles.find((x) => x.id === c.activeId);
    if (!p) p = c.profiles.find((x) => x.ok);
    if (!p) p = c.profiles[0];
    if (p) return p;
    /* Instalaciones antiguas: una clave suelta sin perfil. */
    const k = legacyKey();
    if (!k) return null;
    const id = detectId(k);
    return { id: 'legacy', provider: id, apiKey: k, baseUrl: '', model: '', ok: false, ms: 0, error: '' };
  }

  function providerOf(profile) {
    return (profile && PROVIDERS[profile.provider]) || null;
  }
  function baseOf(P, profile) {
    return String((profile && profile.baseUrl) || P.baseUrl || '').replace(/\/+$/, '');
  }
  function modelsOf(P, profile) {
    const m = profile && profile.model ? String(profile.model).trim() : '';
    return m ? [m] : (P.models || []).slice();
  }
  function hasKey() {
    const p = activeProfile();
    if (!p) return false;
    const P = providerOf(p);
    if (!P) return false;
    if (P.keyless) return true;
    return String(p.apiKey || '').length >= 8;
  }
  function isReady() {
    return readConfig().profiles.some((p) => p.ok);
  }

  /* setKey conserva el comportamiento histórico: se deduce el proveedor por
     el prefijo de la clave y se deja como perfil activo pendiente de prueba. */
  function setKey(v) {
    const key = String(v || '').trim();
    const id = detectId(key);
    const c = readConfig();
    const prev = c.profiles.find((p) => p.provider === id) || {};
    const prof = Object.assign({}, prev, {
      id: prev.id || 'p' + Date.now().toString(36),
      provider: id, apiKey: key, ok: false, ms: 0, error: '', checkedAt: Date.now(),
    });
    c.profiles = c.profiles.filter((p) => p.id !== prof.id).concat([prof]);
    c.activeId = prof.id;
    writeConfig(c);
    store.set(KEY_STORE, key);
    store.del(LEGACY_KEY_STORE);
    clearCache();
  }

  function clearKey() {
    store.del(KEY_STORE);
    store.del(LEGACY_KEY_STORE);
    store.del(CONFIG_STORE);
    clearCache();
  }

  function maskedKey() {
    const p = activeProfile();
    const k = p ? String(p.apiKey || '') : '';
    if (!k) return '';
    return k.length <= 10 ? '••••' : `${k.slice(0, 4)}…${k.slice(-4)}`;
  }

  function providerId() {
    const p = activeProfile();
    return p ? p.provider : '';
  }
  function provider() {
    return providerOf(activeProfile());
  }
  function providerName() {
    const P = provider();
    return P ? P.name : '';
  }

  /* Una etiqueta legible: «Ollama · qwen2.5», «OpenAI · gpt-4o-mini». */
  function labelOf(profile) {
    const P = providerOf(profile);
    if (!P) return 'sin proveedor';
    const m = (profile && (profile.model || profile.lastModel)) || '';
    return P.name + (m ? ' · ' + m : '');
  }

  function saveProfile(draft, result) {
    const c = readConfig();
    const id = (draft && draft.id) || 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const prev = c.profiles.find((p) => p.id === id) || {};
    const prof = Object.assign({}, prev, {
      id,
      provider: (draft && draft.provider) || prev.provider || 'custom',
      apiKey: draft && draft.apiKey != null ? String(draft.apiKey) : (prev.apiKey || ''),
      baseUrl: draft && draft.baseUrl != null ? String(draft.baseUrl) : (prev.baseUrl || ''),
      model: draft && draft.model != null ? String(draft.model).trim() : (prev.model || ''),
      label: draft && draft.label != null ? String(draft.label) : (prev.label || ''),
      ok: !!(result && result.ok),
      ms: (result && result.ms) || 0,
      lastModel: (result && result.model) || prev.lastModel || '',
      error: (result && result.error) || '',
      checkedAt: Date.now(),
    });
    c.profiles = c.profiles.filter((p) => p.id !== id).concat([prof]);
    c.activeId = id;
    writeConfig(c);
    if (prof.apiKey) store.set(KEY_STORE, prof.apiKey);
    clearCache();
    return prof;
  }

  function removeProfile(id) {
    const c = readConfig();
    c.profiles = c.profiles.filter((p) => p.id !== id);
    if (c.activeId === id) {
      const next = c.profiles.find((p) => p.ok) || c.profiles[0];
      c.activeId = next ? next.id : '';
    }
    writeConfig(c);
    if (!c.profiles.length) store.del(KEY_STORE);
    clearCache();
  }

  function activate(id) {
    const c = readConfig();
    if (!c.profiles.some((p) => p.id === id)) return false;
    c.activeId = id;
    writeConfig(c);
    clearCache();
    return true;
  }

  /* -------------------------------- Caché --------------------------------- */

  let cache = null;
  function loadCache() {
    if (cache) return cache;
    cache = {};
    try {
      const raw = store.get(CACHE_STORE);
      if (raw) cache = JSON.parse(raw) || {};
    } catch (e) { cache = {}; }
    return cache;
  }
  function saveCache() {
    try {
      const keys = Object.keys(cache);
      if (keys.length > 40) keys.slice(0, keys.length - 40).forEach((k) => delete cache[k]);
      store.set(CACHE_STORE, JSON.stringify(cache));
    } catch (e) { /* sin espacio: se sigue en memoria */ }
  }
  function cacheGet(k) {
    const c = loadCache()[k];
    if (!c) return null;
    if (Date.now() > c.exp) { delete loadCache()[k]; saveCache(); return null; }
    return c.v;
  }
  function cacheSet(k, v, ttlMs) {
    loadCache()[k] = { v, exp: Date.now() + ttlMs };
    saveCache();
  }
  function clearCache() {
    cache = {};
    store.del(CACHE_STORE);
  }

  /* ------------------------------ Presupuesto ------------------------------ */

  const dayId = () => new Date().toISOString().slice(0, 10);

  function budget() {
    let b = null;
    try { b = JSON.parse(store.get(BUDGET_STORE) || 'null'); } catch (e) { b = null; }
    if (!b || b.day !== dayId()) b = { day: dayId(), used: 0 };
    return b;
  }
  const budgetLeft = () => Math.max(0, DAILY_LIMIT - budget().used);
  function spend() {
    const b = budget();
    b.used += 1;
    store.set(BUDGET_STORE, JSON.stringify(b));
  }

  /* -------------------------- Prompts del Guardián ------------------------- */

  const SYS = `Eres el Ángel Guardián de Seraph Augeo: un sistema que ayuda a las personas a cumplir metas reales.
Tu papel NO es halagar ni castigar: es verificar con criterio y ayudar a que la persona se conozca.
Reglas:
- Español neutro de Latinoamérica, tono sereno, breve, sin emojis, sin sermones.
- Nunca inventes datos del usuario.
- Si la respuesta es vaga, dilo con precisión y explica qué faltaría.
- Devuelve SIEMPRE un único objeto JSON válido, sin texto adicional ni bloques de código.`;

  function promptChallenge({ goal, task, recent }) {
    return `Genera UNA pregunta de verificación para esta tarea concreta.
Debe poder responderse SOLO si la persona realmente la hizo, y ser imposible de responder con generalidades.
Máximo 22 palabras. Sin numeración. Sin comillas.

META: ${goal.title}
ÁREA: ${goal.area}${goal.why ? `\nMOTIVO DECLARADO: ${goal.why}` : ''}
HITO: ${task.milestone || 'sin hito'}
TAREA: ${task.title} (${task.estMinutes} min, impacto ${task.impact}/5)
${recent && recent.length ? `ÚLTIMAS RESPUESTAS (no repitas el enfoque): ${recent.slice(-3).join(' | ')}` : ''}

Devuelve JSON exacto:
{"question":"...","lookingFor":["señal1","señal2","señal3"],"focus":"qué intenta comprobar"}`;
  }

  function promptVerdict({ goal, task, answer, evidence, elapsedSec, estMinutes, recent }) {
    return `Evalúa si esta persona realmente completó la tarea. Sé exigente pero justo.
No premies textos genéricos. Sí premia detalles verificables (números, nombres, obstáculos concretos, decisiones).

META: ${goal.title}
ÁREA: ${goal.area}
TAREA: ${task.title} (${estMinutes} min estimados, impacto ${task.impact}/5)
EVIDENCIA DECLARADA: ${['nada', 'nota/archivo/captura', 'resultado visible o testigo'][evidence] || 'nada'}
TIEMPO REAL DEDICADO: ${Math.round((elapsedSec || 0) / 60)} minutos
RESPUESTA DEL USUARIO: "${answer}"
${recent && recent.length ? `RESPUESTAS ANTERIORES (detecta copias): ${recent.slice(-3).map((r) => `"${r}"`).join(' | ')}` : ''}

Criterios para "score" (0-100): 0-29 genérico o incoherente; 30-54 vago pero creíble; 55-79 específico; 80-100 específico y coherente con tiempo y evidencia.

Devuelve JSON exacto:
{"score":0,"specific":true,"coherent":true,"depth":"vago|aceptable|rico","feedback":"máx 18 palabras, útil y honesto","nextQuestion":"una pregunta concreta para la próxima verificación","tags":["..."]}`;
  }

  function promptDiagnose({ goals, stats, week }) {
    return `Haz un diagnóstico breve del progreso de esta persona y propón 3 acciones concretas.
No inventes datos. Si los datos son escasos, dilo.

METAS ACTIVAS: ${goals.length ? goals.map((g) => `${g.title} (${g.pct}% completado, ${g.daysLeft} días restantes)`).join(' | ') : 'ninguna'}
ÁREA MÁS DESCUIDADA: ${stats.weakestArea || 'sin datos'}
CONFIANZA DEL OJO: ${stats.trust}/100
XP VERIFICADO: ${stats.verifiedXp}
TAREAS VERIFICADAS: ${stats.verified}
REGISTROS DUDOSOS: ${stats.flagged}
CONSTANCIA 14 DÍAS: ${stats.constancy}
ESTA SEMANA: ${week.tasks} tareas, ${week.xp} XP, racha ${week.streak} días

Devuelve JSON exacto:
{"headline":"máx 10 palabras","diagnosis":"2 frases, directo al punto","risks":["riesgo1","riesgo2"],"actions":[{"title":"...","why":"..."},{"title":"...","why":"..."},{"title":"...","why":"..."}]}`;
  }

  function promptSuggest({ goals, pending, trust }) {
    return `Elige la siguiente tarea más útil para hoy entre estas pendientes y justifica en una frase.
META: ${goals.map((g) => g.title).join(' | ')}
CONFIANZA: ${trust}/100
PENDIENTES: ${pending.map((t, i) => `${i + 1}. ${t.title} (${t.estMinutes} min, impacto ${t.impact}/5, meta: ${t.goal})`).join(' | ')}

Devuelve JSON exacto:
{"index":1,"reason":"una frase de por qué esa y no otra"}`;
  }

  /* ------------------------------ Validadores ------------------------------ */

  const isStr = (v, max = 400) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  const isNum = (v) => typeof v === 'number' && isFinite(v);

  const validateChallenge = (d) => isStr(d.question, 300) && Array.isArray(d.lookingFor);
  const validateVerdict = (d) => isNum(d.score) && d.score >= 0 && d.score <= 100 && isStr(d.feedback, 320);
  const validateDiagnose = (d) => isStr(d.headline, 160) && isStr(d.diagnosis, 600) && Array.isArray(d.actions);
  const validateSuggest = (d) => isNum(d.index) && d.index >= 1;

  /* ------------------------------ Adaptadores ------------------------------ */

  /* Cada tipo de API sabe construir su URL, sus cabeceras, su cuerpo y de
     dónde sacar el texto. Todo lo demás es común a todos los proveedores. */
  const KINDS = {
    gemini: {
      url: (P, profile, model) =>
        baseOf(P, profile) + '/models/' + encodeURIComponent(model) + ':generateContent',
      headers: (P, profile) => ({ 'Content-Type': 'application/json', 'x-goog-api-key': profile.apiKey || '' }),
      body: (P, profile, sys, prompt, temperature, maxTokens, model) => ({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens || 700,
          responseMimeType: 'application/json',
        },
      }),
      text: (j) => {
        const cand = j && j.candidates && j.candidates[0];
        const parts = cand && cand.content && cand.content.parts;
        return Array.isArray(parts) ? parts.map((p) => p.text || '').join('') : '';
      },
      error: (j) => (j && j.error && j.error.message) || '',
    },

    anthropic: {
      url: (P, profile) => baseOf(P, profile) + '/messages',
      headers: (P, profile) => ({
        'Content-Type': 'application/json',
        'x-api-key': profile.apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      }),
      body: (P, profile, sys, prompt, temperature, maxTokens, model) => ({
        model: model,
        max_tokens: maxTokens || 700,
        temperature: temperature,
        system: sys,
        messages: [{ role: 'user', content: prompt }],
      }),
      text: (j) => (j && Array.isArray(j.content) ? j.content.map((c) => c.text || '').join('') : ''),
      error: (j) => (j && j.error && j.error.message) || '',
    },

    openai: {
      url: (P, profile) => baseOf(P, profile) + '/chat/completions',
      headers: (P, profile) => {
        const h = { 'Content-Type': 'application/json' };
        const k = String(profile.apiKey || '').trim();
        if (k) h.Authorization = 'Bearer ' + k;
        if (P.id === 'openrouter') h['X-Title'] = 'Seraph Augeo';
        return h;
      },
      /* Sin response_format: no todos los modelos lo aceptan. El JSON se
         extrae igual, aunque venga envuelto en un bloque de código. */
      body: (P, profile, sys, prompt, temperature, maxTokens, model) => ({
        model: model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt },
        ],
        temperature: temperature,
        max_tokens: maxTokens || 700,
        stream: false,
      }),
      text: (j) => {
        const choice = j && j.choices && j.choices[0];
        return (choice && choice.message && choice.message.content) || '';
      },
      error: (j) => (j && j.error && j.error.message) || '',
    },
  };

  function kindOf(P) { return KINDS[P.kind] || KINDS.openai; }

  /* --------------------------- Llamada a la API ---------------------------- */

  function httpError(status, detail) {
    const e = new Error('http ' + status);
    e.status = status;
    e.reason = status === 429 ? 'cuota'
      : status === 402 ? 'credito'
        : status === 404 ? 'modelo-inexistente'
          : (status === 400 || status === 401 || status === 403) ? 'clave-rechazada'
            : 'http-' + status;
    e.detail = detail || '';
    return e;
  }

  /* En escritorio, el proceso principal hace la petición: no hay CORS y las
     claves tampoco tocan el motor del navegador. En navegador, `fetch`. */
  function bridge() {
    return (typeof window !== 'undefined' && window.seraphDesktop && typeof window.seraphDesktop.httpJson === 'function')
      ? window.seraphDesktop.httpJson : null;
  }

  async function postJson(url, headers, body, timeoutMs) {
    const payload = JSON.stringify(body);
    const br = bridge();
    if (br) {
      const r = await br({ url: url, method: 'POST', headers: headers, body: payload, timeoutMs: timeoutMs });
      if (!r || !r.status) {
        const e = new Error('red');
        e.reason = (r && r.error) || 'cors-o-red';
        throw e;
      }
      return {
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        json: async () => JSON.parse(r.text || '{}'),
      };
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      return await fetch(url, { method: 'POST', headers: headers, body: payload, signal: ctl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function getJson(url, headers, timeoutMs) {
    const br = bridge();
    if (br) {
      const r = await br({ url: url, method: 'GET', headers: headers, body: '', timeoutMs: timeoutMs });
      if (!r || !r.status) return { ok: false, status: 0, json: async () => ({}) };
      return {
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        json: async () => JSON.parse(r.text || '{}'),
      };
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      return await fetch(url, { method: 'GET', headers: headers, signal: ctl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function callModel(P, profile, model, prompt, temperature, maxTokens) {
    const K = kindOf(P);
    const url = K.url(P, profile, model);
    let res;
    try {
      res = await postJson(url, K.headers(P, profile), K.body(P, profile, SYS, prompt, temperature, maxTokens, model), P.timeoutMs);
    } catch (e) {
      const err = new Error('red');
      if (e && e.reason && e.reason !== 'red') { err.reason = e.reason; err.detail = e.detail || ''; throw err; }
      err.reason = e && e.name === 'AbortError' ? 'timeout' : 'cors-o-red';
      throw err;
    }

    if (!res.ok) {
      let detail = '';
      try {
        const j = await res.json();
        detail = K.error(j);
      } catch (e) { /* cuerpo no JSON */ }
      throw httpError(res.status, detail);
    }

    const j = await res.json();
    const text = K.text(j);
    if (!text || !text.trim()) {
      const e = new Error('vacía');
      e.reason = 'respuesta-vacia';
      throw e;
    }

    const clean = text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
    const from = clean.indexOf('{');
    const to = clean.lastIndexOf('}');
    if (from < 0 || to < from) {
      const e = new Error('json');
      e.reason = 'json-invalido';
      throw e;
    }
    try {
      return JSON.parse(clean.slice(from, to + 1));
    } catch (err) {
      const e = new Error('json');
      e.reason = 'json-invalido';
      throw e;
    }
  }

  /* Si un modelo local no se indica, se pregunta al propio servidor cuál
     tiene cargado. Así «no cargó el modelo» deja de ser una adivinanza. */
  async function discoverModel(P, profile) {
    if (!P.local || (profile.model || '').trim()) return '';
    const base = baseOf(P, profile);
    if (!base) return '';
    try {
      const h = kindOf(P).headers(P, profile);
      const res = await getJson(base + '/models', h, 5000);
      if (!res.ok) return '';
      const j = await res.json();
      const arr = (j && (j.data || j.models)) || [];
      const id = arr.length && (arr[0].id || arr[0].name || arr[0].model) || '';
      return String(id || '');
    } catch (e) { return ''; }
  }

  /* ------------------------------- Tipos ---------------------------------- */

  const SPECS = {
    challenge: {
      prompt: promptChallenge, validate: validateChallenge, temperature: 0.35, maxTokens: 400,
      cache: true, ttl: 6 * 60 * 60 * 1000,
      cacheKey: (p) => `${(p.goal && p.goal.title) || ''}|${(p.task && p.task.title) || ''}`,
    },
    verdict: {
      prompt: promptVerdict, validate: validateVerdict, temperature: 0.15, maxTokens: 500, cache: false,
    },
    diagnose: {
      prompt: promptDiagnose, validate: validateDiagnose, temperature: 0.4, maxTokens: 800,
      cache: true, ttl: 30 * 60 * 1000,
      cacheKey: (p) => JSON.stringify([(p.goals || []).map((g) => [g.title, g.pct]), p.stats && p.stats.trust, p.week && p.week.tasks]),
    },
    suggest: {
      prompt: promptSuggest, validate: validateSuggest, temperature: 0.3, maxTokens: 300, cache: false,
    },
  };

  /* ------------------------------ Diagnóstico ------------------------------ */

  function friendly(reason, P) {
    if (P && P.local && (reason === 'cors-o-red' || reason === 'sin-conexion')) {
      return 'No se pudo conectar con el modelo local. Comprueba que esté encendido y sirviendo en ' + (P.baseUrl || 'su dirección') + '.';
    }
    if (reason === 'sin-conexion') return 'Nadie escucha en esa dirección: el servidor está apagado o el puerto no es ese.';
    return MESSAGES[reason] || String(reason || '');
  }

  /* Prueba real contra un perfil concreto, sin guardarlo. */
  async function testProfile(profile) {
    const P = providerOf(profile);
    if (!P) return { ok: false, reason: 'sin-clave', status: null, ms: 0, model: '', provider: '', error: MESSAGES['sin-clave'] };
    if (!baseOf(P, profile)) {
      return { ok: false, reason: 'url-invalida', status: null, ms: 0, model: '', provider: P.name, error: 'Escribe la URL del servidor (por ejemplo http://localhost:11434/v1).' };
    }
    if (!P.keyless && String(profile.apiKey || '').length < 8) {
      return { ok: false, reason: 'sin-clave', status: null, ms: 0, model: '', provider: P.name, error: 'Falta la clave de ' + P.name + '.' };
    }
    if (budgetLeft() <= 0) {
      return { ok: false, reason: 'presupuesto', status: null, ms: 0, model: '', provider: P.name, error: MESSAGES.presupuesto };
    }

    const t0 = Date.now();
    let models = modelsOf(P, profile);
    const auto = await discoverModel(P, profile);
    if (auto) models = [auto];
    if (!models.length) {
      return { ok: false, reason: 'modelo-inexistente', status: null, ms: 0, model: '', provider: P.name, error: 'Escribe el nombre del modelo que vas a usar.' };
    }

    for (const model of models) {
      try {
        const out = await callModel(P, profile, model, 'Devuelve exactamente este JSON: {"ok":true}', 0, 40);
        spend();
        const ms = Date.now() - t0;
        if (out && out.ok === true) return { ok: true, reason: null, status: 200, ms, model, provider: P.name, error: '' };
        return { ok: false, reason: 'json-invalido', status: 200, ms, model, provider: P.name, error: 'El modelo respondió algo distinto de {"ok":true}.' };
      } catch (e) {
        spend();
        const ms = Date.now() - t0;
        if (e.reason === 'modelo-inexistente' || e.reason === 'json-invalido') continue;
        const reason = e.reason || 'red';
        return { ok: false, reason, status: e.status || null, ms, model, provider: P.name, error: e.detail || friendly(reason, P) };
      }
    }
    return { ok: false, reason: 'modelo-inexistente', status: 404, ms: Date.now() - t0, model: models[0], provider: P.name, error: MESSAGES['modelo-inexistente'] };
  }

  /* Prueba del perfil activo: además deja anotado si respondió o no. */
  async function probe() {
    const profile = activeProfile();
    if (!profile) return { ok: false, reason: 'sin-clave', status: null, ms: 0, model: '', provider: '', error: MESSAGES['sin-clave'] };
    const r = await testProfile(profile);
    const P = providerOf(profile);
    if (P) {
      const c = readConfig();
      const saved = c.profiles.find((p) => p.id === profile.id);
      if (saved) {
        saved.ok = !!r.ok; saved.ms = r.ms || 0; saved.error = r.error || '';
        saved.lastModel = r.model || saved.lastModel || ''; saved.checkedAt = Date.now();
        writeConfig(c);
      }
    }
    return r;
  }

  /* Prueba un borrador (sin guardar) y, si funciona, lo guarda como perfil. */
  async function connect(draft) {
    const profile = {
      id: (draft && draft.id) || '',
      provider: (draft && draft.provider) || 'custom',
      apiKey: (draft && draft.apiKey) || '',
      baseUrl: (draft && draft.baseUrl) || '',
      model: (draft && draft.model) || '',
    };
    const r = await testProfile(profile);
    const saved = saveProfile(profile, r);
    return Object.assign({}, r, { profile: saved });
  }

  function status() {
    const c = readConfig();
    const p = activeProfile();
    return {
      ready: c.profiles.some((x) => x.ok),
      hasKey: hasKey(),
      provider: p ? p.provider : '',
      providerName: p ? labelOf(p) : '',
      ok: !!(p && p.ok),
      error: (p && p.error) || '',
      ms: (p && p.ms) || 0,
      masked: maskedKey(),
      profiles: c.profiles.map((x) => ({
        id: x.id, provider: x.provider, name: labelOf(x), ok: !!x.ok, ms: x.ms || 0,
        error: x.error || '', active: !!(p && p.id === x.id), local: !!(providerOf(x) || {}).local,
      })),
      activeId: p ? p.id : '',
      budgetLeft: budgetLeft(),
    };
  }

  /* --------------------------------- API ---------------------------------- */

  async function ask(kind, payload) {
    const spec = SPECS[kind];
    if (!spec) return { ok: false, reason: 'tipo-desconocido' };
    const profile = activeProfile();
    const P = providerOf(profile);
    if (!P || !hasKey()) return { ok: false, reason: 'sin-clave' };

    const data = payload || {};
    const cacheId = P.id + ':' + (baseOf(P, profile) || '') + ':' + ((profile && profile.model) || '');
    const key = spec.cache ? `${kind}:${cacheId}:${spec.cacheKey(data)}` : '';
    if (key) {
      const hit = cacheGet(key);
      if (hit) return { ok: true, data: hit, provider: hit.provider || '', cached: true, ms: 0 };
    }

    const prompt = spec.prompt(data);
    const attempts = [];
    let models = modelsOf(P, profile);
    if (P.local && !(profile.model || '').trim()) {
      const auto = await discoverModel(P, profile);
      if (auto) models = [auto];
    }

    for (const model of models) {
      if (budgetLeft() <= 0) return { ok: false, reason: 'presupuesto', attempts };
      const t0 = Date.now();
      let out;
      try {
        out = await callModel(P, profile, model, prompt, spec.temperature, spec.maxTokens);
      } catch (e) {
        spend();
        attempts.push({ model, reason: e.reason || 'red', ms: Date.now() - t0, detail: e.detail || '' });
        if (e.reason === 'clave-rechazada' || e.reason === 'cuota' || e.reason === 'credito') break;
        continue;
      }
      spend();
      const ms = Date.now() - t0;
      if (!spec.validate(out)) {
        attempts.push({ model, reason: 'json-invalido', ms });
        continue;
      }
      const value = Object.assign({}, out, { provider: `${P.name} · ${model}` });
      if (key) cacheSet(key, value, spec.ttl);
      return { ok: true, data: value, provider: value.provider, ms, attempts };
    }

    return { ok: false, reason: attempts.length ? attempts[attempts.length - 1].reason : 'sin-respuesta', attempts };
  }

  A.AIClient = {
    PROVIDERS,
    LIST,
    /* Modelos del proveedor activo (o los de Gemini si aún no hay perfil). */
    get MODELS() {
      const p = activeProfile();
      const P = providerOf(p) || PROVIDERS.gemini;
      const models = modelsOf(P, p || {});
      return models.length ? models : (PROVIDERS.gemini.models || []).slice();
    },
    hasKey, setKey, clearKey, maskedKey,
    isReady, connect, probe, testProfile, saveProfile, removeProfile, activate, status,
    providerId, provider, providerName, providerLabel: () => (activeProfile() ? labelOf(activeProfile()) : ''),
    activeProfile, detectProvider: detectId,
    budgetLeft, ask, clearCache,
    messages: MESSAGES,
  };

  /* Alias antiguo: algunos módulos lo nombraban así. */
  A.Gemini = A.AIClient;

})(window.Seraph = window.Seraph || {});
