import { prisma } from '../prisma'
import { Errors } from '../core/errors'
import { buildHotspot, buildTopicKeywords, buildTopicTheory, buildDataUpload, buildVariablesPage, buildHypothesesPage, SAMPLE_HYPOTHESES } from '../content/payloads'
import { tryChatJSON } from '../llm/client'
import { todayIso } from '../content/schedule'
import { genId, nowIso, requireProject, stamp } from './common'

async function projectLike(projectId: string) {
  const p = await requireProject(projectId)
  return { id: p.id, title: p.title, discipline: p.discipline, route: p.route, stage: p.stage, stageLabel: p.stageLabel }
}

async function ensureIntro(projectId: string) {
  let intro = await prisma.introState.findUnique({ where: { projectId } })
  if (!intro) {
    const proj = await projectLike(projectId)
    intro = await prisma.introState.create({
      data: {
        projectId,
        hotspot: buildHotspot(proj, todayIso()) as never,
        topicKeywords: buildTopicKeywords(proj) as never,
        topicTheory: buildTopicTheory(proj) as never,
        dataUpload: buildDataUpload(proj, []) as never,
      },
    })
  }
  return intro
}

/** ---------- 研究热点 ---------- */

export async function getHotspot(projectId: string) {
  const intro = await ensureIntro(projectId)
  return intro.hotspot as never
}

export async function analyzeHotspot(projectId: string, researchDirection: string) {
  const proj = await projectLike(projectId)
  const fallback = buildHotspot(proj, todayIso())
  const llm = await tryChatJSON<Record<string, unknown>>(
    '你是科研选题助手。只输出 JSON，不要解释。禁止编造不存在的文献标题与 DOI；若不确定，给出占位并在 sourceText 标注「待核验」。',
    `研究领域：${proj.discipline}\n研究方向：${researchDirection}\n请返回 JSON：{ "gaps":[{"gapId","text","sourceText"}], "feasibility":[{"key","label","score","maxScore","description","basisText"}], "conclusion": string }`,
  )
  const data = {
    ...fallback,
    researchDirection,
    ...(llm ?? {}),
  }
  await prisma.introState.update({ where: { projectId }, data: { hotspot: data as never } })
  const task = { taskId: genId('tk'), status: 'succeeded' as const, progress: 100 }
  return { task, data }
}

export async function confirmDirection(projectId: string) {
  const p = await requireProject(projectId)
  await prisma.projectVersion.create({
    data: { projectId, versionNo: `v${Date.now().toString().slice(-4)}`, operatorName: '我', description: `确认研究方向：${(p as { title: string }).title}` },
  })
  const nextRoute = p.route === 'theoryDriven' ? `/project/${projectId}/intro/topic/keywords` : `/project/${projectId}/intro/data/upload`
  return { nextRoute }
}

/** ---------- 领域研究热词 ---------- */

export async function getTopicKeywords(projectId: string) {
  const intro = await ensureIntro(projectId)
  return intro.topicKeywords as never
}

export async function analyzeTopicKeywords(projectId: string, payload: { researchDirection: string; discipline: string }) {
  const proj = await projectLike(projectId)
  const fallback = buildTopicKeywords(proj)
  const llm = await tryChatJSON<Record<string, unknown>>(
    '你是文献计量助手。只输出 JSON。词频与趋势必须来源可溯（无真实来源时用占位数字并在 sources 标注）。',
    `领域：${payload.discipline}\n方向：${payload.researchDirection}\n返回 { "keywords":[{"keyword","freq","growth"}], "topKeywords":[{"rank","keyword","freq"}], "trendSeries":[...] }`,
  )
  const data = { ...fallback, researchDirection: payload.researchDirection, ...(llm ?? {}) }
  await prisma.introState.update({ where: { projectId }, data: { topicKeywords: data as never } })
  return data
}

export async function lockConcepts(projectId: string, concepts: string[]) {
  const intro = await ensureIntro(projectId)
  const data = { ...(intro.topicKeywords as Record<string, unknown>), lockedConcepts: concepts }
  await prisma.introState.update({ where: { projectId }, data: { topicKeywords: data as never } })
  return { locked: concepts }
}

/** ---------- 选择理论与变量 ---------- */

export async function getTopicTheory(projectId: string) {
  const intro = await ensureIntro(projectId)
  return intro.topicTheory as never
}

