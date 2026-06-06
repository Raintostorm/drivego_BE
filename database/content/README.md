# Nạp nội dung theo hạng GPLX

Mỗi hạng một folder dưới `database/content/`. Quy tắc thi (số câu/đề, thời gian, điểm đạt) nằm trong bảng `license_classes` — migration `012_exam_rules.sql`.

| Hạng | Ngân hàng | Đề thi | Câu/đề | Đạt | Thời gian |
|------|-----------|--------|--------|-----|-----------|
| A1, A2 | 250 câu (xe máy) | 10 đề | 25 | 21/25 | 19 phút |
| B1, B2 | 600 câu (ô tô) | 20 đề | 30 | 26/30 | 22 phút |

Điều kiện đạt: sai tối đa 4 câu và không sai bất kỳ câu điểm liệt nào.

A1 và A2 dùng **cùng** bộ 250 câu; A2 clone từ A1 khi bootstrap (ảnh `/content/A2/images/`).

## Luồng đầy đủ

```bash
pip install -r database/scripts/requirements-pdf.txt

# PDF 600 câu (B*.pdf) ở thư mục gốc repo
npm run parse:b2-pdf

# PDF 250 câu (*250*.pdf hoặc *A1*.pdf) ở thư mục gốc repo
npm run parse:motor-pdf

npm run seed:db
npm run bootstrap:content
npm run normalize:content
npm run migrate:exam-rules
npm run import:content:all
```

Hoặc: `npm run reset:db` (truncate + migrations + seed + import).

## `papers.json`

- **A1:** từ `parse:motor-pdf` — không bootstrap ghi đè.
- **A2:** bootstrap clone từ A1 (đổi ID + path ảnh).
- **B2:** từ `parse:b2-pdf` + bootstrap gán stable IDs.
- **B1:** bootstrap clone đề từ B2 (30 câu/đề).

Import **validate** số câu/đề theo `license_classes.questions_per_exam`.
`normalize:content` gom ngân hàng câu hỏi, phân phối lại 5 câu điểm liệt/đề và hạn chế trùng nguyên đề.

## Parse PDF

| Lệnh | Output |
|------|--------|
| `npm run parse:b2-pdf` | `database/content/B2/`, ảnh `/content/B2/images/` |
| `npm run parse:motor-pdf` | `database/content/A1/`, ảnh `/content/A1/images/` |

Log parse: `database/content/B2/parse-log.txt`, `database/content/A1/parse-log.txt`.

## Import từng hạng

```bash
npm run import:content -- A1 database/content/A1
npm run import:content -- B2 database/content/B2
```

Import xóa đề/câu hỏi cũ **cùng hạng** rồi nạp lại.

## Env (backend, tùy chọn)

Ghi đè quy tắc thi: `EXAM_PASS_MIN_A1`, `EXAM_DURATION_MINUTES_B2`, `FREE_EXAM_ATTEMPT_LIMIT` — xem `backend/.env.example`.
