/**
 * @param {{ className?: string, density?: 'soft' | 'strong' }} props
 */
export function DitherBackground({ className = "", density = "soft" }) {
  return (
    <div className={`dither-bg dither-bg--${density} ${className}`} aria-hidden="true">
      <span className="dither-bg__waves" />
      <span className="dither-bg__blue" />
      <span className="dither-bg__matrix" />
      <span className="dither-bg__grain" />
      <span className="dither-bg__shade" />
    </div>
  )
}
