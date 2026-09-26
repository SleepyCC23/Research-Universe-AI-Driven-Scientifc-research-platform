import { Router } from 'express'
import { asyncHandler, ok } from '../core/http'
import { getPlans } from '../services/account.service'

const router = Router()

/** GET /plans */
router.get(
  '/',
  asyncHandler(async (_req, res) => ok(res, getPlans())),
)

export default router
