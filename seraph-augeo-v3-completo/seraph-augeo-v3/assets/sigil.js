/* ============================================================================
   El sello de Seraph Augeo — ojo vertical, seis alas, halo.
   Se dibuja en SVG, sin imágenes externas. Cambia con la fase (1 a 4).
   ============================================================================ */
(function (root) {
  'use strict';

  /* Cada fase define el ángulo de tres pares de alas, su escala y la luz. */
  const WING_SET = {
    1: { right: [58, 78, 96],  left: [122, 102, 84],  scale: .62, op: .34, halo: 0,   rays: 0 },
    2: { right: [22, 48, 74],  left: [158, 132, 106], scale: .80, op: .58, halo: .5,  rays: 0 },
    3: { right: [-2, 28, 58],  left: [182, 152, 122], scale: .94, op: .82, halo: .85, rays: 0 },
    4: { right: [-14, 18, 50], left: [194, 162, 130], scale: 1.02, op: 1,  halo: 1,   rays: 1 },
  };

  const BLADE = 'M0 0C7 -3.4 22 -10 38 -18.6 45 -22.2 49.4 -22.4 48.6 -17.4 42.6 -4 23 7.4 7.6 8.4 2 8.8 -2.2 5.4 0 0Z';
  const SPINE = 'M2.4 .8C13 -.4 28 -6.4 42 -15.2';
  const BARB1 = 'M14 -1.8C17.6 -4.4 21 -6.6 24.4 -8.4';
  const BARB2 = 'M23 1.6C26.4 -1 29.6 -3.2 32.6 -5';
  const BARB3 = 'M31.4 4.6C34.4 2.2 37 0 39.4 -1.8';

  let seq = 0;

  /* Ala suelta, reutilizable: sirve para el sello y para la intro. */
  function wingSVG(deg, radius, scale, opacity, mirror) {
    const t = (mirror ? 'scale(-1 1) ' : '') + `rotate(${deg}) translate(${radius} 0) scale(${scale})`;
    return `<g transform="${t}" opacity="${opacity}">
      <path d="${BLADE}" fill="rgba(232,207,149,.10)" stroke="rgba(255,242,205,.86)" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="${SPINE}" fill="none" stroke="rgba(232,207,149,.5)" stroke-width=".7"/>
      <path d="${BARB1}${BARB2}${BARB3}" fill="none" stroke="rgba(232,207,149,.3)" stroke-width=".55" stroke-linecap="round"/>
    </g>`;
  }

  function sigilSVG(size, opt) {
    const o = opt || {};
    const phase = Math.min(4, Math.max(1, o.phase || 1));
    const set = WING_SET[phase];
    const id = 'sig' + (++seq);
    const glow = o.glow !== false;

    const wing = (deg, s, mirror) => `<g transform="translate(60 60) ${mirror ? 'scale(-1 1) ' : ''}rotate(${deg}) translate(20 0) scale(${(set.scale * s).toFixed(3)})">
        <path d="${BLADE}" fill="url(#${id}wf)" stroke="var(--gold-3)" stroke-opacity=".92" stroke-width="1.15" stroke-linejoin="round"/>
        <path d="${SPINE}" fill="none" stroke="var(--gold-2)" stroke-opacity=".6" stroke-width=".7"/>
        <path d="${BARB1}${BARB2}${BARB3}" fill="none" stroke="var(--gold-2)" stroke-opacity=".34" stroke-width=".55" stroke-linecap="round"/>
      </g>`;

    // El ala izquierda es un espejo real, no una copia rotada: así la curva coincide.
    const wingsR = set.right.map((a, i) => wing(a, 1 - i * .13, false)).join('');
    const wingsL = set.right.map((a, i) => wing(a, 1 - i * .13, true)).join('');

    const halo = `<g opacity="${set.halo}" style="transition:opacity 1.2s linear">
        <ellipse cx="60" cy="26.6" rx="21.5" ry="5.1" fill="none" stroke="var(--gold-2)" stroke-width="1.25" stroke-opacity=".95"/>
        <ellipse cx="60" cy="26.6" rx="14.4" ry="3.1" fill="none" stroke="var(--gold)" stroke-width=".7" stroke-opacity=".5"/>
        <path d="M60 11.2 63.6 15.1 60 19 56.4 15.1Z" fill="var(--gold-2)"/>
      </g>`;

    const rays = set.rays ? `<g opacity=".5">${Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + .26;
      const r1 = 31, r2 = i % 2 ? 34.6 : 37.4;
      return `<line x1="${(60 + Math.cos(a) * r1).toFixed(1)}" y1="${(60 + Math.sin(a) * r1).toFixed(1)}" x2="${(60 + Math.cos(a) * r2).toFixed(1)}" y2="${(60 + Math.sin(a) * r2).toFixed(1)}" stroke="var(--gold-2)" stroke-width=".65" stroke-opacity=".55" stroke-linecap="round"/>`;
    }).join('')}</g>` : '';

    return `<svg class="sigil-svg" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="Sello de Seraph Augeo">
      <defs>
        <linearGradient id="${id}wf" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="var(--gold-3)" stop-opacity=".30"/>
          <stop offset=".5" stop-color="var(--gold)" stop-opacity=".14"/>
          <stop offset="1" stop-color="var(--gold-3)" stop-opacity=".34"/>
        </linearGradient>
        <radialGradient id="${id}iris" cx=".42" cy=".34" r=".74">
          <stop offset="0" stop-color="#fffbea"/>
          <stop offset=".42" stop-color="var(--gold-2)"/>
          <stop offset="1" stop-color="#7d6229"/>
        </radialGradient>
        <radialGradient id="${id}halo" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="var(--gold-2)" stop-opacity=".55"/>
          <stop offset="1" stop-color="var(--gold)" stop-opacity="0"/>
        </radialGradient>
      </defs>
      ${glow ? `<circle cx="60" cy="60" r="47" fill="url(#${id}halo)" opacity="${phase >= 3 ? .85 : .35}"/>` : ''}
      ${rays}
      <g opacity="${set.op}" style="transition:opacity 1.2s linear">${wingsL}${wingsR}</g>
      <circle cx="60" cy="60" r="25.4" fill="none" stroke="var(--gold)" stroke-width="1" stroke-opacity=".45"/>
      <path d="M60 33.6C79.6 45.2 79.6 74.8 60 86.4 40.4 74.8 40.4 45.2 60 33.6Z"
        fill="var(--ink-2)" stroke="var(--gold-2)" stroke-width="1.55"/>
      <circle cx="60" cy="60" r="9.8" fill="url(#${id}iris)" class="iris"/>
      <circle cx="60" cy="60" r="13.8" fill="none" stroke="var(--gold-2)" stroke-width=".7" stroke-opacity=".45" stroke-dasharray="1.3 3.6" class="ring-rot"/>
      <path d="M60 54.2 64.2 60 60 65.8 55.8 60Z" fill="#1a1408"/>
      <circle cx="63.2" cy="56.7" r="1.35" fill="#fffdf3" opacity=".95"/>
      ${halo}
    </svg>`;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { sigilSVG, wingSVG, WING_SET };
  else { root.SeraphSigil = sigilSVG; root.SeraphWing = wingSVG; }
})(typeof window !== 'undefined' ? window : globalThis);
