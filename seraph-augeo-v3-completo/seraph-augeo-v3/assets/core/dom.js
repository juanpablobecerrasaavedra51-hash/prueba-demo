/* ============================================================================
   core/dom — Utilidades del DOM, formato, iconos y referencias base
   Módulo de Seraph Augeo v3. Lo carga assets/boot.js en el orden de
   assets/manifest.js y se comunica con los demás por el espacio Seraph.
   ============================================================================ */
(function (A) {
  'use strict';



  const E = window.SeraphEngine;
  const sigilSVG = window.SeraphSigil;

  const doc = document;
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const today = () => E.ymd(new Date());
  const fmt = (n) => Number(n || 0).toLocaleString('es-CO');
  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

  function fmtDuration(min) {
    if (!min || min < 1) return 'menos de 1 min';
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  /* -------------------------------- Iconos -------------------------------- */
  const PATHS = {
    home: '<path d="M3 10.6 12 3l9 7.6"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
    gift: '<rect x="3.5" y="9" width="17" height="11.5" rx="1.6"/><path d="M2.8 9h18.4M12 9v11.5"/><path d="M12 9C10 9 7.2 8.4 7.2 6.1A2.6 2.6 0 0 1 12 5.2 2.6 2.6 0 0 1 16.8 6.1C16.8 8.4 14 9 12 9z"/>',
    eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.3"/>',
    sparkles: '<path d="M12 3.2 13.6 8 18.4 9.6 13.6 11.2 12 16 10.4 11.2 5.6 9.6 10.4 8z"/><path d="M18.4 15.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/><path d="M5.6 3.4l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6L3.4 5.6l1.6-.6z"/>',
    check: '<path d="M4.5 12.5 9.3 17.3 19.5 6.8"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    down: '<path d="M5 9l7 7 7-7"/>',
    coin: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2v9.6M14.6 9.4c-.5-.7-1.4-1.1-2.6-1.1-1.5 0-2.5.7-2.5 1.8 0 1.2 1 1.6 2.6 1.9 1.6.3 2.6.8 2.6 2 0 1.1-1.1 1.8-2.7 1.8-1.3 0-2.2-.4-2.7-1.2"/>',
    flame: '<path d="M12 3.2c3 3.7 5.4 5.9 5.4 9.2a5.4 5.4 0 1 1-10.8 0c0-1.7.7-3 1.9-4.4.4 1.3 1.1 2 2 2.4-.2-2.4.2-4.6 1.5-7.2z"/>',
    shield: '<path d="M12 3.2 19.4 6v6.1c0 4.1-3.1 7.2-7.4 8.7-4.3-1.5-7.4-4.6-7.4-8.7V6z"/>',
    feather: '<path d="M20.2 4.1c-2.1-2-9.5.3-12.4 3.3-2.3 2.4-2.9 5.9-2 8.9l8.4-2.2 3.3-3.7"/><path d="M5.8 20.1c1.2-4.2 3-7.2 5.5-9.4"/><path d="M14 8.6l-2.4 2.4"/>',
    trophy: '<path d="M8 4.5h8v5.2a4 4 0 0 1-8 0z"/><path d="M8 6H5.2v1.6A3.2 3.2 0 0 0 8.4 10.8M16 6h2.8v1.6a3.2 3.2 0 0 1-3.2 3.2"/><path d="M12 13.7v3.1M8.8 20h6.4l-1-3.2h-4.4z"/>',
    lock: '<rect x="4.8" y="10.5" width="14.4" height="10" rx="2"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/><circle cx="12" cy="15.4" r="1.3"/>',
    clock: '<circle cx="12" cy="12.4" r="8.2"/><path d="M12 7.6v5l3.2 2"/><path d="M4.4 4.2 3 5.6M19.6 4.2 21 5.6"/>',
    star: '<path d="M12 3.4l2.5 5.5 6 .7-4.5 4 1.3 5.9-5.3-3-5.3 3L7.9 13.6 3.4 9.6l6-.7z"/>',
    flag: '<path d="M6 21V4.2c3.4-1.9 6.6 1.5 12-1v9.6c-5.4 2.5-8.6-.9-12 1"/>',
    moon: '<path d="M20.4 14.2A8.6 8.6 0 0 1 9.8 3.6 8.7 8.7 0 1 0 20.4 14.2z"/>',
    refresh: '<path d="M20 11.4a8 8 0 1 0-2.6 6.2"/><path d="M20.4 4.6v6.8h-6.6"/>',
    play: '<path d="M8 5.4v13.2L19 12z"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.9v.2"/>',
    download: '<path d="M12 4v10.5M8 11l4 4 4-4"/><path d="M5 19h14"/>',
    trash: '<path d="M4.6 7h14.8M9.4 7V5.2A1.2 1.2 0 0 1 10.6 4h2.8a1.2 1.2 0 0 1 1.2 1.2V7"/><path d="M6.4 7l.9 12.1a1.4 1.4 0 0 0 1.4 1.3h6.6a1.4 1.4 0 0 0 1.4-1.3L17.6 7"/>',
    edit: '<path d="M4.6 19.4h3.2L19 8.2a2.1 2.1 0 0 0 0-3l-.6-.6a2.1 2.1 0 0 0-3 0L4.6 16.2z"/>',
    zap: '<path d="M13.2 3 5.4 13.2h5.4L10 21l8-10.4h-5.4z"/>',
    cpu: '<rect x="6.4" y="6.4" width="11.2" height="11.2" rx="2"/><rect x="9.8" y="9.8" width="4.4" height="4.4" rx=".8"/><path d="M10 3.4v3M14 3.4v3M10 17.6v3M14 17.6v3M3.4 10h3M3.4 14h3M17.6 10h3M17.6 14h3"/>',
    user: '<circle cx="12" cy="8.4" r="3.8"/><path d="M4.8 20.2c.6-3.9 3.5-6.1 7.2-6.1s6.6 2.2 7.2 6.1"/>',
    gear: '<circle cx="12" cy="12" r="3.1"/><path d="M12 3.2v2.4M12 18.4v2.4M4.9 7.6l2 1.2M17.1 15.2l2 1.2M4.9 16.4l2-1.2M17.1 8.8l2-1.2"/>',
    calendar: '<rect x="3.8" y="5.4" width="16.4" height="15" rx="2"/><path d="M3.8 10h16.4M8.4 3.4v3.4M15.6 3.4v3.4"/>',
    list: '<path d="M8 6.4h12M8 12h12M8 17.6h12"/><circle cx="4.2" cy="6.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.2" cy="17.6" r="1.1" fill="currentColor" stroke="none"/>',
    book: '<path d="M4.4 5.2A2 2 0 0 1 6.4 3.2h5.2v17.2H6.4a2 2 0 0 0-2 2z"/><path d="M19.6 5.2a2 2 0 0 0-2-2h-5.2v17.2h5.2a2 2 0 0 1 2 2z"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
    key: '<circle cx="8" cy="8" r="3.8"/><path d="M10.8 10.8 20 20M17 17l2-2M14.4 14.4l2-2"/>',
    crown: '<path d="M3.6 7.6 8 11l4-6 4 6 4.4-3.4-1.6 10.8H5.2z"/><path d="M5.2 18.4h13.6"/>',
    scale: '<path d="M12 3.6v16.8M7 20.4h10"/><path d="M4.2 7.4h15.6M4.2 7.4 1.8 14h4.8zM19.8 7.4 17.4 14h4.8z"/>',
    shieldCheck: '<path d="M12 3.2 19.4 6v6.1c0 4.1-3.1 7.2-7.4 8.7-4.3-1.5-7.4-4.6-7.4-8.7V6z"/><path d="M8.8 12.1l2.3 2.3 4.2-4.4"/>',
    spark: '<path d="M12 4.2v15.6M4.2 12h15.6M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4"/>',
  };
  function ico(name, size = 16, cls = '') {
    const p = PATHS[name] || PATHS.spark;
    return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
  }
  const ART_ICON = {
    shield: 'shield', flame: 'flame', eye: 'eye', feather: 'feather', spark: 'sparkles',
    lock: 'lock', trophy: 'trophy', moon: 'moon', target: 'target', clock: 'clock',
    sparkles: 'sparkles', flag: 'flag', star: 'star',
  };


  /* ------------------------------ Exportación ------------------------------ */
  A.E = E;
  A.sigilSVG = sigilSVG;
  A.doc = doc;
  A.$ = $;
  A.$$ = $$;
  A.clamp = clamp;
  A.rnd = rnd;
  A.esc = esc;
  A.uid = uid;
  A.today = today;
  A.fmt = fmt;
  A.cap = cap;
  A.fmtDuration = fmtDuration;
  A.PATHS = PATHS;
  A.ico = ico;
  A.ART_ICON = ART_ICON;

})(window.Seraph = window.Seraph || {});
