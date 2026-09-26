# 研宇宙 Research Universe · AI 科研工作台（前端）

> 引用可溯源 · 分析可复现 · 过程可交代

根据 UI 设计稿（共 **18 个界面 + 6 类弹窗**）实现的完整可运行前端工程。
技术栈：**React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Zustand + React Router 6 + Recharts**。

---

## 一、快速启动

### 环境要求

| 依赖 | 版本要求 | 本项目验证版本 |
| --- | --- | --- |
| Node.js | ≥ 18.18（推荐 20 LTS 及以上） | 22.22.2 |
| npm | ≥ 9 | 随 Node 自带 |
| 浏览器 | 支持 ES2020 的现代浏览器 | Chrome / Edge 最新版 |

### 安装与运行

```bash
# 1. 进入工程目录
cd research-universe

# 2. 安装依赖（首次约 1-3 分钟）
npm install

# 3. 启动开发服务器（默认 http://localhost:5173，会自动打开浏览器）
npm run dev

# 4. 生产构建（先做类型检查，再打包到 dist/）
npm run build

# 5. 本地预览生产包（默认 http://localhost:4173）
npm run preview

# 6. 仅做类型检查
npm run typecheck
```

已验证：`npm run typecheck` **0 error**；`npm run build` **871 modules transformed, built in ~6s**。

构建产物分包（`vite.config.ts` 中配置）：

| 产物 | 大小 | gzip |
| --- | --- | --- |
| `index-*.css` | 30.7 kB | 6.3 kB |
| `index-*.js`（业务代码） | 210.9 kB | 67.7 kB |
| `vendor-react-*.js` | 204.4 kB | 66.7 kB |
| `vendor-charts-*.js`（Recharts） | 411.5 kB | 110.9 kB |
| `vendor-state-*.js`（Zustand） | 3.6 kB | 1.6 kB |

---

## 二、目录结构

```
research-universe/
├── index.html                     # HTML 入口
├── package.json                   # 依赖与脚本
├── tsconfig.json                  # TS 配置（含 @/* 路径别名）
├── vite.config.ts                 # Vite 配置（唯一配置源：别名 / 代理 / 分包）
├── tailwind.config.js             # 设计令牌（颜色、字号、圆角、阴影）
├── postcss.config.js
├── docs/
│   ├── API.md                     # 后端接口文档（全量接口 + 错误码 + Mock 标注）
│   ├── VARIABLES.md               # 变量清单 + 中英命名对照表
│   └── INTERACTIONS.md            # 交互逻辑说明（动作 → 状态 → 跳转 → 接口）
└── src/
    ├── main.tsx                   # 应用入口
    ├── App.tsx                    # 根组件（挂载全局弹窗 / Toast / 路由）
    ├── index.css                  # Tailwind 入口 + 设计系统基类（.ru-card 等）
    ├── router.tsx                 # 路由表
    ├── vite-env.d.ts              # Vite 环境变量类型
    ├── types/
    │   └── index.ts               # 全量 TypeScript 类型定义（11 个分区）
    ├── mocks/
    │   └── db.ts                  # Mock 数据（数值全部来自设计稿）
    ├── api/
    │   ├── client.ts              # 请求客户端 + 错误码 + ApiError + Mock 开关
    │   └── endpoints.ts           # 全部接口函数（含真实路径注释）+ 接口登记表
    ├── store/
    │   └── index.ts               # 8 个 Zustand store
    ├── components/
    │   ├── icons.tsx              # 内联 SVG 图标集（38 个）
    │   ├── ui.tsx                 # UI 组件库（Card/Button/Tag/Stepper/Modal/Table/…）
    │   ├── charts.tsx             # 图表组件（折线/环形/条形/词云）
    │   ├── GanttChart.tsx         # 项目甘特图总览（⚠️ 已下线未接线，见「九、变更记录」）
    │   └── layout.tsx             # 顶部导航 + 全局侧栏 + 面包屑 + 布局外壳
    ├── utils/
    │   └── schedule.ts            # 日程纯函数（日期换算、阶段/节点状态判定、DDL 合并排序）
    └── pages/                     # 19 个页面
        ├── Login.tsx              # P12 登录 / 注册 + 学生认证
        ├── Workspace.tsx          # P01 工作台
        ├── IntroHotspot.tsx       # P02 论文引言 · 研究热点
        ├── IntroTopicKeywords.tsx # P14 理论驱动 · 领域研究热词
        ├── IntroTopicTheory.tsx   # P15 理论驱动 · 选择理论与变量
        ├── IntroDataUpload.tsx    # P16 数据驱动 · 上传数据
        ├── IntroVariables.tsx     # P17 数据驱动 · 变量识别
        ├── IntroHypotheses.tsx    # P18 数据驱动 · 生成研究假设
        ├── Literature.tsx         # P03 文献综述
        ├── Analysis.tsx           # P04 数据分析
        ├── Writing.tsx            # P05 + P11 论文写作（含全屏编辑器）
        ├── Journal.tsx            # P06 选刊 AI
        ├── Review.tsx             # P07 模拟评审
        ├── ExportCenter.tsx       # P08 导出中心
        ├── Pricing.tsx            # P09 定价
        ├── ProjectSettings.tsx    # P10 项目设置
        ├── AccountSettings.tsx    # P13 账号设置（全局，入口＝顶部头像）
        └── NotFound.tsx           # 404
```

