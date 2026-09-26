import { prisma } from '../prisma'
import { Errors } from '../core/errors'
import { ANALYSIS_IMPORT_FORMATS, ANALYSIS_METHODS } from '../content/catalogs'
import { runPython } from '../python/bridge'
import { tryChatJSON } from '../llm/client'
import { config } from '../config'
import { createAndRunTask } from './task.service'
import { genId, requireProject, stamp } from './common'

async function projectLike(projectId: string) {
  const p = await requireProject(projectId)
  return { id: p.id, title: p.title, discipline: p.discipline, route: p.route }
}

/* ============================================================
 * 候选统计方法清单（由 AI 依据项目本身生成）
 * ------------------------------------------------------------
 * 修复背景（测试反馈）：原先这 5 条是写死在 `content/catalogs.ts::ANALYSIS_METHODS` 里的，
 * 与项目选题、假设、变量、样本量**毫无关系**，看起来就是「随便给的几条方法」。
 * 现在改为：把项目真实上下文交给大模型，由模型挑选**真正适用**的方法子集并逐条给出针对性理由；
 * 模型未配置 / 调用失败时回退到内置目录，保证离线仍可跑通。
 * ========================================================== */

/** 候选统计方法结构（AI 生成与目录兜底共用） */
interface StatMethod {
  methodId: string
  name: string
  recommended: boolean
  summary: string
  prerequisites: string
  pros: string
  cons: string
  robustnessImpact: string
  checklist: string
  licenseNote: string
  /**
   * 该方法的可复现代码（Python / R）。
   * 随方法清单一并下发，前端切换所选方法时**即时**换代码，无需再发请求。
   * 内容取自内置目录（`catalogs.ts::ANALYSIS_METHODS`），与 `python/analysis.py` 的实现对应。
   */
  code?: { python: string; r: string }
}

/**
 * Python 沙箱**真正支持**的方法 id（见 `backend/python/analysis.py` 头部说明）。
 * AI 只能在这个集合里挑选，不允许自造 id —— 否则沙箱执行会落空、退回「模拟结果」。
 */
const SUPPORTED_METHOD_IDS = ['hierarchical', 'mediation', 'moderation', 'sem', 'multiLevel']

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** 内置目录：作为字段补全与离线兜底 */
function catalogMethods(): StatMethod[] {
  return ANALYSIS_METHODS as unknown as StatMethod[]
}

/**
 * 给方法清单补上「可复现代码」。
 *
 * 修复背景：`analysisMethodState.methods` 是**入库快照**，`code` / `licenseNote` 只在入库那一刻写一次。
 * 存量项目的清单里没有 `code`，前端拿不到就只能在几个方法间共用同一段示例代码（表现为
 * 「选了 SEM，代码还是分层回归」）。这里在读取时按 methodId 从内置目录补全，缺失才补、已有的不覆盖。
 */
function withMethodCode(methods: unknown): StatMethod[] {
  const list = Array.isArray(methods) ? (methods as StatMethod[]) : []
  return list.map((m) => {
    const base = ANALYSIS_METHODS.find((x) => x.methodId === m.methodId)
    return {
      ...m,
      licenseNote: m.licenseNote ?? base?.licenseNote,
      code: m.code ?? base?.code,
    }
  })
}

/** 汇总项目的真实分析上下文，交给模型 */
async function methodContext(projectId: string) {
  const p = await requireProject(projectId)
  const [hypotheses, variables, file] = await Promise.all([
    prisma.hypothesis.findMany({ where: { projectId }, orderBy: { id: 'asc' } }),
    prisma.dataVariable.findMany({ where: { projectId } }),
    prisma.dataFile.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
  ])
  return {
    title: p.title,
    discipline: p.discipline,
    routeLabel: p.route === 'dataDriven' ? '数据驱动' : '理论驱动',
    sampleSize: file?.rows ?? 0,
    variables: variables.map((v) => ({
      name: v.varName,
      type: v.typeLabel,
      role: v.overriddenRole ?? v.suggestedRole,
    })),
    hypotheses: hypotheses.map((h) => ({
      code: h.code,
      title: h.title,
      chain: Array.isArray(h.varChain) ? (h.varChain as unknown[]).map(String) : [],
      testMethod: h.testMethod,
    })),
  }
}

/**
 * 让模型按项目上下文生成候选方法清单。
 * @returns `source='ai'` 表示由模型生成；`'catalog'` 表示模型不可用、回退内置目录
 */
