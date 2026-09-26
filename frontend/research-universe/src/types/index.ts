/**
 * 研宇宙 Research Universe —— 全量类型定义
 * 命名规则：全部使用英文小驼峰；与设计稿中文文案的对照表见 docs/VARIABLES.md
 */

/* ============================================================
 * 0. 通用
 * ========================================================== */

/** 统一响应包装 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  /** 服务端追踪 id，便于排错 */
  traceId: string
}

/** 分页请求 */
export interface PageQuery {
  page?: number
  pageSize?: number
}

/** 分页响应 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 异步任务状态（沙箱 / 核验 / 综述生成等长任务共用） */
export type AsyncTaskStatus = 'idle' | 'pending' | 'running' | 'succeeded' | 'failed'

/** 通用异步任务句柄 */
export interface AsyncTask {
  taskId: string
  status: AsyncTaskStatus
  progress: number
  /** 预计剩余秒数 */
  etaSeconds?: number
  message?: string
  startedAt?: string
  finishedAt?: string
  /** 任务成功后的业务结果（真实模式且 succeeded 时由后端返回，如分析任务含 runId） */
  result?: Record<string, unknown> | null
}

/* ============================================================
 * 1. 用户 / 认证 / 套餐（全局状态）
 * ========================================================== */

/** 用户角色（决定可见与可编辑范围） */
export type UserRole = 'firstAuthor' | 'advisor' | 'collaborator' | 'guest'

/** 权限动作 */
export interface PermissionSet {
  canView: boolean
  canEdit: boolean
  canComment: boolean
  canExport: boolean
  canDelete: boolean
  canSetDataLevel: boolean
  canGenerateDisclosure: boolean
  canRollback: boolean
}

/** 用户信息 */
export interface UserInfo {
  userId: string
  nickname: string
  avatarText: string
  /** 自定义头像（本地图片压缩后的 data URL）；null / undefined 表示使用文字头像 */
  avatarUrl?: string | null
  /** 学科 · 年级，例如「心理学 · 研二」 */
  major: string
  grade: string
  /** 教育邮箱 */
  eduEmail?: string
  /** 是否已绑定手机号/邮箱 */
  hasContact: boolean
}

/** 登录态 */
export interface AuthState {
  loggedIn: boolean
  token: string | null
  user: UserInfo | null
}

/** 学生认证 */
export interface StudentVerification {
  verified: boolean
  /** 认证渠道：eduEmail 教育邮箱 / chsi 学信网 */
  channel: 'eduEmail' | 'chsi' | 'none'
  eduEmail?: string
  verifiedAt?: string
  /** 权益是否已同步到定价与额度系统 */
  benefitsSynced: boolean
  /** 失效后的宽限天数 */
  graceDays: number
}

/** 套餐等级 */
export type PlanId = 'student' | 'pro' | 'team'

/* ------------------------------------------------------------
 * 1.1 账号设置（P13，全局页面 /account）
 * ---------------------------------------------------------- */

/** 登录设备 / 会话 */
export interface LoginDevice {
  deviceId: string
  /** 设备与浏览器，例如「Chrome · Windows」 */
  deviceName: string
  /** 脱敏后的登录位置，例如「116.25.***.12 · 深圳」 */
  locationText: string
  lastActiveAt: string
  /** 是否为当前设备（当前设备不可被退出） */
  current: boolean
}

/** 通知偏好项 */
export interface NotificationPref {
  key: 'verifyFailed' | 'ddlReminder' | 'taskDone' | 'weeklyReport' | 'productUpdate'
  label: string
  description: string
  enabled: boolean
  /** 强制开启且不可关闭（合规要求，例如核验失败必须通知） */
  mandatory?: boolean
}

/** 数据与隐私设置 */
export interface AccountPrivacy {
  /** 是否允许本人数据进入模型训练集；默认关闭，开启需二次确认 */
  allowTraining: boolean
  /** 版本与日志保留天数 */
  keepHistoryDays: number
  /** 最近一次「导出我的数据」申请时间 */
  exportRequestedAt?: string
}

