/* ============================================================================
   ui/abyss — La escena: el final de una guerra, delante de un abismo
   Capas de profundidad en CSS puro sobre un campo de batalla pálido (gris,
   plata, hueso y oro) con algo oscuro detrás: una garganta con colmillos.

   La "cámara" son cuatro estados (data-cam 0..3):
     0 · el ojo, de cerca, en el negro
     1 · la cámara se aleja y aparecen los colmillos
     2 · el campo de batalla (espadas, estandartes, ruinas)
     3 · el panorama entero detrás del menú
   ============================================================================ */
(function (A) {
  'use strict';

  const S = A.S;

  /* PRNG determinista: la escena se ve igual en cada carga. */
  function prng(n) {
    let s = n >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------- Colmillos ------------------------------- */
  function jaw(count, base, seedValue, gid) {
    const r = prng(seedValue);
    const step = 1000 / count;
    let d = '';
    for (let i = 0; i < count; i++) {
      const x = i * step + step * 0.05;
      const w = step * (0.8 + r() * 0.14);
      const h = base * (0.5 + r() * 0.8);
      const lean = (r() - 0.5) * step * 0.2;
      d += `M${x.toFixed(1)} 0 L${(x + w / 2 + lean).toFixed(1)} ${h.toFixed(1)} L${(x + w).toFixed(1)} 0 Z `;
    }
    return `<svg viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a0a0d"/>
          <stop offset=".38" stop-color="#2b2b31"/>
          <stop offset=".74" stop-color="#8d8577"/>
          <stop offset="1" stop-color="#efe6d2"/>
        </linearGradient>
      </defs>
      <path d="${d}" fill="url(#${gid})"/>
      <path d="${d}" fill="none" stroke="rgba(255,248,232,.3)" stroke-width="1.1" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  /* ------------------------------- Espadas --------------------------------- */
  function sword(seedValue, tilt) {
    const r = prng(seedValue);
    const broke = r() > 0.55;
    const bladeTop = broke ? 96 : 22;
    const len = broke ? 180 : 202;
    return `<svg viewBox="0 0 60 300" aria-hidden="true" style="transform:rotate(${tilt || 0}deg)">
      <defs>
        <linearGradient id="sw${seedValue}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#2c2f36"/>
          <stop offset=".42" stop-color="#8b919b"/>
          <stop offset=".56" stop-color="#e6eaf0"/>
          <stop offset="1" stop-color="#282b31"/>
        </linearGradient>
      </defs>
      <path d="M30 ${bladeTop} L37 150 L30 ${broke ? 196 : 214} L23 150 Z" fill="url(#sw${seedValue})" stroke="rgba(255,248,232,.3)" stroke-width=".8"/>
      <path d="M30 ${bladeTop + 6} v${len - bladeTop}" stroke="rgba(255,252,240,.5)" stroke-width=".7"/>
      ${broke ? `<path d="M37 148 l-6 8 5 7 -6 8" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="1"/>` : ''}
      <rect x="12" y="${broke ? 190 : 208}" width="36" height="7" rx="2.4" fill="#6b5a34" stroke="rgba(232,207,149,.7)" stroke-width=".8"/>
      <rect x="26.5" y="${broke ? 197 : 215}" width="7" height="52" rx="3" fill="#382c1a" stroke="rgba(232,207,149,.5)" stroke-width=".7"/>
      <circle cx="30" cy="${broke ? 254 : 272}" r="6.4" fill="#7d6531" stroke="rgba(255,238,196,.8)" stroke-width=".9"/>
    </svg>`;
  }

  /* ------------------------------- Lanzas ---------------------------------- */
  function spear(seedValue, tilt, h) {
    const r = prng(seedValue);
    const broken = r() > 0.5;
    return `<svg viewBox="0 0 40 ${h}" aria-hidden="true" style="transform:rotate(${tilt}deg)">
      <rect x="18.4" y="${broken ? 26 : 18}" width="3.2" height="${h - (broken ? 34 : 26)}" rx="1.4" fill="#3a3128" stroke="rgba(232,207,149,.28)" stroke-width=".6"/>
      ${broken
        ? `<path d="M18 26 l4 -14 4 14Z" fill="#6d6a63"/>`
        : `<path d="M20 4 l6 20 -6 8 -6 -8Z" fill="#cfd4dc" stroke="rgba(255,250,235,.7)" stroke-width=".9"/>`}
      <rect x="15" y="${broken ? 28 : 30}" width="10" height="2.6" rx="1" fill="rgba(232,207,149,.5)"/>
    </svg>`;
  }

  /* ---------------------------- Estandartes -------------------------------- */
  function banner(seedValue, flip) {
    const r = prng(seedValue);
    const len = 120 + r() * 60;
    const teeth = Array.from({ length: 5 }, (_, i) => `${18 + i * 15} ${len - (i % 2 ? 26 : 4)}`).join(' L');
    return `<svg viewBox="0 0 110 ${len + 20}" aria-hidden="true">
      <rect x="8" y="6" width="4" height="${len + 10}" rx="2" fill="#4a3d28" stroke="rgba(232,207,149,.4)" stroke-width=".8"/>
      <circle cx="10" cy="4" r="4" fill="rgba(232,207,149,.7)"/>
      <path d="M12 16 L${teeth} L96 16 Z" fill="rgba(150,140,120,.16)" stroke="rgba(232,207,149,.34)" stroke-width="1"/>
      <path d="M12 16 L32 ${len - 40} M12 16 L58 ${len - 10}" stroke="rgba(232,207,149,.22)" stroke-width=".8" fill="none"/>
      ${flip ? '' : `<path d="M52 40 l10 8 -10 8 10 8 -10 8" fill="none" stroke="rgba(232,207,149,.3)" stroke-width="1"/>`}
    </svg>`;
  }

  /* ------------------------------ Ruinas ----------------------------------- */
  function column(seedValue, h) {
    const r = prng(seedValue);
    const chips = Array.from({ length: 3 }, (_, i) => {
      const y = 30 + r() * (h - 60);
      return `<path d="M${10 + r() * 10} ${y} l9 ${4 + r() * 6} -7 ${5 + r() * 5}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>`;
    }).join('');
    return `<svg viewBox="0 0 60 ${h}" preserveAspectRatio="none" aria-hidden="true">
      <rect x="6" y="10" width="48" height="9" rx="2" fill="#3b3a3d" stroke="rgba(214,207,190,.3)" stroke-width="1"/>
      <path d="M12 19 h36 l-3 ${h - 26} h-30 Z" fill="#2c2b2f" stroke="rgba(214,207,190,.22)" stroke-width="1"/>
      ${Array.from({ length: 5 }, (_, i) => `<path d="M${16 + i * 7} 22 v${h - 34}" stroke="rgba(214,207,190,.1)" stroke-width="1.4"/>`).join('')}
      ${chips}
      <path d="M8 ${h - 12} h44 l4 10 H4 Z" fill="#333236" stroke="rgba(214,207,190,.3)" stroke-width="1"/>
    </svg>`;
  }

  function tower() {
    return `<svg viewBox="0 0 160 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M14 300 V96 l16 -14 V58 h20 v22 l14 -12 V40 h18 v30 l14 -10 v24 l16 -12 v228 Z" fill="#141419"/>
      <path d="M14 96 l16 -14 V58 h20 v22 l14 -12 V40 h18 v30 l14 -10 v24 l16 -12" fill="none" stroke="rgba(214,207,190,.18)" stroke-width="1.4"/>
      <rect x="52" y="132" width="16" height="26" rx="8" fill="rgba(255,206,150,.5)"/>
      <rect x="96" y="170" width="12" height="20" rx="6" fill="rgba(255,196,130,.35)"/>
      <path d="M30 230 h90 M30 260 h80" stroke="rgba(214,207,190,.12)" stroke-width="2"/>
    </svg>`;
  }

  function shield(seedValue) {
    return `<svg viewBox="0 0 80 96" aria-hidden="true">
      <defs><linearGradient id="sh${seedValue}" x1="0" y1="0" x2=".6" y2="1">
        <stop offset="0" stop-color="#4d4c52"/><stop offset=".6" stop-color="#232227"/><stop offset="1" stop-color="#101014"/>
      </linearGradient></defs>
      <path d="M40 6c16 6 30 8 30 8v34c0 22-16 34-30 42C26 82 10 70 10 48V14s14-2 30-8Z" fill="url(#sh${seedValue})" stroke="rgba(232,207,149,.4)" stroke-width="1.4"/>
      <path d="M40 20v50 M20 40h40" stroke="rgba(232,207,149,.34)" stroke-width="2"/>
      <path d="M40 6c16 6 30 8 30 8" stroke="rgba(255,250,235,.4)" stroke-width="1.2" fill="none"/>
    </svg>`;
  }

  /* --------------------------------- Ojo ----------------------------------- */
  function eyeMarkup(tag) {
    const t = tag || 'a';
    return `<div class="ab-eye${t === 'a' ? '' : ' ab-eye-embed'}" aria-hidden="true">
      <div class="ab-eye-glow"></div>
      <svg class="ab-eye-svg" viewBox="0 0 400 470">
        <defs>
          <radialGradient id="${t}Socket" cx=".5" cy=".4" r=".62">
            <stop offset="0" stop-color="#241012"/>
            <stop offset=".62" stop-color="#0a0709"/>
            <stop offset="1" stop-color="#050405"/>
          </radialGradient>
          <radialGradient id="${t}Iris" cx=".4" cy=".32" r=".78">
            <stop offset="0" stop-color="#fffdf2"/>
            <stop offset=".26" stop-color="#f6e6b6"/>
            <stop offset=".62" stop-color="#c2a45c"/>
            <stop offset=".88" stop-color="#6d5726"/>
            <stop offset="1" stop-color="#2e2410"/>
          </radialGradient>
          <linearGradient id="${t}Lid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="rgba(255,252,240,.86)"/>
            <stop offset=".5" stop-color="rgba(214,207,190,.2)"/>
            <stop offset="1" stop-color="rgba(255,252,240,.7)"/>
          </linearGradient>
        </defs>
        <path class="ab-eye-globe" d="M200 26C306 108 322 216 200 452 78 216 94 108 200 26Z"
          fill="url(#${t}Socket)" stroke="url(#${t}Lid)" stroke-width="3.2"/>
        <g class="ab-eye-iris">
          <circle cx="200" cy="238" r="88" fill="url(#${t}Iris)"/>
          <g stroke="rgba(34,26,10,.4)" stroke-width="1.4" stroke-linecap="round">
            ${Array.from({ length: 26 }, (_, i) => {
              const a = (i / 26) * Math.PI * 2;
              const r1 = 30, r2 = 86;
              return `<line x1="${(200 + Math.cos(a) * r1).toFixed(1)}" y1="${(238 + Math.sin(a) * r1).toFixed(1)}" x2="${(200 + Math.cos(a) * r2).toFixed(1)}" y2="${(238 + Math.sin(a) * r2).toFixed(1)}"/>`;
            }).join('')}
          </g>
          <circle cx="200" cy="238" r="88" fill="none" stroke="rgba(30,22,8,.5)" stroke-width="5"/>
        </g>
        <g class="ab-eye-pupil">
          <ellipse cx="200" cy="238" rx="27" ry="70" fill="#070506"/>
          <ellipse cx="200" cy="238" rx="27" ry="70" fill="none" stroke="rgba(255,236,190,.3)" stroke-width="1.6"/>
          <circle cx="216" cy="208" r="10" fill="#fffdf7" opacity=".95"/>
          <circle cx="212" cy="212" r="9" fill="#fff6d8" opacity=".35"/>
        </g>
        <path d="M200 26C306 108 322 216 200 452" fill="none" stroke="rgba(255,252,240,.22)" stroke-width="6"/>
      </svg>
    </div>`;
  }

  /* ------------------------------- La escena -------------------------------- */
  function markup() {
    const topBack = jaw(15, 190, 21, 'abJawB1');
    const topFront = jaw(9, 268, 77, 'abJawF1');
    const botFront = jaw(10, 250, 131, 'abJawF2');

    const ash = Array.from({ length: 22 }, (_, i) => {
      const r = prng(i * 17 + 3);
      return `<i style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 100).toFixed(1)}%;--sz:${(1 + r() * 2.4).toFixed(1)}px;--dur:${(16 + r() * 18).toFixed(1)}s;--del:${(-r() * 18).toFixed(1)}s;--dx:${((r() - 0.5) * 90).toFixed(0)}px"></i>`;
    }).join('');

    return `<div class="ab-world">
      <div class="ab-sky"></div>
      <div class="ab-sun"></div>
      <div class="ab-throat"></div>

      <div class="ab-jaw ab-jaw-back ab-jaw-top">${topBack}</div>
      <div class="ab-jaw ab-jaw-back ab-jaw-bottom">${topBack}</div>

      <div class="ab-battle">
        <div class="ab-haze"></div>
        <div class="ab-tower">${tower()}</div>

        <div class="ab-ruin ab-ruin-l1">${column(3, 300)}</div>
        <div class="ab-ruin ab-ruin-l2">${column(11, 210)}</div>
        <div class="ab-ruin ab-ruin-r1">${column(19, 250)}</div>

        <div class="ab-flag ab-flag-l">${banner(23, false)}</div>
        <div class="ab-flag ab-flag-r">${banner(31, true)}</div>

        <svg class="ab-hill" viewBox="0 0 1200 380" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 250C140 216 250 244 380 230 510 216 620 244 760 232 900 220 1050 246 1200 232V380H0Z" fill="#101014"/>
          <path d="M0 250C140 216 250 244 380 230 510 216 620 244 760 232 900 220 1050 246 1200 232" fill="none" stroke="rgba(232,219,190,.22)" stroke-width="1.4"/>
        </svg>

        <div class="ab-field">
          <div class="ab-spear ab-sp1">${spear(5, -8, 320)}</div>
          <div class="ab-spear ab-sp2">${spear(13, 5, 250)}</div>
          <div class="ab-spear ab-sp3">${spear(29, -4, 300)}</div>
          <div class="ab-spear ab-sp4">${spear(37, 9, 220)}</div>
          <div class="ab-blade ab-bl1">${sword(41, 4)}</div>
          <div class="ab-blade ab-bl2">${sword(53, -12)}</div>
          <div class="ab-shield ab-sh1">${shield(61)}</div>
          <div class="ab-shield ab-sh2">${shield(67)}</div>
        </div>

        <svg class="ab-ground" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 150C150 118 260 158 400 142 540 126 640 160 780 148 920 136 1060 164 1200 142V300H0Z" fill="#08080b"/>
          <path d="M0 150C150 118 260 158 400 142 540 126 640 160 780 148 920 136 1060 164 1200 142" fill="none" stroke="rgba(232,219,190,.16)" stroke-width="1.2"/>
        </svg>

        <div class="ab-smoke ab-sm1"></div>
        <div class="ab-smoke ab-sm2"></div>
        <div class="ab-smoke ab-sm3"></div>
        <div class="ab-fire ab-fi1"></div>
        <div class="ab-fire ab-fi2"></div>
      </div>

      ${eyeMarkup()}

      <div class="ab-jaw ab-jaw-front ab-jaw-top">${topFront}</div>
      <div class="ab-jaw ab-jaw-front ab-jaw-bottom">${botFront}</div>

      <div class="ab-ash">${ash}</div>
    </div>
    <div class="ab-glow"></div>
    <div class="ab-vignette"></div>`;
  }

  /* --------------------------------- Control -------------------------------- */
  const host = () => document.getElementById('abyss');
  let bound = false;
  let raf = 0;
  let tx = 0, ty = 0, cx = 0, cy = 0;

  function motionOn() {
    if (S && S.settings && S.settings.motion === false) return false;
    return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function tick() {
    cx += (tx - cx) * 0.1;
    cy += (ty - cy) * 0.1;
    /* En la raíz, para que cualquier capa (incluso el sello del menú) lo lea. */
    const root = document.documentElement;
    root.style.setProperty('--mx', cx.toFixed(3));
    root.style.setProperty('--my', cy.toFixed(3));
    /* El serafín respira con el mismo movimiento del ratón. */
    if (A.Angel3D && A.Angel3D.parallax) A.Angel3D.parallax(cx, cy);
    if (Math.abs(tx - cx) > 0.0015 || Math.abs(ty - cy) > 0.0015) raf = requestAnimationFrame(tick);
    else raf = 0;
  }

  function onPointer(e) {
    if (!motionOn()) return;
    tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    ty = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function bindPointer() {
    if (bound) return;
    bound = true;
    document.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  }

  function mount() {
    const el = host();
    if (!el || el.dataset.ready === '1') return el;
    el.innerHTML = markup();
    el.dataset.ready = '1';
    el.dataset.cam = '0';
    if (motionOn()) bindPointer();
    else el.classList.add('still');
    return el;
  }

  function show(on) {
    const el = mount();
    if (!el) return;
    el.classList.toggle('is-off', !on);
    if (on && motionOn()) bindPointer();
  }

  /* La cámara: 0 ojo de cerca · 1 colmillos · 2 campo de batalla · 3 panorama */
  function camera(n) {
    const el = mount();
    if (!el) return;
    if (!motionOn()) {
      el.dataset.cam = '3';
      el.classList.add('still');
      return;
    }
    el.dataset.cam = String(Math.max(0, Math.min(3, n | 0)));
  }

  A.abyss = { mount, show, camera, markup, eyeMarkup };

})(window.Seraph = window.Seraph || {});
