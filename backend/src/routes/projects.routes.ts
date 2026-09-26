import { Router, type Request, type Response } from 'express'
import { asyncHandler, ok } from '../core/http'
import { currentUserId, requireAuth } from '../core/auth'
import { resolveProjectId } from '../services/common'
import * as projectService from '../services/project.service'
import * as intro from '../services/intro.service'
import * as lit from '../services/literature.service'
import * as analysis from '../services/analysis.service'
import * as writing from '../services/writing.service'
import * as journal from '../services/journal.service'
import * as review from '../services/review.service'
import * as exp from '../services/export.service'
import { getTaskResult } from '../services/task.service'

type Handler = (req: Request, res: Response) => Promise<void> | void
const router = Router()
router.use(requireAuth)

/** 注册助手：同一处理器可挂在多个路径（兼容前端「拍平路径」与规范路径） */
const GET = (paths: string[], h: Handler) => paths.forEach((p) => router.get(p, asyncHandler(h)))
const POST = (paths: string[], h: Handler) => paths.forEach((p) => router.post(p, asyncHandler(h)))
const PATCH = (paths: string[], h: Handler) => paths.forEach((p) => router.patch(p, asyncHandler(h)))
const DEL = (paths: string[], h: Handler) => paths.forEach((p) => router.delete(p, asyncHandler(h)))

const P = (req: Request) => resolveProjectId(req)

/* ---------- 1) 集合级（静态路径，必须在 /:projectId 之前注册）---------- */
GET(['/'], async (req, res) => ok(res, await projectService.listProjects(currentUserId(req), req.query as Record<string, string>)))
POST(['/'], async (req, res) => ok(res, await projectService.createProject(currentUserId(req), req.body ?? {})))
GET(['/ddl'], async (req, res) => ok(res, await projectService.getDdlTimeline(currentUserId(req))))
GET(['/ddl-keywords'], async (req, res) => ok(res, await projectService.getDdlKeywords(currentUserId(req))))
PATCH(['/data-level'], async (req, res) => ok(res, await projectService.updateDataLevel(currentUserId(req), P(req), String(req.body?.dataLevel))))
PATCH(['/progress'], async (req, res) => ok(res, await projectService.saveProjectProgress(req.body ?? {})))

