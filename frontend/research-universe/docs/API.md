# 研宇宙 Research Universe · 后端接口文档（API.md）

> 版本：v1.0.0 ｜ Base URL：`/api/v1` ｜ 认证方式：`Authorization: Bearer <token>`

---

## 0. 阅读约定

### 0.1 「真实 / Mock」标注

文档中每个接口都标注了数据来源状态：

| 标注 | 含义 |
| --- | --- |
| 🟢 **真实接口** | 路径、Method、参数、响应均已定稿，后端按此实现即可；前端已写好调用点 |
| 🟡 **前端 Mock** | 前端目前由 `src/mocks/db.ts` 直接返回设计稿中的模拟数据；后端接口**待开发**，但路径与结构已约定 |
| 🔵 **外部服务** | 转发 / 对接第三方（Crossref、JCR、Zotero、Web of Science），需后端代理 |

> 设计稿中出现的全部模拟数值（如「128 条结果」「核验通过率 96%」「512 行 × 36 列」）都视为
> **接口返回数据的渲染示例**，对应关系见 [`VARIABLES.md`](VARIABLES.md)。

### 0.2 统一响应包装

所有接口（除文件下载流）统一返回：

```ts
interface ApiResponse<T> {
  code: number        // 0 表示成功，非 0 见「错误码」表
  message: string     // 成功为 'ok'，失败为可展示给用户的中文文案
  data: T             // 业务数据
  traceId: string     // 服务端追踪 id，便于排错（前端会一并打印）
}
```

HTTP 状态码约定：业务错误统一返回 **HTTP 200 + code 非 0**；仅鉴权失败返回 `401`、服务异常返回 `5xx`。

### 0.3 分页约定

```ts
interface PageQuery { page?: number; pageSize?: number }   // 默认 page=1, pageSize=20

interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
```

### 0.4 异步任务约定

沙箱分析、结构化综述生成、双 Agent 核验等长任务统一为「提交 → 轮询」两段式：

```ts
type AsyncTaskStatus = 'idle' | 'pending' | 'running' | 'succeeded' | 'failed'

interface AsyncTask {
  taskId: string
  status: AsyncTaskStatus
  progress: number          // 0-100
  etaSeconds?: number       // 预计剩余秒数
  message?: string          // 可展示的进度文案
  startedAt?: string
  finishedAt?: string
}
```

---

## 1. 错误码表

| code | 名称 | HTTP | 说明 | 前端处理 |
| --- | --- | --- | --- | --- |
| `0` | OK | 200 | 成功 | — |
| `40001` | PARAM_INVALID | 200 | 参数校验失败（如验证码不是 6 位数字） | 表单内联报错 |
| `40101` | UNAUTHORIZED | 401 | 未登录 / token 无效 | 跳转 `/login` |
| `40102` | TOKEN_EXPIRED | 401 | token 过期 | 刷新 token，失败则跳登录 |
| `40301` | FORBIDDEN_ROLE | 200 | 当前角色无权限（如协作学生尝试导出） | Toast 提示 + 按钮置灰 |
| `40302` | DATA_LEVEL_BLOCKED | 200 | 数据分级拦截（L2 禁止导出原始数据行等） | 弹分级说明弹窗 |
| `40303` | EXPORT_BLOCKED_BY_VERIFY | 200 | 存在未验证文献 / 待补齐产物，阻断导出 | 跳导出中心处理 |
| `40401` | NOT_FOUND | 200 | 资源不存在 | 空态页 |
| `40901` | TASK_ALREADY_RUNNING | 200 | 同一项目已有沙箱任务在跑 | 提示「分析进行中」 |
| `41301` | FILE_TOO_LARGE | 200 | 单文件超过 200MB | Toast 报错 |
| `41501` | FILE_FORMAT_UNSUPPORTED | 200 | 格式不在 CSV/XLSX/SAV/DTA 之列 | Toast 报错 |
| `42901` | QUOTA_EXCEEDED | 200 | 套餐额度用尽 | 引导升级套餐 |
| `50001` | SERVER_ERROR | 5xx | 服务端异常 | 错误态 + 重试 |
| `50002` | TASK_FAILED | 200 | 异步任务执行失败 | 任务弹窗失败态 |

---

## 2. 接口总览

| # | Method | 路径 | 数据来源 | 对应界面 |
| --- | --- | --- | --- | --- |
| 1 | POST | `/auth/login` | 🟢 | P12 |
| 2 | POST | `/auth/sms-code` | 🟢 | P12 |
| 3 | POST | `/auth/logout` | 🟢 | 全局 |
| 4 | GET | `/me` | 🟢 | 全局（顶栏） |
| 5 | GET | `/me/student-verification` | 🟢 | P12 / 顶栏 |
| 6 | POST | `/me/student-verification` | 🟢 | P12 |
| 6a | GET | `/me/account` | 🟢 | P13 |
| 6b | PATCH | `/me` | 🟢 | P13 |
| 6c | POST | `/me/devices/revoke-others` | 🟢 | P13 |
| 6d | PATCH | `/me/notifications` | 🟢 | P13 |
| 6e | PATCH | `/me/privacy` | 🟢 | P13 |
| 6f | POST | `/me/data-export` | 🟢 | P13 |
| 6g | DELETE | `/me` | 🟢 | P13 |
| 7 | GET | `/plans` | 🟢 | P09 |
| 8 | GET | `/me/quota` | 🟢 | P09 / 全局侧栏 |
| 9 | POST | `/me/plan` | 🟢 | P09 |
| 10 | GET | `/projects` | 🟢 | P01 |
| 11 | GET | `/projects/:projectId` | 🟢 | 全局 |
| 12 | POST | `/projects` | 🟢 | P01 |
| 13 | GET | `/projects/ddl` | 🟢 | P01（全部项目的 DDL，工作台右栏） |
| 13a | ~~GET `/projects/:projectId/ddl`~~ | — | ⛔ **页面已不再使用**：工作台改为跨项目合并列表，改用 `GET /projects/ddl` | — |
| 14 | GET | `/projects/:projectId/stage-artifacts` | 🟢 | P01 |
| 14a | ~~GET `/projects/:projectId/kanban`~~ | — | ⛔ **已废弃**：项目流程看板按需求移除，阶段信息改由日程派生 | — |
| 15 | GET | `/projects/:projectId/intro/hotspot` | 🟢 | P02 |
| 16 | POST | `/projects/:projectId/intro/hotspot/analyze` | 🟢 | P02 |
| 17 | POST | `/projects/:projectId/intro/confirm-direction` | 🟢 | P02 |
| 18 | GET | `/projects/:projectId/intro/topic/keywords` | 🟢 | P14 |
| 19 | POST | `/projects/:projectId/intro/topic/keywords/analyze` | 🔵 | P14 |
| 20 | POST | `/projects/:projectId/intro/topic/keywords/lock` | 🟢 | P14 |
| 21 | GET | `/projects/:projectId/intro/topic/theory` | 🟢 | P15 |
| 22 | POST | `/projects/:projectId/intro/topic/theory/select` | 🟢 | P15 |
| 23 | GET | `/projects/:projectId/data/upload` | 🟢 | P16 |
| 24 | POST | `/projects/:projectId/data/files` | 🟢 | P16 |
| 25 | DELETE | `/projects/:projectId/data/files/:fileId` | 🟢 | P16 |
| 26 | POST | `/projects/:projectId/data/import-public` | 🟢 | P16 |
| 27 | POST | `/projects/:projectId/data/sample/:sampleId` | 🟢 | P16 |
| 28 | GET | `/projects/:projectId/data/variables` | 🟢 | P17 |
| 29 | PATCH | `/projects/:projectId/data/variables/:varName` | 🟢 | P17 |
| 30 | POST | `/projects/:projectId/data/variables/confirm` | 🟢 | P17 |
| 31 | GET | `/projects/:projectId/data/hypotheses` | 🟢 | P18 |
| 32 | POST | `/projects/:projectId/data/hypotheses/generate` | 🟢 | P18 |
| 33 | POST | `/projects/:projectId/data/hypotheses/confirm` | 🟢 | P18 |
| 34 | GET | `/projects/:projectId/literature` | 🟢 | P03 |
| 35 | POST | `/projects/:projectId/literature/search` | 🔵 | P03 |
| 36 | POST | `/projects/:projectId/literature/selection` | 🟢 | P03 |
| 37 | POST | `/projects/:projectId/literature/upload` | 🟢 | P03 |
| 38 | POST | `/projects/:projectId/literature/generate-review` | 🟡 | P03 |
| 39 | POST | `/projects/:projectId/literature/verify` | 🟡 | P03 |
| 40 | POST | `/projects/:projectId/kb/qa` | 🟡 | P03 |
| 41 | POST | `/projects/:projectId/literature/bring-to-writing` | 🟢 | P03 → P05 |
| 42 | GET | `/tasks/:taskId` | 🟢 | 全局异步 |
| 43 | GET | `/projects/:projectId/analysis` | 🟢 | P04 |
| 44 | POST | `/projects/:projectId/analysis/import` | 🟢 | P04 |
| 45 | GET | `/projects/:projectId/analysis/health-report` | 🟢 | P04 |
| 46 | GET | `/projects/:projectId/analysis/methods` | 🟢 | P04 |
| 47 | POST | `/projects/:projectId/analysis/run` | 🟡 | P04 |
| 48 | GET | `/projects/:projectId/analysis/runs/:runId` | 🟡 | P04 |
| 49 | POST | `/projects/:projectId/analysis/rollback` | 🟢 | P04 |
| 50 | GET | `/projects/:projectId/writing` | 🟢 | P05 / P11 |
| 51 | PATCH | `/projects/:projectId/writing/doc` | 🟢 | P05 / P11 |
| 52 | POST | `/projects/:projectId/writing/outline/generate` | 🟡 | P05 |
| 53 | POST | `/projects/:projectId/writing/section/regenerate` | 🟡 | P05 |
| 54 | POST | `/projects/:projectId/writing/paragraph/rewrite` | 🟡 | P05 |
| 55 | POST | `/projects/:projectId/writing/citation` | 🟢 | P05 / P11 |
| 56 | POST | `/projects/:projectId/writing/ai-suggestion/adopt` | 🟢 | P11 |
| 57 | GET | `/integrations/zotero/status` | 🔵 | P05 |
| 58 | POST | `/integrations/zotero/bind` | 🔵 | P05 |
| 59 | GET | `/projects/:projectId/journals` | 🟢 | P06 |
| 60 | POST | `/projects/:projectId/journals/match` | 🔵 | P06 |
| 61 | GET | `/journals/:journalId/profile` | 🔵 | P06 |
| 62 | POST | `/projects/:projectId/submission-package` | 🟢 | P06 |
| 63 | GET | `/projects/:projectId/review` | 🟢 | P07 |
| 64 | POST | `/projects/:projectId/review/recalibrate` | 🟡 | P07 |
| 65 | PATCH | `/projects/:projectId/review/issues/:issueId` | 🟢 | P07 |
| 66 | POST | `/projects/:projectId/review/rebuttal` | 🟡 | P07 |
| 67 | GET | `/projects/:projectId/export` | 🟢 | P08 |
| 68 | POST | `/projects/:projectId/export/disclosure` | 🟡 | P08 |
| 69 | POST | `/projects/:projectId/export/artifacts` | 🟢 | P08 |
| 70 | POST | `/projects/:projectId/export/confirm-unverified` | 🟢 | P08 |
| 71 | POST | `/projects/:projectId/export/upload-pdf` | 🟢 | P08 |
| 72 | GET | `/projects/:projectId/settings` | 🟢 | P10 |
| 73 | PATCH | `/projects/:projectId` | 🟢 | P10 |
| 74 | PATCH | `/projects/:projectId/data-level` | 🟢 | P10 |
| 75 | POST | `/projects/:projectId/members/invite` | 🟢 | P10 |
| 76 | POST | `/projects/:projectId/versions/:versionNo/rollback` | 🟢 | P10 |

