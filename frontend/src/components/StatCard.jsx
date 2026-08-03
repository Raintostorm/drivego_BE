import { Link } from "react-router-dom"

/**
 * @param {{ label: string, value: string, badge?: string, badgeTone?: 'success' | 'neutral', to?: string, helper?: string, tone?: 'neutral' | 'warning' | 'danger' | 'success' }} props
 */
export function StatCard({ label, value, badge, badgeTone = "success", to, helper, tone = "neutral" }) {
  const badgeClass =
    badgeTone === "success"
      ? "bg-drive-success/10 text-drive-success"
      : "bg-drive-muted/10 text-drive-muted"

  const toneClass = tone === "danger" ? "bg-drive-danger" : tone === "warning" ? "bg-amber-400" : tone === "success" ? "bg-drive-success" : "bg-drive-action"
  const content = (
    <article className="group relative flex min-h-28 flex-col justify-between overflow-hidden rounded-drive border border-drive-border-soft bg-drive-panel p-4 transition hover:border-drive-border sm:min-h-32 sm:p-5">
      <div className={`absolute inset-y-0 left-0 w-1 ${toneClass}`} />
      <div className="flex items-start justify-between gap-3 pl-1">
        <p className="text-sm text-drive-muted">{label}</p>
        {badge ? (
          <span className={`rounded-full px-2 py-1 text-xs font-bold ${badgeClass}`}>{badge}</span>
        ) : null}
      </div>
      <div className="pl-1">
        <p className="text-2xl font-bold text-white sm:text-3xl">{value}</p>
        {helper ? <p className="mt-1 text-xs text-drive-placeholder">{helper}</p> : null}
      </div>
    </article>
  )
  return to ? <Link to={to} className="block rounded-drive focus:outline-none focus:ring-2 focus:ring-drive-action">{content}</Link> : content
}
