import type { Theme } from 'vitepress'

import { presetClient } from '@nolebase/integrations/vitepress/client'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'

import AppContainer from './components/AppContainer.vue'
import DocFooter from './components/DocFooter.vue'
import HomePage from './components/HomePage.vue'
import KnowledgeExplorer from './components/KnowledgeExplorer.vue'
import PageMeta from './components/PageMeta.vue'
import ProjectGallery from './components/ProjectGallery.vue'
import Share from './components/Share.vue'

import 'virtual:uno.css'
import '../styles/main.css'
import '../styles/vars.css'
import '../styles/design.css'

const nolebase = presetClient({
  gitChangelog: false,
  pageProperties: false,
  /**
   * 阅读增强（布局切换 / 聚光灯）整块不装载：不注册组件、顶栏与手机菜单里也就没有入口。
   *
   * 布局固定为「全部展开」，宽度写死在 design.css：
   * 首屏就是终态，不存在「挂载后才给 body 加布局 class」的二次排版（CLS 0）。
   * 没有布局开关，聚光灯也就没有开关可挂，一并取消。
   */
  enhancedReadabilities: false,
})

const ExtendedTheme: Theme = {
  extends: DefaultTheme,
  Layout: () => {
    const slots = nolebase!.enhanceLayout?.() ?? {}

    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'doc-before': () => [
        h(PageMeta),
      ],
      'doc-top': () => [
        ...slots['doc-top'].map(slot => slot()),
      ],
      'doc-footer-before': () => [
        h(DocFooter),
      ],
      'nav-bar-content-after': () => [
        h(Share),
      ],
    })
  },
  async enhanceApp(ctx) {
    const { app } = ctx

    /**
     * Have to manually import and register the essential components that needed during build globally.
     *
     * Learn more at: Warn `Hydration completed but contains mismatches.` and Custom components are not rendered · Issue #1918 · vuejs/vitepress
     * https://github.com/vuejs/vitepress/issues/1918
     */

    await nolebase?.enhanceApp?.(ctx)

    /**
     * 部署后旧页面可能仍持有过期的 page hash map：客户端路由会加载不到新页面，
     * 静默退回 404 视图，表现为「点了顶栏链接但没跳过去」。
     * 顶栏链接都指向确定存在的页面，所以落到 404 就整页跳转一次自愈。
     * 同一次点击只兜底一次，避免真的 404 链接被反复刷新。
     */
    if (typeof window !== 'undefined') {
      const RETRY_KEY = 'sn-nav-retry'

      window.addEventListener('click', (event) => {
        const target = event.target
        if (!(target instanceof Element))
          return
        const link = target.closest<HTMLAnchorElement>('.VPNavBar a[href], .VPNavScreen a[href]')
        if (!link || link.hasAttribute('target'))
          return
        const { href } = link

        window.setTimeout(() => {
          if (!document.querySelector('.NotFound'))
            return
          try {
            if (sessionStorage.getItem(RETRY_KEY) === href)
              return
            sessionStorage.setItem(RETRY_KEY, href)
          }
          catch {
            // 隐私模式下 sessionStorage 不可用：仍然兜底一次
          }
          window.location.assign(href)
        }, 1200)
      }, { capture: true })
    }

    app.component('HomePage', HomePage)
    app.component('DocFooter', DocFooter)
    app.component('KnowledgeExplorer', KnowledgeExplorer)
    app.component('PageMeta', PageMeta)
    app.component('ProjectGallery', ProjectGallery)
    app.component('Share', Share)
    app.component('AppContainer', AppContainer)
  },
}

export default ExtendedTheme