/** 账号设置页数据（GET /me/account） */
export interface AccountSettings {
  userId: string
  nickname: string
  avatarText: string
  /** 自定义头像（本地图片压缩后的 data URL）；null / undefined 表示使用文字头像 */
  avatarUrl?: string | null
  major: string
  grade: string
  /** 已脱敏手机号，例如「138****0000」 */
  phoneMasked: string
  eduEmail?: string
  hasContact: boolean
  registeredAt: string
  verification: StudentVerification
  planId: PlanId
  quota: QuotaUsage
  devices: LoginDevice[]
  notifications: NotificationPref[]
  privacy: AccountPrivacy
  /** 可选项（表单下拉） */
  majorOptions: string[]
  gradeOptions: string[]
}

/** 套餐信息 */
export interface Plan {
  planId: PlanId
  name: string
  /** 中文副标题，例如「适合硕士 / 青年科研人员」 */
  subtitle: string
  price: number
  priceUnit: 'month' | 'monthPerMember'
  currency: 'CNY'
  highlights: string[]
  mostPopular?: boolean
  recommendedFor?: string
}

/** 额度项 */
export interface QuotaItem {
  key: string
  label: string
  student: string
  pro: string
  team: string
}

/** 用户当前额度用量 */
export interface QuotaUsage {
  planId: PlanId
  resetAt: string
  reviewGenerateUsed: number
  reviewGenerateLimit: number
  verifyUsed: number
  verifyLimit: number
  sandboxMinutesUsed: number
  sandboxMinutesLimit: number
  exportUsed: number
  exportLimit: number
  /** 超额处理方式 */
  overagePolicy: 'throttle' | 'payAsYouGo'
}

/* ============================================================
 * 2. 项目实体
 * ========================================================== */

/** 驱动路线 */
export type DrivingRoute = 'dataDriven' | 'theoryDriven'

/**
 * 项目阶段
 * 与 `ProjectSchedule.phases` 的 5 个阶段一一对应（选题 / 文献综述 / 数据分析 / 论文写作 / 投稿准备），
 * 由日程按基准日派生，用于决定点击项目卡片后进入哪个页面。
 */
export type ProjectStage =
  | 'topic'      // 选题中
  | 'literature' // 文献中
  | 'analysis'   // 分析中
  | 'writing'    // 写作中
  | 'submission' // 投稿准备

/** 数据级别 */
export type DataLevel = 'L0' | 'L1' | 'L2'

/** DDL 节点 */
export interface DdlNode {
  nodeId: string
  /** 节点名，例如「开题报告」「中期检查」 */
  name: string
  date: string
  /** 距今剩余天数 */
  daysLeft: number
  status: 'done' | 'current' | 'upcoming'
}

/** 通知项（GET /me/notifications） */
export interface NotificationItem {
  notificationId: string
  title: string
  /** 副文案：时间或来源，例如「今天 09:00」 */
  description: string
  /** 点击后跳转的路由；为空表示纯提示，不可跳转 */
  route?: string
  read: boolean
}

/** 站内通知载荷 */
export interface NotificationPayload {
  list: NotificationItem[]
  unreadCount: number
}

/* ============================================================
 * 3.1 流程进度与断点续做
 * ==========================================================
 * 需求：新建项目后若用户未走完流程（中途离开 / 关掉页面），下次应回到**他停下的那一步**，
 * 并把没提交的内容带出来，而不是从头再来。
 * 落法：服务端按项目记录「每一步的状态 + 停在哪一步（resumeRoute）」；
 *      每步的未提交内容另存为**草稿**（StepDraft）。
 * ========================================================== */

/** 单个流程步骤的状态 */
export interface FlowStepProgress {
  /** 步骤标识：hotspot / topicKeywords / topicTheory / dataUpload / dataVariables / dataHypotheses */
  stepKey: string
  /** 步骤名（用于「继续上次：上传数据」这类文案） */
  stepLabel: string
  status: 'notStarted' | 'inProgress' | 'done'
  /** 该步骤对应的路由 */
  route: string
  updatedAt: string
}

/** 项目流程进度（GET /projects/:projectId/progress） */
export interface ProjectProgress {
  projectId: string
  steps: FlowStepProgress[]
  /** 用户停下的那一步；全部完成时为空 */
  lastStepKey?: string
  /** 恢复入口路由——前端「继续上次」直接跳它，不自己拼路径 */
  resumeRoute: string
  /** 「继续上次」按钮文案，例如「继续上次：上传数据」，由服务端给以便文案统一 */
  resumeLabel: string
  /** 是否有未走完的步骤（决定工作台卡片是否显示「继续上次」） */
  hasUnfinished: boolean
}

