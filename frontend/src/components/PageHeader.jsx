/**
 * @param {{ title: string, subtitle?: string, actions?: import('react').ReactNode }} props
 */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-col items-stretch justify-between gap-3 sm:mb-8 sm:flex-row sm:items-end sm:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm leading-relaxed text-drive-muted sm:text-base">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:gap-4">{actions}</div> : null}
    </div>
  )
}
