# Star Nebula Knowledge

个人博客，基于 [VitePress](https://vitepress.dev) 构建，部署于 GitHub Pages。
内容用 Obsidian 语法书写（`[[双链]]`、`![[图片]]`），由 [nolebase](https://nolebase.ayaka.io) 集成渲染。
日常写作与维护由 AI agent（Codex）完成，工程入口为私有 `AGENTS.md`（不入库）。

在线阅读：<https://star-nebula.github.io/nebula-blog/>

## 站点内容（`vault/`）

| 目录 | 内容 |
|---|---|
| `vault/Home/` | 站点首页（VitePress `layout: home`） |
| `vault/Workshop/` | 项目 Demo 与实验记录 |
| `vault/Recent/` | 「最近更新」页（`toc.data.ts` 构建期自动汇总，无需手改） |
| `vault/Knowledge/` | 主题笔记（AI / 工程 / 方法论），按 frontmatter `category` 自动生成侧边栏 |
| `vault/Attachments/` | 被发布笔记引用的图片，由 `pnpm sync:assets` 按引用入库维护 |

历史 URL 兼容：栏目目录已由中文改为英文（`blog/主页→Home`、`blog/作坊→Workshop`、`blog/最近→Recent`），
`rewrites` 保留 `/vault/主页/`、`/vault/作坊/`、`/vault/最近/toc` 等旧网址，外链不受影响。

## 命令

```shell
pnpm install         # 安装依赖
pnpm docs:dev        # 本地开发
pnpm docs:build      # 构建静态页面（需 Node 22+；NODE_OPTIONS 已在脚本内处理大内存）
pnpm check:boundary  # 发布边界校验：git 跟踪面、站点页白名单、产物链接 ⊆ 发布面
pnpm sync:assets     # 把被发布笔记引用的图片强制入库
pnpm docs:serve      # 本地预览构建产物
node --test scripts/blog-paths.test.mjs  # URL 映射与发布判定单元测试
node --test scripts/blog-build.test.mjs  # 构建后回归：旧网址产物与正文双链（需先 build）
```

## 发布边界

- 唯一事实来源：`.vitepress/config.ts` 顶部的 `PUBLISHED_DIRS`。三处同源派生——
  `srcExclude`（不渲染）、nolebase 双链索引（不编入 `[[ ]]`）、`scripts/check-publish-boundary.mjs`（校验）。
- 仓库只包含发布内容，无任何私人目录；改动发布面后跑 `pnpm check:boundary`。
- 根部文档（`AGENTS.md`、`README.md`）被 `srcExclude` 排除，不会渲染成站点页面。

## 部署

推送 `main` 即由 GitHub Actions 自动构建部署到 `/nebula-blog/` 子路径；
如需部署到根域名，用 `SITE_BASE=/ pnpm docs:build`。

## 历史

2026-10-28 本仓库与 Obsidian 主库（本机另行维护）分离：私人内容、规则文档与运维脚本全部移出，
博客栏目英文改名，旧 URL 经 rewrites 保留。

## 许可

- 代码：[MIT](./LICENSE)
- 笔记内容：[CC BY-SA 4.0](./LICENSE-CC-BY-SA)
