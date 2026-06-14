import json
import re
import shutil
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]
DOCX_PATH = ROOT / "in Bộ 250 câu hỏi dành cho sát hạch lái xe moto Hang A1,A.docx"

CLASS_META = {
    "A1": {
        "paper_prefix": "55555555-5555-4555-8501",
        "image_url_prefix": "/content/A1/images",
    },
    "A2": {
        "paper_prefix": "55555555-5555-4555-8502",
        "image_url_prefix": "/content/A2/images",
    },
}

PAPER_COUNT = 10
QUOTAS = {
    "general": 8,
    "critical": 1,
    "culture": 1,
    "technique": 1,
    "signs": 8,
    "scenario": 6,
}

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


@dataclass
class Event:
    text: str = ""
    underlined: bool = False
    images: list[str] = field(default_factory=list)
    is_heading: bool = False


@dataclass
class Answer:
    text: str
    underlined: bool


@dataclass
class Question:
    source_number: int
    body: str
    chapter: str
    order_index: int
    answers: list[Answer] = field(default_factory=list)
    images: list[str] = field(default_factory=list)


def text_of(node: ET.Element) -> str:
    return "".join(t.text or "" for t in node.findall(".//w:t", NS))


def is_underlined_run(run: ET.Element) -> bool:
    underline = run.find("./w:rPr/w:u", NS)
    if underline is None:
        return False
    value = underline.attrib.get(f"{{{NS['w']}}}val")
    return value not in {"none", "0", "false"}


def paragraph_events(paragraph: ET.Element) -> list[Event]:
    runs = paragraph.findall("./w:r", NS)
    lines: list[dict] = [{"parts": [], "underline_chars": 0, "total_chars": 0, "images": []}]

    def current() -> dict:
        return lines[-1]

    def new_line() -> None:
        if current()["parts"] or current()["images"]:
            lines.append({"parts": [], "underline_chars": 0, "total_chars": 0, "images": []})

    for run in runs:
        run_underlined = is_underlined_run(run)
        for child in list(run):
            tag = child.tag.rsplit("}", 1)[-1]
            if tag == "t":
                run_text = child.text or ""
                if run_text:
                    current()["parts"].append(run_text)
                    current()["total_chars"] += len(run_text.strip())
                    if run_underlined:
                        current()["underline_chars"] += len(run_text.strip())
            elif tag == "br":
                new_line()
        for blip in run.findall(".//a:blip", NS):
            embed = blip.attrib.get(f"{{{NS['r']}}}embed")
            if embed:
                current()["images"].append(embed)

    style = paragraph.find("./w:pPr/w:pStyle", NS)
    style_value = style.attrib.get(f"{{{NS['w']}}}val", "") if style is not None else ""
    events: list[Event] = []
    for line in lines:
        text = normalize_text("".join(line["parts"]))
        is_heading = style_value.lower().startswith("heading") or text.upper().startswith("CHƯƠNG ")
        total_chars = line["total_chars"]
        underlined = total_chars > 0 and line["underline_chars"] / total_chars >= 0.55
        if text or line["images"]:
            events.append(Event(text=text, underlined=underlined, images=line["images"], is_heading=is_heading))
    return events


def normalize_text(value: str) -> str:
    text = value.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    return text.strip()


def split_question_markers(event: Event) -> Iterable[Event]:
    if not event.text:
        yield event
        return

    matches = list(re.finditer(r"Câu\s+\d+[\.:]", event.text))
    if len(matches) <= 1 and (not matches or matches[0].start() == 0):
        yield event
        return

    cursor = 0
    images_pending = list(event.images)
    for index, match in enumerate(matches):
        if match.start() > cursor:
            before = event.text[cursor:match.start()].strip()
            if before:
                yield Event(text=before, underlined=event.underlined, is_heading=event.is_heading)
        next_start = matches[index + 1].start() if index + 1 < len(matches) else len(event.text)
        segment = event.text[match.start():next_start].strip()
        yield Event(
            text=segment,
            underlined=False,
            images=images_pending if index == len(matches) - 1 else [],
            is_heading=False,
        )
        images_pending = []
        cursor = next_start


def read_relationships(docx: zipfile.ZipFile) -> dict[str, str]:
    rels_xml = docx.read("word/_rels/document.xml.rels")
    root = ET.fromstring(rels_xml)
    rels: dict[str, str] = {}
    for rel in root.findall("./rel:Relationship", NS):
        rid = rel.attrib.get("Id")
        target = rel.attrib.get("Target", "")
        if rid and target.startswith("media/"):
            rels[rid] = f"word/{target}"
    return rels


