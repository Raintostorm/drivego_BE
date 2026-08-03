const NEW_CLASS_ALIASES: Record<string, string> = { A2: "A", B2: "B" }
const INTERNAL_CLASS_ALIASES: Record<string, string> = { A: "A2", B: "B2" }

export function displayLicenseClass(code?: string | null) {
  const value = String(code ?? "").toUpperCase()
  return NEW_CLASS_ALIASES[value] ?? value
}

export function internalLicenseClass(code?: string | null) {
  const value = String(code ?? "").toUpperCase()
  return INTERNAL_CLASS_ALIASES[value] ?? value
}

export function classHasNoExpiry(code: string) {
  return ["A1", "A", "B1"].includes(displayLicenseClass(code))
}
