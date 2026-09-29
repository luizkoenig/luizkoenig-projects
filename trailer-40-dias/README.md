# Trailer "Faltam 40 dias" — Luiz e Thamiris

Vídeo para **Stories** (1080 × 1920, 19,5 s) em clima de trailer de cinema para
anunciar que faltam 40 dias para o casamento (7 de novembro de 2026). Usa
**só cenas reais do casal** — do vídeo do iPhone e dos Reels do Instagram — com
a identidade do convite (bege `#E7D7C0`, laranja `#E37533`, fontes Tenor Sans /
Poppins e a assinatura "Luiz e Thamiris"). Os textos ficam dentro da área
segura dos Stories, fora das faixas cobertas pela interface do Instagram.

## Roteiro
| tempo | imagem | texto / som |
|---|---|---|
| 0–2,4 s | silhueta no pôr do sol (câmera lenta) | "TODA HISTÓRIA DE AMOR" · coração |
| 2,4–5,9 s | de mãos dadas no museu, abraço na fonte, selfie nos girassóis | braam |
| 5,9–9,6 s | o pedido: ajoelhado → o "sim" (câmera lenta) | "TEM UM PRIMEIRO SIM" · tique-taque |
| 9,6–11,3 s | montagem acelerada (beijo, pôr do sol, selfie, SP, abraço) | impactos |
| 11,3–11,75 s | preto | silêncio |
| 11,75–15,5 s | beijo em câmera lenta | "FALTAM **40** DIAS · PARA O GRANDE SIM" |
| 15,5–19,5 s | continua o beijo | "Luiz e Thamiris · 07 · 11 · 2026 · EM BREVE" |

## Arquivos
- `saida/trailer-faltam-40-dias-sem-audio.mp4` — sem som, para colocar a música
  ("The First Time") pelo adesivo de música do Stories.
- `saida/trailer-faltam-40-dias.mp4` — com a trilha de suspense sintetizada.
- `gerar_trailer.py` — gera o vídeo a partir dos vídeos originais (que não ficam
  no repositório).

## Gerar de novo
```
pip install numpy pillow fonttools brotli imageio-ffmpeg
python3 gerar_trailer.py --casal IMG_7572.MOV --pedido pedido.mp4 \
    --por-do-sol por_do_sol.mp4 --girassol girassol.mp4 \
    --museu museu.mp4 --sp sp.mp4
```
(requer `ffmpeg` com `zscale`, `tonemap` e `minterpolate` no PATH)
