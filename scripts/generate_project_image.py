#!/usr/bin/env python3
"""Generate PitchRelay project banner PNG with Pillow (or pure PPM fallback)."""

from __future__ import annotations

import os
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "images" / "project.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

W, H = 1280, 720


def try_pillow() -> bool:
    try:
        from PIL import Image, ImageDraw, ImageFont  # type: ignore
    except Exception:
        return False

    img = Image.new("RGB", (W, H), (11, 18, 32))
    draw = ImageDraw.Draw(img)

    # Background gradients via rectangles
    for y in range(H):
        t = y / H
        r = int(11 + 20 * (1 - t))
        g = int(18 + 40 * t * 0.3)
        b = int(32 + 10 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Pitch oval
    draw.ellipse([440, 210, 840, 510], outline=(34, 197, 94), width=4)
    draw.ellipse([520, 280, 760, 440], outline=(34, 197, 94), width=2)

    # Graph nodes
    nodes = [
        (640, 120, (56, 189, 248)),  # gate
        (900, 260, (56, 189, 248)),
        (980, 420, (239, 68, 68)),  # medical
        (820, 380, (167, 139, 250)),  # seat
        (640, 360, (34, 197, 94)),
        (400, 360, (245, 158, 11)),  # elev
        (300, 200, (56, 189, 248)),
        (640, 560, (56, 189, 248)),
    ]
    # edges
    pairs = [(0, 4), (1, 4), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (4, 7)]
    for a, b in pairs:
        draw.line([nodes[a][:2], nodes[b][:2]], fill=(31, 41, 55), width=3)
    # highlight path
    for a, b in [(0, 4), (4, 3)]:
        draw.line([nodes[a][:2], nodes[b][:2]], fill=(34, 197, 94), width=5)
    for x, y, c in nodes:
        draw.ellipse([x - 10, y - 10, x + 10, y + 10], fill=c)

    # Card panel
    draw.rounded_rectangle([80, 160, 420, 520], radius=24, fill=(17, 24, 39), outline=(34, 197, 94))
    draw.rectangle([80, 160, 92, 520], fill=(34, 197, 94))

    try:
        font_lg = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 54)
        font_md = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 28)
        font_sm = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 22)
    except Exception:
        font_lg = ImageFont.load_default()
        font_md = font_lg
        font_sm = font_lg

    draw.text((80, 48), "PitchRelay", fill=(34, 197, 94), font=font_lg)
    draw.text((80, 110), "Stadium graph → Decision Cards", fill=(229, 231, 235), font=font_md)

    draw.text((110, 190), "DECISION CARD", fill=(156, 163, 175), font=font_sm)
    draw.text((110, 230), "Open Gate D overflow", fill=(255, 255, 255), font=font_md)
    draw.text((110, 280), "Severity  HIGH", fill=(245, 158, 11), font=font_sm)
    draw.text((110, 330), "• Ops: open south overflow", fill=(209, 213, 219), font=font_sm)
    draw.text((110, 370), "• Vol: redirect EN/ES/FR", fill=(209, 213, 219), font=font_sm)
    draw.text((110, 410), "• PA drafts ready", fill=(209, 213, 219), font=font_sm)
    draw.text((110, 460), "Fan · Volunteer · Ops", fill=(34, 197, 94), font=font_sm)

    draw.text(
        (80, 640),
        "Unity Arena · WC2026 hackathon demo · mock-safe GenAI",
        fill=(156, 163, 175),
        font=font_sm,
    )

    img.save(OUT, "PNG")
    print(f"Wrote {OUT} via Pillow")
    return True


def write_png_raw() -> None:
    """Minimal PNG writer without Pillow."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    rows = []
    for y in range(H):
        row = bytearray([0])  # filter none
        for x in range(W):
            # dark bg with green accent diagonal
            t = y / H
            r = int(11 + 15 * (1 - t))
            g = int(18 + 30 * (x / W) * 0.4)
            b = int(32 + 20 * t)
            # oval-ish pitch glow
            dx, dy = (x - 640) / 200, (y - 360) / 140
            if dx * dx + dy * dy < 1:
                g = min(255, g + 40)
            # left card
            if 80 <= x <= 420 and 160 <= y <= 520:
                r, g, b = 17, 24, 39
                if x <= 92:
                    r, g, b = 34, 197, 94
            # title bar green speckles
            if 60 <= y <= 100 and 80 <= x <= 400:
                r, g, b = 34, 197, 94
            row.extend((r, g, b))
        rows.append(bytes(row))

    raw = b"".join(rows)
    compressed = zlib.compress(raw, 9)
    ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    OUT.write_bytes(png)
    print(f"Wrote {OUT} via raw PNG")


def main() -> None:
    if not try_pillow():
        write_png_raw()
    assert OUT.exists() and OUT.stat().st_size > 1000


if __name__ == "__main__":
    main()
