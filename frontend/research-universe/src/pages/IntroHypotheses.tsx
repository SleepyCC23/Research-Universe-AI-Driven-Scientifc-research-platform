/** P18 论文引言 · 数据驱动 · 生成研究假设 */
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
  Stepper,
  Tag,
  type Tone,
} from '@/components/ui'
import {
  IconArrowRight,
  IconRobot,
  IconShield,
  IconSparkles,
  IconTarget,
} from '@/components/icons'
import { ETHICS_NOTES } from '@/mocks/db'
import { useDataFlowStore, useUiStore } from '@/store'
import type { HypothesisPageData, VariableRole } from '@/types'

const ROLE_TONE: Record<string, Tone> = {
  independent: 'brand',
  dependent: 'ok',
  mediator: 'warn',
  moderator: 'violet',
  control: 'neutral',
}

export default function IntroHypothesesPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const { hypotheses, setHypotheses, setHypothesisStatus } = useDataFlowStore()

  const [data, setData] = useState<HypothesisPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [input, setInput] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchHypotheses(projectId)
      setData(d)
      setHypotheses(d.hypotheses)
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

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const d = await api.generateHypotheses({ projectId, prompt: input })
      setData(d)
      setHypotheses(d.hypotheses)
      pushToast({ tone: 'ok', title: `已生成 ${d.hypotheses.length} 条候选假设`, description: '仅引用你数据中真实存在的变量' })
    } finally {
      setRegenerating(false)
    }
  }

  function handleConfirm() {
    const pending = hypotheses.filter((h) => h.status === 'pending')
    if (pending.length) {
      pushToast({ tone: 'warn', title: `还有 ${pending.length} 条假设待确认`, description: '请在右侧「假设清单」中逐条确认' })
      return
    }
    useUiStore.getState().openConfirm({
      tone: 'info',
      title: '确认操作',
      description: '请确认是否执行该操作，操作后结果将写入留痕并进入分析流程。',
      confirmText: '确认',
      onConfirm: async () => {
        setConfirming(true)
        try {
          const res = await api.confirmHypotheses({
            projectId,
            hypotheses: hypotheses.map((h) => ({ hypothesisId: h.hypothesisId, status: h.status })),
          })
          pushToast({ tone: 'ok', title: '假设已写入项目日志', description: '确认人 / 时间 / 备选项已留痕' })
          navigate(res.nextRoute)
        } finally {
          setConfirming(false)
        }
      },
    })
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  const allConfirmed = hypotheses.every((h) => h.status !== 'pending')

  return (
    <AppLayout
      breadcrumb={[{ key: 'k', label: '研究热点 · 数据驱动' }, { key: 'hyp', label: '生成研究假设' }]}
      subHeaderRight={
        <Stepper
          size="sm"
          align="right"
          steps={[
            { key: 'up', label: '上传数据', status: 'done' },
            { key: 'var', label: '变量识别', status: 'done' },
            { key: 'hyp', label: '生成研究假设', status: 'current' },
          ]}
        />
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 pb-6">
        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconRobot size={15} />}
              title="研究假设助手"
              note={`基于已识别的 ${data.variableCount} 个变量运行，只给可检验假设、不生成结论`}
              extra={
                <Button variant="secondary" size="sm" icon={<IconSparkles size={13} />} loading={regenerating} onClick={handleRegenerate}>
                  重新生成
                </Button>
              }
            />

            <div className="flex gap-2.5">
              <span className="w-6 h-6 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <IconRobot size={13} />
              </span>
              <div className="ru-panel px-3 py-2 text-base text-ink leading-[24px]">
                已读取 {data.sourceFile} 的 {data.variableCount} 个变量。你可以直接描述想研究的关系，或让我先基于变量清单提一批候选假设。
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 pl-8 flex-wrap">
              {data.chatSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="h-7 px-3 rounded-card border border-line-strong text-xs text-ink-2 hover:border-brand hover:text-brand"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <div className="max-w-[76%] bg-panel border border-line rounded-card px-3 py-2 text-base text-ink">
                我想做社交焦虑对手机依赖的影响，数据里有 sas_total 和 mpai_total，还想看看有没有中介变量。
              </div>
            </div>

            <div className="flex gap-2.5 mt-4">
              <span className="w-6 h-6 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <IconRobot size={13} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-base text-ink mb-2">
                  基于你数据中真实存在的变量，我先给出 {hypotheses.length} 条可检验假设（不含结论）：
                </p>
                <div className="space-y-2">
                  {hypotheses.map((h) => (
                    <div key={h.hypothesisId} className="border border-line rounded-card p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-[6px] bg-brand-soft text-brand text-xs font-semibold flex items-center justify-center">
                          {h.code}
                        </span>
                        <span className="text-base font-medium text-ink flex-1">{h.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {h.varChain.map((v, i) => (
                          <span key={`${v}-${i}`} className="inline-flex items-center gap-1.5">
                            {i > 0 ? <span className="text-ink-3 text-xs">›</span> : null}
                            <Tag tone="neutral" size="sm">
                              {v}
                            </Tag>
                          </span>
                        ))}
                      </div>
                      <p className="text-base text-ink-2 mt-2 leading-[22px]">可检验方法：{h.testMethod}</p>
                      <p className="ru-hint mt-1">依据：{h.basis}</p>
                    </div>
                  ))}
                </div>
                <p className="ru-hint mt-2">以上为可检验假设，不含结论；确认后才会进入数据分析的方法清单。</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                className="ru-input"
                placeholder="继续追问，例如：帮我判断这些假设适合做中介分析吗"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRegenerate()}
              />
              <Button icon={<IconArrowRight size={14} />} onClick={handleRegenerate} loading={regenerating} aria-label="发送" />
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconTarget size={15} />}
              title="本次假设引用的变量"
              extra={<span className="ru-hint">{data.citedVariables.length} 个变量</span>}
            />
            <p className="ru-hint mb-2">仅引用你数据中真实存在的变量与取值，不引入数据之外的变量，也不臆造不存在的取值。</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {data.citedVariables.map((v) => (
                <Tag key={v.varName} tone={ROLE_TONE[roleKey(v.roleLabel)] ?? 'neutral'}>
                  <span className="font-mono">{v.varName}</span>
                  <span className="opacity-70">· {v.roleLabel}</span>
                </Tag>
              ))}
            </div>
            <p className="ru-hint mt-2">每个变量都可在变量识别页回溯其类型、取值范围与缺失率。</p>
          </Card>

          <Card>
            <CardHeader
              icon={<IconSparkles size={15} />}
              title={`假设清单（${hypotheses.length} 条）`}
              extra={<span className="ru-hint">{allConfirmed ? '已全部确认' : '全部待确认'}</span>}
            />
            <div className="space-y-2">
              {hypotheses.map((h) => (
                <div key={h.hypothesisId} className="ru-panel px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base text-ink">
                      <span className="font-semibold">{h.code}</span> {h.title}
                    </span>
                    <Tag tone={h.status === 'pending' ? 'warn' : h.status === 'confirmed' ? 'ok' : 'neutral'} size="sm">
                      {h.status === 'pending' ? '待确认' : h.status === 'confirmed' ? '已确认' : '已否决'}
                    </Tag>
                  </div>
                  {h.status === 'pending' ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" onClick={() => setHypothesisStatus(h.hypothesisId, 'confirmed')}>
                        确认
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setHypothesisStatus(h.hypothesisId, 'rejected')}>
                        否决
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="text-xs text-brand hover:underline mt-1.5"
                      onClick={() => setHypothesisStatus(h.hypothesisId, 'pending')}
                    >
                      撤销
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="ru-hint mt-2">确认后写入项目日志（确认人、时间、备选项），并带入数据分析的方法清单。</p>
          </Card>

          <Card>
            <CardHeader icon={<IconShield size={15} />} title="科研伦理提示" />
            <div className="space-y-2">
              {ETHICS_NOTES.map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <span className="mt-[7px] w-1 h-1 rounded-full bg-brand shrink-0" />
                  <span className="text-base text-ink leading-[22px]">{t}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="!border-brand-line bg-brand-soft/40">
            <div className="text-base font-medium text-ink">已生成 {hypotheses.length} 条候选假设</div>
            <div className="ru-hint mt-0.5">确认后进入 P4 数据分析的方法清单</div>
            <Button
              fullWidth
              className="mt-3"
              loading={confirming}
              disabled={!allConfirmed}
              trailingIcon={<IconArrowRight size={14} />}
              onClick={handleConfirm}
            >
              确认并进入数据分析
            </Button>
          </Card>

          {!allConfirmed ? (
            <InfoBanner tone="warn">请先在「假设清单」中逐条确认，全部确认后方可进入数据分析。</InfoBanner>
          ) : null}
        </aside>
      </div>
    </AppLayout>
  )
}

function roleKey(roleLabel: string): string {
  const map: Record<string, string> = {
    自变量: 'independent',
    因变量: 'dependent',
    中介变量: 'mediator',
    调节变量: 'moderator',
    控制变量: 'control',
    结果变量候选: 'resultCandidate',
  }
  return map[roleLabel] ?? 'neutral'
}
