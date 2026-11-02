import { TorrentStatus, type Torrent, type TrackerStat } from "./rpc-types"
export type TrackerTimingIssue = "unscheduled" | "overdue"
export function trackerTimingIssue(st: TrackerStat, now=Math.floor(Date.now()/1000)): TrackerTimingIssue | null {
  if (st.isBackup || st.announceState !== 0) return null
  if (st.nextAnnounceTime === 0) return "unscheduled"
  if (typeof st.nextAnnounceTime === "number" && st.nextAnnounceTime > 0 && now-st.nextAnnounceTime>900) return "overdue"
  return null
}
export function torrentTimingIssue(t: Pick<Torrent,"status"|"trackerStats"|"startDate">, now=Math.floor(Date.now()/1000)):TrackerTimingIssue|null {
  if(t.status!==TorrentStatus.SEED) return null
  if(t.startDate && now>=t.startDate && now-t.startDate<60)return null
  const primary=t.trackerStats?.filter(v=>!v.isBackup)??[]
  if(!primary.length)return null
  const issues=primary.map(v=>trackerTimingIssue(v,now))
  if(issues.some(x=>x===null))return null
  return issues.includes("unscheduled")?"unscheduled":"overdue"
}
