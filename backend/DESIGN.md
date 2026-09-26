# 研宇宙 Research Universe · 后端技术方案设计文档（v0.1 草稿）

> 目的：在现有 React/TS 前端（已含完整接口层与 Mock）基础上，从零补一套**真实后端**。
> 技术栈：**Node.js + TypeScript + Express + Prisma + MySQL**；大模型接入做成**可配置任意 OpenAI 兼容密钥**的通用客户端。
> 读者前提：会 JS、写过 Express 增删改查、后端近乎零基础 → 本文档给的是“从选型到部署”的路线，不是概念。
> 状态：设计稿（待你确认后进入实现）。

---

## 0. 一句话结论

- **语言**：Node.js + TypeScript（前端就是 TS，类型可以前后端共用，`request<T>` 的 T 直接复用 `src/types/index.ts`）。
- **框架**：Express（你已熟悉，学习成本最低）。如果以后想更工程化，可平滑换成 NestJS，但 MVP 用 Express 最省心。
- **数据库**：MySQL 8.0 + **Prisma ORM**（类型安全、自带迁移、自动生成 TS 类型，和前端类型体系天然契合）。
- **大模型**：不绑定任何厂商。封装一个 **OpenAI 兼容客户端**，读环境变量 `LLM_BASE_URL / LLM_API_KEY / LLM_MODEL`，任意一个有 OpenAI 兼容接口的模型（OpenAI、DeepSeek、Kimi/Moonshot、通义/Qwen、智谱/GLM、火山/豆包等）都能接。
- **认证**：JWT（`Authorization: Bearer <token>`，正好对上前端的 `client.ts`）。短信验证码先用“开发态直接返回/落库”的假实现，生产再接阿里云/腾讯云短信。
- **前端怎么连**：根目录建 `.env.local` 写 `VITE_USE_MOCK=false`，`vite.config.ts` 里 `/api` 代理 target 指向后端端口即可，**组件代码零改动**。

---

## 1. 整体架构

```
浏览器(React)  ──HTTP /api/v1──▶  Express 服务
                                      │
        ┌──────────────┬──────────────┼───────────────────────┐
        │ 中间件层      │  路由层        │  业务层               │
        │ - 解析JWT     │  /auth/*      │  authService          │
        │ - traceId     │  /me/*        │  userService          │
        │ - 错误处理    │  /projects/*  │  projectService       │
        │ - zod校验     │  /literature* │  literatureService    │
        │              │  /analysis/*  │  analysisService      │
        │              │  /writing/*   │  writingService       │
        │              │  /journals/*  │  llmService ◀───▶ 大模型(任意密钥)
        │              │  /review/*    │  taskService(异步)     │
        │              │  /export/*    │                       │
        └──────────────┴──────────────┘          │
                                                 ▼
                                          Prisma ──▶ MySQL 8.0
                                          （复杂嵌套载荷用 JSON 列，关系型实体用正规表）
```

### 目录结构（建议）

```
backend/
├── package.json
├── tsconfig.json
├── .env.example            # 所有环境变量模板（含 LLM_*, DB_URL, JWT_SECRET）
├── prisma/
│   └── schema.prisma       # 数据库唯一真源（含迁移）
├── src/
│   ├── main.ts             # 启动入口（监听端口、挂中间件、注册路由）
│   ├── app.ts              # 创建 Express 实例、挂载全局中间件
│   ├── core/
│   │   ├── errors.ts       # 业务错误码（与前端 ErrorCode 一一对应）→ 统一响应
│   │   ├── response.ts     # ok()/fail() 包装 { code,message,data,traceId }
│   │   ├── auth.ts         # JWT 签发/校验中间件
│   │   └── validate.ts     # zod 校验助手（校验失败 → 40001）
│   ├── llm/
│   │   └── client.ts       # 任意 OpenAI 兼容模型的通用客户端（核心需求）
│   ├── services/           # 业务服务（每模块一个文件）
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── plan.service.ts
│   │   ├── project.service.ts   # 含 schedule/compliance/ddl/stage-artifacts/progress/draft
│   │   ├── intro.service.ts     # hotspot/topicKeywords/theory/data(hotspot/variables/hypotheses)
│   │   ├── literature.service.ts
│   │   ├── analysis.service.ts
│   │   ├── writing.service.ts
│   │   ├── journal.service.ts
│   │   ├── review.service.ts
│   │   ├── export.service.ts
│   │   ├── task.service.ts
│   │   └── notification.service.ts
│   ├── routes/             # 路由（薄层，只做参数解析 + 调 service）
│   ├── seed/               # 种子数据（plans + 演示用户 + 3 个演示项目 p_2001/2002/2003）
│   └── shared/types.ts     # 从前端 src/types/index.ts 复制/软链的接口（前后端共用）
└── uploads/               # 上传文件落盘目录（数据文件/PDF）
```