---

## 3. 认证与用户

### 3.1 `POST /auth/login` 🟢
登录 / 注册（验证码登录）。**对应 P12。**

账号规则（前后端一致，见 `src/api/endpoints.ts` 的 `validateAccount()`）：**仅允许 11 位手机号或合法邮箱**。

`intent` 决定「账号不存在」时的行为，登录页的「注册 / 登录」切换即映射到该字段：

| intent | 账号不存在时 | 账号已存在时 |
| --- | --- | --- |
| `login`（默认） | 报 `40001`，**不建号** | 正常登录，`isNewUser: false` |
| `register` | 创建新用户，`isNewUser: true` | 直接登录，`isNewUser: false` |

**请求**

```ts
interface LoginReq {
  account: string  // 11 位手机号或邮箱，示例："13800000000" / "chen@stu.example.edu.cn"
  code: string     // 6 位数字验证码，示例："836521"
  intent?: 'login' | 'register'  // 默认 login
}
```

**响应**

```ts
interface LoginRes {
  auth: {
    loggedIn: boolean
    token: string | null
    user: UserInfo | null
  }
  verification: StudentVerification
  /** 本次是否为新建账号（前端据此提示「注册成功」） */
  isNewUser: boolean
}

interface UserInfo {
  userId: string
  nickname: string      // 演示账号 "陈同学"；真实注册用户按账号推导（邮箱取 @ 前缀 / 手机号取后 4 位）
  avatarText: string    // 头像文案，如 "陈" / "用户"
  major: string         // 演示账号 "心理学"；新注册用户为 "待完善"，由本人补全
  grade: string         // 演示账号 "研二"；新注册用户为 "待完善"
  eduEmail?: string
  hasContact: boolean
}

interface StudentVerification {
  verified: boolean
  channel: 'eduEmail' | 'chsi' | 'none'
  eduEmail?: string
  verifiedAt?: string
  benefitsSynced: boolean   // 权益是否已同步到定价与额度系统
  graceDays: number         // 失效后宽限天数（设计稿为 90）
}
```

**错误码**：`40001`（账号格式不合法 / 该账号尚未注册 / 验证码格式错误）

**前端落点**：`src/pages/Login.tsx` → `handleLogin()`；成功后写入 `localStorage.ru_token`。

---

### 3.2 `POST /auth/sms-code` 🟢
发送验证码。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `account` | string | 是 | 手机号或邮箱 |

```ts
interface SendSmsCodeRes { cooldownSeconds: number }  // 设计稿显示 "52s 后重发"
```

---

### 3.3 `POST /auth/logout` 🟢
```ts
// 响应
interface LogoutRes { success: boolean }
```

### 3.4 `GET /me` 🟢
返回 `UserInfo`（见 3.1）。

### 3.5 `GET /me/student-verification` 🟢
返回 `StudentVerification`（见 3.1）。

### 3.6 `POST /me/student-verification` 🟢
提交学生认证。

```ts
interface SubmitVerificationReq {
  channel: 'eduEmail' | 'chsi'
  eduEmail?: string     // channel=eduEmail 必填，需匹配 /\.edu(\.cn)?$/
  reportFileId?: string // channel=chsi 时上传学信网验证报告的 fileId
}
// 响应：StudentVerification
```

**错误码**：`40001`（邮箱不符合教育邮箱规则）

### 3.7 `GET /me/account` 🟢 **（P13 账号设置页数据源）**
返回账号设置页所需的全部数据（基本资料 + 认证 + 套餐额度 + 登录设备 + 通知偏好 + 隐私设置）。

```ts
interface AccountSettings {
  userId: string
  nickname: string
  avatarText: string          // 文字头像，取昵称首字
  major: string
  grade: string
  phoneMasked: string         // 已脱敏，例如 "138****0000"
  eduEmail?: string
  hasContact: boolean
  registeredAt: string
  verification: StudentVerification
  planId: 'student' | 'pro' | 'team'
  quota: QuotaUsage
  devices: LoginDevice[]
  notifications: NotificationPref[]
  privacy: AccountPrivacy
  majorOptions: string[]      // 表单下拉可选项
  gradeOptions: string[]
}

interface LoginDevice {
  deviceId: string
  deviceName: string          // "Chrome · Windows"
  locationText: string        // "116.25.***.12 · 深圳"
  lastActiveAt: string
  current: boolean            // 当前设备不可被「退出其他设备」移除
}

interface NotificationPref {
  key: 'verifyFailed' | 'ddlReminder' | 'taskDone' | 'weeklyReport' | 'productUpdate'
  label: string
  description: string
  enabled: boolean
  mandatory?: boolean         // true = 合规强制开启，前端置灰不可关闭
}

interface AccountPrivacy {
  allowTraining: boolean      // 是否允许本人数据进入训练集，默认 false
  keepHistoryDays: number
  exportRequestedAt?: string
}
```

### 3.8 `PATCH /me` 🟢
更新基本资料。**头像文字由服务端按昵称首字重算**，前端保存成功后需用返回值刷新全局用户信息。

```ts
interface UpdateMeReq { nickname?: string; major?: string; grade?: string }
interface UpdateMeRes { user: UserInfo; savedAt: string }
```
**错误码**：`40001`（昵称为空或超长）

### 3.9 `POST /me/devices/revoke-others` 🟢
退出除当前设备外的全部登录会话。**不可逆**，前端已加二次确认。

```ts
interface RevokeOthersRes { success: boolean; revokedCount: number }
```

### 3.10 `PATCH /me/notifications` 🟢
```ts
interface UpdateNotificationReq { key: NotificationPref['key']; enabled: boolean }
interface UpdateNotificationRes { notifications: NotificationPref[] }   // 返回全量，便于前端覆盖
```
**错误码**：`40001`（对 `mandatory: true` 的项尝试关闭）

### 3.11 `PATCH /me/privacy` 🟢
```ts
interface UpdatePrivacyReq { allowTraining?: boolean; keepHistoryDays?: number }
// 响应：AccountPrivacy
```
> `allowTraining` 默认 `false`；开启会写入《AI 工具使用情况说明》并留痕，关闭后历史批次不可撤回。

### 3.12 `POST /me/data-export` 🟢
申请导出「我的数据」。
```ts
interface DataExportRes { requestedAt: string; etaText: string }
```

### 3.13 `DELETE /me` 🟢
注销账号。**不可逆**，前端要求输入确认词「注销账号」后才提交。
```ts
interface DeleteAccountReq { confirmText: string }   // 必须严格等于 "注销账号"
interface DeleteAccountRes { success: boolean }
```
**错误码**：`40001`（确认词不匹配）、`40301`（存在未完成的导出任务，需先处理）

---

## 4. 套餐与额度

### 4.1 `GET /plans` 🟢 (P09)
```ts
interface PlansRes {
  plans: Plan[]
  quotaItems: QuotaItem[]
}

interface Plan {
  planId: 'student' | 'pro' | 'team'
  name: string                 // "学生版" / "专业版" / "团队版"
  subtitle: string             // "适合硕士 / 青年科研人员"
  price: number                // 19 / 49 / 129
  priceUnit: 'month' | 'monthPerMember'
  currency: 'CNY'
  highlights: string[]
  mostPopular?: boolean        // 专业版为 true
  recommendedFor?: string
}

interface QuotaItem {
  key: string      // search | review | verify | sandbox | export
  label: string    // "综述生成"
  student: string  // "20 次/月"
  pro: string
  team: string
}
```

**Mock 数据**（设计稿原文）：

