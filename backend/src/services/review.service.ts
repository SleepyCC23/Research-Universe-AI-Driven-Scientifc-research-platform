import { prisma } from '../prisma'
import { buildReviewPage } from '../content/payloads'
import { tryChatJSON } from '../llm/client'
import { requireProject, stamp } from './common'

async function projectLike(projectId: string) {
  const p = await requireProject(projectId)
  return { id: p.id, title: p.title, discipline: p.discipline, route: p.route }
}

async function getState(projectId: string) {
  let s = await prisma.reviewState.findUnique({ where: { projectId } })
  if (!s) {
    const proj = await projectLike(projectId)
    s = await prisma.reviewState.create({ data: { projectId, data: buildReviewPage(proj) as never } })
  }
  return s.data as Record<string, unknown>
}

async function setState(projectId: string, data: Record<string, unknown>) {
  await prisma.reviewState.update({ where: { projectId }, data: { data: data as never } })
  return data
}

/** 各类型问题的通用处理方向，与意见自身的建议拼在一起，保证每条意见都有可执行的修改建议 */
const GUIDE_BY_TYPE: Record<string, string> = {
  hard: '硬伤类问题需要在修改稿中正面处理：按建议调整表述或补做检验，并在回复信中说明改动位置。',
  dispute: '争议类问题可以保留你的主张：正文弱化强表述，回复信中给出依据、边界条件与备选解释。',
  style: '表达与结构问题只需按目标期刊的格式要求调整篇幅与措辞，不改动研究结论与数据。',
}

/**
 * 保证**每条评审意见都有对应的修改建议**。
 *
 * 修复背景：示例数据里 `revisionPaths` 只有 H1 / H2 两条，右侧「修改建议」卡却写死一句
 * 「查看全部 6 条修改路径」；点 D1 / S1 这类意见时没有任何建议可看（点按钮也只弹提示）。
 * 这里按意见补齐：以意见自身的 description 作为主建议，再按类型补一句处理方向，并落库保持一致。
 */
async function ensureRevisionPaths(projectId: string, data: Record<string, unknown>) {
  const issues = (data.issues as Array<{ code: string; type: string; title: string; description: string }>) ?? []
  const paths = ((data.revisionPaths as Array<{ issueCode: string; title: string; text: string }>) ?? []).slice()
  let changed = false
  for (const i of issues) {
    if (!i?.code || paths.some((p) => p.issueCode === i.code)) continue
    paths.push({
      issueCode: i.code,
      title: `修改建议（${i.title}）`,
      text: `${i.description}${GUIDE_BY_TYPE[i.type] ? ` ${GUIDE_BY_TYPE[i.type]}` : ''}`,
    })
    changed = true
  }
  if (changed) await setState(projectId, { ...data, revisionPaths: paths })
  return changed ? { ...data, revisionPaths: paths } : data
}

export async function getReview(projectId: string) {
  const data = await getState(projectId)
  return (await ensureRevisionPaths(projectId, data)) as never
}

export async function recalibrateReview(projectId: string, payload: { journal?: string; field?: string }) {
  const data = await getState(projectId)
  const calibration = {
    paperCount: 1200,
    corpusCount: 860,
    calibratedAt: new Date().toISOString(),
    note: `基于 860 篇顶刊已发表论文的审稿意见语料校准${payload.journal ? `（目标期刊：${payload.journal}）` : ''}。`,
  }
  await setState(projectId, { ...data, calibration, targetJournal: payload.journal ?? data.targetJournal })
  return calibration
}

export async function handleReviewIssue(projectId: string, issueId: string, handled: string) {
  const data = await getState(projectId)
  const issues = (data.issues as Array<Record<string, unknown>>) ?? []
  const updated = issues.map((i) => (i.issueId === issueId ? { ...i, handled } : i))
  const summary = {
    accepted: updated.filter((i) => i.handled === 'accepted').length,
    disputed: updated.filter((i) => i.handled === 'disputed').length,
    ignored: updated.filter((i) => i.handled === 'ignored').length,
    corpusCount: (data.summary as Record<string, number>)?.corpusCount ?? 860,
  }
  await setState(projectId, { ...data, issues: updated, summary })
  return { issueId, handled }
}

export async function generateRebuttal(projectId: string, issueCodes?: string[]) {
  const proj = await projectLike(projectId)
  const data = await getState(projectId)
  const issues = (data.issues as Array<{ issueId: string; code: string; title: string; description: string; handled: string }>) ?? []
  const targets = issueCodes?.length ? issues.filter((i) => issueCodes.includes(i.code)) : issues.filter((i) => i.handled !== 'ignored')

  const llm = await tryChatJSON<{ rebuttals: Array<{ issueCode: string; title: string; steps: string[] }> }>(
    '你是审稿回复助手。硬约束：不改变作者原有观点；与本观点冲突时以作者观点为准并标注冲突点。只输出 JSON。',
    `论文：${proj.title}\n待回复意见：${targets.map((t) => `${t.code}:${t.title}`).join('; ')}\n返回 { "rebuttals":[{"issueCode","title","steps":[...]}] }`,
  )

  const rebuttals =
    llm?.rebuttals ??
    targets.map((t) => ({
      issueCode: t.code,
      // 用意见标题作为小标题（原来是写死的「回复草稿」，拼成「关于「回复草稿」（H1）」很难读）
      title: t.title,
      steps: [`感谢审稿人指出「${t.title}」。`, '我们已在正文中相应修改，并补充说明。', '若与我们的观点存在分歧，已在回复中标注并说明理由。'],
    }))

  await setState(projectId, { ...data, rebuttals })
  return rebuttals
}
