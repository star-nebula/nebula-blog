#!/usr/bin/env node
/**
 * scripts/sync-blog-content.mjs
 *
 * 把 E:\knowledge\Output\blog 下的**已整理可发布稿**同步进本仓库的发布目录。
 *
 * 权威源：E:\knowledge\Output\blog     （唯一可发布内容的事实源，在本仓之外）
 * 同步面：vault/Knowledge  ← Output/blog/Knowledge
 *         vault/Workshop   ← Output/blog/Workshop
 *         vault/Attachments← Output/blog/Attachments
 *
 * 为什么需要同步而不是直接读：
 *   本仓远端是公开仓库，GitHub Actions 上不存在 E:\knowledge。构建必须只依赖仓库内文件，
 *   所以 Output/blog 的内容在这里落成一份可 commit 的副本；改内容改 Output，本仓目录视为产物。
 *
 * 行为：
 *   - 默认 dry-run（只报告增/改/删，不落盘）。
 *   - --write 才真实同步：新增/覆盖，并删除「源里已不存在」的旧文件（清空旧内容靠这个）。
 *   - 只动本脚本声明的三个目录，不触碰 Home/Recent 等站点骨架。
 *   - 源目录不存在时直接失败退出，绝不把发布面清空。
 *
 * 用法：
 *   node scripts/sync-blog-content.mjs             # 预览
 *   node scripts/sync-blog-content.mjs --write     # 执行
 *   node scripts/sync-blog-content.mjs --write --source "D:\\other\\blog"
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()

/** 源根目录：可发布内容的事实源（本仓之外）。 */
const DEFAULT_SOURCE = 'E:\\knowledge\\Output\\blog'

/**
 * 同步映射：[源内子路径, 仓库内目标目录]。
 * 目标目录必须都在 .vitepress/config.ts 的 PUBLISHED_DIRS 里，否则会被发布边界检查拦下。
 */
const MAPPINGS = [
  ['Knowledge', 'vault/Knowledge'],
  ['Workshop', 'vault/Workshop'],
  ['Attachments', 'vault/Attachments'],
]

/** 源根下必须存在的子目录；任一缺失说明源不完整，拒绝同步（防止把发布面清空）。 */
const REQUIRED_SOURCE_DIRS = ['Knowledge', 'Workshop', 'Attachments']

const args = process.argv.slice(2)
const write = args.includes('--write')
const sourceIndex = args.indexOf('--source')
const SOURCE = sourceIndex >= 0 && args[sourceIndex + 1] ? args[sourceIndex + 1] : DEFAULT_SOURCE

/** 递归列出目录下所有文件的绝对路径；目录不存在返回空数组。 */
function walk(dir) {
  if (!existsSync(dir))
    return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory())
      out.push(...walk(full))
    else
      out.push(full)
  }
  return out
}

function fail(message) {
  console.error(`\n✗ ${message}`)
  process.exit(1)
}

console.log(`源目录: ${SOURCE}`)
console.log(`模式:   ${write ? '写入' : '预览（dry-run，加 --write 才落盘）'}`)

if (!existsSync(SOURCE))
  fail(`源目录不存在：${SOURCE}\n  请先确认 E:\\knowledge\\Output\\blog 已建立并放入可发布内容。`)

for (const dir of REQUIRED_SOURCE_DIRS) {
  const full = join(SOURCE, dir)
  if (!existsSync(full))
    fail(`源缺少必需子目录：${full}\n  拒绝同步——否则会把对应发布目录清空。`)
}

let totalAdded = 0
let totalUpdated = 0
let totalRemoved = 0
let totalKept = 0

for (const [sourceSub, targetRel] of MAPPINGS) {
  const sourceDir = join(SOURCE, sourceSub)
  const targetDir = join(ROOT, targetRel)
  const sourceFiles = walk(sourceDir)
  const targetFiles = walk(targetDir)

  const sourceRelSet = new Set(sourceFiles.map(f => relative(sourceDir, f).replace(/\\/g, '/')))
  const targetRelSet = new Set(targetFiles.map(f => relative(targetDir, f).replace(/\\/g, '/')))

  const added = [...sourceRelSet].filter(f => !targetRelSet.has(f))
  const removed = [...targetRelSet].filter(f => !sourceRelSet.has(f))
  const common = [...sourceRelSet].filter(f => targetRelSet.has(f))

  let updated = 0
  for (const rel of common) {
    const src = join(sourceDir, rel)
    const dst = join(targetDir, rel)
    if (statSync(src).size !== statSync(dst).size)
      updated++
  }

  console.log(`\n[${sourceSub} → ${targetRel}]`)
  console.log(`  源文件 ${sourceFiles.length} / 目标文件 ${targetFiles.length}`)
  console.log(`  新增 ${added.length} / 变更(体积不同) ${updated} / 删除 ${removed.length} / 保留 ${common.length - updated}`)

  if (added.length)
    console.log(`  新增示例: ${added.slice(0, 5).join(', ')}`)
  if (removed.length)
    console.log(`  删除示例: ${removed.slice(0, 5).join(', ')}`)

  if (write) {
    for (const rel of added) {
      const dst = join(targetDir, rel)
      mkdirSync(dirname(dst), { recursive: true })
      copyFileSync(join(sourceDir, rel), dst)
    }
    for (const rel of common)
      copyFileSync(join(sourceDir, rel), join(targetDir, rel))
    for (const rel of removed)
      rmSync(join(targetDir, rel), { force: true })
    // 顺带清掉因删除文件而变空的目录，避免残留空目录被当作内容。
    pruneEmptyDirs(targetDir)
  }

  totalAdded += added.length
  totalUpdated += updated
  totalRemoved += removed.length
  totalKept += common.length - updated
}

/** 自底向上删除空目录（保留 targetDir 本身）。 */
function pruneEmptyDirs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory())
      continue
    const full = join(dir, entry.name)
    pruneEmptyDirs(full)
    if (readdirSync(full).length === 0)
      rmSync(full, { recursive: true, force: true })
  }
}

console.log(`\n合计: 新增 ${totalAdded} / 变更 ${totalUpdated} / 删除 ${totalRemoved} / 保留 ${totalKept}`)
if (!write)
  console.log('\n未写入。确认无误后执行: node scripts/sync-blog-content.mjs --write')
else
  console.log('\n同步完成。下一步: pnpm check:boundary → pnpm docs:build → node --test scripts/blog-build.test.mjs')
