import express from 'express'
import cors from 'cors'
import { errorHandler, logInfo, notFoundHandler, traceIdMiddleware } from './core/http'
import apiRouter from './routes'

/** 创建 Express 应用：中间件顺序 = CORS → JSON 解析 → traceId → 日志 → 路由 → 404 → 错误处理 */
export function createApp() {
  const app = express()

  // 开发环境允许任意来源（前端 5173）；生产请改为显式白名单
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '10mb' }))
  app.use(traceIdMiddleware)

  app.use((req, _res, next) => {
    logInfo('request', { method: req.method, url: req.originalUrl })
    next()
  })

  // 健康检查
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() })
  })

  // 业务接口统一挂在 /api/v1
  app.use('/api/v1', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
