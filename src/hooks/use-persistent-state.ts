import { useEffect, useState } from "react"
import { readUiState, writeUiState } from "@/lib/ui-state"

export function usePersistentState<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T
) {
  const [value, setValue] = useState<T>(() =>
    readUiState(key, fallback, validate)
  )
  useEffect(() => writeUiState(key, value), [key, value])
  return [value, setValue] as const
}
