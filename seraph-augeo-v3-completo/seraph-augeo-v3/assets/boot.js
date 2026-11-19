/* ============================================================================
   Cargador de módulos de Seraph Augeo v3.
   Inyecta, uno tras otro y en el orden de assets/manifest.js, los scripts de la
   app y después arranca el núcleo (Seraph.start). Así el HTML sólo declara
   engine + sigil + manifest + boot: el resto se carga de forma dinámica.
   ============================================================================ */
(function () {
  'use strict';

  const BASE = './assets/';
  /* Sello de versión: obliga al navegador a pedir los módulos nuevos cuando
     cambia el diseño, sin tocar el nombre de los archivos. Súbelo al publicar. */
  const VERSION = '3';
  const list = window.SERAPH_MODULES || [];

  function fail(msg) {
    console.error('[seraph] ' + msg);
    const p = document.createElement('p');
    p.style.cssText = 'padding:24px;color:#e8e2d5;font-family:Georgia,serif';
    p.textContent = 'No se pudo cargar Seraph Augeo: ' + msg;
    document.body.appendChild(p);
  }

  function loadOne(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = BASE + src + '?v=' + VERSION;
      el.async = false;
      el.onload = () => resolve(src);
      el.onerror = () => reject(new Error('no se pudo cargar assets/' + src));
      document.head.appendChild(el);
    });
  }

  async function boot() {
    if (!window.SeraphEngine) return fail('falta el motor (assets/engine.js).');
    if (!window.SeraphSigil) return fail('falta el sello (assets/sigil.js).');
    if (!list.length) return fail('el manifiesto de módulos está vacío.');

    for (const src of list) await loadOne(src);

    const app = window.Seraph;
    if (!app || typeof app.start !== 'function') return fail('los módulos no se registraron.');
    app.start();
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('seraph:ready'));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
