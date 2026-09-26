/**
 * 登录页左栏的引文网络背景层。
 *
 * 主题：鼠标在文献网络里溯源。
 * - 节点大小 = 被引次数（枢纽节点更大、带引文环），连线为引用关系
 * - 连线上始终有流动的拖尾光点，节点各自漂移 —— 没人操作时整张网一直在动
 * - 光标处只有一团柔和渐变光斑（无圆圈、无准星）；靠近的节点被推开
 * - 以离光标最近的节点为起点，沿引用关系逐层点亮（一级亮、二级略暗），像追踪引文链
 * - 光标停住一会儿后，光斑自己沿路径巡游，左栏不会静止下来
 *
 * 纯装饰层：aria-hidden，pointer-events 交还给内容。
 */
import { useEffect, useRef } from 'react'

interface RNode {
  hx: number
  hy: number
  x: number
  y: number
  r: number
  phase: number
  amp: number
  born: number
  chain: number
  /** 落在文案区的节点压暗：网络穿过内容层，但不抢字 */
  dim: number
  /** 高被引枢纽：带引文圈，作为画面锚点 */
  hub: boolean
}

interface RLink {
  a: number
  b: number
  born: number
  flow: number
  /** 引用流向的移动速度倍率：每条线略不同，避免整齐划一 */
  speed: number
}

/** 溯源点亮半径 */
const LIGHT_R = 250
/** 光标光斑的视觉半径：比溯源半径小，光才聚焦 */
const GLOW_R = 182
/** 磁力推散半径 */
const PUSH_R = 110
/** 鼠标静止多久后，光斑自己接过来巡游 */
const WANDER_DELAY = 2400

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOut = (v: number) => 1 - (1 - v) * (1 - v)

