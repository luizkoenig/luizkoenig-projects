"""Monta o arquivo fechado a partir das camadas renderizadas pelo impressao.js.

- fundo (RGB) -> CMYK pelo perfil ISO Coated v2 (ECI) = FOGRA39, intenção perceptual
- texto -> só preto (K), em sobreposição, com a tonalidade de cinza convertida para % de K
- sem sangria: o PDF tem o tamanho final do cartão (SANGRIA_MM > 0 espelha as bordas)
- PDF com MediaBox/BleedBox/TrimBox e OutputIntent FOGRA39; uma versão com marcas de corte
"""
import io
import json
import os
import sys
import zlib
from datetime import datetime

import numpy as np
from PIL import Image, ImageCms

AQUI = os.path.dirname(os.path.abspath(__file__))
CAMADAS = os.path.join(AQUI, 'saida', 'impressao', '_camadas')
SAIDA = os.path.join(AQUI, 'saida', 'impressao')
PERFIL = os.path.join(AQUI, 'assets', 'ISOcoated_v2_eci.icc')

DPI = 600
SANGRIA_MM = 0              # a gráfica pediu o arquivo no tamanho final, sem sangria
MARGEM_MARCAS_MM = 10        # área em volta do cartão para as marcas de corte
LIMITE_TINTA = 3.3           # 330%, limite de carga total do FOGRA39

mm_px = lambda mm: round(mm / 25.4 * DPI)
mm_pt = lambda mm: mm / 25.4 * 72

srgb = ImageCms.createProfile('sRGB')
fogra = ImageCms.getOpenProfile(PERFIL)
lab = ImageCms.createProfile('LAB')
rgb_cmyk = ImageCms.buildTransform(srgb, fogra, 'RGB', 'CMYK', ImageCms.Intent.PERCEPTUAL)
rgb_lab = ImageCms.buildTransform(srgb, lab, 'RGB', 'LAB', ImageCms.Intent.RELATIVE_COLORIMETRIC)
cmyk_lab = ImageCms.buildTransform(fogra, lab, 'CMYK', 'LAB', ImageCms.Intent.RELATIVE_COLORIMETRIC)

# Tabela K -> L* do preto puro neste perfil, para achar o % de K que reproduz cada cinza do texto.
_rampa = Image.frombytes('CMYK', (256, 1), bytes(b for k in range(256) for b in (0, 0, 0, k)))
L_DO_K = np.asarray(ImageCms.applyTransform(_rampa, cmyk_lab).getchannel('L'), dtype=np.float32)[0]


def k_para_L(L):
    """Inverte a tabela (L* cai conforme K sobe): devolve o K (0..255) para cada L*."""
    return np.interp(L, L_DO_K[::-1], np.arange(255, -1, -1, dtype=np.float32))


def montar(nome):
    fundo = Image.open(os.path.join(CAMADAS, f'{nome}-fundo.png')).convert('RGB')
    texto = Image.open(os.path.join(CAMADAS, f'{nome}-texto.png')).convert('RGBA')

    cmyk = np.asarray(ImageCms.applyTransform(fundo, rgb_cmyk), dtype=np.float32)

    alfa = np.asarray(texto.getchannel('A'), dtype=np.float32) / 255
    L = np.asarray(ImageCms.applyTransform(texto.convert('RGB'), rgb_lab).getchannel('L'), dtype=np.float32)
    k_texto = k_para_L(L) * alfa

    # preto em sobreposição: o K do texto soma sobre o fundo
    cmyk[..., 3] = 255 - (255 - cmyk[..., 3]) * (255 - k_texto) / 255

    # respeita o limite de tinta tirando CMY onde passar
    total = cmyk.sum(axis=2)
    limite = LIMITE_TINTA * 255
    excesso = total > limite
    if excesso.any():
        cmy = cmyk[..., :3].sum(axis=2)
        fator = np.where(excesso, np.clip((limite - cmyk[..., 3]) / np.maximum(cmy, 1), 0, 1), 1)
        cmyk[..., :3] *= fator[..., None]

    s = mm_px(SANGRIA_MM)
    cmyk = np.pad(cmyk, ((s, s), (s, s), (0, 0)), mode='symmetric')
    return Image.fromarray(np.clip(cmyk + .5, 0, 255).astype(np.uint8), 'CMYK')


def jpeg_cmyk(img):
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=95, subsampling=0, dpi=(DPI, DPI))
    dados = buf.getvalue()
    # JPEG CMYK com marcador Adobe é gravado invertido; o PDF precisa saber disso.
    invertido = b'Adobe' in dados[:4096]
    return dados, invertido


