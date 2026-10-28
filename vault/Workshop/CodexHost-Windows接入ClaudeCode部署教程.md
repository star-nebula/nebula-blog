---
title: CodexHost：在 Windows 上把 Claude Code 接成 Codex Desktop 的一等 Agent
created: 2026-10-21
updated: 2026-10-24
type: 步骤操作
tags:
  - CodexHost
  - Codex
  - Claude-Code
  - 部署
  - Windows
  - Agent
  - CDP
  - SOP
---

# CodexHost：在 Windows 上把 Claude Code 接成 Codex Desktop 的一等 Agent

> 一句话：用 `@codexhost/cli` 让 Codex Desktop 的 Agent 选择器里出现 Claude Code，并能真正收发消息——本文给出**每一步的期望信号**，所以人照着做能成，Agent 照着跑也能自判成败。

## 〇、先看这个（版本与适用面）

| 项 | 本次实测环境 |
|---|---|
| 系统 | Windows 10/11，PowerShell |
| Node.js | v24.21.0（要求 ≥ 22） |
| npm | 11.19.0 |
| Codex Desktop | Microsoft Store 版 26.1016.6573.0 |
| CodexHost CLI | `@codexhost/cli` 0.13.3 |
| Claude Code | 2.1.183，已登录（`loggedIn=true`） |

**两种读法**

- **人读**：从 §二 开始按顺序做，每步末尾的「✅ 通过信号」就是判断点，对不上再去看 §六 排障表。
- **Agent 执行**：先读 §五 执行契约（幂等性、禁止动作、停机条件），再按 §三 步骤跑，每步只认「通过信号」，不要凭进程名猜成功。

---

## 一、原理：为什么「必须由 codexhost 启动」

理解这条链，能省掉后面 80% 的排错时间。

```
npm 命令 (codexhost)
   └─ codexhost.exe  Launcher        ← 拿所有权、起桌面、起控制器
        ├─ ChatGPT.exe  --remote-debugging-port=<port>   ← 受管桌面
        ├─ Desktop Controller → 经 CDP 注入 renderer extension
        └─ Host Runtime (node) → 拉起 claude.exe 干活
```

由此推出三条硬约束：

1. **桌面必须由 codexhost 拉起。** 注入靠的是启动时带的 `--remote-debugging-port`。Store 应用是**单实例**的：已经有 Codex 在跑时，再启动只会激活旧实例、不带调试端口，控制器 attach 不上，启动器退回到 `http://127.0.0.1:4399/` 的**恢复控制台**——这是失败态，不是成功态。
2. **Windows 下 supervisor 必须常驻。** npm 包文档写明：Windows 上命令要保持连接直到桌面退出，因为「会清理已完成命令进程树」的 shell 会把 supervisor 一起收走。所以不能随手丢一个后台进程，要让它**脱离调用方进程树**（计划任务最稳）。
3. **别指望从外部直连委派接口。** `codexhost harness list` / `delegate` 需要 Codex 内部注入的 `CODEXHOST_RUNTIME_ENDPOINT` / `CODEXHOST_RUNTIME_TOKEN`；拿 host 描述符里的端口和令牌硬连，只会得到 JSON-RPC `-32601 Not found`（那个端口只代理 `thread/*`）。要无 UI 验收，走 §四 的 CDP 探针。

---

## 二、前置检查

```powershell
node -v                      # ≥ v22
npm -v
claude.cmd auth status       # 期望 loggedIn=true；不要把 token 复制到任何地方
```

安装 CLI（会自动带上对应平台的二进制包，**不要**加 `--omit=optional`）：

```powershell
npm.cmd install -g @codexhost/cli@0.13.3
codexhost.cmd --version
```

**✅ 通过信号**：`--version` 输出 `0.13.3`；`where.exe codexhost` 能定位到 `%APPDATA%\npm\codexhost.cmd`。

> ⚠️ `codexhost launch --help` 会报 `unknown launch option: --help`——这是**已知行为**，不是装坏了。要看帮助用 `codexhost --help`。

---

## 三、部署步骤