---

## 2. 工程初始化（可直接抄的命令）

```bash
# 1. 进入 backend 目录（先建好空目录）
cd C:\Users\86135\Desktop\programe\backend

# 2. 初始化（managed Node 22）
C:\Users\86135\.workbuddy\binaries\node\versions\22.22.2\node.exe -v
npm init -y

# 3. 装依赖
npm i express prisma @prisma/client jsonwebtoken zod dotenv cors
npm i -D typescript tsx @types/express @types/node @types/jsonwebtoken

# 4. 初始化 Prisma + 连 MySQL
npx prisma init --datasource-provider mysql
# 编辑 .env 的 DATABASE_URL="mysql://user:pass@localhost:3306/research_universe"

# 5. 本地起一个 MySQL（Windows 可用 Laragon/XAMPP，或 Docker）
#    Docker 一行：docker run -d --name ru-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 -e MYSQL_DATABASE=research_universe mysql:8.0

# 6. 开发运行
npx tsx watch src/main.ts   # 热重载，省去 tsc 编译
```

> 端口约定：后端默认 **8080**（和前端 `vite.config.ts` 的 proxy target 一致）。

---

## 3. 数据库 Schema（核心表，精简版）

原则：**关系实体用正规表，复杂嵌套载荷用 `JSON` 列**（MySQL 5.7+/8.0 原生支持），避免表爆炸。下面只列骨架，字段对齐 `src/types/index.ts`。

| 表 | 关键字段 | 说明 |
| --- | --- | --- |
| `users` | id, nickname, avatarText, major, grade, contact(手机/邮箱), eduEmail, createdAt | 验证码登录，无密码（改密可在二期补） |
| `student_verifications` | userId, verified, channel, eduEmail, verifiedAt, benefitsSynced, graceDays | 学生认证 |
| `plans` | planId('student'\|'pro'\|'team'), name, price, highlights(JSON), mostPopular | 套餐（种子写死） |
| `user_quota` | userId, planId, resetAt, reviewGenerateUsed/Limit, verifyUsed/Limit, sandboxMinutesUsed/Limit, exportUsed/Limit, overagePolicy | 额度，每月 1 号重置 |
| `projects` | id, ownerId, title, discipline, route, stage, progress, dataLevel, createdAt | 项目主体 |
| `project_schedules` | projectId, phases(JSON 5阶段), milestones(JSON 4硬节点), createdAt | 阶段与 DDL 节点（新建时由“当天”派生，和前端 `schedule.ts` 算法一致） |
| `project_compliance` | projectId, dataLevel, skipConfirm | 数据级别 + YOLO（L2 强制 skipConfirm=false） |
| `ddl_keyword_settings` | projectId, selected, options(JSON) | DDL 概述关键词 |
| `stage_artifacts` | projectId, currentStage, artifacts(JSON) | 本阶段产物 |
| `project_members` | projectId, userId, role, roleLabel | 成员（新建时 owner=firstAuthor） |
| `project_versions` | projectId, versionNo, operatorName, description, rollbackable | 版本记录 |
| `project_progress` | projectId, steps(JSON), resumeRoute, resumeLabel, hasUnfinished | 流程进度/断点续做 |
| `step_drafts` | projectId, stepKey, draft(JSON) | 步骤草稿 |
| `data_files` | projectId, fileId, fileName, rows, columns, sizeText, status, storedPath | 上传数据文件 |
| `data_variables` | projectId, varName, typeLabel, valueRange, missingRate, suggestedRole, overriddenRole, confirmed | 变量识别 |
| `hypotheses` | projectId, hypothesisId, code, title, varChain(JSON), testMethod, basis, status | 研究假设 |
| `lit_papers` | projectId, paperId, title, authors, journal, year, quartile, doi, doiStatus, abstractText, relevanceScore, citable | 文献 |
| `lit_selections` | projectId, paperIds(JSON) | 已选集 |
| `lit_verify` | projectId, status, agentAlpha, agentBeta, passedCount, suspiciousCount, failedCount, blockExport | 双 Agent 核验概览 |
| `kb_qa` | projectId, question, answer, citations(JSON), docCount | 知识库问答 |
| `analysis_runs` | projectId, runId, methodId, methodName, finishedAt, sampleSize, effects(JSON), robustness(JSON) | 分析结果 |
| `analysis_methods` | projectId, methods(JSON), trail(JSON) | 候选方法 + 选择留痕 |
| `writing_docs` | projectId, title, mode, outline(JSON), paragraphs(JSON), citations(JSON), editorBody(JSON), aiSuggestions(JSON), stats(JSON), submissionChecklist(JSON), authorLine | 写作文档（大 JSON） |
| `journals` | projectId, matches(JSON), profile(JSON), submissionChecks(JSON) | 选刊 |
| `reviews` | projectId, calibration(JSON), issues(JSON), rebuttals(JSON) | 模拟评审 |
| `export_artifacts` | projectId, artifacts(JSON), disclosure(JSON) | 导出中心 |
| `tasks` | taskId, type, status, progress, etaSeconds, message, result(JSON), startedAt, finishedAt | 异步任务（前端轮询 `GET /tasks/:id`） |
| `notifications` | userId, title, description, route, read | 站内通知 |
| `login_devices` | userId, deviceId, deviceName, locationText, lastActiveAt, current, tokenHash | 登录设备/会话 |
| `verification_codes` | contact, code, expiresAt, used | 短信验证码（开发态直接返回） |

