ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS premium_lifetime BOOLEAN NOT NULL DEFAULT FALSE;

-- Premium is a one-time unlock. Existing paid Premium records retain the same entitlement.
UPDATE student_profiles profile
SET premium_lifetime = TRUE,
    premium_until = NULL
WHERE EXISTS (
  SELECT 1
  FROM payments payment
  WHERE payment.user_id = profile.user_id
    AND payment.payment_type = 'premium'
    AND payment.status = 'paid'
);
