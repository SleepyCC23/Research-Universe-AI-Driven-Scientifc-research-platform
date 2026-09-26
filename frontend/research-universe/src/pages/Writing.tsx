/** P05 论文写作（AI 全文生成 / 手动编辑） + P11 论文写作 · 全屏编辑器 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  InfoBanner,
  PageSkeleton,
  Segmented,
  Tag,
  Toggle,
  type Tone,
} from '@/components/ui'
import {
  IconAlert,
  IconArrowRight,
  IconBell,
  IconCheckCircle,
  IconClipboardCheck,
  IconDownload,
  IconFileText,
  IconQuote,
  IconRobot,
  IconSparkles,
  IconUpload,
} from '@/components/icons'
// 说明：编辑器正文 / 引用 / 改写动作已并入 `GET /writing` 的返回载荷，
// 不再直接 import `@/mocks/db`（后端接入时这里无需改动）。
import { useUiStore, useWritingStore } from '@/store'
import type { EditorBlock, OutlineNode, WritingMode, WritingPageData } from '@/types'
import type { RewriteAction } from '@/api/endpoints'

/* ============================================================
 * 章节 ↔ 段落 的对应关系工具
 * ------------------------------------------------------------
 * 背景（测试反馈）：点大纲里的章节只弹了一句「已切换到 X」，正文区始终渲染整篇段落，
 * 用户看不到「这一节到底有什么内容」。下面两个函数负责把段落与大纲章节对齐。
 * ========================================================== */

/**
 * 判断某段落是否属于当前选中的章节。
 * 规则（双向包含）：
 * - 完全相等算命中；
 * - 点**父级章节**（如「1 引言」）时，其子章节（1.1 / 1.2）的段落也算命中；
 * - 少量数据把段落标在父章节上，此时点子章节也应能带出来。
 */
function sectionMatches(paraSection: string, selected: string, outline: OutlineNode[]): boolean {
  if (!selected) return true
  if (paraSection === selected) return true
  const parent = outline.find((n) => n.title === selected)
  if (parent?.children?.some((c) => c.title === paraSection)) return true
  const asParent = outline.find((n) => n.title === paraSection)
  if (asParent?.children?.some((c) => c.title === selected)) return true
  return false
}

/** 大纲顺序索引：章节标题 → 序号（父节点排在其子节点之前），用于按大纲顺序重排段落 */
function outlineOrder(outline: OutlineNode[]): Record<string, number> {
  const map: Record<string, number> = {}
  let cursor = 0
  const walk = (nodes: OutlineNode[]) => {
    for (const n of nodes) {
      map[n.title] = cursor++
      if (n.children?.length) walk(n.children)
    }
  }
  walk(outline)
  return map
}

/** 大纲节点是否处于选中态（点父级时其子级也高亮，反之亦然） */
function isOutlineActive(node: OutlineNode, active: string | null): boolean {
  if (!active) return false
  if (node.title === active) return true
  return (node.children ?? []).some((c) => c.title === active)
}

/**
 * 「选中段落操作」按钮文案 → 后端 action 键。
 * 修复背景：旧实现四个按钮都把 `action` 写死成 `rewrite`、`paraId` 写死成 `'d2'`，
 * 四个按钮其实调的是同一个请求，正文也从不更新。
 */
const REWRITE_ACTION_KEY: Record<string, RewriteAction> = {
  重写: 'rewrite',
  缩写: 'shorten',
  扩写: 'expand',
  学术化改写: 'academic',
}

/** 段落操作的中文动作名（用于提示文案） */
const REWRITE_ACTION_LABEL: Record<RewriteAction, string> = {
  rewrite: '重写',
  shorten: '缩写',
  expand: '扩写',
  academic: '学术化改写',
  custom: '按提示词改写',
}

/* ============================================================
 * P05 论文写作
 * ========================================================== */