/* ---------- 2) 扁平别名（前端真实分支路径，兼容处理）---------- */
POST(['/hotspot/analyze'], async (req, res) => ok(res, await intro.analyzeHotspot(P(req), String(req.body?.researchDirection ?? ''))))
POST(['/topic/keywords/analyze'], async (req, res) => ok(res, await intro.analyzeTopicKeywords(P(req), req.body ?? {})))
POST(['/topic/keywords/lock'], async (req, res) => ok(res, await intro.lockConcepts(P(req), req.body?.concepts ?? [])))
POST(['/topic/theory/select'], async (req, res) => ok(res, await intro.selectTheory(P(req), String(req.body?.theoryId ?? ''))))
POST(['/data/files'], async (req, res) => ok(res, await intro.uploadDataFile(P(req), req.body ?? {})))
POST(['/data/import-public'], async (req, res) => ok(res, await intro.importPublicDataset(P(req), String(req.body?.datasetId ?? ''))))
POST(['/data/sample/:sampleId'], async (req, res) => ok(res, await intro.loadSampleDataset(P(req), req.params.sampleId)))
POST(['/data/variables/confirm'], async (req, res) => ok(res, await intro.confirmVariables(P(req), req.body?.variables ?? [])))
POST(['/data/hypotheses/generate'], async (req, res) => ok(res, await intro.generateHypotheses(P(req), req.body?.prompt)))
POST(['/data/hypotheses/confirm'], async (req, res) => ok(res, await intro.confirmHypotheses(P(req), req.body?.hypotheses ?? [])))
POST(['/literature/search'], async (req, res) => ok(res, await lit.searchLiterature(P(req), req.body ?? {})))
POST(['/literature/selection'], async (req, res) => ok(res, await lit.updateSelection(P(req), String(req.body?.paperId), !!req.body?.selected)))
POST(['/literature/upload'], async (req, res) => ok(res, await lit.uploadLiterature(P(req), req.body?.fileName)))
POST(['/literature/generate-review'], async (req, res) => ok(res, await lit.generateStructuredReview(P(req))))
POST(['/literature/verify'], async (req, res) => ok(res, await lit.verifyLiterature(P(req), req.body?.paperIds)))
POST(['/kb/qa'], async (req, res) => ok(res, await lit.askKnowledgeBase(P(req), String(req.body?.question ?? ''))))
POST(['/literature/bring-to-writing'], async (req, res) => ok(res, await lit.bringToWriting(P(req))))
POST(['/analysis/import'], async (req, res) => ok(res, await analysis.importProjectData(P(req), req.body ?? {})))
POST(['/analysis/run'], async (req, res) => ok(res, await analysis.runAnalysis(P(req), req.body ?? {})))
POST(['/analysis/methods/refresh'], async (req, res) => ok(res, await analysis.refreshMethods(P(req))))
POST(['/analysis/rollback'], async (req, res) => ok(res, await analysis.rollbackAnalysis(P(req), String(req.body?.versionNo ?? ''))))
PATCH(['/writing/doc'], async (req, res) => ok(res, await writing.saveWritingDoc(P(req), req.body ?? {})))
POST(['/writing/outline/generate'], async (req, res) => ok(res, await writing.generateOutline(P(req))))
POST(['/writing/section/regenerate'], async (req, res) => ok(res, await writing.regenerateSection(P(req), String(req.body?.section ?? ''))))
POST(['/writing/paragraph/rewrite'], async (req, res) => ok(res, await writing.rewriteParagraph(P(req), String(req.body?.paraId), String(req.body?.action), req.body?.instruction ? String(req.body.instruction) : undefined)))
POST(['/writing/citation'], async (req, res) => ok(res, await writing.insertCitation(P(req), String(req.body?.paperId), req.body?.style ?? 'APA7')))
POST(['/writing/citation-style'], async (req, res) => ok(res, await writing.switchCitationStyle(P(req), String(req.body?.style ?? 'APA7') as 'APA7' | 'GBT7714')))
POST(['/writing/ai-suggestion/adopt'], async (req, res) => ok(res, await writing.adoptSuggestion(P(req), String(req.body?.suggestionId))))
POST(['/writing/manuscript/publish'], async (req, res) => ok(res, await exp.publishManuscript(P(req))))
POST(['/journals/match'], async (req, res) => ok(res, await journal.matchJournals(P(req), req.body ?? {})))
POST(['/submission-package'], async (req, res) => ok(res, await journal.generateSubmissionPackage(P(req))))
POST(['/review/recalibrate'], async (req, res) => ok(res, await review.recalibrateReview(P(req), req.body ?? {})))
PATCH(['/review/issues/:issueId'], async (req, res) => ok(res, await review.handleReviewIssue(P(req), req.params.issueId, String(req.body?.handled))))
POST(['/review/rebuttal'], async (req, res) => ok(res, await review.generateRebuttal(P(req), req.body?.issueCodes)))
POST(['/export/disclosure'], async (req, res) => ok(res, await exp.generateDisclosure(P(req))))
POST(['/export/artifacts'], async (req, res) => ok(res, await exp.exportArtifacts(P(req), req.body ?? {})))
POST(['/export/confirm-unverified'], async (req, res) => ok(res, await exp.confirmUnverifiedExport(P(req))))
POST(['/export/upload-pdf'], async (req, res) => ok(res, await exp.uploadVerifyPdf(P(req))))
POST(['/members/invite'], async (req, res) => ok(res, await projectService.inviteMember(P(req), String(req.body?.account ?? ''), String(req.body?.role ?? 'collaborator'))))

/* ---------- 3) 规范 project-scoped 路径（含 :projectId）---------- */
GET(['/:projectId'], async (req, res) => ok(res, await projectService.getProject(req.params.projectId)))
PATCH(['/:projectId'], async (req, res) => ok(res, await projectService.updateProject(currentUserId(req), req.params.projectId, req.body ?? {})))
// 删除项目：级联清除全部关联数据，并清理磁盘上的导出包
DEL(['/:projectId'], async (req, res) => ok(res, await projectService.deleteProject(currentUserId(req), req.params.projectId)))
GET(['/:projectId/compliance'], async (req, res) => ok(res, await projectService.getCompliance(req.params.projectId)))
PATCH(['/:projectId/skip-confirm'], async (req, res) => ok(res, await projectService.updateSkipConfirm(req.params.projectId, !!req.body?.skipConfirm)))
PATCH(['/:projectId/data-level'], async (req, res) => ok(res, await projectService.updateDataLevel(currentUserId(req), req.params.projectId, String(req.body?.dataLevel))))
PATCH(['/:projectId/ddl-keyword'], async (req, res) => ok(res, await projectService.updateDdlKeyword(req.params.projectId, String(req.body?.selected ?? ''))))
GET(['/:projectId/stage-artifacts'], async (req, res) => ok(res, await projectService.getStageArtifacts(req.params.projectId)))
GET(['/:projectId/settings'], async (req, res) => ok(res, await projectService.getSettings(req.params.projectId)))
POST(['/:projectId/members/invite'], async (req, res) => ok(res, await projectService.inviteMember(req.params.projectId, String(req.body?.account ?? ''), String(req.body?.role ?? 'collaborator'))))
POST(['/:projectId/versions/:versionNo/rollback'], async (req, res) => ok(res, await projectService.rollbackProjectVersion(currentUserId(req), req.params.projectId, req.params.versionNo)))
GET(['/:projectId/progress'], async (req, res) => ok(res, await projectService.getProgress(req.params.projectId)))
GET(['/:projectId/steps/:stepKey/draft'], async (req, res) => ok(res, await projectService.getStepDraft(req.params.projectId, req.params.stepKey)))
PATCH(['/:projectId/steps/:stepKey/draft'], async (req, res) => ok(res, await projectService.saveStepDraft(req.params.projectId, req.params.stepKey, req.body?.draft ?? {})))

