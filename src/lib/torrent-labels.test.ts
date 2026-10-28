import { expect, test } from "vitest"
import {
  getTorrentLabelsSortValue,
  parseTorrentLabel,
  parseTorrentLabels,
  serializeTorrentLabel,
  serializeTorrentLabels,
} from "./torrent-labels.ts"

test("parseTorrentLabel handles JSON and plain strings", () => {
  expect(parseTorrentLabel('{"text":"Movie"}')).toBe("Movie")
  expect(parseTorrentLabel("Linux")).toBe("Linux")
  expect(parseTorrentLabel("{broken")).toBe("{broken")
})

test("parseTorrentLabels keeps order and removes empty labels", () => {
  expect(parseTorrentLabels(['{"text":"Movie"}', "", "Music"])).toEqual(["Movie", "Music"])
})

test("serializeTorrentLabel writes native Transmission string labels", () => {
  expect(serializeTorrentLabel("Anime")).toBe("Anime")
  expect(serializeTorrentLabel("storage:hdd")).toBe("storage:hdd")
  expect(serializeTorrentLabel('{"text":"storage:hdd"}')).toBe("storage:hdd")
})

test("serializeTorrentLabels preserves existing PT labels and decodes legacy wrappers", () => {
  expect(serializeTorrentLabels(["mteam", "storage:hdd", "webui-test"])).toEqual([
    "mteam", "storage:hdd", "webui-test",
  ])
  expect(serializeTorrentLabels(['{"text":"storage:hdd"}', '{"text":"webui-test"}'])).toEqual([
    "storage:hdd", "webui-test",
  ])
})

test("getTorrentLabelsSortValue normalizes encoded labels for sorting", () => {
  expect(getTorrentLabelsSortValue(['{"text":"TV"}', "HDR"])).toBe("TV\u0000HDR")
})
