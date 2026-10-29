"use client"

import { useState, useEffect, useCallback, useMemo, useRef, type MouseEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowDown,
  ArrowUp,
  Activity,
  Database,
  Play,
  Pause,
  Trash2,
  X,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Radio,
  Tag,
} from "lucide-react"
import { BatchReplaceTrackerDialog } from "@/components/torrents/batch-replace-tracker-dialog"
import { BatchMoveDirectoryDialog } from "@/components/torrents/batch-move-directory-dialog"
import { BatchSetLabelsSelectedDialog } from "@/components/torrents/batch-set-labels-selected-dialog"
import { useTorrentWorkspace } from "@/lib/torrent-workspace-context"
import type { Torrent } from "@/lib/rpc-types"
import { EditTorrentDialog } from "@/components/torrents/edit-torrent-dialog"
import { MoveSelectedTorrentsDialog } from "@/components/torrents/move-selected-torrents-dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { RemoveTorrentDialog } from "@/components/torrents/remove-torrent-dialog"

import { useI18n } from "@/lib/i18n-context"
import { rpc } from "@/lib/rpc-client"
import { formatSize, formatSpeed } from "@/lib/formatters"
import { useIsMobile } from "@/hooks/use-mobile"
import { TorrentListView } from "@/components/torrents/torrent-list-view"
import { TorrentGridView } from "@/components/torrents/torrent-grid-view"
import { TorrentToolbar } from "@/components/torrents/torrent-toolbar"
import {
  createTorrentActionPlan,
  type BatchTorrentAction,
  type SingleTorrentAction,
} from "@/lib/torrent-actions"
import { sortTorrents, type SortKey } from "@/lib/torrent-list-utils"

type CardColor = "green" | "blue" | "orange" | "purple"

const COLOR_CLASSES: Record<CardColor, {
  iconBg: string; iconText: string; iconHoverBg: string; iconHoverShadow: string
  titleActive: string; titleHover: string; secondary2Text: string
}> = {
  green:  { iconBg: "bg-green-500/10",  iconText: "text-green-500",  iconHoverBg: "group-hover:bg-green-500",  iconHoverShadow: "group-hover:shadow-green-500/20",  titleActive: "text-green-500/80",  titleHover: "group-hover:text-green-500/80",  secondary2Text: "text-green-500/80"  },
  blue:   { iconBg: "bg-blue-500/10",   iconText: "text-blue-500",   iconHoverBg: "group-hover:bg-blue-500",   iconHoverShadow: "group-hover:shadow-blue-500/20",   titleActive: "text-blue-500/80",   titleHover: "group-hover:text-blue-500/80",   secondary2Text: "text-blue-500/80"   },
  orange: { iconBg: "bg-orange-500/10", iconText: "text-orange-500", iconHoverBg: "group-hover:bg-orange-500", iconHoverShadow: "group-hover:shadow-orange-500/20", titleActive: "text-orange-500/80", titleHover: "group-hover:text-orange-500/80", secondary2Text: "text-orange-500/80" },
  purple: { iconBg: "bg-purple-500/10", iconText: "text-purple-500", iconHoverBg: "group-hover:bg-purple-500", iconHoverShadow: "group-hover:shadow-purple-500/20", titleActive: "text-purple-500/80", titleHover: "group-hover:text-purple-500/80", secondary2Text: "text-purple-500/80" },
}

interface StatCardProps {
  color: CardColor
  icon: ReactNode
  title: string
  value: ReactNode
  secondary1: ReactNode
  secondary2: ReactNode
  isClicked: boolean
  onClick: () => void
}

