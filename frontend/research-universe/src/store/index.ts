/**
 * Zustand 状态管理
 * 分层：全局（ui / auth） → 项目级（project） → 流程级（dataFlow / analysis / writing / export / review / settings）
 * 约定：只把「跨页面共享 + 需要持久化」的状态放进 store，页面局部状态用 useState。
 */
import { create } from 'zustand'
import type {
  AnalysisPageData,
  AnalysisResult,
  AsyncTask,
  AuthState,
  ConfirmDialogConfig,
  DataLevel,
  ExportArtifact,
  Hypothesis,
  Plan,
  Project,
  QuotaUsage,
  ReviewIssue,
  StudentVerification,
  TaskDialogConfig,
  ToastItem,
  UploadedFile,
  UserInfo,
  VariableItem,
  VariableRole,
  WritingMode,
} from '@/types'
import * as DB from '@/mocks/db'

/* ============================================================
 * 全局 UI：Toast / 确认弹窗 / 任务弹窗
 * ========================================================== */

interface UiState {
  toasts: ToastItem[]
  confirmDialog: ConfirmDialogConfig
  taskDialog: TaskDialogConfig
  globalLoading: boolean
  pushToast: (t: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void
  openConfirm: (c: Omit<ConfirmDialogConfig, 'open'>) => void
  closeConfirm: () => void
  openTaskDialog: (t: Omit<TaskDialogConfig, 'open'>) => void
  updateTaskDialog: (patch: Partial<TaskDialogConfig>) => void
  closeTaskDialog: () => void
  setGlobalLoading: (v: boolean) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  globalLoading: false,
  confirmDialog: {
    open: false,
    tone: 'info',
    title: '',
    description: '',
    confirmText: '确认',
    cancelText: '取消',
  },
  taskDialog: { open: false, phase: 'running', title: '', description: '' },
  pushToast: (t) => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).slice(2, 6)
    set({ toasts: [...get().toasts, { ...t, id }] })
    // 3.6s 后自动消失
    setTimeout(() => get().dismissToast(id), 3600)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
  openConfirm: (c) => set({ confirmDialog: { ...c, open: true } }),
  closeConfirm: () =>
    set({ confirmDialog: { ...get().confirmDialog, open: false, onConfirm: undefined } }),
  openTaskDialog: (t) => set({ taskDialog: { ...t, open: true } }),
  updateTaskDialog: (patch) => set({ taskDialog: { ...get().taskDialog, ...patch } }),
  closeTaskDialog: () => set({ taskDialog: { ...get().taskDialog, open: false } }),
  setGlobalLoading: (v) => set({ globalLoading: v }),
}))

/* ============================================================
 * 认证 / 用户 / 套餐
 * ========================================================== */

/**
 * 读取本地登录凭证。
 * 说明：**登录态只由 token 决定，不由示例用户决定** —— 此前这里把 `auth` 初始化成
 * `{ loggedIn: true, user: 陈同学 }`，导致退出登录后（或新开标签页时）系统又「自动」
 * 变成了陈同学的账号，且退出后理应停在登录/注册页却被放行进了工作台。
 */
function readToken(): string | null {
  try {
    return localStorage.getItem('ru_token')
  } catch {
    return null
  }
}

/** 登录快照的本地缓存键：存 token + 用户资料 + 认证状态，供刷新页面时秒级还原 */
export const AUTH_CACHE_KEY = 'ru_auth_cache'

interface AuthCache {
  auth?: AuthState
  verification?: StudentVerification
}

function readAuthCache(): AuthCache {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY)
    return raw ? (JSON.parse(raw) as AuthCache) : {}
  } catch {
    return {}
  }
}

/** 写入 / 清除登录快照。退出登录、401 失效时必须清掉，否则会把「僵尸登录态」带回来 */
export function writeAuthCache(snapshot: AuthCache | null) {
  try {
    if (snapshot) localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(snapshot))
    else localStorage.removeItem(AUTH_CACHE_KEY)
  } catch {
    /* 忽略隐私模式等异常 */
  }
}

const INITIAL_TOKEN = readToken()
const INITIAL_CACHE = readAuthCache()

const UNVERIFIED: StudentVerification = { verified: false, channel: 'none', benefitsSynced: false, graceDays: 90 }

