-- DriveGo schema placeholder (PostgreSQL)
-- Generated from docs/domain-from-ui.md — run after DATABASE_URL is configured.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('student', 'center_admin', 'system_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tax_code VARCHAR(64),
  city VARCHAR(128),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  phone VARCHAR(32),
  license_class VARCHAR(16),
  center_id UUID REFERENCES training_centers(id),
  premium_until TIMESTAMPTZ,
  held_licenses JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS license_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(16) NOT NULL UNIQUE,
  price NUMERIC(12, 2),
  enrollment_fee NUMERIC(12, 2) DEFAULT 755000,
  description TEXT,
  questions_per_exam INT NOT NULL DEFAULT 30,
  exam_duration_minutes INT NOT NULL DEFAULT 22,
  pass_min_correct INT NOT NULL DEFAULT 26,
  bank_question_count INT NOT NULL DEFAULT 600,
  papers_count INT NOT NULL DEFAULT 20
);

CREATE TABLE IF NOT EXISTS study_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_class_id UUID REFERENCES license_classes(id),
  title VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  duration_minutes INT,
  video_url TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS study_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES study_chapters(id) ON DELETE CASCADE,
  completed_lessons INT NOT NULL DEFAULT 0,
  percent INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, chapter_id)
);

CREATE TABLE IF NOT EXISTS exam_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_class VARCHAR(16) NOT NULL,
  paper_number INT NOT NULL,
  question_count INT NOT NULL,
  is_mock BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES exam_papers(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  answers JSONB NOT NULL,
  correct_index INT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES exam_papers(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  score INT,
  passed BOOLEAN,
  answers JSONB
);

CREATE TABLE IF NOT EXISTS schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID REFERENCES training_centers(id),
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue VARCHAR(255),
  license_class VARCHAR(16),
  capacity INT NOT NULL DEFAULT 0,
  registered_count INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exam_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES schedule_slots(id),
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS document_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  category VARCHAR(64),
  license_class VARCHAR(16),
  pdf_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL UNIQUE,
  price_monthly NUMERIC(12, 2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  amount NUMERIC(12, 2) NOT NULL,
  method VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  customer_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS license_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_class VARCHAR(16) NOT NULL DEFAULT 'B2',
  center_id UUID REFERENCES training_centers(id),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  personal_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES license_applications(id) ON DELETE CASCADE,
  doc_type VARCHAR(32) NOT NULL,
  slot_index INT NOT NULL DEFAULT 0,
  file_path TEXT NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(128),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(application_id, doc_type, slot_index)
);

CREATE TABLE IF NOT EXISTS lookup_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  national_id_or_code VARCHAR(64) NOT NULL,
  student_name VARCHAR(255),
  license_class VARCHAR(16),
  result_status VARCHAR(64),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_content (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
