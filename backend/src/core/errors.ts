/**
 * 业务错误码 + 类型化异常。
 * 与前端 src/api/client.ts 的 ErrorCode 一一对应。
 */
export const ErrorCode = {
  OK: 0,
  PARAM_INVALID: 40001,
  UNAUTHORIZED: 40101,
  TOKEN_EXPIRED: 40102,
  FORBIDDEN_ROLE: 40301,
  DATA_LEVEL_BLOCKED: 40302,
  EXPORT_BLOCKED_BY_VERIFY: 40303,
  NOT_FOUND: 40401,
  FILE_TOO_LARGE: 41301,
  FILE_FORMAT_UNSUPPORTED: 41501,
  QUOTA_EXCEEDED: 42901,
  TASK_ALREADY_RUNNING: 40901,
  SERVER_ERROR: 50001,
  TASK_FAILED: 50002,
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]

/** HTTP 状态码映射：业务错误默认 200 + code 非 0；鉴权失败 401；服务异常 5xx */
function httpOf(code: number): number {
  switch (code) {
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.TOKEN_EXPIRED:
      return 401
    case ErrorCode.SERVER_ERROR:
    case ErrorCode.TASK_FAILED:
      return 500
    default:
      return 200
  }
}

/** 类型化业务异常：message 是可展示给用户的中文文案 */
export class AppError extends Error {
  code: number
  httpStatus: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.httpStatus = httpOf(code)
  }
}

export const Errors = {
  param: (msg = '参数校验失败') => new AppError(ErrorCode.PARAM_INVALID, msg),
  unauthorized: (msg = '登录已失效，请重新登录') => new AppError(ErrorCode.UNAUTHORIZED, msg),
  tokenExpired: (msg = '登录已过期，请重新登录') => new AppError(ErrorCode.TOKEN_EXPIRED, msg),
  forbiddenRole: (msg = '当前角色无此操作权限') => new AppError(ErrorCode.FORBIDDEN_ROLE, msg),
  dataLevelBlocked: (msg = '当前数据级别不允许该操作') => new AppError(ErrorCode.DATA_LEVEL_BLOCKED, msg),
  exportBlockedByVerify: (msg = '存在未通过核验的文献，已阻断导出') =>
    new AppError(ErrorCode.EXPORT_BLOCKED_BY_VERIFY, msg),
  notFound: (msg = '资源不存在') => new AppError(ErrorCode.NOT_FOUND, msg),
  fileTooLarge: (msg = '文件体积超出限制') => new AppError(ErrorCode.FILE_TOO_LARGE, msg),
  fileFormat: (msg = '文件格式不受支持') => new AppError(ErrorCode.FILE_FORMAT_UNSUPPORTED, msg),
  quota: (msg = '额度已用尽') => new AppError(ErrorCode.QUOTA_EXCEEDED, msg),
  taskRunning: (msg = '已有相同任务在执行') => new AppError(ErrorCode.TASK_ALREADY_RUNNING, msg),
  server: (msg = '服务异常，请稍后重试') => new AppError(ErrorCode.SERVER_ERROR, msg),
  taskFailed: (msg = '任务执行失败') => new AppError(ErrorCode.TASK_FAILED, msg),
}
