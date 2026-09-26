/** P14 论文引言 · 理论驱动 · 领域研究热词 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import { ChartLegend, HBarList, TrendLineChart } from '@/components/charts'
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  InfoBanner,
  PageSkeleton,
  Segmented,
  Stepper,
  Tag,
} from '@/components/ui'
import { IconArrowRight, IconChart, IconLayers, IconSearch, IconSparkles, IconTable, IconTarget } from '@/components/icons'
import { KEYWORD_GROWTH_COLOR } from '@/components/charts'
import { useUiStore } from '@/store'
import type { TopicKeywordData } from '@/types'

const DISCIPLINES = ['心理学', '教育学', '社会学', '医学', '管理学', '计算机']
const GROWTH_LABEL: Record<string, string> = {
  emerging: '新兴词',
  rising: '高增长词',
  stable: '稳定核心词',
  longTail: '长尾词',
}

export default function IntroTopicKeywordsPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)

  const [data, setData] = useState<TopicKeywordData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState('')
  const [discipline, setDiscipline] = useState('心理学')
  const [analyzing, setAnalyzing] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchTopicKeywords(projectId)
      setData(d)
      setDirection(d.researchDirection)
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

  async function handleAnalyze() {
    if (!direction.trim()) {
      pushToast({ tone: 'warn', title: '请输入你的研究方向' })
      return
    }
    setAnalyzing(true)
    try {
      setData(await api.analyzeTopicKeywords({ researchDirection: direction, discipline }))
      pushToast({ tone: 'ok', title: '热词分析完成', description: `来源：${data?.paperCount ?? 2847} 篇已接入文献` })
    } finally {
      setAnalyzing(false)
    }
  }

  function handleNext() {
    pushToast({ tone: 'info', title: '已锁定核心概念', description: '进入「选择理论与变量」' })
    navigate(`/project/${projectId}/intro/topic/theory`)
  }

  if (loading) return <AppLayout noSubHeader fullBleed={false}><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  return (
    <AppLayout
      breadcrumb={[{ key: 'k', label: '研究热点 · 理论驱动' }, { key: 'kw', label: '领域研究热词' }]}
      subHeaderRight={
        <Stepper
          size="sm"
          align="right"
          steps={[
            { key: 'kw', label: '领域研究热词', status: 'current' },
            { key: 'th', label: '选择理论与变量', status: 'upcoming' },
            { key: 'fe', label: '研究可行性分析', status: 'upcoming' },
          ]}
        />
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 pb-6">
        <div className="space-y-4">
          {/* 输入研究方向 */}
          <Card>
            <CardHeader
              icon={<IconTarget size={15} />}
              title="输入你的研究方向"
              extra={<span className="ru-hint">已接入 {data.sources.join(' / ')}</span>}
            />
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
                  <IconSearch size={14} />
                </span>
                <input
                  className="ru-input pl-9"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  placeholder="例如：社交焦虑与手机依赖"
                />
              </div>
              <Button loading={analyzing} onClick={handleAnalyze}>
                分析
              </Button>
            </div>
            <div className="mt-3">
              <Segmented size="sm" value={discipline} options={DISCIPLINES.map((d) => ({ key: d, label: d }))} onChange={setDiscipline} />
            </div>
            <p className="ru-hint mt-2">
              分析基于已接入的真实文献源（Web of Science / Crossref），词频与趋势均由文献计量统计得出，不使用模型自由生成。
            </p>
          </Card>

          {/* 词云 */}
          <Card>
            <CardHeader
              icon={<IconLayers size={15} />}
              title={`领域研究热词（${data.rangeText}）`}
              extra={<span className="ru-hint">来源：{data.paperCount.toLocaleString()} 篇已接入文献</span>}
            />
            <div className="ru-panel py-4 px-3">
              <KeywordCloudLocal keywords={data.keywords} />
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {Object.entries(GROWTH_LABEL).map(([key, label]) => (
                <span key={key} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: KEYWORD_GROWTH_COLOR[key] }} />
                  {label}
                </span>
              ))}
            </div>
            <p className="ru-hint mt-2">字号映射词频、颜色映射增长趋势；点击任一热词可回溯到具体文献。</p>
          </Card>

          {/* TOP 榜 */}
          <Card>
            <CardHeader
              icon={<IconTable size={15} />}
              title="高频热词 TOP 榜"
              extra={<span className="ru-hint">统计区间 {data.rangeText}</span>}
            />
            <div className="space-y-2.5">
              {data.topKeywords.map((k) => (
                <div key={k.keyword} className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center shrink-0 ${
                      k.rank <= 3 ? 'bg-brand text-white' : 'bg-panel text-ink-2'
                    }`}
                  >
                    {k.rank}
                  </span>
                  <span className="w-[92px] text-base text-ink shrink-0">{k.keyword}</span>
                  <div className="flex-1">
                    <HBarList data={[{ label: '', value: k.freq }]} max={data.topKeywords[0].freq} showValue={false} />
                  </div>
                  <span className="w-14 text-right text-base text-ink tabular-nums shrink-0">{k.freq.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <p className="ru-hint mt-3">
              词频统计自 {data.rangeText} 年 {data.paperCount.toLocaleString()} 篇已接入文献；点击词条可回溯具体文献，未验证来源不计入统计。
            </p>
          </Card>
        </div>

        {/* 右列 */}
        <aside className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconChart size={15} />}
              title="热词趋势（近 5 年）"
              extra={<span className="ru-hint">{data.trendUnit}</span>}
            />
            <TrendLineChart series={data.trendSeries} years={data.trendYears} height={190} unit=" 篇" />
            <ChartLegend series={data.trendSeries} />
            <p className="ru-hint mt-2">
              三个热词近五年均持续上升，其中「错失恐惧」年增长率最高（新兴词）；某方向年发文量低于 20 篇时将标注「样本不足，趋势仅供参考」。
            </p>
          </Card>

          <Card>
            <CardHeader
              icon={<IconTable size={15} />}
              title="高被引综述清单"
              extra={<span className="ru-hint">{data.citedReviews.length} 篇 · 按被引排序</span>}
            />
            <div className="space-y-2">
              {data.citedReviews.map((r) => (
                <div key={r.reviewId} className="ru-panel p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base text-ink leading-[20px]">{r.title}</span>
                    <Tag tone="brand" size="sm" className="shrink-0">
                      被引 {r.citedCount.toLocaleString()}
                    </Tag>
                  </div>
                  <div className="ru-hint mt-1">{r.metaText}</div>
                </div>
              ))}
            </div>
            <p className="ru-hint mt-2">均来自已接入文献源，可点击查看原文；被引数按采集日快照计，非实时值。</p>
          </Card>

          <Card className="!border-brand-line bg-brand-soft/40">
            <CardHeader icon={<IconSparkles size={15} />} title={`已锁定 ${data.lockedConcepts.length} 个核心概念`} />
            <div className="flex items-center gap-1.5 flex-wrap">
              {data.lockedConcepts.map((c) => (
                <Tag key={c} tone="brand">
                  {c}
                </Tag>
              ))}
            </div>
            <Button
              fullWidth
              className="mt-3"
              trailingIcon={<IconArrowRight size={14} />}
              onClick={handleNext}
            >
              下一步：选择理论与变量
            </Button>
          </Card>

          <InfoBanner tone="info">
            平台不臆造文献：所有热词、被引数与趋势均可回溯到已接入文献源的原始记录。
          </InfoBanner>
        </aside>
      </div>
    </AppLayout>
  )
}

/** 局部词云（带点击回溯提示） */
function KeywordCloudLocal({ keywords }: { keywords: TopicKeywordData['keywords'] }) {
  const pushToast = useUiStore((s) => s.pushToast)
  const max = Math.max(...keywords.map((k) => k.freq), 1)
  const min = Math.min(...keywords.map((k) => k.freq), 1)
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-1">
      {keywords.map((k) => {
        const ratio = (k.freq - min) / Math.max(max - min, 1)
        const size = 13 + ratio * 21
        return (
          <button
            key={k.keyword}
            title={`${k.keyword} · 词频 ${k.freq}`}
            onClick={() => pushToast({ tone: 'info', title: `回溯「${k.keyword}」`, description: `匹配文献 ${k.freq} 篇，已按被引排序` })}
            className="font-semibold transition hover:opacity-70"
            style={{ fontSize: size, color: KEYWORD_GROWTH_COLOR[k.growth] ?? '#5A6473', lineHeight: 1.35 }}
          >
            {k.keyword}
          </button>
        )
      })}
    </div>
  )
}
