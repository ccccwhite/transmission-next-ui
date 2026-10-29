"use client"

import * as React from "react"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { isString } from "@/lib/ui-state"

interface SearchContextType {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

const SearchContext = React.createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = usePersistentState("torrent-search", "", isString)

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </SearchContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearch() {
  const context = React.useContext(SearchContext)
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}
