
# 研宇宙 Research Universe

> **引用可溯源 · 分析可复现 · 过程可交代**
>
> 面向高校科研人员与团队的一站式 AI 科研工作台：从选题可行性分析，一路走到论文成稿与投稿选刊。

一个完整可运行的前后端工程——**不是演示原型**：统计计算跑真实 Python 沙箱，文献检索打真实 OpenAlex 接口，写作 / 选刊 / 评审走可配置的大模型。

---

## 一、它能做什么

覆盖一篇论文从 0 到 1 的全部环节，共 **19 个页面 / 约 93 个接口**：

| 阶段      | 页面                                 | 核心能力                                                                           |
| ------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| ① 选题与引言 | 工作台、研究热点、领域热词、理论与变量、数据上传、变量识别、研究假设 | 热点分析、理论驱动 / 数据驱动双路径选题、变量角色识别（自变量 / 因变量 / 中介 / 调节）、假设生成                         |
| ② 文献综述  | 文献综述                               | OpenAlex 真实检索、结构化综述生成、文献核验（未验证条目强约束，不可引用、不可导出）                                 |
| ③ 数据分析  | 数据分析                               | AI 推荐候选统计方法 → **Python 沙箱真实计算**（分层回归 / Bootstrap 中介 / 调节效应 / SEM / 多层模型）、结果可视化 |
| ④ 论文写作  | 论文写作（含全屏编辑器）                       | 章节化大纲 + 段落级编辑、段落 AI 改写（重写 / 缩写 / 扩写 / 学术化 / 自定义）、引用插入、成稿预览与「加入下载中心」            |
| ⑤ 选刊与评审 | 选刊 AI、模拟评审                         | 期刊画像与匹配度、模拟审稿意见、逐条修改建议、完整 Rebuttal 草稿生成                                        |
| ⑥ 导出与合规 | 导出中心、定价、项目设置、账号设置                  | 多格式产物导出（PDF / docx / doc / md / zip）、数据分级 L0–L2 合规管控、披露报告、套餐与额度                |

**贯穿全局的三条产品底线**

1. **引用可溯源**：每条文献都有核验状态，未验证条目在选入、引用、导出三处都会被拦截。
2. **分析可复现**：统计不在前端「编数」，由后端调 Python 脚本真实计算并返回过程结果。
3. **过程可交代**：数据分级、跳过确认、AI 使用情况等都会留痕，导出时生成披露报告。

---

## 二、系统架构

```
                 ┌─────────────────────────────────────────┐
   浏览器         │  前端 React SPA  (Vite 5 dev :5173)      │
                 │  19 页面 · Zustand 状态 · Recharts 图表   │
                 └───────────────────┬─────────────────────┘
                                     │  /api/v1/**（同源相对路径）
                                     ▼
                 ┌─────────────────────────────────────────┐
                 │  Vite dev proxy  →  http://localhost:8081│
                 └───────────────────┬─────────────────────┘
                                     ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  后端 Express + TypeScript  (:8081, 前缀 /api/v1)                  │
   │                                                                   │
   │  中间件  JWT 解析 · traceId · zod 校验 · 统一错误处理                │
   │  路由    /auth  /me  /plans  /projects  /tasks  /integrations      │
   │          /journals/:id/profile                                    │
   │  服务    auth · account · project · intro · literature ·           │
   │          analysis · writing · journal · review · export · task     │
   └───────┬─────────────────┬──────────────────┬─────────────────────┘
           │                 │                  │
           ▼                 ▼                  ▼
   ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐
   │ Prisma ORM   │  │ Python 沙箱    │  │ 大模型（可选）     │
   │ → MySQL 8    │  │ analysis.py   │  │ OpenAI 兼容协议    │
   │ 33 张表       │  │ 真实统计计算   │  │ 任意厂商可换       │
   └──────────────┘  └───────────────┘  └──────────────────┘
                                     │
                                     ▼
                          OpenAlex（免费文献检索，失败回退库内匹配）
```

**设计上的三个关键取舍**

- **大模型不绑定厂商**：只走 OpenAI 兼容协议，换厂商只改 `.env` 三行；**未配置密钥时生成类接口自动走模板兜底**，保证离线也能把全流程跑通。
- **统计计算在进程外**：后端通过 `child_process` + stdin/stdout 调 `backend/python/analysis.py`，Python 环境隔离，崩了也不影响 Node 主进程；Python 不可用时降级为模拟结果并在结果里显式标注。
- **前端同源代理**：前端 API 基址是相对路径 `/api/v1`，由 Vite 代理到后端。因此把 `:5173` 分享给同事时，对方**不需要**能访问后端端口。

