import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode
} from "react"
import { useLocation } from "react-router-dom"
import { useColumnManager } from "@/hooks/use-column-manager"
import { useTorrentData } from "@/hooks/use-torrent-data"
import { useTorrentFilters } from "@/hooks/use-torrent-filters"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { useSearch } from "./search-context"
import {
  getLastTorrentRoute,
  isPageSize,
  isPositiveInteger,
  isSortConfig,
  isStringArray,
  isTorrentRoute,
  isViewMode,
  writeUiState
} from "./ui-state"
import type { SortConfig } from "./torrent-list-utils"

function useWorkspace() {
  const { pathname } = useLocation()
  const { searchQuery } = useSearch()
  const [viewMode, setViewMode] = usePersistentState<"list" | "grid">(
    "torrent-view-mode",
    "list",
    isViewMode
  )
  const [sortConfig, setSortConfig] = usePersistentState<SortConfig | null>(
    "torrent-sort",
    { key: "addedDate", direction: "desc" },
    isSortConfig
  )
  const [pageSize, setPageSize] = usePersistentState(
    "torrent-page-size",
    100,
    isPageSize
  )
  const [currentPage, setCurrentPage] = usePersistentState(
    "torrent-current-page",
    1,
    isPositiveInteger
  )
  const [collapsedSections, setCollapsedSections] = usePersistentState<
    string[]
  >("torrent-filter-sections", [], isStringArray)
  const columns = useColumnManager()
  const data = useTorrentData(
    pathname === "/",
    viewMode,
    columns.visibleColumns,
    isTorrentRoute(pathname),
    sortConfig?.key
  )
  const listPath =
    window.location.hash && isTorrentRoute(pathname)
      ? pathname
      : getLastTorrentRoute()
  const statusFilter = listPath === "/" ? undefined : listPath.slice(1)
  const filters = useTorrentFilters(data.torrents, statusFilter, searchQuery)

  const signature = JSON.stringify([
    listPath,
    searchQuery,
    filters.trackerFilter,
    filters.dirFilter,
    filters.labelFilter,
    sortConfig,
    pageSize
  ])
  const previousSignature = useRef(signature)
  useEffect(() => {
    if (previousSignature.current !== signature) {
      previousSignature.current = signature
      setCurrentPage(1)
    }
  }, [signature, setCurrentPage])

  useEffect(() => {
    if (window.location.hash && isTorrentRoute(pathname))
      writeUiState("torrent-last-route", pathname)
  }, [pathname])

  return {
    ...data,
    ...columns,
    ...filters,
    viewMode,
    setViewMode,
    sortConfig,
    setSortConfig,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    collapsedSections,
    setCollapsedSections
  }
}

const TorrentWorkspaceContext = createContext<ReturnType<
  typeof useWorkspace
> | null>(null)

export function TorrentWorkspaceProvider({
  children
}: {
  children: ReactNode
}) {
  const value = useWorkspace()
  return (
    <TorrentWorkspaceContext.Provider value={value}>
      {children}
    </TorrentWorkspaceContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTorrentWorkspace() {
  const context = useContext(TorrentWorkspaceContext)
  if (!context)
    throw new Error(
      "useTorrentWorkspace must be used within TorrentWorkspaceProvider"
    )
  return context
}
