/** 应用根组件：挂载全局弹窗与 Toast */
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { GlobalConfirmDialog, GlobalTaskDialog, ToastContainer } from '@/components/ui'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      {/* 全局 UI 层（不属于任何页面） */}
      <GlobalConfirmDialog />
      <GlobalTaskDialog />
      <ToastContainer />
    </>
  )
}