/** 某一步的草稿（GET /projects/:projectId/steps/:stepKey/draft），结构按步骤而异，例如：
 *  hotspot → { researchDirection }；topicKeywords → { direction, selectedKeywords }
 *  topicTheory → { theoryId, variableDraft }；dataUpload → { selectedLevel }
 *  dataVariables → { roleOverrides }；dataHypotheses → { hypothesisDraft }
 */
export type StepDraft = Record<string, unknown>

/** 项目级合规设置（GET /projects/:projectId/compliance） */export interface ProjectComplianceSettings {
  projectId: string
  /** 项目数据级别 */
  dataLevel: DataLevel
  /** 是否跳过逐条确认（YOLO）；L2 项目由服务端强制返回 false */
  skipConfirm: boolean
}

/**
 * DDL 关键词候选：用于把 DDL 节点显示成「关键词：节点名」的概述形式。
 * 关键词来源见 `sourceText`，便于用户判断这个词是从哪里来的。
 */
export interface DdlKeywordOption {
  keyword: string
  /** 来源说明，例如「来自项目标题」/「来自领域研究热词」 */
  sourceText: string
}

/** 项目 DDL 关键词设置（GET /projects/:projectId/ddl-keyword） */
export interface DdlKeywordSetting {
  projectId: string
  /** 当前选用的关键词；空字符串表示不显示前缀 */
  selected: string
  options: DdlKeywordOption[]
}

/* ------------------------------------------------------------
 * 2.1 项目甘特图 / 日程
 * ---------------------------------------------------------- */

/** 阶段状态（由日期与「今天」推导，见 src/utils/schedule.ts） */
export type PhaseStatus = 'done' | 'current' | 'upcoming'

/** 甘特图中的阶段条 */
export interface SchedulePhase {
  phaseId: string
  name: string
  /** ISO 日期，例如 '2026-09-21' */
  startDate: string
  endDate: string
  /** 阶段完成度 0-100 */
  progress: number
  status: PhaseStatus
}

/** 甘特图中的里程碑（来自 DDL 硬节点） */
export interface ScheduleMilestone {
  nodeId: string
  name: string
  date: string
  daysLeft: number
  status: PhaseStatus
}

/** 单个项目的 DDL 节点分组（工作台「DDL 倒排时间线」按项目聚合后用） */
export interface ProjectDdlGroup {
  projectId: string
  projectTitle: string
  nodes: DdlNode[]
  /** 该项目的日程风险提示（可选，用于在合并列表下展示最紧急项目的一句话提醒） */
  tip?: string
}

/** 项目日程（甘特图数据源） */
export interface ProjectSchedule {
  projectId: string
  projectTitle: string
  /** 甘特图时间轴起止（含所有阶段与里程碑） */
  rangeStart: string
  rangeEnd: string
  /** 今天，用于绘制「今日」参考线与判定阶段状态 */
  today: string
  phases: SchedulePhase[]
  milestones: ScheduleMilestone[]
  /** 日程风险提示 */
  tip: string
}


/** 阶段产物摘要项 */
export interface StageArtifact {
  artifactId: string
  name: string
  /** 中文状态文案，例如「双 Agent 核验已通过」 */
  statusText: string
  tone: 'ok' | 'warn' | 'info'
  /** 是否有待办动作 */
  actionText?: string
}

/**
 * 工作台右栏「本阶段产物摘要」的接口载荷
 * 说明：原「项目流程看板」已按需求移除，此处只保留当前阶段与产物摘要。
 */
export interface StageArtifactsPayload {
  projectId: string
  currentStage: ProjectStage
  currentStageLabel: string
  artifacts: StageArtifact[]
}

/** 项目实体 */
export interface Project {
  projectId: string
  title: string
  /** 学科领域 */
  discipline: string
  route: DrivingRoute
  /** 阶段中文名，例如「数据分析中」 */
  stageLabel: string
  stage: ProjectStage
  progress: number
  /** 「最新进度」展示用：当前阶段名，例如「数据分析」 */
  currentPhaseName: string
  /** 「最新进度」展示用：当前阶段区间，例如「10.16‒11.05」 */
  currentPhaseRange: string
  /** 最近编辑的自然语言描述 */
  lastEditedText: string
  /** 主要 DDL 名称 */
  mainDdlName: string
  mainDdlDaysLeft: number
  /** 列表底部描述 */
  footnote: string
  /** 底部是否有待办 */
  todoCount?: number
  verifiedCount?: number
  createdAt: string
  /** 该项目下的数据级别 */
  dataLevel: DataLevel
}

