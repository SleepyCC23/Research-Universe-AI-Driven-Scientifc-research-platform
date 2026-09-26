/** P06 论文写作 · 选刊 AI（期刊匹配 + 期刊画像 + 投稿前检查清单） */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  IconArrowRight,
  IconCheckCircle,
  IconCredit,
  IconRefresh,
  IconShield,
  IconTable,
  IconTarget,
} from '@/components/icons'
import { useUiStore } from '@/store'
import type { JournalPageData, JournalProfile } from '@/types'

export default function JournalPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)

  const [data, setData] = useState<JournalPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeJournalId, setActiveJournalId] = useState('j1')
  const [profile, setProfile] = useState<JournalProfile | null>(null)
  const [rematching, setRematching] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchJournals(projectId)
      setData(d)
      setProfile(d.profile)
      setActiveJournalId(d.profile.journalId)
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
   * 切换期刊画像。
   * 交互约定（需求变更）：推荐期刊**整张卡片可点击**即完成切换，不再依赖卡片右上角的
   * 「点击在右侧查看画像」提示 —— 文字只作视觉引导，避免用户点了卡片主体「没有反应」。
   * 重复点击当前已选中的期刊直接返回，不重复请求、不重复弹提示。
   */
  async function handleViewProfile(journalId: string, journalName: string) {
    if (journalId === activeJournalId) return
    setActiveJournalId(journalId)
    try {
      const p = await api.fetchJournalProfile({ journalId, journalName })
      setProfile(p)
      pushToast({
        tone: 'info',
        title: `已切换画像：${journalName}`,
        description: '画像数据来源为 JCR / 期刊官网，非实时值',
      })
    } catch (e) {
      // 切换失败：回退到上一次选中的期刊，避免左右两侧画像与高亮不一致
      setActiveJournalId(profile?.journalId ?? 'j1')
      pushToast({
        tone: 'danger',
        title: '画像切换失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    }
  }

  /** 重新匹配 */
  async function handleRematch() {
    setRematching(true)
    try {
      const matches = await api.rematchJournals({ projectId })
      setData((d) => (d ? { ...d, matches } : d))
      pushToast({ tone: 'ok', title: `已重新匹配 ${matches.length} 本候选期刊`, description: '按匹配度降序 · 均附匹配理由' })
    } finally {
      setRematching(false)
    }
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data || !profile) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  return (
    <AppLayout breadcrumb={[{ key: 'p', label: data.title.slice(0, 18) + '…' }, { key: 'j', label: '选刊 AI' }]}>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4 pb-6">
        <div className="space-y-4">
          {/* 稿件摘要 */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink leading-[28px] flex-1">{data.title}</h2>
              <Button variant="secondary" size="sm" icon={<IconRefresh size={13} />} loading={rematching} onClick={handleRematch}>
                重新匹配
              </Button>
            </div>
            <p className="text-base text-ink-2 mt-2 leading-[24px]">{data.abstractText}</p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="ru-hint">关键词</span>
              {data.keywords.map((k) => (
                <Tag key={k} tone="neutral">
                  {k}
                </Tag>
              ))}
            </div>
          </Card>

          {/* 推荐期刊 */}
          <Card>
            <CardHeader
              icon={<IconTable size={15} />}
              title={`推荐期刊（${data.matches.length} 本）`}
              extra={<span className="ru-hint">按匹配度降序 · 点击卡片任意位置查看画像</span>}
            />
            <div className="space-y-2">
              {data.matches.map((m) => {
                const active = activeJournalId === m.journalId
                return (
                  <div
                    key={m.journalId}
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    aria-label={`查看期刊画像：${m.name}`}
                    title={`点击查看「${m.name}」的期刊画像`}
                    onClick={() => void handleViewProfile(m.journalId, m.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        void handleViewProfile(m.journalId, m.name)
                      }
                    }}
                    className={`border rounded-card p-3 transition cursor-pointer group
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 ${
                                 active
                                   ? 'border-brand bg-brand-soft/30'
                                   : 'border-line hover:border-brand-line hover:shadow-pop'
                               }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-base font-semibold text-ink">{m.name}</span>
                      {/* 纯视觉提示：真正可点的是整张卡片，这里不再是独立按钮 */}
                      <span
                        className={`text-xs shrink-0 transition ${
                          active ? 'text-brand font-medium' : 'text-brand/70 group-hover:text-brand'
                        }`}
                      >
                        {/* 文案约定：未选中引导动作并指明画像区在右侧；选中态改为进行时状态标识 */}
                        {active ? '正在查看' : '点击在右侧查看画像'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink-2">
                      <span>{m.indexText}</span>
                      <span className="text-line-strong">·</span>
                      <span className="font-medium text-brand">匹配度 {m.matchScore}%</span>
                    </div>
                    <p className="ru-hint mt-1.5">匹配理由：{m.matchReason}</p>
                  </div>
                )
              })}
            </div>
          </Card>

          <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
            {data.disclaimer}
          </InfoBanner>

          <Card className="!border-brand-line bg-brand-soft/40">
            <div className="flex items-center justify-between gap-3">
              <span className="ru-hint">已为你匹配 {data.matches.length} 本候选期刊 · 画像数据 {data.dataUpdatedAt} 更新</span>
              <Button
                trailingIcon={<IconArrowRight size={14} />}
                onClick={async () => {
                  const res = await api.generateSubmissionPackage({ projectId })
                  pushToast({ tone: 'ok', title: '正在跳转导出中心', description: '投稿包需先补齐伦理与数据可得性声明' })
                  navigate(res.nextRoute)
                }}
              >
                导出投稿包
              </Button>
            </div>
          </Card>
        </div>

        {/* 右列 */}
        <aside className="space-y-4">
          <Card>
            <CardHeader icon={<IconTarget size={15} />} title={`期刊画像 · ${profile.name}`} note={profile.sourceText} />
            <div className="space-y-2.5">
              <ProfileRow label="分区 / 影响因子" value={profile.partition} strong />
              <ProfileRow label="审稿周期" value={profile.reviewCycle} />
              <p className="ru-hint -mt-1.5">{profile.reviewCycleSource}</p>
              <ProfileRow label="录用率" value={profile.acceptanceRate} />
              <p className="ru-hint -mt-1.5">{profile.acceptanceSource}</p>
              <ProfileRow label="版面费" value={profile.apc} />
              <ProfileRow label="收录库" value={profile.databases} />
              <ProfileRow label="格式与字数" value={profile.formatRequirement} />
            </div>

            <div className="mt-3 ru-panel p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-base font-medium text-ink">
                  <IconShield size={13} className="text-brand" />
                  该刊 AI 使用政策
                </span>
                <Tag tone="ok" size="sm">
                  {profile.aiPolicy.level}
                </Tag>
              </div>
              <p className="text-base text-ink-2 leading-[22px]">{profile.aiPolicy.allows}</p>
              <p className="text-base text-danger font-medium leading-[22px] mt-1.5">{profile.aiPolicy.forbids}</p>
              <p className="text-base text-ink-2 leading-[22px] mt-1.5">{profile.aiPolicy.requires}</p>
              <p className="ru-hint mt-2">{profile.aiPolicy.sourceText}</p>
            </div>

            <p className="ru-hint mt-2">第三方统计均标注来源与样本量；无来源不展示；政策数据超 6 个月未更新将标注“数据待确认”。</p>
          </Card>

          <Card>
            <CardHeader
              icon={<IconCheckCircle size={15} />}
              title="投稿前检查清单"
              extra={
                <span className="text-base font-semibold text-warn">
                  {data.completedChecks}/{data.totalChecks} 完成
                </span>
              }
            />
            <div className="space-y-2">
              {data.submissionChecks.map((c) => (
                <div key={c.checkId} className="flex items-start justify-between gap-2">
                  <CheckPill done={c.passed}>{c.text}</CheckPill>
                  {c.pendingText ? (
                    <Tag tone="warn" size="sm">
                      {c.pendingText}
                    </Tag>
                  ) : null}
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              fullWidth
              className="mt-3"
              onClick={() => navigate(`/project/${projectId}/export`)}
            >
              生成投稿包（跳转导出中心）
            </Button>
          </Card>

          <Card>
            <CardHeader icon={<IconCredit size={15} />} title="额度提示" />
            <p className="ru-hint">
              本页期刊画像与匹配均消耗「综述生成」与「文献检索」额度；导出次数按当前套餐计算。
            </p>
            <Button variant="link" size="sm" className="mt-1" onClick={() => navigate('/pricing')}>
              查看套餐与额度 →
            </Button>
          </Card>
        </aside>
      </div>
    </AppLayout>
  )
}

function ProfileRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="ru-hint shrink-0">{label}</span>
      <span className={`text-base text-right ${strong ? 'font-semibold text-ink' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