---

## 三、技术栈

| 层        | 选型                   | 版本                  | 说明                                                               |
| -------- | -------------------- | ------------------- | ---------------------------------------------------------------- |
| 前端框架     | React + TypeScript   | 18.3 / 5.6 `strict` | 全量类型定义，`npm run typecheck` 零错误                                   |
| 构建       | Vite                 | 5.4                 | 秒级冷启动；生产构建自动分包（react / charts / state）                           |
| 样式       | Tailwind CSS         | 3.4                 | 设计令牌集中在 `tailwind.config.js`                                     |
| 状态       | Zustand              | 4.5                 | 9 个 store，按「全局 → 项目 → 流程」分层                                      |
| 路由       | React Router         | 6.26                | `createBrowserRouter` 声明式路由表                                     |
| 图表       | Recharts             | 2.12                | 折线 / 环形用 Recharts，条形与词云用纯 DOM 精确控图                               |
| 后端       | Express + TypeScript | 4.21 / 5.7          | `tsx watch` 热重载，路由薄层 + 服务层                                       |
| ORM / DB | Prisma + MySQL       | 5.22 / 8.0          | 33 张表；`prisma db push` 同步结构                                      |
| 鉴权       | JWT                  | —                   | `Authorization: Bearer <token>`，7 天有效期                           |
| 校验       | zod                  | 3.24                | 请求体统一校验                                                          |
| 统计沙箱     | Python               | 3.13                | pandas · numpy · scipy · statsmodels · scikit-learn · pyreadstat |
| 大模型      | OpenAI 兼容            | —                   | DeepSeek / OpenAI / Kimi / 通义 / 智谱 / 豆包 均可                       |

---

## 四、目录结构

```
ResearchUniverse/
├── README.md                    # ← 你正在看的这份
├── START.md                     # 启动 / 排查手册（更详细的命令行版）
├── overview*.md                 # 各轮交付的总览（改了什么、为什么）
│
├── frontend/
│   ├── backend-readiness.md     # 后端接入准备度核查
│   ├── design-review.md         # 设计走查记录
│   └── research-universe/       # 前端工程
│       ├── vite.config.ts       # 别名 / 代理 / 分包
│       ├── tailwind.config.js   # 设计令牌
│       ├── docs/                # API.md · VARIABLES.md · INTERACTIONS.md
│       │                        #   COPY-SPEC.md · TEST-FIX-BACKLOG.md
│       └── src/
│           ├── api/             # client.ts（错误码 / Mock 开关）+ endpoints.ts（全部接口）
│           ├── components/      # ui.tsx · layout.tsx · charts.tsx · icons.tsx · CitationWeb.tsx
│           ├── store/           # Zustand stores
│           ├── mocks/db.ts      # Mock 数据集（脱离后端也能演示全流程）
│           ├── types/index.ts   # 全量类型定义
│           └── pages/           # 19 个页面
│
├── backend/                     # 后端工程（Express + Prisma）
│   ├── DESIGN.md                # 后端技术方案设计文档
│   ├── .env.example             # 环境变量模板
│   ├── prisma/schema.prisma     # 数据库唯一真源（33 张表）
│   ├── python/analysis.py       # 统计计算沙箱
│   └── src/
│       ├── main.ts / app.ts     # 启动入口 / Express 实例
│       ├── config.ts            # 环境变量解析
│       ├── core/                # errors · http（统一响应）· auth · validate
│       ├── llm/client.ts        # OpenAI 兼容客户端
│       ├── python/bridge.ts     # Node ↔ Python 桥
│       ├── routes/              # 路由薄层
│       ├── services/            # 业务服务（每模块一个文件）
│       ├── seed.ts              # 演示数据
│       └── content/             # 目录 / 兜底载荷 / 日程内容
│
└── datamanger/                  # 数据库快照包（结构 + 演示数据 + 一键导入导出）
    ├── research_universe_dev.sql        # 完整快照（唯一权威）
    ├── research_universe_dev_schema.sql # 仅结构
    ├── MANIFEST.md              # 自动生成的表 / 行数清单
    ├── export.sh / import.sh    # 逻辑主体（零交互）
    └── export.bat / import.bat  # Windows 启动器（纯 ASCII）
```

