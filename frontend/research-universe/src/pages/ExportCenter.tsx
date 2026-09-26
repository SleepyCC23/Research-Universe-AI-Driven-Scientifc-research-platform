/** P08 导出中心（产物导出 + AI 使用情况说明 + 合规校验） */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import {
  Button,
  Card,
  CardHeader,
  CheckPill,
  ErrorState,
  InfoBanner,
  PageSkeleton,
  Tag,
} from '@/components/ui'
import {
  IconAlert,
  IconCheckCircle,
  IconDownload,
  IconFileText,
  IconPackage,
  IconShield,
  IconSparkles,
  IconUpload,
} from '@/components/icons'
import { EXPORT_FOOTNOTE } from '@/mocks/db'
import { defaultExportFormat, useExportStore, useProjectStore, useUiStore } from '@/store'
import type { ExportPageData } from '@/types'

/** 面包屑用的项目名：渲染期从项目列表读一次即可（切换项目会伴随路由变化而重渲染，无需订阅） */
function projectTitleOf(projectId: string): string {
  return useProjectStore.getState().projects.find((p) => p.projectId === projectId)?.title ?? '当前项目'
}

export default function ExportCenterPage() {
  const { projectId = 'p_2001' } = useParams()
  const pushToast = useUiStore((s) => s.pushToast)
  const {
    artifacts,
    setArtifacts,
    selectedArtifactIds,
    toggleArtifact,
    selectedFormats,
    setFormat,
    disclosureGeneratedAt,
    setDisclosureGeneratedAt,
    unverifiedConfirmed,
    setUnverifiedConfirmed,
  } = useExportStore()

  const [data, setData] = useState<ExportPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchExportCenter(projectId)
      setData(d)
      setArtifacts(d.artifacts)
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

  /** 生成披露报告（生成后直接下载到本地） */
  async function handleGenerateDisclosure() {
    setGenerating(true)
    try {
      const res = await api.generateDisclosure({ projectId })
      setDisclosureGeneratedAt(res.generatedAt)
      if (res.downloadUrl) {
        const saved = await api.downloadFile(res.downloadUrl, res.fileName ?? 'ai_disclosure.docx')
        pushToast({ tone: 'ok', title: '披露报告已下载', description: `${saved} 已保存到浏览器下载目录` })
      } else {
        pushToast({ tone: 'ok', title: '披露报告已生成', description: `含未决条目标注 · ${res.generatedAt}` })
      }
    } catch (e) {
      pushToast({ tone: 'danger', title: '生成失败', description: e instanceof Error ? e.message : '请稍后重试' })
    } finally {
      setGenerating(false)
    }
  }

  /** 导出已选产物 */
  async function handleExport() {
    if (!selectedArtifactIds.length) {
      pushToast({ tone: 'warn', title: '请先选择要导出的产物' })
      return
    }

    /**
     * 导出前的格式兜底（测试反馈「没选格式就导不出去」）：
     * - 已选格式 → 用用户的；
     * - 未选格式 → 自动补默认格式（PDF 优先），并提示用户已代为选中；
     * - 一个格式都没有（待补齐）→ 直接阻断，并明确指出是哪几项，避免用户对着报错猜。
     */
    const finalFormats: Record<string, string[]> = {}
    const autoFilled: string[] = []
    const noFormat: string[] = []
    for (const id of selectedArtifactIds) {
      const a = artifacts.find((x) => x.artifactId === id)
      if (!a) continue
      if (!a.formats.length) {
        noFormat.push(a.name)
        continue
      }
      const chosen = selectedFormats[id] ?? defaultExportFormat(a.formats)!
      if (!selectedFormats[id]) {
        autoFilled.push(`${a.name} → ${chosen}`)
        setFormat(id, chosen)
      }
      finalFormats[id] = [chosen]
    }

    if (noFormat.length) {
      pushToast({
        tone: 'warn',
        title: `「${noFormat[0]}」${noFormat.length > 1 ? ` 等 ${noFormat.length} 项` : ''}暂无可导出格式`,
        description: '请先取消勾选这些「待补齐」产物，或补齐后再导出',
      })
      return
    }

    if (autoFilled.length) {
      pushToast({
        tone: 'info',
        title: `已为 ${autoFilled.length} 项产物默认选中格式`,
        description: `${autoFilled[0]}${autoFilled.length > 1 ? ' 等' : ''} · 可在右侧切换为其他格式`,
      })
    }

    useUiStore.getState().openConfirm({
      tone: 'warn',
      title: '确认操作',
      description: `即将导出 ${selectedArtifactIds.length} 项产物（每项均已确定导出格式）。导出物将带不可移除溯源标识，连续导出会刷新披露报告。`,
      confirmText: '确认导出',
      onConfirm: async () => {
        setExporting(true)
        try {
          const res = await api.exportArtifacts({
            projectId,
            artifactIds: selectedArtifactIds,
            formats: finalFormats,
          })
          if (!res.downloadUrl) {
            pushToast({ tone: 'ok', title: '导出成功', description: 'Mock 模式未生成真实文件' })
            return
          }
          // 真实下载：后端已生成 zip，这里取回二进制并交给浏览器保存到本地
          const saved = await api.downloadFile(res.downloadUrl, res.fileName ?? 'research-universe-export.zip')
          pushToast({
            tone: 'ok',
            title: '导出完成，已开始下载',
            description: `${saved}${res.sizeText ? ` · ${res.sizeText}` : ''} → 浏览器默认下载目录`,
          })
        } catch (e) {
          pushToast({
            tone: 'danger',
            title: '导出被阻断',
            description: e instanceof Error ? e.message : '存在待补齐产物',
          })
        } finally {
          setExporting(false)
        }
      },
    })
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  return (
    <AppLayout breadcrumb={[{ key: 'p', label: projectTitleOf(projectId) }, { key: 'e', label: '导出中心' }]}>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 pb-6">
        <div className="space-y-4">
          {/* 产物导出 */}
          <Card>
            <CardHeader
              icon={<IconPackage size={15} />}
              title="产物导出"
              extra={<span className="ru-hint">共 {data.artifactCount} 项 · 已就绪项默认选中格式（PDF 优先）</span>}
            />
            <div className="space-y-2">
              {artifacts.map((a) => {
                const checked = selectedArtifactIds.includes(a.artifactId)
                return (
                  <div
                    key={a.artifactId}
                    className={`flex items-center justify-between gap-3 border rounded-card px-3 py-2.5 transition ${
                      checked ? 'border-brand-line bg-brand-soft/30' : 'border-line'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-4 h-4 accent-[#2563EB]"
                        checked={checked}
                        disabled={a.status === 'pending'}
                        onChange={() => toggleArtifact(a.artifactId)}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-base font-medium text-ink truncate">{a.name}</span>
                          {a.status === 'pending' ? (
                            <Tag tone="warn" size="sm">
                              {a.statusText}
                            </Tag>
                          ) : null}
                        </span>
                        <span className="ru-hint block mt-0.5">{a.metaText}</span>
                      </span>
                    </label>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {a.formats.length ? (
                        a.formats.map((f) => (
                          <button
                            key={f}
                            onClick={() => setFormat(a.artifactId, f)}
                            className={`h-7 px-2 rounded-[6px] border text-xs transition ${
                              selectedFormats[a.artifactId] === f
                                ? 'border-brand bg-brand-soft text-brand font-medium'
                                : 'border-line-strong bg-white text-ink-2 hover:border-brand-line'
                            }`}
                          >
                            {f}
                          </button>
                        ))
                      ) : (
                        <Tag tone="warn" size="sm">
                          待补齐
                        </Tag>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 披露报告 */}
          <Card className="!border-brand-line">
            <CardHeader
              icon={<IconSparkles size={15} />}
              title={data.disclosure.title}
              note={data.disclosure.note}
            />
            <div className="space-y-2">
              {data.disclosure.items.map((i) => (
                <CheckPill key={i.itemId} done={i.done}>
                  {i.text}
                </CheckPill>
              ))}
            </div>

            <div className="mt-3">
              <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
                自动处置条目未复核数量：将在生成时按实际情况标注（当前 {data.disclosure.unreviewedCount} 条）
              </InfoBanner>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="ru-hint">
                最近生成：
                {disclosureGeneratedAt ?? data.disclosure.lastGeneratedAt}（含未决条目标注）
              </span>
              <Button icon={<IconFileText size={14} />} loading={generating} onClick={handleGenerateDisclosure}>
                生成披露报告
              </Button>
            </div>
          </Card>

          <p className="ru-hint">{EXPORT_FOOTNOTE}</p>

          <Card className="!border-brand-line bg-brand-soft/40">
            <div className="flex items-center justify-between gap-3">
              <span className="ru-hint">
                已选 {selectedArtifactIds.length} 项产物 · 每项已默认选中导出格式，导出前可自由切换
              </span>
              <Button icon={<IconDownload size={14} />} loading={exporting} onClick={handleExport}>
                导出已选产物
              </Button>
            </div>
          </Card>
        </div>

        {/* 右列 */}
        <aside className="space-y-4">
          {data.risk.hasUnverified && !unverifiedConfirmed ? (
            <Card className="!border-danger-line !bg-danger-soft">
              <CardHeader icon={<IconAlert size={15} />} title="存在无法验证的风险" />
              <p className="text-base text-ink leading-[24px]">{data.risk.message}</p>
              <div className="mt-3 space-y-2">
                <label className="block">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      await api.uploadVerifyPdf({ projectId, file: f })
                      pushToast({ tone: 'ok', title: 'PDF 已上传并完成核验', description: f.name })
                    }}
                  />
                  <Button variant="secondary" fullWidth icon={<IconUpload size={14} />}>
                    上传文献 PDF
                  </Button>
                </label>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={async () => {
                    await api.confirmUnverifiedExport({ projectId })
                    setUnverifiedConfirmed(true)
                    pushToast({ tone: 'warn', title: '已确认允许导出', description: '该确认已写入留痕，并将标注在披露报告中' })
                  }}
                >
                  我已确认，允许导出
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="!border-ok-line !bg-ok-soft">
              <CardHeader icon={<IconCheckCircle size={15} />} title="核验风险已处理" />
              <p className="text-base text-ink leading-[24px]">
                未验证文献已确认或已补充 PDF 核验，可正常导出。确认记录将写入《AI 使用情况说明》。
              </p>
            </Card>
          )}

          <Card>
            <CardHeader icon={<IconShield size={15} />} title="导出合规校验" />
            <div className="space-y-2.5">
              {data.compliance.map((c) => (
                <div key={c.key} className="flex items-center justify-between">
                  <span className="text-base text-ink-2">{c.label}</span>
                  <span className={`text-base font-semibold tabular-nums ${c.tone === 'danger' ? 'text-danger' : 'text-ok'}`}>
                    {c.value}
                  </span>
                </div>
              ))}
            </div>
            <p className="ru-hint mt-3">{data.complianceNote}</p>
          </Card>

          <Card>
            <CardHeader icon={<IconFileText size={15} />} title="导出规则" />
            <div className="space-y-1.5">
              {[
                '所有 AI 生成内容均带不可移除溯源标识。',
                '连续导出时披露报告自动更新为最新一次生成记录。',
                'L2 项目禁止导出原始数据行；L1 / L2 数据默认不进入训练集。',
                '存在核验失败条目时阻断导出，需先处理或确认。',
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
