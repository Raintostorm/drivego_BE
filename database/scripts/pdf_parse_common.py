# -*- coding: utf-8 -*-
"""Shared GPLX PDF parsing (underline-based correct answers)."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

import fitz

SCORE_THRESHOLD = 55


def is_answer_underline_stroke(rect: fitz.Rect) -> bool:
    return rect.height < 4 and 40 < rect.width < 420


def underline_score(page: fitz.Page, bbox: fitz.Rect) -> float:
    best = 1e9
    expanded = fitz.Rect(bbox.x0, bbox.y0 - 48, bbox.x1, bbox.y1 + 14)
    for d in page.get_drawings():
        r = d.get("rect")
        if r is None or not is_answer_underline_stroke(r):
            continue
        if r.y1 < expanded.y0 or r.y0 > expanded.y1:
            continue
        overlap = min(r.x1, bbox.x1) - max(r.x0, bbox.x0)
        if overlap < 25:
            continue
        dist = abs((r.y0 + r.y1) / 2 - bbox.y1)
        best = min(best, dist)
    return best


@dataclass
class TextLine:
    page: int
    y0: float
    text: str
    bbox: fitz.Rect
    ul_score: float = 1e9


@dataclass
class Question:
    number: int
    body: str
    answers: list[str] = field(default_factory=list)
    correct_index: int = 0
    image_file: str | None = None
    page: int = 0
    y0: float = 0


def extract_page_lines(page: fitz.Page, page_no: int) -> list[TextLine]:
    lines: list[TextLine] = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            text = "".join(span["text"] for span in line["spans"]).strip()
            if not text:
                continue
            bbox = fitz.Rect(line["bbox"])
            lines.append(
                TextLine(
                    page=page_no,
                    y0=bbox.y0,
                    text=text,
                    bbox=bbox,
                    ul_score=underline_score(page, bbox),
                )
            )
    lines.sort(key=lambda l: l.y0)
    return lines


def merge_answer_lines(
    doc: fitz.Document,
    lines: list[TextLine],
    start: int,
) -> tuple[list[tuple[str, float]], int]:
    answers: list[tuple[str, float]] = []
    i = start
    current_num: int | None = None
    current_parts: list[str] = []
    current_score = 1e9

    def flush():
        nonlocal current_num, current_parts, current_score
        if current_num is None:
            return
        body = re.sub(r"\s+", " ", " ".join(p.strip() for p in current_parts if p.strip())).strip()
        if body:
            answers.append((body, current_score))
        current_num = None
        current_parts = []
        current_score = 1e9

    while i < len(lines):
        t = lines[i].text
        m = re.match(r"^([1-4])\.\s*(.*)$", t)
        if m:
            flush()
            current_num = int(m.group(1))
            rest = m.group(2).strip()
            current_parts = [rest] if rest else []
            current_score = lines[i].ul_score
            i += 1
            continue
        if re.match(r"^Câu\s+\d+\s*[.:]", t, re.I):
            flush()
            break
        if re.match(r"^CHƯƠNG\s+[IVX]", t, re.I):
            flush()
            break
        if current_num is not None:
            current_parts.append(t)
            current_score = min(current_score, lines[i].ul_score)
            i += 1
            continue
        i += 1
    flush()
    return answers, i


def pick_correct_index(scores: list[float]) -> int:
    if not scores:
        return 0
    best = min(range(len(scores)), key=lambda i: scores[i])
    if scores[best] >= SCORE_THRESHOLD:
        return 0
    return best


def parse_questions(doc: fitz.Document) -> list[Question]:
    all_lines: list[TextLine] = []
    for pno in range(doc.page_count):
        all_lines.extend(extract_page_lines(doc[pno], pno))

    questions: list[Question] = []
    i = 0
    while i < len(all_lines):
        m = re.match(r"^Câu\s+(\d+)\s*[.:]\s*(.*)$", all_lines[i].text, re.I)
        if not m:
            i += 1
            continue
        num = int(m.group(1))
        body_parts = [m.group(2).strip()] if m.group(2).strip() else []
        page = all_lines[i].page
        y0 = all_lines[i].y0
        i += 1
        while i < len(all_lines):
            t = all_lines[i].text
            if re.match(r"^Câu\s+\d+\s*[.:]", t, re.I):
                break
            if re.match(r"^CHƯƠNG\s+[IVX]", t, re.I):
                break
            if re.match(r"^[1-4]\.\s", t):
                break
            body_parts.append(t)
            i += 1
        body = re.sub(r"\s+", " ", " ".join(body_parts)).strip()
        raw_answers, i = merge_answer_lines(doc, all_lines, i)
        answers = [a[0] for a in raw_answers]
        scores = [a[1] for a in raw_answers]
        questions.append(
            Question(
                number=num,
                body=body,
                answers=answers,
                correct_index=pick_correct_index(scores),
                page=page,
                y0=y0,
            )
        )
    return questions


def assign_and_export_images(
    doc: fitz.Document,
    questions: list[Question],
    images_dir: Path,
    public_images_dir: Path,
) -> None:
    images_dir.mkdir(parents=True, exist_ok=True)
    public_images_dir.mkdir(parents=True, exist_ok=True)
    used_xrefs: dict[int, set[int]] = {}

    for q in questions:
        page = doc[q.page]
        best_xref = None
        best_dist = 1e9
        used = used_xrefs.setdefault(q.page, set())

        for img in page.get_images(full=True):
            xref = img[0]
            if xref in used:
                continue
            try:
                rects = page.get_image_rects(xref)
            except Exception:
                continue
            for rect in rects:
                if rect.width < 50 or rect.height < 50:
                    continue
                dist = abs(rect.y1 - q.y0) if rect.y1 <= q.y0 + 20 else abs(rect.y0 - q.y0)
                if dist < best_dist and dist < 500:
                    best_dist = dist
                    best_xref = xref

        if best_xref is None:
            continue

        fname = f"cau-{q.number:03d}.png"
        q.image_file = fname
        used.add(best_xref)
        for dest in (images_dir / fname, public_images_dir / fname):
            try:
                pix = fitz.Pixmap(doc, best_xref)
                if pix.n - pix.alpha > 3:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                pix.save(str(dest))
                pix = None
            except Exception:
                pass


def build_papers(
    questions: list[Question],
    *,
    total_questions: int,
    questions_per_paper: int,
    paper_count: int,
    critical_numbers: set[int],
    image_url_prefix: str,
) -> dict:
    by_num = {q.number: q for q in questions}
    missing = [n for n in range(1, total_questions + 1) if n not in by_num]
    papers = []
    max_scan = max(total_questions + 50, max(by_num.keys(), default=0) + 50)
    for p in range(paper_count):
        start = p * questions_per_paper + 1
        qs_out = []
        n = start
        while len(qs_out) < questions_per_paper and n <= max_scan:
            q = by_num.get(n)
            if q:
                answers = q.answers[:4]
                while len(answers) < 4:
                    answers.append("—")
                image_url = f"{image_url_prefix}/{q.image_file}" if q.image_file else None
                qs_out.append(
                    {
                        "body": q.body,
                        "answers": answers,
                        "correctIndex": min(q.correct_index, len(answers) - 1),
                        "isCritical": q.number in critical_numbers,
                        "imageUrl": image_url,
                    }
                )
            n += 1
        papers.append(
            {
                "paperNumber": p + 1,
                "questionCount": len(qs_out),
                "isMock": True,
                "questions": qs_out,
            }
        )
    return {"papers": papers, "missing": missing, "parsedCount": len(questions)}


def build_papers_sequential(
    questions: list[Question],
    *,
    questions_per_paper: int,
    critical_numbers: set[int],
    image_url_prefix: str,
) -> dict:
    """Pack parsed questions (sorted by number) into full mock papers of N questions each."""
    sorted_qs = sorted(questions, key=lambda q: q.number)
    papers = []
    for p in range(0, len(sorted_qs) // questions_per_paper):
        chunk = sorted_qs[p * questions_per_paper : (p + 1) * questions_per_paper]
        if len(chunk) < questions_per_paper:
            break
        qs_out = []
        for q in chunk:
            answers = q.answers[:4]
            while len(answers) < 4:
                answers.append("—")
            image_url = f"{image_url_prefix}/{q.image_file}" if q.image_file else None
            qs_out.append(
                {
                    "body": q.body,
                    "answers": answers,
                    "correctIndex": min(q.correct_index, len(answers) - 1),
                    "isCritical": q.number in critical_numbers,
                    "imageUrl": image_url,
                }
            )
        papers.append(
            {
                "paperNumber": len(papers) + 1,
                "questionCount": questions_per_paper,
                "isMock": True,
                "questions": qs_out,
            }
        )
    max_num = max((q.number for q in questions), default=0)
    missing = [n for n in range(1, max_num + 1) if n not in {q.number for q in questions}]
    return {"papers": papers, "missing": missing, "parsedCount": len(questions)}


def write_parse_output(
    out_dir: Path,
    payload: dict,
    *,
    pdf_name: str,
    min_parsed: int,
    sample_numbers: list[int],
    log_notes: list[str],
) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    missing = payload.pop("missing")
    parsed = payload.pop("parsedCount")

    with (out_dir / "papers.json").open("w", encoding="utf-8") as f:
        json.dump({"papers": payload["papers"]}, f, ensure_ascii=False, indent=2)

    questions_by_num = {}
    for paper in payload["papers"]:
        for q in paper.get("questions", []):
            pass

    samples = []
    all_q = []
    for paper in payload["papers"]:
        for idx, q in enumerate(paper.get("questions", []), start=1):
            all_q.append((idx, q))

    log = [
        f"pdf={pdf_name}",
        f"parsed={parsed}",
        f"missing={missing}",
        f"papers={len(payload['papers'])}",
        *log_notes,
        "",
    ]
    (out_dir / "parse-log.txt").write_text("\n".join(log), encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": parsed >= min_parsed,
                "parsed": parsed,
                "missing": missing,
                "papers": len(payload["papers"]),
            },
            ensure_ascii=True,
        )
    )
    return 0 if parsed >= min_parsed else 1
