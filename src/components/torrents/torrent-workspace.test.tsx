import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "@/App"
import { rpc } from "@/lib/rpc-client"
import { MOCK_SESSION, MOCK_STATS, MOCK_TORRENTS } from "@/lib/mock-data"
import type { Torrent } from "@/lib/rpc-types"
import { restoreTorrentRoute, writeUiState } from "@/lib/ui-state"

vi.mock("@/lib/rpc-client", () => ({
  rpc: {
    getTorrents: vi.fn(),
    getSession: vi.fn(),
    getStats: vi.fn(),
    freeSpace: vi.fn(),
    startTorrents: vi.fn(),
    startTorrentsNow: vi.fn(),
    stopTorrents: vi.fn(),
    verifyTorrents: vi.fn(),
    reannounceTorrents: vi.fn(),
    removeTorrents: vi.fn(),
    setTorrentLocation: vi.fn(),
    setTorrent: vi.fn()
  }
}))

const torrents: Torrent[] = [
  {
    ...MOCK_TORRENTS[0],
    id: 1,
    name: "Alpha",
    status: 6,
    labels: ["mteam", "storage:hdd"],
    downloadDir: "/hdd/mteam",
    trackerStats: []
  },
  {
    ...MOCK_TORRENTS[0],
    id: 2,
    name: "Beta",
    status: 0,
    labels: ["other"],
    downloadDir: "/temp/other",
    trackerStats: []
  },
  {
    ...MOCK_TORRENTS[0],
    id: 3,
    name: "Gamma",
    status: 6,
    labels: [],
    downloadDir: "/hdd/mteam",
    trackerStats: []
  }
]

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, "", "/#/")
  vi.mocked(rpc.getTorrents).mockImplementation(async (_fields, ids) => ({
    torrents: ids
      ? torrents.filter((torrent) => ids.includes(torrent.id))
      : torrents
  }))
  vi.mocked(rpc.getSession).mockResolvedValue(MOCK_SESSION)
  vi.mocked(rpc.getStats).mockResolvedValue(MOCK_STATS)
  vi.mocked(rpc.freeSpace).mockResolvedValue({
    path: "/",
    "size-bytes": 100,
    total_size: 200
  })
})

async function getRow(name: string) {
  return (await screen.findByRole("link", { name })).closest("tr")!
}

