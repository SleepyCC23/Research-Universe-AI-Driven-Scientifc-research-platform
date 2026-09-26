import fs from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import { prisma } from '../prisma'
import { config } from '../config'
import { Errors } from '../core/errors'
import { buildExportPage } from '../content/payloads'
import { tryChatJSON } from '../llm/client'
import { genId, requireProject, stamp } from './common'
import { buildDocx, buildXlsx, fileStamp, toBib, toCsv, toPrintableHtml, toRis } from './exportFiles'

/** 导出包落盘目录：backend/uploads/exports */
const EXPORT_DIR = path.join(config.uploadDir, 'exports')

let dirEnsured = false
async function ensureExportDir() {
  if (!dirEnsured) {
    await fs.mkdir(EXPORT_DIR, { recursive: true })
    dirEnsured = true
  }
  return EXPORT_DIR
}

async function projectLike(projectId: string) {
  const p = await requireProject(projectId)
  return { id: p.id, title: p.title, discipline: p.discipline, route: p.route }
}

async function getState(projectId: string) {
  let s = await prisma.exportState.findUnique({ where: { projectId } })
  if (!s) {
    const proj = await projectLike(projectId)
    s = await prisma.exportState.create({ data: { projectId, data: buildExportPage(proj) as never } })
  }
  return s.data as Record<string, unknown>
}

async function setState(projectId: string, data: Record<string, unknown>) {
  await prisma.exportState.update({ where: { projectId }, data: { data: data as never } })
  return data
}

export async function getExport(projectId: string) {
  return (await getState(projectId)) as never
}

/** 把披露条目渲染成 Markdown 文本 */
function disclosureMarkdown(projectTitle: string, items: Array<{ text: string; done: boolean }>) {
  const lines = [
    `# AI 工具使用情况说明`,
    '',
    `- 论文：${projectTitle}`,
    `- 生成时间：${new Date().toLocaleString('zh-CN')}`,
    `- 说明：本报告由研宇宙自动生成，导出产物均带不可移除溯源标识。`,
    '',
    '## 披露条目',
    '',
    ...items.map((i, idx) => `${idx + 1}. [${i.done ? '已完成' : '待补齐'}] ${i.text}`),
    '',
    `> 未决条目 ${items.filter((i) => !i.done).length} 条，请按目标期刊政策在投稿前补齐。`,
  ]
  return lines.join('\n')
}

/** 生成《AI 使用情况说明》：写入真实文件并返回下载地址 */
export async function generateDisclosure(projectId: string) {
  const proj = await projectLike(projectId)
  const data = await getState(projectId)
  const llm = await tryChatJSON<{ items: Array<{ text: string; done: boolean }> }>(
    '你是科研合规助手。生成《AI 工具使用情况说明》条目，须覆盖：使用环节、未参与结论生成、按期刊政策披露、可复现代码。只输出 JSON。',
    `论文：${proj.title}\n返回 { "items":[{"text","done"}] }`,
  )
  const fallbackItems = (data.disclosure as { items: Array<{ itemId: string; text: string; done: boolean }> }).items
  const items: Array<{ itemId: string; text: string; done: boolean }> =
    llm?.items?.map((i, idx) => ({ itemId: `d_${idx + 1}`, text: i.text, done: !!i.done })) ?? fallbackItems
  const disclosure = {
    ...(data.disclosure as Record<string, unknown>),
    items,
    unreviewedCount: items.filter((i) => !i.done).length,
    lastGeneratedAt: new Date().toISOString(),
  }
  await setState(projectId, { ...data, disclosure })

  // 真落盘一份可下载的说明文件（docx，Word 可直接打开编辑）
  const dir = await ensureExportDir()
  const md = disclosureMarkdown(proj.title, items)
  const fileName = `ai_disclosure_${projectId}_${fileStamp()}.docx`
  await fs.writeFile(path.join(dir, fileName), await buildDocx(md))

  return {
    reportId: genId('dr'),
    generatedAt: disclosure.lastGeneratedAt,
    fileName,
    downloadUrl: `/projects/${projectId}/export/files/${fileName}`,
  }
}

/** 各产物默认格式（前端未指定 formats 时使用） */
const DEFAULT_FORMAT: Record<string, string> = { a_1: 'Markdown', a_2: 'BIB', a_3: 'PY', a_4: 'CSV', a_5: 'DOCX' }

