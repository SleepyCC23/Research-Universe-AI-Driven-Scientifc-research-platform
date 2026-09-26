/** P02 论文引言 · 研究热点（选题可行性 + 研究不足 + 趋势 + 公共数据库 + 问卷检查） */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import { ChartLegend, HBarList, TrendLineChart } from '@/components/charts'
import {
  Button,
  Card,
  CardHeader,
  CheckPill,
  ErrorState,
  InfoBanner,
  KeyValue,
  PageSkeleton,
  ScoreBar,
  Segmented,
  Tag,
} from '@/components/ui'
import {
  IconAlert,
  IconArrowRight,
  IconChart,
  IconCheckCircle,
  IconDatabase,
  IconFileText,
  IconRefresh,
  IconSparkles,
  IconTable,
} from '@/components/icons'
import { useUiStore } from '@/store'
import type { HotspotPageData } from '@/types'

const LEVEL_TONE = { L0: 'ok', L1: 'brand', L2: 'danger' } as const

export default function IntroHotspotPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)

  const [data, setData] = useState<HotspotPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [activeCategory, setActiveCategory] = useState('心理学')
  const [confirming, setConfirming] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setData(await api.fetchHotspot(projectId))
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

  /** 生成分析报告 */
  async function handleAnalyze() {
    if (!direction.trim()) {
      pushToast({ tone: 'warn', title: '请输入研究方向', description: '例如：社交焦虑与手机依赖的关系' })
      return
    }
    setAnalyzing(true)
    try {
      const res = await api.analyzeHotspot({ researchDirection: direction })
      setData(res.data)
      pushToast({ tone: 'ok', title: '分析报告已生成', description: `基于已接入文献源识别 ${res.data.recognizedPaperCount.toLocaleString()} 篇真实文献` })
    } finally {
      setAnalyzing(false)
    }
  }

  /** 确认方向，进入文献综述 */
  function handleConfirmDirection() {
    pushToast({
      tone: 'info',
      title: '确认方向，进入文献综述',
      description: '该操作会写入项目日志（确认人 / 时间）',
    })
    useUiStore.getState().openConfirm({
      tone: 'info',
      title: '确认操作',
      description: '请确认是否执行该操作，操作后结果将写入留痕并进入分析流程。',
      confirmText: '确认',
      onConfirm: async () => {
        setConfirming(true)
        try {
          const res = await api.confirmDirection(projectId)
          navigate(res.nextRoute)
        } finally {
          setConfirming(false)
        }
      },
    })
  }

  if (loading) {
    return (
      <AppLayout breadcrumb={[{ key: 'p', label: '加载中…' }]}>
        <PageSkeleton />
      </AppLayout>
    )
  }

  if (error || !data) {
    return (
      <AppLayout breadcrumb={[{ key: 'p', label: '论文引言' }]}>
        <ErrorState description={error ?? '数据为空'} onRetry={load} />
      </AppLayout>
    )
  }

  const visibleDatasets = data.publicDatasets.filter((d) =>
    activeCategory === '心理学' ? true : d.subjectTags.some((t) => activeCategory.includes(t.slice(0, 2))),
  )

  return (
    <AppLayout
      breadcrumb={[{ key: 'hot', label: `研究热点 · ${data.projectTitle}` }]}
      subHeaderRight={
        <>
          <Button icon={<IconSparkles size={14} />} loading={analyzing} onClick={handleAnalyze}>
            生成分析报告
          </Button>
          <div className="relative w-[340px]">
            <input
              className="ru-input"
              placeholder="输入你的研究方向，例如：社交焦虑与手机依赖的关系"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            />
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4 pb-6">
        {/* 左列 */}
        <div className="space-y-4">
          {/* 研究不足与展望 */}
          <Card>
            <CardHeader
              icon={<IconFileText size={15} />}
              title="研究不足与展望（原文抽取汇总）"
              note={`来自 ${data.gapSourceCount} 篇综述原文`}
            />
            <div className="space-y-3">
              {data.gaps.map((g) => (
                <div key={g.gapId} className="border-l-[3px] border-brand-line pl-3 py-1">
                  <p className="text-base text-ink leading-[24px]">{g.text}</p>
                  <p className="ru-hint mt-1">{g.sourceText}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 高被引综述清单 */}
          <Card>
            <CardHeader
              icon={<IconTable size={15} />}
              title="高被引综述清单"
              note={`按被引降序 · 共 ${data.citedReviews.length} 篇`}
            />
            <div className="divide-y divide-line">
              {data.citedReviews.map((r) => (
                <div key={r.reviewId} className="flex items-start justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <div className="text-base font-medium text-ink truncate">{r.title}</div>
                    <div className="ru-hint mt-0.5">{r.metaText}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <span className="text-base text-ink">被引 {r.citedCount}</span>
                    <Tag tone={r.doiVerified ? 'ok' : 'warn'} size="sm">
                      {r.doiVerified ? 'DOI 已验证' : '未验证'}
                    </Tag>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 研究趋势 */}
          <Card>
            <CardHeader
              icon={<IconChart size={15} />}
              title={`${data.trendTitle} 2021 ‒ 2025`}
              extra={<span className="ru-hint">发文量（篇）</span>}
            />
            <TrendLineChart series={data.trendSeries} years={['2021', '2022', '2023', '2024', '2025']} height={230} />
            <ChartLegend series={data.trendSeries} />
            <p className="ru-hint mt-2">{data.trendNote}</p>
          </Card>
        </div>

        {/* 右列 */}
        <aside className="space-y-4">
          {/* 三维可行性评分 */}
          <Card>
            <CardHeader
              icon={<IconAlert size={15} />}
              title="自拟选题三维可行性评分"
              extra={<span className="ru-hint">满分 5 分</span>}
            />
            <div className="space-y-4">
              {data.feasibility.map((f) => (
                <div key={f.key}>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-ink">{f.label}</span>
                    <span className="text-base font-semibold text-ink tabular-nums">
                      {f.insufficientData ? '—' : f.score.toFixed(1)}
                    </span>
                  </div>
                  {f.insufficientData ? (
                    <div className="ru-hint mt-1">数据不足，未评分</div>
                  ) : (
                    <>
                      <ScoreBar score={f.score} max={f.maxScore} tone={f.key === 'methodComplexity' ? 'warn' : 'ok'} />
                      <p className="text-base text-ink-2 mt-1.5 leading-[20px]">{f.description}</p>
                      <p className="ru-hint mt-0.5">{f.basisText}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 ru-panel px-3 py-2">
              <span className="ru-hint">某一维度无法评估时会显示「数据不足，未评分」，不会给出猜测性的分数。</span>
            </div>
          </Card>

          {/* 公共数据库导航 */}
          <Card>
            <CardHeader
              icon={<IconDatabase size={15} />}
              title="公共数据库导航"
              extra={<span className="ru-hint">共 {data.datasetTotal} 个库</span>}
            />
            <Segmented
              size="sm"
              value={activeCategory}
              options={data.datasetCategories.map((c) => ({ key: c, label: c }))}
              onChange={setActiveCategory}
            />
            <div className="mt-3 space-y-2">
              {visibleDatasets.map((d) => (
                <div key={d.datasetId} className="ru-panel p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-medium text-ink">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <Tag tone={LEVEL_TONE[d.level]} size="sm">
                        {d.level} {d.level === 'L0' ? '公开' : '受限'}
                      </Tag>
                      <Button
                        variant={d.accessAction === 'directImport' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() =>
                          pushToast({
                            tone: d.accessAction === 'directImport' ? 'ok' : 'info',
                            title: d.accessAction === 'directImport' ? '一键直连导入' : '需自行申请',
                            description:
                              d.accessAction === 'directImport'
                                ? `${d.name} 已加入导入队列`
                                : '平台不拥有数据分发权，请前往官方渠道申请',
                          })
                        }
                      >
                        {d.accessActionText}
                      </Button>
                    </div>
                  </div>
                  <p className="ru-hint mt-1.5">{d.accessCondition}</p>
                  <p className="ru-hint">{d.citationRequirement}</p>
                </div>
              ))}
              {!visibleDatasets.length ? (
                <p className="ru-hint py-2">该学科下暂无可接入库，可切换学科或前往官方渠道。</p>
              ) : null}
            </div>
            <p className="ru-hint mt-2">人文艺术类资源接入中：可先前往国家哲学社会科学文献中心等官方渠道。</p>
          </Card>

          {/* 我要收数据 */}
          <Card>
            <CardHeader
              icon={<IconCheckCircle size={15} />}
              title="我要收数据"
              extra={<span className="ru-hint">问卷设计检查清单</span>}
            />
            <div className="space-y-2">
              {data.questionnaireChecks.map((c) => (
                <CheckPill key={c.checkId} done={c.passed}>
                  {c.text}
                </CheckPill>
              ))}
            </div>
            <Button
              variant="secondary"
              fullWidth
              className="mt-3"
              onClick={() => pushToast({ tone: 'info', title: '伦理声明模板', description: '模板已加入项目资料库' })}
            >
              查看伦理声明模板
            </Button>
            <p className="ru-hint mt-2">本期不提供问卷投放与回收功能，仅提供设计检查与发放渠道建议。</p>
          </Card>

          {/* 底部确认条 */}
          <Card className="!border-brand-line bg-brand-soft/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-medium text-ink">
                  已确认识别文献 {data.recognizedPaperCount.toLocaleString()} 篇
                </div>
                <div className="ru-hint mt-0.5">{data.conclusion}</div>
              </div>
              <Button loading={confirming} trailingIcon={<IconArrowRight size={14} />} onClick={handleConfirmDirection}>
                确认方向，进入文献综述
              </Button>
            </div>
          </Card>

          <InfoBanner tone="info">
            AI 推荐仅供参考，不替代你的判断；所有结论均标注来源与样本量。
          </InfoBanner>

          <Button variant="ghost" size="sm" icon={<IconRefresh size={13} />} onClick={load}>
            重新加载本页数据
          </Button>
        </aside>
      </div>
    </AppLayout>
  )
}
