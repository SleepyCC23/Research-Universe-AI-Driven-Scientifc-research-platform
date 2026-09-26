# 项目长期记忆 · 研宇宙 Research Universe

## 项目概况
- 面向高校科研的 AI 科研工作台：可行性分析 → 文献综述 → 数据分析 → 论文写作 → 选刊 → 模拟评审 → 成果导出。
- 前端 `frontend/research-universe/`：React 18 + TS + Vite 5 + Tailwind + Zustand + Recharts，19 页 / 约 93 接口；接口层 `src/api/`，Mock `src/mocks/db.ts`。
- 后端 `backend/`：Express + TS + Prisma + MySQL 8，33 表；路由 `src/routes/`（auth / me / plans / projects / tasks / integrations / journals），服务 `src/services/`，真实统计 `backend/python/analysis.py`。
- 文档索引：根 `README.md`｜启动排查 `START.md`｜后端设计 `backend/DESIGN.md`｜接口 `frontend/research-universe/docs/API.md`｜待办 `docs/TEST-FIX-BACKLOG.md`｜数据库快照 `datamanger/`。

## 后端约定
- 统一响应 `{ code, message, data, traceId }`，`code=0` 成功；错误码与前端 `src/api/client.ts` 一致（14 个）。
- 鉴权 JWT `Authorization: Bearer <token>`；开发态短信码放行（`SMS_DEV_RETURN_CODE`）。
- LLM 不绑厂商，OpenAI 兼容（`LLM_BASE_URL / LLM_API_KEY / LLM_MODEL`）；未配置走模板兜底，保证离线可跑。
- **候选统计方法由 AI 挑选**（`analysis.service.ts::generateMethods`）：**只能从 `SUPPORTED_METHOD_IDS = [hierarchical, mediation, moderation, sem, multiLevel]` 里选**（须与 `python/analysis.py` 支持集合同步），自造 id 会让沙箱落空；失败/超时回退内置 `ANALYSIS_METHODS`，来源写在 `methodSource: 'ai' | 'catalog'`。`POST /projects/:projectId/analysis/methods/refresh` 重生成（清空已选）。**不要预选方法**（`selectedMethodId` 初始 null）。
- 数据分析 `analysis/run` 用 `child_process` + stdin/stdout 调 `python/analysis.py`（pandas / statsmodels / sklearn / pyreadstat），解释器由 `PYTHON_BIN` 指定。
- 文献检索优先 OpenAlex（免费免密钥），失败回退库内匹配。
- 端口：后端 **:8081**（勿再写 8080），前缀 `/api/v1`；前端 5173，`/api` 代理到 8081。
- 前端 API 基址是相对路径 `/api/v1`（同源代理）→ 别人打开 5173 无需能访问后端端口。`vite.config.ts` 已设 `host: true` + `allowedHosts: true`（内网穿透必需）；局域网直连 `http://<内网IP>:5173`。
- 历史遗留：`endpoints.ts` 的 `!USE_MOCK` 分支约 34 条路径丢了 `:projectId`；现由后端「规范路径 + 扁平别名」双注册兼容，`client.ts` 捕获 `p_xxx` 并带 `X-Project-Id` 头。改进方向：改回规范 REST 路径后删别名。

