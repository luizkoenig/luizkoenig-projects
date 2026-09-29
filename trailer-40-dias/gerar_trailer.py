"""Trailer "Faltam 40 dias" — Luiz e Thamiris (7 de novembro de 2026).

Gera um vídeo vertical 1080x1920 (19s) em estilo trailer de cinema usando só
as cenas reais do casal: câmera lenta, frases sobre as imagens, montagem
rápida, silêncio, "FALTAM 40 DIAS" e a assinatura do convite no final.
A trilha (drone, batidas de coração, "braams", tique-taque, riser e impacto)
é sintetizada aqui mesmo com numpy.

Uso:
    python3 gerar_trailer.py caminho/para/IMG_7572.MOV [saida.mp4]

Requer: ffmpeg com zscale/tonemap/minterpolate, numpy, pillow, fonttools, brotli.
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

W, H, FPS = 1080, 1920, 30
SR = 48000

# Paleta do convite
BEGE = (231, 215, 192)
LARANJA = (227, 117, 51)
VERMELHO = (170, 27, 27)

# Linha do tempo (segundos) — só imagens reais do casal
# (tempo no vídeo-fonte, duração no vídeo-fonte, velocidade)
T_A, SRC_A = 0.0, (0.3, 1.5, 0.5)      # abraço, câmera lenta
T_A2, SRC_A2 = 3.0, (2.3, 1.25, 0.5)   # risadas
T_B, SRC_B = 5.5, (11.2, 1.75, 0.5)    # olhares -> beijo
T_MONT = 9.0                           # montagem rápida
MONT_CORTES = [(3.9, 12), (9.3, 10), (5.2, 9), (14.0, 8), (10.3, 6), (15.3, 5)]
T_BLACK = T_MONT + sum(n for _, n in MONT_CORTES) / FPS   # silêncio
T_C, SRC_C = 11.2, (12.9, 3.12, 0.4)   # beijo em câmera lenta até o fim
T_SLAM = 11.35     # FALTAM 40 DIAS
T_END = 15.0       # Luiz e Thamiris · 07.11.2026
T_FIM = 19.0
N_FRAMES = int(round(T_FIM * FPS))

TONEMAP = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
           "tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p")


# ---------------------------------------------------------------- utilidades
def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def janela(t, t0, t1, fade_in=0.3, fade_out=0.3):
    """Opacidade 0..1 de um elemento visível entre t0 e t1."""
    if t < t0 or t > t1:
        return 0.0
    a = 1.0
    if fade_in > 0:
        a = min(a, (t - t0) / fade_in)
    if fade_out > 0:
        a = min(a, (t1 - t) / fade_out)
    return ease_in_out(a)


def woff2_para_ttf(nome, destino):
    caminho = os.path.join(destino, nome + ".ttf")
    if not os.path.exists(caminho):
        f = TTFont(os.path.join(FONTES_DIR, nome + ".woff2"))
        f.flavor = None
        f.save(caminho)
    return caminho


# ---------------------------------------------------------------- vídeo-fonte
def extrair(fonte, inicio, dur, velocidade, n):
    """Decodifica um trecho já convertido de HDR para SDR como array (n,H,W,3)."""
    vf = TONEMAP
    if velocidade != 1.0:
        vf += (f",setpts=PTS/{velocidade},minterpolate=fps={FPS}:mi_mode=mci:"
               "mc_mode=aobmc:me_mode=bidir:vsbmc=1")
    vf += f",scale={W}:{H}:flags=lanczos,format=rgb24"
    cmd = ["ffmpeg", "-v", "error", "-ss", str(inicio), "-t", str(dur + 0.5),
           "-i", fonte, "-vf", vf, "-frames:v", str(n), "-an",
           "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, check=True, stdout=subprocess.PIPE).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    if len(arr) < n:  # completa repetindo o último quadro
        arr = np.concatenate([arr, np.repeat(arr[-1:], n - len(arr), 0)])
    return arr[:n]


# ---------------------------------------------------------------- tratamento
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
_r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
VINHETA = (1 - 0.55 * np.clip(_r - 0.35, 0, 1) ** 1.6)[..., None]
GRAD_BAIXO = (1 - 0.75 * np.clip((yy - H * 0.52) / (H * 0.35), 0, 1))[..., None]
_rng = np.random.default_rng(7)
GRAO = [(_rng.standard_normal((H, W)).astype(np.float32) * 0.022)[..., None]
        for _ in range(6)]


def enquadrar(img, zoom=1.0, dx=0.0, dy=0.0):
    """Recorte com zoom/tremida (subpixel) — devolve float32 0..1."""
    cw, ch = W / zoom, H / zoom
    x0 = (W - cw) / 2 + dx
    y0 = (H - ch) / 2 + dy
    x0 = min(max(x0, 0), W - cw)
    y0 = min(max(y0, 0), H - ch)
    im = Image.fromarray(img).resize((W, H), Image.BICUBIC,
                                     box=(x0, y0, x0 + cw, y0 + ch))
    return np.asarray(im, np.float32) / 255.0


def gradacao(x, sat=0.75, brilho=0.92, contraste=0.55):
    lum = (x * np.array([0.299, 0.587, 0.114], np.float32)).sum(-1, keepdims=True)
    x = lum + (x - lum) * sat
    x = x * (1 - contraste) + (x * x * (3 - 2 * x)) * contraste
    # sombras frias, altas luzes quentes (teal & orange)
    x = x + (1 - lum) * np.array([-0.03, 0.01, 0.04], np.float32) \
          + lum * np.array([0.05, 0.015, -0.04], np.float32)
    return np.clip(x * brilho, 0, 1)


# ---------------------------------------------------------------- texto
class Tipos:
    def __init__(self, tmp):
        self.tenor = woff2_para_ttf("TenorSans-400", tmp)
        self.poppins = woff2_para_ttf("Poppins-300", tmp)
        self.assinatura = os.path.join(FONTES_DIR, "brittany_subset.ttf")
        self._cache = {}

    def fonte(self, caminho, tamanho):
        k = (caminho, int(tamanho))
        if k not in self._cache:
            self._cache[k] = ImageFont.truetype(caminho, int(tamanho))
        return self._cache[k]


def largura_texto(fonte, texto, tracking):
    return sum(fonte.getlength(c) for c in texto) + tracking * (len(texto) - 1)


def desenhar_texto(camada, texto, fonte, cy, tracking=0.0, cor=BEGE,
                   alpha=1.0, cx=W / 2, escala_max=0.86):
    """Escreve uma linha centralizada com espaçamento entre letras."""
    if alpha <= 0.003:
        return
    tam = fonte.size
    larg = largura_texto(fonte, texto, tracking)
    if larg > W * escala_max:  # reduz para caber na largura
        f = W * escala_max / larg
        fonte = ImageFont.truetype(fonte.path, max(8, int(tam * f)))
        tracking *= f
        larg = largura_texto(fonte, texto, tracking)
    d = ImageDraw.Draw(camada)
    x = cx - larg / 2
    asc, desc = fonte.getmetrics()
    y = cy - (asc + desc) / 2
    for c in texto:
        d.text((x, y), c, font=fonte, fill=cor + (int(255 * alpha),))
        x += fonte.getlength(c) + tracking


def aplicar_camada(frame, camada, brilho=0.0):
    """Compõe uma camada RGBA (PIL) sobre o frame float; brilho = glow suave."""
    arr = np.asarray(camada, np.float32) / 255.0
    a = arr[..., 3:4]
    if a.max() == 0:
        return frame
    sombra = camada.filter(ImageFilter.GaussianBlur(10))
    sa = np.asarray(sombra, np.float32)[..., 3:4] / 255.0
    frame = frame * (1 - 0.55 * sa)                 # sombra p/ legibilidade
    frame = frame * (1 - a) + arr[..., :3] * a
    if brilho > 0:
        glow = camada.filter(ImageFilter.GaussianBlur(28))
        g = np.asarray(glow, np.float32) / 255.0
        frame = frame + g[..., :3] * g[..., 3:4] * brilho
    return frame


# ---------------------------------------------------------------- render
def render(fonte, saida_video, tmp):
    tipos = Tipos(tmp)

    def trecho(src, t0, t1):
        return extrair(fonte, *src, int(round((t1 - t0) * FPS)) + 2)

    print("extraindo trechos do vídeo…", flush=True)
    planos = [  # (início, fim, quadros, zoom inicial, zoom final)
        (T_A, T_A2, trecho(SRC_A, T_A, T_A2), 1.04, 1.12),
        (T_A2, T_B, trecho(SRC_A2, T_A2, T_B), 1.14, 1.06),
        (T_B, T_MONT, trecho(SRC_B, T_B, T_MONT), 1.03, 1.15),
        (T_C, T_FIM, trecho(SRC_C, T_C, T_FIM), 1.16, 1.04),
    ]
    cortes = [extrair(fonte, s, n / FPS, 1.0, n) for s, n in MONT_CORTES]

    ff = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "slow", "-crf", "19",
         "-maxrate", "14M", "-bufsize", "28M",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", saida_video],
        stdin=subprocess.PIPE)

    rng = np.random.default_rng(11)
    f_frase = tipos.fonte(tipos.tenor, 60)
    mont_ini = np.cumsum([0] + [n for _, n in MONT_CORTES])
    frases = [(T_A + 0.5, T_A2 - 0.1, "TODA HISTÓRIA DE AMOR"),
              (T_A2 + 0.3, T_B - 0.2, "ESPERA POR UM DIA")]

    print("renderizando quadros…", flush=True)
    for i in range(N_FRAMES):
        t = i / FPS
        camada = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        brilho_txt = 0.35
        plano = next((p for p in planos if p[0] <= t < p[1]), None)

        if plano:
            t0, t1, clip, z0, z1 = plano
            k = (t - t0) / (t1 - t0)
            idx = min(int(round((t - t0) * FPS)), len(clip) - 1)
            frame = enquadrar(clip[idx], zoom=z0 + (z1 - z0) * ease_in_out(k))
            if t0 == T_C:
                frame = gradacao(frame, sat=0.7, brilho=0.8) * GRAD_BAIXO
            else:
                frame = gradacao(frame) * (0.45 + 0.55 * GRAD_BAIXO)
            if t0 in (T_A, T_C):                       # sai do preto
                frame = frame * ease_in_out((t - t0) / 0.6)
        elif T_MONT <= t < T_BLACK:
            # montagem acelerada: cortes secos com leve tremida
            j = np.searchsorted(mont_ini, i - int(round(T_MONT * FPS)), "right") - 1
            j = min(j, len(cortes) - 1)
            local = i - int(round(T_MONT * FPS)) - mont_ini[j]
            amp = 16 * np.exp(-local / 3)
            frame = enquadrar(cortes[j][min(local, len(cortes[j]) - 1)],
                              zoom=1.16 - 0.01 * local,
                              dx=rng.uniform(-amp, amp), dy=rng.uniform(-amp, amp))
            frame = gradacao(frame, sat=0.6, contraste=0.7)
            flash = 0.8 * np.exp(-local / 1.2)
            frame = frame * (1 - flash) + flash
        else:
            frame = np.zeros((H, W, 3), np.float32)       # silêncio no preto

        for f0, f1, txt in frases:
            desenhar_texto(camada, txt, f_frase, H * 0.82,
                           tracking=10 + 8 * (t - f0), alpha=janela(t, f0, f1, 0.5, 0.4))

        if T_SLAM <= t < T_END:
            ks = t - T_SLAM
            a = janela(t, T_SLAM, T_END - 0.05, 0.12, 0.45)
            s = 1 + 0.18 * np.exp(-ks * 12)
            desenhar_texto(camada, "FALTAM", tipos.fonte(tipos.tenor, 56),
                           H * 0.60, tracking=22 + 6 * ks, alpha=a)
            desenhar_texto(camada, "40", tipos.fonte(tipos.tenor, 400 * s),
                           H * 0.60 + 250, tracking=6, alpha=a)
            desenhar_texto(camada, "DIAS", tipos.fonte(tipos.tenor, 66),
                           H * 0.60 + 490, tracking=24 + 10 * ease_out(ks / 2),
                           alpha=min(a, janela(t, T_SLAM + 0.3, T_END, 0.4, 0.45)))
            desenhar_texto(camada, "PARA O NOSSO SIM", tipos.fonte(tipos.poppins, 38),
                           H * 0.60 + 590, tracking=14, cor=LARANJA,
                           alpha=min(a, janela(t, T_SLAM + 1.0, T_END, 0.5, 0.45)))
            brilho_txt = 0.4 + 0.8 * np.exp(-ks * 3)
        if t >= T_END:
            desenhar_texto(camada, "Luiz e Thamiris",
                           tipos.fonte(tipos.assinatura, 170), H * 0.72,
                           alpha=janela(t, T_END + 0.2, T_FIM + 1, 0.9, 0),
                           escala_max=0.9)
            desenhar_texto(camada, "07 · 11 · 2026", tipos.fonte(tipos.tenor, 54),
                           H * 0.72 + 175, tracking=18 + 4 * (t - T_END),
                           alpha=janela(t, T_END + 0.8, T_FIM + 1, 0.7, 0))
            desenhar_texto(camada, "EM BREVE", tipos.fonte(tipos.poppins, 34),
                           H * 0.72 + 265, tracking=30, cor=LARANJA,
                           alpha=janela(t, T_END + 1.5, T_FIM + 1, 0.7, 0))

        frame = aplicar_camada(frame, camada, brilho_txt)
        frame = frame * VINHETA + GRAO[i % len(GRAO)]
        frame[:110] = 0            # faixas de cinema
        frame[H - 110:] = 0
        frame = frame * (1 - ease_in_out((t - (T_FIM - 0.8)) / 0.8))
        ff.stdin.write((np.clip(frame, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
        if i % 60 == 0:
            print(f"  {i}/{N_FRAMES}", flush=True)
    ff.stdin.close()
    ff.wait()


# ---------------------------------------------------------------- trilha
def gerar_audio(caminho):
    n = int(T_FIM * SR) + SR
    L = np.zeros(n)
    R = np.zeros(n)
    rng = np.random.default_rng(5)

    def por(sinal, t, ganho=1.0, pan=0.0):
        a = int(t * SR)
        b = min(n, a + len(sinal))
        L[a:b] += sinal[:b - a] * ganho * (1 - pan) ** 0.5
        R[a:b] += sinal[:b - a] * ganho * (1 + pan) ** 0.5

    def tempo(d):
        return np.arange(int(d * SR)) / SR

    def passa_baixa(x, fc):
        """Filtro de um polo com corte variável (fc escalar ou array)."""
        fc = np.broadcast_to(np.asarray(fc, float), x.shape)
        a = 1 - np.exp(-2 * np.pi * fc / SR)
        y = np.empty_like(x)
        acc = 0.0
        for i in range(len(x)):
            acc += a[i] * (x[i] - acc)
            y[i] = acc
        return y

    def batida_coracao(forca=1.0):
        t = tempo(0.5)
        def thump(t0, g):
            tt = np.clip(t - t0, 0, None)
            f = 42 + 50 * np.exp(-tt * 30)
            ph = 2 * np.pi * np.cumsum(f) / SR
            return np.sin(ph) * np.exp(-tt * 18) * (t >= t0) * g
        return (thump(0, 1.0) + thump(0.22, 0.7)) * forca

    def braam(dur=2.6, f0=55.0):
        t = tempo(dur)
        corte = 3 + 22 * np.exp(-t * 2.2) * (1 - np.exp(-t * 40))
        s = np.zeros_like(t)
        for f in (f0, f0 * 1.498, f0 * 2, f0 * 1.003):
            for h in range(1, 36):
                if f * h > 6000:
                    break
                s += np.sin(2 * np.pi * f * h * t + h) / h * np.exp(-h / corte)
        env = (1 - np.exp(-t * 60)) * np.exp(-t * 1.3)
        return np.tanh(s * 1.4) * env

    def woosh(dur=1.0):
        t = tempo(dur)
        ruido = rng.standard_normal(len(t))
        fc = 300 + 5000 * np.sin(np.pi * t / dur) ** 2
        s = passa_baixa(ruido, fc) - passa_baixa(ruido, fc * 0.3)
        return s * np.sin(np.pi * t / dur) ** 2

    def tique(f=2200, dur=0.04):
        t = tempo(dur)
        return (np.sin(2 * np.pi * f * t) + 0.4 * rng.standard_normal(len(t))) \
            * np.exp(-t * 180)

    def impacto(dur=3.0):
        t = tempo(dur)
        f = 28 + 60 * np.exp(-t * 3)
        sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.1)
        ruido = rng.standard_normal(len(t))
        estalo = (ruido - passa_baixa(ruido, 1500)) * np.exp(-t * 25)
        return np.tanh(1.6 * sub) + 0.6 * estalo

    def sino(f, dur=3.5):
        t = tempo(dur)
        s = sum(np.sin(2 * np.pi * f * m * t) * g * np.exp(-t * (1.2 + m * 0.9))
                for m, g in ((1, 1.0), (2, 0.35), (3, 0.12), (4.2, 0.06)))
        return s * (1 - np.exp(-t * 300))

    # drone grave crescendo até o silêncio
    td = tempo(T_BLACK)
    drone = (np.sin(2 * np.pi * 36.7 * td) + 0.6 * np.sin(2 * np.pi * 55 * td)
             * (0.7 + 0.3 * np.sin(2 * np.pi * 0.25 * td)))
    ruido = passa_baixa(rng.standard_normal(len(td)), 180) * 6
    drone = (drone + ruido) * (0.08 + 0.3 * (td / T_BLACK) ** 2)
    drone[-200:] *= np.linspace(1, 0, 200)
    por(drone, 0, 0.6)

    # frases: woosh + coração
    for t0 in (T_A + 0.3, T_A2 + 0.2):
        por(woosh(1.2), t0, 0.35, -0.3)
        por(batida_coracao(), t0 + 0.25, 0.9)
        por(batida_coracao(0.9), t0 + 0.95, 0.9)
    # braams nos cortes
    por(braam(), T_A2, 0.55)
    por(braam(2.8, 49.0), T_B, 0.6)
    # tique-taque do relógio durante o beijo
    for k, t0 in enumerate(np.arange(T_B + 0.3, T_MONT, 0.5)):
        por(tique(2600 if k % 2 == 0 else 1900), t0, 0.35, 0.25 if k % 2 else -0.25)
    # riser até a montagem
    tr = tempo(T_BLACK - 7.5)
    kr = tr / tr[-1]
    riser = np.sin(2 * np.pi * np.cumsum(180 * 7 ** kr) / SR) * 0.4
    rr = rng.standard_normal(len(tr))
    riser += passa_baixa(rr, 400 + 9000 * kr ** 2) * 0.9
    por(riser * kr ** 2, 7.5, 0.5)
    # impactos em cada corte da montagem
    for j, c in enumerate(np.cumsum([0] + [n for _, n in MONT_CORTES])[:-1]):
        t0 = T_MONT + c / FPS
        por(impacto(0.5) * np.exp(-tempo(0.5) * 6), t0, 0.35 + 0.05 * j)
        por(tique(3000), t0, 0.3)
    # silêncio... respiração... FALTAM 40 DIAS
    por(woosh(0.8), T_SLAM - 0.7, 0.25, 0.3)
    por(impacto(), T_SLAM, 0.9)
    por(braam(3.0, 41.2), T_SLAM, 0.5)
    # final: sininhos + pad em lá maior
    notas = [(329.63, 0.0), (440.0, 0.45), (493.88, 0.9), (554.37, 1.35),
             (659.25, 2.0), (440.0, 2.0), (554.37, 2.0)]
    for f, dt in notas:
        por(sino(f), T_END + dt, 0.16, 0.3 * np.sin(f))
    tp = tempo(T_FIM - T_END + 1)
    pad = sum(np.sin(2 * np.pi * f * tp + f) for f in (110, 164.81, 220, 277.18))
    pad *= np.minimum(tp / 1.5, 1) * 0.05
    por(pad, T_END, 1.0)
    por(woosh(1.0), T_END - 0.3, 0.2)

    # reverb (resposta ao impulso sintética) e master
    ir_t = tempo(2.2)
    irL = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3)
    irR = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3)
    def conv(x, ir):
        m = len(x) + len(ir)
        return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)]
    wetL, wetR = conv(L, irL), conv(R, irR)
    wetL *= 0.25 * np.abs(L).max() / (np.abs(wetL).max() + 1e-9)
    wetR *= 0.25 * np.abs(R).max() / (np.abs(wetR).max() + 1e-9)
    mix = np.stack([L + wetL, R + wetR], 1)
    mix = np.tanh(mix / np.abs(mix).max() * 1.6)
    mix = mix / np.abs(mix).max() * 0.93
    fim = int(T_FIM * SR)
    mix = mix[:fim]
    mix[-int(0.6 * SR):] *= np.linspace(1, 0, int(0.6 * SR))[:, None]
    with wave.open(caminho, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype("<i2").tobytes())


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    fonte = sys.argv[1]
    saida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        AQUI, "saida", "trailer-faltam-40-dias.mp4")
    os.makedirs(os.path.dirname(os.path.abspath(saida)), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        video = os.path.join(tmp, "video.mp4")
        audio = os.path.join(tmp, "audio.wav")
        print("sintetizando trilha…", flush=True)
        gerar_audio(audio)
        render(fonte, video, tmp)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", audio,
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
                        "-shortest", "-movflags", "+faststart", saida], check=True)
    print("pronto:", saida)


if __name__ == "__main__":
    main()
