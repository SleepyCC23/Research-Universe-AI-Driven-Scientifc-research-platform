import { prisma } from './prisma'
import { login } from './services/account.service'
import { createProjectGraph } from './services/project.graph'
import { buildSchedule, todayIso } from './content/schedule'

/**
 * 种子数据：写入 1 个演示用户 + 3 个演示项目（含全部页面载荷）
 * 幂等：每次运行先清空再重建。
 */
async function main() {
  const today = todayIso()
  console.log('[seed] 清空旧数据…')
  await prisma.task.deleteMany({})
  await prisma.project.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.verificationCode.deleteMany({})

  console.log('[seed] 创建演示用户（13800000000 / 任意 6 位验证码）…')
  // intent=register：库刚被清空，演示账号尚不存在，只有「注册」意图才允许建号
  const res = await login('13800000000', '123456', 'register')
  const userId = res.auth.user!.userId
  const ownerName = res.auth.user!.nickname

  const projects = [
    {
      id: 'p_2001',
      title: '社交焦虑与手机依赖的关系研究：一个有调节的中介模型',
      discipline: '心理学',
      route: 'dataDriven' as const,
      createdAt: new Date(),
      footnote: '3 待办 · 核验通过 28 条',
      lastEditedText: '2 小时前编辑',
      todoCount: 3,
      verifiedCount: 28,
      tip: '文献精读预计逾期 3 天，建议压缩至 20 篇精读。',
      phases: [
        { phaseId: 'ph1', name: '选题', startDate: '2026-09-01', endDate: '2026-09-20', progress: 100 },
        { phaseId: 'ph2', name: '文献综述', startDate: '2026-09-21', endDate: '2026-10-15', progress: 100 },
        { phaseId: 'ph3', name: '数据分析', startDate: '2026-10-16', endDate: '2026-11-05', progress: 45 },
        { phaseId: 'ph4', name: '论文写作', startDate: '2026-11-06', endDate: '2026-12-01', progress: 0 },
        { phaseId: 'ph5', name: '投稿准备', startDate: '2026-12-02', endDate: '2026-12-15', progress: 0 },
      ],
      milestones: [
        { nodeId: 'ddl1', name: '开题报告', date: '2026-09-25' },
        { nodeId: 'ddl2', name: '中期检查', date: '2026-11-15' },
        { nodeId: 'ddl3', name: '投稿截止', date: '2026-12-15' },
        { nodeId: 'ddl4', name: '毕业答辩', date: '2027-03-20' },
      ],
    },
    {
      id: 'p_2002',
      title: '短视频使用对大学生睡眠质量的影响：基于 ESM 的实证研究',
      discipline: '心理学',
      route: 'dataDriven' as const,
      createdAt: new Date(Date.now() - 10 * 86400000),
      footnote: '2 待办 · 核验通过 41 条',
      lastEditedText: '昨天编辑',
      todoCount: 2,
      verifiedCount: 41,
      tip: '初稿字数 4,820，建议先补齐讨论与结论章节再进入选刊。',
      phases: [
        { phaseId: 'ph1', name: '选题', startDate: '2026-06-01', endDate: '2026-06-20', progress: 100 },
        { phaseId: 'ph2', name: '文献综述', startDate: '2026-06-21', endDate: '2026-07-31', progress: 100 },
        { phaseId: 'ph3', name: '数据分析', startDate: '2026-08-01', endDate: '2026-08-31', progress: 100 },
        { phaseId: 'ph4', name: '论文写作', startDate: '2026-09-01', endDate: '2026-12-31', progress: 68 },
        { phaseId: 'ph5', name: '投稿准备', startDate: '2027-01-01', endDate: '2027-01-28', progress: 0 },
      ],
      milestones: [
        { nodeId: 'ddl1', name: '开题报告', date: '2026-06-15' },
        { nodeId: 'ddl2', name: '中期检查', date: '2026-09-10' },
        { nodeId: 'ddl3', name: '投稿截止', date: '2027-01-28' },
        { nodeId: 'ddl4', name: '毕业答辩', date: '2027-03-20' },
      ],
    },
    {
      id: 'p_2003',
      title: '导师制对研究生科研效能的影响：一项追踪研究设计',
      discipline: '教育学',
      route: 'theoryDriven' as const,
      createdAt: new Date(Date.now() - 20 * 86400000),
      footnote: '1 待办 · 核验通过 6 条',
      lastEditedText: '3 天前编辑',
      todoCount: 1,
      verifiedCount: 6,
      tip: '选题可行性评估已完成，建议先补齐研究假设与变量落成。',
      phases: [
        { phaseId: 'ph1', name: '选题', startDate: '2026-09-20', endDate: '2026-11-08', progress: 15 },
        { phaseId: 'ph2', name: '文献综述', startDate: '2026-11-09', endDate: '2026-12-20', progress: 0 },
        { phaseId: 'ph3', name: '数据分析', startDate: '2026-12-21', endDate: '2027-01-20', progress: 0 },
        { phaseId: 'ph4', name: '论文写作', startDate: '2027-01-21', endDate: '2027-02-20', progress: 0 },
        { phaseId: 'ph5', name: '投稿准备', startDate: '2027-02-21', endDate: '2027-03-15', progress: 0 },
      ],
      milestones: [
        { nodeId: 'ddl1', name: '开题答辩', date: '2026-11-08' },
        { nodeId: 'ddl2', name: '中期检查', date: '2027-01-10' },
        { nodeId: 'ddl3', name: '投稿截止', date: '2027-03-15' },
        { nodeId: 'ddl4', name: '毕业答辩', date: '2027-03-20' },
      ],
    },
  ]

  for (const p of projects) {
    console.log(`[seed] 创建项目 ${p.id}：${p.title}`)
    const schedule = buildSchedule(p.id, p.title, p.phases, p.milestones, today, p.tip)
    await createProjectGraph({
      id: p.id,
      ownerId: userId,
      ownerName,
      title: p.title,
      discipline: p.discipline,
      route: p.route,
      schedule,
      createdAt: p.createdAt,
      rich: true,
      footnote: p.footnote,
      lastEditedText: p.lastEditedText,
      todoCount: p.todoCount,
      verifiedCount: p.verifiedCount,
    })
  }

  console.log('[seed] 完成 ✅')
  console.log('       演示账号：13800000000，验证码：任意 6 位数字')
  console.log('       项目：p_2001 / p_2002 / p_2003')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('[seed] 失败：', e)
    await prisma.$disconnect()
    process.exit(1)
  })
