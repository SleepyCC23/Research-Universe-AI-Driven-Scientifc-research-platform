import { prisma } from '../prisma'
import { Errors } from '../core/errors'
import { DATA_LEVEL_CARDS, DATA_LEVEL_OPTIONS_META } from '../content/catalogs'
import { defaultKeywordOf, todayIso } from '../content/schedule'
import { createProjectGraph } from './project.graph'
import { deleteProjectExportFiles } from './export.service'
import { buildNewProjectSchedule } from '../content/schedule'
import { genId, nowIso, requireProject, serializeProject, stamp } from './common'

/** ---------- 列表 / 详情 ---------- */

export async function listProjects(userId: string, query: { page?: number; pageSize?: number; sort?: string }) {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 20)
  const orderBy = query.sort === 'ddl' ? { mainDdlDaysLeft: 'asc' as const } : { createdAt: 'desc' as const }

  const [total, projects] = await Promise.all([
    prisma.project.count({ where: { ownerId: userId } }),
    prisma.project.findMany({ where: { ownerId: userId }, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
  ])

  const greeting = await buildGreeting(userId)
  return {
    list: projects.map(serializeProject),
    total,
    page,
    pageSize,
    metaText: `共 ${total} 个项目 · 按最近编辑排序`,
    greeting,
  }
}

async function buildGreeting(userId: string): Promise<string> {
  const main = await prisma.project.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } })
  if (!main) return '开始你的第一个科研项目：新建项目 → 确认方向 → 导入数据。'
  return `2 条文献核验条目待确认（导出中心），「${main.title.slice(0, 8)}」距${main.mainDdlName}还有 ${main.mainDdlDaysLeft} 天。`
}

export async function getProject(projectId: string) {
  const p = await requireProject(projectId)
  return serializeProject(p)
}

/** ---------- 新建项目（一并初始化 7 组变量）---------- */

export async function createProject(userId: string, payload: { title: string; discipline: string; route: 'dataDriven' | 'theoryDriven' }) {
  if (!payload.title || !payload.title.trim()) throw Errors.param('项目标题不能为空')
  if (!['dataDriven', 'theoryDriven'].includes(payload.route)) throw Errors.param('驱动路线非法')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw Errors.unauthorized()

  const id = genId('p')
  const today = todayIso()
  const schedule = buildNewProjectSchedule(id, payload.title, today)
  await createProjectGraph({
    id,
    ownerId: userId,
    ownerName: user.nickname,
    title: payload.title,
    discipline: payload.discipline || user.major,
    route: payload.route,
    schedule,
    createdAt: new Date(),
    rich: false,
    footnote: '尚未产生阶段产物',
    lastEditedText: '刚刚创建',
  })

  const project = await requireProject(id)
  const entryRoute =
    payload.route === 'dataDriven' ? `/project/${id}/intro/data/upload` : `/project/${id}/intro`
  return { project: serializeProject(project), entryRoute }
}

/** ---------- DDL 合并时间线 / 关键词 ---------- */

export async function getDdlTimeline(userId: string) {
  const projects = await prisma.project.findMany({ where: { ownerId: userId }, include: { schedule: true } })
  return projects.map((p) => {
    const schedule = p.schedule
    const nodes = schedule
      ? (schedule.milestones as Array<{ nodeId: string; name: string; date: string; daysLeft: number; status: string }>).map((m) => ({
          nodeId: m.nodeId,
          name: m.name,
          date: m.date,
          daysLeft: m.daysLeft,
          status: m.status,
        }))
      : []
    return { projectId: p.id, projectTitle: p.title, nodes, tip: schedule?.tip ?? undefined }
  })
}

export async function getDdlKeywords(userId: string) {
  const projects = await prisma.project.findMany({ where: { ownerId: userId }, include: { ddlKeyword: true } })
  return projects.map((p) => ({
    projectId: p.id,
    selected: p.ddlKeyword?.selected ?? '',
    options: (p.ddlKeyword?.options as Array<{ keyword: string; sourceText: string }>) ?? [],
  }))
}

