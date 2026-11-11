<script setup lang="ts">
import { withBase } from 'vitepress'

/**
 * 首页「从这里开始」入口区。
 *
 * 静态三卡：知识 / 作坊 / 最近。零运行时请求、零图片，
 * 只用现有页面的真实链接，不编造数据。
 */
const entries = [
  {
    index: '01',
    title: '知识',
    desc: '按主题归档的长期笔记：AI 框架、工程工具、个人知识管理。',
    link: '/vault/Knowledge/_mocs/知识库总览-MOC',
    cta: '浏览知识库',
  },
  {
    index: '02',
    title: '作坊',
    desc: '能跑起来的项目与实验记录，每一件都写清楚取舍。',
    link: '/vault/作坊/',
    cta: '看项目',
  },
  {
    index: '03',
    title: '最近',
    desc: '按更新时间浏览全部内容，适合不定期回来看看。',
    link: '/vault/最近/toc',
    cta: '按时间浏览',
  },
]
</script>

<template>
  <section class="sn-explore">
    <div class="sn-explore-head">
      <div>
        <p class="sn-explore-kicker">Explore</p>
        <h2 class="sn-explore-title">
          从这里开始
        </h2>
      </div>
      <p class="sn-explore-note">
        所有内容用 Markdown 写就：纯文本、可迁移、长期可读。
      </p>
    </div>

    <div class="sn-explore-grid">
      <a
        v-for="entry in entries"
        :key="entry.link"
        class="sn-explore-card"
        :href="withBase(entry.link)"
      >
        <span class="sn-explore-index">{{ entry.index }}</span>
        <h3>{{ entry.title }}</h3>
        <p>{{ entry.desc }}</p>
        <span class="sn-explore-arrow">{{ entry.cta }} →</span>
      </a>
    </div>
  </section>
</template>
