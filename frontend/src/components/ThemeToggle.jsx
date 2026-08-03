import { useTheme } from "../context/ThemeContext.jsx"

export function ThemeToggle() {
  const { theme, setThemeMode } = useTheme()
  return (
    <div className="grid grid-cols-2 rounded-drive border border-drive-border bg-drive-elevated p-1" role="group" aria-label="Chọn giao diện sáng hoặc tối">
      <button type="button" aria-pressed={theme === "day"} onClick={() => setThemeMode("day")} className={`min-h-10 rounded-drive px-3 text-xs font-semibold ${theme === "day" ? "bg-drive-action text-drive-action-contrast" : "text-drive-muted"}`}>Sáng</button>
      <button type="button" aria-pressed={theme === "night"} onClick={() => setThemeMode("night")} className={`min-h-10 rounded-drive px-3 text-xs font-semibold ${theme === "night" ? "bg-drive-action text-drive-action-contrast" : "text-drive-muted"}`}>Tối</button>
    </div>
  )
}
