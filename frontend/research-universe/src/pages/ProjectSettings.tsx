/** P10 项目设置（项目信息 + 成员管理 + 版本历史 + 数据定级） */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '@/api/endpoints'
import { AppLayout } from '@/components/layout'
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  ErrorState,
  InfoBanner,
  KeyValue,
  Modal,
  PageSkeleton,
  Tag,
  type Tone,
} from '@/components/ui'
import {
  IconAlert,
  IconHistory,
  IconLock,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconShield,
  IconTrash,
  IconUsers,
} from '@/components/icons'
import { useProjectStore, useSettingsStore, useUiStore } from '@/store'
import type { DataLevel, ProjectMember, ProjectSettingsData, VersionRecord } from '@/types'

const ROLE_TONE: Record<string, Tone> = {
  firstAuthor: 'brand',
  advisor: 'violet',
  collaborator: 'neutral',
  guest: 'neutral',
}

export default function ProjectSettingsPage() {
  const { projectId = 'p_2001' } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const { projects, setProjects, setCurrentProject } = useProjectStore()
  const {
    draftDataLevel,
    savedDataLevel,
    skipConfirm,
    setDraftDataLevel,
    setSavedDataLevel,
    hydrateCompliance,
    inviteDialogOpen,
    setInviteDialogOpen,
  } = useSettingsStore()

  const [data, setData] = useState<ProjectSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.fetchProjectSettings(projectId)
      setData(d)
      setTitle(d.title)
      setDiscipline(d.discipline)
      // 数据级别与「跳过逐条确认」统一由合规设置载入（与 P03 / P16 共用同一份 store 状态）
      hydrateCompliance({ dataLevel: d.dataLevel, skipConfirm: d.skipConfirm })
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  /** 保存项目基础信息 */
  async function handleSaveProject() {
    setSaving(true)
    try {
      const res = await api.updateProject({ projectId, title, discipline })
      pushToast({ tone: 'ok', title: '已保存修改', description: res.savedAt })
    } finally {
      setSaving(false)
    }
  }

  /** 保存数据定级（改级影响全局规则） */
  function handleSaveLevel() {
    if (draftDataLevel === savedDataLevel) {
      pushToast({ tone: 'info', title: '数据级别未变化' })
      return
    }
    useUiStore.getState().openConfirm({
      tone: 'warn',
      title: '确认操作',
      description: `${data?.dataLevelChangeImpact}（目标级别：${draftDataLevel}）`,
      confirmText: '确认保存',
      onConfirm: async () => {
        const res = await api.updateDataLevel({ projectId, dataLevel: draftDataLevel })
        setSavedDataLevel(res.dataLevel)
        pushToast({ tone: 'ok', title: `数据级别已切换为 ${res.dataLevel}`, description: '规则已全局生效' })
      },
    })
  }

  /** 回滚版本 */
  function handleRollback(v: VersionRecord) {
    useUiStore.getState().openConfirm({
      tone: 'warn',
      title: '确认操作',
      description: `确认回滚到 ${v.versionNo}（${v.operatorName} · ${v.operatedAt}）？回滚会生成一条新的版本记录，历史版本不会被覆盖删除。`,
      confirmText: '确认回滚',
      onConfirm: async () => {
        const res = await api.rollbackProjectVersion({ projectId, versionNo: v.versionNo })
        pushToast({ tone: 'ok', title: `已回滚到 ${res.versionNo}`, description: res.rollbackAt })
      },
    })
  }

  /** 删除项目：二次确认后调用 DELETE，成功后回到工作台 */
  function handleDeleteProject() {
    useUiStore.getState().openConfirm({
      tone: 'warn',
      title: '删除项目',
      description: `确认删除「${title || data?.title || '当前项目'}」？该项目下的文献、分析结果、文稿与导出记录将一并永久删除，且无法恢复。`,
      confirmText: '确认删除',
      cancelText: '取消',
      onConfirm: async () => {
        try {
          await api.deleteProject({ projectId })
          const rest = projects.filter((x) => x.projectId !== projectId)
          setProjects(rest)
          setCurrentProject(rest[0]?.projectId ?? '')
          pushToast({ tone: 'ok', title: '项目已删除', description: '关联数据与导出包已清除' })
          navigate('/')
        } catch (e) {
          pushToast({
            tone: 'danger',
            title: '删除失败',
            description: e instanceof Error ? e.message : '请稍后重试',
          })
        }
      },
    })
  }

  if (loading) return <AppLayout noSubHeader><div className="pt-4"><PageSkeleton /></div></AppLayout>
  if (error || !data) return <AppLayout noSubHeader><div className="pt-4"><ErrorState description={error ?? '数据为空'} onRetry={load} /></div></AppLayout>

  return (
    <AppLayout breadcrumb={[{ key: 'p', label: data.title }, { key: 's', label: '项目设置' }]}>
      {/* 页头 */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-ink leading-[32px]">{title}</h1>
          <p className="ru-hint mt-1">{data.metaText}</p>
        </div>
        <Button icon={<IconSettings size={14} />} loading={saving} onClick={handleSaveProject}>
          保存修改
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 pb-8">
        <div className="space-y-4">
          {/* 项目信息 */}
          <Card>
            <CardHeader icon={<IconSettings size={15} />} title="项目信息" />
            <div className="space-y-3">
              <FieldRow label="项目名称">
                <input className="ru-input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </FieldRow>
              <FieldRow label="学科领域">
                <select className="ru-select" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
                  {['心理学', '教育学', '社会学', '医学', '管理学', '计算机'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="驱动路线">
                <select className="ru-select" defaultValue="dataDriven">
                  <option value="dataDriven">数据驱动（默认统计方法与文献源已按学科预设）</option>
                  <option value="theoryDriven">理论驱动（从领域热词与理论框架出发）</option>
                </select>
              </FieldRow>
              <FieldRow label="DDL 硬节点">
                <div className="flex items-center gap-2 flex-wrap">
                  {data.ddlNodes.map((d) => (
                    <span
                      key={d.nodeId}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-card border border-line-strong bg-white text-base text-ink"
                    >
                      {d.name}
                      <input
                        className="w-[92px] bg-transparent outline-none text-brand font-medium"
                        defaultValue={d.date}
                        onBlur={(e) =>
                          pushToast({ tone: 'info', title: `已更新「${d.name}」节点日期`, description: `${d.date} → ${e.target.value}` })
                        }
                      />
                    </span>
                  ))}
                </div>
              </FieldRow>
            </div>
          </Card>

          {/* 成员管理 */}
          <Card>
            <CardHeader
              icon={<IconUsers size={15} />}
              title="成员管理"
              extra={
                <Button variant="secondary" size="sm" icon={<IconPlus size={13} />} onClick={() => setInviteDialogOpen(true)}>
                  邀请成员
                </Button>
              }
            />
            <DataTable<ProjectMember>
              rows={data.members}
              rowKey={(r) => r.memberId}
              columns={[
                {
                  key: 'name',
                  title: '成员',
                  width: '150px',
                  render: (m) => (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-brand text-white text-[11px] flex items-center justify-center">
                        {m.avatarText}
                      </span>
                      <span className="text-ink">{m.name}</span>
                    </span>
                  ),
                },
                {
                  key: 'role',
                  title: '角色',
                  width: '110px',
                  render: (m) => (
                    <span className={`text-base font-medium ${m.role === 'advisor' ? 'text-violet' : 'text-ink'}`}>
                      {m.roleLabel}
                    </span>
                  ),
                },
                { key: 'perm', title: '权限', render: (m) => <span className="text-ink-2 text-base">{m.permissionLabel}</span> },
              ]}
            />
            <div className="mt-3">
              <InfoBanner tone="info" icon={<IconShield size={14} />}>
                权限差异：第一作者拥有全部权限（含删除、定级与披露报告生成）；导师可查看产物快照 / 改动日志 / 核验状态 /
                披露报告，可评论与退回，可编辑；协作学生可编辑产物与参与核验，不可导出、不可定级。
              </InfoBanner>
            </div>
          </Card>

          {/* 版本历史 */}
          <Card>
            <CardHeader
              icon={<IconHistory size={15} />}
              title="版本历史"
              extra={<span className="ru-hint">{data.versionPolicyText}</span>}
            />
            <div className="divide-y divide-line">
              {data.versions.map((v) => (
                <div key={v.versionNo} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="text-base text-ink">
                      <span className="font-medium">{v.versionNo}</span>
                      <span className="text-ink-3"> · {v.operatorName} · {v.operatedAt}</span>
                    </div>
                    <div className="ru-hint mt-0.5">{v.description}</div>
                  </div>
                  <button
                    className="text-xs text-brand hover:underline shrink-0 disabled:text-ink-3"
                    disabled={!v.rollbackable}
                    onClick={() => handleRollback(v)}
                  >
                    回滚
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 右：数据定级 */}
        <aside className="space-y-4">
          <Card>
            <CardHeader icon={<IconLock size={15} />} title="请选择您的数据类型" />
            <div className="space-y-2">
              {data.dataLevelOptions.map((o) => {
                const active = draftDataLevel === o.level
                return (
                  <button
                    key={o.level}
                    onClick={() => setDraftDataLevel(o.level as DataLevel)}
                    className={`w-full text-left border rounded-card p-3 flex items-start justify-between gap-3 transition ${
                      active ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-brand-line'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-medium text-ink">{o.name}</span>
                      <span className="ru-hint block mt-0.5">{o.description}</span>
                      {o.rules.map((r) => (
                        <span key={r} className="ru-hint block mt-0.5">
                          · {r}
                        </span>
                      ))}
                    </span>
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border-[5px] shrink-0`}
                      style={{ borderColor: active ? '#2563EB' : '#D5DCE7' }}
                    />
                  </button>
                )
              })}
            </div>

            <div className="mt-3">
              <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
                {data.dataLevelChangeImpact}
              </InfoBanner>
            </div>

            {/* 只读展示「跳过逐条确认」，修改入口在 P03 文献综述与 P16 上传数据（共用同一份设置） */}
            <div className="mt-3">
              <KeyValue
                label="跳过逐条确认（YOLO）"
                value={
                  draftDataLevel === 'L2' ? (
                    <span className="text-danger">L2 强制禁用</span>
                  ) : skipConfirm ? (
                    <span className="text-warn">已跳过</span>
                  ) : (
                    '逐条确认'
                  )
                }
              />
              <div className="ru-hint mt-1">
                与「文献综述」「上传数据」两页共用同一份设置，改任一处三处同步。
              </div>
            </div>

            <Button
              fullWidth
              className="mt-3"
              disabled={draftDataLevel === savedDataLevel}
              onClick={handleSaveLevel}
            >
              保存定级
            </Button>
          </Card>

          <Card>
            <CardHeader icon={<IconShield size={15} />} title="合规规则速查" />
            <div className="space-y-2">
              {[
                ['L0 公开', '公开文献元数据与公开数据集，可直接导出。'],
                ['L1 个人', '仅项目成员可见；默认不进入任何训练集。'],
                ['L2 敏感', '强制脱敏、禁止导出原文、存储加密、访问留痕、强制禁用跳过逐条确认。'],
              ].map(([tag, desc]) => (
                <div key={tag} className="flex items-start gap-2">
                  <Tag tone={tag.startsWith('L2') ? 'danger' : tag.startsWith('L1') ? 'brand' : 'ok'} size="sm" className="shrink-0">
                    {tag}
                  </Tag>
                  <span className="text-base text-ink-2 leading-[22px]">{desc}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader icon={<IconTrash size={15} />} title="危险操作" note="不可撤销" />
            <InfoBanner tone="warn" icon={<IconAlert size={14} />}>
              删除项目会同时清除该项目下的全部数据：文献与核验记录、分析结果与沙箱文件、文稿与引用、导出包与版本历史。
              该操作不可撤销，如需保留请先到「导出中心」导出产物。
            </InfoBanner>
            <div className="mt-3">
              <Button variant="danger" size="sm" icon={<IconTrash size={13} />} onClick={handleDeleteProject}>
                删除该项目
              </Button>
            </div>
          </Card>

          <Button variant="ghost" size="sm" icon={<IconRefresh size={13} />} onClick={load}>
            重新读取项目设置
          </Button>
        </aside>
      </div>

      {/* 邀请成员弹窗 */}
      <InviteMemberDialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} projectId={projectId} />
    </AppLayout>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-[92px] shrink-0 text-base text-ink-2 leading-9">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function InviteMemberDialog({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const pushToast = useUiStore((s) => s.pushToast)
  const [account, setAccount] = useState('')
  const [role, setRole] = useState('协作学生')
  const [loading, setLoading] = useState(false)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="邀请成员"
      icon={<IconUsers size={17} />}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button
            loading={loading}
            onClick={async () => {
              if (!account.trim()) {
                pushToast({ tone: 'warn', title: '请输入成员账号' })
                return
              }
              setLoading(true)
              try {
                await api.inviteMember({ projectId, account, role })
                pushToast({ tone: 'ok', title: '邀请已发送', description: `${account} · ${role}` })
                setAccount('')
                onClose()
              } finally {
                setLoading(false)
              }
            }}
          >
            发送邀请
          </Button>
        </>
      }
    >
      <div className="space-y-3 pb-1">
        <div>
          <label className="block text-xs text-ink-3 mb-1.5">成员账号（手机号 / 邮箱）</label>
          <input className="ru-input" placeholder="请输入账号" value={account} onChange={(e) => setAccount(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-ink-3 mb-1.5">角色</label>
          <select className="ru-select" value={role} onChange={(e) => setRole(e.target.value)}>
            {['协作学生', '导师', '第一作者'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <InfoBanner tone="info">
          角色决定可见与可编辑范围：导师可评论与退回；协作学生不可导出、不可定级。
        </InfoBanner>
      </div>
    </Modal>
  )
}
