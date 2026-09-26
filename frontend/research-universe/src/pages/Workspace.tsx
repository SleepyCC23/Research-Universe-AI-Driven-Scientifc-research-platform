/**
 * P01 工作台
 * 结构：问候区 → 左「我的项目」（整卡可点 + 单个最新进度） + 右「DDL 倒排时间线 / 本阶段产物摘要」
 *
 * 需求变更记录：
 *  1. 移除项目卡片的「进入项目」按钮 —— 整张卡片可点击（含键盘 Enter / Space），点击即进入项目；
 *  2. 顶部项目甘特图：按需求已**删除**（组件、绘图函数、批量日程接口与 mock 数据一并移除）；
 *  3. 移除右侧「项目流程看板」——阶段信息收敛到「我的项目」卡片里的**单个**最新进度条；
 *     原看板内的「本阶段产物摘要」独立保留为一张卡片，避免信息丢失。
 *  4. 移除问候区的「学生认证已核验」标签（认证状态改由顶部头像 → 账号设置查看，避免重复提示）；
 *     未认证时仍保留「学生认证未完成」提醒，因为它可操作（引导去认证）。
 *  5. 「DDL 倒排时间线」由「只看当前项目」改为「合并全部项目的时间点」，
 *     排序规则见 `src/utils/schedule.ts` 的 `sortDdlRows`（未完成优先 → 剩余天数升序），
 *     默认展示最近 5 条，末尾提供「查看全部 N 个节点」展开/收起。
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import { AnalysisTypeDialog, Modal } from '@/components/ui'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  InfoBanner,
  PageSkeleton,
  ProgressBar,
  Skeleton,
  Tag,
} from '@/components/ui'
import {
  IconAlert,
  IconCheckCircle,
  IconChevronRight,
  IconDashboard,
  IconPlus,
  IconSparkles,
  IconTag,
  IconTarget,
  IconTrash,
} from '@/components/icons'
import { useAuthStore, useProjectStore, useUiStore } from '@/store'
import { ddlDaysText, flattenDdlGroups, sortDdlRows } from '@/utils/schedule'
import type {
  DdlKeywordSetting,
  Project,
  ProjectDdlGroup,
  ProjectProgress,
  ProjectStage,
  StageArtifactsPayload,
} from '@/types'

/** DDL 列表默认展示条数（其余通过「查看全部」展开） */
const DDL_PREVIEW_COUNT = 5

/** 项目短名：截断「：」后的副标题 */
function shortProjectName(title: string): string {
  return title.split(/[：:]/)[0]
}

/** 阶段标签配色 */
const STAGE_TONE: Record<ProjectStage, 'brand' | 'ok' | 'warn' | 'neutral' | 'violet'> = {
  topic: 'neutral',
  literature: 'brand',
  analysis: 'brand',
  writing: 'ok',
  submission: 'violet',
}

/** 阶段 → 进入项目后的落地路由 */
const STAGE_ROUTE: Record<ProjectStage, string> = {
  topic: 'intro',
  literature: 'literature',
  analysis: 'analysis',
  writing: 'writing',
  submission: 'export',
}

