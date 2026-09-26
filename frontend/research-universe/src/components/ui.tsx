/** 通用 UI 组件库（与设计稿视觉一致，可复用） */
import React, { useEffect } from 'react'
import {
  IconAlert,
  IconCheck,
  IconCheckCircle,
  IconClose,
  IconInfo,
  IconSparkles,
} from './icons'
import { useUiStore } from '@/store'

/* ============================================================
 * 基础容器
 * ========================================================== */

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: React.ReactNode
  className?: string
  padded?: boolean
}) {
  return <div className={`ru-card ${padded ? 'p-4' : ''} ${className}`}>{children}</div>
}

export function CardHeader({
  icon,
  title,
  extra,
  note,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  extra?: React.ReactNode
  note?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <div className="ru-card-title">
          {icon ? <span className="text-brand shrink-0">{icon}</span> : null}
          <span className="truncate">{title}</span>
        </div>
        {note ? <div className="ru-hint mt-1">{note}</div> : null}
      </div>
      {extra ? <div className="shrink-0 flex items-center gap-2">{extra}</div> : null}
    </div>
  )
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`ru-panel p-3 ${className}`}>{children}</div>
}

/* ============================================================
 * 按钮
 * ========================================================== */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
type ButtonSize = 'sm' | 'md' | 'lg'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: React.ReactNode
  trailingIcon?: React.ReactNode
  loading?: boolean
  fullWidth?: boolean
}) {
  const sizeCls =
    size === 'sm' ? 'h-7 px-2.5 text-xs rounded-[6px]' : size === 'lg' ? 'h-11 px-5 text-md rounded-card' : 'h-9 px-3.5 text-base rounded-card'
  const variantCls: Record<ButtonVariant, string> = {
    primary: 'bg-brand text-white hover:bg-brand-hover border border-brand disabled:bg-brand/50',
    secondary: 'bg-white text-ink border border-line-strong hover:border-brand hover:text-brand',
    ghost: 'bg-transparent text-ink-2 border border-transparent hover:bg-panel hover:text-ink',
    danger: 'bg-danger text-white hover:brightness-95 border border-danger',
    link: 'bg-transparent text-brand border border-transparent hover:underline px-0',
  }
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition
        disabled:opacity-55 disabled:cursor-not-allowed
        ${sizeCls} ${variantCls[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : icon}
      {children ? <span className="whitespace-nowrap">{children}</span> : null}
      {trailingIcon}
    </button>
  )
}

/* ============================================================
 * 标签 / 徽标
 * ========================================================== */

export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'violet' | 'teal'

const TONE_SOFT: Record<Tone, string> = {
  neutral: 'bg-panel text-ink-2 border-line',
  brand: 'bg-brand-soft text-brand border-brand-line',
  ok: 'bg-ok-soft text-ok border-ok-line',
  warn: 'bg-warn-soft text-warn border-warn-line',
  danger: 'bg-danger-soft text-danger border-danger-line',
  violet: 'bg-violet-soft text-violet border-violet-line',
  teal: 'bg-teal-soft text-teal border-teal-line',
}