/** 项目成员 */
export interface ProjectMember {
  memberId: string
  name: string
  avatarText: string
  role: UserRole
  roleLabel: string
  permissionLabel: string
}

/** 版本记录 */
export interface VersionRecord {
  versionNo: string
  operatorName: string
  operatedAt: string
  description: string
  /** 是否可回滚 */
  rollbackable: boolean
}

/* ============================================================
 * 3. 论文引言（研究热点 / 理论驱动 / 数据驱动）
 * ========================================================== */

/** 研究不足条目（原文抽取） */
export interface ResearchGap {
  gapId: string
  text: string
  /** 来源标注，例如「[1] Elhai et al., 2023 · 原文第 12 页」 */
  sourceText: string
}

/** 选题三维可行性评分 */
export interface FeasibilityDimension {
  key: 'coverage' | 'dataAvailability' | 'methodComplexity'
  label: string
  score: number
  maxScore: number
  description: string
  basisText: string
  /** 为 true 时展示「数据不足，未评分」 */
  insufficientData?: boolean
}

/** 高被引综述条目 */
export interface CitedReview {
  reviewId: string
  title: string
  /** 作者 + 期刊 + 年份的组合标注 */
  metaText: string
  citedCount: number
  doiVerified: boolean
}

/** 研究趋势点 */
export interface TrendPoint {
  year: string
  value: number
}

/** 研究趋势序列 */
export interface TrendSeries {
  name: string
  color: string
  points: TrendPoint[]
}

/** 公共数据库条目 */
export interface PublicDataset {
  datasetId: string
  name: string
  level: DataLevel
  /** 访问条件，例如「L0 公开」对应的「一键直连导入」 */
  accessAction: 'directImport' | 'applyBySelf'
  accessActionText: string
  accessCondition: string
  citationRequirement: string
  subjectTags: string[]
}

/** 问卷设计检查项 */
export interface QuestionnaireCheck {
  checkId: string
  text: string
  passed: boolean
}

/** 研究热点页数据 */
export interface HotspotPageData {
  projectTitle: string
  researchDirection: string
  gaps: ResearchGap[]
  gapSourceCount: number
  feasibility: FeasibilityDimension[]
  citedReviews: CitedReview[]
  trendTitle: string
  trendSeries: TrendSeries[]
  trendNote: string
  publicDatasets: PublicDataset[]
  datasetTotal: number
  datasetCategories: string[]
  questionnaireChecks: QuestionnaireCheck[]
  recognizedPaperCount: number
  conclusion: string
}

/** 热词（词云） */
export interface HotKeyword {
  keyword: string
  freq: number
  /** 增长趋势：新兴词 / 高增长词 / 稳定核心词 / 长尾词 */
  growth: 'emerging' | 'rising' | 'stable' | 'longTail'
}

/** 热词 TOP 榜条目 */
export interface KeywordRank {
  rank: number
  keyword: string
  freq: number
}

/** 热词趋势系列 */
export interface KeywordTrendSeries {
  name: string
  color: string
  points: TrendPoint[]
}

/** 领域研究热词页数据 */
export interface TopicKeywordData {
  researchDirection: string
  sources: string[]
  rangeText: string
  paperCount: number
  keywords: HotKeyword[]
  topKeywords: KeywordRank[]
  trendYears: string[]
  trendSeries: KeywordTrendSeries[]
  trendUnit: string
  citedReviews: CitedReview[]
  lockedConcepts: string[]
}

/** 理论框架 */
export interface TheoryFramework {
  theoryId: string
  name: string
  stars: number
  explainPath: string
  representativeRef: string
  citedCount: number
  /** 该理论涉及的变量链路 */
  varChain: string[]
}

/** 变量落成草稿 */
export interface VariableDraft {
  varName: string
  /** 操作化定义 */
  definition: string
  /** 候选量表 */
  scaleName: string
  itemCount: number
  role: VariableRole
}

/** 变量角色 */
export type VariableRole =
  | 'dependent'      // 因变量
  | 'independent'    // 自变量
  | 'mediator'       // 中介变量
  | 'moderator'      // 调节变量
  | 'control'        // 控制变量
  | 'resultCandidate' // 结果变量候选

