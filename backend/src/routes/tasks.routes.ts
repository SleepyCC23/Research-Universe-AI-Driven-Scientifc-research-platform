import { Router } from 'express'
import { asyncHandler, ok } from '../core/http'
import { getTask } from '../services/task.service'

const router = Router()

/** GET /tasks/:taskId —— 异步任务轮询 */
router.get(
  '/:taskId',
  asyncHandler(async (req, res) => ok(res, await getTask(req.params.taskId))),
)

export default router
