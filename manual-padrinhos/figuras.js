// Ilustrações em estilo aquarela dos padrinhos e madrinhas.
// Cada figura é desenhada num espaço de 200 x 600 unidades (centro em x = 100, pés em y ≈ 575).

const INK = '#5a3a2c';

// Filtros SVG: bordas irregulares, pigmento acumulado nas bordas e granulação (aquarela)
// e um leve tremor no traço (nanquim).
function aquarelaDefs(seed = 1) {
  return `
  <defs>
    <filter id="wc${seed}" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="${seed}" result="n1"/>
      <feDisplacementMap in="SourceGraphic" in2="n1" scale="4.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="${seed + 7}" result="n2"/>
      <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.5 1.2" result="blot"/>
      <feComposite in="d" in2="blot" operator="in" result="washed"/>
      <feMorphology in="d" operator="erode" radius="1.6" result="er"/>
      <feComposite in="d" in2="er" operator="out" result="edge"/>
      <feColorMatrix in="edge" type="matrix" values="0.7 0 0 0 0  0 0.7 0 0 0  0 0 0.7 0 0  0 0 0 0.5 0" result="edgeDark"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="${seed + 3}" result="grain"/>
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.3 1.1" result="grainA"/>
      <feMerge result="m"><feMergeNode in="washed"/><feMergeNode in="edgeDark"/></feMerge>
      <feComposite in="m" in2="grainA" operator="in"/>
    </filter>
    <filter id="ink${seed}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="${seed + 11}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>`;
}

function layer(seed, fills, lines) {
  return `<g filter="url(#wc${seed})">${fills}</g>
          <g filter="url(#ink${seed})" fill="none" stroke="${INK}" stroke-width="1.1"
             stroke-linecap="round" stroke-linejoin="round" opacity=".6">${lines}</g>`;
}