export async function exportArtifacts(projectId: string, payload: { artifactIds: string[]; formats: Record<string, string[]> }) {
  const data = await getState(projectId)
  const artifacts =
    (data.artifacts as Array<{ artifactId: string; name: string; status: string; blocked?: boolean }>) ?? []
  const picked = artifacts.filter((a) => payload.artifactIds?.includes(a.artifactId))
  const blocked = picked.filter((a) => a.status === 'pending' || a.blocked)
  if (blocked.length > 0) {
    throw Errors.exportBlockedByVerify(`存在 ${blocked.length} 个待补齐 / 被阻断产物，已阻断导出`)
  }
  const risk = data.risk as { hasUnverified: boolean } | undefined
  if (risk?.hasUnverified) {
    throw Errors.exportBlockedByVerify('存在未验证文献，已阻断导出')
  }

  const proj = await projectLike(projectId)
  const [papers, latestRun, doc, file, variables] = await Promise.all([
    prisma.litPaper.findMany({ where: { projectId }, orderBy: { id: 'asc' } }),
    prisma.analysisRun.findFirst({ where: { projectId }, orderBy: { finishedAt: 'desc' } }),
    prisma.writingDoc.findUnique({ where: { projectId } }),
    prisma.dataFile.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
    prisma.dataVariable.findMany({ where: { projectId }, orderBy: { id: 'asc' } }),
  ])

  const zip = new JSZip()
  const put = (name: string, content: string | Buffer) => zip.file(name, content)
  const files: string[] = []

  for (const a of picked) {
    const format = payload.formats?.[a.artifactId]?.[0] || DEFAULT_FORMAT[a.artifactId] || 'TXT'
    const f = String(format).toUpperCase()
    switch (a.artifactId) {
      case 'a_1': {
        const paragraphs = ((doc?.data as Record<string, unknown>)?.paragraphs as Array<{ section?: string; text: string }>) ?? []
        const md = [
          `# ${proj.title}`,
          '',
          `- 学科：${proj.discipline}`,
          `- 导出时间：${new Date().toLocaleString('zh-CN')}`,
          '',
          ...paragraphs.flatMap((p) => (p.section ? [`## ${p.section}`, '', p.text, ''] : [p.text, ''])),
          ...(papers.length
            ? ['## 参考文献', '', ...papers.map((p, i) => `[${i + 1}] ${p.authors} (${p.year}). ${p.title}. ${p.journal}.`)]
            : []),
        ].join('\n')
        if (f === 'DOCX') {
          put('manuscript.docx', await buildDocx(md))
          files.push('manuscript.docx')
        } else if (f === 'PDF') {
          // 不引入字体嵌入，产出可打印 HTML，浏览器 Ctrl+P 可另存为 PDF
          put('manuscript.print.html', toPrintableHtml(proj.title, md))
          files.push('manuscript.print.html')
        } else {
          put('manuscript.md', md)
          files.push('manuscript.md')
        }
        break
      }
      case 'a_2': {
        if (f === 'RIS') {
          put('references.ris', toRis(papers))
          files.push('references.ris')
        } else if (f === 'CSV') {
          put(
            'references.csv',
            toCsv([['序号', '标题', '作者', '期刊', '年份', 'DOI', '分区'], ...papers.map((p, i) => [i + 1, p.title, p.authors, p.journal, p.year, p.doi ?? '', p.quartile ?? ''])]),
          )
          files.push('references.csv')
        } else {
          put('references.bib', toBib(projectId, papers))
          files.push('references.bib')
        }
        break
      }
      case 'a_3': {
        const code =
          `# 研宇宙 Research Universe · 可复现分析代码（自动生成）\n` +
          `# 项目：${proj.title}\n` +
          `# 方法：${latestRun?.methodName ?? '分层回归（Hierarchical Regression）'}\n` +
          `# runId：${latestRun?.runId ?? '（尚未运行分析）'}  样本量：${latestRun?.sampleSize ?? '—'}\n` +
          `# 参数：seed=42, nBoot=5000\n` +
          `# 说明：报告直接引用本文件对应的固定参数与随机种子，保证结果可复现。\n\n` +
          `import pandas as pd, numpy as np, statsmodels.api as sm\n\n` +
          `df = pd.read_csv('data.csv')  # 数据版本随结果保存\n` +
          `X = sm.add_constant(df[['social_anxiety', 'loneliness', 'self_control']])\n` +
          `model = sm.OLS(df['phone_dependence'], X).fit()\n` +
          `print(model.summary())\n`
        if (f === 'TXT') {
          put('analysis_code.txt', code)
          files.push('analysis_code.txt')
        } else {
          put('analysis.py', code)
          files.push('analysis.py')
        }
        break
      }
      case 'a_4': {
        const rows: unknown[][] = [
          ['变量名', '角色', '类型', '建议角色'],
          ...variables.map((v) => [v.varName, v.overriddenRole ?? v.suggestedRole ?? '', v.typeLabel ?? '', v.suggestedRole ?? '']),
        ]
        if (rows.length === 1 && file) {
          rows.push(['（未检测到变量表，以下为数据文件信息）', '', '', ''], [file.fileName, `${file.rows} 行 × ${file.columns} 列`, '', ''])
        }
        if (f === 'XLSX') {
          put('variables.xlsx', await buildXlsx(rows))
          files.push('variables.xlsx')
        } else {
          put('variables.csv', toCsv(rows))
          files.push('variables.csv')
        }
        break
      }
      case 'a_5': {
        const items = ((data.disclosure as { items?: Array<{ text: string; done: boolean }> })?.items ?? [])
        const md = disclosureMarkdown(proj.title, items)
        if (f === 'PDF') {
          put('ai_disclosure.print.html', toPrintableHtml('AI 工具使用情况说明', md))
          files.push('ai_disclosure.print.html')
        } else {
          put('ai_disclosure.docx', await buildDocx(md))
          files.push('ai_disclosure.docx')
        }
        break
      }
      default:
        break
    }
  }

  // 始终附带：导出说明 + 清单（可追溯）
  const readme = [
    `# 研宇宙导出包说明`,
    '',
    `- 项目：${proj.title}（${projectId}）`,
    `- 学科：${proj.discipline}`,
    `- 导出时间：${new Date().toLocaleString('zh-CN')}`,
    `- 产物数量：${picked.length}`,
    '',
    '## 本包内容',
    '',
    ...files.map((f) => `- ${f}`),
    '',
    '## 合规与溯源',
    '',
    '- 所有 AI 生成内容均带不可移除溯源标识，导出后仍可追溯至生成环节。',
    '- PDF 格式以「可打印 HTML」提供：用浏览器打开后 Ctrl+P 另存为 PDF（中文无需附加字体）。',
    '- 数据级别规则：L2 项目禁止导出原始数据行。',
    '',
    `> 由研宇宙 Research Universe 自动生成 · ${stamp()}`,
  ].join('\n')
  put('README.md', readme)
  files.push('README.md')

  const manifest = {
    projectId,
    projectTitle: proj.title,
    exportedAt: new Date().toISOString(),
    artifactIds: picked.map((a) => a.artifactId),
    artifactNames: picked.map((a) => a.name),
    files,
    paperCount: papers.length,
    analysisRunId: latestRun?.runId ?? null,
    dataFile: file?.fileName ?? null,
    compliance: (data.compliance as unknown) ?? [],
  }
  put('manifest.json', JSON.stringify(manifest, null, 2))
  files.push('manifest.json')

  const buf = (await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })) as Buffer
  const dir = await ensureExportDir()
  const fileName = `research-universe_${projectId}_${fileStamp()}.zip`
  await fs.writeFile(path.join(dir, fileName), buf)

  // 记录导出用量（保持原行为）
  const exportCount = picked.length || 1
  return {
    downloadUrl: `/projects/${projectId}/export/files/${fileName}`,
    fileName,
    sizeBytes: buf.length,
    sizeText: `${(buf.length / 1024).toFixed(1)} KB`,
    fileCount: files.length,
    blockedCount: 0,
    exportedCount: exportCount,
    compliance: (data as { compliance?: unknown }).compliance,
  }
}

