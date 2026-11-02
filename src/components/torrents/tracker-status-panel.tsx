import { ClockAlert, Globe } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"
import { formatDate } from "@/lib/formatters"
import { trackerTimingIssue } from "@/lib/tracker-health"
import type { TrackerStat } from "@/lib/rpc-types"
const time=(t:number|undefined,l:string)=>typeof t==="number"&&t>0?formatDate(t,l):"-"
const scrub=(s?:string)=>(s||"-").replace(/https?:\/\/[^\s]+/gi,"[Tracker URL]").replace(/([?&](?:passkey|token|key|auth|sign)=)[^&\s]+/gi,"$1***")
export function TrackerStatusPanel({stats}:{stats:TrackerStat[]}){
  const {t,locale}=useI18n()
  if(!stats.length)return <p className="p-6 text-muted-foreground">{t("details.no_tracker_stats")}</p>
  return <div className="space-y-3 p-4 md:p-6">
    <p className="text-xs text-muted-foreground">{t("details.announce_timing_hint")}</p>
    {stats.map((tr,i)=>{
      const issue=trackerTimingIssue(tr)
      const label=issue?t(issue==="unscheduled"?"details.announce_unscheduled":"details.announce_overdue")
        :tr.announceState!==0?t("details.announce_waiting")
        :tr.lastAnnounceSucceeded?t("details.announce_success"):t("details.announce_failed")
      let host=tr.host
      try{host=new URL(tr.announce).host}catch{/* skip unsafe URLs */}
      return <div key={i} className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 truncate text-sm font-medium"><Globe className="h-4 w-4 text-blue-500"/>{host}{tr.isBackup&&<small>{t("details.tracker_backup")}</small>}</span>
          <span className={issue?"flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-600":"rounded-lg bg-muted px-2 py-1 text-xs"}>{issue&&<ClockAlert className="h-3 w-3"/>}{label}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs lg:grid-cols-4">
          <div><p className="text-muted-foreground">{t("details.announce_state")}</p>{tr.announceState??"-"}</div>
          <div><p className="text-muted-foreground">{t("details.last_announce")}</p>{time(tr.lastAnnounceTime,locale)}</div>
          <div><p className="text-muted-foreground">{t("details.next_announce")}</p>{tr.nextAnnounceTime===0?t("details.no_announce_plan"):time(tr.nextAnnounceTime,locale)}</div>
          <div><p className="text-muted-foreground">{t("details.scrape_state")}</p>{tr.scrapeState??"-"}</div>
          <div><p className="text-muted-foreground">{t("details.last_scrape")}</p>{time(tr.lastScrapeTime,locale)}</div>
          <div><p className="text-muted-foreground">{t("details.next_scrape")}</p>{time(tr.nextScrapeTime,locale)}</div>
          <div><p className="text-muted-foreground">Seeders</p>{tr.seederCount??"-"}</div>
          <div><p className="text-muted-foreground">Leechers</p>{tr.leecherCount??"-"}</div>
        </div>
        <div className="grid gap-3 border-t pt-3 text-xs sm:grid-cols-2">
          <div><p className="text-muted-foreground">{t("details.announce_result")}</p><p className="break-all">{scrub(tr.lastAnnounceResult)}</p></div>
          <div><p className="text-muted-foreground">{t("details.scrape_result")}</p><p className="break-all">{scrub(tr.lastScrapeResult)}</p></div>
        </div>
      </div>
    })}
  </div>
}