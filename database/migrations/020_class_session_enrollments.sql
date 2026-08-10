ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(16) NOT NULL DEFAULT 'in_person',
  ADD COLUMN IF NOT EXISTS online_url TEXT,
  ADD COLUMN IF NOT EXISTS instructor_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'scheduled';

UPDATE class_sessions
SET session_type = 'simulation'
WHERE session_type = 'simulator';

ALTER TABLE class_sessions
  DROP CONSTRAINT IF EXISTS chk_class_sessions_delivery_mode;
ALTER TABLE class_sessions
  ADD CONSTRAINT chk_class_sessions_delivery_mode
  CHECK (delivery_mode IN ('in_person', 'online', 'hybrid'));

ALTER TABLE class_sessions
  DROP CONSTRAINT IF EXISTS chk_class_sessions_status;
ALTER TABLE class_sessions
  ADD CONSTRAINT chk_class_sessions_status
  CHECK (status IN ('scheduled', 'cancelled', 'completed'));

CREATE TABLE IF NOT EXISTS class_session_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'scheduled',
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, user_id),
  CONSTRAINT chk_class_session_enrollment_status
    CHECK (status IN ('scheduled', 'attended', 'cancelled', 'absent'))
);

CREATE INDEX IF NOT EXISTS idx_class_session_enrollments_session
  ON class_session_enrollments(session_id, status);
CREATE INDEX IF NOT EXISTS idx_class_session_enrollments_user
  ON class_session_enrollments(user_id, status);

INSERT INTO class_session_enrollments (session_id, user_id, status, assigned_at)
SELECT session_id, user_id, 'attended', checked_in_at
FROM session_attendance
ON CONFLICT (session_id, user_id) DO UPDATE SET status = 'attended';

INSERT INTO class_session_enrollments (session_id, user_id, status)
SELECT s.id, candidate.user_id, 'scheduled'
FROM class_sessions s
JOIN LATERAL (
  SELECT ce.user_id
  FROM course_enrollments ce
  JOIN student_profiles p ON p.user_id = ce.user_id
  WHERE ce.status = 'active'
    AND p.center_id = s.center_id
    AND (s.license_class IS NULL OR ce.license_class = s.license_class)
  ORDER BY ce.enrolled_at ASC
  LIMIT s.max_capacity
) candidate ON TRUE
WHERE s.session_date >= CURRENT_DATE
  AND s.status = 'scheduled'
ON CONFLICT (session_id, user_id) DO NOTHING;
