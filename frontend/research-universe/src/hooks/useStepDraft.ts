/**
 * 流程步骤的草稿钩子（断点续做）
 * ==========================================================
 * 用途：让流程中的每一步都有「进入即登记进度 + 未提交内容防抖落草稿 + 回来时自动带出」的能力。
 *
 * 背景：新建项目后用户常常走一半就离开（关页面、切去别的项目）。此前那一步的输入会丢失，
 * 回来后要从头再填一遍。现在每步调用本钩子即可：
 *
 *   const { draft, saveDraft } = useStepDraft(projectId, 'hotspot')
 *   // 进入页面：钩子内自动登记 inProgress，工作台的「继续上次」会指到这一步
 *   useEffect(() => { if (draft?.researchDirection) setInput(draft.researchDirection as string) }, [draft])
 *   // 输入变化：防抖保存，不打断输入
 *   onChange={(e) => { setInput(e.target.value); saveDraft({ researchDirection: e.target.value }) }}
 *   // 该步提交成功：标记 done，并清掉草稿（避免下次带出已提交内容）
 *   await api.confirmDirection(...); void markDone()
 *
 * 接入清单（尚未接入的页面按上面三行照做即可）：
 *   P02 研究热点 hotspot → researchDirection
 *   P14 领域研究热词 topicKeywords → direction / selectedKeywords
 *   P15 选择理论与变量 topicTheory → theoryId / variableDraft
 *   P16 上传数据 dataUpload → selectedLevel（文件列表已由 GET /data/upload 持久化）
 *   P17 变量识别 dataVariables → roleOverrides
 *   P18 生成研究假设 dataHypotheses → hypothesisDraft
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '@/api/endpoints'
import type { StepDraft } from '@/types'

export function useStepDraft(projectId: string, stepKey: string) {
  const [draft, setDraft] = useState<StepDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const timer = useRef<number | null>(null)

  // 进入页面：并行做两件事——读取上次草稿、把这一步登记为「进行中」
  useEffect(() => {
    let alive = true
    void (async () => {
      const [d] = await Promise.all([
        api.fetchStepDraft({ projectId, stepKey }),
        api.saveProjectProgress({ projectId, stepKey, status: 'inProgress' }),
      ])
      if (alive) setDraft(d)
    })()
    return () => {
      alive = false
    }
  }, [projectId, stepKey])

  /** 防抖保存草稿（600ms，避免每次按键都打接口） */
  const saveDraft = useCallback(
    (patch: StepDraft) => {
      if (timer.current) window.clearTimeout(timer.current)
      setSaving(true)
      timer.current = window.setTimeout(() => {
        void (async () => {
          try {
            setDraft(await api.saveStepDraft({ projectId, stepKey, draft: patch }))
          } finally {
            setSaving(false)
          }
        })()
      }, 600)
    },
    [projectId, stepKey],
  )

  /** 该步提交成功：标记完成并清空草稿 */
  const markDone = useCallback(async () => {
    await Promise.all([
      api.saveProjectProgress({ projectId, stepKey, status: 'done' }),
      api.saveStepDraft({ projectId, stepKey, draft: {} }),
    ])
    setDraft({})
  }, [projectId, stepKey])

  return { draft, saving, saveDraft, markDone }
}