| 额度项 | 学生版 | 专业版 | 团队版 |
| --- | --- | --- | --- |
| 文献检索次数 | 不限 | 不限 | 不限 |
| 综述生成 | 20 次/月 | 80 次/月 | 不限 |
| 双 Agent 核验 | 500 条/月 | 2,000 条/月 | 不限 |
| 沙箱算力 | 300 分钟/月 | 1,500 分钟/月 | 5,000 分钟/月 |
| 导出次数 | 20 次/月 | 不限 | 不限 |

### 4.2 `GET /me/quota` 🟢
```ts
interface QuotaUsage {
  planId: PlanId
  resetAt: string                    // "2026-10-01 00:00"
  reviewGenerateUsed: number
  reviewGenerateLimit: number
  verifyUsed: number
  verifyLimit: number
  sandboxMinutesUsed: number
  sandboxMinutesLimit: number
  exportUsed: number
  exportLimit: number
  overagePolicy: 'throttle' | 'payAsYouGo'   // 默认 throttle（降速不中断）
}
```

### 4.3 `POST /me/plan` 🟢
```ts
interface ChangePlanReq { planId: PlanId }
// 响应：QuotaUsage（切换后额度立即生效，已用量不结转）
```
**错误码**：`40001`（套餐 id 非法）、`42901`（团队版需联系销售，不走此接口）

---

## 5. 项目与工作台（P01）

### 5.1 `GET /projects` 🟢
| 查询参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | number | 1 | |
| `pageSize` | number | 20 | |
| `sort` | `recentEdited` \| `ddl` | `recentEdited` | 设计稿文案「按最近编辑排序」 |

```ts
type PageResult<Project> & { metaText: string; greeting: string }

interface Project {
  projectId: string
  title: string
  discipline: string              // "心理学"
  route: 'dataDriven' | 'theoryDriven'
  stageLabel: string             // "数据分析中"
  stage: 'topic' | 'literature' | 'analysis' | 'writing' | 'submission'
  progress: number               // 0-100
  /** 当前阶段名，用于卡片「最新进度」展示（由 /schedule 派生） */
  currentPhaseName: string       // "数据分析"
  /** 当前阶段区间（由 /schedule 派生） */
  currentPhaseRange: string      // "10.16‒11.05"
  lastEditedText: string         // "2 小时前编辑"
  mainDdlName: string            // "中期检查"
  mainDdlDaysLeft: number        // 12
  footnote: string               // "3 待办 · 核验通过 28 条"
  todoCount?: number
  verifiedCount?: number
  createdAt: string
  dataLevel: 'L0' | 'L1' | 'L2'
}
```

`mainDdlName`（最近 DDL 名称）/ `mainDdlDaysLeft`（距最近 DDL 天数）/ `currentPhaseName`（当前阶段名）/ `currentPhaseRange`（当前阶段区间）
这四个字段**由日程数据派生**（服务端内部与 `GET /projects/schedules` 同源），不由列表接口单独维护，避免与日程数据不一致。

**Mock 值**：3 个项目，进度 45% / 68% / 15%；`metaText` = "共 3 个项目 · 按最近编辑排序"；
`greeting` = "2 条文献核验条目待确认（导出中心），「社交焦虑与手机依赖」距中期检查还有 12 天。"（天数由日程派生）

**派生结果（基准日 2026-11-03）**

| projectId | 当前阶段 `currentPhaseName` | 阶段区间 `currentPhaseRange` | 最近节点 `mainDdlName` | `mainDdlDaysLeft` |
| --- | --- | --- | --- | --- |
| p_2001 | 数据分析 | 10.16‒11.05 | 中期检查 | 12 |
| p_2002 | 论文写作 | 09.01‒12.31 | 投稿截止 | 86 |
| p_2003 | 选题 | 09.20‒11.08 | 开题答辩 | 5 |

### 5.2 `GET /projects/:projectId` 🟢 → `Project`
### 5.3 `POST /projects` 🟢
```ts
interface CreateProjectReq {
  title: string
  discipline: string
  route: 'dataDriven' | 'theoryDriven'
}
// 响应：Project
```

### 5.4 `GET /projects/ddl` 🟢 **（工作台「DDL 倒排时间线」数据源）**
返回**全部项目**的 DDL 硬节点，按项目分组。节点状态与剩余天数由服务端按「系统当天」派生。

> 工作台右栏需要把多个项目的节点合并成一条按紧迫度排序的时间线，因此使用批量接口一次取回；
> **排序由前端 `sortDdlRows` 统一负责**（规则见 [INTERACTIONS.md §2.3](INTERACTIONS.md)），服务端只负责给数据。

```ts
type DdlListRes = ProjectDdlGroup[]

interface ProjectDdlGroup {
  projectId: string
  projectTitle: string
  nodes: DdlNode[]
  tip?: string                 // 该项目的日程风险提示（用于展示最紧急项目的一句话提醒）
}

interface DdlNode {
  nodeId: string
  name: string                 // "开题报告" / "中期检查" / "投稿截止" / "毕业答辩"
  /** 展示用短日期：与基准日同年为 MM-DD，跨年为 YYYY-MM-DD，例如 "11-15" / "2027-03-20" */
  date: string
  /** 距今天数，负数表示已过期 */
  daysLeft: number
  status: 'done' | 'current' | 'upcoming'
}
```

**Mock 节点**（基准日 2026-11-03，共 3 个项目 × 4 个节点 = 12 个）

| 项目 | 开题 / 答辩 | 中期检查 | 投稿截止 | 毕业答辩 |
| --- | --- | --- | --- | --- |
| p_2001 社交焦虑与手机依赖 | 开题报告 2026-09-25（已完成） | 11-15（剩 12 天） | 12-15（剩 42 天） | 2027-03-20（剩 137 天） |
| p_2002 短视频使用与睡眠质量 | 开题报告 2026-06-15（已完成） | 2026-09-10（已完成） | 2027-01-28（剩 86 天） | 2027-03-20（剩 137 天） |
| p_2003 导师制与科研效能 | 开题答辩 2026-11-08（剩 5 天） | 2027-01-10（剩 68 天） | 2027-03-15（剩 132 天） | 2027-03-20（剩 137 天） |

**前端默认展示最近 5 条**（`DDL_PREVIEW_COUNT = 5`），其余通过「查看全部 12 个节点」展开。

---

### 5.5 ~~`GET /projects/schedules`~~ ⛔ **已删除**
甘特图已按需求彻底删除，该批量日程接口与 `PROJECT_SCHEDULE_LIST` Mock 一并移除。
项目阶段信息仍由服务端派生并体现在 `GET /projects` 的 `currentPhaseName` / `currentPhaseRange` / `mainDdlName` / `mainDdlDaysLeft` 字段上。

---

### 5.6 `GET /projects/:projectId/stage-artifacts` 🟢 **（替代原 kanban 接口）**
返回「本阶段产物摘要」。原「项目流程看板」的多步流程已按需求移除，工作台右栏只保留产物块。

```ts
interface StageArtifactsRes {
  projectId: string
  currentStage: 'topic' | 'literature' | 'analysis' | 'writing' | 'submission'
  currentStageLabel: string      // "数据分析中"
  artifacts: {
    artifactId: string
    name: string                 // "结构化文献综述 v3"
    statusText: string           // "双 Agent 核验已通过"
    tone: 'ok' | 'warn' | 'info'
    actionText?: string          // "去选择 →"（有待办动作时渲染为可点击）
  }[]
}
```

---

## 6. 论文引言 · 研究热点（P02）

### 6.1 `GET /projects/:projectId/intro/hotspot` 🟢
```ts
interface HotspotPageData {
  projectTitle: string
  researchDirection: string
  gaps: { gapId: string; text: string; sourceText: string }[]
  gapSourceCount: number                       // 3（来自 3 篇综述原文）
  feasibility: {
    key: 'coverage' | 'dataAvailability' | 'methodComplexity'
    label: string; score: number; maxScore: number
    description: string; basisText: string
    insufficientData?: boolean                 // true 时展示「数据不足，未评分」
  }[]
  citedReviews: {
    reviewId: string; title: string; metaText: string
    citedCount: number; doiVerified: boolean
  }[]
  trendTitle: string
  trendSeries: { name: string; color: string; points: { year: string; value: number }[] }[]
  trendNote: string
  publicDatasets: PublicDataset[]
  datasetTotal: number                         // 14
  datasetCategories: string[]                  // 计算机 / 心理学 / 医学·社科 / 经济学 / 人文艺术
  questionnaireChecks: { checkId: string; text: string; passed: boolean }[]
  recognizedPaperCount: number                 // 1284
  conclusion: string                           // "方向可行性中等偏上，可进入文献综述"
}

interface PublicDataset {
  datasetId: string
  name: string
  level: 'L0' | 'L1' | 'L2'
  accessAction: 'directImport' | 'applyBySelf'
  accessActionText: string                     // "一键直连导入" / "需自行申请"
  accessCondition: string
  citationRequirement: string
  subjectTags: string[]
}
```

**Mock 评分**：文献覆盖度 4.2、数据可得性 3.5、方法复杂度 3.0（满分 5）。
**Mock 趋势序列**：社交焦虑 42→121、手机依赖 36→96、孤独感 26→61（2021‒2025）。

### 6.2 `POST /projects/:projectId/intro/hotspot/analyze` 🟢
```ts
interface AnalyzeHotspotReq { researchDirection: string }
interface AnalyzeHotspotRes { task: AsyncTask; data: HotspotPageData }
```
> 同步返回新报告；若后端改为异步，请返回 `task.status='running'` 并配合 `GET /tasks/:taskId` 轮询。

### 6.3 `POST /projects/:projectId/intro/confirm-direction` 🟢
```ts
interface ConfirmDirectionRes { nextRoute: string }   // "/project/:id/literature"
```
> 该动作会写入项目日志（确认人 / 时间 / 备选项）。

