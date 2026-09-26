# 后端接入准备度核查报告（backend-readiness.md）

> 你问的是：「所有地方是否都预留好了变量，便于后续接入后端？」
> **直接结论**：页面级业务数据**已经全部走接口层**（`src/api/endpoints.ts`，90 个函数，每函数含真实路径注释 + `ENDPOINT_REGISTRY` 登记）。
> 但原先有 **6 处「变量没预留 / 多处各存一份」** 的问题会让接后端时出问题，本轮已全部修掉；
> 还剩 **7 处「页面直连 Mock 常量」**，都是静态枚举/文案字典（不影响接后端，但建议下沉），逐条列在 §4。

---

## 一、本轮为「接后端」补齐/修正的 6 处（已实测）

| # | 问题（原状） | 为什么接后端会出问题 | 现在的做法 |
| --- | --- | --- | --- |
| 1 | **数据级别有两份状态**：P16 上传页用 `useDataFlowStore.detectedDataLevel`，P10 项目设置用 `useSettingsStore.draft/savedDataLevel`，互不同步 | 两页显示不同级别；L2 的强制规则（禁用 YOLO / 拦截导入 / 阻断导出）会按错误的级别生效，属合规风险 | 统一到 `useSettingsStore`，由 `GET /projects/:id/compliance` 载入、`PATCH /projects/:id/data-level` 保存；P16 与 P10 共用，改一处两处同步 |
| 2 | **「跳过逐条确认（YOLO）」是三处各存一份**：P03 `useState(strictMode)`、P16 `useState(strictConfirm)`，都不落库 | 切页即重置；不同页面显示相反状态；无法持久化到后端 | 统一到 `useSettingsStore.skipConfirm`，由同一个 compliance 接口载入、`PATCH /projects/:id/skip-confirm` 保存；P10 增加只读展示 |
| 3 | **顶栏通知写死在组件里**：2 条文案 + 未读数「2」硬编码 | 接后端要改组件；未读数无法由服务端驱动 | 新增 `GET /me/notifications` + `POST /me/notifications/read`，未读数由服务端计算；通知项支持 `route` 点击跳转、单条已读、全部已读 |
| 4 | **没有账号资料读写接口**（此前「用户信息」只是展示） | 无法修改昵称/学科/年级，也没有设备管理与隐私开关 | 新增账号设置页 `/account` 与 7 个接口：`GET /me/account`、`PATCH /me`、`POST /me/devices/revoke-others`、`PATCH /me/notifications`、`PATCH /me/privacy`、`POST /me/data-export`、`DELETE /me` |
| 5 | **DDL 关键词无接口**（新需求本身） | — | 新增 `GET /projects/ddl-keywords` + `PATCH /projects/:id/ddl-keyword`，每个项目可选 1 个关键词，节点渲染为「关键词：节点名」 |
| 6 | **Mock 写接口不落库**：`PATCH` 只返回参数不改内存数据，保存后再 `GET` 仍是旧值 | 跨页校验时会看到「保存后又弹回去」，让人误以为前端没接好 | 写入辅助函数直接改内存记录：`applyDataLevel` / `skipConfirm` / `ddlKeyword` / `updateMe`，使 Mock 行为贴近真实后端（已用「P03 开 YOLO → 跳到 P16 仍为开」实测通过） |

另外顺手修掉一处接口层遗漏：`logout` 此前未登记进 `ENDPOINT_REGISTRY`，已补。

---

## 二、接口层完备度（脚本实测，非估算）

| 指标 | 数值 | 说明 |
| --- | --- | --- |
| `export async function` 总数 | **90** | 覆盖认证、账号、套餐、项目、日程、引言、文献、分析、写作、选刊、评审、导出、设置 |
| 含 `if (!USE_MOCK)` 真实调用分支 | **89** | 唯一例外是 `pollTask`，它是前端轮询辅助函数，本就不是 REST 调用 |
| `ENDPOINT_REGISTRY` 登记条数 | **91** | 与实现一一对应，`ENDPOINT_REGISTRY` 即「接口清单真源」 |
| `src/types/index.ts` 类型定义 | 全部接口均有对应 `interface` | 组件里没有 inline 结构推断出来的隐式契约 |

**接入方式**（无需改组件代码）：
1. 新建 `.env.local`，写入 `VITE_USE_MOCK=false`；
2. `vite.config.ts` 里把 `server.proxy['/api'].target` 改成真实后端地址；
3. 后端按 `docs/API.md` 的字段与错误码返回即可（`src/api/client.ts` 已定义 14 个业务错误码与 `ApiError`）。