def pdf(caminho, img, pol, marcas, titulo):
    dados, invertido = jpeg_cmyk(img)
    icc = open(PERFIL, 'rb').read()

    corte_w, corte_h = pol[0] * 72, pol[1] * 72
    b = mm_pt(SANGRIA_MM)
    m = mm_pt(MARGEM_MARCAS_MM) if marcas else b
    pag_w, pag_h = corte_w + 2 * m, corte_h + 2 * m
    trim = (m, m, m + corte_w, m + corte_h)
    bleed = (m - b, m - b, m + corte_w + b, m + corte_h + b)
    num = lambda *v: ' '.join(f'{x:.3f}'.rstrip('0').rstrip('.') for x in v)

    conteudo = f'q {num(corte_w + 2 * b)} 0 0 {num(corte_h + 2 * b)} {num(m - b, m - b)} cm /Im0 Do Q\n'
    if marcas:
        # marcas de corte em cor de registro, começando 1 mm fora da sangria (ou 3 mm do corte, sem sangria)
        ini, fim = (b + mm_pt(1) if b else mm_pt(3)), m - mm_pt(1)
        linhas = []
        for x in (trim[0], trim[2]):
            linhas += [(x, trim[1] - ini, x, trim[1] - fim), (x, trim[3] + ini, x, trim[3] + fim)]
        for y in (trim[1], trim[3]):
            linhas += [(trim[0] - ini, y, trim[0] - fim, y), (trim[2] + ini, y, trim[2] + fim, y)]
        conteudo += 'q 1 1 1 1 K 0.25 w\n' + ''.join(f'{num(x1, y1)} m {num(x2, y2)} l S\n' for x1, y1, x2, y2 in linhas) + 'Q\n'
    conteudo = conteudo.encode()

    agora = datetime.now().strftime("D:%Y%m%d%H%M%S")
    objs = [
        b'<< /Type /Catalog /Pages 2 0 R /OutputIntents [5 0 R] >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        (f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {num(pag_w, pag_h)}] '
         f'/BleedBox [{num(*bleed)}] /TrimBox [{num(*trim)}] '
         f'/Resources << /XObject << /Im0 4 0 R >> >> /Contents 6 0 R >>').encode(),
        (f'<< /Type /XObject /Subtype /Image /Width {img.width} /Height {img.height} /ColorSpace /DeviceCMYK '
         f'/BitsPerComponent 8 /Filter /DCTDecode {"/Decode [1 0 1 0 1 0 1 0] " if invertido else ""}'
         f'/Length {len(dados)} >>\nstream\n').encode() + dados + b'\nendstream',
        b'<< /Type /OutputIntent /S /GTS_PDFX /OutputConditionIdentifier (FOGRA39) '
        b'/OutputCondition (ISO Coated v2 \\(ECI\\)) /RegistryName (http://www.color.org) '
        b'/Info (ISO Coated v2 \\(ECI\\)) /DestOutputProfile 7 0 R >>',
        f'<< /Length {len(conteudo)} >>\nstream\n'.encode() + conteudo + b'endstream',
        f'<< /N 4 /Length {len(icc)} >>\nstream\n'.encode() + icc + b'\nendstream',
        (f'<< /Title ({titulo}) /Creator (convite-danielly-eduardo/impressao.py) /Producer (Pillow + LittleCMS) '
         f'/CreationDate ({agora}) /ModDate ({agora}) /GTS_PDFXVersion (PDF/X-1a:2001) /Trapped /False >>').encode(),
    ]
    out = io.BytesIO()
    out.write(b'%PDF-1.3\n%\xe2\xe3\xcf\xd3\n')
    pos = []
    for i, o in enumerate(objs, 1):
        pos.append(out.tell())
        out.write(f'{i} 0 obj\n'.encode() + o + b'\nendobj\n')
    xref = out.tell()
    out.write(f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode())
    out.write(''.join(f'{p:010d} 00000 n \n' for p in pos).encode())
    ident = format(zlib.crc32(dados) & 0xffffffff, '08x') * 4
    out.write(f'trailer\n<< /Size {len(objs) + 1} /Root 1 0 R /Info 8 0 R /ID [<{ident}> <{ident}>] >>\n'
              f'startxref\n{xref}\n%%EOF\n'.encode())
    with open(caminho, 'wb') as f:
        f.write(out.getvalue())


if __name__ == '__main__':
    for v in json.loads(sys.argv[1]):
        img = montar(v['nome'])
        base = os.path.join(SAIDA, f'Convite_Danielly_e_Eduardo_{v["nome"]}_CMYK')
        titulo = f'Convite Danielly e Eduardo - {v["nome"]}'
        pdf(base + '.pdf', img, v['pol'], marcas=False, titulo=titulo)
        pdf(base + '_marcas_de_corte.pdf', img, v['pol'], marcas=True, titulo=titulo)
        print(f'{v["nome"]}: {img.width} x {img.height} px CMYK ({DPI} dpi, ' +
              (f'sangria {SANGRIA_MM} mm)' if SANGRIA_MM else 'sem sangria)'))
