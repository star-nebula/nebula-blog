<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * 墨水扩散聚光灯 —— 鼠标移动如墨水滴落纸上向外洇开
 *
 * 2026-11-11 性能重写：
 *  - 只在暗色模式启用（浅色是纸感首页，不需要动画）
 *  - 事件驱动渲染：没有墨滴时完全停止 requestAnimationFrame，不再空转
 *  - 页面隐藏 / Hero 滚出可视区时暂停
 *  - 移动端（粗指针）与 prefers-reduced-motion 下自动关闭
 *  - 径向渐变改为一次性离屏 sprite，每帧只 drawImage，不再重建 gradient
 *  - 墨滴数量上限，避免快速划动时无限增长
 *
 * 视觉规则保持不变：墨滴从中心向外 ease-out 扩散，边缘渐隐；
 * 文字被覆盖处染成遮罩色（夜间黑 / 日间白）。
 */

const canvasRef = ref<HTMLCanvasElement | null>(null)

// ---- 主题感知 ----
const OVERLAY_DARK = 'rgba(16,16,18,0.55)'
const OVERLAY_LIGHT = '#ffffff'

function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark')
}

function getOverlayColor(): string {
  return isDarkMode() ? OVERLAY_DARK : OVERLAY_LIGHT
}

// ---- 墨滴系统 ----
interface InkDrop {
  x: number
  y: number
  age: number
  maxRadius: number
}

let drops: InkDrop[] = []
let lastSpawnX = -9999
let lastSpawnY = -9999

// ---- 可调参数（用户已调定，勿改）----
const SPAWN_DIST = 14
const DROP_INIT_R = 15
const DROP_MAX_R = 100
const DROP_LIFESPAN = 100 // 帧，60fps ≈ 1.67s
const DROP_OPACITY = 1.0
const MAX_DROPS = 48
const MAIN_DPR_CAP = 1 // 遮罩是软边，1x 足够，省一半以上填充率
const TEXT_DPR_CAP = 2

// ---- 动画状态 ----
let hero: HTMLElement | null = null
let canvasEl: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let W = 0
let H = 0
let enabled = false
let visible = true
let rafId = 0
let resizeTimer = 0
let inkSprite: HTMLCanvasElement | null = null

// ---- 文字染色 canvas ----
interface MeasuredChar {
  char: string
  x: number
  y: number
}

interface TextLayer {
  el: HTMLElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  offscreen: HTMLCanvasElement
  offscreenCtx: CanvasRenderingContext2D
  offsetX: number
  offsetY: number
  width: number
  height: number
  dpr: number
  originalColor: string
}

let textLayers: TextLayer[] = []
let textResizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null
let heroObserver: IntersectionObserver | null = null
let motionQuery: MediaQueryList | null = null
let pointerQuery: MediaQueryList | null = null
let fontsReady = false

function getHeroRect(): DOMRect | null {
  return hero ? hero.getBoundingClientRect() : null
}

/** 生成径向 sprite：中心到 65% 实色，边缘透明。一次生成，长期复用。 */
function createSprite(color: string): HTMLCanvasElement {
  const size = 128
  const sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size
  const sctx = sprite.getContext('2d')!
  const half = size / 2
  const grad = sctx.createRadialGradient(half, half, 0, half, half, half)
  grad.addColorStop(0, color)
  grad.addColorStop(0.65, color)
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  sctx.fillStyle = grad
  sctx.fillRect(0, 0, size, size)
  return sprite
}

function ensureSprites() {
  if (!inkSprite)
    inkSprite = createSprite('rgba(255,255,255,1)')
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function resize() {
  if (!canvasEl || !hero)
    return
  const rect = hero.getBoundingClientRect()
  W = rect.width
  H = rect.height
  const dpr = Math.min(window.devicePixelRatio || 1, MAIN_DPR_CAP)
  canvasEl.width = Math.round(W * dpr)
  canvasEl.height = Math.round(H * dpr)
  canvasEl.style.width = `${W}px`
  canvasEl.style.height = `${H}px`
  ctx = canvasEl.getContext('2d')
  if (ctx)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  updateTextLayerSizes()
  requestRender()
}

function spawnDrop(x: number, y: number) {
  const maxR = DROP_MAX_R * (0.7 + Math.random() * 0.6)
  drops.push({ x, y, age: 0, maxRadius: maxR })
  if (drops.length > MAX_DROPS)
    drops.splice(0, drops.length - MAX_DROPS)
}

/**
 * 用 Range API 读取每个字符的真实坐标；只在初始化/尺寸变化时调用。
 */
function measureTextChars(el: HTMLElement): MeasuredChar[] {
  const elRect = el.getBoundingClientRect()
  const chars: MeasuredChar[] = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const textNode = node as Text
    const textContent = textNode.textContent || ''
    for (let i = 0; i < textContent.length; i++) {
      const range = document.createRange()
      range.setStart(textNode, i)
      range.setEnd(textNode, i + 1)
      const cr = range.getBoundingClientRect()
      if (cr.width === 0 && cr.height === 0)
        continue
      chars.push({
        char: textContent[i],
        x: cr.left - elRect.left,
        y: cr.top - elRect.top,
      })
    }
  }
  return chars
}