export async function updateDdlKeyword(projectId: string, selected: string) {
  const p = await requireProject(projectId)
  await prisma.ddlKeyword.upsert({
    where: { projectId },
    update: { selected },
    create: { projectId, selected, options: [{ keyword: selected || defaultKeywordOf(p.title), sourceText: '来自项目标题' }] },
  })
  const ddlKeyword = await prisma.ddlKeyword.findUnique({ where: { projectId } })
  return { projectId, selected: ddlKeyword?.selected ?? selected, options: (ddlKeyword?.options as never) ?? [] }
}

/** ---------- 合规 ---------- */

export async function getCompliance(projectId: string) {
  const c = await prisma.projectCompliance.findUnique({ where: { projectId } })
  const level = c?.dataLevel ?? 'L1'
  return { projectId, dataLevel: level, skipConfirm: level === 'L2' ? false : c?.skipConfirm ?? false }
}

export async function updateSkipConfirm(projectId: string, skipConfirm: boolean) {
  const c = await prisma.projectCompliance.findUnique({ where: { projectId } })
  const dataLevel = c?.dataLevel ?? 'L1'
  const next = dataLevel === 'L2' ? false : skipConfirm
  await prisma.projectCompliance.upsert({
    where: { projectId },
    update: { skipConfirm: next },
    create: { projectId, dataLevel, skipConfirm: next },
  })
  return { projectId, dataLevel, skipConfirm: next }
}

export async function updateDataLevel(userId: string, projectId: string, dataLevel: string) {
  if (!['L0', 'L1', 'L2'].includes(dataLevel)) throw Errors.param('数据级别非法')
  const p = await requireProject(projectId)
  if (p.ownerId !== userId) throw Errors.forbiddenRole('仅第一作者可修改数据级别')
  await prisma.projectCompliance.upsert({
    where: { projectId },
    update: { dataLevel, ...(dataLevel === 'L2' ? { skipConfirm: false } : {}) },
    create: { projectId, dataLevel, skipConfirm: false },
  })
  await prisma.project.update({ where: { id: projectId }, data: { dataLevel } })
  const impact =
    dataLevel === 'L2'
      ? '已切换为 L2：强制逐条确认，禁止导入外部原始数据行，导出将被阻断直至合规校验通过。'
      : `已切换为 ${dataLevel}：导入与导出按该级别规则执行。`
  return { dataLevel, impact }
}

/** ---------- 阶段产物 ---------- */

export async function getStageArtifacts(projectId: string) {
  const p = await requireProject(projectId)
  const a = await prisma.stageArtifacts.findUnique({ where: { projectId } })
  return {
    projectId,
    currentStage: (a?.currentStage ?? p.stage) as string,
    currentStageLabel: a?.currentStageLabel ?? p.stageLabel,
    artifacts: (a?.artifacts as unknown[]) ?? [],
  }
}

/** ---------- 项目设置 ---------- */

