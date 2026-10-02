// Gera o convite em JPG (WhatsApp) e PDF (gráfica) nas versões vertical (index.html)
// e horizontal (horizontal.html).
// Uso: node build.js   (requer Playwright)
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const saida = path.join(__dirname, 'saida');

(async () => {
  fs.mkdirSync(saida, { recursive: true });
  const opcoes = { args: ['--allow-file-access-from-files'] }; // a aquarela é tratada num <canvas>
  if (fs.existsSync('/opt/pw-browsers/chromium')) opcoes.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(opcoes);

  const versoes = [
    { html: 'index.html', w: 1080, h: 1512, jpg: 'convite-danielly-eduardo.jpg', pdf: 'Convite_Danielly_e_Eduardo.pdf', pw: '5in', ph: '7in' },
    { html: 'horizontal.html', w: 1512, h: 1080, jpg: 'convite-danielly-eduardo-horizontal.jpg', pdf: 'Convite_Danielly_e_Eduardo_horizontal.pdf', pw: '7in', ph: '5in' },
  ];
  for (const v of versoes) {
    const page = await browser.newPage({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 2 });
    await page.goto('file://' + path.join(__dirname, v.html));
    await page.evaluate(() => Promise.all([document.fonts.ready, window.aquarelaPronta]));
    await page.waitForTimeout(300);
    const cartao = await page.$('.convite');
    await cartao.screenshot({ path: path.join(saida, v.jpg), type: 'jpeg', quality: 94 });

    // PDF na medida de gráfica (5 x 7 pol. = 12,7 x 17,8 cm), uma página.
    const jpg = fs.readFileSync(path.join(saida, v.jpg)).toString('base64');
    const pdf = await browser.newPage();
    await pdf.setContent(`<style>@page{size:${v.pw} ${v.ph};margin:0}body{margin:0}img{display:block;width:${v.pw};height:${v.ph}}</style>` +
      `<img src="data:image/jpeg;base64,${jpg}">`);
    await pdf.pdf({ path: path.join(saida, v.pdf), width: v.pw, height: v.ph, printBackground: true });
  }

  await browser.close();
  console.log('Convite gerado em saida/');
})();
