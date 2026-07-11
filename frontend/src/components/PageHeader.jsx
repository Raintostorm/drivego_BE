/**
 * @param {{ title: string, subtitle?: string, actions?: import('react').ReactNode }} props
 */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-8 sm:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm leading-relaxed text-drive-muted sm:text-base">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2 sm:gap-4">{actions}</div> : null}
    </div>
  )
}
