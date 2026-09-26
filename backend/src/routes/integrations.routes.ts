import { Router } from 'express'
import { asyncHandler, ok } from '../core/http'
import { currentUserId, requireAuth } from '../core/auth'
import { bindZotero, getZoteroStatus } from '../services/writing.service'

const router = Router()
router.use(requireAuth)

/** GET /integrations/zotero/status */
router.get(
  '/zotero/status',
  asyncHandler(async (req, res) => ok(res, await getZoteroStatus(currentUserId(req)))),
)

/** POST /integrations/zotero/bind */
router.post(
  '/zotero/bind',
  asyncHandler(async (req, res) => ok(res, await bindZotero(currentUserId(req), !!req.body?.bind, req.body?.account))),
)

export default router
