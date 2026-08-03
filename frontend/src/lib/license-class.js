export function displayLicenseClass(code) {
  const value = String(code ?? "").toUpperCase()
  if (value === "A2") return "A"
  if (value === "B2") return "B"
  return value
}

export function legacyLicenseLabel(code) {
  const value = String(code ?? "").toUpperCase()
  if (value === "A2") return "A (mã cũ A2)"
  if (value === "B2") return "B (mã cũ B2)"
  return value
}

export const CURRENT_LICENSE_OPTIONS = ["A1", "A", "B1", "B"]

