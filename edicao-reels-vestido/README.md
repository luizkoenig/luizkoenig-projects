# Reedição dinâmica — vestidos do Baile de Debutantes 2026

Reedita o Reels "vamos falar dos vestidos do Baile de Debutantes 2026" (vestido
da Suzi, em jacquard floral) em 1080 × 1920, mantendo o áudio e as legendas
originais e adicionando:

- **Motion:** zoom de impacto na abertura, *jump zooms* no ritmo das frases
  (plano aberto / médio / close no rosto), bounces nas palavras de ênfase
  (PROBLEMA, ORÇAMENTO, PROTAGONISTA, ROMÂNTICO, VERSÁTEIS) e push-in lento nos
  inserts.
- **Letterings** na faixa de cima, sincronizados com a fala: letra a letra,
  pop com overshoot e revelação do script (Tenor Sans, Poppins e Allison) —
  "Baile de Debutantes 2026", "o vestido da Suzi", "Romântico com
  personalidade", "Jacquard floral", "Proposta 01", "O problema", "fora do
  orçamento", "A solução", "o tecido como Protagonista", "Modelagem mais
  simples", "O resultado", "Corset + saia separados", "+ looks",
  "+ versáteis", "gostou dos bastidores?", "no próximo vídeo: o vestido da
  Giulia".
- **Transições:** whip pan com motion blur em cada corte de cena do original
  (16,3 s, 19,3 s, 34,2 s, 36,2 s, 38,0 s, 42,7 s, 46,2 s, 47,4 s), flash de
  abertura, whooshes e "pops" discretos mixados sob a voz.

Os letterings são rasterizados uma única vez e só transformados por quadro,
para não tremerem.

## Gerar
```
pip install numpy pillow fonttools brotli imageio-ffmpeg
python3 editar_video.py video_original.mp4      # → saida/vestido-suzi-dinamico.mp4
```
O vídeo original e o resultado não ficam no repositório (conteúdo de terceiros).
