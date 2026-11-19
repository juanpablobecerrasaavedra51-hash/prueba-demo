/* ============================================================================
   intro/angel3d — El serafín: descenso, aterrizaje y entrada al abismo
   El modelo (assets/intro/angel.glb) y three.js van incrustados en el HTML:
   aquí no se pide ningún archivo ni se abre ninguna conexión.

   Todo es opcional: si no hay WebGL, si el modelo falta o falla, `ok` queda
   en false y la app sigue con la escena CSS de siempre.
   ============================================================================ */
(function (A) {
  'use strict';

  const doc = A.doc;
  const S = A.S;

  /* Altura del ángel en unidades de escena. El modelo mide 0.0316. */
  const H = 2.4;
  const FOV = 32;
  const INTRO_LEN = 7.5;      /* igual que INTRO_STEPS: la intro dura lo mismo */
  const ENTER_LEN = 1.55;

  let st = null;              /* todo lo del 3D */
  let readyP = null;          /* promesa de carga */
  let settleReady = null;     /* se resuelve cuando el modelo ya está (o falla) */
  let stAura = null;          /* la luz grande de detrás, en CSS */
  let ok = false;             /* WebGL + modelo disponibles */
  let mode = 'off';           /* off | intro | idle | enter */
  let t0 = 0;                 /* inicio del modo actual */
  let raf = 0;
  let entering = false;
  let onEnterDone = null;

  /* ------------------------------ utilidades ------------------------------ */
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

  function track(keys, t, prop) {
    if (t <= keys[0].t) return keys[0][prop];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t <= b.t) return a[prop] + (b[prop] - a[prop]) * ease((t - a.t) / (b.t - a.t || 1));
    }
    return keys[keys.length - 1][prop];
  }

  /* Si el sistema pide menos movimiento (o el usuario apagó el suyo en
     Ajustes), no hay descenso ni zambullida: el ángel ya está plantado. */
  function calm() {
    if (S && S.settings && S.settings.motion === false) return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function webglOk() {
    try {
      const c = doc.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  /* ------------------------------ coreografía -----------------------------
     `dist` se mide en alturas del ángel; `ty` es la altura a la que mira la
     cámara; `ry` es la altura del propio ángel; `halo` multiplica su brillo. */
  const INTRO_KEYS = [
    { t: 0.00, dist: 0.40, yaw: 0.62, elev: 0.18, ty: 2.02, ry: 1.95, scale: 0.97, halo: 0.04, glow: 0.00 },
    { t: 1.30, dist: 0.44, yaw: 0.44, elev: 0.19, ty: 2.00, ry: 1.92, scale: 0.97, halo: 0.14, glow: 0.03 },
    { t: 2.30, dist: 2.30, yaw: 0.28, elev: 0.14, ty: 1.35, ry: 1.26, scale: 0.98, halo: 0.34, glow: 0.12 },
    { t: 3.10, dist: 3.40, yaw: 0.22, elev: 0.06, ty: 0.90, ry: 0.26, scale: 1.00, halo: 0.46, glow: 0.20 },
    { t: 3.42, dist: 3.60, yaw: 0.20, elev: 0.04, ty: 0.80, ry: 0.00, scale: 1.02, halo: 1.60, glow: 0.62 },
    { t: 4.30, dist: 3.30, yaw: 0.42, elev: 0.03, ty: 0.82, ry: 0.00, scale: 1.00, halo: 0.90, glow: 0.36 },
    { t: 5.50, dist: 3.90, yaw: 0.26, elev: 0.04, ty: 0.22, ry: 0.00, scale: 1.00, halo: 1.00, glow: 0.30 },
    { t: 7.50, dist: 4.00, yaw: 0.18, elev: 0.03, ty: 0.14, ry: 0.00, scale: 1.00, halo: 0.92, glow: 0.26 },
  ];

  const ENTER_KEYS = [
    { t: 0.00, dist: 4.00, yaw: 0.18, elev: 0.03, ty: 0.14, ry: 0.00, scale: 1.00, halo: 0.92, glow: 0.26 },
    { t: 0.35, dist: 2.60, yaw: 0.10, elev: 0.14, ty: 1.45, ry: 0.12, scale: 1.03, halo: 2.20, glow: 0.70 },
    { t: 1.10, dist: 0.55, yaw: 0.04, elev: 0.26, ty: 1.98, ry: 0.60, scale: 1.06, halo: 4.40, glow: 1.35 },
    { t: 1.55, dist: 0.34, yaw: 0.00, elev: 0.30, ty: 2.05, ry: 0.75, scale: 1.08, halo: 6.00, glow: 1.80 },
  ];

  /* --------------------------------- escena -------------------------------- */
  function make(tag, cls) { const e = doc.createElement(tag); if (cls) e.className = cls; return e; }

  function init() {
    if (readyP) return readyP;
    readyP = new Promise((resolve) => {
      const THREE = window.THREE;
      const data = window.SERAPH_ANGEL;
      settleReady = resolve;
      if (!THREE || !window.GLTFLoader || !data || !webglOk()) { ok = false; resolve(false); settleReady = null; return; }

      try {
        const canvas = make('canvas');
        canvas.id = 'angelCanvas';
        doc.body.appendChild(canvas);

        const fx = make('div', 'angel-fx');
        fx.id = 'angelFX';
        doc.body.appendChild(fx);

        /* Auréola de luz en CSS, justo detrás del canvas (z-index 1). */
        const aura = make('div', 'angel-aura');
        aura.id = 'angelAura';
        doc.body.appendChild(aura);
        stAura = aura;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(1.7, window.devicePixelRatio || 1));
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.62;
        if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.02, 60);

        /* Luz de la paleta: hueso por detrás (contraluz del sol bajo), oro
           desde arriba y un relleno frío para que el mármol no se apague. */
        scene.add(new THREE.HemisphereLight(0xe6edfd, 0x2b2620, 1.7));
        const sun = new THREE.DirectionalLight(0xfff1cf, 4.4);
        sun.position.set(0.8, 2.6, -4.5);
        scene.add(sun);
        const gold = new THREE.DirectionalLight(0xffd79a, 1.6);
        gold.position.set(-2.4, 3.4, 2.2);
        scene.add(gold);
        const cold = new THREE.DirectionalLight(0x9ec2ff, 2.7);
        cold.position.set(3.2, 0.8, 2.6);
        scene.add(cold);
        const under = new THREE.DirectionalLight(0xc3b096, 1.0);
        under.position.set(-1, -3, 1.5);
        scene.add(under);
        /* Foco frontal suave: el mármol necesita un reflejo que lo lea. */
        const front = new THREE.DirectionalLight(0xfff6e4, 2.1);
        front.position.set(-0.6, 1.4, 4.2);
        scene.add(front);

        st = {
          THREE, renderer, scene, camera, canvas, fx,
          rig: new THREE.Group(), haloMats: [], glow: null, shock: null, shadow: null,
          model: null, mixer: null, clip: null,
        };
        scene.add(st.rig);

        /* Mandorla: la luz va DETRÁS del cuerpo, así él queda en contraluz y
           no como una calcomanía blanca pegada encima. */
        const glowTex = glowTexture(THREE);
        const glow = new THREE.Mesh(
          new THREE.PlaneGeometry(3.4, 3.4),
          new THREE.MeshBasicMaterial({
            map: glowTex, color: 0xffeccb, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
          })
        );
        glow.position.set(0, 1.15, -0.85);
        st.rig.add(glow);
        st.glow = glow;

        /* Onda de choque del aterrizaje: un anillo plano en el suelo. */
        const shock = new THREE.Mesh(
          new THREE.RingGeometry(0.55, 0.78, 72),
          new THREE.MeshBasicMaterial({
            color: 0xffe0a4, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
          })
        );
        shock.rotation.x = -Math.PI / 2;
        shock.position.y = 0.005;
        st.rig.add(shock);
        st.shock = shock;

        /* Mancha de sombra bajo los pies: lo asienta en el suelo. */
        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(0.62, 48),
          new THREE.MeshBasicMaterial({ map: glowTexture(THREE, '0,0,0'), color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.004;
        st.rig.add(shadow);
        st.shadow = shadow;

        loadModel();
        /* Si el modelo tarda demasiado, la app no espera: sigue con la CSS. */
        setTimeout(() => { if (!ok) done(false); }, 4000);
        resize();
        window.addEventListener('resize', resize);
        doc.addEventListener('visibilitychange', () => { if (doc.hidden) stop(); else if (mode !== 'off') start(); });
      } catch (e) {
        ok = false;
        done(false);
      }
    });
    return readyP;
  }

  /* La promesa se cumple cuando el modelo está listo, no cuando empieza a cargar. */
  function done(good) {
    if (!settleReady) return;
    const r = settleReady;
    settleReady = null;
    r(good);
  }

  function glowTexture(THREE, rgb) {
    const c = doc.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (rgb) {
      grd.addColorStop(0, `rgba(${rgb},.95)`);
      grd.addColorStop(0.55, `rgba(${rgb},.55)`);
      grd.addColorStop(1, `rgba(${rgb},0)`);
    } else {
      grd.addColorStop(0, 'rgba(255,240,205,.95)');
      grd.addColorStop(0.35, 'rgba(255,215,150,.42)');
      grd.addColorStop(1, 'rgba(255,200,120,0)');
    }
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function loadModel() {
    const { THREE } = st;
    const b64 = window.SERAPH_ANGEL.glb;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const loader = new window.GLTFLoader();
    if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
    loader.parse(bytes.buffer, '', (gltf) => {
      const model = gltf.scene;
      /* Normalizar: alto H, pies en y=0, centrado en x/z. */
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const k = H / (size.y || 1);
      model.scale.setScalar(k);
      box.setFromObject(model);
      const c = box.getCenter(new THREE.Vector3());
      model.position.x -= c.x;
      model.position.z -= c.z;
      model.position.y -= box.min.y;
      st.rig.add(model);
      st.model = model;

      /* Materiales: nada de transmisión (caro) y halo que se pueda encender. */
      const seen = new Set();
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (!m || seen.has(m)) return;
          seen.add(m);
          if ('transmission' in m) m.transmission = 0;
          m.depthWrite = m.transparent ? false : m.depthWrite;
          const name = m.name || '';
          if (/outter|inner/i.test(name)) {
            /* Los aros exteriores son planos: con emisión se ven como un cuadro. */
            m.emissive = new THREE.Color(0xffe6bd);
            m.userData.base = 0.12;
            m.emissiveIntensity = 0;
            st.haloMats.push(m);
          } else if (/halo/i.test(name)) {
            /* El aro enciende de verdad: es la señal de "aquí está". */
            m.emissive = new THREE.Color(0xffcf8a);
            m.userData.base = Math.max(1.2, m.emissiveIntensity || 1);
            m.emissiveIntensity = 0;
            m.toneMapped = false;
            st.haloMats.push(m);
          } else if (/glow/i.test(name)) {
            /* El brillo del cuerpo sólo acompaña: si no, se ve una calcomanía. */
            m.emissive = new THREE.Color(0xffe3b4);
            m.userData.base = 0.22 * Math.max(1, m.emissiveIntensity || 1);
            m.emissiveIntensity = 0;
            st.haloMats.push(m);
          }
        });
      });

      if (gltf.animations && gltf.animations[0]) {
        st.clip = gltf.animations[0];
        st.mixer = new THREE.AnimationMixer(model);
        const act = st.mixer.clipAction(st.clip);
        act.play();
        st.mixer.timeScale = 0.62;
      }

      ok = true;
      done(true);
      if (mode !== 'off') start();
      draw(0);
    }, () => { ok = false; done(false); });
  }

  function resize() {
    if (!st) return;
    const w = window.innerWidth, h = window.innerHeight;
    st.renderer.setSize(w, h, false);
    st.camera.aspect = w / h;
    /* En vertical el encuadre necesita aire: se abre el campo. */
    st.camera.fov = w / h < 0.85 ? FOV + 10 : FOV;
    st.camera.updateProjectionMatrix();
  }

  /* -------------------------------- dibujo -------------------------------- */
  let last = 0;

  function draw(dt) {
    if (!st || !ok) return;
    const t = (performance.now() - t0) / 1000;

    if (mode === 'intro' || mode === 'enter') {
      const keys = mode === 'intro' ? INTRO_KEYS : ENTER_KEYS;
      const p = {
        dist: track(keys, t, 'dist'), yaw: track(keys, t, 'yaw'), elev: track(keys, t, 'elev'),
        ty: track(keys, t, 'ty'), ry: track(keys, t, 'ry'), scale: track(keys, t, 'scale'),
        halo: track(keys, t, 'halo'), glow: track(keys, t, 'glow'),
      };
      apply(p);
      if (mode === 'intro') {
        /* Onda de choque al tocar el suelo (t ≈ 3.42) y polvo que se apaga. */
        const u = clamp01((t - 3.40) / 1.05);
        st.shock.scale.setScalar(0.35 + u * 5.2);
        st.shock.material.opacity = t < 3.38 ? 0 : (1 - u) * 0.85;
        if (t >= INTRO_LEN - 0.02 && mode === 'intro') { mode = 'idle'; t0 = performance.now(); }
      } else {
        st.shock.material.opacity = 0;
        if (t >= ENTER_LEN) finishEnter();
      }
    } else if (mode === 'idle') {
      const bob = Math.sin(t * 0.9) * 0.035;
      const drift = Math.sin(t * 0.23) * 0.10;
      const par = st.parallax || { x: 0, y: 0 };
      apply({
        dist: 4.00 + Math.sin(t * 0.31) * 0.07,
        yaw: 0.18 + drift + par.x * 0.22,
        elev: 0.03 + Math.sin(t * 0.47) * 0.012 + par.y * 0.09,
        ty: 0.14, ry: bob, scale: 1,
        halo: 0.94 + Math.sin(t * 1.7) * 0.14,
        glow: 0.26 + Math.sin(t * 1.7) * 0.05,
      });
      st.shock.material.opacity = 0;
    }

    if (st.mixer) st.mixer.update(dt);
    st.renderer.render(st.scene, st.camera);
  }

  function apply(p) {
    const { camera } = st;
    st.rig.position.y = p.ry;
    st.rig.scale.setScalar(p.scale);
    st.shadow.material.opacity = 0.42 / Math.max(1, p.ry * 3 + 1);
    st.shadow.scale.setScalar(1 / Math.max(1, p.ry * 1.5 + 1));
    st.haloMats.forEach((m) => { m.emissiveIntensity = p.halo * (m.userData.base || 1); });
            st.glow.material.opacity = Math.min(1, p.glow * 2.2);
        st.glow.scale.setScalar(0.85 + p.halo * 0.16);


    /* En vertical la cámara se acerca: con el mismo encuadre el ángel se
       quedaba pequeño entre tanto aire. */
    const asp = window.innerWidth / window.innerHeight;
    const fit = asp < 0.85 ? Math.max(0.72, 0.62 + asp * 0.38) : 1;
    const r = p.dist * H * fit;
    const ce = Math.cos(p.elev);
    camera.position.set(Math.sin(p.yaw) * r * ce, p.ty + Math.sin(p.elev) * r, Math.cos(p.yaw) * r * ce);
    camera.lookAt(0, p.ty, 0);
  }

  /* -------------------------------- bucle --------------------------------- */
  function loop() {
    raf = 0;
    const now = performance.now();
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    draw(dt);
    if (mode !== 'off') raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && ok) { last = 0; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* --------------------------------- API ---------------------------------- */
  const api = {
    get ok() { return ok; },
    init,
    ready: () => readyP || Promise.resolve(false),

    /* El ángel se queda detrás del menú; en el resto de la app se apaga. */
    show(on) {
      const live = !!on && ok;
      doc.body.classList.toggle('angel-live', live);
      if (st) st.canvas.classList.toggle('on', live);
      if (stAura) stAura.classList.toggle('on', live);
      if (!live) { mode = 'off'; stop(); return; }
      if (A.abyss) A.abyss.camera(3);   /* cielo, sol bajo y ruinas detrás */
      /* La intro y la entrada mandan: el menú no las interrumpe. */
      if (mode === 'intro' || mode === 'enter') { start(); return; }
      if (mode === 'off') { mode = 'idle'; t0 = performance.now(); }
      resize();
      start();
    },

    intro() {
      return init().then((good) => {
        if (!good || !ok) return false;
        if (calm()) { api.idle(); return true; }
        mode = 'intro'; t0 = performance.now();
        if (A.abyss) A.abyss.camera(3);
        if (st.mixer && st.clip) { st.mixer.setTime(0); }
        doc.body.classList.add('angel-live');
        if (st) st.canvas.classList.add('on');
        if (stAura) stAura.classList.add('on');
        resize(); start();
        return true;
      });
    },

    idle() {
      if (!ok) return;
      mode = 'idle'; t0 = performance.now();
      doc.body.classList.add('angel-live');
      if (st) st.canvas.classList.add('on');
      if (stAura) stAura.classList.add('on');
      resize(); start();
    },

    /* Al pulsar ENTRAR: el halo estalla y la cámara se zambulle en él. */
    enter(done) {
      if (!ok || entering) { if (done) done(); return false; }
      if (calm()) { flash(); if (done) setTimeout(done, 280); return true; }
      entering = true;
      onEnterDone = done || null;
      mode = 'enter'; t0 = performance.now();
      resize(); start();
      setTimeout(() => flash(), 900);
      /* Red de seguridad: si la pestaña está oculta el navegador no dibuja y
         la entrada nunca terminaría. La puerta no puede quedarse cerrada. */
      setTimeout(() => { if (entering) finishEnter(); }, ENTER_LEN * 1000 + 1200);
      return true;
    },

    /** Dónde cae el ángel en pantalla, para encuadrar sin adivinar. */
    debug(seek) {
      if (!st || !st.model) return null;
      if (seek != null && st.mixer) st.mixer.setTime(seek);
      if (ok) draw(0.016);   /* con la ventana oculta no hay rAF: se pinta aquí */
      const THREE = st.THREE;
      const b = new THREE.Box3().setFromObject(st.model);
      const v = new THREE.Vector3();
      const xs = [], ys = [];
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(st.camera);
        xs.push((v.x * 0.5 + 0.5) * window.innerWidth);
        ys.push((-v.y * 0.5 + 0.5) * window.innerHeight);
      }
      return {
        mode,
        rect: { x: Math.round(Math.min.apply(null, xs)), y: Math.round(Math.min.apply(null, ys)), w: Math.round(Math.max.apply(null, xs) - Math.min.apply(null, xs)), h: Math.round(Math.max.apply(null, ys) - Math.min.apply(null, ys)) },
        vp: [window.innerWidth, window.innerHeight],
      };
    },

    /** Fotograma en JPEG pequeño: sirve para revisar el encuadre sin ventana. */
    capture(w) {
      if (!st || !ok) return null;
      draw(0.016);
      const src = st.renderer.domElement;
      const width = w || 480;
      const c = doc.createElement('canvas');
      c.width = width; c.height = Math.round((src.height / src.width) * width);
      const g = c.getContext('2d');
      g.fillStyle = '#101018'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.72);
    },

    /** Parpadeo blanco de cuerpo entero. */
    flash,
    parallax(x, y) { if (st) st.parallax = { x, y }; },
    resize,
  };

  function flash() {
    if (!st || !st.fx) return;
    st.fx.classList.remove('on');
    /* reinicia la animación aunque se llame dos veces seguidas */
    void st.fx.offsetWidth;
    st.fx.classList.add('on');
  }

  function finishEnter() {
    if (!entering) return;
    entering = false;
    mode = 'idle'; t0 = performance.now();
    const cb = onEnterDone; onEnterDone = null;
    if (cb) cb();
  }

  A.Angel3D = api;

})(window.Seraph = window.Seraph || {});