### 步骤 1 · 确认 CodexHost 认到了本机 Codex

```powershell
codexhost.cmd inspect
```

**✅ 通过信号**：输出含 `platform=windows`、`package_family_name=OpenAI.Codex_*`、`desktop_version`、`desktop_launcher`（指向 `WindowsApps\...\app\ChatGPT.exe`）。

**❌ 不通过**：报平台包版本不一致 → 按错误信息里的完整命令重装 CLI 与平台包到同一版本。

---

### 步骤 2 · 完全退出已在运行的 Codex Desktop

这一步是整篇文档里**最容易被跳过、也最容易导致后面全盘失败**的一步。

```powershell
# 找根进程：父进程不是 ChatGPT.exe 的那个
$all  = Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'"
$root = ($all | Where-Object { $_.ParentProcessId -notin $all.ProcessId } | Select-Object -First 1).ProcessId
$root

# 先礼后兵：关闭主窗口
Get-Process -Name ChatGPT -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  ForEach-Object { $null = $_.CloseMainWindow() }
Start-Sleep -Seconds 5

# 还在？发终止请求
taskkill /PID $root /T

# 仍拒绝（应用驻留后台时会这样）→ 强制
taskkill /PID $root /T /F
```

**✅ 通过信号**：`Get-Process -Name ChatGPT` 无输出，且 `codexhost.cmd inspect` 的 `desktop_process_ids` 为空。

> **先确认自己没站在对方的进程树上。** 如果你正在 Codex 里跑这段命令，强杀会把你自己的会话一起带走。查一下自己的祖先链再动手：
> ```powershell
> $p = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
> while ($p) { "{0} ({1})" -f $p.Name, $p.ProcessId; $p = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $p.ParentProcessId) -ErrorAction SilentlyContinue }
> ```
> 祖先链里没有 `ChatGPT.exe` / `codex.exe` 才安全。

---

### 步骤 3 · 用计划任务拉起 supervisor（脱离调用方进程树）

先写一个包装脚本，把输出落盘（排查全靠它）：

```bat
@echo off
chcp 65001 >nul
set CODEXHOST_STARTUP_TRACE=1
cd /d "%USERPROFILE%"
node "%APPDATA%\npm\node_modules\@codexhost\cli\bin\codexhost.js" >> "%USERPROFILE%\codexhost-supervisor.out.log" 2>> "%USERPROFILE%\codexhost-supervisor.err.log"
```

再注册并启动计划任务（当前用户、交互式、无执行时限）：

```powershell
$cmd = "$env:USERPROFILE\codexhost-supervisor.cmd"
$action = New-ScheduledTaskAction -Execute "C:\Windows\System32\cmd.exe" -Argument ('/c ""' + $cmd + '""') -WorkingDirectory $env:USERPROFILE
$principal = New-ScheduledTaskPrincipal -UserId ($env:USERDOMAIN + "\" + $env:USERNAME) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "CodexHostSupervisor" -Action $action -Principal $principal -Settings $settings -Force
Start-ScheduledTask -TaskName "CodexHostSupervisor"
```

**✅ 通过信号**：`codexhost-supervisor.err.log` 里依次出现这六行（关键在最后一行）：

```
launcher: launching Codex Desktop
launcher: Codex Desktop launched
launcher: Desktop Controller ready
launcher: Host chain ready
launcher: runtime descriptor published
npm: received Launcher ready          ← 只认这一行
```

**❌ 反例**：日志里只有 `codexhost console: http://127.0.0.1:4399/` 而没有 `received Launcher ready` → 启动器退回了恢复控制台，回步骤 2 检查是不是还有旧实例没退干净。