def read_docx_events(path: Path) -> tuple[list[Event], dict[str, dict]]:
    if not path.exists():
        raise FileNotFoundError(f"Missing DOCX source: {path}")

    with zipfile.ZipFile(path) as docx:
        rels = read_relationships(docx)
        media = {
            rid: {"bytes": docx.read(target), "extension": Path(target).suffix.lower() or ".bin"}
            for rid, target in rels.items()
        }
        doc_xml = docx.read("word/document.xml")

    root = ET.fromstring(doc_xml)
    events: list[Event] = []
    for paragraph in root.findall(".//w:body/w:p", NS):
        for event in paragraph_events(paragraph):
            if not event.text and not event.images:
                continue
            events.extend(split_question_markers(event))
    return events, media


def is_noise(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True
    if re.fullmatch(r"\d+", stripped):
        return True
    if stripped.startswith("BỘ 250 CÂU HỎI"):
        return True
    if stripped.startswith("Tài liệu được cung cấp"):
        return True
    return False


def should_merge_answer(previous: str, current: str) -> bool:
    if not previous:
        return False
    if len(current) <= 3:
        return True
    if current[0].islower():
        return True
    if re.search(r"(đường b|phương tiện giao thông đường b|người lái x)$", previous, re.I):
        return True
    return not re.search(r"[.!?…]([\"”])?$", previous)


def parse_questions(events: list[Event]) -> list[Question]:
    questions: list[Question] = []
    current: Question | None = None
    chapter = ""

    def finish_current():
        if current is not None:
            current.body = normalize_text(current.body)
            questions.append(current)

    for event in events:
        text = event.text
        if event.is_heading and text.upper().startswith("CHƯƠNG "):
            chapter = text
            continue

        marker = re.match(r"^Câu\s+(\d+)[\.:]\s*(.*)$", text)
        if marker:
            finish_current()
            current = Question(
                source_number=int(marker.group(1)),
                body=marker.group(2).strip(),
                chapter=chapter,
                order_index=len(questions) + 1,
                images=list(event.images),
            )
            continue

        if current is None:
            continue

        if event.images:
            current.images.extend(event.images)

        if is_noise(text):
            continue

        if current.answers and should_merge_answer(current.answers[-1].text, text):
            current.answers[-1].text = normalize_text(f"{current.answers[-1].text} {text}")
            current.answers[-1].underlined = current.answers[-1].underlined or event.underlined
        else:
            current.answers.append(Answer(text=normalize_text(text), underlined=event.underlined))

    finish_current()
    return questions


def category_for(question: Question) -> str:
    chapter_upper = question.chapter.upper()
    body_upper = question.body.upper()

    if question.order_index <= 25:
        return "critical"
    if "VĂN HÓA" in chapter_upper:
        return "culture"
    if "GIẢI THẾ" in chapter_upper or question.source_number >= 486:
        return "scenario"
    if "QUY ĐỊNH CHUNG" in chapter_upper:
        return "general"
    if re.search(r"\b(BIỂN|VẠCH)\b|BÁO HIỆU|BIỂN BÁO|VẠCH KẺ", body_upper) or question.source_number >= 300:
        return "signs"
    if "KỸ THUẬT" in chapter_upper:
        return "technique"
    return "general"


def paper_id(prefix: str, paper_number: int) -> str:
    return f"{prefix}-{paper_number:012d}01"


def stable_hash(value: str) -> int:
    state = 2166136261
    for ch in value:
        state ^= ord(ch)
        state = (state * 16777619) & 0xFFFFFFFF
    return state or 1


def seeded_shuffle(items: list, seed: str) -> list:
    result = list(items)
    state = stable_hash(seed)
    for i in range(len(result) - 1, 0, -1):
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        j = state % (i + 1)
        result[i], result[j] = result[j], result[i]
    return result


def pick_cycled(pool: list[Question], count: int, start: int) -> list[Question]:
    if not pool:
        raise ValueError("Cannot build paper from an empty pool")
    return [pool[(start + i) % len(pool)] for i in range(count)]


def answer_payload(question: Question) -> tuple[list[str], int]:
    answers = [answer for answer in question.answers if answer.text]
    correct_indexes = [i for i, answer in enumerate(answers) if answer.underlined]
    fallback_correct = {
        125: 0,
    }
    if not correct_indexes:
        if question.source_number not in fallback_correct:
            raise ValueError(f"Question {question.source_number} has no underlined answer")
        correct_indexes = [fallback_correct[question.source_number]]
    correct_index = correct_indexes[0]
    answer_texts = [answer.text for answer in answers]
    while len(answer_texts) < 4:
        answer_texts.append("—")
    return answer_texts[:4], min(correct_index, 3)


def copy_images_for_class(
    code: str,
    questions: list[Question],
    media: dict[str, dict],
) -> dict[tuple[int, str], str]:
    image_map: dict[tuple[int, str], str] = {}
    class_dir = ROOT / "database" / "content" / code / "images"
    public_dir = ROOT / "frontend" / "public" / "content" / code / "images"
    for directory in (class_dir, public_dir):
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir(parents=True, exist_ok=True)

    for question in questions:
        if not question.images:
            continue
        rid = question.images[0]
        item = media.get(rid)
        if item is None:
            continue
        content = item["bytes"]
        ext = item["extension"]
        name = f"cau-{question.source_number}{ext}"
        for directory in (class_dir, public_dir):
            (directory / name).write_bytes(content)
        image_map[(question.source_number, rid)] = f"{CLASS_META[code]['image_url_prefix']}/{name}"
    return image_map


def build_papers(code: str, questions: list[Question], media: dict[str, dict]) -> dict:
    image_map = copy_images_for_class(code, questions, media)
    pools: dict[str, list[Question]] = {name: [] for name in QUOTAS}
    for question in questions:
        pools[category_for(question)].append(question)

    shuffled = {
        name: seeded_shuffle(pool, f"{code}:{name}")
        for name, pool in pools.items()
    }

    papers = []
    for paper_index in range(PAPER_COUNT):
        selected: list[Question] = []
        for category, count in QUOTAS.items():
            start = paper_index * count
            selected.extend(pick_cycled(shuffled[category], count, start))
        selected = seeded_shuffle(selected, f"{code}:paper:{paper_index + 1}")

        payload_questions = []
        for question in selected:
            answers, correct_index = answer_payload(question)
            image_url = None
            if question.images:
                image_url = image_map.get((question.source_number, question.images[0]))
            category = category_for(question)
            payload_questions.append(
                {
                    "sourceNumber": question.source_number,
                    "category": category,
                    "body": question.body,
                    "answers": answers,
                    "correctIndex": correct_index,
                    "isCritical": category == "critical",
                    "imageUrl": image_url,
                }
            )

        papers.append(
            {
                "id": paper_id(CLASS_META[code]["paper_prefix"], paper_index + 1),
                "paperNumber": paper_index + 1,
                "questionCount": len(payload_questions),
                "isMock": True,
                "distribution": dict(QUOTAS),
                "questions": payload_questions,
            }
        )
    return {"papers": papers}


def validate_outputs(data_by_code: dict[str, dict]) -> None:
    bad_font = re.compile(r"phưGng|thô ng|Câu\d|Tổchức|độtối|thứtự|cảngười")
    for code, data in data_by_code.items():
        signatures = set()
        for paper in data["papers"]:
            questions = paper["questions"]
            if len(questions) != sum(QUOTAS.values()):
                raise ValueError(f"{code} paper {paper['paperNumber']} has {len(questions)} questions")
            counts = {name: 0 for name in QUOTAS}
            for question in questions:
                counts[question["category"]] += 1
                if bad_font.search(question["body"]):
                    raise ValueError(f"{code} paper {paper['paperNumber']} bad text: {question['body']}")
                for answer in question["answers"]:
                    if bad_font.search(answer):
                        raise ValueError(f"{code} paper {paper['paperNumber']} bad answer: {answer}")
                if not 0 <= question["correctIndex"] < len(question["answers"]):
                    raise ValueError(f"{code} paper {paper['paperNumber']} bad correctIndex")
            if counts != QUOTAS:
                raise ValueError(f"{code} paper {paper['paperNumber']} wrong distribution: {counts}")
            signature = tuple(sorted(q["sourceNumber"] for q in questions))
            if signature in signatures:
                raise ValueError(f"{code} duplicate paper signature: {paper['paperNumber']}")
            signatures.add(signature)


def write_outputs(data_by_code: dict[str, dict]) -> None:
    for code, data in data_by_code.items():
        output_path = ROOT / "database" / "content" / code / "papers.json"
        output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    events, media = read_docx_events(DOCX_PATH)
    questions = parse_questions(events)
    if len(questions) < 240:
        raise ValueError(f"Only parsed {len(questions)} questions from DOCX")

    data_by_code = {
        code: build_papers(code, questions, media)
        for code in CLASS_META
    }
    validate_outputs(data_by_code)
    write_outputs(data_by_code)

    category_counts: dict[str, int] = {name: 0 for name in QUOTAS}
    with_images = 0
    for question in questions:
        category_counts[category_for(question)] += 1
        if question.images:
            with_images += 1

    print(f"Parsed DOCX questions: {len(questions)}")
    print(f"Embedded media files: {len(media)}")
    print(f"Questions with images: {with_images}")
    print(f"Category pools: {category_counts}")
    for code, data in data_by_code.items():
        print(f"{code}: wrote {len(data['papers'])} papers x {sum(QUOTAS.values())} questions")


if __name__ == "__main__":
    main()
