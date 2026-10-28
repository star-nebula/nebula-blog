import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blogRouteToSource, blogSourceToRoute, isWithinPublished } from './blog-paths.mjs'

test('moving blog sources preserves every existing section URL', () => {
  // 仍在 vault/blog/ 下的栏目（最近）与已改名的栏目（Home/Workshop）都得保留旧 URL。
  for (const [source, route] of [
    ['vault/blog/最近/index.md', 'vault/最近/index.md'],
    ['vault/blog/最近/网站部署/03-GitHub Pages 自动部署.md', 'vault/最近/网站部署/03-GitHub Pages 自动部署.md'],
    ['vault/Home/index.md', 'vault/主页/index.md'],
    ['vault/Home/网站部署/03-GitHub Pages 自动部署.md', 'vault/主页/网站部署/03-GitHub Pages 自动部署.md'],
    ['vault/Workshop/index.md', 'vault/作坊/index.md'],
    ['vault/Workshop/网站部署/03-GitHub Pages 自动部署.md', 'vault/作坊/网站部署/03-GitHub Pages 自动部署.md'],
  ]) {
    assert.equal(blogSourceToRoute(source), route)
    assert.equal(blogRouteToSource(route), source)
  }
  assert.equal(blogSourceToRoute('vault/Knowledge/AI/Transformer.md'), 'vault/Knowledge/AI/Transformer.md')
  assert.equal(blogSourceToRoute('/vault/Workshop/'), '/vault/作坊/')
  assert.equal(blogSourceToRoute('vault\\blog\\最近\\toc.html'), 'vault/最近/toc.html')
  assert.equal(blogSourceToRoute('vault/blog/私人/index.md'), 'vault/blog/私人/index.md')
})

test('nested publication boundaries reject siblings and prefix lookalikes', () => {
  const published = ['vault/Workshop', 'vault/Home', 'vault/Knowledge']
  assert.ok(isWithinPublished('vault/Workshop/网站部署/index.md', published))
  assert.ok(isWithinPublished('vault/Home/index.md', published))
  assert.ok(isWithinPublished('vault/Knowledge/AI/test.md', published))
  for (const file of ['vault/blog/私人.md', 'vault/blog/私人/index.md', 'vault/Workshop备份/test.md', 'vault/Memory/test.md'])
    assert.equal(isWithinPublished(file, published), false, file)
})
