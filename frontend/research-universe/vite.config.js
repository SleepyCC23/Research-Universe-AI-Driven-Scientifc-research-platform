// 说明：Vite 解析配置时会优先加载 vite.config.js 而不是 vite.config.ts。
// 本文件是早期 `tsc -b` 的编译残留，为避免“两处配置不一致”，这里只做转发，
// 真正的唯一配置源是 ./vite.config.ts。
export { default } from './vite.config.ts'
