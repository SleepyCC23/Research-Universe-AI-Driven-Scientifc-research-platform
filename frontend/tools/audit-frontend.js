/**
 * 前端缺陷与「未接线变量」静态扫描
 * 输出全部为 ASCII 头部 + 原文，便于在任意终端阅读。
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'research-universe', 'src')
const read = (p) => fs.readFileSync(p, 'utf8')
const walk = (dir, out = []) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(f)) out.push(p)
  }
  return out
}
const files = walk(SRC)
const rel = (p) => path.relative(SRC, p).replace(/\\/g, '/')
const pages = files.filter((f) => rel(f).startsWith('pages/'))

const report = (title, rows) => {
  console.log(`\n===== ${title} (${rows.length}) =====`)
  rows.slice(0, 40).forEach((r) => console.log(r))
  if (rows.length > 40) console.log(`... and ${rows.length - 40} more`)
}

/* 1. Zustand getState() 误用（不订阅，点了不重渲染） */
const getState = []
for (const f of files) {
  read(f)
    .split('\n')
    .forEach((line, i) => {
      if (line.includes('.getState()') && !rel(f).includes('store/index.ts')) {
        getState.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 100)}`)
      }
    })
}
report('A. useStore.getState() usage outside store (should subscribe)', getState)

/* 2. onClick 只弹 Toast（动作未接线，用户会认为「点了没用」） */
const toastOnly = []
for (const f of files) {
  const txt = read(f)
  txt.split('\n').forEach((line, i) => {
    if (/onClick=\{\(\)\s*=>\s*pushToast/.test(line)) toastOnly.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 110)}`)
  })
}
report('B. onClick handler that only shows a toast (not wired to API)', toastOnly)

/* 3. 页面里写死「距 N 天 / N 天后」这类派生值（应来自 schedule.ts） */
const hardDays = []
for (const f of pages) {
  const txt = read(f)
  txt.split('\n').forEach((line, i) => {
    if (/(距[^']{0,12}\d+\s*天|\d+\s*天后)/.test(line) && !line.includes('daysLeft') && !line.trim().startsWith('*')) {
      hardDays.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 110)}`)
    }
  })
}
report('C. hardcoded "N days" literals in pages (should derive from schedule)', hardDays)

/* 4. 页面有 fetch 但缺错误分支（接口失败会白屏） */
const noError = []
for (const f of pages) {
  const txt = read(f)
  if (!/api\.fetch|api\.\w+\(/.test(txt)) continue
  const hasErrorState = /setError\(/.test(txt)
  const hasErrorRender = /ErrorState/.test(txt)
  if (!hasErrorState || !hasErrorRender) {
    noError.push(`${rel(f).padEnd(28)} setError=${hasErrorState}  ErrorState=${hasErrorRender}`)
  }
}
report('D. page fetches data but lacks error branch', noError)

/* 5. 路由可达性：router 声明的 path vs 页面里 navigate/to 的目标 */
const router = read(path.join(SRC, 'router.tsx'))
const declared = [...router.matchAll(/path="([^"]+)"/g)].map((m) => m[1])
const navs = new Map()
for (const f of files) {
  const txt = read(f)
  for (const m of txt.matchAll(/navigate\(\s*[`'"]([^`'"]+)[`'"]/g)) {
    if (!navs.has(m[1])) navs.set(m[1], rel(f))
  }
  for (const m of txt.matchAll(/to="([^"]+)"/g)) {
    if (!navs.has(m[1])) navs.set(m[1], rel(f))
  }
}
const unreachable = []
for (const [target, from] of navs) {
  const norm = target.split('?')[0]
  const ok = declared.some((d) => {
    const rx = new RegExp('^' + d.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/') + '$')
    return rx.test(norm) || norm.startsWith(d.replace(/:[^/]+$/, ''))
  })
  if (!ok) unreachable.push(`${from.padEnd(28)} -> ${target}`)
}
report('E. navigation targets not found in router.tsx', unreachable)

/* 6. 页面调用了 api.* 但 endpoints.ts 未导出 */
const ep = read(path.join(SRC, 'api', 'endpoints.ts'))
const exported = new Set([...ep.matchAll(/export (?:async )?function (\w+)/g)].map((m) => m[1]))
const missing = []
for (const f of files) {
  for (const m of read(f).matchAll(/\bapi\.(\w+)\(/g)) {
    if (!exported.has(m[1])) missing.push(`${rel(f).padEnd(28)} api.${m[1]}()`)
  }
}
report('F. api.* used by pages but not exported by endpoints.ts', [...new Set(missing)])

/* 7. 交互元素缺少可访问名称 / 无 onClick
 * 说明：按 **JSX 块**（<button … / >）整体判断，避免「onClick 写在下一行」造成假阳性。 */
const a11y = []
for (const f of files) {
  const txt = read(f)
  const lines = txt.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!/<button\b/.test(lines[i])) continue
    // 收集到本标签结束（含多行属性），最多看 8 行
    let block = ''
    for (let j = i; j < Math.min(i + 8, lines.length); j++) {
      block += lines[j] + '\n'
      if (/>/.test(lines[j]) || /^\s*\/>/.test(lines[j])) break
    }
    const hasClick = /onClick=|onMouseDown=|onKeyDown=|type="submit"|disabled/.test(block)
    const hasName = /aria-label=|title=/.test(block) || /<\/?[A-Z][\w]*/.test(lines[i + 1] || '')
    if (!hasClick) a11y.push(`${rel(f)}:${i + 1}  [no handler] ${lines[i].trim().slice(0, 96)}`)
    else if (!hasName) a11y.push(`${rel(f)}:${i + 1}  [no a11y name] ${lines[i].trim().slice(0, 96)}`)
  }
}
report('G. <button> missing onClick / accessible name (block-scoped)', a11y)

/* 8. 遗留占位 */
const todo = []
for (const f of files) {
  read(f)
    .split('\n')
    .forEach((line, i) => {
      if (/TODO|FIXME|待补|占位|placeholder 待/.test(line) && !line.trim().startsWith('*')) {
        todo.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 110)}`)
      }
    })
}
report('H. TODO / placeholder markers', todo)

console.log('\nSCAN_DONE')