---

## 三、逐页变量来源核查

| 页面 | 数据变量 | 来源 | 可接后端 |
| --- | --- | --- | --- |
| P01 工作台 | 项目列表 / 问候语 / 列表说明 | `fetchProjects` | ✅ |
| P01 | 全部项目 DDL 节点 | `fetchAllDdlTimeline` | ✅ |
| P01 | DDL 概述关键词 | `fetchDdlKeywords` / `updateDdlKeyword` | ✅ |
| P01 | 本阶段产物摘要 | `fetchStageArtifacts` | ✅ |
| P12 登录 | 登录 / 验证码 / 学生认证 | `login` / `sendSmsCode` / `submitStudentVerification` | ✅ |
| **P13 账号设置** | 资料 / 设备 / 通知偏好 / 隐私 | `fetchAccountSettings` + 6 个写接口 | ✅ 新增 |
| P02 研究热点 | 研究方向输入 / 分析结果 | `fetchHotspot` / `analyzeHotspot` / `confirmDirection` | ✅ |
| P14 热词 | 方向 / 学科 / 词频 / 趋势 | `fetchTopicKeywords` / `analyzeTopicKeywords` | ✅ |
| P15 理论 | 理论候选 / 变量草稿 | `fetchTopicTheory` / `selectTheory` | ✅ |
| P16 上传 | 支持格式 / 最大体积 / 已传文件 / 公共库 | `fetchDataUpload` | ✅ |
| P16 | **数据级别 + YOLO** | `fetchProjectCompliance` / `updateDataLevel` / `updateSkipConfirm` | ✅ 本轮修正 |
| P17 变量 | 体检指标 / 变量清单 / 角色 | `fetchVariables` / `updateVariable` / `confirmVariables` | ✅ |
| P18 假设 | 假设清单 / 快捷追问 | `fetchHypotheses` / `generateHypotheses` / `confirmHypotheses` | ✅ |
| P03 文献 | 结果 / 已选 / 核验 / 知识库问答 | `fetchLiterature` / `searchLiterature` / `updateSelection` / `kbQa` | ✅ |
| P03 | **YOLO 开关** | 同 §1-2 | ✅ 本轮修正 |
| P04 分析 | 方法 / 体检 / 稳健性 / 结果 | `fetchAnalysis` / `fetchHealthReport` / `fetchMethods` / `runAnalysis` | ✅ |
| P05 写作 | 大纲 / 段落 / 引用 / Zotero | `fetchWriting` / `saveWritingDoc` / `regenerateSection` / … | ✅ |
| **P11 编辑器** | **正文块 / 可插入引用 / 改写动作** | **本轮并入 `fetchWriting` 载荷** | ✅ 本轮修正 |
| P06 选刊 | 匹配 / 期刊画像 / 检查清单 | `fetchJournals` / `rematchJournals` / `fetchJournalProfile` | ✅ |
| P07 评审 | 意见 / 校准 / 修改摘要 | `fetchReview` / `recalibrateReview` / `handleReviewIssue` | ✅ |
| P08 导出 | 产物 / 披露 / 合规校验 | `fetchExportCenter` / `generateDisclosure` / `exportArtifacts` | ✅ |
| P09 定价 | 套餐 / 额度项 / 用量 | `fetchPlans` / `fetchQuota` / `changePlan` | ✅ |
| P10 设置 | 项目信息 / 成员 / 版本 / 定级 | `fetchProjectSettings` / `updateProject` / `updateDataLevel` | ✅ |

结论：**上表所有「业务变量」都已接口化**；页面里剩下的 `useState` 只有三类，都不需要后端：加载态（`loading`）、表单草稿（`nickname` / `query` / `codes`）、接口数据的容器。

---

## 四、仍写在代码里、但**不属于业务数据**的 7 处（逐条给建议）