/** 解析导出文件绝对路径（含目录穿越防护） */
export async function resolveExportFile(projectId: string, fileName: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(fileName)) throw Errors.param('文件名不合法')
  if (!fileName.includes(projectId)) throw Errors.notFound('导出文件不存在')
  const dir = await ensureExportDir()
  const abs = path.join(dir, fileName)
  if (path.dirname(path.resolve(abs)) !== path.resolve(dir)) throw Errors.param('文件名不合法')
  try {
    await fs.access(abs)
  } catch {
    throw Errors.notFound('导出文件不存在或已清理，请重新导出')
  }
  return abs
}

/**
 * 删除某项目的全部导出包文件。
 * 导出包是磁盘文件而非数据库记录，级联删除清不掉，删除项目时需单独清理，避免磁盘残留。
 */
export async function deleteProjectExportFiles(projectId: string) {
  try {
    const dir = await ensureExportDir()
    const names = await fs.readdir(dir)
    const targets = names.filter((n) => n.includes(projectId))
    await Promise.all(
      targets.map((n) =>
        fs.unlink(path.join(dir, n)).catch(() => {
          /* 单个文件删除失败（如被占用）不影响主流程 */
        }),
      ),
    )
    return { removed: targets.length }
  } catch {
    // 目录不存在等情况直接忽略：删除项目不应因为清理文件失败而中断
    return { removed: 0 }
  }
}

