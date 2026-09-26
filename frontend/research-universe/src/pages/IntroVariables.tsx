/** P17 论文引言 · 数据驱动 · 变量识别 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import { DonutChart } from '@/components/charts'
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  ErrorState,
  InfoBanner,
  PageSkeleton,
  Segmented,
  Stepper,
  StatTile,
  Tag,
  type Tone,
} from '@/components/ui'
import { IconAlert, IconArrowRight, IconChart, IconTable, IconTarget } from '@/components/icons'
import { ROLE_LABEL_MAP } from '@/mocks/db'
import { useDataFlowStore, useUiStore } from '@/store'
import type { VariableIdentifyData, VariableItem, VariableRole } from '@/types'

const ROLE_TONE: Record<VariableRole, Tone> = {
  independent: 'brand',
  dependent: 'ok',
  mediator: 'warn',
  moderator: 'violet',
  control: 'neutral',
  resultCandidate: 'teal',
}

const FILTERS: { key: VariableRole | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'dependent', label: '因变量' },
  { key: 'independent', label: '自变量' },
  { key: 'mediator', label: '中介变量' },
  { key: 'moderator', label: '调节变量' },
  { key: 'control', label: '控制变量' },
]

export default function IntroVariablesPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const { variableFilter, setVariableFilter, updateVariableRole } = useDataFlowStore()

  const [data, setData] = useState<VariableIdentifyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setData(await api.fetchVariables(projectId))
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

  const rows = useMemo(() => {
    if (!data) return []
    return data.variables.filter((v) => variableFilter === 'all' || (v.overriddenRole ?? v.suggestedRole) === variableFilter)
  }, [data, variableFilter])

  /** 手动修正变量角色 → 触发后续方法清单重算 */
  async function handleRoleChange(varName: string, role: VariableRole) {
    updateVariableRole(varName, role)
    const res = await api.updateVariable({ projectId, varName, role })
    if (res.recalcNeeded) {
      pushToast({ tone: 'info', title: '已更新变量角色', description: '后续方法清单将重新计算' })
    }
  }

  /** 确认变量，进入研究假设 */
  function handleConfirm() {
    useUiStore.getState().openConfirm({
      tone: 'info',
      title: '确认操作',
      description: '请确认是否执行该操作，操作后结果将写入留痕并进入分析流程。',
      confirmText: '确认',
      onConfirm: async () => {
        setConfirming(true)
        try {
          const res = await api.confirmVariables({ projectId, variables: data?.variables ?? [] })
          pushToast({ tone: 'ok', title: '变量已确认', description: '已写入项目日志' })
          navigate(res.nextRoute)
        } finally {
          setConfirming(false)
        }
      },
    })
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  return (
    <AppLayout
      breadcrumb={[{ key: 'k', label: '研究热点 · 数据驱动' }, { key: 'var', label: '变量识别' }]}
      subHeaderRight={
        <Stepper
          size="sm"
          align="right"
          steps={[
            { key: 'up', label: '上传数据', status: 'done' },
            { key: 'var', label: '变量识别', status: 'current' },
            { key: 'hyp', label: '生成研究假设', status: 'upcoming' },
          ]}
        />
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 pb-6">
        <div className="space-y-4">
          {/* 数据体检摘要 */}
          <Card>
            <CardHeader
              icon={<IconTarget size={15} />}
              title="数据体检摘要"
              extra={<span className="ru-hint">报告已写入项目日志</span>}
            />
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="有效样本量" value={data.health.validSampleSize} />
              <StatTile label="变量总数" value={data.health.variableCount} />
              <StatTile label="完整无缺失变量" value={<span className="text-ok">{data.health.completeVariableCount}</span>} />
              <StatTile label="含缺失变量" value={data.health.missingVariableCount} tone="warn" />
              <StatTile label="异常值提示" value={data.health.outlierCount} tone="warn" />
              <StatTile label="重复作答" value={data.health.duplicateAnswerCount} />
            </div>
            <p className="ru-hint mt-3">
              体检基于文件 {data.health.sourceFile}；变量类型与分布已自动识别，缺失与异常不会自动修改，需你确认处理方式。
            </p>
          </Card>

          {/* 变量清单 */}
          <Card>
            <CardHeader
              icon={<IconTable size={15} />}
              title="变量清单"
              extra={
                <span className="ru-hint">
                  共 {data.recognizedCount} 个变量 · 已展示 {rows.length} 个
                </span>
              }
            />
            <div className="flex items-center gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setVariableFilter(f.key)}
                  className={`h-7 px-3 rounded-card border text-xs transition ${
                    variableFilter === f.key
                      ? 'border-brand bg-brand-soft text-brand font-medium'
                      : 'border-line-strong text-ink-2 hover:border-brand-line'
                  }`}
                >
                  {f.key === 'all' ? `全部 ${data.recognizedCount}` : f.label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <DataTable<VariableItem>
                rows={rows}
                rowKey={(r) => r.varName}
                emptyText="该筛选条件下暂无变量"
                columns={[
                  { key: 'name', title: '变量名', width: '140px', render: (r) => <span className="font-mono text-ink">{r.varName}</span> },
                  { key: 'type', title: '类型', width: '110px', render: (r) => r.typeLabel },
                  { key: 'range', title: '取值范围', width: '110px', render: (r) => <span className="tabular-nums">{r.valueRange}</span> },
                  {
                    key: 'missing',
                    title: '缺失率',
                    width: '90px',
                    render: (r) => (
                      <span className={r.missingRate > 4 ? 'text-warn font-medium tabular-nums' : 'tabular-nums'}>
                        {r.missingRate.toFixed(1)}%
                      </span>
                    ),
                  },
                  {
                    key: 'role',
                    title: '建议角色',
                    width: '150px',
                    render: (r) => (
                      <select
                        className="h-7 px-2 text-xs border border-line rounded-[6px] bg-white outline-none focus:border-brand"
                        value={r.overriddenRole ?? r.suggestedRole}
                        onChange={(e) => handleRoleChange(r.varName, e.target.value as VariableRole)}
                      >
                        {(Object.keys(ROLE_LABEL_MAP) as VariableRole[]).map((k) => (
                          <option key={k} value={k}>
                            {ROLE_LABEL_MAP[k]}
                          </option>
                        ))}
                      </select>
                    ),
                  },
                ]}
              />
            </div>
            <p className="ru-hint mt-2">
              共 {data.recognizedCount} 个变量 · 已展示 {rows.length} 个；类型由解析结果自动识别，可在清单中手动修正，修正会重算后续方法清单。
            </p>
          </Card>

          {/* 数据质量问题 */}
          <Card>
            <CardHeader
              icon={<IconAlert size={15} />}
              title="数据质量问题"
              extra={<span className="ru-hint">共 {data.qualityIssues.length} 条 · 均需你确认处理方式</span>}
            />
            <div className="space-y-2">
              {data.qualityIssues.map((q) => (
                <div
                  key={q.issueId}
                  className={`flex items-start gap-2 border rounded-card px-3 py-2.5 ${
                    q.level === 'warn' ? 'bg-warn-soft border-warn-line' : 'bg-panel border-line'
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 ${q.level === 'warn' ? 'text-warn' : 'text-ink-3'}`}>
                    {q.level === 'warn' ? <IconAlert size={14} /> : <IconCheckCircleMini />}
                  </span>
                  <span className="flex-1 text-base text-ink leading-[22px]">{q.text}</span>
                  {q.needsConfirm ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        pushToast({ tone: 'ok', title: '已记录处理方式', description: '平台不会自动删除数据；处理方式将写入报告' })
                      }
                    >
                      确认处理
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 右列 */}
        <aside className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconChart size={15} />}
              title="变量类型分布"
              extra={<span className="ru-hint">共 {data.recognizedCount} 个</span>}
            />
            <DonutChart data={data.typeDistribution} />
            <p className="ru-hint mt-1">
              类型由解析结果自动识别，可在下方清单中手动修正；修正会重算后续方法清单。
            </p>
          </Card>

          <Card className="!border-brand-line bg-brand-soft/40">
            <div className="text-base font-medium text-ink">
              已识别 {data.recognizedCount} 个变量 · 可用 {data.usableCount} 个
            </div>
            <div className="ru-hint mt-0.5">变量确认后进入研究假设</div>
            <Button
              fullWidth
              className="mt-3"
              loading={confirming}
              trailingIcon={<IconArrowRight size={14} />}
              onClick={handleConfirm}
            >
              下一步：生成研究假设
            </Button>
          </Card>

          <Card>
            <CardHeader icon={<IconTarget size={15} />} title="角色建议说明" />
            <div className="space-y-2">
              {(
                [
                  ['dependent', '研究要解释的结果变量，通常每篇论文 1 个'],
                  ['independent', '核心预测变量，对应你的研究问题起点'],
                  ['mediator', '解释“为什么”的中间机制'],
                  ['moderator', '改变主效应强弱或方向的边界条件'],
                  ['control', '需控制但非研究焦点的变量（性别、年级等）'],
                ] as [VariableRole, string][]
              ).map(([role, desc]) => (
                <div key={role} className="flex items-start gap-2">
                  <Tag tone={ROLE_TONE[role]} size="sm" className="shrink-0">
                    {ROLE_LABEL_MAP[role]}
                  </Tag>
                  <span className="text-base text-ink-2 leading-[22px]">{desc}</span>
                </div>
              ))}
            </div>
          </Card>

          <InfoBanner tone="info">
            系统不会自动删除或修改你的数据；所有缺失值、异常值处理方式均需你确认，并写入报告。
          </InfoBanner>
        </aside>
      </div>
    </AppLayout>
  )
}

function IconCheckCircleMini() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}
