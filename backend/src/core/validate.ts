import { z } from 'zod'
import { Errors } from './errors'

/** 用 zod 校验数据；失败抛 PARAM_INVALID(40001) */
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const first = result.error.issues[0]
    const path = first?.path?.length ? `${first.path.join('.')}: ` : ''
    throw Errors.param(`${path}${first?.message ?? '参数校验失败'}`)
  }
  return result.data
}

export const validateBody = <T>(schema: z.ZodType<T>, req: { body: unknown }) => parse(schema, req.body)
export const validateQuery = <T>(schema: z.ZodType<T>, req: { query: unknown }) => parse(schema, req.query)
export const validateParams = <T>(schema: z.ZodType<T>, req: { params: unknown }) => parse(schema, req.params)
