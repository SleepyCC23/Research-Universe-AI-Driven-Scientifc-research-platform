import { prisma } from '../prisma'
import { Errors } from '../core/errors'
import { buildEditorBody, buildWritingPage } from '../content/payloads'
import { tryChatJSON } from '../llm/client'
import { genId, requireProject, stamp } from './common'

async function projectLike(projectId: string) {
  const p = await requireProject(projectId)
  return { id: p.id, title: p.title, discipline: p.discipline, route: p.route }
}

async function getDoc(projectId: string) {
  let doc = await prisma.writingDoc.findUnique({ where: { projectId } })
  if (!doc) {
    const proj = await projectLike(projectId)
    doc = await prisma.writingDoc.create({ data: { projectId, data: buildWritingPage(proj) as never } })
  }
  return doc.data as Record<string, unknown>
}

async function setDoc(projectId: string, data: Record<string, unknown>) {
  await prisma.writingDoc.update({ where: { projectId }, data: { data: data as never } })
  return data
}

/**
 * 用项目真实入库文献（已核验可引用）同步写作页的引用池。
 * 历史上 editorCitations / kbDocs 是写死的静态样例（paperId 为 pa_1 / pp1 之类的假 id），
 * 前端拿这些假 id 调 insertCitation 会报「文献不存在」。这里改为读 litPaper 表，
 * 保证下发的 paperId 与 insertCitation 校验用的是同一批真实记录。
 */
async function syncCitationPool(projectId: string, data: Record<string, unknown>) {
  const papers = await prisma.litPaper.findMany({
    where: { projectId, citable: true },
    orderBy: { id: 'asc' },
    take: 100,
  })
  const editorCitations = papers.map((p, i) => ({
    index: i + 1,
    paperId: p.paperId,
    title: p.title,
    journal: p.journal ?? '',
    year: String(p.year ?? ''),
  }))
  const kbDocs = papers.map((p) => ({
    paperId: p.paperId,
    title: p.title,
    metaText: `${p.authors ?? ''} · ${p.year ?? ''}`,
  }))
  return {
    ...data,
    editorCitations,
    kbDocs,
    kbDocCount: kbDocs.length,
    citePoolEmpty: papers.length === 0,
  }
}

/**
 * 用**当前**段落重新组装编辑器正文（editorBody），保证与写作页「查看全文」同源。
 *
 * 修复背景（用户反馈「这两页不还是不一样吗」）：
 * `writingDoc` 是入库快照，其中的 `editorBody` 只在**首次创建**时由 buildWritingPage 写死；
 * 而 `paragraphs` 会被「生成本节 / 段落改写」持续更新（实际已到 18 段）。
 * 结果就是「AI 全文生成 · 查看全文」有 18 段，而「手动编辑」页永远停在最初那 4 块。
 * 现在每次读取都按当前 `paragraphs` 现算 editorBody —— 两页天然一致，也无需数据迁移。
 */
function withFreshEditorBody(data: Record<string, unknown>) {
  const paragraphs =
    (data.paragraphs as Array<{ paraId: string; section: string; text: string; traceLabel?: string }> | undefined) ?? []
  return { ...data, editorBody: buildEditorBody(paragraphs) }
}

export async function getWriting(projectId: string) {
  const data = await getDoc(projectId)
  const synced = await syncCitationPool(projectId, data)
  return withFreshEditorBody(synced) as never
}

export async function saveWritingDoc(projectId: string, payload: { content: string; section?: string; mode?: string }) {
  const data = await getDoc(projectId)
  const stats = data.stats as Record<string, number>
  const wordCount = payload.content ? payload.content.replace(/\s+/g, '').length : stats.wordCount
  const next = {
    ...data,
    currentSection: payload.section ?? data.currentSection,
    mode: payload.mode ?? data.mode,
    autoSavedAt: new Date().toISOString(),
    stats: { ...stats, wordCount, unsavedChanges: 0, lastEditedAt: new Date().toISOString() },
  }
  await setDoc(projectId, next)
  return { autoSavedAt: next.autoSavedAt, wordCount }
}

export async function generateOutline(projectId: string) {
  const proj = await projectLike(projectId)
  const data = await getDoc(projectId)
  const llm = await tryChatJSON<{ outline: Array<{ nodeId?: string; title: string; level: number; children?: unknown[] }> }>(
    '你是论文写作助手。只输出 JSON，遵守 IMRaD 结构，禁止编造引用数量。',
    `主题：${proj.title}\n学科：${proj.discipline}\n返回 { "outline":[{"title","level","children":[...]}] }`,
  )
  if (llm?.outline) {
    const outline = llm.outline.map((n, i) => ({ nodeId: `o${i + 1}`, title: n.title, level: n.level ?? 1, children: n.children ?? [] }))
    await setDoc(projectId, { ...data, outline })
    return outline
  }
  return data.outline
}

