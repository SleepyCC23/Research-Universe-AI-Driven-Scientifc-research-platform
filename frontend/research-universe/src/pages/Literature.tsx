/** P03 论文引言 · 文献综述（语义检索 + 双 Agent 核验 + 知识库问答） */
import { useEffect, useState } from 'react'
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
  ProgressBar,
  Skeleton,
  Tag,
  Toggle,
} from '@/components/ui'
import {
  IconAlert,
  IconArrowRight,
  IconCheckCircle,
  IconFileText,
  IconQuote,
  IconRobot,
  IconSearch,
  IconSparkles,
  IconUpload,
} from '@/components/icons'
import { useSettingsStore, useUiStore } from '@/store'
import type { LiteraturePageData, Paper } from '@/types'

export default function LiteraturePage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  /**
   * 「跳过逐条确认（YOLO）」取自 useSettingsStore —— 与 P16 上传数据页、P10 项目设置共用同一份状态，
   * 不再是本页的局部 useState（历史上切页就会重置，且与其它页面互相矛盾）。
   */
  const { skipConfirm, setSkipConfirm, hydrateCompliance } = useSettingsStore()

  const [data, setData] = useState<LiteraturePageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [papers, setPapers] = useState<Paper[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [asking, setAsking] = useState(false)
  const [kbAnswer, setKbAnswer] = useState<LiteraturePageData['kbQa'] | null>(null)
  const [question, setQuestion] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // 页面数据与项目级合规设置并行拉取
      const [d, compliance] = await Promise.all([
        api.fetchLiterature(projectId),
        api.fetchProjectCompliance(projectId),
      ])
      setData(d)
      setPapers(d.papers)
      setSelectedIds(d.selectedPaperIds)
      setQuestion(d.kbQa.question)
      hydrateCompliance(compliance)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  /** 切换「跳过逐条确认」：落库后以服务端返回值为准（L2 项目会被强制关闭） */
  async function handleToggleSkipConfirm(next: boolean) {
    try {
      const res = await api.updateSkipConfirm({ projectId, skipConfirm: next })
      setSkipConfirm(res.skipConfirm)
      pushToast({
        tone: res.skipConfirm ? 'warn' : 'ok',
        title: res.skipConfirm ? '已跳过逐条确认' : '已恢复逐条确认',
        description: res.skipConfirm ? '核验失败条目不再阻断流程，但会记录进披露报告' : '核验未通过时仍会阻断导出',
      })
    } catch (e) {
      pushToast({ tone: 'danger', title: '保存失败', description: e instanceof Error ? e.message : '请稍后重试' })
    }
  }

  /** 语义检索 */
  async function handleSearch() {
    if (!data) return
    setSearching(true)
    try {
      const res = await api.searchLiterature({
        projectId,
        filter: { ...data.activeFilter, query },
      })
      setPapers(res.list)
      setData({ ...data, resultTotal: res.total, languageWarning: res.languageWarning })
      pushToast({ tone: 'ok', title: `共 ${res.total} 条结果`, description: '按相关度排序' })
    } finally {
      setSearching(false)
    }
  }

  /** 加入 / 移除已选文献集 */
  async function toggleSelect(p: Paper) {
    if (!p.citable) {
      pushToast({ tone: 'warn', title: '未验证条目不可选入', description: '未验证条目禁止进入参考文献区，仅可作全文检索' })
      return
    }
    const selected = !selectedIds.includes(p.paperId)
    setSelectedIds((ids) => (selected ? [...ids, p.paperId] : ids.filter((x) => x !== p.paperId)))
    await api.updateSelection({ projectId, paperId: p.paperId, selected })
  }

  /** 生成结构化综述（异步任务） */
  async function handleGenerateReview() {
    const push = useUiStore.getState()
    setGenerating(true)
    try {
      const task = await api.generateStructuredReview({ projectId })
      push.openTaskDialog({
        phase: 'running',
        title: '正在生成结构化综述…',
        description: '双 Agent 核验进行中，预计 1‒3 分钟',
        progress: 0,
      })
      await api.pollTask(task.taskId, (p) => push.updateTaskDialog({ progress: p }), 2600)
      push.updateTaskDialog({
        phase: 'succeeded',
        title: '综述生成完成',
        description: '结果已生成并写入选择留痕，可前往结果页查看。',
        actionText: '查看结果',
        onAction: () => navigate(`/project/${projectId}/analysis`),
      })
    } finally {
      setGenerating(false)
    }
  }

  /** 知识库问答 */
  async function handleAsk() {
    if (!question.trim()) return
    setAsking(true)
    try {
      const res = await api.askKnowledgeBase({ projectId, question })
      setKbAnswer(res)
    } finally {
      setAsking(false)
    }
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  const selectedCount = selectedIds.length
  const satisfyMin = selectedCount >= data.minRequired

  return (
    <AppLayout breadcrumb={[{ key: 'lit', label: '文献综述' }, { key: 'p', label: data.projectTitle }]}>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 pb-6">
        <div className="space-y-3">
          {/* 检索区 */}
          <Card>
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={<IconSearch size={14} />} className="shrink-0">
                语义检索
              </Button>
              <div className="relative flex-1">
                <input
                  className="ru-input"
                  placeholder="用自然语言描述研究问题，例如：社交焦虑如何影响手机依赖？孤独感是否起中介作用？"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button loading={searching} onClick={handleSearch}>
                检索
              </Button>
            </div>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="ru-hint">共 {data.resultTotal} 条结果 · 按{data.sortBy}排序</span>
              <FilterSelect label="期刊等级" value={data.activeFilter.quartile} options={data.filters.quartile} />
              <FilterSelect label="学科" value={data.activeFilter.discipline} options={data.filters.discipline} />
              <FilterSelect label="年份" value={data.activeFilter.year} options={data.filters.year} />
            </div>
          </Card>

          <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
            {data.languageWarning}
          </InfoBanner>

          {/* 结果列表 */}
          {searching ? (
            <Card className="space-y-3">
              <Skeleton height={16} className="w-2/3" />
              <Skeleton height={12} />
              <Skeleton height={12} className="w-5/6" />
            </Card>
          ) : (
            papers.map((p) => (
              <Card key={p.paperId} className="hover:border-brand-line transition">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-md font-medium text-ink leading-[24px] flex-1">{p.title}</h3>
                  <div className="shrink-0 flex items-center gap-2">
                    {selectedIds.includes(p.paperId) ? (
                      <Tag tone="brand" size="sm">
                        已选
                      </Tag>
                    ) : null}
                    <Tag tone={p.doiStatus === 'verified' ? 'ok' : 'danger'} size="sm">
                      {p.doiStatusText}
                    </Tag>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-3">
                  <span>{p.authors}</span>
                  <span>·</span>
                  <span>{p.journal}</span>
                  <span>·</span>
                  <span>{p.year}</span>
                  <span>·</span>
                  <span className="text-ink-2 font-medium">{p.quartile}</span>
                </div>

                <p className="text-base text-ink-2 mt-2 leading-[22px] line-clamp-3">{p.abstractText}</p>

                <div
                  className={`mt-2.5 flex items-start gap-2 rounded-card px-2.5 py-2 border ${
                    p.citable ? 'bg-brand-soft/50 border-brand-line' : 'bg-danger-soft border-danger-line'
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 ${p.citable ? 'text-brand' : 'text-danger'}`}>
                    {p.citable ? <IconQuote size={13} /> : <IconAlert size={13} />}
                  </span>
                  <span className="text-xs text-ink-2 leading-[20px]">{p.matchReason}</span>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <span className="ru-hint">相关度 {p.relevanceScore.toFixed(2)}</span>
                  <Button
                    variant={selectedIds.includes(p.paperId) ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={!p.citable}
                    onClick={() => toggleSelect(p)}
                  >
                    {selectedIds.includes(p.paperId) ? '已选入' : p.citable ? '加入已选' : '不可选入'}
                  </Button>
                </div>
              </Card>
            ))
          )}

          {/* 上传其他文献 */}
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-ink-3">
                  <IconFileText size={15} />
                </span>
                <span className="text-base text-ink">上传其他文献，AI 帮您基于研究方向解读</span>
              </div>
              <label className="inline-flex">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.bib"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    await api.uploadLiterature({ projectId, file: f })
                    pushToast({ tone: 'ok', title: '文献已上传并解析', description: f.name })
                  }}
                />
                <Button variant="secondary" size="sm" icon={<IconUpload size={13} />}>
                  上传文件
                </Button>
              </label>
            </div>
          </Card>
        </div>

        {/* 右列 */}
        <aside className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconFileText size={15} />}
              title="已选文献集"
              extra={<span className="text-base font-semibold text-ink">{selectedCount} 篇</span>}
            />
            <ProgressBar value={Math.min(100, (selectedCount / data.minRequired) * 100)} tone={satisfyMin ? 'ok' : 'warn'} />
            <div className="flex items-center justify-between mt-1.5">
              <span className="ru-hint">已满足 ≥{data.minRequired} 篇</span>
              <span className="ru-hint">{satisfyMin ? '可生成综述' : '不足最小篇数'}</span>
            </div>
            <p className="ru-hint mt-2">{data.selectionNote}</p>
            <Button
              fullWidth
              className="mt-3"
              icon={<IconSparkles size={14} />}
              loading={generating}
              disabled={!satisfyMin}
              onClick={handleGenerateReview}
            >
              生成结构化综述
            </Button>
          </Card>

          <Card>
            <CardHeader
              icon={<IconRobot size={15} />}
              title="双 Agent 核验概览"
              extra={<Tag tone="warn" size="sm">{data.verify.statusText}</Tag>}
            />
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-base">
                  <span className="text-ink">{data.verify.agentAlpha.label}</span>
                  <span className="font-semibold text-brand tabular-nums">{data.verify.agentAlpha.accuracy}%</span>
                </div>
                <ProgressBar value={data.verify.agentAlpha.accuracy} className="mt-1" />
                <p className="ru-hint mt-1">{data.verify.agentAlpha.description}</p>
              </div>
              <div>
                <div className="flex items-center justify-between text-base">
                  <span className="text-ink">{data.verify.agentBeta.label}</span>
                  <span className="font-semibold text-brand tabular-nums">{data.verify.agentBeta.accuracy}%</span>
                </div>
                <ProgressBar value={data.verify.agentBeta.accuracy} className="mt-1" />
                <p className="ru-hint mt-1">{data.verify.agentBeta.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Tag tone="ok" size="sm">
                通过 {data.verify.passedCount}
              </Tag>
              <Tag tone="warn" size="sm">
                存疑 {data.verify.suspiciousCount}
              </Tag>
              <Tag tone="danger" size="sm">
                失败 {data.verify.failedCount}
              </Tag>
            </div>

            <div className="mt-3">
              <InfoBanner tone="danger" icon={<IconAlert size={14} />}>
                {data.verify.note}
              </InfoBanner>
            </div>

            <button
              className="mt-2 text-xs text-brand hover:underline"
              onClick={() => navigate(`/project/${projectId}/export`)}
            >
              前往导出中心处理 →
            </button>

            <div className="mt-3 flex items-start justify-between gap-3 ru-panel px-3 py-2.5">
              <div>
                <div className="text-base text-ink">跳过逐条确认（YOLO）</div>
                <div className="ru-hint">
                  开启后核验失败条目不再阻断流程，但会记录在披露报告（与上传数据页、项目设置共用同一设置）
                </div>
              </div>
              <Toggle checked={skipConfirm} onChange={handleToggleSkipConfirm} />
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<IconRobot size={15} />}
              title="知识库问答"
              extra={<span className="ru-hint">库内 {data.kbDocCount} 篇</span>}
            />
            <div className="flex items-center gap-2">
              <input
                className="ru-input"
                placeholder="就库内文献提问…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              />
              <Button size="sm" loading={asking} onClick={handleAsk}>
                提问
              </Button>
            </div>
            <div className="mt-3 ru-panel p-3">
              <div className="text-base text-ink font-medium">问：{question}</div>
              <div className="text-base text-ink-2 mt-1.5 leading-[22px]">
                答：{(kbAnswer ?? data.kbQa).answer}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="ru-hint">
                  引用回溯 {(kbAnswer ?? data.kbQa).citations.join('')}
                </span>
                <span className="ru-hint">{(kbAnswer ?? data.kbQa).note}</span>
              </div>
            </div>
            <Button
              variant="secondary"
              fullWidth
              className="mt-3"
              onClick={() =>
                pushToast({ tone: 'info', title: '生成领域认知地图', description: '需 ≥20 篇可用文献，当前库内 34 篇满足条件' })
              }
            >
              生成领域认知地图（≥20 篇可用）
            </Button>
          </Card>

          <Card className="!border-brand-line bg-brand-soft/40">
            <div className="text-base font-medium text-ink">
              {data.verifiedClaimCount} 条论断已通过双 Agent 核验
            </div>
            <div className="ru-hint mt-0.5">可安全带入写作页引用</div>
            <Button
              fullWidth
              className="mt-3"
              trailingIcon={<IconArrowRight size={14} />}
              onClick={async () => {
                const res = await api.bringToWriting({ projectId })
                pushToast({ tone: 'ok', title: '已带入写作页', description: `${res.claimCount} 条已核验论断可用于引用` })
                navigate(res.nextRoute)
              }}
            >
              带入写作
            </Button>
          </Card>

          <Card>
            <CardHeader icon={<IconCheckCircle size={15} />} title="核验规则" />
            <div className="space-y-1.5">
              {[
                '未验证条目禁止进入参考文献区，仅可作全文检索。',
                '未验证条目不计入综述引用，也不会进入参考文献表。',
                '存在核验失败条目时阻断导出，需在导出中心处理。',
                '中文文献库尚未接入，语言占比提示会保留在导出物中。',
              ].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <span className="mt-[7px] w-1 h-1 rounded-full bg-brand shrink-0" />
                  <span className="text-base text-ink-2 leading-[22px]">{t}</span>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </AppLayout>
  )
}

function FilterSelect({ label, value, options }: { label: string; value: string; options: string[] }) {
  const [v, setV] = useState(value)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
      {label}：
      <select
        className="h-7 px-2 pr-6 text-xs border border-line rounded-[6px] bg-white text-ink outline-none focus:border-brand"
        value={v}
        onChange={(e) => setV(e.target.value)}
      >
        {/* 后端下发的筛选项可能出现重复值（如多个「心理学」），去重后再渲染，避免 key 重复 */}
        {Array.from(new Set(options)).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </span>
  )
}
