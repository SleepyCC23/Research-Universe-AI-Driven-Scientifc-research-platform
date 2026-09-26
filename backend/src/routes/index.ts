import { Router } from 'express'
import { asyncHandler, ok } from '../core/http'
import authRouter from './auth.routes'
import meRouter from './me.routes'
import plansRouter from './plans.routes'
import projectsRouter from './projects.routes'
import tasksRouter from './tasks.routes'
import integrationsRouter from './integrations.routes'
import { getJournalProfile } from '../services/journal.service'

const api = Router()

api.use('/auth', authRouter)
api.use('/me', meRouter)
api.use('/plans', plansRouter)
api.use('/projects', projectsRouter)
api.use('/tasks', tasksRouter)
api.use('/integrations', integrationsRouter)

/** GET /journals/:journalId/profile —— 期刊画像 */
api.get(
  '/journals/:journalId/profile',
  asyncHandler(async (req, res) => ok(res, await getJournalProfile(req.params.journalId))),
)

export default api