// ---------- utilidades ----------
const seg = (pts, cor, w, extra = '') =>
  `<path d="M${pts.map((p) => p.join(' ')).join(' L')}" stroke="${cor}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

// Braço: ombro → cotovelo → pulso, com mão no final.
function braco([o, c, p], { manga, skin, wU, wF, maoVisivel = true, punho }) {
  const dx = p[0] - c[0], dy = p[1] - c[1], L = Math.hypot(dx, dy) || 1;
  const mao = [p[0] + (dx / L) * 9, p[1] + (dy / L) * 9];
  let s = '';
  s += seg([o, c], INK, wU + 1.6, 'opacity=".35"') + seg([c, p], INK, wF + 1.6, 'opacity=".35"');
  s += seg([o, c], manga.upper, wU) + seg([c, p], manga.fore, wF);
  if (punho && maoVisivel) s += seg([[p[0] - (dx / L) * 2, p[1] - (dy / L) * 2], p], punho, wF - 1);
  if (maoVisivel) s += seg([p, mao], skin, wF - 2);
  return s;
}

// Mistura simples de cores (para tons claros/escuros).
function mix(hex, alvo, t) {
  const a = hex.match(/\w\w/g).map((h) => parseInt(h, 16));
  const b = alvo.match(/\w\w/g).map((h) => parseInt(h, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// ---------- cabelos ----------
function cabeloMulher(estilo, c) {
  const esc = mix(c, '#000000', 0.35);
  const topo = `<path d="M83 50 C80 28 92 25 100 26 C110 26 121 30 117 50 C114 38 106 34 100 34 C93 35 86 40 83 50 Z" fill="${c}"/>`;
  const e = {
    longo: {
      tras: `<path d="M82 44 C76 90 74 140 78 176 L122 176 C126 140 124 90 118 44 Z" fill="${c}"/>`,
      frente: topo + `<path d="M84 48 C80 80 84 118 78 160 C88 140 90 96 90 62 Z" fill="${c}"/><path d="M116 48 C120 80 116 118 122 160 C112 140 110 96 110 62 Z" fill="${c}"/>`,
    },
    ondulado: {
      tras: `<path d="M82 44 C72 70 80 90 72 112 C66 132 78 150 72 172 L128 172 C122 150 134 132 128 112 C120 90 128 70 118 44 Z" fill="${c}"/>`,
      frente: topo + `<path d="M84 48 C78 70 88 86 80 104 C74 122 86 136 78 156 C92 146 88 124 92 108 C96 90 88 72 92 60 Z" fill="${c}"/>
        <path d="M86 90 C82 104 88 118 84 132" stroke="${esc}" stroke-width="1.5" fill="none" opacity=".6"/>`,
    },
    coque: {
      tras: `<circle cx="100" cy="24" r="12" fill="${c}"/>`,
      frente: `<path d="M82 52 C80 30 92 26 100 26 C110 26 121 32 118 52 C114 40 108 36 100 36 C92 36 86 40 82 52 Z" fill="${c}"/>
        <path d="M92 22 C96 16 106 16 110 24" stroke="${esc}" stroke-width="1.5" fill="none" opacity=".6"/>`,
    },
    rabo: {
      tras: `<path d="M112 34 C132 50 130 96 138 138 C124 124 120 84 108 50 Z" fill="${c}"/>`,
      frente: `<path d="M82 52 C80 30 92 26 100 26 C110 26 121 32 118 52 C114 40 108 35 100 35 C92 36 86 40 82 52 Z" fill="${c}"/>`,
    },
    chanel: {
      tras: '',
      frente: `<path d="M81 50 C77 26 123 26 119 50 L122 78 C114 82 108 76 107 66 L108 44 C104 38 96 38 92 44 L93 66 C92 76 86 82 78 78 Z" fill="${c}"/>`,
    },
    cacheado: {
      tras: [[82, 40, 13], [118, 40, 13], [78, 62, 12], [122, 62, 12], [80, 84, 11], [120, 84, 11], [100, 24, 15], [86, 26, 11], [114, 26, 11], [84, 104, 9], [116, 104, 9]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join(''),
      frente: `<path d="M84 46 C84 34 94 30 100 32 C108 30 116 34 116 46 C110 38 90 38 84 46 Z" fill="${c}"/>`,
    },
    lateral: {
      tras: `<path d="M84 44 C78 70 82 100 86 120 L118 44 Z" fill="${c}"/>`,
      frente: topo + `<path d="M116 44 C124 70 118 90 126 112 C132 132 122 150 130 170 C114 162 118 140 112 120 C106 100 114 80 108 56 Z" fill="${c}"/>
        <path d="M118 96 C122 112 116 126 122 142" stroke="${esc}" stroke-width="1.5" fill="none" opacity=".6"/>`,
    },
  };
  return e[estilo];
}

function cabeloHomem(estilo, c, barba) {
  const e = {
    curto: `<path d="M81 48 C78 26 92 20 102 21 C116 21 123 32 119 48 C117 38 112 33 100 33 C90 33 85 38 81 48 Z" fill="${c}"/>`,
    topete: `<path d="M81 48 C76 22 96 12 110 16 C124 20 124 34 119 48 C116 36 110 30 98 32 C90 32 85 38 81 48 Z" fill="${c}"/>`,
    cacheado: [[86, 32, 9], [98, 25, 10], [110, 27, 9], [118, 38, 8], [82, 42, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join(''),
    raspado: `<path d="M82 46 C80 28 92 24 100 24 C110 24 120 28 118 46 C114 34 106 31 100 31 C94 31 86 34 82 46 Z" fill="${c}" opacity=".7"/>`,
    lateral: `<path d="M81 50 C76 26 92 18 104 20 C118 22 124 32 119 50 C116 38 110 30 92 34 C86 38 83 42 81 50 Z" fill="${c}"/>`,
  };
  const b = barba ? `<path d="M83 52 C84 70 92 76 100 76 C108 76 116 70 117 52 C114 64 108 66 100 66 C92 66 86 64 83 52 Z" fill="${c}" opacity=".85"/>` : '';
  return e[estilo] + b;
}

function rosto(skin) {
  const sombra = mix(skin, '#7a4a30', 0.25);
  return `<ellipse cx="100" cy="50" rx="16.5" ry="21" fill="${skin}"/>
          <path d="M108 38 C116 44 116 62 106 70 C112 60 112 46 108 38 Z" fill="${sombra}" opacity=".5"/>`;
}

// ---------- madrinha ----------
const POSES_M = {
  baixo: { L: [[77, 102], [72, 180], [70, 254]], R: [[123, 102], [128, 180], [130, 254]] },
  bolsa: { L: [[77, 102], [72, 180], [70, 254]], R: [[123, 102], [132, 176], [110, 212]], prop: 'clutch' },
  cintura: { L: [[77, 102], [56, 158], [82, 202]], R: [[123, 102], [128, 180], [130, 254]] },
  buque: { L: [[77, 102], [74, 178], [95, 222]], R: [[123, 102], [126, 178], [105, 222]], prop: 'buque' },
  quadril: { L: [[77, 102], [72, 180], [70, 254]], R: [[123, 102], [146, 160], [120, 206]] },
};

function vestido(modelo, c, skin) {
  const { base, shade, light } = c;
  const V = {
    tomara: {
      f: `<path d="M79 120 C86 112 94 116 100 122 C106 116 114 112 121 120 L116 192 L84 192 Z" fill="${base}"/>
          <path d="M84 190 L116 190 C132 270 152 420 166 574 Q100 582 34 574 C48 420 68 270 84 190 Z" fill="${base}"/>
          <path d="M104 206 C110 330 120 460 128 576 L150 574 C142 440 128 310 112 204 Z" fill="${shade}" opacity=".45"/>
          <path d="M92 210 C84 330 72 460 62 576 L50 575 C60 450 76 320 92 210 Z" fill="${light}" opacity=".5"/>
          <rect x="84" y="186" width="32" height="8" fill="${shade}" opacity=".7"/>`,
      l: `<path d="M79 120 C86 112 94 116 100 122 C106 116 114 112 121 120 L116 192 C132 270 152 420 166 574 Q100 582 34 574 C48 420 68 270 84 192 Z"/>
          <path d="M84 192 L116 192 M100 240 C98 360 94 470 92 574 M112 250 C122 370 130 480 136 574" opacity=".5"/>`,
    },
    babados: {
      f: (() => {
        const tier = (y1, y2, a1, a2, cor) => {
          const n = 7, w = (a2 * 2) / n;
          let hem = '';
          for (let i = 0; i < n; i++) hem += ` Q${100 + a2 - w * (i + 0.5)} ${y2 + 10} ${100 + a2 - w * (i + 1)} ${y2}`;
          return `<path d="M${100 - a1} ${y1} L${100 + a1} ${y1} L${100 + a2} ${y2}${hem} Z" fill="${cor}"/>`;
        };
        return `<path d="M80 118 C88 110 95 116 100 122 C105 116 112 110 120 118 L116 192 L84 192 Z" fill="${base}"/>
          ${tier(430, 566, 52, 72, base)}${tier(300, 440, 38, 56, base)}${tier(188, 308, 16, 40, base)}
          <path d="M60 300 L140 300 L140 310 L60 310 Z M46 432 L154 432 L154 442 L46 442 Z" fill="${shade}" opacity=".35"/>
          <path d="M104 200 L118 300 L126 440 L140 566 L118 566 L110 440 L106 300 Z" fill="${shade}" opacity=".35"/>
          <path d="M92 200 L78 300 L64 440 L50 566 L60 566 L74 440 L86 300 Z" fill="${light}" opacity=".45"/>`;
      })(),
      l: `<path d="M84 86 L82 118 M116 86 L118 118"/>
          <path d="M80 118 C88 110 95 116 100 122 C105 116 112 110 120 118 L116 192 L84 192 Z"/>
          <path d="M84 190 L60 306 M116 190 L140 306 M62 304 L46 440 M138 304 L154 440 M48 436 L28 572 M152 436 L172 572"/>
          <path d="M80 250 L76 300 M100 200 L100 300 M120 250 L124 300 M72 350 L66 430 M100 320 L100 430 M128 350 L134 430 M60 480 L54 560 M100 460 L100 566 M140 480 L146 560" opacity=".45"/>`,
    },
    umombro: {
      f: `<path d="M78 104 L112 86 L122 104 L118 196 L82 196 Z" fill="${base}"/>
          <path d="M82 194 L118 194 C124 260 128 330 126 400 C128 460 134 520 138 574 L62 574 C66 520 72 460 74 400 C72 330 76 260 82 194 Z" fill="${base}"/>
          <path d="M110 400 L138 574 L114 574 Z" fill="${skin}"/>
          <path d="M110 400 L114 574 L104 574 Z" fill="${shade}" opacity=".6"/>
          <path d="M78 104 L112 86 L104 120 Z" fill="${shade}" opacity=".45"/>
          <path d="M84 210 C82 300 78 420 70 570 L64 570 C68 440 74 320 84 210 Z" fill="${light}" opacity=".5"/>
          <path d="M112 90 C126 96 130 104 128 118 C122 108 116 102 110 100 Z" fill="${base}"/>`,
      l: `<path d="M78 104 L112 86 L122 104 L118 196 C124 260 128 330 126 400 C128 460 134 520 138 574 L62 574 C66 520 72 460 74 400 C72 330 76 260 82 196 Z"/>
          <path d="M110 400 L114 574 M110 400 L138 574"/><path d="M86 112 L112 96 M88 126 L116 110 M90 140 L118 124" opacity=".5"/>`,
    },
    sereia: {
      f: `<path d="M79 118 L121 118 L116 192 C122 220 126 250 122 300 C120 350 116 390 114 420 C124 470 146 530 164 574 Q100 586 36 574 C54 530 76 470 86 420 C84 390 80 350 78 300 C74 250 78 220 84 192 Z" fill="${base}"/>
          <path d="M104 200 C112 260 116 330 110 420 C120 480 136 540 150 576 L124 578 C114 530 104 480 100 420 C106 330 104 260 100 200 Z" fill="${shade}" opacity=".4"/>
          <path d="M84 200 C80 260 82 330 88 420 C80 480 66 540 54 574 L62 576 C74 530 88 480 94 420 C90 330 88 260 88 200 Z" fill="${light}" opacity=".5"/>`,
      l: `<path d="M79 118 L121 118 L116 192 C122 220 126 250 122 300 C120 350 116 390 114 420 C124 470 146 530 164 574 Q100 586 36 574 C54 530 76 470 86 420 C84 390 80 350 78 300 C74 250 78 220 84 192 Z"/>
          <path d="M86 420 C96 424 106 424 114 420 M92 430 C84 490 76 540 70 576 M106 430 C114 490 124 540 132 576" opacity=".5"/>`,
    },
    alcinha: {
      f: `<path d="M82 100 L100 150 L118 100 L120 196 L80 196 Z" fill="${base}"/>
          <path d="M80 194 L120 194 C140 260 150 360 156 440 C164 500 172 540 176 574 C150 566 130 578 100 570 C74 578 50 566 26 574 C32 530 40 490 46 440 C52 360 62 260 80 194 Z" fill="${base}"/>
          <path d="M100 206 C104 300 112 420 126 572 L110 570 C104 430 100 310 100 206 Z" fill="${shade}" opacity=".45"/>
          <path d="M86 210 C76 320 64 450 50 568 L40 570 C50 440 66 320 86 210 Z" fill="${light}" opacity=".5"/>
          <path d="M120 200 C138 300 152 430 168 570 L158 570 C146 440 134 310 120 200 Z" fill="${shade}" opacity=".35"/>`,
      l: `<path d="M84 86 L82 100 M116 86 L118 100"/>
          <path d="M82 100 L100 150 L118 100 L120 196 C140 260 150 360 156 440 C164 500 172 540 176 574 C150 566 130 578 100 570 C74 578 50 566 26 574 C32 530 40 490 46 440 C52 360 62 260 80 196 Z"/>
          <path d="M80 196 C92 192 108 192 120 196"/><path d="M100 210 C104 320 112 440 124 570 M88 230 C78 340 66 450 54 566" opacity=".5"/>`,
    },
    frenteunica: {
      f: `<path d="M93 78 L107 78 L122 120 L116 192 L84 192 L78 120 Z" fill="${base}"/>
          <path d="M84 190 L116 190 C122 280 128 420 134 574 L66 574 C72 420 78 280 84 190 Z" fill="${base}"/>
          <path d="M100 96 L100 190" stroke="${shade}" stroke-width="3" opacity=".4"/>
          <path d="M104 200 C108 320 114 450 120 576 L132 575 C126 440 118 310 112 198 Z" fill="${shade}" opacity=".45"/>
          <path d="M88 200 C84 320 80 450 76 576 L70 575 C74 440 80 310 88 200 Z" fill="${light}" opacity=".5"/>
          <rect x="84" y="186" width="32" height="6" fill="${light}" opacity=".7"/>`,
      l: `<path d="M93 78 L107 78 L122 120 L116 192 C122 280 128 420 134 574 L66 574 C72 420 78 280 84 192 L78 120 Z"/>
          <path d="M94 300 C92 400 90 480 88 570 M108 300 C110 400 112 480 114 570" opacity=".45"/>`,
    },
    drapeado: {
      f: `<path d="M82 104 C92 132 108 132 118 104 L117 192 L83 192 Z" fill="${base}"/>
          <path d="M83 190 L117 190 C126 260 132 380 142 574 Q100 580 58 574 C68 380 74 260 83 190 Z" fill="${base}"/>
          <path d="M88 112 C94 124 106 124 112 112" stroke="${light}" stroke-width="3" fill="none" opacity=".7"/>
          <path d="M90 124 C96 134 104 134 110 124" stroke="${shade}" stroke-width="2.5" fill="none" opacity=".5"/>
          <path d="M92 210 C88 320 80 450 72 574 L80 574 C88 450 96 320 98 210 Z" fill="${light}" opacity=".7"/>
          <path d="M108 210 C114 320 122 450 130 574 L140 574 C132 450 122 320 114 210 Z" fill="${shade}" opacity=".45"/>`,
      l: `<path d="M83 104 L84 86 M117 104 L116 86"/>
          <path d="M82 104 C92 132 108 132 118 104 L117 192 C126 260 132 380 142 574 Q100 580 58 574 C68 380 74 260 83 192 Z"/>`,
    },
    ombros: {
      f: `<path d="M76 110 L124 110 L116 192 L84 192 Z" fill="${base}"/>
          <path d="M84 190 L116 190 C136 270 156 420 170 574 Q100 584 30 574 C44 420 64 270 84 190 Z" fill="${base}"/>
          <path d="M106 206 C114 330 126 460 138 576 L160 574 C150 440 134 310 114 204 Z" fill="${shade}" opacity=".4"/>
          <path d="M90 210 C80 330 66 460 54 576 L42 575 C54 450 72 320 90 210 Z" fill="${light}" opacity=".5"/>`,
      over: `<path d="M64 104 C78 96 122 96 136 104 C138 112 134 118 128 118 C114 112 86 112 72 118 C66 118 62 112 64 104 Z" fill="${base}"/>
          <path d="M70 112 C86 106 114 106 130 112" stroke="${shade}" stroke-width="2" fill="none" opacity=".5"/>`,
      l: `<path d="M64 104 C78 96 122 96 136 104 C138 112 134 118 128 118 C114 112 86 112 72 118 C66 118 62 112 64 104 Z"/>
          <path d="M76 118 L84 192 C64 270 44 420 30 574 Q100 584 170 574 C156 420 136 270 116 192 L124 118"/>
          <path d="M100 240 C98 360 96 470 96 574" opacity=".45"/>`,
    },
    manga: {
      f: `<path d="M76 100 L100 164 L124 100 L117 192 L83 192 Z" fill="${base}"/>
          <path d="M83 190 L117 190 C136 260 150 380 162 574 C130 566 110 580 88 572 C70 578 52 568 38 574 C50 380 64 260 83 190 Z" fill="${base}"/>
          <path d="M83 186 L117 186 L117 196 L83 196 Z" fill="${shade}" opacity=".5"/>
          <path d="M100 206 C108 320 118 450 130 572 L148 570 C138 440 124 310 110 204 Z" fill="${shade}" opacity=".4"/>
          <path d="M90 210 C82 330 70 460 58 572 L48 572 C58 450 74 320 90 210 Z" fill="${light}" opacity=".5"/>`,
      l: `<path d="M76 100 L100 164 L124 100 M83 192 C64 260 50 380 38 574 C52 568 70 578 88 572 C110 580 130 566 162 574 C150 380 136 260 117 192"/>`,
      mangas: true,
    },
  };
  return V[modelo];
}

function madrinha({ seed = 2, cor, skin = '#e9b99a', hair = '#4a2e22', cabelo = 'longo', modelo = 'tomara', pose = 'baixo' }) {
  const c = { base: cor, shade: mix(cor, '#3a0a10', 0.35), light: mix(cor, '#ffffff', 0.35) };
  const v = vestido(modelo, c, skin);
  const h = cabeloMulher(cabelo, hair);
  const P = POSES_M[pose];
  const manga = v.mangas ? { upper: mix(cor, '#ffffff', 0.12), fore: mix(cor, '#ffffff', 0.12) } : { upper: skin, fore: skin };
  const braco1 = braco(P.L, { manga, skin, wU: v.mangas ? 13 : 9.5, wF: v.mangas ? 12 : 8 });
  const braco2 = braco(P.R, { manga, skin, wU: v.mangas ? 13 : 9.5, wF: v.mangas ? 12 : 8 });
  let prop = '';
  if (P.prop === 'clutch') prop = `<rect x="98" y="204" width="28" height="15" rx="3" fill="#d9b66e"/><path d="M98 209 L126 209" stroke="#a88442" stroke-width="1.2"/>`;
  if (P.prop === 'buque') {
    const fl = [[94, 222, '#f3ead2'], [104, 219, '#e9c98a'], [100, 229, '#f3ead2'], [90, 230, '#d8a868'], [110, 228, '#efe0bd'], [98, 214, '#c79c62']];
    prop = `<path d="M100 232 L96 262 M100 232 L104 262" stroke="#7d7a45" stroke-width="2"/>
      <path d="M84 226 C80 216 86 210 92 216 M116 226 C120 216 114 210 108 216" stroke="#8b8a55" stroke-width="3" fill="none"/>` +
      fl.map(([x, y, cc]) => `<circle cx="${x}" cy="${y}" r="6" fill="${cc}"/>`).join('');
  }
  const corpo = `<path d="M93 62 L93 86 C86 88 78 90 75 98 L79 150 L121 150 L125 98 C122 90 114 88 107 86 L107 62 Z" fill="${skin}"/>`;
  const fills = `${h.tras}${corpo}${v.f}${braco1}${braco2}${v.over || ''}${prop}${rosto(skin)}${h.frente}`;
  const lines = `<path d="M84 50 C84 70 92 72 100 72 C108 72 116 70 116 50" opacity=".6"/>${v.l}`;
  return layer(seed, fills, lines);
}

// ---------- padrinho ----------
const POSES_H = {
  baixo: { L: [[66, 100], [58, 178], [58, 252]], R: [[134, 100], [142, 178], [142, 252]] },
  bolso: { L: [[66, 100], [54, 176], [72, 236]], R: [[134, 100], [146, 176], [128, 236]], bolso: true },
  botao: { L: [[66, 100], [58, 178], [58, 252]], R: [[134, 100], [144, 176], [108, 206]] },
  misto: { L: [[66, 100], [54, 176], [72, 236]], R: [[134, 100], [142, 178], [142, 252]], bolsoL: true },
};

function padrinho({ seed = 1, skin = '#e9b99a', hair = '#3b2a22', cabelo = 'curto', barba = false, pose = 'baixo' } = {}) {
  const suit = '#232328', suitLight = '#4a4a55', shirt = '#fbf8f1', tie = '#8f9298';
  const P = POSES_H[pose];
  const manga = { upper: suit, fore: suit };
  const bL = braco(P.L, { manga, skin, wU: 17, wF: 14, maoVisivel: !(P.bolso || P.bolsoL), punho: shirt });
  const bR = braco(P.R, { manga, skin, wU: 17, wF: 14, maoVisivel: !P.bolso, punho: shirt });
  const fills = `
    <path d="M92 62 L92 88 L108 88 L108 62 Z" fill="${skin}"/>
    <path d="M70 250 L131 250 L128 562 L104 562 L101 330 L99 330 L96 562 L72 562 Z" fill="${suit}"/>
    <path d="M84 290 L86 552" stroke="${suitLight}" stroke-width="5" fill="none" opacity=".4"/>
    <path d="M70 560 L97 560 L97 574 L64 574 C63 566 66 562 70 560 Z" fill="#111"/>
    <path d="M103 560 L130 560 C134 562 137 566 136 574 L103 574 Z" fill="#111"/>
    <path d="M86 84 L114 84 L110 200 L90 200 Z" fill="${shirt}"/>
    <path d="M64 94 C74 88 84 86 88 84 L100 196 L112 84 C116 86 126 88 136 94 C140 140 136 170 132 200 C134 222 136 244 138 268 L104 272 L100 262 L96 272 L62 268 C64 244 66 222 68 200 C64 170 60 140 64 94 Z" fill="${suit}"/>
    <path d="M88 84 L100 196 L94 150 L80 116 L90 108 Z" fill="${suitLight}" opacity=".7"/>
    <path d="M112 84 L100 196 L106 150 L120 116 L110 108 Z" fill="${suitLight}" opacity=".7"/>
    <path d="M95 88 L105 88 L103 98 L97 98 Z" fill="${tie}"/>
    <path d="M97 98 L103 98 L108 176 L100 186 L92 176 Z" fill="${tie}"/>
    <path d="M72 110 C70 150 72 180 76 200" stroke="${suitLight}" stroke-width="6" fill="none" opacity=".45"/>
    <circle cx="121" cy="122" r="4.5" fill="#f4ecd8"/><circle cx="117" cy="126" r="3.5" fill="#e9d6a8"/><circle cx="124" cy="127" r="3" fill="#d8b77e"/>
    <path d="M120 130 L117 142" stroke="#8a7a4a" stroke-width="1.6"/>
    ${bL}${bR}
    ${rosto(skin)}${cabeloHomem(cabelo, hair, barba)}`;
  const lines = `
    <path d="M83 48 C83 70 92 74 100 74 C108 74 117 70 117 48" opacity=".6"/>
    <path d="M88 84 L100 196 L112 84"/>
    <path d="M88 84 L90 108 L80 116 L94 150 M112 84 L110 108 L120 116 L106 150"/>
    <path d="M95 88 L105 88 L103 98 L97 98 Z M97 98 L92 176 L100 186 L108 176 L103 98"/>
    <path d="M64 94 C60 140 64 170 68 200 C66 222 64 244 62 268 L96 272 L100 262 L104 272 L138 268 C136 244 134 222 132 200 C136 170 140 140 136 94"/>
    <path d="M72 272 L72 562 M96 272 L96 562 M104 272 L104 562 M128 272 L128 562"/>
    <circle cx="100" cy="212" r="1.6" fill="${INK}"/><circle cx="100" cy="232" r="1.6" fill="${INK}"/>`;
  return layer(seed, fills, lines);
}

// Monta um SVG com várias figuras lado a lado.
// itens: [{tipo:'padrinho'|'madrinha', ...opções, x, y, escala}]
function cena(itens, { w = 1000, h = 620, sombra = true, extra = '' } = {}) {
  const seeds = [...new Set(itens.map((i) => i.seed))];
  const defs = seeds.map((s) => aquarelaDefs(s)).join('');
  const figs = itens.map((i) => {
    const s = i.escala || 1;
    const fig = i.tipo === 'padrinho' ? padrinho(i) : madrinha(i);
    const ground = sombra
      ? `<ellipse cx="100" cy="578" rx="${i.tipo === 'padrinho' ? 46 : 66}" ry="6" fill="#7a5a48" opacity=".16"/>`
      : '';
    const flip = i.espelho ? ' translate(200 0) scale(-1 1)' : '';
    return `<g transform="translate(${i.x} ${i.y || 20}) scale(${s})${flip}">${ground}${fig}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">${defs}${figs}${extra}</svg>`;
}