> **备选：计划任务被安全软件禁用时。** 部分机器上的启动项管理类软件（电脑管家之类）会在**几秒内**把新建的计划任务改回 `Disabled`——实测 `T+0s Ready → T+2s Disabled`，且事件日志与组策略里都查不到痕迹。遇到这种情况，改用「桌面启动器」方案，全程不依赖 Task Scheduler：
>
> ```
> 桌面 CodexHost.vbs（纯 ASCII 一行转接）
>    └─ launch-managed.ps1（检测 + 确认 + 拉起）
>         └─ start-supervisor.cmd（隐藏运行，输出重定向到日志）
> ```
>
> `.ps1` 里做三态判断：已在受管态→退出；有普通实例→弹窗确认后 `taskkill /T /F` 再起；没有 Codex→直接起。这样"点图标"就等于"由 codexhost 启动 Codex"。
>
> 两个坑记一下：① VBScript **不允许在 `For`/`For Each` 块内 `Dim`**，否则编译报 `错误的 'Next'`（800A041F，行号还指向块首）；② `.ps1` 存盘要带 **UTF-8 BOM**，否则 PowerShell 5.1 按 ANSI 读、中文全乱码。

---

### 步骤 4 · 核对运行期落地物

```powershell
Get-ChildItem "$env:USERPROFILE\.codexhost" -Recurse -Depth 2 | Select-Object FullName
Get-Content "$env:USERPROFILE\.codexhost\diagnostics\desktop-controller-v1.json"
```

**✅ 通过信号**（四件齐备）：

| 路径 | 含义 |
|---|---|
| `logs\host-runtime-<pid>.log` | Host Runtime 起来了 |
| `console\hosts\host-<pid>.json` | 运行时描述符已发布 |
| `diagnostics\desktop-controller-v1.json` | 含 `"renderer":{"state":"installed","failures":0}` |
| `usage-statistics\v7\claude-code.json` | harness 已被登记 |

**❌ 不通过**：`logs\` 和 `console\hosts\` 都不存在 → Host Runtime 从未启动，回到步骤 3 的 trace 找断点。

---

### 步骤 5 · 验收「接入」：选择器里出现了 Claude Code

不用点 UI，读渲染进程即可。先拿到调试端口：

```powershell
$cmdLine = (Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'" |
  Where-Object { $_.CommandLine -like "*remote-debugging-port*" } |
  Select-Object -First 1).CommandLine
if ($cmdLine -match "--remote-debugging-port=(\d+)") {
  $port = $Matches[1]
  "CDP 端口: $port"      # 附录 B 的探针要用
} else {
  "没找到调试端口 —— 当前 Codex 不是受管实例，回步骤 2"
}
```

用附录 B 的探针读 `status()`。

**✅ 通过信号**：

- `availability["claude-code"] == "ready"`（其余 CLI 未安装的 Agent 显示 `notInstalled`，属正常）
- `adapter.state == "ready"`
- DOM 里存在 `[data-agent="claude-code"]` 且未被 `aria-disabled`

---

### 步骤 6 · 验收「往返」：让它真回一句话

同一条 CDP 连接里：点 `[data-agent="claude-code"]` → 焦点进 `[role="textbox"]` → 写入最小消息 → 点 `aria-label=发送`。

**✅ 通过信号（三件齐全才算通过）**：

1. 进程侧：出现 `claude.exe`，**父进程 = Host Runtime 的 node pid**，命令行含 `--output-format stream-json`
2. 界面侧：数秒内出现回复
3. 落盘侧：`%USERPROFILE%\.claude\projects\<cwd-slug>\<session-id>.jsonl` 里能 grep 到刚才那句话

> 只满足 1、2 不满足 3 时，要怀疑是 Codex 自己回的话，而不是 harness 真跑了。

---

### 步骤 7 · 收尾：把选择留在你想要的状态

新草稿会继承上一次选择。如果希望默认还是 Codex，就在选择器里点回 Codex；希望默认 Claude Code，就不用动。

---

## 四、三层验收：别把「装上了」当「能用了」

| 层级 | 判据 | 一句话 |
|---|---|---|
| 已安装 | `codexhost --version`、`inspect` 有输出 | 包装好了 |
| 已接入 | `renderer.state=installed` + `availability["claude-code"]=ready` + 选择器有条目 | 桌面认了它 |
| 往返成功 | `claude.exe` 由 Host Runtime 拉起 + 有回复 + Claude 侧 jsonl 有记录 | 真能干活 |

**只有第三层通过，才算部署完成。**

---

## 五、Agent 执行契约

给自动化跑这份文档的 Agent 看：

**幂等性**

- 步骤 1、4、5 可重复执行，无副作用。
- 步骤 2 是破坏性的但可恢复（重开 Codex 即可）。
- 步骤 3 用 `-Force` 注册同名任务，重复执行不会叠加。
- 若 `%USERPROFILE%\.codexhost\console\hosts\` 已有描述符且 4399 在监听，说明已在托管态，**不要**再跑步骤 2/3。

**必须停下来问人的动作**

- 强杀 Codex 进程（`/F`）之前——先确认自身祖先链不含 `ChatGPT.exe`/`codex.exe`，并告知会关闭用户所有 Codex 窗口。
- 删除计划任务 `CodexHostSupervisor` 之前。

**禁止**

- 读取、打印、写入任何 token（host 描述符里带令牌，只允许在进程间传递）。
- 用 `Start-Process` 起 supervisor 后就认为完成——它会被调用方进程树清理。
- 用 `codexhost console: http://...` 这行输出判断成功。
- 直接连 `console\hosts\*.json` 里的端口调委派接口。
- 修改用户已有的 Claude Code / Codex 配置文件。