async function generateMethods(projectId: string): Promise<{ methods: StatMethod[]; source: 'ai' | 'catalog' }> {
  const ctx = await methodContext(projectId)
  const llm = await tryChatJSON<{ methods?: Array<Partial<StatMethod>> }>(
    [
      '你是统计学方法顾问，服务高校科研选题。只输出 JSON，不要任何解释文字。',
      `methodId 只能从以下集合中选择，不得自造：${SUPPORTED_METHOD_IDS.join(' / ')}`,
      '请挑选 3~5 个**真正适用于本项目**的方法（不适用的一律不要给）。',
      '每条都要写「针对本项目」的适用前提、优点、缺点、对结论稳健性的影响、前提假设检验清单，中文，各 40 字以内，不要套话。',
      '最契合的 1~2 条给 recommended: true，其余 false。',
    ].join('\n'),
    [
      `选题：${ctx.title}`,
      `学科：${ctx.discipline}`,
      `流程：${ctx.routeLabel}`,
      `样本量：${ctx.sampleSize || '未知'}`,
      `变量：${ctx.variables.map((v) => `${v.name}（${v.type} · ${v.role}）`).join('、') || '暂无'}`,
      `已确认假设：${ctx.hypotheses.map((h) => `${h.code} ${h.title}${h.chain.length ? `［${h.chain.join(' → ')}］` : ''}`).join('；') || '暂无'}`,
      '返回 JSON：{ "methods": [{ "methodId", "name", "recommended", "summary", "prerequisites", "pros", "cons", "robustnessImpact", "checklist" }] }',
    ].join('\n'),
    // 首次进入分析页时会等待这次生成（结果会落库，后续直接读缓存），因此把超时收紧到 20s，
    // 超时/报错都会回退内置目录，页面不会卡死
    { temperature: 0.4, timeoutMs: 20_000 },
  )

  const picked = (llm?.methods ?? []).filter(
    (m): m is Partial<StatMethod> => !!m && SUPPORTED_METHOD_IDS.includes(String(m.methodId)),
  )
  // 去重（模型偶尔会把同一 methodId 给两次）
  const seen = new Set<string>()
  const methods: StatMethod[] = []
  for (const m of picked) {
    const id = String(m.methodId)
    if (seen.has(id)) continue
    seen.add(id)
    const base = ANALYSIS_METHODS.find((x) => x.methodId === id)!
    methods.push({
      methodId: id,
      name: str(m.name) || base.name,
      recommended: m.recommended === true,
      summary: str(m.summary) || base.summary,
      prerequisites: str(m.prerequisites) || base.prerequisites,
      pros: str(m.pros) || base.pros,
      cons: str(m.cons) || base.cons,
      robustnessImpact: str(m.robustnessImpact) || base.robustnessImpact,
      checklist: str(m.checklist) || base.checklist,
      licenseNote: base.licenseNote,
      // 代码不由模型生成：统一取内置目录，保证每段代码都能真正跑通
      code: base.code,
    })
  }

  // 少于 3 条视为不可用（模型跑偏），回退目录，避免把残缺清单给到用户
  if (methods.length < 3) return { methods: catalogMethods(), source: 'catalog' }
  return { methods, source: 'ai' }
}

/** 组装选择留痕（含方法来源，前端据此显示「AI 依据本项目生成 / 内置方法库」） */
function buildTrail(methods: StatMethod[], source: 'ai' | 'catalog', dataVersion = 'v1') {
  return {
    operatorName: '我',
    operatedAt: new Date().toISOString(),
    candidateCount: methods.length,
    unselectedCount: methods.length,
    dataVersion,
    methodSource: source,
  }
}

async function ensureAnalysisState(projectId: string) {
  let state = await prisma.analysisMethodState.findUnique({ where: { projectId } })
  if (!state) {
    const { methods, source } = await generateMethods(projectId)
    state = await prisma.analysisMethodState.create({
      data: {
        projectId,
        // 不预选任何方法：产品约定「AI 推荐仅供参考，不作默认选项」
        selectedMethodId: null,
        methods: methods as never,
        trail: buildTrail(methods, source) as never,
      },
    })
  }
  return state
}

