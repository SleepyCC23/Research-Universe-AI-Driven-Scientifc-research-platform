/**
 * 逐页变量总表生成器
 * ==========================================================
 * 用途：交接给另一位开发时，把「每个页面用了哪些接口 / 什么载荷类型 / 哪些全局状态」
 * 从源码里**机械提取**出来，避免手写清单漏页漏字段。
 *
 * 运行：node tools/gen-variable-map.js
 * 产出：research-universe/docs/VARIABLES-FULL.md
 *
 * 提取规则（确定性，不依赖人工判断）：
 *   接口   ：页面里出现的 `api.xxx(` → 反查 endpoints.ts 的 ENDPOINT_REGISTRY 得到真实路径
 *   载荷   ：`useState<XxxPageData | null>` 里的类型名
 *   状态   ：`useXxxStore(` 
 *   直连Mock：`from '@/mocks/db'`（交接时需重点确认是否属于「静态文案」豁免清单）
 *   无接口 ：整页没有 `api.` 调用 → 列为「待确认：是否遗漏接口」
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'research-universe', 'src')
const OUT = path.join(__dirname, '..', 'research-universe', 'docs', 'VARIABLES-FULL.md')

/* ---------- 1. 读接口清单 ---------- */
const epsSrc = fs.readFileSync(path.join(SRC, 'api', 'endpoints.ts'), 'utf8')
const regBody = epsSrc.slice(epsSrc.indexOf('export const ENDPOINT_REGISTRY'))
const registry = {}
for (const m of regBody.matchAll(/^\s{2}(\w+):\s*'([^']+)'/gm)) registry[m[1]] = m[2]

/* ---------- 2. 逐页扫描 ---------- */
const pagesDir = path.join(SRC, 'pages')
const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.tsx')).sort()

const rows = []
for (const f of files) {
  const s = fs.readFileSync(path.join(pagesDir, f), 'utf8')
  const fns = [...new Set([...s.matchAll(/api\.(\w+)\(/g)].map((m) => m[1]))].sort()
  const types = [
    ...new Set([...s.matchAll(/useState<(\w+)(?:PageData)?\s*\|/g)].map((m) => m[1])),
    ...new Set([...s.matchAll(/:\s*(\w+PageData)\b/g)].map((m) => m[1])),
  ].sort()
  const stores = [...new Set([...s.matchAll(/\buse(\w+)Store\(/g)].map((m) => 'use' + m[1] + 'Store'))].sort()
  const mocks = /from '@\/mocks\/db'/.test(s)
  rows.push({ f, fns, types, stores, mocks })
}

/* ---------- 3. 全量扫描：接口是否在「任何地方」被调用（含 components / hooks / store） ---------- */
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.tsx?$/.test(e.name)) acc.push(p)
  }
  return acc
}
const calledAnywhere = new Set()
for (const f of walk(SRC)) {
  const s = fs.readFileSync(f, 'utf8')
  for (const m of s.matchAll(/api\.(\w+)\(/g)) calledAnywhere.add(m[1])
}
/** 真正「没有任何地方调用」——交接时必须逐条确认是预留还是漏接 */
const neverCalled = Object.keys(registry).filter((k) => !calledAnywhere.has(k)).sort()
const usedFns = new Set(rows.flatMap((r) => r.fns))
/** 页面里没调、但有组件/钩子在调（正常，说明数据由公共组件或钩子取） */
const calledOutsidePages = Object.keys(registry)
  .filter((k) => calledAnywhere.has(k) && !usedFns.has(k))
  .sort()

/* ---------- 4. 生成 Markdown ---------- */
const unusedFns = neverCalled
const noApi = rows.filter((r) => r.fns.length === 0)
const mockPages = rows.filter((r) => r.mocks)

let md = `# 逐页变量总表（机械提取，防遗漏）

> 生成方式：\`node tools/gen-variable-map.js\` —— 从源码提取，**不是手写清单**，所以不会漏页。
> 用途：交接另一位开发时，逐页确认「数据从哪来、载荷长什么样、状态放哪」。
> 配套文档：\`docs/API.md\`（接口契约）、\`docs/VARIABLES.md\`（字段中文名与枚举）、
> \`backend-readiness.md\`（后端待补清单）、\`docs/COPY-SPEC.md\`（文案规范）。

## 一、汇总

| 指标 | 数量 |
| --- | --- |
| 页面文件 | ${rows.length} |
| 已登记接口 | ${Object.keys(registry).length} |
| 页面已调用的接口 | ${usedFns.size} |
| **未在任何页面调用的接口** | ${unusedFns.length} |
| 整页没有调接口的页面（需确认是否遗漏） | ${noApi.length} |
| 从 \`@/mocks/db\` 直连静态文案的页面 | ${mockPages.length} |

## 二、逐页清单

| 页面文件 | 调用的接口（真实路径） | 载荷类型 | 全局状态 |
| --- | --- | --- | --- |
`
for (const r of rows) {
  const api2 = r.fns.length
    ? r.fns.map((fn) => `\`${registry[fn] ?? fn}\``).join('<br>')
    : '**（无）**'
  md += `| \`pages/${r.f}\` | ${api2} | ${r.types.map((t) => '`' + t + '`').join(' ') || '—'} | ${r.stores.map((t) => '`' + t + '`').join(' ') || '—'} |\n`
}

md += `
## 三、需要人工确认的三张清单

### 3.1 整页没有调接口的页面（防遗漏）
${noApi.length ? noApi.map((r) => `- \`pages/${r.f}\``).join('\n') : '- 无'}

