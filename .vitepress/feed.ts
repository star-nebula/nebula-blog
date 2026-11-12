import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadRecentUpdates } from '../vault/Recent/recent-data'
import { siteDescription, siteName, targetDomain } from '../metadata'

/**
 * 构建期生成 RSS 2.0（outDir/feed.xml）。
 *
 * 数据与「最近」「首页最新」同源（Recent/recent-data.ts），因此首页列表、
 * 最近页和订阅源不会各说各话。没有后端，也就没有新依赖。
 */
const MAX_ITEMS = 20

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

export async function writeFeed(outDir: string): Promise<void> {
  const origin = new URL(targetDomain).origin
  const feedUrl = `${targetDomain}/feed.xml`
  // 作坊的 index.md 是栏目入口页，不是一篇可以订阅的文章，和首页列表一致地排除。
  const items = (await loadRecentUpdates())
    .filter(item => !/^vault\/Workshop\/index\.md$/.test(item.filePath))
    .slice(0, MAX_ITEMS)

  const entries = items.map((item) => {
    // item.url 已带站点 base（/nebula-blog/），只需补协议与域名。
    const link = `${origin}${item.url}`
    const description = item.abstract || item.title
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${new Date(item.lastUpdated || 0).toUTCString()}</pubDate>
${item.category ? `      <category>${escapeXml(item.category)}</category>\n` : ''}      <description>${escapeXml(description)}</description>
    </item>`
  }).join('\n')

  const doc = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(targetDomain)}/</link>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(siteDescription)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${entries}
  </channel>
</rss>
`
  writeFileSync(join(outDir, 'feed.xml'), doc, 'utf8')
}
