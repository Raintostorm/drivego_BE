-- Phase 1: Single 600-question bank + per-class pools (VB 2262/CSGT-P5)
-- Idempotent. Run: npm run migrate:bank

-- Canonical question bank (one row per official câu number)
CREATE TABLE IF NOT EXISTS bank_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_number INT NOT NULL UNIQUE,
  category VARCHAR(4) NOT NULL,            -- I, II, III, IV, V, VI
  body TEXT NOT NULL,
  image_url TEXT,
  answers JSONB NOT NULL,
  correct_index INT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_bank_questions_category ON bank_questions (category);
CREATE INDEX IF NOT EXISTS idx_bank_questions_critical ON bank_questions (is_critical);

-- Which bank numbers each license class may draw from (250 / 300 / 600 subsets)
CREATE TABLE IF NOT EXISTS license_question_pool (
  license_class VARCHAR(16) NOT NULL,
  bank_number INT NOT NULL,
  PRIMARY KEY (license_class, bank_number)
);

CREATE INDEX IF NOT EXISTS idx_pool_class ON license_question_pool (license_class);

-- Mark generated (random) exam papers so they can be cleaned up after submission.
ALTER TABLE exam_papers
  ADD COLUMN IF NOT EXISTS is_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
