"use client"

import * as React from "react"
import { RefreshCw, ListCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TorrentLabelPicker } from "./torrent-label-picker"
import { toast } from "sonner"
import { rpc } from "@/lib/rpc-client"
import { parseTorrentLabels, serializeTorrentLabels } from "@/lib/torrent-labels"
import { useI18n } from "@/lib/i18n-context"

interface BatchSetLabelsSelectedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: number[]
  onSuccess?: () => void
}

export function BatchSetLabelsSelectedDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BatchSetLabelsSelectedDialogProps) {
  const [labels, setLabels] = React.useState<string[]>([])
  const [mode, setMode] = React.useState<"overwrite" | "append">("overwrite")
  const [isApplying, setIsApplying] = React.useState(false)
  const [availableLabels, setAvailableLabels] = React.useState<string[]>([])
  const [loadingLabels, setLoadingLabels] = React.useState(false)
  const [labelsLoadFailed, setLabelsLoadFailed] = React.useState(false)
  const { t } = useI18n()

  React.useEffect(() => {
    if (!open) return
    let active = true
    const fetchLabels = async () => {
      setLoadingLabels(true)
      setLabelsLoadFailed(false)
      try {
        const { torrents } = await rpc.getTorrents(["labels"])
        const labelSet = new Set(torrents.flatMap(torrent => parseTorrentLabels(torrent.labels)))
        if (active) setAvailableLabels(Array.from(labelSet).sort())
      } catch (error) {
        console.error("Failed to fetch labels:", error)
        if (active) setLabelsLoadFailed(true)
      } finally {
        if (active) setLoadingLabels(false)
      }
    }
    void fetchLabels()
    return () => { active = false }
  }, [open])

  const handleApply = async () => {
    if (isApplying || !selectedIds.length || !labels.length) return
    setIsApplying(true)
    let successCount = 0
    try {
      if (mode === "overwrite") {
        await rpc.setTorrent(selectedIds, { labels: serializeTorrentLabels(labels) })
        successCount = selectedIds.length
      } else {
        const { torrents } = await rpc.getTorrents(["id", "labels"])
        const torrentMap = new Map<number, string[]>()
        torrents.forEach((tor: { id: number; labels?: string[] }) => {
          torrentMap.set(tor.id, tor.labels ?? [])
        })

        for (const id of selectedIds) {
          try {
            const existing = parseTorrentLabels(torrentMap.get(id))
            const merged = Array.from(new Set([...existing, ...labels]))
            await rpc.setTorrent([id], { labels: serializeTorrentLabels(merged) })
            successCount++
          } catch (e) {
            console.error(`Failed to set labels for torrent ${id}:`, e)
          }
        }
      }

      toast.success(t("common.set_labels_success", { count: successCount }))
      onOpenChange(false)
      onSuccess?.()
      resetState()
    } catch (error) {
      console.error("Batch set labels failed:", error)
      toast.error(t("common.action_failed"))
    } finally {
      setIsApplying(false)
    }
  }

  const resetState = () => {
    setLabels([])
    setMode("overwrite")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isApplying) {
          onOpenChange(v)
          if (!v) resetState()
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl bg-card border border-muted/20 p-0 overflow-hidden flex flex-col max-h-[calc(100svh-2rem)]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-muted/50 bg-muted/20 shrink-0">
          <div>
            <DialogTitle className="text-2xl font-medium tracking-tight">
              {t("common.set_torrent_labels")}
            </DialogTitle>
            <DialogDescription className="text-base font-medium opacity-70">
              {t("common.set_torrent_labels_desc", { count: selectedIds.length })}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Mode toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
              {t("common.set_labels_mode")}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isApplying}
                onClick={() => setMode("overwrite")}
                className={`flex-1 h-10 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border ${
                  mode === "overwrite"
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "bg-muted/30 text-muted-foreground border-muted/30 hover:bg-muted/50"
                }`}
              >
                {t("common.set_labels_overwrite")}
              </button>
              <button
                type="button"
                disabled={isApplying}
                onClick={() => setMode("append")}
                className={`flex-1 h-10 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border ${
                  mode === "append"
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "bg-muted/30 text-muted-foreground border-muted/30 hover:bg-muted/50"
                }`}
              >
                {t("common.set_labels_append")}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/50 px-1">
              {mode === "overwrite"
                ? t("common.set_labels_overwrite_hint")
                : t("common.set_labels_append_hint")}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">{t("common.labels")}</p>
            <TorrentLabelPicker labels={labels} onChange={setLabels} availableLabels={availableLabels} disabled={isApplying} loading={loadingLabels} loadFailed={labelsLoadFailed} />
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/10 border-t border-muted/50 shrink-0">
          <Button
            className="w-full h-12 rounded-2xl font-medium tracking-widest uppercase transition-all shadow-lg shadow-primary/20 bg-primary hover:scale-[1.01] active:scale-[0.99] text-xs"
            onClick={handleApply}
            disabled={isApplying || !selectedIds.length || labels.length === 0}
          >
            {isApplying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ListCheck className="h-4 w-4 mr-2" />
                {t("common.set_labels_confirm", { count: selectedIds.length })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
