# Convite — Danielly e Eduardo

Convite de casamento no estilo papelaria fina, com tipografia em dourado clássico
(nomes, dia e local em efeito folha de ouro): papel creme com textura de linho e
grão de algodão, tipografia caligráfica (Pinyon Script) e serifada em caixa-alta
(Cormorant Garamond), bloco de data com fios finos, e a aquarela do Rancho dos
Temperos e Tragos se dissolvendo no papel na parte de baixo.

- **Data:** sábado, 5 de dezembro de 2026, às 16h
- **Local:** Rancho dos Temperos e Tragos — São Martinho / SC
- **Recepção:** Salão de Pedra do local

## Arquivos
Duas versões, com o mesmo texto e a mesma aquarela:

| | WhatsApp | Gráfica |
|---|---|---|
| Vertical | `saida/convite-danielly-eduardo.jpg` (2160 × 3024 px) | `saida/Convite_Danielly_e_Eduardo.pdf` (5 × 7 pol.) |
| Horizontal | `saida/convite-danielly-eduardo-horizontal.jpg` (3024 × 2160 px) | `saida/Convite_Danielly_e_Eduardo_horizontal.pdf` (7 × 5 pol.) |

- `index.html` (vertical) e `horizontal.html` — diagramação de cada versão.
- `estilo.css` — fontes, cores, texturas e tipografia comuns às duas.
- `aquarela.js` — tratamento da aquarela; cada versão passa o enquadramento e a máscara.
- `assets/aquarela.webp` — ilustração do local; `assets/linho.jpg` — textura do papel.

A aquarela é tratada num `<canvas>` (`aquarela.js`): o céu azul vira papel
e a borda de cima ganha uma máscara irregular, feita com ruído, que imita tinta
escorrendo no papel molhado.

## Gerar de novo
```
node build.js
```
(requer Playwright/Chromium)
