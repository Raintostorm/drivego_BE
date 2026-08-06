import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import {
  adminDownloadApplicationArchive,
  adminDownloadDocument,
  adminOpenDocument,
  fetchAdminApplication,
  patchAdminApplication,
  requestAdminDossier,
} from "../lib/admin-api.js"

const STATUS_LABEL = {
  draft: "Nháp",
  submitted: "Đã nộp",
  reviewing: "Đang duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
}

const FIELD_LABEL = {
  fullName: "Họ và tên",
  dateOfBirth: "Ngày sinh",
  gender: "Giới tính",
  phone: "Số điện thoại",
  email: "Email",
  address: "Địa chỉ",
  citizenId: "CCCD",
  identityNumber: "CCCD",
  issuedDate: "Ngày cấp",
  issuedPlace: "Nơi cấp",
}

const REVIEW_STEPS = [
  { id: "submitted", label: "Đã nộp" },
  { id: "reviewing", label: "Đang duyệt" },
  { id: "approved", label: "Hoàn tất" },
]

const DOCUMENT_CHECKLIST = [
  { docType: "photo_3x4_blue", label: "Ảnh 3x4", min: 4, hint: "Nên nền trắng từ 01/07" },
  { docType: "photo_4x6_white", label: "Ảnh 4x6", min: 1, hint: "Ảnh hồ sơ chính" },
  { docType: "cccd_front", label: "CCCD mặt trước", min: 1, hint: "Rõ số CCCD" },
  { docType: "cccd_back", label: "CCCD mặt sau", min: 1, hint: "Rõ ngày cấp/nơi cấp" },
]

function ReviewProgress({ status }) {
  const effective = status === "rejected" ? "reviewing" : status
  const activeIndex = Math.max(0, REVIEW_STEPS.findIndex((step) => step.id === effective))
  return <ol className="grid grid-cols-3 gap-2" aria-label="Tiến độ duyệt hồ sơ">{REVIEW_STEPS.map((step, index) => <li key={step.id} className="min-w-0"><div className={`h-1.5 rounded-full ${index <= activeIndex ? status === "rejected" && index === activeIndex ? "bg-drive-danger" : "bg-drive-success" : "bg-drive-elevated"}`} /><p className={`mt-2 truncate text-xs ${index <= activeIndex ? "font-medium text-drive-text" : "text-drive-muted"}`}>{step.label}</p></li>)}</ol>
}

function documentCount(documents, docType) {
  return (documents ?? []).filter((doc) => doc.docType === docType).length
}

export function AdminApplicationDetailPage() {
  const { id } = useParams()
  const [app, setApp] = useState(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [archiveBusy, setArchiveBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [dossierDeadline, setDossierDeadline] = useState("")

  useEffect(() => {
    if (!id) return
    fetchAdminApplication(id)
      .then((data) => {
        setApp(data)
        setNote(data.adminNote ?? "")
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false))
  }, [id])

  async function handleStatus(nextStatus) {
    if (!id) return
    if (nextStatus === "rejected" && !note.trim()) {
      setMessage("Vui lòng nhập lý do từ chối để học viên biết cần bổ sung gì.")
      return
    }
    const action = nextStatus === "approved" ? "duyệt" : nextStatus === "rejected" ? "từ chối" : "bắt đầu xem xét"
    if (!window.confirm(`Xác nhận ${action} hồ sơ của ${app?.studentName ?? "học viên"}?`)) return
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

      <UiCard variant="panel" padding="sm">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-drive-text">Quy trình xử lý</p>{app.status === "rejected" ? <StatusBadge tone="danger">Cần bổ sung</StatusBadge> : null}</div>
        <div className="mt-3"><ReviewProgress status={app.status} /></div>
      </UiCard>

      {message ? (
        <UiCard variant="panel">
          <p className="text-sm text-drive-action">{message}</p>
        </UiCard>
      ) : null}

      <UiCard variant="panel">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={app.status === "approved" ? "success" : app.status === "rejected" ? "danger" : "warning"}>
            {STATUS_LABEL[app.status] ?? app.status}
          </StatusBadge>
          {app.submittedAt ? (
            <span className="text-sm text-drive-muted">
              Nộp: {new Date(app.submittedAt).toLocaleString("vi-VN")}
            </span>
          ) : null}
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(app.personalInfo ?? {}).map(([key, value]) => (
            <div key={key} className="min-w-0 border-b border-drive-border-soft pb-3">
              <p className="text-xs text-drive-muted">{FIELD_LABEL[key] ?? key.replace(/([A-Z])/g, " $1")}</p>
              <p className="mt-1 break-words text-sm font-medium text-drive-text">
                {value === null || value === undefined || value === "" ? "Chưa cung cấp" : String(value)}
              </p>
            </div>
          ))}
          {!Object.keys(app.personalInfo ?? {}).length ? <p className="text-sm text-drive-muted">Chưa có thông tin cá nhân.</p> : null}
        </div>
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
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {DOCUMENT_CHECKLIST.map((item) => {
            const count = documentCount(app.documents, item.docType)
            const complete = count >= item.min
            return (
              <div key={item.docType} className={`rounded-drive border p-3 ${complete ? "border-drive-success/40 bg-drive-success/10" : "border-amber-400/40 bg-amber-400/10"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-drive-text">{item.label}</p>
                    <p className="mt-1 text-xs text-drive-muted">{item.hint}</p>
                  </div>
                  <StatusBadge tone={complete ? "success" : "warning"}>{count}/{item.min}</StatusBadge>
                </div>
              </div>
            )
          })}
        </div>
        <ul className="mt-4 space-y-2">
          {(app.documents ?? []).map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-drive border border-drive-border-soft bg-drive-sidebar px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-drive-text">{d.originalName ?? "Tài liệu"}</p>
                <p className="text-xs text-drive-muted">{d.docType} · bản {d.slotIndex + 1}</p>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
                <button type="button" className="min-h-10 text-sm font-medium text-drive-action hover:underline" onClick={() => adminOpenDocument(d.id)}>
                  Xem nhanh
                </button>
                <button type="button" className="min-h-10 text-sm font-medium text-drive-action hover:underline" onClick={() => adminDownloadDocument(d.id, d.originalName ?? "document")}>Tải xuống</button>
              </div>
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
        <label className="mt-3 block text-sm text-drive-muted" htmlFor="admin-application-note">Ghi chú gửi học viên</label>
        <textarea
          id="admin-application-note"
          className="mt-3 w-full rounded-drive border border-drive-border bg-drive-elevated p-3 text-sm text-white"
          rows={3}
          placeholder="Nêu rõ giấy tờ cần bổ sung hoặc lý do từ chối"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="sticky bottom-3 mt-4 flex flex-col-reverse gap-2 rounded-drive border border-drive-border-soft bg-drive-panel/95 p-3 shadow-drive-card backdrop-blur sm:static sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          {app.status === "submitted" ? (
            <PrimaryButton variant="action" disabled={busy} onClick={() => handleStatus("reviewing")}>
              Bắt đầu xem xét
            </PrimaryButton>
          ) : null}
          {["submitted", "reviewing"].includes(app.status) ? (
            <>
              <PrimaryButton variant="action" disabled={busy} onClick={() => handleStatus("approved")}>
                Duyệt hồ sơ
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
