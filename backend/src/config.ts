import 'dotenv/config'
import { z } from 'zod'
import path from 'node:path'

/**
 * 集中配置：全部来自环境变量，启动时校验，失败即快速退出（fail-fast）。
 * 任何地方都通过 config 读取，不在业务代码里散落 process.env。
 */
const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(8081),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL 必填'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET 必填'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SMS_DEV_RETURN_CODE: z.string().default('true'),

  LLM_BASE_URL: z.string().default(''),
  LLM_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default(''),
  LLM_TIMEOUT_MS: z.coerce.number().default(120000),

  PYTHON_BIN: z.string().default('python'),
  PYTHON_TIMEOUT_MS: z.coerce.number().default(180000),
  ANALYSIS_MODE: z.string().default('python'),

  OPENALEX_MAILTO: z.string().default(''),

  UPLOAD_DIR: z.string().default('uploads'),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('[config] 环境变量校验失败，请检查 .env：')
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const env = parsed.data

export const config = {
  env: env.NODE_ENV,
  isDev: env.NODE_ENV !== 'production',
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,

  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  smsDevReturnCode: env.SMS_DEV_RETURN_CODE === 'true',

  llm: {
    baseUrl: env.LLM_BASE_URL,
    apiKey: env.LLM_API_KEY,
    model: env.LLM_MODEL,
    timeoutMs: env.LLM_TIMEOUT_MS,
    // 只有三项都配置了才认为大模型可用；否则相关接口走模板兜底，保证离线也能跑通
    enabled: !!(env.LLM_BASE_URL && env.LLM_API_KEY && env.LLM_MODEL),
  },

  python: {
    bin: env.PYTHON_BIN,
    timeoutMs: env.PYTHON_TIMEOUT_MS,
    mode: env.ANALYSIS_MODE, // python | llm
  },

  openalexMailto: env.OPENALEX_MAILTO,
  uploadDir: path.resolve(process.cwd(), env.UPLOAD_DIR),
}
