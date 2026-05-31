import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { apiFetch, clearAuthToken, getAuthToken, setAuthToken } from "../lib/api.js"
import { dashboardPathForRole } from "../lib/roles.js"

export { dashboardPathForRole }

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadMe = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const me = await apiFetch("/users/me", { auth: true })
      setUser(me)
      setError(null)
    } catch {
      clearAuthToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  const login = useCallback(async (email, password) => {
    setError(null)
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    setAuthToken(data.accessToken)
    setUser({
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      profile: data.user.fullName ? { fullName: data.user.fullName } : null,
    })
    await loadMe()
    return data.user
  }, [loadMe])

  const register = useCallback(async (payload) => {
    setError(null)
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        fullName: payload.fullName,
        phone: payload.phone,
        licenseClass: payload.licenseClass,
      }),
    })
    setAuthToken(data.accessToken)
    setUser({
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      profile: data.user.fullName ? { fullName: data.user.fullName } : null,
    })
    await loadMe()
    return data.user
  }, [loadMe])

  const loginWithGoogle = useCallback(async (idToken) => {
    setError(null)
    const data = await apiFetch("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    })
    setAuthToken(data.accessToken)
    setUser({
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      profile: data.user.fullName ? { fullName: data.user.fullName } : null,
    })
    await loadMe()
    return data.user
  }, [loadMe])

  const logout = useCallback(() => {
    clearAuthToken()
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      setError,
      login,
      loginWithGoogle,
      register,
      logout,
      isAuthenticated: Boolean(user),
      refreshUser: loadMe,
    }),
    [user, loading, error, login, loginWithGoogle, register, logout, loadMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