**停机条件**（满足任一就停，别继续往下试）

- 步骤 3 的 trace 连续两次没出现 `received Launcher ready`。
- `desktop-controller-v1.json` 的 `renderer.failures` 递增且 `state != installed`。
- 步骤 6 出现 `claude.exe` 但 3 分钟内无回复，且 `logs\host-runtime-*.log` 无新增。

---

## 六、排障速查

| 表征 | 最可能根因 | 处置 |
|---|---|---|
| 诊断停在 `starting`、`stages=[]`，`~\.codexhost` 无 `logs\` | 旧 Codex 实例吞掉了 CDP 注入 | 回步骤 2，确认 `desktop_process_ids` 为空 |
| 有 `codexhost console: http://127.0.0.1:4399/` 但无 `ready` | 控制器 attach 失败，退回恢复控制台 | 看 `desktop-controller-v1.json` 的 `renderer.failures` |
| 启动后进程凭空消失、PID 查不到 | supervisor 在调用方进程树里被清理 | 回步骤 3，改用计划任务 |
| `harness inspect` 报 `RUNTIME_UNREACHABLE` | 缺 Codex 注入的 `CODEXHOST_RUNTIME_*` | 别修，改走步骤 5 的 CDP 探针 |
| 直连 host 端口报 `-32601 Not found` | 该端口只代理 `thread/*` | 同上 |
| `codexhost.cmd inspect` 报 `could not locate the npm CLI used to update this global installation` | 全局 CLI 的 npm 定位/PATH 配置问题，不是 Host 链故障 | 先核对 `--version`、全局包与 npm 配置；用诊断 JSON 和进程命令行降级核验，不要盲目重装 |
| 选择器里 Claude Code 置灰 | CLI 没在 PATH 里 / 未登录 | `claude.cmd auth status`；必要时设 `CODEXHOST_CLAUDE_COMMAND` 指向可执行文件 |
| 手动退出了 Codex，之后全挂 | supervisor 随桌面退出而退出 | 重新拉起（计划任务 Run，或用启动器双击） |
| 计划任务刚建好就自己变 Disabled | 启动项管理类软件在清理任务 | 改用「桌面启动器」方案（见步骤 3 备选） |

---

## 七、运维与回退

```powershell
# 重启受管桌面（不要直接跑 codexhost.cmd）
schtasks /run /tn CodexHostSupervisor
# 用「桌面启动器」方案时改为：双击 CodexHost.vbs

# 看状态
codexhost.cmd inspect
Get-Content "$env:USERPROFILE\.codexhost\diagnostics\desktop-controller-v1.json"

# 看日志
Get-Content "$env:USERPROFILE%\codexhost-supervisor.err.log" -Tail 30
Get-Content "$env:USERPROFILE\.codexhost\logs\host-runtime-<pid>.log" -Tail 30
```

**回退（恢复成普通 Codex）**

