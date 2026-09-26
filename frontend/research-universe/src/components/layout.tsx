/** 全局布局：顶部固定导航 + （可选）左侧全局侧边栏 + 面包屑副导航 */
import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import * as api from '@/api/endpoints'
import {
  IconBell,
  IconChart,
  IconChevronRight,
  IconClipboardCheck,
  IconDashboard,
  IconDownload,
  IconFileText,
  IconMenu,
  IconPen,
  IconShield,
  IconSparkles,
  IconUser,
} from './icons'
import { Avatar, Breadcrumb, Button, ProjectSwitcherDialog, Skeleton, Tag } from './ui'
import { useAuthStore, useProjectStore } from '@/store'
import type { NotificationItem, NotificationPayload, ProjectProgress } from '@/types'

/* ------------------------------------------------------------
 * 品牌 Logo
 * ---------------------------------------------------------- */
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <span className="w-7 h-7 rounded-[7px] bg-brand flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
          <path d="M4 5.5v15M8 7h7" />
        </svg>
      </span>
      {!compact ? (
        <span className="leading-none">
          <span className="block text-[17px] font-bold text-ink tracking-tight">研宇宙</span>
          <span className="block text-[8px] tracking-[0.22em] text-ink-3 mt-[3px]">RESEARCH UNIVERSE</span>
        </span>
      ) : null}
    </Link>
  )
}

/* ------------------------------------------------------------
 * 顶部导航
 * ---------------------------------------------------------- */
export interface NavTab {
  key: string
  label: string
  to: string
  icon: React.ReactNode
  /** 匹配前缀，用于高亮 */
  match: string[]
}

