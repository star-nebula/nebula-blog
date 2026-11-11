<script setup lang="ts">
import { useData } from 'vitepress'
import { computed } from 'vue'
// 字数映射由 config.ts 的 virtual:words-count 插件在构建期生成（约 10KB）。
// @ts-expect-error 虚拟模块由 .vitepress/config.ts 的 vite 插件提供
import wordsMap from 'virtual:words-count'

const { page, frontmatter } = useData()

const tags = computed(() => {
  const fmTags = frontmatter.value.tags
  if (Array.isArray(fmTags))
    return fmTags
  if (typeof fmTags === 'string')
    return [fmTags]
  return []
})

const wordsCount = computed(() => {
  const fp = page.value.filePath
  if (!fp)
    return 0
  return (wordsMap as Record<string, number>)[`/${fp}`] ?? 0
})

const lastUpdated = computed(() => {
  const ts = page.value.lastUpdated
  if (!ts)
    return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
})
</script>

<template>
  <div v-if="tags.length || wordsCount || lastUpdated" class="page-meta sn-meta">
    <span v-if="lastUpdated" class="sn-meta-item">
      <span class="i-icon-park-outline:time" aria-hidden="true" />
      <span>{{ lastUpdated }}</span>
    </span>

    <span v-if="wordsCount" class="sn-meta-item">
      <span class="i-icon-park-outline:add-text" aria-hidden="true" />
      <span>{{ wordsCount }} 字</span>
    </span>

    <span v-if="tags.length" class="sn-meta-tags">
      <span class="sn-meta-item sn-meta-label">
        <span class="i-icon-park-outline:tag-one" aria-hidden="true" />
        <span>标签</span>
      </span>
      <span
        v-for="(tag, i) in tags"
        :key="i"
        class="sn-tag"
      >{{ tag }}</span>
    </span>
  </div>
</template>

<style scoped>
.sn-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-bottom: 20px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
}

.sn-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.sn-meta-item [class*='i-'] {
  width: 14px;
  height: 14px;
  opacity: 0.75;
}

.sn-meta-tags {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.sn-tag {
  padding: 2px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 11.5px;
  line-height: 1.45;
}

@media (max-width: 640px) {
  .sn-meta {
    gap: 6px 12px;
  }
}
</style>
