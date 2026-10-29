import { useMemo, type MouseEvent } from "react"
import { ChevronDown } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTorrentWorkspace } from "@/lib/torrent-workspace-context"
import { useI18n } from "@/lib/i18n-context"
import { getLastTorrentRoute, isTorrentRoute } from "@/lib/ui-state"
import { parseTorrentLabels } from "@/lib/torrent-labels"
import { cn } from "@/lib/utils"
import { UNLABELED_FILTER } from "@/lib/torrent-list-utils"

interface FilterSectionProps {
  title: string
  values: string[]
  selected: string[]
  counts: Map<string, number>
  total: number
  collapsed: boolean
  onToggle: () => void
  onSelect: (values: string[]) => void
}

export function SidebarFilterSection({
  title,
  values,
  selected,
  counts,
  total,
  collapsed,
  onToggle,
  onSelect
}: FilterSectionProps) {
  const { t } = useI18n()
  function select(event: MouseEvent, value: string) {
    onSelect(
      event.ctrlKey || event.metaKey
        ? selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value]
        : [value]
    )
  }
  const itemClass = (active: boolean) =>
    cn(
      "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring",
      active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
    )
  return (
    <section aria-label={title} className="px-2 py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 px-2 py-2 text-xs font-semibold text-muted-foreground"
      >
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            collapsed && "-rotate-90"
          )}
        />
        <span className="truncate">{title}</span>
        {selected.length > 0 && (
          <span className="ml-auto rounded bg-primary/10 px-1.5 text-primary">
            {selected.length}
          </span>
        )}
      </button>
      {!collapsed && (
        <div className="space-y-0.5">
          <button
            type="button"
            className={itemClass(selected.length === 0)}
            aria-label={`${t("common.all")} (${total})`}
            aria-pressed={selected.length === 0}
            onClick={() => onSelect([])}
          >
            <span className="flex-1">{t("common.all", "All")}</span>
            <span className="tabular-nums text-muted-foreground">{total}</span>
          </button>
          {Array.from(new Set([...values, ...selected])).map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value === UNLABELED_FILTER ? t("common.unlabeled") : value} (${counts.get(value) ?? 0})`}
              title={value === UNLABELED_FILTER ? t("common.unlabeled") : value}
              className={itemClass(selected.includes(value))}
              aria-pressed={selected.includes(value)}
              onClick={(event) => select(event, value)}
            >
              <span className="min-w-0 flex-1 truncate">
                {value === UNLABELED_FILTER ? t("common.unlabeled") : value}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {counts.get(value) ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export function SidebarFilters() {
  const workspace = useTorrentWorkspace()
  const {
    torrents,
    trackers,
    downloadDirs,
    availableLabels,
    trackerFilter,
    dirFilter,
    labelFilter,
    setTrackerFilter,
    setDirFilter,
    setLabelFilter,
    clearFilters,
    collapsedSections,
    setCollapsedSections
  } = workspace
  const { t } = useI18n()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const counts = useMemo(() => {
    const trackers = new Map<string, number>()
    const dirs = new Map<string, number>()
    const labels = new Map<string, number>()
    const add = (map: Map<string, number>, value: string) =>
      map.set(value, (map.get(value) ?? 0) + 1)
    for (const torrent of torrents) {
      for (const host of new Set(
        torrent.trackerStats?.map((stat) => stat.host).filter(Boolean)
      ))
        add(trackers, host)
      if (torrent.downloadDir) add(dirs, torrent.downloadDir)
      const normalizedLabels = parseTorrentLabels(torrent.labels)
      for (const label of new Set(
        normalizedLabels.length ? normalizedLabels : [UNLABELED_FILTER]
      ))
        add(labels, label)
    }
    return { trackers, dirs, labels }
  }, [torrents])
  const hasFilters =
    trackerFilter.length + dirFilter.length + labelFilter.length > 0
  const groups = [
    {
      id: "labels",
      title: t("common.filter_by_label", "Labels"),
      values: [UNLABELED_FILTER, ...availableLabels],
      selected: labelFilter,
      counts: counts.labels,
      set: setLabelFilter
    },
    {
      id: "trackers",
      title: t("common.filter_by_tracker", "Trackers"),
      values: trackers,
      selected: trackerFilter,
      counts: counts.trackers,
      set: setTrackerFilter
    },
    {
      id: "dirs",
      title: t("common.filter_by_dir", "Directories"),
      values: downloadDirs,
      selected: dirFilter,
      counts: counts.dirs,
      set: setDirFilter
    }
  ]
  return (
    <div className="border-t border-sidebar-border py-2 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between px-4 py-1">
        <span className="text-xs font-semibold text-muted-foreground">
          {t("common.filters")}
        </span>
        {hasFilters && (
          <button
            className="text-xs text-primary hover:underline"
            onClick={clearFilters}
          >
            {t("common.clear")}
          </button>
        )}
      </div>
      <p className="px-4 pb-1 text-[10px] text-muted-foreground">
        {t("common.filter_multiselect_hint")}
      </p>
      {groups.map((group) => (
        <SidebarFilterSection
          key={group.id}
          {...group}
          total={torrents.length}
          collapsed={collapsedSections.includes(group.id)}
          onToggle={() =>
            setCollapsedSections((previous) =>
              previous.includes(group.id)
                ? previous.filter((id) => id !== group.id)
                : [...previous, group.id]
            )
          }
          onSelect={(values) => {
            group.set(values)
            if (!isTorrentRoute(pathname)) navigate(getLastTorrentRoute())
          }}
        />
      ))}
    </div>
  )
}
