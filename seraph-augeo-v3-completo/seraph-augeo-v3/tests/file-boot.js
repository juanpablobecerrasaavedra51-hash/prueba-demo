/* Arranca seraph-augeo-v3.html como file://, sin red ni servidor.
   Ejecutar: node tests/file-boot.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const FILE = path.resolve(__dirname, '..', 'seraph-augeo-v3.html');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => {
  const m = String(e.message || '');
  if (/Not implemented/i.test(m)) return;
  errors.push(m);
});

const dom = new JSDOM(fs.readFileSync(FILE, 'utf8'), {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'file:///C:/seraph-augeo-v3/seraph-augeo-v3.html',
  virtualConsole: vc,
});
const { window } = dom;

setTimeout(() => {
  const S = window.Seraph || {};
  const app = window.document.getElementById('app');
  let storage = 'no disponible';
  try { window.localStorage.setItem('x', '1'); window.localStorage.removeItem('x'); storage = 'ok'; }
  catch (e) { storage = 'bloqueado (' + e.name + ')'; }

  const out = {
    simbolos: Object.keys(S).length,
    clienteIA: !!(S.AIClient && S.AIClient.hasKey),
    pantalla: app ? app.className : '(sin #app)',
    texto: app ? app.textContent.replace(/\s+/g, ' ').trim().slice(0, 70) : '',
    localStorage: storage,
    avisaSinAlmacenamiento: !!window.document.getElementById('noStore'),
    errores: errors.slice(0, 3),
  };
  console.log(JSON.stringify(out, null, 2));
  /* Con el almacenamiento bloqueado debe avisar; sin bloqueo, no debe estorbar. */
  const avisoCoherente = out.avisaSinAlmacenamiento === (storage !== 'ok');
  const ok = out.simbolos > 100 && out.clienteIA && out.pantalla && avisoCoherente && out.errores.length === 0;
  console.log(ok ? '\nARRANCA DESDE file:// SIN SERVIDOR' : '\nFALLA');
  window.close();
  process.exitCode = ok ? 0 : 1;
}, 900);