// ---------- elenco ----------
// Tons variados de rosa, vermelho e laranja: cada madrinha escolhe o seu.
const MADRINHAS = [
  { cor: '#f2b5c6', modelo: 'babados', cabelo: 'ondulado', skin: '#f0c9ac', hair: '#7a5236', pose: 'baixo' },
  { cor: '#e0628a', modelo: 'umombro', cabelo: 'coque', skin: '#c68b62', hair: '#2a1d17', pose: 'bolsa' },
  { cor: '#c93a6e', modelo: 'sereia', cabelo: 'longo', skin: '#e6b48f', hair: '#3a261c', pose: 'cintura' },
  { cor: '#e0443e', modelo: 'drapeado', cabelo: 'cacheado', skin: '#8e5a3c', hair: '#1c1310', pose: 'buque' },
  { cor: '#b81f2b', modelo: 'frenteunica', cabelo: 'rabo', skin: '#ebbf9e', hair: '#5a3522', pose: 'bolsa' },
  { cor: '#86151f', modelo: 'manga', cabelo: 'chanel', skin: '#d9a27c', hair: '#241814', pose: 'baixo' },
  { cor: '#f3a26a', modelo: 'ombros', cabelo: 'lateral', skin: '#f2cdb0', hair: '#b58a58', pose: 'buque' },
  { cor: '#e97b2e', modelo: 'alcinha', cabelo: 'ondulado', skin: '#b27a54', hair: '#2e1f18', pose: 'quadril' },
  { cor: '#b9531e', modelo: 'tomara', cabelo: 'longo', skin: '#e8b896', hair: '#8a5a36', pose: 'bolsa' },
].map((m, i) => ({ tipo: 'madrinha', seed: 30 + i * 3, ...m }));

const PADRINHOS = [
  { skin: '#e8b896', hair: '#2e211b', cabelo: 'curto', pose: 'baixo' },
  { skin: '#b67a54', hair: '#1c1512', cabelo: 'cacheado', pose: 'bolso', barba: true },
  { skin: '#f0c7a6', hair: '#8a6240', cabelo: 'topete', pose: 'botao' },
  { skin: '#7e4f34', hair: '#141010', cabelo: 'raspado', pose: 'misto', barba: true },
  { skin: '#d9a17c', hair: '#4a3020', cabelo: 'lateral', pose: 'bolso' },
  { skin: '#eab99a', hair: '#2a1d17', cabelo: 'curto', pose: 'botao', barba: true },
].map((p, i) => ({ tipo: 'padrinho', seed: 60 + i * 3, ...p }));
