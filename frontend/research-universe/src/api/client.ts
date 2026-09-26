/**
 * 统一请求客户端
 * - USE_MOCK = true 时全部请求走本地 Mock（默认）
 * - 关闭 Mock 后走 /api，由 vite.config.ts 中的 proxy 转发到真实后端
 * 所有接口都返回 { code, message, data, traceId } 结构（见 types/index.ts -> ApiResponse）
 */
import type { ApiResponse } from '@/types'

/** 是否使用前端 Mock 数据。真实联调时改为 false（或用 VITE_USE_MOCK 环境变量覆盖） */
export const USE_MOCK: boolean =
  (import.meta.env?.VITE_USE_MOCK ?? 'true') !== 'false'

export const API_BASE = '/api/v1'

/** 业务错误码（与 docs/API.md 保持一致） */
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

/** 业务异常 */
export class ApiError extends Error {
  code: number
  traceId: string
  constructor(code: number, message: string, traceId = '-') {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.traceId = traceId
  }
}

/** 唯一 traceId 生成 */
export function genTraceId(prefix = 'tr'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 休眠 */
export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * 清除本地登录凭证与**资料快照**。
 * `ru_auth_cache` 是 store 里 `AUTH_CACHE_KEY` 的值（顶栏用它在刷新瞬间显示已登录用户），
 * 凭证失效时必须一并清掉，否则会留下「僵尸登录态」把旧昵称又显示出来。
 */
export function clearAuthStorage() {
  try {
    localStorage.removeItem('ru_token')
    localStorage.removeItem('ru_auth_cache')
  } catch {
    /* 忽略隐私模式等异常 */
  }
}

/** Mock 延迟（模拟真实网络） */
export async function mockDelay(min = 240, max = 620) {
  await sleep(min + Math.random() * (max - min))
}

/** 包装成功响应 */
export function ok<T>(data: T, message = 'ok'): ApiResponse<T> {
  return { code: ErrorCode.OK, message, data, traceId: genTraceId() }
}

/** 包装失败响应并抛错 */
export function fail(code: number, message: string): never {
  throw new ApiError(code, message, genTraceId('err'))
}

/**
 * 通用请求方法。
 * Mock 模式下由 endpoints.ts 直接返回包装后的数据，不走这里。
 */
export async function request<T>(
  path: string,
  init: RequestInit & { query?: Record<string, unknown> } = {},
): Promise<T> {
  const { query, ...rest } = init
  let url = `${API_BASE}${path}`
  if (query) {
    const qs = new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)]),
    ).toString()
    if (qs) url += `?${qs}`
  }

  // 记录/注入「当前项目 id」：部分真实接口路径被拍平（未含 :projectId），
  // 后端需要 X-Project-Id 头才能定位到项目。这里在路径中捕获 p_xxx 并缓存。
  let activeProjectId = ''
  try {
    const matched = path.match(/\/projects\/(p_[^/?]+)/)
    if (matched) localStorage.setItem('ru_active_project', matched[1])
    activeProjectId = localStorage.getItem('ru_active_project') ?? ''
  } catch {
    activeProjectId = ''
  }

  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('ru_token') ?? ''}`,
      ...(activeProjectId ? { 'X-Project-Id': activeProjectId } : {}),
      ...(rest.headers ?? {}),
    },
  })

  // 凭证缺失 / 失效（401）：清除本地 token 并回到登录页，避免全站 401 死循环。
  // 注意：登录页自身的 /auth/login、/auth/sms-code 是公开接口，不会触发这里。
  if (res.status === 401) {
    clearAuthStorage()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
  }

  if (!res.ok) {
    fail(res.status >= 500 ? ErrorCode.SERVER_ERROR : ErrorCode.PARAM_INVALID, `HTTP ${res.status}`)
  }

  const body = (await res.json()) as ApiResponse<T>
  if (body.code !== ErrorCode.OK) {
    throw new ApiError(body.code, body.message, body.traceId)
  }
  return body.data
}

/**
 * 下载二进制文件到本地（触发浏览器「另存为下载」）。
 *
 * 为什么不用 <a href>：下载接口需要 Authorization 头，而 <a> 无法带自定义头，
 * 因此这里用 fetch 取 blob，再通过临时 ObjectURL 交给浏览器保存。
 *
 * @param pathOrUrl 相对路径（如 /projects/p_1/export/files/x.zip）或完整 URL
 * @param fallbackName 服务端未给文件名时使用的兜底文件名
 * @returns 实际保存的文件名
 */
export async function downloadFile(pathOrUrl: string, fallbackName = 'download.bin'): Promise<string> {
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${API_BASE}${pathOrUrl}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem('ru_token') ?? ''}` },
  })

  if (res.status === 401) {
    clearAuthStorage()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
    throw new ApiError(ErrorCode.UNAUTHORIZED, '登录已失效，请重新登录')
  }

  if (!res.ok) {
    // 后端出错时返回的是 JSON，尽量把业务提示透出来
    let msg = `下载失败（HTTP ${res.status}）`
    try {
      const body = (await res.json()) as ApiResponse<unknown>
      if (body?.message) msg = body.message
    } catch {
      /* 非 JSON 响应，用默认提示 */
    }
    throw new ApiError(ErrorCode.SERVER_ERROR, msg)
  }

  // 后端业务错误也走 HTTP 200（统一响应约定），此时 body 是 JSON 而非文件内容，
  // 必须识别出来抛错，否则会把错误 JSON 当成文件下载到本地。
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    let code: number = ErrorCode.SERVER_ERROR
    let message = '下载失败'
    try {
      const body = (await res.json()) as ApiResponse<unknown>
      code = body?.code ?? code
      message = body?.message || message
    } catch {
      /* 保持默认提示 */
    }
    throw new ApiError(code, message)
  }

  // 文件名优先级：Content-Disposition → RFC5987 filename* → 兜底
  const disposition = res.headers.get('content-disposition') ?? ''
  const starMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  const plainMatch = /filename="?([^";]+)"?/i.exec(disposition)
  let name = fallbackName
  if (starMatch?.[1]) {
    try {
      name = decodeURIComponent(starMatch[1])
    } catch {
      name = starMatch[1]
    }
  } else if (plainMatch?.[1]) {
    name = plainMatch[1]
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = name
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 稍后回收，确保下载已开始
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
  return name
}
