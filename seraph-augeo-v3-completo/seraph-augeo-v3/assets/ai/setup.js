/* ============================================================================
   ai/setup — La puerta de la inteligencia
   Pantalla que se interpone antes de entrar: elige proveedor, pega la clave o
   apunta a un modelo local, y sólo se pasa si una llamada real respondió.
   Sirve igual como paso del onboarding y como modal desde Ajustes.
   ============================================================================ */
(function (A) {
  'use strict';

  const $ = A.$;
  const UI = A.UI;
  const doc = A.doc;
  const esc = A.esc;
  const ico = (...a) => A.ico(...a);
  const G = () => A.AIClient;

  const CLOUD = () => G().LIST.filter((p) => !p.local && p.id !== 'custom');
  const LOCAL = () => G().LIST.filter((p) => p.local);

  /* -------------------------------- Estado -------------------------------- */

  function st() {
    if (!UI.aiSetup) {
      UI.aiSetup = { provider: 'gemini', apiKey: '', baseUrl: '', model: '', busy: false, result: null };
    }
    return UI.aiSetup;
  }

  function reset(pick) {
    const s = st();
    s.provider = pick || providerDef().id;
    s.baseUrl = '';
    s.model = '';
    s.apiKey = '';
    s.result = null;
    s.busy = false;
  }

  function providerDef() {
    const s = st();
    return G().PROVIDERS[s.provider] || G().PROVIDERS.custom;
  }

  function draft() {
    const s = st();
    const P = providerDef();
    return {
      id: s.editingId || '',
      provider: P.id,
      apiKey: P.keyless ? '' : String(s.apiKey || '').trim(),
      baseUrl: String(s.baseUrl || '').trim(),
      model: String(s.model || '').trim(),
    };
  }

  function refresh() {
    if (UI.onb && UI.onb.step === 'ai') { A.render(); return; }
    if (doc.querySelector('#aiSetupModal')) open();
  }

  /* ------------------------------- Markup --------------------------------- */

  function provChip(P) {
    const s = st();
    const on = s.provider === P.id;
    return `<button class="prov ${on ? 'on' : ''}" data-act="aiPick" data-p="${P.id}" title="${esc(P.docs || P.name)}">
      <span class="prov-name">${esc(P.name)}</span>
      <span class="prov-tag">${P.local ? 'local' : P.keyless ? 'sin clave' : 'nube'}</span>
    </button>`;
  }

  function statusLine() {
    const s = st();
    if (s.busy) {
      return `<div class="ai-result wait"><span class="ai-spin"></span><b>Probando de verdad…</b>
        <p>Llamando al proveedor. Un modelo local puede tardar hasta un minuto en cargar.</p></div>`;
    }
    const r = s.result;
    if (!r) return '';
    if (r.ok) {
      return `<div class="ai-result ok">${ico('shieldCheck', 16)}<b>Conectado · ${esc(r.provider || '')}${r.model ? ' · ' + esc(r.model) : ''}</b>
        <p>Respondió en ${r.ms || 0} ms. Ya puedes entrar.</p></div>`;
    }
    return `<div class="ai-result err">${ico('info', 16)}<b>No respondió</b>
      <p>${esc(r.error || 'Revisa la clave, la URL y el nombre del modelo.')}${r.status ? ` <span class="tiny dim">(HTTP ${r.status})</span>` : ''}</p></div>`;
  }

  function savedList() {
    const list = G().status().profiles;
    if (!list.length) return '';
    return `<div class="field" style="margin-top:18px">
      <label>Proveedores guardados</label>
      <div class="ai-saved">
        ${list.map((p) => `<div class="ai-saved-row ${p.active ? 'on' : ''}">
          <span class="dot" style="background:${p.ok ? 'var(--verde)' : 'var(--rojo)'}"></span>
          <span class="ai-saved-name">${esc(p.name)}<span class="tiny dim">${p.ok ? ` · ${p.ms} ms` : (p.error ? ' · ' + esc(p.error) : ' · sin probar')}</span></span>
          ${p.active ? '<span class="tiny gold">activo</span>' : `<button class="linkbtn" data-act="aiUse" data-id="${p.id}">usar</button>`}
          <button class="linkbtn danger" data-act="aiDel" data-id="${p.id}" aria-label="Borrar ${esc(p.name)}">×</button>
        </div>`).join('')}
      </div>
    </div>`;
  }

  function form() {
    const s = st();
    const P = providerDef();
    const needsKey = !P.keyless;
    const showUrl = P.local || P.id === 'custom';
    const ready = G().isReady();
    const models = (P.models || []).slice();

    return `
      <div class="field">
        <label>Proveedor</label>
        <p class="ai-group">En la nube</p>
        <div class="prov-grid">${CLOUD().map(provChip).join('')}</div>
        <p class="ai-group">En tu equipo, sin clave</p>
        <div class="prov-grid">${LOCAL().map(provChip).join('')}${provChip(G().PROVIDERS.custom)}</div>
      </div>

      ${needsKey ? `<div class="field">
        <label>Clave de ${esc(P.name)}</label>
        <input class="input" id="aiKeyInput" type="password" autocomplete="off" spellcheck="false"
          placeholder="${esc(P.keyHint || 'pega tu clave')}" value="${esc(s.apiKey)}">
        <p class="hint">Se guarda sólo en este dispositivo. ${P.docs ? `Se consigue en <b>${esc(P.docs)}</b>.` : ''}</p>
      </div>` : `<p class="note">${ico('cpu', 14)} ${esc(P.name)} no usa clave: habla con el servidor que corre en tu equipo. Debe estar encendido y sirviendo antes de probar.</p>`}

      ${showUrl ? `<div class="field">
        <label>Dirección del servidor</label>
        <input class="input" id="aiBaseUrl" type="url" autocomplete="off" spellcheck="false"
          placeholder="${esc(P.baseUrl || 'http://localhost:11434/v1')}" value="${esc(s.baseUrl)}">
        <p class="hint">Debe ser una API compatible con OpenAI (termina en <b>/v1</b>).</p>
      </div>` : ''}

      <div class="field">
        <label>Modelo</label>
        <input class="input" id="aiModel" list="aiModels" autocomplete="off" spellcheck="false"
          placeholder="${esc(models[0] || 'escribe el nombre del modelo')}" value="${esc(s.model)}">
        <datalist id="aiModels">${models.map((m) => `<option value="${esc(m)}"></option>`).join('')}</datalist>
        <p class="hint">${P.local ? 'Si lo dejas vacío, se pregunta al servidor local qué modelo tiene cargado.' : 'Puedes escribir cualquier modelo de tu cuenta, no sólo los sugeridos.'}</p>
      </div>

      ${statusLine()}

      <div class="row wrap" style="gap:8px;margin-top:6px">
        <button class="btn ${ready ? 'btn-ghost' : 'btn-primary'}" data-act="aiTest" ${s.busy ? 'disabled' : ''}>
          ${ico('refresh', 14)} ${s.busy ? 'Probando…' : ready ? 'Probar otro' : 'Probar conexión'}
        </button>
      </div>

      ${savedList()}

      <p class="hint" style="margin-top:12px">
        ${ready ? 'Hay al menos un proveedor que respondió: la puerta está abierta.' : 'No se entra hasta que uno de los proveedores responda de verdad. No se guarda nada en ningún servidor.'}
      </p>`;
  }

  function gateView() {
    st();
    const ready = G().isReady();
    return `<div class="head">
        <p class="eyebrow"><i class="diamond"></i> Paso 1 de 3 · La inteligencia</p>
        <h1 class="title">¿Quién piensa <em>contigo</em>?</h1>
        <p class="sub">El Guardián redacta las preguntas que te obligan a ser concreto. Usa tu propia clave de cualquier proveedor, o un modelo que corra en tu equipo. Sin una IA que responda, la puerta no se abre.</p>
      </div>
      <div class="card ornate">${form()}</div>
      <div class="row mt-16">
        <button class="btn btn-ghost" data-act="onbBack">Atrás</button>
        <button class="btn btn-primary" style="flex:1" data-act="aiContinue" ${ready ? '' : 'disabled'}>
          ${ico('right', 14)} Continuar
        </button>
      </div>`;
  }

  function open() {
    st();
    const ready = G().isReady();
    A.openModal(`
      <div id="aiSetupModal">
        <h2 class="modal-title">La inteligencia</h2>
        <p class="modal-sub">Cualquier proveedor con clave, o un modelo local. Se prueba antes de dar nada por bueno.</p>
        ${form()}
        <button class="btn btn-block mt-16" data-act="closeModal">${ready ? 'Cerrar' : 'Cerrar sin IA'}</button>
      </div>
    `);
  }

  /* ------------------------------- Acciones ------------------------------- */

  function setResult(r) {
    const s = st();
    s.result = r;
    s.busy = false;
    if (r && r.ok) {
      s.apiKey = '';
      if (r.model) s.model = r.model;
      s.editingId = '';
    }
  }

  async function test() {
    const s = st();
    if (s.busy) return;
    const d = draft();
    const P = providerDef();
    if (!P.keyless && d.apiKey.length < 8 && !d.id) {
      s.result = { ok: false, error: 'Escribe la clave de ' + P.name + '.' };
      refresh();
      return;
    }
    if ((P.local || P.id === 'custom') && !d.baseUrl && !P.baseUrl) {
      s.result = { ok: false, error: 'Escribe la dirección del servidor.' };
      refresh();
      return;
    }
    s.busy = true;
    s.result = null;
    refresh();
    let r;
    try {
      r = await G().testProfile(d);
      if (r.ok) G().saveProfile(d, r);
    } catch (e) {
      r = { ok: false, error: 'No se pudo probar: ' + (e && e.message ? e.message : 'error desconocido') };
    }
    setResult(r);
    refresh();
    if (r.ok) A.toast('Conectado. La puerta está abierta.', 'ai');
    else A.toast('No respondió. Revisa los datos y vuelve a probar.', 'err');
  }

  function handle(act, el) {
    const d = (k) => (el ? el.getAttribute(k) : null);
    const s = st();
    switch (act) {
      case 'aiPick': {
        const id = d('data-p');
        if (id && id !== s.provider) reset(id);
        refresh();
        return true;
      }
      case 'aiTest': test(); return true;
      case 'aiContinue': {
        if (!G().isReady()) { A.toast('Primero tiene que responder un proveedor.', 'err'); return true; }
        UI.onb.step = 1;
        A.closeModal();
        A.render();
        return true;
      }
      case 'aiUse': {
        if (G().activate(d('data-id'))) {
          A.toast('Proveedor activo cambiado.', 'info');
          refresh();
        }
        return true;
      }
      case 'aiDel': {
        G().removeProfile(d('data-id'));
        A.toast('Proveedor borrado.', 'info');
        refresh();
        return true;
      }
      case 'openAiSetup': open(); return true;
      default: return false;
    }
  }

  /* Mantiene lo escrito aunque el paso se vuelva a pintar. */
  (function listen() {
    const d = doc;
    if (!d || !d.addEventListener) return;
    d.addEventListener('input', (ev) => {
      const t = ev.target;
      const id = t && t.id;
      if (!id) return;
      const s = st();
      if (id === 'aiKeyInput') s.apiKey = t.value;
      else if (id === 'aiBaseUrl') s.baseUrl = t.value;
      else if (id === 'aiModel') s.model = t.value;
    });
  })();

  A.AISetup = {
    acts: ['aiPick', 'aiTest', 'aiContinue', 'aiUse', 'aiDel', 'openAiSetup'],
    gateView, form, open, handle, refresh, reset,
    get state() { return st(); },
  };

})(window.Seraph = window.Seraph || {});
