import { prisma } from '../prisma'
import { Errors } from '../core/errors'
import { logError } from '../core/http'

/**
 * 异步任务服务
 * ------------------------------------------------------------
 * 前端约定：POST 提交 → 返回 { taskId, status, ... }，前端轮询 GET /tasks/:taskId。
 * 这里把任务落库，后台异步执行；不阻塞请求线程。
 */

export interface AsyncTaskView {
  taskId: string
  status: 'idle' | 'pending' | 'running' | 'succeeded' | 'failed'
  progress: number
  etaSeconds?: number
  message?: string
  startedAt?: string
  finishedAt?: string
  /** 任务成功后的业务结果（如分析 runId / 效应值等），仅 succeeded 时返回 */
  result?: unknown
}

type Progress = (percent: number, message?: string, etaSeconds?: number) => void
export type TaskRunner<Result> = (progress: Progress) => Promise<Result>

function newTaskId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/** 创建一个任务并在后台执行；立即返回任务句柄给前端轮询 */
export async function createAndRunTask<Result>(
  type: string,
  projectId: string | null,
  runner: TaskRunner<Result>,
): Promise<AsyncTaskView> {
  const taskId = newTaskId()
  const startedAt = new Date()
  await prisma.task.create({
    data: {
      taskId,
      projectId: projectId ?? undefined,
      type,
      status: 'running',
      progress: 0,
      message: '任务已启动',
      startedAt,
    },
  })

  // 后台执行，不 await，避免阻塞响应
  void (async () => {
    try {
      const result = await runner(async (percent, message, etaSeconds) => {
        await prisma.task
          .update({
            where: { taskId },
            data: {
              progress: Math.max(0, Math.min(100, Math.round(percent))),
              ...(message ? { message } : {}),
              ...(etaSeconds !== undefined ? { etaSeconds } : {}),
            },
          })
          .catch(() => undefined)
      })
      await prisma.task.update({
        where: { taskId },
        data: {
          status: 'succeeded',
          progress: 100,
          message: '已完成',
          finishedAt: new Date(),
          result: (result ?? null) as never,
        },
      })
    } catch (err) {
      logError('后台任务执行失败', { taskId, type, err: String(err) })
      await prisma.task
        .update({
          where: { taskId },
          data: {
            status: 'failed',
            message: (err as Error)?.message?.slice(0, 200) || '任务执行失败',
            finishedAt: new Date(),
          },
        })
        .catch(() => undefined)
    }
  })()

  return {
    taskId,
    status: 'running',
    progress: 0,
    message: '任务已启动',
    startedAt: startedAt.toISOString(),
  }
}

/** 轮询任务状态 */
export async function getTask(taskId: string): Promise<AsyncTaskView> {
  const task = await prisma.task.findUnique({ where: { taskId } })
  if (!task) throw Errors.notFound('任务不存在或已过期')
  return {
    taskId: task.taskId,
    status: task.status as AsyncTaskView['status'],
    progress: task.progress,
    etaSeconds: task.etaSeconds ?? undefined,
    message: task.message || undefined,
    startedAt: task.startedAt?.toISOString(),
    finishedAt: task.finishedAt?.toISOString(),
    ...(task.status === 'succeeded' && task.result != null ? { result: task.result } : {}),
  }
}

/** 读取任务结果（供内部使用） */
export async function getTaskResult<T>(taskId: string): Promise<T | null> {
  const task = await prisma.task.findUnique({ where: { taskId } })
  if (!task) throw Errors.notFound('任务不存在或已过期')
  return (task.result as T) ?? null
}
