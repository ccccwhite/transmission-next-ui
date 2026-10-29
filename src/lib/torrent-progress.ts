import { TorrentStatus, type Torrent } from "./rpc-types"

export function isCheckingTorrent(torrent: Pick<Torrent, "status">) {
  return (
    torrent.status === TorrentStatus.CHECK ||
    torrent.status === TorrentStatus.CHECK_WAIT
  )
}

export function getTorrentProgress(
  torrent: Pick<Torrent, "status" | "percentDone" | "recheckProgress">
) {
  const value =
    torrent.status === TorrentStatus.CHECK_WAIT
      ? 0
      : torrent.status === TorrentStatus.CHECK
        ? (torrent.recheckProgress ?? 0)
        : torrent.percentDone
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
}