interface AuthStoreState {
  auth: AuthState
  verification: StudentVerification
  plan: Plan['planId']
  quota: QuotaUsage
  /** 登录态检查是否完成 */
  bootstrapped: boolean
  /** 退出即锁定高级功能 */
  permissions: {
    canExport: boolean
    canSetDataLevel: boolean
    canGenerateDisclosure: boolean
  }
  setAuth: (a: AuthState) => void
  setUser: (u: UserInfo) => void
  setVerification: (v: StudentVerification) => void
  setQuota: (q: QuotaUsage) => void
  setPlan: (p: Plan['planId']) => void
  setBootstrapped: (v: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  /**
   * 有 token 才算登录。用户资料优先用本地缓存的快照先把顶栏填上（避免刷新后顶栏
   * 短时/长期显示「未登录」），随后由 RequireAuth 的会话水合拉 `/me` 校正。
   */
  auth: {
    loggedIn: !!INITIAL_TOKEN,
    token: INITIAL_TOKEN,
    user: INITIAL_TOKEN ? (INITIAL_CACHE.auth?.user ?? null) : null,
  },
  /** 认证状态同样优先用缓存；没有缓存时默认「未认证」，一律以服务端返回为准 */
  verification: INITIAL_CACHE.verification ?? UNVERIFIED,
  plan: DB.QUOTA_USAGE.planId,
  quota: DB.QUOTA_USAGE,
  bootstrapped: false,
  /** 未完成登录检查前先按「无权限」处理，避免退出后仍能导出 */
  permissions: { canExport: false, canSetDataLevel: false, canGenerateDisclosure: false },
  setAuth: (auth) => {
    const permissions = auth.loggedIn
      ? { canExport: true, canSetDataLevel: true, canGenerateDisclosure: true }
      : { canExport: false, canSetDataLevel: false, canGenerateDisclosure: false }
    set({ auth, permissions })
    writeAuthCache(auth.loggedIn ? { auth, verification: get().verification } : null)
  },
  setUser: (user) => {
    const auth = { ...get().auth, user }
    set({ auth })
    if (auth.loggedIn) writeAuthCache({ auth, verification: get().verification })
  },
  setVerification: (verification) => {
    set({ verification })
    if (get().auth.loggedIn) writeAuthCache({ auth: get().auth, verification })
  },
  setQuota: (quota) => set({ quota }),
  setPlan: (plan) => set({ plan }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
  reset: () => {
    // 退出登录：同时清掉本地快照，否则下次打开又会「自动登录」
    writeAuthCache(null)
    set({
      auth: { loggedIn: false, token: null, user: null },
      verification: UNVERIFIED,
      permissions: { canExport: false, canSetDataLevel: false, canGenerateDisclosure: false },
    })
  },
}))

/* ============================================================
 * 项目
 * ========================================================== */

/**
 * 「本次会话是否已确定过项目」记忆在 sessionStorage：
 * - 刷新页面（F5 / 重开同一标签）不会再次弹出「选择项目」对话框；
 * - 新开标签页 / 重新登录视为新会话，需要时才会再提示一次。
 * 只影响「自动弹出」这一件事，手动点项目名切换始终可用。
 */
const PROJECT_CHOSEN_KEY = 'ru_project_chosen'

