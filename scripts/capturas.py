"""Genera las capturas del portafolio.
- Webs publicadas (BarberGest, Data Gest): scripts/capturas-web.mjs (Playwright).
- NailGest (aún sin desplegar) y pantallas internas: se reutilizan las capturas
  reales que ya existen en cada proyecto y se convierten a WebP.
Uso: python scripts/capturas.py
"""
from pathlib import Path
from PIL import Image

DEST = Path(__file__).resolve().parent.parent / "assets" / "proyectos"
DEST.mkdir(parents=True, exist_ok=True)
DOCS = Path.home() / "Documents"

def webp(src, nombre, recorte=None, ancho=1280):
    if not Path(src).exists():
        print('falta', src); return
    im = Image.open(src).convert("RGB")
    if recorte:
        im = im.crop((0, 0, im.width, min(im.height, recorte)))
    if im.width > ancho:
        im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    im.save(DEST / f"{nombre}.webp", "WEBP", quality=82)
    print("ok", nombre, im.size)

if __name__ == "__main__":
    ng = DOCS / "NailGest" / "capturas"
    webp(ng / "movil" / "despues-03-perfil-publico-390.png", "nailgest-perfil-movil", recorte=540, ancho=780)
    webp(ng / "movil" / "despues-05-reserva-dia-hora-390.png", "nailgest-reserva-movil", ancho=780)
    bg = DOCS / "Proyectos Independientes" / "BarberGest" / "marketing" / "capturas"
    webp(bg / "d_inventario.png", "barbergest-inventario")
    # Las webs publicadas se capturan con: node scripts/capturas-web.mjs
