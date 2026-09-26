import { prisma } from '../prisma'
import {
  buildHotspot,
  buildTopicKeywords,
  buildTopicTheory,
  buildDataUpload,
  buildVariablesPage,
  buildHypothesesPage,
  buildLiteraturePage,
  buildAnalysisPage,
  buildWritingPage,
  buildJournalPage,
  buildReviewPage,
  buildExportPage,
  buildArtifacts,
  buildDdlKeywordSetting,
  SAMPLE_PAPERS,
  SAMPLE_VARIABLES,
  SAMPLE_HYPOTHESES,
} from '../content/payloads'
import { ANALYSIS_METHODS } from '../content/catalogs'
import { deriveProjectFields, defaultKeywordOf, type ProjectSchedulePayload } from '../content/schedule'

export interface CreateProjectGraphInput {
  id: string
  ownerId: string
  ownerName: string
  title: string
  discipline: string
  route: 'dataDriven' | 'theoryDriven'
  schedule: ProjectSchedulePayload
  createdAt: Date
  dataLevel?: string
  skipConfirm?: boolean
  /** rich=true 时写入完整演示内容；false 时写最小骨架 */
  rich?: boolean
  footnote?: string
  lastEditedText?: string
  todoCount?: number
  verifiedCount?: number
}

/** 一次性创建完整项目图谱（项目 + 全部关联），供新建项目与种子复用 */
export async function createProjectGraph(input: CreateProjectGraphInput) {
  const {
    id,
    ownerId,
    ownerName,
    title,
    discipline,
    route,
    schedule,
    createdAt,
    dataLevel = 'L1',
    skipConfirm = false,
    rich = true,
  } = input

  const project = { id, title, discipline, route }
  const derived = deriveProjectFields(schedule)
  const today = schedule.today

  // ---- 页面载荷 ----
  const papers = SAMPLE_PAPERS.map((p, i) => ({
    paperId: `pa_${id}_${i + 1}`,
    title: p.title,
    authors: p.authors,
    journal: p.journal,
    year: p.year,
    quartile: p.quartile,
    doi: p.doi,
    doiStatus: 'verified',
    doiStatusText: 'DOI 已核验',
    citedCount: p.citedCount,
    abstractText: p.abstractText,
    matchReason: `与「${title}」主题相关（相关度 ${p.relevanceScore}%）`,
    relevanceScore: p.relevanceScore,
    citable: true,
  }))

  const variables = SAMPLE_VARIABLES.map((v, i) => ({
    varName: v.varName,
    typeLabel: v.typeLabel,
    valueRange: v.valueRange,
    missingRate: v.missingRate,
    suggestedRole: v.suggestedRole,
    confirmed: rich,
  }))

  const hypotheses = SAMPLE_HYPOTHESES.map((h, i) => ({
    hypothesisId: `h_${id}_${i + 1}`,
    code: h.code,
    title: h.title,
    varChain: h.varChain as never,
    testMethod: h.testMethod,
    basis: h.basis,
    status: rich ? 'confirmed' : 'pending',
  }))

  const files = rich
    ? [
        {
          fileId: `f_${id}_1`,
          fileName: 'survey_social_anxiety.sav',
          metaText: 'SPSS 数据 · 8.6 MB · 512 行 × 36 列',
          rows: 512,
          columns: 36,
          sizeText: '8.6 MB',
          status: 'parsed',
          statusText: '已解析',
        },
      ]
    : []

  const hotspot = buildHotspot(project, today)
  const topicKeywords = buildTopicKeywords(project)
  const topicTheory = buildTopicTheory(project)
  const dataUpload = buildDataUpload(project, files.map((f) => ({ ...f })))
  const writing = buildWritingPage(project)
  const journal = buildJournalPage(project)
  const review = buildReviewPage(project)
  const exportData = buildExportPage(project)
  const artifacts = rich ? buildArtifacts(project) : { ...buildArtifacts(project), artifacts: [] }
  const ddlKeyword = buildDdlKeywordSetting(project, input.rich === false ? defaultKeywordOf(title) : defaultKeywordOf(title))
  const selectedPaperIds = rich ? papers.slice(0, 3).map((p) => p.paperId) : []

  await prisma.project.create({
    data: {
      id,
      ownerId,
      title,
      discipline,
      route,
      stage: derived.stage,
      stageLabel: derived.stageLabel,
      progress: derived.progress,
      currentPhaseName: derived.currentPhaseName,
      currentPhaseRange: derived.currentPhaseRange,
      lastEditedText: input.lastEditedText ?? (rich ? '2 小时前编辑' : '刚刚创建'),
      mainDdlName: derived.mainDdlName,
      mainDdlDaysLeft: derived.mainDdlDaysLeft,
      footnote: input.footnote ?? (rich ? '3 待办 · 核验通过 28 条' : '尚未产生阶段产物'),
      todoCount: input.todoCount ?? (rich ? 3 : 0),
      verifiedCount: input.verifiedCount ?? (rich ? 28 : 0),
      dataLevel,
      createdAt,

      schedule: {
        create: {
          rangeStart: schedule.rangeStart,
          rangeEnd: schedule.rangeEnd,
          today: schedule.today,
          phases: schedule.phases as never,
          milestones: schedule.milestones as never,
          tip: schedule.tip,
        },
      },
      compliance: { create: { dataLevel, skipConfirm } },
      ddlKeyword: { create: { selected: ddlKeyword.selected, options: ddlKeyword.options as never } },
      stageArtifacts: {
        create: {
          currentStage: artifacts.currentStage,
          currentStageLabel: artifacts.currentStageLabel,
          artifacts: artifacts.artifacts as never,
        },
      },
      members: {
        create: [
          {
            name: ownerName,
            avatarText: ownerName.slice(0, 1),
            role: 'firstAuthor',
            roleLabel: '第一作者',
            permissionLabel: '可编辑 / 可导出 / 可定级',
          },
          ...(rich
            ? [
                { name: '王某某', avatarText: '王', role: 'advisor', roleLabel: '导师', permissionLabel: '可查看 / 可批注' },
                { name: '李某某', avatarText: '李', role: 'collaborator', roleLabel: '合作者', permissionLabel: '可编辑 / 可批注' },
              ]
            : []),
        ],
      },
      versions: {
        create: [
          {
            versionNo: 'v1',
            operatorName: ownerName,
            description: rich ? '创建项目并导入初始数据' : '创建项目',
            rollbackable: false,
          },
        ],
      },
      progressRec: {
        create: {
          steps: buildFlowSteps(route, rich) as never,
          lastStepKey: rich ? 'dataHypotheses' : null,
          resumeRoute: buildResumeRoute(id, route),
          resumeLabel: rich ? '继续上次：生成研究假设' : '开始：研究热点',
          hasUnfinished: true,
        },
      },
      introState: {
        create: {
          hotspot: hotspot as never,
          topicKeywords: topicKeywords as never,
          topicTheory: topicTheory as never,
          dataUpload: dataUpload as never,
        },
      },
      dataFiles: files.length ? { create: files } : undefined,
      variables: { create: variables },
      hypotheses: { create: hypotheses },
      papers: { create: papers },
      selection: { create: { paperIds: selectedPaperIds as never } },
      verify: {
        create: {
          status: 'idle',
          statusText: '尚未核验',
          agentAlpha: { label: '内容一致性 Agent', accuracy: 0.94, description: '核对论断与原文的一致性' } as never,
          agentBeta: { label: 'DOI 真实性 Agent', accuracy: 0.97, description: '核对 DOI 与元数据真实性' } as never,
          passedCount: 0,
          suspiciousCount: 0,
          failedCount: 0,
          blockExport: false,
          note: '核验后未通过条目将被阻断导出。',
        },
      },
      analysisState: {
        create: {
          selectedMethodId: 'hierarchical',
          methods: ANALYSIS_METHODS as never,
          trail: {
            operatorName: ownerName,
            operatedAt: createdAt.toISOString(),
            candidateCount: ANALYSIS_METHODS.length,
            unselectedCount: ANALYSIS_METHODS.length - 1,
            dataVersion: 'v1',
          } as never,
        },
      },
      healthReport: {
        create: {
          accuracy: 0.96,
          metrics: [
            { key: 'validSampleSize', label: '有效样本量', value: '512', tone: 'default' },
            { key: 'missingRate', label: '平均缺失率', value: '1.4%', tone: 'default' },
            { key: 'outlier', label: '离群值', value: '12', tone: 'warn' },
            { key: 'duplicate', label: '重复作答', value: '3', tone: 'danger' },
          ] as never,
          missingBars: variables.map((v) => ({ varName: v.varName, missingRate: v.missingRate })) as never,
        },
      },
      writingDoc: { create: { data: writing as never } },
      journalState: { create: { data: journal as never } },
      reviewState: { create: { data: review as never } },
      exportState: { create: { data: exportData as never } },
    },
  })

  return { projectId: id, derived, schedule }
}

/** 流程步骤模板（按驱动路线不同） */
function buildFlowSteps(route: string, rich: boolean) {
  const base =
    route === 'dataDriven'
      ? [
          { stepKey: 'dataUpload', stepLabel: '上传数据', route: 'data/upload' },
          { stepKey: 'dataVariables', stepLabel: '变量识别', route: 'data/variables' },
          { stepKey: 'dataHypotheses', stepLabel: '生成研究假设', route: 'data/hypotheses' },
        ]
      : [
          { stepKey: 'hotspot', stepLabel: '研究热点', route: 'intro' },
          { stepKey: 'topicKeywords', stepLabel: '领域研究热词', route: 'intro/topic/keywords' },
          { stepKey: 'topicTheory', stepLabel: '选择理论与变量', route: 'intro/topic/theory' },
        ]
  return base.map((s, i) => ({
    ...s,
    status: rich ? 'done' : i === 0 ? 'inProgress' : 'notStarted',
    updatedAt: new Date().toISOString(),
  }))
}

function buildResumeRoute(projectId: string, route: string) {
  return route === 'dataDriven'
    ? `/project/${projectId}/intro/data/hypotheses`
    : `/project/${projectId}/intro`
}