---

## 7. 论文引言 · 理论驱动（P14 / P15）

### 7.1 `GET /projects/:projectId/intro/topic/keywords` 🟢
```ts
interface TopicKeywordData {
  researchDirection: string
  sources: string[]                 // ["Web of Science", "Crossref"]
  rangeText: string                 // "2019‒2024"
  paperCount: number                // 2847
  keywords: {
    keyword: string; freq: number
    growth: 'emerging' | 'rising' | 'stable' | 'longTail'
  }[]
  topKeywords: { rank: number; keyword: string; freq: number }[]
  trendYears: string[]
  trendUnit: string                 // "发文量（篇）"
  trendSeries: { name: string; color: string; points: TrendPoint[] }[]
  citedReviews: CitedReview[]
  lockedConcepts: string[]          // ["社交焦虑", "手机依赖", "孤独感"]
}
```
**Mock TOP 榜**：社交焦虑 1284 / 手机依赖 967 / 孤独感 812 / 错失恐惧 604 / 情绪调节 528 / 同伴支持 471 / 睡眠质量 398 / 自我控制 356。

### 7.2 `POST /projects/:projectId/intro/topic/keywords/analyze` 🔵
```ts
interface AnalyzeTopicKeywordsReq { researchDirection: string; discipline: string }
// 响应：TopicKeywordData
```
> 🔵 需后端代理 Web of Science / Crossref 做文献计量（词频 + 引用增长），**不使用模型自由生成**。

### 7.3 `POST /projects/:projectId/intro/topic/keywords/lock` 🟢
```ts
interface LockConceptsReq { concepts: string[] }
interface LockConceptsRes { locked: string[] }
```

### 7.4 `GET /projects/:projectId/intro/topic/theory` 🟢
```ts
interface TopicTheoryData {
  lockedConcepts: string[]
  theories: {
    theoryId: string          // T1 / T2 / T3
    name: string
    stars: number             // 1-5
    explainPath: string
    representativeRef: string
    citedCount: number
    varChain: string[]
  }[]
  selectedTheoryId: string
  variableDrafts: {
    varName: string; definition: string; scaleName: string
    itemCount: number; role: VariableRole
  }[]
}
```

### 7.5 `POST /projects/:projectId/intro/topic/theory/select` 🟢
```ts
interface SelectTheoryReq { theoryId: string }
interface SelectTheoryRes { theoryId: string; variableDrafts: TopicTheoryData['variableDrafts'] }
```
> 切换理论会**重算**变量落成草稿，并把选择记录写入项目日志。

---

## 8. 论文引言 · 数据驱动（P16 / P17 / P18）

### 8.1 `GET /projects/:projectId/data/upload` 🟢
```ts
interface DataUploadData {
  supportedFormats: string[]                 // ["CSV","XLSX","SPSS .sav","Stata .dta"]
  maxFileSizeMb: number                      // 200
  uploadedFiles: UploadedFile[]
  publicDatasets: PublicDataset[]
  sampleDatasets: { sampleId: string; title: string; metaText: string }[]
  readyFileCount: number
  readyVariableCount: number
  detectedDataLevel: 'L0' | 'L1' | 'L2'
  sensitiveDetected: boolean
}

interface UploadedFile {
  fileId: string; fileName: string; metaText: string
  rows: number; columns: number; sizeText: string
  status: 'uploaded' | 'parsed' | 'failed'
  statusText: string                          // "已上传 · 待体检"
}
```

### 8.2 `POST /projects/:projectId/data/files` 🟢
`multipart/form-data`，字段 `file`。**约束**：单文件 ≤ 200MB；仅 CSV / XLSX / SAV / DTA。
**错误码**：`41301` / `41501`。**响应**：`UploadedFile`。

```ts
// 示例响应
{
  "code": 0, "message": "ok", "traceId": "tr-...",
  "data": {
    "fileId": "f_1758...",
    "fileName": "social_anxiety_smartphone_2024.sav",
    "metaText": "SPSS 数据 · 4.2 MB · 512 行 × 36 列",
    "rows": 512, "columns": 36, "sizeText": "4.2 MB",
    "status": "uploaded", "statusText": "已上传 · 待体检"
  }
}
```

### 8.3 `DELETE /projects/:projectId/data/files/:fileId` 🟢 → `{ success: boolean }`
> 不可逆操作，前端已加二次确认。

### 8.4 `POST /projects/:projectId/data/import-public` 🟢
```ts
interface ImportPublicReq { datasetId: string }
interface ImportPublicRes { task: AsyncTask }
```
**错误码**：`40302`（目标库为 L1/L2 且当前项目级别不允许）

### 8.5 `POST /projects/:projectId/data/sample/:sampleId` 🟢
```ts
interface LoadSampleRes { success: boolean; note: string }  // "示例数据不会写入你的项目"
```

### 8.6 `GET /projects/:projectId/data/variables` 🟢 (P17)
```ts
interface VariableIdentifyData {
  health: {
    validSampleSize: number          // 512
    variableCount: number            // 48
    completeVariableCount: number    // 41
    missingVariableCount: number     // 7
    outlierCount: number             // 3
    duplicateAnswerCount: number     // 0
    sourceFile: string
  }
  healthAccuracy: number             // 96
  healthReportedAt: string           // "2026-09-20 22:14"
  variables: VariableItem[]
  typeDistribution: { label: string; count: number; color: string }[]
  qualityIssues: { issueId: string; level: 'warn' | 'info'; text: string; needsConfirm: boolean }[]
  recognizedCount: number            // 48
  usableCount: number                // 45
}

interface VariableItem {
  varName: string                    // sas_total
  typeLabel: string                  // 连续变量 / 无序分类 / 有序分类 / 计数 / 文本
  valueRange: string                 // "20 ‒ 80"
  missingRate: number                // 0.0 ~ 100
  suggestedRole: VariableRole
  overriddenRole?: VariableRole      // 用户手动修正后的角色（前端状态，可选回传）
}

type VariableRole =
  | 'dependent' | 'independent' | 'mediator' | 'moderator' | 'control' | 'resultCandidate'
```

**Mock 类型分布**：连续 18 / 无序 12 / 有序 9 / 计数 6 / 文本 3。

### 8.7 `PATCH /projects/:projectId/data/variables/:varName` 🟢
```ts
interface UpdateVariableReq {
  role?: VariableRole
  typeLabel?: string
}
interface UpdateVariableRes {
  varName: string; role?: VariableRole; typeLabel?: string
  recalcNeeded: boolean   // true 表示后续方法清单需要重算
}
```

### 8.8 `POST /projects/:projectId/data/variables/confirm` 🟢
```ts
interface ConfirmVariablesReq { variables: VariableItem[] }
interface ConfirmVariablesRes { nextRoute: string }
```

### 8.9 `GET /projects/:projectId/data/hypotheses` 🟢 (P18)
```ts
interface HypothesisPageData {
  sourceFile: string
  variableCount: number
  chatSuggestions: string[]
  hypotheses: Hypothesis[]
  citedVariables: { varName: string; roleLabel: string }[]
}

interface Hypothesis {
  hypothesisId: string
  code: string          // H1 / H2 / H3
  title: string
  varChain: string[]
  testMethod: string
  basis: string
  status: 'pending' | 'confirmed' | 'rejected'
}
```

### 8.10 `POST /projects/:projectId/data/hypotheses/generate` 🟢
```ts
interface GenerateHypothesesReq { prompt?: string }
// 响应：HypothesisPageData（重新生成的候选假设）
```
> **合规要求**：只引用数据中真实存在的变量与取值范围，不引入库外变量、不臆造字段。

### 8.11 `POST /projects/:projectId/data/hypotheses/confirm` 🟢
```ts
interface ConfirmHypothesesReq {
  hypotheses: { hypothesisId: string; status: 'confirmed' | 'rejected' }[]
}
interface ConfirmHypothesesRes { nextRoute: string; logId: string }
```
**错误码**：`40001`（仍有 `pending` 假设未处理，前端会先拦截）

---

## 9. 文献综述（P03）

### 9.1 `GET /projects/:projectId/literature` 🟢
```ts
interface LiteraturePageData {
  projectTitle: string
  resultTotal: number                 // 128
  sortBy: string                      // "相关度"
  filters: { quartile: string[]; discipline: string[]; year: string[] }
  activeFilter: SearchFilter
  languageWarning: string
  papers: Paper[]
  selectedPaperIds: string[]
  selectedCount: number               // 12
  minRequired: number                 // 5
  selectionNote: string
  verify: VerifyOverview
  kbDocCount: number                  // 34
  kbQa: KbQaItem
  verifiedClaimCount: number          // 26
}

interface SearchFilter { query: string; quartile: string; discipline: string; year: string }

interface Paper {
  paperId: string
  title: string
  authors: string
  journal: string
  year: number
  quartile: string                    // Q1 / Q2 / CSSCI / 未经同行评审
  doi?: string
  doiStatus: 'verified' | 'unverified' | 'suspicious'
  doiStatusText: string               // "DOI 已验证" / "未验证"
  citedCount?: number
  abstractText: string
  matchReason: string                 // 含相关度，如「（相关度 0.92）」
  relevanceScore: number              // 0-1
  citable: boolean                    // false = 未验证，禁止进入参考文献区
}

interface VerifyOverview {
  status: AsyncTaskStatus
  statusText: string
  agentAlpha: { label: string; accuracy: number; description: string }   // 内容一致性 96%
  agentBeta: { label: string; accuracy: number; description: string }    // DOI 真实性 99%
  passedCount: number                 // 26
  suspiciousCount: number             // 2
  failedCount: number                 // 1
  blockExport: boolean                // true 时阻断导出
  note: string
}
```

