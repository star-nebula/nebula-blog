<script setup lang="ts">
/**
 * ProjectGallery.vue — 作坊作品集卡片网格。
 *
 * 设计目标：作坊是「视觉化作品集」，不是文档索引。因此：
 *  - 每个项目一张卡片，封面图占主导（有图用图，无图用程序化占位，绝不伪造截图）
 *  - 卡片只放：封面 / 标题 / 一句话 / 技术栈 / 指标；细节留给点进去的项目页
 *  - 数据内联在本文件，不从 markdown frontmatter 解析——作坊项目是手维护的小集合
 *  - 图片走 withBase()，兼容 GitHub Pages 子路径部署
 *
 * 加新项目：在 projects 数组里追加一项。cover 指向 public/ 下的路径（以 / 开头）或留空。
 */
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'

interface Project {
  /** 稳定 id，用作锚点与 key */
  id: string
  /** 卡片标题 */
  title: string
  /** 一句话定位，控制在 40 字内 */
  tagline: string
  /** 项目类型：项目 / Demo */
  kind: '项目' | 'Demo'
  /** 技术栈，2-4 个即可，多了视觉噪音 */
  stack: string[]
  /** 关键指标，1-3 条；没有真实数据就留空数组，不编造 */
  metrics: string[]
  /** 封面图路径（public/ 下，以 / 开头）；留空则渲染程序化占位 */
  cover?: string
  /** 封面图替代文本 */
  coverAlt?: string
  /**
   * 演示视频（public/ 下，以 / 开头）。
   * 有视频时封面区改为静音循环自动播放的预览片——作品集要能"看到它跑起来"，
   * 静态截图对视频类项目说服力不够。视频必须 H.264 + faststart，否则部分浏览器不播。
   */
  video?: string
  /** 详情页链接，站内路径 */
  link: string
  /** 占位图用的强调色，同时用于卡片悬停边框 */
  accent: string
}

const projects: Project[] = [
  {
    id: 'feedlens',
    title: 'FeedLens',
    tagline: '让 AI 替你刷信息流：每天只给最重要的 10 条',
    kind: '项目',
    stack: ['LangGraph', 'DeepSeek', 'ChromaDB', 'MCP'],
    metrics: ['RSS → 简报全自动', '向量去重 + 多因子排序'],
    cover: '/workshop/feedlens-cover.svg',
    coverAlt: 'FeedLens 界面总览',
    link: '/vault/作坊/feedlens-project',
    accent: '#4f9dff',
  },
  {
    id: 'glowlink',
    title: 'GlowLink',
    tagline: '多 Agent 社媒获客：内容生产到销售转化全链路',
    kind: 'Demo',
    stack: ['LangGraph', 'RAG 混合检索', 'MCP'],
    metrics: ['Supervisor 路由', 'BM25 + 向量 4:6 融合'],
    cover: '/workshop/glowlink-cover.png',
    coverAlt: 'GlowLink 系统架构',
    link: '/vault/作坊/glowlink-demo',
    accent: '#f4a742',
  },
  {
    id: 'tryon',
    title: 'AI 电商换装',
    tagline: '产品图进去，商品展示视频出来',
    kind: 'Demo',
    stack: ['OutfitAnyone', '万相 animate-mix', 'FFmpeg'],
    metrics: ['全云端，无需本地 GPU', '运镜动作 1:1 复刻'],
    cover: '/workshop/tryon/cover.jpg',
    coverAlt: '原视频与复刻结果对比',
    video: '/workshop/tryon/result.mp4',
    link: '/vault/作坊/ai-tryon-video-demo',
    accent: '#e8688a',
  },
  {
    id: 'webnote',
    title: '网页笔记四步工作流',
    tagline: '把「整理、提炼、核查、确认」拆成四个 Agent',
    kind: '项目',
    stack: ['多 Agent', '上下文隔离', '人工确认闸'],
    metrics: ['开源', '克制型自动化'],
    cover: '',
    link: '/vault/作坊/网页笔记四步工作流',
    accent: '#5fbf8f',
  },
]

const activeKind = ref<'全部' | '项目' | 'Demo'>('全部')
const visible = computed(() =>
  activeKind.value === '全部' ? projects : projects.filter(p => p.kind === activeKind.value),
)

const counts = computed(() => ({
  全部: projects.length,
  项目: projects.filter(p => p.kind === '项目').length,
  Demo: projects.filter(p => p.kind === 'Demo').length,
}))

/**
 * 悬停播放 / 离开暂停。
 * 用事件委托而不是每个卡片绑 handler：卡片是 <a>，内部有 img + video 两层，
 * currentTarget 才是 .pg-cover，从它里面找 video 即可。
 */
function playPreview(e: MouseEvent) {
  const video = (e.currentTarget as HTMLElement).querySelector('video')
  if (!video) return
  if (!video.getAttribute('src')) {
    // preload="none" 时首次播放才真正拉流，减少首屏流量
    const card = e.currentTarget as HTMLElement
    const item = card.closest('.pg-card') as HTMLElement | null
    const src = item?.dataset.video
    if (src) video.src = src
  }
  video.play().catch(() => {})
}

function stopPreview(e: MouseEvent) {
  const video = (e.currentTarget as HTMLElement).querySelector('video')
  if (!video) return
  video.pause()
  video.currentTime = 0
}
</script>

