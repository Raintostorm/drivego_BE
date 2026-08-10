import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { Pagination } from "../components/Pagination.jsx"
import { confirmAdminPayment, fetchAdminPayments } from "../lib/admin-api.js"
import { usePagination } from "../hooks/usePagination.js"

const STATUS_TONE = {
  paid: "success",
  pending: "warning",
  expired: "danger",
  failed: "danger",
}
const STATUS_LABEL = { paid: "Đã thanh toán", pending: "Đang chờ", expired: "Hết hạn", failed: "Thất bại" }

function formatMoney(value) {
  return Number(value ?? 0).toLocaleString("vi-VN")
}

function formatDate(value) {
  if (!value) return "—"
  return new Date(value).toLocaleString("vi-VN")
}

function confirmationLabel(row) {
  if (row.status !== "paid") return "Chưa xác nhận"
  if (row.source === "admin_direct_unlock" || row.method === "direct" || row.method === "cash") return "Đóng trực tiếp"
  if (row.manualConfirmed) return "Admin xác nhận"
  if (row.sepayTransactionId || row.sepayReferenceCode) return "SePay webhook"
  return "Đã thanh toán"
}

function paymentEvents(row) {
  if (Array.isArray(row.paymentEvents) && row.paymentEvents.length) return row.paymentEvents
  if (row.paidAt) {
    return [{
      type: row.manualConfirmed ? "manual_confirmed" : "sepay_webhook_confirmed",
      at: row.paidAt,
      sepayReferenceCode: row.sepayReferenceCode,
    }]
  }
  return []
}

