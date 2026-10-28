<h1 align="center" style="border-bottom: none;"><img src="public/favicon.svg" width="24" style="vertical-align: middle; margin-right: 8px;" /> Transmission Next UI</h1>
<h3 align="center"> A third-party modern web-based frontend for Transmission, offering a sleek and responsive UI for managing your torrents with ease, built using shadcn/ui and Vite. </h3>

## Native label compatibility fix in this fork

This repository is forked from [hisproc/transmission-next-ui](https://github.com/hisproc/transmission-next-ui) and retains the upstream interface while fixing native Transmission label serialization ([PR #1](https://github.com/ccccwhite/transmission-next-ui/pull/1)).

- **Before**: Editing or appending labels could store `storage:hdd` as the JSON-wrapped string `{"text":"storage:hdd"}`. This produces extra entries in the stock WebUI and breaks scripts that match labels as plain strings.
- **After**: Labels are saved as native strings over Transmission RPC, for example `["storage:hdd","webui-test"]`. Legacy `{"text":"..."}` wrappers are normalized to plain labels when saved again.
- **Verification**: All 36 unit tests passed; production Vite build succeeded; appending a label was verified against a disposable torrent using LinuxServer Transmission 4.1.3 on Unraid 6.12.13.
- **Scope**: This confirms the tested label workflow, not full end-to-end coverage of every feature or environment. Back up existing labels before editing production torrents.

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

> **Note**: Upstream install scripts and upstream Releases do not necessarily include this fork's fix. Build the `main` branch of this fork to obtain it.

## Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 7](https://vite.dev/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)

---

English | [简体中文](README.md)

## Preview

[**Live Demo**](https://transmission-next-ui-demo.pages.dev)

| Light Mode | Dark Mode |
| :---: | :---: |
| ![dashboard_light_en.png](pic/dashboard_light_en.png) | ![dashboard_dark_en.png](pic/dashboard_dark_en.png) |

| Torrent Details | Settings |
| :---: | :---: |
| ![torrent_details_en.png](pic/torrent_details_en.png) | ![settings_en.png](pic/settings_en.png) |

## Features

- Modern UI Design
- Responsive Layout, Perfect for All Devices
- Powered by Vite and Tailwind CSS 4.0
- [x] Torrent Management and Information Viewing
- [x] Configuration Settings
- [x] Drag-and-Drop/Paste to Add Torrents
- [x] Dark Mode Support
- [x] Tracker Filter
- [x] Torrent Label Support
- [x] Batch Replace Trackers
- [x] Batch Move Download Directory
- [x] Batch Set Torrent Labels

⚠️**Notice**: This is an early version of the project. It has not been fully tested yet. Please verify its functionality before using it in production.

## Quick Start

You can deploy Transmission Next UI in three different ways:

### 1. Easy Install

> Requires: `docker`, `docker-compose`, and `curl`

> [!TIP]
> It's recommended to create a dedicated directory for your files first:
> ```bash
> mkdir -p ~/transmission && cd ~/transmission
> ```

To install web UI or upgrade to the latest version, run the following command:

```bash
curl -fsSL https://raw.githubusercontent.com/hisproc/transmission-next-ui/main/download.sh | bash
```

This will download the latest release and create a `docker-compose.yml` file in your current directory.

You can now modify the `docker-compose.yml` file to set your own **Transmission username**, **password**, and **timezone**:

```yaml
environment:
  - USER=your-username
  - PASS=your-password
  - TZ=Asia/Shanghai
```

Then use the following commands to start or stop the service:

```bash
docker-compose up -d   # start in background
docker-compose down    # stop and remove the container
```

The following ports are mapped by default:

| Port | Protocol | Purpose |
| --- | --- | --- |
| `9091` | TCP | Web UI and RPC interface — access the Web UI at `http://localhost:9091` |
| `51413` | TCP/UDP | BitTorrent data transfer — used for peer connections; keeping this port open improves download performance |

If you have modified the port settings in Transmission's configuration file located in the `config` directory, please ensure that you also update the corresponding port mappings in the `docker-compose.yml` file to reflect those changes.

### 2. Manual Install

1. Go to the [Releases](https://github.com/hisproc/transmission-next-ui/releases) page
2. Download the latest or stable release (e.g. `transmission-next-ui-v1.0.0.zip`)
3. Extract it and copy the contents to your transmission web directory (e.g. transmission/web/src)


### 3. Build from Source

```bash
git clone git@github.com:hisproc/transmission-next-ui.git
cd transmission-next-ui
pnpm install
pnpm build
```

Then, copy the contents of the `dist/` folder to your transmission web directory.

## License

This project is licensed under the [MIT License](LICENSE).
