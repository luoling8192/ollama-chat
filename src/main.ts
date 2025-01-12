import type { UserModule } from './types'
import { Format, LogLevel, setGlobalFormat, setGlobalLogLevel } from '@guiiai/logg'
import { setupLayouts } from 'virtual:generated-layouts'
import { ViteSSG } from 'vite-ssg'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'
import '@unocss/reset/tailwind.css'
import './styles/main.css'
import 'uno.css'

setGlobalLogLevel(LogLevel.Debug)
setGlobalFormat(Format.Pretty)

// https://github.com/antfu/vite-ssg
export const createApp = ViteSSG(
  App,
  {
    routes: setupLayouts(routes),
    base: import.meta.env.BASE_URL,
  },
  async (ctx) => {
    // install all modules under `modules/`
    const modules = Object.values(import.meta.glob<{ install: UserModule }>('./modules/*.ts', { eager: true }))
    for (const { install } of modules)
      await install?.(ctx)
  },
)
