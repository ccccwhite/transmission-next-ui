import { useState } from "react"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { expect, test, vi, beforeEach } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { TorrentLabelPicker } from "./torrent-label-picker"
import { BatchSetLabelsSelectedDialog } from "./batch-set-labels-selected-dialog"
import { rpc } from "@/lib/rpc-client"
import { MOCK_TORRENTS } from "@/lib/mock-data"

vi.mock("@/lib/rpc-client", () => ({
  rpc: { getTorrents: vi.fn(), setTorrent: vi.fn() }
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function Picker({ disabled = false }: { disabled?: boolean }) {
  const [labels, setLabels] = useState<string[]>([])
  return (
    <I18nProvider>
      <TorrentLabelPicker
        labels={labels}
        onChange={setLabels}
        availableLabels={["mteam", "storage:hdd", "mteam"]}
        disabled={disabled}
      />
    </I18nProvider>
  )
}

beforeEach(() => {
  vi.mocked(rpc.getTorrents)
    .mockReset()
    .mockResolvedValue({
      torrents: [
        {
          ...MOCK_TORRENTS[0],
          id: 7,
          labels: ["mteam", '{"text":"storage:hdd"}']
        }
      ]
    })
  vi.mocked(rpc.setTorrent).mockReset().mockResolvedValue({})
})

test("dropdown shows all existing labels without typing and excludes labels already added", () => {
  render(<Picker />)
  fireEvent.click(screen.getByRole("button", { name: "Show existing labels" }))
  expect(screen.getAllByRole("option")).toHaveLength(2)
  fireEvent.click(screen.getByRole("option", { name: "mteam" }))
  expect(
    screen.getByRole("button", { name: 'Remove label "mteam"' })
  ).toBeInTheDocument()
  expect(
    screen.queryByRole("option", { name: "mteam" })
  ).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "mteam" } })
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
  expect(
    screen.getAllByRole("button", { name: 'Remove label "mteam"' })
  ).toHaveLength(1)
})

test("searches existing labels, creates a new label, and supports removing it", () => {
  render(<Picker />)
  const input = screen.getByRole("combobox")
  fireEvent.change(input, { target: { value: "STORAGE" } })
  expect(
    screen.getByRole("option", { name: "storage:hdd" })
  ).toBeInTheDocument()
  fireEvent.click(
    screen.getByRole("option", { name: "storage:hdd" })
  )
  fireEvent.change(input, { target: { value: " 自建分类 " } })
  fireEvent.click(screen.getByRole("option", { name: 'Create "自建分类"' }))
  expect(
    screen.getByRole("button", { name: 'Remove label "自建分类"' })
  ).toBeInTheDocument()
  fireEvent.click(
    screen.getByRole("button", { name: 'Remove label "自建分类"' })
  )
  expect(
    screen.queryByRole("button", { name: 'Remove label "自建分类"' })
  ).not.toBeInTheDocument()
})

test("keyboard selection and Chinese input composition do not accidentally add partial text", () => {
  render(<Picker />)
  const input = screen.getByRole("combobox")
  fireEvent.focus(input)
  fireEvent.keyDown(input, { key: "ArrowDown" })
  fireEvent.keyDown(input, { key: "Enter" })
  expect(
    screen.getByRole("button", { name: 'Remove label "mteam"' })
  ).toBeInTheDocument()
  fireEvent.change(input, { target: { value: "分类" } })
  fireEvent.keyDown(input, { key: "Enter", isComposing: true })
  expect(
    screen.queryByRole("button", { name: 'Remove label "分类"' })
  ).not.toBeInTheDocument()
  fireEvent.keyDown(input, { key: "Enter" })
  expect(
    screen.getByRole("button", { name: 'Remove label "分类"' })
  ).toBeInTheDocument()
  fireEvent.keyDown(input, { key: "Escape" })
  expect(input).toHaveAttribute("aria-expanded", "false")
})

test("a disabled picker prevents both selection and creation", () => {
  render(<Picker disabled />)
  expect(screen.getByRole("combobox")).toBeDisabled()
  expect(
    screen.getByRole("button", { name: "Show existing labels" })
  ).toBeDisabled()
  expect(screen.getByRole("button", { name: "Add label" })).toBeDisabled()
})