function renderTextToOffscreen(
  offscreen: HTMLCanvasElement,
  offscreenCtx: CanvasRenderingContext2D,
  el: HTMLElement,
  color: string,
  width: number,
  height: number,
  dpr: number,
): void {
  offscreen.width = Math.round(width * dpr)
  offscreen.height = Math.round(height * dpr)
  offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const style = getComputedStyle(el)
  offscreenCtx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  offscreenCtx.fillStyle = color
  offscreenCtx.textBaseline = 'top'
  offscreenCtx.textAlign = 'left'

  const fontSize = Number.parseFloat(style.fontSize)
  const lineHeight = Number.parseFloat(style.lineHeight)
  const leadingOffset = Number.isNaN(lineHeight) ? 0 : (lineHeight - fontSize) / 2

  for (const ch of measureTextChars(el)) {
    offscreenCtx.fillText(ch.char, ch.x, ch.y + leadingOffset)
  }
}

function createTextLayer(el: HTMLElement, heroRect: DOMRect): TextLayer | null {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0)
    return null

  const dpr = Math.min(window.devicePixelRatio || 1, TEXT_DPR_CAP)
  const width = rect.width
  const height = rect.height

  const canvas = document.createElement('canvas')
  canvas.className = 'ink-text-canvas'
  el.appendChild(canvas)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const layerCtx = canvas.getContext('2d')!
  layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const offscreen = document.createElement('canvas')
  const offscreenCtx = offscreen.getContext('2d')!
  const color = getComputedStyle(el).color
  renderTextToOffscreen(offscreen, offscreenCtx, el, color, width, height, dpr)

  return {
    el,
    canvas,
    ctx: layerCtx,
    offscreen,
    offscreenCtx,
    offsetX: rect.left - heroRect.left,
    offsetY: rect.top - heroRect.top,
    width,
    height,
    dpr,
    originalColor: color,
  }
}

function removeTextLayers() {
  for (const layer of textLayers) {
    layer.canvas.remove()
    layer.el.style.color = layer.originalColor
  }
  textLayers = []
  textResizeObserver?.disconnect()
  textResizeObserver = null
}

function setupTextLayers() {
  removeTextLayers()
  if (!enabled || !hero)
    return

  const heroRect = hero.getBoundingClientRect()
  for (const selector of ['.VPHomeHero .text', '.VPHomeHero .tagline']) {
    const el = document.querySelector(selector) as HTMLElement | null
    if (!el)
      continue
    const layer = createTextLayer(el, heroRect)
    if (!layer)
      continue
    textLayers.push(layer)
    el.style.color = 'transparent'
  }

  textResizeObserver = new ResizeObserver(() => {
    if (textLayers.length === 0)
      return
    updateTextLayerSizes()
    requestRender()
  })
  for (const layer of textLayers)
    textResizeObserver.observe(layer.el)
}

function updateTextLayerSizes() {
  if (!hero || textLayers.length === 0)
    return
  const heroRect = hero.getBoundingClientRect()

  for (const layer of textLayers) {
    const rect = layer.el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0)
      continue

    layer.width = rect.width
    layer.height = rect.height
    layer.dpr = Math.min(window.devicePixelRatio || 1, TEXT_DPR_CAP)

    layer.canvas.width = Math.round(rect.width * layer.dpr)
    layer.canvas.height = Math.round(rect.height * layer.dpr)
    layer.canvas.style.width = `${rect.width}px`
    layer.canvas.style.height = `${rect.height}px`
    layer.ctx.setTransform(layer.dpr, 0, 0, layer.dpr, 0, 0)

    // 临时拿掉 inline transparent，读到样式表里的真实颜色
    const saved = layer.el.style.color
    layer.el.style.color = ''
    const color = getComputedStyle(layer.el).color
    layer.originalColor = color
    layer.el.style.color = saved || 'transparent'

    renderTextToOffscreen(
      layer.offscreen,
      layer.offscreenCtx,
      layer.el,
      color,
      rect.width,
      rect.height,
      layer.dpr,
    )

    layer.offsetX = rect.left - heroRect.left
    layer.offsetY = rect.top - heroRect.top
  }
}

function drawTextLayers() {
  if (!inkSprite)
    return

  for (const layer of textLayers) {
    const { ctx: layerCtx, offscreen, width, height, offsetX, offsetY } = layer
    layerCtx.clearRect(0, 0, width, height)
    layerCtx.globalCompositeOperation = 'source-over'
    layerCtx.drawImage(offscreen, 0, 0, width, height)

    // 墨滴经过的地方擦掉文字，露出背后的壁纸与遮罩，比染成纯黑更自然
    layerCtx.globalCompositeOperation = 'destination-out'
    for (const d of drops) {
      const localX = d.x - offsetX
      const localY = d.y - offsetY
      const maxR = d.maxRadius
      if (localX + maxR < 0 || localX - maxR > width || localY + maxR < 0 || localY - maxR > height)
        continue

      const t = d.age
      const radius = DROP_INIT_R + (d.maxRadius - DROP_INIT_R) * easeOutCubic(t)
      const opacity = DROP_OPACITY * (1 - t) * (1 - t * 0.4)
      layerCtx.globalAlpha = opacity
      layerCtx.drawImage(inkSprite, localX - radius, localY - radius, radius * 2, radius * 2)
    }
    layerCtx.globalAlpha = 1
    layerCtx.globalCompositeOperation = 'source-over'
  }
}