> 演示数据：种子脚本写入 3 个演示项目 `p_2001/p_2002/p_2003`（和前端 `SCHEDULE_TODAY=2026-11-03` 一致的日程），前端“演示快捷入口”直接可用。

---

## 4. 93 个接口 → 模块映射

前端 `ENDPOINT_REGISTRY` 里的 91 条（含 `pollTask` 非 REST）全部落到下面这些 service：

| 模块 | 路由前缀 | 接口数 | 是否需要大模型/外部 | 实现难度 |
| --- | --- | --- | --- | --- |
| auth | `/auth`, `/me` | 9 | 短信=假实现 | 低 |
| account | `/me/account`, `/me/*` | 8 | 无 | 低 |
| plan | `/plans`, `/me/quota`, `/me/plan` | 3 | 无 | 低 |
| project | `/projects*`(含 ddl/compliance/stage-artifacts/progress/draft/settings) | ~22 | 无（日程派生是纯计算） | 中 |
| intro | `/intro/hotspot`, `/intro/topic/*`, `/data/*` | ~17 | hotspot/keywords/theory/hypotheses 需 LLM；topicKeywords 可接文献计量 | 中 |
| literature | `/literature*`, `/kb/qa`, `/tasks` | ~11 | search=OpenAlex(免费免密钥)/或LLM；review/verify/qa=LLM | 中高 |
| analysis | `/analysis*` | ~8 | run=**真实统计引擎**(难点) | 高 |
| writing | `/writing*`, `/integrations/zotero` | ~11 | outline/section/paragraph/citation-suggest=LLM；zotero=外部(OAuth，二期) | 中 |
| journal | `/journals*`, `/submission-package` | ~4 | match/profile=LLM + 期刊库 | 中 |
| review | `/review*` | ~4 | recalibrate/rebuttal=LLM | 中 |
| export | `/export*` | ~5 | disclosure=LLM 生成 | 中 |

> 标注 🔵 的外部服务处理策略见第 7 节；标注 🟡 的“前端 Mock”接口就是上面这些大模型/异步类，是后端真正要“现写”的部分。

---

## 5. 鉴权设计

