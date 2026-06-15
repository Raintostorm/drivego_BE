import { Link } from "react-router-dom"
import brandScooter from "../assets/brand-scooter.png"
import { t } from "../lib/strings.js"
import { PressureBrandText } from "./PressureBrandText.jsx"

/**
 * @param {{ to?: string, size?: 'sm' | 'md', showScooter?: boolean }} props
 */
export function BrandLogo({ to = "/", size = "md", showScooter = false }) {
  const iconSize = size === "sm" ? "size-8" : "size-8"

  const inner = (
    <>
      <img
        src={brandScooter}
        alt=""
        className="h-10 sm:h-14 w-auto shrink-0 object-contain"
      />
      <PressureBrandText text={t("brand")} size={size} />
      {showScooter ? <img src={brandScooter} alt="" className="brand-logo-scooter" /> : null}
    </>
  )

  if (!to) {
    return <div className="flex items-center gap-3">{inner}</div>
  }

  return (
    <Link to={to} className="flex items-center gap-3">
      {inner}
    </Link>
  )
}
