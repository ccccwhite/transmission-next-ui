import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, expect, test, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { rpc } from "@/lib/rpc-client"
import { MOCK_TORRENTS } from "@/lib/mock-data"
import { MoveSelectedTorrentsDialog } from "./move-selected-torrents-dialog"

vi.mock("@/lib/rpc-client", () => ({
  rpc: {
    setTorrentLocation: vi.fn(),
    getTorrents: vi.fn(),
    verifyTorrents: vi.fn()
  }
}))
vi.mock("@/components/location-input", () => ({
  LocationInput: ({
    value,
    onChange,
    disabled
  }: {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
  }) => (
    <input
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.mocked(rpc.setTorrentLocation).mockReset().mockResolvedValue({})
  vi.mocked(rpc.getTorrents)
    .mockReset()
    .mockResolvedValue({
      torrents: [
        { ...MOCK_TORRENTS[0], id: 7, downloadDir: "/hdd/site", error: 0 }
      ]
    })
  vi.mocked(rpc.verifyTorrents).mockReset().mockResolvedValue({})
})

test.each([true, false])(
  "the optional checkbox submits verification for the selected IDs (move=%s)",
  async (move) => {
    const close = vi.fn()
    render(
      <I18nProvider>
        <MoveSelectedTorrentsDialog
          ids={[7]}
          onClose={close}
          onSuccess={vi.fn()}
        />
      </I18nProvider>
    )
    expect(
      screen.getByRole("checkbox", { name: "Verify afterwards" })
    ).not.toBeChecked()
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "/hdd/site" }
    })
    if (!move)
      fireEvent.click(
        screen.getByRole("checkbox", {
          name: "Move existing files to the new location"
        })
      )
    fireEvent.click(screen.getByRole("checkbox", { name: "Verify afterwards" }))
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    expect(rpc.setTorrentLocation).toHaveBeenCalledWith([7], "/hdd/site", move)
    expect(rpc.verifyTorrents).toHaveBeenCalledWith([7])
  }
)

test("retry verification cannot repeat an already completed move", async () => {
  vi.mocked(rpc.verifyTorrents).mockRejectedValueOnce(
    new Error("network error")
  )
  const close = vi.fn()
  render(
    <I18nProvider>
      <MoveSelectedTorrentsDialog
        ids={[7]}
        onClose={close}
        onSuccess={vi.fn()}
      />
    </I18nProvider>
  )
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "/hdd/site" }
  })
  fireEvent.click(screen.getByRole("checkbox", { name: "Verify afterwards" }))
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))
  const retry = await screen.findByRole("button", {
    name: "Retry verification"
  })
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByRole("textbox")).toBeDisabled()
  fireEvent.click(retry)
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
  expect(rpc.setTorrentLocation).toHaveBeenCalledTimes(1)
  expect(rpc.verifyTorrents).toHaveBeenCalledTimes(2)
})
