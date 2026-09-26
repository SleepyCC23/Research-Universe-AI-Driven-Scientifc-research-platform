/** P16 论文引言 · 数据驱动 · 上传数据 */
import { useEffect, useRef, useState } from 'react'
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
  Toggle,
} from '@/components/ui'
import {
  IconAlert,
  IconArrowRight,
  IconCheckCircle,
  IconDatabase,
  IconLock,
  IconShield,
  IconSparkles,
  IconTrash,
  IconUpload,
} from '@/components/icons'
import { DATA_LEVEL_CARDS, DATA_SAFETY_NOTES, DATA_SECURITY_TAGS, SENSITIVE_DETECT_TEXT } from '@/mocks/db'
import { useDataFlowStore, useSettingsStore, useUiStore } from '@/store'
import type { DataUploadData } from '@/types'

const MAX_MB = 200
const ALLOWED_EXT = ['csv', 'xlsx', 'xls', 'sav', 'dta']

export default function IntroDataUploadPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const { uploadedFiles, setUploadedFiles, addUploadedFile, removeUploadedFile } = useDataFlowStore()
  /**
   * 数据级别与「跳过逐条确认（YOLO）」都取自 useSettingsStore——
   * 与 P10 项目设置、P03 文献综述共用同一份状态，任何一处修改三处同步。
   */
  const {
    draftDataLevel,
    savedDataLevel,
    skipConfirm,
    setDraftDataLevel,
    setSavedDataLevel,
    setSkipConfirm,
    hydrateCompliance,
  } = useSettingsStore()

  const [data, setData] = useState<DataUploadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [savingLevel, setSavingLevel] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // 页面数据与项目级合规设置并行拉取，避免先用默认值渲染出错误的级别
      const [d, compliance] = await Promise.all([
        api.fetchDataUpload(projectId),
        api.fetchProjectCompliance(projectId),
      ])
      setData(d)
      // 文件列表以接口响应为准（新建项目为空数组，不会继承示例项目的文件）
      setUploadedFiles(d.uploadedFiles)
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

  /** 切换数据级别：只改草稿，需显式「保存定级」才生效（与 P10 一致的语义） */
  function handleSelectLevel(level: DataUploadData['detectedDataLevel']) {
    if (level === draftDataLevel) return
    setDraftDataLevel(level)
    pushToast({
      tone: 'info',
      title: `已选择 ${level}（未保存）`,
      description: level === 'L2' ? 'L2 将强制禁用「跳过逐条确认」，保存后全局生效' : '点击「保存定级」后全局生效',
    })
  }

  /** 保存定级：二次确认后落库（与 P10 走同一接口） */
  function handleSaveLevel() {
    if (draftDataLevel === savedDataLevel) {
      pushToast({ tone: 'info', title: '数据级别未变化' })
      return
    }
    useUiStore.getState().openConfirm({
      tone: 'warn',
      title: '确认操作',
      description: `将项目数据级别切换为 ${draftDataLevel}。改级会影响数据导入拦截、跳过逐条确认与导出规则，结果写入项目日志。`,
      confirmText: '确认保存',
      onConfirm: async () => {
        setSavingLevel(true)
        try {
          const res = await api.updateDataLevel({ projectId, dataLevel: draftDataLevel })
          setSavedDataLevel(res.dataLevel)
          // 级别变化可能让服务端强制关闭 YOLO，这里同步一次真实值
          const compliance = await api.fetchProjectCompliance(projectId)
          setSkipConfirm(compliance.skipConfirm)
          pushToast({ tone: 'ok', title: `数据级别已切换为 ${res.dataLevel}`, description: '规则已全局生效' })
        } finally {
          setSavingLevel(false)
        }
      },
    })
  }

  /** 切换「跳过逐条确认（YOLO）」：落库后以服务端返回值为准 */
  async function handleToggleSkipConfirm(next: boolean) {
    try {
      const res = await api.updateSkipConfirm({ projectId, skipConfirm: next })
      setSkipConfirm(res.skipConfirm)
      pushToast({
        tone: res.skipConfirm ? 'warn' : 'ok',
        title: res.skipConfirm ? '已跳过逐条确认' : '已恢复逐条确认',
        description: res.skipConfirm ? '核验失败条目不再阻断流程，但会记录进披露报告' : '核验未通过时仍会阻断流程',
      })
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: '保存失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    }
  }

  /** 本地文件校验 + 上传 */
  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXT.includes(ext)) {
      pushToast({ tone: 'danger', title: '格式不支持', description: `仅支持 ${ALLOWED_EXT.join(' / ')}` })
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      pushToast({ tone: 'danger', title: '文件过大', description: `单文件需 ≤ ${MAX_MB}MB` })
      return
    }
    setUploading(true)
    try {
      const f = await api.uploadDataFile({ projectId, file })
      addUploadedFile(f)
      pushToast({ tone: 'ok', title: '上传成功', description: `${f.fileName} 已上传，正在安全解析` })
    } finally {
      setUploading(false)
    }
  }

  function handleRemove(fileId: string, fileName: string) {
    useUiStore.getState().openConfirm({
      tone: 'warn',
      title: '移除文件',
      description: `确认移除 ${fileName}？移除后需要重新上传才能参与体检。`,
      confirmText: '移除',
      onConfirm: async () => {
        await api.removeDataFile({ projectId, fileId })
        removeUploadedFile(fileId)
        pushToast({ tone: 'info', title: '已移除文件' })
      },
    })
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  const isL2 = draftDataLevel === 'L2'
  /** 级别有改动但未保存（提示用户点击「保存定级」） */
  const levelDirty = draftDataLevel !== savedDataLevel
  const readyCount = uploadedFiles.length
  const readyVars = data.readyVariableCount

  return (
    <AppLayout
      breadcrumb={[{ key: 'k', label: '研究热点 · 数据驱动' }, { key: 'up', label: '上传数据' }]}
      subHeaderRight={
        <Stepper
          size="sm"
          align="right"
          steps={[
            { key: 'up', label: '上传数据', status: 'current' },
            { key: 'var', label: '变量识别', status: 'upcoming' },
            { key: 'hyp', label: '生成研究假设', status: 'upcoming' },
          ]}
        />
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 pb-6">
        <div className="space-y-4">
          {/* 上传区 */}
          <Card>
            <CardHeader
              icon={<IconUpload size={15} />}
              title="上传你的数据"
              extra={<span className="ru-hint">支持本地文件与公开数据集</span>}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                void handleFiles(e.dataTransfer.files)
              }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-card py-8 flex flex-col items-center justify-center cursor-pointer transition ${
                dragging ? 'border-brand bg-brand-soft/40' : 'border-line-strong bg-[#FAFBFD] hover:border-brand-line'
              }`}
            >
              <span className="w-11 h-11 rounded-full bg-brand-soft flex items-center justify-center text-brand">
                <IconUpload size={20} />
              </span>
              <div className="mt-3 text-base font-medium text-ink">
                {uploading ? '上传中…' : '拖拽文件到此处，或点击选择文件'}
              </div>
              <div className="ru-hint mt-1">
                支持 {data.supportedFormats.join(' / ')}，单文件 ≤ {MAX_MB}MB
              </div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.sav,.dta"
                onChange={(e) => void handleFiles(e.target.files)}
              />
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {data.supportedFormats.map((f) => (
                <Tag key={f} tone="neutral">
                  {f}
                </Tag>
              ))}
            </div>

            {/* 已上传文件 */}
            {uploadedFiles.length ? (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((f) => (
                  <div key={f.fileId} className="ru-panel flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-[6px] bg-ok-soft text-ok flex items-center justify-center shrink-0">
                        <IconCheckCircle size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-base text-ink truncate">{f.fileName}</div>
                        <div className="ru-hint">{f.metaText}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Tag tone="warn" size="sm">
                        {f.statusText}
                      </Tag>
                      <button
                        className="text-ink-3 hover:text-danger"
                        onClick={() => handleRemove(f.fileId, f.fileName)}
                        aria-label="移除文件"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <InfoBanner tone="info">还没有上传文件。支持拖拽上传，单文件 ≤ 200MB。</InfoBanner>
              </div>
            )}

            <p className="ru-hint mt-3">
              文件在项目内隔离解析，原始数据不会离开你的项目空间；导入完成后会自动应用所选数据级别。
            </p>
          </Card>

          {/* 公共数据库 */}
          <Card>
            <CardHeader
              icon={<IconDatabase size={15} />}
              title="或从公共数据库直接导入"
              extra={<span className="ru-hint">许可允许时一键直连 · 无需上传</span>}
            />
            <div className="space-y-2">
              {data.publicDatasets.map((d) => (
                <div key={d.datasetId} className="ru-panel px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base font-medium text-ink truncate">{d.name}</span>
                      <Tag tone={d.level === 'L0' ? 'ok' : 'brand'} size="sm">
                        {d.level} {d.level === 'L0' ? '公开' : '受限'}
                      </Tag>
                    </div>
                    <Button
                      variant={d.accessAction === 'directImport' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={async () => {
                        if (d.accessAction === 'directImport') {
                          await api.importPublicDataset({ datasetId: d.datasetId })
                          pushToast({ tone: 'ok', title: '已加入导入队列', description: d.name })
                        } else {
                          pushToast({ tone: 'info', title: '需自行申请', description: '平台不拥有数据分发权，请前往官方渠道申请' })
                        }
                      }}
                    >
                      {d.accessActionText}
                    </Button>
                  </div>
                  <p className="ru-hint mt-1.5">{d.accessCondition}</p>
                  <p className="ru-hint">{d.citationRequirement}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 数据分级与合规 */}
          <Card>
            <CardHeader
              icon={<IconShield size={15} />}
              title="数据分级与合规"
              note={`系统自动检测：${data.detectedDataLevel} · 项目定级：${savedDataLevel}${
                levelDirty ? `（已改为 ${draftDataLevel}，待保存）` : ''
              } · 与「项目设置」共用同一份设置`}
              extra={
                <Button
                  size="sm"
                  loading={savingLevel}
                  disabled={!levelDirty}
                  onClick={handleSaveLevel}
                >
                  {levelDirty ? '保存定级' : '已保存'}
                </Button>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DATA_LEVEL_CARDS.map((c) => {
                const active = c.level === draftDataLevel
                return (
                  <button
                    key={c.level}
                    onClick={() => handleSelectLevel(c.level)}
                    className={`text-left border rounded-card p-3 transition ${
                      active ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-brand-line'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-[5px] border-brand shrink-0" style={{ borderColor: active ? '#2563EB' : '#D5DCE7' }} />
                      <span className="text-base font-medium text-ink">{c.name}</span>
                    </div>
                    <p className="ru-hint mt-1.5 leading-[20px]">{c.description}</p>
                  </button>
                )
              })}
            </div>

            {levelDirty ? (
              <div className="mt-3">
                <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
                  已选择 {draftDataLevel}，尚未生效 —— 点击右上「保存定级」后全局规则才会变更。
                </InfoBanner>
              </div>
            ) : null}

            <div className="mt-3 flex items-start justify-between gap-3 ru-panel px-3 py-2.5">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-ink-3">
                  <IconLock size={14} />
                </span>
                <div>
                  <div className="text-base text-ink">跳过逐条确认（YOLO）</div>
                  <div className="ru-hint">
                    {isL2
                      ? 'L2 敏感数据强制禁用该选项，确认后规则立即全局生效。'
                      : `开启后将跳过逐条确认，披露报告会记录启用情况。当前：${skipConfirm ? '已跳过' : '逐条确认'}（与文献综述页共用）`}
                  </div>
                </div>
              </div>
              <Toggle checked={skipConfirm} onChange={handleToggleSkipConfirm} disabled={isL2} />
            </div>

            <p className="ru-hint mt-2">{SENSITIVE_DETECT_TEXT}</p>
          </Card>
        </div>

        {/* 右列 */}
        <aside className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconLock size={15} />}
              title="数据安全说明"
              extra={
                <div className="flex items-center gap-1.5">
                  {DATA_SECURITY_TAGS.map((t) => (
                    <Tag key={t} tone="neutral" size="sm">
                      {t}
                    </Tag>
                  ))}
                </div>
              }
            />
            <div className="space-y-2">
              {DATA_SAFETY_NOTES.map((n) => (
                <div key={n.text} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-ink-3">
                    {n.icon === 'trash' ? <IconTrash size={13} /> : <IconCheckCircle size={13} className="text-ok" />}
                  </span>
                  <span className="text-base text-ink leading-[22px]">{n.text}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader icon={<IconSparkles size={15} />} title="没有数据？先体验示例数据集" />
            <div className="space-y-2">
              {data.sampleDatasets.map((s) => (
                <div key={s.sampleId} className="ru-panel px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-base text-ink truncate">{s.title}</div>
                    <div className="ru-hint">{s.metaText}</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await api.loadSampleDataset({ sampleId: s.sampleId })
                      pushToast({ tone: 'ok', title: '示例数据已载入', description: '不会写入你的项目' })
                    }}
                  >
                    载入示例
                  </Button>
                </div>
              ))}
            </div>
            <p className="ru-hint mt-2">示例数据仅用于演示变量识别与研究假设生成流程，不会写入你的项目。</p>
          </Card>

          <Card className="!border-brand-line bg-brand-soft/40">
            <div className="text-base font-medium text-ink">
              已就绪：{readyCount} 个文件 · {readyVars} 个变量
            </div>
            <div className="ru-hint mt-0.5">
              数据级别 {savedDataLevel}
              {levelDirty ? `（已改为 ${draftDataLevel}，未保存）` : ''} ·{' '}
              {data.sensitiveDetected ? '检测到敏感信息' : '未检测到敏感信息'}
            </div>
            <Button
              fullWidth
              className="mt-3"
              trailingIcon={<IconArrowRight size={14} />}
              disabled={!readyCount}
              onClick={() => navigate(`/project/${projectId}/intro/data/variables`)}
            >
              下一步：变量识别
            </Button>
          </Card>

          {isL2 ? (
            <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
              L2 敏感数据：强制脱敏、禁止导出原文、存储加密、访问留痕，且强制禁用「跳过逐条确认」。
            </InfoBanner>
          ) : null}
        </aside>
      </div>
    </AppLayout>
  )
}