export default function WorkspacePage() {
  const navigate = useNavigate()
  const { auth, verification } = useAuthStore()
  const { projects, setProjects, setCurrentProject, currentProjectId } = useProjectStore()
  const pushToast = useUiStore((s) => s.pushToast)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metaText, setMetaText] = useState('')
  const [greeting, setGreeting] = useState('')
  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [newProjectType, setNewProjectType] = useState<'dataDriven' | 'theoryDriven'>('dataDriven')
  /** 正在创建项目（POST /projects 进行中） */
  const [creating, setCreating] = useState(false)
  /** 各项目的流程进度（GET /projects/:id/progress），用于「继续上次」入口与断点续做 */
  const [progressByProject, setProgressByProject] = useState<Record<string, ProjectProgress>>({})

  /** 全部项目的 DDL 节点（右栏「DDL 倒排时间线」） */
  const [ddlGroups, setDdlGroups] = useState<ProjectDdlGroup[]>([])
  const [ddlLoading, setDdlLoading] = useState(true)
  /** 是否展开了全部 DDL 节点 */
  const [ddlExpanded, setDdlExpanded] = useState(false)

  /**
   * DDL 概述关键词：每个项目 1 个，用于把节点显示成「关键词：节点名」。
   * 例：p_2002 选「短视频」后，节点显示为「短视频：开题报告」。
   */
  const [ddlKeywords, setDdlKeywords] = useState<DdlKeywordSetting[]>([])
  const [keywordDialogOpen, setKeywordDialogOpen] = useState(false)
  const [keywordSavingId, setKeywordSavingId] = useState<string | null>(null)
  /** 当前项目的产物摘要（右栏） */
  const [artifacts, setArtifacts] = useState<StageArtifactsPayload | null>(null)

  /** 加载项目列表 */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.fetchProjects({ sort: 'recentEdited' })
      setProjects(res.list)
      // 并行取各项目的流程进度：卡片上显示「继续上次：XX」，点它直接回到用户停下的那一步
      const progresses = await Promise.all(res.list.map((p) => api.fetchProjectProgress(p.projectId)))
      setProgressByProject(Object.fromEntries(progresses.map((g) => [g.projectId, g])))
      setMetaText(res.metaText)
      setGreeting(res.greeting)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [setProjects])

  /** 加载全部项目的 DDL 节点（跨项目合并列表，与当前项目无关，仅挂载时取一次） */
  const loadAllDdl = useCallback(async () => {
    setDdlLoading(true)
    try {
      // DDL 节点与概述关键词一起取回，避免两次往返造成列表与关键词不同步
      const [nodes, keywords] = await Promise.all([api.fetchAllDdlTimeline(), api.fetchDdlKeywords()])
      setDdlGroups(nodes)
      setDdlKeywords(keywords)
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: 'DDL 加载失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    } finally {
      setDdlLoading(false)
    }
  }, [pushToast])

  /**
   * 设置某个项目的 DDL 概述关键词（空字符串 = 不显示前缀）。
   * 先乐观更新，失败时回滚，保证列表与选择器始终一致。
   */
  const handleSelectKeyword = useCallback(
    async (item: DdlKeywordSetting, selected: string) => {
      const prev = ddlKeywords
      const projectTitle = ddlGroups.find((g) => g.projectId === item.projectId)?.projectTitle ?? ''
      setDdlKeywords((list) => list.map((k) => (k.projectId === item.projectId ? { ...k, selected } : k)))
      setKeywordSavingId(item.projectId)
      try {
        const res = await api.updateDdlKeyword({ projectId: item.projectId, selected })
        setDdlKeywords((list) => list.map((k) => (k.projectId === res.projectId ? res : k)))
        pushToast({
          tone: 'ok',
          title: selected ? `已选用「${selected}」概述该项目` : '已关闭该项目的关键词前缀',
          description: projectTitle ? `项目：${shortProjectName(projectTitle)}` : undefined,
        })
      } catch (e) {
        setDdlKeywords(prev)
        pushToast({
          tone: 'danger',
          title: '关键词保存失败',
          description: e instanceof Error ? e.message : '请稍后重试',
        })
      } finally {
        setKeywordSavingId(null)
      }
    },
    [ddlKeywords, ddlGroups, pushToast],
  )

  /** 加载当前项目的产物摘要（随当前项目切换刷新） */
  const loadArtifacts = useCallback(
    async (projectId: string) => {
      try {
        setArtifacts(await api.fetchStageArtifacts(projectId))
      } catch (e) {
        pushToast({
          tone: 'danger',
          title: '产物摘要加载失败',
          description: e instanceof Error ? e.message : '请稍后重试',
        })
      }
    },
    [pushToast],
  )

  useEffect(() => {
    void load()
    void loadAllDdl()
  }, [load, loadAllDdl])

  useEffect(() => {
    void loadArtifacts(currentProjectId)
  }, [currentProjectId, loadArtifacts])

  /** 进入项目：记录当前项目并按阶段落地 */
  const enterProject = useCallback(
    (p: Project) => {
      setCurrentProject(p.projectId)
      navigate(`/project/${p.projectId}/${STAGE_ROUTE[p.stage]}`)
    },
    [navigate, setCurrentProject],
  )

  /** 按项目 id 进入项目（DDL 列表行内的项目名用） */
  const enterProjectById = useCallback(
    (projectId: string) => {
      const p = projects.find((x) => x.projectId === projectId)
      if (p) enterProject(p)
    },
    [projects, enterProject],
  )

  /** 产物摘要的待办动作 → 按当前阶段跳转 */
  function goToArtifactAction() {
    if (!artifacts) return
    navigate(`/project/${artifacts.projectId}/${STAGE_ROUTE[artifacts.currentStage]}`)
  }

  /**
   * 新建项目：**真正调用 POST /projects**，跳转目标取服务端返回的 `entryRoute`。
   *
   * 修复的缺陷：此前这里既不创建项目、也不看所选类型，直接 `navigate('/project/p_2001/intro')` ——
   * 结果是不管选理论驱动还是数据驱动都跳到别人的项目/同一个页面。
   * 现在按后端返回的流程起点分流：理论驱动 → 研究热点；数据驱动 → 上传数据。
   */
  async function confirmCreate() {
    setCreating(true)
    try {
      const res = await api.createProject({
        title: '未命名项目',
        discipline: auth.user?.major ?? '心理学',
        route: newProjectType,
      })
      setProjects([res.project, ...projects])
      setCurrentProject(res.project.projectId)
      setTypeDialogOpen(false)
      pushToast({
        tone: 'ok',
        title: '项目已创建',
        description:
          newProjectType === 'dataDriven'
            ? '已进入数据驱动流程：上传数据 → 变量识别 → 生成研究假设'
            : '已进入理论驱动流程：研究热点 → 领域研究热词 → 选择理论与变量',
      })
      navigate(res.entryRoute)
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: '创建项目失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    } finally {
      setCreating(false)
    }
  }

  /**
   * 删除项目：二次确认后调用 DELETE /projects/:projectId。
   * 服务端会级联清除该项目的全部关联数据（文献 / 分析 / 文稿 / 导出状态）与磁盘导出包，不可撤销。
   */
  function handleDeleteProject(p: Project) {
    useUiStore.getState().openConfirm({
      tone: 'warn',
      title: '删除项目',
      description: `确认删除「${p.title}」？该项目下的文献、分析结果、文稿与导出记录将一并永久删除，且无法恢复。`,
      confirmText: '确认删除',
      cancelText: '取消',
      onConfirm: async () => {
        try {
          await api.deleteProject({ projectId: p.projectId })
          const rest = projects.filter((x) => x.projectId !== p.projectId)
          setProjects(rest)
          // 删掉的是当前项目时，把当前项目切到剩下的第一个，避免残留失效 id
          if (currentProjectId === p.projectId) setCurrentProject(rest[0]?.projectId ?? '')
          pushToast({ tone: 'ok', title: '项目已删除', description: `「${p.title}」及其关联数据已清除` })
        } catch (e) {
          pushToast({
            tone: 'danger',
            title: '删除失败',
            description: e instanceof Error ? e.message : '请稍后重试',
          })
        }
      },
    })
  }

  if (loading) {
    return (
      <AppLayout noSubHeader>
        <div className="pt-4">
          <PageSkeleton />
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout noSubHeader>
        <div className="pt-4">
          <ErrorState description={error} onRetry={load} />
        </div>
      </AppLayout>
    )
  }

  /** 合并全部项目的 DDL 节点并按紧迫度排序（规则见 utils/schedule.sortDdlRows） */
  const ddlRows = sortDdlRows(flattenDdlGroups(ddlGroups))
  const visibleDdlRows = ddlExpanded ? ddlRows : ddlRows.slice(0, DDL_PREVIEW_COUNT)
  /** 最紧急（最近的未完成节点）所属项目的风险提示 */
  const urgentRow = ddlRows.find((r) => r.node.daysLeft >= 0)
  const urgentTip = urgentRow
    ? ddlGroups.find((g) => g.projectId === urgentRow.projectId)?.tip
    : undefined
  /**
   * 项目 → 已选概述关键词。
   * 渲染规则：设置了关键词的行显示「关键词：节点名」（此时隐藏下方的项目全名行，
   * 因为关键词已起到标识项目的作用，整行可点击进入项目）；未设置则沿用原来的「节点名 + 项目名」两行。
   */
  const keywordByProject: Record<string, string> = Object.fromEntries(
    ddlKeywords.filter((k) => k.selected).map((k) => [k.projectId, k.selected]),
  )
  const keywordCount = Object.keys(keywordByProject).length

  return (
    <AppLayout noSubHeader>
      <div className="pt-4">
        {/* 问候区 */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-ink flex items-center gap-2 flex-wrap">
              早上好，{auth.user?.nickname ?? '同学'}
              {/* 已核验时不再重复提示（认证状态见顶部头像 → 账号设置）；未认证仍给出可操作提醒 */}
              {!verification.verified ? <Tag tone="warn">学生认证未完成</Tag> : null}
            </h1>
            <p className="mt-2 text-base text-ink-2">{greeting}</p>
          </div>
          <Button icon={<IconPlus size={14} />} onClick={() => setTypeDialogOpen(true)} className="shrink-0">
            新建项目
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 pb-6">
          {/* 左：我的项目（整卡可点击） */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">我的项目</h2>
              <span className="ru-hint">{metaText} · 点击卡片任意位置进入项目</span>
            </div>

            {projects.length === 0 ? (
              <Card>
                <EmptyState
                  text="还没有项目"
                  description="创建一个项目，从选题到投稿全程留痕"
                  icon={<IconDashboard size={20} />}
                  action={<Button onClick={() => setTypeDialogOpen(true)}>新建项目</Button>}
                />
              </Card>
            ) : (
              projects.map((p) => (
                <div
                  key={p.projectId}
                  role="button"
                  tabIndex={0}
                  aria-label={`进入项目：${p.title}`}
                  onClick={() => enterProject(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      enterProject(p)
                    }
                  }}
                  className="ru-card p-4 cursor-pointer group transition
                             hover:border-brand-line hover:shadow-pop
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-md font-semibold text-ink leading-[24px] flex-1">{p.title}</h3>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <Tag tone={STAGE_TONE[p.stage]}>{p.stageLabel}</Tag>
                      {/* 删除项目：默认淡显、hover 变红；stopPropagation 避免误触「进入项目」 */}
                      <button
                        type="button"
                        aria-label={`删除项目：${p.title}`}
                        title="删除项目"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteProject(p)
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="p-1 rounded-[6px] text-ink-3/60 hover:text-danger hover:bg-danger/5
                                   focus:opacity-100 focus-visible:ring-2 focus-visible:ring-danger/25 transition"
                      >
                        <IconTrash size={15} />
                      </button>
                      <span className="text-line-strong group-hover:text-brand transition">
                        <IconChevronRight size={15} />
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-ink-3 flex-wrap">
                    <span>
                      {p.discipline} · {p.route === 'dataDriven' ? '数据驱动' : '理论驱动'}
                    </span>
                    <span className="text-line-strong">|</span>
                    <span>{p.lastEditedText}</span>
                    <span className="text-line-strong">|</span>
                    <span className={p.mainDdlDaysLeft <= 7 ? 'text-danger inline-flex items-center gap-1' : ''}>
                      {p.mainDdlDaysLeft <= 7 ? <IconAlert size={11} /> : null}距{p.mainDdlName} {p.mainDdlDaysLeft} 天
                    </span>
                  </div>

                  {/* 未走完流程的项目：直接给「继续上次：XX」入口（跳服务端给的 resumeRoute） */}
                  {progressByProject[p.projectId]?.hasUnfinished ? (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        className="text-xs text-brand hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentProject(p.projectId)
                          navigate(progressByProject[p.projectId].resumeRoute)
                        }}
                      >
                        {progressByProject[p.projectId].resumeLabel}
                      </button>
                      <span className="ru-hint">未完成，已自动保存你填的内容</span>
                    </div>
                  ) : null}

                  {/* 单个「最新进度」——替代原项目流程看板的多步流程 */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="ru-hint">最新进度</span>
                      <span className="ru-hint">
                        {p.currentPhaseName} · {p.currentPhaseRange}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <ProgressBar value={p.progress} className="flex-1" tone={p.progress >= 60 ? 'ok' : 'brand'} />
                      <span className="text-base font-semibold text-ink tabular-nums w-9 text-right">{p.progress}%</span>
                    </div>
                  </div>

                  {/* 脚注：有待办时用待办行渲染（避免与 footnote 文案重复），否则显示 footnote */}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {p.todoCount ? (
                      <span className="inline-flex items-center gap-1 text-danger">
                        <span className="w-3.5 h-3.5 rounded-full bg-danger text-white text-[9px] flex items-center justify-center">
                          {p.todoCount}
                        </span>
                        待办 · 核验通过 {p.verifiedCount} 条
                      </span>
                    ) : (
                      <span className="text-ink-3">{p.footnote}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* 右：全部项目的日程与产物 */}
          <aside className="space-y-4">
            {/* DDL 倒排时间线：合并全部项目的节点，按紧迫度排序 */}
            <Card padded={false}>
              <div className="p-4 pb-3">
                <CardHeader
                  icon={<IconTarget size={15} />}
                  title="DDL 倒排时间线"
                  note={
                    ddlRows.length
                      ? `全部 ${ddlGroups.length} 个项目 · ${ddlRows.length} 个节点 · 未完成优先、按剩余天数排序`
                      : undefined
                  }
                  extra={
                    <>
                      <Button
                        variant="link"
                        size="sm"
                        icon={<IconTag size={13} />}
                        title="为每个项目选择 1 个关键词，节点会显示为「关键词：节点名」"
                        onClick={() => setKeywordDialogOpen(true)}
                      >
                        概述关键词{keywordCount ? ` (${keywordCount})` : ''}
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() =>
                          pushToast({
                            tone: 'info',
                            title: '编辑 DDL 节点',
                            description: '硬节点按项目维护，请在对应项目的「项目设置」中修改日期',
                          })
                        }
                      >
                        编辑节点
                      </Button>
                    </>
                  }
                />
              </div>

              {ddlLoading ? (
                <div className="px-4 pb-4 space-y-2">
                  <Skeleton height={14} />
                  <Skeleton height={14} />
                  <Skeleton height={14} className="w-4/5" />
                </div>
              ) : ddlRows.length ? (
                <>
                  <div className="px-4">
                    {visibleDdlRows.map((row) => {
                      const d = row.node
                      const done = d.status === 'done'
                      const urgent = !done && d.daysLeft <= 7
                      const keyword = keywordByProject[row.projectId]
                      return (
                        <div
                          key={`${row.projectId}-${d.nodeId}`}
                          role={keyword ? 'button' : undefined}
                          tabIndex={keyword ? 0 : undefined}
                          title={keyword ? `进入项目：${row.projectTitle}` : undefined}
                          onClick={keyword ? () => enterProjectById(row.projectId) : undefined}
                          onKeyDown={
                            keyword
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    enterProjectById(row.projectId)
                                  }
                                }
                              : undefined
                          }
                          className={`flex items-center justify-between gap-3 py-2.5 border-b border-line last:border-b-0 ${
                            keyword ? 'cursor-pointer hover:bg-panel -mx-2 px-2 rounded-card transition' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-base text-ink-2 inline-flex items-center gap-1.5">
                              {done ? (
                                <IconCheckCircle size={13} className="text-ok shrink-0" />
                              ) : urgent ? (
                                <IconAlert size={13} className="text-warn shrink-0" />
                              ) : (
                                <span className="w-[13px] shrink-0" />
                              )}
                              {/* 概述形式：短视频：开题报告 */}
                              {keyword ? (
                                <span className="truncate">
                                  <span className="text-brand font-medium">{keyword}</span>
                                  <span className="text-ink-3">：</span>
                                  {d.name}
                                </span>
                              ) : (
                                <span className="truncate">{d.name}</span>
                              )}
                            </div>
                            {/* 未设关键词时，行内标注所属项目，点击进入该项目 */}
                            {keyword ? null : (
                              <button
                                className="ru-hint truncate max-w-full text-left hover:text-brand"
                                title={`进入项目：${row.projectTitle}`}
                                onClick={() => enterProjectById(row.projectId)}
                              >
                                {shortProjectName(row.projectTitle)}
                              </button>
                            )}
                          </div>
                          <div className="text-base shrink-0 text-right">
                            <div className={done ? 'text-ink-3' : 'text-ink font-medium tabular-nums'}>{d.date}</div>
                            <div className={`text-xs ${done ? 'text-ink-3' : urgent ? 'text-warn' : 'text-ink-3'}`}>
                              {ddlDaysText(d.daysLeft)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 末尾：查看全部 / 收起 */}
                  {ddlRows.length > DDL_PREVIEW_COUNT ? (
                    <div className="px-4 py-3 border-t border-line">
                      <button
                        className="w-full text-center text-xs text-brand hover:underline"
                        onClick={() => setDdlExpanded((v) => !v)}
                      >
                        {ddlExpanded ? `收起，只看最近 ${DDL_PREVIEW_COUNT} 个` : `查看全部 ${ddlRows.length} 个节点 →`}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="px-4 pb-4">
                  <EmptyState text="暂无 DDL 节点" description="在「项目设置」中为项目添加硬节点后可在此查看" />
                </div>
              )}

              {urgentTip ? (
                <div className="px-4 pb-4">
                  <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
                    <span className="text-ink-3">{shortProjectName(urgentRow?.projectTitle ?? '')}：</span>
                    {urgentTip}
                  </InfoBanner>
                </div>
              ) : null}
            </Card>

            {/* 本阶段产物摘要（原项目流程看板内嵌块，独立保留） */}
            <Card>
              <CardHeader
                icon={<IconSparkles size={15} />}
                title="本阶段产物摘要"
                note={artifacts ? `当前阶段：${artifacts.currentStageLabel}` : undefined}
              />
              <div className="space-y-2">
                {(artifacts?.artifacts ?? []).map((a) => (
                  <div key={a.artifactId} className="flex items-center justify-between gap-2">
                    <span className="text-base text-ink inline-flex items-center gap-1.5 min-w-0">
                      <IconSparkles size={13} className="text-ink-3 shrink-0" />
                      <span className="truncate">{a.name}</span>
                    </span>
                    {a.actionText ? (
                      <button className="text-xs text-brand hover:underline shrink-0" onClick={goToArtifactAction}>
                        {a.actionText}
                      </button>
                    ) : (
                      <span className={`text-xs shrink-0 ${a.tone === 'ok' ? 'text-ok' : 'text-warn'}`}>
                        {a.statusText}
                      </span>
                    )}
                  </div>
                ))}
                {/* 新创建的项目还没有任何阶段产物 */}
                {artifacts && artifacts.artifacts.length === 0 ? (
                  <div className="ru-hint">
                    当前项目还没有阶段产物。完成「研究热点」或「上传数据」后，产物会出现在这里。
                  </div>
                ) : null}
                {!artifacts ? (
                  <>
                    <Skeleton height={14} />
                    <Skeleton height={14} className="w-5/6" />
                  </>
                ) : null}
              </div>
            </Card>
          </aside>
        </div>

        {/* 演示快捷入口（非设计稿元素，便于评审与自测） */}
        <Card className="mb-8">
          <CardHeader icon={<IconSparkles size={15} />} title="演示快捷入口" note="点击直达各页面，便于评审与自测" />
          <div className="flex flex-wrap gap-2">
            {[
              ['工作台', '/'],
              ['论文引言 · 研究热点', '/project/p_2001/intro'],
              ['理论驱动 · 领域研究热词', '/project/p_2001/intro/topic/keywords'],
              ['理论驱动 · 选择理论与变量', '/project/p_2001/intro/topic/theory'],
              ['数据驱动 · 上传数据', '/project/p_2001/intro/data/upload'],
              ['数据驱动 · 变量识别', '/project/p_2001/intro/data/variables'],
              ['数据驱动 · 生成研究假设', '/project/p_2001/intro/data/hypotheses'],
              ['文献综述', '/project/p_2001/literature'],
              ['数据分析', '/project/p_2001/analysis'],
              ['论文写作', '/project/p_2001/writing'],
              ['论文写作 · 全屏编辑器', '/project/p_2001/writing/editor'],
              ['选刊 AI', '/project/p_2001/journal'],
              ['模拟评审', '/project/p_2001/review'],
              ['导出中心', '/project/p_2001/export'],
              ['项目设置', '/project/p_2001/settings'],
              ['账号设置', '/account'],
              ['定价', '/pricing'],
              ['登录 / 认证', '/login'],
            ].map(([label, to]) => (
              <Button key={to} variant="secondary" size="sm" onClick={() => navigate(to)}>
                {label}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      <AnalysisTypeDialog
        open={typeDialogOpen}
        onClose={() => !creating && setTypeDialogOpen(false)}
        onConfirm={confirmCreate}
        value={newProjectType}
        onChange={setNewProjectType}
        creating={creating}
      />

      {/* DDL 概述关键词：每个项目单选 1 个关键词（也可选「不显示」） */}
      <Modal
        open={keywordDialogOpen}
        onClose={() => setKeywordDialogOpen(false)}
        title="DDL 概述关键词"
        icon={<IconTag size={16} />}
        width={560}
        footer={
          <Button variant="secondary" onClick={() => setKeywordDialogOpen(false)}>
            完成
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="ru-hint leading-[20px]">
            为每个项目选择 <span className="text-ink font-medium">1 个</span> 关键词，该项目的 DDL 节点会显示为
            「关键词：节点名」，例如「短视频：开题报告」。合并列表里能一眼看出节点属于哪个项目。
          </div>

          {ddlKeywords.length === 0 ? (
            <div className="space-y-2">
              <Skeleton height={16} />
              <Skeleton height={16} className="w-5/6" />
            </div>
          ) : (
            ddlKeywords.map((item) => {
              const title = ddlGroups.find((g) => g.projectId === item.projectId)?.projectTitle ?? item.projectId
              const saving = keywordSavingId === item.projectId
              return (
                <div key={item.projectId} className="ru-panel p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-base font-medium text-ink truncate">{shortProjectName(title)}</div>
                      <div className="ru-hint truncate">示例：{(item.selected || '关键词') + '：开题报告'}</div>
                    </div>
                    {saving ? <span className="text-xs text-ink-3 shrink-0">保存中…</span> : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {/* 「不显示」选项 */}
                    <button
                      className={`h-7 px-2.5 rounded-pill border text-xs transition ${
                        item.selected === ''
                          ? 'border-brand bg-brand-soft text-brand font-medium'
                          : 'border-line text-ink-2 hover:border-brand-line'
                      }`}
                      onClick={() => handleSelectKeyword(item, '')}
                    >
                      不显示
                    </button>
                    {item.options.map((o) => {
                      const active = item.selected === o.keyword
                      return (
                        <button
                          key={o.keyword}
                          title={o.sourceText}
                          className={`h-7 px-2.5 rounded-pill border text-xs transition inline-flex items-center gap-1.5 ${
                            active
                              ? 'border-brand bg-brand-soft text-brand font-medium'
                              : 'border-line text-ink-2 hover:border-brand-line'
                          }`}
                          onClick={() => handleSelectKeyword(item, o.keyword)}
                        >
                          {active ? <IconCheckCircle size={12} /> : null}
                          {o.keyword}
                          <span className="text-ink-3 font-normal">· {o.sourceText}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Modal>
    </AppLayout>
  )
}
