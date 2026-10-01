"""Reedição dinâmica do Reels "vestidos do Baile de Debutantes 2026".

Pega o vídeo original (talking head + inserts) e devolve em 1080x1920 com:
- motion: zoom de impacto na abertura, "jump zooms" no ritmo das frases
  (plano aberto / médio / close no rosto), bounces nas palavras de ênfase e
  push-in lento nos inserts;
- letterings: títulos animados na faixa de cima (letra a letra, pop com
  overshoot, revelação do script), sincronizados com a fala;
- transições: whip pan com motion blur em cada corte de cena + whooshes.

Os letterings são pré-renderizados uma vez (sprites) e só transformados por
quadro, então não tremem.

Uso:
    python3 editar_video.py video_original.mp4 [saida.mp4]
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTES_DIR = os.path.join(AQUI, "..", "manual-padrinhos", "fonts")

SW, SH = 720, 1280          # vídeo original
W, H, FPS = 1080, 1920, 30  # saída
SR = 48000

CREME = (250, 244, 236)
MALVA = (158, 118, 118)     # mesma cor das legendas do vídeo
VINHO = (112, 40, 54)

# Cortes de cena do original (ffmpeg scdet) e trechos de insert (b-roll)
CORTES = [16.3, 19.267, 34.233, 36.233, 38.033, 42.7, 46.2, 47.367]
INSERTS = [(16.3, 19.267), (34.233, 42.7), (46.2, 47.367)]
PIP = (12.85, 14.85)        # tecido em picture-in-picture: mantém plano aberto

# Jump zooms nos inícios de frase (tempo, zoom). 1.0 = quadro inteiro.
ZOOMS = [
    (0.0, 1.0), (1.25, 1.15), (2.0, 1.28), (4.25, 1.0), (6.25, 1.18),
    (8.25, 1.3), (9.5, 1.12), (10.75, 1.0), (11.75, 1.2), (12.5, 1.0),
    (15.5, 1.2), (19.267, 1.0), (19.5, 1.26), (20.75, 1.1), (22.25, 1.28),
    (24.0, 1.0), (25.0, 1.2), (26.0, 1.05), (27.25, 1.25), (28.75, 1.08),
    (30.75, 1.3), (31.75, 1.0), (33.0, 1.22), (42.7, 1.0), (43.0, 1.15),
    (44.75, 1.3), (45.25, 1.05), (47.367, 1.2), (48.0, 1.0), (49.5, 1.25),
    (50.5, 1.1), (52.5, 1.3), (55.0, 1.0), (55.75, 1.2), (58.0, 1.05),
    (58.75, 1.25), (59.5, 1.1), (60.25, 1.3),
]
ENFASES = [19.55, 25.05, 33.05, 41.0, 53.55]   # PROBLEMA, ORÇAMENTO, PROTAGONISTA…
ROSTO = (0.44, 0.37)        # centro do rosto no quadro (fração)


# ---------------------------------------------------------------- utilidades
def clamp01(x):
    return min(max(x, 0.0), 1.0)


def ease_out(x):
    return 1 - (1 - clamp01(x)) ** 3


def ease_in_out(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def ease_back(x, s=1.9):
    x = clamp01(x) - 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def woff2_para_ttf(nome, destino):
    caminho = os.path.join(destino, nome + ".ttf")
    if not os.path.exists(caminho):
        f = TTFont(os.path.join(FONTES_DIR, nome + ".woff2"))
        f.flavor = None
        f.save(caminho)
    return caminho


# ---------------------------------------------------------------- câmera
def camera(t):
    """(zoom, centro_x, centro_y) do enquadramento no tempo t."""
    for a, b in INSERTS:
        if a <= t < b:   # push-in lento nos inserts
            return 1.02 + 0.08 * ease_in_out((t - a) / (b - a)), 0.5, 0.5
    if t < 0.7:          # abertura: zoom de impacto
        z = 1.4 - 0.4 * ease_out(t / 0.7)
    else:
        z_ant, z = ZOOMS[0][1], ZOOMS[0][1]
        for i, (tk, zk) in enumerate(ZOOMS):
            if tk <= t:
                z_ant = ZOOMS[i - 1][1] if i else zk
                k = (t - tk) / 0.12          # punch rápido (4 quadros)
                z = z_ant + (zk - z_ant) * ease_out(k)
    if PIP[0] <= t < PIP[1]:
        z = 1.0
    for te in ENFASES:
        if 0 <= t - te < 0.5:
            z += 0.06 * np.sin(np.pi * (t - te) / 0.5) * np.exp(-(t - te) * 3)
    z = max(1.0, z + 0.012 * (1 + np.sin(t * 0.9)))   # respiração sutil
    k = clamp01((z - 1) / 0.3)
    return z, 0.5 + (ROSTO[0] - 0.5) * k, 0.5 + (ROSTO[1] - 0.5) * k


def enquadrar(img, z, cx, cy):
    cw, ch = SW / z, SH / z
    x0 = min(max(cx * SW - cw / 2, 0), SW - cw)
    y0 = min(max(cy * SH - ch / 2, 0), SH - ch)
    return img.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))


def blur_horizontal(x, n):
    """Motion blur horizontal (média móvel de n px) via soma acumulada."""
    if n < 2:
        return x
    c = np.cumsum(np.pad(x, ((0, 0), (n // 2 + 1, n - n // 2 - 1), (0, 0)), mode="edge"),
                  axis=1, dtype=np.float32)
    return (c[:, n:] - c[:, :-n]) / n


def transicao(frame, t):
    """Whip pan nos cortes: sai deslizando com blur, o próximo entra do outro lado."""
    for j, tc in enumerate(CORTES):
        d = t - tc
        if -0.2 <= d < 0.2:
            w = 1 - abs(d) / 0.2
            direcao = 1 if j % 2 == 0 else -1
            desloc = int(direcao * (1 if d < 0 else -1) * -W * 0.45 * w ** 2.2)
            x = np.asarray(frame, np.float32)
            x = np.roll(x, desloc, axis=1)
            x = blur_horizontal(x, int(10 + 260 * w ** 1.5))
            x = x * (1 + 0.25 * w ** 3)
            return Image.fromarray(np.clip(x, 0, 255).astype(np.uint8))
    return frame


# leve contraste/calor aplicado por LUT no original
_v = np.arange(256) / 255.0
_curva = np.clip(_v + 0.06 * np.sin(2 * np.pi * _v) * -0.5 + 0.04 * (_v - 0.5), 0, 1)
LUT = np.concatenate([np.clip(_curva * 1.02, 0, 1), _curva, np.clip(_curva * 0.97, 0, 1)])
LUT = (LUT * 255).astype(np.uint8).tolist()


# ---------------------------------------------------------------- letterings
class Fontes:
    def __init__(self, tmp):
        self.tenor = woff2_para_ttf("TenorSans-400", tmp)
        self.poppins = woff2_para_ttf("Poppins-300", tmp)
        self.poppins4 = woff2_para_ttf("Poppins-400", tmp)
        self.script = woff2_para_ttf("Allison-400", tmp)

    def get(self, nome, tam):
        return ImageFont.truetype(getattr(self, nome), int(tam))


def sprite(texto, fonte, cor, tracking=0, caixa=None, metricas=None):
    """Rasteriza um texto (com sombra e caixa opcional) num RGBA recortado.

    `metricas` (topo, base) força a altura da linha — usado nas letras
    soltas para todas ficarem na mesma linha de base.
    """
    larg = sum(fonte.getlength(c) for c in texto) + tracking * (len(texto) - 1)
    _, topo, _, base = metricas or fonte.getbbox(texto)
    pad = 40
    px, py = (34, 14) if caixa else (0, 0)
    im = Image.new("RGBA", (int(larg + 2 * (pad + px)), int(base - topo + 2 * (pad + py))))
    d = ImageDraw.Draw(im)
    if caixa:
        d.rounded_rectangle((pad, pad, im.width - pad, im.height - pad), radius=14,
                            fill=caixa + (235,))
    x, y = pad + px, pad + py - topo
    texto_layer = Image.new("RGBA", im.size)
    dt = ImageDraw.Draw(texto_layer)
    for c in texto:
        dt.text((x, y), c, font=fonte, fill=cor + (255,))
        x += fonte.getlength(c) + tracking
    sombra = Image.new("RGBA", im.size, (20, 10, 12, 0))
    sombra.putalpha(texto_layer.getchannel("A").point(lambda a: int(a * 0.55)))
    sombra = sombra.filter(ImageFilter.GaussianBlur(9))
    base_im = Image.new("RGBA", im.size)
    if not caixa:
        base_im.alpha_composite(sombra, (0, 4))
    base_im.alpha_composite(im)
    base_im.alpha_composite(texto_layer)
    return base_im


class Linha:
    """Uma linha de lettering com animação de entrada e saída."""

    def __init__(self, fontes, texto, fonte, tam, y, anim="rise", atraso=0.0,
                 cor=CREME, tracking=0, caixa=None):
        self.f = fontes.get(fonte, tam)
        larg = sum(self.f.getlength(c) for c in texto) + tracking * (len(texto) - 1)
        if larg > W * 0.88:            # reduz para caber na largura
            tam *= W * 0.88 / larg
            tracking *= W * 0.88 / larg
            self.f = fontes.get(fonte, tam)
        self.y, self.anim, self.atraso = y * H, anim, atraso
        self.img = sprite(texto, self.f, cor, tracking, caixa)
        if anim == "letras":   # um sprite por letra, nas posições da linha inteira
            larg = sum(self.f.getlength(c) for c in texto) + tracking * (len(texto) - 1)
            x = W / 2 - larg / 2
            metricas = self.f.getbbox(texto)
            self.letras = []
            for c in texto:
                if c != " ":
                    s = sprite(c, self.f, cor, metricas=metricas)
                    self.letras.append((s, x - 40, len(self.letras)))
                x += self.f.getlength(c) + tracking
            self.n = len(self.letras)

    def compor(self, tela, t, t0, t1):
        ti = t - t0 - self.atraso
        if ti < 0 or t > t1:
            return
        saida = clamp01((t - (t1 - 0.25)) / 0.25)
        a_sai, dy_sai = 1 - saida, -24 * ease_in_out(saida)
        img = self.img
        if self.anim == "letras":
            for s, x, i in self.letras:
                p = ease_out((ti - i * 0.035) / 0.35)
                if p <= 0:
                    continue
                y = self.y - s.height / 2 + 46 * (1 - p) + dy_sai
                colar(tela, s, x, y, p * a_sai)
            return
        if self.anim == "pop":
            p = ease_back(ti / 0.32)
            esc = 0.55 + 0.45 * p
            img = img.resize((max(1, int(img.width * esc)), max(1, int(img.height * esc))),
                             Image.BICUBIC)
            alpha = clamp01(ti / 0.12)
            dy = 0
        elif self.anim == "wipe":     # revela da esquerda para a direita
            p = ease_in_out(ti / 0.55)
            mask = np.clip((np.linspace(0, 1, img.width) - p * 1.15 + 0.15) / -0.15, 0, 1)
            img = img.copy()
            a = np.asarray(img.getchannel("A"), np.float32) * mask[None, :]
            img.putalpha(Image.fromarray(a.astype(np.uint8)))
            alpha, dy = 1.0, 0
        else:                         # rise
            p = ease_out(ti / 0.4)
            alpha, dy = p, 36 * (1 - p)
        colar(tela, img, W / 2 - img.width / 2, self.y - img.height / 2 + dy + dy_sai,
              alpha * a_sai)


def colar(tela, img, x, y, alpha):
    if alpha <= 0.01:
        return
    if alpha < 0.99:
        img = img.copy()
        img.putalpha(img.getchannel("A").point(lambda a: int(a * alpha)))
    x, y = int(round(x)), int(round(y))
    cx, cy = max(0, -x), max(0, -y)          # recorta o que sai da tela
    if cx or cy:
        img = img.crop((cx, cy, img.width, img.height))
    tela.alpha_composite(img, (x + cx, y + cy))


def letterings(F):
    L = lambda *a, **k: Linha(F, *a, **k)  # noqa: E731
    return [
        (0.15, 3.95, [L("BAILE DE", "poppins4", 44, 0.092, "letras", tracking=12),
                      L("DEBUTANTES", "tenor", 118, 0.14, "letras", 0.25, tracking=4),
                      L("2026", "script", 170, 0.215, "pop", 0.9)]),
        (4.3, 7.1, [L("o vestido da", "poppins", 46, 0.095, "rise"),
                    L("Suzi", "script", 220, 0.165, "wipe", 0.2)]),
        (8.3, 10.6, [L("ROMÂNTICO", "tenor", 104, 0.11, "letras", tracking=6),
                     L("com personalidade", "script", 120, 0.175, "wipe", 1.2)]),
        (12.5, 14.6, [L("JACQUARD FLORAL", "tenor", 66, 0.115, "pop", tracking=4, caixa=MALVA)]),
        (14.05, 16.25, [L("PROPOSTA", "poppins4", 42, 0.09, "rise", tracking=14),
                        L("01", "tenor", 150, 0.148, "pop", 0.2)]),
        (19.5, 22.1, [L("O PROBLEMA", "tenor", 96, 0.115, "pop", tracking=4, caixa=VINHO)]),
        (22.25, 23.95, [L("PREÇO ELEVADO", "tenor", 84, 0.115, "letras", tracking=4)]),
        (24.0, 26.0, [L("fora do", "poppins", 46, 0.092, "rise"),
                      L("ORÇAMENTO", "tenor", 112, 0.145, "letras", 1.0, tracking=4)]),
        (28.75, 30.65, [L("A SOLUÇÃO", "tenor", 96, 0.115, "pop", tracking=4, caixa=MALVA)]),
        (30.75, 34.15, [L("o tecido como", "poppins", 46, 0.092, "rise"),
                        L("Protagonista", "script", 190, 0.16, "wipe", 2.25)]),
        (34.3, 37.95, [L("MODELAGEM", "tenor", 104, 0.11, "letras", tracking=6),
                       L("mais simples", "script", 140, 0.172, "wipe", 1.2)]),
        (39.5, 42.6, [L("O RESULTADO", "poppins4", 44, 0.09, "rise", tracking=12),
                      L("romântico", "script", 180, 0.148, "wipe", 1.5),
                      L("COM PERSONALIDADE", "tenor", 54, 0.212, "letras", 2.0, tracking=6)]),
        (45.25, 47.3, [L("CORSET + SAIA", "tenor", 88, 0.11, "letras", tracking=4),
                       L("SEPARADOS", "poppins4", 44, 0.165, "pop", 1.0, tracking=10,
                         caixa=VINHO)]),
        (49.5, 52.3, [L("+ LOOKS", "tenor", 130, 0.12, "pop", tracking=6)]),
        (52.5, 54.9, [L("+ VERSÁTEIS", "tenor", 100, 0.12, "pop", 1.0, tracking=4,
                        caixa=MALVA)]),
        (55.0, 57.6, [L("gostou dos", "poppins", 46, 0.092, "rise"),
                      L("bastidores?", "script", 190, 0.158, "wipe", 0.75)]),
        (58.0, 61.4, [L("NO PRÓXIMO VÍDEO", "poppins4", 42, 0.09, "letras", tracking=10),
                      L("o vestido da", "poppins", 44, 0.13, "rise", 2.2),
                      L("Giulia", "script", 230, 0.19, "wipe", 2.3)]),
    ]


# ---------------------------------------------------------------- áudio
def preparar_audio(video, caminho, duracao, pops):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vn", "-ac", "2",
                          "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, stdout=subprocess.PIPE).stdout
    voz = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    n = int(duracao * SR)
    voz = np.pad(voz, ((0, max(0, n - len(voz))), (0, 0)))[:n]
    sfx = np.zeros(n)
    rng = np.random.default_rng(3)

    def por(s, t, g):
        a = int(t * SR)
        b = min(n, a + len(s))
        if a < n:
            sfx[a:b] += s[:b - a] * g

    def woosh(dur):
        t = np.arange(int(dur * SR)) / SR
        ruido = rng.standard_normal(len(t))
        spec = np.fft.rfft(ruido)
        f = np.fft.rfftfreq(len(t), 1 / SR)
        spec *= np.exp(-((np.log(f + 1) - np.log(1800)) ** 2) / 1.2)
        s = np.fft.irfft(spec, len(t))
        s /= np.abs(s).max()
        return s * np.sin(np.pi * t / dur) ** 3

    def pop():
        t = np.arange(int(0.12 * SR)) / SR
        f = 900 * np.exp(-t * 18) + 300
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35)

    por(woosh(0.7), 0.0, 0.5)
    for tc in CORTES:
        por(woosh(0.45), tc - 0.22, 0.45)
    for tp in pops:
        por(pop(), tp, 0.25)
    pico = np.abs(voz).max() or 1.0
    mix = voz + (sfx * 0.35 * pico)[:, None]
    mix *= 0.97 / max(np.abs(mix).max(), 1e-9)
    with wave.open(caminho, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype("<i2").tobytes())


# ---------------------------------------------------------------- render
def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    fonte = sys.argv[1]
    saida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        AQUI, "saida", "vestido-suzi-dinamico.mp4")
    os.makedirs(os.path.dirname(os.path.abspath(saida)), exist_ok=True)
    info = subprocess.run(["ffmpeg", "-i", fonte], stderr=subprocess.PIPE, text=True).stderr
    hh, mm, ss = info.split("Duration: ")[1].split(",")[0].split(":")
    n_frames = int((int(hh) * 3600 + int(mm) * 60 + float(ss)) * FPS)

    with tempfile.TemporaryDirectory() as tmp:
        F = Fontes(tmp)
        blocos = letterings(F)
        pops = [t0 + ln.atraso for t0, _, linhas in blocos for ln in linhas
                if ln.anim == "pop"]
        audio = os.path.join(tmp, "audio.wav")
        video = os.path.join(tmp, "video.mp4")
        preparar_audio(fonte, audio, n_frames / FPS, pops)

        dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", fonte, "-an",
                                "-vf", f"scale={SW}:{SH},format=rgb24",
                                "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
        enc = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
             "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
             "-c:v", "libx264", "-preset", "slow", "-crf", "20",
             "-maxrate", "10M", "-bufsize", "20M",
             "-pix_fmt", "yuv420p", "-movflags", "+faststart", video],
            stdin=subprocess.PIPE)

        print("renderizando…", flush=True)
        for i in range(n_frames):
            raw = dec.stdout.read(SW * SH * 3)
            if len(raw) < SW * SH * 3:
                break
            t = i / FPS
            src = Image.frombuffer("RGB", (SW, SH), raw).point(LUT)
            quadro = transicao(enquadrar(src, *camera(t)), t)
            if t < 0.25:   # flash de abertura
                quadro = Image.blend(Image.new("RGB", (W, H), CREME), quadro, ease_out(t / 0.25))
            tela = quadro.convert("RGBA")
            for t0, t1, linhas in blocos:
                if t0 <= t <= t1:
                    for ln in linhas:
                        ln.compor(tela, t, t0, t1)
            enc.stdin.write(tela.convert("RGB").tobytes())
            if i % 150 == 0:
                print(f"  {i}/{n_frames}", flush=True)
        enc.stdin.close()
        enc.wait()
        dec.wait()
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", audio,
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                        "-movflags", "+faststart", saida], check=True)
    print("pronto:", saida)


if __name__ == "__main__":
    main()