export async function getAnalysis(projectId: string) {
  const proj = await projectLike(projectId)
  const [state, health, latestRun, file] = await Promise.all([
    ensureAnalysisState(projectId),
    prisma.healthReport.findUnique({ where: { projectId } }),
    prisma.analysisRun.findFirst({ where: { projectId }, orderBy: { finishedAt: 'desc' } }),
    prisma.dataFile.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
  ])

  const run = latestRun
    ? {
        runId: latestRun.runId,
        methodId: latestRun.methodId,
        methodName: latestRun.methodName,
        finishedAt: latestRun.finishedAt.toISOString(),
        sampleSize: latestRun.sampleSize,
        effects: latestRun.effects as never,
        robustness: latestRun.robustness as never,
      }
    : null

  return {
    projectTitle: proj.title,
    steps: [
      { key: 'import', label: '导入数据', status: 'done' },
      { key: 'healthCheck', label: '数据体检', status: 'done' },
      { key: 'method', label: '选择方法', status: 'current' },
      { key: 'result', label: '结果与稳健性', status: run ? 'current' : 'upcoming' },
    ],
    dataVersion: { version: 'v1', rows: file?.rows ?? 512, columns: file?.columns ?? 36, dataLevel: (await complianceLevel(projectId)) },
    methods: withMethodCode(state.methods) as never,
    /** 方法清单来源：ai = 大模型依据本项目生成；catalog = 未配置模型时的内置目录 */
    methodSource: ((state.trail as { methodSource?: string } | null)?.methodSource ?? 'catalog') as 'ai' | 'catalog',
    selectionTrail: state.trail as never,
    healthReport: {
      accuracy: health?.accuracy ?? 0.96,
      reportedAt: health?.reportedAt ? health.reportedAt.toISOString() : stamp(),
      metrics: (health?.metrics as never) ?? [],
    },
    healthNotes: [
      { tone: 'warn', text: 'daily_minutes 缺失 3.4%，已采用 FIML 处理。' },
      { tone: 'danger', text: 'gender 变量在 4 个样本上取值缺失，已在分析中剔除。' },
    ],
    importFormats: ANALYSIS_IMPORT_FORMATS,
    importedFile: { fileName: file?.fileName ?? 'survey_social_anxiety.sav', metaText: file?.metaText ?? 'SPSS 数据 · 512 行 × 36 列', passed: true },
    sensitiveWarning: '当前数据级别为 L1，导出原始数据行需勾选披露声明。',
    code: [
      {
        language: 'python',
        fileName: 'analysis.py',
        code: '# 分层回归 + Bootstrap 中介（可复现）\nimport pandas as pd, statsmodels.api as sm\nfrom statsmodels.stats.mediation import Mediation\n# 详见后端 python/analysis.py，参数与种子随结果保存',
        licenseNote: 'statsmodels（BSD-3）',
      },
    ],
    robustness: (latestRun?.robustness as never) ?? [],
    robustnessNote: '运行分析后生成稳健性检验结果。',
    missingBars: (health?.missingBars as never) ?? [],
    run,
  }
}

async function complianceLevel(projectId: string): Promise<string> {
  const c = await prisma.projectCompliance.findUnique({ where: { projectId } })
  return c?.dataLevel ?? 'L1'
}

export async function importProjectData(projectId: string, payload: { fileName: string; dataLevel: string }) {
  const level = await complianceLevel(projectId)
  if (level === 'L2') throw Errors.dataLevelBlocked('L2 项目禁止导入外部原始数据行')
  const fileId = genId('f')
  const file = await prisma.dataFile.create({
    data: {
      projectId,
      fileId,
      fileName: payload.fileName,
      metaText: '已导入 · 512 行 × 36 列',
      rows: 512,
      columns: 36,
      sizeText: '4.2 MB',
      status: 'parsed',
      statusText: '已解析',
    },
  })
  return { fileId: file.fileId, rows: file.rows, columns: file.columns, passed: true }
}

export async function getHealthReport(projectId: string) {
  const health = await prisma.healthReport.findUnique({ where: { projectId } })
  return {
    accuracy: health?.accuracy ?? 0.96,
    reportedAt: health?.reportedAt ? health.reportedAt.toISOString() : stamp(),
    metrics: (health?.metrics as never) ?? [],
    notes: [
      { tone: 'warn', text: 'daily_minutes 缺失 3.4%，已采用 FIML 处理。' },
      { tone: 'info', text: '变量类型已按数据分布自动识别。' },
    ],
  }
}

export async function getMethods(projectId: string) {
  const state = await ensureAnalysisState(projectId)
  return {
    methods: withMethodCode(state.methods) as never,
    trail: state.trail as never,
    methodSource: ((state.trail as { methodSource?: string } | null)?.methodSource ?? 'catalog') as 'ai' | 'catalog',
  }
}

/**
 * 重新生成候选方法清单（用户主动触发，会消耗一次模型调用）。
 * 用途：换选题 / 补完数据 / 新增假设之后，方法清单应随之变化，而不是一锤定音。
 * 副作用：清单变了，旧的「已选择方法」不再有意义，因此一并清空（前端也会同步清掉本地选择）。
 */
export async function refreshMethods(projectId: string) {
  await requireProject(projectId)
  const { methods, source } = await generateMethods(projectId)
  const trail = buildTrail(methods, source)
  await prisma.analysisMethodState.upsert({
    where: { projectId },
    update: { methods: methods as never, trail: trail as never, selectedMethodId: null },
    create: { projectId, methods: methods as never, trail: trail as never, selectedMethodId: null },
  })
  return { methods, trail, methodSource: source }
}

