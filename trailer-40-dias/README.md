# Trailer "Faltam 40 dias" — Luiz e Thamiris

Vídeo vertical (1080 × 1920, 19 s) em clima de trailer de cinema para anunciar
que faltam 40 dias para o casamento (7 de novembro de 2026). Usa **só cenas
reais do casal** — sem cartelas animadas — com a identidade do convite
(bege `#E7D7C0`, laranja `#E37533`, fontes Tenor Sans / Poppins e a
assinatura "Luiz e Thamiris").

## Roteiro
| tempo | imagem | texto / som |
|---|---|---|
| 0–3 s | abraço em câmera lenta | "TODA HISTÓRIA DE AMOR" · coração batendo |
| 3–5,5 s | risadas em câmera lenta | "ESPERA POR UM DIA" · braam |
| 5,5–9 s | olhares → beijo em câmera lenta | tique-taque do relógio, riser |
| 9–10,7 s | montagem acelerada de cortes | impactos a cada corte |
| 10,7–11,2 s | preto | silêncio |
| 11,2–15 s | beijo em câmera lenta | "FALTAM **40** DIAS · PARA O NOSSO SIM" · impacto grave |
| 15–19 s | continua o beijo | "Luiz e Thamiris · 07 · 11 · 2026 · EM BREVE" · sininhos |

A trilha é sintetizada pelo próprio script (dá para silenciar no Instagram e
colocar uma música por cima, se preferir).

## Arquivos
- `saida/trailer-faltam-40-dias.mp4` — vídeo em qualidade máxima (Reels/Stories).
- `saida/trailer-faltam-40-dias-whatsapp.mp4` — versão mais leve (21 MB) para WhatsApp.
- `gerar_trailer.py` — gera o vídeo a partir do vídeo original (o `.MOV` do
  iPhone, em HDR, não fica no repositório).

## Gerar de novo
```
pip install numpy pillow fonttools brotli imageio-ffmpeg
python3 gerar_trailer.py caminho/para/IMG_7572.MOV
```
(requer `ffmpeg` com `zscale`, `tonemap` e `minterpolate` no PATH)
