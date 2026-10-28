// Obsidian sources live under blog/; public URLs retain their existing paths.

/**
 * 站点默认部署根路径 = GitHub Pages 项目页（https://star-nebula.github.io/knowledge/）。
 * 不设置环境变量时**永远**是这个值，GitHub Pages 的部署行为不受任何影响。
 */
const DEFAULT_BASE = '/knowledge/'

/**
 * 归一化 base：'/'、''、'knowledge'、'/knowledge'、'/knowledge/' 都得到规范形态。
 * 返回的字符串必以 '/' 开头，且除根路径外必以 '/' 结尾（VitePress 的硬性要求）。
 */
function normalizeBase(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed || trimmed === '/')
    return '/'
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`
}

/**
 * 站点部署根路径（VitePress 的 `base`）。
 *
 * 同一份代码要部署到不同根路径的平台，靠环境变量切换：
 *   - GitHub Pages（项目页）：不设变量 → '/knowledge/'
 *   - 根域名部署（EdgeOne Pages 等）：`SITE_BASE=/ pnpm docs:build`
 *
 * 空字符串视为未设置（防止 CI 里定义了空变量却把站点打到根路径）。
 */
export const SITE_BASE = normalizeBase(process.env.SITE_BASE || DEFAULT_BASE)

// 源目录 → 公开 URL 的改名映射。旧公开 URL 一律保留（rewrites），外链不受影响。
// 命中规则：精确等于 from，或以 from + '/' 开头（其余原样返回）。
const SOURCE_TO_ROUTE = [
  ['vault/blog/最近', 'vault/最近'],
  ['vault/Home', 'vault/主页'],
  ['vault/Workshop', 'vault/作坊'],
]
const ROUTE_TO_SOURCE = SOURCE_TO_ROUTE.map(([source, route]) => [route, source])

function mapPrefix(path, pairs) {
  const p = path.split(String.fromCharCode(92)).join('/')
  // 侧边栏 key 等场景带前导 '/'，统一剥掉再匹配、还原时补回。
  const lead = p.startsWith('/') ? '/' : ''
  const bare = lead ? p.slice(1) : p
  for (const [from, to] of pairs) {
    if (bare === from)
      return `${lead}${to}`
    if (bare.startsWith(`${from}/`))
      return `${lead}${to}${bare.slice(from.length)}`
  }
  return p
}

export function blogSourceToRoute(path) {
  return mapPrefix(path, SOURCE_TO_ROUTE)
}

export function blogRouteToSource(path) {
  return mapPrefix(path, ROUTE_TO_SOURCE)
}

export function isWithinPublished(path, publishedDirs) {
  return publishedDirs.some(dir => path === dir || path.startsWith(`${dir}/`))
}
