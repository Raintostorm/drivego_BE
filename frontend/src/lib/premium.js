export function isLifetimePremium(user) {
  return Boolean(user?.profile?.premiumLifetime)
}

export function isPremiumActive(user) {
  if (isLifetimePremium(user)) return true
  const until = user?.profile?.premiumUntil
  if (!until) return false
  return new Date(until) > new Date()
}

export function formatPremiumUntil(iso) {
  if (!iso) return ""
  return new Date(iso).toLocaleString("vi-VN")
}

/** Ngày hết hạn (không giờ) — hiển thị UI gọn */
export function formatPremiumDate(iso) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function premiumDaysRemaining(user) {
  if (isLifetimePremium(user)) return null
  const until = user?.profile?.premiumUntil
  if (!until) return null
  const ms = new Date(until).getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}