/** 选择理论与变量页数据 */
export interface TopicTheoryData {
  lockedConcepts: string[]
  theories: TheoryFramework[]
  selectedTheoryId: string
  variableDrafts: VariableDraft[]
}

/** 上传文件 */
export interface UploadedFile {
  fileId: string
  fileName: string
  /** 例如「SPSS 数据 · 4.2 MB · 512 行 × 36 列」 */
  metaText: string
  rows: number
  columns: number
  sizeText: string
  status: 'uploaded' | 'parsed' | 'failed'
  statusText: string
}

/** 示例数据集 */
export interface SampleDataset {
  sampleId: string
  title: string
  metaText: string
}

/** 数据上传页数据 */
export interface DataUploadData {
  supportedFormats: string[]
  maxFileSizeMb: number
  uploadedFiles: UploadedFile[]
  publicDatasets: PublicDataset[]
  sampleDatasets: SampleDataset[]
  readyFileCount: number
  readyVariableCount: number
  detectedDataLevel: DataLevel
  sensitiveDetected: boolean
}

/** 数据体检摘要 */
export interface HealthSummary {
  validSampleSize: number
  variableCount: number
  completeVariableCount: number
  missingVariableCount: number
  outlierCount: number
  duplicateAnswerCount: number
  sourceFile: string
}

/** 变量清单条目 */
export interface VariableItem {
  varName: string
  /** 变量类型中文名：连续变量 / 无序分类 / 有序分类 / 计数 / 文本 */
  typeLabel: string
  valueRange: string
  missingRate: number
  suggestedRole: VariableRole
  /** 手动修正后的角色（前端状态） */
  overriddenRole?: VariableRole
}

/** 变量类型分布 */
export interface VariableTypeDist {
  label: string
  count: number
  color: string
}

/** 数据质量问题 */
export interface DataQualityIssue {
  issueId: string
  level: 'warn' | 'info'
  text: string
  /** 需要用户确认处理方式 */
  needsConfirm: boolean
}

/** 变量识别页数据 */
export interface VariableIdentifyData {
  health: HealthSummary
  healthAccuracy: number
  healthReportedAt: string
  variables: VariableItem[]
  typeDistribution: VariableTypeDist[]
  qualityIssues: DataQualityIssue[]
  recognizedCount: number
  usableCount: number
}

/** 单条假设 */
export interface Hypothesis {
  hypothesisId: string
  code: string          // H1 / H2 / H3
  title: string
  /** 变量链路 */
  varChain: string[]
  testMethod: string
  basis: string
  status: 'pending' | 'confirmed' | 'rejected'
}

/** 生成假设页数据 */
export interface HypothesisPageData {
  sourceFile: string
  variableCount: number
  chatSuggestions: string[]
  hypotheses: Hypothesis[]
  citedVariables: { varName: string; roleLabel: string }[]
}

/* ============================================================
 * 4. 文献（文献综述）
 * ========================================================== */

/** DOI 核验状态 */
export type DoiStatus = 'verified' | 'unverified' | 'suspicious'

/** 文献条目 */
export interface Paper {
  paperId: string
  title: string
  authors: string
  journal: string
  year: number
  /** 期刊等级，例如 Q1 / Q2 / CSSCI */
  quartile: string
  doi?: string
  doiStatus: DoiStatus
  doiStatusText: string
  citedCount?: number
  abstractText: string
  /** 匹配理由（含相关度） */
  matchReason: string
  relevanceScore: number
  /** 是否可进入参考文献区 */
  citable: boolean
}

/** 检索筛选条件 */
export interface SearchFilter {
  query: string
  quartile: string
  discipline: string
  year: string
}

/** 双 Agent 核验概览 */
export interface VerifyOverview {
  status: AsyncTaskStatus
  statusText: string
  agentAlpha: { label: string; accuracy: number; description: string }
  agentBeta: { label: string; accuracy: number; description: string }
  passedCount: number
  suspiciousCount: number
  failedCount: number
  blockExport: boolean
  note: string
}

/** 知识库问答记录 */
export interface KbQaItem {
  question: string
  answer: string
  citations: string[]
  note: string
}