/** 连线配色过渡：静息的淡蓝 #5B8DEF → 被点亮的深蓝 #1D4ED8 */
function wireColor(t: number, a: number) {
  const r = Math.round(91 + (29 - 91) * t)
  const g = Math.round(141 + (78 - 141) * t)
  const b = Math.round(239 + (216 - 239) * t)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export function CitationWeb() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const hostEl = canvasEl.parentElement
    if (!hostEl) return
    const ctx2d = canvasEl.getContext('2d')
    if (!ctx2d) return

    const canvas: HTMLCanvasElement = canvasEl
    const host: HTMLElement = hostEl
    const ctx: CanvasRenderingContext2D = ctx2d

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    let dpr = 1
    let nodes: RNode[] = []
    let links: RLink[] = []
    let adj: number[][] = []

    /* 光标状态：目标点 + 平滑点 + 在场权重 + 自动巡游 */
    let aimX = 0
    let aimY = 0
    let cx = 0
    let cy = 0
    let mAlpha = 0
    let mWant = 0
    let seeded = false
    /** 距上次鼠标移动的毫秒数 */
    let idle = 0
    let wanderT = 0

    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const dist2 = (ax: number, ay: number, bx: number, by: number) => {
      const dx = ax - bx
      const dy = ay - by
      return dx * dx + dy * dy
    }

    /* ---------------- 生成引文网络 ---------------- */
    function build() {
      nodes = []
      links = []
      adj = []

      // 文案区：贴紧文字块本身，只压暗、不挖空，网络才能连成一片
      const padX = Math.min(Math.max(44, window.innerWidth * 0.055), 84)
      const textW = Math.min(560, w - padX * 2)
      const safeX = padX - 6
      const safeW = textW + 12
      const safeH = 384
      const safeY = h / 2 - safeH / 2
      const inSafe = (x: number, y: number) =>
        x > safeX && x < safeX + safeW && y > safeY && y < safeY + safeH

      // 节点数量随画布面积伸缩
      const count = Math.max(52, Math.min(120, Math.round((w * h) / 9000)))

      const pts: RNode[] = []
      let guard = 0
      while (pts.length < count && guard < count * 50) {
        guard++
        const x = rand(18, w - 18)
        const y = rand(18, h - 18)
        const dimmed = inSafe(x, y)
        // 文案区降密度 + 降亮度：字照旧清楚，网络不出现硬边空洞
        if (dimmed && Math.random() < 0.55) continue
        let ok = true
        for (let i = 0; i < pts.length; i++) {
          if (dist2(pts[i].hx, pts[i].hy, x, y) < 34 * 34) {
            ok = false
            break
          }
        }
        if (!ok) continue
        pts.push({
          hx: x,
          hy: y,
          x,
          y,
          r: 1.6,
          phase: rand(0, Math.PI * 2),
          amp: rand(9, 22),
          born: rand(0, 620),
          chain: 0,
          dim: dimmed ? 0.42 : 1,
          hub: false,
        })
      }

      // 最近邻连边：形成天然的文献簇，度数高的节点自然成为枢纽
      const edges = new Set<string>()
      const push = (i: number, j: number) => {
        const a = Math.min(i, j)
        const b = Math.max(i, j)
        const key = `${a}:${b}`
        if (edges.has(key)) return
        edges.add(key)
        links.push({
          a,
          b,
          born: Math.max(pts[a].born, pts[b].born) + 170,
          flow: rand(0, 1),
          speed: rand(0.65, 1.45),
        })
      }

      for (let i = 0; i < pts.length; i++) {
        const near: { j: number; d: number }[] = []
        for (let j = 0; j < pts.length; j++) {
          if (i === j) continue
          near.push({ j, d: dist2(pts[i].hx, pts[i].hy, pts[j].hx, pts[j].hy) })
        }
        near.sort((m, n) => m.d - n.d)
        const k = Math.random() < 0.35 ? 3 : 2
        for (let n = 0; n < k && n < near.length; n++) push(i, near[n].j)
      }

      // 少量跨簇引用：抽几对中长距离的点相连
      for (let n = 0; n < 8; n++) {
        const i = Math.floor(Math.random() * pts.length)
        const j = Math.floor(Math.random() * pts.length)
        if (i === j) continue
        const d2 = dist2(pts[i].hx, pts[i].hy, pts[j].hx, pts[j].hy)
        if (d2 < 200 * 200 || d2 > 620 * 620) continue
        push(i, j)
      }

      // 度数 → 节点半径（被引次数越多，点越大）
      const deg = new Array(pts.length).fill(0)
      adj = pts.map(() => [] as number[])
      for (const l of links) {
        deg[l.a]++
        deg[l.b]++
        adj[l.a].push(l.b)
        adj[l.b].push(l.a)
      }
      pts.forEach((n, i) => {
        n.r = 1.5 + Math.min(deg[i], 7) * 0.4
      })

      // 度数最高的一个非压暗节点作为「高被引枢纽」，给画面一个焦点
      let top = -1
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].dim < 1) continue
        if (top < 0 || deg[i] > deg[top]) top = i
      }
      if (top >= 0) {
        pts[top].hub = true
        pts[top].r = 7
        // 枢纽是全网的锚点，让它比别的节点稳一些
        pts[top].amp = Math.min(pts[top].amp, 9)
      }

      nodes = pts
    }

    /* ---------------- 引用距离（BFS） ---------------- */
    function chainDepths(seed: number) {
      const depth = new Array(nodes.length).fill(8)
      if (seed < 0) return depth
      depth[seed] = 0
      let frontier = [seed]
      let d = 0
      while (frontier.length && d < 4) {
        d++
        const next: number[] = []
        for (const u of frontier) {
          for (const v of adj[u]) {
            if (depth[v] > d) {
              depth[v] = d
              next.push(v)
            }
          }
        }
        frontier = next
      }
      return depth
    }

    /* ---------------- 绘制 ---------------- */
    function draw(elapsed: number) {
      if (!w || !h) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const active = mAlpha

      /* 光标光斑：唯一的跟随反馈，带着缓慢呼吸 */
      if (active > 0.01) {
        const breathe = 1 + Math.sin(elapsed * 0.0011) * 0.07
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, GLOW_R * breathe)
        g.addColorStop(0, `rgba(37, 99, 235, ${0.3 * active})`)
        g.addColorStop(0.42, `rgba(37, 99, 235, ${0.1 * active})`)
        g.addColorStop(1, 'rgba(37, 99, 235, 0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      }

      /* 逐层溯源：以离光标最近的节点为起点 */
      let seed = -1
      if (active > 0.02) {
        let best = Infinity
        for (let i = 0; i < nodes.length; i++) {
          const d = dist2(nodes[i].x, nodes[i].y, cx, cy)
          if (d < best) {
            best = d
            seed = i
          }
        }
      }
      const depth = seed >= 0 ? chainDepths(seed) : null

      /* 节点位置：漂移 + 磁力推散 */
      const act: number[] = new Array(nodes.length).fill(0)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        let dx = 0
        let dy = 0
        if (!reduced) {
          dx = Math.cos(n.phase + elapsed * 0.00042) * n.amp
          dy = Math.sin(n.phase * 1.31 + elapsed * 0.00035) * n.amp
        }
        const wx = n.hx + dx
        const wy = n.hy + dy

        if (active > 0.01) {
          const mx = cx - wx
          const my = cy - wy
          const md = Math.sqrt(mx * mx + my * my)
          if (md < PUSH_R && md > 0.001) {
            const f = (1 - md / PUSH_R) ** 2 * 22 * active
            dx -= (mx / md) * f
            dy -= (my / md) * f
          }
        }

        const gx = n.hx + dx
        const gy = n.hy + dy
        if (reduced) {
          n.x = gx
          n.y = gy
        } else {
          n.x += (gx - n.x) * 0.12
          n.y += (gy - n.y) * 0.12
        }

        // 激活强度 = 距离权重 × 引用链层级权重
        const want = depth ? 1 / (1 + depth[i] * 0.9) : 0
        n.chain += (want - n.chain) * 0.1
        const near = clamp01(1 - Math.sqrt(dist2(n.x, n.y, cx, cy)) / LIGHT_R)
        act[i] = active * near * (0.52 + 0.48 * n.chain)
      }

      /* 引用连线 */
      ctx.lineCap = 'round'
      for (const l of links) {
        const a = nodes[l.a]
        const b = nodes[l.b]
        const p = reduce01(clamp01((elapsed - l.born) / 460), reduced)
        if (p <= 0) continue
        const ex = a.x + (b.x - a.x) * p
        const ey = a.y + (b.y - a.y) * p
        const lv = (act[l.a] + act[l.b]) * 0.5
        const dm = (a.dim + b.dim) * 0.5
        // 压暗只作用于静息观感；被光标点亮时照常提亮，避免跟随效果在文案区失效
        const alpha = 0.11 * dm + lv * 0.62 * (0.7 + 0.3 * dm)
        ctx.strokeStyle = wireColor(clamp01(lv * 1.5), alpha)
        ctx.lineWidth = lv > 0.3 ? 2 : 1.05
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(ex, ey)
        ctx.stroke()

        /* 引用流向：静息时也照常流动，带一小截拖尾让「在动」看得见 */
        const len = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y)) || 1
        const t = ((elapsed * 0.00028 * l.speed + l.flow) % 1) * p
        const dotAlpha = Math.min(1, (0.24 * dm + lv * 0.6 * (0.7 + 0.3 * dm)) * 1.5)
        if (dotAlpha > 0.04) {
          const tail = Math.min(t, 15 / len)
          const fx = a.x + (b.x - a.x) * t
          const fy = a.y + (b.y - a.y) * t
          ctx.strokeStyle = wireColor(clamp01(lv * 1.5), dotAlpha)
          ctx.lineWidth = 1.7 + lv * 0.9
          ctx.beginPath()
          ctx.moveTo(a.x + (b.x - a.x) * (t - tail), a.y + (b.y - a.y) * (t - tail))
          ctx.lineTo(fx, fy)
          ctx.stroke()
        }
      }

      /* 节点 */
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        const enter = reduce01(clamp01((elapsed - n.born) / 430), reduced)
        if (enter <= 0) continue
        const a = act[i]
        const dm = n.dim
        const r = n.r * easeOut(enter) * (1 + a * 0.9)
        const alpha = enter * (0.3 * dm + 0.72 * a * (0.58 + 0.42 * dm))
        if (a * (0.5 + 0.5 * dm) > 0.22) {
          const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4.4)
          halo.addColorStop(0, `rgba(37, 99, 235, ${0.28 * a * (0.5 + 0.5 * dm)})`)
          halo.addColorStop(1, 'rgba(37, 99, 235, 0)')
          ctx.fillStyle = halo
          ctx.beginPath()
          ctx.arc(n.x, n.y, r * 4.4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = `rgba(37, 99, 235, ${alpha})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fill()

        /* 高被引枢纽：双圈引文环 */
        if (n.hub) {
          ctx.strokeStyle = `rgba(37, 99, 235, ${alpha * 0.45})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 6 + a * 2, 0, Math.PI * 2)
          ctx.stroke()
          ctx.strokeStyle = `rgba(37, 99, 235, ${alpha * 0.2})`
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 11 + a * 2, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    /** 尊重 reduced-motion：把进度直接推到终值 */
    function reduce01(v: number, off: boolean) {
      return off ? 1 : v
    }

    /* ---------------- 尺寸与循环 ---------------- */
    function resize() {
      const rect = host.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        w = 0
        h = 0
        return
      }
      w = rect.width
      h = rect.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      build()
      if (reduced) draw(99999)
    }

    let raf = 0
    const t0 = performance.now()
    let lastT = t0

    function loop() {
      const now = performance.now()
      const dt = Math.min(64, now - lastT)
      lastT = now

      if (!reduced) {
        // 鼠标停住一会儿后，光斑自己沿一条缓慢的 Lissajous 路径巡游 ——
        // 左栏于是在没人操作时也一直在流转、一直有点亮
        const wandering = mWant > 0.5 && idle > WANDER_DELAY
        if (wandering) {
          wanderT += dt * 0.0003
          aimX = w * (0.5 + 0.42 * Math.sin(wanderT * 1.07 + 0.6))
          aimY = h * (0.5 + 0.36 * Math.sin(wanderT * 0.73))
        } else {
          idle += dt
        }

        const k = wandering ? 0.016 : 0.13
        cx += (aimX - cx) * k
        cy += (aimY - cy) * k
        mAlpha += (mWant - mAlpha) * 0.085
      }

      draw(now - t0)
      raf = requestAnimationFrame(loop)
    }

    function onMove(e: PointerEvent) {
      const rect = host.getBoundingClientRect()
      const nx = e.clientX - rect.left
      const ny = e.clientY - rect.top
      if (!seeded) {
        cx = nx
        cy = ny
        seeded = true
      }
      // 鼠标一动就立刻接管，巡游让位
      aimX = nx
      aimY = ny
      idle = 0
      mWant = 1
    }
    const onLeave = () => {
      mWant = 0
    }

    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    if (!reduced) {
      host.addEventListener('pointermove', onMove)
      host.addEventListener('pointerleave', onLeave)
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
}
