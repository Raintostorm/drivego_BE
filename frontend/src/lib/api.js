const TOKEN_KEY = "drivego_access_token"

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function formatApiError(data, fallback) {
  if (!data?.message) return fallback
  if (Array.isArray(data.message)) return data.message.join(", ")
  return String(data.message)
}

function resolveApiBaseUrl() {
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    throw new Error("Thiếu VITE_API_URL — chạy `npm run setup:env` hoặc tạo frontend/.env")
  }
  return url.replace(/\/$/, "")
}

export const apiBaseUrl = resolveApiBaseUrl()

/**
 * @param {string} path
 * @param {RequestInit & { auth?: boolean }} [options]
 */
export async function apiFetch(path, options = {}) {
  const { auth = false, headers: extraHeaders, ...rest } = options
  const url = `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`
  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  }

  const token = getAuthToken()
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, { ...rest, headers })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(formatApiError(data, response.statusText || "Yêu cầu thất bại"))
  }

  return data
}

/**
 * Multipart upload (no Content-Type — browser sets boundary).
 * @param {string} path
 * @param {FormData} formData
 * @param {RequestInit & { auth?: boolean }} [options]
 */
export async function apiUpload(path, formData, options = {}) {
  const { auth = true, headers: extraHeaders, ...rest } = options
  const url = `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`
  const headers = { ...extraHeaders }

  const token = getAuthToken()
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, { method: "POST", ...rest, headers, body: formData })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(formatApiError(data, response.statusText || "Tải lên thất bại"))
  }

  return data
}

/**
 * @param {string} path
 * @param {RequestInit & { auth?: boolean }} [options]
 */
export async function apiFetchBlob(path, options = {}) {
  const { auth = true, headers: extraHeaders, ...rest } = options
  const url = `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`
  const headers = { ...extraHeaders }

  const token = getAuthToken()
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, { ...rest, headers })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(formatApiError(data, response.statusText || "Yêu cầu thất bại"))
  }

  return response.blob()
}
