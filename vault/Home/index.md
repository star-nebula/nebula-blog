---
layout: home
sidebar: false

title: Star Nebula Knowledge
titleTemplate: 记录回忆，知识和畅想的地方

hero:
  name: Star Nebula
  text: 记录回忆，知识和畅想的地方
  tagline: 记忆有界，知识无疆
  actions:
    - theme: brand
      text: 开始阅读
      link: /vault/Knowledge/_mocs/知识库总览-MOC
    - theme: alt
      text: GitHub 上浏览
      link: https://github.com/star-nebula/nebula-blog
    - theme: alt
      text: CSDN
      link: https://blog.csdn.net/qq_69608018?type=blog
---

<script setup>
import { data as recent } from './index.data'
</script>

<SpotlightBackground />
<HomePage />
<LatestNotes :items="recent" />
<SiteFeatures />