---

## 三、路由与设计稿对照

| 设计稿界面 | 路由 | 顶部导航高亮 |
| --- | --- | --- |
| P01 工作台 / 我的项目 | `/` | 工作台 |
| P02 论文引言 · 研究热点 | `/project/:projectId/intro` | 论文引言 |
| P14 理论驱动 · 领域研究热词 | `/project/:projectId/intro/topic/keywords` | 论文引言 |
| P15 理论驱动 · 选择理论与变量 | `/project/:projectId/intro/topic/theory` | 论文引言 |
| P16 数据驱动 · 上传数据 | `/project/:projectId/intro/data/upload` | 论文引言 |
| P17 数据驱动 · 变量识别 | `/project/:projectId/intro/data/variables` | 论文引言 |
| P18 数据驱动 · 生成研究假设 | `/project/:projectId/intro/data/hypotheses` | 论文引言 |
| P03 文献综述 | `/project/:projectId/literature` | 论文引言 |
| P04 数据分析 | `/project/:projectId/analysis` | 数据统计 |
| P05 论文写作 | `/project/:projectId/writing` | 论文写作 |
| P11 论文写作 · 全屏编辑器 | `/project/:projectId/writing/editor` | 论文写作 |
| P06 选刊 AI | `/project/:projectId/journal` | 论文写作 |
| P07 模拟评审 | `/project/:projectId/review` | 论文评审 |
| P08 导出中心 | `/project/:projectId/export` | —（全局入口） |
| P09 定价 | `/pricing` | —（全局入口） |
| P10 项目设置 | `/project/:projectId/settings` | —（全局入口） |
| P12 登录 / 注册 + 学生认证 | `/login` | 无导航（独立布局） |
| P13 账号设置 | `/account` | 无 Tab 高亮（全局页；入口：顶栏头像 / 全局侧边栏「账号设置」） |
| **P13 账号设置**（新增，非设计稿） | `/account` | —（入口＝顶部导航右侧头像） |

> 演示用项目 ID 固定为 `p_2001`。工作台底部提供了「演示快捷入口」卡片，可一键跳到全部 19 个页面，方便评审与自测。
> `/account` 的入口有三处且共用同一份状态：① 顶部导航右侧头像（点击即进）；② 全局侧边栏的「用户信息卡」；③ 全局侧边栏的「账号设置」菜单项。

---

## 四、技术栈说明

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 构建 | Vite 5 | 开发秒级启动；生产构建自动做 CSS/JS 压缩与分包 |
| 框架 | React 18 | 函数组件 + Hooks |
| 语言 | TypeScript 5（`strict: true`） | 全量类型定义，`npm run typecheck` 零错误 |
| 样式 | Tailwind CSS 3 | 设计令牌集中在 `tailwind.config.js`；`src/index.css` 里用 `@layer components` 抽出 `.ru-card` / `.ru-input` / `.ru-th` 等复用基类 |
| 状态管理 | Zustand 4 | 8 个 store，按 全局 → 项目 → 流程 分层，见下表 |
| 路由 | React Router 6 | `createBrowserRouter` 声明式路由表 |
| 图表 | Recharts 2 | 折线图（趋势）、环形图（变量类型分布）；条形图/词云用纯 DOM 实现以精确控制视觉 |

### Zustand store 划分

