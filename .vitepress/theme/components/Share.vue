<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ref } from 'vue'

/**
 * 分享按钮
 *
 * 2026-11-11：移除每页路由变化都请求 api.ayaka.io 换短链的逻辑。
 * 现在优先调用系统分享面板（移动端），否则直接复制当前 URL：
 *  - 不再有第三方网络请求，不阻塞首屏
 *  - 不再依赖外部服务可用性
 *  - 复制的是完整原始链接，不会因为短链服务失效而打不开
 */
const { copy, copied } = useClipboard({ source: () => window.location.href })
const busy = ref(false)

async function share() {
  if (busy.value)
    return
  busy.value = true

  try {
    if (navigator.share) {
      await navigator.share({
        title: document.title,
        url: window.location.href,
      })
      return
    }
  }
  catch {
    // 用户取消系统分享面板时继续走复制，不报错
  }
  finally {
    busy.value = false
  }

  await copy()
}
</script>

<template>
  <button
    class="copy"
    type="button"
    :disabled="busy"
    :aria-label="copied ? '链接已复制' : '分享此页'"
    @click="share"
  >
    <span v-if="copied" class="share-label">
      <span class="i-octicon:checkbox-16" aria-hidden="true" />
      <span>已复制</span>
    </span>
    <span v-else class="share-label">
      <span class="i-octicon:share-16" aria-hidden="true" />
      <span>分享此页</span>
    </span>
  </button>
</template>

<style scoped>
.copy {
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-base);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 180ms cubic-bezier(0.2, 0.7, 0.2, 1),
    background-color 180ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.copy:hover:not(:disabled) {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.copy:disabled {
  cursor: wait;
  opacity: 0.7;
}

.share-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 手机顶栏空间有限：只留图标，去掉文字标签 */
@media (max-width: 767px) {
  .copy {
    padding: 0 8px;
  }

  .share-label > span:last-child {
    display: none;
  }
}
</style>
