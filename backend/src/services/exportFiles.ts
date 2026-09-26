/**
 * 导出包文件生成器
 * ------------------------------------------------------------
 * 负责把项目里的真实数据（文献、分析结果、正文、变量表、AI 披露）
 * 渲染成各种格式的**真实文件内容**，供 export.service 打成 zip 下载。
 *
 * 格式支持：
 *  - 纯文本类：Markdown / BIB / RIS / CSV / PY / TXT —— 直接生成
 *  - DOCX / XLSX：生成符合 OOXML 的最小合法文件（zip + XML），Word / Excel 可直接打开
 *  - PDF：不引入字体与二进制生成库，改产出「可打印 HTML」，浏览器打开后 Ctrl+P 可另存为 PDF
 */

/** XML 文本转义 */
export function xmlEscape(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** CSV 单元格转义（RFC 4180） */
export function csvCell(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: unknown[][]): string {
  // BOM：让 Excel 正确识别 UTF-8 中文
  return '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export interface PaperLike {
  paperId: string
  title: string
  authors: string
  journal: string
  year: number
  doi?: string | null
  quartile?: string
}

/** 参考文献 → BibTeX */
export function toBib(projectId: string, papers: PaperLike[]): string {
  const lines: string[] = [`% 研宇宙 Research Universe · 参考文献（BibTeX）`, `% 项目：${projectId}`, '']
  papers.forEach((p, i) => {
    const key = (p.authors.split(',')[0] || 'ref').replace(/[^A-Za-z]/g, '') + (p.year ?? '') + '_' + (i + 1)
    lines.push(`@article{${key},`)
    lines.push(`  title   = {${p.title}},`)
    lines.push(`  author  = {${p.authors}},`)
    lines.push(`  journal = {${p.journal}},`)
    lines.push(`  year    = {${p.year}},`)
    if (p.doi) lines.push(`  doi     = {${p.doi}},`)
    lines.push('}', '')
  })
  return lines.join('\n')
}

/** 参考文献 → RIS */
export function toRis(papers: PaperLike[]): string {
  return papers
    .map((p) =>
      [
        'TY  - JOUR',
        `TI  - ${p.title}`,
        ...p.authors.split(/,\s*&?\s*/).filter(Boolean).map((a) => `AU  - ${a.trim()}`),
        `JO  - ${p.journal}`,
        `PY  - ${p.year}`,
        ...(p.doi ? [`DO  - ${p.doi}`] : []),
        'ER  - ',
      ].join('\n'),
    )
    .join('\n\n')
}

/* ============================================================
 * 最小合法 OOXML（DOCX / XLSX）生成
 * ========================================================== */

const CONTENT_TYPES_DOCX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

const ROOT_RELS_DOCX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

/** 把纯文本（按行）转成 Word 段落 XML */
function docxParagraphs(text: string): string {
  const lines = text.split(/\r?\n/)
  return lines
    .map((line) => {
      const t = xmlEscape(line)
      const bold = /^#{1,3}\s/.test(line)
      const content = bold ? line.replace(/^#{1,3}\s/, '') : line
      return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr>${bold ? '<w:b/><w:sz w:val="28"/>' : ''}</w:rPr><w:t xml:space="preserve">${xmlEscape(content)}</w:t></w:r></w:p>`
    })
    .join('')
}

const CONTENT_TYPES_XLSX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`

const ROOT_RELS_XLSX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const WORKBOOK_XLSX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

const WORKBOOK_RELS_XLSX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`

function sheetXml(rows: unknown[][]): string {
  const body = rows
    .map(
      (row, r) =>
        `<row r="${r + 1}">` +
        row
          .map((cell, c) => {
            const ref = `${colName(c)}${r + 1}`
            const isNum = typeof cell === 'number' && Number.isFinite(cell)
            return isNum
              ? `<c r="${ref}"><v>${cell}</v></c>`
              : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(cell ?? ''))}</t></is></c>`
          })
          .join('') +
        '</row>',
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`
}

function colName(i: number): string {
  let s = ''
  let n = i
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

/** 生成最小合法 .docx（Buffer） */
export async function buildDocx(text: string): Promise<Buffer> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  zip.file('[Content_Types].xml', CONTENT_TYPES_DOCX)
  zip.folder('_rels')!.file('.rels', ROOT_RELS_DOCX)
  zip
    .folder('word')!
    .file(
      'document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${docxParagraphs(text)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`,
    )
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

/** 生成最小合法 .xlsx（Buffer） */
export async function buildXlsx(rows: unknown[][]): Promise<Buffer> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  zip.file('[Content_Types].xml', CONTENT_TYPES_XLSX)
  zip.folder('_rels')!.file('.rels', ROOT_RELS_XLSX)
  const xl = zip.folder('xl')!
  xl.file('workbook.xml', WORKBOOK_XLSX)
  xl.folder('_rels')!.file('workbook.xml.rels', WORKBOOK_RELS_XLSX)
  xl.folder('worksheets')!.file('sheet1.xml', sheetXml(rows))
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

/** PDF 的替代品：可打印 HTML（浏览器打开后 Ctrl+P 另存为 PDF，中文无需嵌字体） */
export function toPrintableHtml(title: string, markdownLike: string): string {
  const body = markdownLike
    .split(/\r?\n/)
    .map((line) => {
      if (/^#{1,3}\s/.test(line)) return `<h2>${xmlEscape(line.replace(/^#{1,3}\s/, ''))}</h2>`
      if (!line.trim()) return ''
      return `<p>${xmlEscape(line)}</p>`
    })
    .join('\n')
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${xmlEscape(title)}</title>
<style>body{font-family:"Songti SC","SimSun",serif;max-width:800px;margin:40px auto;line-height:1.8;color:#111}
h2{font-family:"Heiti SC","SimHei",sans-serif;font-size:16pt;margin:24px 0 8px}
p{margin:0 0 10px}@media print{body{margin:0}}</style></head>
<body>${body}</body></html>`
}

/** 时间戳：用于文件名，避免覆盖 */
export function fileStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}