| store | 作用域 | 关键状态 |
| --- | --- | --- |
| `useUiStore` | 全局 | Toast、通用确认弹窗、异步任务弹窗、全局 loading |
| `useAuthStore` | 全局 | 登录态、用户信息、学生认证、套餐、额度用量、权限开关 |
| `useProjectStore` | 项目级 | 项目列表、当前项目 |
| `useDataFlowStore` | 流程级（P16→P18） | 已上传文件、数据级别、变量清单与角色修正、假设清单 |
| `useAnalysisStore` | 流程级（P04） | 候选方法、已选方法、沙箱任务、分析结果、重命名弹窗 |
| `useWritingStore` | 流程级（P05/P11） | 写作模式、引用样式、已采纳 AI 建议、自动保存时间 |
| `useExportStore` | 流程级（P08） | 产物勾选、导出格式、披露报告生成时间、未验证确认 |
| `useReviewStore` | 流程级（P07） | 评审意见处理状态、校准时间 |
| `useSettingsStore` | 流程级（P10） | 数据定级草稿态 / 已保存态、邀请弹窗 |

---

## 五、Mock 数据与真实后端切换

默认**全部走前端 Mock**（`src/mocks/db.ts`），便于脱离后端独立演示。

- 关闭 Mock：在项目根目录新建 `.env.local`，写入

  ```bash
  VITE_USE_MOCK=false
  ```

  此时 `src/api/endpoints.ts` 中的请求会打到 `/api/v1/**`，由 `vite.config.ts` 的 `server.proxy` 转发到
  `http://localhost:8080`（可在 `vite.config.ts` 中改 `target`）。

- 接口层已经按真实后端写好：每个函数上方注释即「Method + 路径」，请求参数与响应结构见
  [`docs/API.md`](docs/API.md)（文档中逐条标注了 **真实接口 / 前端 Mock**）。

---

## 六、设计系统（来自设计稿还原）

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `page` | `#F5F7FA` | 页面底色 |
| `panel` | `#EEF1F6` | 卡内嵌面板（浅灰底） |
| `line` / `line-strong` | `#E6EAF2` / `#D5DCE7` | 描边（常规 / 强） |
| `ink` / `ink-2` / `ink-3` | `#1F2733` / `#5A6473` / `#8C96A8` | 主 / 次 / 弱文本 |
| `brand` | `#2563EB`（soft `#EFF4FF`） | 主色（按钮、链接、当前步骤） |
| `ok` | `#16A34A` | 通过 / 已核验 |
| `warn` | `#D97706` | 待确认 / 风险提示 |
| `danger` | `#DC2626` | 阻断 / 未验证 |
| `violet` | `#7C3AED` | 调节变量 / 导师角色 |
| 圆角 | 卡片 8px / 胶囊 999px | |
| 阴影 | 卡片 `0 1px 2px rgba(16,24,40,.04)`；弹窗 `0 16px 48px rgba(16,24,40,.18)` | |

---

## 七、关于「左侧边栏」的说明（请确认）

任务描述里提到：**「左侧边栏为用户信息与导出中心入口，属于全局组件」**；
但设计稿 18 张图中，**用户信息与「导出中心」按钮实际位于顶部导航的最右侧**（所有内页一致）。

为避免两种理解互相冲突，实现上采用了折中方案：

1. **默认还原设计稿**：用户信息 + 导出中心入口在顶部导航右侧，`AppLayout` 全局共享。
2. **同时提供可选全局侧边栏**：点击顶部导航最左侧的「☰」按钮展开 `GlobalSidebar`，其中包含
   用户信息卡（昵称 / 学科 / 认证状态 / 套餐 / 额度进度）、导出中心、项目设置、套餐与额度，
   以及项目快速切换。侧边栏与顶部导航**共用同一份全局状态**，不会出现数据不一致。

如果产品期望把用户信息与导出中心**固定**放在左侧边栏，请告知，我会把 `GlobalSidebar` 改为默认常驻、
并移除顶部导航右侧的对应入口（改动集中在 `src/components/layout.tsx`，约 20 行）。

---

## 八、其他实现说明与已知约定

