# Trailer "Faltam 40 dias" — Luiz e Thamiris

Vídeo para **Stories** (1080 × 1920, 19,8 s) em clima de trailer de cinema para
anunciar que faltam 40 dias para o casamento (7 de novembro de 2026). Usa
**só cenas reais do casal** — do vídeo do iPhone e dos Reels do Instagram — com
os cortes no compasso de **"The First Time"** (Damiano David, 129 BPM) e a
identidade do convite (bege `#E7D7C0`, laranja `#E37533`, Tenor Sans / Poppins
e a assinatura "Luiz e Thamiris"). Os textos são fixos (só fade, sem tremer) e
centralizados, dentro da área segura dos Stories.

## Roteiro (trecho da música: 2:48,9 → 3:08,7 — ponte até o refrão final)
| tempo | imagem | música | texto |
|---|---|---|---|
| 0–3,7 s | silhueta no pôr do sol (câmera lenta) | ponte, calma | "TODA HISTÓRIA DE AMOR" |
| 3,7–5,6 s | mãos dadas no museu → abraço na fonte | corte a cada 2 tempos | |
| 5,6–9,3 s | o pedido: ajoelhado → o "sim" | 1º destaque (flash) | "TEM UM PRIMEIRO SIM" |
| 9,3–11,1 s | selfie nos girassóis → SP | 2º destaque | |
| 11,1–13,0 s | montagem, um corte por batida | 3º destaque | |
| 13,0–14,9 s | beijo em câmera lenta | volta a bateria (flash) | "FALTAM **40** DIAS · PARA O GRANDE SIM" |
| 14,9–19,8 s | continua o beijo | refrão | "Luiz e Thamiris · 07 · 11 · 2026 · EM BREVE" |

## Arquivos
- `saida/trailer-faltam-40-dias-sem-audio.mp4` — mesmo corte, sem som (dá para
  colocar a música pelo adesivo do Stories, começando em 2:48).
- A versão com a música embutida é gerada em `saida/trailer-faltam-40-dias.mp4`,
  mas não é versionada (repositório público; a música tem direitos autorais).
- `gerar_trailer.py` — gera o vídeo a partir dos vídeos originais e da música
  (que não ficam no repositório).

## Gerar de novo
```
pip install numpy pillow fonttools brotli imageio-ffmpeg
python3 gerar_trailer.py --musica the_first_time.mp3 --casal IMG_7572.MOV \
    --pedido pedido.mp4 --por-do-sol por_do_sol.mp4 --girassol girassol.mp4 \
    --museu museu.mp4 --sp sp.mp4
```
(requer `ffmpeg` com `zscale`, `tonemap` e `minterpolate` no PATH)
