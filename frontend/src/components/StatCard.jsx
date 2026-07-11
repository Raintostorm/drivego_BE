/**
 * @param {{ label: string, value: string, badge?: string, badgeTone?: 'success' | 'neutral' }} props
 */
export function StatCard({ label, value, badge, badgeTone = "success" }) {
  const badgeClass =
    badgeTone === "success"
      ? "bg-drive-success/10 text-drive-success"
      : "bg-drive-muted/10 text-drive-muted"

  return (
    <article className="flex min-h-32 flex-col gap-2 rounded-drive border border-drive-border-soft bg-drive-panel p-5 sm:min-h-36">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-drive-action/10 text-drive-action">
          <span className="text-lg">◆</span>
        </div>
        {badge ? (
          <span className={`rounded-full px-2 py-1 text-xs font-bold ${badgeClass}`}>{badge}</span>
        ) : null}
      </div>
      <div>
        <p className="text-sm text-drive-muted">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </article>
  )
}