test.each(["overwrite", "append"])(
  "selected existing and newly created labels remain native strings in %s mode",
  async (mode) => {
    const close = vi.fn()
    render(
      <I18nProvider>
        <BatchSetLabelsSelectedDialog
          open
          onOpenChange={close}
          selectedIds={[7]}
        />
      </I18nProvider>
    )
    await waitFor(() =>
      expect(rpc.getTorrents).toHaveBeenCalledWith(["id", "labels"])
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Show existing labels" })
    )
    fireEvent.click(
      await screen.findByRole("option", { name: "storage:hdd" })
    )
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "new-category" }
    })
    fireEvent.click(screen.getByRole("button", { name: "Add label" }))
    if (mode === "append")
      await userEvent.click(screen.getByRole("button", { name: "Append" }))
    await userEvent.click(screen.getByRole("button", { name: /^Apply to/ }))
    await waitFor(() => expect(close).toHaveBeenCalledWith(false))
    expect(rpc.setTorrent).toHaveBeenCalledWith([7], {
      labels:
        mode === "append"
          ? ["mteam", "storage:hdd", "new-category"]
          : ["storage:hdd", "new-category"]
    })
  }
)

test("users can create labels even when fetching existing labels fails", async () => {
  vi.mocked(rpc.getTorrents).mockRejectedValueOnce(new Error("network error"))
  vi.spyOn(console, "error").mockImplementation(() => {})
  render(
    <I18nProvider>
      <BatchSetLabelsSelectedDialog
        open
        onOpenChange={vi.fn()}
        selectedIds={[7]}
      />
    </I18nProvider>
  )
  fireEvent.focus(screen.getByRole("combobox"))
  expect(
    await screen.findByText(/Could not load existing labels/)
  ).toBeInTheDocument()
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "manual" }
  })
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
  expect(
    screen.getByRole("button", { name: 'Remove label "manual"' })
  ).toBeInTheDocument()
})


test("current labels show the selected torrent only, with legacy labels normalized", async () => {
  vi.mocked(rpc.getTorrents).mockResolvedValueOnce({ torrents: [
    { ...MOCK_TORRENTS[0], id: 7, labels: ["mteam", '{"text":"storage:hdd"}'] },
    { ...MOCK_TORRENTS[0], id: 8, labels: ["unrelated"] }
  ] })
  render(<I18nProvider><BatchSetLabelsSelectedDialog open onOpenChange={vi.fn()} selectedIds={[7]} /></I18nProvider>)
  const current = within(screen.getByRole("region", { name: "Current torrent labels" }))
  expect(await current.findByText("mteam")).toBeInTheDocument()
  expect(current.getByText("storage:hdd")).toBeInTheDocument()
  expect(current.queryByText("unrelated")).not.toBeInTheDocument()
  expect(rpc.setTorrent).not.toHaveBeenCalled()
})

test("multiple torrents distinguish common and partial labels and count unlabeled torrents", async () => {
  vi.mocked(rpc.getTorrents).mockResolvedValue({ torrents: [
    { ...MOCK_TORRENTS[0], id: 7, labels: ["mteam", "mteam", "storage:hdd"] },
    { ...MOCK_TORRENTS[0], id: 8, labels: ["mteam"] },
    { ...MOCK_TORRENTS[0], id: 9, labels: [] }
  ] })
  const { rerender } = render(<I18nProvider><BatchSetLabelsSelectedDialog open onOpenChange={vi.fn()} selectedIds={[7, 8]} /></I18nProvider>)
  const current = within(screen.getByRole("region", { name: "Current torrent labels" }))
  expect(await current.findByText("Shared by all selected torrents")).toBeInTheDocument()
  expect(current.getByText("Assigned to some selected torrents")).toBeInTheDocument()
  expect(current.getByText("2/2")).toBeInTheDocument()
  expect(current.getByText("1/2")).toBeInTheDocument()
  rerender(<I18nProvider><BatchSetLabelsSelectedDialog open onOpenChange={vi.fn()} selectedIds={[7, 8, 9]} /></I18nProvider>)
  expect(await current.findByText("1 selected torrents have no labels")).toBeInTheDocument()
  expect(current.queryByText("Shared by all selected torrents")).not.toBeInTheDocument()
})

test("a torrent without labels shows the empty state after loading", async () => {
  vi.mocked(rpc.getTorrents).mockResolvedValueOnce({ torrents: [{ ...MOCK_TORRENTS[0], id: 7, labels: [] }] })
  render(<I18nProvider><BatchSetLabelsSelectedDialog open onOpenChange={vi.fn()} selectedIds={[7]} /></I18nProvider>)
  expect(await screen.findByText("No labels currently assigned")).toBeInTheDocument()
})