| # | 位置 | 现在是什么 | 评价与建议 |
| --- | --- | --- | --- |
| 1 | P16 `DATA_LEVEL_CARDS` / `DATA_SAFETY_NOTES` / `DATA_SECURITY_TAGS` / `SENSITIVE_DETECT_TEXT` | 分级说明与安全提示文案 | **建议下沉**：这类政策文案会随合规要求变化，建议由 `GET /app/policy` 或 `compliance` 载荷下发（含版本号，便于留痕引用具体版本） |
| 2 | P17/P15 `ROLE_LABEL_MAP` | 变量角色中英标签映射 | **建议统一字典**：两页各 import 同一份，若后端要下发（多语言/可配置），建议 `GET /app/dict?key=variableRole`；当前至少已做到同一文件单源 |
| 3 | P07 `REVIEW_TYPE_META` | 意见类型（硬伤/争议/风格）的标签与配色 | **建议随载荷下发**：`fetchReview` 已经在返回意见列表，把类型元数据一并下发最自然（含排序与配色名） |
| 4 | P18 `ETHICS_NOTES` | 4 条伦理提示 | **建议下沉**：这属于合规声明，与 #1 同类，建议合并进 `GET /app/policy` |
| 5 | P09 `OVERAGE_TEXT` | 超额处理的三条说明 | **建议并入 `GET /plans`**：超额政策与套餐强相关，放一起可避免版本错配 |
| 6 | P08 `EXPORT_FOOTNOTE` | 导出页脚注/合规说明 | **建议并入 `fetchExportCenter`**：与披露报告同源，便于统一版本 |
| 7 | P12 `BRAND_POINTS` | 登录页 3 条品牌宣传语 | **可保留在前端**：纯营销文案，若要运营可配置再走 `GET /app/config` |

> 这 7 处**不会阻断后端接入**——它们只是「文案/枚举字典」而非业务数据，接口接上后页面照常工作。
> 但若你的目标是「运营可改文案、合规可发版本」，建议按上表顺序下沉；我可以按这个清单一次性改完。

---

## 五、接后端时仍需后端补功能的 10 个前端已留位点

前端已定义类型/界面，但接口尚未开发（`docs/API.md` 中标注为 🟡 前端 Mock）：

| # | 需求 | 前端现状 | 需要的接口 |
| --- | --- | --- | --- |
| 1 | 文献结果分页 | `PageResult<T>` 类型已备，界面未分页 | `GET /literature` 支持 `page/pageSize` |
| 2 | 已选文献集展开与移除 | 只有数字，无列表接口 | `GET /projects/:id/literature/selection` |
| 3 | 写作页版本历史/回滚 | 无入口 | `GET /projects/:id/writing/versions` |
| 4 | 段落改写 diff 预览 | 只有 `rewrite` 动作 | `rewrite` 返回 `{ original, revised }` |
| 5 | 数据质量问题处理策略 | 「确认处理」无策略可选 | `PATCH /projects/:id/data/quality-issues/:issueId`（带 `strategy`） |
| 6 | 导出历史与下载 | 只返回 `downloadUrl` 文本 | `GET /projects/:id/exports`、`GET /exports/:exportId/download` |
| 7 | 异步任务取消 | 任务弹窗不可关闭 | `POST /tasks/:taskId/cancel` |
| 8 | 单条通知已读 | 只有「全部已读」 | `PATCH /me/notifications/:notificationId` |
| 9 | 成员移除 / 改角色 | 成员表只读 | `PATCH`、`DELETE /projects/:id/members/:memberId` |
| 10 | 期刊对比 | 无 | `POST /journals/compare` |

---

## 六、本轮追加：新建项目的跳转变量（你反馈的「跳转错误」）

### 6.1 根因

`src/pages/Workspace.tsx` 的 `confirmCreate()` 此前**既没有调用 `POST /projects`，也没有看所选类型**：

```tsx
// 修复前
pushToast({ tone: 'ok', title: '已创建新项目', … })
navigate('/project/p_2001/intro')     // ← 写死跳到已存在的 p_2001
```

于是不管选「理论驱动」还是「数据驱动」，都跳到同一个既有项目上 —— 这就是「新建项目跳转错误」。

### 6.2 修复后的契约

```ts
POST /projects  { title, discipline, route }
  → { project: Project, entryRoute: string }
```

| `route` | 流程（依设计稿 IA） | `entryRoute` |
| --- | --- | --- |
| `theoryDriven` | 研究热点 → 领域研究热词 → 选择理论与变量 | `/project/{projectId}/intro` |
| `dataDriven` | 上传数据 → 变量识别 → 生成研究假设 | `/project/{projectId}/intro/data/upload` |

- **落点由服务端 `entryRoute` 决定**，前端不再写死 → 流程顺序可服务端配置；
- 弹窗在选中类型时直接显示落点（「创建后进入『上传数据』：上传 → 变量识别 → 生成研究假设」），预期与结果一致；
- 创建成功后：新项目插入工作台列表首位、写入 `currentProjectId`、跳转到 `entryRoute`。

### 6.3 创建项目时必须一并初始化的 7 组变量

