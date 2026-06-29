import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext(null)

function normalizeTheme(value) {
  if (value === "day" || value === "light") return "day"
  return "night"
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return normalizeTheme(localStorage.getItem("theme"))
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === "day") {
      root.classList.add("light")
      root.dataset.theme = "day"
    } else {
      root.classList.remove("light")
      root.dataset.theme = "night"
    }
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "night" ? "day" : "night"))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
