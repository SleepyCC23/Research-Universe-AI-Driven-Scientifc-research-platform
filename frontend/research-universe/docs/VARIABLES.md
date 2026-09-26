# 研宇宙 · 变量清单与中英命名对照表（VARIABLES.md）

> 命名规范：**全部使用英文小驼峰**（`camelCase`），与设计稿中文文案的对照见 [附录 A](#附录-a-中英命名对照表)。
> 「来源」列取值：`接口返回` / `用户输入` / `前端状态`（本地 UI 状态，不落库）。
> 重复变量（跨页面复用同一字段）已在备注中标注「**同上 X 页**」。

---

## 0. 全局变量（所有页面共享）

### 0.1 用户信息与全局状态

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `auth.loggedIn` | boolean | — | 前端状态 | 登录态 |
| `auth.token` | string \| null | — | 接口返回 | 访问令牌 |
| `user.userId` | string | — | 接口返回 | 用户 ID |
| `user.nickname` | string | "陈同学" | 接口返回 | 昵称 |
| `user.avatarText` | string | "陈" | 接口返回 | 头像文字 |
| `user.major` | string | "心理学" | 接口返回 | 学科 |
| `user.grade` | string | "研二" | 接口返回 | 年级 |
| `user.eduEmail` | string? | "chen@stu.example.edu.cn" | 接口返回 | 教育邮箱 |
| `user.hasContact` | boolean | — | 接口返回 | 是否已绑定联系方式 |
| `verification.verified` | boolean | — | 接口返回 | 学生认证已核验 |
| `verification.channel` | enum | `eduEmail` \| `chsi` \| `none` | 接口返回 | 认证渠道 |
| `verification.benefitsSynced` | boolean | — | 接口返回 | 权益已同步至定价与额度系统 |
| `verification.graceDays` | number | 90 | 接口返回 | 失效宽限期（天） |
| `plan` | enum | `student` \| `pro` \| `team` | 接口返回 | 学生版 / 专业版 / 团队版 |
| `quota.resetAt` | string | "2026-10-01 00:00" | 接口返回 | 额度过期（每月 1 日 00:00 重置） |
| `quota.reviewGenerateUsed` | number | 6 | 接口返回 | 综述生成已用 |
| `quota.reviewGenerateLimit` | number | 20 | 接口返回 | 综述生成上限 |
| `quota.verifyUsed` | number | 186 | 接口返回 | 双 Agent 核验已用 |
| `quota.verifyLimit` | number | 500 | 接口返回 | 双 Agent 核验上限 |
| `quota.sandboxMinutesUsed` | number | 74 | 接口返回 | 沙箱算力已用（分钟） |
| `quota.sandboxMinutesLimit` | number | 300 | 接口返回 | 沙箱算力上限（分钟） |
| `quota.exportUsed` | number | 5 | 接口返回 | 导出次数已用 |
| `quota.exportLimit` | number | 20 | 接口返回 | 导出次数上限 |
| `quota.overagePolicy` | enum | `throttle` \| `payAsYouGo` | 接口返回 | 超额处理方式（默认降速不中断） |
| `permissions.canExport` | boolean | — | 前端状态（由角色推导） | 可导出 |
| `permissions.canSetDataLevel` | boolean | — | 前端状态 | 可定级 |
| `permissions.canGenerateDisclosure` | boolean | — | 前端状态 | 可生成披露报告 |

### 0.2 角色与权限（P10 定义，全局生效）

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `member.role` | enum | `firstAuthor` \| `advisor` \| `collaborator` \| `guest` | 接口返回 | 第一作者 / 导师 / 协作学生 |
| `member.roleLabel` | string | 同上逐项 | 接口返回 | 角色中文名 |
| `member.permissionLabel` | string | 见下表 | 接口返回 | 权限说明 |

| 角色 | 可见范围 | 可编辑 | 可评论 / 退回 | 可导出 | 可定级 | 可生成披露报告 |
| --- | --- | --- | --- | --- | --- | --- |
| 第一作者 `firstAuthor` | 全部 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 导师 `advisor` | 产物快照 / 改动日志 / 核验状态 / 披露报告 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 协作学生 `collaborator` | 产物与核验 | ✅ | ❌ | ❌ | ❌ | ❌ |

### 0.3 数据分级（全局横切规则）

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `dataLevel` | enum | `L0` \| `L1` \| `L2` | 接口返回 | L0 公开 / L1 个人 / L2 敏感 |
| `draftDataLevel` | enum | 同上 | 前端状态 | 定级草稿（未保存） |
| `savedDataLevel` | enum | 同上 | 接口返回 | 已保存的定级 |
| `dataLevelChangeImpact` | string | 见设计稿 | 接口返回 | 改级同步影响说明 |

| 级别 | 名称 | 规则（全局生效） |
| --- | --- | --- |
| L0 | 公开 | 公开文献元数据与公开数据集 |
| L1 | 个人（当前） | 用户自有问卷 / 实验数据（已脱敏）；仅项目成员可见；默认不进入任何训练集 |
| L2 | 敏感 | 含隐私字段或未公开课题数据；强制脱敏、禁止导出原文、存储加密、访问留痕、强制禁用「跳过逐条确认」 |

**改级同步影响的行为**：`P4 数据导入拦截` · `跳过逐条确认（YOLO）禁用` · `导出阻断`。

---

## 1. P01 工作台

### 1.1 用户与问候

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `greeting` | string | "2 条文献核验条目待确认（导出中心），「社交焦虑与手机依赖」距中期检查还有 12 天。" | 接口返回 | 问候副标题 |
| `projectsMetaText` | string | "共 3 个项目 · 按最近编辑排序" | 接口返回 | 列表说明 |

### 1.2 项目实体 `Project`

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `projectId` | string | `p_2001` / `p_2002` / `p_2003` | 接口返回 | 项目 ID |
| `title` | string | 3 条见下 | 接口返回 | 项目名称 |
| `discipline` | string | "心理学" / "教育学" | 接口返回 | 学科领域 |
| `route` | enum | `dataDriven` \| `theoryDriven` | 接口返回 | 数据驱动 / 理论驱动 |
| `stage` | enum | `topic` \| `literature` \| `analysis` \| `writing` \| `submission` | 接口返回（由日程派生） | 阶段（用于路由跳转） |
| `stageLabel` | string | "选题中" / "文献综述中" / "数据分析中" / "论文写作中" / "投稿准备中" | 接口返回（由日程派生） | 阶段标签 |
| `progress` | number | 45 / 68 / 15 | 接口返回 | 最新进度百分比 |
| `currentPhaseName` | string | "数据分析" / "论文写作" / "选题" | 接口返回（由日程派生） | 当前阶段名（卡片「最新进度」左侧） |
| `currentPhaseRange` | string | "10.16‒11.05" / "09.01‒12.31" / "09.20‒11.08" | 接口返回（由日程派生） | 当前阶段区间（卡片「最新进度」右侧） |
| `lastEditedText` | string | "2 小时前编辑" / "昨天 21:14 编辑" / "3 天前编辑" | 接口返回 | 最近编辑 |
| `mainDdlName` | string | "中期检查" / "投稿截止" / "开题答辩" | 接口返回（由日程派生） | 最近 DDL 名称 |
| `mainDdlDaysLeft` | number | 12 / 86 / 5 | 接口返回（由日程派生） | 距最近 DDL 天数 |
| `footnote` | string | 见设计稿 | 接口返回 | 卡片脚注 |
| `todoCount` | number? | 3 | 接口返回 | 待办数量 |
| `verifiedCount` | number? | 28 | 接口返回 | 核验通过条数 |
| `createdAt` | string | "2026-09-01" | 接口返回 | 创建时间 |
| `dataLevel` | enum | `L0` / `L1` / `L2` | 接口返回 | 项目数据级别 |

**Mock 项目文案**（3 条）：

1. `社交焦虑与手机依赖的关系研究：一个有调节的中介模型` — 心理学 · 数据驱动 · 数据分析中 · 45% · 距中期检查 12 天
2. `短视频使用对大学生睡眠质量的影响：基于 ESM 的实证研究` — 心理学 · 数据驱动 · 论文写作中 · 68% · 距投稿 86 天
3. `导师制对研究生科研效能的影响：一项追踪研究设计` — 教育学 · 理论驱动 · 选题中 · 15% · 距开题答辩 5 天

### 1.3 项目日程（`ProjectSchedule`，派生源 · 甘特图已下线）

> 单一真源：项目卡片上的「当前阶段 / 阶段区间 / 最近 DDL」与右栏「DDL 倒排时间线」全部由日程数据派生。
> **工作台甘特图已按需求下线**，本节变量仍由服务端派生并驱动上述字段；`GET /projects/schedules` 接口保留但前端暂无调用方。

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `schedule.projectId` | string | p_2001 / p_2002 / p_2003 | 接口返回 | 项目 ID |
| `schedule.projectTitle` | string | 项目标题 | 接口返回 | 项目名 |
| `schedule.today` | string | "2026-11-03" | 接口返回 | 数据基准日 |
| `schedule.rangeStart` | string | "2026-09-01" / "2026-06-01" / "2026-09-20" | 接口返回 | 该项目时间轴起点 |
| `schedule.rangeEnd` | string | "2027-03-20" | 接口返回 | 该项目时间轴终点 |
| `schedule.phases[].name` | string | 选题 / 文献综述 / 数据分析 / 论文写作 / 投稿准备 | 接口返回 | 阶段名 |
| `schedule.phases[].startDate` | string | ISO 日期 | 接口返回 | 阶段开始日 |
| `schedule.phases[].endDate` | string | ISO 日期 | 接口返回 | 阶段结束日 |
| `schedule.phases[].progress` | number | 0 / 15 / 45 / 68 / 100 | 接口返回 | 阶段完成度 |
| `schedule.phases[].status` | enum | `done` \| `current` \| `upcoming` | 接口返回（按基准日派生） | 已完成 / 进行中 / 未开始 |
| `schedule.milestones[].name` | string | 开题报告 / 中期检查 / 投稿截止 / 毕业答辩 | 接口返回 | DDL 节点名 |
| `schedule.milestones[].date` | string | ISO 日期 | 接口返回 | 节点日期 |
| `schedule.milestones[].daysLeft` | number | 负数=已过期；12 / 42 / 86 / 137 | 接口返回（派生） | 剩余天数 |
| `schedule.milestones[].status` | enum | `done` \| `current` \| `upcoming` | 接口返回（派生） | 节点状态 |
| `schedule.tip` | string | "文献精读预计逾期 3 天，建议压缩至 20 篇精读。" | 接口返回 | 日程风险提示 |

**派生规则**（前端 `src/utils/schedule.ts` 与服务端必须一致）

| 规则 | 内容 |
| --- | --- |
| `phases[].status` | 基准日 < 开始日 → `upcoming`；基准日 > 结束日 → `done`；落在区间内 → `current` |
| `milestones[].status` | `daysLeft < 0` → `done`；`0 ≤ daysLeft ≤ 7` → `current`；其余 → `upcoming` |
| 区间压缩 | `09.21‒10.15`（`shortRange`） |
| 状态派生 | 见上方 `phases[].status` / `milestones[].status` 两行；真实环境基准日由服务端下发为系统当天 |

### 1.4 DDL 倒排时间线（`ddl`，**跨全部项目合并**）

> 已按需求改为「显示所有项目的时间点」，不再只显示当前项目：接口由 `GET /projects/:id/ddl` 改为批量 `GET /projects/ddl`，
> 前端用 `flattenDdlGroups` 拍平、`sortDdlRows` 排序，默认展示最近 5 条（`DDL_PREVIEW_COUNT`），末尾提供「查看全部 / 收起」。

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `ddlGroups[].projectId` | string | p_2001 / p_2002 / p_2003 | 接口返回 | 项目 ID |
| `ddlGroups[].projectTitle` | string | 项目全名 | 接口返回 | 项目名（行内显示短名） |
| `ddlGroups[].tip` | string? | "文献精读预计逾期 3 天，建议压缩至 20 篇精读。" | 接口返回 | 该项目日程风险提示 |
| `ddlGroups[].nodes[].name` | string | 开题报告 / 开题答辩 / 中期检查 / 投稿截止 / 毕业答辩 | 接口返回 | 节点名 |
| `ddlGroups[].nodes[].date` | string | 同年 "11-15"；跨年 "2027-03-20" | 接口返回 | 节点日期 |
| `ddlGroups[].nodes[].daysLeft` | number | 负数=已完成；5 / 12 / 42 / 68 / 86 / 132 / 137 | 接口返回 | 剩余天数 |
| `ddlGroups[].nodes[].status` | enum | `done` \| `current` \| `upcoming` | 接口返回 | 节点状态（已完成灰、≤7 天橙） |
| `ddlRows` | `DdlRow[]` | 由 `flattenDdlGroups(ddlGroups)` 派生 | 前端派生 | 合并后的行（含 projectId / projectTitle / node） |
| `ddlRows[].node.daysLeft` 排序 | number | 未完成优先 → 剩余天数升序 → 已完成按剩余天数降序 | 前端派生（`sortDdlRows`） | 列表顺序 |
| `ddlExpanded` | boolean | false（默认） | 前端状态 | 是否展开全部节点 |
| `ddlLoading` | boolean | — | 前端状态 | DDL 列表加载态 |
| `urgentRow` / `urgentTip` | `DdlRow?` / string? | 最近一个未完成节点及其所属项目的 tip | 前端派生 | 卡片底部「项目短名：风险提示」 |

**DDL 概述关键词**（本轮新增，`GET /projects/ddl-keywords` + `PATCH /projects/:id/ddl-keyword`）

> 用途：合并列表里节点名本身看不出属于哪个项目，用「关键词：节点名」的概述形式消歧，例如「短视频：开题报告」。
> 每个项目**单选 1 个**关键词，也可选「不显示」。

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `ddlKeywords[].projectId` | string | p_2001 / p_2002 / p_2003 | 接口返回 | 项目 ID |
| `ddlKeywords[].selected` | string | "社交焦虑" / "短视频" / "导师制"；空串=不显示 | 接口返回 / **用户输入** | 已选关键词 |
| `ddlKeywords[].options[].keyword` | string | 社交焦虑 / 手机依赖 / 孤独感 / 短视频 / 睡眠质量 / ESM … | 接口返回 | 候选关键词 |
| `ddlKeywords[].options[].sourceText` | string | "来自项目标题" / "来自领域研究热词" / "来自研究方法" | 接口返回 | 候选词的来源说明 |
| `keywordByProject` | `Record<string,string>` | 由 `ddlKeywords` 过滤出已选项派生 | 前端派生 | 行前缀取用 |
| `keywordDialogOpen` | boolean | false（默认） | 前端状态 | 「概述关键词」弹窗开关 |
| `keywordSavingId` | string \| null | 正在保存的项目 id | 前端状态 | 保存中提示（乐观更新 + 失败回滚） |

**列表行的展示文案（本轮更新）**

| 位置 | 内容 |
| --- | --- |
| 第一行 | 图标（已完成 ✓ 绿 / ≤7 天 ⚠ 橙 / 其余无）+ **`关键词：节点名`**（关键词为品牌蓝；未设关键词时退化为 `节点名`） |
| 第二行 | 仅**未设关键词**时显示 `项目短名`（可点击进入该项目）；已设关键词时该行隐藏，改由**整行可点**进入项目 |
| 右侧 | `节点日期`+ 副行 `ddlDaysText(daysLeft)` → `剩 N 天` / `今天到期` / `已完成` |
| 卡片副标题 | `全部 3 个项目 · 12 个节点 · 未完成优先、按剩余天数排序` |
| 卡片头部操作 | `概述关键词 (N)`（N = 已设关键词的项目数）+ `编辑节点` |
| 卡片末尾 | `查看全部 12 个节点 →` ↔ `收起，只看最近 5 个` |

### 1.5 本阶段产物摘要（`stage-artifacts`，替代原项目流程看板）

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `artifacts.currentStage` | enum | `topic` \| `literature` \| `analysis` \| `writing` \| `submission` | 接口返回（由日程派生） | 当前阶段 |
| `artifacts.currentStageLabel` | string | "数据分析中" | 接口返回（派生） | 当前阶段（卡片副标题） |
| `artifacts[].name` | string | 结构化文献综述 v3 / 数据体检报告 / 候选统计方法清单 等 | 接口返回 | 产物名 |
| `artifacts[].statusText` | string | "双 Agent 核验已通过" / "38 项指标 · 通过" / "等待你的选择" | 接口返回 | 产物状态 |
| `artifacts[].tone` | enum | `ok` \| `warn` \| `info` | 接口返回 | 状态色调 |
| `artifacts[].actionText` | string? | "去选择 →" / "去写作 →" | 接口返回 | 待办动作文案（按当前阶段跳转） |

### 1.6 前端状态

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `loading` | boolean | — | 前端状态 | 首屏加载态（骨架屏） |
| `detailLoading` | boolean | — | 前端状态 | DDL / 产物 两路并行加载态 |
| `error` | string \| null | — | 前端状态 | 错误态 |
| `selectedProject` | `Project \| undefined` | — | 前端状态（派生） | 右栏副标题「当前项目：…」 |
| `typeDialogOpen` | boolean | — | 前端状态 | 「请选择您的分析类型」弹窗 |
| `newProjectType` | enum | `dataDriven` \| `theoryDriven` | 用户输入 | 新建项目的分析类型 |
| ~~`scheduleProjectId`~~ | string | — | — | ~~甘特图项目切换~~（甘特图已下线，该状态已删除） |

---

## 2. P02 论文引言 · 研究热点

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `researchDirection` | string | "社交焦虑与手机依赖的关系" | **用户输入** | 输入你的研究方向 |
| `projectTitle` | string | "社交焦虑与手机依赖的关系研究" | 接口返回 | 项目名 |
| `gapSourceCount` | number | 3 | 接口返回 | 来自 3 篇综述原文 |
| `gaps[].text` | string | 3 条研究不足原文 | 接口返回 | 研究不足与展望 |
| `gaps[].sourceText` | string | "来源 [1] Elhai et al., 2023 · 原文第 12 页" | 接口返回 | 来源标注 |
| `feasibility[].key` | enum | `coverage` \| `dataAvailability` \| `methodComplexity` | 接口返回 | 文献覆盖度 / 数据可得性 / 方法复杂度 |
| `feasibility[].score` | number | 4.2 / 3.5 / 3.0 | 接口返回 | 评分（满分 5） |
| `feasibility[].description` | string | 见设计稿 | 接口返回 | 评分说明 |
| `feasibility[].basisText` | string | "依据：已接入文献源检索结果（2021‒2025）" | 接口返回 | 评分依据 |
| `feasibility[].insufficientData` | boolean? | — | 接口返回 | 「数据不足，未评分」 |
| `citedReviews[].title` | string | 4 篇综述标题 | 接口返回 | 高被引综述清单 |
| `citedReviews[].metaText` | string | "Elhai et al. · Journal of Affective Disorders · 2023" | 接口返回 | 作者 · 期刊 · 年份 |
| `citedReviews[].citedCount` | number | 412 / 287 / 96 / 351 | 接口返回 | 被引数 |
| `citedReviews[].doiVerified` | boolean | — | 接口返回 | DOI 已验证 |
| `trendTitle` | string | "近年社交焦虑的研究趋势" | 接口返回 | 趋势图标题 |
| `trendSeries[].name` | string | 社交焦虑 / 手机依赖 / 孤独感 | 接口返回 | 序列名 |
| `trendSeries[].points[].year` | string | 2021‒2025 | 接口返回 | X 轴年份 |
| `trendSeries[].points[].value` | number | 26‒121 | 接口返回 | Y 轴发文量 |
| `recognizedPaperCount` | number | 1284 | 接口返回 | 已确认识别文献 1,284 篇 |
| `conclusion` | string | "方向可行性中等偏上，可进入文献综述" | 接口返回 | 结论文案 |
| `activeCategory` | string | 计算机 / 心理学 / 医学·社科 / 经济学 / 人文艺术 | **前端状态**（默认「心理学」） | 数据库导航学科 Tab |
| `questionnaireChecks[].text` | string | 5 条检查项 | 接口返回 | 问卷设计检查清单 |
| `questionnaireChecks[].passed` | boolean | — | 接口返回 | ✓ 状态 |
| `datasetTotal` | number | 14 | 接口返回 | 共 14 个库 |
| `publicDatasets[].level` | enum | `L0` \| `L1` \| `L2` | 接口返回 | L0 公开 / L1 受限 |
| `publicDatasets[].accessAction` | enum | `directImport` \| `applyBySelf` | 接口返回 | 一键直连导入 / 需自行申请 |

---

## 3. P14 论文引言 · 理论驱动 · 领域研究热词

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `researchDirection` | string | "社交焦虑与手机依赖" | **用户输入**（可改） | 输入你的研究方向 |
| `discipline` | enum | 心理学 / 教育学 / 社会学 / 医学 / 管理学 / 计算机 | **用户输入** | 学科 Tab |
| `sources` | string[] | ["Web of Science", "Crossref"] | 接口返回 | 已接入文献源 |
| `rangeText` | string | "2019‒2024" | 接口返回 | 统计区间 |
| `paperCount` | number | 2847 | 接口返回 | 来源：2,847 篇已接入文献 |
| `keywords[].keyword` | string | 27 个热词 | 接口返回 | 热词云 |
| `keywords[].freq` | number | 26‒1284 | 接口返回 | 词频（映射字号） |
| `keywords[].growth` | enum | `emerging` \| `rising` \| `stable` \| `longTail` | 接口返回 | 新兴词 / 高增长词 / 稳定核心词 / 长尾词（映射颜色） |
| `topKeywords[].rank` | number | 1‒8 | 接口返回 | TOP 榜排名 |
| `topKeywords[].freq` | number | 1284 / 967 / 812 / 604 / 528 / 471 / 398 / 356 | 接口返回 | 词频 |
| `trendYears` | string[] | 2019‒2023 | 接口返回 | 热词趋势 X 轴 |
| `trendUnit` | string | "发文量（篇）" | 接口返回 | 趋势 Y 轴单位 |
| `trendSeries[].name` | string | 社交焦虑 / 手机依赖 / 孤独感 | 接口返回 | 趋势序列名 |
| `citedReviews[].citedCount` | number | 1842 / 1206 / 894 | 接口返回 | 被引数 |
| `lockedConcepts` | string[] | ["社交焦虑", "手机依赖", "孤独感"] | 接口返回 / **前端状态** | 已锁定 3 个核心概念 |

---

## 4. P15 论文引言 · 理论驱动 · 选择理论与变量

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `theories[].theoryId` | string | T1 / T2 / T3 | 接口返回 | 理论编号 |
| `theories[].name` | string | 补偿性互联网使用理论（CIUT）/ 社会替代假说 / I-PACE 交互作用模型 | 接口返回 | 理论名称 |
| `theories[].stars` | number | 1‒5 | 接口返回 | 适用度星级 |
| `theories[].explainPath` | string | "现实社交受挫 → 以线上互动补偿 → 手机使用失控。" | 接口返回 | 可解释路径 |
| `theories[].representativeRef` | string | "Kardefelt-Winther (2014), Computers in Human Behavior" | 接口返回 | 代表文献 |
| `theories[].citedCount` | number | 2412 / 1680 / 3148 | 接口返回 | 被引数 |
| `theories[].varChain` | string[] | ["sas_total","mpai_total"] 等 | 接口返回 | 变量链路 |
| `selectedTheoryId` | string | T1（默认） | **前端状态** + 接口返回 | 已选定理论 |
| `variableDrafts[].varName` | string | sas_total / mpai_total / loneliness / er_score | 接口返回 | 变量名 |
| `variableDrafts[].definition` | string | 社交焦虑总分 / 手机依赖总分 / 孤独感总分 / 情绪调节困难 | 接口返回 | 操作化定义 |
| `variableDrafts[].scaleName` | string | SAS 交往焦虑量表 / MPAI 手机成瘾指数 / UCLA 孤独量表简版 / DERS-18 简版 | 接口返回 | 候选量表 |
| `variableDrafts[].itemCount` | number | 20 / 17 / 8 / 18 | 接口返回 | 题数 |
| `variableDrafts[].role` | enum | `independent` \| `dependent` \| `mediator` \| `moderator` \| `control` \| `resultCandidate` | 接口返回 | 自变量 / 因变量 / 中介变量 / 调节变量 / 控制变量 / 结果变量候选 |
| `chatInput` | string | 自由文本 | **用户输入** | 追问输入框 |
| `switching` | boolean | — | 前端状态 | 切换理论中（重算草稿） |

---

## 5. P16 论文引言 · 数据驱动 · 上传数据

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `supportedFormats` | string[] | ["CSV","XLSX","SPSS .sav","Stata .dta"] | 接口返回 | 支持格式 |
| `maxFileSizeMb` | number | 200 | 接口返回 | 单文件 ≤ 200MB |
| `uploadedFiles[].fileName` | string | "social_anxiety_smartphone_2024.sav" / "screen_time_log_2023_2024.xlsx" | **用户输入**（拖拽 / 选择文件） | 文件名 |
| `uploadedFiles[].metaText` | string | "SPSS 数据 · 4.2 MB · 512 行 × 36 列" | 接口返回 | 文件元信息 |
| `uploadedFiles[].rows` | number | 512 | 接口返回 | 行数 |
| `uploadedFiles[].columns` | number | 36 / 12 | 接口返回 | 列数 |
| `uploadedFiles[].status` | enum | `uploaded` \| `parsed` \| `failed` | 接口返回 | 上传状态 |
| `uploadedFiles[].statusText` | string | "已上传 · 待体检" | 接口返回 | 状态文案 |
| `detectedDataLevel` | enum | `L0` \| `L1` \| `L2` | 接口返回 / **前端状态** | 数据级别（默认 L1） |
| `sensitiveDetected` | boolean | — | 接口返回 | 是否检测到敏感字段 |
| `readyFileCount` | number | 2 | 接口返回 | 已就绪：2 个文件 |
| `readyVariableCount` | number | 48 | 接口返回 | 48 个变量 |
| `skippedConfirmEnabled` | boolean | — | **前端状态** | 跳过逐条确认（YOLO）—— L2 下强制禁用 |
| `dragging` | boolean | — | 前端状态 | 拖拽悬停态 |
| `uploading` | boolean | — | 前端状态 | 上传中 |

**敏感字段场景**（前端会先本地校验再调接口）：格式不在白名单 → `41501`；超过 200MB → `41301`。

---

## 6. P17 论文引言 · 数据驱动 · 变量识别

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `health.validSampleSize` | number | 512 | 接口返回 | 有效样本量 |
| `health.variableCount` | number | 48 | 接口返回 | 变量总数 |
| `health.completeVariableCount` | number | 41 | 接口返回 | 完整无缺失变量 |
| `health.missingVariableCount` | number | 7 | 接口返回 | 含缺失变量 |
| `health.outlierCount` | number | 3 | 接口返回 | 异常值提示 |
| `health.duplicateAnswerCount` | number | 0 | 接口返回 | 重复作答 |
| `health.sourceFile` | string | "social_anxiety_smartphone_2024.sav" | 接口返回 | 体检来源文件 |
| `healthAccuracy` | number | 96 | 接口返回 | 识别准确率 96% |
| `healthReportedAt` | string | "2026-09-20 22:14" | 接口返回 | 报告时间 |
| `variables[].varName` | string | 8 个（见下） | 接口返回 | 变量名 |
| `variables[].typeLabel` | string | 连续变量 / 无序分类 / 有序分类 / 计数 / 文本 | 接口返回 | 类型 |
| `variables[].valueRange` | string | "20 ‒ 80" 等 | 接口返回 | 取值范围 |
| `variables[].missingRate` | number | 0.0 / 1.2 / 2.3 / 0.6 / 4.1 / 3.5 | 接口返回 | 缺失率 |
| `variables[].suggestedRole` | enum | `VariableRole` | 接口返回 | 建议角色 |
| `variables[].overriddenRole` | enum? | `VariableRole` | **用户输入**（下拉修正） | 修正后的角色 |
| `typeDistribution[].label` | string | 连续 / 无序 / 有序 / 计数 / 文本 | 接口返回 | 变量类型分布 |
| `typeDistribution[].count` | number | 18 / 12 / 9 / 6 / 3 | 接口返回 | 各类型数量 |
| `qualityIssues[].level` | enum | `warn` \| `info` | 接口返回 | 警示级别 |
| `qualityIssues[].needsConfirm` | boolean | — | 接口返回 | 是否需用户确认处理方式 |
| `recognizedCount` | number | 48 | 接口返回 | 已识别 48 个变量 |
| `usableCount` | number | 45 | 接口返回 | 可用 45 个 |
| `variableFilter` | enum | `all` \| `VariableRole` | **前端状态** | 变量清单筛选 Tab |

**8 个变量清单明细**：

| 变量名 | 类型 | 取值范围 | 缺失率 | 建议角色 |
| --- | --- | --- | --- | --- |
| `sas_total` | 连续变量 | 20 ‒ 80 | 0.0% | 因变量 |
| `mpai_total` | 连续变量 | 12 ‒ 60 | 0.0% | 因变量 |
| `gender` | 无序分类 | 1 ‒ 2 | 0.0% | 控制变量 |
| `grade` | 有序分类 | 1 ‒ 4 | 1.2% | 控制变量 |
| `loneliness` | 连续变量 | 8 ‒ 32 | 2.3% | 中介变量 |
| `er_score` | 连续变量 | 10 ‒ 50 | 0.6% | 中介变量 |
| `peer_support` | 连续变量 | 12 ‒ 48 | 4.1% | 调节变量 |
| `sleep_quality` | 连续变量 | 5 ‒ 25 | 3.5% | 结果变量候选 |

---

## 7. P18 论文引言 · 数据驱动 · 生成研究假设

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `sourceFile` | string | "social_anxiety_smartphone_2024.sav" | 接口返回 | 已读取的文件 |
| `variableCount` | number | 48 | 接口返回 | 已识别的 48 个变量 |
| `chatSuggestions` | string[] | ["社交焦虑 → 手机依赖", "孤独感的中介作用", "同伴支持的调节作用"] | 接口返回 | 快捷追问按钮 |
| `chatInput` | string | 自由文本 | **用户输入** | 对话输入框 |
| `hypotheses[].code` | string | H1 / H2 / H3 | 接口返回 | 假设编号 |
| `hypotheses[].title` | string | 见设计稿 | 接口返回 | 假设陈述 |
| `hypotheses[].varChain` | string[] | ["sas_total","loneliness","mpai_total"] | 接口返回 | 变量链路 |
| `hypotheses[].testMethod` | string | "Bootstrap 中介检验，5000 次重抽样…" | 接口返回 | 可检验方法 |
| `hypotheses[].basis` | string | 见设计稿 | 接口返回 | 依据 |
| `hypotheses[].status` | enum | `pending` \| `confirmed` \| `rejected` | **前端状态** + 接口返回 | 待确认 / 已确认 / 已否决 |
| `citedVariables[].varName` | string | sas_total / mpai_total / loneliness / peer_support / gender | 接口返回 | 本次假设引用的变量（5 个） |
| `citedVariables[].roleLabel` | string | 自变量 / 因变量 / 中介变量 / 调节变量 / 控制变量 | 接口返回 | 角色标签 |

> **合规**：仅引用数据中真实存在的变量与取值，不引入库外变量、不臆造字段；AI 不生成研究结论。

---

## 8. P03 文献综述

### 8.1 检索与筛选

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `resultTotal` | number | 128 | 接口返回 | 共 128 条结果 |
| `sortBy` | string | "相关度" | 接口返回 | 按相关度排序 |
| `activeFilter.quartile` | string | Q1 及以上 / Q2 及以上 / 不限 | **用户输入** | 期刊等级 |
| `activeFilter.discipline` | string | 心理学 / 社会学 / 教育学 / 医学 | **用户输入** | 学科 |
| `activeFilter.year` | string | 近 5 年 / 近 10 年 / 不限 | **用户输入** | 年份 |
| `activeFilter.query` | string | 自然语言 | **用户输入** | 语义检索输入 |
| `languageWarning` | string | "中文文献库尚未接入，本结果以英文文献为主（中文占比 6%）…" | 接口返回 | 语言提示 |

### 8.2 文献条目 `Paper`

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `paperId` | string | pp1‒pp4 | 接口返回 | 文献 ID |
| `title` | string | 4 条见设计稿 | 接口返回 | 标题 |
| `authors` | string | "Liu et al." / "Zhang & Wang" / "陈等" | 接口返回 | 作者 |
| `journal` | string | Computers in Human Behavior 等 | 接口返回 | 期刊 |
| `year` | number | 2021‒2024 | 接口返回 | 年份 |
| `quartile` | string | Q1 / Q2 / CSSCI / 未经同行评审 | 接口返回 | 期刊等级 |
| `doi` | string? | "10.1016/j.chb.2024.108043" | 接口返回 | DOI |
| `doiStatus` | enum | `verified` \| `unverified` \| `suspicious` | 接口返回 | DOI 已验证 / 未验证 |
| `abstractText` | string | 见设计稿 | 接口返回 | 摘要 |
| `matchReason` | string | "匹配理由：…（相关度 0.92）" | 接口返回 | 匹配理由 |
| `relevanceScore` | number | 0.92 / 0.89 / 0.84 / 0.71 | 接口返回 | 相关度分数 |
| `citable` | boolean | false（预印本） | 接口返回 | 是否可进入参考文献区 |

### 8.3 已选文献集与核验

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `selectedCount` | number | 12 | 接口返回 | 已选文献集 12 篇 |
| `minRequired` | number | 5 | 接口返回 | 已满足 ≥5 篇 |
| `selectionNote` | string | "选题方向内 12 篇，含 1 篇未验证条目（不计入综述引用）" | 接口返回 | 已选说明 |
| `verify.status` | enum | `running` 等 | 接口返回 | 异步执行中 |
| `verify.agentAlpha.accuracy` | number | 96 | 接口返回 | Agent-α 内容一致性 96% |
| `verify.agentBeta.accuracy` | number | 99 | 接口返回 | Agent-β DOI 真实性 99% |
| `verify.passedCount` | number | 26 | 接口返回 | 通过 26 |
| `verify.suspiciousCount` | number | 2 | 接口返回 | 存疑 2 |
| `verify.failedCount` | number | 1 | 接口返回 | 失败 1 |
| `verify.blockExport` | boolean | true | 接口返回 | 1 条核验失败将阻断导出 |
| `kbDocCount` | number | 34 | 接口返回 | 库内 34 篇 |
| `kbQa.question` | string | "孤独感在社交焦虑与手机依赖间的中介效应有多稳定？" | **用户输入** / 接口返回 | 知识库问答提问 |
| `kbQa.answer` | string | 见设计稿 | 接口返回 | 回答 |
| `kbQa.citations` | string[] | ["[2]","[7]","[12]"] | 接口返回 | 引用回溯 |
| `verifiedClaimCount` | number | 26 | 接口返回 | 26 条论断已通过双 Agent 核验 |
| `skippedConfirmEnabled` | boolean | — | **前端状态** | 跳过逐条确认（YOLO） |

---

## 9. P04 数据分析

### 9.1 步骤与数据版本

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `steps[].key` | enum | `import` \| `healthCheck` \| `method` \| `result` | 接口返回 | 数据导入 / 数据体检 / 方法选择 / 分析结果 |
| `steps[].status` | enum | `done` \| `current` \| `upcoming` | 接口返回 | ✓ / 当前步骤 / 未开始 |
| `dataVersion.version` | string | "v2" | 接口返回 | 数据版本 v2 |
| `dataVersion.rows` | number | 350 | 接口返回 | 350 行 |
| `dataVersion.columns` | number | 42 | 接口返回 | 42 列 |
| `dataVersion.dataLevel` | enum | L1 | 接口返回 | L1 个人数据 |

### 9.2 统计方法候选 `StatMethod`

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `methodId` | string | m_hier_boot / m_sem / m_process7 | 接口返回 | 方法 ID |
| `name` | string | 分层回归 + Bootstrap 中介 / 结构方程模型 SEM / PROCESS Model 7 | 接口返回 | 方法名 |
| `recommended` | boolean | true 仅第一条 | 接口返回 | AI 推荐（仅提示，不作默认选项） |
| `prerequisites` | string | "连续变量；N ≥ 200；…" | 接口返回 | 适用前提 |
| `pros` / `cons` | string | 见设计稿 | 接口返回 | 优点 / 缺点 |
| `robustnessImpact` | string | "中等敏感：样本量不足时区间偏宽" | 接口返回 | 对结论稳健性的影响 |
| `checklist` | string | "VIF < 5 · 正态性（偏度/峭度）· …" | 接口返回 | 前提假设检验清单 |
| `selectedMethodId` | string \| null | `methodId` | **前端状态** | 已选方法（初始为 null） |

### 9.3 选择留痕与体检

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `selectionTrail.operatorName` | string | "陈同学" | 接口返回 | 选择留痕：选择人 |
| `selectionTrail.operatedAt` | string | "2026-09-21 09:02" | 接口返回 | 选择时间 |
| `selectionTrail.candidateCount` | number | 3 | 接口返回 | 备选项 3 |
| `selectionTrail.unselectedCount` | number | 2 | 接口返回 | 未选 2 |
| `healthReport.accuracy` | number | 96 | 接口返回 | 识别准确率 96% |
| `healthReport.metrics[].value` | string | "350" / "42" / "1.8%" / "7" | 接口返回 | 样本量 / 变量数 / 缺失率 / 异常值提示 |
| `healthNotes[].tone` | enum | `danger` \| `warn` \| `info` | 接口返回 | 提示级别 |
| `sensitiveWarning` | string | "识别到 3 个可能的敏感字段（联系方式、学号、出生日期）…" | 接口返回 | 敏感字段提示 |

### 9.4 异步执行与结果

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `renameTarget.taskName` | string | 自由文本 | **用户输入** | 任务名称 / 请输入名称 |
| `renameTarget.analysisType` | string | 数据驱动 / 理论驱动 | **用户输入** | 分析类型 |
| `runTask.taskId` | string | "a7f3-20260921-0912" | 接口返回 | run_id |
| `runTask.status` | enum | `idle`\|`pending`\|`running`\|`succeeded`\|`failed` | 接口返回 | 任务状态 |
| `runTask.progress` | number | 0‒100 | 接口返回 | 进度 |
| `runTask.etaSeconds` | number | 25 | 接口返回 | 预计需要 10‒30 秒 |
| `run.effects[].label` | string | 总效应 c / a / b / 间接效应 a×b / 直接效应 c′ / 调节效应 | 接口返回 | 效应名称 |
| `run.effects[].value` | string | "0.412" 等 | 接口返回 | 估计值 |
| `run.effects[].ci` | string | "95% CI [0.301, 0.523]" | 接口返回 | 置信区间 |
| `robustness[].name` | string | SEM 对比分层回归 / PROCESS Model 7 对比 / 剔除测谎题异常样本（n=14） | 接口返回 | 稳健性检验项 |
| `robustness[].statusText` | string | 结论未翻转 / 待执行 | 接口返回 | 检验结论 |
| `robustness[].flipped` | boolean \| null | — | 接口返回 | 结论是否翻转 |
| `robustness[].pending` | boolean? | — | 接口返回 | 待执行 |
| `missingBars[].varName` | string | q3_rev / duration / sleep_1 / phone_3 / anx_12 / lonely_4 | 接口返回 | 缺失值分布变量 |
| `missingBars[].missingRate` | number | 1.4‒7.4 | 接口返回 | 缺失率 |

> **注意**：`recalcNeeded`（P17 修改变量角色）会触发方法清单重算；`robustness` 中任一 `flipped=true` 时需**阻断「结论确定」表述**。

---

## 10. P05 / P11 论文写作

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `mode` | enum | `aiFull` \| `aiAssist` | **前端状态**（可随时切换） | AI 全文生成 / AI 辅助撰写 |
| `title` | string | "社交焦虑与手机依赖：孤独感的中介作用与性别的调节效应" | 接口返回 | 论文标题 |
| `currentSection` | string | "2.1 孤独感中介研究" | 接口返回 | 当前章节（已自动保存） |
| `autoSavedAt` | string | "09:12" | 接口返回 / **前端状态** | 已自动保存 |
| `outline[].title` | string | 1 引言 / 1.1 研究背景 / 1.2 研究空白 / 2 文献综述 / 2.1 孤独感中介研究 / 3 研究方法 / 4 结果 / 5 讨论与结论 | 接口返回 | 写作大纲 |
| `outline[].citeCount` | number? | 12 / 8 / 14 / 6 / 5 | 接口返回 | 引用 N |
| `outline[].flag` | enum? | `missingCitation` \| `boundArtifact` | 接口返回 | 缺对应文献 / 绑定分析产物 |
| `outline[].level` | number | 1 / 2 | 接口返回 | 大纲层级 |
| `stats.wordCount` | number | 4820 | 接口返回 | 字数 4,820 |
| `stats.paragraphCount` | number | 18 | 接口返回 | 段落 18 |
| `stats.citationCount` | number | 31 | 接口返回 | 引用 31 条 |
| `stats.aiLabelEnabled` | boolean | true | 接口返回 | AI 标识已开启 |
| `stats.lastEditedAt` | string | "09:12" | 接口返回 | 最后编辑 |
| `paragraphs[].kind` | enum | `normal` \| `boundMethod` \| `heading` | 接口返回 | 方法章节绑定产物、不可修改 |
| `paragraphs[].aiGenerated` | boolean | — | 接口返回 | AI 溯源标识 |
| `paragraphs[].traceLabel` | string? | "AI" | 接口返回 | AI 标识文案 |
| `citations[].apaText` | string | APA 7 格式 | 接口返回 | 引用引擎 APA 7 |
| `citations[].gbText` | string | GB/T 7714 格式 | 接口返回 | 引用引擎 GB/T 7714 |
| `citationStyle` | enum | `APA7` \| `GBT7714` | **前端状态** | 引用样式 |
| `inTextStyle` | string | "上标数字" | 接口返回 | 文内引用 |
| `targetJournal.name` | string | 心理科学进展 / 心理学报 | 接口返回 | 目标期刊 |
| `aiPolicyReminder.text` | string | "要求披露 AI 使用范围，禁止 AIGC 直出结论" | 接口返回 | 目标期刊 AI 政策提醒 |
| `aiPolicyReminder.syncedAt` | string | "2026-09-19" | 接口返回 | 最近同步 |
| `zotero.bound` | boolean | true | 接口返回 | Zotero 联动已绑定 |
| `zotero.account` | string | "chen@example.edu" | 接口返回 | OAuth 账号 |
| `zotero.bidirectionalSync` | boolean | true | **前端状态** + 接口返回 | 双向同步开关 |
| `zotero.rateLimitText` | string | "写入 ≤ 50 条/请求；遇 Retry-After 自动退避…" | 接口返回 | 限速与退避 |
| `zotero.fallbackText` | string | "免授权兜底：导入 / 导出 .bib（Better BibTeX）" | 接口返回 | 免授权兜底 |
| `kbDocs[].title` / `metaText` | string | 4 条已核验文献 | 接口返回 | 知识库文献（可插入） |
| `aiSuggestions[].text` | string | 3 条建议 | 接口返回 | AI 辅助建议 |
| `aiSuggestions[].adopted` | boolean | — | **前端状态** | 采纳 / 已采纳 |
| `rewriteAction` | enum | `rewrite` \| `shorten` \| `expand` \| `academic` | **用户输入** | 重写 / 缩写 / 扩写 / 学术化改写 |
| `editor.journalFormat` | string | "《心理学报》· GB/T 7714-2015" | 接口返回 | 期刊投稿格式 |
| `editor.fontName` | string | 思源宋体 | **前端状态** | 字体 |
| `editor.fontSizeLabel` | string | 小四 | **前端状态** | 字号 |
| `editor.lineHeightLabel` | string | 1.5 倍行距 | **前端状态** | 行距 |
| `editor.pageCount` | number | 3 | 接口返回 | 页数 |
| `editor.zoom` | number | 100（60‒160） | **前端状态** | 缩放 |

---

## 11. P06 选刊 AI

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `title` | string | 同 P05 | 接口返回 | 稿件标题 |
| `abstractText` | string | "基于 350 名大学生的问卷调查…" | 接口返回 | 稿件摘要 |
| `keywords` | string[] | 社交焦虑 / 手机依赖 / 孤独感 / 中介效应 / 分层回归 + Bootstrap | 接口返回 | 关键词 |
| `matches[].name` | string | 5 本期刊 | 接口返回 | 推荐期刊 |
| `matches[].indexText` | string | "JCR Q1 · 中科院 1 区 · IF 8.9 · Elsevier" | 接口返回 | 分区 / 影响因子 |
| `matches[].matchScore` | number | 94 / 87 / 81 / 76 / 72 | 接口返回 | 匹配度 |
| `matches[].matchReason` | string | 见设计稿 | 接口返回 | 匹配理由 |
| `profile.partition` | string | "JCR Q1 · 中科院 1 区 · IF 8.9" | 接口返回 | 分区 / 影响因子 |
| `profile.reviewCycle` | string | "8-12 周" | 接口返回 | 审稿周期 |
| `profile.acceptanceRate` | string | "18%" | 接口返回 | 录用率 |
| `profile.apc` | string | "USD 3,500（订阅模式可选免收）" | 接口返回 | 版面费 |
| `profile.databases` | string | "SSCI · Scopus · EI" | 接口返回 | 收录库 |
| `profile.formatRequirement` | string | "≤ 12,000 词 · APA 7" | 接口返回 | 格式与字数 |
| `profile.aiPolicy.level` | string | "允许有限使用" | 接口返回 | 该刊 AI 使用政策 |
| `profile.aiPolicy.forbids` | string | "禁止 AIGC 直接生成结论与数据解释" | 接口返回 | AI 政策禁止项 |
| `submissionChecks[].passed` | boolean | 5 true / 1 false | 接口返回 | 投稿前检查清单 5/6 完成 |
| `completedChecks` / `totalChecks` | number | 5 / 6 | 接口返回 | 5/6 完成 |
| `disclaimer` | string | "本页仅提供投稿决策辅助，不得输出「保证录用 / 大概率必中」类承诺…" | 接口返回 | 免责声明 |
| `dataUpdatedAt` | string | "2026-08-20" | 接口返回 | 画像数据更新时间 |

---

## 12. P07 模拟评审

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `reviewTarget` | string | 论文标题 | 接口返回 | 评审对象 |
| `targetJournal` | string | Computers in Human Behavior | 接口返回 | 目标期刊 |
| `field` | string | 社会心理学 | 接口返回 | 领域 |
| `calibration.paperCount` | number | 48 | 接口返回 | 已学习同领域顶刊论文 48 篇 |
| `calibration.corpusCount` | number | 312 | 接口返回 | 真实审稿意见语料 312 条 |
| `calibration.calibratedAt` | string | "09:05" | 接口返回 / **前端状态** | 校准完成时间 |
| `issues[].code` | string | H1 / H2 / D1 / D2 / S1 / S2 | 接口返回 | 意见编号 |
| `issues[].type` | enum | `hard` \| `dispute` \| `style` | 接口返回 | 硬伤 / 争议点 / 风格建议 |
| `issues[].confidence` | enum | `high` \| `medium` \| `low` | 接口返回 | 置信度高 / 中 / 低 |
| `issues[].description` | string | 见设计稿 | 接口返回 | 意见内容 |
| `issues[].frequencyText` | string | "出现频率：同类意见在顶刊审稿中出现 47%" | 接口返回 | 出现频率 |
| `issues[].handled` | enum | `none` \| `accepted` \| `disputed` \| `ignored` | **前端状态** + 接口返回 | 接受建议并修改 / 标记争议 / 忽略 |
| `issues[].replyable` | boolean | H1/H2/D1 为 true | 接口返回 | 是否可生成回复 |
| `revisionPaths[].text` | string | H1 / H2 修改路径 | 接口返回 | 修改建议 |
| `rebuttals[].steps` | string[] | 3 步回应链路 | 接口返回 | Rebuttal 辅助 |
| `summary.accepted` / `disputed` / `ignored` | number | 3 / 2 / 1 | **前端状态**（实时统计） | 修改摘要：已采纳 / 标记争议 / 忽略 |

---

## 13. P08 导出中心

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `artifactCount` | number | 6 | 接口返回 | 共 6 项 · 均带不可移除溯源标识 |
| `artifacts[].name` | string | 结构化文献综述 v3 / 数据体检报告 / 分析结果包（含稳健性检验）/ 论文初稿 v1 / 可复现代码包（Python / R）/ 投稿包（含封面与声明附件） | 接口返回 | 产物名 |
| `artifacts[].metaText` | string | "2026-09-21 09:05 · 128 KB · 双 Agent 核验已通过" | 接口返回 | 时间 · 大小 · 说明 |
| `artifacts[].formats` | string[] | ["md","docx","PDF"] / ["zip"] | 接口返回 | 导出格式 |
| `artifacts[].status` | enum | `ready` \| `pending` | 接口返回 | 就绪 / 待补齐 |
| `artifacts[].blocked` | boolean? | true（投稿包） | 接口返回 | 待补齐（阻断导出） |
| `selectedArtifactIds` | string[] | — | **前端状态** | 勾选的产物 |
| `selectedFormats[artifactId]` | string | md / docx / PDF / zip | **前端状态** | 每个产物选定的格式 |
| `disclosure.items[].text` | string | 6 项披露内容 | 接口返回 | AI 使用情况说明清单 |
| `disclosure.items[].done` | boolean | — | 接口返回 | ✓ 状态 |
| `disclosure.unreviewedCount` | number | 14 | 接口返回 | 自动处置条目未复核数量（当前 14 条） |
| `disclosure.lastGeneratedAt` | string | "2026-09-21 09:20" | 接口返回 / **前端状态** | 最近生成 |
| `risk.hasUnverified` | boolean | true | 接口返回 | 存在无法验证的风险 |
| `risk.unverifiedCount` | number | 1 | 接口返回 | 存在 1 条参考文献无法验证 |
| `compliance[].key` | enum | `redItems` \| `unverified` \| `aiLabel` | 接口返回 | 红色核验条目 / 未验证文献 / AI 标识完整性 |
| `compliance[].value` | string | "1" / "0" / "100%" | 接口返回 | 指标值 |
| `unverifiedConfirmed` | boolean | — | **前端状态** | 我已确认，允许导出 |

---

## 14. P09 定价

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `plans[].planId` | enum | `student` \| `pro` \| `team` | 接口返回 | 学生版 / 专业版 / 团队版 |
| `plans[].subtitle` | string | "已认证专享" / "适合硕士 / 青年科研人员" / "课题组 / 实验室" | 接口返回 | 套餐副标题 |
| `plans[].price` | number | 19 / 49 / 129 | 接口返回 | 价格 |
| `plans[].priceUnit` | enum | `month` \| `monthPerMember` | 接口返回 | / 月 或 / 月 / 成员 |
| `plans[].highlights` | string[] | 每档 4 条权益 | 接口返回 | 权益清单 |
| `plans[].mostPopular` | boolean? | true（专业版） | 接口返回 | 最受欢迎 |
| `quotaItems[].label` | string | 文献检索次数 / 综述生成 / 双 Agent 核验 / 沙箱算力 / 导出次数 | 接口返回 | 额度项 |
| `quotaItems[].student` / `.pro` / `.team` | string | 见 API.md §4.1 表 | 接口返回 | 各档额度 |
| `overagePolicy` 文案 | string | 3 条超额处理说明 | 接口返回 | 超额处理方式 |

---

## 15. P10 项目设置

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `title` | string | "社交焦虑与手机依赖的关系研究" | **用户输入**（可编辑） | 项目名称 |
| `metaText` | string | "心理学 · 数据驱动 · 创建于 2026-09-01" | 接口返回 | 项目副信息 |
| `discipline` | string | 心理学 / 教育学 / 社会学 / 医学 / 管理学 / 计算机 | **用户输入** | 学科领域 |
| `routeText` | string | "数据驱动（默认统计方法与文献源已按学科预设）" | **用户输入** | 驱动路线 |
| `ddlNodes[].name` / `.date` | string | 开题 09-25 / 中期 11-15 / 投稿 12-15 / 答辩 2027-03-20 | **用户输入**（可编辑） | DDL 硬节点 |
| `members[].name` | string | 陈同学 / 王导师 / 李同门 | 接口返回 | 成员 |
| `members[].roleLabel` | string | 第一作者 / 导师 / 协作学生 | 接口返回 | 角色 |
| `members[].permissionLabel` | string | 见 §0.2 权限表 | 接口返回 | 权限 |
| `versions[].versionNo` | string | v18 / v17 / v16 / v15 | 接口返回 | 版本号 |
| `versions[].operatorName` | string | 陈同学 / 王导师 | 接口返回 | 操作人 |
| `versions[].operatedAt` | string | "09-21 09:12" 等 | 接口返回 | 操作时间 |
| `versions[].description` | string | 见设计稿 | 接口返回 | 变更说明 |
| `versions[].rollbackable` | boolean | true | 接口返回 | 是否可回滚 |
| `versionPolicyText` | string | "保留最近 1 个月版本" | 接口返回 | 版本保留策略 |
| `inviteDialogOpen` | boolean | — | **前端状态** | 邀请成员弹窗 |
| `inviteAccount` / `inviteRole` | string | 自由文本 / 协作学生·导师·第一作者 | **用户输入** | 邀请表单 |

---

## 16. P12 登录 / 注册 + 学生认证

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `account` | string | 手机号或邮箱 | **用户输入** | 手机号或邮箱 |
| `codes[0..5]` | string[6] | 每位 0-9 | **用户输入** | 6 位验证码输入框 |
| `cooldown` | number | 52 → 0 | **前端状态** | "52s 后重发" |
| `eduEmail` | string | "chen@stu.example.edu.cn"（需匹配 `\.edu(\.cn)?$`） | **用户输入** | 教育邮箱 |
| `errorText` | string | — | **前端状态** | 表单错误提示 |
| `brandPoints` | string[] | 3 条品牌承诺 | 接口返回（或静态） | 引用可溯源 / 分析可复现 / 过程可交代 |
| `loginConsentText` | string | "登录即表示同意《用户协议》与《学术诚信使用规范》" | 静态 | 用户协议提示 |

---

## 17. P13 账号设置（`/account`，本轮新增）

> 入口：顶部导航右侧**头像**（点击即进）、全局侧边栏的用户信息卡、侧边栏「账号设置」菜单项。三处共用同一份状态。
> 与 P10「项目设置」的分工：本页管**账号级**（资料 / 安全 / 认证 / 套餐额度 / 通知 / 隐私），P10 管**项目级**（项目信息 / 成员 / 版本 / 数据定级）。

### 17.1 基本资料（`AccountSettings`）

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `userId` | string | "u_1001" | 接口返回 | 用户 ID |
| `nickname` | string | "陈同学"（≤16 字） | **用户输入** | 昵称 |
| `avatarText` | string | "陈"（自动取昵称首字） | 接口返回 / 派生 | 文字头像 |
| `major` | string | 心理学 / 教育学 / 社会学 / 医学 / 管理学 / 计算机 | **用户输入** | 学科 |
| `grade` | string | 大一 ~ 大四 / 研一 ~ 研三 / 博士 | **用户输入** | 年级 |
| `majorOptions` / `gradeOptions` | string[] | 同上逐项 | 接口返回 | 下拉可选项 |
| `registeredAt` | string | "2026-09-01 09:30" | 接口返回 | 注册时间 |
| `dirty` | boolean | 昵称/学科/年级与初始值不一致 | **前端状态（派生）** | 「保存修改」是否可点 + 未保存提醒 |
| `saving` | boolean | — | **前端状态** | 保存中（按钮 loading） |

> 保存成功后会调用全局 `setUser`，**顶部导航的昵称与文字头像立即同步**。

### 17.2 账号与安全

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `phoneMasked` | string | "138****0000" | 接口返回 | 手机号（已脱敏） |
| `eduEmail` | string? | "chen@stu.example.edu.cn" | 接口返回 | 教育邮箱 |
| `hasContact` | boolean | — | 接口返回 | 是否已绑定联系方式 |
| `devices[].deviceId` | string | dev_1 / dev_2 / dev_3 | 接口返回 | 设备 ID |
| `devices[].deviceName` | string | "Chrome · Windows" / "Safari · iPhone" / "Edge · Windows" | 接口返回 | 设备与浏览器 |
| `devices[].locationText` | string | "116.25.***.12 · 深圳" | 接口返回 | 登录位置（已脱敏） |
| `devices[].lastActiveAt` | string | "2026-09-24 20:58" | 接口返回 | 最近活跃 |
| `devices[].current` | boolean | 当前设备为 true（不可被退出） | 接口返回 | 「当前设备」标签 |

### 17.3 学生认证

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `verification.verified` | boolean | — | 接口返回 | 已核验 / 未核验 |
| `verification.channel` | enum | `eduEmail` \| `chsi` \| `none` | 接口返回 | 渠道：教育邮箱 / 学信网 |
| `verification.eduEmail` | string? | — | 接口返回 | 认证邮箱 |
| `verification.verifiedAt` | string? | "2026-09-01 10:12" | 接口返回 | 认证时间 |
| `verification.benefitsSynced` | boolean | — | 接口返回 | 权益已同步 / 权益待同步 |
| `verification.graceDays` | number | 90 | 接口返回 | 失效宽限期 |

### 17.4 套餐与额度 / 通知偏好 / 数据与隐私

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `planId` | enum | `student` \| `pro` \| `team` | 接口返回 | 学生版 / 专业版 / 团队版 |
| `quota.verifyUsed/Limit` | number | 186 / 500 | 接口返回 | 双 Agent 核验 |
| `quota.sandboxMinutesUsed/Limit` | number | 74 / 300 | 接口返回 | 沙箱算力（分钟） |
| `quota.reviewGenerateUsed/Limit` | number | 6 / 20 | 接口返回 | 综述生成 |
| `quota.exportUsed/Limit` | number | 5 / 20 | 接口返回 | 导出次数 |
| `quota.resetAt` | string | "2026-10-01 00:00" | 接口返回 | 重置时间 |
| `notifications[].key` | enum | `verifyFailed` \| `ddlReminder` \| `taskDone` \| `weeklyReport` \| `productUpdate` | 接口返回 | 通知项标识 |
| `notifications[].label` | string | 核验失败提醒 / DDL 临近提醒 / 异步任务完成提醒 / 每周进度简报 / 产品与政策更新 | 接口返回 | 通知项名称 |
| `notifications[].enabled` | boolean | 默认 true（`weeklyReport` 为 false） | **用户输入** | 开关状态（乐观更新，失败回滚） |
| `notifications[].mandatory` | boolean? | `verifyFailed` 为 true | 接口返回 | 「必开」标签（Toggle 置灰） |
| `privacy.allowTraining` | boolean | 默认 **false** | **用户输入** | 允许数据用于模型改进 |
| `privacy.keepHistoryDays` | number | 30 | 接口返回 | 版本与日志保留 |
| `privacy.exportRequestedAt` | string? | undefined → 申请后填时间 | 接口返回 | 最近导出申请 |

### 17.5 注销账号弹窗（独立 `Modal`）

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `deleteOpen` | boolean | — | **前端状态** | 弹窗开关（遮罩不可点关闭） |
| `deleteConfirmText` | string | 必须严格等于 `DELETE_CONFIRM_TEXT` | **用户输入** | 确认词输入框 |
| `DELETE_CONFIRM_TEXT` | string | "注销账号" | 常量 | 确认词 |
| `deleting` | boolean | — | **前端状态** | 「确认注销」按钮 loading |

---

## 18. 弹窗变量（独立 UI 组件）

| 弹窗 | 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- | --- |
| 确认操作 | `confirmDialog.title` | string | "确认操作" | 前端状态 | 确认操作 |
| 确认操作 | `confirmDialog.description` | string | "请确认是否执行该操作，操作后结果将写入留痕并进入分析流程。" | 前端状态 | 正文 |
| 确认操作 | `confirmDialog.confirmText` / `cancelText` | string | 确认 / 取消 | 前端状态 | 按钮 |
| 注意 | `confirmDialog.tone` | enum | `info` \| `warn` | 前端状态 | 图标色调 |
| 注意 | `title` / `description` | string | "注意" / "检测到 7 个异常值提示，建议在分析前剔除或做敏感性分析。" | 前端状态 | 单一「确定」按钮 |
| 重命名分析任务 | `renameTarget.taskName` | string | 自由文本 | **用户输入** | 任务名称 / 请输入名称 |
| 重命名分析任务 | `renameTarget.analysisType` | string | 数据驱动 / 理论驱动 | **用户输入** | 分析类型 |
| 正在执行分析（沙箱） | `taskDialog.phase` | enum | `running` \| `succeeded` \| `failed` | 前端状态 | 三态 |
| 正在执行分析（沙箱） | `taskDialog.title` / `description` / `progress` | string / string / number | "正在执行分析（沙箱）…" / "预计需要 10‒30 秒，请稍候" | 前端状态 | 加载态 |
| 分析完成 | `taskDialog.title` / `actionText` | string | "分析完成" / "查看结果" | 前端状态 | 成功态 |
| 请选择您的分析类型 | `newProjectType` | enum | `dataDriven` \| `theoryDriven` | **用户输入** | 数据驱动（已有数据，没有思路）/ 理论驱动（已有分析思路 / 正在思考） |
| 邀请成员 | `inviteAccount` / `inviteRole` | string | 自由文本 / 协作学生·导师·第一作者 | **用户输入** | 邀请表单 |
| Toast | `toast.tone` | enum | `info` \| `ok` \| `warn` \| `danger` | 前端状态 | 提示级别 |
| Toast | `toast.title` / `description` | string | — | 前端状态 | 提示标题 / 描述 |

---

## 18. P05 / P11 论文写作 · 变量核对（本轮补齐）

> 核对基准：设计稿「AI 全文生成」与「AI 辅助撰写」两张界面图。逐项确认**是否已由接口载荷驱动**，缺的已补齐。

### 18.0 模式 ↔ 视图映射（本轮修正）

设计稿里两种模式是**两套界面**，不是同一套界面的高亮切换。此前本工程把它们做成了两个独立路由、切换只换高亮，导致「切了模式但界面没变」。

| 模式 | 视图（路由） | 界面特征 | 主要变量来源 |
| --- | --- | --- | --- |
| `aiFull` AI 全文生成 | `/project/:id/writing` | 左列写作大纲（含引用计数与「缺对应文献」标记）+ 正文（可按节重新生成）+ 段落操作（重写/缩写/扩写/学术化）+ 完成初稿进入选刊；右列引用引擎（CSL）/ 目标期刊 AI 政策 / Zotero 联动 | 同一份 `GET /projects/:id/writing` 载荷 |
| `aiAssist` AI 辅助撰写 | `/project/:id/writing/editor` | 期刊投稿格式条 + 格式工具栏（字体/字号/行距 + B I U ≡ A H1 H2 + 插入引用/表格/图表/公式）+ 纸张正文 + 右列知识库文献（可插入）/ 引用与格式 / AI 辅助建议 | 同一份载荷 + `editorBody` / `editorCitations` / `rewriteActions` |

**规则**：切换模式即切换到对应视图；两个视图共用同一份文档与同一份 `useWritingStore.mode`（不会出现「高亮是 A、界面是 B」）。
`WritingPageData.mode` 语义为**默认视图**：服务端返回 `aiAssist` 时，进入 `/writing` 会自动重定向到辅助撰写视图。

### 18.1 顶部与状态条

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `mode` | enum | `aiFull` \| `aiAssist` | 前端状态（本地切换） | AI 全文生成 / AI 辅助撰写 |
| `autoSavedAt` | string | "11:24" | 接口返回 / 保存后更新 | 已自动保存 HH:MM |
| `stats.unsavedChanges` | number | 0 | **接口返回（本轮新增）** | 尚未保存的修改 N（>0 时标橙） |
| `checklist` | object | 见 18.4 | 接口返回 | 生成投稿检查清单（按钮 + 展开结果） |

### 18.2 投稿格式条与工具栏

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `editor.journalFormat` | string | "《心理学报》· GB/T 7714-2015" | 接口返回 | 期刊投稿格式（当前值） |
| `editor.journalFormatOptions` | string[] | 见下 | **接口返回（本轮新增）** | 下拉可选项 |
| `editor.inTextLabel` | string | "上标数字" | 接口返回 | 文内引用：上标数字 |
| `stats.citationCount` | number | **47**（对齐设计稿） | 接口返回 | 参考文献 47 条 |
| `stats.wordCount` | number | **2,148**（对齐设计稿） | 接口返回 | 字数 2,148 |
| `editor.pageCount` | number | 3 | 接口返回 | 页数 3 |
| `zoom` | number | 100（60‒160） | 前端状态 | 缩放 100% |
| `editor.fontName` | string | "思源宋体" | 接口返回 | 字体下拉 |
| `editor.fontSizeLabel` | string | "小四" | 接口返回 | 字号下拉 |
| `editor.lineHeightLabel` | string | "1.5 倍行距" | 接口返回 | 行距下拉 |
| 格式按钮 B / I / U / ≡ / A / H1 / H2 | string[] | 固定枚举 | 前端常量 | 加粗 / 斜体 / 下划线 / 对齐 / 字体色 / 一级标题 / 二级标题 |
| 插入按钮 插入引用 / 插入表格 / 插入图表 / 插入公式 | string[] | 固定枚举 | 前端常量（动作，非数据） | 四个插入动作 |

`editor.journalFormatOptions` Mock 值：
`['《心理学报》· GB/T 7714-2015', '《心理科学进展》· APA 7', 'Computers in Human Behavior · APA 7']`
> **改写原因**：此前第二个选项「《心理科学进展》· APA 7」写死在 JSX 里，换目标期刊要改前端；现在由载荷下发。

### 18.3 正文与引用

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 中文文案 |
| --- | --- | --- | --- | --- |
| `title` | string | 论文标题 | 接口返回 | 正文一级标题 |
| `authorLine` | string | "陈某某 · 心理学系" | 接口返回（可由用户资料派生） | 作者署名行 |
| `editorBody` | `EditorBlock[]` | `kind: heading \| body \| aiLabel`、`text`、`citeIndex?` | 接口返回 | 正文段落 / AI 生成·可溯源标签 / 文内上标 [n] |
| `editorCitations` | `EditorCitation[]` | `index / title / journal / year` | 接口返回 | 「以下文献来自项目知识库」浮层的可选文献 |
| `citationStyle` | enum | `APA7` \| `GBT7714` | 前端状态 + 接口回写 | 引用样式 |
| `editor.citationStyleLabel` | string | "GB/T 7714-2015" | 接口返回 | 引用样式（展示用） |
| `kbDocCount` | number | **42**（对齐设计稿） | 接口返回 | 知识库文献（可插入）42 条已核验 |
| `kbDocs[]` | object[] | `paperId / title / metaText` | 接口返回 | 右栏「知识库文献（可插入）」列表 |
| `aiSuggestions[]` | object[] | `suggestionId / text / adopted` | 接口返回 + 前端状态 | AI 辅助建议 3 条 + 采纳 |
| `rewriteActions` | string[] | ["重写","缩写","扩写","学术化改写"] | 接口返回 | 选中段落操作 |

### 18.4 动作与回写变量（容易漏的部分）

| 动作 | 接口 | 回写哪些变量 | 说明 |
| --- | --- | --- | --- |
| 自动保存 / 预览初稿 | `PATCH /writing/doc` | `autoSavedAt`、`wordCount`、**`unsavedChanges → 0`** | 本轮补充：保存成功后未保存计数归零 |
| 插入引用 / 切换引用样式 | `POST /writing/citation` | **`citationCount + 1`**、**`unsavedChanges + 1`**、`index` | 本轮修正：此前 Mock 写死返回 `citationCount: 31`，与页面显示的 47 不一致 |
| 生成投稿检查清单 | 随 `GET /projects/:id/writing` 的 `submissionChecklist` 下发（**无独立接口**） | `submissionChecklist.items[]` / `done` / `total` | 按钮只做展开/收起，数据一次性取回 |
| 生成 / 重排大纲 | `POST /writing/outline/generate` | `outline[]` | |
| 重新生成本节 | `POST /writing/section/regenerate` | `paragraphs[]`、`autoSavedAt` | |
| 段落改写 | `POST /writing/paragraph/rewrite` | 段落文本（**建议返回 `{ original, revised }` 供 diff**） | 见 `backend-readiness.md` §五 |
| 采纳 AI 建议 | `POST /writing/ai-suggestion/adopt` | `aiSuggestions[].adopted` | |
| 导出投稿包 | `POST /submission-package` | 返回 `nextRoute` | |

### 18.5 辅助撰写视图的**可编辑正文**变量（本轮新增）

> 本轮把正文从「只读渲染」改为**真正可编辑**（contenteditable + `document.execCommand`，零依赖）。
> 编辑面是浏览器维护的 DOM，因此下列变量分两类：**接口变量**（进/出服务端）与**编辑态变量**（本地会话）。

| 变量名 | 类型 | 取值 / 枚举 | 来源 | 说明 |
| --- | --- | --- | --- | --- |
| `content` | string(HTML) | 编辑面 `innerHTML` | **用户输入** | `PATCH /writing/doc` 的请求体；服务端应原样存储并支持回填 |
| `initialHtml` | string(HTML) | 由 `title` + `authorLine` + `editorBody` 生成 | 前端派生（一次性） | 编辑面初始内容；含标题、署名、小节标题、首行缩进、上标引用、AI 标识行 |
| `liveWordCount` | number \| null | 中文按字、英文按词 | 前端派生 | 实时字数（编辑时随 `input` 事件更新） |
| `initialWordsRef` | number \| null | 首次挂载时的正文实际字数 | 前端派生 | **字数基线**：接口 `stats.wordCount` 是整篇字数（Mock 只下发节选），显示值取「接口基线 + 编辑增量」，避免首编辑时数字突降 |
| `displayWords` | number | `stats.wordCount + (liveWordCount - initialWordsRef)` | 前端派生 | 底部「本页共 N 字」 |
| `unsaved` | number | 0 起，输入 +1，保存成功归零 | 前端状态（初值取 `stats.unsavedChanges`） | 「尚未保存的修改 N」（>0 标橙） |
| `lineHeight` | string | `'1'` \| `'1.5'` \| `'2'` | **用户输入** | 行距，作用于整篇（`execCommand` 无行距命令） |
| `fontSizeLevel` | string | `'2'` 五号 \| `'3'` 小四 \| `'4'` 四号 \| `'5'` 三号 | **用户输入** | 字号，作用于**选中文字**（`execCommand('fontSize')`，档位 1~7） |
| `fontFamily` | string | 默认取 `editor.fontName` | **用户输入** | 文档字体，作用于整篇 |

**编辑动作与插入片段（均为光标处操作）**

| 动作 | 实现 | 是否回写服务端 |
| --- | --- | --- |
| B / I / U / ≡ / A / H1 / H2 | `execCommand('bold'\|'italic'\|'underline'\|'justifyLeft'\|'foreColor'\|'formatBlock')` | 随自动保存一并回写 |
| 插入引用 | 光标处插入 `<sup>[n]</sup>` | **是**：调 `POST /writing/citation`，用返回值更新 `stats.citationCount` |
| 插入表格 / 图表 / 公式 | 光标处插入对应 HTML 片段 | 随自动保存一并回写 |
| 自动保存 | 输入后 1.5s 防抖 | **是**：`PATCH /writing/doc`，回写 `autoSavedAt` / `wordCount` / `unsavedChanges` |

> **合规约束**：正文中的「AI 生成 · 可溯源」标识行渲染为 `contenteditable="false"`，用户无法删除或改写，
> 保证 AI 使用披露不被绕过（与「AI 标识已开启」的全局规则一致）。

### 18.6 本轮核对结论
- **已接口化**：正文（`editorBody`）、引用（`editorCitations`）、改写动作（`rewriteActions`）、字数/段落/参考文献/页数/知识库篇数、字体字号行距、引用样式标签、AI 建议、知识库文献列表、投稿检查清单 —— 共 20+ 个变量全部来自 `GET /projects/:id/writing`。
- **本轮补齐**：`stats.unsavedChanges`、`editor.journalFormatOptions`、`kbDocCount`（47→42）、`stats.wordCount`（4,820→2,148）、`stats.citationCount`（31→47，并把插入引用的回写从写死值改为派生值）。
- **仍是前端常量的**：B/I/U 等格式按钮与「插入表格 / 图表 / 公式」四个动作 —— 它们是**交互动作**而非数据，不需要后端变量；若将来支持自定义工具栏，再改为载荷下发。

---

## 附录 A：中英命名对照表

### A.1 全局与实体

| 中文文案 | 变量名 |
| --- | --- |
| 研宇宙 / RESEARCH UNIVERSE | `brandName` |
| 工作台 | `nav.workspace` |
| 论文引言 | `nav.intro` |
| 数据统计 | `nav.stats` |
| 论文写作 | `nav.writing` |
| 论文评审 | `nav.review` |
| 导出中心 | `exportCenter` |
| 项目设置 | `projectSettings` |
| 定价 | `pricing` |
| 我的项目 | `myProjects` |
| 新建项目 | `createProject` |
| 进入项目 | `enterProject` |
| 项目名称 | `project.title` |
| 学科领域 | `project.discipline` |
| 驱动路线 | `project.route` |
| 数据驱动 | `route.dataDriven` |
| 理论驱动 | `route.theoryDriven` |
| 选题中 / 文献中 / 分析中 / 写作中 / 投稿准备 | `stage.topic` / `.literature` / `.analysis` / `.writing` / `.submission` |
| 进度 | `project.progress` |
| 最新进度 | `latestProgress` |
| 当前阶段 / 阶段区间 | `currentPhaseName` / `currentPhaseRange` |
| 距中期检查 N 天 | `mainDdlDaysLeft` |
| 点击卡片任意位置进入项目 | `enterProject` |
| 项目甘特图 · 全部项目总览（已下线） | ~~`projectGantt`~~ |
| 日程 / 数据基准日 | `schedule` / `schedule.today` |
| 时间轴 | `rangeStart` / `rangeEnd` |
| 阶段条 / 阶段完成度 | `schedulePhase` / `phase.progress` |
| 已完成 / 进行中 / 未开始 | `phaseStatus.done` / `.current` / `.upcoming` |
| 里程碑 / DDL 节点 | `milestone` / `ddlNode` |
| 最近节点 | `nextMilestone` |
| 剩余 N 天 | `daysLeft` |
| 月份刻度 | `monthTick` |
| DDL 倒排时间线 | `ddlTimeline` |
| DDL 硬节点 | `ddlNodes` |
| 开题报告 / 中期检查 / 投稿截止 / 毕业答辩 | `ddl.openReport` / `midReview` / `submissionDeadline` / `defense` |
| 本阶段产物摘要 | `stageArtifacts` |
| 去选择 → / 去写作 → | `artifact.actionText` |
| 项目流程看板（已移除） | ~~`kanban`~~ |
| 学生认证已核验 | `verification.verified` |
| 教育邮箱 | `eduEmail` |
| 学信网在线验证报告 | `chsiReport` |
| 第一作者 / 导师 / 协作学生 | `role.firstAuthor` / `.advisor` / `.collaborator` |
| 版本历史 / 回滚 | `versionHistory` / `rollback` |
| 保存修改 | `saveChanges` |
| 邀请成员 | `inviteMember` |

### A.2 数据分级与权限

| 中文文案 | 变量名 |
| --- | --- |
| 数据级别 | `dataLevel` |
| L0 公开 | `dataLevel.L0` |
| L1 个人（当前） | `dataLevel.L1` |
| L2 敏感 | `dataLevel.L2` |
| 强制脱敏 | `forceAnonymize` |
| 禁止导出原文 | `blockRawExport` |
| 存储加密 | `encryptedStorage` |
| 访问留痕 | `accessAudit` |
| 跳过逐条确认（YOLO） | `skipConfirmEnabled` |
| 已脱敏 | `anonymized` |
| 敏感字段 | `sensitiveFields` |
| 进入任何训练集 | `enterTrainingSet` |
| 保存定级 | `saveDataLevel` |

### A.3 文献与核验

| 中文文案 | 变量名 |
| --- | --- |
| 语义检索 | `semanticSearch` |
| 共 N 条结果 · 按相关度排序 | `resultTotal` / `sortBy` |
| 期刊等级 / 学科 / 年份 | `filter.quartile` / `.discipline` / `.year` |
| 匹配理由 | `matchReason` |
| 相关度 | `relevanceScore` |
| DOI 已验证 / 未验证 | `doiStatus.verified` / `.unverified` |
| 已选文献集 | `selectedPaperIds` |
| 已满足 ≥N 篇 | `minRequired` |
| 生成结构化综述 | `generateStructuredReview` |
| 双 Agent 核验 | `dualAgentVerify` |
| Agent-α 内容一致性 | `agentAlpha` |
| Agent-β DOI 真实性 | `agentBeta` |
| 通过 / 存疑 / 失败 | `passedCount` / `suspiciousCount` / `failedCount` |
| 知识库问答 | `kbQa` |
| 引用回溯 | `citations` |
| 领域认知地图 | `domainCognitiveMap` |
| 带入写作 | `bringToWriting` |
| 未验证条目禁止进入参考文献区 | `citable=false` |

### A.4 数据与统计

| 中文文案 | 变量名 |
| --- | --- |
| 上传数据 | `dataUpload` |
| 拖拽文件到此处 | `dropzone` |
| 已上传 · 待体检 | `uploadStatus.uploaded` |
| 公共数据库直连导入 | `importPublicDataset` |
| 一键直连导入 / 需自行申请 | `accessAction.directImport` / `.applyBySelf` |
| 变量识别 | `variableIdentify` |
| 数据体检摘要 | `healthSummary` |
| 有效样本量 / 变量总数 | `validSampleSize` / `variableCount` |
| 完整无缺失变量 / 含缺失变量 | `completeVariableCount` / `missingVariableCount` |
| 异常值提示 / 重复作答 | `outlierCount` / `duplicateAnswerCount` |
| 变量清单 | `variableList` |
| 建议角色 | `suggestedRole` |
| 因变量 / 自变量 / 中介变量 / 调节变量 / 控制变量 / 结果变量候选 | `dependent` / `independent` / `mediator` / `moderator` / `control` / `resultCandidate` |
| 类型 / 取值范围 / 缺失率 | `typeLabel` / `valueRange` / `missingRate` |
| 数据质量问题 | `qualityIssues` |
| 变量类型分布 | `typeDistribution` |
| 生成研究假设 | `generateHypotheses` |
| 可检验方法 | `testMethod` |
| 依据 | `basis` |
| 候选统计方法清单 | `methodList` |
| 分层回归 + Bootstrap 中介 | `method.hierarchicalBoot` |
| 结构方程模型 SEM | `method.sem` |
| PROCESS Model 7 | `method.process7` |
| 适用前提 / 优点 / 缺点 | `prerequisites` / `pros` / `cons` |
| 对结论稳健性的影响 | `robustnessImpact` |
| 前提假设检验清单 | `checklist` |
| 选择留痕 | `selectionTrail` |
| 数据体检报告 | `healthReport` |
| 稳健性检验 | `robustness` |
| 结论未翻转 / 待执行 | `robustness.notFlipped` / `.pending` |
| 缺失值分布 | `missingDistribution` |
| 可复现代码 | `reproducibleCode` |
| 执行分析（沙箱） | `runAnalysis` |
| 分析结果 | `analysisResult` |
| 重命名分析任务 | `renameAnalysisTask` |

### A.5 写作 / 选刊 / 评审 / 导出

| 中文文案 | 变量名 |
| --- | --- |
| AI 全文生成 / AI 辅助撰写 | `writingMode.aiFull` / `.aiAssist` |
| 写作大纲 / 生成/重排大纲 | `outline` / `generateOutline` |
| 重新生成本节 | `regenerateSection` |
| 重写 / 缩写 / 扩写 / 学术化改写 | `rewrite` / `shorten` / `expand` / `academic` |
| 引用引擎（CSL） | `citationEngine` |
| 引用样式 / 文内引用 / 参考文献 | `citationStyle` / `inTextStyle` / `citationCount` |
| 已核验池 | `verifiedPool` |
| 插入引用 | `insertCitation` |
| Zotero 联动 / 双向同步 | `zoteroBinding` / `bidirectionalSync` |
| 限速与退避 | `rateLimit` |
| 目标期刊 AI 政策提醒 | `aiPolicyReminder` |
| 选刊 AI | `journalMatch` |
| 推荐期刊 / 匹配度 | `recommendedJournals` / `matchScore` |
| 查看画像 | `viewProfile` |
| 期刊画像 | `journalProfile` |
| 分区 / 影响因子 | `partition` / `impactFactor` |
| 审稿周期 / 录用率 / 版面费 | `reviewCycle` / `acceptanceRate` / `apc` |
| 收录库 / 格式与字数 | `databases` / `formatRequirement` |
| 投稿前检查清单 | `submissionChecklist` |
| 生成投稿包 | `generateSubmissionPackage` |
| 模拟评审 | `mockReview` |
| 校准基准 | `calibration` |
| 硬伤 / 争议点 / 风格建议 | `issueType.hard` / `.dispute` / `.style` |
| 置信度 | `confidence` |
| 出现频率 | `frequencyText` |
| 接受建议并修改 / 标记争议 / 生成回复 | `accept` / `dispute` / `generateReply` |
| 修改路径 | `revisionPath` |
| Rebuttal 辅助 | `rebuttalAssist` |
| 修改摘要 | `revisionSummary` |
| 产物导出 | `artifactExport` |
| AI 使用情况说明 | `aiUsageDisclosure` |
| 披露报告 | `disclosureReport` |
| 导出合规校验 | `complianceCheck` |
| 红色核验条目 | `redItems` |
| AI 标识完整性 | `aiLabelIntegrity` |
| 导出已选产物 | `exportSelected` |
| 溯源标识 | `traceabilityLabel` |

### A.6 UI 组件

| 中文文案 | 变量名 / 组件名 |
| --- | --- |
| 卡片 | `Card` / `.ru-card` |
| 卡内嵌面板 | `Panel` / `.ru-panel` |
| 按钮 | `Button`（variant: `primary`\|`secondary`\|`ghost`\|`danger`\|`link`） |
| 标签 / 徽标 | `Tag`（tone: `neutral`\|`brand`\|`ok`\|`warn`\|`danger`\|`violet`\|`teal`） |
| 进度条 | `ProgressBar` |
| 评分条 / 星级 | `ScoreBar` / `Stars` |
| 提示条 | `InfoBanner`（tone: `info`\|`ok`\|`warn`\|`danger`） |
| 步骤条 / 当前步骤 | `Stepper` / `status='current'` |
| 弹窗 | `Modal` |
| 确认弹窗 | `GlobalConfirmDialog` |
| 异步任务弹窗 | `GlobalTaskDialog` |
| 重命名弹窗 | `RenameTaskDialog` |
| 分析类型弹窗 | `AnalysisTypeDialog` |
| 表格 | `DataTable`（`.ru-th` / `.ru-td`） |
| 分段控件 | `Segmented` |
| 开关 | `Toggle` |
| 勾选项 | `CheckPill` |
| 数据小卡 | `StatTile` |
| 键值行 | `KeyValue` |
| 代码块 | `CodeBlock` |
| 面包屑 | `Breadcrumb` |
| 骨架屏 / 加载中 | `Skeleton` / `PageSkeleton` / `Spinner` |
| 空态 / 错误态 | `EmptyState` / `ErrorState` |
| 轻提示 | `ToastContainer` |
| 折线图 / 环形图 / 条形图 / 词云 | `TrendLineChart` / `DonutChart` / `HBarList` / `KeywordCloud` |

### A.7 账号设置（P13）

| 中文文案 | 变量名 |
| --- | --- |
| 账号设置 | `accountSettings` |
| 管理账号资料、登录安全、学生认证与数据隐私 | `accountSettingsSubtitle` |
| 基本信息 | `basicInfo` |
| 文字头像 | `avatarText` |
| 头像由昵称首字自动生成 | `avatarHint` |
| 昵称 / 学科 / 年级 | `nickname` / `major` / `grade` |
| 保存修改 / 已保存 | `saveChanges` / `saved` |
| 有未保存的修改，离开本页将丢失 | `unsavedWarning` |
| 账号与安全 | `accountSecurity` |
| 手机号 / 更换 | `phoneMasked` / `changePhone` |
| 教育邮箱 / 已绑定 / 未绑定 | `eduEmail` / `bound` / `unbound` |
| 登录密码 / 修改密码 | `password` / `changePassword` |
| 登录设备 | `loginDevices` |
| 当前设备 | `currentDevice` |
| 退出其他设备 | `revokeOtherDevices` |
| 退出登录 | `logout` |
| 学生认证 | `studentVerificationAccount` |
| 已核验 / 未核验 / 重新认证 | `verified` / `unverified` / `reverify` |
| 渠道：教育邮箱 / 学信网 | `channel.eduEmail` / `channel.chsi` |
| 权益已同步 / 权益待同步 | `benefitsSynced` / `benefitsPending` |
| 认证邮箱 / 认证时间 / 失效宽限期 | `verifiedEmail` / `verifiedAt` / `graceDays` |
| 套餐与额度 | `planAndQuota` |
| 去定价页 | `goToPricing` |
| 双 Agent 核验 / 沙箱算力 / 综述生成 / 导出次数 | `quota.verify` / `.sandbox` / `.reviewGenerate` / `.export` |
| 重置时间 | `quota.resetAt` |
| 通知偏好 | `notificationPrefs` |
| 核验失败提醒 / DDL 临近提醒 / 异步任务完成提醒 / 每周进度简报 / 产品与政策更新 | `notify.verifyFailed` / `.ddlReminder` / `.taskDone` / `.weeklyReport` / `.productUpdate` |
| 必开（合规强制） | `mandatory` |
| 数据与隐私 | `dataAndPrivacy` |
| 允许数据用于模型改进 | `allowTraining` |
| 版本与日志保留 | `keepHistoryDays` |
| 最近导出申请 | `exportRequestedAt` |
| 导出我的数据 | `exportMyData` |
| 注销账号 | `deleteAccount` |
| 请输入「注销账号」以确认 | `deleteConfirmText` |
| 确认注销 / 取消 | `confirmDelete` / `cancel` |
| 点击头像进入账号设置 | `avatarEntry` |

