import { expect, test } from "vitest"
import { getTorrentProgress, isCheckingTorrent } from "./torrent-progress"
import { getRequiredRpcFields } from "./columns"
import { getTorrentSortValue } from "./torrent-list-utils"
import { MOCK_TORRENTS } from "./mock-data"

test("checking displays verification progress even when download is 100%", () => {
  const torrent = {
    ...MOCK_TORRENTS[0],
    status: 2,
    percentDone: 1,
    recheckProgress: 0.42
  }
  expect(isCheckingTorrent(torrent)).toBe(true)
  expect(getTorrentProgress(torrent)).toBe(0.42)
  expect(getTorrentSortValue(torrent, "percentDone")).toBe(0.42)
})

test("queued checks start at zero and completed checks return to download progress", () => {
  expect(
    getTorrentProgress({ status: 1, percentDone: 1, recheckProgress: 0.9 })
  ).toBe(0)
  expect(
    getTorrentProgress({ status: 6, percentDone: 1, recheckProgress: 0.42 })
  ).toBe(1)
  expect(
    getTorrentProgress({ status: 4, percentDone: 0.6, recheckProgress: 1 })
  ).toBe(0.6)
  expect(getTorrentProgress({ status: 2, percentDone: 1 })).toBe(0)
})

test("missing or invalid verification progress never renders NaN or an overflowing bar", () => {
  expect(
    getTorrentProgress({ status: 2, percentDone: 1, recheckProgress: NaN })
  ).toBe(0)
  expect(
    getTorrentProgress({ status: 2, percentDone: 1, recheckProgress: 2 })
  ).toBe(1)
  expect(
    getTorrentProgress({ status: 2, percentDone: 1, recheckProgress: -0.1 })
  ).toBe(0)
})

test("both views request verification progress independently of visible columns", () => {
  expect(getRequiredRpcFields(["name"], "list")).toContain("recheckProgress")
  expect(getRequiredRpcFields([], "grid")).toContain("recheckProgress")
})
