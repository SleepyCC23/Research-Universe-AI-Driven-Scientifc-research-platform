/**
 * P13 账号设置（全局页面，路由 /account）
 * 入口：顶部导航右侧的头像（点击头像进入本页）；全局侧边栏也提供「账号设置」入口。
 *
 * 页面分区：
 *  左栏：基本信息 / 账号与安全 / 学生认证
 *  右栏：套餐与额度 / 通知偏好 / 数据与隐私
 *
 * 风险约定（对齐项目既定规则）：不可逆或影响全局的操作必须二次确认，并在弹窗文案里写明留痕位置。
 *   - 退出其他设备 → 二次确认（说明：仅保留当前设备登录）
 *   - 修改密码 → 二次确认（说明：其他设备会被登出）
 *   - 允许数据进入训练集 → 二次确认（默认关闭，开启后留痕并写入披露报告）
 *   - 注销账号 → 输入确认词「注销账号」后才可提交
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  ErrorState,
  InfoBanner,
  KeyValue,
  Modal,
  PageSkeleton,
  ProgressBar,
  Tag,
  Toggle,
} from '@/components/ui'
import {
  IconAlert,
  IconBell,
  IconCalendar,
  IconCredit,
  IconDatabase,
  IconLogout,
  IconLock,
  IconMonitor,
  IconRefresh,
  IconShield,
  IconUpload,
  IconUser,
} from '@/components/icons'
import { MAX_INPUT_MB, fileToAvatarDataUrl } from '@/utils/image'
import { useAuthStore, useUiStore } from '@/store'
import type { AccountSettings, NotificationPref } from '@/types'

export default function AccountSettingsPage() {
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const { setUser, setVerification, reset } = useAuthStore()

  const [data, setData] = useState<AccountSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** 基本资料表单 */
  const [nickname, setNickname] = useState('')
  const [major, setMajor] = useState('')
  const [grade, setGrade] = useState('')
  const [saving, setSaving] = useState(false)

  /** 通知偏好与隐私（本地乐观更新） */
  const [notifications, setNotifications] = useState<NotificationPref[]>([])
  const [allowTraining, setAllowTraining] = useState(false)

  /** 注销账号弹窗 */
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  /** 学生认证（教育邮箱）—— 从「登录 / 注册」页迁移过来，认证统一在账号设置里提交 */
  const [eduEmail, setEduEmail] = useState('')
  const [verifyingStudent, setVerifyingStudent] = useState(false)

  /** 头像上传 / 移除进行中 */
  const [avatarSaving, setAvatarSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchAccountSettings()
      setData(d)
      setNickname(d.nickname)
      setMajor(d.major)
      setGrade(d.grade)
      setNotifications(d.notifications)
      setAllowTraining(d.privacy.allowTraining)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** 表单是否有未保存改动 */
  const dirty = !!data && (nickname !== data.nickname || major !== data.major || grade !== data.grade)

  /** 保存基本资料：成功后同步全局用户信息（顶栏昵称 / 头像立即变化） */
  async function handleSave() {
    if (!data) return
    if (!nickname.trim()) {
      pushToast({ tone: 'warn', title: '昵称不能为空' })
      return
    }
    setSaving(true)
    try {
      const res = await api.updateMe({ nickname: nickname.trim(), major, grade })
      setUser(res.user)
      setData({ ...data, ...res.user, major, grade })
      pushToast({ tone: 'ok', title: '已保存修改', description: `更新于 ${res.savedAt}` })
    } finally {
      setSaving(false)
    }
  }

  /** 退出其他设备：不可逆，二次确认 */
  function handleRevokeDevices() {
    const count = (data?.devices ?? []).filter((d) => !d.current).length
    useUiStore.getState().openConfirm({
      tone: 'warn',
      title: '确认操作',
      description: `将退出 ${count} 台其他设备，仅保留当前设备登录。被退出的设备需要重新登录，操作结果写入账号日志。`,
      confirmText: '确认退出',
      onConfirm: async () => {
        const res = await api.revokeOtherDevices()
        setData((d) => (d ? { ...d, devices: d.devices.filter((x) => x.current) } : d))
        pushToast({ tone: 'ok', title: `已退出 ${res.revokedCount} 台设备`, description: '仅保留当前设备登录' })
      },
    })
  }

  /** 修改密码：二次确认，并说明会登出其他设备 */
  function handleChangePassword() {
    useUiStore.getState().openConfirm({
      tone: 'warn',
      title: '确认操作',
      description: '修改密码后，其他设备上的登录会全部失效，需要重新登录。修改记录写入账号日志。',
      confirmText: '去修改密码',
      onConfirm: () =>
        pushToast({ tone: 'info', title: '修改密码', description: '将向教育邮箱发送验证链接，链接 30 分钟内有效' }),
    })
  }

  /** 重新认证：二次确认 */
  function handleReverify() {
    useUiStore.getState().openConfirm({
      tone: 'info',
      title: '重新认证',
      description: '将跳转到学生认证流程，需重新提供教育邮箱或学信网验证报告。已同步的权益在认证有效期内不受影响。',
      confirmText: '开始认证',
      onConfirm: async () => {
        const res = await api.submitStudentVerification({ channel: 'eduEmail', eduEmail: data?.eduEmail })
        setVerification(res)
        setData((d) => (d ? { ...d, verification: res } : d))
        pushToast({ tone: 'ok', title: '学生认证已更新', description: res.verifiedAt ?? '' })
      },
    })
  }

  /**
   * 通知偏好开关。
   * 合规必开项（如「核验失败提醒」）在界面上**不再渲染开关**，这里再兜一层，
   * 防止未来有人把它接回 Toggle 后出现「点了能关」与后端 40301 打架的情况。
   */
  /**
   * 学生认证（教育邮箱渠道）。
   * 由登录页迁移至此：认证是账号级操作，放在账号设置里更合理，也避免在尚未登录的
   * 登录页上让用户提交认证（原实现那一步拿不到有效凭证）。
   */
  async function handleVerifyStudent() {
    const mail = eduEmail.trim()
    if (!/\.edu(\.cn)?$/.test(mail)) {
      pushToast({ tone: 'warn', title: '请输入教育邮箱', description: '需以 .edu 或 .edu.cn 结尾' })
      return
    }
    setVerifyingStudent(true)
    try {
      const v = await api.submitStudentVerification({ channel: 'eduEmail', eduEmail: mail })
      setVerification(v)
      setData((d) => (d ? { ...d, verification: v } : d))
      pushToast({ tone: 'ok', title: '学生身份已核验', description: '权益已同步至定价与额度系统' })
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: '认证失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    } finally {
      setVerifyingStudent(false)
    }
  }

  async function handleToggleNotification(item: NotificationPref, next: boolean) {
    if (item.mandatory) {
      pushToast({ tone: 'info', title: `「${item.label}」为合规必开项，不可关闭` })
      return
    }
    setNotifications((list) => list.map((n) => (n.key === item.key ? { ...n, enabled: next } : n)))
    try {
      const res = await api.updateNotificationPrefs({ key: item.key, enabled: next })
      setNotifications(res.notifications)
      pushToast({ tone: 'ok', title: `已${next ? '开启' : '关闭'}「${item.label}」` })
    } catch {
      setNotifications((list) => list.map((n) => (n.key === item.key ? { ...n, enabled: !next } : n)))
      pushToast({ tone: 'danger', title: '通知偏好保存失败', description: '已恢复为上一次的设置' })
    }
  }

  /** 允许数据进入训练集：默认关闭，开启需二次确认（涉及合规留痕） */
  function handleTrainingToggle(next: boolean) {
    if (!next) {
      void applyTraining(false)
      return
    }
    useUiStore.getState().openConfirm({
      tone: 'warn',
      title: '确认操作',
      description:
        '开启后，你账号下的项目数据可能被用于改进模型。该选择将写入《AI 工具使用情况说明》并留痕，可随时关闭；关闭后新数据立即停止计入，历史批次不可撤回。',
      confirmText: '确认开启',
      onConfirm: () => applyTraining(true),
    })
  }

  async function applyTraining(next: boolean) {
    setAllowTraining(next)
    const res = await api.updatePrivacy({ allowTraining: next })
    pushToast({
      tone: next ? 'warn' : 'ok',
      title: next ? '已开启数据用于模型改进' : '已关闭数据用于模型改进',
      description: `当前状态：${res.allowTraining ? '允许' : '不允许'}`,
    })
  }

  /** 申请导出我的数据 */
  async function handleExportData() {
    const res = await api.requestDataExport()
    setData((d) => (d ? { ...d, privacy: { ...d.privacy, exportRequestedAt: res.requestedAt } } : d))
    pushToast({ tone: 'ok', title: '已提交导出申请', description: res.etaText })
  }

  /** 注销账号：必须输入确认词 */
  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await api.deleteAccount({ confirmText: deleteConfirmText })
      reset()
      setDeleteOpen(false)
      pushToast({ tone: 'danger', title: '账号已注销', description: '本地登录状态已清除，项目数据进入 30 天保留期' })
      navigate('/login')
    } finally {
      setDeleting(false)
    }
  }

  /**
   * 上传自定义头像：本地居中裁剪 + 压缩到 256×256 后**立即保存**（不等「保存修改」，
   * 否则用户传完看不到顶栏变化，会以为没生效）。成功后同步全局用户，顶栏 / 侧边栏立刻更新。
   */
  async function handleAvatarChange(file: File) {
    setAvatarSaving(true)
    try {
      const { dataUrl, sizeKb } = await fileToAvatarDataUrl(file)
      const res = await api.updateMe({ avatarUrl: dataUrl })
      setUser(res.user)
      // 显式写入接口返回值：不能只靠 `...res.user` 合并，否则服务端某次没带上该字段时
      // 页面会继续沿用旧头像，用户会以为「上传 / 更换没生效」。
      setData((d) => (d ? { ...d, ...res.user, avatarUrl: res.user.avatarUrl ?? dataUrl } : d))
      pushToast({
        tone: 'ok',
        title: '头像已更新',
        description: `已裁剪压缩为 256×256 · 约 ${sizeKb} KB`,
      })
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: '头像上传失败',
        description: e instanceof Error ? e.message : '请换一张图片试试',
      })
    } finally {
      setAvatarSaving(false)
    }
  }

  /** 移除自定义头像，恢复「昵称首字」文字头像 */
  async function handleAvatarRemove() {
    setAvatarSaving(true)
    try {
      const res = await api.updateMe({ avatarUrl: null })
      setUser(res.user)
      // 关键：清空头像必须**显式**置空。这里依赖两点：
      // 1) 后端把 avatarUrl 序列化成 null（键始终存在，JSON.stringify 不会丢掉字段）；
      // 2) 前端再兜一层 `?? null`，即使服务端某次漏传该字段也能移除成功。
      setData((d) => (d ? { ...d, ...res.user, avatarUrl: res.user.avatarUrl ?? null } : d))
      pushToast({ tone: 'ok', title: '已恢复文字头像' })
    } catch (e) {
      pushToast({
        tone: 'danger',
        title: '移除失败',
        description: e instanceof Error ? e.message : '请稍后重试',
      })
    } finally {
      setAvatarSaving(false)
    }
  }

  /** 退出登录 */
  function handleLogout() {
    useUiStore.getState().openConfirm({
      tone: 'info',
      title: '确认操作',
      description: '退出后需重新登录；退出即锁定导出、数据定级与披露报告生成等高级功能。',
      confirmText: '退出登录',
      onConfirm: async () => {
        await api.logout()
        reset()
        navigate('/login')
      },
    })
  }

  if (loading) {
    return (
      <AppLayout noSubHeader>
        <div className="pt-4">
          <PageSkeleton />
        </div>
      </AppLayout>
    )
  }
  if (error || !data) {
    return (
      <AppLayout noSubHeader>
        <div className="pt-4">
          <ErrorState description={error ?? '数据为空'} onRetry={load} />
        </div>
      </AppLayout>
    )
  }

  const planName = data.planId === 'student' ? '学生版' : data.planId === 'pro' ? '专业版' : '团队版'
  const channelText =
    data.verification.channel === 'eduEmail' ? '教育邮箱' : data.verification.channel === 'chsi' ? '学信网' : '未认证'

  return (
    <AppLayout breadcrumb={[{ key: 'account', label: '账号设置' }]}>
      <div className="pb-10">
        {/* 页头 */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-ink flex items-center gap-2">
              <span className="text-brand">
                <IconUser size={22} />
              </span>
              账号设置
            </h1>
            <p className="mt-2 text-base text-ink-2">
              管理账号资料、登录安全、学生认证与数据隐私。项目级设置请前往
              <button className="text-brand hover:underline mx-1" onClick={() => navigate('/project/p_2001/settings')}>
                项目设置
              </button>
              。
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
          {/* ================= 左栏 ================= */}
          <div className="space-y-4">
            {/* 基本信息 */}
            <Card>
              <CardHeader
                icon={<IconUser size={15} />}
                title="基本信息"
                note="昵称与头像会显示在顶部导航与协作成员列表中"
                extra={
                  <Button size="sm" onClick={handleSave} loading={saving} disabled={!dirty}>
                    {dirty ? '保存修改' : '已保存'}
                  </Button>
                }
              />
              <div className="flex items-center gap-4 flex-wrap">
                <Avatar src={data.avatarUrl} text={data.avatarText} size={56} />
                <div className="min-w-0 text-base">
                  <div className="text-ink font-medium">{data.avatarUrl ? '自定义头像' : '文字头像'}</div>
                  <div className="ru-hint mt-0.5">
                    {data.avatarUrl
                      ? '已使用你上传的图片，会在顶部导航与侧边栏同步显示'
                      : `由昵称首字自动生成（当前「${data.avatarText}」），也可以从本地上传一张图片`}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  {/* 上传头像：本地压缩到 256×256 后立即保存，不走下方「保存修改」 */}
                  <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-card border border-line-strong bg-white text-base text-ink-2 hover:border-brand hover:text-brand cursor-pointer transition">
                    <IconUpload size={14} />
                    {avatarSaving ? '处理中…' : data.avatarUrl ? '更换头像' : '上传头像'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      disabled={avatarSaving}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        // 同一个文件连续选择两次也要能触发
                        e.target.value = ''
                        if (f) void handleAvatarChange(f)
                      }}
                    />
                  </label>
                  {data.avatarUrl ? (
                    <Button variant="secondary" size="sm" loading={avatarSaving} onClick={handleAvatarRemove}>
                      移除头像
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="ru-hint mt-2">
                支持 PNG / JPG / WebP / GIF，单张不超过 {MAX_INPUT_MB}MB；上传后会自动居中裁剪并压缩到 256×256（约
                20–60KB），只用于你的账号头像。
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="昵称">
                  <input
                    className="ru-input w-full h-9"
                    value={nickname}
                    maxLength={16}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="请输入昵称"
                  />
                </Field>
                <Field label="学科">
                  <select className="ru-input w-full h-9" value={major} onChange={(e) => setMajor(e.target.value)}>
                    {data.majorOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="年级">
                  <select className="ru-input w-full h-9" value={grade} onChange={(e) => setGrade(e.target.value)}>
                    {data.gradeOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-3">
                <KeyValue label="用户 ID" value={data.userId} />
                <KeyValue label="注册时间" value={data.registeredAt} />
              </div>

              {dirty ? (
                <div className="mt-3">
                  <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
                    有未保存的修改，离开本页将丢失。
                  </InfoBanner>
                </div>
              ) : null}
            </Card>

            {/* 账号与安全 */}
            <Card>
              <CardHeader
                icon={<IconLock size={15} />}
                title="账号与安全"
                note="登录方式与设备管理，敏感操作均写入账号日志"
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base text-ink">手机号</div>
                    <div className="ru-hint">用于登录与重要提醒</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base text-ink-2 tabular-nums">{data.phoneMasked}</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => pushToast({ tone: 'info', title: '更换手机号', description: '需先通过原手机号验证' })}
                    >
                      更换
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base text-ink">教育邮箱</div>
                    <div className="ru-hint">用于学生认证与数据导出通知</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base text-ink-2">{data.eduEmail ?? '未绑定'}</span>
                    <Tag tone={data.eduEmail ? 'ok' : 'warn'} size="sm">
                      {data.eduEmail ? '已绑定' : '未绑定'}
                    </Tag>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base text-ink">登录密码</div>
                    <div className="ru-hint">建议每 90 天更换一次</div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleChangePassword}>
                    修改密码
                  </Button>
                </div>

                {/* 登录设备 */}
                <div className="pt-2 border-t border-line">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-base text-ink inline-flex items-center gap-1.5">
                      <IconMonitor size={14} className="text-ink-3" />
                      登录设备（{data.devices.length}）
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      disabled={data.devices.filter((d) => !d.current).length === 0}
                      onClick={handleRevokeDevices}
                    >
                      退出其他设备
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {data.devices.map((d) => (
                      <div key={d.deviceId} className="ru-panel px-3 py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base text-ink inline-flex items-center gap-1.5">
                            {d.deviceName}
                            {d.current ? (
                              <Tag tone="brand" size="sm">
                                当前设备
                              </Tag>
                            ) : null}
                          </div>
                          <div className="ru-hint">
                            {d.locationText} · 最近活跃 {d.lastActiveAt}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-line">
                  <Button variant="secondary" size="sm" icon={<IconLogout size={14} />} onClick={handleLogout}>
                    退出登录
                  </Button>
                </div>
              </div>
            </Card>

            {/* 学生认证（原「登录 / 注册」页的认证入口已迁移到这里，认证统一在账号设置里做） */}
            <Card>
              <CardHeader
                icon={<IconShield size={15} />}
                title="学生认证"
                note="认证决定学生版价格与额度，也是学术合规披露的一部分"
                extra={
                  data.verification.verified ? (
                    <Button variant="secondary" size="sm" icon={<IconRefresh size={14} />} onClick={handleReverify}>
                      重新认证
                    </Button>
                  ) : null
                }
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Tag tone={data.verification.verified ? 'ok' : 'warn'} size="sm">
                  {data.verification.verified ? '已核验' : '未核验'}
                </Tag>
                <Tag tone="neutral" size="sm">
                  渠道：{channelText}
                </Tag>
                <Tag tone={data.verification.benefitsSynced ? 'ok' : 'warn'} size="sm">
                  {data.verification.benefitsSynced ? '权益已同步' : '权益待同步'}
                </Tag>
              </div>

              {/* 未核验：直接给认证入口（教育邮箱 + 学信网两种渠道） */}
              {!data.verification.verified ? (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="ru-input"
                      placeholder="you@stu.example.edu.cn"
                      value={eduEmail}
                      onChange={(e) => setEduEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleVerifyStudent()
                      }}
                    />
                    <Button onClick={handleVerifyStudent} loading={verifyingStudent}>
                      认证
                    </Button>
                  </div>
                  <p className="ru-hint mt-1.5">
                    使用教育邮箱（.edu / .edu.cn）认证，可享学生价与额外额度。
                  </p>
                  <button
                    className="mt-2 text-xs text-brand hover:underline flex items-center gap-1"
                    onClick={() =>
                      pushToast({
                        tone: 'info',
                        title: '学信网在线验证报告核验',
                        description: '下载《教育部学籍在线验证报告》并上传即可',
                      })
                    }
                  >
                    <IconShield size={12} /> 没有教育邮箱？改用学信网在线验证报告核验
                  </button>
                </div>
              ) : null}

              <div className="mt-3">
                <KeyValue label="认证邮箱" value={data.verification.eduEmail ?? '—'} />
                <KeyValue label="认证时间" value={data.verification.verifiedAt ?? '—'} />
                <KeyValue label="失效宽限期" value={`${data.verification.graceDays} 天`} />
              </div>
              {!data.verification.benefitsSynced ? (
                <div className="mt-3">
                  <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
                    权益尚未同步到定价与额度系统，请联系支持或重新认证。
                  </InfoBanner>
                </div>
              ) : null}
              <p className="ru-hint mt-3">
                认证失效（毕业 / 邮箱注销）后 {data.verification.graceDays} 天宽限期内平滑降级，不会锁死你的数据。
              </p>
            </Card>
          </div>

          {/* ================= 右栏 ================= */}
          <aside className="space-y-4">
            {/* 套餐与额度 */}
            <Card>
              <CardHeader
                icon={<IconCredit size={15} />}
                title="套餐与额度"
                note={`当前：${planName} · 次月 1 日重置`}
                extra={
                  <Button variant="link" size="sm" onClick={() => navigate('/pricing')}>
                    去定价页 →
                  </Button>
                }
              />
              <div className="space-y-3">
                <QuotaRow label="双 Agent 核验" used={data.quota.verifyUsed} limit={data.quota.verifyLimit} unit="条" />
                <QuotaRow
                  label="分析算力"
                  used={data.quota.sandboxMinutesUsed}
                  limit={data.quota.sandboxMinutesLimit}
                  unit="分钟"
                />
                <QuotaRow
                  label="综述生成"
                  used={data.quota.reviewGenerateUsed}
                  limit={data.quota.reviewGenerateLimit}
                  unit="次"
                />
                <QuotaRow label="导出次数" used={data.quota.exportUsed} limit={data.quota.exportLimit} unit="次" />
                <div className="ru-hint">重置时间：{data.quota.resetAt}</div>
              </div>
            </Card>

            {/* 通知偏好 */}
            <Card>
              <CardHeader icon={<IconBell size={15} />} title="通知偏好" note="核验失败为合规必开项，不可关闭" />
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.key} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base text-ink inline-flex items-center gap-1.5">
                        {n.label}
                        {n.mandatory ? (
                          <Tag tone="warn" size="sm">
                            必开
                          </Tag>
                        ) : null}
                      </div>
                      <div className="ru-hint">{n.description}</div>
                    </div>
                    {/*
                      必开项（mandatory）不渲染开关：一个点不动的开关是「无实际交互功能的选项」，
                      会让用户反复尝试。改为静态状态标识，开关只保留给用户可自主控制的项。
                    */}
                    {n.mandatory ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-ink-2 shrink-0"
                        title="合规必开项，不可关闭"
                      >
                        <IconLock size={12} className="text-ok" />
                        已开启 · 必开
                      </span>
                    ) : (
                      <Toggle checked={n.enabled} onChange={(v) => handleToggleNotification(n, v)} />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* 数据与隐私 */}
            <Card>
              <CardHeader icon={<IconDatabase size={15} />} title="数据与隐私" note="默认不允许你的数据进入训练集" />
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base text-ink">允许数据用于模型改进</div>
                    <div className="ru-hint">
                      默认关闭。开启后该选择写入《AI 工具使用情况说明》并留痕，可随时关闭
                    </div>
                  </div>
                  <Toggle checked={allowTraining} onChange={handleTrainingToggle} />
                </div>

                <div className="pt-3 border-t border-line">
                  <KeyValue label="版本与日志保留" value={`${data.privacy.keepHistoryDays} 天`} />
                  <KeyValue label="最近导出申请" value={data.privacy.exportRequestedAt ?? '未申请'} />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="secondary" size="sm" icon={<IconCalendar size={14} />} onClick={handleExportData}>
                    导出我的数据
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<IconAlert size={14} />}
                    className="!text-danger !border-danger-line"
                    onClick={() => {
                      setDeleteConfirmText('')
                      setDeleteOpen(true)
                    }}
                  >
                    注销账号
                  </Button>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      {/* 注销账号：必须输入确认词 */}
      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="注销账号"
        icon={<IconAlert size={16} />}
        width={520}
        closeOnMask={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              取消
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={deleteConfirmText !== DELETE_CONFIRM_TEXT}
              onClick={handleDeleteAccount}
            >
              确认注销
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <div>注销后：登录凭证立即失效，项目数据进入 30 天保留期，期间可联系支持恢复；超期后不可恢复。</div>
          <div>导出中心的历史产物与披露报告会一并删除，建议先「导出我的数据」。</div>
          <div className="mt-2">
            <div className="text-base text-ink mb-1">
              请输入 <span className="font-semibold text-danger">{DELETE_CONFIRM_TEXT}</span> 以确认：
            </div>
            <input
              className="ru-input w-full h-9"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={DELETE_CONFIRM_TEXT}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

/** 注销账号的确认词 */
const DELETE_CONFIRM_TEXT = '注销账号'

/** 表单字段包装 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-base text-ink-2 mb-1">{label}</span>
      {children}
    </label>
  )
}

/** 额度行：进度条颜色随使用率变化 */
function QuotaRow({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const tone = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'brand'
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-ink-3 mb-1">
        <span>{label}</span>
        <span className="tabular-nums">
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <ProgressBar value={pct} tone={tone} />
    </div>
  )
}
