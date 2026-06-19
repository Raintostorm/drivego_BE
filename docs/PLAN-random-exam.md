# Kế hoạch: Bốc đề ngẫu nhiên theo luật (VB 2262/CSGT-P5)

> Trạng thái: ĐANG THỰC HIỆN — Phase 0
> Nguồn luật: Công văn 2262/CSGT-P5 ngày 07/5/2025, áp dụng từ 01/6/2025.

## Quyết định đã chốt

1. **Đề cố định**: giữ song song, mặc định là bốc ngẫu nhiên.
2. **Quota bốc đề**: lưu trong DB (`license_exam_structure`), admin sửa được.
3. Lưu kế hoạch ra file, thực hiện tuần tự Phase 0 → 4.

## Nguyên tắc

1. Một ngân hàng **600 câu** duy nhất; mỗi câu có: `bank_number` (1–600), `category` (I–VI), `is_critical` (theo Phụ lục 3).
2. **250 (A1/A2) và 300 (B1) là tập con** trỏ vào cùng bank — không nhân bản dữ liệu.
3. Không phá đề cố định đang chạy; thêm chế độ random song song (tương thích ngược).
4. Danh sách số câu của Phụ lục 1/2/3 **trích từ PDF chính thức**, không gõ tay từ ảnh OCR.

## Bố cục 600 câu (theo dải số)

| Chương | Dải số | Số câu | Nội dung |
|---|---|--:|---|
| I | 1–180 | 180 | Quy định chung & quy tắc giao thông |
| II | 181–205 | 25 | Văn hóa, đạo đức, PCCC, cứu hộ |
| III | 206–263 | 58 | Kỹ thuật lái xe |
| IV | 264–300 | 37 | Cấu tạo & sửa chữa |
| V | 301–485 | 185 | Báo hiệu đường bộ |
| VI | 486–600 | 115 | Sa hình & xử lý tình huống |

60 câu điểm liệt = tập con rải khắp bank (Phụ lục 3).

## Luật bốc đề (quota theo chương)

| Hạng | Pool | Câu/đề | I | Điểm liệt | II | III | IV | V | VI |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| A1, A2 | 250 | 25 | 8 | 1 | 1 | 1 (III) | — | 8 | 6 |
| B1 | 300 | 30 | 8 | 1 | 1 | 1 | 1 | 9 | 9 |
| B2 | 600 | 30 | 8 | 1 | 1 | 1 | 1 | 9 | 9 |

Điểm liệt = 1 slot bốc từ tập `is_critical`; slot chương bốc từ tập **không** điểm liệt → không trùng.

## Các giai đoạn

### Phase 0 — Trích dữ liệu chuẩn từ PDF (cổng chặn) ✅
- [x] `build-bank.py` → `bank.json`: 599 câu (thiếu Câu 507), `number`/`category`/`isCritical`. Chương = 180/25/58/37/185/114 ✓.
- [x] Pool A1/A2 trích từ docx 250 (249/250 — thiếu 1 câu ch.VI do parse). Pool B2 = full 599. Pool B1 = full 599 (tạm).
- [x] `appendices.json`: 59/60 điểm liệt (thiếu 1 do OCR ảnh) — **cần đối chiếu công văn gốc bổ sung 1 số**. b1Pool300 để rỗng.
- [ ] CHỜ user: bổ sung số điểm liệt thứ 60 (+ Phụ lục 2 nếu muốn B1=300).

### Phase 1 — Schema & seed bank ✅
- [x] Migration `014_question_bank.sql`: `bank_questions` + `license_question_pool` + `exam_papers.is_generated`.
- [x] Migration `015_exam_structure.sql`: `license_exam_structure` (quota theo chương/hạng, seed A1/A2/B1/B2).
- [x] Script `seed-bank.mjs`: nạp bank.json + pools.json (skip Câu 507 vắng).
- [x] Entities + npm scripts (`migrate:bank`, `migrate:exam-structure`, `build:bank`, `seed:bank`).

### Phase 2 — Backend dịch vụ bốc đề ✅
- [x] `ExamAssemblyService.generate(licenseClass)` → ghi `exam_papers`(is_generated) + `questions`.
- [x] `POST /exams/random?licenseClass=...` (ExamsService.generateRandomPaper + enrollment check).
- [x] Dọn rác sau khi nộp (xoá questions của đề sinh, giữ stub paper cho lịch sử).
- [x] Title "Đề thi ngẫu nhiên" ở getPaper + lịch sử. Backend typecheck PASS.

### Phase 3 — Frontend ✅
- [x] `ExamPage.jsx`: nút "🎲 Tạo đề ngẫu nhiên" mặc định + dropdown đề cố định (tùy chọn). Build PASS.

### Verify ✅
- [x] `verify-assembly.mjs` (2000 lượt/hạng): đủ 25/30 câu, đúng 1 điểm liệt, không trùng, phủ toàn pool. PASS.

### Phase 4 — Dọn phần thừa (CHƯA làm — chờ random chạy ổn trên DB)
- [ ] Bỏ clone A2←A1, B1←B2; bỏ parser xe máy thứ 2; xoá `_probe_*.py`; gitignore `__pycache__`.
- [ ] Cập nhật README + database/content/README.md.

## Triển khai (user chạy trên DB)
```bash
npm run build:bank            # tạo bank.json + pools.json từ PDF (đã chạy)
npm run migrate:bank          # tạo bảng bank_questions, license_question_pool
npm run migrate:exam-structure
npm run seed:bank             # nạp 599 câu + pools
# restart backend để nạp entity mới
```

## Còn lại / Rủi ro
- ⚠️ `appendices.json`: chỉ 59/60 điểm liệt (ảnh OCR lặp số 74). **Bổ sung 1 số từ công văn gốc**, chạy lại `build:bank` + `seed:bank`.
- Pool B1 đang = full 600 (chưa có Phụ lục 2). Đổi sang 300 sau nếu cần.
- Pool A1/A2 = 249/250 (parse docx sót 1 câu ch.VI). Nhỏ, có thể bỏ qua hoặc bổ sung thủ công.
- Bank thiếu Câu 507 (PDF gốc nhảy số 506→508) → bank 599, chương VI=114.