1. `POST /auth/sms-code`：后端生成 6 位 `code`，写 `verification_codes`（`expiresAt=now+5min`），**开发态直接把 code 放进响应**（`cooldownSeconds` 同时返回）；生产替换为真实短信网关（阿里云/腾讯云/Twilio），code 不回传。
2. `POST /auth/login`：校验 code → 用户不存在则自动注册 → 签发 JWT（`jsonwebtoken`，`JWT_SECRET` 来自 env，有效期 7 天）→ 落 `login_devices`（current=true）→ 返回 `{ auth:{ token, user }, verification }`。前端存 `localStorage.ru_token`。
3. `auth` 中间件：解析 `Authorization: Bearer <token>` → 失败返回 `40101/40102`；把 `userId` 注入 `req.user`。
4. 权限：`project_members` + `role` 推导 `canExport/canSetDataLevel` 等（对应前端 `PermissionSet`）；L2 数据级别强制规则在服务端落实（`40302`/`40303`）。

---

## 6. 大模型接入设计（核心需求）

**目标**：后端不绑定任何厂商，给一个密钥 + baseURL + 模型名就能跑。

`.env`：
```env
LLM_BASE_URL=https://api.openai.com/v1      # 换成 DeepSeek/Moonshot/Qwen/GLM 的 /v1 即可
LLM_API_KEY=sk-xxxx                         # 任意厂商密钥
LLM_MODEL=gpt-4o-mini                       # 任意模型名
LLM_TIMEOUT_MS=120000
```

`src/llm/client.ts`（伪代码）：
```ts
// 任何支持 OpenAI /chat/completions 与 /embeddings 的厂商都能直接接
export async function chat(messages, opts?) {
  const base = opts?.baseUrl ?? process.env.LLM_BASE_URL
  const key  = opts?.apiKey  ?? process.env.LLM_API_KEY
  const model= opts?.model   ?? process.env.LLM_MODEL
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: opts?.temperature ?? 0.3, stream: false }),
  })
  return (await r.json()).choices[0].message.content
}
// embed(texts) 同理走 ${base}/embeddings
```

- **结构化输出**：要求模型返回 JSON（在 system prompt 里给 schema，再用 `zod` 解析）→ 直接映射到 `HotspotPageData`/`TopicKeywordData`/`Hypothesis[]` 等前端类型。
- **异步长任务**：大模型调用耗时较长（综述生成 180s、分析 25s），统一走 `taskService`：先 `INSERT tasks(status='running')` 返回 `taskId`，后台跑 LLM，前端 `GET /tasks/:id` 轮询（和前端 `pollTask` 约定完全一致）。
- **合规硬约束**（来自 API.md）：假设生成“只引用数据中真实存在的变量”；写作改写“仅改表达不改论断”；选刊“不得承诺必中”。这些写进 system prompt 并做后端校验。

---

## 7. 🔵 外部服务处理策略（诚实说明）

| 需求 | 推荐默认实现 | 备注 |
| --- | --- | --- |
| 文献语义检索 `searchLiterature` | **OpenAlex**（https://api.openai.com 之外的免费开放 API，无需密钥）+ 关键词/相关度打分；或调用 LLM 做重排 | 真·真实数据，零成本；Crossref 同理可加 |
| 期刊匹配 `journals/match` + 画像 | 内置一份期刊库（种子写入）+ LLM 按摘要/关键词打分匹配 | 画像里的 IF/录用率等需标注来源，合规要求 |
| Zotero 绑定 | 一期：本地记录绑定状态 + 支持导入/导出 `.bib`（Better BibTeX）；**完整 OAuth 同步放二期** | Zotero API 需要 OAuth，复杂度高，先不阻塞主流程 |
| 双 Agent 核验 `verify` | LLM 双角色提示（内容一致性 Agent + DOI 真实性 Agent） | DOI 真实性可接 Crossref 校验 |

---

## 8. 数据分析沙箱 `analysis/run`（已定：Python 真实计算）

这是 93 个接口里**唯一需要真·计算引擎**的地方（要出回归/中介/Bootstrap 的真实效应量与置信区间，且要求“可复现”）。**已确定首版就上 Python 真算，不走 LLM 占位。**

**方案**：上传的数据文件落到服务器 → 分析时用 `child_process` 调 **Python 脚本**（`pandas` + `statsmodels` + `scikit-learn`，做分层回归 / Bootstrap 中介 / 稳健性检验），结果回写 `analysis_runs`。你跑过深度学习训练，服务器 Python 环境现成，省一步。