describe("torrent workspace", () => {
  it("restores the last page when the bare URL is opened in the same tab", async () => {
    render(<App />)
    await getRow("Alpha")
    fireEvent.click(screen.getByRole("link", { name: /^Seeding/ }))
    await waitFor(() =>
      expect(localStorage.getItem("torrent-last-route")).toBe('"/seeding"')
    )
    act(() => {
      window.history.replaceState(null, "", "/")
      window.dispatchEvent(new PopStateEvent("popstate"))
    })
    await waitFor(() => expect(window.location.hash).toBe("#/seeding"))
    expect(screen.queryByRole("link", { name: "Beta" })).not.toBeInTheDocument()
  })

  it("supports right-click actions in the restored card view", async () => {
    writeUiState("torrent-view-mode", "grid")
    render(<App />)
    const card = (await screen.findByRole("link", { name: "Beta" })).closest(
      '[data-slot="card"]'
    )!
    fireEvent.contextMenu(card)
    fireEvent.click(await screen.findByRole("menuitem", { name: "Resume" }))
    await waitFor(() => expect(rpc.startTorrents).toHaveBeenCalledWith([2]))
  })

  it.each([
    ["Verify", "verifyTorrents"],
    ["Reannounce", "reannounceTorrents"]
  ] as const)(
    "sends explicit IDs for the %s context action",
    async (label, method) => {
      render(<App />)
      fireEvent.contextMenu(await getRow("Alpha"))
      fireEvent.click(await screen.findByRole("menuitem", { name: label }))
      await waitFor(() => expect(rpc[method]).toHaveBeenCalledWith([1]))
    }
  )

  it("filters from the left sidebar, supports Ctrl multi-selection and preserves filters across status routes", async () => {
    render(<App />)
    await getRow("Alpha")
    const labels = screen.getByRole("region", { name: "By Label" })
    fireEvent.click(within(labels).getByRole("button", { name: "mteam (1)" }))
    expect(screen.queryByRole("link", { name: "Beta" })).not.toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: "Gamma" })
    ).not.toBeInTheDocument()
    fireEvent.click(within(labels).getByRole("button", { name: "other (1)" }), {
      ctrlKey: true
    })
    expect(screen.getByRole("link", { name: "Beta" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("link", { name: /^Seeding/ }))
    await waitFor(() => expect(window.location.hash).toBe("#/seeding"))
    expect(screen.queryByRole("link", { name: "Beta" })).not.toBeInTheDocument()
    expect(
      within(labels).getByRole("button", { name: "mteam (1)" })
    ).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(
      within(labels).getByRole("button", { name: "Untagged (1)" })
    )
    expect(screen.getByRole("link", { name: "Gamma" })).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: "Alpha" })
    ).not.toBeInTheDocument()
  })

  it("right-click keeps selected rows, and replaces selection when clicking a different row", async () => {
    render(<App />)
    const alpha = await getRow("Alpha")
    const beta = await getRow("Beta")
    fireEvent.click(alpha)
    fireEvent.click(beta, { ctrlKey: true })
    fireEvent.contextMenu(alpha, { clientX: 250, clientY: 200 })
    fireEvent.click(await screen.findByRole("menuitem", { name: "Stop" }))
    await waitFor(() => expect(rpc.stopTorrents).toHaveBeenCalledWith([1, 2]))
    fireEvent.contextMenu(await getRow("Gamma"), { clientX: 250, clientY: 200 })
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Force resume" })
    )
    await waitFor(() => expect(rpc.startTorrentsNow).toHaveBeenCalledWith([3]))
  })

  it("deletion requires confirmation and defaults to retaining downloaded files", async () => {
    render(<App />)
    fireEvent.contextMenu(await getRow("Alpha"))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Remove" }))
    const dialog = await screen.findByRole("dialog")
    expect(rpc.removeTorrents).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }))
    await waitFor(() =>
      expect(rpc.removeTorrents).toHaveBeenCalledWith([1], false)
    )
  })

  it("restores filters, sort, view and page after remount without overwriting the saved page during loading", async () => {
    const many = Array.from({ length: 120 }, (_, index) => ({
      ...torrents[0],
      id: index + 1,
      name: `Torrent ${String(index + 1).padStart(3, "0")}`
    }))
    vi.mocked(rpc.getTorrents).mockResolvedValue({ torrents: many })
    writeUiState("torrent-filter-labels", ["mteam"])
    writeUiState("torrent-sort", { key: "name", direction: "asc" })
    writeUiState("torrent-page-size", 50)
    writeUiState("torrent-current-page", 2)
    writeUiState("torrent-view-mode", "grid")
    writeUiState("torrent-last-route", "/seeding")
    window.history.replaceState(null, "", "/")
    restoreTorrentRoute()
    const first = render(<App />)
    await screen.findByRole("link", { name: "Torrent 051" })
    expect(
      screen.queryByRole("link", { name: "Torrent 001" })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    first.unmount()
    render(<App />)
    await screen.findByRole("link", { name: "Torrent 051" })
    expect(JSON.parse(localStorage.getItem("torrent-current-page")!)).toBe(2)
  })

  it("uses the right-click target for a location change, including the move-data option", async () => {
    render(<App />)
    fireEvent.contextMenu(await getRow("Beta"))
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Set location" })
    )
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "/hdd/other" }
    })
    fireEvent.click(within(dialog).getByRole("checkbox"))
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save Changes" })
    )
    await waitFor(() =>
      expect(rpc.setTorrentLocation).toHaveBeenCalledWith(
        [2],
        "/hdd/other",
        false
      )
    )
  })
})