export function Tag({
  children,
  tone = 'neutral',
  size = 'md',
  className = '',
  icon,
}: {
  children: React.ReactNode
  tone?: Tone
  size?: 'sm' | 'md'
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-[5px] font-medium whitespace-nowrap
        ${size === 'sm' ? 'h-5 px-1.5 text-xs' : 'h-6 px-2 text-xs'}
        ${TONE_SOFT[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  )
}

/** 实心圆点 + 文案的状态指示 */
export function Dot({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  const color: Record<Tone, string> = {
    neutral: 'bg-ink-3',
    brand: 'bg-brand',
    ok: 'bg-ok',
    warn: 'bg-warn',
    danger: 'bg-danger',
    violet: 'bg-violet',
    teal: 'bg-teal',
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-base">
      <span className={`w-2 h-2 rounded-full ${color[tone]}`} />
      {children}
    </span>
  )
}

/* ============================================================
 * 进度
 * ========================================================== */

export function ProgressBar({
  value,
  tone = 'brand',
  height = 6,
  className = '',
}: {
  value: number
  tone?: Tone
  height?: number
  className?: string
}) {
  const color: Record<Tone, string> = {
    neutral: 'bg-ink-3',
    brand: 'bg-brand',
    ok: 'bg-ok',
    warn: 'bg-warn',
    danger: 'bg-danger',
    violet: 'bg-violet',
    teal: 'bg-teal',
  }
  return (
    <div className={`w-full bg-panel rounded-pill overflow-hidden ${className}`} style={{ height }}>
      <div
        className={`h-full rounded-pill transition-all duration-500 ${color[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

/** 5 分制评分条（选题可行性） */
export function ScoreBar({ score, max = 5, tone = 'ok' }: { score: number; max?: number; tone?: Tone }) {
  return <ProgressBar value={(score / max) * 100} tone={tone} height={5} />
}

export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="text-warn text-base tracking-[1px]" aria-label={`${value}/${max} 星`}>
      {'★'.repeat(value)}
      <span className="text-line-strong">{'★'.repeat(max - value)}</span>
    </span>
  )
}

/* ============================================================
 * 提示条
 * ========================================================== */

export function InfoBanner({
  tone = 'info',
  children,
  icon,
  extra,
  className = '',
}: {
  tone?: 'info' | 'ok' | 'warn' | 'danger'
  children: React.ReactNode
  icon?: React.ReactNode
  extra?: React.ReactNode
  className?: string
}) {
  const map = {
    info: { cls: 'bg-brand-soft/60 border-brand-line text-ink-2', ic: <IconInfo size={15} className="text-brand" /> },
    ok: { cls: 'bg-ok-soft border-ok-line text-ink-2', ic: <IconCheckCircle size={15} className="text-ok" /> },
    warn: { cls: 'bg-warn-soft border-warn-line text-ink-2', ic: <IconAlert size={15} className="text-warn" /> },
    danger: { cls: 'bg-danger-soft border-danger-line text-ink-2', ic: <IconAlert size={15} className="text-danger" /> },
  }[tone]
  return (
    <div className={`flex items-start gap-2 border rounded-card px-3 py-2 ${map.cls} ${className}`}>
      <span className="mt-0.5 shrink-0">{icon ?? map.ic}</span>
      <div className="flex-1 text-base leading-[22px]">{children}</div>
      {extra ? <div className="shrink-0">{extra}</div> : null}
    </div>
  )
}

/* ============================================================
 * 步骤条
 * ========================================================== */

export interface StepDef {
  key: string
  label: string
  status: 'done' | 'current' | 'upcoming'
}

export function Stepper({
  steps,
  align = 'left',
  size = 'md',
}: {
  steps: StepDef[]
  align?: 'left' | 'right'
  size?: 'sm' | 'md'
}) {
  return (
    <div className={`flex items-center ${size === 'sm' ? 'gap-2' : 'gap-3'} ${align === 'right' ? 'justify-end' : ''}`}>
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center rounded-full shrink-0 font-semibold
                ${size === 'sm' ? 'w-5 h-5 text-[11px]' : 'w-6 h-6 text-xs'}
                ${
                  s.status === 'done'
                    ? 'bg-ok text-white'
                    : s.status === 'current'
                      ? 'bg-brand text-white'
                      : 'bg-white text-ink-3 border border-line-strong'
                }`}
            >
              {s.status === 'done' ? <IconCheck size={size === 'sm' ? 11 : 13} /> : i + 1}
            </span>
            <span
              className={`font-medium whitespace-nowrap ${size === 'sm' ? 'text-xs' : 'text-base'}
                ${s.status === 'current' ? 'text-brand' : s.status === 'done' ? 'text-ink' : 'text-ink-3'}`}
            >
              {s.label}
            </span>
            {s.status === 'current' ? (
              <span className="text-xs text-ink-3 border border-line rounded-[4px] px-1">当前步骤</span>
            ) : null}
          </div>
          {i < steps.length - 1 ? (
            <span className="w-6 h-px bg-line-strong shrink-0" />
          ) : null}
        </React.Fragment>
      ))}
    </div>
  )
}