function readProjectChosen(): boolean {
  try {
    return sessionStorage.getItem(PROJECT_CHOSEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeProjectChosen(chosen: boolean) {
  try {
    if (chosen) sessionStorage.setItem(PROJECT_CHOSEN_KEY, '1')
    else sessionStorage.removeItem(PROJECT_CHOSEN_KEY)
  } catch {
    /* 忽略隐私模式等异常 */
  }
}

interface ProjectStoreState {
  projects: Project[]
  currentProjectId: string
  loading: boolean
  setProjects: (p: Project[]) => void
  setCurrentProject: (id: string) => void
  setLoading: (v: boolean) => void
  patchProject: (id: string, patch: Partial<Project>) => void
  /** 项目切换对话框开关（点导航栏里的项目名打开） */
  switcherOpen: boolean
  openSwitcher: () => void
  closeSwitcher: () => void
  /** 用户是否已确定过项目：true 时不再自动弹出选择对话框（手动切换不受影响） */
  hasChosenProject: boolean
  markProjectChosen: () => void
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: DB.PROJECTS,
  currentProjectId: DB.CURRENT_PROJECT_ID,
  loading: false,
  switcherOpen: false,
  hasChosenProject: readProjectChosen(),
  openSwitcher: () => set({ switcherOpen: true }),
  closeSwitcher: () => set({ switcherOpen: false }),
  markProjectChosen: () => {
    writeProjectChosen(true)
    set({ hasChosenProject: true })
  },
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (currentProjectId) => set({ currentProjectId }),
  setLoading: (loading) => set({ loading }),
  patchProject: (id, patch) =>
    set({ projects: get().projects.map((p) => (p.projectId === id ? { ...p, ...patch } : p)) }),
}))

/* ============================================================
 * 数据驱动流程（P16 → P17 → P18）
 * ========================================================== */

interface DataFlowState {
  uploadedFiles: UploadedFile[]
  /**
   * 注意：数据级别不在这里维护。
   * 项目定级（L0/L1/L2）已收敛到 `useSettingsStore.draftDataLevel / savedDataLevel`，
   * 由 `GET /projects/:projectId/compliance` 载入，P10 / P16 共用；
   * 服务端自动检测值仍在 `DataUploadData.detectedDataLevel` 里随接口下发，仅作展示。
   */
  variables: VariableItem[]
  variableFilter: VariableRole | 'all'
  hypotheses: Hypothesis[]
  /** 用户是否在对话里说过话 */
  chatInput: string
  showAnalysisTypeDialog: boolean
  setUploadedFiles: (f: UploadedFile[]) => void
  addUploadedFile: (f: UploadedFile) => void
  removeUploadedFile: (fileId: string) => void
  setVariables: (v: VariableItem[]) => void
  updateVariableRole: (varName: string, role: VariableRole) => void
  setVariableFilter: (f: VariableRole | 'all') => void
  setHypotheses: (h: Hypothesis[]) => void
  setHypothesisStatus: (id: string, status: Hypothesis['status']) => void
  setChatInput: (v: string) => void
  setShowAnalysisTypeDialog: (v: boolean) => void
}

export const useDataFlowStore = create<DataFlowState>((set, get) => ({
  /**
   * 已上传文件由**接口响应**作为真源：初始为空，进入 P16 时用 `fetchDataUpload` 的
   * `uploadedFiles` 填充（见 IntroDataUpload.load）。这样新建项目不会继承示例项目的文件列表。
   */
  uploadedFiles: [],
  variables: DB.VARIABLE_IDENTIFY.variables,
  variableFilter: 'all',
  hypotheses: DB.HYPOTHESIS_DATA.hypotheses,
  chatInput: '',
  showAnalysisTypeDialog: false,
  setUploadedFiles: (uploadedFiles) => set({ uploadedFiles }),
  addUploadedFile: (f) => set({ uploadedFiles: [...get().uploadedFiles, f] }),
  removeUploadedFile: (fileId) => set({ uploadedFiles: get().uploadedFiles.filter((f) => f.fileId !== fileId) }),
  setVariables: (variables) => set({ variables }),
  updateVariableRole: (varName, role) =>
    set({ variables: get().variables.map((v) => (v.varName === varName ? { ...v, overriddenRole: role } : v)) }),
  setVariableFilter: (variableFilter) => set({ variableFilter }),
  setHypotheses: (hypotheses) => set({ hypotheses }),
  setHypothesisStatus: (id, status) =>
    set({ hypotheses: get().hypotheses.map((h) => (h.hypothesisId === id ? { ...h, status } : h)) }),
  setChatInput: (chatInput) => set({ chatInput }),
  setShowAnalysisTypeDialog: (showAnalysisTypeDialog) => set({ showAnalysisTypeDialog }),
}))

/* ============================================================
 * 数据分析
 * ========================================================== */

interface AnalysisState {
  data: AnalysisPageData | null
  selectedMethodId: string | null
  runTask: AsyncTask | null
  result: AnalysisResult | null
  renameTarget: { open: boolean; taskName: string; analysisType: string }
  setData: (d: AnalysisPageData | null) => void
  selectMethod: (id: string) => void
  /** 清空已选方法（方法清单被重新生成后，旧的选择不再有效） */
  clearMethod: () => void
  setRunTask: (t: AsyncTask | null) => void
  patchRunTask: (patch: Partial<AsyncTask>) => void
  setResult: (r: AnalysisResult | null) => void
  openRename: () => void
  closeRename: () => void
  setRenameName: (v: string) => void
  setRenameType: (v: string) => void
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  data: null,
  selectedMethodId: null,
  runTask: null,
  result: null,
  renameTarget: { open: false, taskName: '', analysisType: '数据驱动' },
  setData: (data) => set({ data }),
  selectMethod: (selectedMethodId) => set({ selectedMethodId }),
  clearMethod: () => set({ selectedMethodId: null }),
  setRunTask: (runTask) => set({ runTask }),
  patchRunTask: (patch) => {
    const cur = get().runTask
    set({ runTask: cur ? { ...cur, ...patch } : null })
  },
  setResult: (result) => set({ result }),
  openRename: () => set({ renameTarget: { ...get().renameTarget, open: true } }),
  closeRename: () => set({ renameTarget: { ...get().renameTarget, open: false } }),
  setRenameName: (taskName) => set({ renameTarget: { ...get().renameTarget, taskName } }),
  setRenameType: (analysisType) => set({ renameTarget: { ...get().renameTarget, analysisType } }),
}))