/** 文献综述页数据 */
export interface LiteraturePageData {
  projectTitle: string
  resultTotal: number
  sortBy: string
  filters: { quartile: string[]; discipline: string[]; year: string[] }
  activeFilter: SearchFilter
  languageWarning: string
  papers: Paper[]
  selectedPaperIds: string[]
  selectedCount: number
  minRequired: number
  selectionNote: string
  verify: VerifyOverview
  kbDocCount: number
  kbQa: KbQaItem
  verifiedClaimCount: number
}

/* ============================================================
 * 5. 数据分析
 * ========================================================== */

/** 分析步骤 */
export type AnalysisStepKey = 'import' | 'healthCheck' | 'method' | 'result'

/** 统计方法候选 */
export interface StatMethod {
  methodId: string
  name: string
  recommended: boolean
  summary: string
  prerequisites: string
  pros: string
  cons: string
  robustnessImpact: string
  checklist: string
  /** 执行该方法的包 / 许可证 */
  licenseNote?: string
  /**
   * 该方法的可复现代码（随方法清单一起下发）。
   * 前端切换所选方法时即时替换代码块，不必再发请求 —— 这是「代码跟随所选方法」的数据来源。
   */
  code?: { python: string; r: string }
}

/** 数据体检报告指标 */
export interface HealthMetric {
  key: string
  label: string
  value: string
  tone: 'default' | 'danger' | 'warn'
}

/** 稳健性检验条目 */
export interface RobustnessCheck {
  checkId: string
  name: string
  statusText: string
  /** 结论是否翻转 */
  flipped?: boolean | null
  pending?: boolean
}

/** 缺失值分布条目 */
export interface MissingBar {
  varName: string
  missingRate: number
}

/** 可复现代码 */
export interface CodeSnippet {
  language: 'python' | 'r'
  fileName: string
  code: string
  licenseNote: string
}

/** 选择留痕 */
export interface SelectionTrail {
  operatorName: string
  operatedAt: string
  candidateCount: number
  unselectedCount: number
  dataVersion: string
  /** 方法清单来源：ai = 大模型依据本项目生成；catalog = 未配置模型时的内置目录 */
  methodSource?: 'ai' | 'catalog'
}

/** 分析结果（analysis result 页 / 沙箱产出） */
export interface AnalysisResult {
  runId: string
  methodId: string
  methodName: string
  finishedAt: string
  sampleSize: number
  /** 主要统计量 */
  effects: { label: string; value: string; ci?: string }[]
  robustness: RobustnessCheck[]
}

/** 数据分析页数据 */
export interface AnalysisPageData {
  projectTitle: string
  steps: { key: AnalysisStepKey; label: string; status: 'done' | 'current' | 'upcoming' }[]
  dataVersion: { version: string; rows: number; columns: number; dataLevel: DataLevel }
  methods: StatMethod[]
  /** 方法清单来源：AI 依据本项目生成 / 内置方法库兜底 */
  methodSource?: 'ai' | 'catalog'
  selectionTrail: SelectionTrail
  healthReport: { accuracy: number; reportedAt: string; metrics: HealthMetric[] }
  healthNotes: { tone: 'danger' | 'warn' | 'info'; text: string }[]
  importFormats: string[]
  importedFile: { fileName: string; metaText: string; passed: boolean }
  sensitiveWarning: string
  code: CodeSnippet[]
  robustness: RobustnessCheck[]
  robustnessNote: string
  missingBars: MissingBar[]
  run: AnalysisResult | null
}

/* ============================================================
 * 6. 论文写作
 * ========================================================== */

/** 写作模式 */
export type WritingMode = 'aiFull' | 'aiAssist'

/** 大纲节点 */
export interface OutlineNode {
  nodeId: string
  /** 例如「2.1 孤独感中介研究」 */
  title: string
  level: number
  /** 引用数量，无引用则为 undefined */
  citeCount?: number
  /** 缺对应文献 / 绑定分析产物 */
  flag?: 'missingCitation' | 'boundArtifact'
  children?: OutlineNode[]
}

/** 正文段落 */
export interface DocParagraph {
  paraId: string
  index: number
  /** 段落所属章节 */
  section: string
  /** 段落角色：正文 / 方法（绑定产物）/ 标题 */
  kind: 'normal' | 'boundMethod' | 'heading'
  /** AI 生成标记 */
  aiGenerated: boolean
  /** 溯源标识文案 */
  traceLabel?: string
  text: string
}

