import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { fetchAdminStudent, patchAdminStudentNote } from "../lib/admin-api.js"
import { formatPremiumDate } from "../lib/premium.js"
import { displayLicenseClass } from "../lib/license-class.js"

const TABS = [
  { id: "info", label: "Thông tin" },
  { id: "courses", label: "Khóa học" },
  { id: "exams", label: "Thi thử" },
  { id: "application", label: "Hồ sơ" },
]

export function AdminStudentDetailPage() {
  const { userId } = useParams()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState("info")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAdminStudent(userId)
      .then((d) => {
        setData(d)
        setNote(d.adminNote ?? "")
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"))
  }, [userId])

  async function saveNote() {
    setSaving(true)
    try {
      const updated = await patchAdminStudentNote(userId, note)
      setData(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi lưu")
    } finally {
      setSaving(false)
    }
  }

  if (error && !data) {
    return (
      <section>
        <PageHeader title="Học viên" />
        <p className="text-drive-danger">{error}</p>
        <Link to="/admin/students" className="text-drive-action">
          ← Danh sách
        </Link>
      </section>
    )
  }

  if (!data) {
    return (
      <section>
        <PageHeader title="Học viên" />
        <p className="text-drive-muted">Đang tải…</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={data.fullName || data.email}
        subtitle={data.email}
        actions={
          <Link to="/admin/students" className="text-sm text-drive-action hover:underline">
            ← Danh sách
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-drive-pill px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "bg-drive-action text-drive-action-contrast"
                : "border border-drive-border text-drive-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" ? (
        <UiCard variant="panel">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-drive-muted">Hạng</dt>
              <dd className="text-white">{displayLicenseClass(data.licenseClass) || "—"}</dd>
            </div>
            <div>
              <dt className="text-drive-muted">Premium</dt>
              <dd className="text-white">
                {data.premiumUntil
                  ? formatPremiumDate(data.premiumUntil)
                  : "Chưa có"}
              </dd>
            </div>
            <div>
              <dt className="text-drive-muted">Điện thoại</dt>
              <dd className="text-white">{data.phone ?? "—"}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <TextField
              label="Ghi chú nội bộ (center)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <PrimaryButton className="mt-3" disabled={saving} onClick={saveNote}>
              {saving ? "Đang lưu…" : "Lưu ghi chú"}
            </PrimaryButton>
          </div>
        </UiCard>
      ) : null}

      {tab === "courses" ? (
        <UiCard variant="panel">
          {data.enrollments?.length ? (
            <ul className="space-y-2 text-sm">
              {data.enrollments.map((e) => (
                <li key={e.id ?? e.licenseClass} className="text-white">
                  Hạng {displayLicenseClass(e.licenseClass)} · {e.status ?? "active"}
                  {e.enrolledAt ? (
                    <span className="ml-2 text-drive-muted">
                      {new Date(e.enrolledAt).toLocaleDateString("vi-VN")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-drive-muted">Chưa có đăng ký khóa.</p>
          )}
        </UiCard>
      ) : null}

      {tab === "exams" ? (
        <UiCard variant="panel">
          {data.recentAttempts?.length ? (
            <table className="min-w-[640px] w-full text-sm">
              <thead>
                <tr className="text-drive-muted">
                  <th className="py-2 text-left">Điểm</th>
                  <th className="py-2 text-left">Kết quả</th>
                  <th className="py-2 text-left">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAttempts.map((a) => (
                  <tr key={a.id} className="border-t border-drive-border-soft">
                    <td className="py-2 text-white">{a.score ?? "—"}</td>
                    <td className="py-2">
                      {a.passed ? (
                        <StatusBadge tone="success">Đạt</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">—</StatusBadge>
                      )}
                    </td>
                    <td className="py-2 text-drive-muted">
                      {a.finishedAt
                        ? new Date(a.finishedAt).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-drive-muted">Chưa có lượt thi.</p>
          )}
        </UiCard>
      ) : null}

      {tab === "application" ? (
        <UiCard variant="panel">
          {data.application ? (
            <>
              <p className="text-white">
                Hạng {data.application.licenseClass} · {data.application.status}
              </p>
              <Link
                to={`/admin/applications/${data.application.id}`}
                className="mt-3 inline-block text-drive-action hover:underline"
              >
                Mở hồ sơ admin →
              </Link>
            </>
          ) : (
            <p className="text-drive-muted">Chưa có hồ sơ sát hạch.</p>
          )}
        </UiCard>
      ) : null}
    </section>
  )
}