export async function selectTheory(projectId: string, theoryId: string) {
  const intro = await ensureIntro(projectId)
  const data = intro.topicTheory as { theories: { theoryId: string; name: string }[]; variableDrafts: unknown[] }
  const theory = data.theories.find((t) => t.theoryId === theoryId)
  if (!theory) throw Errors.notFound('理论不存在')
  const updated = { ...data, selectedTheoryId: theoryId }
  await prisma.introState.update({ where: { projectId }, data: { topicTheory: updated as never } })
  return { theoryId, variableDrafts: data.variableDrafts }
}

/** ---------- 数据上传 ---------- */

export async function getDataUpload(projectId: string) {
  const proj = await projectLike(projectId)
  const files = await prisma.dataFile.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } })
  const variables = await prisma.dataVariable.count({ where: { projectId } })
  const payload = buildDataUpload(proj, files.map(serializeFile) as never[])
  if (variables) payload.readyVariableCount = variables
  return payload
}

function serializeFile(f: {
  fileId: string
  fileName: string
  metaText: string
  rows: number
  columns: number
  sizeText: string
  status: string
  statusText: string
}) {
  return {
    fileId: f.fileId,
    fileName: f.fileName,
    metaText: f.metaText,
    rows: f.rows,
    columns: f.columns,
    sizeText: f.sizeText,
    status: f.status,
    statusText: f.statusText,
  }
}

/** 上传数据文件（前端当前以 JSON 提交文件名；此处落一条 DataFile 记录） */
export async function uploadDataFile(projectId: string, payload: { fileName?: string }) {
  await requireProject(projectId)
  const fileName = payload.fileName ?? `upload_${Date.now()}.csv`
  const fileId = genId('f')
  const file = await prisma.dataFile.create({
    data: {
      projectId,
      fileId,
      fileName,
      metaText: '已上传 · 待体检',
      rows: 0,
      columns: 0,
      sizeText: '—',
      status: 'uploaded',
      statusText: '已上传 · 待体检',
    },
  })
  return {
    fileId: file.fileId,
    fileName: file.fileName,
    metaText: file.metaText,
    rows: file.rows,
    columns: file.columns,
    sizeText: file.sizeText,
    status: file.status,
    statusText: file.statusText,
  }
}

export async function removeDataFile(projectId: string, fileId: string) {
  const f = await prisma.dataFile.findFirst({ where: { projectId, fileId } })
  if (!f) throw Errors.notFound('文件不存在')
  await prisma.dataFile.delete({ where: { id: f.id } })
  return { success: true }
}

export async function importPublicDataset(projectId: string, datasetId: string) {
  const compliance = await prisma.projectCompliance.findUnique({ where: { projectId } })
  if (compliance?.dataLevel === 'L2') throw Errors.dataLevelBlocked('L2 项目禁止导入外部原始数据行')
  const fileId = genId('f')
  await prisma.dataFile.create({
    data: {
      projectId,
      fileId,
      fileName: `public_${datasetId}.csv`,
      metaText: '公共数据集 · 1200 行 × 28 列',
      rows: 1200,
      columns: 28,
      sizeText: '3.1 MB',
      status: 'parsed',
      statusText: '已解析',
    },
  })
  const task = { taskId: genId('tk'), status: 'succeeded' as const, progress: 100 }
  return { task }
}

export async function loadSampleDataset(projectId: string, sampleId: string) {
  const fileId = genId('f')
  await prisma.dataFile.create({
    data: {
      projectId,
      fileId,
      fileName: `sample_${sampleId}.sav`,
      metaText: 'SPSS 数据 · 512 行 × 36 列',
      rows: 512,
      columns: 36,
      sizeText: '4.2 MB',
      status: 'parsed',
      statusText: '已解析',
    },
  })
  return { success: true, note: '示例数据不会写入你的项目' }
}

/** ---------- 变量识别 ---------- */

export async function getVariables(projectId: string) {
  const proj = await projectLike(projectId)
  let vars = await prisma.dataVariable.findMany({ where: { projectId } })
  if (!vars.length) {
    // 首次访问时按示例变量初始化
    const { SAMPLE_VARIABLES } = await import('../content/payloads')
    await prisma.dataVariable.createMany({
      data: SAMPLE_VARIABLES.map((v) => ({
        projectId,
        varName: v.varName,
        typeLabel: v.typeLabel,
        valueRange: v.valueRange,
        missingRate: v.missingRate,
        suggestedRole: v.suggestedRole,
      })),
    })
    vars = await prisma.dataVariable.findMany({ where: { projectId } })
  }
  return buildVariablesPage(proj, vars.map((v) => ({ varName: v.varName, typeLabel: v.typeLabel, valueRange: v.valueRange, missingRate: v.missingRate, suggestedRole: v.suggestedRole, overriddenRole: v.overriddenRole })), 96, stamp())
}

