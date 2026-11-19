/* Reduce el ángel de 64 MB a algo que quepa dentro del HTML único.
   - Texturas: 1024 px máximo, WebP.
   - Geometría: weld + simplificación a una fracción de los triángulos.
   - Animación: remuestreo (quita claves redundantes).
   - Compresión: cuantización + meshopt (el decodificador va en la app).
   Uso: node tools/prepare-angel.mjs [ratio]  (por defecto 0.09) */
import fs from 'fs';
import path from 'path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, weld, simplify, quantize, meshopt, join } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ratio = Number(process.argv[2] || 0.09);
const SRC = path.resolve('../../modelo angel/angel.glb');
const OUT = path.resolve('assets/intro/angel.glb');

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(SRC);
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const before = fs.statSync(SRC).size;

/* --- Texturas --- */
let texBefore = 0, texAfter = 0;
for (const tex of doc.getRoot().listTextures()) {
  const img = tex.getImage();
  if (!img) continue;
  texBefore += img.byteLength;
  const meta = await sharp(Buffer.from(img)).metadata();
  const out = await sharp(Buffer.from(img))
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 90, effort: 5 })
    .toBuffer();
  tex.setImage(new Uint8Array(out)).setMimeType('image/webp');
  texAfter += out.byteLength;
  console.log(`  textura ${meta.width}x${meta.height} → ${Math.round(out.byteLength / 1024)} KB`);
}

/* --- Geometría y animación --- */
await doc.transform(
  dedup(),
  prune(),
  resample({ tolerance: 1e-4 }),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.004, lockBorder: false }),
  join({ keepNamed: false }),
  prune(),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

const glb = await io.writeBinary(doc);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, glb);

const tris = doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => {
  const idx = p.getIndices();
  return k + (idx ? idx.getCount() / 3 : 0);
}, 0), 0);

console.log(JSON.stringify({
  entradaMB: +(before / 1048576).toFixed(2),
  salidaMB: +(glb.byteLength / 1048576).toFixed(2),
  factor: +(before / glb.byteLength).toFixed(1) + 'x',
  texturasMB: { antes: +(texBefore / 1048576).toFixed(2), despues: +(texAfter / 1048576).toFixed(2) },
  triangulos: Math.round(tris),
  mallas: doc.getRoot().listMeshes().length,
  skins: doc.getRoot().listSkins().length,
  animaciones: doc.getRoot().listAnimations().map((a) => a.getName()),
}, null, 2));
