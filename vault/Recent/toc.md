---
nolebase:
  gitChangelog: false
  pageProperties: false
# 最近页是跨栏目汇总，沿用「作坊」侧边栏会误导读者（点进去是作坊目录）。
# 右侧大纲对一份平铺的时间线也没有意义，一并去掉，正文居中。
sidebar: false
aside: false
abstract: 全站知识笔记与作坊实验，按更新时间倒序排列。
---

# 最近更新

排序方式：`最近更新`

---

<script setup>
import { data } from './toc.data'
</script>

<div class="recent-list">
  <NolebaseRecentUpdates :data="data" />
</div>
