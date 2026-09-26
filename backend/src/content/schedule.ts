/**
 * 项目日程派生（与前端 src/utils/schedule.ts 完全同口径）
 * 日期是唯一录入值，阶段状态 / 剩余天数 / 当前阶段 / 最近 DDL 全部由日期派生。
 */

export interface SchedulePhase {
  phaseId: string
  name: string
  startDate: string
  endDate: string
  progress: number
  status: 'done' | 'current' | 'upcoming'
}

export interface ScheduleMilestone {
  nodeId: string
  name: string
  date: string
  daysLeft: number
  status: 'done' | 'current' | 'upcoming'
}

export interface ProjectSchedulePayload {
  projectId: string
  projectTitle: string
  rangeStart: string
  rangeEnd: string
  today: string
  phases: SchedulePhase[]
  milestones: ScheduleMilestone[]
  tip: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** 'YYYY-MM-DD' → UTC 天序号 */
export function toDayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY)
}

export function diffDays(a: string, b: string): number {
  return toDayIndex(b) - toDayIndex(a)
}

/** 日期加 n 天 */
export function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d) + n * MS_PER_DAY)
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${dt.getUTCFullYear()}-${mm}-${dd}`
}

export function daysLeftFrom(today: string, date: string): number {
  return diffDays(today, date)
}

/** 今天（本地日期，YYYY-MM-DD） */
export function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function resolvePhaseStatus(
  phase: { startDate: string; endDate: string },
  today: string,
): 'done' | 'current' | 'upcoming' {
  if (diffDays(today, phase.startDate) > 0) return 'upcoming'
  if (diffDays(phase.endDate, today) > 0) return 'done'
  return 'current'
}

export const MILESTONE_CURRENT_WINDOW_DAYS = 7

export function resolveMilestoneStatus(daysLeft: number): 'done' | 'current' | 'upcoming' {
  if (daysLeft < 0) return 'done'
  if (daysLeft <= MILESTONE_CURRENT_WINDOW_DAYS) return 'current'
  return 'upcoming'
}

export function resolveRange(
  phases: { startDate: string; endDate: string }[],
  milestones: { date: string }[],
) {
  const dates = [...phases.flatMap((p) => [p.startDate, p.endDate]), ...milestones.map((m) => m.date)]
  const sorted = [...dates].sort()
  return { rangeStart: sorted[0], rangeEnd: sorted[sorted.length - 1] }
}

export function shortDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-')
  return `${m}.${d}`
}

export function shortRange(startDate: string, endDate: string): string {
  return `${shortDate(startDate)}‒${shortDate(endDate)}`
}

/** 由「原始阶段 + 原始里程碑 + 基准日」组装完整日程 */
export function buildSchedule(
  projectId: string,
  projectTitle: string,
  rawPhases: { phaseId: string; name: string; startDate: string; endDate: string; progress: number }[],
  rawMilestones: { nodeId: string; name: string; date: string }[],
  today: string,
  tip: string,
): ProjectSchedulePayload {
  const { rangeStart, rangeEnd } = resolveRange(rawPhases, rawMilestones)
  return {
    projectId,
    projectTitle,
    rangeStart,
    rangeEnd,
    today,
    phases: rawPhases.map((p) => ({ ...p, status: resolvePhaseStatus(p, today) })),
    milestones: rawMilestones.map((m) => {
      const daysLeft = daysLeftFrom(today, m.date)
      return { ...m, daysLeft, status: resolveMilestoneStatus(daysLeft) }
    }),
    tip,
  }
}

/** 新项目默认阶段时长 */
export const NEW_PROJECT_PHASE_PLAN: { name: string; days: number }[] = [
  { name: '选题', days: 30 },
  { name: '文献综述', days: 30 },
  { name: '数据分析', days: 30 },
  { name: '论文写作', days: 40 },
  { name: '投稿准备', days: 20 },
]

export const NEW_PROJECT_MILESTONE_PLAN: { name: string; offsetDays: number }[] = [
  { name: '开题报告', offsetDays: 30 },
  { name: '中期检查', offsetDays: 90 },
  { name: '投稿截止', offsetDays: 150 },
  { name: '毕业答辩', offsetDays: 200 },
]

/** 由标题推导默认概述关键词 */
export function defaultKeywordOf(title: string): string {
  const head = title.split(/[：:·、，,与和对]/)[0].trim()
  return (head || '新项目').slice(0, 8)
}

/** 新项目日程：从基准日依次排开 */
export function buildNewProjectSchedule(projectId: string, title: string, today: string): ProjectSchedulePayload {
  let cursor = today
  const phases = NEW_PROJECT_PHASE_PLAN.map((p, i) => {
    const startDate = i === 0 ? cursor : addDays(cursor, 1)
    const endDate = addDays(startDate, p.days - 1)
    cursor = endDate
    return { phaseId: `${projectId}_ph${i + 1}`, name: p.name, startDate, endDate, progress: 0 }
  })
  const milestones = NEW_PROJECT_MILESTONE_PLAN.map((m, i) => ({
    nodeId: `${projectId}_ddl${i + 1}`,
    name: m.name,
    date: addDays(today, m.offsetDays),
  }))
  return buildSchedule(
    projectId,
    title,
    phases,
    milestones,
    today,
    '项目刚创建：先去「研究热点」确认方向，再在项目设置里校准 DDL 硬节点日期。',
  )
}

/** 阶段顺序 → 项目阶段枚举 */
const PHASE_ORDER_TO_STAGE = ['topic', 'literature', 'analysis', 'writing', 'submission'] as const

const STAGE_LABEL: Record<string, string> = {
  topic: '选题中',
  literature: '文献综述中',
  analysis: '数据分析中',
  writing: '论文写作中',
  submission: '投稿准备中',
}

/** 由日程派生项目卡片的展示字段 */
export function deriveProjectFields(schedule: ProjectSchedulePayload) {
  const currentIndex = Math.max(
    0,
    schedule.phases.findIndex((p) => p.status === 'current'),
  )
  const currentPhase = schedule.phases[currentIndex] ?? schedule.phases[0]
  const stage = PHASE_ORDER_TO_STAGE[currentIndex] ?? 'topic'
  const progress = currentPhase?.progress ?? 0

  // 最近未过期里程碑；若全部过期则取最后一个
  const upcoming = schedule.milestones.filter((m) => m.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft)
  const mainDdl = upcoming[0] ?? schedule.milestones[schedule.milestones.length - 1]

  return {
    stage,
    stageLabel: STAGE_LABEL[stage] ?? '选题中',
    progress,
    currentPhaseName: currentPhase?.name ?? '选题',
    currentPhaseRange: currentPhase ? shortRange(currentPhase.startDate, currentPhase.endDate) : '',
    mainDdlName: mainDdl?.name ?? '开题报告',
    mainDdlDaysLeft: mainDdl?.daysLeft ?? 0,
  }
}

/** 里程碑 → DDL 节点 */
export function toDdlNode(m: ScheduleMilestone) {
  return { nodeId: m.nodeId, name: m.name, date: m.date, daysLeft: m.daysLeft, status: m.status }
}
