/* Detalle de tamaño: texturas vs geometría, y duración de la animación. */
import fs from 'fs';

const p = process.argv[2];
const buf = fs.readFileSync(p);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
const bvs = json.bufferViews || [];
const acc = json.accessors || [];
const bvBytes = (i) => (bvs[i] ? bvs[i].byteLength : 0);

let imgBytes = 0;
const imgs = (json.images || []).map((im) => {
  const b = im.bufferView !== undefined ? bvBytes(im.bufferView) : 0;
  imgBytes += b;
  return { mime: im.mimeType, kb: Math.round(b / 1024) };
});

/* Geometría: suma de bufferViews usados por accessors de atributos/índices. */
let geoBytes = 0;
let tris = 0;
const used = new Set();
for (const m of json.meshes || []) {
  for (const pr of m.primitives || []) {
    for (const a of Object.values(pr.attributes || {})) { const ac = acc[a]; if (ac && ac.bufferView !== undefined) used.add(ac.bufferView); }
    if (pr.indices !== undefined) { const ac = acc[pr.indices]; if (ac && ac.bufferView !== undefined) { used.add(ac.bufferView); tris += ac.count / 3; } }
  }
}
for (const i of used) geoBytes += bvBytes(i);

/* Duración del clip. */
let duration = 0;
for (const an of json.animations || []) {
  for (const s of an.samplers || []) {
    const ac = acc[s.input];
    if (ac && ac.max && ac.max[0] > duration) duration = ac.max[0];
  }
}

/* Huesos animados y nodos con peso de skin. */
const animatedNodes = new Set();
for (const an of json.animations || []) for (const c of an.channels || []) animatedNodes.add(c.target.node);

console.log(JSON.stringify({
  mbTotal: +(buf.length / 1048576).toFixed(2),
  texturas: { cuantas: imgs.length, mb: +(imgBytes / 1048576).toFixed(2), detalle: imgs },
  geometria: { mb: +(geoBytes / 1048576).toFixed(2), triangulos: Math.round(tris), mallas: (json.meshes || []).length, primitivas: (json.meshes || []).reduce((n, m) => n + (m.primitives || []).length, 0) },
  restoMB: +((buf.length - imgBytes - geoBytes) / 1048576).toFixed(2),
  animacion: { clips: (json.animations || []).length, duracion: +duration.toFixed(2), canales: (json.animations || []).reduce((n, a) => n + (a.channels || []).length, 0), nodosAnimados: animatedNodes.size },
  skins: (json.skins || []).length,
}, null, 2));
