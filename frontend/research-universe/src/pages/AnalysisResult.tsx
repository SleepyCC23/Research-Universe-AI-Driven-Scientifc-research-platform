/**
 * P04 数据统计 · 数据分析 · 第 4 步「结果与稳健性」
 * ------------------------------------------------------------
 * 由第 3 步（/project/:projectId/analysis）执行分析成功后跳转进来；
 * 也支持直接访问 / 刷新（此时回落到 GET /analysis 返回的最近一次 run）。
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import {
  Button,
  Card,
  CardHeader,
  CodeBlock,
  DataTable,
  EmptyState,
  ErrorState,
  InfoBanner,
  KeyValue,
  PageSkeleton,
  Segmented,
  Stepper,
  StatTile,
  Tag,
} from '@/components/ui'
import {
  IconAlert,
  IconArrowRight,
  IconChart,
  IconCheckCircle,
  IconHistory,
  IconPlay,
  IconRefresh,
  IconRobot,
  IconTable,
} from '@/components/icons'
import { useAnalysisStore, useUiStore } from '@/store'
import { analysisMethodPath, analysisSteps } from '@/utils/analysis'
import type { AnalysisPageData, AnalysisResult, CodeSnippet, RobustnessCheck } from '@/types'

export default function AnalysisResultPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const {
    data: storeData,
    setData: setStoreData,
    result: storeResult,
    setResult,
    runTask,
  } = useAnalysisStore()

  const [data, setData] = useState<AnalysisPageData | null>(storeData)
  const [loading, setLoading] = useState(!storeData)
  const [error, setError] = useState<string | null>(null)
  const [codeLang, setCodeLang] = useState<'python' | 'r'>('python')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchAnalysis(projectId)
      setData(d)
      setStoreData(d)
      // 直链/刷新进入时，用后端返回的最近一次 run 回填 store
      if (!useAnalysisStore.getState().result && d.run) setResult(d.run)
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

  if (loading && !data) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (!data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  /** 结果来源：优先本次会话刚跑出的结果，其次后端返回的最近一次 run */
  const result: AnalysisResult | null = storeResult ?? data.run ?? null
  /**
   * 结果页的可复现代码对应**本次运行的方法**（`result.methodId`）：
   * 从方法清单里取该方法的实现，保证展示的代码与真正跑出结果的算法一致。
   */
  const runMethod = data.methods.find((m) => m.methodId === result?.methodId)
  const currentCode: CodeSnippet | undefined = runMethod?.code
    ? {
        language: codeLang,
        fileName: codeLang === 'python' ? 'analysis.py' : 'analysis.R',
        code: runMethod.code[codeLang],
        licenseNote: runMethod.licenseNote ?? '',
      }
    : data.code.find((c) => c.language === codeLang)
  const robustness: RobustnessCheck[] = result?.robustness?.length ? result.robustness : data.robustness
  const flipped = robustness.filter((r) => r.flipped)

  return (
    <AppLayout
      breadcrumb={[
        { key: 'p', label: data.projectTitle },
        { key: 'an', label: '数据分析' },
        { key: 'res', label: '结果与稳健性' },
      ]}
    >
      {/* 步骤条 + 数据版本 */}
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <Stepper steps={analysisSteps(data, 'result', true)} />
          <span className="ru-hint whitespace-nowrap">
            数据版本 {data.dataVersion.version} · {data.dataVersion.rows} 行 × {data.dataVersion.columns} 列 ·{' '}
            {data.dataVersion.dataLevel} 个人数据
          </span>
        </div>
      </Card>

      {!result ? (
        <Card className="pb-6">
          <EmptyState
            icon={<IconPlay size={20} />}
            text="尚未执行分析"
            description="请先在第 3 步「选择方法」中挑一个方法并执行；分析完成后会自动跳转到本页展示结果与稳健性检验。"
            action={
              <Button icon={<IconArrowRight size={14} />} onClick={() => navigate(analysisMethodPath(projectId))}>
                去选择方法
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 pb-6">
          <div className="space-y-4">
            {/* 结果总览 */}
            <Card>
              <CardHeader
                icon={<IconChart size={15} />}
                title="分析结果"
                extra={
                  <span className="ru-hint">
                    run_id: {result.runId} · {result.methodName} · {result.finishedAt}
                  </span>
                }
              />
              <div className="grid grid-cols-3 gap-3">
                <StatTile label="有效样本量" value={result.sampleSize} />
                <StatTile label="分析方法" value={<span className="text-base">{result.methodName}</span>} />
                <StatTile label="结果状态" value={<span className="text-ok text-base">可复现</span>} />
              </div>

              <div className="mt-3">
                <DataTable
                  rows={result.effects}
                  rowKey={(r) => r.label}
                  columns={[
                    { key: 'label', title: '效应', render: (r) => r.label },
                    {
                      key: 'value',
                      title: '估计值',
                      width: '110px',
                      align: 'right',
                      render: (r) => <span className="font-semibold tabular-nums">{r.value}</span>,
                    },
                    {
                      key: 'ci',
                      title: '置信区间',
                      width: '220px',
                      render: (r) => <span className="text-ink-2 tabular-nums">{r.ci ?? '—'}</span>,
                    },
                  ]}
                />
              </div>
              <p className="ru-hint mt-2">
                样本量 {result.sampleSize}；全部结果可复现（seed 与运行环境已随结果保存）。
              </p>
            </Card>

            {/* 稳健性检验（结果） */}
            <Card>
              <CardHeader
                icon={<IconCheckCircle size={15} />}
                title="稳健性检验"
                extra={<span className="ru-hint">自动对比 · {robustness.length} 项</span>}
              />
              {flipped.length ? (
                <div className="mb-3">
                  <InfoBanner tone="danger" icon={<IconAlert size={14} />}>
                    有 {flipped.length} 项检验出现结论翻转，已阻断「结论确定」表述，请人工复核后再用于论文写作。
                  </InfoBanner>
                </div>
              ) : null}
              {robustness.length ? (
                <div className="space-y-2">
                  {robustness.map((r) => (
                    <div key={r.checkId} className="flex items-center justify-between gap-2 ru-panel px-3 py-2.5">
                      <span className="text-base text-ink">{r.name}</span>
                      <Tag tone={r.pending ? 'warn' : r.flipped ? 'danger' : 'ok'} size="sm">
                        {r.statusText}
                      </Tag>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="本次运行未产生稳健性检验项" description={data.robustnessNote} />
              )}
              <p className="ru-hint mt-2">{data.robustnessNote}</p>
            </Card>
          </div>

          {/* 右列 */}
          <aside className="space-y-4">
            {/* 可复现代码 */}
            <Card>
              <CardHeader
                icon={<IconTable size={15} />}
                title="可复现代码"
                extra={
                  <Segmented
                    size="sm"
                    value={codeLang}
                    options={[{ key: 'python', label: 'Python' }, { key: 'r', label: 'R' }]}
                    onChange={setCodeLang}
                  />
                }
              />
              {currentCode ? (
                <>
                  {/* 标明代码对应的运行方法，避免「结果来自 A、代码是 B」的错配 */}
                  {runMethod ? <p className="ru-hint mb-2">本次运行方法：{runMethod.name}</p> : null}
                  <CodeBlock code={currentCode.code} />
                  <p className="ru-hint mt-2">
                    开源实现来源与许可证
                    <br />
                    {currentCode.licenseNote}
                  </p>
                </>
              ) : (
                <InfoBanner tone="info">该语言的可复现代码将在分析完成后随结果包一同导出。</InfoBanner>
              )}
            </Card>

            {/* 运行留痕 */}
            <Card>
              <CardHeader icon={<IconHistory size={15} />} title="运行留痕" extra={<span className="ru-hint">可追溯</span>} />
              <div>
                <KeyValue label="run_id" value={<span className="font-mono text-xs">{result.runId}</span>} tone="strong" />
                <KeyValue label="选择人" value={data.selectionTrail.operatorName} />
                <KeyValue label="选择时间" value={data.selectionTrail.operatedAt} />
                <KeyValue
                  label="备选项"
                  value={`${data.selectionTrail.candidateCount} 个（未选 ${data.selectionTrail.unselectedCount}）`}
                />
                <KeyValue label="数据版本" value={data.selectionTrail.dataVersion} />
                <KeyValue label="完成时间" value={result.finishedAt} />
                {runTask ? (
                  <KeyValue
                    label="task_id"
                    value={<span className="font-mono text-xs">{runTask.taskId}</span>}
                  />
                ) : null}
              </div>
              <div className="mt-3">
                <InfoBanner tone="info" icon={<IconRobot size={14} />}>
                  参数、种子与运行环境已随结果保存，可在导出中心一并导出复现说明。
                </InfoBanner>
              </div>
            </Card>

            {/* 后续动作 */}
            <Card className="!border-brand-line bg-brand-soft/40">
              <div className="text-base text-ink">结果已生成</div>
              <div className="ru-hint mt-0.5">可回到第 3 步换方法重跑，或把这组结果带进论文写作。</div>
              <Button
                fullWidth
                className="mt-3"
                icon={<IconArrowRight size={14} />}
                onClick={() => navigate(`/project/${projectId}/writing`)}
              >
                继续论文写作
              </Button>
              <Button
                fullWidth
                variant="ghost"
                className="mt-2"
                icon={<IconRefresh size={14} />}
                onClick={() => navigate(analysisMethodPath(projectId))}
              >
                重新选择方法
              </Button>
              <Button
                fullWidth
                variant="ghost"
                size="sm"
                className="mt-2"
                icon={<IconRefresh size={13} />}
                onClick={() => {
                  void load()
                  pushToast({ tone: 'ok', title: '已刷新结果', description: '重新拉取最近一次运行结果' })
                }}
              >
                刷新结果
              </Button>
            </Card>
          </aside>
        </div>
      )}
    </AppLayout>
  )
}
