import type { Request } from 'express'
import { prisma } from '../prisma'
import { Errors } from '../core/errors'

/**
 * 解析 projectId：
 * 优先路径参数 → 请求体 projectId → 请求头 X-Project-Id → query。
 * 说明：前端部分真实接口路径被「拍平」了（丢了 :projectId），客户端会自动带上 X-Project-Id 头，
 * 因此这里做兼容解析，保证同一套业务逻辑既能走规范路径也能走扁平路径。
 */
export function resolveProjectId(req: Request): string {
  const fromParams = (req.params as Record<string, string> | undefined)?.projectId
  const fromBody = (req.body as Record<string, unknown> | undefined)?.projectId as string | undefined
  const fromHeader = req.header('X-Project-Id') || undefined
  const fromQuery = (req.query?.projectId as string) || undefined
  const pid = fromParams || fromBody || fromHeader || fromQuery
  if (!pid) throw Errors.param('缺少 projectId：请在路径、请求体或 X-Project-Id 头中提供')
  return pid
}

export async function requireProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw Errors.notFound('项目不存在')
  return project
}

export interface UserRow {
  id: string
  nickname: string
  avatarText: string
  /** 自定义头像 data URL；为空时前端回落到 avatarText 文字头像 */
  avatarUrl?: string | null
  major: string
  grade: string
  phone: string | null
  eduEmail: string | null
}

/** 序列化为前端 UserInfo */
export function serializeUser(u: UserRow) {
  return {
    userId: u.id,
    nickname: u.nickname,
    avatarText: u.avatarText || u.nickname.slice(0, 1),
    // 显式返回 null 而不是 undefined：JSON.stringify 会丢弃值为 undefined 的键，
    // 前端便无法区分「本次没动头像」与「头像已被移除」，会导致「移除头像」点了没反应。
    avatarUrl: u.avatarUrl ?? null,
    major: u.major,
    grade: u.grade,
    eduEmail: u.eduEmail ?? undefined,
    hasContact: !!(u.phone || u.eduEmail),
  }
}

export function maskPhone(phone: string | null): string {
  if (!phone) return ''
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export function maskIp(ip = '116.25.34.12', city = '深圳'): string {
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.${parts[3]} · ${city}`
  return `${ip} · ${city}`
}

/** 序列化项目实体为前端 Project */
export function serializeProject(p: {
  id: string
  title: string
  discipline: string
  route: string
  stage: string
  stageLabel: string
  progress: number
  currentPhaseName: string
  currentPhaseRange: string
  lastEditedText: string
  mainDdlName: string
  mainDdlDaysLeft: number
  footnote: string
  todoCount: number
  verifiedCount: number
  createdAt: Date
  dataLevel: string
}) {
  return {
    projectId: p.id,
    title: p.title,
    discipline: p.discipline,
    route: p.route,
    stageLabel: p.stageLabel,
    stage: p.stage,
    progress: p.progress,
    currentPhaseName: p.currentPhaseName,
    currentPhaseRange: p.currentPhaseRange,
    lastEditedText: p.lastEditedText,
    mainDdlName: p.mainDdlName,
    mainDdlDaysLeft: p.mainDdlDaysLeft,
    footnote: p.footnote,
    todoCount: p.todoCount,
    verifiedCount: p.verifiedCount,
    createdAt: p.createdAt.toISOString().slice(0, 10),
    dataLevel: p.dataLevel,
  }
}

/** 数字 id：p_ / t_ / f_ 等 */
export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export const nowIso = () => new Date().toISOString()
/** 'YYYY-MM-DD HH:mm' 本地时间 */
export function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
