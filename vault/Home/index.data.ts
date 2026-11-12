import { loadRecentUpdates } from '../Recent/recent-data'

/**
 * 首页「最新笔记」：全站最近更新里取前 5 条。
 *
 * 作坊的 index.md 是作坊入口页，已经在首页入口卡里出现过一次，
 * 不再当成一篇「文章」重复展示。其余条目保持最近页的排序与分类。
 */
export default {
  async load() {
    const items = await loadRecentUpdates()
    return items
      .filter(item => !/^vault\/Workshop\/index\.md$/.test(item.filePath))
      .slice(0, 5)
  },
}