### 9.2 `POST /projects/:projectId/literature/search` 🔵
```ts
interface SearchLiteratureReq {
  filter: SearchFilter
  page?: number
  pageSize?: number
}
type SearchLiteratureRes = PageResult<Paper> & { languageWarning: string }
```
> 🔵 需后端代理文献源做**语义检索**（自然语言 → 向量召回 + 相关度打分）。

### 9.3 `POST /projects/:projectId/literature/selection` 🟢
```ts
interface UpdateSelectionReq { paperId: string; selected: boolean }
interface UpdateSelectionRes { selectedPaperIds: string[]; selectedCount: number }
```
**错误码**：`40001`（对 `citable=false` 的条目执行选入）

### 9.4 `POST /projects/:projectId/literature/upload` 🟢
`multipart/form-data`，字段 `file`（PDF / DOC / DOCX / BIB）。
```ts
interface UploadLiteratureRes { fileId: string; parsed: boolean }
```

### 9.5 `POST /projects/:projectId/literature/generate-review` 🟡
```ts
// 响应：AsyncTask（status='running', etaSeconds≈180）
```
> 生成结构化综述 + 双 Agent 核验，异步执行。前端用 `GlobalTaskDialog` 展示进度。

### 9.6 `POST /projects/:projectId/literature/verify` 🟡
```ts
interface VerifyLiteratureReq { paperIds?: string[] }   // 不传=全量核验
// 响应：AsyncTask
```

### 9.7 `POST /projects/:projectId/kb/qa` 🟡
```ts
interface KbQaReq { question: string }
interface KbQaRes {
  question: string
  answer: string
  citations: string[]        // ["[2]", "[7]", "[12]"]
  note: string               // "答案全部来自库内文献"
  docCount: number
}
```

### 9.8 `POST /projects/:projectId/literature/bring-to-writing` 🟢
```ts
interface BringToWritingRes { nextRoute: string; claimCount: number }   // claimCount=26
```

### 9.9 `GET /tasks/:taskId` 🟢
返回 `AsyncTask`。**沙箱分析 / 综述生成 / 双 Agent 核验共用此接口轮询。**

---

## 10. 数据分析（P04）

### 10.1 `GET /projects/:projectId/analysis` 🟢
```ts
interface AnalysisPageData {
  projectTitle: string
  steps: { key: 'import'|'healthCheck'|'method'|'result'; label: string; status: 'done'|'current'|'upcoming' }[]
  dataVersion: { version: string; rows: number; columns: number; dataLevel: DataLevel }   // v2 / 350 / 42 / L1
  methods: StatMethod[]
  selectionTrail: SelectionTrail
  healthReport: { accuracy: number; reportedAt: string; metrics: HealthMetric[] }
  healthNotes: { tone: 'danger'|'warn'|'info'; text: string }[]
  importFormats: string[]
  importedFile: { fileName: string; metaText: string; passed: boolean }
  sensitiveWarning: string
  code: CodeSnippet[]
  robustness: RobustnessCheck[]
  robustnessNote: string
  missingBars: { varName: string; missingRate: number }[]
  run: AnalysisResult | null
}

interface StatMethod {
  methodId: string
  name: string                     // "分层回归 + Bootstrap 中介"
  recommended: boolean             // AI 推荐（仅提示，不作默认选项）
  summary: string
  prerequisites: string            // 适用前提
  pros: string
  cons: string
  robustnessImpact: string         // 对结论稳健性的影响
  checklist: string                // 前提假设检验清单
  licenseNote?: string             // "statsmodels（BSD-3）· pingouin（MIT）"
}

interface SelectionTrail {
  operatorName: string; operatedAt: string
  candidateCount: number; unselectedCount: number
  dataVersion: string
}
```

**Mock 体检指标**：样本量 350、变量数 42、缺失率 1.8%、异常值提示 7。

### 10.2 `POST /projects/:projectId/analysis/import` 🟢
```ts
interface ImportProjectDataReq {
  fileName: string
  dataLevel: DataLevel
}
interface ImportProjectDataRes { fileId: string; rows: number; columns: number; passed: boolean }
```
**错误码**：`40302`（L2 项目禁止导出原始数据行 → 导入拦截）

### 10.3 `GET /projects/:projectId/analysis/health-report` 🟢
```ts
interface HealthReportRes {
  accuracy: number          // 96
  reportedAt: string
  metrics: { key: string; label: string; value: string; tone: 'default'|'danger'|'warn' }[]
  notes: { tone: 'danger'|'warn'|'info'; text: string }[]
}
```

### 10.4 `GET /projects/:projectId/analysis/methods` 🟢
```ts
interface MethodsRes { methods: StatMethod[]; trail: SelectionTrail }
```

### 10.5 `POST /projects/:projectId/analysis/run` 🟡
```ts
interface RunAnalysisReq {
  methodId: string
  dataVersion: string
  taskName?: string        // 来自「重命名分析任务」弹窗
  seed?: number            // 默认 42
  nBoot?: number           // 默认 5000
}
// 响应：AsyncTask（status='running', etaSeconds≈25）
```
**错误码**：`40901`（已有任务在执行）
> 沙箱执行预计 1-3 分钟，异步返回结果；`参数与运行环境随结果一同保存`（可复现要求）。

### 10.6 `GET /projects/:projectId/analysis/runs/:runId` 🟡
```ts
interface AnalysisResult {
  runId: string                       // "a7f3-20260921-0912"
  methodId: string
  methodName: string
  finishedAt: string
  sampleSize: number
  effects: { label: string; value: string; ci?: string }[]
  robustness: RobustnessCheck[]
}
```

### 10.7 `POST /projects/:projectId/analysis/rollback` 🟢
```ts
interface RollbackReq { versionNo: string }
interface RollbackRes { versionNo: string }
```
> 回滚不覆盖历史版本，会新增一条版本记录。

---

## 11. 论文写作（P05 / P11）

### 11.1 `GET /projects/:projectId/writing` 🟢
```ts
interface WritingPageData {
  projectTitle: string
  title: string
  mode: 'aiFull' | 'aiAssist'
  outline: OutlineNode[]
  currentSection: string            // "2.1 孤独感中介研究"
  autoSavedAt: string
  stats: DocStats                   // 字数 4820 / 段落 18 / 引用 31
  paragraphs: DocParagraph[]
  citations: CitationEntry[]
  citationStyle: 'APA7' | 'GBT7714'
  inTextStyle: string               // "上标数字"
  targetJournal: { name: string; style: string }
  aiPolicyReminder: { journal: string; text: string; syncedAt: string }
  zotero: ZoteroBinding
  kbDocs: { paperId: string; title: string; metaText: string }[]
  kbDocCount: number
  aiSuggestions: { suggestionId: string; text: string; adopted: boolean }[]
  editor?: {
    journalFormat: string; citationStyleLabel: string; inTextLabel: string
    fontName: string; fontSizeLabel: string; lineHeightLabel: string
    pageCount: number; zoom: number
  }
}

interface OutlineNode {
  nodeId: string; title: string; level: number
  citeCount?: number
  flag?: 'missingCitation' | 'boundArtifact'
  children?: OutlineNode[]
}

interface DocParagraph {
  paraId: string; index: number; section: string
  kind: 'normal' | 'boundMethod' | 'heading'   // boundMethod = 绑定分析产物，不可修改
  aiGenerated: boolean
  traceLabel?: string                          // "AI"
  text: string
}

interface CitationEntry { index: number; paperId: string; apaText: string; gbText: string }
```

### 11.2 `PATCH /projects/:projectId/writing/doc` 🟢
```ts
interface SaveDocReq { content: string; section?: string }
interface SaveDocRes { autoSavedAt: string; wordCount: number }
```
> 前端做 debounce 自动保存（设计稿显示「已自动保存 09:12」）。

### 11.3 `POST /projects/:projectId/writing/outline/generate` 🟡 → `OutlineNode[]`
### 11.4 `POST /projects/:projectId/writing/section/regenerate` 🟡
```ts
interface RegenerateSectionReq { section: string }
interface RegenerateSectionRes { paragraphs: DocParagraph[] }
```
### 11.5 `POST /projects/:projectId/writing/paragraph/rewrite` 🟡
```ts
interface RewriteParagraphReq {
  paraId: string
  action: 'rewrite' | 'shorten' | 'expand' | 'academic'   // 重写 / 缩写 / 扩写 / 学术化改写
}
interface RewriteParagraphRes { paraId: string; text: string }
```
> **硬约束**：仅改表达，不改论断。

### 11.6 `POST /projects/:projectId/writing/citation` 🟢
```ts
interface InsertCitationReq { paperId: string; style: 'APA7' | 'GBT7714' }
interface InsertCitationRes { index: number; citationCount: number; styleSwitched: boolean }
```
**错误码**：`40001`（插入未验证条目）
> 增删文献自动重编号；未验证条目不入参考文献表。

### 11.7 `POST /projects/:projectId/writing/ai-suggestion/adopt` 🟢
```ts
interface AdoptSuggestionReq { suggestionId: string }
interface AdoptSuggestionRes { suggestionId: string; adopted: boolean }
```

### 11.8 `GET /integrations/zotero/status` 🔵 → `ZoteroBinding`
```ts
interface ZoteroBinding {
  bound: boolean
  account: string                 // "chen@example.edu"
  bidirectionalSync: boolean
  rateLimitText: string           // "写入 ≤ 50 条/请求；遇 Retry-After 自动退避并提示重新授权"
  fallbackText: string            // "免授权兜底：导入 / 导出 .bib（Better BibTeX）"
}
```
### 11.9 `POST /integrations/zotero/bind` 🔵
```ts
interface BindZoteroReq { bind: boolean }   // 响应：ZoteroBinding
```

