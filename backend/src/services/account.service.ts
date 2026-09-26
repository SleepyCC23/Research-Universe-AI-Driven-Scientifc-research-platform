import { prisma } from '../prisma'
import { Errors } from '../core/errors'
import { signToken } from '../core/auth'
import {
  NOTIFICATION_PREF_TEMPLATE,
  PLANS,
  QUOTA_ITEMS,
  MAJOR_OPTIONS,
  GRADE_OPTIONS,
} from '../content/catalogs'
import { genId, maskPhone, serializeUser, stamp, type UserRow } from './common'

/** 各套餐额度上限 */
const PLAN_LIMITS: Record<string, { review: number; verify: number; sandbox: number; export: number }> = {
  student: { review: 20, verify: 500, sandbox: 300, export: 20 },
  pro: { review: 80, verify: 2000, sandbox: 1500, export: 999999 },
  team: { review: 999999, verify: 999999, sandbox: 5000, export: 999999 },
}

function resetAt(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0)
}

function resetAtText(): string {
  const d = resetAt()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01 00:00`
}

/** ---------- 认证 ---------- */

/**
 * 演示账号：只有它保留「陈同学」这份示例资料。
 * 其余账号一律按账号本身推导昵称 —— 此前所有新账号都被写成「陈同学」，
 * 于是用户退出登录 / 换号登录后会发现「系统里还是陈同学」，属于典型的默认值污染。
 */
const DEMO_PHONE = '13800000000'

/**
 * 账号规则：**仅允许 11 位手机号或合法邮箱**（与前端 `api.validateAccount` 完全一致）。
 * 前端已拦一道，这里是服务端的兜底校验 —— 接口可能被直接调用，不能只靠前端。
 */
function assertAccount(account: string): void {
  const v = account.trim()
  if (!v) throw Errors.param('请先填写手机号或邮箱')
  if (/^\d+$/.test(v)) {
    if (v.length !== 11) throw Errors.param(`手机号应为 11 位数字（当前 ${v.length} 位）`)
    if (!/^1[3-9]\d{9}$/.test(v)) throw Errors.param('请输入以 1 开头的 11 位手机号')
    return
  }
  if (v.includes('@')) {
    if (!/^[\w.!#$%&'*+/=?^`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(v)) {
      throw Errors.param('请输入有效的邮箱地址')
    }
    if (v.length > 64) throw Errors.param('邮箱长度不能超过 64 个字符')
    return
  }
  throw Errors.param('请输入 11 位手机号或邮箱')
}

/** 新用户昵称 / 头像按账号推导（邮箱取 @ 前缀，手机号取后 4 位），不再冒用示例身份 */
function deriveProfile(account: string): { nickname: string; avatarText: string } {
  const v = account.trim()
  if (v.includes('@')) {
    const local = v.split('@')[0] || 'researcher'
    return { nickname: local.slice(0, 24), avatarText: (local[0] ?? 'R').toUpperCase() }
  }
  const tail = v.slice(-4)
  return { nickname: `用户${tail}`, avatarText: '用' }
}

