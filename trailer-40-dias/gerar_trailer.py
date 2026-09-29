"""Trailer "Faltam 40 dias" — Luiz e Thamiris (7 de novembro de 2026).

Gera um vídeo para Stories (1080x1920, 19,8s) em estilo trailer de cinema
usando só cenas reais do casal, com os cortes no compasso de "The First Time"
(Damiano David, 129 BPM). O trecho usado é a ponte (calma, com três batidas
de destaque) até a volta da bateria do refrão final, onde entra
"FALTAM 40 DIAS". Os textos são fixos (só aparecem/somem com fade) e
centralizados, dentro da área segura dos Stories.

Uso:
    python3 gerar_trailer.py --musica the_first_time.mp3 --casal IMG_7572.MOV \\
        --pedido pedido.mp4 --por-do-sol por_do_sol.mp4 --girassol girassol.mp4 \\
        --museu museu.mp4 --sp sp.mp4 [--saida trailer.mp4]

Requer: ffmpeg com zscale/tonemap/minterpolate, numpy, pillow, fonttools, brotli.
"""
import argparse
import os
import subprocess
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

# Vídeos de origem (nomes das opções de linha de comando)
FONTES = ("casal", "pedido", "por_do_sol", "girassol", "museu", "sp")
HDR = {"casal"}    # gravado em HDR (HLG) no iPhone

# Música: 129,2 BPM; compassos (4 tempos) começando em 168,85s da faixa.
# Destaques da ponte em 174,36 / 178,08 / 179,93 e a bateria volta em 181,79.
MUSICA_INICIO = 168.85
BATIDA = 60 / 129.2
COMPASSO = 4 * BATIDA


def c(compassos, batidas=0.0):
    """Tempo no trailer a partir de compassos + batidas."""
    return compassos * COMPASSO + batidas * BATIDA


T_HIT1, T_HIT2, T_HIT3, T_DROP = c(3), c(5), c(6), c(7)

# Planos: (início, fim no trailer, fonte, início na fonte, velocidade, zoom0, zoom1)
PLANOS = [
    (0.0, c(2), "por_do_sol", 0.2, 0.5, 1.04, 1.12),        # silhueta no pôr do sol
    (c(2), c(2, 2), "museu", 76.2, 1.0, 1.10, 1.05),        # de mãos dadas
    (c(2, 2), T_HIT1, "museu", 65.8, 1.0, 1.05, 1.10),      # abraço na fonte
    (T_HIT1, c(4), "pedido", 6.8, 0.6, 1.03, 1.12),         # ajoelhado
    (c(4), T_HIT2, "pedido", 14.0, 0.5, 1.12, 1.04),        # o "sim"
    (T_HIT2, c(5, 2), "girassol", 17.4, 0.5, 1.10, 1.04),   # selfie nos girassóis
    (c(5, 2), T_HIT3, "sp", 0.8, 1.0, 1.04, 1.10),          # em SP
]
# Montagem no último compasso antes da bateria: um corte por batida,
# meia batida no fim. (fonte, início na fonte, início no trailer)
MONT_CORTES = [("pedido", 26.6, c(6)), ("por_do_sol", 6.4, c(6, 1)),
               ("museu", 25.7, c(6, 2)), ("casal", 2.8, c(6, 3)),
               ("museu", 79.4, c(6, 3.5))]
PLANO_FINAL = ("casal", 12.9, 0.4)   # beijo em câmera lenta a partir da bateria
T_END = c(8)                         # troca "40 dias" pela assinatura
T_FIM = 19.8
N_FRAMES = int(round(T_FIM * FPS))
FLASHES = [T_HIT1, T_HIT2, T_HIT3, T_DROP]

TONEMAP = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
           "tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p")


# ---------------------------------------------------------------- utilidades
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
def extrair(fonte, inicio, dur, velocidade, n, hdr=False):
    """Decodifica um trecho (HDR convertido para SDR) como array (n,H,W,3)."""
    vf = TONEMAP if hdr else "null"
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
# escurece o centro-baixo do quadro, onde ficam os textos
_d = np.abs(yy - H * 0.53) / (H * 0.30)
FAIXA_TEXTO = (1 - 0.45 * np.clip(1 - _d, 0, 1) ** 1.5)[..., None]
_rng = np.random.default_rng(7)
GRAO = [(_rng.standard_normal((H, W)).astype(np.float32) * 0.02)[..., None]
        for _ in range(6)]


def enquadrar(img, zoom=1.0, dx=0.0, dy=0.0):
    """Recorte com zoom (subpixel) — devolve float32 0..1."""
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

    def fonte(self, caminho, tamanho):
        return ImageFont.truetype(caminho, int(tamanho))


