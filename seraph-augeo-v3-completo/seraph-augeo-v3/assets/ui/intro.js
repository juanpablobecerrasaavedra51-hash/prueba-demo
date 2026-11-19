/* ============================================================================
   ui/intro — La intro: del ojo al abismo, y del abismo al portal
   La secuencia mueve la cámara de la escena (assets/ui/abyss.js):
     ojo de cerca → colmillos → desierto con espadas y cascos → abismo → logo
   Todo lo que se anima aquí son clases y transforms: nada de bucles pesados.
   ============================================================================ */
(function (A) {
  'use strict';


  /* -------------------- Enlaces con otros módulos -------------------- */
  const $ = A.$;
  const S = A.S;
  const doc = A.doc;
  const sigilSVG = A.sigilSVG;
  /* Las funciones se resuelven al invocarlas: no importa el orden. */
  const render = (...args) => A.render(...args);
  const save = (...args) => A.save(...args);


  /* ------------------------------- Guion ----------------------------------
     Cada paso dice cuándo se mueve la cámara y cuándo entra el logo. */
  const INTRO_STEPS = [
    { key: 'eye', at: 0 },
    { key: 'fangs', at: 1450 },
    { key: 'battle', at: 2750 },
    { key: 'panorama', at: 3950 },
    { key: 'flash', at: 4750 },
    { key: 'reveal', at: 5050 },
    { key: 'end', at: 7500 },
  ];

  function introMarkup() {
    /* Brasas en vez de plumas: suben desde el abismo, no caen del cielo. */
    const embers = Array.from({ length: 14 }, (_, i) => {
      const left = (i * 7.3 + 3) % 98;
      const delay = (i % 7) * 260;
      const dur = 5200 + (i % 5) * 900;
      const scale = 0.5 + (i % 4) * 0.3;
      return `<div class="fth" style="left:${left}%;--d:${delay}ms;--t:${dur}ms;--s:${scale}">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="rgba(255,214,150,.85)"/>
          <circle cx="12" cy="12" r="9" fill="rgba(255,170,90,.18)"/>
        </svg></div>`;
    }).join('');

    return `<div class="intro" id="intro" aria-hidden="true">
      <div class="intro-veil" id="introVeil"></div>
      <div class="intro-bars"><i></i><i></i></div>
      <div class="intro-feathers">${embers}</div>
      <div class="intro-core">
        <div class="intro-rings"><i></i><i></i><i></i></div>
        <div class="intro-halo">
          <div class="halo-glow"></div>
          <svg viewBox="0 0 420 420" width="420" height="420" aria-hidden="true">
            <circle cx="210" cy="210" r="188" fill="none" stroke="rgba(232,207,149,.22)" stroke-width="1"/>
            <circle cx="210" cy="210" r="150" fill="none" stroke="rgba(232,207,149,.16)" stroke-width=".8" stroke-dasharray="2 10"/>
            <circle cx="210" cy="210" r="118" fill="none" stroke="rgba(255,236,196,.3)" stroke-width=".7" stroke-dasharray="1 6"/>
            ${Array.from({ length: 48 }, (_, i) => {
              const a = (i / 48) * Math.PI * 2;
              const r1 = 176, r2 = i % 4 === 0 ? 188 : 182;
              return `<line x1="${(210 + Math.cos(a) * r1).toFixed(1)}" y1="${(210 + Math.sin(a) * r1).toFixed(1)}" x2="${(210 + Math.cos(a) * r2).toFixed(1)}" y2="${(210 + Math.sin(a) * r2).toFixed(1)}" stroke="rgba(232,207,149,.4)" stroke-width=".7"/>`;
            }).join('')}
          </svg>
        </div>
      </div>
      <div class="intro-impact" aria-hidden="true"></div>
      <div class="intro-flash" id="introFlash"></div>
      <div class="intro-reveal" id="introReveal">
        <div class="intro-sigil" id="introSigil"></div>
        <h1 class="intro-name">Seraph <em>Augeo</em></h1>
        <p class="intro-tag">El ojo que recuerda lo que hiciste</p>
        <p class="intro-line"><i></i> Abismo <i></i> Guerra <i></i> Alba <i></i></p>
      </div>
      <button class="intro-skip" id="introSkip">Saltar</button>
    </div>`;
  }

  function runIntro(done) {
    const wrap = $('#intro');
    if (!wrap) { done(); return; }
    const veil = $('#introVeil');
    const timers = [];
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const calm = reduced || !S.settings.motion;

    $('#introSigil').innerHTML = sigilSVG(168, { phase: 4 });
    /* La app que hay detrás no se dibuja hasta que la intro termina: nada de
       dos logos y dos titulos superpuestos. */
    doc.body.classList.add('intro-live');

    if (A.abyss) {
      A.abyss.show(true);
      A.abyss.camera(0);
    }
    /* Con el serafín delante, el fondo se queda en el panorama: no compite. */
    const cam = (n) => { if (A.abyss && !doc.body.classList.contains('angel-live')) A.abyss.camera(n); };

    /* El serafín manda: si hay WebGL y el modelo, la escena CSS se aparta y
       la coreografía la lleva assets/intro/angel3d.js. Si algo falla, la
       clase se retira y vuelve el halo dibujado de siempre. */
    if (A.Angel3D) {
      A.Angel3D.intro().then((good) => {
        if (!good) doc.body.classList.remove('angel-live');
      });
    }

    wrap.classList.add('go');
    timers.push(setTimeout(() => veil.classList.add('dark'), 350));

    if (calm) {
      /* Sin movimiento: la escena se queda en el abismo entero y el logo entra ya. */
      if (A.abyss) A.abyss.camera(3);
      wrap.classList.add('reveal');
      timers.push(setTimeout(cleanup, 2400));
    } else {
      timers.push(setTimeout(() => { wrap.classList.add('fangs'); cam(1); }, INTRO_STEPS[1].at));
      timers.push(setTimeout(() => { wrap.classList.add('battle'); cam(2); }, INTRO_STEPS[2].at));
      timers.push(setTimeout(() => { wrap.classList.add('abyss'); cam(3); }, INTRO_STEPS[3].at));
      timers.push(setTimeout(() => {
        wrap.classList.add('flash');
        const f = $('#introFlash');
        if (f) { f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 620); }
      }, INTRO_STEPS[4].at));
      timers.push(setTimeout(() => wrap.classList.add('reveal'), INTRO_STEPS[5].at));
      timers.push(setTimeout(cleanup, INTRO_STEPS[6].at));
    }

    function cleanup() {
      timers.forEach(clearTimeout);
      wrap.classList.add('out');
      if (A.abyss) A.abyss.camera(3);
      /* El ángel se queda quieto detrás del menú hasta que se entra. */
      if (A.Angel3D) A.Angel3D.idle();
      if (navigator.vibrate) { try { navigator.vibrate([8, 40, 14]); } catch (e) {} }
      setTimeout(() => { wrap.remove(); doc.body.classList.remove('intro-live'); done(); }, 620);
    }
    const skip = $('#introSkip');
    if (skip) skip.addEventListener('click', cleanup);
  }


  /* ------------------------------- Escenario ------------------------------ */
  function buildStage() {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !S.settings.motion) return;
    const stars = $('#stars');
    const dust = $('#dust');
    if (!stars) return;
    const ctx = stars.getContext ? stars.getContext('2d') : null;
    const dctx = dust && dust.getContext ? dust.getContext('2d') : null;
    if (!ctx) return;
    let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    const starArr = [], dustArr = [];
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      [stars, dust].forEach((c) => {
        if (!c) return;
        c.width = W * dpr; c.height = H * dpr;
        c.style.width = W + 'px'; c.style.height = H + 'px';
      });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (dctx) dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      starArr.length = 0; dustArr.length = 0;
      const n = Math.round((W * H) / 22000);
      for (let i = 0; i < n; i++) starArr.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + .2, p: Math.random() * 6.28, s: .4 + Math.random() });
      for (let i = 0; i < 14; i++) dustArr.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + .5, v: .06 + Math.random() * .2, o: .1 + Math.random() * .35 });
    }
    resize();
    window.addEventListener('resize', resize);
    let t = 0;
    function frame() {
      t += .016;
      ctx.clearRect(0, 0, W, H);
      starArr.forEach((s) => {
        const a = .35 + Math.sin(t * s.s + s.p) * .35;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fillStyle = `rgba(255,244,214,${Math.max(.05, a * .5).toFixed(3)})`;
        ctx.fill();
      });
      if (dctx) {
        dctx.clearRect(0, 0, W, H);
        dustArr.forEach((d) => {
          d.y -= d.v; d.x += Math.sin(t + d.r) * .12;
          if (d.y < -6) { d.y = H + 6; d.x = Math.random() * W; }
          dctx.beginPath(); dctx.arc(d.x, d.y, d.r, 0, 6.283);
          dctx.fillStyle = `rgba(232,207,149,${d.o.toFixed(2)})`; dctx.fill();
        });
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* --------------------------------- Intro -------------------------------- */
  function showIntro() {
    if ($('#intro')) return;
    if (A.abyss) A.abyss.mount();
    const host = $('#introHost') || doc.body.appendChild(Object.assign(doc.createElement('div'), { id: 'introHost' }));
    host.innerHTML = introMarkup();
    runIntro(() => {
      S.seenIntro = true; save(); render();
    });
  }


  /* ------------------------------ Exportación ------------------------------ */
  A.INTRO_STEPS = INTRO_STEPS;
  A.introMarkup = introMarkup;
  A.runIntro = runIntro;
  A.buildStage = buildStage;
  A.showIntro = showIntro;

})(window.Seraph = window.Seraph || {});
