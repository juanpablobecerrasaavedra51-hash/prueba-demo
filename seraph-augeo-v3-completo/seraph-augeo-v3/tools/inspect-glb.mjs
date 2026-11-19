/* Lee la cabecera y el JSON de un .glb sin dependencias. */
import fs from 'fs';

const p = process.argv[2];
const buf = fs.readFileSync(p);
const magic = buf.toString('utf8', 0, 4);
const version = buf.readUInt32LE(4);
const total = buf.readUInt32LE(8);
const jsonLen = buf.readUInt32LE(12);
const jsonType = buf.toString('utf8', 16, 20);
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

const kind = (arr) => (arr || []).length;
const imgs = (json.images || []).map((im) => ({
  name: im.name || '', mime: im.mimeType || '', embedded: im.bufferView !== undefined, uri: im.uri ? String(im.uri).slice(0, 40) : null,
}));
const anims = (json.animations || []).map((a) => ({ name: a.name || '(sin nombre)', canales: (a.channels || []).length }));
const skins = (json.skins || []).map((s) => ({ name: s.name || '', joints: (s.joints || []).length }));
const meshes = (json.meshes || []).map((m) => ({ name: m.name || '', prims: (m.primitives || []).length }));
const nodeNames = (json.nodes || []).map((n) => n.name || '').filter(Boolean);

console.log(JSON.stringify({
  archivo: p,
  bytes: buf.length,
  mb: +(buf.length / 1048576).toFixed(2),
  cabecera: { magic, version, total, chunkJSON: jsonType },
  generador: (json.asset || {}).generator || '',
  extensiones: json.extensionsRequired || [],
  extensionesUsadas: json.extensionsUsed || [],
  nodos: kind(json.nodes),
  mallas: meshes.slice(0, 12),
  esqueletos: skins,
  animaciones: anims,
  materiales: (json.materials || []).map((m) => m.name || '').slice(0, 12),
  imagenes: imgs.slice(0, 12),
  imagenesTotal: imgs.length,
  buffers: (json.buffers || []).map((b) => ({ bytes: b.byteLength, uri: b.uri ? String(b.uri).slice(0, 40) : null })),
  nodosConHuesos: nodeNames.length,
  nombresHuesos: nodeNames.filter((n) => /wing|ala|head|cab|arm|brazo|hand|mano|spine|hueso|bone|joint|hip|leg|pie|foot|neck|cuello|shoulder|hombro/i.test(n)).slice(0, 40),
}, null, 2));
