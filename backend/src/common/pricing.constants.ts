import { DEFAULT_LICENSE_CLASS, type StudyLicenseCode } from "./license-class.constants"

const DEFAULT_ENROLLMENT_FEES: Record<StudyLicenseCode, number> = {
  A1: 900000,
  A2: 1900000,
  B1: 25000000,
  B2: 25000000,
}

export const DEFAULT_PREMIUM_PRICE = numberFromEnv("DRIVEGO_PREMIUM_PRICE", 99000)

export const FALLBACK_ENROLLMENT_FEES: Record<StudyLicenseCode, number> = {
  A1: numberFromEnv("DRIVEGO_PRICE_A1", DEFAULT_ENROLLMENT_FEES.A1),
  A2: numberFromEnv("DRIVEGO_PRICE_A2", DEFAULT_ENROLLMENT_FEES.A2),
  B1: numberFromEnv("DRIVEGO_PRICE_B1", DEFAULT_ENROLLMENT_FEES.B1),
  B2: numberFromEnv("DRIVEGO_PRICE_B2", DEFAULT_ENROLLMENT_FEES.B2),
}

export function fallbackEnrollmentFee(code: string) {
  return (
    FALLBACK_ENROLLMENT_FEES[code as StudyLicenseCode] ??
    FALLBACK_ENROLLMENT_FEES[DEFAULT_LICENSE_CLASS]
  )
}

function numberFromEnv(name: string, fallback: number) {
  const value = process.env[name]
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}
