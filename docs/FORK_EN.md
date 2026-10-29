## Native label compatibility fix in this fork

This repository is forked from [hisproc/transmission-next-ui](https://github.com/hisproc/transmission-next-ui) and retains the upstream interface while fixing native Transmission label serialization ([PR #1](https://github.com/ccccwhite/transmission-next-ui/pull/1)).

- **Before**: Editing or appending labels could store `storage:hdd` as the JSON-wrapped string `{"text":"storage:hdd"}`. This produces extra entries in the stock WebUI and breaks scripts that match labels as plain strings.
- **After**: Labels are saved as native strings over Transmission RPC, for example `["storage:hdd","webui-test"]`. Legacy `{"text":"..."}` wrappers are normalized to plain labels when saved again.
- **Verification**: All 80 unit tests passed (full UI enhancements build); production Vite build succeeded; appending a label was verified against a disposable torrent using LinuxServer Transmission 4.1.3 on Unraid 6.12.13.
- **Scope**: This confirms the tested label workflow, not full end-to-end coverage of every feature or environment. Back up existing labels before editing production torrents.

## UI enhancements in this fork

The sidebar also includes an Errors filter for nonzero Transmission error codes (tracker warnings, tracker errors and local file errors). Transmission RPC exposes no queryable file-moving status, so no speculative Moving filter is provided. Other status filters are unchanged.

- The left sidebar lists labels, trackers and save directories with torrent counts, including an Untagged filter and collapsible sections. Click to select one entry; Ctrl / Command-click to select several. Filter groups intersect.
- Set Torrent Labels includes a searchable dropdown of existing labels and an explicit create option. It supports multiple labels, removal and keyboard input, avoids duplicates, and preserves append/overwrite modes with native string payloads.
- Both list and card views offer a context menu: resume, force resume, stop, verify, reannounce, set labels, set location, edit, details and remove. Right-clicking a selected item targets the selection; right-clicking another item targets that item only. List rows support click, Ctrl / Command-click and Shift-click selection.
- The browser remembers the status page, search, filters, sorting, view mode, page size/page, visible columns/order, sidebar/section expansion and details tab. Preferences are local to the browser and origin; a LAN IP and external hostname have separate settings.
- A URL without a hash restores the last torrent page. Explicit hashes (including `#/`) and detail links take precedence. Refreshing or returning from details preserves list preferences; changing filters resets the page. Selected tasks and RPC actions are never restored or replayed.
- Removal still requires confirmation and retains downloaded files by default. Set location accepts paths inside the Transmission container, with a choice to move existing files or only update the location.
- Set location offers an opt-in Verify afterwards checkbox. Without a move, verification is queued after updating the location. With a move, the UI waits for the request and confirms every destination plus the absence of local move errors before queuing verification. Retry verification never repeats a move. Keep the page open until verification has been queued.
- List, card and detail views display `recheckProgress` while verifying, show zero while queued, and return to download progress after checking ends.

### Build this fork with the fix

Requires Node.js 22 and pnpm 10:

```bash
git clone https://github.com/ccccwhite/transmission-next-ui.git
cd transmission-next-ui
corepack enable
corepack prepare pnpm@10 --activate
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

Deploy the contents of `dist/` as Transmission's custom WebUI. For the `linuxserver/transmission` Docker image, mount a host directory with these static files at `/webui` and set `TRANSMISSION_WEB_HOME=/webui`. Do not overwrite `/config` or torrent data, and do not move or rename the root of a live bind mount when updating UI files.

> Download `release.zip` from this fork's [Releases](https://github.com/ccccwhite/transmission-next-ui/releases). Upstream releases do not contain these enhancements.


The label dialog also displays current labels, with shared and partial labels and counts for multiple selections.
