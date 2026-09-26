/** @type {import('tailwindcss').Config} */
// 设计令牌全部对齐设计稿（研宇宙 UI Kit）
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 页面 / 容器
        page: '#F5F7FA',        // 页面底色
        panel: '#EEF1F6',       // 卡内嵌面板底色
        line: '#E6EAF2',        // 常规描边
        'line-strong': '#D5DCE7',
        // 文本
        ink: '#1F2733',         // 主文本
        'ink-2': '#5A6473',     // 次级文本
        'ink-3': '#8C96A8',     // 弱文本 / 说明
        // 品牌
        brand: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          soft: '#EFF4FF',
          line: '#BFD3FF',
        },
        ok: { DEFAULT: '#16A34A', soft: '#E9F8EF', line: '#B7E7C9' },
        warn: { DEFAULT: '#D97706', soft: '#FFF6E6', line: '#FBE0B0' },
        danger: { DEFAULT: '#DC2626', soft: '#FDECEC', line: '#F7C6C6' },
        violet: { DEFAULT: '#7C3AED', soft: '#F3EEFF', line: '#DDD0FB' },
        teal: { DEFAULT: '#0EA5A5', soft: '#E6F7F7', line: '#B7E7E7' },
      },
      fontSize: {
        xs: ['12px', '18px'],
        sm: ['13px', '20px'],
        base: ['14px', '22px'],
        md: ['15px', '24px'],
        lg: ['16px', '24px'],
        xl: ['18px', '26px'],
        '2xl': ['20px', '28px'],
        '3xl': ['24px', '32px'],
      },
      borderRadius: {
        card: '8px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04)',
        pop: '0 8px 24px rgba(16, 24, 40, 0.12)',
        dialog: '0 16px 48px rgba(16, 24, 40, 0.18)',
      },
      fontFamily: {
        sans: [
          '"PingFang SC"',
          '"HarmonyOS Sans SC"',
          '"Microsoft YaHei"',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'Consolas', 'Menlo', 'monospace'],
        song: ['"Source Han Serif SC"', '"SimSun"', 'serif'],
      },
    },
  },
  plugins: [],
}
