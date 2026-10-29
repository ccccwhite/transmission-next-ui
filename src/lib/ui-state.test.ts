import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getLastTorrentRoute,
  isPageSize,
  isSortConfig,
  isStringArray,
  readUiState,
  restoreTorrentRoute,
  writeUiState
} from "./ui-state"

beforeEach(() => window.history.replaceState(null, "", "/"))

describe("saved UI state", () => {
  it("rejects malformed and outdated values", () => {
    localStorage.setItem("filters", "not-json")
    expect(readUiState("filters", [], isStringArray)).toEqual([])
    localStorage.setItem("filters", '[1,"mteam"]')
    expect(readUiState("filters", [], isStringArray)).toEqual([])
    expect(isPageSize(0)).toBe(false)
    expect(isPageSize(100)).toBe(true)
    expect(isSortConfig({ key: "unknown", direction: "asc" })).toBe(false)
    expect(isSortConfig(null)).toBe(true)
  })

  it("continues when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("disabled")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full")
    })
    expect(readUiState("filters", [], isStringArray)).toEqual([])
    expect(() => writeUiState("filters", ["mteam"])).not.toThrow()
  })

  it("restores a bare entry URL but preserves explicit routes and detail links", () => {
    writeUiState("torrent-last-route", "/seeding")
    restoreTorrentRoute()
    expect(window.location.hash).toBe("#/seeding")
    for (const hash of ["#/", "#/paused", "#/torrents/detail?id=42"]) {
      window.history.replaceState(null, "", `/${hash}`)
      restoreTorrentRoute()
      expect(window.location.hash).toBe(hash)
    }
    writeUiState("torrent-last-route", "https://untrusted.example/")
    expect(getLastTorrentRoute()).toBe("/")
  })
})