---

## 12. 选刊 AI（P06）

### 12.1 `GET /projects/:projectId/journals` 🟢
```ts
interface JournalPageData {
  title: string
  abstractText: string
  keywords: string[]
  matches: {
    journalId: string; name: string; indexText: string
    matchScore: number          // 94 / 87 / 81 / 76 / 72
    matchReason: string
  }[]
  profile: JournalProfile
  submissionChecks: { checkId: string; text: string; passed: boolean; pendingText?: string }[]
  completedChecks: number       // 5
  totalChecks: number           // 6
  disclaimer: string
  dataUpdatedAt: string         // "2026-08-20"
}

interface JournalProfile {
  journalId: string; name: string; sourceText: string
  partition: string             // "JCR Q1 · 中科院 1 区 · IF 8.9"
  reviewCycle: string           // "8-12 周"
  reviewCycleSource: string     // 必须带来源与样本量
  acceptanceRate: string        // "18%"
  acceptanceSource: string
  apc: string                   // "USD 3,500（订阅模式可选免收）"
  databases: string             // "SSCI · Scopus · EI"
  formatRequirement: string     // "≤ 12,000 词 · APA 7"
  aiPolicy: {
    level: string               // "允许有限使用"
    allows: string; forbids: string; requires: string; sourceText: string
  }
}
```
> **合规硬约束**：不得输出「保证录用 / 大概率必中」类承诺；第三方统计必须标注来源与样本量；无来源不展示；政策数据超 6 个月未更新需标注「数据待确认」。

### 12.2 `POST /projects/:projectId/journals/match` 🔵 → `JournalMatch[]`
### 12.3 `GET /journals/:journalId/profile` 🔵 → `JournalProfile`
### 12.4 `POST /projects/:projectId/submission-package` 🟢
```ts
interface SubmissionPackageRes { nextRoute: string }   // "/project/:id/export"
```

---

## 13. 模拟评审（P07）

### 13.1 `GET /projects/:projectId/review` 🟢
```ts
interface ReviewPageData {
  reviewTarget: string
  targetJournal: string
  field: string
  calibration: { paperCount: number; corpusCount: number; calibratedAt: string; note: string }
  issues: ReviewIssue[]
  revisionPaths: { issueCode: string; title: string; text: string }[]
  rebuttals: { issueCode: string; title: string; steps: string[] }[]
  summary: { accepted: number; disputed: number; ignored: number; corpusCount: number }
  disclaimer: string
}

interface ReviewIssue {
  issueId: string
  code: string                                        // H1 / H2 / D1 / D2 / S1 / S2
  type: 'hard' | 'dispute' | 'style'                  // 硬伤 / 争议点 / 风格建议
  title: string
  confidence: 'high' | 'medium' | 'low'
  confidenceText: string                              // "置信度高"
  description: string
  frequencyText: string                               // "出现频率：同类意见在顶刊审稿中出现 47%"
  handled: 'none' | 'accepted' | 'disputed' | 'ignored'
  replyable: boolean
}
```
**Mock 校准基准**：顶刊论文 48 篇 · 审稿意见语料 312 条 · 校准完成 09:05。

### 13.2 `POST /projects/:projectId/review/recalibrate` 🟡
```ts
interface RecalibrateReq { journal?: string; field?: string }
// 响应：ReviewPageData['calibration']
```

### 13.3 `PATCH /projects/:projectId/review/issues/:issueId` 🟢
```ts
interface HandleIssueReq { handled: ReviewIssue['handled'] }
interface HandleIssueRes { issueId: string; handled: ReviewIssue['handled'] }
```

### 13.4 `POST /projects/:projectId/review/rebuttal` 🟡
```ts
interface GenerateRebuttalReq { issueCodes?: string[] }
// 响应：ReviewPageData['rebuttals']
```
> 草稿不改变作者原有观点；与本观点冲突时以作者观点为准并标注冲突点。

---

## 14. 导出中心（P08）

### 14.1 `GET /projects/:projectId/export` 🟢
```ts
interface ExportPageData {
  artifactCount: number                  // 6
  artifacts: ExportArtifact[]
  disclosure: {
    title: string; note: string
    items: { itemId: string; text: string; done: boolean }[]
    unreviewedCount: number              // 14（自动处置条目未复核数量）
    lastGeneratedAt?: string
  }
  risk: { hasUnverified: boolean; unverifiedCount: number; message: string }
  compliance: { key: string; label: string; value: string; tone: 'danger'|'ok' }[]
  complianceNote: string
}

interface ExportArtifact {
  artifactId: string
  name: string
  metaText: string                       // "2026-09-21 09:05 · 128 KB · 双 Agent 核验已通过"
  formats: string[]                      // ["md","docx","PDF"]
  status: 'ready' | 'pending'
  statusText?: string                    // "待补齐"
  blocked?: boolean
}
```
**Mock 合规校验**：红色核验条目 1、未验证文献 0、AI 标识完整性 100%。

### 14.2 `POST /projects/:projectId/export/disclosure` 🟡
```ts
interface GenerateDisclosureRes { reportId: string; generatedAt: string }
```
> 披露报告是《AI 使用情况说明》的**唯一生成入口**；含未决条目标注。

### 14.3 `POST /projects/:projectId/export/artifacts` 🟢
```ts
interface ExportArtifactsReq {
  artifactIds: string[]
  formats: Record<string, string[]>      // { ex1: ["PDF"], ex3: ["docx"] }
}
interface ExportArtifactsRes { downloadUrl: string; blockedCount: number }
```
**错误码**：`40303`（存在待补齐 / 未验证条目，阻断导出）

### 14.4 `POST /projects/:projectId/export/confirm-unverified` 🟢
```ts
interface ConfirmUnverifiedRes { confirmed: boolean }
```
> 「我已确认，允许导出」；确认记录写入留痕并标注在披露报告中。

### 14.5 `POST /projects/:projectId/export/upload-pdf` 🟢
`multipart/form-data`。→ `{ verified: boolean }`

---

## 15. 项目设置（P10）

### 15.1 `GET /projects/:projectId/settings` 🟢
```ts
interface ProjectSettingsData {
  projectId: string; title: string; metaText: string
  discipline: string
  routeText: string                       // "数据驱动（默认统计方法与文献源已按学科预设）"
  ddlNodes: DdlNode[]
  members: ProjectMember[]
  versions: VersionRecord[]
  versionPolicyText: string               // "保留最近 1 个月版本"
  dataLevel: DataLevel
  dataLevelOptions: {
    level: DataLevel; name: string; description: string
    rules: string[]; current: boolean
  }[]
  dataLevelChangeImpact: string
}

interface ProjectMember {
  memberId: string; name: string; avatarText: string
  role: 'firstAuthor' | 'advisor' | 'collaborator' | 'guest'
  roleLabel: string                       // 第一作者 / 导师 / 协作学生
  permissionLabel: string
}

interface VersionRecord {
  versionNo: string                       // "v18"
  operatorName: string; operatedAt: string
  description: string
  rollbackable: boolean
}
```

### 15.2 `PATCH /projects/:projectId` 🟢
```ts
interface UpdateProjectReq {
  title?: string
  discipline?: string
  route?: 'dataDriven' | 'theoryDriven'
  ddlNodes?: { nodeId: string; date: string }[]
}
interface UpdateProjectRes { savedAt: string }
```

### 15.3 `PATCH /projects/:projectId/data-level` 🟢
```ts
interface UpdateDataLevelReq { dataLevel: DataLevel }
interface UpdateDataLevelRes { dataLevel: DataLevel; impact: string }
```
**错误码**：`40301`（非第一作者无定级权限）
> 改级会同步影响：P4 数据导入拦截、跳过逐条确认禁用、导出阻断。确认后规则立即全局生效。

### 15.4 `POST /projects/:projectId/members/invite` 🟢
```ts
interface InviteMemberReq { account: string; role: string }
interface InviteMemberRes { inviteId: string }
```

### 15.5 `POST /projects/:projectId/versions/:versionNo/rollback` 🟢
```ts
interface RollbackProjectVersionRes { versionNo: string; rollbackAt: string }
```

---

## 16.5 账号设置 / 通知 / 合规 / DDL 关键词（本轮新增）

> 这一组接口是为「后端接入」补齐的：此前账号设置页不存在，通知写死在组件里，
> 数据级别与 YOLO 开关在多页各存一份。现在全部走接口，字段与错误码同前文约定。

### 16.5.1 `GET /me/account` 🟢 — 账号设置页数据

```ts
interface AccountSettingsRes {
  userId: string
  nickname: string
  avatarText: string          // 文字头像，取昵称首字
  major: string
  grade: string
  phoneMasked: string         // 已脱敏，例如 "138****0000"
  eduEmail?: string
  hasContact: boolean
  registeredAt: string
  verification: StudentVerification
  planId: 'student' | 'pro' | 'team'
  quota: QuotaUsage
  devices: {
    deviceId: string
    deviceName: string        // "Chrome · Windows"
    locationText: string      // 已脱敏位置 "116.25.***.12 · 深圳"
    lastActiveAt: string
    current: boolean          // 当前设备不可被「退出其他设备」移除
  }[]
  notifications: {
    key: 'verifyFailed' | 'ddlReminder' | 'taskDone' | 'weeklyReport' | 'productUpdate'
    label: string
    description: string
    enabled: boolean
    mandatory?: boolean       // 合规必开项（核验失败提醒）
  }[]
  privacy: {
    allowTraining: boolean    // 默认 false：不进入训练集
    keepHistoryDays: number
    exportRequestedAt?: string
  }
  majorOptions: string[]
  gradeOptions: string[]
}
```

### 16.5.2 `PATCH /me` 🟢 — 更新基本资料

