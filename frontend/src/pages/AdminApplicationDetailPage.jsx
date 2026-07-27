import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import {
  adminDownloadApplicationArchive,
  adminDownloadDocument,
  fetchAdminApplication,
  patchAdminApplication,
  requestAdminDossier,
} from "../lib/admin-api.js"

export function AdminApplicationDetailPage() {
  const { id } = useParams()
  const [app, setApp] = useState(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [archiveBusy, setArchiveBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [dossierDeadline, setDossierDeadline] = useState("")

  function reload() {
    if (!id) return
    setLoading(true)
    fetchAdminApplication(id)
      .then((data) => {
        setApp(data)
        setNote(data.adminNote ?? "")
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [id])

  async function handleStatus(nextStatus) {
    if (!id) return
    setBusy(true)
    setMessage(null)
    try {
      const data = await patchAdminApplication(id, {
        status: nextStatus,
        adminNote: note || undefined,
      })
      setApp(data)
      setMessage("Đã cập nhật trạng thái hồ sơ.")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Lỗi")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-drive-muted">Đang tải…</p>
  }

  if (!app) {
    return (
      <UiCard variant="panel">
        <p className="text-drive-danger">{message ?? "Không tìm thấy hồ sơ"}</p>
        <Link to="/admin/applications" className="mt-2 inline-block text-drive-action">
          ← Quay lại
        </Link>
      </UiCard>
    )
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={app.studentName ?? "Hồ sơ"}
        subtitle={`${app.studentEmail} · Hạng ${app.licenseClass}`}
      />
      <Link to="/admin/applications" className="text-sm text-drive-action hover:underline">
        ← Danh sách hồ sơ
      </Link>

      {message ? (
        <UiCard variant="panel">
          <p className="text-sm text-drive-action">{message}</p>
        </UiCard>
      ) : null}

      <UiCard variant="panel">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="neutral">{app.status}</StatusBadge>
          {app.submittedAt ? (
            <span className="text-sm text-drive-muted">
              Nộp: {new Date(app.submittedAt).toLocaleString("vi-VN")}
            </span>
          ) : null}
        </div>
        <pre className="mt-4 max-h-48 overflow-auto rounded-drive bg-drive-sidebar p-3 text-xs text-drive-muted">
          {JSON.stringify(app.personalInfo, null, 2)}
        </pre>
      </UiCard>

      <UiCard variant="panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Tài liệu đính kèm</h2>
            <p className="mt-1 text-sm text-drive-muted">
              {(app.documents ?? []).length} file trong hồ sơ học viên.
            </p>
          </div>
          <button
            type="button"
            disabled={archiveBusy || !(app.documents ?? []).length}
            className="rounded-drive-pill bg-drive-action px-4 py-2 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={async () => {
              if (!id) return
              setArchiveBusy(true)
              setMessage(null)
              try {
                const safeName = String(app.studentName ?? "hoc-vien")
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/đ/g, "d")
                  .replace(/Đ/g, "D")
                  .replace(/[^a-zA-Z0-9._-]+/g, "_")
                  .replace(/^_+|_+$/g, "")
                await adminDownloadApplicationArchive(
                  id,
                  `${safeName || "hoc-vien"}_${app.licenseClass}_ho-so.zip`,
                )
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Không tải được file ZIP")
              } finally {
                setArchiveBusy(false)
              }
            }}
          >
            {archiveBusy ? "Đang nén…" : "Tải cả bộ ZIP"}
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {(app.documents ?? []).map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-drive border border-drive-border-soft bg-drive-sidebar px-3 py-2"
            >
              <span className="text-sm text-white">
                {d.docType}[{d.slotIndex}] — {d.originalName ?? "file"}
              </span>
              <button
                type="button"
                className="text-sm font-medium text-drive-action hover:underline"
                onClick={() => adminDownloadDocument(d.id, d.originalName ?? "document")}
              >
                Tải xuống
              </button>
            </li>
          ))}
        </ul>
      </UiCard>

      {app.status !== "draft" ? (
      <UiCard variant="panel">
        <h2 className="font-semibold text-white">Yêu cầu nộp lại hồ sơ</h2>
        <p className="mt-1 text-sm text-drive-muted">
          Dùng khi học viên đã nộp trước đó và cần bổ sung/sửa giấy tờ (từ chối, hết hạn, v.v.).
        </p>
        {app.dossierRequestedAt ? (
          <p className="mt-2 text-sm text-amber-300">
            Đã yêu cầu: {new Date(app.dossierRequestedAt).toLocaleString("vi-VN")}
            {app.dossierDeadline
              ? ` · Hạn: ${new Date(app.dossierDeadline).toLocaleString("vi-VN")}`
              : ""}
          </p>
        ) : null}
        <label className="mt-3 block text-sm text-drive-muted">Hạn nộp (tùy chọn)</label>
        <input
          type="datetime-local"
          className="mt-1 w-full max-w-xs rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-sm text-white"
          value={dossierDeadline}
          onChange={(e) => setDossierDeadline(e.target.value)}
        />
        <PrimaryButton
          variant="outline"
          className="mt-4"
          disabled={busy}
          onClick={async () => {
            if (!id) return
            setBusy(true)
            setMessage(null)
            try {
              const body = dossierDeadline
                ? { deadline: new Date(dossierDeadline).toISOString() }
                : {}
              const data = await requestAdminDossier(id, body)
              setApp(data)
              setMessage("Đã gửi yêu cầu nộp hồ sơ cho học viên.")
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Lỗi")
            } finally {
              setBusy(false)
            }
          }}
        >
          Yêu cầu nộp lại
        </PrimaryButton>
      </UiCard>
      ) : (
        <UiCard variant="panel">
          <p className="text-sm text-drive-muted">
            Học viên đang soạn nháp — chưa nộp lần đầu. Không cần &quot;yêu cầu nộp&quot;; chờ HV tự
            nộp hoặc xem sau khi trạng thái là Đã nộp.
          </p>
        </UiCard>
      )}

      <UiCard variant="panel">
        <h2 className="font-semibold text-white">Duyệt hồ sơ</h2>
        <textarea
          className="mt-3 w-full rounded-drive border border-drive-border bg-drive-elevated p-3 text-sm text-white"
          rows={3}
          placeholder="Ghi chú cho học viên (tùy chọn)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {app.status === "submitted" ? (
            <PrimaryButton variant="action" disabled={busy} onClick={() => handleStatus("reviewing")}>
              Bắt đầu xem xét
            </PrimaryButton>
          ) : null}
          {["submitted", "reviewing"].includes(app.status) ? (
            <>
              <PrimaryButton variant="action" disabled={busy} onClick={() => handleStatus("approved")}>
                Duyệt
              </PrimaryButton>
              <PrimaryButton
                variant="outline"
                disabled={busy}
                onClick={() => handleStatus("rejected")}
              >
                Từ chối
              </PrimaryButton>
            </>
          ) : null}
        </div>
      </UiCard>
    </section>
  )
}