> 判定口径：这些页面若确实只做展示且数据来自父级/路由，属正常；
> 若应展示业务数据却没有任何 \`api.\` 调用，说明**变量没接上**，需要补接口。

### 3.2 从 \`@/mocks/db\` 直连的页面（应仅限静态文案）
${mockPages.length ? mockPages.map((r) => `- \`pages/${r.f}\``).join('\n') : '- 无'}

> 合规要求：页面只允许取**静态文案/枚举字典**，业务数据一律走接口层。
> 交接时请逐个确认这些 import 的符号确实是文案，不是业务数据。

### 3.3 全站无调用的接口（需逐条确认：预留 or 漏接）
${unusedFns.length ? unusedFns.map((k) => `- \`${registry[k]}\`（\`${k}\`）`).join('\n') : '- 无'}

> 这是**扫过 src 全量文件**（pages + components + hooks + store）后的结果，可信度高于只看页面。
> 若某接口出现在这里：要么是设计稿里有但还没做的功能（预留），要么是**应调未调的漏洞**，请逐条判定。

### 3.4 页面里没调、但由公共组件/钩子调用的接口（正常）
${calledOutsidePages.length ? calledOutsidePages.map((k) => `- \`${registry[k]}\`（\`${k}\`）`).join('\n') : '- 无'}

> 典型：顶栏/侧边栏取通知与额度、全局任务弹窗轮询任务、步骤草稿钩子（src/hooks/useStepDraft.ts）。

## 四、接口总表（${Object.keys(registry).length} 个）

| 函数 | 路径 |
| --- | --- |
${Object.keys(registry)
  .sort()
  .map((k) => `| \`${k}\` | \`${registry[k]}\` |`)
  .join('\n')}

---

## 五、交接阅读顺序建议

1. \`README.md\` —— 环境、依赖、启动命令；
2. 本文件 —— 逐页变量总表（先建立全局印象）；
3. \`docs/API.md\` —— 逐个接口的入参/出参契约；
4. \`docs/VARIABLES.md\` —— 字段的中文名、枚举值、命名对照；
5. \`backend-readiness.md\` —— 后端**尚未提供**的接口与变量清单（开工前先看这份）；
6. \`docs/COPY-SPEC.md\` / \`design-review.md\` —— 文案规范与已知设计问题清单。
`

fs.writeFileSync(OUT, md, 'utf8')
console.log(`页面 ${rows.length} 个；接口 ${Object.keys(registry).length} 个；未调用接口 ${unusedFns.length} 个；无接口页面 ${noApi.length} 个；直连 Mock 页面 ${mockPages.length} 个`)
console.log('无接口页面：' + (noApi.map((r) => r.f).join(', ') || '无'))
console.log('已写入 ' + OUT)