要点：
- **文件解析**：CSV/XLSX 用 `pandas.read_*`；SPSS(`.sav`)/Stata(`.dta`) 用 `pyreadstat`。Node 侧只负责收文件 + 调起 Python + 读回 JSON 结果，不做统计计算。
- **异步**：仍走 `AsyncTask`（`POST analysis/run` 返回 `taskId` → 前端轮询 `GET /tasks/:id`），真实计算 20~120s。
- **可复现**：结果随行保存 `methodId / dataVersion / seed / nBoot / 运行环境`；前端「可复现代码」区块直接展示生成的 Python/R 片段（对齐 `CodeSnippet` 类型）。
- **健壮性**：Python 崩溃/超时 → task 标 `failed` 带中文 message；解析失败 → `FILE_FORMAT_UNSUPPORTED`。
- **兜底（仅本地调试）**：若开发机暂无 Python，可用 `ANALYSIS_MODE=llm` 临时切到 LLM 占位，**生产强制真实计算**，保证联调不卡住。

---

## 9. 前端联调方式（已对齐前端代码）

1. 后端跑在 `http://localhost:8080`。
2. 前端 `frontend/research-universe/` 根目录建 `.env.local`：`VITE_USE_MOCK=false`。
3. `vite.config.ts` 里 `/api` 代理 target 已是 `http://localhost:8080`（不用改）。
4. `npm run dev` → 前端请求直达后端；`src/api/endpoints.ts` 的 `request<T>()` 路径与 `API.md` 一致。
5. 演示数据：种子写入 `p_2001/2002/2003`，登录用开发态验证码即可看到设计稿全部页面。

---

## 10. 分阶段实施计划（建议顺序）

| 阶段 | 内容 | 覆盖接口 | 产出 |
| --- | --- | --- | --- |
| **P0 脚手架** | Express+TS+Prisma+MySQL+JWT+LLM 客户端+统一错误码中间件（同时确认 Python 运行环境可用：pandas/statsmodels/scikit-learn/pyreadstat） | — | 能起服务、返回 `ok()/fail()` |
| **P1 基础域** | auth / account / plan / project(+schedule/compliance/ddl/stage/progress/draft/settings) | ~45 | 工作台、账号、设置、新建项目全通 |
| **P2 内容域(LLM)** | intro(hotspot/theory/hypotheses) / literature(search+review+verify+qa) / writing(outline/section/paragraph/citation/suggestion) / journal / review / export(disclosure) | ~40 | 引言、文献、写作、选刊、评审、导出全通 |
| **P3 打磨域** | analysis 脚本与 `child_process` 调度的健壮性打磨（真实计算在 P2 即已联调）；zotero OAuth；文献源扩 Crossref | ~8 | 数据分析稳定出数 |
| **P4 部署** | Linux 服务器：PM2 + Nginx 反代 + MySQL；前端 `npm run build` 静态托管 | — | 上服务器跑通 |

---

## 11. 待你拍板的几个点（确认时一并说）

1. **框架**：Express（推荐，你熟）还是 NestJS（更工程化但需多学）？
2. **ORM**：Prisma（推荐）还是 `mysql2`+手写 SQL（更轻但易出错）？
3. ~~数据分析：简化 vs Python 真算~~ → **已定：直接上 Python 真算**（见第 8 节）。
4. **外部文献源**：默认用 OpenAlex（免费免密钥）可以吗？还是要接你们已有的文献库/付费源？
5. **短信**：开发期用“验证码直接返回”可以吗？生产短信网关用哪家？

---

## 12. 小结

前端已经把“接后端的路”铺好了（接口层、类型、错误码、Mock 开关齐全）。后端工作的本质是：
- 把 93 个契约翻译成 Express 路由 + Prisma 表；
- 把 🟡（LLM 类）接口接到“任意密钥的 OpenAI 兼容客户端”；
- 把 🔵（外部类）用 OpenAlex/Zotero/期刊库接上；
- 把分析沙箱用 Python 真算（已定，非 LLM 占位）。

**下一步**：你看完这份设计，告诉我“开始实现”以及上面第 11 节几个点的选择，我就按 P0→P4 的顺序把可直接运行的代码写出来（每个阶段给你能抄的命令 + 完整文件）。

---
*文档版本 v0.2 · 对应前端 API.md v1.0.0 · 分析沙箱已定 Python 真算。*