缺任何一组，用户在新项目的落地页就会看到空态或读不到数据（详见 `docs/API.md` §16.6.2）：
① 项目实体 → ② 项目日程（5 阶段 + 4 硬节点，从当天起算）→ ③ 合规设置（L1 / skipConfirm=false）
→ ④ DDL 概述关键词（取标题主干词）→ ⑤ 阶段产物（空数组）→ ⑥ 版本记录 v1 → ⑦ 成员（当前用户为第一作者）。

### 6.4 建议后续由服务端下发的流程变量

| 变量 | 现状 | 建议 |
| --- | --- | --- |
| `CreateProjectRes.entryRoute` | **已实现** | 保持 |
| `POST /intro/confirm-direction` 的 `nextRoute` | 服务端已返回（当前固定 `/literature`） | 建议按 `project.route` 分流：理论驱动 → `/intro/topic/keywords`；数据驱动 → `/intro/data/upload` |
| `HotspotPageData.nextStep = { label, route }` | 不存在 | 新增该字段，让「确认方向」按钮的**文案与落点一起可配置**，否则前端只能写中性文案 |

> **我按你的两张图实现的口径**：理论驱动落「研究热点」、数据驱动落「上传数据」（图中两条流程各自的第一步）。
> 如果你的预期是「两条分支都先落研究热点，再由该页分流」，那么只需把 `entryRoute` 都改成 `/intro` 并让
> `confirm-direction` 按 route 分流即可 —— 因为落点已经由服务端下发，改这一处不涉及前端发版。

### 6.5 本轮验证

| 验证项 | 方式 | 结果 |
| --- | --- | --- |
| 类型检查 / 构建 | `tsc --noEmit` + `npm run build` | 0 error；873 modules，主包 246.3 kB |
| 数据驱动新建 | 点新建 → 选「数据驱动」→ 确认 | 跳转 `/project/p_1790259252202/intro/data/upload`（**新 id** + 上传数据页），页面正常渲染、含「数据分级与合规」 |
| 理论驱动新建 | 点新建 → 选「理论驱动」→ 确认 | 跳转 `/project/p_1790259280145/intro`（**新 id** + 研究热点页），渲染正常 |
| 弹窗提示 | 展开弹窗 | 选中项下方显示「创建后进入『上传数据』：上传 → 变量识别 → 生成研究假设」 |
| Mock 落库说明 | — | Mock 的新项目存在内存中，**刷新页面会复位**（真实后端落库后即持久）；这一点已写入文档 |

---

## 七、本轮验证记录

| 验证项 | 方式 | 结果 |
| --- | --- | --- |
| 类型检查 | `tsc --noEmit` | **0 error** |
| 生产构建 | `npm run build` | **873 modules**，主包 243.4 kB |
| DDL 关键词渲染 | 断言页面文本 | 首屏即出现「导师制：开题答辩」「社交焦虑：中期检查」「短视频：投稿截止」等「关键词：节点名」形式 |
| 关键词切换 | 弹窗里把 p_2002 由「短视频」改为「睡眠质量」 | 列表对应行同步变为「睡眠质量：投稿截止」，示例文案同步更新 |
| 跨页共享（YOLO） | P03 打开开关 → SPA 跳 P16 | P16 读到 **true**（同一 store + Mock 已落库） |
| 顶栏通知 | 展开铃铛 / 点「全部已读」 | 列表来自接口（含第 3 条已读项）；未读角标与「全部已读」按钮随之消失 |
| 首页标签移除 | 断言 `学生认证已核验` | 不存在（未认证提醒仍保留） |
| 头像跳转 | 点击顶栏头像 | 跳转 `/account`，六个分区全部渲染 |
| 全站回归 | 8 条路由 + `errors` | 全部 **0 页面错误** |

---

## 八、我做的三个默认假设（如与你的预期不符请指出）

1. **数据级别在 P16 只改草稿、需点「保存定级」才生效**：与 P10 保持一致，避免在「上传数据」页误改全局合规规则。原先 P16 是「点一下就算改了」但并不落库。
2. **P10 的「跳过逐条确认」做成只读展示**：开关仍只在 P03 / P16 操作，但三处共用同一状态，P10 显示当前值并注明入口在哪。若你希望 P10 也能直接改，我把它改成可操作即可。
3. **新建项目的分支落点**：理论驱动 → 研究热点、数据驱动 → 上传数据（依据你给的两张流程图各自的第一步）。落点已改由服务端 `entryRoute` 下发，若要改成「先都进研究热点再分流」，改服务端一处即可。
