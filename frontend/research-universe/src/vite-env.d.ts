/// <reference types="vite/client" />

/** 环境变量类型声明 */
interface ImportMetaEnv {
  /** 'false' 时关闭前端 Mock，走真实后端 */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
