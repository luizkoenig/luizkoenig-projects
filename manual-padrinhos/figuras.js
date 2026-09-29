// Ilustrações em estilo aquarela dos padrinhos e madrinhas.
// Proporção de ~8 cabeças: cabeça com 56 unidades de altura, figura com ~480–500.
// Cada figura ocupa uma caixa de 200 unidades de largura (centro em x = 100).

const INK = '#5a3a2c';

// Filtros SVG: bordas irregulares, pigmento acumulado nas bordas e leve granulação (aquarela)
// e um leve tremor no traço (nanquim).
function aquarelaDefs(seed = 1) {
  return `
  <defs>
    <filter id="wc${seed}" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="${seed}" result="n1"/>
      <feDisplacementMap in="SourceGraphic" in2="n1" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="${seed + 7}" result="n2"/>
      <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.12 1.2" result="blot"/>
      <feComposite in="d" in2="blot" operator="in" result="washed"/>
      <feMorphology in="d" operator="erode" radius="1.4" result="er"/>
      <feComposite in="d" in2="er" operator="out" result="edge"/>
      <feColorMatrix in="edge" type="matrix" values="0.72 0 0 0 0  0 0.72 0 0 0  0 0 0.72 0 0  0 0 0 0.45 0" result="edgeDark"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="${seed + 3}" result="grain"/>
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.08 1.1" result="grainA"/>
      <feMerge result="m"><feMergeNode in="washed"/><feMergeNode in="edgeDark"/></feMerge>
      <feComposite in="m" in2="grainA" operator="in"/>
    </filter>
    <filter id="ink${seed}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="${seed + 11}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>`;
}

// Ordem: tinta de fundo → traço → tinta da frente (braços, cabelo, acessórios) → detalhes do rosto.
function layer(seed, fills, lines, detalhes = '', frente = '') {
  return `<g filter="url(#wc${seed})">${fills}</g>
          <g filter="url(#ink${seed})" fill="none" stroke="${INK}" stroke-width="1.2"
             stroke-linecap="round" stroke-linejoin="round" opacity=".55">${lines}</g>
          ${frente ? `<g filter="url(#wc${seed})">${frente}</g>` : ''}${detalhes}`;
}

