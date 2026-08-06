import { useEffect, useMemo, useState } from "react"

export const ADMIN_PAGE_SIZE = 10

export function usePagination(items, pageSize = ADMIN_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const activePage = Math.min(page, pageCount)

  useEffect(() => {
    setPage(1)
  }, [items, pageSize])

  const pageItems = useMemo(
    () => items.slice((activePage - 1) * pageSize, activePage * pageSize),
    [activePage, items, pageSize],
  )

  return { page: activePage, pageCount, pageItems, pageSize, setPage }
}