export default function WritingPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const { mode, setMode, pinMode, citationStyle, setCitationStyle, adoptedSuggestionIds, adoptSuggestion, autoSavedAt, setAutoSavedAt } =
    useWritingStore()

  /**
   * 把写作模式写回服务端（PATCH /writing/doc 的 mode 字段，只传 mode 不动正文）。
   *
   * 修复背景（「点 AI 全文生成没反应」的根因）：工作区两个视图与模式一一对应
   *   AI 全文生成 → /writing（大纲视图）
   *   手动编辑 → /writing/editor（编辑器视图）
   * 而 `load()` 会把**服务端下发的 mode 当作默认视图**。原先模式只活在前端 store、
   * 从不落库，服务端恒返回 aiAssist，于是「点 AI 全文生成 → 跳 /writing → 立刻被判为
   * aiAssist 又弹回 /editor」，肉眼就是点了没反应。现在切换即落库，服务端不再说谎。
   */
  async function persistMode(next: WritingMode) {
    try {
      await api.saveWritingDoc({ projectId, mode: next })
    } catch {
      // 落库失败不阻断视图切换：store 的 modePinned 已保证本次会话内不被服务端默认值覆写
      pushToast({ tone: 'warn', title: '模式已本地切换', description: '同步到服务端失败，刷新后可能回到默认视图' })
    }
  }

  /**
   * 切换写作模式：更新 store 并给出**可感知的反馈**。
   * 修复背景：此前切换后界面只有胶囊高亮变化、提示文案写死为「两种模式可随时切换」，
   * 用户点完看不出任何差别，反馈为「并没有切换成功」。
   */
  function handleSwitchMode(next: WritingMode) {
    if (next === mode) return
    pinMode(next)
    pushToast({
      tone: 'info',
      title: next === 'aiFull' ? '已切换为「AI 全文生成」' : '已切换为「手动编辑」',
      description:
        next === 'aiFull' ? '视图：写作大纲 + 按节生成 + 段落操作' : '视图：格式工具栏 + 插入引用 + AI 辅助建议',
    })
    /*
     * 两种模式对应**两套界面**（依设计稿）：
     *   AI 全文生成 → 本页（写作大纲 + 按节生成 + 段落操作 + 完成初稿）
     *   手动编辑 → 格式工具栏视图（/writing/editor：投稿格式条 + 工具栏 + 插入引用 + AI 辅助建议）
     * 故切换后跳到对应视图；两个视图共用同一份文档与同一份 `useWritingStore.mode`。
     * 注意：必须先 `await` 落库再跳页——否则目标页读到的还是旧的 mode，会立刻被弹回来。
     */
    void (async () => {
      await persistMode(next)
      if (next === 'aiAssist') navigate(`/project/${projectId}/writing/editor`)
    })()
  }

  /**
   * 底部卡片「进入手动编辑」：直接落到编辑器视图（/writing/editor）。
   *
   * 该视图的正文是 contenteditable 编辑面（等价于 Word 的编辑区），所以它就是「手动编辑」的落点。
   * 视图与模式一一对应，故这里复用 handleSwitchMode 的 `pinMode → 落库 → 跳页` 三步：
   * 少了落库这一步，目标页会读到服务端残留的 aiFull 而立刻把用户弹回本页（表现为「点了没反应」）。
   * 万一 mode 已是 aiAssist（正常不会出现，本页是 aiFull 视图），则直接跳，避免被 `next === mode` 拦下。
   */
  function handleEnterManualEdit() {
    if (mode === 'aiAssist') {
      navigate(`/project/${projectId}/writing/editor`)
      return
    }
    handleSwitchMode('aiAssist')
  }

  const [data, setData] = useState<WritingPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  /** 正在把当前稿件加入下载中心（导出中心） */
  const [publishing, setPublishing] = useState(false)
  /** 当前选中的段落（「选中段落操作」的作用对象）；方法章节不可选 */
  const [selectedParaId, setSelectedParaId] = useState<string | null>(null)
  /** 用户自己写的提示词（可选）：填了的话，内置动作也会把这条要求一并交给模型 */
  const [customPrompt, setCustomPrompt] = useState('')
  /** 正在执行的段落动作（用于按钮 loading / 禁用） */
  const [rewritingAction, setRewritingAction] = useState<RewriteAction | null>(null)
  /**
   * 当前章节（点击大纲切换）。
   * 修复背景：此前大纲点击只弹 Toast、不改状态，导致右侧「当前章节」与大纲高亮**永远不动**，
   * 用户点了看不到任何变化（与写作模式切换同一类缺陷）。
   */
  const [activeSection, setActiveSection] = useState<string | null>(null)
  /** 实际生效的章节名：本地点击优先，否则用接口下发的当前章节 */
  const currentSection = activeSection ?? data?.currentSection ?? ''

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchWriting(projectId)
      setData(d)
      /**
       * 视图与模式一一对应：本页是「AI 全文生成」视图（写作大纲 + 按节生成 + 段落操作）。
       * 服务端的 `mode` 只作**默认视图**：
       * - 本次会话用户已显式选过模式（modePinned）时以本地为准——否则刚点下的切换会被
       *   尚未刷新的服务端旧值弹回编辑器，表现为「点了没反应」；
       * - 否则按服务端 mode 决定，避免出现「高亮是辅助撰写、界面却是全文生成」的不一致。
       */
      const store = useWritingStore.getState()
      const view = store.modePinned ? store.mode : d.mode
      if (view === 'aiAssist') {
        setMode('aiAssist')
        navigate(`/project/${projectId}/writing/editor`, { replace: true })
        return
      }
      setMode('aiFull')
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 切项目时回到「全文」视图，避免沿用上一个项目的章节定位（旧项目未必有同名章节）
    setActiveSection(null)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  /**
   * 生成 / 重新生成本节。
   *
   * 修复的两个问题：
   * 1. 旧实现 `await api.regenerateSection(...)` 后**把返回值丢掉了**，用户只看到一句 toast，
   *    正文区没有任何变化 —— 肉眼看就是「点了没输出内容」。现在把返回的段落合并进本地草稿并渲染；
   * 2. 合并时只替换**本节**段落（其他章节原样保留），再按大纲顺序重排 P1..Pn 序号，
   *    同步刷新字数 / 段落数，避免生成一节把别的章节挤走。
   */
  async function handleRegenerateSection() {
    const section = currentSection
    if (!section) {
      pushToast({ tone: 'warn', title: '请先在大纲中选择要生成的章节' })
      return
    }
    setRegenerating(true)
    try {
      const res = await api.regenerateSection({ projectId, section })
      setData((d) => {
        if (!d) return d
        const kept = d.paragraphs.filter((p) => !sectionMatches(p.section, section, d.outline))
        const order = outlineOrder(d.outline)
        const paragraphs = [...kept, ...res.paragraphs]
          .map((p, i) => ({ p, i, o: order[p.section] ?? Number.MAX_SAFE_INTEGER }))
          .sort((a, b) => (a.o === b.o ? a.i - b.i : a.o - b.o))
          .map((x, i) => ({ ...x.p, index: i + 1 }))
        const wordCount = paragraphs.reduce((n, p) => n + p.text.replace(/\s+/g, '').length, 0)
        const now = new Date().toTimeString().slice(0, 5)
        return {
          ...d,
          paragraphs,
          currentSection: section,
          stats: { ...d.stats, wordCount, paragraphCount: paragraphs.length, lastEditedAt: now },
        }
      })
      // 生成后把视图切到该节，让生成的内容立刻出现在正文区（否则用户仍要看「全文」去找）
      setActiveSection(section)
      setAutoSavedAt(new Date().toTimeString().slice(0, 5))
      pushToast({
        tone: 'ok',
        title: `「${section}」已生成 ${res.paragraphs.length} 段`,
        description: '引用仍自动限定在已核验池内',
      })
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: '本节生成失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    } finally {
      setRegenerating(false)
    }
  }

  /**
   * 把当前稿件加入下载中心（导出中心的「论文正文」产物）。
   * 后端按 P1..Pn 组装全文并统计真实章节 / 段落 / 字数，文件在导出中心点导出时才生成。
   * @param go 是否顺带跳到导出中心
   */
  async function handlePublishToExportCenter(go: boolean) {
    setPublishing(true)
    try {
      const res = await api.publishManuscript({ projectId })
      pushToast({
        tone: 'ok',
        title: '已加入下载中心',
        description: `${res.metaText} · 可在导出中心选 DOCX / PDF / Markdown 下载`,
      })
      if (go) navigate(res.nextRoute)
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: '加入下载中心失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    } finally {
      setPublishing(false)
    }
  }

  /**
   * 点击大纲章节：把正文区切到该节，并明确反馈「这一节有多少内容」。
   * 修复反馈：旧实现只弹一句「已切换到 X」，既没说自己有没有内容，正文区也纹丝不动。
   */
  function selectSection(title: string) {
    setActiveSection(title)
    const count = (data?.paragraphs ?? []).filter((p) => sectionMatches(p.section, title, data?.outline ?? [])).length
    if (count) {
      pushToast({ tone: 'info', title: `已定位到「${title}」`, description: `本节约 ${count} 段，已在正文区展示` })
    } else {
      pushToast({ tone: 'warn', title: `「${title}」暂无内容`, description: '点「生成本节」让 AI 输出这一节' })
    }
  }

  /**
   * 段落操作：重写 / 缩写 / 扩写 / 学术化改写 / 按自定义提示词改写。
   * 全部走 `POST /projects/:projectId/writing/paragraph/rewrite`，并把返回的新文本**就地替换渲染**。
   * 修复的三处问题：
   *  1. `paraId` 写死 'd2'、`action` 写死 'rewrite' —— 四个按钮是同一个请求；
   *  2. 返回值被丢掉，正文不变（点了没反应）；
   *  3. 无处填写自己的提示词。
   */
  async function handleRewrite(action: RewriteAction) {
    if (!selectedParaId) {
      pushToast({ tone: 'warn', title: '请先点击选中要处理的段落', description: '在正文里点一下目标段落即可选中' })
      return
    }
    const instruction = customPrompt.trim()
    if (action === 'custom' && !instruction) {
      pushToast({ tone: 'warn', title: '请先填写自定义提示词', description: '例如：压缩到 80 字内，并改成学术书面语' })
      return
    }
    setRewritingAction(action)
    try {
      const res = await api.rewriteParagraph({
        projectId,
        paraId: selectedParaId,
        action,
        ...(instruction ? { instruction } : {}),
      })
      setData((d) => {
        if (!d) return d
        const paragraphs = d.paragraphs.map((p) =>
          p.paraId === res.paraId ? { ...p, text: res.text, aiGenerated: true, traceLabel: 'AI 改写' } : p,
        )
        const wordCount = paragraphs.reduce((n, p) => n + p.text.replace(/\s+/g, '').length, 0)
        return {
          ...d,
          paragraphs,
          stats: { ...d.stats, wordCount, lastEditedAt: new Date().toTimeString().slice(0, 5), unsavedChanges: 0 },
        }
      })
      setAutoSavedAt(new Date().toTimeString().slice(0, 5))
      pushToast({
        tone: 'ok',
        title: `已${REWRITE_ACTION_LABEL[action]}该段落`,
        description: instruction
          ? `按其要求：${instruction.slice(0, 24)}${instruction.length > 24 ? '…' : ''} · 仅改表达，不改论断`
          : '仅改表达，不改论断',
      })
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: '段落改写失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    } finally {
      setRewritingAction(null)
    }
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  /**
   * 正文区实际渲染的段落：
   * - 未选中章节 → 全文（保持原来的首屏体验）；
   * - 选中章节 → 只显示该节（点父级章节时含其子章节），让「点一下就能看到这一节的内容」成立。
   */
  const visibleParagraphs = activeSection
    ? data.paragraphs.filter((p) => sectionMatches(p.section, activeSection, data.outline))
    : data.paragraphs

  /**
   * 全文视图 = 成稿预览：按章节插入小标题，逐段读下来就是写完的那篇文章；
   * 单节视图保留 P 序号便于定位与「重新生成本节」。
   */
  const isFullView = !activeSection
  const renderedParagraphs = visibleParagraphs.map((p, i) => ({
    p,
    /** 章节变化时插入一次小标题（同一章节的连续段落只出现一次标题） */
    showHeading: Boolean(isFullView && p.section && p.section !== visibleParagraphs[i - 1]?.section),
  }))

  return (
    <AppLayout
      noSubHeader
      breadcrumb={[{ key: 'p', label: data.projectTitle }, { key: 'w', label: '论文写作' }]}      subHeaderRight={
        <span className="ru-hint">
          自动保存 {autoSavedAt}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => navigate(`/project/${projectId}/writing/editor`)}>
            打开全屏编辑器 →
          </Button>
        </span>
      }
    >
      {/* 顶部模式切换 */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Segmented
            value={mode}
            options={[
              { key: 'aiFull', label: 'AI 全文生成' },
              { key: 'aiAssist', label: '手动编辑' },
            ]}
            onChange={handleSwitchMode}
          />
          {/* 模式提示随选择变化，让「切换成功」有可见反馈 */}
          <span className="ru-hint">
            {mode === 'aiFull'
              ? '当前：AI 按大纲生成整节内容，可按节重新生成'
              : '当前：AI 只在你选中的段落上改写，不改动其他段落'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tag tone="ok" icon={<IconCheckCircle size={11} />}>
            引用仅可从已核验文献池选择
          </Tag>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/project/${projectId}/writing/editor`)}
          >
            预览初稿
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_340px] gap-4 pb-6">
        {/* 左：大纲 */}
        <aside className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconSparkles size={15} />}
              title="写作大纲"
              extra={<span className="ru-hint">可拖拽</span>}
            />
            <div className="space-y-1">
              {data.outline.map((n) => (
                <div key={n.nodeId}>
                  <button
                    draggable
                    onDragStart={() => setDraggingNode(n.nodeId)}
                    onDragEnd={() => setDraggingNode(null)}
                    onClick={() => selectSection(n.title)}
                    className={`w-full text-left px-2 py-1.5 rounded-[6px] text-base transition ${
                      draggingNode === n.nodeId
                        ? 'bg-brand-soft'
                        : isOutlineActive(n, activeSection)
                          ? 'bg-brand-soft text-brand font-medium'
                          : 'hover:bg-panel'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-ink font-medium truncate">{n.title}</span>
                      {n.citeCount ? <span className="text-xs text-ink-3 shrink-0">引用 {n.citeCount}</span> : null}
                    </span>
                    {n.flag === 'missingCitation' ? (
                      <span className="inline-flex mt-1">
                        <Tag tone="warn" size="sm">
                          缺对应文献
                        </Tag>
                      </span>
                    ) : null}
                    {n.flag === 'boundArtifact' ? (
                      <span className="inline-flex mt-1">
                        <Tag tone="neutral" size="sm">
                          绑定分析产物
                        </Tag>
                      </span>
                    ) : null}
                  </button>
                  {n.children?.map((c) => (
                    <button
                      key={c.nodeId}
                      onClick={() => selectSection(c.title)}
                      className={`w-full text-left pl-5 pr-2 py-1.5 rounded-[6px] text-base transition ${
                        activeSection === c.title ? 'bg-brand-soft text-brand font-medium' : 'text-ink-2 hover:bg-panel'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate">{c.title}</span>
                        {c.citeCount ? <span className="text-xs text-ink-3 shrink-0">引用 {c.citeCount}</span> : null}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* 全文 / 单节 视图切换：点章节后正文区只看该节，这里可以切回整篇 */}
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant={activeSection ? 'secondary' : 'primary'}
                size="sm"
                className="flex-1"
                onClick={() => setActiveSection(null)}
              >
                查看全文
              </Button>
              {activeSection ? (
                <span className="ru-hint truncate" title={activeSection}>
                  已定位：{activeSection}
                </span>
              ) : null}
            </div>
            <Button
              variant="secondary"
              fullWidth
              className="mt-3"
              icon={<IconSparkles size={13} />}
              onClick={async () => {
                await api.generateOutline({ projectId })
                pushToast({ tone: 'ok', title: '大纲已重新生成', description: '已引用 31 条已核验文献' })
              }}
            >
              生成 / 重排大纲
            </Button>
          </Card>
        </aside>

        {/* 中：正文 */}
        <section className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconFileText size={15} />}
              title="论文正文 · 初稿 v1（草稿）"
              note={
                activeSection
                  ? `正在查看「${activeSection}」· ${visibleParagraphs.length} 段 · 已自动保存`
                  : `当前章节：${currentSection} · 全文 ${visibleParagraphs.length} 段 · 已自动保存`
              }
              extra={
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<IconRobot size={13} />}
                  loading={regenerating}
                  onClick={handleRegenerateSection}
                >
                  {activeSection && visibleParagraphs.length === 0 ? '生成本节' : '重新生成本节'}
                </Button>
              }
            />

            {/* 单节视图提示条：让「点了章节之后正文区为什么变短了」一目了然，并给回全文的入口 */}
            {activeSection ? (
              <div className="mb-3 ru-panel flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-base text-ink min-w-0 truncate">
                  已定位章节：<span className="font-medium">{activeSection}</span>
                  <span className="ru-hint">（{visibleParagraphs.length} 段）</span>
                </span>
                <button className="text-xs text-brand hover:underline shrink-0" onClick={() => setActiveSection(null)}>
                  查看全文
                </button>
              </div>
            ) : null}

            {/* 文章标题：标蓝可点，点击进入编辑器修改（编辑器里标题与正文同一编辑面） */}
            <button
              onClick={() => navigate(`/project/${projectId}/writing/editor`)}
              title="点击修改文章标题"
              className="text-left text-xl font-semibold text-brand hover:underline leading-[30px] mb-3"
            >
              {data.title}
            </button>

            <div className="space-y-4">
              {/* 选中章节但该节还没有内容：给出明确空状态 + 一键生成，而不是悄悄显示别的章节 */}
              {activeSection && visibleParagraphs.length === 0 ? (
                <div className="ru-panel px-4 py-6 text-center">
                  <div className="text-base text-ink">「{activeSection}」还没有内容</div>
                  <p className="ru-hint mt-1.5 leading-[20px]">
                    AI 会依据大纲与已核验文献生成本节，生成后可逐段重写；结果自动保存到草稿。
                  </p>
                  <Button
                    className="mt-3"
                    icon={<IconSparkles size={13} />}
                    loading={regenerating}
                    onClick={handleRegenerateSection}
                  >
                    生成本节
                  </Button>
                </div>
              ) : null}

              {renderedParagraphs.map(({ p, showHeading }) => {
                /** 方法章节绑定分析产物，按约定不可改写 → 不可选中 */
                const selectable = p.kind !== 'boundMethod'
                const selected = selectedParaId === p.paraId
                return (
                  <div key={p.paraId}>
                    {/* 全文视图按章节插小标题，读下来就是一篇成稿 */}
                    {showHeading ? (
                      <h3 className="mt-1 text-lg font-semibold text-ink border-b border-line pb-1.5">{p.section}</h3>
                    ) : null}
                    {p.kind === 'boundMethod' ? (
                      <div className="ru-panel p-3 border-warn-line bg-warn-soft/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Tag tone="warn" size="sm">
                            P{p.index}
                          </Tag>
                          <span className="inline-flex items-center gap-1 text-xs text-warn">
                            <IconAlert size={11} /> 方法章节 · 与项目内分析产物绑定，不可修改
                          </span>
                        </div>
                        <p className="text-base text-ink leading-[24px]">{p.text}</p>
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        title="点击选中该段落，再用下方「选中段落操作」改写"
                        onClick={() => setSelectedParaId((cur) => (cur === p.paraId ? null : p.paraId))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedParaId((cur) => (cur === p.paraId ? null : p.paraId))
                          }
                        }}
                        className={`rounded-card px-2 py-1 -mx-2 cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 ${
                          selected ? 'bg-brand-soft/50 ring-1 ring-brand/30' : 'hover:bg-panel'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {p.aiGenerated ? (
                            <Tag tone="brand" size="sm" icon={<IconSparkles size={10} />}>
                              {p.traceLabel}
                            </Tag>
                          ) : null}
                          {/* 全文视图已有章节小标题，这里不再重复段落序号与章节名 */}
                          {isFullView ? null : (
                            <span className="ru-hint">
                              P{p.index} · {p.section}
                            </span>
                          )}
                          {selected ? (
                            <Tag tone="ok" size="sm">
                              已选中
                            </Tag>
                          ) : null}
                        </div>
                        <p className="text-base text-ink leading-[26px]">{p.text}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 ru-panel px-3 py-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="ru-hint shrink-0">选中段落操作：</span>
                {data.rewriteActions.map((a) => {
                  const key = REWRITE_ACTION_KEY[a] ?? 'rewrite'
                  return (
                    <button
                      key={a}
                      disabled={rewritingAction !== null}
                      onClick={() => void handleRewrite(key)}
                      title={selectedParaId ? `对选中段落执行「${a}」` : '请先点击正文中的段落'}
                      className="h-7 px-2.5 rounded-[6px] border border-line-strong bg-white text-xs text-ink-2
                                 hover:border-brand hover:text-brand disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {rewritingAction === key ? '处理中…' : a}
                    </button>
                  )
                })}
                <span className="ru-hint">（仅改表达，不改论断）</span>
              </div>

              {/* 自定义提示词：留空则只按上面的内置动作改写；填了就作为额外要求一并交给模型 */}
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="ru-input h-8"
                  placeholder="自定义提示词（可选），例如：压缩到 80 字内，并改成学术书面语"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleRewrite('custom')
                  }}
                />
                <Button
                  size="sm"
                  loading={rewritingAction === 'custom'}
                  disabled={rewritingAction !== null}
                  onClick={() => void handleRewrite('custom')}
                >
                  按提示词改写
                </Button>
              </div>
              <p className="ru-hint mt-1.5">
                {selectedParaId
                  ? `已选中 P${data.paragraphs.findIndex((p) => p.paraId === selectedParaId) + 1} · ${
                      data.paragraphs.find((p) => p.paraId === selectedParaId)?.section ?? ''
                    }（结果会直接替换该段并自动保存）`
                  : '点击正文任意段落即可选中；方法章节与分析产物绑定，不可改写。'}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <span className="ru-hint">
                字数 {data.stats.wordCount.toLocaleString()} · 段落 {data.stats.paragraphCount} · 引用 {data.stats.citationCount}
                （全部来自已核验池）
              </span>
              <span className="ru-hint">AI 工具使用情况说明草稿已同步生成</span>
            </div>
          </Card>

          {/* 全文视图专属：把写完的这篇稿子送去下载中心（只在「查看全文」时出现，避免单节视图误导） */}
          {isFullView ? (
            <Card className="!border-brand-line bg-brand-soft/40">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-base font-medium text-ink">这篇文章可以导出了</div>
                  <p className="ru-hint mt-1 leading-[20px]">
                    已按大纲顺序组装全文（共 {visibleParagraphs.length} 段）。加入下载中心后，可在「导出中心」选择
                    DOCX / PDF / Markdown 下载；导出物带不可移除溯源标识，并随附《AI 使用情况说明》。
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    icon={<IconDownload size={14} />}
                    loading={publishing}
                    onClick={() => void handlePublishToExportCenter(false)}
                  >
                    加入下载中心
                  </Button>
                  <Button
                    trailingIcon={<IconArrowRight size={14} />}
                    loading={publishing}
                    onClick={() => void handlePublishToExportCenter(true)}
                  >
                    加入并前往
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="!border-brand-line bg-brand-soft/40">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="ru-hint">
                初稿 v1 · 字数 {data.stats.wordCount.toLocaleString()} · 段落 {data.stats.paragraphCount} · AI 标识已开启 · 最后编辑{' '}
                {data.stats.lastEditedAt}
              </span>
              {/*
                两个出口各司其职：
                - 主按钮「进入手动编辑」→ 编辑器视图（/writing/editor，正文可直接改）；
                - 次按钮「完成初稿，进入选刊」→ 保留原有的选刊流程，不让老路径断掉。
              */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/project/${projectId}/journal`)}
                >
                  完成初稿，进入选刊
                </Button>
                <Button
                  trailingIcon={<IconArrowRight size={14} />}
                  onClick={handleEnterManualEdit}
                >
                  进入手动编辑
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* 右：引用引擎 / 政策 / Zotero */}
        <aside className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconQuote size={15} />}
              title="引用引擎（CSL）"
              extra={<span className="ru-hint">已核验池 {data.stats.citationCount} 条</span>}
            />
            <Segmented
              size="sm"
              value={citationStyle}
              options={[
                { key: 'APA7', label: 'APA 7' },
                { key: 'GBT7714', label: 'GB/T 7714' },
              ]}
              onChange={setCitationStyle}
            />
            <div className="mt-3 space-y-3">
              {data.citations.map((c) => (
                <div key={c.index} className="text-xs text-ink-2 leading-[20px]">
                  <span className="text-ink">[{c.index}] </span>
                  {citationStyle === 'APA7' ? c.apaText : c.gbText}
                </div>
              ))}
            </div>
            <p className="ru-hint mt-3">
              文内引用与参考文献表自动排版，增删文献自动重编号；未验证条目不入表。
            </p>
          </Card>

          <Card>
            <CardHeader icon={<IconBell size={15} />} title="目标期刊 AI 政策提醒" />
            <p className="text-base text-ink leading-[22px]">
              《{data.aiPolicyReminder.journal}》要求披露 AI 使用范围，禁止 AIGC 直出结论
            </p>
            <p className="ru-hint mt-2">各校 / 各刊政策动态更新，最近同步 {data.aiPolicyReminder.syncedAt}</p>
          </Card>

          <Card>
            <CardHeader
              icon={<IconCheckCircle size={15} />}
              title="Zotero 联动"
              extra={<Tag tone="ok" size="sm">已绑定</Tag>}
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="ru-hint">OAuth 授权（zotero.org）</span>
                <span className="text-base text-ink">{data.zotero.account}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="ru-hint">双向同步（推送到指定文件夹）</span>
                <Toggle
                  checked={data.zotero.bidirectionalSync}
                  onChange={async (v) => {
                    await api.bindZotero({ bind: v })
                    pushToast({ tone: v ? 'ok' : 'info', title: v ? '已开启双向同步' : '已关闭双向同步' })
                  }}
                />
              </div>
              <div>
                <div className="text-xs text-ink font-medium">限速与退避</div>
                <p className="ru-hint">{data.zotero.rateLimitText}</p>
              </div>
              <div className="ru-panel px-2.5 py-2 flex items-center gap-2">
                <IconUpload size={13} className="text-ink-3" />
                <span className="ru-hint">{data.zotero.fallbackText}</span>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </AppLayout>
  )
}

/* ============================================================
 * 编辑器初始 HTML
 * 把接口下发的正文块转成编辑面的初始内容；渲染一次后由浏览器维护 DOM（React 不再接管），
 * 因此这里要带上行内样式（标题字号、首行缩进、上标引用、AI 标识）。
 * ========================================================== */
function buildEditorHtml(title: string, authorLine: string, blocks: EditorBlock[]): string {
  const head =
    `<h1 style="text-align:center;font-size:20px;font-weight:600;line-height:30px">${title}</h1>` +
    `<p style="text-align:center;color:#5A6473;margin:12px 0 0">${authorLine}</p>`
  const body = blocks
    .map((b) => {
      if (b.kind === 'heading') {
        return `<h2 style="font-size:16px;font-weight:600;padding-top:12px">${b.text}</h2>`
      }
      if (b.kind === 'aiLabel') {
        return `<p contenteditable="false" style="color:#2563EB;font-size:12px;margin:8px 0 0">${b.text}</p>`
      }
      const cite = b.citeIndex ? `<sup style="color:#2563EB">[${b.citeIndex}]</sup>` : ''
      return `<p style="text-indent:2em;margin:6px 0">${b.text}${cite}</p>`
    })
    .join('')
  return head + body
}

/* ============================================================
 * P11 论文写作 · 全屏编辑器
 * ========================================================== */
export function WritingEditorPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const { mode, setMode, pinMode, citationStyle, setCitationStyle, adoptedSuggestionIds, adoptSuggestion, autoSavedAt, setAutoSavedAt, setSaving } =
    useWritingStore()

  /**
   * 把写作模式写回服务端（PATCH /writing/doc，只传 mode 不动正文）。
   * 原因见 WritingPage.persistMode：不落库的话，跳回 /writing 会被服务端默认的
   * aiAssist 立刻弹回本页，用户看到的就是「点 AI 全文生成没反应」。
   */
  async function persistMode(next: WritingMode) {
    try {
      await api.saveWritingDoc({ projectId, mode: next })
    } catch {
      pushToast({ tone: 'warn', title: '模式已本地切换', description: '同步到服务端失败，刷新后可能回到默认视图' })
    }
  }

  /**
   * 切换写作模式。
   * 修复背景：此处原来写成 `useWritingStore.getState().mode` + `getState().setMode(v)` ——
   * getState() 是一次性读取、**不会订阅**，点击后 store 已变但组件不重渲染，
   * 因此界面上永远是原选项高亮，看起来就是「并没有切换成功」。
   * 现在改为解构订阅 + 切换反馈，并且**先落库再跳页**。
   */
  function handleSwitchMode(next: WritingMode) {
    if (next === mode) return
    pinMode(next)
    pushToast({
      tone: 'info',
      title: next === 'aiFull' ? '已切换为「AI 全文生成」' : '已切换为「手动编辑」',
      description:
        next === 'aiFull' ? '视图：写作大纲 + 按节生成 + 段落操作' : '视图：格式工具栏 + 插入引用 + AI 辅助建议',
    })
    // 切回「AI 全文生成」时回到大纲视图（/writing）；两个视图共用同一份文档与 mode。
    // 必须先落库再跳页：/writing 会把服务端 mode 当默认视图，旧值会把用户弹回本页。
    void (async () => {
      await persistMode(next)
      if (next === 'aiFull') navigate(`/project/${projectId}/writing`)
    })()
  }

  const [data, setData] = useState<WritingPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(100)
  /** 投稿前检查清单是否展开（内容来自 `data.submissionChecklist`） */
  const [checklistOpen, setChecklistOpen] = useState(false)

  /* ============================================================
   * 可编辑正文（等价于 Word 的编辑面）
   * 实现方式：contenteditable + document.execCommand（零依赖）。
   * 之前这里是「只读渲染」——点了不能输入、工具栏点了只弹 Toast，用户反馈「并不能真实撰写」。
   * 现在：可输入、工具栏真正生效、插入动作作用于光标、输入后防抖自动保存。
   * ========================================================== */
  /** 编辑面 DOM 引用 */
  const paperRef = useRef<HTMLDivElement>(null)
  /** 防抖保存定时器 */
  const saveTimer = useRef<number | null>(null)
  /** 未保存的修改处数（本地实时计数，保存成功后归零） */
  const [unsaved, setUnsaved] = useState(0)
  /** 实时字数（null 表示尚未编辑，沿用接口返回的初始字数） */
  const [liveWordCount, setLiveWordCount] = useState<number | null>(null)
  /** 行距作用在整篇文档上（execCommand 不提供行距命令） */
  const [lineHeight, setLineHeight] = useState('1.5')
  /** 当前选中的字号（execCommand fontSize 只接受 1~7 档） */
  const [fontSizeLevel, setFontSizeLevel] = useState('3')
  /** 文档字体（作用于整篇，与设计稿默认「思源宋体」一致） */
  const [fontFamily, setFontFamily] = useState('思源宋体')

  /** 由接口载荷生成编辑面初始 HTML（仅首次渲染；之后由浏览器维护 DOM，React 不再接管） */
  const initialHtml = useMemo(
    () => (data ? buildEditorHtml(data.title, data.authorLine, data.editorBody) : ''),
    [data],
  )
  /**
   * 首次挂载时正文的实际字数。
   * 用途：接口返回的 `stats.wordCount` 是**整篇文档**的字数（Mock 只下发节选，实际 DOM 更短），
   * 因此以它为基线、显示「基线 + 编辑增量」，避免首次编辑时字数从 2,148 突降到几百。
   */
  const initialWordsRef = useRef<number | null>(null)
  useEffect(() => {
    const el = paperRef.current
    if (!el || initialWordsRef.current !== null) return
    initialWordsRef.current = computeWords(el.innerText)
  }, [initialHtml])
  /** 行距选项（Word 常见档位） */
  const lineHeightOptions = [
    { key: '1', label: '单倍行距' },
    { key: '1.5', label: '1.5 倍行距' },
    { key: '2', label: '2 倍行距' },
  ]
  /** 字号档位：execCommand fontSize 的 1~7 与中文习惯字号对应 */
  const fontSizeOptions = [
    { key: '2', label: '五号' },
    { key: '3', label: '小四' },
    { key: '4', label: '四号' },
    { key: '5', label: '三号' },
  ]

  /** 字数口径：中文按字、英文按词（与 Word 的「字数」接近） */
  function computeWords(text: string): number {
    const flat = text.replace(/\s+/g, ' ').trim()
    if (!flat) return 0
    const cjk = (flat.match(/[\u4e00-\u9fa5]/g) ?? []).length
    const latin = (flat.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) ?? []).length
    return cjk + latin
  }

  /** 落库：把编辑面 HTML 交回服务端；成功后「尚未保存的修改」归零 */
  async function flushSave() {
    const html = paperRef.current?.innerHTML ?? ''
    const res = await api.saveWritingDoc({ projectId, content: html })
    setAutoSavedAt(res.autoSavedAt)
    setUnsaved(0)
  }

  /** 输入处理：更新实时字数 → 累加未保存计数 → 1.5s 防抖自动保存 */
  function handleEditorInput() {
    const el = paperRef.current
    if (!el) return
    setLiveWordCount(computeWords(el.innerText))
    setUnsaved((n) => n + 1)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void flushSave(), 1500)
  }

  /** 执行编辑器命令（工具栏用 onMouseDown 阻止默认行为以保住选区） */
  function exec(cmd: string, value?: string) {
    paperRef.current?.focus()
    document.execCommand(cmd, false, value)
    handleEditorInput()
  }

  /** 在光标处插入 HTML 片段 */
  function insertHtml(html: string) {
    exec('insertHTML', html)
  }

  /** 插入引用：光标处插入上标标号，并调用接口累加参考文献数 */
  async function insertCitationAtCursor(index: number) {
    insertHtml(`<sup style="color:#2563EB">[${index}]</sup>`)
    const res = await api.insertCitation({ projectId, paperId: 'pp' + index, style: citationStyle })
    setData((d) => (d ? { ...d, stats: { ...d.stats, citationCount: res.citationCount } } : d))
    pushToast({ tone: 'ok', title: `已在光标处插入引用 [${res.index}]`, description: '参考文献数已同步更新' })
  }

  /** 插入表格 / 图表 / 公式 的片段（真实插入到光标位置） */
  const INSERT_SNIPPETS: Record<string, string> = {
    插入表格: `<table style="border-collapse:collapse;width:100%;margin:8px 0"><tbody><tr><td style="border:1px solid #D5DCE7;padding:6px">变量</td><td style="border:1px solid #D5DCE7;padding:6px">M</td><td style="border:1px solid #D5DCE7;padding:6px">SD</td></tr><tr><td style="border:1px solid #D5DCE7;padding:6px">社交焦虑</td><td style="border:1px solid #D5DCE7;padding:6px">—</td><td style="border:1px solid #D5DCE7;padding:6px">—</td></tr></tbody></table>`,
    插入图表: `<p style="text-align:center;border:1px dashed #D5DCE7;padding:16px;color:#8C96A8;margin:8px 0">［图表占位：来自分析结果包的可复现图］</p>`,
    插入公式: `<span style="font-style:italic">β = 0.412, 95% CI [0.301, 0.523]</span>`,
  }

  useEffect(() => {
    void (async () => {
      try {
        const d = await api.fetchWriting(projectId)
        setData(d)
        // 未保存计数以接口返回的初始值为准，之后由本地编辑实时累加
        setUnsaved(d.stats.unsavedChanges)
        // 本页是「手动编辑」视图（格式工具栏 + 插入引用 + AI 辅助建议），模式随视图固定，
        // 不覆盖用户的在途选择（否则会与从 P05 切过来的选择打架）。
        // 例外：用户刚显式切到「AI 全文生成」（modePinned + aiFull）时不要覆盖，
        // 否则这次切换会被本页的异步加载打回，表现为「点了没反应」。
        const store = useWritingStore.getState()
        if (!(store.modePinned && store.mode === 'aiFull')) setMode('aiAssist')
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  /** 自动保存：模拟 debounce 保存 */
  async function triggerAutoSave() {
    setSaving(true)
    try {
      const res = await api.saveWritingDoc({ projectId, content: 'draft' })
      pushToast({ tone: 'ok', title: '已自动保存', description: res.autoSavedAt })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (!data)
    return (
      <AppLayout noSubHeader>
        <div className="pt-4">
          <ErrorState onRetry={() => location.reload()} />
        </div>
      </AppLayout>
    )

  const editor = data.editor!
  /** 显示字数 = 接口基线 + 本次编辑增量（未挂载完成时直接显示接口值） */
  const displayWords =
    liveWordCount === null || initialWordsRef.current === null
      ? data.stats.wordCount
      : data.stats.wordCount + (liveWordCount - initialWordsRef.current)

  return (
    <AppLayout
      breadcrumb={[{ key: 'p', label: data.projectTitle }, { key: 'w', label: '论文写作 · 手动编辑' }]}
      subHeaderRight={
        <>
          <span className="ru-hint inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" /> 已自动保存 {autoSavedAt}
          </span>
          <Button
            variant="secondary"
            size="sm"
            icon={<IconUpload size={13} />}
            onClick={() => pushToast({ tone: 'ok', title: '投稿包已导出', description: '已联动导出中心' })}
          >
            导出投稿包
          </Button>
          <Button
            size="sm"
            onClick={() => {
              // 结果来自接口载荷 `data.submissionChecklist`，不在前端写死「6 项中 5 项」
              const pending = data.submissionChecklist.items.filter((x) => !x.passed)
              setChecklistOpen(true)
              pushToast({
                tone: pending.length ? 'warn' : 'ok',
                title: '投稿检查清单已生成',
                description: pending.length
                  ? `${data.submissionChecklist.total} 项中 ${data.submissionChecklist.done} 项已完成，${pending.map((p) => p.pendingText ?? p.text).join('、')}`
                  : `${data.submissionChecklist.total} 项全部通过，可导出投稿包`,
              })
            }}
          >
            生成投稿检查清单
          </Button>
        </>
      }
    >
      {/* 模式 + 工具条 */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <Segmented
            value={mode}
            options={[
              { key: 'aiFull', label: 'AI 全文生成' },
              { key: 'aiAssist', label: '手动编辑' },
            ]}
            onChange={handleSwitchMode}
          />
          {/* 模式提示随选择变化（此前是写死的一句「两种模式可随时切换」，切换后界面无任何变化，看起来像没生效） */}
          <span className="ru-hint">
            {mode === 'aiFull'
              ? '当前：AI 按大纲生成整节内容，可按节重新生成'
              : '当前：AI 只在你选中的段落上改写，不改动其他段落'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tag tone="ok" icon={<IconCheckCircle size={11} />}>
            引用仅可从已核验文献池选择
          </Tag>
          <Button variant="secondary" size="sm" onClick={triggerAutoSave}>
            预览初稿
          </Button>
        </div>
      </div>

      {/* 投稿格式条 */}
      <Card className="mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="ru-hint">期刊投稿格式</span>
          <select className="h-8 px-2 pr-7 text-base border border-line rounded-card bg-white outline-none focus:border-brand">
            {/* 投稿格式选项由接口下发（editor.journalFormatOptions），不在前端写死目标期刊 */}
            {editor.journalFormatOptions.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <span className="ru-hint">文内引用：{editor.inTextLabel} · 参考文献 {data.stats.citationCount} 条</span>
          <div className="ml-auto flex items-center gap-4 ru-hint">
            <span>字数 {data.stats.wordCount.toLocaleString()}</span>
            <span>页数 {editor.pageCount}</span>
            <span className="flex items-center gap-1">
              缩放
              <button className="text-ink-3 hover:text-ink" onClick={() => setZoom((z) => Math.max(60, z - 10))}>
                −
              </button>
              <span className="tabular-nums w-8 text-center">{zoom}%</span>
              <button className="text-ink-3 hover:text-ink" onClick={() => setZoom((z) => Math.min(160, z + 10))}>
                +
              </button>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* 字体：作用在整篇文档上（相当于 Word 的「文档字体」） */}
          <select
            className="h-8 px-2 pr-7 text-base border border-line rounded-card bg-white outline-none focus:border-brand"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            title="文档字体"
          >
            {/* 去重：editor.fontName 可能与固定选项重复，会导致 React key 重复警告 */}
            {Array.from(new Set([editor.fontName, '宋体', '黑体', 'Times New Roman'])).map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          {/* 字号：作用于选中文字（execCommand fontSize，档位 1~7） */}
          <select
            className="h-8 px-2 pr-7 text-base border border-line rounded-card bg-white outline-none focus:border-brand"
            value={fontSizeLevel}
            onChange={(e) => {
              setFontSizeLevel(e.target.value)
              exec('fontSize', e.target.value)
            }}
            onMouseDown={(e) => e.preventDefault()}
            title="字号（作用于选中文字）"
          >
            {fontSizeOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {/* 行距：作用于整篇（execCommand 不提供行距命令） */}
          <select
            className="h-8 px-2 pr-7 text-base border border-line rounded-card bg-white outline-none focus:border-brand"
            value={lineHeight}
            onChange={(e) => setLineHeight(e.target.value)}
            title="行距（作用于整篇）"
          >
            {lineHeightOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="w-px h-5 bg-line mx-1" />
          {/* 格式按钮：onMouseDown 阻止默认行为以保住正文选区，再执行命令 */}
          {[
            { key: 'B', title: '加粗', run: () => exec('bold') },
            { key: 'I', title: '斜体', run: () => exec('italic') },
            { key: 'U', title: '下划线', run: () => exec('underline') },
            { key: '≡', title: '左对齐', run: () => exec('justifyLeft') },
            { key: 'A', title: '字体颜色（品牌蓝）', run: () => exec('foreColor', '#2563EB') },
            { key: 'H1', title: '一级标题', run: () => exec('formatBlock', 'h2') },
            { key: 'H2', title: '二级标题', run: () => exec('formatBlock', 'h3') },
          ].map((t) => (
            <button
              key={t.key}
              title={t.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={t.run}
              className="w-8 h-8 rounded-[6px] border border-line bg-white text-base text-ink-2 hover:border-brand hover:text-brand"
            >
              {t.key}
            </button>
          ))}
          <span className="w-px h-5 bg-line mx-1" />
          {/* 插入动作：真正插入到光标位置（此前只弹 Toast） */}
          <Button
            variant="secondary"
            size="sm"
            icon={<IconQuote size={13} />}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void insertCitationAtCursor(data.stats.citationCount + 1)}
          >
            插入引用
          </Button>
          {(['插入表格', '插入图表', '插入公式'] as const).map((label) => (
            <Button
              key={label}
              variant="secondary"
              size="sm"
              icon={
                label === '插入表格' ? (
                  <IconFileText size={13} />
                ) : label === '插入图表' ? (
                  <IconChartMini />
                ) : (
                  <span>Σ</span>
                )
              }
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertHtml(INSERT_SNIPPETS[label])}
            >
              {label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 pb-8">
        {/* 纸张区 */}
        <section className="ru-panel p-6 flex justify-center">
          <div
            className="bg-white border border-line rounded-[4px] shadow-card px-14 py-12 w-full max-w-[720px]"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* 可编辑正文：点击即可输入，工具栏作用于选区；标题与正文同属一个编辑面 */}
            <div
              ref={paperRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              spellCheck={false}
              role="textbox"
              aria-multiline="true"
              aria-label="论文正文（可直接编辑）"
              className="mt-2 font-song focus:outline-none min-h-[340px]"
              style={{ lineHeight, fontSize: 15, fontFamily }}
              dangerouslySetInnerHTML={{ __html: initialHtml }}
            />

            <div className="mt-8 space-y-3 font-song">
              {/* 知识库插入浮层 */}
              <div className="!mt-6 border border-brand-line rounded-card overflow-hidden">
                <div className="flex items-center justify-between bg-brand-soft px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-brand">
                    <IconQuote size={12} /> 以下文献来自项目知识库（均已双 Agent 核验）
                  </span>
                  <button className="text-ink-3 hover:text-ink">
                    <IconAlert size={12} />
                  </button>
                </div>
                <div className="divide-y divide-line">
                  {data.editorCitations.map((c) => (
                    <div key={c.index} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-base text-ink truncate">
                          <span className="text-ink-3 mr-1">{c.index}</span>
                          {c.title}
                        </div>
                        <div className="ru-hint">
                          {c.journal} · {c.year}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          // 真实模式：必须用后端下发的真实 paperId（'pp'+index 是 Mock 遗留的假 id，会报「文献不存在」）
                          const realPaperId: unknown = (c as { paperId?: unknown }).paperId
                          if (typeof realPaperId !== 'string' || !realPaperId) {
                            pushToast({ tone: 'warn', title: '暂无可引用文献', description: '请先到「文献检索」页核验并带入文献' })
                            return
                          }
                          try {
                            const res = await api.insertCitation({ projectId, paperId: realPaperId, style: citationStyle })
                            pushToast({ tone: 'ok', title: `已在光标处插入引用 [${res.index}]`, description: `并按 ${editor.citationStyleLabel} 生成文内标号` })
                          } catch (e) {
                            pushToast({ tone: 'warn', title: '插入失败', description: e instanceof Error ? e.message : '请稍后重试' })
                          }
                        }}
                      >
                        插入引用
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <p className="ru-hint">引用将自动插入当前光标位置，并按 {editor.citationStyleLabel} 生成文内标号与参考文献条目。</p>
              <p className="ru-hint">
                本页共 {displayWords.toLocaleString()} 字 · 引用 {data.stats.citationCount} 条，均来自已核验文献池 ·{' '}
                <span className={unsaved > 0 ? 'text-warn' : ''}>尚未保存的修改 {unsaved}</span>
              </p>
              <p className="ru-hint mt-1">
                正文可直接点击编辑（支持 Ctrl+B / I / U），工具栏与「插入」动作作用于当前光标位置，停止输入 1.5 秒后自动保存。
              </p>
            </div>
          </div>
        </section>

        {/* 右侧工具 */}
        <aside className="space-y-4">
          {/* 投稿前检查清单：点击顶部「生成投稿检查清单」后展开，数据来自接口载荷 */}
          {checklistOpen ? (
            <Card>
              <CardHeader
                icon={<IconClipboardCheck size={15} />}
                title="投稿前检查清单"
                note={`${data.submissionChecklist.done}/${data.submissionChecklist.total} 项已完成`}
                extra={
                  <Button variant="link" size="sm" onClick={() => setChecklistOpen(false)}>
                    收起
                  </Button>
                }
              />
              <div className="space-y-2">
                {data.submissionChecklist.items.map((c) => (
                  <div key={c.checkId} className="flex items-start gap-2">
                    <span className={`mt-[3px] shrink-0 ${c.passed ? 'text-ok' : 'text-warn'}`}>
                      {c.passed ? <IconCheckCircle size={13} /> : <IconAlert size={13} />}
                    </span>
                    <span className="text-base text-ink min-w-0">
                      {c.text}
                      {!c.passed && c.pendingText ? <span className="text-warn"> · {c.pendingText}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              icon={<IconQuote size={15} />}
              title="知识库文献（可插入）"
              extra={<span className="ru-hint">{data.kbDocCount} 条已核验</span>}
            />
            <input className="ru-input" placeholder="搜索知识库文献，支持标题 / 作者 / 关键词" />
            <div className="mt-3 space-y-2">
              {data.kbDocs.map((d) => (
                <div key={d.paperId} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-start gap-1.5">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ok shrink-0" />
                      <span className="text-base text-ink leading-[20px]">{d.title}</span>
                    </div>
                    <div className="ru-hint pl-3">{d.metaText}</div>
                  </div>
                  <button
                    className="text-xs text-brand hover:underline shrink-0"
                    onClick={async () => {
                      try {
                        await api.insertCitation({ projectId, paperId: d.paperId, style: citationStyle })
                        pushToast({ tone: 'ok', title: '已插入引用' })
                      } catch (e) {
                        pushToast({ tone: 'warn', title: '插入失败', description: e instanceof Error ? e.message : '请稍后重试' })
                      }
                    }}
                  >
                    插入引用
                  </button>
                </div>
              ))}
            </div>
            <p className="ru-hint mt-3">仅显示已通过双 Agent 核验的文献；未验证条目不可插入，也不会进入参考文献表。</p>
          </Card>

          <Card>
            <CardHeader icon={<IconQuote size={15} />} title="引用与格式" extra={<span className="ru-hint">修改后实时重排</span>} />
            <div className="space-y-2.5">
              <EditorKV label="引用样式" value={editor.citationStyleLabel} />
              <EditorKV label="文内引用" value={editor.inTextLabel} />
              <EditorKV label="参考文献" value={`${data.stats.citationCount} 条`} />
              <EditorKV label="目标期刊" value={data.targetJournal.name} />
            </div>
            <Button
              variant="secondary"
              fullWidth
              className="mt-3"
              onClick={async () => {
                // 切换样式只做重排，不插入新条目（原实现用假 paperId 'pp1' 插入一条引用来触发，会报「文献不存在」）
                const nextStyle = citationStyle === 'APA7' ? 'GBT7714' : 'APA7'
                setCitationStyle(nextStyle)
                await api.switchCitationStyle({ projectId, style: nextStyle })
                pushToast({ tone: 'ok', title: '引用样式已切换', description: '正文与参考文献已实时重排' })
              }}
            >
              切换引用样式
            </Button>
          </Card>

          <Card>
            <CardHeader
              icon={<IconSparkles size={15} />}
              title="AI 辅助建议"
              extra={<span className="ru-hint">{data.aiSuggestions.length} 条</span>}
            />
            <p className="ru-hint mb-2">AI 提供的建议仅供参考，请您手动选择是否采纳每条建议</p>
            <div className="space-y-2">
              {data.aiSuggestions.map((s) => {
                const adopted = adoptedSuggestionIds.includes(s.suggestionId)
                return (
                  <div key={s.suggestionId} className="flex items-start justify-between gap-2 ru-panel px-2.5 py-2">
                    <span className="flex items-start gap-1.5 min-w-0">
                      <span className="mt-0.5 text-brand shrink-0">
                        <IconSparkles size={12} />
                      </span>
                      <span className="text-base text-ink-2 leading-[20px]">{s.text}</span>
                    </span>
                    <button
                      className={`text-xs shrink-0 ${adopted ? 'text-ink-3' : 'text-brand hover:underline'}`}
                      onClick={async () => {
                        if (adopted) return
                        await api.adoptSuggestion({ projectId, suggestionId: s.suggestionId })
                        adoptSuggestion(s.suggestionId)
                        pushToast({ tone: 'ok', title: '已采纳建议' })
                      }}
                    >
                      {adopted ? '已采纳' : '采纳'}
                    </button>
                  </div>
                )
              })}
            </div>
          </Card>

          <InfoBanner tone="warn">
            <span className="inline-flex items-start gap-1.5">
              <IconAlert size={14} className="mt-0.5 shrink-0" />
              提交前请确认：AI 使用情况说明、伦理与数据可得性声明均已齐备。
            </span>
          </InfoBanner>
        </aside>
      </div>
    </AppLayout>
  )
}

function EditorKV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="ru-hint">{label}</span>
      <span className="text-base text-ink font-medium">{value}</span>
    </div>
  )
}

function IconChartMini() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  )
}

/** 导出大纲类型（供外部复用） */
export type { OutlineNode }
