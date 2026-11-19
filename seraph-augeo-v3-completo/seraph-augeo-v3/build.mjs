/* ============================================================================
   Empaqueta la app en un único HTML autocontenido.
   Toma el orden de assets/manifest.js, así que un módulo nuevo sólo se declara
   ahí. Ejecutar: node build.mjs
   ============================================================================ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const css = read('assets/styles.css');
const icon = read('icons/sigil.svg');

/* El manifiesto es código de navegador: lo evaluamos con un `window` de mentira. */
const sandbox = {};
new Function('window', read('assets/manifest.js'))(sandbox);
const manifest = sandbox.SERAPH_MODULES;
if (!Array.isArray(manifest) || !manifest.length) throw new Error('assets/manifest.js no exporta SERAPH_MODULES');

const parts = ['assets/engine.js', 'assets/sigil.js', ...manifest.map((m) => 'assets/' + m)];
const js = parts.map(read).join('\n') + `
;(function () {
  function go() {
    if (window.Seraph && typeof window.Seraph.start === 'function') window.Seraph.start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
`;

if (/<\/script>/i.test(js)) throw new Error('Hay un </script> literal en el JS');
if (/<\/style>/i.test(css)) throw new Error('Hay un </style> literal en el CSS');

let html = read('index.html');

html = html.replace(/\s*<link rel="manifest"[^>]*>/, '');
/* Ojo: con reemplazo en texto, "$$" se convierte en "$". Usamos funciones. */
const putIcon = `<link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}">`;
html = html.replace(/<link rel="icon"[^>]*>/, () => putIcon);
html = html.replace(/<link rel="stylesheet" href="\.\/assets\/styles\.css(\?[^"]*)?">/, () => `<style>\n${css}\n</style>`);

/* --- El serafín: three.js y el modelo comprimido, incrustados ---------------
   Van en su propio <script> antes del de la app. Si falta cualquiera de los
   dos, la app se construye igual y la intro usa la escena CSS. */
let angelScript = '';
try {
  const bundlePath = path.join(ROOT, 'tools/viewer/three.bundle.js');
  const glbPath = path.join(ROOT, 'assets/intro/angel.glb');
  if (fs.existsSync(bundlePath) && fs.existsSync(glbPath)) {
    const bundle = fs.readFileSync(bundlePath, 'utf8');
    const glb = fs.readFileSync(glbPath).toString('base64');
    if (/<\/script>/i.test(bundle)) throw new Error('El bundle de three.js contiene </script>');
    angelScript = `\n  <script>\n${bundle}\nwindow.SERAPH_ANGEL = { glb: '${glb}' };\n  </script>`;
    console.log(`  serafín: ${(fs.statSync(glbPath).size / 1048576).toFixed(2)} MB de modelo + ${(bundle.length / 1024).toFixed(0)} KB de three.js`);
  } else {
    console.log('  serafín: sin modelo, la intro usa la escena CSS');
  }
} catch (e) {
  console.log('  serafín: omitido (' + e.message + ')');
  angelScript = '';
}

let injected = false;
html = html.replace(/\s*<script src="\.\/assets\/[^"]+"><\/script>/g, () => {
  if (injected) return '';
  injected = true;
  return angelScript + `\n  <script>\n${js}\n  </script>`;
});
if (!injected) throw new Error('No se encontraron los <script> de assets/ en index.html');

if (/<script[^>]+src=|<link[^>]+stylesheet/.test(html)) throw new Error('Quedaron referencias externas');

const out = path.join(ROOT, 'seraph-augeo-v3.html');
fs.writeFileSync(out, html, 'utf8');
console.log(`Listo: ${path.relative(process.cwd(), out)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${parts.length} archivos)`);