def largura_texto(fonte, texto, tracking):
    return sum(fonte.getlength(ch) for ch in texto) + tracking * (len(texto) - 1)


def desenhar_texto(camada, texto, fonte, cy, tracking=0.0, cor=BEGE, escala_max=0.86):
    """Escreve uma linha centralizada (horizontal e verticalmente em cy)."""
    larg = largura_texto(fonte, texto, tracking)
    if larg > W * escala_max:  # reduz para caber na largura
        f = W * escala_max / larg
        fonte = ImageFont.truetype(fonte.path, max(8, int(fonte.size * f)))
        tracking *= f
        larg = largura_texto(fonte, texto, tracking)
    d = ImageDraw.Draw(camada)
    _, topo, _, base = fonte.getbbox(texto)
    x = round(W / 2 - larg / 2)
    y = round(cy - (topo + base) / 2)
    for ch in texto:
        d.text((x, y), ch, font=fonte, fill=cor + (255,))
        x += fonte.getlength(ch) + tracking


class Letreiro:
    """Bloco de texto renderizado uma única vez (texto, sombra e brilho).

    Por quadro só muda a opacidade — nada de escala ou espaçamento animado,
    então as letras ficam paradas, sem tremer.
    """

    def __init__(self, linhas, brilho=0.35):
        camada = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for texto, fonte, cy, tracking, cor in linhas:
            desenhar_texto(camada, texto, fonte, cy, tracking, cor)
        arr = np.asarray(camada, np.float32) / 255.0
        self.cor = arr[..., :3]
        self.a = arr[..., 3:4]
        sombra = np.asarray(camada.filter(ImageFilter.GaussianBlur(12)), np.float32)
        self.sombra = sombra[..., 3:4] / 255.0
        glow = np.asarray(camada.filter(ImageFilter.GaussianBlur(28)), np.float32) / 255.0
        self.glow = glow[..., :3] * glow[..., 3:4] * brilho
        ys = np.nonzero(self.a[..., 0].max(1))[0]
        self.y0, self.y1 = max(0, ys[0] - 90), min(H, ys[-1] + 90)

    def compor(self, frame, alpha):
        if alpha <= 0.003:
            return frame
        s = slice(self.y0, self.y1)
        f = frame[s]
        f = f * (1 - 0.6 * alpha * self.sombra[s])
        a = self.a[s] * alpha
        f = f * (1 - a) + self.cor[s] * a
        frame[s] = f + self.glow[s] * alpha
        return frame


