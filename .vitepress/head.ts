import type { HeadConfig } from 'vitepress'
import { creatorNames, creatorUsernames, siteName, targetDomain } from '../metadata'
import { SITE_BASE } from '../scripts/blog-paths.mjs'

// 根路径 → 默认语言路径的兜底跳转。
// base 跟随 SITE_BASE（GitHub Pages 为 '/nebula-blog/'，根域名部署为 '/'），避免换平台后硬编码失效。
// 注意：真正的根 index.html 由 config.ts 的 buildEnd 重写成 meta refresh → /vault/主页/，
// 本脚本只在未被覆盖的页面（如 404）里生效，属兜底性质。
const BASE_ROOT = SITE_BASE.replace(/\/$/, '')
const ROOT_REDIRECT = `if (typeof window !== 'undefined' && (window.location.pathname === '${SITE_BASE}' || window.location.pathname === '${BASE_ROOT}') && !window.location.pathname.startsWith('${SITE_BASE}zh-CN')) { window.location.href = '${SITE_BASE}zh-CN/' + window.location.hash; }`

export default [
  // 自托管 Albert Sans（拉丁子集，约 52KB）。字重可变，中文仍走系统字体。
  // 只预加载这一个字体；构建后会把默认主题自动注入的 Inter preload 移除，避免重复下载。
  ['link', {
    rel: 'preload',
    as: 'font',
    type: 'font/woff2',
    href: `${SITE_BASE}fonts/AlbertSans-Variable.woff2`,
    crossorigin: '',
  }],
  // Redirect root path to zh-CN locale
  ['script', {}, ROOT_REDIRECT],
  // 51LA v6 访问统计（后台 https://v6.51.la ）：注册站点后把 ck 值填到下面 LA_CK。
  // ck 为空字符串时脚本不注入，零副作用。注意 ${"LA_CK"} 是刻意转义，运行时由浏览器侧模板拼接。
  ['script', {}, `(function(){var LA_CK="";if(!LA_CK)return;var s=document.createElement("script");s.src="https://js.51.la/v6/"+LA_CK+".js";s.async=true;document.head.appendChild(s)})()`],
  ['meta', {
    media: '(prefers-color-scheme: light)',
    name: 'theme-color',
    content: '#fafafa',
  }],
  ['meta', {
    media: '(prefers-color-scheme: dark)',
    name: 'theme-color',
    content: '#161618',
  }],
  [
    'link',
    {
      rel: 'apple-touch-icon',
      href: `${SITE_BASE}apple-touch-icon.png`,
      sizes: '180x180',
    },
  ],
  [
    'link',
    {
      rel: 'icon',
      href: `${SITE_BASE}logo.svg`,
      type: 'image/svg+xml',
    },
  ],
  [
    'link',
    {
      rel: 'alternate icon',
      href: `${SITE_BASE}favicon.ico`,
      type: 'image/png',
      sizes: '16x16',
    },
  ],
  ['meta', {
    name: 'author',
    content: creatorNames.join(', '),
  }],
  [
    'meta',
    {
      name: 'keywords',
      content:
          ['markdown', 'knowledge-base', '知识库', 'vitepress', 'obsidian', 'notebook', 'notes', ...creatorUsernames].join(', '),
    },
  ],

  // og:title / og:description 不再写死：每页的标题和摘要由 config.ts 的 transformHead
  // 按 pageData 生成（首页取站点名与 hero tagline，文章取标题与 frontmatter.abstract）。
  // 这里只保留全站一致的图片与站点名。
  [
    'meta',
    {
      property: 'og:image',
      content: `${targetDomain}/og.jpg`,
    },
  ],
  ['meta', { property: 'og:image:width', content: '1200' }],
  ['meta', { property: 'og:image:height', content: '630' }],
  ['meta', { property: 'og:site_name', content: siteName }],
  ['meta', { property: 'og:locale', content: 'zh_CN' }],

  ['meta', {
    name: 'twitter:card',
    content: 'summary_large_image',
  }],
  ['meta', {
    name: 'twitter:creator',
    content: creatorUsernames.join(', '),
  }],
  [
    'meta',
    {
      name: 'twitter:image',
      content: `${targetDomain}/og.jpg`,
    },
  ],

  [
    'link',
    {
      rel: 'mask-icon',
      href: `${SITE_BASE}safari-pinned-tab.svg`,
      color: '#927baf',
    },
  ],
  ['link', {
    rel: 'manifest',
    href: `${SITE_BASE}site.webmanifest`,
  }],
  ['meta', {
    name: 'msapplication-TileColor',
    content: '#603cba',
  }],
] satisfies HeadConfig[]
