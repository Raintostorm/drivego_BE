export const APPLICATION_DOC_TYPES = {
  PHOTO_3X4_BLUE: "photo_3x4_blue",
  PHOTO_4X6_WHITE: "photo_4x6_white",
  CCCD_FRONT: "cccd_front",
  CCCD_BACK: "cccd_back",
  VNEID_L2: "vneid_l2",
  GPLX_OPTIONAL: "gplx_optional",
} as const

export type ApplicationDocType = (typeof APPLICATION_DOC_TYPES)[keyof typeof APPLICATION_DOC_TYPES]

/** Required uploads: docType -> number of slots (slot_index 0..n-1) */
export const REQUIRED_DOCUMENT_SLOTS: Record<string, number> = {
  [APPLICATION_DOC_TYPES.PHOTO_3X4_BLUE]: 4,
  [APPLICATION_DOC_TYPES.PHOTO_4X6_WHITE]: 1,
  [APPLICATION_DOC_TYPES.CCCD_FRONT]: 1,
  [APPLICATION_DOC_TYPES.CCCD_BACK]: 1,
  [APPLICATION_DOC_TYPES.VNEID_L2]: 1,
}

export const OPTIONAL_DOCUMENT_SLOTS: Record<string, number> = {
  [APPLICATION_DOC_TYPES.GPLX_OPTIONAL]: 1,
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  [APPLICATION_DOC_TYPES.PHOTO_3X4_BLUE]: "Ảnh 3×4cm nền trắng",
  [APPLICATION_DOC_TYPES.PHOTO_4X6_WHITE]: "Ảnh 4×6cm nền trắng",
  [APPLICATION_DOC_TYPES.CCCD_FRONT]: "CCCD mặt trước",
  [APPLICATION_DOC_TYPES.CCCD_BACK]: "CCCD mặt sau",
  [APPLICATION_DOC_TYPES.VNEID_L2]: "Ảnh VNeID định danh mức 2",
  [APPLICATION_DOC_TYPES.GPLX_OPTIONAL]: "Giấy phép lái xe (nếu có)",
}

export function isValidDocType(docType: string) {
  return (
    docType in REQUIRED_DOCUMENT_SLOTS ||
    docType in OPTIONAL_DOCUMENT_SLOTS
  )
}

export function maxSlotIndex(docType: string) {
  const required = REQUIRED_DOCUMENT_SLOTS[docType] ?? 0
  const optional = OPTIONAL_DOCUMENT_SLOTS[docType] ?? 0
  return Math.max(required, optional) - 1
}