# ---------------------------------------------------------------- render
def render(fontes, saida_video, tmp):
    tipos = Tipos(tmp)

    def trecho(nome, inicio, vel, n):
        return extrair(fontes[nome], inicio, n / FPS * vel, vel, n, nome in HDR)

    print("extraindo trechos dos vídeos…", flush=True)
    planos = []
    for t0, t1, nome, inicio, vel, z0, z1 in PLANOS:
        n = int(round((t1 - t0) * FPS)) + 2
        planos.append((t0, t1, trecho(nome, inicio, vel, n), z0, z1))
    nome, inicio, vel = PLANO_FINAL
    n = int(round((T_FIM - T_DROP) * FPS)) + 2
    planos.append((T_DROP, T_FIM, trecho(nome, inicio, vel, n), 1.14, 1.04))
    fins = [m[2] for m in MONT_CORTES[1:]] + [T_DROP]
    cortes = [(t0, t1, trecho(nome, inicio, 1.0, int(round((t1 - t0) * FPS)) + 2))
              for (nome, inicio, t0), t1 in zip(MONT_CORTES, fins)]

    meio = H / 2
    f_frase = tipos.fonte(tipos.tenor, 62)
    frases = [
        (0.35, c(2) - 0.1, Letreiro([("TODA HISTÓRIA DE AMOR", f_frase, meio, 14, BEGE)])),
        (T_HIT1 + 0.15, T_HIT2 - 0.1,
         Letreiro([("TEM UM PRIMEIRO SIM", f_frase, meio, 14, BEGE)])),
    ]
    faltam = Letreiro([
        ("FALTAM", tipos.fonte(tipos.tenor, 58), meio - 250, 24, BEGE),
        ("40", tipos.fonte(tipos.tenor, 400), meio, 6, BEGE),
        ("DIAS", tipos.fonte(tipos.tenor, 70), meio + 250, 30, BEGE),
        ("PARA O GRANDE SIM", tipos.fonte(tipos.poppins, 40), meio + 360, 14, LARANJA),
    ], brilho=0.5)
    assinatura = Letreiro([
        ("Luiz e Thamiris", tipos.fonte(tipos.assinatura, 170), meio - 40, 0, BEGE),
        ("07 · 11 · 2026", tipos.fonte(tipos.tenor, 56), meio + 150, 20, BEGE),
        ("EM BREVE", tipos.fonte(tipos.poppins, 36), meio + 250, 30, LARANJA),
    ], brilho=0.45)

    ff = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "slow", "-crf", "19",
         "-maxrate", "14M", "-bufsize", "28M",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", saida_video],
        stdin=subprocess.PIPE)

    print("renderizando quadros…", flush=True)
    for i in range(N_FRAMES):
        t = i / FPS
        plano = next((p for p in planos if p[0] <= t < p[1]), None)
        corte = next((m for m in cortes if m[0] <= t < m[1]), None)

        if plano:
            t0, t1, clip, z0, z1 = plano
            k = (t - t0) / (t1 - t0)
            idx = min(int(round((t - t0) * FPS)), len(clip) - 1)
            frame = enquadrar(clip[idx], zoom=z0 + (z1 - z0) * ease_in_out(k))
            if t0 == T_DROP:
                frame = gradacao(frame, sat=0.7, brilho=0.8)
            else:
                frame = gradacao(frame)
            if t0 == 0:
                frame = frame * ease_in_out(t / 0.8)            # sai do preto
        elif corte:
            t0, t1, clip = corte
            local = int(round((t - t0) * FPS))
            frame = enquadrar(clip[min(local, len(clip) - 1)], zoom=1.16 - 0.01 * local)
            frame = gradacao(frame, sat=0.6, contraste=0.7)
            flash = 0.7 * np.exp(-local / 1.2)                  # flash em cada batida
            frame = frame * (1 - flash) + flash
        else:
            frame = np.zeros((H, W, 3), np.float32)

        # flash branco nas batidas de destaque e na volta da bateria
        for tf in FLASHES:
            if 0 <= t - tf < 0.4:
                fl = 0.85 * np.exp(-(t - tf) * 9)
                frame = frame * (1 - fl) + fl

        frame = frame * VINHETA + GRAO[i % len(GRAO)]
        alphas = [(letreiro, janela(t, f0, f1, 0.45, 0.35)) for f0, f1, letreiro in frases]
        alphas += [(faltam, janela(t, T_DROP, T_END, 0.05, 0.4)),
                   (assinatura, janela(t, T_END + 0.15, T_FIM + 1, 0.7, 0))]
        escuro = max(a for _, a in alphas)
        if t >= T_DROP:
            escuro = 1.0
        frame = frame * (1 - (1 - FAIXA_TEXTO) * escuro)
        for letreiro, a in alphas:
            letreiro.compor(frame, a)

        frame[:110] = 0            # faixas de cinema (ficam sob a interface do Stories)
        frame[H - 110:] = 0
        frame = frame * (1 - ease_in_out((t - (T_FIM - 0.8)) / 0.8))
        ff.stdin.write((np.clip(frame, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
        if i % 60 == 0:
            print(f"  {i}/{N_FRAMES}", flush=True)
    ff.stdin.close()
    ff.wait()


# ---------------------------------------------------------------- áudio
def preparar_audio(musica, caminho):
    """Recorta a música a partir de MUSICA_INICIO, com fade de entrada e saída."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", musica, "-ac", "2",
                          "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, stdout=subprocess.PIPE).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2)
    a = int(MUSICA_INICIO * SR)
    x = x[a:a + int(T_FIM * SR)].copy()
    ent, sai = int(0.25 * SR), int(1.0 * SR)
    x[:ent] *= np.linspace(0, 1, ent)[:, None]
    x[-sai:] *= np.linspace(1, 0, sai)[:, None] ** 1.5
    with wave.open(caminho, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--musica", required=True)
    for nome in FONTES:
        ap.add_argument("--" + nome.replace("_", "-"), dest=nome, required=True)
    ap.add_argument("--saida", default=os.path.join(
        AQUI, "saida", "trailer-faltam-40-dias.mp4"))
    args = ap.parse_args()
    fontes = {nome: getattr(args, nome) for nome in FONTES}
    saida = args.saida
    os.makedirs(os.path.dirname(os.path.abspath(saida)), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        video = os.path.join(tmp, "video.mp4")
        audio = os.path.join(tmp, "audio.wav")
        preparar_audio(args.musica, audio)
        render(fontes, video, tmp)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", audio,
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
                        "-shortest", "-movflags", "+faststart", saida], check=True)
    print("pronto:", saida)


if __name__ == "__main__":
    main()
