import { UiCard } from "./UiCard.jsx"

export const SIMULATOR_VIDEO_URL = "https://www.youtube.com/watch?v=Xxnk7i5vGgw&t=795s"

export function isCarLicenseClass(licenseClass) {
  return ["B1", "B2"].includes(String(licenseClass ?? "").toUpperCase())
}

export function SimulatorInstallCard({ compact = false }) {
  return (
    <UiCard variant="panel" padding={compact ? "md" : "lg"}>
      <p className="text-xs font-semibold uppercase text-drive-action">Dành cho B1/B2</p>
      <h2 className={`${compact ? "mt-1 text-base" : "mt-2 text-xl"} font-semibold text-white`}>
        Cài phần mềm mô phỏng lái xe
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-drive-muted">
        Học viên B1/B2 có thể xem video hướng dẫn cài phần mềm mô phỏng trên máy tính để ôn thêm
        phần tình huống mô phỏng trước khi thi.
      </p>
      <a
        href={SIMULATOR_VIDEO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-drive-pill bg-drive-action px-4 py-2 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
      >
        Xem video hướng dẫn cài đặt
      </a>
    </UiCard>
  )
}
