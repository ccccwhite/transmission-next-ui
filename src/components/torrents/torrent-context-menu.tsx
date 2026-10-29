import { ContextMenu } from "radix-ui"
import {
  FileText,
  FolderOpen,
  Pause,
  Pencil,
  Play,
  Radio,
  ShieldCheck,
  Tag,
  Trash2,
  Zap
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { ReactNode } from "react"
import type { Torrent } from "@/lib/rpc-types"
import type { BatchTorrentAction } from "@/lib/torrent-actions"
import { useI18n } from "@/lib/i18n-context"

export interface TorrentContextActions {
  selectedIds: number[]
  onContextSelect: (id: number) => void
  onContextAction: (ids: number[], action: BatchTorrentAction) => void
  onContextLabels: (ids: number[]) => void
  onContextMove: (ids: number[]) => void
  onContextEdit: (torrent: Torrent) => void
}

export function TorrentContextMenu({
  torrent,
  children,
  selectedIds,
  onContextSelect,
  onContextAction,
  onContextLabels,
  onContextMove,
  onContextEdit
}: TorrentContextActions & { torrent: Torrent; children: ReactNode }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const ids = selectedIds.includes(torrent.id) ? selectedIds : [torrent.id]
  const itemClass =
    "flex cursor-default select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
  const actions = [
    { action: "start", label: t("common.resume"), icon: Play },
    { action: "start-now", label: t("common.force_resume"), icon: Zap },
    { action: "stop", label: t("common.pause"), icon: Pause },
    { action: "verify", label: t("common.verify"), icon: ShieldCheck },
    { action: "reannounce", label: t("common.reannounce"), icon: Radio }
  ] as const
  return (
    <ContextMenu.Root
      onOpenChange={(open) => {
        if (open) onContextSelect(torrent.id)
      }}
    >
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          collisionPadding={8}
          className="z-50 min-w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <ContextMenu.Label className="max-w-72 truncate px-3 py-2 text-xs text-muted-foreground">
            {ids.length > 1
              ? t("common.selected_count", { count: ids.length })
              : torrent.name}
          </ContextMenu.Label>
          {actions.map(({ action, label, icon: Icon }) => (
            <ContextMenu.Item
              key={action}
              className={itemClass}
              onSelect={() => onContextAction(ids, action)}
            >
              <Icon className="size-4" />
              {label}
            </ContextMenu.Item>
          ))}
          <ContextMenu.Separator className="my-1 h-px bg-border" />
          <ContextMenu.Item
            className={itemClass}
            onSelect={() => onContextLabels(ids)}
          >
            <Tag className="size-4" />
            {t("common.set_torrent_labels")}
          </ContextMenu.Item>
          <ContextMenu.Item
            className={itemClass}
            onSelect={() => onContextMove(ids)}
          >
            <FolderOpen className="size-4" />
            {t("common.set_location")}
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={ids.length !== 1}
            className={itemClass}
            onSelect={() => onContextEdit(torrent)}
          >
            <Pencil className="size-4" />
            {t("common.edit_torrent")}
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={ids.length !== 1}
            className={itemClass}
            onSelect={() => navigate(`/torrents/detail?id=${torrent.id}`)}
          >
            <FileText className="size-4" />
            {t("common.torrent_details")}
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-border" />
          <ContextMenu.Item
            className={`${itemClass} text-destructive focus:text-destructive`}
            onSelect={() => onContextAction(ids, "remove")}
          >
            <Trash2 className="size-4" />
            {t("common.remove")}
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
