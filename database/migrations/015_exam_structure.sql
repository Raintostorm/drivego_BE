-- Phase 1: Per-class exam assembly quotas (VB 2262/CSGT-P5, mục II)
-- slot_type: chương I..VI, hoặc 'CRITICAL' (câu điểm liệt). Idempotent.
-- Run: npm run migrate:exam-structure

CREATE TABLE IF NOT EXISTS license_exam_structure (
  license_class VARCHAR(16) NOT NULL,
  slot_type VARCHAR(8) NOT NULL,          -- I, II, III, IV, V, VI, CRITICAL
  quota INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (license_class, slot_type)
);

-- A1, A2 — 25 câu (xe máy; pool 250 không có chương IV → kỹ thuật/cấu tạo gộp vào III)
-- B1, B2 — 30 câu (ô tô)
INSERT INTO license_exam_structure (license_class, slot_type, quota, sort_order) VALUES
  ('A1','CRITICAL',1,0),('A1','I',8,1),('A1','II',1,2),('A1','III',1,3),('A1','IV',0,4),('A1','V',8,5),('A1','VI',6,6),
  ('A2','CRITICAL',1,0),('A2','I',8,1),('A2','II',1,2),('A2','III',1,3),('A2','IV',0,4),('A2','V',8,5),('A2','VI',6,6),
  ('B1','CRITICAL',1,0),('B1','I',8,1),('B1','II',1,2),('B1','III',1,3),('B1','IV',1,4),('B1','V',9,5),('B1','VI',9,6),
  ('B2','CRITICAL',1,0),('B2','I',8,1),('B2','II',1,2),('B2','III',1,3),('B2','IV',1,4),('B2','V',9,5),('B2','VI',9,6)
ON CONFLICT (license_class, slot_type) DO UPDATE SET
  quota = EXCLUDED.quota,
  sort_order = EXCLUDED.sort_order;
