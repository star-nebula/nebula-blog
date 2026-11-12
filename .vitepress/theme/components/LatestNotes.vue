<script setup lang="ts">
import { withBase } from 'vitepress'

/**
 * 首页「最新笔记」列表。
 *
 * 数据由 Home/index.data.ts 在构建期从 Recent/recent-data.ts 取前 5 条，
 * 零运行时请求。首页原来只有海报和入口卡，一篇笔记都不露脸；
 * 这一块负责回答「这里现在有什么」。
 */
interface RecentItem {
  title: string
  url: string
  lastUpdated: number
  category: string
  filePath: string
}

defineProps<{ items: RecentItem[] }>()

function formatDate(timestamp: number): string {
  const d = new Date(timestamp || 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
</script>

<template>
  <section v-if="items.length" class="sn-latest">
    <div class="sn-explore-head">
      <div>
        <p class="sn-explore-kicker">Latest</p>
        <h2 class="sn-explore-title">
          最新笔记
        </h2>
      </div>
      <a class="sn-latest-more" :href="withBase('/vault/最近/toc')">
        全部更新 →
      </a>
    </div>

    <ul class="sn-latest-list">
      <li v-for="item in items" :key="item.url">
        <a :href="item.url">
          <span class="sn-latest-title">{{ item.title }}</span>
          <span class="sn-latest-meta">
            <span v-if="item.category" class="sn-latest-category">{{ item.category }}</span>
            <time :datetime="new Date(item.lastUpdated || 0).toISOString()">{{ formatDate(item.lastUpdated) }}</time>
          </span>
        </a>
      </li>
    </ul>
  </section>
</template>