/* ============================================================
 * 弹窗
 * ========================================================== */

export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  width = 480,
  closeOnMask = true,
}: {
  open: boolean
  onClose?: () => void
  title: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
  closeOnMask?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101828]/35 ru-fade-in p-4"
      onMouseDown={() => closeOnMask && onClose?.()}
    >
      <div
        className="bg-white rounded-[10px] shadow-dialog ru-pop-in w-full"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 text-md font-semibold text-ink">
            {icon ? <span className="text-brand">{icon}</span> : null}
            {title}
          </div>
          {onClose ? (
            <button className="text-ink-3 hover:text-ink" onClick={onClose} aria-label="关闭">
              <IconClose size={16} />
            </button>
          ) : null}
        </div>
        <div className="px-5 pb-1 text-base text-ink-2 leading-[24px]">{children}</div>
        {footer ? <div className="px-5 py-4 flex items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}

/** 全局确认弹窗（由 useUiStore 驱动） */
export function GlobalConfirmDialog() {
  const { confirmDialog, closeConfirm } = useUiStore()
  const [loading, setLoading] = React.useState(false)
  return (
    <Modal
      open={confirmDialog.open}
      onClose={closeConfirm}
      title={confirmDialog.title}
      icon={confirmDialog.tone === 'warn' ? <IconAlert size={17} /> : <IconInfo size={17} />}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={closeConfirm}>
            {confirmDialog.cancelText ?? '取消'}
          </Button>
          <Button
            loading={loading}
            onClick={async () => {
              setLoading(true)
              try {
                await confirmDialog.onConfirm?.()
              } finally {
                setLoading(false)
                closeConfirm()
              }
            }}
          >
            {confirmDialog.confirmText}
          </Button>
        </>
      }
    >
      {confirmDialog.description}
    </Modal>
  )
}

/** 全局异步任务弹窗（沙箱执行 / 完成） */
export function GlobalTaskDialog() {
  const { taskDialog, closeTaskDialog } = useUiStore()
  const phase = taskDialog.phase
  return (
    <Modal
      open={taskDialog.open}
      onClose={phase === 'running' ? undefined : closeTaskDialog}
      title={undefined as never}
      width={400}
      footer={
        phase === 'running' ? null : phase === 'succeeded' ? (
          <Button
            fullWidth
            onClick={() => {
              taskDialog.onAction?.()
              closeTaskDialog()
            }}
          >
            {taskDialog.actionText ?? '查看结果'}
          </Button>
        ) : (
          <Button fullWidth variant="secondary" onClick={closeTaskDialog}>
            关闭
          </Button>
        )
      }
    >
      <div className="flex flex-col items-center text-center py-4">
        {phase === 'running' ? (
          <>
            <Spinner size={34} />
            <div className="mt-4 text-md font-semibold text-ink">{taskDialog.title}</div>
            <div className="ru-hint mt-1">{taskDialog.description}</div>
            {typeof taskDialog.progress === 'number' ? (
              <div className="w-full mt-3">
                <ProgressBar value={taskDialog.progress} />
              </div>
            ) : null}
          </>
        ) : phase === 'succeeded' ? (
          <>
            <span className="w-9 h-9 rounded-full bg-ok-soft flex items-center justify-center">
              <IconCheckCircle size={22} className="text-ok" />
            </span>
            <div className="mt-3 text-md font-semibold text-ink">{taskDialog.title}</div>
            <div className="ru-hint mt-1">{taskDialog.description}</div>
          </>
        ) : (
          <>
            <span className="w-9 h-9 rounded-full bg-danger-soft flex items-center justify-center">
              <IconAlert size={22} className="text-danger" />
            </span>
            <div className="mt-3 text-md font-semibold text-ink">{taskDialog.title}</div>
            <div className="ru-hint mt-1">{taskDialog.description}</div>
          </>
        )}
      </div>
    </Modal>
  )
}