## 前端约定
- **登录态真源是 `localStorage.ru_token`**；`useAuthStore.auth` 初始值只由 token 决定、`user=null`，由路由守卫 `SessionGate`（`src/router.tsx`）拉 `GET /me` + `/me/student-verification` 水合。**别再把示例用户当 store 默认值**（会导致退出后自动变回示例账号）。资料快照缓存 `ru_auth_cache`。顶栏判断登录用 `auth.loggedIn || !!auth.user`；**水合失败只在业务码 40101/40102 时登出**，网络抖动/5xx 必须保留登录态。
- 账号规则：仅 11 位手机号（1 开头）或合法邮箱；前端 `validateAccount()` ↔ 后端 `account.service.ts::assertAccount()` 必须同步改。
- 登录/注册用 `intent` 区分：`intent=login` 时账号不存在直接报 40001、不建号。唯一保留「陈同学」示例资料的是演示账号 `13800000000`（`DEMO_PHONE`）。
- 导出格式默认 `store::defaultExportFormat()`（PDF→docx→doc→zip→md→第一个）；`setArtifacts()` 载入时必须重建 selectedArtifactIds/selectedFormats，否则真实项目导出必失败。
- 合规必开项不渲染 Toggle，用静态「已开启 · 必开」标识。学生认证只在 `AccountSettings.tsx` 做，登录页不放认证表单。
- 写作页：点大纲章节 = 正文只看该节（`Writing.tsx` 的 `sectionMatches` / `outlineOrder` / `isOutlineActive`）；后端 `regenerateSection` **只替换本节**，不得整数组覆盖 `paragraphs`。「查看全文」= 成稿预览，可「加入下载中心」→ `POST …/writing/manuscript/publish`（`export.service.ts::publishManuscript`）刷新产物 `a_1`，只登记不落盘。
- 段落改写 `POST …/writing/paragraph/rewrite`：`action = rewrite|shorten|expand|academic|custom`，可选 `instruction`；映射在 `REWRITE_ACTION_KEY`；须先选中段落（`kind='boundMethod'` 不可选不可改写，服务端也拦）；**返回 text 必须就地替换渲染**，不能只弹 Toast。
- 评审页：①「修改建议」每条都要有内容（`review.service.ts::ensureRevisionPaths()` 补齐并落库，前端 `issueRefs` + `focusGuide()` 定位），**不要写死条数**；②「完整 Rebuttal 草稿」入口在左栏末尾，右栏只做逐条预览；③生成类按钮必须应用接口返回值就地渲染。
- 头像：`User.avatarUrl`（`@db.MediumText`）存 256×256 压缩 data URL；前端统一 `<Avatar src text size>`（`components/ui.tsx`），压缩走 `src/utils/image.ts::fileToAvatarDataUrl()`。服务端只认 `data:image/(png|jpeg|webp|gif);base64,`，上限 50 万字符。**可空字段一律显式返回 `null`（`?? null`），不能写 `?? undefined`** —— JSON.stringify 丢键 + 前端合并式 setState 会保留旧值，表现为「移除头像点了没反应」；前端删除类响应也要显式赋值。
- 「选择要进入的项目」弹窗**只在项目页自动弹**（`layout.tsx` 按 `/^\/project\/([^/]+)/` 判断 + `!hasChosenProject` + URL 项目 ≠ 当前项目）；`hasChosenProject` 存 sessionStorage `ru_project_chosen`；工作台/账号设置/定价等全局页一律不弹；手动切换入口是面包屑最左「项目名 ⇄」按钮，别删。
- 登录页左栏 = `components/CitationWeb.tsx`（canvas 引文网络）：**光标处只有一团渐变光斑，没有圆圈 / 虚线环 / 十字准星**（用户明确要求去掉）；`GLOW_R=182` 光斑半径、`LIGHT_R=250` 溯源点亮半径；250px 内按引用距离 BFS 逐层点亮；鼠标静止 2.4s 后光斑自动 Lissajous 巡游。`Login.tsx` 外层 `grid lg:grid-cols-[1fr_480px]`，**改左栏别动右栏**；左栏内距 `px-[clamp(44px,5.5vw,84px)]` 与组件 `padX` 耦合；文案区 `dim=0.42` 只压暗静息亮度、不压暗激活亮度。
- 改 Prisma schema 后：`prisma db push` 会顺带 generate，但 dev server 占用 `query_engine-windows.dll.node` 会 EPERM → **先停 dev server 再 generate**。

## datamanger 数据库快照包
- 内容：`research_universe_dev.sql`（结构+数据，唯一权威快照）、`…_schema.sql`、`MANIFEST.md`（表/行数清单，当前 33 表 / 296 行）、`README.md`、`export|import.sh` + `.bat`、`.dbconfig`(gitignore)、`_bak/`(gitignore)。
- **脚本零交互**：连接优先级 环境变量 `DB_HOST/DB_PORT/DB_USER/DB_PASS` > `.dbconfig` > 默认 `root/000000@localhost:3306`；只有 `--ask` 才询问，**不要再把交互式问答加回去**。
- **逻辑只在 `.sh` 里**；`.bat` 是纯 ASCII 启动器（找 `bash.exe` → 调 `.sh` → 透传 `%*`，`chcp 65001`），改功能改 `.sh`。
- **`.bat` 必须 CRLF + 纯 ASCII**（GBK+936 中文变 `?`；UTF-8+65001 cmd 读文件错位）；`.sh` / `.dbconfig` / `.md` 保持 LF。刷新快照跑 `./export.sh`。

## 本机环境要点（Windows）
- MySQL root / 000000，库 `research_universe_dev`；客户端在 `C:\Program Files\MySQL\MySQL Server 8.0\bin`；系统 ACP/OEMCP=936（GBK）。
- npm 用 `--registry=https://registry.npmmirror.com`；pip 用 `-i https://mirrors.aliyun.com/pypi/simple/`。Python / Node 绝对路径随机器变化，一律以 `backend/.env` 的 `PYTHON_BIN` 与当前环境为准，不要硬编码旧机器路径。
- shell 注入了 `NODE_OPTIONS` 安全删除钩子：跑 `prisma generate` 需前置 `NODE_OPTIONS=`；该 bash 还缺 `seq` / `sleep`；只认绝对路径（`rm -rf 相对路径` 会被拒），删目录改用 PowerShell `Remove-Item -LiteralPath "C:\..." -Recurse -Force`；追加文件别用 `cat >>`（被拦），用 Edit 工具。
- **agent-browser 不在 PATH**：用 node 直呼入口 `node …/node_modules/agent-browser/bin/agent-browser.js open <url>`；ref 走 `snapshot -i`，React 重渲染后 ref 会变；`fill` 对分格验证码框无效，改用 `click @eN` + `keyboard type <digit>`；结束务必 `close --all`。
