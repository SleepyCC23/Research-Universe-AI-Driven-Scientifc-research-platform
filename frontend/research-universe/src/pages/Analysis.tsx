/**
 * P04 数据统计 · 数据分析 · 第 3 步「选择方法」
 * ------------------------------------------------------------
 * 页面层级（拆页后）：
 *   /project/:projectId/analysis          ← 本页：导入数据 → 数据体检 → 选择方法
 *   /project/:projectId/analysis/result   ← 第 4 步：结果与稳健性（AnalysisResult.tsx）
 * 本页只负责「选方法 + 发起执行」，执行成功后跳转到结果页。
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import { HBarList } from '@/components/charts'
import {
  Button,
  Card,
  CardHeader,
  CodeBlock,
  ErrorState,
  InfoBanner,
  PageSkeleton,
  RenameTaskDialog,
  Segmented,
  Stepper,
  StatTile,
  Tag,
  type Tone,
} from '@/components/ui'
import {
  IconAlert,
  IconArrowRight,
  IconChart,
  IconCheckCircle,
  IconDatabase,
  IconPlay,
  IconRefresh,
  IconSparkles,
  IconTable,
  IconUpload,
} from '@/components/icons'
import { useAnalysisStore, useUiStore } from '@/store'
import { analysisResultPath, analysisSteps } from '@/utils/analysis'
import type { AnalysisPageData, CodeSnippet, StatMethod } from '@/types'

/** ISO 时间 → 「2026-09-25 23:05」；解析失败时原样返回，避免页面出现 Invalid Date */
function fmtTime(input: string): string {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function AnalysisPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const {
    selectedMethodId,
    selectMethod,
    clearMethod,
    setData: setStoreData,
    result,
    setResult,
    runTask,
    setRunTask,
    patchRunTask,
    renameTarget,
    closeRename,
    setRenameName,
    setRenameType,
  } = useAnalysisStore()

  const [data, setData] = useState<AnalysisPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [codeLang, setCodeLang] = useState<'python' | 'r'>('python')
  const [running, setRunning] = useState(false)
  const [refreshingMethods, setRefreshingMethods] = useState(false)

  /** 第 4 步「结果与稳健性」的路由 */
  const resultPath = analysisResultPath(projectId)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchAnalysis(projectId)
      setData(d)
      setStoreData(d)
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

  /**
   * 重新生成候选方法清单。
   * 清单由大模型依据「本项目选题 + 已确认假设 + 变量角色 + 样本量」产生，
   * 因此换选题 / 补完数据 / 新增假设之后，这里应能拿到一份不同的清单。
   */
  async function handleRefreshMethods() {
    setRefreshingMethods(true)
    try {
      const res = await api.refreshMethods({ projectId })
      setData((d) =>
        d ? { ...d, methods: res.methods, selectionTrail: res.trail, methodSource: res.methodSource } : d,
      )
      // 清单变了 → 旧的「已选择方法」失效（后端也已清空），本地同步清掉避免脏选中
      clearMethod()
      pushToast({
        tone: 'ok',
        title: `已重新生成 ${res.methods.length} 个候选方法`,
        description:
          res.methodSource === 'ai'
            ? '依据本项目的选题 / 假设 / 变量生成 · AI 推荐仍不作默认选项'
            : '未接上大模型或调用失败，已回退内置方法库',
      })
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: '方法清单生成失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    } finally {
      setRefreshingMethods(false)
    }
  }

  /** 确认选择并执行（先确认弹窗 → 沙箱异步任务 → 完成后跳转结果页） */
  function handleConfirmAndRun() {
    if (!selectedMethodId) {
      pushToast({ tone: 'warn', title: '请先选择一个方法', description: 'AI 推荐仅供参考，不作默认选项' })
      return
    }
    const method = data?.methods.find((m) => m.methodId === selectedMethodId)
    useUiStore.getState().openConfirm({
      tone: 'info',
      title: '确认操作',
      description: `确认使用「${method?.name}」执行分析？确认后将写入选择留痕（选择人 / 时间 / 备选项）。`,
      confirmText: '确认',
      onConfirm: () => void handleRun(),
    })
  }

  async function handleRun() {
    const store = useUiStore.getState()
    setRunning(true)
    try {
      const task = await api.runAnalysis({
        projectId,
        methodId: selectedMethodId!,
        dataVersion: data?.dataVersion.version ?? 'v2',
        // 任务名按「数据文件 · 方法名」生成，不再写死示例任务名
        taskName:
          [data?.importedFile.fileName, data?.methods.find((m) => m.methodId === selectedMethodId)?.name]
            .filter(Boolean)
            .join(' · ') || '分析任务',
      })
      setRunTask(task)
      store.openTaskDialog({
        phase: 'running',
        title: '正在执行分析…',
        description: task.message ?? '预计需要 10‒30 秒，请稍候',
        progress: 0,
      })
      const done = await api.pollTask(task.taskId, (p) => {
        patchRunTask({ progress: p })
        store.updateTaskDialog({ progress: p })
      }, 2800)
      // 真实模式：runId 在任务结果里（a_xxx），taskId(t_xxx) 不是 runId
      const rawRunId: unknown = done.result?.runId
      const runId = typeof rawRunId === 'string' ? rawRunId : undefined
      if (!runId) throw new Error('任务已完成但未返回结果 runId')
      const res = await api.fetchAnalysisResult({ projectId, runId })
      setResult(res)
      patchRunTask({ status: 'succeeded' })
      // 第 3 步完成 → 关掉进度弹窗并跳转到第 4 步「结果与稳健性」
      store.closeTaskDialog()
      pushToast({ tone: 'ok', title: '分析完成', description: `run_id: ${res.runId} · 已跳转「结果与稳健性」` })
      navigate(resultPath)
    } catch (e) {
      patchRunTask({ status: 'failed' })
      store.updateTaskDialog({
        phase: 'failed',
        title: '分析失败',
        description: e instanceof Error ? e.message : '分析执行失败，请稍后重试',
      })
    } finally {
      setRunning(false)
    }
  }

  /** 重命名分析任务 */
  function handleRenameSave() {
    const store = useAnalysisStore.getState()
    store.closeRename()
    pushToast({ tone: 'ok', title: '任务已重命名', description: store.renameTarget.taskName || '未命名任务' })
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  /**
   * 可复现代码跟随**当前所选方法**。
   * 方法的代码随方法清单一并下发（`methods[].code`），所以这里纯本地计算 ——
   * 用户一点方法，代码块立刻换成该方法的实现，不需要任何请求，也不会有加载态抖动。
   * 未选方法时回落到接口给的默认预览。
   */
  const selectedMethod = data.methods.find((m) => m.methodId === selectedMethodId)
  const currentCode: CodeSnippet | undefined = selectedMethod?.code
    ? {
        language: codeLang,
        fileName: codeLang === 'python' ? 'analysis.py' : 'analysis.R',
        code: selectedMethod.code[codeLang],
        licenseNote: selectedMethod.licenseNote ?? '',
      }
    : data.code.find((c) => c.language === codeLang)
  /** 是否已经跑过一次分析（决定第 4 步是「已完成」还是「未开始」） */
  const hasRun = Boolean(result ?? data.run)

  return (
    <AppLayout breadcrumb={[{ key: 'p', label: data.projectTitle }, { key: 'an', label: '数据分析' }]}>
      {/* 步骤条 + 数据版本 */}
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <Stepper steps={analysisSteps(data, 'method', hasRun)} />
          <span className="ru-hint whitespace-nowrap">
            数据版本 {data.dataVersion.version} · {data.dataVersion.rows} 行 × {data.dataVersion.columns} 列 ·{' '}
            {data.dataVersion.dataLevel} 个人数据
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 pb-6">
        <div className="space-y-4">
          {/* 候选统计方法清单 */}
          <Card>
            <CardHeader
              icon={<IconAlert size={15} />}
              title="候选统计方法清单（防主试效应）"
              extra={
                <div className="flex items-center gap-2">
                  <span className="ru-hint">
                    {data.methods.length} 个可行方法 ·{' '}
                    {data.methodSource === 'ai' ? 'AI 依据本项目生成' : '内置方法库'}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<IconRefresh size={13} />}
                    loading={refreshingMethods}
                    onClick={handleRefreshMethods}
                    title="按当前选题 / 假设 / 变量重新生成候选方法"
                  >
                    重新生成
                  </Button>
                </div>
              }
            />
            <div className="mb-3">
              <InfoBanner tone="info" icon={<IconSparkles size={14} />}>
                候选方法由 AI 依据本项目的选题、已确认假设与变量角色生成，仅供参考、不作默认选项；请对比“优点 / 缺点 /
                对结论稳健性的影响”后自行选择，选择过程将完整留痕。
              </InfoBanner>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.methods.map((m) => (
                <MethodCard
                  key={m.methodId}
                  method={m}
                  selected={selectedMethodId === m.methodId}
                  onSelect={() => selectMethod(m.methodId)}
                />
              ))}
            </div>

            <div className="mt-3 ru-panel flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="ru-hint">
                选择留痕：{data.selectionTrail.operatorName} · {fmtTime(data.selectionTrail.operatedAt)} · 备选项{' '}
                {data.methods.length}（未选 {data.methods.filter((m) => m.methodId !== selectedMethodId).length}）
              </span>
              <Button
                size="sm"
                icon={<IconTable size={13} />}
                onClick={() => useAnalysisStore.getState().openRename()}
              >
                重命名分析任务
              </Button>
            </div>
            <p className="ru-hint mt-2">
              数据版本 {data.selectionTrail.dataVersion} · 参数与运行环境将随结果一同保存
            </p>
          </Card>

          {/* 数据体检报告 */}
          <Card>
            <CardHeader
              icon={<IconCheckCircle size={15} />}
              title="数据体检报告"
              extra={
                <span className="ru-hint">
                  识别准确率 {data.healthReport.accuracy}% · {data.healthReport.reportedAt}
                </span>
              }
            />
            <div className="grid grid-cols-4 gap-3">
              {data.healthReport.metrics.map((m) => (
                <StatTile key={m.key} label={m.label} value={m.value} tone={m.tone === 'warn' ? 'warn' : 'default'} />
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {data.healthNotes.map((n, i) => (
                <InfoBanner key={i} tone={n.tone === 'danger' ? 'danger' : n.tone === 'warn' ? 'warn' : 'info'}>
                  {n.text}
                </InfoBanner>
              ))}
            </div>

            {/* 数据导入 */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="ru-card-title">
                  <span className="text-brand">
                    <IconDatabase size={15} />
                  </span>
                  数据导入
                </div>
                <span className="ru-hint">项目数据级别：已脱敏</span>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {data.importFormats.map((f, i) => (
                  <Tag key={f} tone={i === 1 ? 'brand' : 'neutral'}>
                    {f}
                  </Tag>
                ))}
                <Tag tone="neutral">公共库直连</Tag>
              </div>

              <div className="mt-3 ru-panel px-3 py-2.5 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-[6px] bg-ok-soft text-ok flex items-center justify-center shrink-0">
                  <IconUpload size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-base text-ink truncate">{data.importedFile.fileName}</div>
                  <div className="ru-hint">{data.importedFile.metaText}</div>
                </div>
                <Tag tone="ok" size="sm">
                  体检通过
                </Tag>
              </div>

              <div className="mt-3">
                <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
                  {data.sensitiveWarning}
                </InfoBanner>
              </div>
            </div>
          </Card>
        </div>

        {/* 右列 */}
        <aside className="space-y-4">
          {/* 可复现代码（预览）：正式代码随结果在下一步展示 */}
          <Card>
            <CardHeader
              icon={<IconTable size={15} />}
              title="可复现代码"
              extra={<Segmented size="sm" value={codeLang} options={[{ key: 'python', label: 'Python' }, { key: 'r', label: 'R' }]} onChange={setCodeLang} />}
            />
            {currentCode ? (
              <>
                {/* 让用户能一眼确认「这段代码属于哪个方法」 */}
                <p className="ru-hint mb-2">
                  {selectedMethod ? `当前方法：${selectedMethod.name}` : '选择方法后，这里的代码会同步切换'}
                </p>
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

          {/* 缺失值分布 */}
          <Card>
            <CardHeader
              icon={<IconChart size={15} />}
              title="缺失值分布"
              extra={<span className="ru-hint">前 6 个变量</span>}
            />
            <HBarList
              data={data.missingBars.map((b) => ({ label: b.varName, value: b.missingRate }))}
              valueFormatter={(v) => `${v}%`}
              color="#2563EB"
            />
            <p className="ru-hint mt-3">
              完全缺失变量（social_support）不在此图中，已在体检报告中单独标红。
            </p>
          </Card>

          <Card className="!border-brand-line bg-brand-soft/40">
            <div className="text-base text-ink">确认方法后将写入选择留痕（选择人 / 时间 / 备选项）</div>
            <div className="ru-hint mt-0.5">分析预计需要 1–3 分钟，执行完成后自动跳转到「结果与稳健性」</div>
            <Button
              fullWidth
              className="mt-3"
              icon={<IconPlay size={14} />}
              loading={running}
              onClick={handleConfirmAndRun}
            >
              执行分析
            </Button>
            {hasRun ? (
              <Button
                fullWidth
                variant="ghost"
                className="mt-2"
                icon={<IconArrowRight size={14} />}
                onClick={() => navigate(resultPath)}
              >
                查看上次结果
              </Button>
            ) : null}
            <div className="ru-hint mt-2">
              {selectedMethodId
                ? `已选方法：${data.methods.find((m) => m.methodId === selectedMethodId)?.name}`
                : '尚未选择方法（AI 推荐不作默认选项）'}
            </div>
          </Card>

          {runTask ? (
            <Card>
              <CardHeader icon={<IconPlay size={15} />} title="任务状态" />
              <div className="flex items-center justify-between text-base">
                <span className="text-ink-2">task_id</span>
                <span className="text-ink font-mono text-xs">{runTask.taskId}</span>
              </div>
              <div className="flex items-center justify-between text-base mt-1">
                <span className="text-ink-2">状态</span>
                <Tag tone={runTask.status === 'succeeded' ? 'ok' : runTask.status === 'failed' ? 'danger' : 'warn'} size="sm">
                  {runTask.status}
                </Tag>
              </div>
              <div className="mt-2">
                <Button variant="ghost" size="sm" icon={<IconRefresh size={13} />} onClick={load}>
                  刷新本页数据
                </Button>
              </div>
            </Card>
          ) : null}
        </aside>
      </div>

      <RenameTaskDialog
        open={renameTarget.open}
        onClose={closeRename}
        name={renameTarget.taskName}
        type={renameTarget.analysisType}
        onNameChange={setRenameName}
        onTypeChange={setRenameType}
        onSave={handleRenameSave}
      />
    </AppLayout>
  )
}

/* ------------------------------------------------------------
 * 方法卡片
 * ---------------------------------------------------------- */
function MethodCard({
  method,
  selected,
  onSelect,
}: {
  method: StatMethod
  selected: boolean
  onSelect: () => void
}) {
  return (
    <div
      className={`border rounded-card p-3 flex flex-col transition cursor-pointer ${
        selected ? 'border-brand ring-2 ring-brand/15 bg-brand-soft/30' : 'border-line hover:border-brand-line'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-base font-semibold text-ink leading-[22px]">{method.name}</span>
        {method.recommended ? <Tag tone="brand" size="sm">AI 推荐</Tag> : null}
      </div>
      <p className="text-base text-ink-2 mt-1.5 leading-[22px]">{method.summary}</p>

      <MethodRow label="适用前提" value={method.prerequisites} />
      <MethodRow label="优点" value={method.pros} />
      <MethodRow label="缺点" value={method.cons} tone="warn" />
      <MethodRow label="对结论稳健性的影响" value={method.robustnessImpact} />
      <MethodRow label="前提假设检验清单" value={method.checklist} />

      <div className="mt-auto pt-2">
        <Button variant={selected ? 'primary' : 'secondary'} size="sm" fullWidth onClick={onSelect}>
          {selected ? '已选择该方法' : '选择该方法'}
        </Button>
      </div>
    </div>
  )
}

function MethodRow({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="mt-2.5">
      <div className="text-xs font-medium text-ink">{label}</div>
      <div className={`ru-hint leading-[20px] ${tone === 'warn' ? 'text-warn' : ''}`}>{value}</div>
    </div>
  )
}
