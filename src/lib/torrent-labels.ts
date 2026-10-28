export interface TorrentLabelPayload {
  text: string
}

export function parseTorrentLabel(rawLabel: string): string {
  try {
    const parsed: unknown = JSON.parse(rawLabel)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "text" in parsed &&
      typeof parsed.text === "string"
    ) {
      return parsed.text
    }
  } catch {
    // Fall back to the raw label when it is not JSON.
  }

  return rawLabel
}

export function parseTorrentLabels(rawLabels?: string[] | null): string[] {
  return (rawLabels ?? []).map(parseTorrentLabel).filter(Boolean)
}

export function serializeTorrentLabel(label: string): string {
  // Transmission stores native string labels. Decode legacy Next UI wrappers
  // rather than writing JSON objects back into the labels array.
  return parseTorrentLabel(label)
}

export function serializeTorrentLabels(labels: string[]): string[] {
  return labels.map(serializeTorrentLabel)
}

export function getTorrentLabelsSortValue(rawLabels?: string[] | null): string {
  return parseTorrentLabels(rawLabels).join("\u0000")
}
