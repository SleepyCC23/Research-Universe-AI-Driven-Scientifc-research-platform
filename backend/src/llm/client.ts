import { config } from '../config'
import { logError } from '../core/http'

/**
 * 通用大模型客户端（OpenAI 兼容协议）
 * ------------------------------------------------------------
 * 只依赖标准的 `/chat/completions` 接口，因此可以挂接任意厂商：
 *   OpenAI / DeepSeek / Moonshot(Kimi) / 通义(Qwen) / 智谱(GLM) / 火山(豆包) ...
 * 只需在 .env 里配置 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 即可，无需改代码。
 */

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  /** 单次调用覆盖全局配置（多模型路由时用） */
  baseUrl?: string
  apiKey?: string
  model?: string
  /** 覆盖超时（毫秒） */
  timeoutMs?: number
}

/** 是否已配置可用的大模型（三项齐全） */
export function llmEnabled(): boolean {
  return config.llm.enabled
}

/** 纯文本对话 */
export async function chatText(system: string, user: string, opts: ChatOptions = {}): Promise<string> {
  const baseUrl = (opts.baseUrl ?? config.llm.baseUrl).replace(/\/+$/, '')
  const apiKey = opts.apiKey ?? config.llm.apiKey
  const model = opts.model ?? config.llm.model

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? config.llm.timeoutMs)
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens,
      }),
      signal: ctrl.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`LLM HTTP ${res.status} ${text.slice(0, 200)}`)
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = json.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('LLM 返回结构异常：缺少 choices[0].message.content')
    return content
  } finally {
    clearTimeout(timer)
  }
}

/** 从模型返回文本中稳健地抽取 JSON（容忍 ```json 代码块与前后说明文字） */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('LLM 未返回 JSON 对象')
  return JSON.parse(body.slice(start, end + 1)) as T
}

/** 要求模型返回 JSON 并解析 */
export async function chatJSON<T>(system: string, user: string, opts: ChatOptions = {}): Promise<T> {
  const raw = await chatText(system, user, { ...opts, temperature: opts.temperature ?? 0.2 })
  return extractJson<T>(raw)
}

/**
 * 容错版：未配置模型或调用失败时返回 null，由调用方走模板兜底。
 * 这样即使没填 API Key，整个后端依然可以离线跑通（生成类接口回落到设计稿示例数据）。
 */
export async function tryChatJSON<T>(system: string, user: string, opts: ChatOptions = {}): Promise<T | null> {
  if (!llmEnabled()) return null
  try {
    return await chatJSON<T>(system, user, opts)
  } catch (err) {
    logError('LLM 调用失败，已回退模板', { err: String(err) })
    return null
  }
}
