import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { blogSourceToRoute } from './blog-paths.mjs'

const dist = '.vitepress/dist'

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`
    return entry.isDirectory() ? markdownFiles(path) : path.endsWith('.md') ? [path] : []
  })
}

test('every renamed blog page is built at its previous public URL', () => {
  // 栏目目录已英文化（Home/Workshop/Recent），逐页校验 rewrites 后的旧公开 URL 仍有产物。
  for (const dir of ['vault/Home', 'vault/Workshop', 'vault/Recent']) {
    for (const source of markdownFiles(dir)) {
      const output = blogSourceToRoute(source).replace(/\.md$/, '.html')
      assert.ok(existsSync(join(dist, output)), `Missing output: ${output}`)
    }
  }
})

test('archived blog pages are not published', () => {
  assert.equal(existsSync(join(dist, 'vault/档案')), false)
  const home = decodeURI(readFileSync(join(dist, 'vault/主页/index.html'), 'utf8'))
  assert.doesNotMatch(home, /href="[^"]*\/档案\//)
})

test('workshop gallery links point at real built pages', () => {
  // 作坊首页 2026-11-10 改为 ProjectGallery 卡片网格（视觉化作品集），
  // 链接由组件渲染成普通 <a class="pg-card" href>，不再是 nolebase 的行内预览链接。
  // 断言因此改为：卡片链接必须逐个指向磁盘上真实存在的产物，比原来更强——
  // 原断言只证明「HTML 里有这个 href」，现在同时证明「目标页面真的构建出来了」。
  const html = decodeURI(readFileSync(join(dist, 'vault/作坊/index.html'), 'utf8'))
  const expected = ['feedlens-project', 'glowlink-demo', 'ai-tryon-video-demo', '网页笔记四步工作流']
  const hrefs = [...html.matchAll(/<a href="([^"]+)" class="pg-card[^"]*"/g)].map(m => m[1])
  assert.equal(hrefs.length, expected.length, `Expected ${expected.length} gallery cards, got ${hrefs.length}`)
  for (const [i, href] of hrefs.entries()) {
    const route = decodeURI(href.replace(/^\/nebula-blog\//, ''))
    // 卡片链接是 clean URL（无 .html），GitHub Pages 会映射到同名 .html，故按两种形态查产物。
    const built = existsSync(join(dist, `${route}.html`)) || existsSync(join(dist, route, 'index.html'))
    assert.ok(built, `Gallery card ${i} points at missing page: ${href}`)
    assert.ok(route.startsWith('vault/作坊/'), `Gallery card ${i} must stay under the workshop route, got: ${href}`)
  }
  const targets = hrefs.map(h => h.split('/').pop())
  for (const name of expected)
    assert.ok(targets.includes(name), `Gallery is missing project: ${name}`)
})

test('recent-update links include the GitHub Pages base path', () => {
  const html = decodeURI(readFileSync(join(dist, 'vault/最近/toc.html'), 'utf8'))
  assert.doesNotMatch(html, /href="\/vault\//, 'Recent-update links must retain /nebula-blog/')
  assert.ok(html.includes('href="/nebula-blog/vault/作坊/feedlens-project.html"'))
})
