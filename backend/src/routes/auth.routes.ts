import { Router } from 'express'
import { asyncHandler, ok } from '../core/http'
import { login, sendSmsCode } from '../services/account.service'

const router = Router()

/** POST /auth/login —— 登录 / 注册（intent=login 时账号不存在不建号） */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const intent = req.body?.intent === 'register' ? 'register' : 'login'
    ok(res, await login(String(req.body?.account ?? ''), String(req.body?.code ?? ''), intent))
  }),
)

/** POST /auth/sms-code */
router.post(
  '/sms-code',
  asyncHandler(async (req, res) => {
    ok(res, await sendSmsCode(String(req.body?.account ?? '')))
  }),
)

/** POST /auth/logout（JWT 无状态，客户端清除 token 即可） */
router.post(
  '/logout',
  asyncHandler(async (_req, res) => ok(res, { success: true })),
)

export default router