/** 重命名分析任务弹窗（业务型弹窗示例） */
export function RenameTaskDialog({
  open,
  onClose,
  name,
  type,
  onNameChange,
  onTypeChange,
  onSave,
  typeOptions = ['数据驱动', '理论驱动'],
}: {
  open: boolean
  onClose: () => void
  name: string
  type: string
  onNameChange: (v: string) => void
  onTypeChange: (v: string) => void
  onSave: () => void
  typeOptions?: string[]
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="重命名分析任务"
      icon={<IconSparkles size={17} />}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onSave}>保存</Button>
        </>
      }
    >
      <div className="space-y-3 pb-1">
        <div>
          <label className="block text-xs text-ink-3 mb-1.5">任务名称</label>
          <input
            className="ru-input"
            placeholder="请输入名称"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-ink-3 mb-1.5">分析类型</label>
          <select className="ru-select" value={type} onChange={(e) => onTypeChange(e.target.value)}>
            {typeOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}

/** 分析类型选择弹窗（工作台 → 新建项目后） */
export function AnalysisTypeDialog({
  open,
  onClose,
  onConfirm,
  value,
  onChange,
  creating = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  value: 'dataDriven' | 'theoryDriven'
  onChange: (v: 'dataDriven' | 'theoryDriven') => void
  /** 正在创建（创建项目是异步请求） */
  creating?: boolean
}) {
  /**
   * `entry` 说明该类型创建后落在哪个页面 —— 与 `POST /projects` 返回的 `entryRoute` 一致，
   * 让用户在创建前就知道会去哪，避免「跳转和预期不一致」。
   */
  const options = [
    {
      key: 'dataDriven' as const,
      title: '数据驱动',
      desc: '已有数据，没有思路',
      entry: '创建后进入「上传数据」：上传 → 变量识别 → 生成研究假设',
    },
    {
      key: 'theoryDriven' as const,
      title: '理论驱动',
      desc: '已有分析思路 / 正在思考',
      entry: '创建后进入「研究热点」：热点 → 领域研究热词 → 选择理论与变量',
    },
  ]
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="请选择您的分析类型"
      icon={<IconSparkles size={17} />}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={creating}>
            取消
          </Button>
          <Button onClick={onConfirm} loading={creating}>
            {creating ? '创建中' : '确认并开始'}
          </Button>
        </>
      }
    >
      <div className="space-y-2 pb-1">
        {options.map((o) => (
          <button
            key={o.key}
            disabled={creating}
            onClick={() => onChange(o.key)}
            className={`w-full text-left border rounded-card px-3 py-2.5 transition disabled:opacity-60
              ${value === o.key ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand-line'}`}
          >
            <div className="text-base font-medium text-ink flex items-center gap-1.5">
              {value === o.key ? <IconCheckCircle size={13} className="text-brand shrink-0" /> : null}
              {o.title}
            </div>
            <div className="ru-hint">{o.desc}</div>
            {value === o.key ? <div className="ru-hint mt-1 text-brand">{o.entry}</div> : null}
          </button>
        ))}
      </div>
    </Modal>
  )
}

