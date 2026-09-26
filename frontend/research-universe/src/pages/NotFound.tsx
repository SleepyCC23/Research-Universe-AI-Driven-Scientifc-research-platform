/** 404 页面 */
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { Button, Card, EmptyState } from '@/components/ui'
import { IconSearch } from '@/components/icons'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <AppLayout noSubHeader>
      <div className="pt-10">
        <Card>
          <EmptyState
            text="页面不存在"
            description="路由地址无效，或该页面仍在规划中。可返回工作台继续你的项目。"
            icon={<IconSearch size={20} />}
            action={<Button onClick={() => navigate('/')}>返回工作台</Button>}
          />
        </Card>
      </div>
    </AppLayout>
  )
}
