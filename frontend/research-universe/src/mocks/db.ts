/**
 * 研宇宙 —— Mock 数据
 * 说明：本文件中的全部数值都来自设计稿中的模拟数据渲染示例，
 *      真实接入后端后由 src/api/endpoints.ts 替换（每个函数上方都标了对应接口）。
 *
 * 单一真源约定：项目的「当前阶段 / 阶段区间 / 最近 DDL / 剩余天数」全部由
 * PROJECT_SCHEDULES（日程）派生，避免手写常量之间互相矛盾。
 */
import type {
  AccountPrivacy,
  AccountSettings,
  AnalysisPageData,
  DataLevel,
  DataUploadData,
  DdlKeywordSetting,
  DdlNode,
  EditorBlock,
  EditorCitation,
  ExportPageData,
  FlowStepProgress,
  HotspotPageData,
  HypothesisPageData,
  JournalPageData,
  LiteraturePageData,
  LoginDevice,
  NotificationItem,
  NotificationPref,
  Plan,
  ProjectProgress,
  StepDraft,
  Project,
  ProjectComplianceSettings,
  ProjectDdlGroup,
  ProjectMember,
  ProjectSchedule,
  ProjectSettingsData,
  ProjectStage,
  QuotaItem,
  QuotaUsage,
  ReviewPageData,
  ScheduleMilestone,
  SchedulePhase,
  StageArtifact,
  StageArtifactsPayload,
  StudentVerification,
  TopicKeywordData,
  TopicTheoryData,
  TrendSeries,
  UserInfo,
  VariableIdentifyData,
  VersionRecord,
  WritingPageData,
} from '@/types'
import {
  addDays,
  daysLeftFrom,
  resolveMilestoneStatus,
  resolvePhaseStatus,
  resolveRange,
  shortRange,
} from '@/utils/schedule'

/* ------------------------------------------------------------
 * 1. 全局：用户 / 认证 / 套餐
 * ---------------------------------------------------------- */

export const CURRENT_USER: UserInfo = {
  userId: 'u_1001',
  nickname: '陈同学',
  avatarText: '陈',
  major: '心理学',
  grade: '研二',
  eduEmail: 'chen@stu.example.edu.cn',
  hasContact: true,
}

export const STUDENT_VERIFICATION: StudentVerification = {
  verified: true,
  channel: 'eduEmail',
  eduEmail: 'chen@stu.example.edu.cn',
  verifiedAt: '2026-09-01 10:12',
  benefitsSynced: true,
  graceDays: 90,
}

export const PLANS: Plan[] = [
  {
    planId: 'student',
    name: '学生版',
    subtitle: '已认证专享',
    price: 19,
    priceUnit: 'month',
    currency: 'CNY',
    highlights: ['文献检索不限次', '综述生成 20 次/月', '双 Agent 核验 500 条/月', '分析算力 300 分钟/月'],
    recommendedFor: '在读学生',
  },
  {
    planId: 'pro',
    name: '专业版',
    subtitle: '适合硕士 / 青年科研人员',
    price: 49,
    priceUnit: 'month',
    currency: 'CNY',
    highlights: [
      '综述生成 80 次/月',
      '双 Agent 核验 2,000 条/月',
      '分析算力 1,500 分钟/月',
      '导出不限次 · Zotero 双向同步',
    ],
    mostPopular: true,
  },
  {
    planId: 'team',
    name: '团队版',
    subtitle: '课题组 / 实验室',
    price: 129,
    priceUnit: 'monthPerMember',
    currency: 'CNY',
    highlights: ['综述生成与核验不限次', '分析算力 5,000 分钟/月', '导师只读视图与评论退回', '机构合规模板与统一披露'],
    recommendedFor: '课题组 / 实验室',
  },
]

export const QUOTA_ITEMS: QuotaItem[] = [
  { key: 'search', label: '文献检索次数', student: '不限', pro: '不限', team: '不限' },
  { key: 'review', label: '综述生成', student: '20 次/月', pro: '80 次/月', team: '不限' },
  { key: 'verify', label: '双 Agent 核验', student: '500 条/月', pro: '2,000 条/月', team: '不限' },
  { key: 'sandbox', label: '分析算力', student: '300 分钟/月', pro: '1,500 分钟/月', team: '5,000 分钟/月' },
  { key: 'export', label: '导出次数', student: '20 次/月', pro: '不限', team: '不限' },
]

export const QUOTA_USAGE: QuotaUsage = {
  planId: 'student',
  resetAt: '2026-10-01 00:00',
  reviewGenerateUsed: 6,
  reviewGenerateLimit: 20,
  verifyUsed: 186,
  verifyLimit: 500,
  sandboxMinutesUsed: 74,
  sandboxMinutesLimit: 300,
  exportUsed: 5,
  exportLimit: 20,
  overagePolicy: 'throttle',
}

export const OVERAGE_TEXT = {
  policy: '默认降速不中断：核验排队等级下降，仍可正常使用',
  payAsYouGo: '可在设置中开启按量付费，超部分自动计费并推送提醒',
  reset: '次月 1 日自动重置；已使用额度不结转、不追溯',
}

/* ------------------------------------------------------------
 * 1.2 账号设置（P13，路由 /account）
 * ---------------------------------------------------------- */

/**
 * 站内通知（顶栏铃铛）。
 * 说明：此前顶栏的通知文案与未读数「2」是写死在组件里的，无法接后端；
 * 现在改为由 `GET /me/notifications` 下发，未读数由服务端计算。
 */
export const NOTIFICATIONS: NotificationItem[] = [
  {
    notificationId: 'ntf_1',
    title: '2 条文献核验条目待确认',
    description: '去导出中心处理 · 10 分钟前',
    route: '/project/p_2001/export',
    read: false,
  },
  {
    notificationId: 'ntf_2',
    title: '中期检查还有 12 天',
    description: '项目：社交焦虑与手机依赖 · 今天 09:00',
    route: '/project/p_2001/settings',
    read: false,
  },
  {
    notificationId: 'ntf_3',
    title: '结构化文献综述 v3 已通过双 Agent 核验',
    description: '26 条论断通过 · 昨天 21:14',
    route: '/project/p_2001/literature',
    read: true,
  },
]

/** 表单可选项 */
export const MAJOR_OPTIONS = ['心理学', '教育学', '社会学', '医学', '管理学', '计算机']
export const GRADE_OPTIONS = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士']

/** 登录设备（current=true 为当前设备，不可被「退出其他设备」移除） */
export const LOGIN_DEVICES: LoginDevice[] = [
  {
    deviceId: 'dev_1',
    deviceName: 'Chrome · Windows',
    locationText: '116.25.***.12 · 深圳',
    lastActiveAt: '2026-09-24 20:58',
    current: true,
  },
  {
    deviceId: 'dev_2',
    deviceName: 'Safari · iPhone',
    locationText: '116.25.***.12 · 深圳',
    lastActiveAt: '2026-09-23 08:12',
    current: false,
  },
  {
    deviceId: 'dev_3',
    deviceName: 'Edge · Windows',
    locationText: '219.133.***.78 · 广州',
    lastActiveAt: '2026-09-11 14:36',
    current: false,
  },
]

/** 通知偏好：核验失败为合规强制项，不可关闭 */
export const NOTIFICATION_PREFS: NotificationPref[] = [
  {
    key: 'verifyFailed',
    label: '核验失败提醒',
    description: '文献核验失败或存疑时立即通知，涉及导出阻断，不可关闭',
    enabled: true,
    mandatory: true,
  },
  {
    key: 'ddlReminder',
    label: 'DDL 临近提醒',
    description: '距 DDL 硬节点 7 天 / 3 天 / 1 天时提醒',
    enabled: true,
  },
  {
    key: 'taskDone',
    label: '长任务完成提醒',
    description: '数据分析、结构化综述生成完成后通知',
    enabled: true,
  },
  {
    key: 'weeklyReport',
    label: '每周进度简报',
    description: '每周一 09:00 发送上周各项目进度汇总',
    enabled: false,
  },
  {
    key: 'productUpdate',
    label: '产品与政策更新',
    description: '目标期刊 AI 政策变更、功能上线通知',
    enabled: true,
  },
]

/** 数据与隐私：默认不允许把数据计入训练集 */
export const ACCOUNT_PRIVACY: AccountPrivacy = {
  allowTraining: false,
  keepHistoryDays: 30,
  exportRequestedAt: undefined,
}

/** 账号设置页数据（由用户 / 认证 / 额度三份 Mock 组合而成） */
export const ACCOUNT_SETTINGS: AccountSettings = {
  userId: CURRENT_USER.userId,
  nickname: CURRENT_USER.nickname,
  avatarText: CURRENT_USER.avatarText,
  major: CURRENT_USER.major,
  grade: CURRENT_USER.grade,
  phoneMasked: '138****0000',
  eduEmail: CURRENT_USER.eduEmail,
  hasContact: CURRENT_USER.hasContact,
  registeredAt: '2026-09-01 09:30',
  verification: STUDENT_VERIFICATION,
  planId: QUOTA_USAGE.planId,
  quota: QUOTA_USAGE,
  devices: LOGIN_DEVICES,
  notifications: NOTIFICATION_PREFS,
  privacy: ACCOUNT_PRIVACY,
  majorOptions: MAJOR_OPTIONS,
  gradeOptions: GRADE_OPTIONS,
}

/* ------------------------------------------------------------
 * 2. 工作台
 * ---------------------------------------------------------- */

/* ------------------------------------------------------------
 * 2.1 项目日程（甘特图数据源 · 阶段与 DDL 的唯一真源）
 * ---------------------------------------------------------- */

/**
 * 数据基准日（as-of）。
 *
 * 设计稿 P01 的模拟数据自相矛盾：「开题报告 09-25 · 剩 5 天」隐含基准日 ≈ 2026-09-20；
 * 而「数据分析为当前阶段」+「距中期检查 12 天」隐含基准日 ≈ 2026-11-03（11-15 减 12 天）。
 * 本实现统一取 2026-11-03 作为数据基准日，并由日期派生全部阶段状态与剩余天数——
 * 这样三个项目卡片上设计稿原有的「当前阶段 / 距 DDL 天数」文案全部可复现，
 * 唯一变化是「开题报告」按日期已成为已完成节点。
 * 真实接入后该字段由服务端下发为系统当天。
 */
export const SCHEDULE_TODAY = '2026-11-03'

interface RawSchedule {
  projectId: string
  projectTitle: string
  phases: Omit<SchedulePhase, 'status'>[]
  milestones: Omit<ScheduleMilestone, 'daysLeft' | 'status'>[]
  /** 日程风险提示（编辑性文案，不写入会随时间漂移的数字） */
  tip: string
}

/** 各项目的阶段与 DDL 硬节点：日期是唯一录入值，状态 / 剩余天数全部派生 */
const RAW_SCHEDULES: RawSchedule[] = [
  {
    projectId: 'p_2001',
    projectTitle: '社交焦虑与手机依赖的关系研究',
    phases: [
      { phaseId: 'ph1', name: '选题', startDate: '2026-09-01', endDate: '2026-09-20', progress: 100 },
      { phaseId: 'ph2', name: '文献综述', startDate: '2026-09-21', endDate: '2026-10-15', progress: 100 },
      { phaseId: 'ph3', name: '数据分析', startDate: '2026-10-16', endDate: '2026-11-05', progress: 45 },
      { phaseId: 'ph4', name: '论文写作', startDate: '2026-11-06', endDate: '2026-12-01', progress: 0 },
      { phaseId: 'ph5', name: '投稿准备', startDate: '2026-12-02', endDate: '2026-12-15', progress: 0 },
    ],
    milestones: [
      { nodeId: 'ddl1', name: '开题报告', date: '2026-09-25' },
      { nodeId: 'ddl2', name: '中期检查', date: '2026-11-15' },
      { nodeId: 'ddl3', name: '投稿截止', date: '2026-12-15' },
      { nodeId: 'ddl4', name: '毕业答辩', date: '2027-03-20' },
    ],
    tip: '文献精读预计逾期 3 天，建议压缩至 20 篇精读。',
  },
  {
    projectId: 'p_2002',
    projectTitle: '短视频使用对大学生睡眠质量的影响：基于 ESM 的实证研究',
    phases: [
      { phaseId: 'ph1', name: '选题', startDate: '2026-06-01', endDate: '2026-06-20', progress: 100 },
      { phaseId: 'ph2', name: '文献综述', startDate: '2026-06-21', endDate: '2026-07-31', progress: 100 },
      { phaseId: 'ph3', name: '数据分析', startDate: '2026-08-01', endDate: '2026-08-31', progress: 100 },
      { phaseId: 'ph4', name: '论文写作', startDate: '2026-09-01', endDate: '2026-12-31', progress: 68 },
      { phaseId: 'ph5', name: '投稿准备', startDate: '2027-01-01', endDate: '2027-01-28', progress: 0 },
    ],
    milestones: [
      { nodeId: 'ddl1', name: '开题报告', date: '2026-06-15' },
      { nodeId: 'ddl2', name: '中期检查', date: '2026-09-10' },
      { nodeId: 'ddl3', name: '投稿截止', date: '2027-01-28' },
      { nodeId: 'ddl4', name: '毕业答辩', date: '2027-03-20' },
    ],
    tip: '初稿字数 4,820，建议先补齐讨论与结论章节再进入选刊。',
  },
  {
    projectId: 'p_2003',
    projectTitle: '导师制对研究生科研效能的影响：一项追踪研究设计',
    phases: [
      { phaseId: 'ph1', name: '选题', startDate: '2026-09-20', endDate: '2026-11-08', progress: 15 },
      { phaseId: 'ph2', name: '文献综述', startDate: '2026-11-09', endDate: '2026-12-20', progress: 0 },
      { phaseId: 'ph3', name: '数据分析', startDate: '2026-12-21', endDate: '2027-01-20', progress: 0 },
      { phaseId: 'ph4', name: '论文写作', startDate: '2027-01-21', endDate: '2027-02-20', progress: 0 },
      { phaseId: 'ph5', name: '投稿准备', startDate: '2027-02-21', endDate: '2027-03-15', progress: 0 },
    ],
    milestones: [
      { nodeId: 'ddl1', name: '开题答辩', date: '2026-11-08' },
      { nodeId: 'ddl2', name: '中期检查', date: '2027-01-10' },
      { nodeId: 'ddl3', name: '投稿截止', date: '2027-03-15' },
      { nodeId: 'ddl4', name: '毕业答辩', date: '2027-03-20' },
    ],
    tip: '选题可行性评估已完成，建议先补齐研究假设与变量落成。',
  },
]

