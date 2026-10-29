import { beforeEach, expect, test, vi } from "vitest"
import { rpc } from "./rpc-client"
import { changeTorrentLocation } from "./torrent-location"
import { MOCK_TORRENTS } from "./mock-data"

vi.mock("@/lib/rpc-client", () => ({
  rpc: {
    setTorrentLocation: vi.fn(),
    getTorrents: vi.fn(),
    verifyTorrents: vi.fn()
  }
}))

beforeEach(() => {
  vi.mocked(rpc.setTorrentLocation).mockReset().mockResolvedValue({})
  vi.mocked(rpc.getTorrents)
    .mockReset()
    .mockResolvedValue({
      torrents: [
        { ...MOCK_TORRENTS[0], id: 1, downloadDir: "/hdd/site", error: 0 }
      ]
    })
  vi.mocked(rpc.verifyTorrents).mockReset().mockResolvedValue({})
})

test("verification remains optional", async () => {
  await changeTorrentLocation({
    ids: [1],
    location: "/hdd/site",
    move: true,
    verify: false
  })
  expect(rpc.setTorrentLocation).toHaveBeenCalledWith([1], "/hdd/site", true)
  expect(rpc.getTorrents).not.toHaveBeenCalled()
  expect(rpc.verifyTorrents).not.toHaveBeenCalled()
})

test.each([true, false])(
  "waits for location result, then confirms the destination before verification (move=%s)",
  async (move) => {
    let resolveMove!: (value: Record<string, never>) => void
    vi.mocked(rpc.setTorrentLocation).mockReturnValue(
      new Promise((resolve) => {
        resolveMove = resolve
      })
    )
    const result = changeTorrentLocation({
      ids: [1],
      location: "/hdd/site/",
      move,
      verify: true
    })
    expect(rpc.verifyTorrents).not.toHaveBeenCalled()
    expect(rpc.getTorrents).not.toHaveBeenCalled()
    resolveMove({})
    await result
    expect(rpc.setTorrentLocation).toHaveBeenCalledWith([1], "/hdd/site/", move)
    expect(rpc.getTorrents).toHaveBeenCalledWith(
      ["id", "downloadDir", "error", "errorString"],
      [1]
    )
    expect(rpc.verifyTorrents).toHaveBeenCalledWith([1])
    expect(vi.mocked(rpc.getTorrents).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(rpc.verifyTorrents).mock.invocationCallOrder[0]
    )
  }
)

test("never verifies after a failed location request", async () => {
  vi.mocked(rpc.setTorrentLocation).mockRejectedValue(
    new Error("connection lost")
  )
  await expect(
    changeTorrentLocation({
      ids: [1],
      location: "/hdd/site",
      move: true,
      verify: true
    })
  ).rejects.toMatchObject({ stage: "location" })
  expect(rpc.verifyTorrents).not.toHaveBeenCalled()
})

test.each(["wrong path", "local move error", "missing task"])(
  "RPC success alone does not permit verification: %s",
  async (reason) => {
    vi.mocked(rpc.getTorrents).mockResolvedValue({
      torrents:
        reason === "missing task"
          ? []
          : [
              {
                ...MOCK_TORRENTS[0],
                id: 1,
                downloadDir: reason === "wrong path" ? "/temp" : "/hdd/site",
                error: reason === "local move error" ? 3 : 0
              }
            ]
    })
    await expect(
      changeTorrentLocation({
        ids: [1],
        location: "/hdd/site",
        move: true,
        verify: true
      })
    ).rejects.toMatchObject({ stage: "confirmation" })
    expect(rpc.verifyTorrents).not.toHaveBeenCalled()
  }
)

test("updating location without a move can verify to clear an existing missing-file error", async () => {
  vi.mocked(rpc.getTorrents).mockResolvedValue({
    torrents: [
      { ...MOCK_TORRENTS[0], id: 1, downloadDir: "/hdd/site", error: 3 }
    ]
  })
  await changeTorrentLocation({
    ids: [1],
    location: "/hdd/site",
    move: false,
    verify: true
  })
  expect(rpc.verifyTorrents).toHaveBeenCalledWith([1])
})

test("requires every selected torrent to reach its destination", async () => {
  await expect(
    changeTorrentLocation({
      ids: [1, 2],
      location: "/hdd/site",
      move: true,
      verify: true
    })
  ).rejects.toMatchObject({ stage: "confirmation" })
  expect(rpc.verifyTorrents).not.toHaveBeenCalled()
})

test("retrying verification does not move the files again", async () => {
  vi.mocked(rpc.verifyTorrents).mockRejectedValueOnce(
    new Error("network error")
  )
  const args = { ids: [1], location: "/hdd/site", move: true, verify: true }
  await expect(changeTorrentLocation(args)).rejects.toMatchObject({
    stage: "verification"
  })
  await changeTorrentLocation({ ...args, verificationOnly: true })
  expect(rpc.setTorrentLocation).toHaveBeenCalledTimes(1)
  expect(rpc.verifyTorrents).toHaveBeenCalledTimes(2)
})

test("an empty selection must never turn into verification of all torrents", async () => {
  await expect(
    changeTorrentLocation({
      ids: [],
      location: "/hdd/site",
      move: false,
      verify: true
    })
  ).rejects.toMatchObject({ stage: "location" })
  expect(rpc.setTorrentLocation).not.toHaveBeenCalled()
  expect(rpc.verifyTorrents).not.toHaveBeenCalled()
})
