import type { SortConfig } from "./torrent-list-utils"

export function readUiState<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T
): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const value: unknown = JSON.parse(raw)
    return validate(value) ? value : fallback
  } catch {
    return fallback
  }
}

export function writeUiState(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // A disabled/full browser store should not prevent using the UI.
  }
}

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string")
export const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean"
export const isString = (value: unknown): value is string =>
  typeof value === "string"
export const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0
export const isPageSize = (value: unknown): value is number =>
  typeof value === "number" && [50, 100, 200, 500, 9999].includes(value)
export const isViewMode = (value: unknown): value is "list" | "grid" =>
  value === "list" || value === "grid"

const sortKeys = [
  "name",
  "status",
  "percentDone",
  "addedDate",
  "editDate",
  "uploadedEver",
  "rateDownload",
  "rateUpload",
  "eta",
  "uploadRatio",
  "labels"
]
export function isSortConfig(value: unknown): value is SortConfig | null {
  if (value === null) return true
  if (typeof value !== "object") return false
  const config = value as Record<string, unknown>
  return (
    typeof config.key === "string" &&
    sortKeys.includes(config.key) &&
    (config.direction === "asc" || config.direction === "desc")
  )
}

export const TORRENT_ROUTES = [
  "/",
  "/active",
  "/downloading",
  "/seeding",
  "/paused",
  "/error"
]
export const isTorrentRoute = (value: unknown): value is string =>
  typeof value === "string" && TORRENT_ROUTES.includes(value)

export function getLastTorrentRoute() {
  return readUiState("torrent-last-route", "/", isTorrentRoute)
}

export function restoreTorrentRoute() {
  // An explicit hash/deep link always wins over the saved route.
  if (!window.location.hash) {
    const route = getLastTorrentRoute()
    if (route !== "/")
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#${route}`
      )
  }
}