---

## 五、快速开始

### 5.1 环境要求

| 依赖      | 要求             | 本项目验证版本           |
| ------- | -------------- | ----------------- |
| Node.js | ≥ 18.18        | 22.22.2           |
| MySQL   | 8.0            | 8.0.18（端口 3306）   |
| Python  | 3.11+（仅数据分析需要） | 3.13              |
| 浏览器     | 支持 ES2020      | Chrome / Edge 最新版 |

### 5.2 首次运行（只做一次）

```bat
:: ① 后端依赖 + 建表 + 演示数据
cd <项目根目录>\backend
npm install --registry=https://registry.npmmirror.com
copy .env.example .env          :: 然后编辑 DATABASE_URL，填本机真实口令
npm run db:push                 :: 建库建表（33 张）+ 生成 Prisma 客户端
npm run seed                    :: 写入演示用户与演示项目

:: ② 前端依赖
cd <项目根目录>\frontend\research-universe
npm install --registry=https://registry.npmmirror.com
echo VITE_USE_MOCK=false> .env.local
```

> `npm run setup` = `db:push` + `seed`，可一步到位。

### 5.3 日常启动（两个终端窗口）

| 顺序 | 窗口   | 命令                                              | 地址                      |
| -- | ---- | ----------------------------------------------- | ----------------------- |
| ①  | 窗口 A | `cd backend` → `npm run dev`                    | <http://localhost:8081> |
| ②  | 窗口 B | `cd frontend\research-universe` → `npm run dev` | <http://localhost:5173> |

**必须先 ① 后 ②** —— 前端只是页面壳，接口全靠后端；后端没起来时页面白屏或报 502。

两个窗口分开的好处：日志各在一屏、可独立重启、一个崩了另一个照常跑。

### 5.4 30 秒自检

| 检查项      | 操作                                      | 期望结果                                        |
| -------- | --------------------------------------- | ------------------------------------------- |
| 后端活着     | 打开 <http://localhost:8081/health>       | `{"status":"ok","ts":"..."}`                |
| 前端活着     | 打开 <http://localhost:5173/>             | 出现登录页                                       |
| **整链路通** | 打开 <http://localhost:5173/api/v1/plans> | `{"code":0,...}` —— 说明「前端 → Vite 代理 → 后端」全通 |

### 5.5 登录

真实模式下未登录不能进业务页，会先跳登录页。

1. 手机号填 **`13800000000`**（新号会自动建号；`intent` 区分登录 / 注册，登录态下账号不存在会直接报错而不是偷偷建号）；
2. 点「发送验证码」（开发态可直接跳过）；
3. 6 个格子填满**任意 6 位数字**，如 `123456`；
4. 点「登录 / 注册」。

登录后 token 存 `localStorage.ru_token`，请求自动带 `Authorization: Bearer <token>`，遇 401 回到登录页。

> 开发态能「任意 6 位」通过，是因为 `SMS_DEV_RETURN_CODE=true`。**上线必须改 `false`。**

---

## 六、配置说明

### 6.1 后端 `backend/.env`

| 变量                                           | 默认 / 示例                                                    | 说明                                           |
| -------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| `PORT`                                       | `8081`                                                     | **改了要同步改前端 `vite.config.ts` 的 proxy target** |
| `NODE_ENV`                                   | `development`                                              | 环境标识                                         |
| `DATABASE_URL`                               | `mysql://root:000000@localhost:3306/research_universe_dev` | 需填本机真实口令                                     |
| `JWT_SECRET`                                 | 开发占位值                                                      | **上线必须换成足够长的随机串**                            |
| `JWT_EXPIRES_IN`                             | `7d`                                                       | 令牌有效期                                        |
| `SMS_DEV_RETURN_CODE`                        | `true`                                                     | 开发态返回验证码；**生产必须 `false`**                    |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | DeepSeek / 已填 / `deepseek-chat`                            | 任意 OpenAI 兼容厂商；留空则走模板兜底                      |
| `LLM_TIMEOUT_MS`                             | `120000`                                                   | 大模型超时                                        |
| `PYTHON_BIN`                                 | python 解释器绝对路径                                             | 统计沙箱用；路径不存在则降级为模拟结果                          |
| `PYTHON_TIMEOUT_MS`                          | `180000`                                                   | 分析脚本超时                                       |
| `ANALYSIS_MODE`                              | `python`                                                   | `python` = 真实计算，`llm` = 调试占位                 |
| `OPENALEX_MAILTO`                            | 空                                                          | 选填，填了进 OpenAlex polite pool                  |
| `UPLOAD_DIR`                                 | `uploads`                                                  | 上传文件落盘目录                                     |

