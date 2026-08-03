/**
 * Chuẩn hóa URL YouTube sang embed (youtube-nocookie) để giảm lỗi unavailable.
 * @param {string | null | undefined} url
 */
export function toYoutubeEmbedUrl(url) {
  if (!url) return null
  let id = null
  try {
    if (url.includes("youtu.be/")) {
      id = url.split("youtu.be/")[1]?.split(/[?&]/)[0]
    } else if (url.includes("/embed/")) {
      id = url.split("/embed/")[1]?.split(/[?&]/)[0]
    } else if (url.includes("v=")) {
      const u = new URL(url)
      id = u.searchParams.get("v")
    }
  } catch {
    id = null
  }
  if (!id) return url
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "http://localhost:5173")}`
}

/** @param {string | null | undefined} url */
export function toYoutubeWatchUrl(url) {
  if (!url) return null
  const embed = toYoutubeEmbedUrl(url)
  if (!embed) return url
  const id = embed.split("/embed/")[1]?.split("?")[0]
  return id ? `https://www.youtube.com/watch?v=${id}` : url
}
