/** P07 论文评审 · 模拟评审（校准基准 + 硬伤/争议/风格 + 修改建议 + Rebuttal 辅助） */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  InfoBanner,
  PageSkeleton,
  Tag,
  type Tone,
} from '@/components/ui'
import {
  IconAlert,
  IconCheckCircle,
  IconGavel,
  IconQuote,
  IconRefresh,
  IconShield,
  IconSparkles,
} from '@/components/icons'
import { REVIEW_TYPE_META } from '@/mocks/db'
import { useProjectStore, useReviewStore, useUiStore } from '@/store'
import type { RebuttalDraft, ReviewIssue, ReviewPageData, ReviewIssueType, RevisionPath } from '@/types'

/** 面包屑用的项目名：渲染期从项目列表读一次即可（切换项目会伴随路由变化而重渲染，无需订阅） */
function projectTitleOf(projectId: string): string {
  return useProjectStore.getState().projects.find((p) => p.projectId === projectId)?.title ?? '当前项目'
}

const TYPE_STYLE: Record<ReviewIssueType, { wrap: string; badge: Tone; titleColor: string }> = {
  hard: { wrap: 'bg-danger-soft border-danger-line', badge: 'danger', titleColor: 'text-danger' },
  dispute: { wrap: 'bg-warn-soft border-warn-line', badge: 'warn', titleColor: 'text-warn' },
  style: { wrap: 'bg-panel border-line', badge: 'neutral', titleColor: 'text-ink-2' },
}