`.env` 已在 `.gitignore` 中，**不要提交**；分享配置请改 `.env.example`。

### 6.2 前端 `frontend/research-universe/.env.local`

| 变量              | 值       | 说明                                        |
| --------------- | ------- | ----------------------------------------- |
| `VITE_USE_MOCK` | `false` | `false` = 连真实后端（默认）；`true` = 走本地 Mock 假数据 |

> 改这个文件**必须重启前端**才生效。

### 6.3 常见的 OpenAI 兼容配置

```env
# DeepSeek
LLM_BASE_URL=https://api.deepseek.com/v1        LLM_MODEL=deepseek-chat
# OpenAI
LLM_BASE_URL=https://api.openai.com/v1          LLM_MODEL=gpt-4o-mini
# Moonshot / Kimi
LLM_BASE_URL=https://api.moonshot.cn/v1         LLM_MODEL=moonshot-v1-8k
# 通义千问
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1   LLM_MODEL=qwen-plus
# 智谱 GLM
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4                LLM_MODEL=glm-4-plus
```

### 6.4 Python 统计沙箱

```bat
python -m venv .venv
.venv\Scripts\python.exe -m pip install -i https://mirrors.aliyun.com/pypi/simple/ ^
    numpy pandas scipy statsmodels scikit-learn pyreadstat
:: 然后把 .env 的 PYTHON_BIN 指向 .venv\Scripts\python.exe 的绝对路径
```

**支持的统计方法 id 必须与前端 / 后端 / Python 三处同步**：  
`hierarchical`（分层回归）· `mediation`（Bootstrap 中介）· `moderation`（调节效应）· `sem`（结构方程）· `multiLevel`（多层模型）。  
AI 只被允许从这 5 个里挑选候选方法，自造 id 会让沙箱执行落空。

### 6.5 数据库快照（可选）

`datamanger/` 提供了零交互的一键导入导出：

```bat
cd <项目根目录>\datamanger
export.bat     :: 导出当前库 → SQL×2 + MANIFEST.md（表/行数清单）
import.bat     :: 从快照恢复数据库
```

连接信息优先级：环境变量 `DB_HOST/DB_PORT/DB_USER/DB_PASS` > `.dbconfig` > 默认 `root/000000@localhost:3306`。

---

## 七、关键工程约定（新人必读）

**接口与鉴权**

- 所有响应统一为 `{ code, message, data, traceId }`，`code=0` 表示成功；错误码与前端 `src/api/client.ts` 保持一致（共 14 个业务码）。
- 业务错误码语义举例：`40302 DATA_LEVEL_BLOCKED`（数据分级阻断）、`40303`（存在未验证文献，阻断导出）。

**可选字段一律显式返回 `null`**

- 后端序列化可空字段必须写 `?? null`，**不能写 `?? undefined`** —— `JSON.stringify` 会丢掉 `undefined` 的键，而前端是合并式 `setState`，缺键会保留旧值（典型症状：「移除头像点了没反应」）。
- 前端处理「删除类」响应时也要显式赋值，不要只靠对象展开。

**登录态**

- 真源是 `localStorage.ru_token`，用户资料由路由守卫 `SessionGate` 调 `/me` 水合，并存本地快照缓存 `ru_auth_cache`。
- **水合失败只在业务码 40101 / 40102 时登出**；网络抖动或 5xx 必须保留登录态。

**数据分级与合规**

- L0 / L1 / L2 三级贯穿全局：项目设为 L2 后，上传页的「跳过逐条确认」被强制禁用，导出原始数据行会被服务端阻断。
- 合规必开项（如「核验失败提醒」）不渲染 Toggle，只显示静态「已开启 · 必开」。
- 不可逆操作（移除文件 / 回滚版本 / 切换套餐 / 注销账号）全部走二次确认，并在文案里写明留痕位置。

**前端「拍平路径」历史遗留**

- `src/api/endpoints.ts` 的 `!USE_MOCK` 分支里约 34 条路径丢了 `:projectId`。目前由后端同时注册「规范路径 + 扁平别名」兼容，前端 `client.ts` 会自动捕获 `p_xxx` 并带 `X-Project-Id` 头。
- **改进方向**：把这些前端路径改回规范 REST 路径，后端即可删掉别名。

