/* ============================================================================
   views/guardian — Vista del Guardián y diagnóstico rápido
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const $ = A.$;
  const S = A.S;
  const UI = A.UI;
  const esc = A.esc;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const closeModal = (...args) => A.closeModal(...args);
  const ico = (...args) => A.ico(...args);
  const localDiagnosis = (...args) => A.localDiagnosis(...args);
  const openModal = (...args) => A.openModal(...args);
  const stat = (...args) => A.stat(...args);


  /* -------------------------------- Guardián ------------------------------ */
  function viewGuardian() {
    const h = UI.health || (S.ai && S.ai.health) || null;
    const diag = UI.diagLocal || localDiagnosis();
    UI.diagLocal = diag;
    const aiDiag = UI.lastDiag;

    return `<div class="head">
        <p class="eyebrow"><i class="diamond"></i> ${UI.online ? 'IA en línea' : 'Modo local'}</p>
        <h1 class="title">El <em>Ángel Guardián</em></h1>
        <p class="sub">No adivina: mide. Pregunta sólo lo que puede comprobar y, si una fuente falla, pasa a la siguiente sin que lo notes.</p>
      </div>

      <section class="card guardian-card ornate">
        <div class="row"><span class="chip chip-ai">${ico('cpu', 12)} ${UI.online === true ? 'EN LÍNEA' : UI.online === false ? 'LOCAL' : 'SIN PROBAR'}</span>
          <span class="spacer"></span>
          <button class="btn btn-sm" data-act="probeAI">${ico('refresh', 13)} Probar</button></div>
        <p class="small" style="margin:12px 0 0;color:#d6cff0">${UI.online
          ? 'El Guardián responde desde tu propio navegador, con tu clave de Gemini u OpenRouter. Sin servidor de por medio.'
          : 'El Guardián no está disponible ahora. La app usa su motor local: mismas fórmulas, preguntas derivadas de tu meta, sin llamadas externas.'}</p>
        ${h && h.providers && h.providers.length ? `<div class="prov-list">
          ${h.providers.map((p) => `<div class="prov">
            <span class="prov-dot ${p.status === 'ok' ? 'ok' : p.status === 'cooldown' ? 'cool' : p.status === 'fallando' ? 'fail' : ''}"></span>
            <span class="prov-id">${esc(p.id)}</span>
            <span class="prov-ms">${p.ms ? p.ms + ' ms' : (p.status || '')}</span>
          </div>`).join('')}
        </div>` : `<p class="tiny dim mt-12">${h ? 'Sin respuesta de la IA: revisa tu clave en Ajustes.' : 'Pulsa «Probar» para consultar si la IA responde.'}</p>`}
        ${h && h.budget !== undefined ? `<p class="tiny dim mt-8">Presupuesto diario restante: <b style="color:var(--gold-2)">${h.budget}</b> llamadas.</p>` : ''}
        ${h && h.error ? `<p class="tiny mt-8" style="color:var(--rojo)">${esc(h.error)}</p>` : ''}
        <p class="tiny dim mt-8">Tu clave de IA se guarda sólo en este navegador y se envía directamente al proveedor. No hay servidor de la app.</p>
      </section>

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Diagnóstico</h3>
          <span class="sec-note">${aiDiag && !aiDiag.local ? 'Del Guardián' : 'Del motor local'}</span></div>
        <div class="card">
          <div class="diagnosis">
            <h3 class="diag-headline">${esc(aiDiag ? aiDiag.headline : diag.headline)}</h3>
            <p class="small" style="margin:0;color:var(--muted)">${esc(aiDiag ? aiDiag.diagnosis : diag.diagnosis)}</p>
          </div>
          <div class="divider"><i></i></div>
          <div class="stat-label">Riesgos</div>
          <div class="tasks mt-8">
            ${(aiDiag ? aiDiag.risks : diag.risks).map((r) => `<div class="quest">
              <div class="quest-mark" style="border-color:rgba(255,113,134,.4);color:var(--rojo)">!</div>
              <div class="quest-body"><div class="quest-title" style="font-size:12.5px">${esc(r)}</div></div>
            </div>`).join('')}
          </div>
          <div class="stat-label mt-16">Qué hacer ahora</div>
          <div class="tasks mt-8">
            ${(aiDiag ? aiDiag.actions : diag.actions).map((a, i) => `<div class="quest">
              <div class="quest-mark" style="color:var(--gold-2);border-color:var(--line-3)">${i + 1}</div>
              <div class="quest-body"><div class="quest-title" style="font-size:12.5px">${esc(a.title)}</div>
                <div class="quest-sub">${esc(a.why || '')}</div></div>
            </div>`).join('')}
          </div>
          <div class="row mt-16" style="gap:8px">
            <button class="btn btn-violeta" style="flex:1" data-act="askDiagnose" ${UI.busy === 'diag' ? 'disabled' : ''}>
              ${UI.busy === 'diag' ? `<span class="typing"><i></i><i></i><i></i></span> Consultando` : `${ico('eye', 15)} Diagnóstico del Guardián`}
            </button>
            <button class="btn btn-ghost" data-act="goMetas">${ico('target', 15)}</button>
          </div>
          ${aiDiag && aiDiag.provider ? `<p class="tiny dim mt-8">Respondió <span class="mono">${esc(aiDiag.provider)}</span>${aiDiag.cached ? ' · en caché' : ''}</p>` : ''}
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><h3 class="sec-title">Preguntas que te ha hecho</h3><span class="sec-note">${S.memory.length} guardadas</span></div>
        ${S.memory.length ? `<div class="tasks">
          ${S.memory.slice(0, 6).map((m) => `<div class="quest">
            <div class="quest-mark" style="border-color:rgba(167,139,250,.4);color:var(--violeta)">?</div>
            <div class="quest-body"><div class="quest-title" style="font-size:12.5px;font-weight:450;line-height:1.45">${esc(m.text)}</div>
              <div class="quest-sub">${new Date(m.t).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</div></div>
          </div>`).join('')}
        </div>` : '<p class="small dim">Aún no hay preguntas. Aparecerán cuando verifiques tu primera tarea.</p>'}
      </section>

      <div class="note mt-24">${ico('info', 12)} <b>Cómo decide.</b> El Guardián aporta una señal de 0 a 100 sobre tu respuesta; esa señal pesa el 45% y el resto es matemática fija (evidencia, detalle, tiempo, historial). Si el Guardián calla, la app aplica el 100% de la fórmula local. Nunca se inventa una recompensa: la app recalcula todo en tu dispositivo.</div>`;
  }


  /* ----------------------------- Diagnóstico rápido ----------------------- */
  function openDiagnose() {
    const d = localDiagnosis();
    openModal(`
      <p class="kicker">Diagnóstico local</p>
      <h2 class="modal-title" style="margin-top:6px">${esc(d.headline)}</h2>
      <p class="modal-sub">${esc(d.diagnosis)}</p>
      <div class="stat-label">Riesgos</div>
      <div class="tasks mt-8">${d.risks.map((r) => `<div class="quest"><div class="quest-mark" style="color:var(--rojo);border-color:rgba(255,113,134,.4)">!</div>
        <div class="quest-body"><div class="quest-title" style="font-size:12.5px">${esc(r)}</div></div></div>`).join('')}</div>
      <div class="stat-label mt-16">Qué hacer</div>
      <div class="tasks mt-8">${d.actions.map((a, i) => `<div class="quest"><div class="quest-mark" style="color:var(--gold-2)">${i + 1}</div>
        <div class="quest-body"><div class="quest-title" style="font-size:12.5px">${esc(a.title)}</div>
        <div class="quest-sub">${esc(a.why)}</div></div></div>`).join('')}</div>
      <div class="row mt-16" style="gap:8px">
        <button class="btn btn-ghost" data-act="closeModal">Cerrar</button>
        <button class="btn btn-violeta" style="flex:1" data-act="goGuardianDiag">${ico('eye', 14)} Ver con el Guardián</button>
      </div>
    `);
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.viewGuardian = viewGuardian;
  A.openDiagnose = openDiagnose;

})(window.Seraph = window.Seraph || {});