/** 引用条目 */
export interface CitationEntry {
  index: number
  /** APA 7 格式文本 */
  apaText: string
  /** GB/T 7714 格式文本 */
  gbText: string
  paperId: string
}

/** 页脚统计 */
export interface DocStats {
  wordCount: number
  paragraphCount: number
  citationCount: number
  /** 尚未保存的修改处数（0 表示已全部落库） */
  unsavedChanges: number
  lastEditedAt: string
  aiLabelEnabled: boolean
}

/** Zotero 联动状态 */
export interface ZoteroBinding {
  bound: boolean
  account: string
  bidirectionalSync: boolean
  rateLimitText: string
  fallbackText: string
}

/** 写作页数据 */
export interface WritingPageData {
  projectTitle: string
  title: string
  mode: WritingMode
  outline: OutlineNode[]
  currentSection: string
  autoSavedAt: string
  stats: DocStats
  paragraphs: DocParagraph[]
  citations: CitationEntry[]
  citationStyle: 'APA7' | 'GBT7714'
  inTextStyle: string
  targetJournal: { name: string; style: string }
  aiPolicyReminder: { journal: string; text: string; syncedAt: string }
  zotero: ZoteroBinding
  kbDocs: { paperId: string; title: string; metaText: string }[]
  kbDocCount: number
  aiSuggestions: { suggestionId: string; text: string; adopted: boolean }[]
  /** 编辑器（全屏版）额外字段 */
  editor?: {
    journalFormat: string
    /** 可选投稿格式（下拉选项，由服务端下发，避免前端写死目标期刊） */
    journalFormatOptions: string[]
    citationStyleLabel: string
    inTextLabel: string
    fontName: string
    fontSizeLabel: string
    lineHeightLabel: string
    pageCount: number
    zoom: number
  }
  /**
   * 全屏编辑器（P11）的正文块。
   * 说明：此前 P11 直接 import Mock 常量渲染正文，绕过了接口层；
   * 现已并入 `GET /projects/:projectId/writing` 的返回载荷，前端不再直连 Mock。
   */
  editorBody: EditorBlock[]
  /** 全屏编辑器「插入引用」浮层里可选的知识库文献 */
  editorCitations: EditorCitation[]
  /** 段落改写动作（重写 / 缩写 / 扩写 / 学术化改写），由服务端下发以保证前后端动作枚举一致 */
  rewriteActions: string[]
  /**
   * 正文作者行，例如「陈某某 · 心理学系」。
   * 由服务端按「第一作者姓名 + 学科」生成，前端不写死（历史上这里写死过示例姓名）。
   */
  authorLine: string
  /**
   * 投稿前检查清单（点击「生成投稿检查清单」后展示）。
   * `done` / `total` 由服务端计算；`items` 与 P06 选刊页的 `submissionChecks` 同源，避免两处口径不一致。
   */
  submissionChecklist: {
    total: number
    done: number
    items: {
      checkId: string
      text: string
      passed: boolean
      /** 未通过时的待补说明，例如「伦理声明待补」 */
      pendingText?: string
    }[]
  }
}

/** 编辑器正文块 */
export interface EditorBlock {
  paraId: string
  /** heading 标题 / body 正文段落 / aiLabel AI 溯源标识行 */
  kind: 'heading' | 'body' | 'aiLabel'
  text: string
  /** 文内引用序号，渲染为上标 [n] */
  citeIndex?: number
}

/** 编辑器可插入的知识库文献 */
export interface EditorCitation {
  index: number
  title: string
  journal: string
  year: string
}

/* ============================================================
 * 7. 选刊 AI
 * ========================================================== */

/** 期刊匹配结果 */
export interface JournalMatch {
  journalId: string
  name: string
  /** 例如「JCR Q1 · 中科院 1 区 · IF 8.9 · Elsevier」 */
  indexText: string
  matchScore: number
  matchReason: string
}

/** 期刊画像 */
export interface JournalProfile {
  journalId: string
  name: string
  sourceText: string
  partition: string
  reviewCycle: string
  reviewCycleSource: string
  acceptanceRate: string
  acceptanceSource: string
  apc: string
  databases: string
  formatRequirement: string
  aiPolicy: {
    level: string
    allows: string
    forbids: string
    requires: string
    sourceText: string
  }
}

/** 投稿前检查项 */
export interface SubmissionCheck {
  checkId: string
  text: string
  passed: boolean
  pendingText?: string
}

