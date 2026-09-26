/** 路由表（React Router v6） */
import { useEffect, useState } from 'react'
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { ApiError, ErrorCode, USE_MOCK, clearAuthStorage } from '@/api/client'
import { useAuthStore } from '@/store'
import { PageSkeleton } from '@/components/ui'
import LoginPage from '@/pages/Login'
import WorkspacePage from '@/pages/Workspace'
import IntroHotspotPage from '@/pages/IntroHotspot'
import IntroTopicKeywordsPage from '@/pages/IntroTopicKeywords'
import IntroTopicTheoryPage from '@/pages/IntroTopicTheory'
import IntroDataUploadPage from '@/pages/IntroDataUpload'
import IntroVariablesPage from '@/pages/IntroVariables'
import IntroHypothesesPage from '@/pages/IntroHypotheses'
import LiteraturePage from '@/pages/Literature'
import AnalysisPage from '@/pages/Analysis'
import AnalysisResultPage from '@/pages/AnalysisResult'
import WritingPage, { WritingEditorPage } from '@/pages/Writing'
import JournalPage from '@/pages/Journal'
import ReviewPage from '@/pages/Review'
import ExportCenterPage from '@/pages/ExportCenter'
import PricingPage from '@/pages/Pricing'
import ProjectSettingsPage from '@/pages/ProjectSettings'
import AccountSettingsPage from '@/pages/AccountSettings'
import NotFoundPage from '@/pages/NotFound'

/**
 * 鉴权守卫：
 * - 真实模式（USE_MOCK=false）下 localStorage 无 token 时，统一重定向到 /login，
 *   避免未登录状态下进入业务页触发「全军覆没式 401」；
 * - 有 token 时先水合一次会话（/me + 学生认证），把昵称 / 头像 / 认证状态灌进 store，
 *   否则刷新页面后顶栏用户名会空掉（甚至看起来像「又变回示例账号」）。
 */
function RequireAuth() {
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('ru_token')
  if (!USE_MOCK && !token) return <Navigate to="/login" replace />
  return <SessionGate token={token} />
}

function SessionGate({ token }: { token: string | null }) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const setVerification = useAuthStore((s) => s.setVerification)
  const setBootstrapped = useAuthStore((s) => s.setBootstrapped)
  /** 已经有用户信息（如刚登录完）就不必再拉一次 */
  const hasUser = useAuthStore((s) => !!s.auth.user)
  const [ready, setReady] = useState(hasUser)

  useEffect(() => {
    if (ready) return
    let alive = true
    void (async () => {
      try {
        const [user, verification] = await Promise.all([api.fetchMe(), api.fetchStudentVerification()])
        if (!alive) return
        setAuth({ loggedIn: true, token: token ?? 'mock-token', user })
        setVerification(verification)
        setBootstrapped(true)
      } catch (e) {
        if (!alive) return
        /**
         * 只有「凭证失效」才登出：HTTP 401 已由 `request()` 统一清凭证并跳登录页，
         * 这里兜住以业务码返回的 40101 / 40102。
         * 其余错误（网络抖动、5xx）**不应该把用户踢下线** —— 顶栏会继续用本地缓存的资料
         * 显示「已登录」，本次会话不再重复水合，避免出现「明明登录了却显示未登录」。
         */
        const code = e instanceof ApiError ? e.code : 0
        if (code === ErrorCode.UNAUTHORIZED || code === ErrorCode.TOKEN_EXPIRED) {
          clearAuthStorage()
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.assign('/login')
          }
        }
      } finally {
        if (alive) setReady(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [ready, token, setAuth, setVerification, setBootstrapped])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-[420px]">
          <PageSkeleton />
        </div>
      </div>
    )
  }
  return <Outlet />
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

  {
    /* 以下为需登录访问的业务路由 */
    element: <RequireAuth />,
    children: [
      /* 工作台 */
      { path: '/', element: <WorkspacePage /> },

      /* 论文引言 */
      { path: '/project/:projectId/intro', element: <IntroHotspotPage /> },
      { path: '/project/:projectId/intro/topic/keywords', element: <IntroTopicKeywordsPage /> },
      { path: '/project/:projectId/intro/topic/theory', element: <IntroTopicTheoryPage /> },
      { path: '/project/:projectId/intro/data/upload', element: <IntroDataUploadPage /> },
      { path: '/project/:projectId/intro/data/variables', element: <IntroVariablesPage /> },
      { path: '/project/:projectId/intro/data/hypotheses', element: <IntroHypothesesPage /> },
      { path: '/project/:projectId/literature', element: <LiteraturePage /> },

      /* 数据统计（第 3 步「选择方法」+ 第 4 步「结果与稳健性」拆为两页） */
      { path: '/project/:projectId/analysis', element: <AnalysisPage /> },
      { path: '/project/:projectId/analysis/result', element: <AnalysisResultPage /> },

      /* 论文写作 */
      { path: '/project/:projectId/writing', element: <WritingPage /> },
      { path: '/project/:projectId/writing/editor', element: <WritingEditorPage /> },
      { path: '/project/:projectId/journal', element: <JournalPage /> },

      /* 论文评审 */
      { path: '/project/:projectId/review', element: <ReviewPage /> },

      /* 全局功能页 */
      { path: '/account', element: <AccountSettingsPage /> },
      { path: '/project/:projectId/export', element: <ExportCenterPage /> },
      { path: '/project/:projectId/settings', element: <ProjectSettingsPage /> },
      { path: '/pricing', element: <PricingPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
