import { createApp } from './app'
import { config } from './config'
import { prisma } from './prisma'
import { logError, logInfo } from './core/http'

async function main() {
  await prisma.$connect()
  const app = createApp()

  const server = app.listen(config.port, () => {
    logInfo('研宇宙后端已启动', {
      port: config.port,
      env: config.env,
      llm: config.llm.enabled ? '已配置（生成类接口走大模型）' : '未配置（生成类接口走模板兜底）',
      analysis: config.python.mode === 'python' ? 'Python 真实计算' : 'LLM 占位',
      api: `http://localhost:${config.port}/api/v1`,
    })
  })

  // 优雅停机
  const shutdown = async (signal: string) => {
    logInfo('收到停机信号，正在关闭…', { signal })
    server.close()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  logError('服务启动失败', { err: String(err) })
  process.exit(1)
})