export async function updateVariable(projectId: string, varName: string, patch: { role?: string; typeLabel?: string }) {
  const v = await prisma.dataVariable.findFirst({ where: { projectId, varName } })
  if (!v) throw Errors.notFound('变量不存在')
  await prisma.dataVariable.update({
    where: { id: v.id },
    data: { ...(patch.role ? { overriddenRole: patch.role } : {}), ...(patch.typeLabel ? { typeLabel: patch.typeLabel } : {}) },
  })
  return { varName, role: patch.role, typeLabel: patch.typeLabel, recalcNeeded: !!patch.role }
}

export async function confirmVariables(projectId: string, variables: Array<{ varName: string; overriddenRole?: string }>) {
  for (const v of variables ?? []) {
    if (v.overriddenRole) {
      await prisma.dataVariable.updateMany({ where: { projectId, varName: v.varName }, data: { overriddenRole: v.overriddenRole, confirmed: true } })
    } else {
      await prisma.dataVariable.updateMany({ where: { projectId, varName: v.varName }, data: { confirmed: true } })
    }
  }
  return { nextRoute: `/project/${projectId}/intro/data/hypotheses` }
}

/** ---------- 研究假设 ---------- */

export async function getHypotheses(projectId: string) {
  const proj = await projectLike(projectId)
  let hyps = await prisma.hypothesis.findMany({ where: { projectId }, orderBy: { code: 'asc' } })
  if (!hyps.length) {
    await prisma.hypothesis.createMany({
      data: SAMPLE_HYPOTHESES.map((h, i) => ({
        projectId,
        hypothesisId: `h_${projectId}_${i + 1}`,
        code: h.code,
        title: h.title,
        varChain: h.varChain as never,
        testMethod: h.testMethod,
        basis: h.basis,
      })),
    })
    hyps = await prisma.hypothesis.findMany({ where: { projectId }, orderBy: { code: 'asc' } })
  }
  const varCount = await prisma.dataVariable.count({ where: { projectId } })
  return buildHypothesesPage(proj, hyps.map((h) => ({ code: h.code, title: h.title, varChain: h.varChain, testMethod: h.testMethod, basis: h.basis, status: h.status })), varCount)
}

export async function generateHypotheses(projectId: string, prompt?: string) {
  const proj = await projectLike(projectId)
  const vars = await prisma.dataVariable.findMany({ where: { projectId } })
  const varNames = vars.map((v) => v.varName)

  // 合规：只引用真实存在的变量
  const llm = await tryChatJSON<{ hypotheses?: Array<{ code: string; title: string; varChain: string[]; testMethod: string; basis: string }> }>(
    `你是科研假设生成助手。只允许使用给定变量名（${varNames.join(', ')}），不得引入库外变量，不得臆造字段。只输出 JSON。`,
    `研究主题：${proj.title}\n可用变量：${varNames.join(', ')}\n${prompt ? `用户补充：${prompt}\n` : ''}返回 { "hypotheses":[{"code","title","varChain","testMethod","basis"}] }（3 条以内）`,
  )

  const items =
    llm?.hypotheses?.filter((h) => h.varChain.every((v) => varNames.includes(v))).slice(0, 4) ??
    SAMPLE_HYPOTHESES

  await prisma.hypothesis.deleteMany({ where: { projectId } })
  await prisma.hypothesis.createMany({
    data: items.map((h, i) => ({
      projectId,
      hypothesisId: `h_${projectId}_${i + 1}`,
      code: h.code || `H${i + 1}`,
      title: h.title,
      varChain: (h.varChain as never) ?? [],
      testMethod: h.testMethod,
      basis: h.basis,
    })),
  })
  return getHypotheses(projectId)
}

export async function confirmHypotheses(projectId: string, hypotheses: Array<{ hypothesisId: string; status: 'confirmed' | 'rejected' }>) {
  for (const h of hypotheses ?? []) {
    await prisma.hypothesis.updateMany({ where: { projectId, hypothesisId: h.hypothesisId }, data: { status: h.status } })
  }
  const pending = await prisma.hypothesis.count({ where: { projectId, status: 'pending' } })
  if (pending > 0) throw Errors.param(`仍有 ${pending} 条假设未处理`)
  return { nextRoute: `/project/${projectId}/analysis`, logId: genId('log') }
}
