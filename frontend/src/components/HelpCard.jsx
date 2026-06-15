import { UiCard } from "./UiCard.jsx"

export function HelpCard({ title, items, className = "" }) {
  return (
    <UiCard variant="panel" className={`border-drive-action/30 bg-drive-action/10 ${className}`.trim()}>
      <p className="text-sm font-semibold text-drive-action">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-drive-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-drive-action" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </UiCard>
  )
}