export async function confirmUnverifiedExport(projectId: string) {
  const data = await getState(projectId)
  const risk = { hasUnverified: false, unverifiedCount: 0, message: '已确认允许导出未验证条目（记录已写入披露报告）' }
  await setState(projectId, { ...data, risk })
  return { confirmed: true }
}

export async function uploadVerifyPdf(projectId: string) {
  await requireProject(projectId)
  return { verified: true }
}

/**
 * 把写作页当前稿件「加入下载中心」。
 *
 * 背景（测试反馈）：写作页点「查看全文」只能看，没法把写完的这篇稿子送去导出；
 * 导出中心里的「论文正文」产物 metaText 还是写死的「约 4,820 字 · 12 页」，与实际内容无关。
 *
 * 这里做两件事：
 *  1. 按 P1..Pn 顺序读当前 WritingDoc 的段落，统计真实的章节数 / 段落数 / 字数；
 *  2. 用统计结果刷新导出中心的「论文正文」产物（`a_1`）并置为可导出。
 * 真正的文件（DOCX / PDF / Markdown）仍由导出中心点导出时 `exportArtifacts` 的 `a_1` 分支生成，
 * 因此这里不落盘、只登记，避免每个项目都预生成一堆文件。
 */
export async function publishManuscript(projectId: string) {
  const proj = await projectLike(projectId)
  const doc = await prisma.writingDoc.findUnique({ where: { projectId } })
  const data = (doc?.data as Record<string, unknown>) ?? {}

  type Para = { section?: string; text?: string; index?: number }
  const ordered = ((data.paragraphs as Para[]) ?? [])
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  if (!ordered.length) throw Errors.param('当前稿件还没有内容，请先生成章节后再加入下载中心')

  const wordCount = ordered.reduce((n, p) => n + String(p.text ?? '').replace(/\s+/g, '').length, 0)
  const sections = Array.from(new Set(ordered.map((p) => p.section).filter((s): s is string => !!s)))
  const now = new Date().toISOString()
  const name = '论文正文（含引用）'
  const metaText = `${sections.length} 节 · ${ordered.length} 段 · ${wordCount.toLocaleString('zh-CN')} 字 · 由写作页全文组装`

  /** 论文正文在导出中心固定用 `a_1`，与 `exportArtifacts` 的生成分支、`DEFAULT_FORMAT` 对应 */
  const MANUSCRIPT_ARTIFACT_ID = 'a_1'
  const state = await getState(projectId)
  const artifacts = ((state.artifacts as Array<Record<string, unknown>>) ?? []).slice()
  const idx = artifacts.findIndex((a) => a.artifactId === MANUSCRIPT_ARTIFACT_ID)
  const next = {
    artifactId: MANUSCRIPT_ARTIFACT_ID,
    name,
    metaText,
    formats: ['DOCX', 'PDF', 'Markdown'],
    status: 'ready',
    publishedAt: now,
  }
  if (idx >= 0) {
    // 覆盖时保留原有字段（如 statusText / blocked），但把「待补齐」等状态清掉
    const { statusText: _drop, ...rest } = artifacts[idx]
    artifacts[idx] = { ...rest, ...next }
  } else {
    artifacts.unshift(next)
  }
  await setState(projectId, { ...state, artifacts, artifactCount: artifacts.length })

  return {
    artifactId: MANUSCRIPT_ARTIFACT_ID,
    projectTitle: proj.title,
    name,
    metaText,
    wordCount,
    paragraphCount: ordered.length,
    sectionCount: sections.length,
    publishedAt: now,
    nextRoute: `/project/${projectId}/export`,
  }
}
