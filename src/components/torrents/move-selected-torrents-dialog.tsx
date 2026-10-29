import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LocationInput } from "@/components/location-input"
import { useI18n } from "@/lib/i18n-context"
import { rpc } from "@/lib/rpc-client"

export function MoveSelectedTorrentsDialog({
  ids,
  onClose,
  onSuccess
}: {
  ids: number[]
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useI18n()
  const [location, setLocation] = useState("")
  const [moveData, setMoveData] = useState(true)
  const [busy, setBusy] = useState(false)
  async function submit() {
    if (!ids.length || !location.trim() || busy) return
    setBusy(true)
    try {
      await rpc.setTorrentLocation(ids, location.trim(), moveData)
      toast.success(t("common.move_directory_success", { count: ids.length }))
      onClose()
      onSuccess()
    } catch {
      toast.error(t("common.action_failed"))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("common.set_location")}</DialogTitle>
          <DialogDescription>
            {t("common.selected_count", { count: ids.length })}
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2 text-sm">
          <span>{t("common.new_directory")}</span>
          <LocationInput
            value={location}
            onChange={setLocation}
            disabled={busy}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={moveData}
            onChange={(event) => setMoveData(event.target.checked)}
            disabled={busy}
          />
          {t("common.move_existing_files")}
        </label>
        <p className="text-xs text-muted-foreground">
          {t("common.location_path_hint")}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || !location.trim()}>
            {t("common.save_changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