1. **数据分级（L0 / L1 / L2）贯穿全局**：P10 项目设置里切到 `L2` 后，P16 上传页的「跳过逐条确认（YOLO）」会被强制禁用并置灰；`POST /analysis/import` 也会返回 `40302 DATA_LEVEL_BLOCKED` 阻断导出原始数据行。
2. **不可逆操作均有确认 + 留痕**：移除上传文件、回滚版本、切换套餐、回退假设、导出产物都会先弹通用确认框，并在文案里说明写入留痕的位置。
3. **异步任务统一走一套弹窗**：沙箱执行分析、生成结构化综述均复用 `GlobalTaskDialog`（执行中 → 完成 / 失败三态），任务状态下沉到 `useAnalysisStore.runTask`。
4. **错误态 / 空态 / 加载态齐备**：`PageSkeleton`、`EmptyState`、`ErrorState` 三个组件覆盖所有列表页；`ApiError` 携带业务错误码与 `traceId`。
5. **未验证文献的强约束**：文献综述页未验证条目不可选入已选集、不可插入引用；导出中心存在未验证条目时 `exportArtifacts` 抛 `40303` 阻断导出。
6. **构建产物目录**：`dist/` 已在 `.gitignore` 中。若你在本机重复构建遇到 Windows 文件占用（`EPERM: operation not permitted, unlink ...`），先手动删除 `dist/` 再执行 `npm run build`。

---

## 九、变更记录

### 9.1 最新一轮（账号设置 / DDL 关键词 / 变量收敛）

| 变更项 | 改动前 | 改动后 | 涉及文件 |
| --- | --- | --- | --- |
| 账号设置页 | 无 | **新增 P13 账号设置 `/account`**：基本信息（昵称/学科/年级 + 文字头像）、账号与安全（手机/教育邮箱/改密/登录设备/退出登录）、学生认证、套餐与额度、通知偏好、数据与隐私（训练集开关、导出数据、注销账号） | `src/pages/AccountSettings.tsx`（新增）、`src/router.tsx` |
| 头像入口 | 点击头像 → 项目设置 | **点击顶栏头像 → 账号设置**（带 `title`/`aria-label` 与悬停箭头）；全局侧边栏用户卡同样可点，并新增「账号设置」菜单项 | `src/components/layout.tsx` |
| 首页学生认证标签 | 问候区 + 顶栏各有一个「学生认证已核验」 | **两处已核验标签均移除**（认证状态见账号设置）；未认证时仍保留可操作的「学生认证未完成」提醒 | `src/pages/Workspace.tsx`、`src/components/layout.tsx` |
| DDL 概述关键词 | 无（节点只显示节点名） | **每个项目可选 1 个关键词**，节点显示为「关键词：节点名」，例如「短视频：开题报告」；入口是 DDL 卡头部的「概述关键词」按钮，弹出弹窗按项目单选（含「不显示」与来源说明） | `src/pages/Workspace.tsx`、`src/mocks/db.ts`、`src/types/index.ts` |
| 数据级别 | P16 与 P10 各存一份，互不同步 | **收敛为单一真源**：`useSettingsStore` + `GET /projects/:id/compliance` + `PATCH /projects/:id/data-level`；P16 改为「选草稿 → 保存定级」并显示未保存提示 | `src/store/index.ts`、`src/pages/IntroDataUpload.tsx`、`src/pages/ProjectSettings.tsx` |
| 跳过逐条确认（YOLO） | P03 / P16 各一个 `useState`，切页即重置 | **收敛为单一真源**：`useSettingsStore.skipConfirm` + `PATCH /projects/:id/skip-confirm`；P10 增加只读展示与入口说明 | 同上 + `src/pages/Literature.tsx` |
| 顶栏通知 | 2 条文案与未读数写死在组件里 | **改为接口驱动**：`GET /me/notifications` + `POST /me/notifications/read`；支持单条点击跳转、单条已读、全部已读、未读角标 | `src/components/layout.tsx`、`src/api/endpoints.ts` |
| P11 编辑器数据 | 正文 / 可插入引用 / 改写动作直接 import Mock 常量 | **并入 `GET /projects/:id/writing` 载荷**（`editorBody` / `editorCitations` / `rewriteActions`），页面不再直连 Mock | `src/pages/Writing.tsx`、`src/types/index.ts`、`src/mocks/db.ts` |
| Mock 写接口 | `PATCH` 不落库，保存后 `GET` 仍返回旧值 | **Mock 改为内存落库**（数据级别 / YOLO / DDL 关键词 / 账号资料），跨页校验与真实后端行为一致 | `src/api/endpoints.ts` |
| **新建项目跳转** | `confirmCreate()` **不调接口、不看类型**，写死 `navigate('/project/p_2001/intro')` —— 选任何类型都跳到同一个既有项目 | **真正调用 `POST /projects`**，跳转目标取服务端返回的 `entryRoute`：理论驱动 → `/intro`（研究热点）；数据驱动 → `/intro/data/upload`（上传数据）。弹窗在选中时显示落点，并显示「创建中」态 | `src/pages/Workspace.tsx`、`src/api/endpoints.ts`、`src/components/ui.tsx`、`src/mocks/db.ts` |
| 新项目初始化 | 无（不创建） | **创建时一并初始化 7 组变量**：项目实体 / 日程（5 阶段 + 4 硬节点从当天起算）/ 合规设置(L1·skipConfirm=false) / DDL 关键词（取标题主干词）/ 产物（空数组）/ 版本 v1 / 成员；产物卡补空态文案 | `src/mocks/db.ts`、`src/pages/Workspace.tsx` |
| DDL 分组数据 | `PROJECT_DDL_LIST` 是模块初始化时的**常量**，新建项目不会出现 | 改为函数 `buildProjectDdlGroups()`，调用时实时组装，新项目立即可见 | `src/mocks/db.ts`、`src/api/endpoints.ts` |

