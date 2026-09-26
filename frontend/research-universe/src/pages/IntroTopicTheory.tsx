/** P15 论文引言 · 理论驱动 · 选择理论与变量 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  ErrorState,
  InfoBanner,
  PageSkeleton,
  Stars,
  Stepper,
  Tag,
  type Tone,
} from '@/components/ui'
import {
  IconArrowRight,
  IconLayers,
  IconRobot,
  IconShield,
  IconSparkles,
  IconTarget,
} from '@/components/icons'
import { ROLE_LABEL_MAP } from '@/mocks/db'
import { useUiStore } from '@/store'
import type { TopicTheoryData, VariableDraft, VariableRole } from '@/types'

const ROLE_TONE: Record<VariableRole, Tone> = {
  independent: 'brand',
  dependent: 'ok',
  mediator: 'warn',
  moderator: 'violet',
  control: 'neutral',
  resultCandidate: 'teal',
}

export default function IntroTopicTheoryPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)

  const [data, setData] = useState<TopicTheoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTheoryId, setSelectedTheoryId] = useState('T1')
  const [input, setInput] = useState('')
  const [switching, setSwitching] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchTopicTheory(projectId)
      setData(d)
      setSelectedTheoryId(d.selectedTheoryId)
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

  /** 切换理论会重算变量落成草稿（前端状态 + 记录写入项目日志） */
  async function handleSelectTheory(theoryId: string) {
    if (theoryId === selectedTheoryId) return
    setSwitching(true)
    try {
      const res = await api.selectTheory({ theoryId })
      setSelectedTheoryId(res.theoryId)
      setData((d) => (d ? { ...d, selectedTheoryId: res.theoryId, variableDrafts: res.variableDrafts } : d))
      pushToast({ tone: 'info', title: `已切换为 ${theoryId}`, description: '变量落成草稿已重算；选择记录写入项目日志' })
    } finally {
      setSwitching(false)
    }
  }

  function handleSend() {
    if (!input.trim()) return
    pushToast({ tone: 'info', title: '已发送追问', description: '演示环境：回复内容基于已接入文献源生成' })
    setInput('')
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  const current = data.theories.find((t) => t.theoryId === selectedTheoryId) ?? data.theories[0]

  return (
    <AppLayout
      breadcrumb={[{ key: 'k', label: '研究热点 · 理论驱动' }, { key: 'th', label: '选择理论与变量' }]}
      subHeaderRight={
        <Stepper
          size="sm"
          align="right"
          steps={[
            { key: 'kw', label: '领域研究热词', status: 'done' },
            { key: 'th', label: '选择理论与变量', status: 'current' },
            { key: 'fe', label: '研究可行性分析', status: 'upcoming' },
          ]}
        />
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 pb-6">
        {/* 左：助手对话 */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconRobot size={15} />}
              title="理论与变量助手"
              note="从已接入文献中推荐理论框架，并把概念落成可测量变量"
              extra={
                <Button variant="secondary" size="sm" icon={<IconSparkles size={13} />} onClick={load}>
                  重新生成
                </Button>
              }
            />

            {/* AI 消息 */}
            <div className="flex gap-2.5">
              <span className="w-6 h-6 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <IconRobot size={13} />
              </span>
              <div className="ru-panel px-3 py-2 text-base text-ink leading-[24px]">
                已识别你方向下 {data.lockedConcepts.length} 个核心概念：{data.lockedConcepts.join('、')}。你可以先定理论框架，也可以让我把概念直接落成变量。
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 pl-8 flex-wrap">
              {['推荐适合的理论框架', '把概念落成测量变量', '这两者之间的理论路径是什么'].map((s) => (
                <button
                  key={s}
                  onClick={() => pushToast({ tone: 'info', title: `已选择快捷追问：${s}` })}
                  className="h-7 px-3 rounded-card border border-line-strong text-xs text-ink-2 hover:border-brand hover:text-brand"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* 用户消息 */}
            <div className="flex justify-end mt-4">
              <div className="max-w-[76%] bg-panel border border-line rounded-card px-3 py-2 text-base text-ink">
                我的方向是社交焦虑与手机依赖，导师要求必须有理论支撑，帮我选一个合适的理论框架。
              </div>
            </div>

            {/* 推荐理论 */}
            <div className="flex gap-2.5 mt-4">
              <span className="w-6 h-6 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <IconRobot size={13} />
              </span>
              <div className="flex-1">
                <p className="text-base text-ink mb-2">按你方向下高被引文献的理论使用频次排序，推荐 3 个理论框架（均给出代表文献与可解释路径）：</p>
                <div className="space-y-2">
                  {data.theories.map((t) => (
                    <div
                      key={t.theoryId}
                      className={`border rounded-card p-3 transition ${
                        t.theoryId === selectedTheoryId ? 'border-brand bg-brand-soft/40' : 'border-line'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold text-ink">
                          {t.theoryId} {t.name}
                        </span>
                        <Stars value={t.stars} />
                      </div>
                      <p className="text-base text-ink-2 mt-1.5 leading-[22px]">可解释路径：{t.explainPath}</p>
                      <p className="ru-hint mt-1">
                        代表文献：{t.representativeRef} · 被引 {t.citedCount.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {t.varChain.map((v, i) => (
                          <span key={v} className="inline-flex items-center gap-1.5">
                            {i > 0 ? <span className="text-ink-3 text-xs">›</span> : null}
                            <Tag tone="neutral" size="sm">
                              {v}
                            </Tag>
                          </span>
                        ))}
                      </div>
                      {t.theoryId !== selectedTheoryId ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2"
                          loading={switching}
                          onClick={() => handleSelectTheory(t.theoryId)}
                        >
                          采用 {t.theoryId}
                        </Button>
                      ) : (
                        <Tag tone="ok" size="sm" className="mt-2">
                          已选定
                        </Tag>
                      )}
                    </div>
                  ))}
                </div>
                <p className="ru-hint mt-2">
                  以上理论均来自已接入文献源的真实记录，可点击回溯原文位置；适用度按该理论在本方向的文献使用频次计算。
                </p>
              </div>
            </div>

            {/* 用户追问 */}
            <div className="flex justify-end mt-4">
              <div className="max-w-[76%] bg-panel border border-line rounded-card px-3 py-2 text-base text-ink">
                用 {selectedTheoryId}。我还没有数据，量表怎么选？
              </div>
            </div>

            {/* 变量落成草稿 */}
            <div className="flex gap-2.5 mt-4">
              <span className="w-6 h-6 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <IconRobot size={13} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-base text-ink mb-2">
                  已按 {selectedTheoryId} 生成变量落成草稿，每个变量给出操作化定义与可用量表（含题数与授权状态）：
                </p>
                <VariableDraftTable drafts={data.variableDrafts} />
                <p className="ru-hint mt-2">
                  量表授权状态需你自行与版权方确认，平台不代发受版权保护的量表；选定后变量将带入研究可行性分析。
                </p>
              </div>
            </div>

            {/* 输入框 */}
            <div className="mt-4 flex items-center gap-2">
              <input
                className="ru-input"
                placeholder="继续追问，例如：这三个变量的理论关系能画成路径图吗"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button icon={<IconArrowRight size={14} />} onClick={handleSend} aria-label="发送" />
            </div>
          </Card>
        </div>

        {/* 右列 */}
        <aside className="space-y-4">
          <Card>
            <CardHeader icon={<IconLayers size={15} />} title="已锁定核心概念" extra={<span className="ru-hint">来自热词页</span>} />
            <p className="ru-hint mb-2">三个概念均来自上一步热词分析中你已确认的高频词，可回到热词页调整。</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {data.lockedConcepts.map((c) => (
                <Tag key={c} tone="brand">
                  {c}
                </Tag>
              ))}
            </div>
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => navigate(`/project/${projectId}/intro/topic/keywords`)}
            >
              ← 回到热词页调整
            </Button>
          </Card>

          <Card>
            <CardHeader
              icon={<IconTarget size={15} />}
              title="候选理论框架"
              extra={<span className="ru-hint">已选 {selectedTheoryId}</span>}
            />
            <div className="space-y-2">
              {data.theories.map((t) => {
                const isSelected = t.theoryId === selectedTheoryId
                return (
                  <button
                    key={t.theoryId}
                    onClick={() => handleSelectTheory(t.theoryId)}
                    className={`w-full text-left flex items-center justify-between gap-2 border rounded-card px-3 py-2.5 transition ${
                      isSelected ? 'border-brand bg-brand-soft/50' : 'border-line hover:border-brand-line'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-medium text-ink truncate">
                        {t.theoryId} {t.name}
                      </span>
                    </span>
                    <Tag tone={isSelected ? 'ok' : 'warn'} size="sm">
                      {isSelected ? '已选定' : '备选'}
                    </Tag>
                  </button>
                )
              })}
            </div>
            <p className="ru-hint mt-2">切换理论会重算变量落成草稿；选择记录写入项目日志。</p>
          </Card>

          <Card>
            <CardHeader
              icon={<IconLayers size={15} />}
              title="变量落成草稿"
              extra={<span className="ru-hint">{data.variableDrafts.length} 个变量</span>}
            />
            <div className="space-y-2">
              {data.variableDrafts.map((d) => (
                <div key={d.varName} className="flex items-center justify-between gap-2">
                  <span className="text-base text-ink font-mono">{d.varName}</span>
                  <Tag tone={ROLE_TONE[d.role]} size="sm">
                    {ROLE_LABEL_MAP[d.role]}
                  </Tag>
                </div>
              ))}
            </div>
            <p className="ru-hint mt-2">角色仅作建议，需你确认后才会写入分析方案。</p>
          </Card>

          <Card>
            <CardHeader icon={<IconShield size={15} />} title="合规与伦理护栏" extra={<span className="ru-hint">平台红线</span>} />
            <div className="space-y-2">
              {[
                '理论引用均可回溯到已接入文献的原文位置，不使用模型自行生成的文献。',
                '量表授权状态需自行与版权方确认，平台不代发受版权保护的量表。',
                '全部 AI 生成内容带不可移除的溯源标识，选定与改写记录计入披露报告。',
              ].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <InfoDot />
                  <span className="text-base text-ink leading-[22px]">{t}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="!border-brand-line bg-brand-soft/40">
            <div className="text-base font-medium text-ink">
              已选定 1 个理论框架 · {data.variableDrafts.length} 个变量
            </div>
            <div className="ru-hint mt-0.5">{current.name}</div>
            <Button
              fullWidth
              className="mt-3"
              trailingIcon={<IconArrowRight size={14} />}
              onClick={() => {
                pushToast({ tone: 'info', title: '下一步：研究可行性分析', description: '演示环境：直接进入数据分析方法清单' })
                navigate(`/project/${projectId}/analysis`)
              }}
            >
              下一步：研究可行性分析
            </Button>
          </Card>
        </aside>
      </div>
    </AppLayout>
  )
}

function InfoDot() {
  return <span className="mt-[7px] w-1 h-1 rounded-full bg-brand shrink-0" />
}

function VariableDraftTable({ drafts }: { drafts: VariableDraft[] }) {
  return (
    <DataTable<VariableDraft>
      rows={drafts}
      rowKey={(r) => r.varName}
      columns={[
        { key: 'name', title: '变量名', width: '120px', render: (r) => <span className="font-mono text-ink">{r.varName}</span> },
        { key: 'def', title: '操作化定义', render: (r) => r.definition },
        { key: 'scale', title: '候选量表', render: (r) => r.scaleName },
        { key: 'items', title: '题数', width: '64px', align: 'right', render: (r) => r.itemCount },
        {
          key: 'role',
          title: '角色',
          width: '96px',
          render: (r) => (
            <Tag tone={ROLE_TONE[r.role]} size="sm">
              {ROLE_LABEL_MAP[r.role]}
            </Tag>
          ),
        },
      ]}
    />
  )
}
