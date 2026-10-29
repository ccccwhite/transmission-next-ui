import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "@/components/layout"
import { TorrentView } from "@/components/torrents/torrent-view"
import TorrentDetailsPage from "@/app/torrents/detail/page"
import SettingsPage from "@/app/settings/page"
import { getLastTorrentRoute } from "@/lib/ui-state"

function TorrentEntry() {
  const savedRoute = getLastTorrentRoute()
  // Opening the bare URL in an existing tab can be a hash-only navigation.
  if (!window.location.hash && savedRoute !== "/") return <Navigate to={savedRoute} replace />
  return <TorrentView key="all" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TorrentEntry />} />
      <Route path="/active" element={<TorrentView key="active" statusFilter="active" showStats={false} />} />
      <Route path="/downloading" element={<TorrentView key="downloading" statusFilter="downloading" showStats={false} />} />
      <Route path="/paused" element={<TorrentView key="paused" statusFilter="Paused" showStats={false} />} />
      <Route path="/seeding" element={<TorrentView key="seeding" statusFilter="Seeding" showStats={false} />} />
      <Route path="/error" element={<TorrentView key="error" statusFilter="error" showStats={false} />} />
      <Route path="/settings" element={<SettingsPage key="settings" />} />
      <Route path="/torrents/detail" element={<TorrentDetailsPage key="detail" />} />
    </Routes>
  )
}

function App() {
  return (
    <HashRouter>
      <Layout>
        <AppRoutes />
      </Layout>
    </HashRouter>
  )
}

export default App