/** 大纲顺序索引（父节点先于其子节点），用于把段落按章节顺序排好 */
function outlineOrderOf(outline: unknown): Record<string, number> {
  const map: Record<string, number> = {}
  let cursor = 0
  const walk = (nodes: unknown) => {
    if (!Array.isArray(nodes)) return
    for (const n of nodes as Array<{ title?: string; children?: unknown }>) {
      if (n?.title) map[n.title] = cursor++
      if (n?.children) walk(n.children)
    }
  }
  walk(outline)
  return map
}

/**
 * 生成 / 重新生成某一节。
 *
 * 修复的缺陷：原实现把整篇 `paragraphs` 直接替换成「本次生成的几段」——
 * 生成「2.1」会把 1.1、3.3 等章节整段抹掉（用户表现为「生成一节，别的全没了」）。
 * 现在只替换目标章节，其余原样保留，并按大纲顺序重排 P1..Pn、同步字数与段落数。
 */
export async function regenerateSection(projectId: string, section: string) {
  const proj = await projectLike(projectId)
  const data = await getDoc(projectId)
  const llm = await tryChatJSON<{ paragraphs: string[] }>(
    '你是学术写作助手。只改表达、不臆造结论与文献；无来源不断言。只输出 JSON。',
    `主题：${proj.title}\n章节：${section}\n返回 { "paragraphs": ["段落1","段落2"] }`,
  )
  const texts =
    llm?.paragraphs?.length && Array.isArray(llm.paragraphs)
      ? llm.paragraphs
      : [`（重新生成）${section} 段落：围绕「${proj.title}」展开论述。`]

  const generated = texts.map((t) => ({
    paraId: genId('p'),
    index: 0,
    section,
    kind: 'normal' as const,
    aiGenerated: true,
    traceLabel: 'AI 生成',
    text: String(t),
  }))

  type Para = { section?: string; text?: string }
  const order = outlineOrderOf(data.outline)
  const others = ((data.paragraphs as Para[]) ?? []).filter((p) => p.section !== section)
  const paragraphs = [...others, ...generated]
    .map((p, i) => ({ p, i, o: order[p.section ?? ''] ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => (a.o === b.o ? a.i - b.i : a.o - b.o))
    .map((x, i) => ({ ...x.p, index: i + 1 }))

  const wordCount = paragraphs.reduce((n, p) => n + String(p.text ?? '').replace(/\s+/g, '').length, 0)
  const stats = (data.stats as Record<string, number>) ?? {}
  const now = new Date().toISOString()
  await setDoc(projectId, {
    ...data,
    paragraphs,
    currentSection: section,
    autoSavedAt: now,
    stats: { ...stats, wordCount, paragraphCount: paragraphs.length, unsavedChanges: 0, lastEditedAt: now },
  })
  // 只回传本节段落：调用方用「本节新段落」替换「本节旧段落」
  return { paragraphs: paragraphs.filter((p) => p.section === section), section }
}

/**
 * 段落操作：重写 / 缩写 / 扩写 / 学术化改写 / 按用户自定义提示词改写。
 *
 * 修复的缺陷（测试反馈「选中段落操作点了没用」）：
 *  1. 前端把 `paraId` 写死成 'd2'、`action` 写死成 'rewrite' —— 四个按钮实际调用的是同一个请求；
 *  2. 前端丢掉返回值，正文从不更新；
 *  3. 方法章节（绑定分析产物）本不可修改，但服务端没有拦截；
 *  4. 不给用户任何写自定义提示词的入口。
 * 现在：按传入动作与段落执行，支持 `instruction` 自定义要求，并把改动写回该段并重算统计。
 */
export async function rewriteParagraph(projectId: string, paraId: string, action: string, instruction?: string) {
  const data = await getDoc(projectId)
  const paragraphs = (data.paragraphs as Array<{ paraId: string; text: string; kind?: string }>) ?? []
  const target = paragraphs.find((p) => p.paraId === paraId)
  if (!target) throw Errors.notFound('段落不存在')
  // 方法章节与项目内分析产物绑定，按产品约定不可改写（前端也置灰，这里再兜一层）
  if (target.kind === 'boundMethod') throw Errors.param('方法章节与项目内分析产物绑定，不可修改')

  const actionMap: Record<string, string> = {
    rewrite: '重写',
    shorten: '缩写',
    expand: '扩写',
    academic: '学术化改写',
    custom: '按自定义提示词改写',
  }
  const label = actionMap[action] ?? '改写'
  const extra = instruction?.trim()
  if (action === 'custom' && !extra) throw Errors.param('请先填写自定义提示词')

  const llm = await tryChatJSON<{ text: string }>(
    '你是学术润色助手。硬约束：仅改表达，不改论断，不新增事实；用户要求与硬约束冲突时以硬约束为准。只输出 JSON。',
    [`动作：${label}`, `原文：${target.text}`, extra ? `用户自定义要求：${extra}` : '', '返回 { "text": string }']
      .filter(Boolean)
      .join('\n'),
  )
  const text =
    llm?.text && String(llm.text).trim()
      ? String(llm.text)
      : extra
        ? `（${label}｜${extra}）${target.text}`
        : `（${label}）${target.text}`

  const updated = paragraphs.map((p) =>
    p.paraId === paraId ? { ...p, text, aiGenerated: true, traceLabel: 'AI 改写' } : p,
  )
  const wordCount = updated.reduce((n, p) => n + String(p.text ?? '').replace(/\s+/g, '').length, 0)
  const stats = (data.stats as Record<string, number>) ?? {}
  const now = new Date().toISOString()
  await setDoc(projectId, {
    ...data,
    paragraphs: updated,
    autoSavedAt: now,
    stats: { ...stats, wordCount, paragraphCount: updated.length, unsavedChanges: 0, lastEditedAt: now },
  })
  return { paraId, action, text }
}

export async function insertCitation(projectId: string, paperId: string, style: 'APA7' | 'GBT7714') {
  const paper = await prisma.litPaper.findFirst({ where: { projectId, paperId } })
  if (!paper) throw Errors.notFound('文献不存在')
  if (!paper.citable) throw Errors.param('未验证文献不可插入引用')

  const data = await getDoc(projectId)
  const citations = (data.citations as Array<Record<string, unknown>>) ?? []
  const exists = citations.find((c) => c.paperId === paperId)
  let index = citations.findIndex((c) => c.paperId === paperId) + 1
  if (!exists) {
    index = citations.length + 1
    citations.push({
      index,
      paperId,
      apaText: `${paper.authors} (${paper.year}). ${paper.title}. ${paper.journal}.`,
      gbText: `${paper.authors}. ${paper.title}[J]. ${paper.journal}, ${paper.year}.`,
    })
  }
  const stats = data.stats as Record<string, number>
  const styleSwitched = data.citationStyle !== style
  await setDoc(projectId, {
    ...data,
    citations,
    citationStyle: style,
    stats: { ...stats, citationCount: citations.length, unsavedChanges: (stats.unsavedChanges ?? 0) + 1 },
  })
  return { index, citationCount: citations.length, styleSwitched }
}

/** 切换引用样式：只重排已有引用，不新增条目（前端此前用假 paperId 插一条引用来触发切换） */
export async function switchCitationStyle(projectId: string, style: 'APA7' | 'GBT7714') {
  const data = await getDoc(projectId)
  const citations = (data.citations as Array<Record<string, unknown>>) ?? []
  await setDoc(projectId, {
    ...data,
    citationStyle: style,
    inTextStyle: style === 'APA7' ? '(作者, 年份)' : '[序号]',
  })
  return { style, citationCount: citations.length }
}

export async function adoptSuggestion(projectId: string, suggestionId: string) {
  const data = await getDoc(projectId)
  const suggestions = (data.aiSuggestions as Array<Record<string, unknown>>) ?? []
  const updated = suggestions.map((s) => (s.suggestionId === suggestionId ? { ...s, adopted: true } : s))
  await setDoc(projectId, { ...data, aiSuggestions: updated })
  return { suggestionId, adopted: true }
}

/** ---------- Zotero ---------- */

export async function getZoteroStatus(userId: string) {
  let z = await prisma.zoteroBinding.findUnique({ where: { userId } })
  if (!z) {
    z = await prisma.zoteroBinding.create({
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
  return { bound: z.bound, account: z.account, bidirectionalSync: z.bidirectionalSync, rateLimitText: z.rateLimitText, fallbackText: z.fallbackText }
}

export async function bindZotero(userId: string, bind: boolean, account?: string) {
  const z = await prisma.zoteroBinding.upsert({
    where: { userId },
    update: { bound: bind, account: bind ? account ?? 'chen@stu.example.edu.cn' : '', bidirectionalSync: bind },
    create: {
      userId,
      bound: bind,
      account: bind ? account ?? 'chen@stu.example.edu.cn' : '',
      bidirectionalSync: bind,
      rateLimitText: '写入 ≤ 50 条/请求；遇 Retry-After 自动退避并提示重新授权',
      fallbackText: '免授权兜底：导入 / 导出 .bib（Better BibTeX）',
    },
  })
  return { bound: z.bound, account: z.account, bidirectionalSync: z.bidirectionalSync, rateLimitText: z.rateLimitText, fallbackText: z.fallbackText }
}