/** 完整日程：由 RAW_SCHEDULES 派生 status 与 daysLeft */
export const PROJECT_SCHEDULES: Record<string, ProjectSchedule> = Object.fromEntries(
  RAW_SCHEDULES.map((raw) => {
    const { rangeStart, rangeEnd } = resolveRange(raw.phases, raw.milestones)
    const schedule: ProjectSchedule = {
      projectId: raw.projectId,
      projectTitle: raw.projectTitle,
      rangeStart,
      rangeEnd,
      today: SCHEDULE_TODAY,
      phases: raw.phases.map((p) => ({ ...p, status: resolvePhaseStatus(p, SCHEDULE_TODAY) })),
      milestones: raw.milestones.map((m) => {
        const daysLeft = daysLeftFrom(SCHEDULE_TODAY, m.date)
        return { ...m, daysLeft, status: resolveMilestoneStatus(daysLeft) }
      }),
      tip: raw.tip,
    }
    return [raw.projectId, schedule]
  }),
)

/** 阶段顺序 → 项目阶段枚举（决定卡片点击后进入哪个页面） */
const PHASE_ORDER_TO_STAGE: ProjectStage[] = ['topic', 'literature', 'analysis', 'writing', 'submission']

/* ------------------------------------------------------------
 * 2.2 项目
 * ---------------------------------------------------------- */

/** 原始项目数据：只含固有字段；阶段 / 当前区间 / 最近 DDL 由日程派生 */
type RawProject = Omit<
  Project,
  'stage' | 'stageLabel' | 'currentPhaseName' | 'currentPhaseRange' | 'mainDdlName' | 'mainDdlDaysLeft'
>

const RAW_PROJECTS: RawProject[] = [
  {
    projectId: 'p_2001',
    title: '社交焦虑与手机依赖的关系研究：一个有调节的中介模型',
    discipline: '心理学',
    route: 'dataDriven',
    progress: 45,
    lastEditedText: '2 小时前编辑',
    /**
     * 设计稿原文案为「3 待办 · 核验通过 28 条」。
     * 该行与下方 todoCount / verifiedCount 渲染的是同一句话，卡片里二者互斥渲染，
     * 因此这里保留原文案仅作设计稿对照，实际展示由 todoCount 分支负责。
     */
    footnote: '3 待办 · 核验通过 28 条',
    todoCount: 3,
    verifiedCount: 28,
    createdAt: '2026-09-01',
    dataLevel: 'L1',
  },
  {
    projectId: 'p_2002',
    title: '短视频使用对大学生睡眠质量的影响：基于 ESM 的实证研究',
    discipline: '心理学',
    route: 'dataDriven',
    progress: 68,
    lastEditedText: '昨天 21:14 编辑',
    footnote: '初稿 4,820 字 · 引用 31 条（全部来自已核验池）',
    createdAt: '2026-07-18',
    dataLevel: 'L1',
  },
  {
    projectId: 'p_2003',
    title: '导师制对研究生科研效能的影响：一项追踪研究设计',
    discipline: '教育学',
    route: 'theoryDriven',
    progress: 15,
    lastEditedText: '3 天前编辑',
    footnote: '已完成选题可行性评估 · 待开始文献综述',
    createdAt: '2026-09-20',
    dataLevel: 'L0',
  },
]

