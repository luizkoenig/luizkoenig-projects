// Desenha a aquarela num canvas: o céu azul vira papel e as bordas se dissolvem
// de forma irregular, como tinta escorrendo no papel molhado.
//   posicionar(W, H, iw, ih) -> { x, y, w, h }   onde a ilustração entra no canvas
//   mascara(u, v, k, k2)     -> 0..1             opacidade (u, v em 0..1; k, k2 = ruído)
function ruido(seed) {
  const h = (x, y) => {
    let n = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const suave = (t) => t * t * (3 - 2 * t);
  const valor = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = suave(x - xi), yf = suave(y - yi);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x, y) => { // fbm, 0..1
    let s = 0, amp = .5, f = 1;
    for (let o = 0; o < 5; o++) { s += amp * valor(x * f, y * f); f *= 2.1; amp *= .5; }
    return s / .97;
  };
}
const passo = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function desenharAquarela({ posicionar, mascara }) {
  window.aquarelaPronta = new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.getElementById('aquarela'), W = cv.width, H = cv.height;
      const ctx = cv.getContext('2d');
      const pos = posicionar(W, H, img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h);

      const d = ctx.getImageData(0, 0, W, H), p = d.data;
      const n1 = ruido(7), n2 = ruido(31);
      for (let y = 0; y < H; y++) {
        const v = y / H, iv = (y - pos.y) / pos.h; // iv: altura dentro da ilustração
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4, u = x / W;
          let r = p[i], g = p[i + 1], b = p[i + 2];

          // 1. céu azul e nuvens viram papel
          const azul = b - Math.max(r, g);
          let t = azul > 0 && b > 120 ? passo(8, 48, azul) : 0;
          if (iv < .42 && Math.min(r, g, b) > 190 && b >= r) t = Math.max(t, .9);
          r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t;

          // 2. máscara com borda irregular e transição longa
          const k = n1(u * 7, v * 5) - .5, k2 = n2(u * 22, v * 16) - .5;
          let a = Math.pow(mascara(u, v, k, k2), 1.1);

          // 3. áreas claras somem antes das escuras (como pigmento diluído)
          const lum = (r + g + b) / 765;
          a = Math.min(1, a * (1.12 - lum * .14));

          // multiply sobre o papel: misturar com branco = transparência
          p[i] = 255 - (255 - r) * a; p[i + 1] = 255 - (255 - g) * a; p[i + 2] = 255 - (255 - b) * a;
        }
      }
      ctx.putImageData(d, 0, 0);
      ok();
    };
    img.onerror = () => ok();
    img.src = 'assets/aquarela.webp';
  });
}