export async function getSettings(projectId: string) {
  const p = await requireProject(projectId)
  const [schedule, members, versions, compliance] = await Promise.all([
    prisma.projectSchedule.findUnique({ where: { projectId } }),
    prisma.projectMember.findMany({ where: { projectId }, orderBy: { id: 'asc' } }),
    prisma.projectVersion.findMany({ where: { projectId }, orderBy: { operatedAt: 'desc' } }),
    prisma.projectCompliance.findUnique({ where: { projectId } }),
  ])
  const dataLevel = compliance?.dataLevel ?? 'L1'
  const ddlNodes = schedule
    ? (schedule.milestones as Array<{ nodeId: string; name: string; date: string; daysLeft: number; status: string }>)
    : []

  return {
    projectId: p.id,
    title: p.title,
    metaText: `${p.discipline} · ${p.route === 'dataDriven' ? '数据驱动' : '理论驱动'}`,
    discipline: p.discipline,
    routeText: p.route === 'dataDriven' ? '数据驱动（默认统计方法与文献源已按学科预设）' : '理论驱动（先确定理论与变量，再设计测量）',
    ddlNodes,
    members: members.map((m) => ({ memberId: m.id, name: m.name, avatarText: m.avatarText, role: m.role, roleLabel: m.roleLabel, permissionLabel: m.permissionLabel })),
    versions: versions.map((v) => ({ versionNo: v.versionNo, operatorName: v.operatorName, operatedAt: v.operatedAt.toISOString(), description: v.description, rollbackable: v.rollbackable })),
    versionPolicyText: '保留最近 1 个月版本',
    dataLevel,
    skipConfirm: dataLevel === 'L2' ? false : compliance?.skipConfirm ?? false,
    dataLevelOptions: DATA_LEVEL_OPTIONS_META.map((o) => {
      const card = DATA_LEVEL_CARDS.find((c) => c.level === o.level)!
      return { level: o.level, name: card.name, description: card.description, rules: card.rules, current: o.level === dataLevel }
    }),
    dataLevelChangeImpact: '切换到 L2 会强制关闭「跳过逐条确认」，并阻断原始数据行导出。',
  }
}

export async function updateProject(
  userId: string,
  projectId: string,
  patch: { title?: string; discipline?: string; route?: string; ddlNodes?: { nodeId: string; date: string }[] },
) {
  const p = await requireProject(projectId)
  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.discipline !== undefined ? { discipline: patch.discipline } : {}),
      ...(patch.route !== undefined ? { route: patch.route } : {}),
    },
  })

  // 更新 DDL 节点日期：同步日程 milestones 并重算派生字段
  if (patch.ddlNodes?.length) {
    const schedule = await prisma.projectSchedule.findUnique({ where: { projectId } })
    if (schedule) {
      const milestones = (schedule.milestones as Array<{ nodeId: string; name: string; date: string; daysLeft: number; status: string }>).map((m) => {
        const patchNode = patch.ddlNodes!.find((n) => n.nodeId === m.nodeId)
        return patchNode ? { ...m, date: patchNode.date } : m
      })
      await prisma.projectSchedule.update({ where: { projectId }, data: { milestones: milestones as never } })
      await recomputeProjectDerived(projectId)
    }
  }

  await prisma.projectVersion.create({
    data: { projectId, versionNo: `v${Date.now().toString().slice(-4)}`, operatorName: await operatorName(userId), description: '更新项目设置' },
  })

  return { savedAt: stamp() }
}

/**
 * 删除项目。
 * 关联的 17 张表（成员/文献/分析/文稿/导出状态等）在 Schema 里均为 onDelete: Cascade，
 * 因此 `project.delete()` 会一次性级联清除；数据库中不存在孤立的子记录。
 * 另外导出包是磁盘文件（不在库里），需要单独清理。
 */
export async function deleteProject(userId: string, projectId: string) {
  const p = await requireProject(projectId)
  if (p.ownerId && p.ownerId !== userId) throw Errors.forbiddenRole('只有项目负责人可以删除项目')

  await deleteProjectExportFiles(projectId)
  await prisma.project.delete({ where: { id: projectId } })

  return { projectId, deleted: true, deletedAt: stamp() }
}

export async function inviteMember(projectId: string, account: string, role: string) {
  await requireProject(projectId)
  const roleLabel = role === 'advisor' ? '导师' : role === 'collaborator' ? '合作者' : '受邀成员'
  const member = await prisma.projectMember.create({
    data: {
      projectId,
      name: account.split('@')[0] || '受邀成员',
      avatarText: (account.trim()[0] || '邀').toUpperCase(),
      role: ['advisor', 'collaborator', 'guest'].includes(role) ? role : 'collaborator',
      roleLabel,
      permissionLabel: role === 'advisor' ? '可查看 / 可批注' : '可编辑 / 可批注',
    },
  })
  return { inviteId: member.id }
}

