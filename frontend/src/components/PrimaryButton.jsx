/**
 * @param {{ children: import('react').ReactNode, className?: string, variant?: 'primary' | 'action' | 'outline' | 'ghost', type?: 'button' | 'submit', onClick?: () => void, fullWidth?: boolean, disabled?: boolean }} props
 */
export function PrimaryButton({
  children,
  className = "",
  variant = "primary",
  type = "button",
  onClick,
  fullWidth,
  disabled,
}) {
  const base =
    "tap-feedback inline-flex min-h-11 items-center justify-center rounded-drive-pill px-5 py-2.5 text-center text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-drive-accent focus:ring-offset-2 focus:ring-offset-drive-canvas disabled:opacity-60 sm:px-6 sm:py-3"
  const variants = {
    primary:
      "bg-drive-accent text-drive-accent-contrast uppercase tracking-wide shadow-drive-glow hover:brightness-110",
    action:
      "bg-drive-action text-drive-action-contrast shadow-drive-action hover:brightness-110",
    outline:
      "border border-drive-border bg-drive-elevated text-drive-text hover:bg-drive-panel",
    ghost: "text-drive-muted hover:bg-drive-elevated hover:text-white",
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`.trim()}
    >
      {children}
    </button>
  )
}