// 引言
GET(['/:projectId/intro/hotspot'], async (req, res) => ok(res, await intro.getHotspot(req.params.projectId)))
POST(['/:projectId/intro/hotspot/analyze'], async (req, res) => ok(res, await intro.analyzeHotspot(req.params.projectId, String(req.body?.researchDirection ?? ''))))
POST(['/:projectId/intro/confirm-direction'], async (req, res) => ok(res, await intro.confirmDirection(req.params.projectId)))
GET(['/:projectId/intro/topic/keywords'], async (req, res) => ok(res, await intro.getTopicKeywords(req.params.projectId)))
POST(['/:projectId/intro/topic/keywords/analyze'], async (req, res) => ok(res, await intro.analyzeTopicKeywords(req.params.projectId, req.body ?? {})))
POST(['/:projectId/intro/topic/keywords/lock'], async (req, res) => ok(res, await intro.lockConcepts(req.params.projectId, req.body?.concepts ?? [])))
GET(['/:projectId/intro/topic/theory'], async (req, res) => ok(res, await intro.getTopicTheory(req.params.projectId)))
POST(['/:projectId/intro/topic/theory/select'], async (req, res) => ok(res, await intro.selectTheory(req.params.projectId, String(req.body?.theoryId ?? ''))))

// 数据
GET(['/:projectId/data/upload'], async (req, res) => ok(res, await intro.getDataUpload(req.params.projectId)))
POST(['/:projectId/data/files'], async (req, res) => ok(res, await intro.uploadDataFile(req.params.projectId, req.body ?? {})))
DEL(['/:projectId/data/files/:fileId'], async (req, res) => ok(res, await intro.removeDataFile(req.params.projectId, req.params.fileId)))
POST(['/:projectId/data/import-public'], async (req, res) => ok(res, await intro.importPublicDataset(req.params.projectId, String(req.body?.datasetId ?? ''))))
POST(['/:projectId/data/sample/:sampleId'], async (req, res) => ok(res, await intro.loadSampleDataset(req.params.projectId, req.params.sampleId)))
GET(['/:projectId/data/variables'], async (req, res) => ok(res, await intro.getVariables(req.params.projectId)))
PATCH(['/:projectId/data/variables/:varName'], async (req, res) => ok(res, await intro.updateVariable(req.params.projectId, req.params.varName, req.body ?? {})))
POST(['/:projectId/data/variables/confirm'], async (req, res) => ok(res, await intro.confirmVariables(req.params.projectId, req.body?.variables ?? [])))
GET(['/:projectId/data/hypotheses'], async (req, res) => ok(res, await intro.getHypotheses(req.params.projectId)))
POST(['/:projectId/data/hypotheses/generate'], async (req, res) => ok(res, await intro.generateHypotheses(req.params.projectId, req.body?.prompt)))
POST(['/:projectId/data/hypotheses/confirm'], async (req, res) => ok(res, await intro.confirmHypotheses(req.params.projectId, req.body?.hypotheses ?? [])))

// 文献
GET(['/:projectId/literature'], async (req, res) => ok(res, await lit.getLiterature(req.params.projectId)))
POST(['/:projectId/literature/search'], async (req, res) => ok(res, await lit.searchLiterature(req.params.projectId, req.body ?? {})))
POST(['/:projectId/literature/selection'], async (req, res) => ok(res, await lit.updateSelection(req.params.projectId, String(req.body?.paperId), !!req.body?.selected)))
POST(['/:projectId/literature/upload'], async (req, res) => ok(res, await lit.uploadLiterature(req.params.projectId, req.body?.fileName)))
POST(['/:projectId/literature/generate-review'], async (req, res) => ok(res, await lit.generateStructuredReview(req.params.projectId)))
POST(['/:projectId/literature/verify'], async (req, res) => ok(res, await lit.verifyLiterature(req.params.projectId, req.body?.paperIds)))
POST(['/:projectId/kb/qa'], async (req, res) => ok(res, await lit.askKnowledgeBase(req.params.projectId, String(req.body?.question ?? ''))))
POST(['/:projectId/literature/bring-to-writing'], async (req, res) => ok(res, await lit.bringToWriting(req.params.projectId)))