export async function sendSmsCode(account: string) {
  assertAccount(account)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  await prisma.verificationCode.create({
    data: { contact: account.trim(), code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  })
  return {
    cooldownSeconds: 52,
    // 开发态直接回传验证码，便于联调；生产置 SMS_DEV_RETURN_CODE=false
    ...(process.env.SMS_DEV_RETURN_CODE !== 'false' ? { code, devNote: '开发态直接返回验证码' } : {}),
  }
}

/**
 * 登录 / 注册。
 *
 * `intent` 决定「账号不存在」时的行为：
 * - `login`（默认）：直接报错，**不建号** —— 否则用户随手输个号码就会莫名其妙变成示例账号；
 * - `register`：创建新用户（昵称按账号推导），并返回 `isNewUser: true`。
 */
export async function login(account: string, code: string, intent: 'login' | 'register' = 'login') {
  const normalized = account.trim()
  assertAccount(normalized)
  if (!/^\d{6}$/.test(code)) throw Errors.param('验证码为 6 位数字')

  // 校验验证码：接受最近一条未过期记录；开发态放行任意 6 位以满足演示
  const record = await prisma.verificationCode.findFirst({
    where: { contact: normalized, code, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (record) {
    await prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } })
  } else if (process.env.SMS_DEV_RETURN_CODE === 'false') {
    throw Errors.param('验证码错误或已过期')
  }

  const isEmail = normalized.includes('@')
  const isDemo = normalized === DEMO_PHONE
  let user = await prisma.user.findFirst({ where: isEmail ? { eduEmail: normalized } : { phone: normalized } })
  let isNewUser = false

  if (!user) {
    if (intent !== 'register') {
      throw Errors.param('该账号尚未注册，请先注册后再登录')
    }
    const profile = isDemo
      ? { nickname: '陈同学', avatarText: '陈' }
      : deriveProfile(normalized)
    user = await prisma.user.create({
      data: {
        nickname: profile.nickname,
        avatarText: profile.avatarText,
        // 真实注册用户不预置学科 / 年级（schema 默认值对科研场景是「假资料」），留待本人补全
        major: isDemo ? '心理学' : '待完善',
        grade: isDemo ? '研二' : '待完善',
        // 演示账号配一个教育邮箱用于走通「学生认证」；真实注册用户不伪造任何认证信息
        ...(isEmail ? { eduEmail: normalized } : { phone: normalized, ...(isDemo ? { eduEmail: 'chen@stu.example.edu.cn' } : {}) }),
      },
    })
    isNewUser = true
    await seedUserGraph(user.id, isDemo)
  }

  const verification = await getVerification(user.id)
  return {
    auth: { loggedIn: true, token: signToken(user.id), user: serializeUser(user) },
    verification,
    isNewUser,
  }
}

/**
 * 为新用户补齐额度 / 认证 / 通知偏好 / 设备 / 通知 / Zotero。
 * @param isDemo 演示账号才预置「已通过学生认证」的示例状态；真实新用户默认未认证
 */
async function seedUserGraph(userId: string, isDemo = false) {
  const limits = PLAN_LIMITS.student
  await prisma.quota.create({
    data: {
      userId,
      planId: 'student',
      resetAt: resetAt(),
      reviewGenerateUsed: 3,
      reviewGenerateLimit: limits.review,
      verifyUsed: 12,
      verifyLimit: limits.verify,
      sandboxMinutesUsed: 18,
      sandboxMinutesLimit: limits.sandbox,
      exportUsed: 1,
      exportLimit: limits.export,
    },
  })
  await prisma.studentVerification.create({
    data: {
      userId,
      verified: isDemo,
      channel: isDemo ? 'eduEmail' : 'none',
      eduEmail: isDemo ? 'chen@stu.example.edu.cn' : null,
      verifiedAt: isDemo ? new Date('2026-09-01') : null,
      benefitsSynced: isDemo,
      graceDays: 90,
    },
  })
  await prisma.notificationPref.createMany({
    data: NOTIFICATION_PREF_TEMPLATE.map((p) => ({ userId, ...p })),
  })
  await prisma.loginDevice.create({
    data: {
      userId,
      deviceId: genId('dev'),
      deviceName: 'Chrome · Windows',
      locationText: '116.25.***.12 · 深圳',
      current: true,
    },
  })
  await prisma.loginDevice.create({
    data: {
      userId,
      deviceId: genId('dev'),
      deviceName: 'Safari · iPhone',
      locationText: '116.25.***.40 · 广州',
      current: false,
    },
  })
  await prisma.notification.createMany({
    data: [
      { userId, title: '2 条文献核验条目待确认', description: '去导出中心处理 · 10 分钟前', route: '/project/p_2001/export', read: false },
      { userId, title: '沙箱分析已完成', description: '分层回归运行完成 · 1 小时前', route: '/project/p_2001/analysis', read: false },
      { userId, title: '中期检查将于 12 天后到期', description: '项目：社交焦虑与手机依赖 · 昨天', route: '/project/p_2001/settings', read: true },
    ],
  })
  await prisma.zoteroBinding.create({
    data: {
      userId,
      bound: false,
      account: '',
      bidirectionalSync: false,
      rateLimitText: '写入 ≤ 50 条/请求；遇 Retry-After 自动退避并提示重新授权',
      fallbackText: '免授权兜底：导入 / 导出 .bib（Better BibTeX）',
    },
  })
}

/** ---------- 用户 / 账号 ---------- */

async function getQuotaRow(userId: string) {
  let q = await prisma.quota.findUnique({ where: { userId } })
  if (!q) {
    await seedUserGraph(userId)
    q = await prisma.quota.findUnique({ where: { userId } })
  }
  return q!
}

export function serializeQuota(q: {
  planId: string
  reviewGenerateUsed: number
  reviewGenerateLimit: number
  verifyUsed: number
  verifyLimit: number
  sandboxMinutesUsed: number
  sandboxMinutesLimit: number
  exportUsed: number
  exportLimit: number
  overagePolicy: string
}) {
  return {
    planId: q.planId,
    resetAt: resetAtText(),
    reviewGenerateUsed: q.reviewGenerateUsed,
    reviewGenerateLimit: q.reviewGenerateLimit,
    verifyUsed: q.verifyUsed,
    verifyLimit: q.verifyLimit,
    sandboxMinutesUsed: q.sandboxMinutesUsed,
    sandboxMinutesLimit: q.sandboxMinutesLimit,
    exportUsed: q.exportUsed,
    exportLimit: q.exportLimit,
    overagePolicy: q.overagePolicy,
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw Errors.unauthorized()
  return serializeUser(user)
}

export async function getVerification(userId: string) {
  const v = await prisma.studentVerification.findUnique({ where: { userId } })
  return {
    verified: v?.verified ?? false,
    channel: (v?.channel ?? 'none') as 'eduEmail' | 'chsi' | 'none',
    eduEmail: v?.eduEmail ?? undefined,
    verifiedAt: v?.verifiedAt ? v.verifiedAt.toISOString().slice(0, 10) : undefined,
    benefitsSynced: v?.benefitsSynced ?? false,
    graceDays: v?.graceDays ?? 90,
  }
}

export async function submitVerification(userId: string, payload: { channel: 'eduEmail' | 'chsi'; eduEmail?: string; reportFileId?: string }) {
  if (payload.channel === 'eduEmail') {
    if (!payload.eduEmail || !/\.edu(\.cn)?$/.test(payload.eduEmail)) {
      throw Errors.param('邮箱不符合教育邮箱规则（需以 .edu 或 .edu.cn 结尾）')
    }
  }
  await prisma.studentVerification.upsert({
    where: { userId },
    update: {
      verified: true,
      channel: payload.channel,
      eduEmail: payload.eduEmail ?? undefined,
      verifiedAt: new Date(),
      benefitsSynced: true,
    },
    create: {
      userId,
      verified: true,
      channel: payload.channel,
      eduEmail: payload.eduEmail,
      verifiedAt: new Date(),
      benefitsSynced: true,
      graceDays: 90,
    },
  })
  return getVerification(userId)
}

export async function getAccountSettings(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { devices: true, prefItems: true } })
  if (!user) throw Errors.unauthorized()
  const verification = await getVerification(userId)
  const quota = await getQuotaRow(userId)

  const notifications = user.prefItems.length
    ? user.prefItems.map((p) => ({ key: p.key, label: p.label, description: p.description, enabled: p.enabled, mandatory: p.mandatory }))
    : await (async () => {
        await prisma.notificationPref.createMany({ data: NOTIFICATION_PREF_TEMPLATE.map((p) => ({ userId, ...p })) })
        return NOTIFICATION_PREF_TEMPLATE.map((p) => ({ key: p.key, label: p.label, description: p.description, enabled: p.enabled, mandatory: p.mandatory }))
      })()

  return {
    userId: user.id,
    nickname: user.nickname,
    avatarText: user.avatarText,
    /** 自定义头像（data URL）；null 表示使用文字头像（键必须存在，否则前端分不清「未改」与「已移除」） */
    avatarUrl: user.avatarUrl ?? null,
    major: user.major,
    grade: user.grade,
    phoneMasked: maskPhone(user.phone),
    eduEmail: user.eduEmail ?? undefined,
    hasContact: !!(user.phone || user.eduEmail),
    registeredAt: user.registeredAt.toISOString().slice(0, 10),
    verification,
    planId: user.planId,
    quota: serializeQuota(quota),
    devices: user.devices.map((d) => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      locationText: d.locationText,
      lastActiveAt: d.lastActiveAt.toISOString(),
      current: d.current,
    })),
    notifications,
    privacy: {
      allowTraining: user.allowTraining,
      keepHistoryDays: user.keepHistoryDays,
      exportRequestedAt: user.exportRequestedAt ? user.exportRequestedAt.toISOString() : undefined,
    },
    majorOptions: MAJOR_OPTIONS,
    gradeOptions: GRADE_OPTIONS,
  }
}

