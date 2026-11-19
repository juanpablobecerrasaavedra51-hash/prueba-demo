/* ============================================================================
   Orden de carga de los módulos de la app.
   Lo usan assets/boot.js (navegador), build.mjs (archivo único) y las pruebas.
   ============================================================================ */
window.SERAPH_MODULES = [
  'core/dom.js',        /* utilidades, formato, iconos, motor y sello */
  'core/state.js',      /* estado y localStorage */
  'core/economy.js',    /* nivel, fase, racha, XP, monedas */
  'data/plans.js',      /* áreas y plantillas de plan */
  'ai/client.js',       /* Guardián sin servidor: Gemini u OpenRouter desde el navegador */
  'ai/setup.js',        /* la puerta: proveedor, clave o modelo local, probado de verdad */
  'guardian.js',        /* Ángel Guardián: IA + respaldo local */
  'ui/abyss.js',        /* abismo con colmillos, desierto y ojo que sigue el ratón */
  'intro/angel3d.js',   /* el serafín: descenso, aterrizaje y entrada (WebGL opcional) */
  'ui/intro.js',        /* escenario e intro cinematográfica */
  'ui/shell.js',        /* render, pestañas, modales, avisos */
  'views/onboarding.js',
  'views/hoy.js',
  'views/metas.js',
  'views/cofres.js',
  'views/guardian.js',
  'views/altar.js',
  'modals/verify.js',   /* verificación y veredicto */
  'actions.js',         /* acciones, ajustes, exportar/importar */
  'main.js',            /* arranque */
];