/** 选刊页数据 */
export interface JournalPageData {
  title: string
  abstractText: string
  keywords: string[]
  matches: JournalMatch[]
  profile: JournalProfile
  submissionChecks: SubmissionCheck[]
  completedChecks: number
  totalChecks: number
  disclaimer: string
  dataUpdatedAt: string
}

/* ============================================================
 * 8. 模拟评审
 * ========================================================== */

/** 评审意见类型 */
export type ReviewIssueType = 'hard' | 'dispute' | 'style'

/** 评审意见 */
export interface ReviewIssue {
  issueId: string
  code: string                     // H1 / H2 / D1 / S1
  type: ReviewIssueType
  title: string
  /** 置信度：高 / 中 / 低 */
  confidence: 'high' | 'medium' | 'low'
  confidenceText: string
  description: string
  /** 出现频率文案，例如「同类意见在顶刊审稿中出现 47%」 */
  frequencyText: string
  /** 该条的处理状态（前端状态） */
  handled: 'none' | 'accepted' | 'disputed' | 'ignored'
  /** 是否支持生成回复 */
  replyable: boolean
}

/** 修改路径 */
export interface RevisionPath {
  issueCode: string
  title: string
  text: string
}

/** Rebuttal 草稿 */
export interface RebuttalDraft {
  issueCode: string
  title: string
  steps: string[]
}

/** 模拟评审页数据 */
export interface ReviewPageData {
  reviewTarget: string
  targetJournal: string
  field: string
  calibration: {
    paperCount: number
    corpusCount: number
    calibratedAt: string
    note: string
  }
  issues: ReviewIssue[]
  revisionPaths: RevisionPath[]
  rebuttals: RebuttalDraft[]
  summary: { accepted: number; disputed: number; ignored: number; corpusCount: number }
  disclaimer: string
}

/* ============================================================
 * 9. 导出中心
 * ========================================================== */

/** 产物导出项 */
export interface ExportArtifact {
  artifactId: string
  name: string
  metaText: string
  formats: string[]
  /** 待补齐 / 已就绪 */
  status: 'ready' | 'pending'
  statusText?: string
  /** 是否为合规阻断项 */
  blocked?: boolean
}

/** 披露报告清单项 */
export interface DisclosureItem {
  itemId: string
  text: string
  done: boolean
}

/** 合规校验指标 */
export interface ComplianceMetric {
  key: string
  label: string
  value: string
  tone: 'danger' | 'ok'
}

/** 导出中心页数据 */
export interface ExportPageData {
  artifactCount: number
  artifacts: ExportArtifact[]
  disclosure: {
    title: string
    note: string
    items: DisclosureItem[]
    unreviewedCount: number
    lastGeneratedAt?: string
  }
  risk: {
    hasUnverified: boolean
    unverifiedCount: number
    message: string
  }
  compliance: ComplianceMetric[]
  complianceNote: string
}

/* ============================================================
 * 10. 项目设置
 * ========================================================== */

/** 项目设置页数据 */
export interface ProjectSettingsData {
  projectId: string
  title: string
  metaText: string
  discipline: string
  routeText: string
  ddlNodes: DdlNode[]
  members: ProjectMember[]
  versions: VersionRecord[]
  versionPolicyText: string
  dataLevel: DataLevel
  /** 是否跳过逐条确认（YOLO）；与 /projects/:projectId/compliance 同源，保证三处入口一致 */
  skipConfirm: boolean
  dataLevelOptions: {
    level: DataLevel
    name: string
    description: string
    rules: string[]
    current: boolean
  }[]
  dataLevelChangeImpact: string
}

/* ============================================================
 * 11. 前端 UI 状态
 * ========================================================== */

/** 全局 Toast */
export interface ToastItem {
  id: string
  tone: 'info' | 'ok' | 'warn' | 'danger'
  title: string
  description?: string
}

/** 通用确认弹窗配置 */
export interface ConfirmDialogConfig {
  open: boolean
  tone: 'info' | 'warn'
  title: string
  description: string
  confirmText: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
}

/** 异步任务弹窗（沙箱执行 / 完成） */
export interface TaskDialogConfig {
  open: boolean
  phase: 'running' | 'succeeded' | 'failed'
  title: string
  description: string
  progress?: number
  etaText?: string
  actionText?: string
  onAction?: () => void
}
