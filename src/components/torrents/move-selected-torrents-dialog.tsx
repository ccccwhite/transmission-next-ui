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
import {
  changeTorrentLocation,
  LocationChangeError
} from "@/lib/torrent-location"

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
  const [verifyAfter, setVerifyAfter] = useState(false)
  const [verificationOnly, setVerificationOnly] = useState(false)
  const [submittingVerification, setSubmittingVerification] = useState(false)
  const [busy, setBusy] = useState(false)
  async function submit() {
    if (!ids.length || !location.trim() || busy) return
    setBusy(true)
    try {
      await changeTorrentLocation({
        ids,
        location,
        move: moveData,
        verify: verifyAfter,
        verificationOnly,
        onStage: (stage) => setSubmittingVerification(stage !== "location")
      })
      toast.success(
        verifyAfter
          ? t("common.location_verify_queued")
          : t("common.move_directory_success", { count: ids.length })
      )
      onClose()
      onSuccess()
    } catch (error) {
      if (error instanceof LocationChangeError && error.stage !== "location") {
        setVerificationOnly(true)
        toast.error(
          t(
            error.stage === "verification"
              ? "common.location_verify_failed"
              : "common.location_unconfirmed"
          )
        )
      } else {
        toast.error(t("common.action_failed"))
      }
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
            disabled={busy || verificationOnly}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={moveData}
            onChange={(event) => setMoveData(event.target.checked)}
            disabled={busy || verificationOnly}
          />
          {t("common.move_existing_files")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={verifyAfter}
            onChange={(event) => setVerifyAfter(event.target.checked)}
            disabled={busy || verificationOnly}
          />
          {t("common.verify_after_location")}
        </label>
        {verifyAfter && (
          <p className="text-xs text-muted-foreground">
            {t(
              moveData
                ? "common.verify_after_move_hint"
                : "common.verify_after_relocate_hint"
            )}
          </p>
        )}
        {verificationOnly && (
          <p
            role="status"
            className="text-sm text-amber-700 dark:text-amber-400"
          >
            {t("common.verify_retry_hint")}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("common.location_path_hint")}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || !location.trim()}>
            {t(
              busy
                ? submittingVerification
                  ? "common.submitting_verify"
                  : "common.saving_location"
                : verificationOnly
                  ? "common.retry_verify"
                  : "common.save_changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
