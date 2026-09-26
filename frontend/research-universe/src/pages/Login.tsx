/** P12 登录 / 注册 + 学生认证（全局入口页，无顶部导航） */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { ApiError, USE_MOCK } from '@/api/client'
import { BrandLogo } from '@/components/layout'
import { CitationWeb } from '@/components/CitationWeb'
import { Button, Card, CheckPill, InfoBanner, Segmented } from '@/components/ui'
import { IconAlert, IconLock } from '@/components/icons'
import { useAuthStore, useUiStore } from '@/store'

const BRAND_POINTS = [
  '双 Agent 核验：引用与论断一致率 ≥ 99%',
  '分析可复现：完整执行环境 + Python / R 代码包导出',
  '全流程留痕：一键导出《AI 使用情况说明》满足投稿披露',
]

/** 未登录 / 刚退出登录时的默认视图：注册（需求：退出后默认进入注册页） */
type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth, setVerification, setBootstrapped } = useAuthStore()
  const pushToast = useUiStore((s) => s.pushToast)

  /* ---- 表单状态（用户输入） ---- */
  const [mode, setMode] = useState<AuthMode>('register')
  const [account, setAccount] = useState('')
  const [codes, setCodes] = useState(['', '', '', '', '', ''])
  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [errorText, setErrorText] = useState('')

  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  /** 切换「注册 / 登录」：清掉上一条错误提示，避免残留误导 */
  function switchMode(next: AuthMode) {
    if (next === mode) return
    setMode(next)
    setErrorText('')
  }

  /** 发送验证码（账号位数不合法时不发码，避免无谓请求） */
  async function handleSendCode() {
    const accountError = api.validateAccount(account)
    if (accountError) {
      setErrorText(accountError)
      return
    }
    setErrorText('')
    setSending(true)
    try {
      const res = await api.sendSmsCode({ account: account.trim() })
      setCooldown(res.cooldownSeconds)
      pushToast({ tone: 'ok', title: '验证码已发送', description: `请查收 ${account.trim()}` })
      inputsRef.current[0]?.focus()
    } catch (e) {
      setErrorText(e instanceof ApiError ? e.message : '验证码发送失败，请稍后重试')
    } finally {
      setSending(false)
    }
  }

  function setCodeAt(i: number, v: string) {
    const char = v.replace(/\D/g, '').slice(-1)
    const next = [...codes]
    next[i] = char
    setCodes(next)
    if (char && i < 5) inputsRef.current[i + 1]?.focus()
  }

  /** 登录 / 注册 */
  async function handleLogin() {
    const accountError = api.validateAccount(account)
    if (accountError) {
      setErrorText(accountError)
      return
    }
    const code = codes.join('')
    if (!/^\d{6}$/.test(code)) {
      setErrorText('请输入 6 位验证码')
      return
    }
    setErrorText('')
    setLoggingIn(true)
    try {
      const res = await api.login({ account: account.trim(), code, intent: mode })
      // 兜底：登录模式下不允许「顺手建号」，真发生就清掉刚拿到的 token 并提示去注册
      if (mode === 'login' && res.isNewUser) {
        try {
          localStorage.removeItem('ru_token')
        } catch {
          /* 忽略隐私模式异常 */
        }
        setErrorText('该账号尚未注册，请切换到「注册」后重试')
        return
      }
      setAuth(res.auth)
      setVerification(res.verification)
      setBootstrapped(true)
      pushToast({
        tone: 'ok',
        title: res.isNewUser ? '注册成功，欢迎加入研宇宙' : '登录成功',
        description: res.isNewUser ? '已为你初始化学生版额度与项目空间' : '欢迎回到研宇宙',
      })
      navigate('/')
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : '登录失败，请稍后重试'
      setErrorText(msg)
    } finally {
      setLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_480px] bg-page">
      {/* 左侧品牌区：引文网络背景层 + 鼠标跟随溯源 */}
      <section
        className="relative hidden lg:flex flex-col justify-center overflow-hidden px-[clamp(44px,5.5vw,84px)]"
        style={{ background: 'linear-gradient(158deg, #E9F0FB 0%, #F6F9FE 46%, #EAF0FA 100%)' }}
      >
        <CitationWeb />

        <div className="ru-rise-in relative z-10 max-w-[560px]">
          <BrandLogo />
          <h1 className="mt-9 text-[clamp(30px,2.9vw,42px)] font-semibold leading-[1.24] tracking-[-0.02em] text-ink">
            可信的 AI 科研工作台
          </h1>
          <p className="mt-4 text-[17px] leading-[28px] text-ink-2">引用可溯源 · 分析可复现 · 过程可交代</p>
          <div className="mt-9 space-y-3">
            {BRAND_POINTS.map((t) => (
              <CheckPill key={t} done>
                {t}
              </CheckPill>
            ))}
          </div>
        </div>

        <p className="ru-hint ru-rise-in absolute bottom-10 left-[clamp(44px,5.5vw,84px)] right-[clamp(44px,5.5vw,84px)] z-10 max-w-[520px]">
          L1 / L2 数据默认不进入任何训练集；检测到敏感信息会先强制脱敏，确认后才能继续。
        </p>
      </section>

      {/* 右侧表单区 */}
      <section className="flex flex-col justify-center px-8 py-12 bg-white border-l border-line">
        <Card className="!shadow-none !border-0 !p-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-lg font-semibold text-ink">{mode === 'register' ? '注册账号' : '登录'}</div>
            {/* 默认停在「注册」：退出登录后应看到注册入口，而不是被当成已登录的示例账号 */}
            <Segmented
              size="sm"
              value={mode}
              options={[
                { key: 'register', label: '注册' },
                { key: 'login', label: '登录' },
              ]}
              onChange={switchMode}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                className="ru-input pl-8"
                placeholder="11 位手机号或邮箱"
                value={account}
                maxLength={64}
                autoComplete="username"
                onChange={(e) => setAccount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSendCode()}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3">
                <IconLock size={13} />
              </span>
            </div>
            <Button variant="secondary" onClick={handleSendCode} loading={sending} disabled={cooldown > 0}>
              {cooldown > 0 ? `${cooldown}s 后重发` : '发送验证码'}
            </Button>
          </div>
          <p className="ru-hint mt-1.5">
            {mode === 'register'
              ? '账号仅支持 11 位手机号或邮箱；未注册的账号将自动创建。'
              : '账号仅支持 11 位手机号或邮箱；仅已注册账号可登录。'}
          </p>

          <div className="flex items-center gap-2 mt-3">
            {codes.map((c, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el
                }}
                className="w-full h-11 text-center text-xl border border-line-strong rounded-card outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={c}
                inputMode="numeric"
                maxLength={1}
                onChange={(e) => setCodeAt(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !codes[i] && i > 0) inputsRef.current[i - 1]?.focus()
                }}
              />
            ))}
          </div>

          {errorText ? (
            <div className="mt-3">
              <InfoBanner tone="danger" icon={<IconAlert size={14} />}>
                {errorText}
              </InfoBanner>
            </div>
          ) : null}

          <Button fullWidth size="lg" className="mt-3" loading={loggingIn} onClick={handleLogin}>
            {mode === 'register' ? '注册并登录' : '登录'}
          </Button>

          <div className="flex items-center gap-3 my-3">
            <span className="flex-1 h-px bg-line" />
            <span className="text-xs text-ink-3">其他方式</span>
            <span className="flex-1 h-px bg-line" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => pushToast({ tone: 'info', title: '微信快捷登录', description: '演示环境：请使用验证码登录' })}>
              微信快捷登录
            </Button>
            <Button
              variant="secondary"
              onClick={() => pushToast({ tone: 'info', title: '学信网快捷核验', description: '演示环境：请使用教育邮箱认证' })}
            >
              学信网快捷核验
            </Button>
          </div>

          <p className="ru-hint mt-3">登录即表示同意《用户协议》与《学术诚信使用规范》</p>
        </Card>

        {/* 学生认证已迁移到「账号设置 → 学生认证」：认证是账号级操作，登录后再做即可 */}
        <p className="ru-hint mt-4">
          学生认证（教育邮箱 / 学信网）已移至「账号设置 → 学生认证」，登录后即可提交并同步学生价与额度。
        </p>

        {USE_MOCK ? (
          <Button variant="ghost" size="sm" className="mt-6 self-start" onClick={() => navigate('/')}>
            跳过，直接进入演示 →
          </Button>
        ) : null}
      </section>
    </div>
  )
}
