import { rpc } from "@/lib/rpc-client"

export type LocationChangeStage = "location" | "confirmation" | "verification"

export class LocationChangeError extends Error {
  constructor(
    public readonly stage: LocationChangeStage,
    cause: unknown
  ) {
    super("Location change or verification could not be confirmed", { cause })
  }
}

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/"

export async function changeTorrentLocation({
  ids,
  location,
  move,
  verify,
  verificationOnly = false,
  onStage
}: {
  ids: number[]
  location: string
  move: boolean
  verify: boolean
  verificationOnly?: boolean
  onStage?: (stage: LocationChangeStage) => void
}) {
  let stage: LocationChangeStage = "location"
  try {
    if (!ids.length || !location.trim())
      throw new Error("Missing torrent IDs or location")
    if (!verificationOnly) {
      onStage?.(stage)
      await rpc.setTorrentLocation(ids, location.trim(), move)
    }
    if (!verify) return

    stage = "confirmation"
    onStage?.(stage)
    // Transmission can report RPC success even when a physical move failed.
    // A fresh torrent-get runs after the move on its session thread. Confirm
    // every selected task reached the destination before requesting verification.
    const result = await rpc.getTorrents(
      ["id", "downloadDir", "error", "errorString"],
      ids
    )
    const byId = new Map(
      result.torrents.map((torrent) => [torrent.id, torrent])
    )
    if (
      !ids.every((id) => {
        const torrent = byId.get(id)
        return (
          torrent &&
          typeof torrent.downloadDir === "string" &&
          normalizePath(torrent.downloadDir) ===
            normalizePath(location.trim()) &&
          (!move || torrent.error !== 3)
        )
      })
    )
      throw new Error("Destination not confirmed or local move error reported")

    stage = "verification"
    onStage?.(stage)
    await rpc.verifyTorrents(ids)
  } catch (error) {
    throw new LocationChangeError(stage, error)
  }
}
