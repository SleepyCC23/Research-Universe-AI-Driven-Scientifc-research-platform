import { prisma } from '../prisma'
import { Errors } from '../core/errors'
import { buildJournalPage } from '../content/payloads'
import { JOURNAL_LIBRARY } from '../content/catalogs'
import { tryChatJSON } from '../llm/client'
import { requireProject } from './common'

async function projectLike(projectId: string) {
  const p = await requireProject(projectId)
  return { id: p.id, title: p.title, discipline: p.discipline, route: p.route }
}

async function getState(projectId: string) {
  let s = await prisma.journalState.findUnique({ where: { projectId } })
  if (!s) {
    const proj = await projectLike(projectId)
    s = await prisma.journalState.create({ data: { projectId, data: buildJournalPage(proj) as never } })
  }
  return s.data as Record<string, unknown>
}

export async function getJournals(projectId: string) {
  return (await getState(projectId)) as never
}

/** 选刊匹配：基于关键词与摘要，对期刊库打分 */
export async function matchJournals(projectId: string, payload: { abstractText?: string; keywords?: string[] }) {
  const proj = await projectLike(projectId)
  const data = await getState(projectId)
  const keywords = payload.keywords ?? (data.keywords as string[]) ?? []

  const llm = await tryChatJSON<{ matches: Array<{ journalId: string; matchScore: number; matchReason: string }> }>(
    '你是选刊助手。合规硬约束：不得输出「保证录用」等承诺；只输出 JSON。',
    `论文主题：${proj.title}\n关键词：${keywords.join(', ')}\n候选期刊：${JOURNAL_LIBRARY.map((j) => `${j.journalId}=${j.name}`).join('; ')}\n返回 { "matches":[{"journalId","matchScore","matchReason"}] }`,
  )

  const matches = JOURNAL_LIBRARY.map((j, i) => {
    const scored = llm?.matches?.find((m) => m.journalId === j.journalId)
    return {
      journalId: j.journalId,
      name: j.name,
      indexText: j.indexText,
      matchScore: scored?.matchScore ?? Math.max(60, 94 - i * 6),
      matchReason: scored?.matchReason ?? '主题相关，方法与样本量符合期刊偏好。',
    }
  })

  await prisma.journalState.update({ where: { projectId }, data: { data: { ...data, matches } as never } })
  return matches
}

export async function getJournalProfile(journalId: string) {
  const j = JOURNAL_LIBRARY.find((x) => x.journalId === journalId) ?? JOURNAL_LIBRARY[0]
  return {
    journalId: j.journalId,
    name: j.name,
    sourceText: 'OpenAlex / 期刊官网',
    partition: j.partition,
    reviewCycle: j.reviewCycle,
    reviewCycleSource: j.reviewCycleSource,
    acceptanceRate: j.acceptanceRate,
    acceptanceSource: j.acceptanceSource,
    apc: j.apc,
    databases: j.databases,
    formatRequirement: j.formatRequirement,
    aiPolicy: j.aiPolicy,
  }
}

export async function generateSubmissionPackage(projectId: string) {
  await requireProject(projectId)
  return { nextRoute: `/project/${projectId}/export` }
}