/* ============================================================
 * 表格
 * ========================================================== */

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyText = '暂无数据',
  className = '',
}: {
  columns: { key: string; title: React.ReactNode; width?: string; align?: 'left' | 'right' | 'center'; render: (row: T) => React.ReactNode }[]
  rows: T[]
  rowKey: (row: T) => string
  emptyText?: string
  className?: string
}) {
  if (!rows.length) return <EmptyState text={emptyText} />
  return (
    <div className={`border border-line rounded-card overflow-hidden ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="ru-th" style={{ width: c.width, textAlign: c.align ?? 'left' }}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-[#FAFBFD]">
              {columns.map((c) => (
                <td key={c.key} className="ru-td" style={{ textAlign: c.align ?? 'left' }}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ============================================================
 * 状态占位
 * ========================================================== */

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block ru-spin rounded-full border-2 border-brand/25 border-t-brand ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function Skeleton({ className = '', height = 14 }: { className?: string; height?: number }) {
  return <div className={`ru-skeleton rounded-[4px] ${className}`} style={{ height }} />
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton height={28} className="w-1/3" />
      <div className="ru-card p-4 space-y-3">
        <Skeleton height={18} className="w-1/4" />
        <Skeleton height={12} />
        <Skeleton height={12} className="w-5/6" />
      </div>
      <div className="ru-card p-4 space-y-3">
        <Skeleton height={18} className="w-1/5" />
        <Skeleton height={12} />
        <Skeleton height={12} className="w-4/5" />
        <Skeleton height={12} className="w-2/3" />
      </div>
    </div>
  )
}

export function EmptyState({
  text = '暂无数据',
  description,
  action,
  icon,
}: {
  text?: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="w-10 h-10 rounded-full bg-panel flex items-center justify-center text-ink-3">
        {icon ?? <IconInfo size={20} />}
      </span>
      <div className="mt-3 text-base font-medium text-ink">{text}</div>
      {description ? <div className="ru-hint mt-1 max-w-[380px]">{description}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  text = '加载失败',
  description,
  onRetry,
}: {
  text?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="w-10 h-10 rounded-full bg-danger-soft flex items-center justify-center text-danger">
        <IconAlert size={20} />
      </span>
      <div className="mt-3 text-base font-medium text-ink">{text}</div>
      {description ? <div className="ru-hint mt-1 max-w-[420px]">{description}</div> : null}
      {onRetry ? (
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            重试
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/* ============================================================
 * Toast
 * ========================================================== */

export function ToastContainer() {
  const { toasts, dismissToast } = useUiStore()
  const toneMap = {
    info: 'border-brand-line bg-brand-soft',
    ok: 'border-ok-line bg-ok-soft',
    warn: 'border-warn-line bg-warn-soft',
    danger: 'border-danger-line bg-danger-soft',
  }
  const iconMap = {
    info: <IconInfo size={16} className="text-brand" />,
    ok: <IconCheckCircle size={16} className="text-ok" />,
    warn: <IconAlert size={16} className="text-warn" />,
    danger: <IconAlert size={16} className="text-danger" />,
  }
  return (
    <div className="fixed top-4 right-4 z-[200] space-y-2 w-[330px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`ru-pop-in flex items-start gap-2 border rounded-card px-3 py-2.5 shadow-pop bg-white ${toneMap[t.tone]}`}
        >
          <span className="mt-0.5">{iconMap[t.tone]}</span>
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-ink">{t.title}</div>
            {t.description ? <div className="ru-hint">{t.description}</div> : null}
          </div>
          <button className="text-ink-3 hover:text-ink" onClick={() => dismissToast(t.id)} aria-label="关闭提示">
            <IconClose size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
 * 小控件
 * ========================================================== */

/**
 * 头像：有自定义图片（`src`）时渲染图片，否则回落到「昵称首字」文字头像。
 * 顶栏 / 侧边栏 / 账号设置共用同一口径，避免三处各写一份判断。
 */
export function Avatar({
  src,
  text,
  size = 28,
  className = '',
}: {
  src?: string | null
  text?: string
  size?: number
  className?: string
}) {
  const style = { width: size, height: size }
  if (src) {
    return (
      <img
        src={src}
        alt="用户头像"
        style={style}
        className={`rounded-full object-cover ring-1 ring-line shrink-0 ${className}`}
      />
    )
  }
  return (
    <span
      style={style}
      className={`rounded-full bg-brand text-white font-semibold flex items-center justify-center shrink-0 ${className}`}
    >
      <span style={{ fontSize: Math.max(10, Math.round(size * 0.42)) }}>{text || '研'}</span>
    </span>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T
  options: { key: T; label: React.ReactNode; desc?: string }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex items-center gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`inline-flex items-center border rounded-card font-medium transition
            ${size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-3.5 text-base'}
            ${value === o.key ? 'border-brand bg-brand-soft text-brand' : 'border-line-strong bg-white text-ink-2 hover:border-brand-line'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`relative w-9 h-5 rounded-pill transition shrink-0 ${checked ? 'bg-brand' : 'bg-line-strong'} ${disabled ? 'opacity-50' : ''}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  )
}

export function CheckPill({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`mt-[3px] w-[15px] h-[15px] rounded-full flex items-center justify-center shrink-0 ${
          done ? 'bg-ok' : 'border border-line-strong bg-white'
        }`}
      >
        {done ? <IconCheck size={10} className="text-white" /> : null}
      </span>
      <span className="text-base text-ink leading-[22px]">{children}</span>
    </div>
  )
}

export function StatTile({
  label,
  value,
  tone = 'default',
  className = '',
}: {
  label: string
  value: React.ReactNode
  tone?: 'default' | 'warn' | 'danger'
  className?: string
}) {
  const color = tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-ink'
  return (
    <div className={`ru-panel px-3 py-2.5 ${className}`}>
      <div className="ru-hint">{label}</div>
      <div className={`mt-1 text-2xl font-semibold leading-7 ${color}`}>{value}</div>
    </div>
  )
}

export function KeyValue({
  label,
  value,
  tone = 'default',
}: {
  label: React.ReactNode
  value: React.ReactNode
  tone?: 'default' | 'strong' | 'brand'
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-line last:border-b-0">
      <span className="text-base text-ink-2 shrink-0">{label}</span>
      <span
        className={`text-base text-right ${tone === 'strong' ? 'font-semibold text-ink' : tone === 'brand' ? 'text-brand font-medium' : 'text-ink'}`}
      >
        {value}
      </span>
    </div>
  )
}

export function CodeBlock({ code, className = '' }: { code: string; className?: string }) {
  return (
    <pre
      className={`bg-[#0F172A] text-[#D6E2F5] text-xs leading-[20px] rounded-card p-3 overflow-x-auto font-mono ${className}`}
    >
      <code>{code}</code>
    </pre>
  )
}

export function Breadcrumb({
  items,
  onNavigate,
  titleLabel,
  onTitleClick,
}: {
  items: { key: string; label: string; route?: string }[]
  onNavigate?: (route: string) => void
  /** 当前项目名：与某段文案一致时，该段渲染为品牌蓝可点（点击可切换项目） */
  titleLabel?: string
  onTitleClick?: () => void
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {items.map((it, i) => (
        <React.Fragment key={it.key}>
          {i > 0 ? <span className="text-line-strong">›</span> : null}
          {titleLabel && it.label === titleLabel ? (
            /* 项目名：标蓝 + 可点，点击打开「切换项目」对话框 */
            <button
              onClick={onTitleClick}
              title="切换项目"
              className="text-brand font-medium hover:underline inline-flex items-center gap-1"
            >
              {it.label}
              <span aria-hidden>⇄</span>
            </button>
          ) : (
            <button
              disabled={!it.route || i === items.length - 1}
              onClick={() => it.route && onNavigate?.(it.route)}
              className={`${
                i === items.length - 1
                  ? 'text-ink font-medium cursor-default'
                  : it.route
                    ? 'text-ink-3 hover:text-brand'
                    : 'text-ink-3'
              }`}
            >
              {it.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

/* ============================================================
 * 项目切换对话框（点导航栏里的项目名打开 / 首次进入自动弹出）
 * ========================================================== */
export function ProjectSwitcherDialog({
  open,
  onClose,
  projects,
  currentProjectId,
  onPick,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  projects: { projectId: string; title: string; discipline: string; stageLabel: string; progress: number }[]
  currentProjectId: string
  onPick: (projectId: string) => void
  onCreate: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="请选择要进入的项目"
      icon={<IconSparkles size={17} />}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onCreate} icon={<IconSparkles size={13} />}>
            新建项目
          </Button>
        </>
      }
    >
      <p className="ru-hint mb-2">进入项目后，顶部导航会一直显示当前项目名，点击即可随时切换。</p>
      <div className="space-y-2">
        {projects.map((p) => (
          <button
            key={p.projectId}
            onClick={() => onPick(p.projectId)}
            className={`w-full text-left border rounded-card px-3 py-2.5 transition
              ${p.projectId === currentProjectId ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand-line'}`}
          >
            <div className="text-base text-ink flex items-center gap-1.5">
              {p.projectId === currentProjectId ? <IconCheckCircle size={13} className="text-brand shrink-0" /> : null}
              <span className="min-w-0 truncate">{p.title}</span>
            </div>
            <div className="ru-hint">
              {p.discipline} · {p.stageLabel} · 最新进度 {p.progress}%
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
