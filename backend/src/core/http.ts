import type { NextFunction, Request, Response } from 'express'
import { ErrorCode, AppError } from './errors'

/** 唯一 traceId 生成（与前端 genTraceId 风格一致） */
export function genTraceId(prefix = 'tr'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 给每个请求注入 traceId；写入 res.locals 与响应头，便于排错 */
export function traceIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const traceId = (req.header('X-Trace-Id') || '').trim() || genTraceId()
  res.locals.traceId = traceId
  res.setHeader('X-Trace-Id', traceId)
  next()
}

/** 取出当前请求的 traceId */
export function traceOf(res: Response): string {
  return (res.locals.traceId as string) || genTraceId('tr')
}

/** 统一成功响应：{ code:0, message, data, traceId } */
export function ok<T>(res: Response, data: T, message = 'ok') {
  res.status(200).json({ code: ErrorCode.OK, message, data, traceId: traceOf(res) })
}

/** 包装 async 路由处理器，把 reject 交给全局错误中间件 */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => any>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/** 404：未匹配到任何路由 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(200).json({
    code: ErrorCode.NOT_FOUND,
    message: `接口不存在：${req.method} ${req.originalUrl}`,
    data: null,
    traceId: traceOf(res),
  })
}

/** 全局错误处理：只向客户端暴露规范化结构，绝不返回堆栈 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const traceId = traceOf(res)
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({ code: err.code, message: err.message, data: null, traceId })
    return
  }
  // 未预期异常：记录日志，返回统一 500（不泄漏内部细节）
  // eslint-disable-next-line no-console
  console.error(`[error] traceId=${traceId}`, err)
  res.status(500).json({
    code: ErrorCode.SERVER_ERROR,
    message: '服务异常，请稍后重试',
    data: null,
    traceId,
  })
}

/** 结构化日志 */
export function logInfo(msg: string, meta: Record<string, unknown> = {}) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: 'info', ts: new Date().toISOString(), msg, ...meta }))
}

export function logError(msg: string, meta: Record<string, unknown> = {}) {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ level: 'error', ts: new Date().toISOString(), msg, ...meta }))
}
