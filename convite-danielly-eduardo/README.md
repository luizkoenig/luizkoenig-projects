# Convite — Danielly e Eduardo

Convite de casamento no estilo papelaria fina: papel creme com textura de linho e
grão de algodão, tipografia caligráfica (Pinyon Script) e serifada em caixa-alta
(Cormorant Garamond), bloco de data com fios finos, e a aquarela do Rancho dos
Temperos e Tragos se dissolvendo no papel na parte de baixo.

- **Data:** sábado, 5 de dezembro de 2026, às 16h
- **Local:** Rancho dos Temperos e Tragos — São Martinho / SC
- **Recepção:** Salão de Pedra do local

## Arquivos
- `saida/convite-danielly-eduardo.jpg` — 2160 × 3024 px, para mandar no WhatsApp.
- `saida/Convite_Danielly_e_Eduardo.pdf` — 5 × 7 pol. (12,7 × 17,8 cm), para gráfica.
- `index.html` — fonte do convite; `assets/aquarela.webp` — ilustração do local;
  `assets/linho.jpg` — textura do papel.

A aquarela é tratada num `<canvas>` (script no `index.html`): o céu azul vira papel
e a borda de cima ganha uma máscara irregular, feita com ruído, que imita tinta
escorrendo no papel molhado.

## Gerar de novo
```
node build.js
```
(requer Playwright/Chromium)