function StatCard({ color, icon, title, value, secondary1, secondary2, isClicked, onClick }: StatCardProps) {
  const c = COLOR_CLASSES[color]
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-[2rem] bg-background/40 border border-muted/5 hover:bg-background/60 transition-all group min-w-0 shadow-none cursor-pointer md:cursor-default"
      onClick={onClick}
    >
      <div className={cn(
        "h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 shadow-sm group-hover:scale-110 group-hover:text-white",
        c.iconBg, c.iconText, c.iconHoverBg, c.iconHoverShadow
      )}>
        {icon}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <p className={cn(
          "text-[11px] uppercase font-bold tracking-widest text-muted-foreground/50 leading-none mb-1.5 transition-colors",
          isClicked ? c.titleActive : c.titleHover
        )}>{title}</p>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-lg font-extrabold tracking-tight tabular-nums leading-snug [overflow-wrap:anywhere]">{value}</span>
          <div className="flex min-w-0 flex-col gap-0.5 text-[11px] leading-relaxed [overflow-wrap:anywhere]">
            <span className="text-muted-foreground/60 font-medium">{secondary1}</span>
            <span className={cn("font-medium", c.secondary2Text)}>{secondary2}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TorrentViewProps {
  title?: string
  statusFilter?: string
  showStats?: boolean
}

export function TorrentView({ showStats = true }: TorrentViewProps) {
  const isMobile = useIsMobile()
  const [rawSelectedIds, setSelectedIds] = useState<number[]>([])
  const [labelIds, setLabelIds] = useState<number[]>([])
  const [moveIds, setMoveIds] = useState<number[]>([])
  const [editingTorrent, setEditingTorrent] = useState<Torrent | null>(null)
  const selectionAnchor = useRef<number | null>(null)
  const { t, locale } = useI18n()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBatchReplaceOpen, setIsBatchReplaceOpen] = useState(false)
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false)
  const [isBatchSetLabelsOpen, setIsBatchSetLabelsOpen] = useState(false)
  const [idsToDelete, setIdsToDelete] = useState<number[]>([])
  const [clickedCard, setClickedCard] = useState<string | null>(null)
  const {
    viewMode, setViewMode, sortConfig, setSortConfig,
    pageSize, setPageSize, currentPage: savedPage, setCurrentPage,
    visibleColumns, columnDnDSensors, toggleColumn, resetVisibleColumns,
    handleColumnDragEnd, allColumns, hiddenColumns,
    orderedVisibleColumnConfigs, tableMinWidth,
    torrents, stats, freeSpace, fetchData, loaded,
    trackerFilter, dirFilter, labelFilter, toggleTracker, toggleDir,
    toggleLabel, clearFilters, trackers, downloadDirs, availableLabels, filteredTorrents,
  } = useTorrentWorkspace()
  const filteredIds = useMemo(() => new Set(filteredTorrents.map(torrent => torrent.id)), [filteredTorrents])
  const selectedIds = rawSelectedIds.filter(id => filteredIds.has(id))

  const totalDownloadSpeed = useMemo(() =>
    torrents.reduce((acc, tor) => acc + (tor.rateDownload || 0), 0)
    , [torrents])

  const totalUploadSpeed = useMemo(() =>
    torrents.reduce((acc, tor) => acc + (tor.rateUpload || 0), 0)
    , [torrents])

  const executeTorrentAction = useCallback(async (
    ids: number[],
    action: BatchTorrentAction,
    mode: "single" | "batch"
  ) => {
    const plan = createTorrentActionPlan(action, ids, mode, t)
    if (plan.type === "noop") return

    if (plan.type === "confirm-delete") {
      setIdsToDelete(plan.ids)
      setIsDeleteDialogOpen(true)
      return
    }

    try {
      switch (plan.action) {
        case "start-now":
          await rpc.startTorrentsNow(plan.ids)
          break
        case "start":
          await rpc.startTorrents(plan.ids)
          break
        case "stop":
          await rpc.stopTorrents(plan.ids)
          break
        case "verify":
          await rpc.verifyTorrents(plan.ids)
          break
        case "reannounce":
          await rpc.reannounceTorrents(plan.ids)
          break
      }

      if (plan.toast.level === "success") {
        toast.success(plan.toast.title, { description: plan.toast.description })
      } else {
        toast.info(plan.toast.title, { description: plan.toast.description })
      }

      if (plan.clearSelection) {
        setSelectedIds([])
      }
      await fetchData()
    } catch {
      toast.error(t('common.action_failed', 'Action Failed'))
    }
  }, [fetchData, t])

  const handleBatchAction = (action: BatchTorrentAction) => executeTorrentAction(selectedIds, action, "batch")

  const confirmDelete = async (deleteLocalData: boolean) => {
    try {
      await rpc.removeTorrents(idsToDelete, deleteLocalData)
      toast.success(t('common.remove_success', 'Removed'), {
        description: t('common.remove_desc', 'Selected torrents deleted')
      })
      if (idsToDelete.length > 1) {
        setSelectedIds([])
      } else {
        setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)))
      }
      setIsDeleteDialogOpen(false)
      setIdsToDelete([])
      fetchData()
    } catch {
      toast.error(t('common.action_failed', 'Action Failed'))
    }
  }

  const handleSingleAction = (id: number, action: SingleTorrentAction) =>
    executeTorrentAction([id], action, "single")

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' | null = 'asc'

    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc'
      } else if (sortConfig.direction === 'desc') {
        direction = null
      }
    }

    setSortConfig(direction === null ? null : { key, direction })
  }

  const sortedTorrents = useMemo(() => sortTorrents(filteredTorrents, sortConfig), [filteredTorrents, sortConfig])

  const totalPages = Math.ceil(sortedTorrents.length / pageSize)
  const currentPage = Math.max(1, Math.min(savedPage, totalPages || 1))
  useEffect(() => {
    if (loaded && savedPage !== currentPage) setCurrentPage(currentPage)
  }, [loaded, savedPage, currentPage, setCurrentPage])
  const paginatedTorrents = useMemo(() => {
    if (totalPages <= 1) return sortedTorrents
    const start = (currentPage - 1) * pageSize
    return sortedTorrents.slice(start, start + pageSize)
  }, [sortedTorrents, currentPage, pageSize, totalPages])

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTorrents.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredTorrents.map(t => t.id))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleRowSelect = (id: number, event: MouseEvent) => {
    if ((event.target as HTMLElement).closest("a, button, input, [data-row-action]")) return
    const anchorIndex = sortedTorrents.findIndex(torrent => torrent.id === selectionAnchor.current)
    const targetIndex = sortedTorrents.findIndex(torrent => torrent.id === id)
    if (event.shiftKey && anchorIndex >= 0 && targetIndex >= 0) {
      const range = sortedTorrents.slice(Math.min(anchorIndex, targetIndex), Math.max(anchorIndex, targetIndex) + 1).map(torrent => torrent.id)
      setSelectedIds(event.ctrlKey || event.metaKey ? Array.from(new Set([...selectedIds, ...range])) : range)
    } else if (event.ctrlKey || event.metaKey) {
      toggleSelect(id)
      selectionAnchor.current = id
    } else {
      setSelectedIds([id])
      selectionAnchor.current = id
    }
  }

  const openLabels = (ids: number[]) => {
    setLabelIds([...ids])
    setIsBatchSetLabelsOpen(true)
  }
  const contextActions = {
    selectedIds,
    onContextSelect: (id: number) => {
      if (!selectedIds.includes(id)) setSelectedIds([id])
      selectionAnchor.current = id
    },
    onContextAction: (ids: number[], action: BatchTorrentAction) => {
      void executeTorrentAction(ids, action, ids.length > 1 ? "batch" : "single")
    },
    onContextLabels: openLabels,
    onContextMove: (ids: number[]) => setMoveIds([...ids]),
    onContextEdit: setEditingTorrent,
  }

  const handleGlobalAction = async (action: "start" | "stop") => {
    try {
      if (action === "start") {
        await rpc.startTorrents([])
        toast.success(t('common.resume_all_success', 'All tasks started'))
      } else {
        await rpc.stopTorrents([])
        toast.info(t('common.pause_all_success', 'All tasks stopped'))
      }
      fetchData()
    } catch {
      toast.error(t('common.action_failed', 'Action failed'))
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      {showStats && stats && (
        <div className="p-2 md:p-2.5 bg-muted/20 backdrop-blur-xl rounded-[2.5rem] border border-muted/30 shadow-sm animate-in slide-in-from-top-4 duration-500 ease-out mb-2">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3">
            <StatCard
              color="green"
              icon={<ArrowDown className="h-5 w-5" />}
              title={t('stats.download_speed')}
              value={formatSpeed(totalDownloadSpeed)}
              secondary1={<>{t('stats.session_badge')}: {formatSize(stats["current-stats"].downloadedBytes)}</>}
              secondary2={<>{t('stats.history_badge')}: {formatSize(stats["cumulative-stats"].downloadedBytes)}</>}
              isClicked={clickedCard === "download"}
              onClick={() => setClickedCard(clickedCard === "download" ? null : "download")}
            />
            <StatCard
              color="blue"
              icon={<ArrowUp className="h-5 w-5" />}
              title={t('stats.upload_speed')}
              value={formatSpeed(totalUploadSpeed)}
              secondary1={<>{t('stats.session_badge')}: {formatSize(stats["current-stats"].uploadedBytes)}</>}
              secondary2={<>{t('stats.history_badge')}: {formatSize(stats["cumulative-stats"].uploadedBytes)}</>}
              isClicked={clickedCard === "upload"}
              onClick={() => setClickedCard(clickedCard === "upload" ? null : "upload")}
            />
            <StatCard
              color="orange"
              icon={<Activity className="h-5 w-5" />}
              title={t('stats.active_torrents')}
              value={stats.activeTorrentCount}
              secondary1={<>{t('stats.total_tasks')}: {stats.torrentCount}</>}
              secondary2={<>{t('stats.paused_tasks')}: {stats.pausedTorrentCount}</>}
              isClicked={clickedCard === "activity"}
              onClick={() => setClickedCard(clickedCard === "activity" ? null : "activity")}
            />
            <StatCard
              color="purple"
              icon={<Database className="h-5 w-5" />}
              title={t('stats.free_space')}
              value={freeSpace ? formatSize(freeSpace["size-bytes"]) : "---"}
              secondary1={freeSpace ? <>{((freeSpace["size-bytes"] / freeSpace.total_size) * 100).toFixed(0)}% {t('stats.free_unit')}</> : null}
              secondary2={freeSpace ? <>{t('stats.total_label')}: {formatSize(freeSpace.total_size)}</> : null}
              isClicked={clickedCard === "space"}
              onClick={() => setClickedCard(clickedCard === "space" ? null : "space")}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <TorrentToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          trackers={trackers}
          downloadDirs={downloadDirs}
          availableLabels={availableLabels}
          trackerFilter={trackerFilter}
          dirFilter={dirFilter}
          labelFilter={labelFilter}
          toggleTracker={toggleTracker}
          toggleDir={toggleDir}
          toggleLabel={toggleLabel}
          clearFilters={clearFilters}
          orderedVisibleColumnConfigs={orderedVisibleColumnConfigs}
          visibleColumns={visibleColumns}
          hiddenColumns={hiddenColumns}
          isMobile={isMobile}
          columnDnDSensors={columnDnDSensors}
          toggleColumn={toggleColumn}
          resetVisibleColumns={resetVisibleColumns}
          handleColumnDragEnd={handleColumnDragEnd}
          onBatchReplaceOpen={() => setIsBatchReplaceOpen(true)}
          onBatchMoveOpen={() => setIsBatchMoveOpen(true)}
          fetchData={fetchData}
          onGlobalAction={handleGlobalAction}
        />

        {viewMode === "list" ? (
          <TorrentListView
            paginatedTorrents={paginatedTorrents}
            visibleColumns={visibleColumns}
            allColumns={allColumns}
            selectedIds={selectedIds}
            filteredCount={filteredTorrents.length}
            sortConfig={sortConfig}
            tableMinWidth={tableMinWidth}
            locale={locale}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onSort={handleSort}
            onSingleAction={handleSingleAction}
            contextActions={contextActions}
            onRowSelect={handleRowSelect}
            onRefresh={fetchData}
          />
        ) : (
          <TorrentGridView
            paginatedTorrents={paginatedTorrents}
            onSingleAction={handleSingleAction}
            contextActions={contextActions}
            onRowSelect={handleRowSelect}
            onRefresh={fetchData}
          />
        )}

        {sortedTorrents.length >= 50 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 pb-10">
            <div className="flex flex-col sm:flex-row items-center gap-4 order-2 sm:order-1">
              <div className="text-sm font-medium text-muted-foreground">
                {t('common.showing', 'Showing')} <span className="text-foreground">{(currentPage - 1) * pageSize + 1}</span> - <span className="text-foreground">{Math.min(currentPage * pageSize, sortedTorrents.length)}</span> {t('common.of', 'of')} <span className="text-foreground">{sortedTorrents.length}</span> {t('common.torrents_total', 'torrents')}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{t('common.page_size', 'Size')}:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                      {pageSize >= 9999 ? t('common.all', 'All') : pageSize}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-xl border border-muted/50 bg-card/95 backdrop-blur-xl p-1 min-w-[70px]">
                    {[50, 100, 200, 500, 9999].map((size) => (
                      <DropdownMenuItem
                        key={size}
                        className={cn(
                          "rounded-lg text-xs font-bold py-1.5 px-3 cursor-pointer",
                          pageSize === size && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => setPageSize(size)}
                      >
                        {size >= 9999 ? t('common.all', 'All') : size}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-muted/20 hover:bg-muted/50 hidden sm:flex"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-muted/20 hover:bg-muted/50"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1 px-4">
                  <span className="text-sm font-bold text-primary">{currentPage}</span>
                  <span className="text-sm font-medium text-muted-foreground">/</span>
                  <span className="text-sm font-bold text-muted-foreground">{totalPages}</span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-muted/20 hover:bg-muted/50"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-muted/20 hover:bg-muted/50 hidden sm:flex"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-300 w-full max-w-[calc(100%-2rem)] md:max-w-fit px-2 sm:px-0">
          <div className="bg-background/80 backdrop-blur-xl border border-primary/20 shadow-[0_8px_40px_rgba(var(--primary),0.15)] rounded-[2.5rem] px-3 py-2.5 md:px-6 md:py-4 flex items-center gap-2 md:gap-6 min-w-0 md:min-w-[400px] justify-between md:justify-start">
            <div className="flex items-center gap-2 border-r pr-3 md:pr-6 mr-1 md:mr-2 shrink-0">
              <div className="bg-primary text-primary-foreground text-[10px] md:text-xs font-bold h-5 w-5 md:h-6 md:w-6 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                {selectedIds.length}
              </div>
              <span className="text-sm font-bold tracking-tight hidden lg:inline">{t('common.selected')}</span>
            </div>

            <div className="flex items-center gap-1.5 xl:gap-3 flex-1 min-w-0 overflow-x-auto no-scrollbar justify-center md:justify-start">
              <Button size="sm" className="h-9 md:h-10 rounded-2xl md:rounded-xl font-bold gap-1.5 md:gap-2 px-2.5 md:px-4" onClick={() => handleBatchAction("start")}>
                <Play className="h-4 w-4" />
                <span className="hidden xl:inline">{t('common.resume')}</span>
              </Button>
              <Button size="sm" variant="secondary" className="h-9 md:h-10 rounded-2xl md:rounded-xl font-bold gap-1.5 md:gap-2 px-2.5 md:px-4" onClick={() => handleBatchAction("stop")}>
                <Pause className="h-4 w-4" />
                <span className="hidden xl:inline">{t('common.pause')}</span>
              </Button>
              <Button size="sm" variant="ghost" className="h-9 md:h-10 rounded-2xl md:rounded-xl font-bold gap-1.5 md:gap-2 px-2.5 md:px-4 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleBatchAction("remove")}>
                <Trash2 className="h-4 w-4" />
                <span className="hidden xl:inline">{t('common.remove')}</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-9 md:h-10 rounded-2xl md:rounded-xl font-bold gap-1.5 md:gap-2 px-2.5 md:px-4 bg-muted/50 hover:bg-muted/70">
                    <MoreVertical className="h-4 w-4" />
                    <span className="hidden xl:inline">{t('common.more', 'More')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={12} className="w-[200px] rounded-2xl border border-muted/50 bg-card/95 backdrop-blur-xl shadow-2xl p-1">
                  <DropdownMenuItem
                    className="rounded-xl py-2.5 px-3 cursor-pointer gap-3 font-medium focus:bg-muted"
                    onClick={() => handleBatchAction("verify")}
                  >
                    <ShieldCheck className="h-4 w-4 opacity-60" />
                    {t('common.verify', 'Verify')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl py-2.5 px-3 cursor-pointer gap-3 font-medium focus:bg-muted"
                    onClick={() => handleBatchAction("reannounce")}
                  >
                    <Radio className="h-4 w-4 opacity-60" />
                    {t('common.reannounce', 'Reannounce')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl py-2.5 px-3 cursor-pointer gap-3 font-medium focus:bg-muted"
                    onClick={() => openLabels(selectedIds)}
                  >
                    <Tag className="h-4 w-4 opacity-60" />
                    {t('common.set_torrent_labels')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 md:h-9 md:w-9 rounded-full shrink-0 hover:bg-muted/50"
              onClick={() => setSelectedIds([])}
            >
              <X className="h-4 w-4 opacity-50" />
            </Button>
          </div>
        </div>
      )}

      {editingTorrent && <EditTorrentDialog torrent={editingTorrent} open onOpenChange={open => { if (!open) setEditingTorrent(null) }} onSuccess={fetchData} />}
      {moveIds.length > 0 && <MoveSelectedTorrentsDialog ids={moveIds} onClose={() => setMoveIds([])} onSuccess={fetchData} />}

      <RemoveTorrentDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        count={idsToDelete.length}
      />

      <BatchReplaceTrackerDialog
        open={isBatchReplaceOpen}
        onOpenChange={setIsBatchReplaceOpen}
        onSuccess={fetchData}
      />

      <BatchMoveDirectoryDialog
        open={isBatchMoveOpen}
        onOpenChange={setIsBatchMoveOpen}
        onSuccess={fetchData}
      />

      <BatchSetLabelsSelectedDialog
        open={isBatchSetLabelsOpen}
        onOpenChange={setIsBatchSetLabelsOpen}
        selectedIds={labelIds}
        onSuccess={fetchData}
      />
    </div>
  )
}
