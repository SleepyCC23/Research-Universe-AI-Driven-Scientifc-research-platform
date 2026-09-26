import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import { config } from '../config'
import { Errors } from './errors'

/** 签发访问令牌（JWT） */
export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

/** 鉴权中间件：解析 Authorization: Bearer <token>，把 userId 注入 req */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('Authorization') ?? ''
  const matched = header.match(/^Bearer\s+(.+)$/i)
  if (!matched) throw Errors.unauthorized()

  try {
    const payload = jwt.verify(matched[1], config.jwtSecret) as jwt.JwtPayload
    if (!payload.sub) throw Errors.unauthorized()
    ;(req as Request & { userId: string }).userId = String(payload.sub)
    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw Errors.tokenExpired()
    if (err instanceof jwt.JsonWebTokenError) throw Errors.unauthorized()
    throw err
  }
}

/** 从请求中取当前用户 id（需搭配 requireAuth 使用） */
export function currentUserId(req: Request): string {
  const id = (req as Request & { userId?: string }).userId
  if (!id) throw Errors.unauthorized()
  return id
}