```powershell
Stop-ScheduledTask -TaskName "CodexHostSupervisor"
Unregister-ScheduledTask -TaskName "CodexHostSupervisor"
# 然后按平时的方式启动 Codex 即可
```

**✅ 回退验证**：`codexhost.cmd inspect` 的 `desktop_process_ids` 重新出现，且没有 `codexhost.exe` 进程。

---

## 附录 A · 路径清单（Windows）

| 用途 | 路径 |
|---|---|
| CLI 命令入口 | `%APPDATA%\npm\codexhost.cmd` |
| CLI 安装目录 | `%APPDATA%\npm\node_modules\@codexhost\cli` |
| 平台包（含 launcher 与注入资源） | 上一目录下 `node_modules\@codexhost\cli-win32-x64` |
| 运行期数据根 | `%USERPROFILE%\.codexhost` |
| 启动诊断 | `%USERPROFILE%\.codexhost\diagnostics\launcher-startup-v1.json` |
| 控制器状态 | `%USERPROFILE%\.codexhost\diagnostics\desktop-controller-v1.json` |
| 运行时日志 | `%USERPROFILE%\.codexhost\logs\host-runtime-<pid>.log` |
| 运行时描述符 | `%USERPROFILE%\.codexhost\console\hosts\host-<pid>.json`（**含令牌，勿外传**） |
| 恢复控制台 | `http://127.0.0.1:4399/`（空闲 30 分钟自动退出） |

---

## 附录 B · CDP 只读探针（自包含）

保存为 `probe.mjs`，用法：`node probe.mjs <调试端口>`。只读，不点击、不修改。

```javascript
const port = process.argv[2];
if (!port) { console.error("用法: node probe.mjs <调试端口>"); process.exit(1); }

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((t) => t.type === "page");
if (!page) { console.error("没有 page target"); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", () => rej(new Error("ws error")));
});
const send = (method, params) => new Promise((res) => {
  const i = ++id; pending.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});

const expr = `(() => {
  const b = window.__codexhostRendererBindingProbeV1;
  if (!b) return JSON.stringify({ injected: false });
  const s = b.status();
  return JSON.stringify({
    injected: true,
    claudeCode: s.availability["claude-code"],
    adapter: s.adapter,
    selections: s.selections,
    selectorEntry: !!document.querySelector('[data-agent="claude-code"]')
  });
})()`;

const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
console.log(JSON.stringify(JSON.parse(r.result.result.value), null, 2));
ws.close();
```

**判读**：`injected: false` → renderer extension 没注入，回步骤 3；`claudeCode: "notInstalled"` → Claude Code 侧不可用，查 PATH 与登录态。

---

## 附录 C · 命令速查

```powershell
codexhost --help                    # 可用
codexhost --version
codexhost inspect                   # 只读，看桌面识别结果
codexhost                          # = launch，Windows 下会一直挂着
codexhost console                  # 打开 4399 恢复控制台
codexhost harness list             # 需 Codex 内部环境，外部跑会失败
```

---

## 附：这篇文档的边界

- 只在 Windows + Microsoft Store 版 Codex 上实测通过。macOS / Linux 的启动语义不同（`codexhost` 启动后即返回、由 launcher 自行后台监督），步骤 3 的「脱离进程树」处理不适用。
- 版本迭代较快，`0.13.3` 之后的参数与文件布局可能变化。执行前先跑 `codexhost inspect` 与 `--version` 对齐现状，再照做。

> **Windows npm shim 注意**：若 npm 生成的 `codexhost.cmd` 需要在 shim 内注入 `npm_execpath`，必须放在 `SETLOCAL` **之前**。npm shim 尾行会先 `endLocal` 再拉起 node；放在 `SETLOCAL` 之后的变量会被丢弃。典型症状是 `codexhost inspect` 报 `could not locate the npm CLI used to update this global installation`，但 `codexhost --version` 仍正常。npm 全局升级可能重写 shim，升级后需复查。
- 文中所有路径都用环境变量表达，替换成你自己的即可；示例里不包含任何令牌、账号或会话标识。
