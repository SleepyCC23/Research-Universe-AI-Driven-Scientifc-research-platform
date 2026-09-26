/** 图表组件（基于 Recharts 封装，样式对齐设计稿） */
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrendSeries } from '@/types'

const AXIS = { fontSize: 11, fill: '#8C96A8' }

/** 多序列折线图（研究趋势 / 热词趋势） */
export function TrendLineChart({
  series,
  years,
  height = 220,
  unit,
  yDomain,
}: {
  series: TrendSeries[]
  years: string[]
  height?: number
  unit?: string
  yDomain?: [number, number]
}) {
  const data = years.map((y, i) => {
    const row: Record<string, string | number> = { year: y }
    series.forEach((s) => {
      row[s.name] = s.points[i]?.value ?? 0
    })
    return row
  })

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
          <CartesianGrid vertical={false} stroke="#EDF1F7" />
          <XAxis dataKey="year" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={yDomain} width={46} />
          <Tooltip
            formatter={(v: number, n: string) => [`${v}${unit ?? ''}`, n]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #E6EAF2',
              boxShadow: '0 4px 16px rgba(16,24,40,.08)',
            }}
          />
          {series.map((s) => (
            <Line
              key={s.name}
              type="linear"
              dataKey={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1.5, fill: '#fff', stroke: s.color }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** 图例（自定义，避免 Recharts Legend 样式差异） */
export function ChartLegend({ series }: { series: { name: string; color: string }[] }) {
  return (
    <div className="flex items-center justify-center gap-4 mt-1">
      {series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  )
}

/** 环形图（变量类型分布） */
export function DonutChart({
  data,
  height = 180,
  innerRadius = 52,
  outerRadius = 78,
}: {
  data: { label: string; count: number; color: string }[]
  height?: number
  innerRadius?: number
  outerRadius?: number
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, n: string) => [`${v} 个`, n]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #E6EAF2',
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={7}
            formatter={(v) => <span style={{ fontSize: 12, color: '#5A6473' }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

/** 横向条形图（缺失值分布 / 热词 TOP 榜）——用纯 DOM 实现，完全可控 */
export function HBarList({
  data,
  max,
  color = '#2563EB',
  showValue = true,
  valueFormatter,
}: {
  data: { label: string; value: number }[]
  max?: number
  color?: string
  showValue?: boolean
  valueFormatter?: (v: number) => string
}) {
  const maxVal = max ?? Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-[86px] shrink-0 text-xs text-ink-2 truncate text-right">{d.label}</span>
          <div className="flex-1 h-2 bg-panel rounded-pill overflow-hidden">
            <div
              className="h-full rounded-pill transition-all duration-500"
              style={{ width: `${(d.value / maxVal) * 100}%`, background: color }}
            />
          </div>
          {showValue ? (
            <span className="w-[52px] shrink-0 text-xs text-ink-2 tabular-nums text-left">
              {valueFormatter ? valueFormatter(d.value) : d.value.toLocaleString()}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

/** 词云（字号映射词频、颜色映射增长趋势） */
export const KEYWORD_GROWTH_COLOR: Record<string, string> = {
  emerging: '#2563EB',
  rising: '#D97706',
  stable: '#12B76A',
  longTail: '#8C96A8',
}

export function KeywordCloud({
  keywords,
}: {
  keywords: { keyword: string; freq: number; growth: string }[]
}) {
  const max = Math.max(...keywords.map((k) => k.freq), 1)
  const min = Math.min(...keywords.map((k) => k.freq), 1)
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2">
      {keywords.map((k) => {
        const ratio = (k.freq - min) / Math.max(max - min, 1)
        const size = 13 + ratio * 21
        return (
          <span
            key={k.keyword}
            title={`${k.keyword} · 词频 ${k.freq}`}
            className="cursor-pointer font-semibold transition hover:opacity-70"
            style={{
              fontSize: size,
              color: KEYWORD_GROWTH_COLOR[k.growth] ?? '#5A6473',
              lineHeight: 1.35,
            }}
          >
            {k.keyword}
          </span>
        )
      })}
    </div>
  )
}
