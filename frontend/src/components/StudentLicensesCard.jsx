import { useEffect, useState } from "react"
import { apiFetch } from "../lib/api.js"
import { CURRENT_LICENSE_OPTIONS } from "../lib/license-class.js"
import { StatusBadge } from "./StatusBadge.jsx"
import { UiCard } from "./UiCard.jsx"

const EMPTY = { licenseNumber: "", licenseClass: "A1", regulationVersion: "from_2025", issuedAt: "", expiresAt: "", issuingAuthority: "" }

export function StudentLicensesCard() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const noExpiry = form.regulationVersion === "from_2025" && ["A1", "A", "B1"].includes(form.licenseClass)

  function load() { apiFetch("/licenses/me", { auth: true }).then(setRows).catch((e) => setError(e.message)) }
  useEffect(load, [])

  async function submit(e) {
    e.preventDefault(); setSaving(true); setError(null)
    try {
      await apiFetch("/licenses/me", { method: "POST", auth: true, body: JSON.stringify({ ...form, expiresAt: noExpiry ? "" : form.expiresAt }) })
      setForm(EMPTY); load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return <UiCard variant="panel">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-white">Giấy phép lái xe đang có</h3><p className="mt-1 text-sm text-drive-muted">Khai báo thông tin trên GPLX. Trung tâm sẽ đối chiếu trước khi dùng để nhắc hạn.</p></div>
      <StatusBadge tone="info">Có bước xác minh</StatusBadge>
    </div>
    {rows.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{rows.map((row) => <div key={row.id} className="rounded-drive border border-drive-border bg-drive-elevated p-4">
      <div className="flex justify-between gap-3"><strong className="text-white">Hạng {row.licenseClass}</strong><StatusBadge tone={row.verificationStatus === "verified" ? "success" : row.verificationStatus === "rejected" ? "danger" : "warning"}>{row.verificationStatus === "verified" ? "Đã xác minh" : row.verificationStatus === "rejected" ? "Cần sửa" : "Chờ xác minh"}</StatusBadge></div>
      <p className="mt-2 text-sm text-drive-muted">Số GPLX: {row.licenseNumber || "Chưa nhập"}</p>
      <p className="text-sm text-drive-muted">Hạn: {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString("vi-VN") : "Không thời hạn"}</p>
    </div>)}</div> : <p className="mt-4 text-sm text-drive-muted">Chưa khai báo GPLX.</p>}
    <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
      <label className="text-sm text-drive-text">Hạng GPLX<select className="mt-2 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-white" value={form.licenseClass} onChange={(e) => setForm({ ...form, licenseClass: e.target.value })}>{CURRENT_LICENSE_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className="text-sm text-drive-text">Loại giấy phép<select className="mt-2 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-white" value={form.regulationVersion} onChange={(e) => setForm({ ...form, regulationVersion: e.target.value })}><option value="from_2025">Cấp từ 01/01/2025</option><option value="legacy">Cấp trước 01/01/2025</option></select></label>
      <label className="text-sm text-drive-text">Số GPLX<input className="mt-2 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-white" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></label>
      <label className="text-sm text-drive-text">Nơi cấp<input className="mt-2 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-white" value={form.issuingAuthority} onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })} /></label>
      <label className="text-sm text-drive-text">Ngày cấp<input type="date" className="mt-2 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-white" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} /></label>
      <label className="text-sm text-drive-text">Ngày hết hạn<input type="date" disabled={noExpiry} required={form.regulationVersion === "legacy"} className="mt-2 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-white disabled:opacity-50" value={noExpiry ? "" : form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /><span className="mt-1 block text-xs text-drive-muted">{noExpiry ? "Hạng này không thời hạn theo quy định hiện hành." : form.regulationVersion === "legacy" ? "Nhập đúng ngày in trên GPLX cũ." : "Có thể để trống để hệ thống tính từ ngày cấp (B: 10 năm; hạng khác có thời hạn: 5 năm)."}</span></label>
      <div className="sm:col-span-2"><button disabled={saving} className="rounded-drive-pill bg-drive-action px-6 py-3 text-sm font-bold text-drive-action-contrast">{saving ? "Đang gửi..." : "Gửi xác minh"}</button></div>
    </form>
    {error ? <p className="mt-3 text-sm text-drive-danger">{error}</p> : null}
    <p className="mt-4 text-xs text-drive-muted">Nhận dạng ảnh chưa tự động phê duyệt: dữ liệu chỉ có hiệu lực sau khi admin đối chiếu với GPLX hoặc cổng tra cứu chính thức.</p>
  </UiCard>
}
