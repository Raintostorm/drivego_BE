export function Pagination({ page, pageCount, pageSize = 10, total, onPageChange, label = "mục" }) {
  if (total <= pageSize) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(total, page * pageSize)

  return (
    <nav className="mt-4 flex flex-col gap-3 border-t border-drive-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label={`Phân trang ${label}`}>
      <p className="text-xs text-drive-muted">Hiển thị {first}–{last} trong {total} {label}</p>
      <div className="grid grid-cols-[44px_minmax(88px,auto)_44px] items-center gap-2">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 1} className="min-h-11 rounded-drive border border-drive-border text-drive-text disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang trước">←</button>
        <span className="text-center text-sm text-drive-muted">Trang {page}/{pageCount}</span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page === pageCount} className="min-h-11 rounded-drive border border-drive-border text-drive-text disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang sau">→</button>
      </div>
    </nav>
  )
}
