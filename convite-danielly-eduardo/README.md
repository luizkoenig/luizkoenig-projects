# Convite — Danielly e Eduardo

Convite de casamento no estilo papelaria fina: papel creme com textura de linho e
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

## Arquivo fechado para gráfica (CMYK)
Em `saida/impressao/`, um PDF por versão, com e sem marcas de corte:

- **Cor:** CMYK, perfil ISO Coated v2 (ECI) = FOGRA39 (`assets/ISOcoated_v2_eci.icc`,
  da European Color Initiative, de distribuição livre), embutido como OutputIntent.
- **Texto e fios cinza:** só preto (K), em sobreposição, para não borrar por registro.
- **Resolução:** 600 dpi. **Limite de tinta:** 330%.
- **Sangria:** 3 mm em cada lado (TrimBox/BleedBox marcados no PDF).
  Vertical: 127 × 177,8 mm no corte (133 × 183,8 mm com sangria).
  Horizontal: 177,8 × 127 mm no corte (183,8 × 133 mm com sangria).
- `_marcas_de_corte.pdf`: mesma arte com marcas de corte em cor de registro, numa
  margem de 10 mm. Para gráficas online (que pedem só sangria) use o PDF sem marcas.

Gerar de novo (requer Playwright e Python 3 com Pillow e NumPy):
```
node impressao.js
```