export default function ReviewPage() {
  const { projectId = 'p_2001' } = useParams()
  const pushToast = useUiStore((s) => s.pushToast)
  const { issues, setIssues, setIssueHandled, calibratedAt, setCalibratedAt } = useReviewStore()

  const [data, setData] = useState<ReviewPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recalibrating, setRecalibrating] = useState(false)
  const [generatingRebuttal, setGeneratingRebuttal] = useState(false)
  /** 当前展开的修改建议（按 issueCode）：点意见卡、或点右侧「修改建议」条目都会切换到这里 */
  const [openGuideCode, setOpenGuideCode] = useState<string | null>(null)
  /** 右侧「修改建议」是否展开全部条目（默认只列前 2 条，避免侧栏过长） */
  const [allGuidesOpen, setAllGuidesOpen] = useState(false)
  /** 生成的完整 Rebuttal 草稿（取接口返回值；未生成时为 null，回落到接口下发的逐条草稿） */
  const [fullDraft, setFullDraft] = useState<RebuttalDraft[] | null>(null)
  /** 意见卡 DOM 引用：从右侧点建议时滚动定位到对应意见 */
  const issueRefs = useRef<Record<string, HTMLDivElement | null>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchReview(projectId)
      setData(d)
      setIssues(d.issues)
      setCalibratedAt(d.calibration.calibratedAt)
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

  const grouped = useMemo(() => {
    const g: Record<ReviewIssueType, ReviewIssue[]> = { hard: [], dispute: [], style: [] }
    issues.forEach((i) => g[i.type].push(i))
    return g
  }, [issues])

  const summary = useMemo(() => {
    const accepted = issues.filter((i) => i.handled === 'accepted').length
    const disputed = issues.filter((i) => i.handled === 'disputed').length
    const ignored = issues.filter((i) => i.handled === 'ignored').length
    return { accepted, disputed, ignored }
  }, [issues])

  /** issueCode → 修改建议：点意见卡 / 点右侧条目时展示对应内容 */
  const guideByCode = useMemo(() => {
    const map: Record<string, RevisionPath> = {}
    ;(data?.revisionPaths ?? []).forEach((p) => {
      map[p.issueCode] = p
    })
    return map
  }, [data])

  /** 已生成的完整草稿优先；没有生成过就用接口下发的逐条草稿 */
  const rebuttalDrafts = fullDraft ?? data?.rebuttals ?? []
  /** 归纳全局的冲突点提示（有争议条目时展示） */
  const disputedCount = issues.filter((i) => i.handled === 'disputed').length

  /**
   * 点击「修改建议」：展开该条建议，并把对应意见卡滚动到视野中间。
   * 修复反馈：原来点建议只是弹一句 Toast，看不到任何具体内容。
   */
  function focusGuide(code: string) {
    setOpenGuideCode((cur) => (cur === code ? null : code))
    issueRefs.current[code]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  /** 把完整 Rebuttal 草稿复制到剪贴板（真实复制，不是只弹提示） */
  async function copyFullDraft() {
    const text = [
      '尊敬的编辑与审稿人：',
      '感谢对本文的审阅与建设性意见。我们已逐条回应如下，并在修改稿中同步修订了对应内容。',
      '',
      ...rebuttalDrafts.flatMap((r, i) => [
        `${i + 1}. 关于「${r.title}」（${r.issueCode}）`,
        ...r.steps.map((s, si) => `  ${si + 1}) ${s}`),
        '',
      ]),
      '再次感谢审稿人指出的问题，以上修改已在修改稿中以批注标出，欢迎进一步指正。',
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      pushToast({
        tone: 'ok',
        title: '已复制完整 Rebuttal 草稿',
        description: `共 ${rebuttalDrafts.length} 条回复，可直接粘贴到投稿系统`,
      })
    } catch {
      pushToast({ tone: 'warn', title: '复制失败', description: '浏览器未授予剪贴板权限，请手动选中文档复制' })
    }
  }

  async function handleIssue(issue: ReviewIssue, handled: ReviewIssue['handled']) {
    const next = issue.handled === handled ? 'none' : handled
    setIssueHandled(issue.issueId, next)
    await api.handleReviewIssue({ projectId, issueId: issue.issueId, handled: next })
    if (next === 'accepted') pushToast({ tone: 'ok', title: `已采纳 ${issue.code}`, description: '修改路径已加入修改摘要' })
    if (next === 'disputed') pushToast({ tone: 'warn', title: `已标记争议 ${issue.code}`, description: '将生成 Rebuttal 说明段' })
  }

  async function handleRecalibrate() {
    setRecalibrating(true)
    try {
      const c = await api.recalibrateReview({ projectId, journal: data?.targetJournal, field: data?.field })
      setCalibratedAt(c.calibratedAt)
      pushToast({
        tone: 'ok',
        title: '已重新校准',
        description: `已学习 ${c.paperCount} 篇顶刊论文 · ${c.corpusCount} 条真实审稿意见语料`,
      })
    } finally {
      setRecalibrating(false)
    }
  }

  /** 生成完整 Rebuttal 草稿（把接口返回值渲染出来，旧实现只弹提示、结果被丢掉） */
  async function handleGenerateRebuttal() {
    setGeneratingRebuttal(true)
    try {
      const drafts = await api.generateRebuttal({ projectId })
      setFullDraft(drafts)
      setData((d) => (d ? { ...d, rebuttals: drafts } : d))
      pushToast({
        tone: 'ok',
        title: `已生成完整 Rebuttal 草稿（${drafts.length} 条）`,
        description: '不改变你的原有观点；冲突点已单独标注',
      })
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: '生成 Rebuttal 草稿失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    } finally {
      setGeneratingRebuttal(false)
    }
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  return (
    <AppLayout breadcrumb={[{ key: 'p', label: projectTitleOf(projectId) }, { key: 'r', label: '模拟评审' }]}>
      {/* 评审对象 */}
      <Card className="mb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base text-ink">
              <span className="text-ink-3">评审对象：</span>
              {data.reviewTarget}
            </div>
            <div className="ru-hint mt-1.5">
              目标期刊：{data.targetJournal} <span className="mx-1 text-line-strong">|</span> 领域：{data.field}
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={<IconRefresh size={13} />} loading={recalibrating} onClick={handleRecalibrate}>
            重新校准
          </Button>
        </div>
      </Card>

      {/* 校准基准 */}
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-base text-ink-2">
            <IconCheckCircle size={14} className="text-ok" />
            校准基准：已学习同领域顶刊论文 {data.calibration.paperCount} 篇 · 真实审稿意见语料{' '}
            {data.calibration.corpusCount} 条 · 校准完成 {calibratedAt}
          </span>
          <span className="ru-hint shrink-0">{data.calibration.note}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 pb-6">
        {/* 左：评审意见分组 */}
        <div className="space-y-4">
          {(Object.keys(grouped) as ReviewIssueType[]).map((type) => {
            const list = grouped[type]
            if (!list.length) return null
            const st = TYPE_STYLE[type]
            return (
              <Card key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`w-6 h-6 rounded-[6px] flex items-center justify-center text-xs font-semibold ${
                      type === 'hard' ? 'bg-danger text-white' : type === 'dispute' ? 'bg-warn text-white' : 'bg-panel text-ink-2'
                    }`}
                  >
                    {REVIEW_TYPE_META[type].short}
                  </span>
                  <span className="text-md font-semibold text-ink">{REVIEW_TYPE_META[type].label}</span>
                  <span className="text-base text-ink-2">{list.length} 条</span>
                </div>

                <div className="space-y-3">
                  {list.map((i) => (
                    <div
                      key={i.issueId}
                      ref={(el) => {
                        issueRefs.current[i.code] = el
                      }}
                      className={`border rounded-card p-3 ${st.wrap} ${
                        openGuideCode === i.code ? 'ring-2 ring-brand/25' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2">
                          <span className={`text-base font-semibold ${st.titleColor}`}>
                            {i.code} {i.title}
                          </span>
                          {i.replyable ? (
                            <span className="ru-hint border border-line rounded-[4px] px-1">可生成回复</span>
                          ) : null}
                        </span>
                        <Tag tone={i.confidence === 'high' ? 'danger' : i.confidence === 'medium' ? 'warn' : 'neutral'} size="sm">
                          {i.confidenceText}
                        </Tag>
                      </div>

                      <p className="text-base text-ink mt-2 leading-[24px]">{i.description}</p>
                      <p className="ru-hint mt-1.5">{i.frequencyText}</p>

                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <Button
                          size="sm"
                          variant={i.handled === 'accepted' ? 'primary' : 'secondary'}
                          onClick={() => handleIssue(i, 'accepted')}
                        >
                          接受建议并修改
                        </Button>
                        <Button
                          size="sm"
                          variant={i.handled === 'disputed' ? 'primary' : 'secondary'}
                          onClick={() => handleIssue(i, 'disputed')}
                        >
                          标记争议
                        </Button>
                        {i.replyable ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              handleIssue(i, 'accepted')
                              pushToast({ tone: 'ok', title: `已为 ${i.code} 生成回复草稿`, description: '草稿写入 Rebuttal 辅助区' })
                            }}
                          >
                            生成回复
                          </Button>
                        ) : null}
                        {i.handled !== 'none' ? (
                          <button
                            className="text-xs text-ink-3 hover:text-ink underline"
                            onClick={() => handleIssue(i, 'ignored')}
                          >
                            忽略该条
                          </button>
                        ) : null}
                      </div>

                      {/* 点这里（或点右侧「修改建议」里的对应条目）展开该条的修改建议 */}
                      <div className="mt-2.5">
                        <button className="text-xs text-brand hover:underline" onClick={() => focusGuide(i.code)}>
                          {openGuideCode === i.code ? '收起修改建议' : '查看修改建议 →'}
                        </button>
                      </div>
                      {openGuideCode === i.code ? (
                        <div className="mt-2 ru-panel px-3 py-2.5">
                          <div className="text-base font-medium text-ink">
                            {guideByCode[i.code]?.title ?? `修改建议（${i.title}）`}
                          </div>
                          <p className="text-base text-ink-2 mt-1 leading-[22px]">
                            {guideByCode[i.code]?.text ?? '暂无对应修改建议，可先「重新校准」再查看。'}
                          </p>
                          <div className="ru-hint mt-2">
                            {i.confidenceText} · {i.frequencyText}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}

        {/* 完整 Rebuttal 草稿：放在全部意见分组（含末尾的风格建议）之后，属于左栏内容。
            原按钮挂在右侧侧栏，点完只弹提示、结果不展示，这里改成「生成 → 就地渲染完整回复信」。 */}
        <Card>
          <CardHeader
            icon={<IconQuote size={15} />}
            title="完整 Rebuttal 草稿"
            note={
              rebuttalDrafts.length
                ? `共 ${rebuttalDrafts.length} 条 · 按意见编号逐条回复`
                : '按全部意见生成一封可直接使用的回复信'
            }
            extra={
              <Button
                icon={<IconQuote size={14} />}
                size="sm"
                loading={generatingRebuttal}
                onClick={handleGenerateRebuttal}
              >
                {rebuttalDrafts.length ? '重新生成完整草稿' : '生成完整 Rebuttal 草稿'}
              </Button>
            }
          />
          {rebuttalDrafts.length === 0 ? (
            <InfoBanner tone="info" icon={<IconSparkles size={14} />}>
              点右上角「生成完整 Rebuttal 草稿」：AI 会依据待回复意见生成一封完整回复信，不改变你的原有观点，
              与本人观点冲突处会单独标注。
            </InfoBanner>
          ) : (
            <>
              <div className="ru-panel px-4 py-3 space-y-4">
                <p className="text-base text-ink leading-[24px]">
                  尊敬的编辑与审稿人：感谢对本文的审阅与建设性意见。我们已逐条回应如下，并在修改稿中同步修订了对应内容。
                </p>
                {rebuttalDrafts.map((r, idx) => (
                  <div key={`${r.issueCode}-${idx}`}>
                    <div className="text-base font-medium text-ink">
                      {idx + 1}. 关于「{r.title}」（{r.issueCode}）
                    </div>
                    <ol className="mt-1.5 space-y-1 list-decimal pl-5">
                      {r.steps.map((s, si) => (
                        <li key={si} className="text-base text-ink-2 leading-[22px]">
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
                <p className="text-base text-ink leading-[24px]">
                  再次感谢审稿人指出的问题，以上修改已在修改稿中以批注标出，欢迎进一步指正。
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <span className="ru-hint">
                  {disputedCount
                    ? `其中 ${disputedCount} 条你已标记为争议：草稿按你的主张生成并标注了冲突点`
                    : '草稿为 AI 辅助生成，不改变你的原有观点'}
                </span>
                <Button variant="secondary" size="sm" onClick={() => void copyFullDraft()}>
                  复制草稿
                </Button>
              </div>
            </>
          )}
        </Card>
        </div>

        {/* 右列 */}
        <aside className="space-y-4">
          <Card>
            <CardHeader
              icon={<IconGavel size={15} />}
              title="修改建议"
              note={
                data.revisionPaths.length
                  ? `共 ${data.revisionPaths.length} 条 · 点击定位到对应意见`
                  : '暂无修改建议'
              }
            />
            <div className="space-y-2.5">
              {(allGuidesOpen ? data.revisionPaths : data.revisionPaths.slice(0, 2)).map((p) => (
                <button
                  key={p.issueCode}
                  className={`w-full text-left px-2.5 py-2 rounded-card border transition ${
                    openGuideCode === p.issueCode
                      ? 'border-brand bg-brand-soft/40'
                      : 'border-line hover:border-brand-line'
                  }`}
                  title="展开该条建议并定位到对应意见"
                  onClick={() => focusGuide(p.issueCode)}
                >
                  <div className="text-base font-medium text-ink">
                    {p.issueCode} · {p.title}
                  </div>
                  <p className="ru-hint leading-[20px] mt-1">{p.text}</p>
                </button>
              ))}
            </div>
            {data.revisionPaths.length > 2 ? (
              <button
                className="mt-3 text-xs text-brand hover:underline"
                onClick={() => setAllGuidesOpen((v) => !v)}
              >
                {allGuidesOpen ? '收起，只看前 2 条' : `查看全部 ${data.revisionPaths.length} 条修改建议 →`}
              </button>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              icon={<IconQuote size={15} />}
              title="Rebuttal 辅助"
              note={
                rebuttalDrafts.length
                  ? `已生成 ${rebuttalDrafts.length} 条 · 完整草稿见正文末尾`
                  : '尚未生成完整草稿'
              }
            />
            {rebuttalDrafts.length ? (
              <div className="space-y-3">
                {rebuttalDrafts.map((r) => (
                  <div key={r.issueCode} className="ru-panel p-3">
                    <div className="text-base font-medium text-ink">
                      {r.issueCode} · {r.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {r.steps.map((s, idx) => (
                        <span key={s} className="inline-flex items-center gap-1.5">
                          {idx > 0 ? <span className="text-ink-3 text-xs">→</span> : null}
                          <span className="text-xs text-ink-2 bg-white border border-line rounded-[5px] px-1.5 py-0.5">
                            {s}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ru-hint">在左侧「完整 Rebuttal 草稿」中点「生成完整 Rebuttal 草稿」后，这里会列出逐条草稿。</p>
            )}

            <div className="mt-3">
              <InfoBanner tone="info" icon={<IconSparkles size={14} />}>
                草稿为 AI 辅助生成，不改变你的原有观点；若与本人观点冲突，以你的观点为准并标注冲突点。
              </InfoBanner>
            </div>
          </Card>

          <Card>
            <CardHeader icon={<IconShield size={15} />} title="置信度声明" />
            <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
              {data.disclaimer}
            </InfoBanner>
          </Card>
        </aside>
      </div>

      {/* 底部汇总 */}
      <Card className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <span className="ru-hint">
            修改摘要：已采纳 {summary.accepted} · 标记争议 {summary.disputed} · 忽略 {summary.ignored} · 校准语料{' '}
            {data.summary.corpusCount} 条
          </span>
          <Button
            onClick={() =>
              pushToast({
                tone: 'ok',
                title: '已输出修改摘要与 Rebuttal 草稿',
                description: '已写入项目产物，可在导出中心下载 .docx',
              })
            }
          >
            输出修改摘要与 Rebuttal 草稿
          </Button>
        </div>
      </Card>
    </AppLayout>
  )
}
