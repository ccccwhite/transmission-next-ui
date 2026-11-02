import { expect, test } from "vitest"
import { TorrentStatus, type TrackerStat } from "./rpc-types"
import { trackerTimingIssue, torrentTimingIssue } from "./tracker-health"
const now = 2000000
const stat=(overrides:Partial<TrackerStat>={}):TrackerStat=>({
 announce:"https://example.test/announce",host:"example.test",seederCount:1,leecherCount:1,
 lastAnnounceSucceeded:true,lastAnnounceResult:"OK",isBackup:false,announceState:0,nextAnnounceTime:0,...overrides
})
test("missing announce schedule is abnormal even after previously successful announce",()=>{
 expect(torrentTimingIssue({status:TorrentStatus.SEED,startDate:now-100,trackerStats:[stat()]},now)).toBe("unscheduled")
})
test("detect only overdue announcements, not active ones",()=>{
 expect(trackerTimingIssue(stat({nextAnnounceTime:now-901}),now)).toBe("overdue")
 expect(trackerTimingIssue(stat({nextAnnounceTime:now-900}),now)).toBeNull()
 expect(trackerTimingIssue(stat({announceState:3,nextAnnounceTime:0}),now)).toBeNull()
})
test("stopped, queued, new starts and healthy alternate tracker are excluded",()=>{
 const broken=stat()
 expect(torrentTimingIssue({status:TorrentStatus.STOPPED,trackerStats:[broken]},now)).toBeNull()
 expect(torrentTimingIssue({status:TorrentStatus.SEED_WAIT,trackerStats:[broken]},now)).toBeNull()
 expect(torrentTimingIssue({status:TorrentStatus.SEED,startDate:now-30,trackerStats:[broken]},now)).toBeNull()
 expect(torrentTimingIssue({status:TorrentStatus.SEED,startDate:now-100,trackerStats:[broken,stat({nextAnnounceTime:now+120})]},now)).toBeNull()
 expect(torrentTimingIssue({status:TorrentStatus.SEED,trackerStats:[stat({announceState:undefined,nextAnnounceTime:undefined})]},now)).toBeNull()
})