/** 头像 data URL 上限（字符数）：前端已压到 256×256，这里再兜一层，避免超大 payload 入库 */
const AVATAR_MAX_CHARS = 500_000

export async function updateMe(
  userId: string,
  patch: { nickname?: string; major?: string; grade?: string; avatarUrl?: string | null },
) {
  if (patch.nickname !== undefined && (patch.nickname.trim().length === 0 || patch.nickname.length > 24)) {
    throw Errors.param('昵称需在 1–24 个字符之间')
  }
  // 自定义头像：只接受图片 data URL；传 null / 空串表示「恢复文字头像」
  let avatarPatch: { avatarUrl: string | null } | Record<string, never> = {}
  if (patch.avatarUrl !== undefined) {
    const v = patch.avatarUrl
    if (v === null || v === '') {
      avatarPatch = { avatarUrl: null }
    } else if (typeof v !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) {
      throw Errors.param('头像格式不支持，请上传 PNG / JPG / WebP 图片')
    } else if (v.length > AVATAR_MAX_CHARS) {
      throw Errors.param('头像文件过大，请换一张更小的图片（会自动压缩到 256×256）')
    } else {
      avatarPatch = { avatarUrl: v }
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(patch.nickname !== undefined ? { nickname: patch.nickname, avatarText: patch.nickname.slice(0, 1) } : {}),
      ...(patch.major !== undefined ? { major: patch.major } : {}),
      ...(patch.grade !== undefined ? { grade: patch.grade } : {}),
      ...avatarPatch,
    },
  })
  return { user: serializeUser(user), savedAt: stamp() }
}