// ---------- utilidades ----------
function mix(hex, alvo, t) {
  const a = hex.match(/\w\w/g).map((h) => parseInt(h, 16));
  const b = alvo.match(/\w\w/g).map((h) => parseInt(h, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// Segmento de membro afunilado (de a até b, larguras wa → wb), com juntas arredondadas.
function membro(a, b, wa, wb, cor) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const p = (pt, w, s) => `${(pt[0] + nx * w / 2 * s).toFixed(1)} ${(pt[1] + ny * w / 2 * s).toFixed(1)}`;
  return `<path d="M${p(a, wa, 1)} L${p(b, wb, 1)} L${p(b, wb, -1)} L${p(a, wa, -1)} Z" fill="${cor}"/>
          <circle cx="${a[0]}" cy="${a[1]}" r="${wa / 2}" fill="${cor}"/><circle cx="${b[0]}" cy="${b[1]}" r="${wb / 2}" fill="${cor}"/>`;
}

// Mão: gota alongada na direção do antebraço.
function mao(cot, pul, skin, comp = 24, larg = 11) {
  const ang = (Math.atan2(pul[1] - cot[1], pul[0] - cot[0]) * 180) / Math.PI - 90;
  return `<g transform="translate(${pul[0]} ${pul[1]}) rotate(${ang.toFixed(1)})">
    <path d="M${-larg / 2} 0 C${-larg / 2} ${comp * 0.6} ${-larg / 4} ${comp} 0 ${comp} C${larg / 4} ${comp} ${larg / 2} ${comp * 0.6} ${larg / 2} 0 Z" fill="${skin}"/></g>`;
}

// Braço completo: ombro → cotovelo → pulso (+ mão).
function braco([o, c, p], { cor, skin, w = [19, 14, 11], semMao = false, punho }) {
  let s = membro(o, c, w[0], w[1], cor) + membro(c, p, w[1], w[2], cor);
  if (punho && !semMao) s += membro(p, [p[0] + (p[0] - c[0]) * 0.05, p[1] + (p[1] - c[1]) * 0.05], w[2] - 2, w[2] - 3, punho);
  if (!semMao) s += mao(c, p, skin);
  return s;
}

// ---------- rosto ----------
function rosto(skin, { batom = '#c44d5c', cilios = true } = {}) {
  const sombra = mix(skin, '#6a3a22', 0.22);
  const blush = mix(skin, '#e8606e', 0.45);
  const fills = `
    <path d="M100 70 L91 70 L91 96 L109 96 L109 70 Z" fill="${skin}"/>
    <path d="M78 40 C78 18 122 18 122 40 C122 60 112 72 100 72 C88 72 78 60 78 40 Z" fill="${skin}"/>
    <path d="M91 74 C96 80 104 80 109 74 L109 84 C104 86 96 86 91 84 Z" fill="${sombra}" opacity=".6"/>
    <path d="M113 30 C121 40 120 58 110 68 C116 56 117 42 113 30 Z" fill="${sombra}" opacity=".45"/>`;
  const detalhes = `
    <ellipse cx="88" cy="53" rx="5" ry="3" fill="${blush}" opacity=".45"/>
    <ellipse cx="112" cy="53" rx="5" ry="3" fill="${blush}" opacity=".45"/>
    <path d="M95 61 C98 59.5 102 59.5 105 61 C102 64 98 64 95 61 Z" fill="${batom}" opacity=".85"/>
    <g fill="none" stroke="${INK}" stroke-linecap="round" opacity=".7">
      <path d="M86 45 Q90.5 48.5 95 45" stroke-width="1.3"/>
      <path d="M105 45 Q109.5 48.5 114 45" stroke-width="1.3"/>
      ${cilios ? '<path d="M86 45 L84.5 46.2 M114 45 L115.5 46.2" stroke-width="1"/>' : ''}
      <path d="M85 39 Q90 36.5 95 38.5 M105 38.5 Q110 36.5 115 39" stroke-width="1.1" opacity=".7"/>
      <path d="M100.5 48 L99 54.5 L101.5 55" stroke-width="1" opacity=".5"/>
    </g>`;
  const line = `<path d="M78 40 C78 60 88 72 100 72 C112 72 122 60 122 40" opacity=".5"/>`;
  return { fills, detalhes, line };
}

// ---------- cabelos ----------
function cabeloMulher(estilo, c) {
  const esc = mix(c, '#000000', 0.35), claro = mix(c, '#ffffff', 0.25);
  const topo = `<path d="M76 44 C72 12 94 6 102 8 C122 8 130 24 124 46 C120 30 110 24 100 22 C90 24 80 30 76 44 Z" fill="${c}"/>
                <path d="M92 12 C100 10 112 14 118 24" stroke="${claro}" stroke-width="2.5" fill="none" opacity=".6"/>`;
  const e = {
    longo: {
      tras: `<path d="M76 34 C68 90 68 150 72 190 L128 190 C132 150 132 90 124 34 Z" fill="${c}"/>`,
      frente: topo + `<path d="M78 40 C73 84 77 130 69 176 C84 160 87 110 87 62 Z" fill="${c}"/>
               <path d="M122 40 C127 84 123 130 131 176 C116 160 113 110 113 62 Z" fill="${c}"/>`,
    },
    ondulado: {
      tras: `<path d="M76 34 C64 70 76 96 66 124 C58 150 72 170 64 196 L136 196 C128 170 142 150 134 124 C124 96 136 70 124 34 Z" fill="${c}"/>`,
      frente: topo + `<path d="M78 40 C70 70 84 90 74 116 C66 140 80 156 70 180 C90 170 86 144 90 124 C94 100 84 78 88 58 Z" fill="${c}"/>
               <path d="M122 40 C130 70 116 90 126 116 C134 140 120 156 130 180 C110 170 114 144 110 124 C106 100 116 78 112 58 Z" fill="${c}"/>
               <path d="M80 100 C76 118 84 132 78 150 M120 100 C124 118 116 132 122 150" stroke="${esc}" stroke-width="1.8" fill="none" opacity=".5"/>`,
    },
    coque: {
      tras: `<circle cx="100" cy="14" r="17" fill="${c}"/>`,
      frente: `<path d="M76 46 C72 16 92 12 100 12 C112 12 130 18 124 46 C120 30 110 25 100 25 C90 25 80 30 76 46 Z" fill="${c}"/>
               <path d="M88 8 C96 0 110 2 114 12" stroke="${esc}" stroke-width="1.8" fill="none" opacity=".55"/>
               <path d="M92 16 C102 14 112 18 118 28" stroke="${claro}" stroke-width="2.5" fill="none" opacity=".6"/>`,
    },
    rabo: {
      tras: `<path d="M114 24 C142 36 140 90 150 140 C132 130 128 80 110 40 Z" fill="${c}"/>`,
      frente: `<path d="M76 46 C72 16 92 10 100 10 C112 10 130 18 124 46 C120 30 110 24 100 24 C90 24 80 30 76 46 Z" fill="${c}"/>
               <path d="M92 14 C102 12 112 16 118 26" stroke="${claro}" stroke-width="2.5" fill="none" opacity=".6"/>`,
    },
    chanel: {
      tras: `<path d="M74 40 L72 84 L128 84 L126 40 Z" fill="${c}"/>`,
      frente: `<path d="M73 46 C68 8 132 8 127 46 L131 82 C122 88 114 84 112 74 L114 42 C108 28 92 28 86 42 L88 74 C86 84 78 88 69 82 Z" fill="${c}"/>
               <path d="M86 42 C92 30 108 30 114 42 C106 34 94 34 86 42 Z" fill="${esc}" opacity=".35"/>`,
    },
    cacheado: {
      tras: [[76, 30, 17], [124, 30, 17], [70, 56, 16], [130, 56, 16], [72, 82, 15], [128, 82, 15], [100, 10, 19], [82, 12, 15], [118, 12, 15], [76, 104, 12], [124, 104, 12]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join(''),
      frente: `<path d="M80 40 C80 22 92 18 100 20 C110 18 120 22 120 40 C112 30 88 30 80 40 Z" fill="${c}"/>`
        + [[84, 22, 6], [98, 16, 6], [112, 22, 6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${esc}" opacity=".35"/>`).join(''),
    },
    lateral: {
      tras: `<path d="M78 34 C70 60 74 90 80 108 L126 34 Z" fill="${c}"/>`,
      frente: topo + `<path d="M122 36 C134 64 124 90 134 118 C142 146 128 166 138 190 C116 180 120 152 114 128 C108 100 118 76 110 50 Z" fill="${c}"/>
               <path d="M126 100 C130 120 122 136 128 156" stroke="${esc}" stroke-width="1.8" fill="none" opacity=".5"/>`,
    },
  };
  return e[estilo];
}

function cabeloHomem(estilo, c, barba) {
  const claro = mix(c, '#ffffff', 0.2);
  const e = {
    curto: `<path d="M77 42 C72 12 94 4 104 6 C124 8 130 24 123 42 C120 28 112 20 98 22 C88 22 80 30 77 42 Z" fill="${c}"/>`,
    topete: `<path d="M77 42 C70 10 94 -2 112 4 C130 10 130 26 123 42 C120 28 112 18 96 22 C88 24 80 30 77 42 Z" fill="${c}"/>
             <path d="M96 8 C106 4 118 8 122 18" stroke="${claro}" stroke-width="2.5" fill="none" opacity=".6"/>`,
    cacheado: [[84, 20, 11], [100, 12, 12], [116, 16, 11], [124, 30, 9], [78, 32, 9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join(''),
    raspado: `<path d="M78 38 C76 16 92 10 100 10 C112 10 124 16 122 38 C116 24 108 20 100 20 C92 20 84 24 78 38 Z" fill="${c}" opacity=".75"/>`,
    lateral: `<path d="M77 44 C70 14 92 2 106 6 C124 10 130 24 123 44 C120 30 112 18 90 26 C84 30 80 36 77 44 Z" fill="${c}"/>`,
  };
  const b = barba ? `<path d="M79 46 C80 64 90 74 100 74 C110 74 120 64 121 46 C118 58 112 62 108 62 C104 58 96 58 92 62 C88 62 82 58 79 46 Z" fill="${c}" opacity=".9"/>` : '';
  return e[estilo] + b;
}

// ---------- madrinhas ----------
// Ombros em (66,106) e (134,106); cintura em y≈182; quadril em y≈228; barra em y≈490.
const POSES_M = {
  baixo: { L: [[66, 106], [58, 184], [56, 250]], R: [[134, 106], [142, 184], [144, 250]] },
  bolsa: { L: [[66, 106], [58, 184], [56, 250]], R: [[134, 106], [148, 180], [118, 208]], prop: 'clutch' },
  cintura: { L: [[66, 106], [40, 160], [72, 190]], R: [[134, 106], [142, 184], [144, 250]] },
  buque: { L: [[66, 106], [62, 182], [92, 212]], R: [[134, 106], [138, 182], [108, 212]], prop: 'buque' },
  quadril: { L: [[66, 106], [58, 184], [56, 250]], R: [[134, 106], [160, 162], [130, 196]] },
};

function vestido(modelo, c, skin) {
  const { base, shade, light } = c;
  // sombras e luzes comuns a saias longas
  const dobras = (x1, x2) => `
    <path d="M${x1} 200 C${x1 - 6} 300 ${x1 - 14} 400 ${x1 - 24} 492 L${x1 - 8} 492 C${x1 - 2} 400 ${x1 + 2} 300 ${x1 + 6} 200 Z" fill="${light}" opacity=".55"/>
    <path d="M${x2} 200 C${x2 + 8} 300 ${x2 + 16} 400 ${x2 + 26} 492 L${x2 + 46} 490 C${x2 + 34} 400 ${x2 + 22} 300 ${x2 + 10} 196 Z" fill="${shade}" opacity=".45"/>`;
  const V = {
    tomara: {
      f: `<path d="M64 120 C76 108 90 112 100 121 C110 112 124 108 136 120 L127 182 L73 182 Z" fill="${base}"/>
          <path d="M73 180 L127 180 C138 212 144 244 148 284 C154 352 162 420 170 490 Q100 500 30 490 C38 420 46 352 52 284 C56 244 62 212 73 180 Z" fill="${base}"/>
          ${dobras(88, 110)}
          <path d="M73 176 L127 176 L127 186 L73 186 Z" fill="${shade}" opacity=".6"/>
          <path d="M74 124 C84 118 92 120 98 126" stroke="${light}" stroke-width="3" fill="none" opacity=".7"/>`,
      l: `<path d="M64 120 C76 108 90 112 100 121 C110 112 124 108 136 120 L127 182 C138 212 144 244 148 284 C154 352 162 420 170 490 Q100 500 30 490 C38 420 46 352 52 284 C56 244 62 212 73 182 Z"/>
          <path d="M73 182 L127 182 M100 230 C99 330 97 420 96 494 M116 240 C122 340 128 420 134 494" opacity=".5"/>`,
    },
    babados: {
      f: (() => {
        const tier = (y1, y2, a1, a2) => {
          const n = 7, w = (a2 * 2) / n;
          let hem = '';
          for (let i = 0; i < n; i++) hem += ` Q${(100 + a2 - w * (i + 0.5)).toFixed(1)} ${y2 + 9} ${(100 + a2 - w * (i + 1)).toFixed(1)} ${y2}`;
          return `<path d="M${100 - a1} ${y1} L${100 + a1} ${y1} L${100 + a2} ${y2}${hem} Z" fill="${base}"/>
                  <path d="M${100 - a2} ${y2 - 12} L${100 + a2} ${y2 - 12} L${100 + a2} ${y2} L${100 - a2} ${y2} Z" fill="${shade}" opacity=".3"/>`;
        };
        return `<path d="M66 120 C76 110 90 114 100 122 C110 114 124 110 134 120 L127 182 L73 182 Z" fill="${base}"/>
          ${tier(386, 490, 58, 74)}${tier(282, 392, 44, 60)}${tier(178, 288, 27, 46)}
          <path d="M106 190 L124 288 L134 392 L146 490 L126 490 L118 392 L112 288 Z" fill="${shade}" opacity=".3"/>
          <path d="M90 190 L76 288 L64 392 L52 490 L62 490 L72 392 L84 288 Z" fill="${light}" opacity=".5"/>`;
      })(),
      l: `<path d="M76 90 L72 120 M124 90 L128 120"/>
          <path d="M66 120 C76 110 90 114 100 122 C110 114 124 110 134 120 L127 182 L73 182 Z"/>
          <path d="M73 180 L54 288 M127 180 L146 288 M56 284 L40 392 M144 284 L160 392 M42 388 L26 490 M158 388 L174 490"/>
          <path d="M100 200 L100 280 M86 300 L82 380 M114 300 L118 380 M80 404 L74 482 M120 404 L126 482" opacity=".4"/>`,
      alcas: true,
    },
    umombro: {
      f: `<path d="M64 114 L120 88 C132 90 140 98 140 108 L128 184 L72 184 Z" fill="${base}"/>
          <path d="M72 182 L128 182 C140 214 144 244 142 292 C144 360 148 428 152 490 L48 490 C52 428 56 360 58 292 C56 244 60 214 72 182 Z" fill="${base}"/>
          <path d="M116 330 L152 490 L124 490 Z" fill="${skin}"/>
          <path d="M116 330 L124 490 L112 490 Z" fill="${shade}" opacity=".55"/>
          <path d="M64 114 L120 88 L108 128 Z" fill="${shade}" opacity=".35"/>
          <path d="M80 200 C76 290 70 390 62 488 L54 488 C60 390 68 290 80 200 Z" fill="${light}" opacity=".55"/>
          <path d="M104 196 C110 250 112 290 112 330 L118 330 C118 290 116 250 110 196 Z" fill="${shade}" opacity=".35"/>`,
      l: `<path d="M64 114 L120 88 C132 90 140 98 140 108 L128 184 C140 214 144 244 142 292 C144 360 148 428 152 490 L48 490 C52 428 56 360 58 292 C56 244 60 214 72 184 Z"/>
          <path d="M116 330 L124 490 M116 330 L152 490"/><path d="M74 124 L118 102 M78 140 L124 118 M82 156 L128 134" opacity=".45"/>`,
    },
    sereia: {
      f: `<path d="M64 116 L136 116 L127 182 C136 204 142 226 140 256 C138 300 132 336 126 368 C140 410 156 450 170 490 Q100 504 30 490 C44 450 60 410 74 368 C68 336 62 300 60 256 C58 226 64 204 73 182 Z" fill="${base}"/>
          <path d="M106 190 C118 230 122 280 116 368 C126 420 140 460 152 494 L126 496 C118 450 108 410 102 368 C110 290 110 230 100 190 Z" fill="${shade}" opacity=".35"/>
          <path d="M78 196 C72 250 72 300 80 368 C70 420 56 460 48 490 L58 492 C68 450 82 410 88 368 C82 300 82 250 84 196 Z" fill="${light}" opacity=".55"/>
          <path d="M64 116 L136 116 L135 124 L65 124 Z" fill="${light}" opacity=".6"/>`,
      l: `<path d="M64 116 L136 116 L127 182 C136 204 142 226 140 256 C138 300 132 336 126 368 C140 410 156 450 170 490 Q100 504 30 490 C44 450 60 410 74 368 C68 336 62 300 60 256 C58 226 64 204 73 182 Z"/>
          <path d="M74 368 C90 374 110 374 126 368 M86 376 C74 420 64 460 56 492 M114 376 C126 420 138 460 146 494" opacity=".45"/>`,
    },
    alcinha: {
      f: `<path d="M70 108 L100 162 L130 108 L127 184 L73 184 Z" fill="${base}"/>
          <path d="M73 182 L127 182 C142 220 150 270 156 330 C162 400 170 450 178 490 C150 482 128 496 100 488 C72 496 50 482 22 490 C30 450 38 400 44 330 C50 270 58 220 73 182 Z" fill="${base}"/>
          <path d="M100 196 C104 290 114 400 128 490 L110 490 C104 400 100 290 100 196 Z" fill="${shade}" opacity=".4"/>
          <path d="M82 200 C70 300 56 400 44 488 L34 488 C44 400 62 300 82 200 Z" fill="${light}" opacity=".55"/>
          <path d="M122 200 C140 300 154 400 168 488 L158 488 C146 400 132 300 118 200 Z" fill="${shade}" opacity=".35"/>
          <path d="M73 180 L127 180 L127 188 L73 188 Z" fill="${shade}" opacity=".45"/>`,
      l: `<path d="M70 108 L100 162 L130 108 L127 184 C142 220 150 270 156 330 C162 400 170 450 178 490 C150 482 128 496 100 488 C72 496 50 482 22 490 C30 450 38 400 44 330 C50 270 58 220 73 184 Z"/>
          <path d="M73 184 C88 180 112 180 127 184"/><path d="M100 200 C104 300 112 400 124 488 M86 220 C76 320 64 410 54 486" opacity=".45"/>`,
      alcas: true,
    },
    frenteunica: {
      f: `<path d="M92 78 L108 78 L138 120 L127 184 L73 184 L62 120 Z" fill="${base}"/>
          <path d="M73 182 L127 182 C138 212 142 244 142 290 C144 360 148 428 154 490 L46 490 C52 428 56 360 58 290 C58 244 62 212 73 182 Z" fill="${base}"/>
          <path d="M100 92 L100 182" stroke="${shade}" stroke-width="3" opacity=".35"/>
          ${dobras(86, 112)}
          <path d="M73 178 L127 178 L127 186 L73 186 Z" fill="${light}" opacity=".7"/>`,
      l: `<path d="M92 78 L108 78 L138 120 L127 184 C138 212 142 244 142 290 C144 360 148 428 154 490 L46 490 C52 428 56 360 58 290 C58 244 62 212 73 184 L62 120 Z"/>
          <path d="M90 280 C88 360 86 430 84 488 M110 280 C112 360 114 430 116 488" opacity=".4"/>`,
    },
    drapeado: {
      f: `<path d="M70 108 C84 144 116 144 130 108 L127 184 L73 184 Z" fill="${base}"/>
          <path d="M73 182 L127 182 C138 212 142 244 142 290 C146 370 150 430 156 490 Q100 500 44 490 C50 430 54 370 58 290 C58 244 62 212 73 182 Z" fill="${base}"/>
          <path d="M80 118 C90 132 110 132 120 118" stroke="${light}" stroke-width="3.5" fill="none" opacity=".75"/>
          <path d="M84 132 C92 142 108 142 116 132" stroke="${shade}" stroke-width="3" fill="none" opacity=".45"/>
          <path d="M86 200 C82 300 74 400 66 490 L76 490 C84 400 92 300 94 200 Z" fill="${light}" opacity=".75"/>
          <path d="M108 200 C114 300 122 400 130 490 L146 490 C136 400 124 300 116 200 Z" fill="${shade}" opacity=".4"/>`,
      l: `<path d="M70 108 C84 144 116 144 130 108 L127 184 C138 212 142 244 142 290 C146 370 150 430 156 490 Q100 500 44 490 C50 430 54 370 58 290 C58 244 62 212 73 184 Z"/>`,
      alcas: true,
    },
    ombros: {
      f: `<path d="M62 110 L138 110 L127 184 L73 184 Z" fill="${base}"/>
          <path d="M73 182 L127 182 C142 214 150 252 156 296 C162 364 168 430 174 490 Q100 502 26 490 C32 430 38 364 44 296 C50 252 58 214 73 182 Z" fill="${base}"/>
          ${dobras(86, 112)}`,
      over: `<path d="M52 110 C70 103 130 103 148 110 C150 117 146 122 140 121 C120 116 80 116 60 121 C54 122 50 117 52 110 Z" fill="${base}"/>
             <path d="M58 110 C80 105 120 105 142 110" stroke="${light}" stroke-width="2" fill="none" opacity=".7"/>`,
      l: `<path d="M52 110 C70 103 130 103 148 110 C150 117 146 122 140 121 C120 116 80 116 60 121 C54 122 50 117 52 110 Z"/>
          <path d="M64 124 L73 184 C58 214 50 252 44 296 C38 364 32 430 26 490 Q100 502 174 490 C168 430 162 364 156 296 C150 252 142 214 127 184 L136 124"/>
          <path d="M100 230 C99 330 98 420 98 494" opacity=".4"/>`,
    },
    manga: {
      f: `<path d="M62 104 L100 170 L138 104 L127 184 L73 184 Z" fill="${base}"/>
          <path d="M73 182 L127 182 C142 216 150 262 156 320 C160 390 164 440 168 490 C132 482 112 498 90 488 C70 496 50 484 32 490 C36 440 40 390 44 320 C50 262 58 216 73 182 Z" fill="${base}"/>
          <path d="M73 178 L127 178 L127 188 L73 188 Z" fill="${shade}" opacity=".5"/>
          <path d="M104 196 C112 290 124 400 136 488 L154 488 C144 400 130 290 114 196 Z" fill="${shade}" opacity=".38"/>
          <path d="M86 200 C76 300 64 400 52 488 L42 488 C52 400 68 300 86 200 Z" fill="${light}" opacity=".55"/>`,
      l: `<path d="M62 104 L100 170 L138 104 M73 184 C58 216 50 262 44 320 C40 390 36 440 32 490 C50 484 70 496 90 488 C112 498 132 482 168 490 C164 440 160 390 156 320 C150 262 142 216 127 184"/>`,
      mangas: true,
    },
  };
  return V[modelo];
}

function madrinha({ seed = 2, cor, skin = '#e9b99a', hair = '#4a2e22', cabelo = 'longo', modelo = 'tomara', pose = 'baixo', batom }) {
  const c = { base: cor, shade: mix(cor, '#4a0010', 0.3), light: mix(cor, '#fff4e0', 0.38) };
  const v = vestido(modelo, c, skin);
  const h = cabeloMulher(cabelo, hair);
  const r = rosto(skin, { batom: batom || mix(cor, '#a02030', 0.5) });
  const P = POSES_M[pose];
  const corBraco = v.mangas ? mix(cor, '#ffffff', 0.1) : skin;
  const w = v.mangas ? [21, 17, 13] : [18, 13, 10];
  const b1 = braco(P.L, { cor: corBraco, skin, w });
  const b2 = braco(P.R, { cor: corBraco, skin, w });
  let prop = '';
  if (P.prop === 'clutch') prop = `<rect x="100" y="198" width="34" height="18" rx="4" fill="#e2bd6a"/><path d="M100 204 L134 204" stroke="#a88442" stroke-width="1.4"/>`;
  if (P.prop === 'buque') {
    const fl = [[92, 214, '#fff3dc'], [104, 210, '#f1cf86'], [100, 222, '#fff3dc'], [88, 224, '#e0a95e'], [112, 222, '#f6e2b8'], [98, 204, '#d19a5c'], [110, 208, '#fff3dc']];
    prop = `<path d="M100 226 L95 258 M100 226 L105 258" stroke="#76733f" stroke-width="2.4"/>
      <path d="M80 222 C74 210 82 202 90 208 M120 222 C126 210 118 202 110 208" stroke="#8b8a55" stroke-width="4" fill="none"/>` +
      fl.map(([x, y, cc]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${cc}"/>`).join('');
  }
  const corpo = `<path d="M91 86 C82 92 68 94 62 104 L68 182 L132 182 L138 104 C132 94 118 92 109 86 Z" fill="${skin}"/>`;
  const alcas = v.alcas ? `<path d="M76 92 L73 116 M124 92 L127 116" stroke="${c.base}" stroke-width="3"/>` : '';
  const fills = `${h.tras}${corpo}${r.fills}${alcas}${v.f}`;
  const frente = `${b1}${b2}${v.over || ''}${prop}${h.frente}`;
  return layer(seed, fills, `${r.line}${v.l}`, r.detalhes, frente);
}

// ---------- padrinhos ----------
// Ombros em (50,108) e (150,108); paletó até y≈268; pés em y≈505.
const POSES_H = {
  baixo: { L: [[55, 120], [46, 190], [45, 256]], R: [[145, 120], [154, 190], [155, 256]] },
  bolso: { L: [[55, 120], [40, 188], [62, 248]], R: [[145, 120], [160, 188], [138, 248]], semL: true, semR: true },
  botao: { L: [[55, 120], [46, 190], [45, 256]], R: [[145, 120], [158, 188], [116, 214]] },
  misto: { L: [[55, 120], [40, 188], [62, 248]], R: [[145, 120], [154, 190], [155, 256]], semL: true },
};

function padrinho({ seed = 1, skin = '#e9b99a', hair = '#3b2a22', cabelo = 'curto', barba = false, pose = 'baixo' } = {}) {
  const suit = '#1f1f25', suitLight = '#4b4c58', shirt = '#fdfaf3', tie = '#8e929a';
  const P = POSES_H[pose];
  const r = rosto(skin, { batom: mix(skin, '#9a4a40', 0.35), cilios: false });
  const bL = braco(P.L, { cor: suit, skin, w: [27, 22, 19], semMao: P.semL, punho: shirt });
  const bR = braco(P.R, { cor: suit, skin, w: [27, 22, 19], semMao: P.semR, punho: shirt });
  const fills = `
    <path d="M66 262 L134 262 L131 494 L104 494 L101 330 L99 330 L96 494 L69 494 Z" fill="${suit}"/>
    <path d="M80 290 L82 486" stroke="${suitLight}" stroke-width="6" fill="none" opacity=".4"/>
    <path d="M68 492 L97 492 L97 506 L60 506 C59 498 62 494 68 492 Z" fill="#111"/>
    <path d="M103 492 L132 492 C138 494 141 498 140 506 L103 506 Z" fill="#111"/>
    ${r.fills}
    <path d="M86 90 L114 90 L110 206 L90 206 Z" fill="${shirt}"/>
    <path d="M86 90 L100 104 L114 90 L112 84 L100 94 L88 84 Z" fill="${shirt}"/>
    <path d="M42 110 C58 98 76 94 88 90 L100 206 L112 90 C124 94 142 98 158 110 C162 150 156 178 152 206 C154 228 156 248 158 272 L104 276 L100 266 L96 276 L42 272 C44 248 46 228 48 206 C44 178 38 150 42 110 Z" fill="${suit}"/>
    <path d="M88 90 L100 206 L93 156 L76 120 L88 112 Z" fill="${suitLight}" opacity=".75"/>
    <path d="M112 90 L100 206 L107 156 L124 120 L112 112 Z" fill="${suitLight}" opacity=".75"/>
    <path d="M95 96 L105 96 L103 106 L97 106 Z" fill="${tie}"/>
    <path d="M97 106 L103 106 L109 184 L100 194 L91 184 Z" fill="${tie}"/>
    <path d="M98 110 L96 180" stroke="#b9bcc2" stroke-width="2" opacity=".6"/>
    <path d="M52 120 C50 160 52 186 56 206" stroke="${suitLight}" stroke-width="7" fill="none" opacity=".45"/>
    <circle cx="126" cy="130" r="5" fill="#f7efdc"/><circle cx="121" cy="135" r="4" fill="#ecd9aa"/><circle cx="130" cy="136" r="3.5" fill="#dcb97c"/>
    <path d="M125 139 L121 152" stroke="#8a7a4a" stroke-width="1.8"/>
    ${cabeloHomem(cabelo, hair, barba)}`;
  const lines = `${r.line}
    <path d="M88 90 L100 206 L112 90"/>
    <path d="M88 90 L88 112 L76 120 L93 156 M112 90 L112 112 L124 120 L107 156"/>
    <path d="M95 96 L105 96 L103 106 L97 106 Z M97 106 L91 184 L100 194 L109 184 L103 106"/>
    <path d="M42 110 C38 150 44 178 48 206 C46 228 44 248 42 272 L96 276 L100 266 L104 276 L158 272 C156 248 154 228 152 206 C156 178 162 150 158 110"/>
    <path d="M69 276 L69 494 M96 276 L96 494 M104 276 L104 494 M131 276 L131 494"/>
    <path d="M60 222 L80 220 M120 220 L140 222" opacity=".5"/>`;
  const botoes = `<circle cx="100" cy="222" r="1.8" fill="${INK}" opacity=".6"/><circle cx="100" cy="244" r="1.8" fill="${INK}" opacity=".6"/>`;
  return layer(seed, fills, lines, r.detalhes + botoes, bL + bR);
}

// Monta um SVG com várias figuras lado a lado.
// itens: [{tipo:'padrinho'|'madrinha', ...opções, x, y, escala, espelho}]
function cena(itens, { w = 1000, h = 540, sombra = true, extra = '', antes = '' } = {}) {
  const seeds = [...new Set(itens.map((i) => i.seed))];
  const defs = seeds.map((s) => aquarelaDefs(s)).join('');
  const figs = itens.map((i) => {
    const s = i.escala || 1;
    const fig = i.tipo === 'padrinho' ? padrinho(i) : madrinha(i);
    const chao = i.tipo === 'padrinho' ? 506 : 492;
    const ground = sombra ? `<ellipse cx="100" cy="${chao}" rx="${i.tipo === 'padrinho' ? 52 : 72}" ry="6" fill="#7a4a30" opacity=".16"/>` : '';
    const flip = i.espelho ? ' translate(200 0) scale(-1 1)' : '';
    return `<g transform="translate(${i.x} ${i.y || 10}) scale(${s})${flip}">${ground}${fig}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">${defs}${antes}${figs}${extra}</svg>`;
}

// ---------- elenco ----------
// Tons vibrantes de rosa, vermelho e laranja: cada madrinha escolhe o seu.
const MADRINHAS = [
  { cor: '#ff7eb6', modelo: 'babados', cabelo: 'ondulado', skin: '#f3cdb0', hair: '#7a5236', pose: 'baixo' },
  { cor: '#ff3d8b', modelo: 'umombro', cabelo: 'coque', skin: '#c68b62', hair: '#2a1d17', pose: 'bolsa' },
  { cor: '#e0137a', modelo: 'sereia', cabelo: 'longo', skin: '#e9b792', hair: '#3a261c', pose: 'cintura' },
  { cor: '#ff3b2f', modelo: 'drapeado', cabelo: 'cacheado', skin: '#8e5a3c', hair: '#1c1310', pose: 'buque' },
  { cor: '#e0081f', modelo: 'frenteunica', cabelo: 'rabo', skin: '#efc3a2', hair: '#5a3522', pose: 'bolsa' },
  { cor: '#b5001e', modelo: 'manga', cabelo: 'chanel', skin: '#d9a27c', hair: '#241814', pose: 'baixo' },
  { cor: '#ffa62b', modelo: 'ombros', cabelo: 'lateral', skin: '#f4d0b3', hair: '#b58a58', pose: 'buque' },
  { cor: '#ff7a00', modelo: 'alcinha', cabelo: 'ondulado', skin: '#b27a54', hair: '#2e1f18', pose: 'quadril' },
  { cor: '#f2520a', modelo: 'tomara', cabelo: 'longo', skin: '#eab998', hair: '#8a5a36', pose: 'bolsa' },
].map((m, i) => ({ tipo: 'madrinha', seed: 30 + i * 3, ...m }));

const PADRINHOS = [
  { skin: '#e8b896', hair: '#2e211b', cabelo: 'curto', pose: 'baixo' },
  { skin: '#b67a54', hair: '#1c1512', cabelo: 'cacheado', pose: 'bolso', barba: true },
  { skin: '#f0c7a6', hair: '#8a6240', cabelo: 'topete', pose: 'botao' },
  { skin: '#7e4f34', hair: '#141010', cabelo: 'raspado', pose: 'misto', barba: true },
  { skin: '#d9a17c', hair: '#4a3020', cabelo: 'lateral', pose: 'bolso' },
  { skin: '#eab99a', hair: '#2a1d17', cabelo: 'curto', pose: 'botao', barba: true },
].map((p, i) => ({ tipo: 'padrinho', seed: 60 + i * 3, ...p }));