function draw() {
  if (!ctx || !enabled)
    return
  ctx.clearRect(0, 0, W, H)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = getOverlayColor()
  ctx.fillRect(0, 0, W, H)

  ctx.globalCompositeOperation = 'destination-out'
  if (inkSprite) {
    for (const d of drops) {
      const t = d.age
      const radius = DROP_INIT_R + (d.maxRadius - DROP_INIT_R) * easeOutCubic(t)
      const opacity = DROP_OPACITY * (1 - t) * (1 - t * 0.4)
      ctx.globalAlpha = opacity
      ctx.drawImage(inkSprite, d.x - radius, d.y - radius, radius * 2, radius * 2)
    }
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  drawTextLayers()
}

function tick() {
  rafId = 0
  if (!enabled)
    return
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]
    d.age += 1 / DROP_LIFESPAN
    if (d.age >= 1)
      drops.splice(i, 1)
  }
  draw()
  if (drops.length > 0 && visible && !document.hidden)
    requestRender()
}

function requestRender() {
  if (!enabled || rafId || !visible || document.hidden)
    return
  rafId = requestAnimationFrame(tick)
}

function stopRender() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

function handleMove(x: number, y: number) {
  const dx = x - lastSpawnX
  const dy = y - lastSpawnY
  const dist = Math.hypot(dx, dy)
  if (dist <= SPAWN_DIST)
    return

  const steps = Math.ceil(dist / SPAWN_DIST)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    spawnDrop(lastSpawnX + dx * t, lastSpawnY + dy * t)
  }
  lastSpawnX = x
  lastSpawnY = y
  requestRender()
}

function onPointerMove(e: PointerEvent) {
  const rect = getHeroRect()
  if (!rect)
    return
  handleMove(e.clientX - rect.left, e.clientY - rect.top)
}

function canAnimate(): boolean {
  return isDarkMode()
    && !document.hidden
    && !motionQuery?.matches
    && !!pointerQuery?.matches
}

function enable() {
  if (!canvasEl || !hero)
    return
  enabled = true
  canvasEl.hidden = false
  ensureSprites()
  resize()
  requestRender()
  if (fontsReady || !document.fonts)
    setupTextLayers()
  else
    document.fonts.ready.then(() => {
      fontsReady = true
      setupTextLayers()
    })
}

function disable() {
  enabled = false
  stopRender()
  drops = []
  removeTextLayers()
  if (ctx)
    ctx.clearRect(0, 0, W, H)
  if (canvasEl)
    canvasEl.hidden = true
}

function syncMode() {
  if (canAnimate())
    enable()
  else
    disable()
}

function scheduleResize() {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    if (!enabled)
      return
    resize()
    setupTextLayers()
  }, 120)
}

function onVisibilityChange() {
  if (document.hidden) {
    stopRender()
  }
  else if (enabled) {
    requestRender()
  }
}

onMounted(() => {
  hero = document.querySelector('.VPHomeHero') as HTMLElement | null
  canvasEl = canvasRef.value
  if (!hero || !canvasEl)
    return

  hero.appendChild(canvasEl)
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)')

  ensureSprites()
  syncMode()

  if (!document.fonts)
    fontsReady = true

  hero.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('resize', scheduleResize)
  document.addEventListener('visibilitychange', onVisibilityChange)
  motionQuery.addEventListener('change', syncMode)
  pointerQuery.addEventListener('change', syncMode)

  themeObserver = new MutationObserver(() => syncMode())
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  heroObserver = new IntersectionObserver((entries) => {
    visible = entries.some(entry => entry.isIntersecting)
    if (!visible)
      stopRender()
    else if (drops.length > 0)
      requestRender()
  }, { rootMargin: '80px' })
  heroObserver.observe(hero)
})

onUnmounted(() => {
  disable()
  window.clearTimeout(resizeTimer)
  hero?.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('resize', scheduleResize)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  motionQuery?.removeEventListener('change', syncMode)
  pointerQuery?.removeEventListener('change', syncMode)
  themeObserver?.disconnect()
  heroObserver?.disconnect()
  themeObserver = null
  heroObserver = null
  motionQuery = null
  pointerQuery = null
  canvasEl?.remove()
  canvasEl = null
  ctx = null
  hero = null
})
</script>

<template>
  <canvas ref="canvasRef" class="spotlight-canvas" hidden />
</template>

<style scoped>
.spotlight-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

.spotlight-canvas[hidden] {
  display: none;
}
</style>