// 分析
GET(['/:projectId/analysis'], async (req, res) => ok(res, await analysis.getAnalysis(req.params.projectId)))
POST(['/:projectId/analysis/import'], async (req, res) => ok(res, await analysis.importProjectData(req.params.projectId, req.body ?? {})))
GET(['/:projectId/analysis/health-report'], async (req, res) => ok(res, await analysis.getHealthReport(req.params.projectId)))
GET(['/:projectId/analysis/methods'], async (req, res) => ok(res, await analysis.getMethods(req.params.projectId)))
POST(['/:projectId/analysis/methods/refresh'], async (req, res) => ok(res, await analysis.refreshMethods(req.params.projectId)))
POST(['/:projectId/analysis/run'], async (req, res) => ok(res, await analysis.runAnalysis(req.params.projectId, req.body ?? {})))
GET(['/:projectId/analysis/runs/:runId'], async (req, res) => ok(res, await analysis.getAnalysisResult(req.params.projectId, req.params.runId)))
POST(['/:projectId/analysis/rollback'], async (req, res) => ok(res, await analysis.rollbackAnalysis(req.params.projectId, String(req.body?.versionNo ?? ''))))

// 导出文件下载（真实文件流，非 JSON 包装）
router.get(
  '/:projectId/export/files/:fileName',
  asyncHandler(async (req, res) => {
    const abs = await exp.resolveExportFile(req.params.projectId, req.params.fileName)
    res.download(abs, req.params.fileName)
  }),
)

// 写作
GET(['/:projectId/writing'], async (req, res) => ok(res, await writing.getWriting(req.params.projectId)))
PATCH(['/:projectId/writing/doc'], async (req, res) => ok(res, await writing.saveWritingDoc(req.params.projectId, req.body ?? {})))
POST(['/:projectId/writing/outline/generate'], async (req, res) => ok(res, await writing.generateOutline(req.params.projectId)))
POST(['/:projectId/writing/section/regenerate'], async (req, res) => ok(res, await writing.regenerateSection(req.params.projectId, String(req.body?.section ?? ''))))
POST(['/:projectId/writing/paragraph/rewrite'], async (req, res) => ok(res, await writing.rewriteParagraph(req.params.projectId, String(req.body?.paraId), String(req.body?.action), req.body?.instruction ? String(req.body.instruction) : undefined)))
POST(['/:projectId/writing/citation'], async (req, res) => ok(res, await writing.insertCitation(req.params.projectId, String(req.body?.paperId), req.body?.style ?? 'APA7')))
POST(['/:projectId/writing/citation-style'], async (req, res) => ok(res, await writing.switchCitationStyle(req.params.projectId, String(req.body?.style ?? 'APA7') as 'APA7' | 'GBT7714')))
POST(['/:projectId/writing/ai-suggestion/adopt'], async (req, res) => ok(res, await writing.adoptSuggestion(req.params.projectId, String(req.body?.suggestionId))))
POST(['/:projectId/writing/manuscript/publish'], async (req, res) => ok(res, await exp.publishManuscript(req.params.projectId)))

// 选刊
GET(['/:projectId/journals'], async (req, res) => ok(res, await journal.getJournals(req.params.projectId)))
POST(['/:projectId/journals/match'], async (req, res) => ok(res, await journal.matchJournals(req.params.projectId, req.body ?? {})))
POST(['/:projectId/submission-package'], async (req, res) => ok(res, await journal.generateSubmissionPackage(req.params.projectId)))

// 评审
GET(['/:projectId/review'], async (req, res) => ok(res, await review.getReview(req.params.projectId)))
POST(['/:projectId/review/recalibrate'], async (req, res) => ok(res, await review.recalibrateReview(req.params.projectId, req.body ?? {})))
PATCH(['/:projectId/review/issues/:issueId'], async (req, res) => ok(res, await review.handleReviewIssue(req.params.projectId, req.params.issueId, String(req.body?.handled))))
POST(['/:projectId/review/rebuttal'], async (req, res) => ok(res, await review.generateRebuttal(req.params.projectId, req.body?.issueCodes)))

// 导出
GET(['/:projectId/export'], async (req, res) => ok(res, await exp.getExport(req.params.projectId)))
POST(['/:projectId/export/disclosure'], async (req, res) => ok(res, await exp.generateDisclosure(req.params.projectId)))
POST(['/:projectId/export/artifacts'], async (req, res) => ok(res, await exp.exportArtifacts(req.params.projectId, req.body ?? {})))
POST(['/:projectId/export/confirm-unverified'], async (req, res) => ok(res, await exp.confirmUnverifiedExport(req.params.projectId)))
POST(['/:projectId/export/upload-pdf'], async (req, res) => ok(res, await exp.uploadVerifyPdf(req.params.projectId)))

export default router

// 保留：任务结果读取（供后续扩展），避免未使用告警
export const __taskResult = getTaskResult
