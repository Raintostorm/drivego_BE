CREATE TABLE IF NOT EXISTS student_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  center_id uuid REFERENCES training_centers(id) ON DELETE SET NULL,
  license_number varchar(64),
  license_class varchar(16) NOT NULL,
  legacy_class_code varchar(16),
  regulation_version varchar(32) NOT NULL DEFAULT 'from_2025',
  issued_at date,
  expires_at date,
  issuing_authority varchar(255),
  verification_status varchar(32) NOT NULL DEFAULT 'unverified',
  verification_source varchar(32) NOT NULL DEFAULT 'manual',
  source_document_id uuid REFERENCES application_documents(id) ON DELETE SET NULL,
  admin_note text,
  last_notified_stage varchar(32),
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_licenses_class_check CHECK (license_class IN ('A1', 'A', 'A2', 'B1', 'B', 'B2', 'C', 'D', 'E', 'F')),
  CONSTRAINT student_licenses_verification_check CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_student_licenses_user_id ON student_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_student_licenses_center_expiry ON student_licenses(center_id, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_licenses_number
  ON student_licenses(license_number)
  WHERE license_number IS NOT NULL AND license_number <> '';

-- Preserve existing real profile data as reviewable records. Dates remain unknown
-- until the student or center reads them from the physical license.
INSERT INTO student_licenses (
  user_id, center_id, license_class, legacy_class_code,
  regulation_version, verification_status, verification_source
)
SELECT
  p.user_id,
  p.center_id,
  CASE value
    WHEN 'A2' THEN 'A'
    WHEN 'B2' THEN 'B'
    ELSE value
  END,
  CASE WHEN value IN ('A2', 'B2') THEN value ELSE NULL END,
  'legacy',
  'unverified',
  'profile_import'
FROM student_profiles p
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(p.held_licenses, '[]'::jsonb)) AS held(value)
WHERE value IN ('A1', 'A', 'A2', 'B1', 'B', 'B2', 'C', 'D', 'E', 'F')
  AND NOT EXISTS (
    SELECT 1 FROM student_licenses l
    WHERE l.user_id = p.user_id
      AND l.license_class = CASE value WHEN 'A2' THEN 'A' WHEN 'B2' THEN 'B' ELSE value END
  );
