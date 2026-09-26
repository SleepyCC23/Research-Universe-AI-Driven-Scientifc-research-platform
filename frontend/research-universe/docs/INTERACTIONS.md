# 研宇宙 · 交互逻辑说明（INTERACTIONS.md）

> 阅读方式：每条按 **触发动作 → 前端状态变化 → 页面跳转 / 组件更新 → 调用的接口** 四段式描述。
> 接口路径写全称（省略 `/api/v1` 前缀）；「本地」表示纯前端，不发请求。

---

## 目录

- [0. 全局交互](#0-全局交互)
- [1. P12 登录 / 注册 + 学生认证](#1-p12-登录--注册--学生认证)
- [2. P01 工作台](#2-p01-工作台)
- [3. P02 论文引言 · 研究热点](#3-p02-论文引言--研究热点)
- [4. P14 领域研究热词](#4-p14-领域研究热词)
- [5. P15 选择理论与变量](#5-p15-选择理论与变量)
- [6. P16 上传数据](#6-p16-上传数据)
- [7. P17 变量识别](#7-p17-变量识别)
- [8. P18 生成研究假设](#8-p18-生成研究假设)
- [9. P03 文献综述](#9-p03-文献综述)
- [10. P04 数据分析](#10-p04-数据分析)
- [11. P05 论文写作](#11-p05-论文写作)
- [12. P11 论文写作 · 全屏编辑器](#12-p11-论文写作--全屏编辑器)
- [13. P06 选刊 AI](#13-p06-选刊-ai)
- [14. P07 模拟评审](#14-p07-模拟评审)
- [15. P08 导出中心](#15-p08-导出中心)
- [16. P09 定价](#16-p09-定价)
- [17. P10 项目设置](#17-p10-项目设置)
- [18. P13 账号设置](#18-p13-账号设置)
- [19. 权限差异矩阵](#19-权限差异矩阵)
- [20. 状态与异常处理约定](#20-状态与异常处理约定)

---

## 0. 全局交互

### 0.1 顶部固定导航（全局组件）

| 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- |
| 点击「工作台 / 论文引言 / 数据统计 / 论文写作 / 论文评审」 | `location.pathname` 变化，当前 Tab 高亮（底部 2px 蓝条） | 路由跳转到对应页 | 本地（进入页面后各自拉数据） |
| 点击 Logo | — | 跳转 `/` | 本地 |
| 点击铃铛 | `notifOpen = !notifOpen`；打开时拉取一次通知 | 展开通知浮层：列表来自接口（含已读/未读圆点）；未读角标显示 `unreadCount`，为 0 时不显示角标 | `GET /me/notifications` |
| 点击某条通知 | 该条 `read = true`，`unreadCount - 1` | 关闭浮层；若该条带 `route` 则跳转对应页面 | 本地（单条已读的服务端接口见 `PATCH /me/notifications/:id`，本轮前端仅本地标记） |
| 点「全部已读」 | 列表全部 `read = true`，`unreadCount = 0` | 按钮消失、角标消失，列表保留 | `POST /me/notifications/read` |
| 点击头像 / 用户信息 | — | **跳转 `/account`（账号设置）**；悬停时头像出现描边环 | `GET /me/account` |
| 点击「学生认证已核验」标签（顶栏） | — | **已移除**：认证状态改由头像 → 账号设置查看，避免在首页重复提示 | — |
| 点击「导出中心」 | — | 跳转 `/project/:projectId/export` | `GET /projects/:projectId/export` |
| 点击「☰」 | `sidebarOpen = !sidebarOpen` | 展开**全局左侧边栏**（用户信息 + 导出中心 + 项目设置 + 套餐额度 + 项目快速切换） | `GET /me/quota` |

> **设计稿差异说明**：设计稿中用户信息与导出中心位于顶部导航右侧；任务描述要求放在左侧边栏。
> 当前实现「顶部还原设计稿 + 侧边栏可选」，两者共用同一份 `useAuthStore` 状态。详见 README §七。

### 0.2 全局确认弹窗（`GlobalConfirmDialog`）

统一由 `useUiStore.openConfirm({ tone, title, description, confirmText, onConfirm })` 唤起。

```
触发点（所有不可逆 / 高风险操作）
   ↓ openConfirm(...)
confirmDialog.open = true  →  Modal 渲染（遮罩 + 卡片）
   ↓ 用户点「确认」
loading = true  →  await onConfirm()
   ↓ 成功
closeConfirm()  →  Toast 成功提示
```

| 触发点 | tone | 文案要点 | 确认后调用的接口 |
| --- | --- | --- | --- |
| 确认方向，进入文献综述 | info | 结果写入留痕并进入分析流程 | `POST /projects/:id/intro/confirm-direction` |
| P17 确认变量 | info | 同上 | `POST /projects/:id/data/variables/confirm` |
| P18 确认假设 | info | 同上 | `POST /projects/:id/data/hypotheses/confirm` |
| P04 确认方法并执行 | info | 写入选择留痕（选择人 / 时间 / 备选项） | `POST /projects/:id/analysis/run` |
| P16 移除已上传文件 | warn | 移除后需重新上传才能参与体检 | `DELETE /projects/:id/data/files/:fileId` |
| P08 导出已选产物 | warn | 带不可移除溯源标识；连续导出会刷新披露报告 | `POST /projects/:id/export/artifacts` |
| P10 保存数据定级 | warn | 改级将同步影响 P4 导入拦截 / YOLO 禁用 / 导出阻断 | `PATCH /projects/:id/data-level` |
| P10 回滚版本 | warn | 回滚会生成新版本记录，不覆盖历史 | `POST /projects/:id/versions/:versionNo/rollback` |
| P09 切换套餐 | info | 额度立即生效，已使用额度不结转 | `POST /me/plan` |

### 0.3 全局异步任务弹窗（`GlobalTaskDialog`）

三态：`running`（加载图标 + 进度条，**遮罩不可点关闭**）→ `succeeded`（绿勾 + 「查看结果」）→ `failed`（红叹号 + 「关闭」）。

| 触发点 | running 文案 | succeeded 文案 | 完成后 |
| --- | --- | --- | --- |
| P03 生成结构化综述 | "正在生成结构化综述… / 双 Agent 核验异步执行中，预计 1‒3 分钟" | "综述生成完成 / 结果已生成并写入选择留痕" | 「查看结果」→ `/project/:id/analysis` |
| P04 执行分析（沙箱） | "正在执行分析（沙箱）… / 预计需要 10‒30 秒，请稍候" | "分析完成 / 结果已生成并写入选择留痕" | 「查看结果」→ 本页 `analysisResult` 区块渲染 |

进度来源：`api.pollTask(taskId, onTick, totalMs)` 每 150ms 推进一次（真实环境改为轮询 `GET /tasks/:taskId`）。

### 0.4 Toast

`useUiStore.pushToast({ tone, title, description })`，3.6 秒自动消失，右上角堆叠，可手动关闭。
全站共 20+ 处调用，覆盖：保存成功、上传成功、操作被拦截、导出被阻断、指标切换等。

### 0.5 项目级合规设置：三处共用一份状态（本轮修正）

> 修正原因：原先「数据级别」在 P16 与 P10 各存一份、YOLO 开关在 P03 与 P16 各是一个 `useState`，
> 会出现「同一项目在不同页面显示不同级别 / 开关状态相反 / 切页即重置」的问题。

| 项 | 约定 |
| --- | --- |
| 前端唯一状态 | `useSettingsStore` 的 `draftDataLevel` / `savedDataLevel` / `skipConfirm` |
| 载入时机 | P03、P16 在 `load()` 里与页面数据**并行**调用 `GET /projects/:id/compliance`，用 `hydrateCompliance()` 覆盖本地；P10 由 `fetchProjectSettings` 的 `dataLevel` / `skipConfirm` 字段载入 |
| 修改入口 | 数据级别：P16 与 P10 都可改（选草稿 → 「保存定级」二次确认 → `PATCH /projects/:id/data-level`）；YOLO：P03 与 P16 可直接切（`PATCH /projects/:id/skip-confirm`），P10 只读展示 |
| 同步范围 | 任一处修改成功后，另外两处立即反映同一值（无需刷新） |
| 服务端强制规则 | 项目为 L2 时：YOLO 开关前端置灰、服务端 `PATCH` 也强制回 `false` |
| 语义区分 | `DataUploadData.detectedDataLevel` 是**系统自动检测值**，仅作展示（P16 卡片副标题「系统自动检测：L1 · 项目定级：L1」），不参与规则判定 |

---

## 1. P12 登录 / 注册 + 学生认证

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 输入手机号 / 邮箱 | `account` 更新 | 输入框回显 | 本地 |
| 2 | 点击「发送验证码」 | `sending=true` → 按钮 loading；成功后 `cooldown=52` 并每秒递减；`errorText=''` | 按钮文案变为「52s 后重发」并禁用；自动聚焦第 1 个验证码格 | `POST /auth/sms-code` |
| 3 | 输入 6 位验证码 | `codes[i]` 更新；输入一位自动跳下一格；Backspace 空格时回退上一格 | 6 个独立输入框 | 本地 |
| 4 | 点击「登录 / 注册」 | `loggingIn=true`；校验 6 位数字，否则 `errorText='验证码为 6 位数字'` | 按钮 loading；成功后 `auth.loggedIn=true`、`localStorage.ru_token` 写入 | `POST /auth/login` |
| 5 | 登录成功 | `setAuth(res.auth)`、`setVerification(res.verification)`、`bootstrapped=true` | Toast「登录成功」→ **跳转 `/`** | — |
| 6 | 点击「微信快捷登录 / 学信网快捷核验」 | — | Toast 提示（演示环境） | 待接入 |
| 7 | 输入教育邮箱 + 点击「认证」 | `verifying=true`；本地校验 `/\.edu(\.cn)?$/` | 成功后 Tag 从「未核验」→「已核验」；显示绿色提示条 | `POST /me/student-verification` |
| 8 | 点击「没有教育邮箱？改用学信网…」 | — | Toast 说明学信网流程 | 待接入 |
| 9 | 点击「跳过，直接进入演示」 | — | 跳转 `/` | 本地 |

**异常态**：验证码非 6 位 → 红色 `InfoBanner` 内联报错；接口 `40001` → 同样内联报错，不跳转。

---

## 2. P01 工作台

> 页面结构：问候区 → 左「我的项目」（整卡可点 + 单个最新进度） + 右「DDL 倒排时间线（全部项目） / 本阶段产物摘要」→ 演示快捷入口。
> **需求变更历史**：① 删除项目卡片上的「进入项目」按钮，整卡可点；② 新增过顶部项目甘特图，**现已彻底删除**（代码已不在仓库）；③ 删除「项目流程看板」，阶段信息收敛为卡片内的**单个**「最新进度」；④ 移除问候区的「学生认证已核验」标签；⑤ DDL 倒排时间线由「只看当前项目」改为「合并全部项目 + 末尾查看全部」。

### 2.1 首屏加载

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载（并行两件事） | `loading=true` → `false`；`ddlLoading=true` → `false` | ① 项目列表与 DDL 卡先渲染 `Skeleton`，就绪后替换 | ① `GET /projects` ② `GET /projects/ddl` |
| 2 | 当前项目变化（默认 p_2001） | `artifacts` 刷新 | 产物卡先保持旧值再替换，不阻塞其它区块 | `GET /projects/:id/stage-artifacts` |
| 3 | 项目列表接口失败 | `error=message` | 渲染 `ErrorState` + 「重试」按钮 | — |
| 4 | DDL 接口失败 | — | 红色 Toast「DDL 加载失败 + message」，DDL 卡显示空态，其余区块保持可用 | — |
| 5 | 产物接口失败 | — | 红色 Toast「产物摘要加载失败 + message」 | — |

> DDL 是**跨项目**合并列表，与当前项目无关，因此只在挂载时取一次；切换当前项目只刷新产物卡。

### 2.2 我的项目（整卡可点击，已删除「进入项目」按钮）

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 点击卡片**任意位置** | `currentProjectId = p.projectId` | 按 `p.stage` 分流跳转：topic → `/intro`；literature → `/literature`；analysis → `/analysis`；writing → `/writing`；submission → `/export` | 本地 |
| 2 | 键盘 `Enter` / `Space` 聚焦卡片 | 同上 | 同一跳转（`role="button"` + `tabIndex=0`，`focus-visible` 显示蓝色描边环） | 本地 |
| 3 | 悬停卡片 | — | 描边变蓝、阴影加深、右侧 `›` 变蓝（`group-hover`），指针变为手型 | 本地 |
| 4 | 点「新建项目」 | `typeDialogOpen=true` | 弹出「请选择您的分析类型」 | 本地 |
| 5 | 弹窗内选「数据驱动 / 理论驱动」 | `newProjectType` 更新 | 选中项高亮（蓝框 + 浅蓝底） | 本地 |
| 6 | 点「确认并开始」 | `typeDialogOpen=false` | Toast 提示 → **跳转 `/project/p_2001/intro`** | `POST /projects`（真实环境） |

**卡片内「最新进度」模块**（替代原项目流程看板的多步流程）
- 左侧固定文案「最新进度」，右侧显示 `currentPhaseName · currentPhaseRange`（如「数据分析 · 10.16‒11.05」）；
- 下方**仅一条**进度条 + 一个百分比（`p.progress`，≥60% 用绿色，否则蓝色）。
- 整卡只有这一处进度可视化，符合「只显示一个最新进度」的要求。

### 2.3 右栏：DDL 倒排时间线（全部项目）/ 本阶段产物摘要

**列表内容**：把 3 个项目的 12 个 DDL 节点合并成一条时间线，每行标注所属项目。

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 查看列表（默认 5 条） | `ddlGroups` → `ddlRows`（`flattenDdlGroups` + `sortDdlRows`） | 每行：项目短名（第二行）+ 节点名 + 日期 + `剩 N 天`；已完成显示绿勾 + 灰色「已完成」，`daysLeft ≤ 7` 显示橙色警告图标与橙色文案 | `GET /projects/ddl` |
| 2 | 点末尾「查看全部 12 个节点 →」 | `ddlExpanded = true` | 列表展开为全部 12 条；按钮文案变为「收起，只看最近 5 个」 | 本地 |
| 3 | 点末尾「收起…」 | `ddlExpanded = false` | 列表回到前 5 条 | 本地 |
| 4 | 点某行的**项目短名** | `currentProjectId` 更新 | **跳转进入该项目**（按该项目当前阶段落地） | 本地 |
| 5 | 点「编辑节点」 | — | Toast：「硬节点按项目维护，请在对应项目的『项目设置』中修改日期」 | 本地（引导跳 P10） |
| 6 | 查看卡片底部提示 | — | 展示**最近一个未完成节点**所属项目的风险提示（前缀为该项目短名） | 本地（来自 `ddlGroups[].tip`） |
| 7 | 点产物摘要「去选择 →」/「去写作 →」 | — | 按 `artifacts.currentStage` 跳转对应页面（analysis → `/analysis`；writing → `/writing` 等） | 本地 |
| 8 | 无待办动作的产物 | — | 右侧显示状态文案，`tone=ok` 绿色 / `tone=warn` 橙色 | 本地 |

**排序规则**（`src/utils/schedule.ts` → `sortDdlRows`，显式且可复现）

1. 未完成（`daysLeft >= 0`）整体排在已完成（`daysLeft < 0`）之前 —— 先把「接下来要交的」给用户看；
2. 未完成组内按 `daysLeft` **升序** —— 最紧急的排最前；
3. 已完成组内按 `daysLeft` **降序** —— 最近完成的排最前；
4. 仍相同则按「项目标题 → 节点名」字典序。

> 按当前 Mock 数据，默认 5 条依次为：开题答辩（导师制，剩 5 天）→ 中期检查（社交焦虑，剩 12 天）→ 投稿截止（社交焦虑，剩 42 天）→ 中期检查（导师制，剩 68 天）→ 投稿截止（短视频，剩 86 天）。

> 原「项目流程看板」已按需求删除；其内嵌的「本阶段产物摘要」独立成卡保留，避免信息丢失。
> 对应接口 `GET /projects/:projectId/kanban` 一并废弃；阶段信息改由服务端同一份日程数据派生
> （`GET /projects/ddl` 与项目列表里的 `currentPhase*` / `mainDdl*` 字段）。

**DDL 概述关键词（本轮新增）**

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 点卡片头部「概述关键词 (N)」 | `keywordDialogOpen = true` | 弹出弹窗：每个项目一张 `ru-panel`，含项目短名、「示例：关键词：开题报告」、`不显示` + 各候选词胶囊（胶囊上带来源说明，如「来自项目标题」） | 数据来自 `GET /projects/ddl-keywords`（与 DDL 节点一起并行取回） |
| 2 | 点某个候选词胶囊 | 先**乐观更新** `ddlKeywords`，同时 `keywordSavingId = 项目 id` | 胶囊高亮（蓝框 + ✓）、该项目的示例文案同步；DDL 列表对应行前缀立即变化 | `PATCH /projects/:id/ddl-keyword` |
| 3 | 点「不显示」 | 该项 `selected = ''` | 该项目的行前缀消失，行内恢复显示「项目短名」第二行 | 同上 |
| 4 | 保存失败 | 回滚为修改前的列表 | 红色 Toast「关键词保存失败」 | 错误码 |
| 5 | 点「完成」 | `keywordDialogOpen = false` | 关闭弹窗 | — |
| 6 | 看列表 | — | 设了关键词的行显示 `关键词：节点名`（关键词品牌蓝），**隐藏**项目短名行，且**整行可点**（`role="button"` + Enter/Space）进入该项目；未设关键词的行维持「节点名 + 项目短名（可点）」两行 | 本地 |

> 排版约定：关键词为行内唯一彩色元素，`：` 用弱化灰；已完成/临近状态仍由左侧图标与右侧剩余天数表达，不额外加色，避免与关键词色冲突。
> 排序规则**不受关键词影响**（仍按 `sortDdlRows`），保证同一批数据下顺序稳定可复现。

**条件渲染规则**
- `p.mainDdlDaysLeft <= 7` → 卡片 meta 行的 DDL 文案标红 + 前置警告图标。
- `p.todoCount > 0` → 渲染红色数字圆圈 + 「待办 · 核验通过 N 条」，此时**不再**渲染 `footnote`（两者是同一句话，互斥渲染防止重复）。
- `p.todoCount` 不存在 → 渲染 `p.footnote`。
- `verification.verified === false` → 问候区显示橙色「学生认证未完成」（**已核验时不再显示任何标签**，避免重复提示；认证状态见头像 → 账号设置）。
- `projects.length === 0` → 渲染 `EmptyState` + 「新建项目」按钮。
- `ddlRows.length === 0` → DDL 卡渲染「暂无 DDL 节点」空态；`ddlRows.length <= DDL_PREVIEW_COUNT` 时不渲染「查看全部」按钮。
- 某行 `keywordByProject[row.projectId]` 有值 → 显示 `关键词：节点名` 且整行可点；否则显示 `节点名` + 项目短名（短名可点）。

---

## 3. P02 论文引言 · 研究热点

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false` | 骨架屏 → 内容 | `GET /projects/:id/intro/hotspot` |
| 2 | 输入研究方向 | `direction` 更新 | 输入框回显 | 本地 |
| 3 | 点「生成分析报告」 | `analyzing=true`；空值 → Toast 警告 | 按钮 loading；成功后整页数据刷新（研究不足 / 可行性评分 / 趋势图 / 综述清单） | `POST /projects/:id/intro/hotspot/analyze` |
| 4 | 点学科 Tab（计算机 / 心理学 / 医学·社科 / 经济学 / 人文艺术） | `activeCategory` 更新 | 数据库列表按 `subjectTags` 前端过滤；无匹配项时显示「该学科下暂无可接入库」 | 本地过滤（数据来自 hotspot 接口） |
| 5 | 点数据库「一键直连导入」 | — | Toast「已加入导入队列」 | `POST /projects/:id/data/import-public` |
| 6 | 点数据库「需自行申请」 | — | Toast「平台不拥有数据分发权，请前往官方渠道申请」 | 本地（引导外链） |
| 7 | 点「查看伦理声明模板」 | — | Toast「模板已加入项目资料库」 | 本地 |
| 8 | 点「确认方向，进入文献综述」 | 唤起确认弹窗 → `confirming=true` | 弹窗关闭后 **跳转 `/project/:id/literature`** | `POST /projects/:id/intro/confirm-direction` |
| 9 | 点「重新加载本页数据」 | `loading=true` | 骨架屏 → 内容 | `GET /projects/:id/intro/hotspot` |

**特殊状态**：`feasibility[i].insufficientData === true` → 该维度显示「数据不足，未评分」，**不做兜底给分**（设计稿明示规则）。

---

## 4. P14 领域研究热词

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false` | 骨架屏 → 内容 | `GET /projects/:id/intro/topic/keywords` |
| 2 | 修改研究方向 / 切换学科 | `direction` / `discipline` 更新 | 学科 chips 高亮 | 本地 |
| 3 | 点「分析」 | `analyzing=true`；空值 → Toast 警告 | 按钮 loading；成功后词云 / TOP 榜 / 趋势图全部刷新 | `POST /projects/:id/intro/topic/keywords/analyze` |
| 4 | 点击任一热词 | `toast` 入队 | Toast：「回溯「XX」/ 匹配文献 N 篇，已按被引排序」 | 本地（真实环境跳文献列表） |
| 5 | 点「下一步：选择理论与变量」 | — | **跳转 `/project/:id/intro/topic/theory`** | 本地（`selectedConcepts` 已在接口返回的 `lockedConcepts` 中） |

**视觉映射规则**（`KeywordCloudLocal`）：字号 = `13 + ratio × 21`（ratio 由词频在 min-max 间归一化）；颜色 = `growth` 枚举映射（新兴词蓝 / 高增长词橙 / 稳定核心词绿 / 长尾词灰）。

**步骤条状态**：领域研究热词 = `current`；选择理论与变量、研究可行性分析 = `upcoming`。

---

## 5. P15 选择理论与变量

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false`；`selectedTheoryId = data.selectedTheoryId`（默认 T1） | 骨架屏 → 对话式页面 | `GET /projects/:id/intro/topic/theory` |
| 2 | 点快捷追问（推荐适合的理论框架 / 把概念落成测量变量 / 这两者之间的理论路径是什么） | — | Toast 提示已选择该追问 | 本地 |
| 3 | 点「重新生成」 | `loading=true` | 对话区重新渲染 | `GET /projects/:id/intro/topic/theory` |
| 4 | 点理论卡片的「采用 T2 / T3」 | `switching=true` → `selectedTheoryId` 更新；`variableDrafts` 被**重算** | 三处同步更新：① 对话区理论卡片高亮 ② 右侧「候选理论框架」Tag 改为「已选定 / 备选」③ 右侧「变量落成草稿」列表刷新 | `POST /projects/:id/intro/topic/theory/select` |
| 5 | 点右侧候选理论卡片整块 | 同 #4 | 同 #4 | 同 #4 |
| 6 | 输入追问 + 回车 / 点发送 | `input` 清空 | Toast 提示（演示环境） | 待接入 |
| 7 | 点「← 回到热词页调整」 | — | **跳转 `/project/:id/intro/topic/keywords`** | 本地 |
| 8 | 点「下一步：研究可行性分析」 | — | Toast + **跳转 `/project/:id/analysis`** | 本地 |

**关键约束**：切换理论 → 变量落成草稿重算 → 选择记录写入项目日志（`POST select` 的副作用）。

---

## 6. P16 上传数据

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false`；`uploadedFiles` 来自 store | 骨架屏 → 内容 | `GET /projects/:id/data/upload` |
| 2 | 文件拖到虚线区上方 | `dragging=true` | 边框变蓝 + 底色变浅蓝 | 本地 |
| 3 | 拖离 | `dragging=false` | 恢复默认虚线灰 | 本地 |
| 4 | 释放文件 / 点击选择文件 | `uploading=true`；先本地校验扩展名（csv/xlsx/xls/sav/dta）与大小（≤200MB） | 失败 → 红色 Toast（格式不支持 `41501` / 文件过大 `41301`），不进入下一步；成功 → 新文件插入列表（`已上传 · 待体检`）+ 绿色 Toast | `POST /projects/:id/data/files`（multipart） |
| 5 | 点文件右侧垃圾桶 | 唤起确认弹窗 → 确认后 `uploadedFiles` 移除该项 | 列表项消失 | `DELETE /projects/:id/data/files/:fileId` |
| 6 | 点公共库「一键导入 / 需自行申请」 | — | 一键导入 → 绿色 Toast「已加入导入队列」；需申请 → 蓝色 Toast「平台不拥有数据分发权」 | `POST /projects/:id/data/import-public` |
| 7 | 点 L1 / L2 分级卡片 | `detectedDataLevel` 更新 | 卡片高亮（蓝框）；若选 L2 → 「跳过逐条确认」开关**立即置灰禁用** + 底部出现橙色警示条 | 本地（保存走 P10） |
| 8 | 拖「跳过逐条确认（YOLO）」开关 | `strictConfirm` 取反；`isL2` 时 `disabled` | 开关滑块动画 | 本地 → 后续随定级保存 |
| 9 | 点「载入示例」 | — | Toast「示例数据已载入 / 不会写入你的项目」 | `POST /projects/:id/data/sample/:sampleId` |
| 10 | 点「下一步：变量识别」 | `readyCount === 0` 时按钮 `disabled` | **跳转 `/project/:id/intro/data/variables`** | 本地 |

**数据分级联动（全局横切）**：`detectedDataLevel === 'L2'` → ① YOLO 开关禁用 ② 提交导入时后端返回 `40302` ③ 导出中心禁止导出原始数据行。

---

## 7. P17 变量识别

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false` | 骨架屏 → 内容（6 个统计小卡 + 变量表 + 环形图 + 质量问题） | `GET /projects/:id/data/variables` |
| 2 | 点筛选 Tab（全部 48 / 因变量 / 自变量 / 中介变量 / 调节变量 / 控制变量） | `variableFilter` 更新 | 表格按 `overriddenRole ?? suggestedRole` 前端过滤；无匹配 → `EmptyState`「该筛选条件下暂无变量」 | 本地 |
| 3 | 修改某行「建议角色」下拉 | `variables[i].overriddenRole` 更新 | Toast「已更新变量角色 / 后续方法清单将重新计算」 | `PATCH /projects/:id/data/variables/:varName`（`recalcNeeded=true`） |
| 4 | 点质量问题「确认处理」 | — | Toast「已记录处理方式 / 平台不会自动删除数据」 | 本地（真实环境写入报告） |
| 5 | 点「下一步：生成研究假设」 | 唤起确认弹窗 → `confirming=true` | 弹窗关闭后 **跳转 `/project/:id/intro/data/hypotheses`** | `POST /projects/:id/data/variables/confirm` |

**视觉规则**：缺失率 > 4% 的行用橙色加粗（设计中 `peer_support` 4.1%）；环形图 5 段颜色固定（连续 #12B76A / 无序 #2E90FA / 有序 #F79009 / 计数 #7C3AED / 文本 #E31B54）。

---

## 8. P18 生成研究假设

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false`；`hypotheses` 写入 store | 骨架屏 → 对话式页面（左对话 + 右清单） | `GET /projects/:id/data/hypotheses` |
| 2 | 点快捷追问 chip | `input` 被填入 | 输入框回显该文案 | 本地 |
| 3 | 点「重新生成」/ 输入后回车 / 点发送 | `regenerating=true` | 按钮 loading；成功后假设列表刷新 + Toast「已生成 3 条候选假设」 | `POST /projects/:id/data/hypotheses/generate` |
| 4 | 点某条假设「确认」 | `hypotheses[i].status='confirmed'`；右侧 Tag 变绿「已确认」；按钮集收回为「撤销」 | 三处联动：① 对话区不变 ② 右侧清单 Tag 变色 ③ 底部按钮 `disabled` 解除 | 本地（统一在 #6 提交） |
| 5 | 点「否决」 | `status='rejected'`；Tag 变灰 | 同上 | 本地 |
| 6 | 点「撤销」 | `status='pending'`；Tag 变橙 | 同上 | 本地 |
| 7 | 点「确认并进入数据分析」 | 若仍有 `pending` → 橙色 Toast「还有 N 条假设待确认」，**不跳转**；全部确认后唤起确认弹窗 | 弹窗关闭后 **跳转 `/project/:id/analysis`** | `POST /projects/:id/data/hypotheses/confirm` |

**合规提示区**（固定 4 条，不可交互）：AI 不生成研究结论 / 假设必须可检验 / 全部内容带溯源标识 / 记录计入《AI 工具使用情况说明》。

---

## 9. P03 文献综述

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false` | 骨架屏 → 结果列表 + 右侧 4 张卡 | `GET /projects/:id/literature` |
| 2 | 输入检索语句 + 回车 / 点「检索」 | `searching=true` | 列表区渲染 `Skeleton` → 新结果；结果总数与语言提示同步更新 | `POST /projects/:id/literature/search` |
| 3 | 切换筛选（期刊等级 / 学科 / 年份） | 局部 `v` 更新 | 下拉回显 | 本地（下次检索时带入 `filter`） |
| 4 | 点「加入已选」 | `selectedIds` 增删；右上角「已选」Tag 出现/消失 | 右侧「已选文献集」数字与进度条同步；按钮文案「加入已选」↔「已选入」 | `POST /projects/:id/literature/selection` |
| 5 | 对 `citable=false` 的条目点按钮 | — | 橙色 Toast「未验证条目不可选入 / 禁止进入参考文献区」，按钮本身 `disabled` | 本地拦截 |
| 6 | 点「上传文件」 | — | Toast「文献已上传并解析」 | `POST /projects/:id/literature/upload` |
| 7 | 点「生成结构化综述」 | `selectedCount < 5` 时按钮 `disabled`；否则 `generating=true` | 打开**全局异步任务弹窗**（running → succeeded）→「查看结果」跳 `/project/:id/analysis` | `POST /projects/:id/literature/generate-review` + 轮询 `GET /tasks/:taskId` |
| 8 | 点「前往导出中心处理 →」 | — | **跳转 `/project/:id/export`** | 本地 |
| 9 | 拖「跳过逐条确认（YOLO）」开关 | `strictMode` 取反 | 开关滑块动画（开启后核验失败不再阻断，但记入披露报告） | 本地 |
| 10 | 知识库问答输入 + 回车 / 点「提问」 | `asking=true` | 答案区文案替换 | `POST /projects/:id/kb/qa` |
| 11 | 点「生成领域认知地图（≥20 篇可用）」 | — | Toast 说明当前库内 34 篇满足条件 | 待接入 |
| 12 | 点「带入写作」 | — | Toast「已带入写作页 / 26 条已核验论断可用于引用」→ **跳转 `/project/:id/writing`** | `POST /projects/:id/literature/bring-to-writing` |

**强约束渲染**：
- 未验证条目卡片底部的匹配理由区**变红**（`bg-danger-soft border-danger-line`），已验证为**蓝色**。
- 「1 条核验失败，将阻断导出」用红色 `InfoBanner`。
- 中文文献未接入的语言提示**固定在结果列表顶部**，且提示「该提示将保留在导出物中」。

---

## 10. P04 数据分析

### 10.1 主流程（步骤式）

```
数据导入 ✓  →  数据体检 ✓  →  方法选择（当前）  →  分析结果
                                ↓ 确认选择并执行
                        确认弹窗 → 沙箱异步任务弹窗 → 结果渲染
```

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false` | 骨架屏 → 步骤条 + 方法卡片 + 体检报告 + 右栏 | `GET /projects/:id/analysis` |
| 2 | 点某张方法卡片 / 卡片内「选择该方法」 | `selectedMethodId` 更新 | 该卡蓝框 + 浅蓝底 + `ring-2`；按钮文案变「已选择该方法」；右栏底部显示「已选方法：XXX」 | 本地 |
| 3 | 点「重命名分析任务」 | `renameTarget.open=true` | 弹出重命名弹窗（任务名称输入 + 分析类型下拉） | 本地 |
| 4 | 弹窗内输入 / 切换类型 → 点「保存」 | `renameTarget.taskName/analysisType` 更新 → `open=false` | Toast「任务已重命名 / XXX」 | 本地（随 run 提交） |
| 5 | 点「执行分析（沙箱）」 | 未选方法 → 橙色 Toast「请先选择一个方法」；已选 → 唤起确认弹窗 | — | 本地拦截 |
| 6 | 确认弹窗点「确认」 | `running=true`；`runTask` 写入 store | 打开**异步任务弹窗**（running，进度 0→100） | `POST /projects/:id/analysis/run` |
| 7 | 轮询完成 | `runTask.status='succeeded'` | 任务弹窗切 succeeded；点「查看结果」关闭弹窗 → 页面新增「分析结果」卡片（6 行效应表） | `GET /projects/:id/analysis/runs/:runId` |
| 8 | 任务失败 | `taskDialog.phase='failed'` | 任务弹窗失败态（红叹号 + 关闭） | `50002` |
| 9 | 点「刷新本页数据」 | `loading=true` | 重新渲染 | `GET /projects/:id/analysis` |

**稳健性阻断规则**：`run.robustness[].flipped === true` 时，Tag 变红，并**禁止**在写作页使用「结论确定」表述（提示文案：默认对清单中的备选方法并行执行对比；若出现结论翻转，将阻断「结论确定」表述）。

### 10.2 数据导入区块

| 触发动作 | 前端状态变化 | 组件更新 | 接口 |
| --- | --- | --- | --- |
| 切到 L2 后提交导入 | — | 后端返回 `40302` → Toast「L2 敏感数据禁止导出原始数据行」 | `POST /projects/:id/analysis/import` |

---

## 11. P05 论文写作

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false` | 骨架屏 → 三栏布局（大纲 / 正文 / 引用与工具） | `GET /projects/:id/writing` |
| 2 | 切换「AI 全文生成 / AI 辅助撰写」 | `mode` 更新 | 选中项高亮 | 本地（同一文档内可随时切换，不清空内容） |
| 3 | 点击大纲某一节 | — | Toast「已切换到「XX」/ 章节切换会自动保存当前草稿」 | `PATCH /projects/:id/writing/doc`（切换前自动保存） |
| 4 | 拖拽大纲节点 | `draggingNode` 更新 | 拖拽项蓝底高亮 | 本地（真实环境调重排接口） |
| 5 | 点「生成 / 重排大纲」 | — | Toast「大纲已重新生成 / 已引用 31 条已核验文献」 | `POST /projects/:id/writing/outline/generate` |
| 6 | 点「重新生成本节」 | `regenerating=true`；`autoSavedAt` 刷新为当前时间 | 按钮 loading；顶部「已自动保存」时间同步更新 | `POST /projects/:id/writing/section/regenerate` |
| 7 | 点段落操作（重写 / 缩写 / 扩写 / 学术化改写） | — | Toast「已执行「重写」/ 仅改表达，不改论断」 | `POST /projects/:id/writing/paragraph/rewrite` |
| 8 | 切换引用样式（APA 7 ↔ GB/T 7714） | `citationStyle` 更新 | 引用列表文本整体重排 + 文内标号刷新 | 本地（真实环境 `POST /writing/citation`） |
| 9 | 拖「双向同步」开关 | 局部状态取反 | 滑块动画 + Toast「已开启 / 关闭双向同步」 | `POST /integrations/zotero/bind` |
| 10 | 点「完成初稿，进入选刊」 | — | **跳转 `/project/:id/journal`** | 本地 |
| 11 | 点「打开全屏编辑器 →」/「预览初稿」 | — | **跳转 `/project/:id/writing/editor`** | 本地 |

**只读区块规则**：`paragraphs[].kind === 'boundMethod'` 的段落用**橙色警示卡**渲染，并标注「方法章节 · 与项目内分析产物绑定，不可修改」，文字不可编辑。

---

## 12. P11 论文写作 · 全屏编辑器

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false` | 投稿格式条 + 纸张区 + 右侧工具区 | `GET /projects/:id/writing` |
| 2 | 切换写作模式 | `mode` 更新 | 分段控件高亮 | 本地 |
| 3 | 点「预览初稿」 | `saving=true` → `false`；`autoSavedAt` 刷新 | 左侧「已自动保存」时间更新 + Toast | `PATCH /projects/:id/writing/doc` |
| 4 | 点「导出投稿包」 | — | Toast「投稿包已导出 / 已联动导出中心」 | `POST /projects/:id/submission-package` |
| 5 | 点「生成投稿检查清单」 | — | Toast「6 项中 5 项已完成，伦理声明待补」 | 本地 |
| 6 | 点缩放「− / +」 | `zoom` 在 60‒160 间增减 | 纸张区 `transform: scale(zoom/100)` | 本地 |
| 7 | 点格式按钮（B / I / U / ≡ / A / H1 / H2） | — | Toast「格式操作：X」 | 本地（真实环境走编辑器命令） |
| 8 | 点「插入引用 / 表格 / 图表 / 公式」 | — | Toast「已触发：XXX」 | 本地 |
| 9 | 点知识库文献「插入引用」 | — | Toast「已在光标处插入引用 [N] / 并按 GB/T 7714-2015 生成文内标号」 | `POST /projects/:id/writing/citation` |
| 10 | 点「切换引用样式」 | `citationStyle` 取反 | 正文上标与参考文献实时重排 + Toast | `POST /projects/:id/writing/citation` |
| 11 | 点 AI 建议「采纳」 | `adoptedSuggestionIds` 追加 | 按钮文案「采纳」→「已采纳」且置灰 | `POST /projects/:id/writing/ai-suggestion/adopt` |

---

## 13. P06 选刊 AI

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false`；`activeJournalId = profile.journalId` | 推荐列表 + 右侧画像 | `GET /projects/:id/journals` |
| 2 | 点「重新匹配」 | `rematching=true` | 按钮 loading；成功后列表按匹配度重排 + Toast | `POST /projects/:id/journals/match` |
| 3 | 点某期刊「查看画像 →」 | `activeJournalId` 更新 | 该行变蓝框浅蓝底；右侧「期刊画像」标题与全部指标切换（首本不弹 Toast，其余弹「已切换画像」） | `GET /journals/:journalId/profile` |
| 4 | 点「生成投稿包（跳转导出中心）」/ 底部「导出投稿包」 | — | Toast「投稿包需先补齐伦理与数据可得性声明」→ **跳转 `/project/:id/export`** | `POST /projects/:id/submission-package` |

**合规渲染**：底部橙色 `InfoBanner` 固定展示免责声明；检查清单第 6 项未完成时右侧显示橙色「待补」Tag。

---

## 14. P07 模拟评审

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false`；`issues` 写入 store；`calibratedAt` 写入 | 骨架屏 → 三段意见分组（硬伤红 / 争议黄 / 风格灰） | `GET /projects/:id/review` |
| 2 | 点「重新校准」 | `recalibrating=true` | 按钮 loading；顶部「校准完成 HH:mm」刷新 + Toast「已学习 48 篇顶刊论文 · 312 条语料」 | `POST /projects/:id/review/recalibrate` |
| 3 | 点「接受建议并修改」 | `issue.handled` 在 `none` ↔ `accepted` 间切换 | 按钮高亮为 primary；底部「修改摘要：已采纳 N」实时 +1 | `PATCH /projects/:id/review/issues/:issueId` |
| 4 | 点「标记争议」 | `handled` 切换为 `disputed` | 按钮高亮；摘要「标记争议 N」+1 | 同上 |
| 5 | 点「生成回复」 | 自动置 `accepted` | Toast「已为 XX 生成回复草稿 / 草稿写入 Rebuttal 辅助区」 | 同上 |
| 6 | 点「忽略该条」 | `handled='ignored'` | 摘要「忽略 N」+1 | 同上 |
| 7 | 点「查看全部 6 条修改路径 →」 | — | Toast「含 D1/D2/S1/S2 的逐条修改步骤」 | 本地 |
| 8 | 点「生成完整 Rebuttal 草稿」 | `generatingRebuttal=true` | 按钮 loading + Toast「不改变你的原有观点；冲突点已单独标注」 | `POST /projects/:id/review/rebuttal` |
| 9 | 点「输出修改摘要与 Rebuttal 草稿」 | — | Toast「已写入项目产物，可在导出中心下载 .docx」 | 本地（真实环境生成产物） |

**置信度渲染**：`confidence='high'` → 红色 Tag；`medium` → 橙色；`low` → 中性灰。

---

## 15. P08 导出中心

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false`；`selectedArtifactIds` 默认勾选全部 `ready` 项 | 产物列表 + 披露报告卡 + 右栏风险卡 | `GET /projects/:id/export` |
| 2 | 勾选 / 取消勾选某个产物 | `selectedArtifactIds` 增删 | 该行变蓝框浅蓝底；底部「已选 N 项产物」同步 | 本地 |
| 3 | 点「待补齐」产物的勾选框 | `status='pending'` → `disabled` | 复选框不可点 | 本地拦截 |
| 4 | 点格式 chip（md / docx / PDF / zip） | `selectedFormats[artifactId]` 更新 | chip 高亮（蓝框蓝底）；同一产物内为单选 | 本地 |
| 5 | 点「生成披露报告」 | `generating=true`；成功后 `disclosureGeneratedAt` 更新 | 按钮 loading；「最近生成」时间刷新 + Toast | `POST /projects/:id/export/disclosure` |
| 6 | 点「上传文献 PDF」 | — | Toast「PDF 已上传并完成核验」 | `POST /projects/:id/export/upload-pdf` |
| 7 | 点「我已确认，允许导出」 | `unverifiedConfirmed=true` | 右栏顶部卡片从**红色风险卡**切换为**绿色「核验风险已处理」卡** | `POST /projects/:id/export/confirm-unverified` |
| 8 | 点「导出已选产物」 | 未选 → 橙色 Toast；已选 → 唤起确认弹窗 | — | 本地拦截 |
| 9 | 确认弹窗点「确认导出」 | `exporting=true` | 成功 → 绿色 Toast「导出成功 + downloadUrl」；命中 `blocked` 产物 → **红色 Toast「导出被阻断」** | `POST /projects/:id/export/artifacts` |
| 10 | 命中 `40303` | — | Toast 提示「存在 N 项待补齐产物，已阻断导出」 | 错误码 |

**强约束**：`L2` 项目禁止导出原始数据行；存在核验失败条目时 `40303` 阻断；连续导出时披露报告自动刷新为最新一次生成记录。

---

## 16. P09 定价

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false`；`plans` / `quotaItems` 写入 | 骨架屏 → 三张套餐卡 + 额度表 + 用量条 | `GET /plans`（+ `GET /me/quota`） |
| 2 | 点「查看认证 →」 | — | **跳转 `/login`** | 本地 |
| 3 | 点「升级到专业版 / 切换到学生版」 | 唤起确认弹窗（含价格与新额度说明） | — | 本地 |
| 4 | 确认弹窗点「确认切换」 | `changing=planId`；成功后 `plan` 更新（全局生效） | 按钮 loading；卡片按钮文案变为「当前套餐」并置灰；「我的额度用量」按新套餐刷新 | `POST /me/plan` |
| 5 | 点「联系销售」（团队版） | — | Toast「团队版支持机构合同、发票与统一披露」 | 本地 |
| 6 | 用量条颜色 | `pct >= 90` 红 / `>= 70` 橙 / 否则蓝 | `ProgressBar` tone 变化 | 本地 |

**空态**：`plans.length === 0` → `PageSkeleton` 持续（真实环境应改为 `EmptyState`）。

---

## 17. P10 项目设置

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading` → `false`；`title`/`discipline` 预填；`draftDataLevel = savedDataLevel = data.dataLevel` | 骨架屏 → 项目信息 + 成员 + 版本 + 右栏定级 | `GET /projects/:id/settings` |
| 2 | 改项目名称 / 学科 / 驱动路线 | `title` / `discipline` 等更新 | 输入框回显；页头标题同步 | 本地（点保存才提交） |
| 3 | 改 DDL 节点日期后失焦 | — | Toast「已更新「中期检查」节点日期 / 11-15 → XX」 | 本地（随保存提交） |
| 4 | 点「保存修改」 | `saving=true` | 按钮 loading + Toast「已保存修改 + savedAt」 | `PATCH /projects/:id` |
| 5 | 点「邀请成员」 | `inviteDialogOpen=true` | 弹出邀请弹窗 | 本地 |
| 6 | 弹窗填账号 + 选角色 → 点「发送邀请」 | 空账号 → 橙色 Toast；否则 `loading=true` | 成功后 Toast「邀请已发送 / 账号 · 角色」→ 关闭弹窗并清空输入 | `POST /projects/:id/members/invite` |
| 7 | 点版本「回滚」 | 唤起确认弹窗（warn，说明不覆盖历史） | — | 本地 |
| 8 | 确认回滚 | — | Toast「已回滚到 v17 + rollbackAt」 | `POST /projects/:id/versions/:versionNo/rollback` |
| 9 | 点 L0 / L1 / L2 定级卡片 | `draftDataLevel` 更新 | 卡片高亮 + 单选圆点填色；「保存定级」按钮解除禁用 | 本地 |
| 10 | 点「保存定级」（级别有变化） | 唤起确认弹窗（warn，展示 `dataLevelChangeImpact`） | — | 本地 |
| 11 | 确认保存定级 | `savedDataLevel` 更新（= draft） | Toast「数据级别已切换为 L2 / 规则已全局生效」；**全局联动**：P16 的 YOLO 开关置灰、P4 导入拦截、P8 导出阻断 | `PATCH /projects/:id/data-level` |
| 12 | 点「重新读取项目设置」 | `loading=true` | 骨架屏 → 内容 | `GET /projects/:id/settings` |

**权限渲染**：非第一作者进入本页时，「保存定级」应置灰并提示无权限（`40301`），成员表只读。

---

## 18. P13 账号设置（`/account`）

**入口（三处，共用同一份状态）**

| 入口 | 位置 | 行为 |
| --- | --- | --- |
| 顶部导航头像 | 顶栏右侧（通知与导出中心之间） | 点击（含点击昵称/文字头像/箭头）= 跳转 `/account`；悬停时头像出现描边环、昵称变蓝、箭头变蓝 |
| 全局侧边栏用户卡 | 侧边栏顶部 | 点击整卡跳转 `/account` 并关闭侧边栏 |
| 全局侧边栏菜单项 | 「账号设置」（`IconUser`） | 跳转 `/account` 并关闭侧边栏 |

### 18.1 加载与基本资料

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 页面挂载 | `loading=true` → `false`；`nickname` / `major` / `grade` 预填；`notifications` / `allowTraining` 同步 | 骨架屏 → 左栏（基本信息 / 账号与安全 / 学生认证）+ 右栏（套餐与额度 / 通知偏好 / 数据与隐私） | `GET /me/account` |
| 2 | 接口失败 | `error=message` | `ErrorState` + 「重试」 | — |
| 3 | 改昵称 / 学科 / 年级 | `dirty` 变为 true | 头像预览随昵称首字实时变化；「保存修改」解除禁用；出现橙色「有未保存的修改，离开本页将丢失」 | 本地 |
| 4 | 点「保存修改」 | `saving=true` → `false` | 成功后按钮文案回到「已保存」并禁用；**顶栏昵称与文字头像同步更新**；Toast「已保存修改 + savedAt」 | `PATCH /me` + 全局 `setUser` |
| 5 | 昵称为空时保存 | — | 橙色 Toast「昵称不能为空」，不发请求 | 本地拦截 |

### 18.2 账号与安全

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 点手机号「更换」 | — | Toast「更换手机号 / 需先通过原手机号验证」 | 本地（引导流程） |
| 2 | 点「修改密码」 | 二次确认（warn） | 文案写明「其他设备登录全部失效」；确认后 Toast 说明将向教育邮箱发送 30 分钟有效的验证链接 | 本地 |
| 3 | 点「退出其他设备」 | 二次确认（warn，文案含被退出的设备台数） | 确认后列表只保留当前设备；Toast「已退出 N 台设备」 | `POST /me/devices/revoke-others` |
| 4 | 仅剩当前设备时 | — | 「退出其他设备」置灰 | 本地 |
| 5 | 点「退出登录」 | 二次确认（info，说明会锁定导出/定级/披露报告等高级功能） | 确认后清除本地登录态并跳转 `/login` | `POST /auth/logout` + 全局 `reset()` |

### 18.3 学生认证

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 查看认证卡 | — | 三个标签（已核验 / 渠道 / 权益同步）+ 认证邮箱、认证时间、失效宽限期 | 来自 `GET /me/account` |
| 2 | 点「重新认证」 | 二次确认（info，说明需重新提供教育邮箱或学信网报告、权益在有效期内不受影响） | 确认后更新认证状态与时间；Toast「学生认证已更新」 | `POST /me/student-verification` |
| 3 | `benefitsSynced === false` | — | 出现橙色提示条「权益尚未同步到定价与额度系统」 | 本地 |

### 18.4 通知偏好 / 套餐与额度 / 数据与隐私

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 切换任一通知开关 | **乐观更新**：先翻转开关，接口失败则回滚 | Toast「已开启/关闭「XX」」；失败时 Toast「通知偏好保存失败 / 已恢复为上一次的设置」 | `PATCH /me/notifications` |
| 2 | 「核验失败提醒」（`mandatory`） | — | Toggle 置灰不可点，行内显示橙色「必开」标签 | 接口返回强制项 |
| 3 | 点「去定价页 →」 | — | 跳转 `/pricing` | 本地 |
| 4 | 打开「允许数据用于模型改进」 | 二次确认（warn） | 文案说明「写入《AI 工具使用情况说明》并留痕、可随时关闭、关闭后历史批次不可撤回」；确认后 Toast 为 warn 色 | `PATCH /me/privacy` |
| 5 | 关闭「允许数据用于模型改进」 | 直接生效 | Toast 为 ok 色，文案显示当前状态为「不允许」 | 同上 |
| 6 | 点「导出我的数据」 | — | Toast「已提交导出申请 + 预计 30 分钟内完成」；「最近导出申请」时间更新 | `POST /me/data-export` |

### 18.5 注销账号（独立弹窗 + 输入确认词）

| # | 触发动作 | 前端状态变化 | 跳转 / 组件更新 | 接口 |
| --- | --- | --- | --- | --- |
| 1 | 点「注销账号」（红色描边按钮） | `deleteOpen=true`；`deleteConfirmText` 清空 | 弹出 Modal；遮罩**不可点关闭**（`closeOnMask=false`） | 本地 |
| 2 | 输入文字 | `deleteConfirmText` 更新 | 只有严格等于「注销账号」时「确认注销」才可点 | 本地 |
| 3 | 点「确认注销」 | `deleting=true` | 成功后清除本地状态、Toast「账号已注销 / 数据进入 30 天保留期」→ **跳转 `/login`** | `DELETE /me` + 全局 `reset()` |
| 4 | 点「取消」/ Esc | `deleteOpen=false` | 关闭弹窗（`deleting` 期间禁止关闭） | 本地 |

> **弹窗文案已写明**：登录凭证立即失效、项目数据 30 天保留期、导出中心历史产物与披露报告一并删除、建议先「导出我的数据」。

---

## 19. 权限差异矩阵

| 能力 | 第一作者 | 导师 | 协作学生 | 游客 |
| --- | --- | --- | --- | --- |
| 查看产物快照 | ✅ | ✅ | ✅ | ❌ |
| 查看改动日志 | ✅ | ✅ | ✅ | ❌ |
| 查看核验状态 | ✅ | ✅ | ✅ | ❌ |
| 编辑产物 | ✅ | ✅ | ✅ | ❌ |
| 参与核验 | ✅ | ✅ | ✅ | ❌ |
| 评论 / 退回修改 | ✅ | ✅ | ❌ | ❌ |
| 导出产物 | ✅ | ❌ | ❌ | ❌ |
| 数据定级 | ✅ | ❌ | ❌ | ❌ |
| 生成披露报告 | ✅ | ❌ | ❌ | ❌ |
| 删除项目 | ✅ | ❌ | ❌ | ❌ |
| 回滚版本 | ✅ | ❌ | ❌ | ❌ |

**实现方式**：`useAuthStore.permissions` 由 `member.role` 推导；页面按权限对按钮做 `disabled` + Tooltip 说明。
后端二次校验，越权返回 `40301 FORBIDDEN_ROLE`。

---

## 20. 状态与异常处理约定

| 状态 | 触发条件 | 表现 |
| --- | --- | --- |
| **加载态** | 首次拉取 / 手动刷新 | `PageSkeleton`（标题条 + 两张卡片骨架，带 shimmer 动画） |
| **局部加载** | 检索 / 重新生成 | 列表区渲染 `Skeleton`，其余区块保持 |
| **按钮 loading** | 任何提交类操作 | 按钮内替换为旋转 `Spinner`，同时 `disabled` 防重复提交 |
| **空态** | 列表长度为 0 | `EmptyState`（圆形底 + 标题 + 说明 + 可选操作按钮） |
| **错误态** | 接口抛错 | `ErrorState`（红色叹号 + `message` + 「重试」），重试回调原加载函数 |
| **权限态** | 越权 | 按钮 `disabled` + 文案说明；接口返回 `40301` 时 Toast 提示 |
| **分级态** | L2 项目 | YOLO 开关置灰 + 橙色警示条；导入/导出被拦截 |
| **阻断态** | 核验失败 / 待补产物 | 红色 `InfoBanner` + 导出时抛 `40303` |
| **异步态** | 沙箱 / 综述生成 | 全局任务弹窗（running 遮罩不可关闭），完成后切成功态并给出下一步动作 |
| **重复提交** | 同项目已有沙箱任务 | `40901` → Toast「分析进行中，请稍候」 |

### 交互一致性规则

1. **不可逆操作一律二次确认**，并在弹窗文案里说明留痕位置（选择留痕 / 项目日志 / 披露报告）。
2. **所有 AI 产出都带溯源标识**（`AI` Tag / 「AI 生成 · 可溯源」标签），且写作用文案明确「仅改表达，不改论断」。
3. **未验证文献全程隔离**：不可选入、不可插入引用、不进参考文献表、阻断导出。
4. **第三方面板（期刊画像）必须带来源与样本量**；无来源不展示；数据超 6 个月标注「数据待确认」。
5. **不做承诺型文案**：选刊页不得出现「保证录用 / 大概率必中」类表述（设计稿已内置免责声明）。
