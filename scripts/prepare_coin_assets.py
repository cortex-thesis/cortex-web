"""Extract the original coin photos with geometric masks, without redrawing them."""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "frontend/public/assets/life/life-03"


def extract(source, filename, outline=None):
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    scale = 4
    mask = Image.new("L", (width * scale, height * scale))
    draw = ImageDraw.Draw(mask)
    if outline:
        # Points traced on the original 391 x 400 five-peso photo.
        points = [(round(x / 391 * width * scale), round(y / 400 * height * scale)) for x, y in outline]
        draw.polygon(points, fill=255)
    else:
        draw.ellipse((0, 0, width * scale - 1, height * scale - 1), fill=255)
    mask = mask.resize(image.size, Image.Resampling.LANCZOS)
    image.putalpha(mask)
    image = image.crop(mask.getbbox())
    ratio = 460 / max(image.size)
    image = image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (512, 512))
    canvas.alpha_composite(image, ((512 - image.width) // 2, (512 - image.height) // 2))
    canvas.save(DEST / filename)
    assert canvas.getpixel((0, 0))[3] == 0
    print(filename, canvas.size, canvas.getbbox())


if __name__ == "__main__":
    extract(Path("C:/Users/sofia/Downloads/1peso.jpg"), "one-peso-coin-transparent.png")
    extract(DEST / "ten-peso-coin.jpg", "ten-peso-coin-transparent.png")
    extract(DEST / "five-peso-coin.png", "five-peso-coin-transparent.png", [
        (191, 28), (215, 30), (239, 36), (264, 47), (289, 64),
        (312, 85), (333, 109), (349, 134), (360, 160), (367, 186),
        (368, 210), (362, 235), (353, 259), (339, 285), (320, 311),
        (298, 332), (274, 350), (247, 363), (221, 371), (193, 373),
        (167, 369), (141, 362), (115, 349), (93, 332), (73, 312),
        (57, 291), (44, 267), (34, 243), (27, 219), (25, 194),
        (27, 170), (34, 145), (45, 121), (60, 99), (79, 79),
        (100, 62), (124, 47), (148, 37), (171, 31),
    ])
