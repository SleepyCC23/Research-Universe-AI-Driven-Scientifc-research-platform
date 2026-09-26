import { spawn } from 'node:child_process'
import path from 'node:path'
import { config } from '../config'

/**
 * Node ↔ Python 桥接
 * ------------------------------------------------------------
 * Node 只负责：把参数 JSON 通过 stdin 传给 Python → 读回 stdout 的 JSON。
 * 统计计算全部在 Python 侧完成（pandas / statsmodels / scikit-learn），互不污染。
 */

/** python 脚本目录：src/python 与 dist/python 两种运行形态下都能定位到 backend/python */
const SCRIPT_DIR = path.resolve(__dirname, '../../python')

export class PythonError extends Error {
  detail: string
  constructor(message: string, detail = '') {
    super(message)
    this.name = 'PythonError'
    this.detail = detail
  }
}

export interface PythonInvokeOptions {
  timeoutMs?: number
}

/**
 * 调用 Python 脚本。
 * @param script 脚本文件名，例如 'analysis.py'
 * @param payload 通过 stdin 传入的对象（会被 JSON 序列化）
 * @returns 脚本 stdout 中解析出的 JSON
 */
export function runPython<T>(script: string, payload: unknown, opts: PythonInvokeOptions = {}): Promise<T> {
  const scriptPath = path.join(SCRIPT_DIR, script)
  const timeoutMs = opts.timeoutMs ?? config.python.timeoutMs

  return new Promise<T>((resolve, reject) => {
    let child
    try {
      child = spawn(config.python.bin, [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] })
    } catch (err) {
      reject(new PythonError('无法启动 Python 解释器，请检查 .env 中的 PYTHON_BIN', String(err)))
      return
    }

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new PythonError('Python 执行超时', `超过 ${timeoutMs} ms`))
    }, timeoutMs)

    child.stdout?.on('data', (d) => (stdout += d.toString()))
    child.stderr?.on('data', (d) => (stderr += d.toString()))

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(new PythonError('Python 进程异常（可能未安装或路径错误）', String(err)))
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new PythonError(`Python 退出码 ${code}`, stderr.slice(-800)))
        return
      }
      try {
        resolve(JSON.parse(stdout) as T)
      } catch {
        reject(new PythonError('Python 输出不是合法 JSON', stdout.slice(0, 300)))
      }
    })

    try {
      child.stdin?.write(JSON.stringify(payload))
      child.stdin?.end()
    } catch (err) {
      clearTimeout(timer)
      reject(new PythonError('向 Python 写入参数失败', String(err)))
    }
  })
}