/** 项目列表：阶段与最近 DDL 由 PROJECT_SCHEDULES 派生，避免常量之间互相矛盾 */
export const PROJECTS: Project[] = RAW_PROJECTS.map((p) => {
  const schedule = PROJECT_SCHEDULES[p.projectId]
  const currentIdx = Math.max(
    0,
    schedule.phases.findIndex((ph) => resolvePhaseStatus(ph, schedule.today) === 'current'),
  )
  const currentPhase = schedule.phases[currentIdx]
  const upcoming = schedule.milestones
    .filter((m) => m.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
  const nextMilestone = upcoming[0] ?? schedule.milestones[schedule.milestones.length - 1]
  return {
    ...p,
    stage: PHASE_ORDER_TO_STAGE[currentIdx] ?? 'topic',
    stageLabel: `${currentPhase.name}中`,
    currentPhaseName: currentPhase.name,
    currentPhaseRange: shortRange(currentPhase.startDate, currentPhase.endDate),
    mainDdlName: nextMilestone.name,
    mainDdlDaysLeft: nextMilestone.daysLeft,
  }
})

/** 当前项目 id（Mock 内固定为第一项） */
export const CURRENT_PROJECT_ID = 'p_2001'

export const PROJECT_LIST_META = '共 3 个项目 · 按最近编辑排序'

/** 首页问候副标题：剩余天数由日程派生，不手写 */
const MAIN_PROJECT = PROJECTS.find((p) => p.projectId === CURRENT_PROJECT_ID) ?? PROJECTS[0]
export const GREETING_SUBTITLE = `2 条文献核验条目待确认（导出中心），「社交焦虑与手机依赖」距${MAIN_PROJECT.mainDdlName}还有 ${MAIN_PROJECT.mainDdlDaysLeft} 天。`

/**
 * 里程碑 → DDL 节点（展示用短日期：与基准日同年显示 MM-DD，跨年显示完整日期）。
 * DDL_TIMELINE、PROJECT_DDL_LIST 与接口层共用这一处映射，避免三份实现漂移。
 */
export function toDdlNode(m: ScheduleMilestone): DdlNode {
  return {
    nodeId: m.nodeId,
    name: m.name,
    date: m.date.startsWith(SCHEDULE_TODAY.slice(0, 4)) ? m.date.slice(5) : m.date,
    daysLeft: m.daysLeft,
    status: m.status === 'current' ? 'current' : m.status === 'done' ? 'done' : 'upcoming',
  }
}

/** DDL 倒排时间线（当前项目，派生自日程；供项目设置页使用） */
export const DDL_TIMELINE: DdlNode[] = PROJECT_SCHEDULES[CURRENT_PROJECT_ID].milestones.map(toDdlNode)

/**
 * 全部项目的 DDL 节点分组（工作台右栏「DDL 倒排时间线」用）。
 * 用**函数**而不是常量：新建项目后调用即可拿到最新分组，避免常量在模块初始化时被冻住。
 */
export function buildProjectDdlGroups(): ProjectDdlGroup[] {
  return PROJECTS.map((p) => {
    const schedule = PROJECT_SCHEDULES[p.projectId]
    return {
      projectId: p.projectId,
      projectTitle: p.title,
      nodes: (schedule?.milestones ?? []).map(toDdlNode),
      tip: schedule?.tip,
    }
  })
}

/** 当前项目的日程风险提示 */
export const TIMELINE_TIP = PROJECT_SCHEDULES[CURRENT_PROJECT_ID].tip

/* ------------------------------------------------------------
 * 2.3 本阶段产物摘要（原「项目流程看板」已移除，仅保留产物块）
 * ---------------------------------------------------------- */

const RAW_ARTIFACTS: Record<string, StageArtifact[]> = {
  p_2001: [
    { artifactId: 'a1', name: '结构化文献综述 v3', statusText: '双 Agent 核验已通过', tone: 'ok' },
    { artifactId: 'a2', name: '数据体检报告', statusText: '38 项指标 · 通过', tone: 'ok' },
    { artifactId: 'a3', name: '候选统计方法清单', statusText: '等待你的选择', tone: 'warn', actionText: '去选择 →' },
  ],
  p_2002: [
    { artifactId: 'b1', name: '结构化文献综述 v2', statusText: '双 Agent 核验已通过', tone: 'ok' },
    { artifactId: 'b2', name: '分析结果包', statusText: '含稳健性检验 · 结论未翻转', tone: 'ok' },
    { artifactId: 'b3', name: '论文初稿 v1', statusText: '字数 2,148 · 待补讨论章节', tone: 'warn', actionText: '去写作 →' },
  ],
  p_2003: [
    { artifactId: 'c1', name: '选题可行性评估报告', statusText: '三维评分已完成', tone: 'ok' },
    { artifactId: 'c2', name: '领域研究热词报告', statusText: '来源 2,847 篇文献', tone: 'ok' },
    { artifactId: 'c3', name: '问卷设计检查清单', statusText: '待确认处理方式', tone: 'warn' },
  ],
}

/** 各项目「本阶段产物摘要」：当前阶段取自派生后的 PROJECTS，保证与卡片一致 */
export const PROJECT_ARTIFACTS: Record<string, StageArtifactsPayload> = Object.fromEntries(
  PROJECTS.map((p) => [
    p.projectId,
    {
      projectId: p.projectId,
      currentStage: p.stage,
      currentStageLabel: p.stageLabel,
      artifacts: RAW_ARTIFACTS[p.projectId] ?? [],
    },
  ]),
)

/** 兼容旧引用：默认当前项目的产物列表 */
export const STAGE_ARTIFACTS: StageArtifact[] = PROJECT_ARTIFACTS[CURRENT_PROJECT_ID].artifacts

/* ------------------------------------------------------------
 * 2.5 「示例项目」与「新建项目」的区分
 * ----------------------------------------------------------
 * 背景（重要）：此前 fetchHotspot / fetchDataUpload 等接口**完全忽略 projectId**，
 * 永远返回示例数据。于是新建项目后，页面标题、研究结果、已上传文件都还是 p_2001 的，
 * 用户看起来就像「没跳过去」。这里引入示例项目白名单：
 *   - 示例项目（p_2001 ~ p_2003）→ 返回设计稿中的完整示例数据，便于评审；
 *   - 新建项目 → 返回**空态载荷**（项目名用真实项目名、计数为 0），让「这是新项目」一目了然。
 * 真实后端不存在这个问题（每个 projectId 都有自己的数据）。
 * ---------------------------------------------------------- */

/** 有完整示例数据的演示项目（与设计稿一致） */
export const DEMO_PROJECT_IDS = ['p_2001', 'p_2002', 'p_2003']

/** 是否为带示例数据的演示项目 */
export function isDemoProject(projectId: string): boolean {
  return DEMO_PROJECT_IDS.includes(projectId)
}

/** 按 id 取项目（找不到返回 undefined） */
export function getProject(projectId: string): Project | undefined {
  return PROJECTS.find((p) => p.projectId === projectId)
}

/** 新建项目的「研究热点」空态：项目名用真实项目名，其余计数为 0 */
export function buildEmptyHotspot(project: Project): HotspotPageData {
  return {
    projectTitle: project.title,
    researchDirection: '',
    gaps: [],
    gapSourceCount: 0,
    feasibility: [
      {
        key: 'coverage',
        label: '文献覆盖度',
        score: 0,
        maxScore: 5,
        description: '尚未检索文献',
        basisText: '依据：输入研究方向并点击「生成分析报告」后生成',
        insufficientData: true,
      },
      {
        key: 'dataAvailability',
        label: '数据可得性',
        score: 0,
        maxScore: 5,
        description: '尚未接入或上传数据',
        basisText: '依据：上传数据或选择公共数据库后生成',
        insufficientData: true,
      },
      {
        key: 'methodComplexity',
        label: '方法复杂度',
        score: 0,
        maxScore: 5,
        description: '尚未选择统计方法',
        basisText: '依据：在「数据分析」中选定方法后生成',
        insufficientData: true,
      },
    ],
    citedReviews: [],
    trendTitle: '研究趋势',
    trendSeries: [],
    trendNote: '暂无数据：检索或上传数据后生成趋势图。',
    // 公共数据库是公开资源，新建项目同样可用，故保留可选项
    publicDatasets: HOTSPOT_DATA.publicDatasets,
    datasetTotal: HOTSPOT_DATA.datasetTotal,
    datasetCategories: HOTSPOT_DATA.datasetCategories,
    questionnaireChecks: [],
    recognizedPaperCount: 0,
    conclusion: '尚未生成分析报告：请先填写研究方向。',
  }
}

/** 新建项目的「上传数据」空态：无已上传文件、无变量 */
export function buildEmptyUploadData(project: Project): DataUploadData {
  return {
    supportedFormats: UPLOAD_DATA.supportedFormats,
    maxFileSizeMb: UPLOAD_DATA.maxFileSizeMb,
    uploadedFiles: [],
    publicDatasets: UPLOAD_DATA.publicDatasets,
    sampleDatasets: UPLOAD_DATA.sampleDatasets,
    readyFileCount: 0,
    readyVariableCount: 0,
    detectedDataLevel: 'L1',
    sensitiveDetected: false,
    // 项目名留给页面标题使用（DataUploadData 本身没有该字段，故此处仅通过项目徽标展示）
  }
}

/* ------------------------------------------------------------
 * 2.4 新建项目：默认记录（供 POST /projects 的 Mock 使用）
 * ---------------------------------------------------------- */

/** 新项目的默认阶段时长（天） */
const NEW_PROJECT_PHASE_PLAN: { name: string; days: number }[] = [
  { name: '选题', days: 30 },
  { name: '文献综述', days: 30 },
  { name: '数据分析', days: 30 },
  { name: '论文写作', days: 40 },
  { name: '投稿准备', days: 20 },
]

/** 新项目的默认 DDL 硬节点（相对基准日的偏移天数） */
const NEW_PROJECT_MILESTONE_PLAN: { name: string; offsetDays: number }[] = [
  { name: '开题报告', offsetDays: 30 },
  { name: '中期检查', offsetDays: 90 },
  { name: '投稿截止', offsetDays: 150 },
  { name: '毕业答辩', offsetDays: 200 },
]

/** 由标题推导默认概述关键词（取第一个分隔符前的主干词） */
function defaultKeywordOf(title: string): string {
  const head = title.split(/[：:·、，,与和对]/)[0].trim()
  return (head || '新项目').slice(0, 8)
}

/** 生成新项目的默认日程：阶段自基准日依次排开，状态由日期派生 */
function buildNewProjectSchedule(projectId: string, projectTitle: string): ProjectSchedule {
  let cursor = SCHEDULE_TODAY
  const phases: SchedulePhase[] = NEW_PROJECT_PHASE_PLAN.map((p, i) => {
    const startDate = i === 0 ? cursor : addDays(cursor, 1)
    const endDate = addDays(startDate, p.days - 1)
    cursor = endDate
    return {
      phaseId: `${projectId}_ph${i + 1}`,
      name: p.name,
      startDate,
      endDate,
      progress: 0,
      status: resolvePhaseStatus({ startDate, endDate }, SCHEDULE_TODAY),
    }
  })
  const milestones: ScheduleMilestone[] = NEW_PROJECT_MILESTONE_PLAN.map((m, i) => {
    const date = addDays(SCHEDULE_TODAY, m.offsetDays)
    const daysLeft = daysLeftFrom(SCHEDULE_TODAY, date)
    return { nodeId: `${projectId}_ddl${i + 1}`, name: m.name, date, daysLeft, status: resolveMilestoneStatus(daysLeft) }
  })
  const { rangeStart, rangeEnd } = resolveRange(phases, milestones)
  return {
    projectId,
    projectTitle,
    rangeStart,
    rangeEnd,
    today: SCHEDULE_TODAY,
    phases,
    milestones,
    tip: '项目刚创建：先去「研究热点」确认方向，再在项目设置里校准 DDL 硬节点日期。',
  }
}

/** 生成新项目实体（阶段「选题中」、进度 0、数据级别 L1） */
export function buildNewProject(input: { title: string; discipline: string; route: Project['route'] }): Project {
  return {
    projectId: 'p_' + Date.now(),
    title: input.title,
    discipline: input.discipline,
    route: input.route,
    stage: 'topic',
    stageLabel: '选题中',
    progress: 0,
    currentPhaseName: '选题',
    currentPhaseRange: shortRange(SCHEDULE_TODAY, addDays(SCHEDULE_TODAY, 29)),
    lastEditedText: '刚刚创建',
    mainDdlName: '开题报告',
    mainDdlDaysLeft: 30,
    footnote: '尚未产生阶段产物',
    createdAt: SCHEDULE_TODAY,
    dataLevel: 'L1',
  }
}

/**
 * 把新项目登记进各 Mock 表（真实后端由服务端落库，这里模拟同样的效果）。
 * 覆盖：项目列表、项目日程、阶段产物（新项目为空）、合规设置、DDL 概述关键词。
 */
export function registerNewProject(project: Project) {
  PROJECTS.unshift(project)
  PROJECT_SCHEDULES[project.projectId] = buildNewProjectSchedule(project.projectId, project.title)
  PROJECT_ARTIFACTS[project.projectId] = {
    projectId: project.projectId,
    currentStage: project.stage,
    currentStageLabel: project.stageLabel,
    artifacts: [],
  }
  PROJECT_COMPLIANCE[project.projectId] = {
    projectId: project.projectId,
    dataLevel: project.dataLevel,
    skipConfirm: false,
  }
  DDL_KEYWORD_SETTINGS[project.projectId] = {
    projectId: project.projectId,
    selected: defaultKeywordOf(project.title),
    options: [
      { keyword: defaultKeywordOf(project.title), sourceText: '来自项目标题' },
      { keyword: '待补充', sourceText: '上传数据或分析热词后自动补齐候选' },
    ],
  }
}

/**
 * 从各 Mock 表移除项目（真实后端由服务端级联删除，这里模拟同样的效果）。
 * 与 registerNewProject 对称：项目列表、日程、阶段产物、合规、DDL 关键词一并清理。
 */
export function unregisterProject(projectId: string) {
  const idx = PROJECTS.findIndex((p) => p.projectId === projectId)
  if (idx >= 0) PROJECTS.splice(idx, 1)
  delete PROJECT_SCHEDULES[projectId]
  delete PROJECT_ARTIFACTS[projectId]
  delete PROJECT_COMPLIANCE[projectId]
  delete DDL_KEYWORD_SETTINGS[projectId]
}


/* ------------------------------------------------------------
 * 3. P2 论文引言 · 研究热点
 * ---------------------------------------------------------- */

export const HOTSPOT_MAIN_CHART: TrendSeries[] = [
  {
    name: '社交焦虑',
    color: '#2563EB',
    points: [
      { year: '2021', value: 42 },
      { year: '2022', value: 58 },
      { year: '2023', value: 76 },
      { year: '2024', value: 102 },
      { year: '2025', value: 121 },
    ],
  },
  {
    name: '手机依赖',
    color: '#16A34A',
    points: [
      { year: '2021', value: 36 },
      { year: '2022', value: 49 },
      { year: '2023', value: 68 },
      { year: '2024', value: 86 },
      { year: '2025', value: 96 },
    ],
  },
  {
    name: '孤独感',
    color: '#EA7317',
    points: [
      { year: '2021', value: 26 },
      { year: '2022', value: 33 },
      { year: '2023', value: 42 },
      { year: '2024', value: 52 },
      { year: '2025', value: 61 },
    ],
  },
]

export const HOTSPOT_DATA: HotspotPageData = {
  projectTitle: '社交焦虑与手机依赖的关系研究',
  researchDirection: '社交焦虑与手机依赖的关系',
  gapSourceCount: 3,
  gaps: [
    {
      gapId: 'g1',
      text: '现有研究多为横断面设计，难以确定社交焦虑与手机依赖的因果方向，未来需要纵向或经验取样设计加以检验。',
      sourceText: '来源 [1] Elhai et al., 2023 · 原文第 12 页',
    },
    {
      gapId: 'g2',
      text: '样本高度集中于大学生群体，缺少成年人与其他文化背景样本，结论的外部效度受限。',
      sourceText: '来源 [2] Prizant-Passal et al., 2022 · 讨论部分',
    },
    {
      gapId: 'g3',
      text: '中介机制研究多聚焦孤独感，对其他潜在机制（如情绪调节、注意偏向）的检验仍不充分。',
      sourceText: '来源 [3] 张等, 2024 · 展望部分',
    },
  ],
  feasibility: [
    {
      key: 'coverage',
      label: '文献覆盖度',
      score: 4.2,
      maxScore: 5,
      description: '方向内近五年文献 1,284 篇，核心变量已有成熟综述支撑。',
      basisText: '依据：已接入文献源检索结果（2021‒2025）',
    },
    {
      key: 'dataAvailability',
      label: '数据可得性',
      score: 3.5,
      maxScore: 5,
      description: '可直接申请使用 2 个公开数据集；若自行发放问卷，约需 350 份样本。',
      basisText: '依据：公共数据库导航 + 样本量估算',
    },
    {
      key: 'methodComplexity',
      label: '方法复杂度',
      score: 3.0,
      maxScore: 5,
      description: '有调节的中介涉及 Bootstrap 与多重共线性检验，需一定统计基础。',
      basisText: '依据：方法库复杂度评级',
    },
  ],
  citedReviews: [
    {
      reviewId: 'r1',
      title: 'Problematic smartphone use and anxiety: A systematic review',
      metaText: 'Elhai et al. · Journal of Affective Disorders · 2023',
      citedCount: 412,
      doiVerified: true,
    },
    {
      reviewId: 'r2',
      title: 'Social anxiety and digital communication: A meta-analytic review',
      metaText: 'Prizant-Passal et al. · Clinical Psychology Review · 2022',
      citedCount: 287,
      doiVerified: true,
    },
    {
      reviewId: 'r3',
      title: 'Fear of missing out 与心理健康：十年研究回顾',
      metaText: '张等 · 心理科学进展 · 2024',
      citedCount: 96,
      doiVerified: true,
    },
    {
      reviewId: 'r4',
      title: 'Adolescent smartphone use and sleep: A scoping review',
      metaText: 'Carter et al. · Sleep Medicine Reviews · 2021',
      citedCount: 351,
      doiVerified: true,
    },
  ],
  trendTitle: '近年社交焦虑的研究趋势',
  trendSeries: HOTSPOT_MAIN_CHART,
  trendNote: '基于已接入文献源 1,284 篇真实文献的词频与引用增长统计，非模型自由生成。',
  datasetTotal: 14,
  datasetCategories: ['计算机', '心理学', '医学·社科', '经济学', '人文艺术'],
  publicDatasets: [
    {
      datasetId: 'ds_osf',
      name: 'OSF 开放科学框架',
      level: 'L0',
      accessAction: 'directImport',
      accessActionText: '一键直连导入',
      accessCondition: '访问条件：开放注册即可访问 · 适用学科：心理学 / 教育学',
      citationRequirement: '引用要求：按项目页给定的 DOI 与许可协议引用（多为 CC-BY）',
      subjectTags: ['心理学', '教育学'],
    },
    {
      datasetId: 'ds_norm',
      name: '公开范式与常模库',
      level: 'L1',
      accessAction: 'applyBySelf',
      accessActionText: '需自行申请',
      accessCondition: '访问条件：需签署数据使用协议（DUA）· 适用学科：心理学',
      citationRequirement: '平台不拥有数据分发权，请前往官方渠道申请',
      subjectTags: ['心理学'],
    },
    {
      datasetId: 'ds_cfps_h',
      name: 'CFPS 中国家庭追踪调查',
      level: 'L1',
      accessAction: 'applyBySelf',
      accessActionText: '需自行申请',
      accessCondition: '访问条件：需注册并通过机构审核 · 适用学科：社会学 / 经济学',
      citationRequirement: '引用要求：须标注数据来源与调查年份',
      subjectTags: ['社会学', '经济学'],
    },
  ],
  questionnaireChecks: [
    { checkId: 'q1', text: '题项冗余检查：合并语义重复条目（已识别 3 处）', passed: true },
    { checkId: 'q2', text: '量表来源与授权：确认 SAS/SAS-SV 授权状态', passed: true },
    { checkId: 'q3', text: '反向题设置：建议 2 题并说明计分方式', passed: true },
    { checkId: 'q4', text: '注意力检测题：至少 1 题，用于识别敷衍作答', passed: true },
    { checkId: 'q5', text: '样本量估算：中介模型建议 ≥ 350 份（效应量 0.2）', passed: true },
  ],
  recognizedPaperCount: 1284,
  conclusion: '方向可行性中等偏上，可进入文献综述',
}

/* ------------------------------------------------------------
 * 4. P14 研究热点 · 理论驱动 · 领域研究热词
 * ---------------------------------------------------------- */

export const TOPIC_KEYWORDS: TopicKeywordData = {
  researchDirection: '社交焦虑与手机依赖',
  sources: ['Web of Science', 'Crossref'],
  rangeText: '2019‒2024',
  paperCount: 2847,
  keywords: [
    { keyword: '社交焦虑', freq: 1284, growth: 'stable' },
    { keyword: '手机依赖', freq: 967, growth: 'rising' },
    { keyword: '孤独感', freq: 812, growth: 'stable' },
    { keyword: '错失恐惧', freq: 604, growth: 'emerging' },
    { keyword: '情绪调节', freq: 528, growth: 'rising' },
    { keyword: '同伴支持', freq: 471, growth: 'stable' },
    { keyword: '睡眠质量', freq: 398, growth: 'stable' },
    { keyword: '自我控制', freq: 356, growth: 'rising' },
    { keyword: '社交媒体使用', freq: 312, growth: 'longTail' },
    { keyword: '学业倦怠', freq: 286, growth: 'longTail' },
    { keyword: '正念', freq: 254, growth: 'emerging' },
    { keyword: '依恋', freq: 231, growth: 'longTail' },
    { keyword: '上行社会比较', freq: 208, growth: 'rising' },
    { keyword: '排斥感', freq: 186, growth: 'longTail' },
    { keyword: '屏幕时间', freq: 172, growth: 'longTail' },
    { keyword: '父母教养', freq: 158, growth: 'longTail' },
    { keyword: '神经质', freq: 142, growth: 'longTail' },
    { keyword: '生活满意度', freq: 126, growth: 'longTail' },
    { keyword: '自我表露', freq: 112, growth: 'longTail' },
    { keyword: '积极情绪', freq: 98, growth: 'longTail' },
    { keyword: '压力知觉', freq: 86, growth: 'longTail' },
    { keyword: '社交回避', freq: 74, growth: 'longTail' },
    { keyword: '反刍思维', freq: 62, growth: 'longTail' },
    { keyword: '性别差异', freq: 54, growth: 'longTail' },
    { keyword: '体像焦虑', freq: 42, growth: 'longTail' },
    { keyword: '无聊倾向', freq: 34, growth: 'longTail' },
    { keyword: '时间管理', freq: 26, growth: 'longTail' },
  ],
  topKeywords: [
    { rank: 1, keyword: '社交焦虑', freq: 1284 },
    { rank: 2, keyword: '手机依赖', freq: 967 },
    { rank: 3, keyword: '孤独感', freq: 812 },
    { rank: 4, keyword: '错失恐惧', freq: 604 },
    { rank: 5, keyword: '情绪调节', freq: 528 },
    { rank: 6, keyword: '同伴支持', freq: 471 },
    { rank: 7, keyword: '睡眠质量', freq: 398 },
    { rank: 8, keyword: '自我控制', freq: 356 },
  ],
  trendYears: ['2019', '2020', '2021', '2022', '2023'],
  trendUnit: '发文量（篇）',
  trendSeries: [
    {
      name: '社交焦虑',
      color: '#2563EB',
      points: [
        { year: '2019', value: 168 },
        { year: '2020', value: 214 },
        { year: '2021', value: 286 },
        { year: '2022', value: 372 },
        { year: '2023', value: 468 },
      ],
    },
    {
      name: '手机依赖',
      color: '#16A34A',
      points: [
        { year: '2019', value: 126 },
        { year: '2020', value: 158 },
        { year: '2021', value: 214 },
        { year: '2022', value: 268 },
        { year: '2023', value: 344 },
      ],
    },
    {
      name: '孤独感',
      color: '#EA7317',
      points: [
        { year: '2019', value: 142 },
        { year: '2020', value: 149 },
        { year: '2021', value: 176 },
        { year: '2022', value: 212 },
        { year: '2023', value: 242 },
      ],
    },
  ],
  citedReviews: [
    {
      reviewId: 'kr1',
      title: '社交焦虑与问题性手机使用关系的十年回顾：从相关到机制',
      metaText: 'Computers in Human Behavior · 2022',
      citedCount: 1842,
      doiVerified: true,
    },
    {
      reviewId: 'kr2',
      title: '补偿性互联网使用理论的十年检验与批评性述评',
      metaText: 'Cyberpsychology, Behavior, and Social Networking · 2021',
      citedCount: 1206,
      doiVerified: true,
    },
    {
      reviewId: 'kr3',
      title: '青少年手机依赖的前因与后果：一项系统性综述与元分析框架',
      metaText: 'Journal of Behavioral Addictions · 2023',
      citedCount: 894,
      doiVerified: true,
    },
  ],
  lockedConcepts: ['社交焦虑', '手机依赖', '孤独感'],
}

/* ------------------------------------------------------------
 * 5. P15 选择理论与变量
 * ---------------------------------------------------------- */

export const TOPIC_THEORY: TopicTheoryData = {
  lockedConcepts: ['社交焦虑', '手机依赖', '孤独感'],
  selectedTheoryId: 'T1',
  theories: [
    {
      theoryId: 'T1',
      name: '补偿性互联网使用理论（CIUT）',
      stars: 4,
      explainPath: '现实社交受挫 → 以线上互动补偿 → 手机使用失控。',
      representativeRef: 'Kardefelt-Winther (2014), Computers in Human Behavior',
      citedCount: 2412,
      varChain: ['sas_total', 'mpai_total'],
    },
    {
      theoryId: 'T2',
      name: '社会替代假说 / 孤独感中介路径',
      stars: 4,
      explainPath: '社交焦虑 → 孤独感 → 手机依赖，强调线下关系需求未被满足。',
      representativeRef: 'Nowland et al. (2018), Perspectives on Psychological Science',
      citedCount: 1680,
      varChain: ['sas_total', 'loneliness', 'mpai_total'],
    },
    {
      theoryId: 'T3',
      name: 'I-PACE 交互作用模型',
      stars: 3,
      explainPath: '引入自我调节作为调节项，解释同样社交焦虑下为何只有部分人成瘾。',
      representativeRef: 'Brand et al. (2016), Neuroscience & Biobehavioral Reviews',
      citedCount: 3148,
      varChain: ['self_control', 'mpai_total'],
    },
  ],
  variableDrafts: [
    { varName: 'sas_total', definition: '社交焦虑总分', scaleName: 'SAS 交往焦虑量表', itemCount: 20, role: 'independent' },
    { varName: 'mpai_total', definition: '手机依赖总分', scaleName: 'MPAI 手机成瘾指数', itemCount: 17, role: 'dependent' },
    { varName: 'loneliness', definition: '孤独感总分', scaleName: 'UCLA 孤独量表简版', itemCount: 8, role: 'mediator' },
    { varName: 'er_score', definition: '情绪调节困难', scaleName: 'DERS-18 简版', itemCount: 18, role: 'moderator' },
  ],
}

/* ------------------------------------------------------------
 * 6. P16 上传数据
 * ---------------------------------------------------------- */

export const UPLOAD_DATA: DataUploadData = {
  supportedFormats: ['CSV', 'XLSX', 'SPSS .sav', 'Stata .dta'],
  maxFileSizeMb: 200,
  uploadedFiles: [
    {
      fileId: 'f1',
      fileName: 'social_anxiety_smartphone_2024.sav',
      metaText: 'SPSS 数据 · 4.2 MB · 512 行 × 36 列',
      rows: 512,
      columns: 36,
      sizeText: '4.2 MB',
      status: 'uploaded',
      statusText: '已上传 · 待体检',
    },
    {
      fileId: 'f2',
      fileName: 'screen_time_log_2023_2024.xlsx',
      metaText: 'Excel 数据 · 1.1 MB · 512 行 × 12 列',
      rows: 512,
      columns: 12,
      sizeText: '1.1 MB',
      status: 'uploaded',
      statusText: '已上传 · 待体检',
    },
  ],
  publicDatasets: [
    {
      datasetId: 'ds_osf2',
      name: 'OSF 开放科学框架',
      level: 'L0',
      accessAction: 'directImport',
      accessActionText: '一键导入',
      accessCondition: '样本量 12,480 · 变量 68 个 · 适用学科：心理学 / 教育学',
      citationRequirement: '开放注册即可访问；按项目页给定的 DOI 与许可协议引用（多为 CC-BY）。',
      subjectTags: ['心理学', '教育学'],
    },
    {
      datasetId: 'ds_cfps',
      name: 'CFPS 中国家庭追踪调查',
      level: 'L1',
      accessAction: 'applyBySelf',
      accessActionText: '需自行申请',
      accessCondition: '样本量 16,000 户 · 变量 1,200+ · 适用学科：社会学 / 经济学',
      citationRequirement: '需注册并通过机构审核；平台不拥有数据分发权，请前往官方渠道申请。',
      subjectTags: ['社会学', '经济学'],
    },
    {
      datasetId: 'ds_charls',
      name: 'CHARLS 中国健康与养老追踪调查',
      level: 'L1',
      accessAction: 'applyBySelf',
      accessActionText: '需自行申请',
      accessCondition: '样本量 17,708 · 变量 400+ · 适用学科：医学 / 老年学',
      citationRequirement: '需签署数据使用协议（DUA）后方可下载；引用须标注数据来源与调查年份。',
      subjectTags: ['医学', '老年学'],
    },
  ],
  sampleDatasets: [
    { sampleId: 's1', title: '社交媒体使用与主观幸福感（N=1,024）', metaText: '含 24 个变量 · 5 级李克特量表' },
    { sampleId: 's2', title: '大学生学业倦怠与睡眠质量（N=768）', metaText: '含 18 个变量 · 纵向 3 波追踪' },
  ],
  readyFileCount: 2,
  readyVariableCount: 48,
  detectedDataLevel: 'L1',
  sensitiveDetected: false,
}

export const DATA_LEVEL_CARDS = [
  {
    level: 'L1' as const,
    name: 'L1 个人数据',
    description: '用户自有问卷 / 实验数据（已脱敏）。仅项目成员可见，默认不进入任何训练集。',
    rules: ['仅项目成员可见', '默认不进入任何训练集'],
  },
  {
    level: 'L2' as const,
    name: 'L2 敏感数据',
    description:
      '含个人隐私或未公开课题数据。将强制脱敏、禁止导出原文、加密存储，并关闭「跳过逐条确认」。',
    rules: ['强制脱敏', '禁止导出原文', '存储加密', '强制禁用跳过逐条确认'],
  },
]

export const DATA_SAFETY_NOTES = [
  { icon: 'check', text: '文件在项目内隔离解析，原始数据不会发送给第三方 AI 模型。' },
  { icon: 'lock', text: 'L1 / L2 数据默认不进入任何训练集，仅项目成员可见。' },
  { icon: 'lock', text: 'L2 敏感数据加密存储，访问与下载全程留痕可审计。' },
  { icon: 'trash', text: '删除项目后 30 天内从存储中彻底清除，无残留明文。' },
]

export const DATA_SECURITY_TAGS = ['TLS 1.3', 'AES-256']

export const SENSITIVE_DETECT_TEXT =
  '检测到敏感信息（身份证号、联系方式、病史）时会先强制脱敏，确认后才能继续。'

/* ------------------------------------------------------------
 * 7. P17 变量识别
 * ---------------------------------------------------------- */

export const VARIABLE_IDENTIFY: VariableIdentifyData = {
  health: {
    validSampleSize: 512,
    variableCount: 48,
    completeVariableCount: 41,
    missingVariableCount: 7,
    outlierCount: 3,
    duplicateAnswerCount: 0,
    sourceFile: 'social_anxiety_smartphone_2024.sav',
  },
  healthAccuracy: 96,
  healthReportedAt: '2026-09-20 22:14',
  variables: [
    { varName: 'sas_total', typeLabel: '连续变量', valueRange: '20 ‒ 80', missingRate: 0, suggestedRole: 'dependent' },
    { varName: 'mpai_total', typeLabel: '连续变量', valueRange: '12 ‒ 60', missingRate: 0, suggestedRole: 'dependent' },
    { varName: 'gender', typeLabel: '无序分类', valueRange: '1 ‒ 2', missingRate: 0, suggestedRole: 'control' },
    { varName: 'grade', typeLabel: '有序分类', valueRange: '1 ‒ 4', missingRate: 1.2, suggestedRole: 'control' },
    { varName: 'loneliness', typeLabel: '连续变量', valueRange: '8 ‒ 32', missingRate: 2.3, suggestedRole: 'mediator' },
    { varName: 'er_score', typeLabel: '连续变量', valueRange: '10 ‒ 50', missingRate: 0.6, suggestedRole: 'mediator' },
    { varName: 'peer_support', typeLabel: '连续变量', valueRange: '12 ‒ 48', missingRate: 4.1, suggestedRole: 'moderator' },
    { varName: 'sleep_quality', typeLabel: '连续变量', valueRange: '5 ‒ 25', missingRate: 3.5, suggestedRole: 'resultCandidate' },
  ],
  typeDistribution: [
    { label: '连续', count: 18, color: '#12B76A' },
    { label: '无序', count: 12, color: '#2E90FA' },
    { label: '有序', count: 9, color: '#F79009' },
    { label: '计数', count: 6, color: '#7C3AED' },
    { label: '文本', count: 3, color: '#E31B54' },
  ],
  qualityIssues: [
    { issueId: 'qi1', level: 'warn', text: '反向题 Q7 / Q15 已识别，已自动反向计分；计分方式已写入清洗代码。', needsConfirm: true },
    {
      issueId: 'qi2',
      level: 'warn',
      text: '注意力检测题 Q22 异常作答 14 人（2.7%），建议做敏感性分析；系统不自动删除数据。',
      needsConfirm: true,
    },
    {
      issueId: 'qi3',
      level: 'warn',
      text: 'peer_support 缺失率 4.1%，高于其它变量，建议在结果中报告缺失处理方式。',
      needsConfirm: true,
    },
    {
      issueId: 'qi4',
      level: 'info',
      text: '变量「专业」是自由填写的文本，已识别为文本变量，不参与回归模型。',
      needsConfirm: false,
    },
  ],
  recognizedCount: 48,
  usableCount: 45,
}

/* ------------------------------------------------------------
 * 8. P18 生成研究假设
 * ---------------------------------------------------------- */

export const HYPOTHESIS_DATA: HypothesisPageData = {
  sourceFile: 'social_anxiety_smartphone_2024.sav',
  variableCount: 48,
  chatSuggestions: ['社交焦虑 → 手机依赖', '孤独感的中介作用', '同伴支持的调节作用'],
  citedVariables: [
    { varName: 'sas_total', roleLabel: '自变量' },
    { varName: 'mpai_total', roleLabel: '因变量' },
    { varName: 'loneliness', roleLabel: '中介变量' },
    { varName: 'peer_support', roleLabel: '调节变量' },
    { varName: 'gender', roleLabel: '控制变量' },
  ],
  hypotheses: [
    {
      hypothesisId: 'h1',
      code: 'H1',
      title: '社交焦虑显著正向预测手机依赖。',
      varChain: ['sas_total', 'mpai_total'],
      testMethod: '分层回归（控制 gender、grade），需先检验共线性与正态性。',
      basis: '两变量均为连续变量、缺失率 0.0%，同领域既有研究支持该路径（引用 P3 文献库）。',
      status: 'pending',
    },
    {
      hypothesisId: 'h2',
      code: 'H2',
      title: '孤独感在社交焦虑与手机依赖之间起中介作用。',
      varChain: ['sas_total', 'loneliness', 'mpai_total'],
      testMethod: 'Bootstrap 中介检验，5000 次重抽样，报告间接效应与置信区间。',
      basis: '三个变量均已完成体检，样本量 512 满足中介检验的基本要求。',
      status: 'pending',
    },
    {
      hypothesisId: 'h3',
      code: 'H3',
      title: '同伴支持调节社交焦虑对手机依赖的影响。',
      varChain: ['sas_total', 'peer_support', 'mpai_total'],
      testMethod: '调节效应检验，变量中心化后纳入交互项。',
      basis: 'peer_support 缺失率 4.1%，高于其它变量，需先确认缺失处理方式。',
      status: 'pending',
    },
  ],
}

export const ETHICS_NOTES = [
  'AI 不生成研究结论，不代拟数据、结果与统计值。',
  '假设必须可检验，且只能基于你数据中变量的真实取值范围。',
  '全部 AI 生成内容带不可移除的溯源标识，可回溯到变量与文献来源。',
  '确认与改写记录计入《AI 工具使用情况说明》，投稿时可一键导出。',
]

/* ------------------------------------------------------------
 * 9. P3 文献综述
 * ---------------------------------------------------------- */

export const LITERATURE_DATA: LiteraturePageData = {
  projectTitle: '社交焦虑与手机依赖的关系研究',
  resultTotal: 128,
  sortBy: '相关度',
  filters: {
    quartile: ['Q1 及以上', 'Q2 及以上', '不限'],
    discipline: ['心理学', '社会学', '教育学', '医学'],
    year: ['近 5 年', '近 10 年', '不限'],
  },
  activeFilter: { query: '', quartile: 'Q1 及以上', discipline: '心理学', year: '近 5 年' },
  languageWarning:
    '中文文献库尚未接入，本结果以英文文献为主（中文占比 6%）。该提示将保留在导出物中。',
  papers: [
    {
      paperId: 'pp1',
      title: 'The association between social anxiety and smartphone addiction: A three-level meta-analysis',
      authors: 'Liu et al.',
      journal: 'Computers in Human Behavior',
      year: 2024,
      quartile: 'Q1',
      doi: '10.1016/j.chb.2024.108043',
      doiStatus: 'verified',
      doiStatusText: 'DOI 已验证',
      citedCount: 86,
      abstractText:
        '本研究对 62 项实证研究进行三层元分析，发现社交焦虑与智能手机成瘾呈中等强度正相关（r = 0.34），且该关联在青少年样本中更强。',
      matchReason: '匹配理由：直接检验社交焦虑→手机依赖主效应，与你提出的中介路径起点一致（相关度 0.92）',
      relevanceScore: 0.92,
      citable: true,
    },
    {
      paperId: 'pp2',
      title: 'Loneliness mediates the relation between social anxiety and mobile phone dependence',
      authors: 'Zhang & Wang',
      journal: 'Journal of Adolescence',
      year: 2023,
      quartile: 'Q2',
      doi: '10.1016/j.adolescence.2023.05.007',
      doiStatus: 'verified',
      doiStatusText: 'DOI 已验证',
      citedCount: 64,
      abstractText:
        '以 1,206 名大学生为样本，检验孤独感的中介作用，结果显示间接效应占总效应的 41%，且性别起调节作用。',
      matchReason: '匹配理由：同时覆盖孤独感中介与性别调节，直接支撑你的有调节的中介假设（相关度 0.89）',
      relevanceScore: 0.89,
      citable: true,
    },
    {
      paperId: 'pp3',
      title: '大学生社交焦虑与手机成瘾：一项经验取样研究',
      authors: '陈等',
      journal: '心理学报',
      year: 2022,
      quartile: 'CSSCI',
      doi: '10.3724/SP.J.1041.2022.00987',
      doiStatus: 'verified',
      doiStatusText: 'DOI 已验证',
      citedCount: 52,
      abstractText:
        '采用 14 天经验取样法，发现日间社交焦虑可正向预测当晚手机使用时长，个体内效应显著（β = 0.18）。',
      matchReason: '匹配理由：中文语境 + 纵向设计，可弥补英文样本的生态效度不足（相关度 0.84）',
      relevanceScore: 0.84,
      citable: true,
    },
    {
      paperId: 'pp4',
      title: 'Preprint: Social anxiety and problematic smartphone use among undergraduates',
      authors: 'Research Square 预印本',
      journal: 'Research Square 预印本',
      year: 2024,
      quartile: '未经同行评审',
      doiStatus: 'unverified',
      doiStatusText: '未验证',
      abstractText: '预印本报告了社交焦虑与问题性手机使用的横断关联，但未提供 DOI 且无法在 Crossref 中核对元数据。',
      matchReason: '未验证条目禁止进入参考文献区，仅可作全文检索',
      relevanceScore: 0.71,
      citable: false,
    },
  ],
  selectedPaperIds: ['pp1', 'pp2', 'pp3'],
  selectedCount: 12,
  minRequired: 5,
  selectionNote: '选题方向内 12 篇，含 1 篇未验证条目（不计入综述引用）',
  verify: {
    status: 'running',
    statusText: '执行中',
    agentAlpha: {
      label: 'Agent-α 内容一致性',
      accuracy: 96,
      description: '核验引用原文是否真正支撑该论断（语义蕴含校验）',
    },
    agentBeta: {
      label: 'Agent-β DOI 真实性',
      accuracy: 99,
      description: '校验 DOI 存在性与元数据一致性（Crossref）',
    },
    passedCount: 26,
    suspiciousCount: 2,
    failedCount: 1,
    blockExport: true,
    note: '1 条核验失败，将阻断导出；2 条存疑已转入导出中心待你判断。',
  },
  kbDocCount: 34,
  kbQa: {
    question: '孤独感在社交焦虑与手机依赖间的中介效应有多稳定？',
    answer:
      '库内 5 项研究报告了孤独感的中介效应，间接效应占比 31%‒48%，其中 3 项为纵向设计，结论方向一致但效应量中等。',
    citations: ['[2]', '[7]', '[12]'],
    note: '答案全部来自库内文献',
  },
  verifiedClaimCount: 26,
}

/* ------------------------------------------------------------
 * 10. P4 数据分析
 * ---------------------------------------------------------- */

export const ANALYSIS_DATA: AnalysisPageData = {
  projectTitle: '社交焦虑与手机依赖的关系研究',
  steps: [
    { key: 'import', label: '数据导入', status: 'done' },
    { key: 'healthCheck', label: '数据体检', status: 'done' },
    { key: 'method', label: '方法选择', status: 'current' },
    { key: 'result', label: '分析结果', status: 'upcoming' },
  ],
  dataVersion: { version: 'v2', rows: 350, columns: 42, dataLevel: 'L1' },
  methods: [
    {
      methodId: 'm_hier_boot',
      name: '分层回归 + Bootstrap 中介',
      recommended: true,
      summary: '逐步纳入自变量、中介变量与调节变量，用 Bootstrap 估计间接效应置信区间。',
      prerequisites: '连续变量；N ≥ 200；残差近似正态；无严重多重共线性',
      pros: '步骤透明、审稿人熟悉；可直接报告间接效应区间',
      cons: '未校正测量误差，潜变量效度依赖量表质量',
      robustnessImpact: '中等敏感：样本量不足时区间偏宽',
      checklist: 'VIF < 5 · 正态性（偏度/峭度）· 异常值影响（Cook 距离）',
      licenseNote: 'statsmodels（BSD-3）· pingouin（MIT）',
      code: {
        python:
          '# 分层回归 + Bootstrap 中介（可复现）\nimport pandas as pd, pingouin as pg\ndf = pd.read_csv("data.csv")\n# 分层回归：控制变量 → 自变量 → 中介 / 调节\npg.linear_regression(df[["x", "m", "w"]], df["y"])\n# Bootstrap 间接效应（5000 次重抽样，seed=42）\npg.mediation_analysis(data=df, x="x", m="m", y="y", n_boot=5000, seed=42)',
        r: '# 分层回归 + Bootstrap 中介（可复现）\nlibrary(haven); library(mediation)\ndf <- read_sav("data.sav")\nm1 <- lm(y ~ x, data = df)\nm2 <- lm(y ~ x + m + w, data = df)\nanova(m1, m2)\nres <- mediate(m1, m2, treat = "x", mediator = "m", boot = TRUE, sims = 5000)\nsummary(res)',
      },
    },
    {
      methodId: 'm_sem',
      name: '结构方程模型 SEM',
      recommended: false,
      summary: '同时估计测量模型与结构路径，可处理潜变量与测量误差。',
      prerequisites: '每个潜变量 ≥ 3 题项；N ≥ 300；多元正态',
      pros: '模型拟合指标完整，适合高阶中介模型',
      cons: 'N 偏小时拟合不稳定；解释成本高',
      robustnessImpact: '高：拟合不佳时结论可能不成立',
      checklist: 'CFA 因子载荷 · 区分效度（AVE）· 拟合（CFI/RMSEA/SRMR）',
      licenseNote: 'semopy（MIT）',
      code: {
        python:
          '# 结构方程模型（semopy）\nimport pandas as pd, semopy\ndf = pd.read_csv("data.csv")\nmodel = """\nm ~ x\ny ~ x + m\n"""\nfit = semopy.Model(model).fit(df)\nprint(semopy.calc_stats(fit).T)  # CFI / RMSEA / SRMR',
        r: '# 结构方程模型（lavaan）\nlibrary(haven); library(lavaan)\ndf <- read_sav("data.sav")\nfit <- sem("m ~ x\\n     y ~ x + m", data = df)\nsummary(fit, fit.measures = TRUE, standardized = TRUE)',
      },
    },
    {
      methodId: 'm_process7',
      name: 'PROCESS Model 7',
      recommended: false,
      summary: '内置有调节的中介模板，一键输出条件间接效应与 Johnson-Neyman 区间。',
      prerequisites: '观测变量；调节变量建议中心化；N ≥ 200',
      pros: '模板化、可复现性高；输出直接对应假设',
      cons: '不处理测量误差；结果依赖模型编号选择是否正确',
      robustnessImpact: '中等：对调节变量取值敏感',
      checklist: '交互项显著性 · 简单斜率 · 条件间接效应区间',
      licenseNote: 'statsmodels（BSD-3）· semopy（MIT）',
      code: {
        python:
          '# PROCESS Model 7：第一阶段被调节的中介（可复现）\nimport pandas as pd, statsmodels.api as sm\ndf = pd.read_csv("data.csv")\ndf["xw"] = df["x"] * df["w"]                       # 调节作用落在 X → M 路径\nm_fit = sm.OLS(df["m"], sm.add_constant(df[["x", "w", "xw"]])).fit()  # a 路径随 w 变化\ny_fit = sm.OLS(df["y"], sm.add_constant(df[["m", "x"]])).fit()        # b 路径\nprint(m_fit.params["xw"], m_fit.conf_int().loc["xw"])  # 条件间接效应 = (a1+a3·W)·b',
        r: '# PROCESS Model 7：第一阶段被调节的中介\nlibrary(haven); library(lavaan)\ndf <- read_sav("data.sav")\nfit <- sem("\n  m ~ a1*x + a2*w + a3*x.w\n  y ~ b*m + c*x\n  index := a3*b\n", data = df, se = "bootstrap", bootstrap = 5000)\nsummary(fit, standardized = TRUE)',
      },
    },
  ],
  selectionTrail: {
    operatorName: '陈同学',
    operatedAt: '2026-09-21 09:02',
    candidateCount: 3,
    unselectedCount: 2,
    dataVersion: 'v2',
  },
  healthReport: {
    accuracy: 96,
    reportedAt: '2026-09-20 22:14',
    metrics: [
      { key: 'sampleSize', label: '样本量', value: '350', tone: 'default' },
      { key: 'variableCount', label: '变量数', value: '42', tone: 'default' },
      { key: 'missingRate', label: '缺失率', value: '1.8%', tone: 'default' },
      { key: 'outlierCount', label: '异常值提示', value: '7', tone: 'warn' },
    ],
  },
  healthNotes: [
    { tone: 'danger', text: '变量 social_support 完全缺失（350/350 缺失），已标红并禁止进入方法选择' },
    {
      tone: 'warn',
      text: '测谎题得分分布偏高（12 份高于阈值）且识别到 2 条重复作答，建议剔除或做敏感性分析，平台不会自动删除数据。',
    },
    { tone: 'info', text: '变量含义待确认（3 条）：「q3_rev」不确定是否为反向计分题；「scale_ver」缺少量表版本说明；「duration」单位可能是秒或分钟。' },
  ],
  importFormats: ['CSV', 'XLSX', 'SPSS .sav', 'Stata .dta'],
  importedFile: { fileName: 'questionnaire.xlsx', metaText: '350 行 × 42 列', passed: true },
  sensitiveWarning:
    '检测到 3 项可能的敏感信息（联系方式、学号、出生日期），已强制脱敏；L2 项目将禁止导出原始数据行。',
  code: [
    {
      language: 'python',
      fileName: 'questionnaire_n350.xlsx (v2)',
      licenseNote: 'statsmodels（BSD-3）· pingouin（MIT）· 代码包随结果一同导出',
      code: `# data: questionnaire_n350.xlsx (v2)
import pingouin as pg
df = pg.read_xlsx("questionnaire_n350.xlsx")
df = df.dropna(subset=["anx_total","phone_total"])
med = pg.mediation_analysis(data=df, x="anx_total",
m="lonely_total", y="phone_total", n_boot=5000, seed=42)
print(med.round(3))  # 间接效应与 95% CI`,
    },
  ],
  robustness: [
    { checkId: 'rb1', name: 'SEM 对比分层回归', statusText: '结论未翻转', flipped: false },
    { checkId: 'rb2', name: 'PROCESS Model 7 对比', statusText: '结论未翻转', flipped: false },
    { checkId: 'rb3', name: '剔除测谎题异常样本（n=14）', statusText: '待执行', pending: true },
  ],
  robustnessNote: '默认对清单中的备选方法并行执行对比；若出现结论翻转，将阻断“结论确定”表述。',
  missingBars: [
    { varName: 'q3_rev', missingRate: 7.4 },
    { varName: 'duration', missingRate: 5.1 },
    { varName: 'sleep_1', missingRate: 4.6 },
    { varName: 'phone_3', missingRate: 3.2 },
    { varName: 'anx_12', missingRate: 2.1 },
    { varName: 'lonely_4', missingRate: 1.4 },
  ],
  run: null,
}

export const ANALYSIS_RESULT_SAMPLE: NonNullable<AnalysisPageData['run']> = {
  runId: 'a7f3-20260921-0912',
  methodId: 'm_hier_boot',
  methodName: '分层回归 + Bootstrap 中介',
  finishedAt: '2026-09-21 09:12',
  sampleSize: 350,
  effects: [
    { label: '社交焦虑 → 手机依赖（总效应 c）', value: '0.412', ci: '95% CI [0.301, 0.523]' },
    { label: '社交焦虑 → 孤独感（a）', value: '0.358', ci: '95% CI [0.247, 0.469]' },
    { label: '孤独感 → 手机依赖（b）', value: '0.487', ci: '95% CI [0.372, 0.602]' },
    { label: '间接效应 a×b', value: '0.174', ci: '95% CI [0.108, 0.248]' },
    { label: '直接效应 c′', value: '0.238', ci: '95% CI [0.126, 0.350]' },
    { label: '调节效应（性别）', value: '0.086', ci: '95% CI [-0.031, 0.203]' },
  ],
  robustness: [
    { checkId: 'rb1', name: 'SEM 对比分层回归', statusText: '结论未翻转', flipped: false },
    { checkId: 'rb2', name: 'PROCESS Model 7 对比', statusText: '结论未翻转', flipped: false },
    { checkId: 'rb3', name: '剔除测谎题异常样本（n=14）', statusText: '结论未翻转', flipped: false },
  ],
}

/** 分析类型选择弹窗选项 */
export const ANALYSIS_TYPE_OPTIONS = [
  { key: 'dataDriven' as const, title: '数据驱动', description: '已有数据，没有思路' },
  { key: 'theoryDriven' as const, title: '理论驱动', description: '已有分析思路 / 正在思考' },
]

/* ------------------------------------------------------------
 * 11. P5 / P11 论文写作
 * ---------------------------------------------------------- */

/**
 * 写作页基础数据。
 * 编辑器正文 / 引用 / 改写动作三项在下方单独声明，由接口层在
 * `GET /projects/:projectId/writing` 的返回值里拼装成完整 WritingPageData
 * （三者声明位置在 WRITING_DATA 之后，直接内联会触发 const 暂时性死区）。
 */
export const WRITING_DATA: Omit<
  WritingPageData,
  'editorBody' | 'editorCitations' | 'rewriteActions' | 'authorLine' | 'submissionChecklist'
> = {
  projectTitle: '社交焦虑与手机依赖的关系研究',
  title: '社交焦虑与手机依赖：孤独感的中介作用与性别的调节效应',
  mode: 'aiFull',
  outline: [
    {
      nodeId: 'o1',
      title: '1 引言',
      level: 1,
      citeCount: 12,
      children: [
        { nodeId: 'o1-1', title: '1.1 研究背景', level: 2, citeCount: 8 },
        { nodeId: 'o1-2', title: '1.2 研究空白', level: 2, flag: 'missingCitation' },
      ],
    },
    {
      nodeId: 'o2',
      title: '2 文献综述',
      level: 1,
      citeCount: 14,
      children: [{ nodeId: 'o2-1', title: '2.1 孤独感中介研究', level: 2, citeCount: 6 }],
    },
    { nodeId: 'o3', title: '3 研究方法', level: 1, flag: 'boundArtifact' },
    { nodeId: 'o4', title: '4 结果', level: 1, flag: 'boundArtifact' },
    { nodeId: 'o5', title: '5 讨论与结论', level: 1, citeCount: 5 },
  ],
  currentSection: '2.1 孤独感中介研究',
  autoSavedAt: '09:12',
  stats: {
    // 数值对齐 P05「论文写作 · AI 全文生成」设计稿：字数 2,148 · 参考文献 47 条
    wordCount: 2148,
    paragraphCount: 18,
    citationCount: 47,
    unsavedChanges: 0,
    lastEditedAt: '09:12',
    aiLabelEnabled: true,
  },
  paragraphs: [
    {
      paraId: 'd1',
      index: 1,
      section: '1 引言',
      kind: 'normal',
      aiGenerated: true,
      traceLabel: 'AI',
      text: '近年来，社交媒体与智能手机的普及使大学生群体成为手机依赖的高风险人群。现有研究普遍发现，社交焦虑与问题性手机使用呈稳定正相关（Liu et al., 2024 [1]）……',
    },
    {
      paraId: 'd2',
      index: 2,
      section: '2 文献综述',
      kind: 'normal',
      aiGenerated: true,
      traceLabel: 'AI',
      text: '孤独感被视为连接两者的重要心理机制。Zhao 等（2023）以 1,206 名大学生为样本发现，孤独感在社交焦虑与手机依赖之间起部分中介作用，间接效应占总效应的 41% [2]……',
    },
    {
      paraId: 'd3',
      index: 3,
      section: '3 研究方法',
      kind: 'boundMethod',
      aiGenerated: false,
      text: '采用分层回归与 Bootstrap 中介检验（5,000 次重抽样，seed=42），分析结果来自「数据分析」页的运行记录（编号 a7f3-20260921-0912）……',
    },
  ],
  citations: [
    {
      index: 1,
      paperId: 'pp1',
      apaText:
        'Liu, Y., et al. (2024). The association between social anxiety and smartphone addiction. Computers in Human Behavior, 152, 108043. https://doi.org/10.1016/j.chb.2024.108043',
      gbText:
        'LIU Y, ZHANG H, WANG J. The association between social anxiety and smartphone addiction[J]. Computers in Human Behavior, 2024, 152: 108043.',
    },
    {
      index: 2,
      paperId: 'pp2',
      apaText:
        'Zhao, X., & Wang, L. (2023). Loneliness mediates the relation between social anxiety and mobile phone dependence. Journal of Adolescence, 95(4), 802-815.',
      gbText:
        'ZHAO X, WANG L. Loneliness mediates the relation between social anxiety and mobile phone dependence[J]. Journal of Adolescence, 2023, 95(4): 802-815.',
    },
  ],
  citationStyle: 'APA7',
  inTextStyle: '上标数字',
  targetJournal: { name: '心理科学进展', style: 'GB/T 7714-2015' },
  aiPolicyReminder: {
    journal: '《心理科学进展》',
    text: '要求披露 AI 使用范围，禁止 AIGC 直出结论',
    syncedAt: '2026-09-19',
  },
  zotero: {
    bound: true,
    account: 'chen@example.edu',
    bidirectionalSync: true,
    rateLimitText: '每次最多写入 50 条文献；写入失败会自动重试，需要重新授权时会提示你',
    fallbackText: '无需授权也能用：导入 / 导出 .bib 文件（Better BibTeX）',
  },
  kbDocs: [
    { paperId: 'k1', title: '社交焦虑与问题性手机使用关系的十年回顾', metaText: 'Kardefelt-Winther · 2022' },
    { paperId: 'k2', title: '补偿性互联网使用理论的十年检验与批评性述评', metaText: 'Nowland et al. · 2021' },
    { paperId: 'k3', title: '孤独感在青少年社交焦虑与手机成瘾之间的中介作用', metaText: 'Brand et al. · 2023' },
    { paperId: 'k4', title: '青少年手机依赖的前因与后果：系统性综述', metaText: 'Elhai et al. · 2023' },
  ],
  kbDocCount: 42,
  aiSuggestions: [
    { suggestionId: 's1', text: '本段缺少过渡句，建议补充一句连接上文的机制说明（仅改表达）。', adopted: false },
    { suggestionId: 's2', text: '“手机依赖”与“问题性手机使用”混用，建议统一术语。', adopted: false },
    { suggestionId: 's3', text: '文献综述第一段还没有引用，可从知识库插入 [1]，或改为推测性表述。', adopted: false },
  ],
  editor: {
    journalFormat: '《心理学报》· GB/T 7714-2015',
    journalFormatOptions: ['《心理学报》· GB/T 7714-2015', '《心理科学进展》· APA 7', 'Computers in Human Behavior · APA 7'],
    citationStyleLabel: 'GB/T 7714-2015',
    inTextLabel: '上标数字',
    fontName: '思源宋体',
    fontSizeLabel: '小四',
    lineHeightLabel: '1.5 倍行距',
    pageCount: 3,
    zoom: 100,
  },
}

/**
 * P11 编辑器正文块（经 `GET /writing` 的 editorBody 字段下发）。
 *
 * 与后端 `payloads.ts::buildEditorBody` 同一套规则，也与写作页「查看全文」逐段对齐：
 * 段落顺序不变、`section` 变化处插小标题、段落带 AI 溯源标识时补一行。
 * 这样「手动编辑」页看到的内容 == 「AI 全文生成 · 查看全文」里的内容。
 */
export const WRITING_EDITOR_BODY: EditorBlock[] = (() => {
  const blocks: EditorBlock[] = []
  let citeSeq = 0
  WRITING_DATA.paragraphs.forEach((p, i) => {
    if (p.section && p.section !== WRITING_DATA.paragraphs[i - 1]?.section) {
      blocks.push({ paraId: `h_${i}`, kind: 'heading', text: p.section })
    }
    citeSeq += 1
    blocks.push({ paraId: p.paraId, kind: 'body', text: p.text, citeIndex: citeSeq })
    if (p.aiGenerated) {
      blocks.push({ paraId: `${p.paraId}_label`, kind: 'aiLabel', text: 'AI 生成 · 可溯源' })
    }
  })
  return blocks
})()

/** P11 编辑器可插入的知识库文献（经 `GET /writing` 的 editorCitations 字段下发） */
export const WRITING_EDITOR_CITATIONS: EditorCitation[] = [
  {
    index: 1,
    journal: 'Computers in Human Behavior',
    year: '2022',
    title: '社交焦虑与问题性手机使用关系的十年回顾：从相关到机制',
  },
  {
    index: 2,
    journal: 'Cyberpsychology, Behavior, and Social Networking',
    year: '2021',
    title: '补偿性互联网使用理论的十年检验与批评性述评',
  },
  {
    index: 3,
    journal: 'Journal of Behavioral Addictions',
    year: '2023',
    title: '孤独感在青少年社交焦虑与手机成瘾之间的中介作用',
  },
]

/** 段落改写动作（经 `GET /writing` 的 rewriteActions 下发） */
export const WRITING_REWRITE_ACTIONS = ['重写', '缩写', '扩写', '学术化改写']

/** 正文作者行（经 `GET /writing` 的 authorLine 下发；服务端按第一作者 + 学科生成） */
export const WRITING_AUTHOR_LINE = '陈某某 · 心理学系'

/**
 * 投稿前检查清单（经 `GET /writing` 的 submissionChecklist 下发）。
 * 与 P06 选刊页的 `JOURNAL_DATA.submissionChecks` 同源，避免两处口径不一致。
 */
export const WRITING_SUBMISSION_CHECKLIST: WritingPageData['submissionChecklist'] = {
  total: 6,
  done: 5,
  items: [
    { checkId: 'sc1', text: '正文与参考文献格式已按目标期刊模板套用', passed: true },
    { checkId: 'sc2', text: '全部引用均来自已核验文献池', passed: true },
    { checkId: 'sc3', text: '图表编号与正文引用一致', passed: true },
    { checkId: 'sc4', text: '分析结果与可复现代码包已导出', passed: true },
    { checkId: 'sc5', text: '已生成《AI 使用情况说明》', passed: true },
    { checkId: 'sc6', text: '伦理声明与数据可得性声明已补齐', passed: false, pendingText: '伦理声明待补' },
  ],
}

/* ------------------------------------------------------------
 * 12. P6 选刊 AI
 * ---------------------------------------------------------- */

export const JOURNAL_DATA: JournalPageData = {
  title: '社交焦虑与手机依赖：孤独感的中介作用与性别的调节效应',
  abstractText:
    '基于 350 名大学生的问卷调查，采用分层回归与 Bootstrap 中介检验，考察孤独感的中介作用与性别的调节效应，并报告了效应量、稳健性检验与可复现代码。',
  keywords: ['社交焦虑', '手机依赖', '孤独感', '中介效应', '分层回归 + Bootstrap'],
  matches: [
    {
      journalId: 'j1',
      name: 'Computers in Human Behavior',
      indexText: 'JCR Q1 · 中科院 1 区 · IF 8.9 · Elsevier',
      matchScore: 94,
      matchReason: '近三年刊发 12 篇手机依赖与心理健康研究，scope 明确覆盖社交焦虑—行为成瘾路径，接受中介与调节模型',
    },
    {
      journalId: 'j2',
      name: 'Journal of Adolescence',
      indexText: 'JCR Q2 · 中科院 2 区 · IF 3.1 · Wiley',
      matchScore: 87,
      matchReason: '聚焦青少年群体与孤独感、同伴关系议题，接受横断与纵向混合方法',
    },
    {
      journalId: 'j3',
      name: '心理科学进展',
      indexText: 'CSSCI · 中文核心 · 中科院 2 区',
      matchScore: 81,
      matchReason: '国内心理学综述与实证主要阵地，需按 GB/T 7714 引用；对 AI 使用披露要求严格',
    },
    {
      journalId: 'j4',
      name: 'Frontiers in Psychology',
      indexText: 'JCR Q2 · 中科院 3 区 · IF 2.9 · Frontiers',
      matchScore: 76,
      matchReason: '审稿周期较短、开放获取；版面费较高，需确认经费',
    },
    {
      journalId: 'j5',
      name: 'Cyberpsychology, Behavior, and Social Networking',
      indexText: 'JCR Q1 · 中科院 2 区 · IF 4.6 · Mary Ann Liebert',
      matchScore: 72,
      matchReason: '偏重网络行为干预与临床意义，要求更明确的实践启示',
    },
  ],
  profile: {
    journalId: 'j1',
    name: 'Computers in Human Behavior',
    sourceText: '数据来源：JCR 2025 / Elsevier 官网 · 更新时间 2026-08-20',
    partition: 'JCR Q1 · 中科院 1 区 · IF 8.9',
    reviewCycle: '8-12 周',
    reviewCycleSource: '来源：Elsevier 官网作者面板 · 样本量 n=124',
    acceptanceRate: '18%',
    acceptanceSource: '来源：第三方统计（n≈2,100，2024）· 仅供参考',
    apc: 'USD 3,500（订阅模式可选免收）',
    databases: 'SSCI · Scopus · EI',
    formatRequirement: '≤ 12,000 词 · APA 7',
    aiPolicy: {
      level: '允许有限使用',
      allows: '允许 AI 辅助写作，但需在方法中披露工具与版本',
      forbids: '禁止 AIGC 直接生成结论与数据解释',
      requires: '按官网要求提交 AI 使用声明（与本平台披露报告可直接对应）',
      sourceText: '政策来源：期刊作者指南 · 更新时间 2026-08-20',
    },
  },
  submissionChecks: [
    { checkId: 'sc1', text: '格式合规（模板已套用）', passed: true },
    { checkId: 'sc2', text: '参考文献样式 APA 7（31 条已排版）', passed: true },
    { checkId: 'sc3', text: '字数 4,820 ≤ 12,000', passed: true },
    { checkId: 'sc4', text: '图表规范（图表类型与变量尺度匹配）', passed: true },
    { checkId: 'sc5', text: 'AI 使用情况说明齐备（已联动导出中心）', passed: true },
    { checkId: 'sc6', text: '伦理与数据可得性声明：待补', passed: false, pendingText: '待补' },
  ],
  completedChecks: 5,
  totalChecks: 6,
  disclaimer:
    '本页仅提供投稿决策辅助，不得输出“保证录用 / 大概率必中”类承诺；所有第三方统计均标注来源与样本量。',
  dataUpdatedAt: '2026-08-20',
}

/* ------------------------------------------------------------
 * 13. P7 模拟评审
 * ---------------------------------------------------------- */

export const REVIEW_DATA: ReviewPageData = {
  reviewTarget: '社交焦虑与手机依赖：孤独感的中介作用与性别的调节效应',
  targetJournal: 'Computers in Human Behavior',
  field: '社会心理学',
  calibration: {
    paperCount: 48,
    corpusCount: 312,
    calibratedAt: '09:05',
    note: '评审意见必须映射到校准语料中的问题类型',
  },
  issues: [
    {
      issueId: 'i_h1',
      code: 'H1',
      type: 'hard',
      title: '共同方法偏差未检验',
      confidence: 'high',
      confidenceText: '置信度高',
      description: '全部变量均由同一问卷自报，未做 Harman 单因子检验或标记变量法，无法排除共同方法偏差对路径系数的影响。',
      frequencyText: '出现频率：同类意见在顶刊审稿中出现 47%',
      handled: 'none',
      replyable: true,
    },
    {
      issueId: 'i_h2',
      code: 'H2',
      type: 'hard',
      title: '样本量对调节效应检验不足',
      confidence: 'high',
      confidenceText: '置信度高',
      description: '交互项检验力不足（事后检验力 0.58 < 0.80），当前样本难以稳定检出中小效应量的调节作用。',
      frequencyText: '出现频率：同类意见在顶刊审稿中出现 39%',
      handled: 'none',
      replyable: true,
    },
    {
      issueId: 'i_d1',
      code: 'D1',
      type: 'dispute',
      title: '横断设计下的因果推论',
      confidence: 'medium',
      confidenceText: '置信度中',
      description: '讨论中将中介路径描述为“影响 / 导致”，但数据为横断自报，因果方向不可识别；部分审稿人要求改为相关描述。',
      frequencyText: '出现频率：同类意见在顶刊审稿中出现 28% · 置信度中',
      handled: 'none',
      replyable: true,
    },
    {
      issueId: 'i_d2',
      code: 'D2',
      type: 'dispute',
      title: '孤独感量表版本未说明',
      confidence: 'medium',
      confidenceText: '置信度中',
      description: '未标注 UCLA 孤独感量表的版本与修订情况，可能影响与既有研究的可比性。',
      frequencyText: '出现频率：同类意见在顶刊审稿中出现 22% · 置信度中',
      handled: 'none',
      replyable: false,
    },
    {
      issueId: 'i_s1',
      code: 'S1',
      type: 'style',
      title: '图表标题过于口语',
      confidence: 'low',
      confidenceText: '置信度低',
      description: '图 2 标题“手机用得多，是不是就更焦虑？”建议改为陈述式学术标题并标注样本量。',
      frequencyText: '出现频率：同类意见在顶刊审稿中出现 15% · 置信度低',
      handled: 'none',
      replyable: false,
    },
    {
      issueId: 'i_s2',
      code: 'S2',
      type: 'style',
      title: '讨论部分重复结论',
      confidence: 'low',
      confidenceText: '置信度低',
      description: '讨论首段与结论部分重复陈述主要发现，建议压缩并转为机制解释与实践启示。',
      frequencyText: '出现频率：同类意见在顶刊审稿中出现 12% · 置信度低',
      handled: 'none',
      replyable: false,
    },
  ],
  revisionPaths: [
    {
      issueCode: 'H1',
      title: 'H1 修改路径',
      text: '在方法部分补充 Harman 单因子检验（首因子解释率）与标记变量法结果；在局限部分说明未完全排除共同方法偏差。',
    },
    {
      issueCode: 'H2',
      title: 'H2 修改路径',
      text: '报告交互项事后检验力（当前 0.58），或改用 Bootstrap 置信区间报告调节效应，并将调节结论降为探索性。',
    },
  ],
  rebuttals: [
    {
      issueCode: 'H1',
      title: '回应 H1（共同方法偏差）',
      steps: ['承认局限', '补充 Harman 检验（首因子 31.2%）', '在方法第 3.4 节与局限部分各增一段（修订稿对比已标黄）'],
    },
    {
      issueCode: 'H2',
      title: '回应 H2（检验力）',
      steps: ['承认样本局限', '报告事后检验力并补充 Bootstrap 区间', '将调节结论降为探索性表述'],
    },
  ],
  summary: { accepted: 3, disputed: 2, ignored: 1, corpusCount: 312 },
  disclaimer:
    '本领域校准样本充足（312 条）；若目标期刊 / 领域语料不足，将标注「评审置信度受限，意见仅供参考」，不输出确定性结论。',
}

export const REVIEW_TYPE_META = {
  hard: { label: '硬伤（方法论 / 统计 / 逻辑错误）', short: '硬' },
  dispute: { label: '争议点（审稿人可能质疑，学界有分歧）', short: '议' },
  style: { label: '风格建议（表达与结构）', short: '风' },
} as const

/* ------------------------------------------------------------
 * 14. P8 导出中心
 * ---------------------------------------------------------- */

export const EXPORT_DATA: ExportPageData = {
  artifactCount: 6,
  artifacts: [
    {
      artifactId: 'ex1',
      name: '结构化文献综述 v3',
      metaText: '2026-09-21 09:05 · 128 KB · 双 Agent 核验已通过',
      formats: ['md', 'docx', 'PDF'],
      status: 'ready',
    },
    {
      artifactId: 'ex2',
      name: '数据体检报告',
      metaText: '2026-09-20 22:14 · 64 KB · 含测谎题与检出限说明',
      formats: ['md', 'PDF'],
      status: 'ready',
    },
    {
      artifactId: 'ex3',
      name: '分析结果包（含稳健性检验）',
      metaText: '2026-09-21 09:12 · 4.2 MB · 含效应量与前提检验',
      formats: ['docx', 'PDF'],
      status: 'ready',
    },
    {
      artifactId: 'ex4',
      name: '论文初稿 v1',
      metaText: '2026-09-21 09:12 · 96 KB · 含段落级 AI 标识',
      formats: ['docx', 'PDF'],
      status: 'ready',
    },
    {
      artifactId: 'ex5',
      name: '可复现代码包（Python / R）',
      metaText: '2026-09-21 09:12 · 18 KB · 已注明 statsmodels BSD-3 / pingouin MIT',
      formats: ['zip'],
      status: 'ready',
    },
    {
      artifactId: 'ex6',
      name: '投稿包（含封面与声明附件）',
      metaText: '待生成 · 需先补齐伦理与数据可得性声明',
      formats: [],
      status: 'pending',
      statusText: '待补齐',
      blocked: true,
    },
  ],
  disclosure: {
    title: '《AI 使用情况说明》一键生成',
    note: '满足人大、中传等学报 2025 年 AI 披露要求；披露报告的唯一生成入口',
    items: [
      { itemId: 'd1', text: '平台名称与版本（研宇宙 v1.0.0）与使用环节时间线', done: true },
      { itemId: 'd2', text: '原始提示词与生成内容记录（可逐条回溯）', done: true },
      { itemId: 'd3', text: '双 Agent 核验结果摘要（α 内容一致性 / β DOI 真实性）', done: true },
      { itemId: 'd4', text: '跳过逐条确认（YOLO）启用记录', done: true },
      { itemId: 'd5', text: '开源代码引用清单（含许可证）', done: true },
      { itemId: 'd6', text: 'P7 评审校准记录（校准语料 312 条）', done: true },
    ],
    unreviewedCount: 14,
    lastGeneratedAt: '2026-09-21 09:20',
  },
  risk: {
    hasUnverified: true,
    unverifiedCount: 1,
    message: '存在 1 条参考文献无法验证，请您手动核验文献是否真实存在，并核对参考内容，或上传 PDF 至平台核验',
  },
  compliance: [
    { key: 'redItems', label: '红色核验条目', value: '1', tone: 'danger' },
    { key: 'unverified', label: '未验证文献', value: '0', tone: 'ok' },
    { key: 'aiLabel', label: 'AI 标识完整性', value: '100%', tone: 'ok' },
  ],
  complianceNote:
    '平台不会代写或代拟结论；导出物仅包含项目内真实产物与已核验引用。',
}

export const EXPORT_FOOTNOTE =
  '所有 AI 生成内容均带不可移除溯源标识；连续导出时披露报告自动更新为最新一次生成记录。'

/* ------------------------------------------------------------
 * 15. P10 项目设置
 * ---------------------------------------------------------- */

export const PROJECT_MEMBERS: ProjectMember[] = [
  {
    memberId: 'm1',
    name: '陈同学',
    avatarText: '陈',
    role: 'firstAuthor',
    roleLabel: '第一作者',
    permissionLabel: '全部权限（含删除、定级与披露报告生成）',
  },
  {
    memberId: 'm2',
    name: '王导师',
    avatarText: '王',
    role: 'advisor',
    roleLabel: '导师',
    permissionLabel: '可查看成果快照 / 修改记录 / 核验状态 / 披露报告，可评论、退回与编辑',
  },
  {
    memberId: 'm3',
    name: '李同门',
    avatarText: '李',
    role: 'collaborator',
    roleLabel: '协作学生',
    permissionLabel: '可编辑产物与参与核验，不可导出、不可定级',
  },
]

export const VERSION_RECORDS: VersionRecord[] = [
  {
    versionNo: 'v18',
    operatorName: '陈同学',
    operatedAt: '09-21 09:12',
    description: '与分析结果同步，更新方法章节（关联运行记录 a7f3）',
    rollbackable: true,
  },
  {
    versionNo: 'v17',
    operatorName: '陈同学',
    operatedAt: '09-21 08:40',
    description: '替换参考文献 [7]，引用池已核验',
    rollbackable: true,
  },
  {
    versionNo: 'v16',
    operatorName: '王导师',
    operatedAt: '09-20 21:05',
    description: '退回修改：建议补充共同方法偏差检验',
    rollbackable: true,
  },
  {
    versionNo: 'v15',
    operatorName: '陈同学',
    operatedAt: '09-20 18:20',
    description: '更新数据体检报告（样本量 350）',
    rollbackable: true,
  },
]

/* ------------------------------------------------------------
 * 10.1 项目级合规设置 & DDL 关键词（跨页共享的唯一真源）
 * ---------------------------------------------------------- */

/**
 * 项目级合规设置。
 * 背景：原先「数据级别」在 P16 与 P10 各存一份、YOLO 开关在 P03 与 P16 各是一个 useState，
 * 三处会互相矛盾。现在统一由本表派生，前端落进 useSettingsStore，三个页面共用。
 */
export const PROJECT_COMPLIANCE: Record<string, ProjectComplianceSettings> = {
  p_2001: { projectId: 'p_2001', dataLevel: 'L1', skipConfirm: false },
  p_2002: { projectId: 'p_2002', dataLevel: 'L1', skipConfirm: true },
  p_2003: { projectId: 'p_2003', dataLevel: 'L0', skipConfirm: false },
}

/** 数据级别可选项（P10 / P16 共用） */
export const DATA_LEVEL_OPTIONS_META: { level: DataLevel; name: string }[] = [
  { level: 'L0', name: 'L0 公开' },
  { level: 'L1', name: 'L1 个人（当前）' },
  { level: 'L2', name: 'L2 敏感' },
]

/**
 * DDL 关键词设置：把 DDL 节点显示成「关键词：节点名」，例如「短视频：开题报告」。
 * 候选项来自项目标题主干词与领域研究热词，用户可任选其一（也可选择不显示）。
 */
export const DDL_KEYWORD_SETTINGS: Record<string, DdlKeywordSetting> = {
  p_2001: {
    projectId: 'p_2001',
    selected: '社交焦虑',
    options: [
      { keyword: '社交焦虑', sourceText: '来自项目标题' },
      { keyword: '手机依赖', sourceText: '来自项目标题' },
      { keyword: '孤独感', sourceText: '来自理论驱动 · 已锁定核心概念' },
    ],
  },
  p_2002: {
    projectId: 'p_2002',
    selected: '短视频',
    options: [
      { keyword: '短视频', sourceText: '来自项目标题' },
      { keyword: '睡眠质量', sourceText: '来自项目标题' },
      { keyword: 'ESM', sourceText: '来自研究方法' },
    ],
  },
  p_2003: {
    projectId: 'p_2003',
    selected: '导师制',
    options: [
      { keyword: '导师制', sourceText: '来自项目标题' },
      { keyword: '科研效能', sourceText: '来自项目标题' },
      { keyword: '追踪研究', sourceText: '来自研究方法' },
    ],
  },
}

/** 全部项目的 DDL 关键词设置（工作台 DDL 卡一次取回，避免 N 次请求） */
export const PROJECT_DDL_KEYWORD_LIST: DdlKeywordSetting[] = Object.values(DDL_KEYWORD_SETTINGS)

export const PROJECT_SETTINGS_DATA: ProjectSettingsData = {
  projectId: 'p_2001',
  title: '社交焦虑与手机依赖的关系研究',  metaText: '心理学 · 数据驱动 · 创建于 2026-09-01',
  discipline: '心理学',
  routeText: '数据驱动（默认统计方法与文献源已按学科预设）',
  ddlNodes: DDL_TIMELINE,
  members: PROJECT_MEMBERS,
  versions: VERSION_RECORDS,
  versionPolicyText: '保留最近 1 个月版本',
  dataLevel: 'L1',
  skipConfirm: false,
  dataLevelOptions: [
    {
      level: 'L0',
      name: 'L0 公开',
      description: '公开文献元数据与公开数据集',
      rules: [],
      current: false,
    },
    {
      level: 'L1',
      name: 'L1 个人（当前）',
      description: '用户自有问卷 / 实验数据（已脱敏）',
      rules: ['仅项目成员可见；默认不进入任何训练集'],
      current: true,
    },
    {
      level: 'L2',
      name: 'L2 敏感',
      description: '含隐私信息或未公开课题数据',
      rules: ['强制脱敏、禁止导出原文、存储加密、访问留痕、强制禁用跳过逐条确认'],
      current: false,
    },
  ],
  dataLevelChangeImpact:
    '改级后立即生效：数据导入会被拦截、「跳过逐条确认」会被禁用、导出会被阻断。',
}

export const ROLE_LABEL_MAP: Record<string, string> = {
  dependent: '因变量',
  independent: '自变量',
  mediator: '中介变量',
  moderator: '调节变量',
  control: '控制变量',
  resultCandidate: '结果变量候选',
}

/* ------------------------------------------------------------
 * 20. 流程进度与断点续做（后端变量：GET/PATCH /projects/:id/progress）
 * ----------------------------------------------------------
 * 需求：新建项目后用户未走完流程就离开，下次要回到**他停下的那一步**并带出未提交的内容。
 * 这里按项目存两份数据：
 *   PROJECT_PROGRESS[projectId] → 各步骤状态 + 停在哪一步 + 恢复路由
 *   PROJECT_DRAFTS[`projectId:stepKey`] → 该步骤未提交的草稿内容
 * ---------------------------------------------------------- */

/** 流程步骤模板（两条分支共用一张表；顺序即流程顺序）
 *  注意：**领域研究热词排在研究热点之前**（先看领域热词，再看热点与可行性）。
 *  数组顺序同时决定「新建项目的落点」——落点取该分支的第一步，所以调整这里的顺序即可改变入口。 */
const FLOW_STEP_TEMPLATE: { stepKey: string; stepLabel: string; route: string }[] = [
  { stepKey: 'topicKeywords', stepLabel: '领域研究热词', route: '/intro/topic/keywords' },
  { stepKey: 'hotspot', stepLabel: '研究热点', route: '/intro' },
  { stepKey: 'topicTheory', stepLabel: '选择理论与变量', route: '/intro/topic/theory' },
  { stepKey: 'dataUpload', stepLabel: '上传数据', route: '/intro/data/upload' },
  { stepKey: 'dataVariables', stepLabel: '变量识别', route: '/intro/data/variables' },
  { stepKey: 'dataHypotheses', stepLabel: '生成研究假设', route: '/intro/data/hypotheses' },
]

/** 演示项目的进度（p_2001 数据驱动：停在「变量识别」前一步的下一步；p_2002 已走完） */
const RAW_PROGRESS: Record<string, { done: string[]; lastStepKey?: string }> = {
  p_2001: { done: ['hotspot', 'dataUpload'], lastStepKey: 'dataVariables' },
  p_2002: { done: ['hotspot', 'topicKeywords', 'topicTheory'] },
  p_2003: { done: ['hotspot'], lastStepKey: 'topicKeywords' },
}

/** 某项目某一步的草稿（未提交内容） */
export const PROJECT_DRAFTS: Record<string, StepDraft> = {
  'p_2001:dataUpload': { selectedLevel: 'L1' },
  'p_2003:topicKeywords': { direction: '导师制对研究生科研效能的影响', selectedKeywords: ['科研效能'] },
}

/** 由「已完成步骤 + 停在哪一步」组装成前端要的进度载荷 */
function buildProgress(projectId: string, done: string[], lastStepKey?: string): ProjectProgress {
  const project = PROJECTS.find((p) => p.projectId === projectId)
  const isDataDriven = project?.route === 'dataDriven'
  // 只保留该项目分支上的步骤（理论驱动不展示数据分支步骤，反之亦然）
  const steps = FLOW_STEP_TEMPLATE.filter((s) =>
    isDataDriven
      ? s.stepKey === 'hotspot' || s.stepKey.startsWith('data')
      : s.stepKey === 'hotspot' || s.stepKey.startsWith('topic'),
  ).map<FlowStepProgress>((s) => ({
    stepKey: s.stepKey,
    stepLabel: s.stepLabel,
    route: `/project/${projectId}${s.route}`,
    status: done.includes(s.stepKey) ? 'done' : lastStepKey === s.stepKey ? 'inProgress' : 'notStarted',
    updatedAt: SCHEDULE_TODAY,
  }))
  const resume = steps.find((s) => s.stepKey === lastStepKey) ?? steps.find((s) => s.status !== 'done') ?? steps[0]
  return {
    projectId,
    steps,
    lastStepKey,
    resumeRoute: resume.route,
    resumeLabel: lastStepKey ? `继续上次：${resume.stepLabel}` : `开始：${resume.stepLabel}`,
    hasUnfinished: steps.some((s) => s.status !== 'done'),
  }
}

/** 项目进度（找不到项目时返回空进度，前端显示空态） */
export function getProjectProgress(projectId: string): ProjectProgress {
  const raw = RAW_PROGRESS[projectId]
  return buildProgress(projectId, raw?.done ?? [], raw?.lastStepKey)
}

/** 记录「用户到达 / 完成了某一步」，并把它设为「停下的那一步」 */
export function recordStep(projectId: string, stepKey: string, status: FlowStepProgress['status']) {
  const raw = RAW_PROGRESS[projectId] ?? { done: [] }
  if (status === 'done') {
    if (!raw.done.includes(stepKey)) raw.done.push(stepKey)
    raw.lastStepKey = undefined
  } else {
    raw.lastStepKey = stepKey
  }
  RAW_PROGRESS[projectId] = raw
  return getProjectProgress(projectId)
}

/** 读取某步草稿 */
export function getStepDraft(projectId: string, stepKey: string): StepDraft {
  return PROJECT_DRAFTS[`${projectId}:${stepKey}`] ?? {}
}

/** 保存某步草稿（合并写入，只覆盖传入的键） */
export function mergeStepDraft(projectId: string, stepKey: string, patch: StepDraft): StepDraft {
  const key = `${projectId}:${stepKey}`
  PROJECT_DRAFTS[key] = { ...(PROJECT_DRAFTS[key] ?? {}), ...patch }
  return PROJECT_DRAFTS[key]
}