<template>
  <div class="pg-root">
    <!-- 筛选条：只有两种类型，用胶囊按钮而非下拉，减少操作步骤 -->
    <div class="pg-filter" role="tablist" aria-label="项目类型筛选">
      <button
        v-for="k in (['全部', '项目', 'Demo'] as const)"
        :key="k"
        class="pg-chip"
        :class="{ active: activeKind === k }"
        role="tab"
        :aria-selected="activeKind === k"
        @click="activeKind = k"
      >
        {{ k }}<span class="pg-chip-count">{{ counts[k] }}</span>
      </button>
    </div>

    <div class="pg-grid">
      <a
        v-for="p in visible"
        :key="p.id"
        :href="withBase(p.link)"
        class="pg-card"
        :data-video="p.video ? withBase(p.video) : undefined"
        :style="{ '--pg-accent': p.accent }"
      >
        <!-- 封面：优先视频预览，其次静态图，最后程序化占位（绝不伪造素材）。
             视频不自动播放：循环播放会随机停在一帧（低头、闭眼等），当封面很难看。
             改为静态封面 + 悬停/聚焦时播放，离开即暂停回第一帧。 -->
        <div class="pg-cover" @mouseenter="playPreview($event)" @mouseleave="stopPreview($event)">
          <img
            v-if="p.cover"
            class="pg-cover-img"
            :src="withBase(p.cover)"
            :alt="p.coverAlt || p.title"
            loading="lazy"
          >
          <video
            v-if="p.video"
            class="pg-video"
            :src="withBase(p.video)"
            muted
            loop
            playsinline
            preload="none"
            :aria-label="p.coverAlt || p.title"
          />​
          <div v-if="!p.cover && !p.video" class="pg-cover-placeholder" aria-hidden="true">
            <span class="pg-cover-initial">{{ p.title.slice(0, 1) }}</span>
            <span class="pg-cover-hint">待补截图</span>
          </div>
          <span class="pg-kind">{{ p.kind }}</span>
        </div>

        <div class="pg-body">
          <h3 class="pg-title">{{ p.title }}</h3>
          <p class="pg-tagline">{{ p.tagline }}</p>

          <ul v-if="p.metrics.length" class="pg-metrics">
            <li v-for="m in p.metrics" :key="m">{{ m }}</li>
          </ul>

          <div class="pg-stack">
            <span v-for="s in p.stack" :key="s" class="pg-tag">{{ s }}</span>
          </div>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.pg-root {
  margin-top: 1.5rem;
}

.pg-filter {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.pg-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.18s ease;
}

.pg-chip:hover {
  border-color: var(--pg-accent, var(--vp-c-brand-1));
  color: var(--vp-c-text-1);
}

.pg-chip.active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #fff;
}

.pg-chip-count {
  font-size: 0.75rem;
  opacity: 0.7;
}

.pg-grid {
  display: grid;
  /* 卡片宁可大一些，也不要为了塞满一行把卡片压小：
     4 个项目在 3 列布局下会有一张孤零零落在第二行，视觉上像缺了一块。
     minmax(340px) 让宽屏最多 2 列、窄屏自然回落到 1 列。 */
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 1.25rem;
}

.pg-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  text-decoration: none !important;
  color: inherit;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.pg-card:hover {
  transform: translateY(-3px);
  border-color: var(--pg-accent);
  box-shadow: 0 10px 28px -12px var(--pg-accent);
}

.pg-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--vp-c-bg-alt);
}

.pg-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

/* 视频叠在静态封面上，悬停时淡入播放；未悬停时视频不可见也不加载。 */
.pg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: var(--vp-c-bg-alt);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.pg-cover:hover .pg-video {
  opacity: 1;
}

/* 无静态封面时，视频自己就是封面 */
.pg-cover:not(:has(img)) .pg-video {
  opacity: 1;
  position: relative;
  inset: auto;
}

.pg-card:hover .pg-cover img {
  transform: scale(1.04);
}

.pg-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--pg-accent) 12%, transparent), transparent 70%),
    repeating-linear-gradient(45deg, transparent, transparent 12px, color-mix(in srgb, var(--pg-accent) 6%, transparent) 12px, color-mix(in srgb, var(--pg-accent) 6%, transparent) 13px);
}

.pg-cover-initial {
  font-size: 2.4rem;
  font-weight: 700;
  line-height: 1;
  color: var(--pg-accent);
  opacity: 0.75;
}

.pg-cover-hint {
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
}

.pg-kind {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #fff;
  background: var(--pg-accent);
  opacity: 0.92;
}

.pg-body {
  padding: 0.9rem 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  flex: 1;
}

.pg-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
  line-height: 1.3;
  border: none;
  padding: 0;
}

.pg-tagline {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.pg-metrics {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.pg-metrics li {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  padding-left: 0.9rem;
  position: relative;
}

.pg-metrics li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.5em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--pg-accent);
}

.pg-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: auto;
  padding-top: 0.35rem;
}

.pg-tag {
  font-size: 0.7rem;
  padding: 0.12rem 0.5rem;
  border-radius: 5px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}

@media (max-width: 640px) {
  .pg-grid {
    grid-template-columns: 1fr;
  }
}
</style>
