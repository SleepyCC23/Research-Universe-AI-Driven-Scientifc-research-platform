// 临时冒烟配置：复用主配置的代理规则，仅关闭「自动打开浏览器」。
// 用途：验证「前端 → Vite 代理 → 后端」链路。可随时删除。
import { defineConfig, type UserConfig } from 'vite'
import base from './vite.config'

const b = base as UserConfig
export default defineConfig({
  ...b,
  server: { ...b.server, open: false },
})
