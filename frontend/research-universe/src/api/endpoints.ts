/**
 * 全量接口层（Mock 实现 + 真实路径注释）
 * 每个函数上方注释即该接口的路径与 Method，与 docs/API.md 一一对应。
 * 关闭 Mock 时把函数体替换为 request<T>(...) 即可。
 */
import * as DB from '@/mocks/db'
import type {
  AccountPrivacy,
  AccountSettings,
  AnalysisPageData,
  AnalysisResult,
  AsyncTask,
  AuthState,
  DataLevel,
  DataUploadData,
  DdlKeywordSetting,
  DdlNode,
  FlowStepProgress,
  ProjectProgress,
  StepDraft,
  ExportPageData,
  HotspotPageData,
  Hypothesis,
  HypothesisPageData,
  JournalPageData,
  JournalProfile,
  LiteraturePageData,
  NotificationItem,
  NotificationPayload,
  NotificationPref,
  PageResult,
  Paper,
  Plan,
  Project,
  ProjectComplianceSettings,
  ProjectDdlGroup,
  ProjectSettingsData,
  QuotaUsage,
  ReviewIssue,
  ReviewPageData,
  SearchFilter,
  StageArtifactsPayload,
  StudentVerification,
  TopicKeywordData,
  TopicTheoryData,
  UserInfo,
  VariableIdentifyData,
  VariableItem,
  VariableRole,
  WritingMode,
  WritingPageData,
} from '@/types'
import { ApiError, ErrorCode, USE_MOCK, clearAuthStorage, mockDelay, ok, request, sleep } from './client'

/** 文件下载（带鉴权的二进制拉取），供页面直接调用实现「真的下载到本地」 */
export { downloadFile } from './client'

/**
 * ============================================================
 * Mock 写操作的状态记忆
 * ============================================================
 * 说明：Mock 下的 PATCH 接口需要真的改掉内存里的记录，否则「保存后再 GET 又变回旧值」，
 * 会让前端看起来像是没生效（跨页/跨组件校验时尤其明显）。
 * 因此这里提供三个写入辅助函数，直接改动 `src/mocks/db.ts` 里的内存数据；
 * 真实后端接入后这些函数不会被调用（各接口的 `!USE_MOCK` 分支会走 request）。
 */

/** 写入项目数据级别；L2 会顺带强制关闭「跳过逐条确认」（与服务端规则一致） */
function applyDataLevel(projectId: string, dataLevel: DataLevel) {
  const record = DB.PROJECT_COMPLIANCE[projectId]
  if (record) {
    record.dataLevel = dataLevel
    if (dataLevel === 'L2') record.skipConfirm = false
  }
  // 项目设置页的载荷也要同步，避免同一次会话里两个接口说法不一致
  if (DB.PROJECT_SETTINGS_DATA.projectId === projectId) {
    DB.PROJECT_SETTINGS_DATA.dataLevel = dataLevel
    if (dataLevel === 'L2') DB.PROJECT_SETTINGS_DATA.skipConfirm = false
  }
}

/* ============================================================
 * 1. 认证 / 用户
 * ========================================================== */

/**
 * 登录 / 注册的账号规则：**仅允许 11 位手机号或合法邮箱**。
 *
 * 为什么放在接口层：登录页、发送验证码、以及任何复用登录能力的地方都要用同一套规则，
 * 放在这里可以保证「前端拦截」与「提交给后端的值」完全一致（后端还会再校验一次）。
 *
 * @returns 通过返回 null，不通过返回给用户看的中文提示
 */