/** 运行分析：真·调用 Python（statsmodels），结果落库 */
export async function runAnalysis(
  projectId: string,
  payload: { methodId: string; dataVersion?: string; taskName?: string; seed?: number; nBoot?: number },
) {
  await requireProject(projectId)
  // 方法以**项目实际存放的清单**为准（可能是 AI 生成的），这样模型给的方法名与理由
  // 能一路落到任务名和结果里；AI 只会在受支持的 methodId 中挑选，沙箱执行不会落空。
  const state = await ensureAnalysisState(projectId)
  const stored = (state.methods as unknown as StatMethod[]) ?? []
  const method = stored.find((m) => m.methodId === payload.methodId) ?? stored[0] ?? ANALYSIS_METHODS[0]
  const file = await prisma.dataFile.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } })
  const variables = await prisma.dataVariable.findMany({ where: { projectId } })

  return createAndRunTask('analysis', projectId, async (progress) => {
    progress(5, '准备沙箱环境…', 25)
    const pythonPayload = {
      op: 'run',
      filePath: file?.storedPath ?? null,
      methodId: method.methodId,
      methodName: method.name,
      seed: payload.seed ?? 42,
      nBoot: payload.nBoot ?? 5000,
      variables: variables.map((v) => ({
        varName: v.varName,
        role: v.overriddenRole ?? v.suggestedRole,
        typeLabel: v.typeLabel,
      })),
      dataLevel: await complianceLevel(projectId),
      taskName: payload.taskName ?? method.name,
    }
    progress(35, '沙箱执行统计计算…', 15)

    let result: {
      sampleSize: number
      effects: Array<{ label: string; value: string; ci?: string }>
      robustness: Array<{ checkId: string; name: string; statusText: string; flipped?: boolean | null; pending?: boolean }>
      code: { language: 'python' | 'r'; fileName: string; code: string; licenseNote: string }
      note: string
    }
    try {
      result = await runPython('analysis.py', pythonPayload)
    } catch (err) {
      // Python 不可用时的兜底：返回明确标注的模拟结果，保证流程不中断
      result = fallbackResult(method.name, String(err))
    }

    progress(85, '写回结果与可复现代码…', 5)
    const runId = genId('a')
    await prisma.analysisRun.create({
      data: {
        projectId,
        runId,
        methodId: method.methodId,
        methodName: method.name,
        sampleSize: result.sampleSize,
        effects: result.effects as never,
        robustness: result.robustness as never,
      },
    })
    await prisma.analysisMethodState.updateMany({ where: { projectId }, data: { selectedMethodId: method.methodId } })
    return {
      runId,
      methodId: method.methodId,
      methodName: method.name,
      finishedAt: new Date().toISOString(),
      sampleSize: result.sampleSize,
      effects: result.effects,
      robustness: result.robustness,
      code: result.code,
      note: result.note,
    }
  })
}

function fallbackResult(methodName: string, reason: string) {
  return {
    sampleSize: 512,
    effects: [
      { label: '自变量 → 因变量 β', value: '0.42', ci: '95% CI [0.31, 0.53]' },
      { label: '中介效应 ab', value: '0.15', ci: '95% CI [0.07, 0.24]' },
    ],
    robustness: [
      { checkId: 'r1', name: '替换估计方法', statusText: '结论未翻转', flipped: false },
      { checkId: 'r2', name: '剔除离群值', statusText: '结论未翻转', flipped: false },
    ],
    code: {
      language: 'python' as const,
      fileName: 'analysis.py',
      code: '# 兜底结果（Python 环境不可用）\nprint("请在 .env 配置可用的 PYTHON_BIN")',
      licenseNote: 'statsmodels（BSD-3）',
    },
    note: `模拟结果：Python 沙箱不可用（${reason.slice(0, 80)}）。请检查 .env 的 PYTHON_BIN 与依赖安装。`,
  }
}

export async function getAnalysisResult(projectId: string, runId: string) {
  const run = await prisma.analysisRun.findFirst({ where: { projectId, runId } })
  if (!run) throw Errors.notFound('分析结果不存在')
  return {
    runId: run.runId,
    methodId: run.methodId,
    methodName: run.methodName,
    finishedAt: run.finishedAt.toISOString(),
    sampleSize: run.sampleSize,
    effects: run.effects as never,
    robustness: run.robustness as never,
  }
}

export async function rollbackAnalysis(projectId: string, versionNo: string) {
  await requireProject(projectId)
  await prisma.projectVersion.create({
    data: { projectId, versionNo, operatorName: '我', description: `回滚分析数据版本至 ${versionNo}`, rollbackable: false },
  })
  return { versionNo }
}
