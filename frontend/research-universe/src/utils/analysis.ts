/**
 * 数据分析流程的两步页共用逻辑
 * ==========================================================
 * 第 3 步「选择方法」   → /project/:projectId/analysis
 * 第 4 步「结果与稳健性」→ /project/:projectId/analysis/result
 *
 * 后端返回的 steps 里，method 恒为 current、result 随是否有 run 变化。
 * 拆页后由前端按当前所在页覆写状态，避免「两页同时高亮同一步」。
 */
import type { AnalysisPageData } from '@/types'
import type { StepDef } from '@/components/ui'

export type AnalysisStepView = 'method' | 'result'

/** 结果页路由 */
export function analysisResultPath(projectId: string) {
  return `/project/${projectId}/analysis/result`
}

/** 选择方法页路由 */
export function analysisMethodPath(projectId: string) {
  return `/project/${projectId}/analysis`
}

/**
 * 生成步骤条数据：
 * - view='method'：前两步 done，第 3 步 current，第 4 步在有结果时 done、否则 upcoming；
 * - view='result'：前两步 done，第 3 步 done，第 4 步 current。
 * 标签沿用后端返回的文案（如「导入数据 / 数据体检 / 选择方法 / 结果与稳健性」）。
 */
export function analysisSteps(
  data: Pick<AnalysisPageData, 'steps'> | null | undefined,
  view: AnalysisStepView,
  hasRun: boolean,
): StepDef[] {
  return (data?.steps ?? []).map((s) => {
    if (view === 'result') {
      if (s.key === 'result') return { key: s.key, label: s.label, status: 'current' as const }
      return { key: s.key, label: s.label, status: 'done' as const }
    }
    if (s.key === 'method') return { key: s.key, label: s.label, status: 'current' as const }
    if (s.key === 'result') return { key: s.key, label: s.label, status: hasRun ? ('done' as const) : ('upcoming' as const) }
    return { key: s.key, label: s.label, status: s.status }
  })
}
