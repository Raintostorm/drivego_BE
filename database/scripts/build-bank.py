# -*- coding: utf-8 -*-
"""Phase 0 — Build the single 600-question bank + per-class pools from official PDFs.

Outputs:
  database/content/bank.json    — 600 (599) questions: number, category, body, answers, correctIndex, imageUrl, isCritical
  database/content/pools.json   — { A1, A2, B1, B2 } -> list of bank numbers
  frontend/public/content/bank/images/cau-NNN.png + database/content/bank/images

Sources:
  - "B*.pdf" (root)              -> 600-question car bank  (defines the bank + B2 pool + B1 candidates)
  - "*250*A1*.pdf" (root)        -> 250 motorcycle subset  (defines A1/A2 pool, keeps original 1..600 numbers)
  - database/content/appendices.json -> Phu luc 2 (B1 300) + Phu luc 3 (60 critical). NEEDS VERIFICATION.

Run:  python database/scripts/build-bank.py
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path

import fitz

from pdf_parse_common import parse_questions

ROOT = Path(__file__).resolve().parents[2]
BANK_DIR = ROOT / "database" / "content" / "bank"
# Bank reuses the already-deployed B2 question images (same source PDF, same cau-NNN.png names).
B2_IMAGES = ROOT / "frontend" / "public" / "content" / "B2" / "images"
IMAGE_URL_PREFIX = "/content/B2/images"
APPENDICES = ROOT / "database" / "content" / "appendices.json"

# Official chapter ranges (VB 2262/CSGT-P5)
CHAPTER_RANGES = [
    ("I", 1, 180),     # Quy dinh chung & quy tac
    ("II", 181, 205),  # Van hoa, dao duc, PCCC
    ("III", 206, 263), # Ky thuat lai xe
    ("IV", 264, 300),  # Cau tao & sua chua
    ("V", 301, 485),   # Bao hieu duong bo
    ("VI", 486, 600),  # Sa hinh & xu ly tinh huong
]


def category_of(n: int) -> str:
    for code, lo, hi in CHAPTER_RANGES:
        if lo <= n <= hi:
            return code
    raise ValueError(f"Cau {n} ngoai dai 1..600")


def find_pdf(patterns: list[str], reject: list[str] | None = None) -> Path:
    reject = reject or []
    for p in sorted(ROOT.glob("*.pdf")):
        name = p.name.lower()
        if any(r in name for r in reject):
            continue
        if all(any(tok in name for tok in grp.split("|")) for grp in patterns):
            return p
    raise FileNotFoundError(f"No PDF matched {patterns} (reject={reject})")


def parse_numbers(pdf_path: Path) -> set[int]:
    doc = fitz.open(pdf_path)
    qs = parse_questions(doc)
    doc.close()
    return {q.number for q in qs}


def build_bank() -> dict:
    car_pdf = find_pdf(["b"], reject=["250", "a1", "moto"]) if False else None
    # car bank = the 600 pdf (largest, has ~600 questions); pick by content
    car_pdf = None
    for p in sorted(ROOT.glob("*.pdf")):
        doc = fitz.open(p)
        n = len(parse_questions(doc))
        doc.close()
        if n >= 500:
            car_pdf = p
            break
    if car_pdf is None:
        raise FileNotFoundError("Khong tim thay PDF 600 cau o thu muc goc")

    doc = fitz.open(car_pdf)
    questions = parse_questions(doc)
    doc.close()
    # Mark which questions have an image by reusing the existing B2 image set.
    for q in questions:
        fname = f"cau-{q.number:03d}.png"
        q.image_file = fname if (B2_IMAGES / fname).exists() else None

    crit: set[int] = set()
    b1_pool: list[int] = []
    if APPENDICES.exists():
        ap = json.loads(APPENDICES.read_text(encoding="utf-8"))
        crit = set(ap.get("critical60", []))
        b1_pool = sorted(ap.get("b1Pool300", []))

    bank = []
    for q in sorted(questions, key=lambda x: x.number):
        answers = [a for a in q.answers if a and a.strip() and a.strip() != "—"]
        bank.append(
            {
                "number": q.number,
                "category": category_of(q.number),
                "body": q.body,
                "answers": answers,
                "correctIndex": min(q.correct_index, max(0, len(answers) - 1)),
                "imageUrl": f"{IMAGE_URL_PREFIX}/{q.image_file}" if q.image_file else None,
                "isCritical": q.number in crit,
            }
        )
    return {"bank": bank, "carPdf": car_pdf.name, "critical": crit, "b1Pool": b1_pool}


def main() -> int:
    res = build_bank()
    bank = res["bank"]
    nums = {q["number"] for q in bank}

    # A1/A2 pool from the 250 motorcycle docx (keeps original 1..600 numbering, exactly 250 questions)
    a1_pool: list[int] = []
    for p in sorted(ROOT.glob("*.docx")):
        if "250" in p.name or "a1" in p.name.lower() or "moto" in p.name.lower():
            xml = zipfile.ZipFile(p).read("word/document.xml").decode("utf-8", "ignore")
            text = re.sub(r"<[^>]+>", " ", xml)
            a1_pool = sorted({int(m.group(1)) for m in re.finditer(r"Câu\s+(\d+)\s*[.:]", text)})
            break
    if not a1_pool:  # fallback: 250 pdf
        for p in sorted(ROOT.glob("*.pdf")):
            if "250" in p.name or "moto" in p.name.lower():
                a1_pool = sorted(parse_numbers(p))
                break

    b2_pool = sorted(nums)  # full bank
    b1_pool = res["b1Pool"] or b2_pool  # fall back to full bank until Phu luc 2 confirmed

    pools = {"A1": a1_pool, "A2": a1_pool, "B1": b1_pool, "B2": b2_pool}

    (ROOT / "database" / "content" / "bank.json").write_text(
        json.dumps({"bank": bank}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (ROOT / "database" / "content" / "pools.json").write_text(
        json.dumps(pools, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # ---- Verification report ----
    cat_counts = Counter(q["category"] for q in bank)
    print("=== BANK ===")
    print(f"car pdf       : {res['carPdf']}")
    print(f"bank size     : {len(bank)} (official 600; missing: {sorted(set(range(1,601))-nums)})")
    print(f"by chapter    : {dict(sorted(cat_counts.items()))}")
    print(f"  expected    : I=180 II=25 III=58 IV=37 V=185 VI=115")
    ncrit = sum(1 for q in bank if q['isCritical'])
    print(f"critical60    : {ncrit} flagged "
          f"({'OK' if ncrit==60 else 'NEEDS appendices.json (Phu luc 3)'})")
    bad_ans = [q['number'] for q in bank if len(q['answers']) < 2]
    print(f"answers<2     : {bad_ans[:10]} (n={len(bad_ans)})")
    print("\n=== POOLS ===")
    for code, pool in pools.items():
        cc = Counter(category_of(n) for n in pool)
        print(f"{code:3s} size={len(pool):3d} by_chapter={dict(sorted(cc.items()))}")
    print("\nA1 expected: 250 (I=100 II=10 III=15 V=90 VI=35)")
    print("B1 expected: 300 (from Phu luc 2)  | B2 expected: 600")
    return 0


if __name__ == "__main__":
    sys.exit(main())