export function TopNav({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const { currentProjectId } = useProjectStore()
  const [notifOpen, setNotifOpen] = useState(false)
  /** 站内通知（GET /me/notifications）：未读数由服务端下发 */
  const [notifications, setNotifications] = useState<NotificationPayload>({ list: [], unreadCount: 0 })
  const [notifLoading, setNotifLoading] = useState(false)

  /** 打开铃铛时拉取一次，避免首屏多一次请求 */
  async function loadNotifications() {
    setNotifLoading(true)
    try {
      setNotifications(await api.fetchNotifications())
    } finally {
      setNotifLoading(false)
    }
  }

  async function handleMarkAllRead() {
    setNotifications(await api.markNotificationsRead())
  }

  /** 点击通知：标记已读并按 route 跳转 */
  function handleOpenNotification(n: NotificationItem) {
    setNotifOpen(false)
    if (!n.read) {
      setNotifications((prev) => ({
        list: prev.list.map((x) => (x.notificationId === n.notificationId ? { ...x, read: true } : x)),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }))
    }
    if (n.route) navigate(n.route)
  }

  const pid = currentProjectId
  const tabs: NavTab[] = [
    { key: 'workspace', label: '工作台', to: '/', icon: <IconDashboard size={15} />, match: ['/', '/pricing', '/settings'] },
    {
      key: 'intro',
      label: '论文引言',
      to: `/project/${pid}/intro`,
      icon: <IconFileText size={15} />,
      match: ['/intro', '/literature'],
    },
    { key: 'stats', label: '数据统计', to: `/project/${pid}/analysis`, icon: <IconChart size={15} />, match: ['/analysis'] },
    { key: 'writing', label: '论文写作', to: `/project/${pid}/writing`, icon: <IconPen size={15} />, match: ['/writing', '/journal'] },
    { key: 'review', label: '论文评审', to: `/project/${pid}/review`, icon: <IconClipboardCheck size={15} />, match: ['/review'] },
  ]

  const isActive = (t: NavTab) => {
    const p = location.pathname
    if (t.key === 'workspace') return p === '/' || p.startsWith('/pricing')
    return t.match.some((m) => p.includes(m))
  }

  const user = auth.user
  /**
   * 「已登录但资料还没回来」的中间态：有 token 就算登录，此时不应显示「未登录」。
   * 正常情况 store 会从本地缓存（ru_auth_cache）瞬间还原昵称，这里是最后一道兜底。
   */
  const loggedIn = auth.loggedIn || !!user

  return (
    <header className="h-[60px] bg-white border-b border-line flex items-center gap-4 px-5 sticky top-0 z-50">
      <button className="text-ink-3 hover:text-ink -ml-1" onClick={onToggleSidebar} aria-label="切换侧边栏">
        <IconMenu size={18} />
      </button>
      <BrandLogo />

      <nav className="flex items-center gap-1 ml-2">
        {tabs.map((t) => {
          const active = isActive(t)
          return (
            <button
              key={t.key}
              onClick={() => navigate(t.to)}
              className={`relative h-[60px] px-3.5 text-base transition ${
                active ? 'text-brand font-medium' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {t.label}
              {active ? <span className="absolute left-2 right-2 bottom-0 h-[2px] bg-brand rounded-t" /> : null}
            </button>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {/* 通知：数据来自 GET /me/notifications，未读数由服务端计算 */}
        <div className="relative">
          <button
            className="relative text-ink-2 hover:text-ink"
            onClick={() => {
              setNotifOpen((v) => !v)
              if (!notifOpen) void loadNotifications()
            }}
            aria-label={notifications.unreadCount ? `通知（${notifications.unreadCount} 条未读）` : '通知'}
          >
            <IconBell size={18} />
            {notifications.unreadCount ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-danger text-white text-[9px] flex items-center justify-center">
                {notifications.unreadCount}
              </span>
            ) : null}
          </button>
          {notifOpen ? (
            <div className="absolute right-0 top-8 w-[320px] bg-white border border-line rounded-card shadow-pop p-3 ru-pop-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold text-ink">通知</span>
                {notifications.unreadCount ? (
                  <button className="text-xs text-brand hover:underline" onClick={handleMarkAllRead}>
                    全部已读
                  </button>
                ) : null}
              </div>
              {notifLoading ? (
                <div className="space-y-2">
                  <Skeleton height={38} />
                  <Skeleton height={38} />
                </div>
              ) : notifications.list.length ? (
                <div className="space-y-2">
                  {notifications.list.map((n) => (
                    <div
                      key={n.notificationId}
                      role={n.route ? 'button' : undefined}
                      tabIndex={n.route ? 0 : undefined}
                      onClick={n.route ? () => handleOpenNotification(n) : undefined}
                      onKeyDown={
                        n.route
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleOpenNotification(n)
                              }
                            }
                          : undefined
                      }
                      className={`ru-panel px-2.5 py-2 ${n.route ? 'cursor-pointer hover:border-brand-line' : ''}`}
                    >
                      <div className="text-base text-ink flex items-start gap-1.5">
                        {!n.read ? <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-brand shrink-0" /> : null}
                        <span className="min-w-0">{n.title}</span>
                      </div>
                      <div className="ru-hint">{n.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ru-hint py-3 text-center">暂无通知</div>
              )}
            </div>
          ) : null}
        </div>

        {/* 用户信息（全局组件）：点击头像进入「账号设置」 */}
        <Link
          to="/account"
          title="账号设置"
          aria-label="账号设置"
          className="group flex items-center gap-2 pl-1 pr-2 h-9 rounded-pill hover:bg-panel transition"
        >
          <Avatar
            src={user?.avatarUrl}
            text={user?.avatarText ?? (loggedIn ? '我' : '陈')}
            size={28}
            className="group-hover:ring-2 group-hover:ring-brand/25 transition"
          />
          <span className="leading-tight text-left">
            <span className="block text-base font-medium text-ink group-hover:text-brand transition">
              {user?.nickname ?? (loggedIn ? '已登录' : '未登录')}
            </span>
            <span className="block text-xs text-ink-3">
              {user
                ? `${user.major} · ${user.grade}`
                : loggedIn
                  ? '正在同步账号资料…'
                  : '请先登录'}
            </span>
          </span>
          <span className="text-line-strong group-hover:text-brand transition">
            <IconChevronRight size={14} />
          </span>
        </Link>

        {/* 导出中心入口（全局组件） */}
        <Button
          variant="secondary"
          size="sm"
          icon={<IconDownload size={14} />}
          className="h-8 px-3"
          onClick={() => navigate(`/project/${pid}/export`)}
        >
          导出中心
        </Button>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------
 * 全局左侧边栏（用户信息 + 导出中心 + 全局入口）
 * 设计稿把这两个入口放在顶部导航右侧；这里额外提供一个可选侧边栏，
 * 两者共用同一份全局状态，可按需启用（详见 README「关于左侧边栏」）。
 * ---------------------------------------------------------- */
export function GlobalSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { auth, verification, quota, plan } = useAuthStore()
  const { projects, currentProjectId } = useProjectStore()
  if (!open) return null

  /** 与顶栏同口径：有 token 就算登录，资料未回来时给中性兜底，不显示「空昵称」 */
  const sidebarLoggedIn = auth.loggedIn || !!auth.user

  const planName = plan === 'student' ? '学生版' : plan === 'pro' ? '专业版' : '团队版'
  const entries = [
    { key: 'projects', label: '我的项目', to: '/', icon: <IconDashboard size={15} /> },
    { key: 'account', label: '账号设置', to: '/account', icon: <IconUser size={15} /> },
    { key: 'export', label: '导出中心', to: `/project/${currentProjectId}/export`, icon: <IconDownload size={15} /> },
    { key: 'settings', label: '项目设置', to: `/project/${currentProjectId}/settings`, icon: <IconSparkles size={15} /> },
    { key: 'pricing', label: '套餐与额度', to: '/pricing', icon: <IconShield size={15} /> },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-[#101828]/20 z-[60]" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 w-[248px] bg-white border-r border-line z-[61] ru-pop-in p-4 overflow-y-auto">
        <div className="mb-4">
          <BrandLogo />
        </div>

        {/* 用户信息（点击进入账号设置） */}
        <div className="ru-panel p-3">
          <button
            className="w-full flex items-center gap-2 text-left group rounded-[6px] -m-1 p-1 hover:bg-white/70 transition"
            title="账号设置"
            onClick={() => {
              navigate('/account')
              onClose()
            }}
          >
            <Avatar
              src={auth.user?.avatarUrl}
              text={auth.user?.avatarText ?? (sidebarLoggedIn ? '我' : '陈')}
              size={32}
              className="group-hover:ring-2 group-hover:ring-brand/25 transition"
            />
            <div className="min-w-0 flex-1">
              <div className="text-base font-medium text-ink truncate group-hover:text-brand transition">
                {auth.user?.nickname ?? (sidebarLoggedIn ? '已登录' : '未登录')}
              </div>
              <div className="ru-hint truncate">
                {auth.user
                  ? `${auth.user.major} · ${auth.user.grade}`
                  : sidebarLoggedIn
                    ? '正在同步账号资料…'
                    : '请先登录'}
              </div>
            </div>
            <span className="text-line-strong group-hover:text-brand transition shrink-0">
              <IconChevronRight size={14} />
            </span>
          </button>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <Tag tone={verification.verified ? 'ok' : 'warn'} size="sm">
              {verification.verified ? '认证已核验' : '未认证'}
            </Tag>
            <Tag tone="brand" size="sm">
              {planName}
            </Tag>
          </div>
          <div className="mt-2 space-y-1">
            <QuotaMini label="核验" used={quota.verifyUsed} limit={quota.verifyLimit} />
            <QuotaMini label="分析" used={quota.sandboxMinutesUsed} limit={quota.sandboxMinutesLimit} unit="分钟" />
          </div>
          <button className="ru-hint mt-2 text-brand hover:underline" onClick={() => navigate('/pricing')}>
            查看认证与额度 →
          </button>
        </div>

        <nav className="mt-4 space-y-1">
          {entries.map((e) => (
            <button
              key={e.key}
              onClick={() => {
                navigate(e.to)
                onClose()
              }}
              className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-card text-base text-ink-2 hover:bg-panel hover:text-ink"
            >
              <span className="text-ink-3">{e.icon}</span>
              {e.label}
            </button>
          ))}
        </nav>

        <div className="mt-5">
          <div className="ru-hint mb-2">快速切换项目</div>
          <div className="space-y-1">
            {projects.map((p) => (
              <button
                key={p.projectId}
                onClick={() => {
                  navigate(`/project/${p.projectId}/intro`)
                  onClose()
                }}
                className={`w-full text-left px-2.5 py-2 rounded-card border text-xs leading-[18px] ${
                  p.projectId === currentProjectId ? 'border-brand-line bg-brand-soft text-brand' : 'border-line text-ink-2 hover:border-brand-line'
                }`}
              >
                <span className="line-clamp-2">{p.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ru-hint mt-5">
          L1 / L2 数据默认不进入任何训练集；检测到敏感信息会先强制脱敏，确认后才能继续。
        </div>
      </aside>
    </>
  )
}

function QuotaMini({ label, used, limit, unit = '条' }: { label: string; used: number; limit: number; unit?: string }) {
  const pct = Math.min(100, (used / limit) * 100)
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-ink-3">
        <span>{label}</span>
        <span className="tabular-nums">
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-1 bg-line rounded-pill overflow-hidden mt-0.5">
        <div className="h-full bg-brand rounded-pill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------
 * 副导航（面包屑 + 右侧操作）
 * ---------------------------------------------------------- */
export function SubHeader({
  breadcrumb,
  right,
  className = '',
}: {
  breadcrumb: { key: string; label: string; route?: string }[]
  right?: React.ReactNode
  className?: string
}) {
  const navigate = useNavigate()
  /* 面包屑里若是当前项目名，则标蓝可点 → 点击打开「切换项目」对话框 */
  const { projects, currentProjectId, openSwitcher } = useProjectStore()
  const currentTitle = projects.find((p) => p.projectId === currentProjectId)?.title
  return (
    <div className={`h-11 flex items-center gap-3 ${className}`}>
      {/* 当前项目名：固定在最左、标蓝可点。不依赖各页面包屑的文案，保证每一页都能切换项目 */}
      <button
        onClick={openSwitcher}
        title="切换项目"
        className="text-brand font-medium text-xs hover:underline inline-flex items-center gap-1 shrink-0"
      >
        <span className="truncate max-w-[220px]">{currentTitle ?? '选择项目'}</span>
        <span aria-hidden>⇄</span>
      </button>
      {breadcrumb && breadcrumb.length ? <span className="text-line-strong">›</span> : null}
      <Breadcrumb items={breadcrumb} onNavigate={navigate} titleLabel={currentTitle} onTitleClick={openSwitcher} />
      <div className="ml-auto flex items-center gap-2">{right}</div>
    </div>
  )
}

/* ------------------------------------------------------------
 * 流程步骤条（含「上一步」）
 * ----------------------------------------------------------
 * 只在**流程步骤页**显示：用当前路由去匹配进度里的步骤，匹配不到（如工作台、写作页）就不渲染。
 * 「上一步」始终可点（只要有上一步）；「下一步」也可点，两个方向都允许用户自由回退/前进。
 * ---------------------------------------------------------- */
export function FlowStepperBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const projectId = pathname.split('/')[2] ?? ''
  const [progress, setProgress] = useState<ProjectProgress | null>(null)

  useEffect(() => {
    if (!projectId) return
    let alive = true
    void (async () => {
      try {
        const p = await api.fetchProjectProgress(projectId)
        if (alive) setProgress(p)
      } catch {
        /* 非项目页或项目不存在：不显示步骤条即可 */
      }
    })()
    return () => {
      alive = false
    }
  }, [projectId, pathname])

  if (!progress) return null
  const idx = progress.steps.findIndex((s) => s.route === pathname)
  if (idx < 0) return null
  const prev = progress.steps[idx - 1]
  const next = progress.steps[idx + 1]

  return (
    <div className="h-11 flex items-center gap-3 overflow-x-auto">
      <Button
        variant="secondary"
        size="sm"
        disabled={!prev}
        onClick={() => prev && navigate(prev.route)}
        title={prev ? `回到上一步：${prev.stepLabel}` : '已是第一步'}
      >
        ← {prev ? `上一步：${prev.stepLabel}` : '已是第一步'}
      </Button>
      <div className="flex items-center gap-2 ru-hint shrink-0">
        {progress.steps.map((s, i) => (
          <React.Fragment key={s.stepKey}>
            {i > 0 ? <span className="text-line-strong">›</span> : null}
            <button
              /* 已完成 / 当前步骤都可点：已完成的可以回看，未开始的不可跳 */
              disabled={s.status === 'notStarted' && i !== idx}
              onClick={() => navigate(s.route)}
              title={s.status === 'done' ? `回到：${s.stepLabel}` : s.status === 'inProgress' ? '当前步骤' : '尚未开始'}
              className={`${
                i === idx
                  ? 'text-brand font-medium'
                  : s.status === 'done'
                    ? 'text-ink-2 hover:text-brand'
                    : 'text-ink-3 disabled:cursor-not-allowed'
              }`}
            >
              {i + 1}. {s.stepLabel}
            </button>
          </React.Fragment>
        ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="ml-auto shrink-0"
        disabled={!next}
        onClick={() => next && navigate(next.route)}
        title={next ? `前往下一步：${next.stepLabel}` : '已是最后一步'}
      >
        {next ? `下一步：${next.stepLabel}` : '已是最后一步'} →
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------
 * 布局外壳
 * ---------------------------------------------------------- */
export function AppLayout({
  children,
  breadcrumb,
  subHeaderRight,
  subHeader,
  noSubHeader = false,
  fullBleed = false,
}: {
  children: React.ReactNode
  breadcrumb?: { key: string; label: string; route?: string }[]
  subHeaderRight?: React.ReactNode
  /** 完全自定义的副导航（优先于 breadcrumb） */
  subHeader?: React.ReactNode
  noSubHeader?: boolean
  /** 是否贴边（编辑器类页面用） */
  fullBleed?: boolean
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const { projects, currentProjectId, switcherOpen, openSwitcher, closeSwitcher, hasChosenProject, markProjectChosen, setCurrentProject } =
    useProjectStore()
  const navigateToProject = useNavigate()

  /** 当前路由里的项目 id：只有项目页 `/project/:projectId/...` 才有 */
  const routeProjectId = /^\/project\/([^/]+)/.exec(pathname)?.[1] ?? ''

  /**
   * 「选择项目」对话框**不再每页都自动弹**，只在同时满足下面三点时才出现：
   *   1. 处在项目页 `/project/:projectId/...` —— 工作台、账号设置、定价等全局页一律不打扰；
   *   2. 本次会话还没确定过项目（hasChosenProject，会话级记忆，刷新页面不会反复弹）；
   *   3. URL 里的项目与当前项目**不一致** —— 说明是直接打开/粘贴链接进来的项目页，
   *      而不是从工作台卡片点进来的（点卡片会先把当前项目设好再跳转）。
   * 其余场景都不自动弹；要切换项目时点面包屑左侧的项目名 ⇄ 即可。
   */
  useEffect(() => {
    if (!routeProjectId) return
    if (routeProjectId === currentProjectId) {
      // 已经处在某个具体项目里（从工作台点进来 / 上一步刚同步过）：记为已确定，本次会话不再提示
      if (!hasChosenProject) markProjectChosen()
      return
    }
    // 直接打开了一个「和当前项目不一致」的项目页：问一次要进哪个项目
    if (!hasChosenProject) openSwitcher()
    // 项目页以 URL 为准：同步当前项目，顶栏导航 / 面包屑才会指向正确的项目
    setCurrentProject(routeProjectId)
  }, [routeProjectId, currentProjectId, hasChosenProject, openSwitcher, setCurrentProject, markProjectChosen])
  return (
    <div className="min-h-screen bg-page">
      <TopNav onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <GlobalSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ProjectSwitcherDialog
        open={switcherOpen}
        /* 关闭（含「取消」）同样记为已确定：本次会话不再自动打扰，需要时仍可手动打开 */
        onClose={() => {
          markProjectChosen()
          closeSwitcher()
        }}
        projects={projects}
        currentProjectId={currentProjectId}
        onPick={(projectId) => {
          setCurrentProject(projectId)
          markProjectChosen()
          closeSwitcher()
          navigateToProject(
            api.projectEntryRoute({
              projectId,
              route: projects.find((p) => p.projectId === projectId)?.route ?? 'dataDriven',
            }),
          )
        }}
        onCreate={() => {
          markProjectChosen()
          closeSwitcher()
          navigateToProject('/')
        }}
      />
      <div className={fullBleed ? '' : 'px-5'}>
        {!noSubHeader ? (
          subHeader ? (
            <div className="h-11 flex items-center">{subHeader}</div>
          ) : breadcrumb ? (
            <SubHeader breadcrumb={breadcrumb} right={subHeaderRight} />
          ) : null
        ) : null}
        {/* 流程步骤条：仅在流程步骤页出现（用路由匹配进度里的步骤） */}
        <FlowStepperBar />
        <main className={`${fullBleed ? '' : 'pb-10'} ${fullBleed ? '' : 'max-w-[1200px] mx-auto'}`}>{children}</main>
      </div>
    </div>
  )
}

/** 页面底部固定操作条 */
export function StickyFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-4 bg-transparent">
      <div className="ru-card flex items-center gap-3 px-4 py-3">
        <div className="flex-1 text-base text-ink-2">{children}</div>
      </div>
    </div>
  )
}