export function AdminPaymentsPage() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState("pending")
  const [paymentType, setPaymentType] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const filters = useMemo(
    () => ({
      status: status || undefined,
      paymentType: paymentType || undefined,
    }),
    [paymentType, status],
  )
  const pagination = usePagination(rows)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchAdminPayments(filters))
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : "Không tải được giao dịch")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetchAdminPayments(filters)
      .then((data) => { if (!cancelled) setRows(data) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được giao dịch") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filters])

  async function handleConfirm(row) {
    const ok = window.confirm(
      `Xác nhận đã nhận ${formatMoney(row.amount)}đ cho mã ${row.paymentCode || row.id}?`,
    )
    if (!ok) return
    setActionId(row.id)
    setError(null)
    setNotice(null)
    try {
      await confirmAdminPayment(row.id, {
        note: "Admin xác nhận thủ công từ dashboard",
      })
      setNotice("Đã xác nhận thanh toán và cập nhật quyền học viên.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xác nhận được giao dịch")
    } finally {
      setActionId(null)
    }
  }

  return (
    <section>
      <PageHeader
        title="Thanh toán"
        subtitle="Theo dõi SePay và xác nhận thủ công khi webhook chậm hoặc lỗi."
      />

      <UiCard variant="panel" className="mt-4">
        <div className="grid gap-3 lg:grid-cols-[180px_180px_auto_auto]">
          <select
            className="min-h-11 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-sm text-white"
            value={status}
            onChange={(e) => { setLoading(true); setStatus(e.target.value) }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Đang chờ</option>
            <option value="paid">Đã thanh toán</option>
            <option value="expired">Hết hạn</option>
          </select>
          <select
            className="min-h-11 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-sm text-white"
            value={paymentType}
            onChange={(e) => { setLoading(true); setPaymentType(e.target.value) }}
          >
            <option value="">Tất cả loại</option>
            <option value="enrollment">Đăng ký khóa</option>
            <option value="premium">Premium</option>
          </select>
          <PrimaryButton variant="outline" onClick={load} disabled={loading}>
            Làm mới
          </PrimaryButton>
          <Link
            to="/admin/students"
            className="inline-flex min-h-11 items-center justify-center rounded-drive-pill border border-drive-action px-4 text-sm font-bold text-drive-action transition hover:bg-drive-action/10"
          >
            Mở khóa học
          </Link>
        </div>
        <p className="mt-3 text-xs text-drive-muted">
          Học viên đóng tiền trực tiếp: vào Học viên & mở khóa → chọn học viên → tab Khóa học.
        </p>
      </UiCard>

      {notice ? <p className="mt-4 text-sm text-drive-success">{notice}</p> : null}
      {error ? <p className="mt-4 text-sm text-drive-danger">{error}</p> : null}

      <UiCard variant="panel" padding="sm" className="mt-4">
        {loading ? (
          <p className="text-sm text-drive-muted">Đang tải giao dịch...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-drive-muted">Không có giao dịch phù hợp.</p>
        ) : (
          <>
          <div className="grid gap-3 md:hidden">
            {pagination.pageItems.map((row) => <article key={row.id} className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-drive-text">{row.studentName || "Chưa có tên"}</p><p className="truncate text-xs text-drive-muted">{row.studentEmail}</p></div><StatusBadge tone={STATUS_TONE[row.status] || "neutral"}>{STATUS_LABEL[row.status] || row.status}</StatusBadge></div>
              <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-xs text-drive-muted">{row.paymentType === "enrollment" ? `Khóa ${row.licenseClass || ""}` : "Premium"}</p><p className="mt-1 text-xl font-bold text-drive-text">{formatMoney(row.amount)}đ</p><p className="mt-1 font-mono text-xs text-drive-muted">{row.paymentCode || row.id.slice(0, 8)}</p></div><p className="text-right text-xs text-drive-muted">{formatDate(row.createdAt)}</p></div>
              <div className="mt-3 rounded-drive border border-drive-border-soft bg-drive-elevated/60 px-3 py-2 text-xs text-drive-muted"><span className="font-medium text-drive-text">{confirmationLabel(row)}</span>{row.paidAt ? ` · ${formatDate(row.paidAt)}` : ""}{row.sepayReferenceCode ? <span className="block font-mono">Ref: {row.sepayReferenceCode}</span> : null}</div>
              {row.status === "pending" ? <PrimaryButton className="mt-4 w-full" variant="outline" disabled={actionId === row.id} onClick={() => handleConfirm(row)}>Xác nhận đã nhận tiền</PrimaryButton> : null}
            </article>)}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="text-drive-muted">
              <tr>
                <th className="px-3 py-2">Mã</th>
                <th className="px-3 py-2">Học viên</th>
                <th className="px-3 py-2">Loại</th>
                <th className="px-3 py-2">Số tiền</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Xác nhận</th>
                <th className="px-3 py-2">Ngày tạo</th>
                <th className="px-3 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((row) => (
                <tr key={row.id} className="border-t border-drive-border/70">
                  <td className="px-3 py-3 font-mono text-white">
                    {row.paymentCode || row.id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-white">{row.studentName || "Chưa có tên"}</p>
                    <p className="text-xs text-drive-muted">{row.studentEmail}</p>
                  </td>
                  <td className="px-3 py-3 text-drive-muted">
                    {row.paymentType === "enrollment"
                      ? `Khóa ${row.licenseClass || ""}`
                      : "Premium"}
                  </td>
                  <td className="px-3 py-3 font-semibold text-white">
                    {formatMoney(row.amount)}đ
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={STATUS_TONE[row.status] || "neutral"}>
                      {STATUS_LABEL[row.status] || row.status}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-3 text-drive-muted">
                    <p className="text-drive-text">{confirmationLabel(row)}</p>
                    <p className="text-xs">{row.paidAt ? formatDate(row.paidAt) : "—"}</p>
                    {row.sepayReferenceCode ? <p className="font-mono text-xs">Ref: {row.sepayReferenceCode}</p> : null}
                    {paymentEvents(row).length ? (
                      <div className="mt-2 space-y-1 border-l border-drive-border-soft pl-2">
                        {paymentEvents(row).slice(-2).map((event, index) => (
                          <p key={`${row.id}-${event.type}-${index}`} className="text-xs">
                            {event.type === "manual_confirmed" ? "Manual" : "SePay"} · {formatDate(event.at)}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-drive-muted">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {row.status === "pending" ? (
                      <PrimaryButton
                        variant="outline"
                        disabled={actionId === row.id}
                        onClick={() => handleConfirm(row)}
                      >
                        Xác nhận
                      </PrimaryButton>
                    ) : (
                      <span className="text-xs text-drive-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <Pagination {...pagination} total={rows.length} onPageChange={pagination.setPage} label="giao dịch" />
          </>
        )}
      </UiCard>
    </section>
  )
}