```ts
interface UpdateMeReq { nickname?: string; major?: string; grade?: string }
interface UpdateMeRes { user: UserInfo; savedAt: string }
// avatarText 由服务端按昵称首字重算，保证与顶栏一致
```

### 16.5.3 账号安全与隐私

| Method | 路径 | 说明 |
| --- | --- | --- |
| POST | `/me/devices/revoke-others` | 退出其他所有设备；响应 `{ success, revokedCount }`。**不可逆，前端已二次确认** |
| PATCH | `/me/notifications` | 请求 `{ key, enabled }`，响应 `{ notifications }`；`mandatory=true` 的项服务端应拒绝关闭（返回 `40301`） |
| PATCH | `/me/privacy` | 请求 `{ allowTraining?, keepHistoryDays? }`，响应 `AccountPrivacy`；开启 `allowTraining` 会写入《AI 工具使用情况说明》 |
| POST | `/me/data-export` | 申请导出个人数据；响应 `{ requestedAt, etaText }` |
| DELETE | `/me` | 注销账号。请求必须带 `{ confirmText: '注销账号' }`，服务端二次校验该确认词 |

### 16.5.4 `GET /me/notifications` 🟢 / `POST /me/notifications/read` 🟢

```ts
interface NotificationPayload {
  list: {
    notificationId: string
    title: string
    description: string       // "去导出中心处理 · 10 分钟前"
    route?: string            // 点击跳转路由；缺省表示纯提示
    read: boolean
  }[]
  unreadCount: number         // 由服务端计算，前端不再写死
}
```

### 16.5.5 `GET /projects/:projectId/compliance` 🟢 / `PATCH /projects/:projectId/skip-confirm` 🟢

```ts
interface ProjectComplianceRes {
  projectId: string
  dataLevel: DataLevel
  skipConfirm: boolean        // L2 项目服务端强制返回 false
}
```

> **单一真源约定**：`dataLevel` 与 `skipConfirm` 只由这组接口下发；P03 文献综述、P16 上传数据、P10 项目设置
> 三处共用同一份前端状态（`useSettingsStore`），任一页修改后另外两页同步，不再各自维护。

### 16.5.6 `GET /projects/ddl-keywords` 🟢 / `PATCH /projects/:projectId/ddl-keyword` 🟢

```ts
interface DdlKeywordSetting {
  projectId: string
  selected: string            // 当前关键词；空字符串 = 不显示前缀
  options: { keyword: string; sourceText: string }[]   // sourceText 例如「来自项目标题」
}
```

用途：工作台「DDL 倒排时间线」把多个项目的节点合并展示，节点名渲染为 **`关键词：节点名`**（例如「短视频：开题报告」），
让合并列表里一眼能看出该节点属于哪个项目。每个项目**单选 1 个**关键词。

### 16.5.7 `GET /projects/:projectId/writing` 载荷补充 🟢

P11 全屏编辑器的正文、可插入引用、改写动作并入该接口返回：

```ts
interface WritingPageData {
  // …既有字段…
  editorBody: { paraId: string; kind: 'heading' | 'body' | 'aiLabel'; text: string; citeIndex?: number }[]
  editorCitations: { index: number; title: string; journal: string; year: string }[]
  rewriteActions: string[]     // ["重写","缩写","扩写","学术化改写"]
}
```

### 16.6 新建项目与两条流程的入口变量（本轮修正）

> **修复的缺陷**：此前前端 `新建项目` 既不调用 `POST /projects`、也不看所选类型，直接 `navigate('/project/p_2001/intro')` ——
> 结果是「不管选理论驱动还是数据驱动，都跳到同一个已存在的项目上」，即你反馈的**新建项目跳转错误**。
> 现在改为：**真正创建项目 + 跳转目标由服务端返回值决定**。

#### 16.6.1 `POST /projects` 契约（含 `entryRoute`）

```ts
interface CreateProjectReq {
  title: string                    // 前端默认传「未命名项目」，用户可后续在项目设置改名
  discipline: string               // 默认取当前用户资料里的学科
  route: 'dataDriven' | 'theoryDriven'
}

interface CreateProjectRes {
  project: Project                 // 完整项目实体，字段见 §5.1
  /** 该项目的流程起点（前端直接 navigate 到这里，不写死） */
  entryRoute: string
}
```

**`entryRoute` 取值规则**（依据设计稿 IA：「研究热点」是公共父级，两条分支第一步不同）

| `route` | 流程 | `entryRoute` |
| --- | --- | --- |
| `theoryDriven` | 研究热点 → 领域研究热词 → 选择理论与变量 | `/project/{projectId}/intro` |
| `dataDriven` | 上传数据 → 变量识别 → 生成研究假设 | `/project/{projectId}/intro/data/upload` |

> 用返回值而不是前端常量，是为了让**流程顺序可服务端配置**：以后调整分支入口或插入新步骤，只改服务端，前端不用发版。

#### 16.6.2 服务端在创建项目时必须一并初始化的 7 组变量

创建项目不只是插一条项目记录 —— 下面 7 组变量若缺任何一组，用户在落地页就会看到空态或报错（前端已按「缺则空态」处理，但体验会断层）：

| # | 变量 / 数据 | 接口 | 新建时的默认值 | 缺失后果 |
| --- | --- | --- | --- | --- |
| 1 | 项目实体 `Project` | `GET /projects`、`GET /projects/:id` | `stage='topic'`、`stageLabel='选题中'`、`progress=0`、`dataLevel='L1'`、`lastEditedText='刚刚创建'` | 工作台卡片异常 |
| 2 | 项目日程 `ProjectSchedule` | `GET /projects/schedules`（甘特图已下线，现服务于派生字段与 `/projects/ddl`） | 5 个阶段（选题 30 天 / 文献综述 30 天 / 数据分析 30 天 / 论文写作 40 天 / 投稿准备 20 天）依次从**当天**排开；4 个硬节点（开题报告 +30 / 中期检查 +90 / 投稿截止 +150 / 毕业答辩 +200 天） | 「当前阶段 / 距 DDL 天数 / 最新进度」全部为空 |
| 3 | 合规设置 `ProjectComplianceSettings` | `GET /projects/:id/compliance` | `dataLevel='L1'`、`skipConfirm=false` | P16/P03/P10 三处合规状态读不到，页面报错 |
| 4 | DDL 概述关键词 `DdlKeywordSetting` | `GET /projects/ddl-keywords` | `selected` 取标题主干词；`options` 至少含 1 项（来源说明「来自项目标题」） | 工作台 DDL 列表该行无前缀 |
| 5 | 阶段产物 `StageArtifactsPayload` | `GET /projects/:id/stage-artifacts` | `artifacts: []`（新建项目本就没有产物） | 产物卡空白无提示（前端已补空态文案） |
| 6 | 版本记录 `VersionRecord` | `GET /projects/:id/settings` | 首条 `v1 · 创建项目` | 项目设置页版本历史为空 |
| 7 | 成员 `ProjectMember` | `GET /projects/:id/settings` | 当前用户 = 第一作者（`role='firstAuthor'`） | 权限推导失败（导出/定级按钮状态错） |

#### 16.6.3 建议同样由服务端下发的流程变量（避免前端写死流程顺序）

| 变量 | 现在的位置 | 建议 |
| --- | --- | --- |
| `CreateProjectRes.entryRoute` | **已实现**（服务端下发） | 保持；后续调整分支入口只改服务端 |
| `POST /projects/:id/intro/confirm-direction` 的 `nextRoute` | 已由服务端返回（当前为 `/project/:id/literature`） | **建议按 `project.route` 分流**：理论驱动 → `/intro/topic/keywords`（领域研究热词）；数据驱动 → `/intro/data/upload`。若采纳，需同时给按钮文案一个可下发字段（如 `nextStepLabel`），否则前端只能写「确认方向」这类中性文案 |
| `HotspotPageData.nextStep` | 不存在 | 建议新增 `{ label, route }`，让「确认方向」按钮的文案与落点一起可配置 |

---

### 16.7 P05 论文写作 / P11 全屏编辑器：变量与接口对照（本轮补齐）

按「AI 全文生成」样式逐元素核对，**所有业务数据均已挂在 `GET /projects/:projectId/writing` 的返回载荷上**，页面不再直连 Mock 常量。

#### 16.7.1 本轮新增到 `WritingPageData` 的 2 个字段

```ts
interface WritingPageData {
  // …既有字段…

  /**
   * 正文作者行，例如「陈某某 · 心理学系」
   * 由服务端按「第一作者姓名 + 学科」生成 —— 前端不写死（历史实现里写死了示例姓名）
   */
  authorLine: string

  /**
   * 投稿前检查清单（P11 顶部「生成投稿检查清单」的结果）
   * done / total 由服务端计算；items 与 P06 选刊页的 submissionChecks 同源，避免两处口径不一致
   */
  submissionChecklist: {
    total: number
    done: number
    items: { checkId: string; text: string; passed: boolean; pendingText?: string }[]
  }
}
```

#### 16.7.2 逐元素对照表

