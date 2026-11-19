/* Genera un visor autónomo con el ángel incrustado, para mirarlo y probar la animación.
   Uso: node tools/viewer/gen-viewer.mjs  → tools/viewer/viewer.html */
import fs from 'fs';
import path from 'path';

const glb = fs.readFileSync('assets/intro/angel.glb');
const b64 = glb.toString('base64');
const bundle = fs.readFileSync('tools/viewer/three.bundle.js', 'utf8');

const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Ángel</title>
<style>html,body{margin:0;height:100%;background:#0c0d13;overflow:hidden}canvas{display:block}</style></head>
<body><canvas id="c"></canvas>
<script>${bundle}</script>
<script>
const c = document.getElementById('c');
const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true });
r.setSize(760, 1000, false);
r.outputColorSpace = THREE.SRGBColorSpace;
r.toneMapping = THREE.ACESFilmicToneMapping;
r.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0d13);
const cam = new THREE.PerspectiveCamera(34, 760 / 1000, 0.01, 8000);
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2620, 1.4));
const key = new THREE.DirectionalLight(0xfff2d0, 2.6); key.position.set(3, 4, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0x9dc0ff, 1.8); rim.position.set(-4, 2, -3); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffd9a0, 0.7); fill.position.set(0, -2, 3); scene.add(fill);

const bytes = Uint8Array.from(atob('${b64}'), (ch) => ch.charCodeAt(0));
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.parse(bytes.buffer, '', (g) => {
  window.__root = g.scene;
  scene.add(g.scene);
  window.__mixer = new THREE.AnimationMixer(g.scene);
  window.__info = {
    clips: g.animations.map((a) => ({ name: a.name, dur: +a.duration.toFixed(2), tracks: a.tracks.length })),
    textures: [], meshes: 0, materials: [],
  };
  g.scene.traverse((o) => {
    if (o.isMesh) {
      window.__info.meshes++;
      const m = o.material;
      if (m && window.__info.materials.length < 20) window.__info.materials.push(m.name + (m.transparent ? '(t)' : ''));
    }
  });
  const b = new THREE.Box3().setFromObject(g.scene);
  const size = b.getSize(new THREE.Vector3());
  const ctr = b.getCenter(new THREE.Vector3());
  window.__bounds = { size: size.toArray(), center: ctr.toArray(), min: b.min.toArray(), max: b.max.toArray() };

  window.__snap = (t, yaw = 0.35, elev = 0.12, dist = 1.5) => {
    const bb = new THREE.Box3().setFromObject(g.scene);
    const sph = bb.getBoundingSphere(new THREE.Sphere());
    const rad = sph.radius * dist;
    cam.position.set(
      sph.center.x + Math.sin(yaw) * rad,
      sph.center.y + elev * rad,
      sph.center.z + Math.cos(yaw) * rad
    );
    cam.lookAt(sph.center);
    if (g.animations[0]) {
      const act = window.__mixer.clipAction(g.animations[0]);
      act.reset(); act.play();
      window.__mixer.setTime(t);
    }
    r.render(scene, cam);
    return c.toDataURL('image/png');
  };
  window.__ready = true;
}, (err) => { window.__err = String(err); });
</script></body></html>`;

fs.writeFileSync(path.resolve('tools/viewer/viewer.html'), html);
console.log('visor: tools/viewer/viewer.html', (html.length / 1048576).toFixed(2), 'MB');
