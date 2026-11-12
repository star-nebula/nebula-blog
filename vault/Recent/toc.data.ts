import { createRecentUpdatesLoader } from '@nolebase/vitepress-plugin-index/vitepress'
import { readFile } from 'node:fs/promises'
import { blogSourceToRoute, SITE_BASE } from '../../scripts/blog-paths.mjs'
import { execFileSync } from 'node:child_process'

// Windows 上 createRecentUpdatesLoader 生成的 URL 使用反斜杠，
// 导致链接无法跳转。这里包装一层修复路径分隔符，同时合并多个目录。
const knowledgeLoader = createRecentUpdatesLoader({
  dir: 'vault/Knowledge',
  rewrites: [
    {
      from: /^vault\/Knowledge/,
      to: 'vault/Knowledge',
    },
  ],
})

const workshopLoader = createRecentUpdatesLoader({
  dir: 'vault/Workshop',
  rewrites: [
    {
      from: /^vault\/Workshop/,
      to: 'vault/作坊',
    },
  ],
  // 作坊里的条目没有 category：直接标成「作坊」，不要落到 "Un-categorized"。
  category: {
    byCustomGetter: () => '作坊',
  },
})

function fixUrlSeparator(url: string): string {
  return blogSourceToRoute(url)
}

export default {
  async load() {
    const [knowledge, workshop] = await Promise.all([
      knowledgeLoader.load(),
      workshopLoader.load(),
    ])
    return (await Promise.all([...knowledge, ...workshop].map(async (item) => {
      // nolebae 的 index loader 只把「字符串」型 category 当有效值，本站笔记写的是
      // 数组（["📚 个人知识管理", "博客部署"]），于是全部退化成 "Un-categorized"。
      // 这里按源文件 frontmatter 还原成「一级 / 二级」的中文标签。
      const category = (await categoryOfFrontmatter(item.filePath)) || item.category
      return {
        ...item,
        category: category === 'Un-categorized' ? '未分类' : category,
        // 尚未提交的目录迁移没有新路径 Git 历史，沿旧路径读取原更新时间。
        lastUpdated: item.lastUpdated || previousUpdate(item.filePath),
        // 最近更新组件直接渲染 href，不会像 Markdown 链接那样自动补站点 base。
        url: `${SITE_BASE}${fixUrlSeparator(item.url).replace(/^\//, '')}`,
        filePath: item.filePath.replaceAll('\\', '/'),
      }
    })))
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
  },
}

/**
 * 读取源文件 frontmatter 里的 category，数组按「一级 / 二级」拼接。
 * 只做这一个字段的轻量解析，避免为了一行 YAML 引入完整解析器。
 */
async function categoryOfFrontmatter(filePath: string): Promise<string> {
  let raw = ''
  try {
    raw = await readFile(filePath.replaceAll('\\', '/'), 'utf8')
  }
  catch {
    return ''
  }
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? ''
  const value = /^category:\s*(.*)$/m.exec(block)?.[1]?.trim() ?? ''
  if (!value)
    return ''

  let values: string[]
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value.replaceAll('\'', '"'))
      values = Array.isArray(parsed) ? parsed.map(String) : []
    }
    catch {
      values = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''))
    }
  }
  else {
    values = [value.replace(/^['"]|['"]$/g, '')]
  }
  return values.map(s => s.trim()).filter(Boolean).join(' / ')
}

function previousUpdate(filePath: string): number {
  const source = filePath.replaceAll('\\', '/')
  const previous = blogSourceToRoute(source)
  if (source === previous)
    return 0
  const timestamp = execFileSync('git', ['log', '--format=%at', '-1', '--follow', '--', previous], { encoding: 'utf8' }).trim()
  return Number.parseInt(timestamp || '0', 10) * 1000
}
