/** P09 定价（套餐选择 + 额度公示表 + 超额处理方式） */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import { Button, Card, CardHeader, CheckPill, InfoBanner, PageSkeleton, ProgressBar, Tag } from '@/components/ui'
import { IconArrowRight, IconCheckCircle, IconCredit, IconShield } from '@/components/icons'
import { OVERAGE_TEXT } from '@/mocks/db'
import { useAuthStore, useUiStore } from '@/store'
import type { Plan, QuotaItem } from '@/types'

export default function PricingPage() {
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const { plan, setPlan, verification, quota } = useAuthStore()

  const [plans, setPlans] = useState<Plan[]>([])
  const [quotaItems, setQuotaItems] = useState<QuotaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState<Plan['planId'] | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.fetchPlans()
        setPlans(res.plans)
        setQuotaItems(res.quotaItems)
      } catch (e) {
        /*
         * 修复：此前只有 finally、没有 catch —— 接口失败时套餐区会静默空白，
         * 用户既不知道发生了什么、也不知道接下来该做什么。现在给出原因 + 下一步。
         */
        pushToast({
          tone: 'danger',
          title: '套餐信息加载失败',
          description: e instanceof Error ? `${e.message}，请稍后重试` : '请稍后重试，或刷新页面',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  /** 切换套餐（二次确认 + 额度变更提示） */
  function handleChangePlan(target: Plan) {
    if (target.planId === plan) return
    useUiStore.getState().openConfirm({
      tone: 'info',
      title: '确认操作',
      description: `确认切换到「${target.name}」（¥${target.price}/${target.priceUnit === 'monthPerMember' ? '月/成员' : '月'}）？切换后额度按新套餐立即生效，已使用额度不结转。`,
      confirmText: '确认切换',
      onConfirm: async () => {
        setChanging(target.planId)
        try {
          await api.changePlan({ planId: target.planId })
          setPlan(target.planId)
          pushToast({ tone: 'ok', title: `已切换到${target.name}`, description: '额度已更新，次月 1 日自动重置' })
        } finally {
          setChanging(null)
        }
      },
    })
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>

  return (
    <AppLayout breadcrumb={[{ key: 'pricing', label: '定价' }]}>
      {/* 学生权益横幅 */}
      <InfoBanner
        tone="ok"
        icon={<IconCheckCircle size={14} />}
        extra={
          <button className="text-xs text-brand hover:underline whitespace-nowrap" onClick={() => navigate('/login')}>
            查看认证 →
          </button>
        }
      >
        {verification.verified
          ? '已认证学生：学生版 ¥19/月（含双 Agent 核验额度），学生权益已生效'
          : '未完成学生认证：完成教育邮箱核验可享学生版 ¥19/月与额外额度'}
      </InfoBanner>

      <h1 className="text-3xl font-bold text-ink mt-5">选择套餐</h1>
      <p className="ru-hint mt-2">所有额度、模型消耗规则与超额处理方式均全量公示，无未公示的隐性限额。</p>

      {/* 套餐卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {plans.map((p) => {
          const isCurrent = p.planId === plan
          return (
            <div
              key={p.planId}
              className={`relative rounded-card border bg-white p-5 flex flex-col ${
                p.mostPopular ? 'border-brand shadow-pop md:-mt-3 md:pb-7' : 'border-line shadow-card'
              }`}
            >
              {p.mostPopular ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 px-3 rounded-pill bg-brand text-white text-xs font-medium flex items-center">
                  最受欢迎
                </span>
              ) : null}

              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold text-ink">{p.name}</div>
                  <div className="ru-hint mt-0.5">{p.subtitle}</div>
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-ink">¥{p.price}</span>
                <span className="text-base text-ink-3">
                  / {p.priceUnit === 'monthPerMember' ? '月 / 成员' : '月'}
                </span>
              </div>

              <div className="mt-4 space-y-2 flex-1">
                {p.highlights.map((h) => (
                  <CheckPill key={h} done>
                    {h}
                  </CheckPill>
                ))}
              </div>

              <div className="mt-5">
                {isCurrent ? (
                  <Button variant="secondary" fullWidth disabled>
                    当前套餐
                  </Button>
                ) : p.planId === 'team' ? (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => pushToast({ tone: 'info', title: '联系销售', description: '团队版支持机构合同、发票与统一披露' })}
                  >
                    联系销售
                  </Button>
                ) : (
                  <Button fullWidth loading={changing === p.planId} onClick={() => handleChangePlan(p)}>
                    {p.planId === 'pro' ? '升级到专业版' : '切换到学生版'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 额度公示表 */}
      <Card className="mt-5">
        <CardHeader
          icon={<IconCredit size={15} />}
          title="额度公示表"
          extra={<span className="ru-hint">每月 1 日 00:00 重置</span>}
        />
        <div className="border border-line rounded-card overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="ru-th w-[220px]">额度项</th>
                <th className="ru-th">学生版</th>
                <th className="ru-th">专业版</th>
                <th className="ru-th">团队版</th>
              </tr>
            </thead>
            <tbody>
              {quotaItems.map((q) => (
                <tr key={q.key} className="hover:bg-[#FAFBFD]">
                  <td className="ru-td text-ink-2">{q.label}</td>
                  <td className="ru-td">{q.student}</td>
                  <td className="ru-td">{q.pro}</td>
                  <td className="ru-td">{q.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 我的额度用量 */}
      <Card className="mt-4">
        <CardHeader
          icon={<IconShield size={15} />}
          title="我的额度用量"
          extra={<span className="ru-hint">重置时间 {quota.resetAt}</span>}
        />
        <div className="space-y-3">
          <QuotaRow label="综述生成" used={quota.reviewGenerateUsed} limit={quota.reviewGenerateLimit} unit="次" />
          <QuotaRow label="双 Agent 核验" used={quota.verifyUsed} limit={quota.verifyLimit} unit="条" />
          <QuotaRow label="分析算力" used={quota.sandboxMinutesUsed} limit={quota.sandboxMinutesLimit} unit="分钟" />
          <QuotaRow label="导出次数" used={quota.exportUsed} limit={quota.exportLimit} unit="次" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Tag tone={quota.overagePolicy === 'throttle' ? 'warn' : 'brand'} size="sm">
            超额处理：{quota.overagePolicy === 'throttle' ? '默认降速不中断' : '按量付费'}
          </Tag>
        </div>
      </Card>

      {/* 超额处理方式 */}
      <Card className="mt-4 mb-8">
        <CardHeader icon={<IconArrowRight size={15} />} title="超额处理方式" />
        <div className="space-y-1.5">
          {[OVERAGE_TEXT.policy, OVERAGE_TEXT.payAsYouGo, OVERAGE_TEXT.reset].map((t) => (
            <div key={t} className="flex items-start gap-2">
              <span className="mt-[7px] w-1 h-1 rounded-full bg-brand shrink-0" />
              <span className="text-base text-ink-2 leading-[22px]">{t}</span>
            </div>
          ))}
        </div>
      </Card>
    </AppLayout>
  )
}

function QuotaRow({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  const pct = Math.min(100, (used / limit) * 100)
  const tone = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'brand'
  return (
    <div>
      <div className="flex items-center justify-between text-base">
        <span className="text-ink-2">{label}</span>
        <span className="tabular-nums text-ink">
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <ProgressBar value={pct} tone={tone} className="mt-1.5" />
    </div>
  )
}