/* ============================================================
 * 论文写作
 * ========================================================== */

interface WritingState {
  mode: WritingMode
  /**
   * 用户是否在本次会话里显式切换过写作模式。
   * 背景：/writing 与 /writing/editor 是「模式 ↔ 视图」一一对应的两套界面，
   * 服务端下发的 mode 只是**默认视图**。此前服务端恒为 aiAssist 且本地选择不落库，
   * 于是点「AI 全文生成」后跳到 /writing 又被默认视图弹回编辑器，表现为「点了没反应」。
   * 现在：显式选择会落库（PATCH /writing/doc），本标记用于落库失败时兜底，
   * 保证本次会话内不再被服务端默认值覆写。
   */
  modePinned: boolean
  citationStyle: 'APA7' | 'GBT7714'
  adoptedSuggestionIds: string[]
  autoSavedAt: string
  saving: boolean
  setMode: (m: WritingMode) => void
  /** 用户显式选定模式：写入 mode 并打上「用户已选」标记 */
  pinMode: (m: WritingMode) => void
  setCitationStyle: (s: 'APA7' | 'GBT7714') => void
  adoptSuggestion: (id: string) => void
  setAutoSavedAt: (v: string) => void
  setSaving: (v: boolean) => void
}

export const useWritingStore = create<WritingState>((set, get) => ({
  mode: 'aiFull',
  modePinned: false,
  citationStyle: 'APA7',
  adoptedSuggestionIds: [],
  autoSavedAt: DB.WRITING_DATA.autoSavedAt,
  saving: false,
  setMode: (mode) => set({ mode }),
  pinMode: (mode) => set({ mode, modePinned: true }),
  setCitationStyle: (citationStyle) => set({ citationStyle }),
  adoptSuggestion: (id) => set({ adoptedSuggestionIds: [...get().adoptedSuggestionIds, id] }),
  setAutoSavedAt: (autoSavedAt) => set({ autoSavedAt }),
  setSaving: (saving) => set({ saving }),
}))

/* ============================================================
 * 导出中心
 * ========================================================== */

/**
 * 产物导出格式的默认选择：优先「PDF」→「docx」→「zip」→「md」，都没有时取第一个。
 *
 * 背景（测试反馈「未选格式就导不出去」）：此前 placeholder 只取 `formats` 的最后一项，
 * 而且 `selectedFormats` 是**模块初始化时**按示例数据算好的，真实项目加载回来后并不会重算，
 * 于是页面上没有任何格式处于选中态，导出请求里带的是空数组 → 导出直接失败。
 * 现在统一由本函数在每次载入产物时重新计算默认值。
 */
export function defaultExportFormat(formats: string[]): string | undefined {
  if (!formats.length) return undefined
  const preferred = ['pdf', 'docx', 'doc', 'zip', 'md']
  for (const p of preferred) {
    const hit = formats.find((f) => f.toLowerCase() === p)
    if (hit) return hit
  }
  return formats[0]
}

interface ExportState {
  artifacts: ExportArtifact[]
  selectedArtifactIds: string[]
  selectedFormats: Record<string, string>
  disclosureGeneratedAt: string | null
  unverifiedConfirmed: boolean
  setArtifacts: (a: ExportArtifact[]) => void
  toggleArtifact: (id: string) => void
  toggleAll: () => void
  setFormat: (artifactId: string, format: string) => void
  setDisclosureGeneratedAt: (v: string) => void
  setUnverifiedConfirmed: (v: boolean) => void
}

