import { Router } from 'express'
import { asyncHandler, ok } from '../core/http'
import { currentUserId, requireAuth } from '../core/auth'
import * as account from '../services/account.service'

const router = Router()
router.use(requireAuth)

router.get('/', asyncHandler(async (req, res) => ok(res, await account.getMe(currentUserId(req)))))
router.get('/account', asyncHandler(async (req, res) => ok(res, await account.getAccountSettings(currentUserId(req)))))
router.patch('/', asyncHandler(async (req, res) => ok(res, await account.updateMe(currentUserId(req), req.body ?? {}))))

router.get('/student-verification', asyncHandler(async (req, res) => ok(res, await account.getVerification(currentUserId(req)))))
router.post('/student-verification', asyncHandler(async (req, res) => ok(res, await account.submitVerification(currentUserId(req), req.body ?? {}))))

router.post('/devices/revoke-others', asyncHandler(async (req, res) => ok(res, await account.revokeOtherDevices(currentUserId(req)))))
router.patch('/notifications', asyncHandler(async (req, res) => ok(res, await account.updateNotification(currentUserId(req), String(req.body?.key), !!req.body?.enabled))))
router.patch('/privacy', asyncHandler(async (req, res) => ok(res, await account.updatePrivacy(currentUserId(req), req.body ?? {}))))
router.post('/data-export', asyncHandler(async (req, res) => ok(res, await account.requestDataExport(currentUserId(req)))))
router.delete('/', asyncHandler(async (req, res) => ok(res, await account.deleteAccount(currentUserId(req), String(req.body?.confirmText ?? '')))))

router.get('/notifications', asyncHandler(async (req, res) => ok(res, await account.getNotifications(currentUserId(req)))))
router.post('/notifications/read', asyncHandler(async (req, res) => ok(res, await account.markNotificationsRead(currentUserId(req)))))

router.get('/quota', asyncHandler(async (req, res) => ok(res, await account.getQuota(currentUserId(req)))))
router.post('/plan', asyncHandler(async (req, res) => ok(res, await account.changePlan(currentUserId(req), String(req.body?.planId ?? '')))))

export default router
