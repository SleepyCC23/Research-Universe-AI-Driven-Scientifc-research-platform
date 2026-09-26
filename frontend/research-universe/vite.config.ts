import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发服务器默认 5173；后端联调时把 /api 代理到真实后端即可
// 说明：这里刻意不使用 node:path / __dirname，避免依赖 @types/node。
// 使用正则别名把 "@/xxx" 映射到项目根的 "/src/xxx"。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@\//, replacement: '/src/' }],
  },
  server: {
    port: 5173,
    /**
     * 监听所有网卡（默认只监听 localhost）。
     * 这样同一网络内的其他电脑可以用 http://<本机内网IP>:5173 打开本站。
     * 前端 API 走同源相对路径 /api/v1，由本服务器代理到后端，
     * 因此对方**不需要**能访问后端端口（8081）。
     */
    host: true,
    /**
     * 放行任意 Host 头。Vite 5.4+ 默认只允许 localhost 与 IP 直连，
     * 用内网穿透（cpolar / ngrok / Cloudflare Tunnel）时对方带的是外部域名，
     * 不放行会直接被拒（浏览器报 "Blocked request. This host is not allowed."）。
     * 仅开发环境这么做；正式部署请改回显式白名单。
     */
    allowedHosts: true,
    // 改为 false：启动后不自动拉起默认浏览器，可在任意浏览器手动打开 http://localhost:5173/
    open: false,
    proxy: {
      // 当 VITE_USE_MOCK=false 时，前端会把请求打到 /api，由此处转发到真实后端
      // 注意：target 端口需与后端 .env 的 PORT 一致（当前 8081）
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 图表库体积较大，单独分包，避免首屏主包过大
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-state': ['zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
