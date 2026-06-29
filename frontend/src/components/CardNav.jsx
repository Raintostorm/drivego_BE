import { Link } from "react-router-dom"
import { BrandLogo } from "./BrandLogo.jsx"
import { DitherBackground } from "./DitherBackground.jsx"
import { useTheme } from "../context/ThemeContext.jsx"

/**
 * @param {{
 *   items: Array<{ label: string, bgColor: string, textColor: string, links: Array<{ label: string, href: string, ariaLabel?: string }> }>,
 *   cta: { label: string, href: string },
 *   secondaryCta?: { label: string, href: string } | null,
 *   homeTone?: boolean,
 *   isOpen: boolean,
 *   onToggle: () => void,
 *   onClose: () => void,
 * }} props
 */
export function CardNav({ items, cta, secondaryCta = null, homeTone = false, isOpen, onToggle, onClose }) {
  const { theme, toggleTheme } = useTheme()
  const nextThemeLabel = theme === "night" ? "Day" : "Night"

  return (
    <header
      className={`card-nav-shell ${homeTone ? "card-nav-shell--home" : ""} sticky top-0 z-30 -mx-4 mb-8 overflow-visible px-4 py-4 sm:-mx-6 sm:px-6`}
    >
      <nav
        className={`drive-card-nav ${homeTone ? "drive-card-nav--home" : ""} ${isOpen ? "open" : ""}`}
        aria-label="Chính"
      >
        <DitherBackground density="soft" />
        <div className="drive-card-nav__top">
          <button
            type="button"
            className={`drive-card-nav__menu ${isOpen ? "open" : ""}`}
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Đóng menu" : "Mở menu"}
          >
            <span />
            <span />
          </button>

          <div className="drive-card-nav__logo">
            <BrandLogo />
          </div>

          <div className="drive-card-nav__actions">
            <button
              onClick={toggleTheme}
              className="drive-theme-toggle"
              aria-label={`Chuyển sang chế độ ${nextThemeLabel}`}
              title={`Switch to ${nextThemeLabel}`}
              type="button"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 18a6 6 0 1 0 0-12v12z" fill="currentColor" />
              </svg>
              <span>{theme === "night" ? "Night" : "Day"}</span>
            </button>
            {secondaryCta ? (
              <Link className="drive-card-nav__login" to={secondaryCta.href} onClick={onClose}>
                {secondaryCta.label}
              </Link>
            ) : null}
            <Link className="drive-card-nav__cta" to={cta.href} onClick={onClose}>
              {cta.label}
            </Link>
          </div>
        </div>

        <div className="drive-card-nav__content" aria-hidden={!isOpen}>
          {items.slice(0, 3).map((item, index) => (
            <article
              className="drive-card-nav__card"
              key={item.label}
              style={{
                "--card-bg": item.bgColor,
                "--card-color": item.textColor,
                "--card-delay": `${index * 70}ms`,
              }}
            >
              <p>{item.label}</p>
              <div>
                {item.links.map((link) => (
                  <Link
                    aria-label={link.ariaLabel || link.label}
                    className="drive-card-nav__link"
                    key={`${item.label}-${link.href}`}
                    to={link.href}
                    onClick={onClose}
                  >
                    <span aria-hidden="true">↗</span>
                    {link.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </nav>
    </header>
  )
}