export function validateAccount(account: string): string | null {
  const v = account.trim()
  if (!v) return '请先填写手机号或邮箱'
  if (/^\d+$/.test(v)) {
    if (v.length !== 11) return `手机号应为 11 位数字（当前 ${v.length} 位）`
    if (!/^1[3-9]\d{9}$/.test(v)) return '请输入以 1 开头的 11 位手机号'
    return null
  }
  if (v.includes('@')) {
    if (!/^[\w.!#$%&'*+/=?^`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(v)) {
      return '请输入有效的邮箱地址'
    }
    if (v.length > 64) return '邮箱长度不能超过 64 个字符'
    return null
  }
  return '请输入 11 位手机号或邮箱（如 you@stu.example.edu.cn）'
}

/**
 * POST /api/v1/auth/login —— 登录 / 注册
 *
 * `intent` 区分用户意图（登录页的「登录 / 注册」切换）：
 * - `login`  ：账号不存在时后端直接报错，不会顺手建号（杜绝「随便输个号就变成示例账号」）；
 * - `register`：账号不存在时创建新用户；已存在则直接登录。
 */
export async function login(payload: {
  account: string
  code: string
  intent?: 'login' | 'register'
}): Promise<{ auth: AuthState; verification: StudentVerification; isNewUser: boolean }> {
  if (!USE_MOCK) {
    // 真实联调：登录成功后必须把 token 存进 localStorage，
    // 否则后续请求发不出 Authorization 头，会全军覆没式 401
    const res = await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
    const token = (res as { auth?: { token?: string } } | undefined)?.auth?.token
    if (token) localStorage.setItem('ru_token', token)
    return res as { auth: AuthState; verification: StudentVerification; isNewUser: boolean }
  }
  await mockDelay()
  const accountError = validateAccount(payload.account)
  if (accountError) throw new ApiError(ErrorCode.PARAM_INVALID, accountError, 'err-mock')
  if (!/^\d{6}$/.test(payload.code)) {
    throw new ApiError(ErrorCode.PARAM_INVALID, '验证码为 6 位数字', 'err-mock')
  }
  const isDemoAccount = payload.account.trim() === '13800000000'
  if ((payload.intent ?? 'login') === 'login' && !isDemoAccount) {
    throw new ApiError(ErrorCode.PARAM_INVALID, '该账号尚未注册，请切换到「注册」', 'err-mock')
  }
  localStorage.setItem('ru_token', 'mock-token-' + Date.now())
  return {
    auth: { loggedIn: true, token: 'mock-token', user: DB.CURRENT_USER },
    verification: DB.STUDENT_VERIFICATION,
    isNewUser: !isDemoAccount,
  }
}

/** POST /api/v1/auth/sms-code —— 发送验证码（账号格式在发码前就拦掉） */
export async function sendSmsCode(payload: { account: string }): Promise<{ cooldownSeconds: number }> {
  const accountError = validateAccount(payload.account)
  if (accountError) throw new ApiError(ErrorCode.PARAM_INVALID, accountError, 'err-mock')
  if (!USE_MOCK) return request('/auth/sms-code', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(200, 400)
  return ok({ cooldownSeconds: 52 }).data
}

/** POST /api/v1/auth/logout */
export async function logout(): Promise<{ success: boolean }> {
  if (!USE_MOCK) {
    const res = await request('/auth/logout', { method: 'POST' })
    // 同时清掉 token 与资料快照，避免下次打开「又自动登录」
    clearAuthStorage()
    return res as { success: boolean }
  }
  await mockDelay(120, 240)
  clearAuthStorage()
  return ok({ success: true }).data
}

/** GET /api/v1/me —— 当前用户信息 */
export async function fetchMe(): Promise<UserInfo> {
  if (!USE_MOCK) return request('/me')
  await mockDelay(120, 260)
  return ok(DB.CURRENT_USER).data
}

/** GET /api/v1/me/student-verification —— 学生认证状态 */
export async function fetchStudentVerification(): Promise<StudentVerification> {
  if (!USE_MOCK) return request('/me/student-verification')
  await mockDelay(120, 260)
  return ok(DB.STUDENT_VERIFICATION).data
}

/** POST /api/v1/me/student-verification —— 提交学生认证 */
export async function submitStudentVerification(payload: {
  channel: 'eduEmail' | 'chsi'
  eduEmail?: string
  reportFileId?: string
}): Promise<StudentVerification> {
  if (!USE_MOCK)
    return request('/me/student-verification', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(500, 900)
  return ok({
    ...DB.STUDENT_VERIFICATION,
    verified: true,
    channel: payload.channel,
    eduEmail: payload.eduEmail ?? DB.STUDENT_VERIFICATION.eduEmail,
  }).data
}

/**
 * GET /api/v1/me/notifications —— 站内通知（顶栏铃铛）
 * 未读数由服务端计算后下发，前端不再写死。
 */
export async function fetchNotifications(): Promise<NotificationPayload> {
  if (!USE_MOCK) return request('/me/notifications')
  await mockDelay(160, 320)
  return ok({
    list: DB.NOTIFICATIONS,
    unreadCount: DB.NOTIFICATIONS.filter((n) => !n.read).length,
  }).data
}

/** POST /api/v1/me/notifications/read —— 全部标记已读 */
export async function markNotificationsRead(): Promise<NotificationPayload> {
  if (!USE_MOCK) return request('/me/notifications/read', { method: 'POST' })
  await mockDelay(200, 400)
  DB.NOTIFICATIONS.forEach((n) => {
    n.read = true
  })
  return ok({ list: DB.NOTIFICATIONS, unreadCount: 0 }).data
}

/* ============================================================
 * 1.1 账号设置（P13）
 * ========================================================== */
/** GET /api/v1/me/account —— 账号设置页数据 */
export async function fetchAccountSettings(): Promise<AccountSettings> {
  if (!USE_MOCK) return request('/me/account')
  await mockDelay(200, 420)
  return ok(DB.ACCOUNT_SETTINGS).data
}

/** PATCH /api/v1/me —— 更新基本资料（昵称 / 学科 / 年级） */
export async function updateMe(payload: {
  nickname?: string
  major?: string
  grade?: string
  /** 自定义头像：传 data URL 为设置，传 null 为恢复文字头像 */
  avatarUrl?: string | null
}): Promise<{ user: UserInfo; savedAt: string }> {
  if (!USE_MOCK) return request('/me', { method: 'PATCH', body: JSON.stringify(payload) })
  await mockDelay(400, 700)
  const user: UserInfo = {
    ...DB.CURRENT_USER,
    nickname: payload.nickname ?? DB.CURRENT_USER.nickname,
    major: payload.major ?? DB.CURRENT_USER.major,
    grade: payload.grade ?? DB.CURRENT_USER.grade,
  }
  // 自定义头像：传 null 表示恢复文字头像（清掉 avatarUrl）。
  // 注意返回值统一用 null（而不是 undefined），与后端 serializeUser 的口径保持一致，
  // 否则 JSON / 对象合并时字段会被丢掉，调用方分不清「没改」和「已移除」。
  if (payload.avatarUrl !== undefined) {
    if (payload.avatarUrl) user.avatarUrl = payload.avatarUrl
    else user.avatarUrl = null
  }
  // 头像文字跟随昵称首字，保持与顶栏一致
  user.avatarText = user.nickname.slice(0, 1)
  // 写回内存 Mock，保证「保存后重新进入账号设置」看到的是新值（含头像的增/删）
  Object.assign(DB.CURRENT_USER, user)
  DB.ACCOUNT_SETTINGS.nickname = user.nickname
  DB.ACCOUNT_SETTINGS.avatarText = user.avatarText
  DB.ACCOUNT_SETTINGS.avatarUrl = user.avatarUrl ?? null
  DB.ACCOUNT_SETTINGS.major = user.major
  DB.ACCOUNT_SETTINGS.grade = user.grade
  return ok({ user, savedAt: '2026-09-24 21:10' }).data
}

/** POST /api/v1/me/devices/revoke-others —— 退出其他所有设备（不可逆，需二次确认） */
export async function revokeOtherDevices(): Promise<{ success: boolean; revokedCount: number }> {
  if (!USE_MOCK) return request('/me/devices/revoke-others', { method: 'POST' })
  await mockDelay(500, 900)
  const revokedCount = DB.LOGIN_DEVICES.filter((d) => !d.current).length
  return ok({ success: true, revokedCount }).data
}

/** PATCH /api/v1/me/notifications —— 更新通知偏好 */
export async function updateNotificationPrefs(payload: {
  key: NotificationPref['key']
  enabled: boolean
}): Promise<{ notifications: NotificationPref[] }> {
  if (!USE_MOCK) return request('/me/notifications', { method: 'PATCH', body: JSON.stringify(payload) })
  await mockDelay(200, 400)
  return ok({
    notifications: DB.NOTIFICATION_PREFS.map((n) => (n.key === payload.key ? { ...n, enabled: payload.enabled } : n)),
  }).data
}

/** PATCH /api/v1/me/privacy —— 更新数据与隐私设置 */
export async function updatePrivacy(payload: {
  allowTraining?: boolean
  keepHistoryDays?: number
}): Promise<AccountPrivacy> {
  if (!USE_MOCK) return request('/me/privacy', { method: 'PATCH', body: JSON.stringify(payload) })
  await mockDelay(300, 600)
  return ok({ ...DB.ACCOUNT_PRIVACY, ...payload }).data
}

/** POST /api/v1/me/data-export —— 申请导出我的数据（异步生成，完成后邮件通知） */
export async function requestDataExport(): Promise<{ requestedAt: string; etaText: string }> {
  if (!USE_MOCK) return request('/me/data-export', { method: 'POST' })
  await mockDelay(400, 800)
  return ok({ requestedAt: '2026-09-24 21:10', etaText: '预计 30 分钟内完成，完成后发送到教育邮箱' }).data
}

/** DELETE /api/v1/me —— 注销账号（不可逆，需二次确认 + 输入确认词） */
export async function deleteAccount(payload: { confirmText: string }): Promise<{ success: boolean }> {
  if (!USE_MOCK) return request('/me', { method: 'DELETE', body: JSON.stringify(payload) })
  await mockDelay(600, 1000)
  return ok({ success: true }).data
}

/* ============================================================
 * 2. 套餐 / 额度
 * ========================================================== */

/** GET /api/v1/plans —— 套餐列表 */
export async function fetchPlans(): Promise<{ plans: Plan[]; quotaItems: typeof DB.QUOTA_ITEMS }> {
  if (!USE_MOCK) return request('/plans')
  await mockDelay(120, 260)
  return ok({ plans: DB.PLANS, quotaItems: DB.QUOTA_ITEMS }).data
}

/** GET /api/v1/me/quota —— 我的额度用量 */
export async function fetchQuota(): Promise<QuotaUsage> {
  if (!USE_MOCK) return request('/me/quota')
  await mockDelay(120, 260)
  return ok(DB.QUOTA_USAGE).data
}

/** POST /api/v1/me/plan —— 切换套餐（需二次确认） */
export async function changePlan(payload: { planId: Plan['planId'] }): Promise<QuotaUsage> {
  if (!USE_MOCK) return request('/me/plan', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(500, 900)
  return ok({ ...DB.QUOTA_USAGE, planId: payload.planId }).data
}

/* ============================================================
 * 3. 项目
 * ========================================================== */

/** GET /api/v1/projects —— 我的项目列表 */
export async function fetchProjects(query?: {
  page?: number
  pageSize?: number
  sort?: 'recentEdited' | 'ddl'
}): Promise<PageResult<Project> & { metaText: string; greeting: string }> {
  if (!USE_MOCK)
    return request('/projects', { query: query as Record<string, unknown> })
  await mockDelay()
  return ok({
    list: DB.PROJECTS,
    total: DB.PROJECTS.length,
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 20,
    metaText: DB.PROJECT_LIST_META,
    greeting: DB.GREETING_SUBTITLE,
  }).data
}

/** GET /api/v1/projects/:projectId —— 项目详情 */
export async function fetchProject(projectId: string): Promise<Project> {
  if (!USE_MOCK) return request(`/projects/${projectId}`)
  await mockDelay(120, 260)
  const p = DB.PROJECTS.find((x) => x.projectId === projectId)
  if (!p) throw new ApiError(ErrorCode.NOT_FOUND, '项目不存在', 'err-mock')
  return ok(p).data
}

/**
 * POST /api/v1/projects —— 新建项目
 *
 * 返回 `entryRoute`：**该项目的流程起点由服务端决定**，前端不写死跳转目标。
 * 依据设计稿 IA，「研究热点」是公共父级，两条分支的第一步不同：
 *   theoryDriven（理论驱动）→ 研究热点 `/project/:id/intro`
 *   dataDriven（数据驱动）  → 上传数据 `/project/:id/intro/data/upload`
 * 这样后续若产品调整流程顺序，只需改服务端返回值，前端无需发版。
 */
export async function createProject(payload: {
  title: string
  discipline: string
  route: Project['route']
}): Promise<{ project: Project; entryRoute: string }> {
  if (!USE_MOCK) return request('/projects', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(400, 700)
  const project = DB.buildNewProject(payload)
  // Mock 落库：把新项目的日程 / 产物 / 合规 / 关键词记录一并写入，避免落地页 404
  DB.registerNewProject(project)
  return ok({ project, entryRoute: projectEntryRoute(project) }).data
}

/**
 * 项目流程起点（与设计稿两条分支的第一步一致）
 *   theoryDriven（理论驱动）→ 研究热点 `/project/:id/intro`
 *   dataDriven（数据驱动）  → 上传数据 `/project/:id/intro/data/upload`
 *
 * 注意：理论驱动的**步骤顺序**是「领域研究热词 → 研究热点 → 选择理论与变量」（热词在前），
 * 但**新建后的落点**仍按上面的约定放在「研究热点」，两者有意区分：先给用户看热点与可行性，
 * 再引导他回到热词页细化。要改成「落点＝分支第一步」只需把这里换成 `getProjectProgress().steps[0].route`。
 */
export function projectEntryRoute(project: Pick<Project, 'projectId' | 'route'>): string {
  return project.route === 'dataDriven'
    ? `/project/${project.projectId}/intro/data/upload`
    : `/project/${project.projectId}/intro`
}

/**
 * GET /api/v1/projects/ddl —— 全部项目的 DDL 硬节点（工作台「DDL 倒排时间线」用）
 *
 * 说明：工作台右栏需要把三个项目的节点合并成一条按紧迫度排序的时间线，
 * 因此改为批量接口一次取回（顺序由前端 `sortDdlRows` 统一排序，服务端只负责给数据）。
 */
export async function fetchAllDdlTimeline(): Promise<ProjectDdlGroup[]> {
  if (!USE_MOCK) return request('/projects/ddl')
  await mockDelay(160, 340)
  // 用函数实时组装：新创建的项目能立刻出现在列表里（节点映射规则见 db.buildProjectDdlGroups）
  return ok(DB.buildProjectDdlGroups()).data
}

/**
 * GET /api/v1/projects/ddl-keywords —— 全部项目的 DDL 概述关键词设置
 *
 * 用途：工作台「DDL 倒排时间线」把节点显示成「关键词：节点名」（例如「短视频：开题报告」），
 * 让合并列表里一眼能看出该节点属于哪个项目。每个项目可选 1 个关键词（候选项由服务端给）。
 */
export async function fetchDdlKeywords(): Promise<DdlKeywordSetting[]> {
  if (!USE_MOCK) return request('/projects/ddl-keywords')
  await mockDelay(140, 300)
  return ok(DB.PROJECT_DDL_KEYWORD_LIST).data
}

/**
 * PATCH /api/v1/projects/:projectId/ddl-keyword —— 设置该项目的 DDL 概述关键词
 * `selected` 传空字符串表示不显示前缀。
 */
export async function updateDdlKeyword(payload: {
  projectId: string
  selected: string
}): Promise<DdlKeywordSetting> {
  if (!USE_MOCK) return request(`/projects/${payload.projectId}/ddl-keyword`, { method: 'PATCH', body: JSON.stringify(payload) })
  await mockDelay(200, 400)
  const current = DB.DDL_KEYWORD_SETTINGS[payload.projectId]
  if (!current) throw new ApiError(ErrorCode.NOT_FOUND, '项目不存在', 'err-mock')
  current.selected = payload.selected
  return ok({ ...current, selected: payload.selected }).data
}

/**
 * GET /api/v1/projects/:projectId/compliance —— 项目级合规设置（数据级别 + 跳过逐条确认）
 *
 * 背景：数据级别与「跳过逐条确认（YOLO）」原先在多个页面各存一份，会互相矛盾。
 * 现在统一由本接口下发，前端落进 useSettingsStore，三处入口共用同一份状态。
 */
export async function fetchProjectCompliance(projectId: string): Promise<ProjectComplianceSettings> {
  if (!USE_MOCK) return request(`/projects/${projectId}/compliance`)
  await mockDelay(140, 300)
  const found = DB.PROJECT_COMPLIANCE[projectId]
  if (!found) throw new ApiError(ErrorCode.NOT_FOUND, '项目不存在', 'err-mock')
  return ok(found).data
}

/** PATCH /api/v1/projects/:projectId/skip-confirm —— 设置「跳过逐条确认（YOLO）」 */
export async function updateSkipConfirm(payload: {
  projectId: string
  skipConfirm: boolean
}): Promise<ProjectComplianceSettings> {
  if (!USE_MOCK) return request(`/projects/${payload.projectId}/skip-confirm`, { method: 'PATCH', body: JSON.stringify(payload) })
  await mockDelay(240, 480)
  const current = DB.PROJECT_COMPLIANCE[payload.projectId]
  if (!current) throw new ApiError(ErrorCode.NOT_FOUND, '项目不存在', 'err-mock')
  // L2 项目：服务端强制关闭该开关（与前端置灰规则一致）
  const skipConfirm = current.dataLevel === 'L2' ? false : payload.skipConfirm
  current.skipConfirm = skipConfirm
  if (DB.PROJECT_SETTINGS_DATA.projectId === payload.projectId) {
    DB.PROJECT_SETTINGS_DATA.skipConfirm = skipConfirm
  }
  return ok({ ...current, skipConfirm }).data
}

/**
 * GET /api/v1/projects/:projectId/stage-artifacts —— 本阶段产物摘要
 * 说明：原「项目流程看板」（GET /projects/:projectId/kanban）已按需求移除，
 *      阶段信息改由服务端同一份日程数据派生，此接口只保留产物摘要。
 */
export async function fetchStageArtifacts(projectId: string): Promise<StageArtifactsPayload> {
  if (!USE_MOCK) return request(`/projects/${projectId}/stage-artifacts`)
  await mockDelay(120, 260)
  const payload = DB.PROJECT_ARTIFACTS[projectId]
  if (!payload) throw new ApiError(ErrorCode.NOT_FOUND, '项目产物不存在', 'err-mock')
  return ok(payload).data
}

/* ============================================================
 * 4. 论文引言 · 研究热点
 * ========================================================== */

/** GET /api/v1/projects/:projectId/intro/hotspot —— 研究热点页 */
export async function fetchHotspot(projectId: string): Promise<HotspotPageData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/intro/hotspot`)
  await mockDelay()
  // 演示项目返回设计稿示例数据；新建项目返回空态（项目名用真实项目名），避免「看起来还是旧项目」
  const project = DB.getProject(projectId)
  if (project && !DB.isDemoProject(projectId)) return ok(DB.buildEmptyHotspot(project)).data
  return ok(DB.HOTSPOT_DATA).data
}

/** POST /api/v1/projects/:projectId/intro/hotspot/analyze —— 生成分析报告 */
export async function analyzeHotspot(payload: {
  researchDirection: string
}): Promise<{ task: AsyncTask; data: HotspotPageData }> {
  if (!USE_MOCK)
    return request(`/projects/hotspot/analyze`, { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(600, 1100)
  return ok({
    task: { taskId: 'task_hotspot', status: 'succeeded' as const, progress: 100 },
    data: DB.HOTSPOT_DATA,
  }).data
}

/** POST /api/v1/projects/:projectId/intro/confirm-direction —— 确认方向，进入文献综述 */
export async function confirmDirection(projectId: string): Promise<{ nextRoute: string }> {
  if (!USE_MOCK) return request(`/projects/${projectId}/intro/confirm-direction`, { method: 'POST' })
  await mockDelay(300, 600)
  return ok({ nextRoute: `/project/${projectId}/literature` }).data
}

/* ============================================================
 * 5. 论文引言 · 理论驱动
 * ========================================================== */

/** GET /api/v1/projects/:projectId/intro/topic/keywords —— 领域研究热词 */
export async function fetchTopicKeywords(projectId: string): Promise<TopicKeywordData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/intro/topic/keywords`)
  await mockDelay()
  return ok(DB.TOPIC_KEYWORDS).data
}

/** POST /api/v1/projects/:projectId/intro/topic/keywords/analyze —— 输入研究方向后分析 */
export async function analyzeTopicKeywords(payload: {
  researchDirection: string
  discipline: string
}): Promise<TopicKeywordData> {
  if (!USE_MOCK)
    return request('/projects/topic/keywords/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  await mockDelay(600, 1100)
  return ok({ ...DB.TOPIC_KEYWORDS, researchDirection: payload.researchDirection }).data
}

/** POST /api/v1/projects/:projectId/intro/topic/keywords/lock —— 锁定核心概念 */
export async function lockConcepts(payload: { concepts: string[] }): Promise<{ locked: string[] }> {
  if (!USE_MOCK) return request('/projects/topic/keywords/lock', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(200, 400)
  return ok({ locked: payload.concepts }).data
}

/** GET /api/v1/projects/:projectId/intro/topic/theory —— 选择理论与变量 */
export async function fetchTopicTheory(projectId: string): Promise<TopicTheoryData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/intro/topic/theory`)
  await mockDelay()
  return ok(DB.TOPIC_THEORY).data
}

/** POST /api/v1/projects/:projectId/intro/topic/theory/select —— 选定理论框架 */
export async function selectTheory(payload: {
  theoryId: string
}): Promise<{ theoryId: string; variableDrafts: TopicTheoryData['variableDrafts'] }> {
  if (!USE_MOCK) return request('/projects/topic/theory/select', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(400, 800)
  return ok({ theoryId: payload.theoryId, variableDrafts: DB.TOPIC_THEORY.variableDrafts }).data
}

/* ============================================================
 * 6. 论文引言 · 数据驱动
 * ========================================================== */

/** POST /api/v1/projects/:projectId/data/files —— 上传数据文件（multipart） */
export async function uploadDataFile(payload: {
  projectId: string
  file: File
}): Promise<DataUploadData['uploadedFiles'][number]> {
  if (!USE_MOCK)
    return request('/projects/data/files', { method: 'POST', body: JSON.stringify(payload) as never })
  await mockDelay(800, 1600)
  return ok({
    fileId: 'f_' + Date.now(),
    fileName: payload.file.name,
    metaText: `${payload.file.name.split('.').pop()?.toUpperCase() ?? 'FILE'} 数据 · ${(payload.file.size / 1024 / 1024).toFixed(1)} MB · 待解析`,
    rows: 512,
    columns: 36,
    sizeText: `${(payload.file.size / 1024 / 1024).toFixed(1)} MB`,
    status: 'uploaded' as const,
    statusText: '已上传 · 待体检',
  }).data
}

/** DELETE /api/v1/projects/:projectId/data/files/:fileId —— 移除文件 */
export async function removeDataFile(payload: {
  projectId: string
  fileId: string
}): Promise<{ success: boolean }> {
  if (!USE_MOCK)
    return request(`/projects/${payload.projectId}/data/files/${payload.fileId}`, { method: 'DELETE' })
  await mockDelay(200, 400)
  return ok({ success: true }).data
}

/** GET /api/v1/projects/:projectId/data/upload —— 上传数据页 */
export async function fetchDataUpload(projectId: string): Promise<DataUploadData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/data/upload`)
  await mockDelay()
  // 演示项目返回示例数据；新建项目返回空态（0 文件 / 0 变量），公共库仍可选
  const project = DB.getProject(projectId)
  if (project && !DB.isDemoProject(projectId)) return ok(DB.buildEmptyUploadData(project)).data
  return ok(DB.UPLOAD_DATA).data
}

/** POST /api/v1/projects/:projectId/data/import-public —— 公共数据库一键导入 */
export async function importPublicDataset(payload: {
  datasetId: string
}): Promise<{ task: AsyncTask }> {
  if (!USE_MOCK) return request('/projects/data/import-public', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(600, 1200)
  return ok({ task: { taskId: 'task_import_' + payload.datasetId, status: 'succeeded' as const, progress: 100 } }).data
}

/** POST /api/v1/projects/:projectId/data/sample/:sampleId —— 载入示例数据集 */
export async function loadSampleDataset(payload: {
  sampleId: string
}): Promise<{ success: boolean; note: string }> {
  if (!USE_MOCK) return request(`/projects/data/sample/${payload.sampleId}`, { method: 'POST' })
  await mockDelay(500, 900)
  return ok({ success: true, note: '示例数据不会写入你的项目' }).data
}

/** GET /api/v1/projects/:projectId/data/variables —— 变量识别页 */
export async function fetchVariables(projectId: string): Promise<VariableIdentifyData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/data/variables`)
  await mockDelay()
  return ok(DB.VARIABLE_IDENTIFY).data
}

/** PATCH /api/v1/projects/:projectId/data/variables/:varName —— 手动修正变量角色 / 类型 */
export async function updateVariable(payload: {
  projectId: string
  varName: string
  role?: VariableRole
  typeLabel?: string
}): Promise<{ varName: string; role?: VariableRole; typeLabel?: string; recalcNeeded: boolean }> {
  if (!USE_MOCK)
    return request(`/projects/${payload.projectId}/data/variables/${payload.varName}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  await mockDelay(200, 420)
  return ok({
    varName: payload.varName,
    role: payload.role,
    typeLabel: payload.typeLabel,
    recalcNeeded: true, // 修正会重算后续方法清单
  }).data
}

/** POST /api/v1/projects/:projectId/data/variables/confirm —— 确认变量，进入研究假设 */
export async function confirmVariables(payload: {
  projectId: string
  variables: VariableItem[]
}): Promise<{ nextRoute: string }> {
  if (!USE_MOCK) return request('/projects/data/variables/confirm', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(300, 600)
  return ok({ nextRoute: `/project/${payload.projectId}/intro/data/hypotheses` }).data
}

/** GET /api/v1/projects/:projectId/data/hypotheses —— 生成研究假设页 */
export async function fetchHypotheses(projectId: string): Promise<HypothesisPageData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/data/hypotheses`)
  await mockDelay()
  return ok(DB.HYPOTHESIS_DATA).data
}

/** POST /api/v1/projects/:projectId/data/hypotheses/generate —— 重新生成候选假设 */
export async function generateHypotheses(payload: {
  projectId: string
  prompt?: string
}): Promise<HypothesisPageData> {
  if (!USE_MOCK) return request('/projects/data/hypotheses/generate', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(700, 1300)
  return ok(DB.HYPOTHESIS_DATA).data
}

/** POST /api/v1/projects/:projectId/data/hypotheses/confirm —— 确认假设并进入数据分析 */
export async function confirmHypotheses(payload: {
  projectId: string
  hypotheses: Pick<Hypothesis, 'hypothesisId' | 'status'>[]
}): Promise<{ nextRoute: string; logId: string }> {
  if (!USE_MOCK) return request('/projects/data/hypotheses/confirm', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(300, 600)
  return ok({
    nextRoute: `/project/${payload.projectId}/analysis`,
    logId: 'log_' + Date.now(),
  }).data
}

/* ============================================================
 * 7. 文献综述
 * ========================================================== */

/** POST /api/v1/projects/:projectId/literature/search —— 语义检索 */
export async function searchLiterature(payload: {
  projectId: string
  filter: SearchFilter
  page?: number
  pageSize?: number
}): Promise<PageResult<Paper> & { languageWarning: string }> {
  if (!USE_MOCK)
    return request('/projects/literature/search', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(500, 1000)
  return ok({
    list: DB.LITERATURE_DATA.papers,
    total: DB.LITERATURE_DATA.resultTotal,
    page: payload.page ?? 1,
    pageSize: payload.pageSize ?? 20,
    languageWarning: DB.LITERATURE_DATA.languageWarning,
  }).data
}

/** GET /api/v1/projects/:projectId/literature —— 文献综述页初始数据 */
export async function fetchLiterature(projectId: string): Promise<LiteraturePageData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/literature`)
  await mockDelay()
  return ok(DB.LITERATURE_DATA).data
}

/** POST /api/v1/projects/:projectId/literature/selection —— 加入 / 移除已选文献集 */
export async function updateSelection(payload: {
  projectId: string
  paperId: string
  selected: boolean
}): Promise<{ selectedPaperIds: string[]; selectedCount: number }> {
  if (!USE_MOCK) return request('/projects/literature/selection', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(160, 320)
  return ok({ selectedPaperIds: [payload.paperId], selectedCount: 12 }).data
}

/** POST /api/v1/projects/:projectId/literature/upload —— 上传其他文献 */
export async function uploadLiterature(payload: {
  projectId: string
  file: File
}): Promise<{ fileId: string; parsed: boolean }> {
  if (!USE_MOCK) return request('/projects/literature/upload', { method: 'POST' })
  await mockDelay(700, 1400)
  return ok({ fileId: 'lit_' + Date.now(), parsed: true }).data
}

/** POST /api/v1/projects/:projectId/literature/generate-review —— 生成结构化综述（异步） */
export async function generateStructuredReview(payload: { projectId: string }): Promise<AsyncTask> {
  if (!USE_MOCK) return request('/projects/literature/generate-review', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(600, 1200)
  return ok({
    taskId: 'task_review_' + Date.now(),
    status: 'running' as const,
    progress: 0,
    etaSeconds: 180,
    message: '双 Agent 核验进行中',
  }).data
}

/** GET /api/v1/tasks/:taskId —— 查询异步任务（综述生成 / 核验 / 沙箱分析共用） */
export async function fetchTask(taskId: string): Promise<AsyncTask> {
  if (!USE_MOCK) return request(`/tasks/${taskId}`)
  await mockDelay(160, 320)
  return ok({ taskId, status: 'succeeded' as const, progress: 100 }).data
}

/** POST /api/v1/projects/:projectId/literature/verify —— 触发双 Agent 核验 */
export async function verifyLiterature(payload: { projectId: string; paperIds?: string[] }): Promise<AsyncTask> {
  if (!USE_MOCK) return request('/projects/literature/verify', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(500, 900)
  return ok({ taskId: 'task_verify_' + Date.now(), status: 'running' as const, progress: 12 }).data
}

/** POST /api/v1/projects/:projectId/kb/qa —— 知识库问答 */
export async function askKnowledgeBase(payload: {
  projectId: string
  question: string
}): Promise<LiteraturePageData['kbQa'] & { docCount: number }> {
  if (!USE_MOCK) return request('/projects/kb/qa', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(700, 1300)
  return ok({ ...DB.LITERATURE_DATA.kbQa, question: payload.question, docCount: DB.LITERATURE_DATA.kbDocCount }).data
}

/** POST /api/v1/projects/:projectId/literature/bring-to-writing —— 带入写作页引用 */
export async function bringToWriting(payload: { projectId: string }): Promise<{ nextRoute: string; claimCount: number }> {
  if (!USE_MOCK) return request('/projects/literature/bring-to-writing', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(300, 600)
  return ok({ nextRoute: `/project/${payload.projectId}/writing`, claimCount: 26 }).data
}

/* ============================================================
 * 8. 数据分析
 * ========================================================== */

/** GET /api/v1/projects/:projectId/analysis —— 数据分析页 */
export async function fetchAnalysis(projectId: string): Promise<AnalysisPageData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/analysis`)
  await mockDelay()
  return ok(DB.ANALYSIS_DATA).data
}

/** POST /api/v1/projects/:projectId/analysis/import —— 导入项目数据（P4 内嵌导入） */
export async function importProjectData(payload: {
  projectId: string
  fileName: string
  dataLevel: DataLevel
}): Promise<{ fileId: string; rows: number; columns: number; passed: boolean }> {
  if (!USE_MOCK) return request('/projects/analysis/import', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(600, 1100)
  // L2 项目禁止导出原始数据行 → 这里演示数据分级拦截
  if (payload.dataLevel === 'L2') {
    throw new ApiError(ErrorCode.DATA_LEVEL_BLOCKED, 'L2 敏感数据禁止导出原始数据行', 'err-mock')
  }
  return ok({ fileId: 'file_' + Date.now(), rows: 350, columns: 42, passed: true }).data
}

/** GET /api/v1/projects/:projectId/analysis/health-report —— 数据体检报告 */
export async function fetchHealthReport(projectId: string): Promise<
  AnalysisPageData['healthReport'] & { notes: AnalysisPageData['healthNotes'] }
> {
  if (!USE_MOCK) return request(`/projects/${projectId}/analysis/health-report`)
  await mockDelay()
  return ok({
    ...DB.ANALYSIS_DATA.healthReport,
    notes: DB.ANALYSIS_DATA.healthNotes,
  }).data
}

/** GET /api/v1/projects/:projectId/analysis/methods —— 候选统计方法清单 */
export async function fetchMethods(projectId: string): Promise<{
  methods: AnalysisPageData['methods']
  trail: AnalysisPageData['selectionTrail']
  methodSource: 'ai' | 'catalog'
}> {
  if (!USE_MOCK) return request(`/projects/${projectId}/analysis/methods`)
  await mockDelay()
  return ok({
    methods: DB.ANALYSIS_DATA.methods,
    trail: DB.ANALYSIS_DATA.selectionTrail,
    methodSource: 'catalog' as const,
  }).data
}

/**
 * POST /api/v1/projects/:projectId/analysis/methods/refresh
 * 重新生成候选统计方法清单 —— 由大模型依据**本项目**的选题 / 已确认假设 / 变量角色 / 样本量挑选，
 * 而不是固定 5 条。清单变化后旧的「已选择方法」会失效，后端会一并清空。
 */
export async function refreshMethods(payload: { projectId: string }): Promise<{
  methods: AnalysisPageData['methods']
  trail: AnalysisPageData['selectionTrail']
  methodSource: 'ai' | 'catalog'
}> {
  if (!USE_MOCK) {
    return request('/projects/analysis/methods/refresh', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
  await mockDelay(700, 1400)
  // Mock：只保留与「中介 / 调节」相关的 3 条，示意「方法清单随项目变化」，并去掉预选
  const subset = DB.ANALYSIS_DATA.methods.slice(0, 3).map((m, i) => ({ ...m, recommended: i < 2 }))
  return ok({
    methods: subset,
    trail: {
      ...DB.ANALYSIS_DATA.selectionTrail,
      candidateCount: subset.length,
      unselectedCount: subset.length,
      operatedAt: new Date().toISOString(),
      methodSource: 'catalog' as const,
    },
    methodSource: 'catalog' as const,
  }).data
}

/** POST /api/v1/projects/:projectId/analysis/run —— 执行分析（沙箱，异步） */
export async function runAnalysis(payload: {
  projectId: string
  methodId: string
  dataVersion: string
  taskName?: string
  seed?: number
  nBoot?: number
}): Promise<AsyncTask> {
  if (!USE_MOCK) return request('/projects/analysis/run', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(500, 1000)
  return ok({
    taskId: 'a7f3-20260921-0912',
    status: 'running' as const,
    progress: 0,
    etaSeconds: 25,
    message: '正在执行分析，预计需要 10‒30 秒',
  }).data
}

/** GET /api/v1/projects/:projectId/analysis/runs/:runId —— 查询分析结果 */
export async function fetchAnalysisResult(payload: {
  projectId: string
  runId: string
}): Promise<AnalysisResult> {
  if (!USE_MOCK) return request(`/projects/${payload.projectId}/analysis/runs/${payload.runId}`)
  await mockDelay(500, 900)
  return ok(DB.ANALYSIS_RESULT_SAMPLE).data
}

/** POST /api/v1/projects/:projectId/analysis/rollback —— 回滚到指定版本 */
export async function rollbackVersion(payload: {
  projectId: string
  versionNo: string
}): Promise<{ versionNo: string }> {
  if (!USE_MOCK) return request('/projects/analysis/rollback', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(400, 800)
  return ok({ versionNo: payload.versionNo }).data
}

/* ============================================================
 * 9. 论文写作
 * ========================================================== */

/** GET /api/v1/projects/:projectId/writing —— 论文写作页 */
export async function fetchWriting(projectId: string): Promise<WritingPageData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/writing`)
  await mockDelay()
  // 编辑器正文 / 引用 / 改写动作 / 作者行 / 投稿检查清单随本接口一并下发，P05·P11 不再直连 Mock 常量
  return ok({
    ...DB.WRITING_DATA,
    editorBody: DB.WRITING_EDITOR_BODY,
    editorCitations: DB.WRITING_EDITOR_CITATIONS,
    rewriteActions: DB.WRITING_REWRITE_ACTIONS,
    authorLine: DB.WRITING_AUTHOR_LINE,
    submissionChecklist: DB.WRITING_SUBMISSION_CHECKLIST,
  }).data
}

/**
 * PATCH /api/v1/projects/:projectId/writing/doc —— 保存正文（自动保存）
 * 同一接口也承载「写作模式」落库：只传 mode 时 content 可省（服务端保留原字数）。
 */
export async function saveWritingDoc(payload: {
  projectId: string
  content?: string
  section?: string
  /** 写作模式：切换模式时下发，服务端持久化，避免下次进 /writing 被默认视图弹回 */
  mode?: WritingMode
}): Promise<{ autoSavedAt: string; wordCount: number; unsavedChanges: number }> {
  if (!USE_MOCK) return request('/projects/writing/doc', { method: 'PATCH', body: JSON.stringify(payload) })
  await mockDelay(200, 400)
  // 保存成功后未保存修改数归零，并同步到 Mock 载荷（真实后端由服务端维护该计数）
  DB.WRITING_DATA.stats.unsavedChanges = 0
  if (payload.mode) DB.WRITING_DATA.mode = payload.mode
  return ok({
    autoSavedAt: new Date().toTimeString().slice(0, 5),
    wordCount: DB.WRITING_DATA.stats.wordCount,
    unsavedChanges: 0,
  }).data
}

/** POST /api/v1/projects/:projectId/writing/outline/generate —— 生成 / 重排大纲 */
export async function generateOutline(payload: { projectId: string }): Promise<WritingPageData['outline']> {
  if (!USE_MOCK) return request('/projects/writing/outline/generate', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(600, 1100)
  return ok(DB.WRITING_DATA.outline).data
}

/** POST /api/v1/projects/:projectId/writing/section/regenerate —— 重新生成本节 */
export async function regenerateSection(payload: {
  projectId: string
  section: string
}): Promise<{ paragraphs: WritingPageData['paragraphs'] }> {
  if (!USE_MOCK) return request('/projects/writing/section/regenerate', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(700, 1400)
  // 只返回**本节**的段落（与真实后端一致）：调用方用「本节新段落」替换「本节旧段落」，
  // 若这里返回整篇，会把其他章节的内容重复插进草稿。
  const scoped = DB.WRITING_DATA.paragraphs.filter((p) => p.section === payload.section)
  return ok({
    paragraphs: scoped.length
      ? scoped
      : [
          {
            ...DB.WRITING_DATA.paragraphs[0],
            paraId: 'p_' + Date.now().toString(36),
            index: 1,
            section: payload.section,
            aiGenerated: true,
            traceLabel: 'AI 生成',
            text: `（重新生成）${payload.section} 段落：围绕选题展开论述，引用限定在已核验池内。`,
          },
        ],
  }).data
}

/**
 * POST /api/v1/projects/:projectId/writing/manuscript/publish
 * 把写作页当前稿件「加入下载中心」：后端按 P1..Pn 组装全文，统计真实章节数 / 段落数 / 字数，
 * 刷新导出中心「论文正文」产物并置为可导出；文件在导出中心点导出时生成。
 */
export async function publishManuscript(payload: { projectId: string }): Promise<{
  artifactId: string
  projectTitle: string
  name: string
  metaText: string
  wordCount: number
  paragraphCount: number
  sectionCount: number
  publishedAt: string
  nextRoute: string
}> {
  if (!USE_MOCK) {
    return request('/projects/writing/manuscript/publish', { method: 'POST', body: JSON.stringify(payload) })
  }
  await mockDelay(500, 1000)
  const w = DB.WRITING_DATA
  const wordCount = w.paragraphs.reduce((n, p) => n + p.text.replace(/\s+/g, '').length, 0)
  const sectionCount = new Set(w.paragraphs.map((p) => p.section)).size
  return ok({
    artifactId: 'a_1',
    projectTitle: w.projectTitle,
    name: '论文正文（含引用）',
    metaText: `${sectionCount} 节 · ${w.paragraphs.length} 段 · ${wordCount.toLocaleString('zh-CN')} 字 · 由写作页全文组装`,
    wordCount,
    paragraphCount: w.paragraphs.length,
    sectionCount,
    publishedAt: new Date().toISOString(),
    nextRoute: `/project/${payload.projectId}/export`,
  }).data
}

/** 段落操作动作键 */
export type RewriteAction = 'rewrite' | 'shorten' | 'expand' | 'academic' | 'custom'

/**
 * POST /api/v1/projects/:projectId/writing/paragraph/rewrite —— 段落操作（重写 / 缩写 / 扩写 / 学术化改写 / 按自定义提示词改写）
 *
 * @param action    内置动作键；`custom` 表示只按 `instruction` 改写
 * @param instruction 用户自己写的提示词（可选）。填了的话，内置动作也会把这条要求一并交给模型
 */
export async function rewriteParagraph(payload: {
  projectId: string
  paraId: string
  action: RewriteAction
  instruction?: string
}): Promise<{ paraId: string; action: string; text: string }> {
  if (!USE_MOCK) return request('/projects/writing/paragraph/rewrite', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(600, 1200)
  const base = DB.WRITING_DATA.paragraphs.find((p) => p.paraId === payload.paraId)?.text ?? '（未找到该段落的原始文本）'
  const label = MOCK_ACTION_LABEL[payload.action] ?? payload.action
  const prefix = payload.instruction?.trim()
    ? `（${label}｜按提示词：${payload.instruction.trim()}）`
    : `（${label}）`
  return ok({ paraId: payload.paraId, action: payload.action, text: `${prefix}${base}` }).data
}

/** Mock 用：动作键 → 中文标签（与后端 actionMap 保持一致） */
const MOCK_ACTION_LABEL: Record<string, string> = {
  rewrite: '重写',
  shorten: '缩写',
  expand: '扩写',
  academic: '学术化改写',
  custom: '按自定义提示词改写',
}

/** POST /api/v1/projects/:projectId/writing/citation —— 插入引用 / 切换引用样式 */
export async function insertCitation(payload: {
  projectId: string
  paperId: string
  style: 'APA7' | 'GBT7714'
}): Promise<{ index: number; citationCount: number; styleSwitched: boolean }> {
  if (!USE_MOCK) return request('/projects/writing/citation', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(200, 400)
  // 插入后参考文献 +1，并递增「未保存的修改」；计数从载荷派生，不写死
  DB.WRITING_DATA.stats.citationCount += 1
  DB.WRITING_DATA.stats.unsavedChanges += 1
  return ok({
    index: DB.WRITING_DATA.stats.citationCount,
    citationCount: DB.WRITING_DATA.stats.citationCount,
    styleSwitched: true,
  }).data
}

/** POST /api/v1/projects/:projectId/writing/citation-style —— 仅切换引用样式（不新增引用条目） */
export async function switchCitationStyle(payload: {
  projectId: string
  style: 'APA7' | 'GBT7714'
}): Promise<{ style: string; citationCount: number }> {
  if (!USE_MOCK) {
    return request('/projects/writing/citation-style', { method: 'POST', body: JSON.stringify(payload) })
  }
  await mockDelay(160, 320)
  return ok({ style: payload.style, citationCount: DB.WRITING_DATA.stats.citationCount }).data
}

/** POST /api/v1/projects/:projectId/writing/ai-suggestion/adopt —— 采纳 AI 辅助建议 */
export async function adoptSuggestion(payload: {
  projectId: string
  suggestionId: string
}): Promise<{ suggestionId: string; adopted: boolean }> {
  if (!USE_MOCK) return request('/projects/writing/ai-suggestion/adopt', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(160, 320)
  return ok({ suggestionId: payload.suggestionId, adopted: true }).data
}

/** GET /api/v1/integrations/zotero/status —— Zotero 绑定状态 */
export async function fetchZoteroStatus(): Promise<WritingPageData['zotero']> {
  if (!USE_MOCK) return request('/integrations/zotero/status')
  await mockDelay(120, 260)
  return ok(DB.WRITING_DATA.zotero).data
}

/** POST /api/v1/integrations/zotero/bind —— 绑定 / 解绑 Zotero */
export async function bindZotero(payload: { bind: boolean }): Promise<WritingPageData['zotero']> {
  if (!USE_MOCK) return request('/integrations/zotero/bind', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(400, 800)
  return ok({ ...DB.WRITING_DATA.zotero, bound: payload.bind }).data
}

/* ============================================================
 * 10. 选刊 AI
 * ========================================================== */

/** GET /api/v1/projects/:projectId/journals —— 选刊页 */
export async function fetchJournals(projectId: string): Promise<JournalPageData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/journals`)
  await mockDelay()
  return ok(DB.JOURNAL_DATA).data
}

/** POST /api/v1/projects/:projectId/journals/match —— 重新匹配期刊 */
export async function rematchJournals(payload: { projectId: string }): Promise<JournalPageData['matches']> {
  if (!USE_MOCK) return request('/projects/journals/match', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(700, 1300)
  return ok(DB.JOURNAL_DATA.matches).data
}

/** GET /api/v1/journals/:journalId/profile —— 期刊画像 */
export async function fetchJournalProfile(payload: {
  journalId: string
  journalName?: string
}): Promise<JournalProfile> {
  if (!USE_MOCK) return request(`/journals/${payload.journalId}/profile`)
  await mockDelay(200, 420)
  return ok({ ...DB.JOURNAL_DATA.profile, journalId: payload.journalId }).data
}

/** POST /api/v1/projects/:projectId/submission-package —— 生成投稿包（跳转导出中心） */
export async function generateSubmissionPackage(payload: {
  projectId: string
}): Promise<{ nextRoute: string }> {
  if (!USE_MOCK) return request('/projects/submission-package', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(500, 900)
  return ok({ nextRoute: `/project/${payload.projectId}/export` }).data
}

/* ============================================================
 * 11. 模拟评审
 * ========================================================== */

/** GET /api/v1/projects/:projectId/review —— 模拟评审页 */
export async function fetchReview(projectId: string): Promise<ReviewPageData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/review`)
  await mockDelay()
  return ok(DB.REVIEW_DATA).data
}

/** POST /api/v1/projects/:projectId/review/recalibrate —— 重新校准 */
export async function recalibrateReview(payload: {
  projectId: string
  journal?: string
  field?: string
}): Promise<ReviewPageData['calibration']> {
  if (!USE_MOCK) return request('/projects/review/recalibrate', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(800, 1500)
  return ok(DB.REVIEW_DATA.calibration).data
}

/** PATCH /api/v1/projects/:projectId/review/issues/:issueId —— 处理评审意见 */
export async function handleReviewIssue(payload: {
  projectId: string
  issueId: string
  handled: ReviewIssue['handled']
}): Promise<{ issueId: string; handled: ReviewIssue['handled'] }> {
  if (!USE_MOCK)
    return request(`/projects/review/issues/${payload.issueId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  await mockDelay(160, 320)
  return ok({ issueId: payload.issueId, handled: payload.handled }).data
}

/** POST /api/v1/projects/:projectId/review/rebuttal —— 生成 Rebuttal 草稿 */
export async function generateRebuttal(payload: {
  projectId: string
  issueCodes?: string[]
}): Promise<ReviewPageData['rebuttals']> {
  if (!USE_MOCK) return request('/projects/review/rebuttal', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(900, 1600)
  return ok(DB.REVIEW_DATA.rebuttals).data
}

/* ============================================================
 * 12. 导出中心
 * ========================================================== */

/** GET /api/v1/projects/:projectId/export —— 导出中心 */
export async function fetchExportCenter(projectId: string): Promise<ExportPageData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/export`)
  await mockDelay()
  return ok(DB.EXPORT_DATA).data
}

/** POST /api/v1/projects/:projectId/export/disclosure —— 生成《AI 使用情况说明》（返回可下载文件） */
export async function generateDisclosure(payload: {
  projectId: string
}): Promise<{ reportId: string; generatedAt: string; downloadUrl?: string; fileName?: string }> {
  if (!USE_MOCK) return request('/projects/export/disclosure', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(700, 1400)
  return ok({ reportId: 'disc_' + Date.now(), generatedAt: new Date().toLocaleString('zh-CN') }).data
}

/** POST /api/v1/projects/:projectId/export/artifacts —— 导出已选产物（后端生成真实 zip 并返回下载地址） */
export async function exportArtifacts(payload: {
  projectId: string
  artifactIds: string[]
  formats: Record<string, string[]>
}): Promise<{
  downloadUrl: string
  fileName?: string
  sizeText?: string
  fileCount?: number
  blockedCount: number
  exportedCount?: number
}> {
  if (!USE_MOCK) return request('/projects/export/artifacts', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(800, 1500)
  const blocked = payload.artifactIds.filter(
    (id) => DB.EXPORT_DATA.artifacts.find((a) => a.artifactId === id)?.blocked,
  ).length
  if (blocked > 0) {
    throw new ApiError(
      ErrorCode.EXPORT_BLOCKED_BY_VERIFY,
      `存在 ${blocked} 项待补齐产物，已阻断导出`,
      'err-mock',
    )
  }
  // Mock 模式不产出真实文件，downloadUrl 留空由页面跳过下载
  return ok({ downloadUrl: '', blockedCount: 0, exportedCount: payload.artifactIds.length }).data
}

/** POST /api/v1/projects/:projectId/export/confirm-unverified —— 「我已确认，允许导出」 */
export async function confirmUnverifiedExport(payload: {
  projectId: string
}): Promise<{ confirmed: boolean }> {
  if (!USE_MOCK) return request('/projects/export/confirm-unverified', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(300, 600)
  return ok({ confirmed: true }).data
}

/** POST /api/v1/projects/:projectId/export/upload-pdf —— 上传文献 PDF 核验 */
export async function uploadVerifyPdf(payload: {
  projectId: string
  file: File
}): Promise<{ verified: boolean }> {
  if (!USE_MOCK) return request('/projects/export/upload-pdf', { method: 'POST' })
  await mockDelay(700, 1300)
  return ok({ verified: true }).data
}

/* ============================================================
 * 13. 项目设置
 * ========================================================== */

/** GET /api/v1/projects/:projectId/settings —— 项目设置页 */
export async function fetchProjectSettings(projectId: string): Promise<ProjectSettingsData> {
  if (!USE_MOCK) return request(`/projects/${projectId}/settings`)
  await mockDelay()
  return ok(DB.PROJECT_SETTINGS_DATA).data
}

/** PATCH /api/v1/projects/:projectId —— 保存项目基础信息 */
export async function updateProject(payload: {
  projectId: string
  title?: string
  discipline?: string
  route?: Project['route']
  ddlNodes?: { nodeId: string; date: string }[]
}): Promise<{ savedAt: string }> {
  if (!USE_MOCK) return request(`/projects/${payload.projectId}`, { method: 'PATCH', body: JSON.stringify(payload) })
  await mockDelay(400, 800)
  return ok({ savedAt: new Date().toLocaleString('zh-CN') }).data
}

/**
 * DELETE /api/v1/projects/:projectId —— 删除项目
 *
 * 服务端会级联清除该项目的全部关联数据（成员 / 文献 / 分析 / 文稿 / 导出状态等），
 * 并一并清理磁盘上已生成的导出包。操作不可撤销。
 */
export async function deleteProject(payload: {
  projectId: string
}): Promise<{ projectId: string; deleted: boolean; deletedAt?: string }> {
  if (!USE_MOCK) {
    return request(`/projects/${payload.projectId}`, { method: 'DELETE' })
  }
  await mockDelay(400, 900)
  const exists = DB.PROJECTS.some((p) => p.projectId === payload.projectId)
  if (!exists) throw new ApiError(ErrorCode.NOT_FOUND, '项目不存在', 'err-mock')
  DB.unregisterProject(payload.projectId)
  return ok({ projectId: payload.projectId, deleted: true, deletedAt: new Date().toLocaleString('zh-CN') }).data
}

/** PATCH /api/v1/projects/:projectId/data-level —— 保存数据定级（全局横切规则） */
export async function updateDataLevel(payload: {
  projectId: string
  dataLevel: DataLevel
}): Promise<{ dataLevel: DataLevel; impact: string }> {
  if (!USE_MOCK) return request('/projects/data-level', { method: 'PATCH', body: JSON.stringify(payload) })
  await mockDelay(500, 900)
  applyDataLevel(payload.projectId, payload.dataLevel)
  return ok({ dataLevel: payload.dataLevel, impact: DB.PROJECT_SETTINGS_DATA.dataLevelChangeImpact }).data
}

/** POST /api/v1/projects/:projectId/members/invite —— 邀请成员 */
export async function inviteMember(payload: {
  projectId: string
  account: string
  role: string
}): Promise<{ inviteId: string }> {
  if (!USE_MOCK) return request('/projects/members/invite', { method: 'POST', body: JSON.stringify(payload) })
  await mockDelay(500, 900)
  return ok({ inviteId: 'inv_' + Date.now() }).data
}

/** POST /api/v1/projects/:projectId/versions/:versionNo/rollback —— 回滚版本 */
export async function rollbackProjectVersion(payload: {
  projectId: string
  versionNo: string
}): Promise<{ versionNo: string; rollbackAt: string }> {
  if (!USE_MOCK)
    return request(`/projects/${payload.projectId}/versions/${payload.versionNo}/rollback`, { method: 'POST' })
  await mockDelay(600, 1100)
  return ok({ versionNo: payload.versionNo, rollbackAt: new Date().toLocaleString('zh-CN') }).data
}

/* ============================================================
 * 13.9 流程进度与断点续做
 * ==========================================================
 * 需求：新建项目后用户未走完流程就离开，下次回到**他停下的那一步**并把未提交内容带出来。
 * ========================================================== */

/** GET /api/v1/projects/:projectId/progress —— 项目流程进度 */
export async function fetchProjectProgress(projectId: string): Promise<ProjectProgress> {
  if (!USE_MOCK) return request(`/projects/${projectId}/progress`)
  await mockDelay(140, 300)
  return ok(DB.getProjectProgress(projectId)).data
}

/**
 * PATCH /api/v1/projects/:projectId/progress —— 记录「到达 / 完成某一步」
 * 前端在进入某步（inProgress）与该步提交成功（done）时各调一次；
 * 服务端据此算出「停下的那一步」与 resumeRoute，供下次「继续上次」使用。
 */
export async function saveProjectProgress(payload: {
  projectId: string
  stepKey: string
  status: FlowStepProgress['status']
}): Promise<ProjectProgress> {
  if (!USE_MOCK) return request('/projects/progress', { method: 'PATCH', body: JSON.stringify(payload) })
  await mockDelay(120, 260)
  return ok(DB.recordStep(payload.projectId, payload.stepKey, payload.status)).data
}

/** GET /api/v1/projects/:projectId/steps/:stepKey/draft —— 读取某步未提交的草稿 */
export async function fetchStepDraft(payload: { projectId: string; stepKey: string }): Promise<StepDraft> {
  if (!USE_MOCK) return request(`/projects/${payload.projectId}/steps/${payload.stepKey}/draft`)
  await mockDelay(120, 240)
  return ok(DB.getStepDraft(payload.projectId, payload.stepKey)).data
}

/** PATCH /api/v1/projects/:projectId/steps/:stepKey/draft —— 保存草稿（合并写入） */
export async function saveStepDraft(payload: {
  projectId: string
  stepKey: string
  draft: StepDraft
}): Promise<StepDraft> {
  if (!USE_MOCK)
    return request(`/projects/${payload.projectId}/steps/${payload.stepKey}/draft`, {
      method: 'PATCH',
      body: JSON.stringify({ draft: payload.draft }),
    })
  await mockDelay(120, 260)
  return ok(DB.mergeStepDraft(payload.projectId, payload.stepKey, payload.draft)).data
}

/* ============================================================
 * 14. 供文档 / 调试引用
 * ========================================================== */
export const ENDPOINT_REGISTRY = {
  login: 'POST /auth/login',
  sendSmsCode: 'POST /auth/sms-code',
  logout: 'POST /auth/logout',
  fetchMe: 'GET /me',
  fetchStudentVerification: 'GET /me/student-verification',
  submitStudentVerification: 'POST /me/student-verification',
  fetchAccountSettings: 'GET /me/account',
  fetchNotifications: 'GET /me/notifications',
  markNotificationsRead: 'POST /me/notifications/read',
  fetchProjectProgress: 'GET /projects/:projectId/progress',
  saveProjectProgress: 'PATCH /projects/:projectId/progress',
  fetchStepDraft: 'GET /projects/:projectId/steps/:stepKey/draft',
  saveStepDraft: 'PATCH /projects/:projectId/steps/:stepKey/draft',
  updateMe: 'PATCH /me',
  revokeOtherDevices: 'POST /me/devices/revoke-others',
  updateNotificationPrefs: 'PATCH /me/notifications',
  updatePrivacy: 'PATCH /me/privacy',
  requestDataExport: 'POST /me/data-export',
  deleteAccount: 'DELETE /me',
  fetchPlans: 'GET /plans',
  fetchQuota: 'GET /me/quota',
  changePlan: 'POST /me/plan',
  fetchProjects: 'GET /projects',
  fetchProject: 'GET /projects/:projectId',
  createProject: 'POST /projects',
  fetchAllDdlTimeline: 'GET /projects/ddl',
  fetchDdlKeywords: 'GET /projects/ddl-keywords',
  updateDdlKeyword: 'PATCH /projects/:projectId/ddl-keyword',
  fetchProjectCompliance: 'GET /projects/:projectId/compliance',
  updateSkipConfirm: 'PATCH /projects/:projectId/skip-confirm',
  fetchStageArtifacts: 'GET /projects/:projectId/stage-artifacts',
  fetchHotspot: 'GET /projects/:projectId/intro/hotspot',
  analyzeHotspot: 'POST /projects/:projectId/intro/hotspot/analyze',
  confirmDirection: 'POST /projects/:projectId/intro/confirm-direction',
  fetchTopicKeywords: 'GET /projects/:projectId/intro/topic/keywords',
  analyzeTopicKeywords: 'POST /projects/:projectId/intro/topic/keywords/analyze',
  lockConcepts: 'POST /projects/:projectId/intro/topic/keywords/lock',
  fetchTopicTheory: 'GET /projects/:projectId/intro/topic/theory',
  selectTheory: 'POST /projects/:projectId/intro/topic/theory/select',
  fetchDataUpload: 'GET /projects/:projectId/data/upload',
  uploadDataFile: 'POST /projects/:projectId/data/files',
  removeDataFile: 'DELETE /projects/:projectId/data/files/:fileId',
  importPublicDataset: 'POST /projects/:projectId/data/import-public',
  loadSampleDataset: 'POST /projects/:projectId/data/sample/:sampleId',
  fetchVariables: 'GET /projects/:projectId/data/variables',
  updateVariable: 'PATCH /projects/:projectId/data/variables/:varName',
  confirmVariables: 'POST /projects/:projectId/data/variables/confirm',
  fetchHypotheses: 'GET /projects/:projectId/data/hypotheses',
  generateHypotheses: 'POST /projects/:projectId/data/hypotheses/generate',
  confirmHypotheses: 'POST /projects/:projectId/data/hypotheses/confirm',
  fetchLiterature: 'GET /projects/:projectId/literature',
  searchLiterature: 'POST /projects/:projectId/literature/search',
  updateSelection: 'POST /projects/:projectId/literature/selection',
  uploadLiterature: 'POST /projects/:projectId/literature/upload',
  generateStructuredReview: 'POST /projects/:projectId/literature/generate-review',
  fetchTask: 'GET /tasks/:taskId',
  verifyLiterature: 'POST /projects/:projectId/literature/verify',
  askKnowledgeBase: 'POST /projects/:projectId/kb/qa',
  bringToWriting: 'POST /projects/:projectId/literature/bring-to-writing',
  fetchAnalysis: 'GET /projects/:projectId/analysis',
  importProjectData: 'POST /projects/:projectId/analysis/import',
  fetchHealthReport: 'GET /projects/:projectId/analysis/health-report',
  fetchMethods: 'GET /projects/:projectId/analysis/methods',
  refreshMethods: 'POST /projects/:projectId/analysis/methods/refresh',
  runAnalysis: 'POST /projects/:projectId/analysis/run',
  fetchAnalysisResult: 'GET /projects/:projectId/analysis/runs/:runId',
  rollbackVersion: 'POST /projects/:projectId/analysis/rollback',
  fetchWriting: 'GET /projects/:projectId/writing',
  saveWritingDoc: 'PATCH /projects/:projectId/writing/doc',
  generateOutline: 'POST /projects/:projectId/writing/outline/generate',
  regenerateSection: 'POST /projects/:projectId/writing/section/regenerate',
  publishManuscript: 'POST /projects/:projectId/writing/manuscript/publish',
  rewriteParagraph: 'POST /projects/:projectId/writing/paragraph/rewrite',
  insertCitation: 'POST /projects/:projectId/writing/citation',
  switchCitationStyle: 'POST /projects/:projectId/writing/citation-style',
  adoptSuggestion: 'POST /projects/:projectId/writing/ai-suggestion/adopt',
  fetchZoteroStatus: 'GET /integrations/zotero/status',
  bindZotero: 'POST /integrations/zotero/bind',
  fetchJournals: 'GET /projects/:projectId/journals',
  rematchJournals: 'POST /projects/:projectId/journals/match',
  fetchJournalProfile: 'GET /journals/:journalId/profile',
  generateSubmissionPackage: 'POST /projects/:projectId/submission-package',
  fetchReview: 'GET /projects/:projectId/review',
  recalibrateReview: 'POST /projects/:projectId/review/recalibrate',
  handleReviewIssue: 'PATCH /projects/:projectId/review/issues/:issueId',
  generateRebuttal: 'POST /projects/:projectId/review/rebuttal',
  fetchExportCenter: 'GET /projects/:projectId/export',
  generateDisclosure: 'POST /projects/:projectId/export/disclosure',
  exportArtifacts: 'POST /projects/:projectId/export/artifacts',
  confirmUnverifiedExport: 'POST /projects/:projectId/export/confirm-unverified',
  uploadVerifyPdf: 'POST /projects/:projectId/export/upload-pdf',
  fetchProjectSettings: 'GET /projects/:projectId/settings',
  updateProject: 'PATCH /projects/:projectId',
  deleteProject: 'DELETE /projects/:projectId',
  updateDataLevel: 'PATCH /projects/:projectId/data-level',
  inviteMember: 'POST /projects/:projectId/members/invite',
  rollbackProjectVersion: 'POST /projects/:projectId/versions/:versionNo/rollback',
} as const

/**
 * 轮询异步任务直到结束。
 * - Mock 模式：模拟进度条（原行为不变）。
 * - 真实模式：真正轮询 GET /tasks/:taskId，用后端真实进度驱动 onTick；
 *   succeeded 返回任务（含 result），failed 抛 TASK_FAILED 错误，10 分钟超时兜底。
 */
export async function pollTask(
  taskId: string,
  onTick: (progress: number) => void,
  totalMs = 3000,
): Promise<AsyncTask> {
  if (USE_MOCK) {
    const steps = 20
    for (let i = 1; i <= steps; i++) {
      await sleep(totalMs / steps)
      onTick(Math.round((i / steps) * 100))
    }
    return { taskId, status: 'succeeded', progress: 100, finishedAt: new Date().toLocaleString('zh-CN') }
  }

  const intervalMs = 1200
  const maxMs = 10 * 60 * 1000
  const deadline = Date.now() + maxMs
  for (;;) {
    const task = await request<AsyncTask>(`/tasks/${taskId}`)
    onTick(task.progress)
    if (task.status === 'succeeded') return task
    if (task.status === 'failed') {
      throw new ApiError(ErrorCode.TASK_FAILED, task.message || '任务执行失败')
    }
    if (Date.now() > deadline) {
      throw new ApiError(ErrorCode.TASK_FAILED, '任务超时（10 分钟），请稍后在任务状态里查看结果')
    }
    await sleep(intervalMs)
  }
}