export const useExportStore = create<ExportState>((set, get) => ({
  artifacts: DB.EXPORT_DATA.artifacts,
  selectedArtifactIds: DB.EXPORT_DATA.artifacts.filter((a) => a.status === 'ready').map((a) => a.artifactId),
  selectedFormats: DB.EXPORT_DATA.artifacts.reduce<Record<string, string>>((acc, a) => {
    const fmt = defaultExportFormat(a.formats)
    if (fmt) acc[a.artifactId] = fmt
    return acc
  }, {}),
  disclosureGeneratedAt: null,
  unverifiedConfirmed: false,
  /**
   * 载入产物时**同时重建选中项与格式选中态**：
   * - 选中项只含「已就绪」产物（待补齐的不能导出）；
   * - 每个有可导出格式的产物都预置一个默认格式，保证「直接点导出」不会因为没选格式而失败。
   */
  setArtifacts: (artifacts) =>
    set({
      artifacts,
      selectedArtifactIds: artifacts.filter((a) => a.status === 'ready').map((a) => a.artifactId),
      selectedFormats: artifacts.reduce<Record<string, string>>((acc, a) => {
        const fmt = defaultExportFormat(a.formats)
        if (fmt) acc[a.artifactId] = fmt
        return acc
      }, {}),
    }),
  toggleArtifact: (id) => {
    const cur = get().selectedArtifactIds
    const isSelected = cur.includes(id)
    const patch: Partial<ExportState> = {
      selectedArtifactIds: isSelected ? cur.filter((x) => x !== id) : [...cur, id],
    }
    // 勾选时若该产物还没有格式，顺手补一个默认值（避免「只勾选、不选格式」导致导出失败）
    if (!isSelected) {
      const artifact = get().artifacts.find((a) => a.artifactId === id)
      const fmt = get().selectedFormats[id] ?? (artifact ? defaultExportFormat(artifact.formats) : undefined)
      if (fmt) patch.selectedFormats = { ...get().selectedFormats, [id]: fmt }
    }
    set(patch)
  },
  toggleAll: () => {
    const ready = get().artifacts.filter((a) => a.status === 'ready').map((a) => a.artifactId)
    set({ selectedArtifactIds: get().selectedArtifactIds.length === ready.length ? [] : ready })
  },
  setFormat: (artifactId, format) =>
    set({ selectedFormats: { ...get().selectedFormats, [artifactId]: format } }),
  setDisclosureGeneratedAt: (disclosureGeneratedAt) => set({ disclosureGeneratedAt }),
  setUnverifiedConfirmed: (unverifiedConfirmed) => set({ unverifiedConfirmed }),
}))

/* ============================================================
 * 模拟评审
 * ========================================================== */

interface ReviewState {
  issues: ReviewIssue[]
  calibratedAt: string
  rebuttalDrafts: number
  setIssues: (i: ReviewIssue[]) => void
  setIssueHandled: (issueId: string, handled: ReviewIssue['handled']) => void
  setCalibratedAt: (v: string) => void
  setRebuttalDrafts: (n: number) => void
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  issues: DB.REVIEW_DATA.issues,
  calibratedAt: DB.REVIEW_DATA.calibration.calibratedAt,
  rebuttalDrafts: DB.REVIEW_DATA.rebuttals.length,
  setIssues: (issues) => set({ issues }),
  setIssueHandled: (issueId, handled) =>
    set({ issues: get().issues.map((i) => (i.issueId === issueId ? { ...i, handled } : i)) }),
  setCalibratedAt: (calibratedAt) => set({ calibratedAt }),
  setRebuttalDrafts: (rebuttalDrafts) => set({ rebuttalDrafts }),
}))

/* ============================================================
 * 项目设置 / 合规
 * 说明：数据级别与「跳过逐条确认（YOLO）」原先在 P03 / P16 / P10 各存一份，
 *      三处会互相矛盾。现在统一收敛到本 store，由
 *      `GET /projects/:projectId/compliance` 载入，三处入口共用同一份状态。
 * ========================================================== */

interface SettingsState {
  /** 草稿态数据级别（未保存前不影响全局） */
  draftDataLevel: DataLevel
  savedDataLevel: DataLevel
  /** 项目级「跳过逐条确认（YOLO）」；L2 项目由服务端强制为 false */
  skipConfirm: boolean
  /** 合规设置是否已从服务端载入（用于避免用默认值覆盖真实值） */
  complianceHydrated: boolean
  inviteDialogOpen: boolean
  setDraftDataLevel: (l: DataLevel) => void
  setSavedDataLevel: (l: DataLevel) => void
  setSkipConfirm: (v: boolean) => void
  /** 用服务端返回值覆盖本地（草稿与已保存同时对齐） */
  hydrateCompliance: (s: { dataLevel: DataLevel; skipConfirm: boolean }) => void
  setInviteDialogOpen: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  draftDataLevel: 'L1',
  savedDataLevel: 'L1',
  skipConfirm: false,
  complianceHydrated: false,
  inviteDialogOpen: false,
  setDraftDataLevel: (draftDataLevel) => set({ draftDataLevel }),
  setSavedDataLevel: (savedDataLevel) => set({ savedDataLevel, draftDataLevel: savedDataLevel }),
  setSkipConfirm: (skipConfirm) => set({ skipConfirm }),
  hydrateCompliance: ({ dataLevel, skipConfirm }) =>
    set({ draftDataLevel: dataLevel, savedDataLevel: dataLevel, skipConfirm, complianceHydrated: true }),
  setInviteDialogOpen: (inviteDialogOpen) => set({ inviteDialogOpen }),
}))
