<script setup lang="ts">
/**
 * 首页四张特性卡。
 *
 * 替代 VitePress 的 frontmatter features：原生只把 icon 当文本渲染，
 * 只能放 emoji，和纸感气质冲突且各平台字形不一。这里用内联线性 SVG，
 * 颜色跟随 currentColor，深浅色主题一致，也不需要额外请求。
 */
const features = [
  {
    key: 'pen',
    title: '记录生活与灵感',
    details: '从琐碎日常到深度思考，把值得记住的事留下来。',
  },
  {
    key: 'link',
    title: '知识相互链接',
    details: '像星图一样把想法连接起来，让记忆在引用中重新发光。',
  },
  {
    key: 'spark',
    title: '回忆与畅想并存',
    details: '既是对过去的归档，也是对未来可能性的草稿本。',
  },
  {
    key: 'file',
    title: '纯文本，持久可读',
    details: '全部使用 Markdown 编写，不依赖特定工具，内容永远属于你。',
  },
]
</script>

<template>
  <section class="sn-features">
    <div class="sn-features-grid">
      <article v-for="feature in features" :key="feature.key" class="sn-feature">
        <span class="sn-feature-icon">
          <svg
            v-if="feature.key === 'pen'"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <svg
            v-else-if="feature.key === 'link'"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <svg
            v-else-if="feature.key === 'spark'"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
            <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
        </span>
        <h3 class="sn-feature-title">
          {{ feature.title }}
        </h3>
        <p class="sn-feature-details">
          {{ feature.details }}
        </p>
      </article>
    </div>
  </section>
</template>