> 本轮详细的后端接入准备度核查（含逐页变量来源、仍需下沉的 7 处文案字典、10 个待补接口）见工作区根目录 `backend-readiness.md`。

### 9.2 工作台改版（前一轮）

| 变更项 | 改动前 | 改动后 | 涉及文件 |
| --- | --- | --- | --- |
| 进入项目交互 | 卡片底部「进入项目 ›」按钮 | **删除按钮，整张卡片可点击**（含键盘 `Enter` / `Space`、`role="button"`、悬停描边与手型指针） | `src/pages/Workspace.tsx` |
| 项目甘特图 | 无 | 曾新增顶部全宽甘特图，**现已彻底删除**（组件、绘图函数、批量日程接口、mock 数据全部移除，见下） | — |
| 项目流程看板 | 右栏 5 步看板（✓✓345） | **删除**；阶段信息收敛为项目卡片内的**单个**「最新进度」进度条（阶段名 + 区间 + 百分比）；原看板内的「本阶段产物摘要」独立成卡保留 | `src/pages/Workspace.tsx`、`src/mocks/db.ts` |
| 数据来源 | 阶段 / DDL 天数为手写常量，彼此矛盾 | **全部由日程派生**（`PROJECT_SCHEDULES` 为唯一真源），日期是唯一录入值 | `src/mocks/db.ts`、`src/utils/schedule.ts` |
| 接口调整 | `GET /projects/:id/kanban` | 废弃；新增 `GET /projects/:id/stage-artifacts` | `src/api/endpoints.ts`、`docs/API.md` |

### 甘特图已彻底删除（代码已不在仓库中）

迭代过程：新增单项目甘特图 → 改为全部项目总览 → 改为「时间轴起点为今天」→ 最终按要求删除。当前状态：

- `src/components/GanttChart.tsx` 已删除；
- `src/utils/schedule.ts` 中只服务于绘图的函数（`buildMonthTicks` / `barGeometry` / `percentOf` / `visibleBarGeometry` / `resolveForwardRange` / `isWithinRange` / `findCurrentPhase` / `findNearestMilestone`）已删除，保留 `toDayIndex` / `diffDays` / `daysLeftFrom` / `resolvePhaseStatus` / `resolveMilestoneStatus` / `resolveRange` / `shortDate` / `shortRange`；
- `GET /projects/schedules` 与 `PROJECT_SCHEDULE_LIST` 已删除；
- 打包验证：模块数 873 → **872**，主包同步下降（组件已不在产物中）。

> 注意：上述模块数 872 是「删除甘特图后、新增账号设置页之前」的状态；新增账号设置页后为 **873**。

**关于数据基准日**：设计稿 P01 的模拟数据自相矛盾——「开题报告 09-25 · 剩 5 天」隐含基准日 ≈ 2026-09-20；
而「数据分析为当前阶段 + 距中期检查 12 天」隐含基准日 ≈ 2026-11-03（11-15 减 12 天）。
本实现统一取 **2026-11-03** 为数据基准日（`SCHEDULE_TODAY`）并由日期派生全部状态，使三个项目卡片上设计稿原有的
「当前阶段 / 距 DDL 天数」文案全部可复现，唯一变化是「开题报告」按日期已成为已完成节点。
真实接入后端后，该字段由服务端下发为系统当天。

