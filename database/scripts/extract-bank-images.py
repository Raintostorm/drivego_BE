# -*- coding: utf-8 -*-
"""Re-extract question images from the 600-question PDF using band-based matching.

The original heuristic matched one image per question by raw proximity, which
mis-assigned images on pages holding several questions (≈47 image questions, mostly
chương V biển báo, ended up with none). Here each question "owns" the raster images
that fall in its vertical band [this question .y0 , next question .y0), which is robust.

Output: database/content/bank/images-rebuilt/cau-NNN.png  (for review first)
Run: python database/scripts/extract-bank-images.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import fitz

from pdf_parse_common import parse_questions

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "database" / "content" / "bank" / "images-rebuilt"


def find_pdf() -> Path:
    for p in sorted(ROOT.glob("*.pdf")):
        doc = fitz.open(p)
        n = len(parse_questions(doc))
        doc.close()
        if n >= 500:
            return p
    raise FileNotFoundError("Không tìm thấy PDF 600 câu")


def main() -> int:
    pdf = find_pdf()
    doc = fitz.open(pdf)
    qs = sorted(parse_questions(doc), key=lambda q: (q.page, q.y0))

    # next-question y0 on the same page (else a large sentinel = page bottom)
    next_y0 = {}
    for i, q in enumerate(qs):
        nxt = qs[i + 1] if i + 1 < len(qs) else None
        next_y0[q.number] = nxt.y0 if (nxt and nxt.page == q.page) else 1e9

    OUT.mkdir(parents=True, exist_ok=True)
    got = []
    for q in qs:
        page = doc[q.page]
        lo, hi = q.y0 - 6, next_y0[q.number] - 4
        best = None
        best_area = 0
        for img in page.get_images(full=True):
            xref = img[0]
            try:
                rects = page.get_image_rects(xref)
            except Exception:
                continue
            for r in rects:
                if r.width < 50 or r.height < 50:
                    continue
                cy = (r.y0 + r.y1) / 2
                if not (lo <= cy < hi):
                    continue
                area = r.width * r.height
                if area > best_area:
                    best_area = area
                    best = xref
        if best is None:
            continue
        try:
            pix = fitz.Pixmap(doc, best)
            if pix.n - pix.alpha > 3:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            pix.save(str(OUT / f"cau-{q.number:03d}.png"))
            pix = None
            got.append(q.number)
        except Exception as e:
            print(f"  ! câu {q.number}: {e}")
    doc.close()

    print(f"pdf={pdf.name}")
    print(f"Trích được ảnh cho {len(got)}/{len(qs)} câu → {OUT}")
    # so với bộ cũ
    old = ROOT / "frontend" / "public" / "content" / "B2" / "images"
    old_set = {int(f.stem.split('-')[1]) for f in old.glob("cau-*.png")} if old.exists() else set()
    new_set = set(got)
    print(f"Bộ cũ: {len(old_set)} | bộ mới: {len(new_set)}")
    print(f"  Mới có thêm (cũ thiếu): {sorted(new_set - old_set)}")
    print(f"  Cũ có mà mới mất: {sorted(old_set - new_set)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