| 界面元素（截图中位置） | 变量 | 接口 |
| --- | --- | --- |
| 面包屑「论文写作 / 项目名」 | `projectTitle` | `GET /writing` |
| 已自动保存 11:24 | `autoSavedAt` | `GET /writing`；保存后由 `PATCH /writing/doc` 返回新的 `autoSavedAt` |
| 导出投稿包 | — | `POST /projects/:id/submission-package` |
| **生成投稿检查清单** | `submissionChecklist.{total,done,items}` | `GET /writing`（本轮接口化，原为前端写死「6 项中 5 项」） |
| 模式切换（AI 全文生成 / AI 辅助撰写） | `mode` | `GET /writing`；切换写 `PATCH /writing/doc`（`mode`） |
| 规则提示「引用仅可从已核验文献池选择」 | 静态规则文案 | 前端常驻（见 §16.7.3） |
| 预览初稿 | — | `PATCH /writing/doc` + 本页定位 |
| 目标投稿格式《心理学报》· GB/T 7714-2015 | `editor.journalFormat` | `GET /writing` |
| 文内引用：上标数字 | `editor.inTextLabel` / `inTextStyle` | `GET /writing` |
| 参考文献 47 条 | `stats.citationCount` = `citations.length` | `GET /writing` |
| 字数 2,148 / 页数 3 / 缩放 100% | `stats.wordCount` / `editor.pageCount` / `editor.zoom` | `GET /writing`（缩放为前端状态，最后值可随文档保存） |
| 工具栏：思源宋体 / 小四 / 1.5 倍行距 | `editor.fontName` / `fontSizeLabel` / `lineHeightLabel` | `GET /writing`；修改后建议 `PATCH /writing/doc-format`（见 §16.7.3） |
| 工具栏 B/I/U/对齐/字体色/H1/H2 | — | 前端编辑器命令（无后端） |
| 插入引用 / 插入表格 / 插入图表 / 插入公式 | — | 插入引用 → `POST /writing/citation`；其余为前端编辑器命令 |
| 正文标题 | `title` | `GET /writing` |
| **正文作者行「陈某某 · 心理学系」** | `authorLine` | `GET /writing`（本轮接口化，原为写死） |
| 正文块（含 AI 生成标识行、文内 `[n]` 标号） | `editorBody[].{paraId,kind,text,citeIndex}` | `GET /writing` |
| 插入引用浮层 3 条文献 | `editorCitations[].{index,title,journal,year}` | `GET /writing` |
| 「本页共 N 字 · 引用 M 条」 | `stats.wordCount` / `stats.citationCount` | `GET /writing` |
| 知识库文献（可插入）42 条已核验 | `kbDocCount`、`kbDocs[]` | `GET /writing`；**服务端检索**建议 `GET /writing/kb-docs?q=` |
| 该区底部「仅展示已通过双 Agent 核验的文献…」 | 静态规则文案 + 逻辑约束 | 逻辑约束已在 `citable` 字段上（未验证不可插入/不入参考文献表） |
| 引用与格式：引文统计 / 引用样式 / 文内引用 / 参考文献 / 目标期刊 | `stats.citationCount` / `citationStyle` / `editor.inTextLabel` / `citations.length` / `targetJournal.name` | `GET /writing`；「切换引用样式」→ `POST /writing/citation`（返回新编号与样式标记） |
| AI 辅助建议 3 条 + 「采纳」 | `aiSuggestions[].{suggestionId,text,adopted}` | `GET /writing`；采纳 → `POST /writing/ai-suggestion/adopt` |
| 「AI 辅助建议仅供参考，请您手动选择是否采纳并自负文责」 | 静态免责声明 | 前端常驻（涉及合规表述，建议后续由服务端下发以便统一口径） |

#### 16.7.3 仍建议后端补的 3 个变量/接口

| # | 变量 / 接口 | 现状 | 建议 |
| --- | --- | --- | --- |
| 1 | `PATCH /projects/:id/writing/doc-format` | 字体 / 字号 / 行距目前只是展示值，改了不落库 | 新增该接口（请求 `{ fontName, fontSizeLabel, lineHeightLabel, zoom }`），保证「同一文档在不同设备打开格式一致」 |
| 2 | `GET /projects/:id/writing/kb-docs?q=` | 右栏检索框目前是纯前端输入 | 42 篇以上时前端无法全量检索，建议服务端支持关键词检索与分页 |
| 3 | `submissionChecklist` 的来源 | 现随 `GET /writing` 下发 | 若它与 P06 选刊页的 `submissionChecks` 完全同源，建议抽成 `GET /projects/:id/submission-checklist` 由两页共用，避免两处维护导致口径漂移 |

### 16.7 P05 / P11 论文写作：本轮补齐与修正的变量

**`GET /projects/:projectId/writing` 载荷新增/修正字段**（P05 与 P11 共用同一份载荷）

```ts
interface WritingPageData {
  // …既有字段…
  stats: {
    wordCount: number          // 对齐设计稿：2,148
    paragraphCount: number
    citationCount: number      // 对齐设计稿：47
    unsavedChanges: number     // 【新增】尚未保存的修改处数，0 表示已全部落库
    aiLabelEnabled: boolean
    lastEditedAt: string
  }
  kbDocCount: number           // 对齐设计稿：42
  editor: {
    journalFormat: string
    journalFormatOptions: string[]   // 【新增】期刊投稿格式下拉选项，避免前端写死目标期刊
    citationStyleLabel: string
    inTextLabel: string
    fontName: string
    fontSizeLabel: string
    lineHeightLabel: string
    pageCount: number
    zoom: number
  }
  editorBody: EditorBlock[]      // 正文块（含 AI 标识行与文内引用序号）
  editorCitations: EditorCitation[]  // 「来自项目知识库」浮层的可选文献
  rewriteActions: string[]       // 段落改写动作枚举
}
```

**写接口需回写的变量（前端已依赖，后端必须返回最新值）**

| 接口 | 必须回写 | 说明 |
| --- | --- | --- |
| `PATCH /writing/doc` | `autoSavedAt`、`wordCount`、**`unsavedChanges`（归零）** | 保存成功即视为「无未保存修改」 |
| `POST /writing/citation` | `index`、**`citationCount`（+1）**、**`unsavedChanges`（+1）**、`styleSwitched` | 前端用它更新顶部「参考文献 N 条」与底部计数 |

> 投稿检查清单**不单独设接口**：它随 `GET /projects/:id/writing` 的 `submissionChecklist`
> 字段一次性下发（`{ items: [{ text, passed, pendingText? }], done, total }`），
> 顶部「生成投稿检查清单」按钮只负责展开/收起已有数据。若后端希望改为「点按钮才计算」，
> 再加 `POST /writing/submission-checklist` 并返回同一结构即可，前端改动量为 1 行。

> ⚠️ **修正记录**：此前 Mock 的 `insertCitation` 写死返回 `citationCount: 31`，而页面正文显示 47 条 —— 两者不一致会让人以为是渲染问题。现已改为从载荷派生并累加，后端请同样以「当前文档的真实参考文献数」返回。

**`mode` 字段语义（本轮修正）**：两种模式对应**两套界面**，`mode` 表示**默认视图**。

| `mode` | 视图路由 | 界面 |
| --- | --- | --- |
| `aiFull` | `/project/:id/writing` | 写作大纲 + 按节生成 + 段落操作 + 完成初稿 |
| `aiAssist` | `/project/:id/writing/editor` | 投稿格式条 + 格式工具栏 + 插入引用 + AI 辅助建议 |

- 用户在页面上切换模式时，前端跳到对应视图，并保持 `useWritingStore.mode` 与视图一致（不会出现「高亮 A、界面 B」）；
- 服务端返回 `aiAssist` 时，进入 `/writing` 会自动重定向到辅助撰写视图（`replace` 导航，不留历史）；
- 两个视图**共用同一份文档**，写作内容与引用计数不会因切换视图丢失。

---

## 16. 前端 Mock 文件位置索引

| 页面 | Mock 数据定义 | 接口函数 |
| --- | --- | --- |
| P01 | `src/mocks/db.ts` → `PROJECTS`（派生） / `PROJECT_SCHEDULES` / `RAW_SCHEDULES` / `SCHEDULE_TODAY` / `PROJECT_DDL_LIST` / `DDL_TIMELINE`（派生） / `PROJECT_ARTIFACTS` | `src/api/endpoints.ts` §3 项目 |
| P13 | `src/mocks/db.ts` → `ACCOUNT_SETTINGS` / `LOGIN_DEVICES` / `NOTIFICATION_PREFS` / `ACCOUNT_PRIVACY` / `MAJOR_OPTIONS` / `GRADE_OPTIONS` | `src/api/endpoints.ts` §1.1 账号设置 |
| P02 | `HOTSPOT_DATA` | §4 研究热点 |
| P14 | `TOPIC_KEYWORDS` | §5 理论驱动 |
| P15 | `TOPIC_THEORY` | §5 理论驱动 |
| P16 | `UPLOAD_DATA` / `DATA_LEVEL_CARDS` / `DATA_SAFETY_NOTES` | §6 数据驱动 |
| P17 | `VARIABLE_IDENTIFY` | §6 数据驱动 |
| P18 | `HYPOTHESIS_DATA` / `ETHICS_NOTES` | §6 数据驱动 |
| P03 | `LITERATURE_DATA` | §7 文献综述 |
| P04 | `ANALYSIS_DATA` / `ANALYSIS_RESULT_SAMPLE` / `ANALYSIS_TYPE_OPTIONS` | §8 数据分析 |
| P05 / P11 | `WRITING_DATA` / `WRITING_EDITOR_BODY` / `WRITING_EDITOR_CITATIONS` / `WRITING_REWRITE_ACTIONS` | §9 论文写作 |
| P06 | `JOURNAL_DATA` | §10 选刊 AI |
| P07 | `REVIEW_DATA` / `REVIEW_TYPE_META` | §11 模拟评审 |
| P08 | `EXPORT_DATA` / `EXPORT_FOOTNOTE` | §12 导出中心 |
| P09 | `PLANS` / `QUOTA_ITEMS` / `QUOTA_USAGE` / `OVERAGE_TEXT` | §2 套餐与额度 |
| P10 | `PROJECT_SETTINGS_DATA` / `PROJECT_MEMBERS` / `VERSION_RECORDS` / `ROLE_LABEL_MAP` | §13 项目设置 |
| P12 | `CURRENT_USER` / `STUDENT_VERIFICATION` | §1 认证与用户 |
