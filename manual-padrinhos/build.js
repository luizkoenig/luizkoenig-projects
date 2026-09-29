// Gera as páginas em JPG e o PDF do manual a partir do index.html.
// Uso: node build.js   (requer Playwright)
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const saida = path.join(__dirname, 'saida');

(async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});

  // 1. Renderiza cada página em JPG (2160 x 2700).
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const secoes = await page.$$('section.pg');
  const jpgs = [];
  for (let i = 0; i < secoes.length; i++) {
    const nome = `manual-padrinhos-${i + 1}.jpg`;
    await secoes[i].screenshot({ path: path.join(saida, nome), type: 'jpeg', quality: 92 });
    jpgs.push(nome);
  }

  // 2. Junta os JPGs num PDF leve (mesmo formato do convite: 810 x 1012,5 pt).
  const pdf = await browser.newPage();
  const html = `<style>@page{size:1080px 1350px;margin:0}body{margin:0}img{display:block;width:1080px;height:1350px;break-after:page}</style>` +
    jpgs.map((j) => `<img src="${j}">`).join('');
  fs.writeFileSync(path.join(saida, '_pdf.html'), html);
  await pdf.goto('file://' + path.join(saida, '_pdf.html'));
  await pdf.waitForLoadState('load');
  await pdf.pdf({ path: path.join(saida, 'Manual_dos_Padrinhos.pdf'), width: '1080px', height: '1350px', printBackground: true });
  fs.unlinkSync(path.join(saida, '_pdf.html'));

  await browser.close();
  console.log(`${jpgs.length} páginas geradas em saida/`);
})();
