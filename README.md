<h1 align="center" style="border-bottom: none;"><img src="public/favicon.svg" width="24" style="vertical-align: middle; margin-right: 8px;" /> Transmission Next UI</h1>
<h3 align="center"> 一个Transmission的第三方Web UI，使用shadcn/ui和Vite构建。</h3>

<p align="center">
  <img alt="GitHub License" src="https://img.shields.io/github/license/hisproc/transmission-next-ui">
  <img alt="GitHub Release" src="https://img.shields.io/github/release/hisproc/transmission-next-ui">
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/hisproc/transmission-next-ui/build.yml">
</p>

---

## 本 Fork 的标签兼容修复

本仓库 Fork 自 [hisproc/transmission-next-ui](https://github.com/hisproc/transmission-next-ui)，保留原项目的界面与功能，并修复 Transmission 原生标签写入兼容性问题（[PR #1](https://github.com/ccccwhite/transmission-next-ui/pull/1)）。

- **修复前**：设置或追加标签时，可能将 `storage:hdd` 写成字符串 `{"text":"storage:hdd"}`，造成原生 WebUI 出现额外标签，并影响按字符串精确匹配标签的脚本。
- **修复后**：向 Transmission RPC 写入普通字符串标签，例如 `["storage:hdd","webui-test"]`；已有的 `{"text":"..."}` 旧包装标签在再次保存时可转换为普通字符串。
- **验证**：36/36 项单元测试通过，Vite 生产构建成功；已在 Unraid 6.12.13 + LinuxServer Transmission 4.1.3 上，使用测试种子验证“追加标签”后 RPC 返回普通字符串。
- **范围**：验证覆盖标签追加场景，并不代表所有界面和运行环境已经完成端到端测试。更改正式种子前请先备份标签。

## 本 Fork 的界面增强

侧栏额外提供「错误」筛选，按 Transmission 的非零错误码统计，含 Tracker 警告、Tracker 错误和本地文件错误。Transmission RPC 没有可查询的文件移动状态，因此未添加无法准确统计的「正在移动」选项；其余状态筛选保持不变。

- 左侧增加标签、Tracker、保存目录筛选及种子数量；单击选择一项，Ctrl / ⌘ 单击可多选，不同分组交叉筛选。支持“无标签”，分组可以折叠。
- 「设置种子标签」支持搜索式下拉选择：空输入时列出已有标签，输入时筛选匹配项，也可创建新标签；支持多选、移除和键盘操作，自动避免重复。保留追加/覆盖模式，提交仍使用原生字符串标签。
- 列表和卡片支持右键菜单：开始、强制开始、停止、校验、重新通告、设置标签、设置保存位置、编辑、详情、删除。右键已选项可批量操作；右键未选项只操作该项。列表空白处支持单击、Ctrl / ⌘ 多选和 Shift 连选。
- 自动记住状态页面、搜索词、筛选、排序、列表/卡片视图、每页数量、当前页、显示列与列顺序、侧栏/筛选分组展开状态及详情标签页。状态保存在当前浏览器和访问地址下；内网 IP 与外网域名分别保存。清除浏览器数据后恢复默认。
- 从不带 `#` 的入口地址进入时恢复上次状态页面；显式 `#/` 或详情深链接优先。刷新、详情返回和重新打开页面时保留列表设置，筛选条件变化时回到第一页。不会恢复已选任务或重放操作。
- 删除保留确认步骤，默认不删除文件；设置保存位置使用 Transmission 容器内路径，可选择移动文件或仅修改位置。
- 「设置保存位置」增加默认不勾选的「完成后校验」：不移动文件时更新位置后立即校验，移动文件时等待移动请求结束并重新确认目标路径、无本地移动错误后再提交完整校验。任一选中任务的目标未确认时均不触发校验；失败后的「重试校验」不会重复移动文件。校验需要保持页面打开直到请求提交。
- 校验中使用 Transmission 的 `recheckProgress` 显示真实校验进度，覆盖列表、卡片和详情页；等待校验显示 0%，结束后恢复下载进度。

### 从本 Fork 构建（包含修复）

需要 Node.js 22 和 pnpm 10：

```bash
git clone https://github.com/ccccwhite/transmission-next-ui.git
cd transmission-next-ui
corepack enable
corepack prepare pnpm@10 --activate
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

将 `dist/` 下的文件部署为 Transmission 自定义 WebUI。对于使用 `linuxserver/transmission` 的 Docker 容器，可以将宿主机 WebUI 文件目录映射到 `/webui`，并设置 `TRANSMISSION_WEB_HOME=/webui`。只更新静态页面文件，不要覆盖 `/config` 或种子数据目录。更新已挂载目录时应保留目录本身，避免移动或重命名挂载源目录。

> **注意**：下文的上游安装方法和上游 Releases 未必包含本 Fork 的标签修复；需要此修复请使用本仓库 `main` 分支自行构建。

## 技术栈

- **前端框架**: [React 19](https://react.dev/) + [Vite 7](https://vite.dev/)
- **CSS 框架**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **组件库**: [shadcn/ui](https://ui.shadcn.com/)
- **图标库**: [Lucide React](https://lucide.dev/)
- **路由管理**: [React Router 7](https://reactrouter.com/)

---

简体中文 | [English](README_EN.md)


## 预览

[**在线演示 (Live Demo)**](https://transmission-next-ui-demo.pages.dev)

| Light Mode | Dark Mode |
| :---: | :---: |
| ![dashboard_light.png](pic/dashboard_light.png) | ![dashboard_dark.png](pic/dashboard_dark.png) |

| Torrent Details | Settings |
| :---: | :---: |
| ![torrent_details.png](pic/torrent_details.png) | ![settings.png](pic/settings.png) |

## 功能

- 现代化 UI 设计
- 响应式布局，适配所有设备
- 适配 Transmission 4.0+ 版本
- [x] 种子管理，信息查看
- [x] 配置设置
- [x] 拖拽/粘贴添加种子
- [x] 深色模式支持
- [x] Tracker 过滤
- [x] 支持种子标签
- [x] 批量替换 Tracker
- [x] 批量移动下载目录
- [x] 批量设置种子标签

⚠️本项目为早期版本，尚未经过完整测试，正式使用前请自行验证其功能是否符合预期。

## 快速开始

可以通过三种方式部署 Transmission Next UI，另外提供对于[群辉](doc/NasInstall.md#群辉)和[飞牛OS](doc/NasInstall.md#飞牛OS)的安装指引:

### 1. 一键安装

> 依赖环境：`docker`、`docker-compose` 和 `curl`

> [!TIP]
> 建议先创建一个专用目录来存放相关文件，例如：
> ```bash
> mkdir -p ~/transmission && cd ~/transmission
> ```

初次安装或升级到最新版本，运行以下命令：

```bash
curl -fsSL https://raw.githubusercontent.com/hisproc/transmission-next-ui/main/download.sh | bash
```

执行后将在当前目录生成一个 `docker-compose.yml` 文件。

编辑该文件来自定义 Transmission 的用户名、密码和时区：

```yaml
environment:
  - USER=your-username
  - PASS=your-password
  - TZ=Asia/Shanghai
```

然后通过以下命令启动或停止服务：

```bash
docker-compose up -d   # 后台启动
docker-compose down    # 停止并移除容器
```

默认使用端口映射方式，映射了以下两个端口：

| 端口 | 协议 | 用途 |
| --- | --- | --- |
| `9091` | TCP | Web UI 及 RPC 接口，启动后通此端口访问 Web UI（如 `http://localhost:9091`） |
| `51413` | TCP/UDP | BT 数据传输端口，用于与其他节点交换数据 |

如果修改了 Transmission 在 config 目录下的配置文件中的端口设置，请确保在 `docker-compose.yml` 中也做相应修改。

### 2. 手动安装

1. 打开 [Releases](https://github.com/hisproc/transmission-next-ui/releases) 页面
2. 下载最新或稳定版本（如 `transmission-next-ui-v1.0.0.zip`）
3. 解压并将其中的内容复制到 Transmission 的 Web 目录（如 `transmission/web/src`）

### 3. 源代码打包

```bash
git clone git@github.com:hisproc/transmission-next-ui.git
cd transmission-next-ui
pnpm install
pnpm build
```

构建完成后，将 `dist/` 目录下的所有内容复制到 Transmission 的 Web 目录下即可。

## 许可证

本项目采用 [MIT 许可证](LICENSE) 进行授权。