---

## 十、变更记录（账号设置 + DDL 跨项目 + 首页标签）

| 变更项 | 改动前 | 改动后 | 涉及文件 |
| --- | --- | --- | --- |
| 账号设置页 | 无 | **新增 `/account`**：基本信息（昵称/学科/年级，保存后顶栏立即同步）、账号与安全（手机号/教育邮箱/修改密码/登录设备/退出登录）、学生认证（状态/渠道/权益同步/宽限期/重新认证）、套餐与额度、通知偏好（核验失败为合规必开项）、数据与隐私（训练集开关默认关闭、导出我的数据、注销账号） | `src/pages/AccountSettings.tsx`（新增）、`src/router.tsx` |
| 头像入口 | 点击头像 → 项目设置 | **点击头像 → 账号设置**（`/account`）；悬停有描边与箭头提示；全局侧边栏的用户卡与新增的「账号设置」菜单项同样指向 `/account` | `src/components/layout.tsx` |
| 首页认证标签 | 问候区显示绿色「学生认证已核验」+ 顶栏右侧同款标签 | **两处都移除**（认证状态改由头像 → 账号设置查看）；未认证时仍保留「学生认证未完成」可操作提醒 | `src/pages/Workspace.tsx`、`src/components/layout.tsx` |
| DDL 倒排时间线 | 只显示「当前项目」的 4 个节点 | **合并全部 3 个项目的 12 个节点**，默认展示最近 5 条，末尾提供「查看全部 12 个节点」展开 / 「收起」；每行标注所属项目并可点击进入该项目；卡片底部展示最紧急项目的风险提示 | `src/pages/Workspace.tsx`、`src/utils/schedule.ts`、`src/api/endpoints.ts`、`src/mocks/db.ts` |
| DDL 接口 | `GET /projects/:projectId/ddl` | 改为批量 `GET /projects/ddl`（返回按项目分组的节点，排序由前端 `sortDdlRows` 统一处理）；该项目级接口已不再被页面使用 | `src/api/endpoints.ts`、`docs/API.md` |
| 账号接口 | 无 | 新增 `GET /me/account`、`PATCH /me`、`POST /me/devices/revoke-others`、`PATCH /me/notifications`、`PATCH /me/privacy`、`POST /me/data-export`、`DELETE /me` | `src/api/endpoints.ts`、`docs/API.md` |

### DDL 合并列表的排序规则（`src/utils/schedule.ts` → `sortDdlRows`）

显式规则，与动机无关，保证顺序稳定可复现：

1. **未完成（`daysLeft >= 0`）整体排在已完成（`daysLeft < 0`）之前** —— 先把「接下来要交的」给用户看；
2. 未完成组内按 `daysLeft` **升序** —— 最紧急的排最前；
3. 已完成组内按 `daysLeft` **降序** —— 最近完成的排最前；
4. 仍相同则按「项目标题 → 节点名」字典序。

默认展示条数由 `Workspace.tsx` 的 `DDL_PREVIEW_COUNT = 5` 控制。

### 账号设置页的风险约定

| 操作 | 保护方式 |
| --- | --- |
| 退出其他设备 | 二次确认，文案写明「仅保留当前设备登录，结果写入账号日志」 |
| 修改密码 | 二次确认，文案写明「其他设备登录全部失效」 |
| 允许数据用于模型改进 | 默认关闭；开启需二次确认，并说明会写入《AI 工具使用情况说明》、关闭后历史批次不可撤回 |
| 注销账号 | 独立弹窗 + **必须输入确认词「注销账号」** 才能提交；说明 30 天保留期与产物一起删除 |
| 退出登录 | 二次确认，说明退出后即锁定导出/定级/披露报告等高级功能 |

---

## 十一、后续可迭代项
- 接入真实后端后，把 `src/api/endpoints.ts` 中 `USE_MOCK` 分支的 Mock 实现替换为 `request<T>()` 即可，签名无需改动。
- 富文本编辑器目前是「所见即所得」的静态还原（P11），若要真正可编辑，建议接入 TipTap 或 Slate，并把 `saveWritingDoc` 接成 debounce 自动保存（接口已就绪）。
- 词云的力导向布局目前用 flex + 字号映射实现，若要更接近设计稿的紧凑排布可换成 `d3-cloud`。
