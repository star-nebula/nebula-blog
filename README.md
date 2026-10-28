# Star Nebula Knowledge

**记录回忆，知识和畅想的地方**

个人知识库，基于 [VitePress](https://vitepress.dev) 构建，使用 [Obsidian](https://obsidian.md) 管理。在线阅读：<https://star-nebula.github.io/knowledge/>

## 内容板块

| 目录 | 内容 |
|---|---|
| `vault/Knowledge/` | 主题笔记（AI / 工程 / 方法论），按 category frontmatter 自动生成侧边栏 |
| `vault/Workshop/` | 项目 Demo 与实验记录（原 vault/blog/作坊，2026-10-28 改名） |

原博客“档案”已移入本地 `vault/Archive/博客档案/`，不再参与站点构建或公开仓库的新提交。

私人目录（`Memory/`、`Resources/`、`DailyNotes/`等）不属于本博客仓：2026-10-28 起目录本体及其 `.gitkeep` 占位已全部删除，`.gitignore` 仍保留忽略行防误建。正式的 Obsidian 库在本机另行维护，不在本仓库。
笔记规范（原 `vault/rules/`，13 个文件）于 2026-10-28 移回本地 Obsidian 库维护，不再随本仓库入库。

站点首页与内容栏目（2026-10-28 起改用英文目录名）：`vault/Home/`（原 blog/主页）、`vault/Workshop/`（原 blog/作坊）、`vault/Recent/`（原 blog/最近）。`Knowledge/` 仍是共享知识源；VitePress `rewrites` 保留原 `/vault/主页/`、`/vault/作坊/`、`/vault/最近/` 网址，改名不改变外部链接。

## 使用

```shell
pnpm install        # 安装依赖
pnpm docs:dev       # 本地开发
pnpm docs:build     # 构建静态页面（CI 自动部署到 GitHub Pages）
node --test scripts/blog-paths.test.mjs # 路由与嵌套发布边界回归
node --test scripts/blog-build.test.mjs # 构建后检查旧网址产物及正文双链
pnpm check:boundary # 发布边界校验（见下方「私密与发布的边界」）
```

## 私密与发布的边界

- **发布面（唯一事实来源）**：`vault/Workshop`、`vault/Knowledge`（另有站点必需页 `vault/Home`、`vault/blog/最近`）。这两目录是全部会进 GitHub 并渲染成站点的内容；新增/移除发布目录只改 `.vitepress/config.ts` 顶部的 `PUBLISHED_DIRS`。
- **发布判定**：三面共用同一份 `PUBLISHED_DIRS`——`srcExclude` 排除所有非发布目录（不渲染）、nolebase 双链索引同源排除（不编入 `[[ ]]`）、`scripts/check-publish-boundary.mjs` 校验 git 跟踪面与构建产物链接都 ⊆ 发布面。跑 `pnpm check:boundary` 即可发现「私人目录被误 add / 产物出现非发布链接」。
- **附件**：`vault/Attachments/` 默认整体忽略；`pnpm sync:assets` 只把「已发布笔记引用到的图片」强制入库，私人图绝不进 GitHub。
- **私人目录**：同时被 `.gitignore`（内容不入库）和 VitePress `srcExclude`（不渲染）双重排除，本地构建也不会把私人笔记带上站点。`Archive/` `Canvas/` `DailyNotes/` `Inbox/` `Resources/` `Templates/` 六个目录例外地在仓库里各保留一个 `.gitkeep` 占位文件（只表明目录存在，不含任何内容）。
- **构建要求**：Node 22+，`NODE_OPTIONS=--max-old-space-size=6144`（全量构建吃内存，CI 已内置）。

## 许可

- 代码：[MIT](./LICENSE)
- 笔记内容：[CC BY-SA 4.0](./LICENSE-CC-BY-SA)