export async function rollbackProjectVersion(userId: string, projectId: string, versionNo: string) {
  await requireProject(projectId)
  const target = await prisma.projectVersion.findFirst({ where: { projectId, versionNo } })
  if (!target) throw Errors.notFound('版本不存在')
  const newVersion = await prisma.projectVersion.create({
    data: {
      projectId,
      versionNo: `v${Date.now().toString().slice(-4)}`,
      operatorName: await operatorName(userId),
      description: `回滚至 ${versionNo}`,
      rollbackable: false,
    },
  })
  return { versionNo: newVersion.versionNo, rollbackAt: new Date().toISOString() }
}

async function operatorName(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } })
  return u?.nickname ?? '我'
}

/** ---------- 流程进度 / 草稿 ---------- */

export async function getProgress(projectId: string) {
  await requireProject(projectId)
  const rec = await prisma.projectProgress.findUnique({ where: { projectId } })
  if (!rec) throw Errors.notFound('流程进度不存在')
  return {
    projectId,
    steps: rec.steps as never,
    lastStepKey: rec.lastStepKey ?? undefined,
    resumeRoute: rec.resumeRoute,
    resumeLabel: rec.resumeLabel,
    hasUnfinished: rec.hasUnfinished,
  }
}

export async function saveProjectProgress(payload: { projectId: string; stepKey: string; status: 'notStarted' | 'inProgress' | 'done' }) {
  await requireProject(payload.projectId)
  const rec = await prisma.projectProgress.findUnique({ where: { projectId: payload.projectId } })
  if (!rec) throw Errors.notFound('流程进度不存在')
  const steps = (rec.steps as Array<{ stepKey: string; stepLabel: string; status: string; route: string; updatedAt: string }>).map((s) =>
    s.stepKey === payload.stepKey ? { ...s, status: payload.status, updatedAt: nowIso() } : s,
  )
  const stopped = steps.find((s) => s.status !== 'done')
  await prisma.projectProgress.update({
    where: { projectId: payload.projectId },
    data: {
      steps: steps as never,
      lastStepKey: stopped?.stepKey ?? null,
      resumeRoute: stopped ? `/project/${payload.projectId}/${stopped.route.replace(/^\//, '')}` : `/project/${payload.projectId}`,
      resumeLabel: stopped ? `继续上次：${stopped.stepLabel}` : '已完成全部步骤',
      hasUnfinished: !!stopped,
    },
  })
  return getProgress(payload.projectId)
}

export async function getStepDraft(projectId: string, stepKey: string) {
  const draft = await prisma.stepDraft.findUnique({ where: { projectId_stepKey: { projectId, stepKey } } })
  return (draft?.draft as Record<string, unknown>) ?? {}
}

export async function saveStepDraft(projectId: string, stepKey: string, patch: Record<string, unknown>) {
  const existing = await prisma.stepDraft.findUnique({ where: { projectId_stepKey: { projectId, stepKey } } })
  const merged = { ...(existing?.draft as Record<string, unknown>), ...patch }
  await prisma.stepDraft.upsert({
    where: { projectId_stepKey: { projectId, stepKey } },
    update: { draft: merged as never },
    create: { projectId, stepKey, draft: merged as never },
  })
  return merged
}

/** 重算项目的派生展示字段（阶段/进度/最近 DDL） */
export async function recomputeProjectDerived(projectId: string) {
  const schedule = await prisma.projectSchedule.findUnique({ where: { projectId } })
  if (!schedule) return
  const today = todayIso()
  const milestones = (schedule.milestones as Array<{ nodeId: string; name: string; date: string; daysLeft: number; status: string }>).map((m) => {
    const daysLeft = Math.round((new Date(m.date).getTime() - new Date(today).getTime()) / 86400000)
    return { ...m, daysLeft, status: daysLeft < 0 ? 'done' : daysLeft <= 7 ? 'current' : 'upcoming' }
  })
  await prisma.projectSchedule.update({ where: { projectId }, data: { milestones: milestones as never, today } })
}