**改 Prisma schema 之后**

- `prisma db push` 会顺带执行 generate，但 dev server 占用 `query_engine-windows.dll.node` 时会报 EPERM —— **先停 dev server 再 generate**。

---

## 八、文档索引

| 想了解                                | 看这里                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| 启动、排查、换端口、环境变量速查                   | [`START.md`](./START.md)                                                             |
| 后端技术方案（选型 / Schema / 模块映射 / 分阶段计划） | [`backend/DESIGN.md`](./backend/DESIGN.md)                                           |
| 全量接口文档（含错误码表与 Mock 标注）             | [`frontend/research-universe/docs/API.md`](./frontend/research-universe/docs/API.md) |
| 前端工程说明与变更记录                        | [`frontend/research-universe/README.md`](./frontend/research-universe/README.md)     |
| 变量清单 / 中英命名对照                      | `frontend/research-universe/docs/VARIABLES.md`、`VARIABLES-FULL.md`                   |
| 交互逻辑（动作 → 状态 → 跳转 → 接口）            | `frontend/research-universe/docs/INTERACTIONS.md`                                    |
| 测试问题与待办                            | `frontend/research-universe/docs/TEST-FIX-BACKLOG.md`                                |
| 后端接入准备度核查                          | [`frontend/backend-readiness.md`](./frontend/backend-readiness.md)                   |
| 数据库快照与表清单                          | [`datamanger/README.md`](./datamanger/README.md)、`datamanger/MANIFEST.md`            |
| 各轮改了什么、为什么                         | 根目录 `overview*.md`                                                                   |

---

## 九、常见问题排查

| 现象                                  | 原因                                  | 处理                                                                |
| ----------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `npm install` 报 `ECONNRESET`        | 官方源不通                               | 加 `--registry=https://registry.npmmirror.com`                     |
| 后端报 `Access denied for user 'root'` | `.env` 口令错                          | 改 `DATABASE_URL`，重启后端                                             |
| 后端报 `ECONNREFUSED 3306`             | MySQL 没启动                           | 管理员 CMD：`net start MySQL80`                                       |
| `EADDRINUSE :8081`                  | 旧后端没关                               | 关旧窗口，或 `netstat -ano \| findstr :8081` 后 `taskkill /PID <PID> /F` |
| 页面白屏 / 接口 502                       | 后端没起或挂了                             | 先看窗口 A 日志，`curl localhost:8081/health`                            |
| 接口 404「接口不存在」                       | `VITE_USE_MOCK` 是 `true`，或改 env 没重启 | 改回 `false` 并**重启前端**                                              |
| 一直跳回登录页 / 报 401                     | 未登录或 token 失效                       | 用 `13800000000` + 任意 6 位码登录                                       |
| 分析结果是「模拟结果」                         | Python 不可用                          | 修 `PYTHON_BIN` 路径，确认依赖已装                                          |
| 前端端口变成 5174 / 5175                  | 5173 被上一个 Vite 占用                   | 正常现象，关掉旧窗口即可回到 5173                                               |
| 改了 `prisma generate` 报 EPERM        | dev server 占用引擎文件                   | 停 dev server 后再执行                                                 |
| 局域网 / 内网穿透打不开                       | Vite 拦截了外部 Host                     | 确认 `vite.config.ts` 里 `host: true` 与 `allowedHosts: true`         |

---

## 十、生产部署（后续）

- **前端**：`npm run build` → `dist/`，Nginx 静态托管，`/api` 反向代理到后端。
- **后端**：`npm run build` → `npm run serve`（`NODE_ENV=production`），PM2 守护，CORS 改为显式白名单。
- **数据库**：改用独立账号（不要用 root），开启定时备份。
- **安全清单**：`SMS_DEV_RETURN_CODE=false`、更换 `JWT_SECRET`、接入真实短信网关、启用 HTTPS。

---

## 十一、免责与说明

- 本项目中的文献、期刊、演示项目数据均可替换为真实数据；**演示账号 `13800000000` 是唯一保留示例资料（陈同学）的账号**，其余新用户资料按账号推导。
- 生成类内容（综述、假设、评审意见等）由大模型产出，**必须经研究者人工核验后方可用于正式投稿**；这一约束在产品的文献核验与导出阻断逻辑中已做工程化落地。
