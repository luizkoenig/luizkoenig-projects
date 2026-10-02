// Gera o convite em JPG (WhatsApp) e PDF (gráfica, 5 x 7 pol.) a partir do index.html.
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

  const page = await browser.newPage({ viewport: { width: 1080, height: 1512 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => Promise.all([document.fonts.ready, window.aquarelaPronta]));
  await page.waitForTimeout(300);

  const cartao = await page.$('.convite');
  await cartao.screenshot({ path: path.join(saida, 'convite-danielly-eduardo.jpg'), type: 'jpeg', quality: 94 });

  // PDF em 5 x 7 polegadas (127 x 177,8 mm), uma página.
  const jpg = fs.readFileSync(path.join(saida, 'convite-danielly-eduardo.jpg')).toString('base64');
  const pdf = await browser.newPage();
  await pdf.setContent(`<style>@page{size:5in 7in;margin:0}body{margin:0}img{display:block;width:5in;height:7in}</style>` +
    `<img src="data:image/jpeg;base64,${jpg}">`);
  await pdf.pdf({ path: path.join(saida, 'Convite_Danielly_e_Eduardo.pdf'), width: '5in', height: '7in', printBackground: true });

  await browser.close();
  console.log('Convite gerado em saida/');
})();
