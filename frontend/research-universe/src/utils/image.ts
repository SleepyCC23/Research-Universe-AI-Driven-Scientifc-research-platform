/**
 * 头像图片处理工具
 * ------------------------------------------------------------
 * 需求：头像支持从本地上传自己的图片。
 *
 * 为什么在浏览器里压：头像最终以 data URL 存进用户资料（`User.avatarUrl`），
 * 原图直接转 base64 动辄几百 KB 甚至几 MB —— 传输、入库、顶栏渲染都吃不消。
 * 这里统一「居中裁剪成正方形 → 缩放到 256×256 → 有透明通道优先 PNG，
 * 体积超标再退化为 JPEG」，通常落在 20–60 KB。
 *
 * 不使用 `createImageBitmap`：部分 Safari 版本不可用，改用 `<img>` + ObjectURL 更稳。
 */

/** 允许的输入类型 */
const ACCEPTED = /^image\/(png|jpe?g|webp|gif)$/
/**
 * 输入体积上限（压缩前，单位 MB）。
 * 单一真源：账号设置页的提示文案也从这里取值，改限制只需改这一处。
 * 注意这里是**原图**上限，产物仍会被压到 256×256（约 20–60KB）再入库。
 */
export const MAX_INPUT_MB = 50
/** 输入体积上限（字节） */
const MAX_INPUT_BYTES = MAX_INPUT_MB * 1024 * 1024
/** 输出体积上限（字符数）：超过就退化为 JPEG 重编码 */
const MAX_OUTPUT_CHARS = 90_000
/**
 * 解码后参与绘制的最大边长。超过则先等比降采样一次再裁剪 ——
 * 上限放宽到 50MB 后，原图可能有上千万像素，直接缩到 256×256 会触发部分浏览器
 * （尤其 Safari 的 canvas 面积上限）画出空白图。
 */
const MAX_SOURCE_SIDE = 4096

/** 用 <img> 解码本地文件（兼容性好，失败有明确报错） */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('图片解码失败，请换一张图片试试'))
    }
    img.src = objectUrl
  })
}

export interface AvatarImageResult {
  dataUrl: string
  /** 压缩后的近似体积（KB），用于给用户反馈 */
  sizeKb: number
  width: number
  height: number
}

/**
 * 把本地图片转成可直接入库的头像 data URL。
 * @param size 输出边长（正方形），默认 256
 */
export async function fileToAvatarDataUrl(file: File, size = 256): Promise<AvatarImageResult> {
  if (!ACCEPTED.test(file.type)) {
    throw new Error('仅支持 PNG / JPG / WebP / GIF 图片')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`图片不能超过 ${MAX_INPUT_MB}MB（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB）`)
  }

  const img = await loadImage(file)

  /**
   * 超大原图先等比降采样一次（见 MAX_SOURCE_SIDE 注释），再做居中裁剪。
   * 这样 50MB 级别的输入也能稳定出图，而不是在 canvas 上画出空白。
   */
  let src: HTMLImageElement | HTMLCanvasElement = img
  const naturalW = img.naturalWidth
  const naturalH = img.naturalHeight
  if (Math.max(naturalW, naturalH) > MAX_SOURCE_SIDE) {
    const ratio = MAX_SOURCE_SIDE / Math.max(naturalW, naturalH)
    const mid = document.createElement('canvas')
    mid.width = Math.max(1, Math.round(naturalW * ratio))
    mid.height = Math.max(1, Math.round(naturalH * ratio))
    const mctx = mid.getContext('2d')
    if (!mctx) throw new Error('当前浏览器不支持图片处理，请换用 Chrome / Edge 试试')
    mctx.drawImage(img, 0, 0, mid.width, mid.height)
    src = mid
  }
  const srcW = src instanceof HTMLCanvasElement ? src.width : src.naturalWidth
  const srcH = src instanceof HTMLCanvasElement ? src.height : src.naturalHeight

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持图片处理，请换用 Chrome / Edge 试试')

  // 居中裁剪成正方形（避免头像被拉变形）
  const side = Math.min(srcW, srcH)
  const sx = Math.max(0, (srcW - side) / 2)
  const sy = Math.max(0, (srcH - side) / 2)
  ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size)

  // 有透明通道的源优先 PNG，否则直接 JPEG（体积更小）
  const hasAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif'
  let dataUrl = hasAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85)
  // 体积超标（如大面积渐变 PNG）→ 退化为 JPEG 重编码
  if (dataUrl.length > MAX_OUTPUT_CHARS) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  }
  // 极端情况下仍超标：降质量再压一次
  if (dataUrl.length > MAX_OUTPUT_CHARS) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.6)
  }

  return {
    dataUrl,
    sizeKb: Math.round((dataUrl.length / 1024) * 10) / 10,
    width: size,
    height: size,
  }
}
