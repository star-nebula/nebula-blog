---
nolebase:
  gitChangelog: false
  pageProperties: false
---

# 目录

排序方式：`最近更新`

---

<script setup>
import { data } from './toc.data'
</script>

<div class="recent-list">
  <NolebaseRecentUpdates :data="data" />
</div>
