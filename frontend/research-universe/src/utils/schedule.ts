/**
 * 项目日程纯函数
 * 设计原则（对齐工程严谨性要求）：
 * 1) 所有日期按 UTC 整数天计算，避免时区与夏令时导致的 1 天漂移；
 * 2) 规则判定集中在 resolvePhaseStatus / resolveMilestoneStatus，规则显式写明；
 * 3) 全部为纯函数，不读全局状态、不产生副作用，便于单测与复用。
 *
 * 消费方：`src/mocks/db.ts`（由日期派生项目卡片的当前阶段、阶段区间、最近 DDL 与剩余天数）。
 * 说明：甘特图已按需求删除，原先只服务于绘图的坐标/刻度函数（percentOf、barGeometry、
 *      buildMonthTicks、resolveForwardRange 等）已一并移除。
 */
import type { DdlNode, PhaseStatus, ProjectDdlGroup, ScheduleMilestone, SchedulePhase } from '@/types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** 把 'YYYY-MM-DD' 解析为 UTC 天的序号（1970-01-01 为 0） */
export function toDayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map((v) => Number(v))
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY)
}

/** b - a，单位「天」。正数表示 b 在 a 之后 */
export function diffDays(a: string, b: string): number {
  return toDayIndex(b) - toDayIndex(a)
}

/** 日期加 n 天，返回 'YYYY-MM-DD'。用于新建项目时按基准日推默认日程 */
export function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d) + n * MS_PER_DAY)
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${dt.getUTCFullYear()}-${mm}-${dd}`
}

/** 由「基准日」与节点日期推导剩余天数（负数表示已过期） */
export function daysLeftFrom(today: string, date: string): number {
  return diffDays(today, date)
}

/**
 * 阶段状态判定规则（显式、与动机无关）：
 *   基准日 < 开始日      → upcoming（未开始）
 *   基准日 > 结束日      → done（已完成）
 *   其余（落在区间内）  → current（进行中）
 */
export function resolvePhaseStatus(
  phase: Pick<SchedulePhase, 'startDate' | 'endDate'>,
  today: string,
): PhaseStatus {
  if (diffDays(today, phase.startDate) > 0) return 'upcoming'
  if (diffDays(phase.endDate, today) > 0) return 'done'
  return 'current'
}

/** 临近节点的判定阈值（天）：进入该窗口即视为「当前节点」 */
export const MILESTONE_CURRENT_WINDOW_DAYS = 7

/**
 * 里程碑状态判定规则：
 *   daysLeft < 0                    → done（已过期 / 已完成）
 *   0 <= daysLeft <= 7              → current（临近，需要关注）
 *   daysLeft > 7                    → upcoming
 */
export function resolveMilestoneStatus(daysLeft: number): PhaseStatus {
  if (daysLeft < 0) return 'done'
  if (daysLeft <= MILESTONE_CURRENT_WINDOW_DAYS) return 'current'
  return 'upcoming'
}

/** 由阶段列表与里程碑推导整体时间轴起止（本项目自身区间） */
export function resolveRange(
  phases: Pick<SchedulePhase, 'startDate' | 'endDate'>[],
  milestones: Pick<ScheduleMilestone, 'date'>[],
) {
  const dates = [...phases.flatMap((p) => [p.startDate, p.endDate]), ...milestones.map((m) => m.date)]
  const sorted = [...dates].sort()
  return { rangeStart: sorted[0], rangeEnd: sorted[sorted.length - 1] }
}

/** 把 'YYYY-MM-DD' 压缩成 'MM.DD' */
export function shortDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-')
  return `${m}.${d}`
}

/** 把区间压成设计稿风格：'09.21‒10.15' */
export function shortRange(startDate: string, endDate: string): string {
  return `${shortDate(startDate)}‒${shortDate(endDate)}`
}

/* ------------------------------------------------------------
 * DDL 倒排时间线：把多个项目的节点合并成一条按紧迫度排序的列表
 * ---------------------------------------------------------- */

/** 列表中的一行 = 某个项目的一个节点 */
export interface DdlRow {
  projectId: string
  projectTitle: string
  node: DdlNode
}

/** 把「按项目分组」的 DDL 数据拍平成行 */
export function flattenDdlGroups(groups: ProjectDdlGroup[]): DdlRow[] {
  return groups.flatMap((g) => g.nodes.map((node) => ({ projectId: g.projectId, projectTitle: g.projectTitle, node })))
}

/**
 * 排序规则（显式、与动机无关）：
 *   1) 未完成（daysLeft >= 0）整体排在已完成（daysLeft < 0）之前 —— 先把「接下来要交的」给用户看；
 *   2) 未完成组内按 daysLeft 升序 —— 最紧急的排最前；
 *   3) 已完成组内按 daysLeft 降序 —— 最近完成的排最前；
 *   4) 仍相同则按「项目标题 → 节点名」字典序，保证顺序稳定可复现。
 */
export function sortDdlRows(rows: DdlRow[]): DdlRow[] {
  const isUpcoming = (r: DdlRow) => r.node.daysLeft >= 0
  return [...rows].sort((a, b) => {
    if (isUpcoming(a) !== isUpcoming(b)) return isUpcoming(a) ? -1 : 1
    if (a.node.daysLeft !== b.node.daysLeft) {
      return isUpcoming(a) ? a.node.daysLeft - b.node.daysLeft : b.node.daysLeft - a.node.daysLeft
    }
    if (a.projectTitle !== b.projectTitle) return a.projectTitle.localeCompare(b.projectTitle)
    return a.node.name.localeCompare(b.node.name)
  })
}

/** 一行展示所需的派生文案：剩余天数 / 已完成 / 今天到期 */
export function ddlDaysText(daysLeft: number): string {
  if (daysLeft < 0) return '已完成'
  if (daysLeft === 0) return '今天到期'
  return `剩 ${daysLeft} 天`
}
