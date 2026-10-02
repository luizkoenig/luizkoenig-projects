// Gera o arquivo fechado para gráfica: CMYK (FOGRA39), 600 dpi, no tamanho final (sem sangria).
// Uso: node impressao.js   (requer Playwright e Python 3 com Pillow)
//
// Renderiza cada versão em duas camadas e o impressao.py as junta:
//   fundo  — papel, texturas, aquarela e ornamentos coloridos (vai para CMYK pelo perfil)
//   texto  — só as letras e fios neutros, sobre fundo transparente (vai só no preto, K)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const DPI = 600;
const camadas = path.join(__dirname, 'saida', 'impressao', '_camadas');

const versoes = [
  { nome: 'vertical', html: 'index.html', w: 1080, h: 1512, pol: [5, 7] },
  { nome: 'horizontal', html: 'horizontal.html', w: 1512, h: 1080, pol: [7, 5] },
];

// Fundo: some o texto, ficam os fios/ornamentos em verde (cor de verdade, vão em CMYK).
const CSS_FUNDO = `
  .texto, .versiculo, .caps, .script, .italico, .recepcao, .dia, .e-linha span { color: transparent !important; }
  .data .lado { border-color: transparent !important; }
`;
// Texto: some tudo que não é letra ou fio neutro.
const CSS_TEXTO = `
  html, body, .convite { background: transparent !important; }
  .textura, #aquarela, .ornamento, .e-linha i { visibility: hidden !important; }
`;

(async () => {
  fs.mkdirSync(camadas, { recursive: true });
  const opcoes = { args: ['--allow-file-access-from-files'] };
  if (fs.existsSync('/opt/pw-browsers/chromium')) opcoes.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opcoes);

  for (const v of versoes) {
    const escala = (v.pol[0] * DPI) / v.w; // px de CSS -> px a 600 dpi
    for (const [camada, css] of [['fundo', CSS_FUNDO], ['texto', CSS_TEXTO]]) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: escala });
      await page.goto('file://' + path.join(__dirname, v.html));
      await page.addStyleTag({ content: css });
      await page.evaluate(() => Promise.all([document.fonts.ready, window.aquarelaPronta]));
      await page.waitForTimeout(300);
      const cartao = await page.$('.convite');
      await cartao.screenshot({ path: path.join(camadas, `${v.nome}-${camada}.png`), omitBackground: camada === 'texto' });
      await page.close();
    }
  }
  await browser.close();

  execFileSync('python3', [path.join(__dirname, 'impressao.py'), JSON.stringify(versoes.map((v) => ({ nome: v.nome, pol: v.pol })))], { stdio: 'inherit' });
  fs.rmSync(camadas, { recursive: true, force: true });
})();