export async function revokeOtherDevices(userId: string) {
  const others = await prisma.loginDevice.findMany({ where: { userId, current: false } })
  await prisma.loginDevice.deleteMany({ where: { userId, current: false } })
  return { success: true, revokedCount: others.length }
}

export async function updateNotification(userId: string, key: string, enabled: boolean) {
  const pref = await prisma.notificationPref.findFirst({ where: { userId, key } })
  if (!pref) throw Errors.notFound('通知偏好项不存在')
  if (pref.mandatory && !enabled) throw Errors.forbiddenRole('该通知为合规必开项，无法关闭')
  await prisma.notificationPref.update({ where: { id: pref.id }, data: { enabled } })
  const list = await prisma.notificationPref.findMany({ where: { userId } })
  return {
    notifications: list.map((p) => ({ key: p.key, label: p.label, description: p.description, enabled: p.enabled, mandatory: p.mandatory })),
  }
}

export async function updatePrivacy(userId: string, patch: { allowTraining?: boolean; keepHistoryDays?: number }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(patch.allowTraining !== undefined ? { allowTraining: patch.allowTraining } : {}),
      ...(patch.keepHistoryDays !== undefined ? { keepHistoryDays: patch.keepHistoryDays } : {}),
    },
  })
  return {
    allowTraining: user.allowTraining,
    keepHistoryDays: user.keepHistoryDays,
    exportRequestedAt: user.exportRequestedAt ? user.exportRequestedAt.toISOString() : undefined,
  }
}

export async function requestDataExport(userId: string) {
  const at = new Date()
  await prisma.user.update({ where: { id: userId }, data: { exportRequestedAt: at } })
  return { requestedAt: at.toISOString(), etaText: '预计 10 分钟内生成下载链接，并发送到你的教育邮箱' }
}

export async function deleteAccount(userId: string, confirmText: string) {
  if (confirmText !== '注销账号') throw Errors.param('确认词不匹配，请输入「注销账号」')
  await prisma.user.delete({ where: { id: userId } })
  return { success: true }
}

export async function getNotifications(userId: string) {
  const list = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return {
    list: list.map((n) => ({ notificationId: n.id, title: n.title, description: n.description, route: n.route ?? undefined, read: n.read })),
    unreadCount: list.filter((n) => !n.read).length,
  }
}

export async function markNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
  return getNotifications(userId)
}

/** ---------- 套餐 / 额度 ---------- */

export function getPlans() {
  return { plans: PLANS, quotaItems: QUOTA_ITEMS }
}

export async function getQuota(userId: string) {
  const q = await getQuotaRow(userId)
  return serializeQuota(q)
}

export async function changePlan(userId: string, planId: string) {
  if (!['student', 'pro', 'team'].includes(planId)) throw Errors.param('套餐 id 非法')
  if (planId === 'team') throw Errors.quota('团队版需联系销售开通，不支持在线切换')
  const limits = PLAN_LIMITS[planId]
  await prisma.quota.update({
    where: { userId },
    data: {
      planId,
      reviewGenerateLimit: limits.review,
      verifyLimit: limits.verify,
      sandboxMinutesLimit: limits.sandbox,
      exportLimit: limits.export,
    },
  })
  await prisma.user.update({ where: { id: userId }, data: { planId } })
  return getQuota(userId)
}
