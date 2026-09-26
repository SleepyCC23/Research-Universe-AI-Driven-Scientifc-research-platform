# 前端功能测试 · 问题清单与修改记录

- **来源**：系统前端功能测试复盘纪要（发言人：灏、黎镇豪、毛毛）
- **整理日期**：2026-09-25
- **范围**：`frontend/research-universe`（React + TS + Vite）、`backend`（Express + TS + Prisma）
- **约定**：✅ 已修复 / 🚧 待办（需后续排期）

---

## 一、总览

| # | 问题 | 类型 | 状态 | 涉及文件 |
| --- | --- | --- | --- | --- |
| 1 | 画像切换只能点「查看画像」按钮，点卡片主体无反应 | 交互 | ✅ | `src/pages/Journal.tsx` |
| 2 | 未选择导出格式就导不出去，无提示 | 逻辑 | ✅ | `src/store/index.ts`、`src/pages/ExportCenter.tsx` |
| 3 | 存在「点不动」的多余选项（核验失败提醒的开关） | 交互 | ✅ | `src/pages/AccountSettings.tsx` |
| 4 | 退出登录后仍默认显示「陈同学」账号 | 登录态 | ✅ | `src/store/index.ts`、`src/router.tsx`、`backend/src/services/account.service.ts` |
| 5 | 登录账号未限制位数（11 位手机号 / 邮箱） | 校验 | ✅ | `src/api/endpoints.ts`、`src/pages/Login.tsx`、`backend/src/services/account.service.ts` |
| 6 | 点写作大纲章节后，正文区不显示该节内容；「生成本节」的结果也看不到 | 交互 / 逻辑 | ✅ | `src/pages/Writing.tsx`、`src/api/endpoints.ts`、`backend/src/services/writing.service.ts` |
| 7 | 候选统计方法是写死的 5 条，与选题、假设、变量无关（「研究方法未真实分析」） | 数据真实性 | ✅ | `backend/src/services/analysis.service.ts`、`backend/src/routes/projects.routes.ts`、`src/pages/Analysis.tsx` |
| 8 | 已登录状态下顶栏仍显示「未登录 / 请先登录」 | 登录态 | ✅ | `src/store/index.ts`、`src/router.tsx`、`src/api/client.ts`、`src/components/layout.tsx` |
| 9 | 「学生认证」放在登录页不合理，应归到账号设置 | 信息架构 | ✅ | `src/pages/Login.tsx`、`src/pages/AccountSettings.tsx` |
| 10 | 「查看全文」只能看，写完的稿子没法送去下载中心；导出中心的「论文正文」字数还是写死的 | 交互 / 数据真实性 | ✅ | `src/pages/Writing.tsx`、`src/api/endpoints.ts`、`backend/src/services/export.service.ts`、`backend/src/routes/projects.routes.ts` |
| 11 | 评审页：点「修改建议」看不到对应内容；「生成完整 Rebuttal 草稿」按钮位置不当且生成结果不展示 | 交互 / 逻辑 | ✅ | `src/pages/Review.tsx`、`backend/src/services/review.service.ts` |
| 12 | 写作页「选中段落操作」四个按钮调的是同一个请求、结果是假的；没有自定义提示词入口 | 交互 / 逻辑 | ✅ | `src/pages/Writing.tsx`、`src/api/endpoints.ts`、`backend/src/services/writing.service.ts`、`backend/src/routes/projects.routes.ts` |
| 13 | 头像只能是「昵称首字」文字头像，无法上传自己的图片 | 功能缺失 | ✅ | `src/pages/AccountSettings.tsx`、`src/components/ui.tsx`、`src/components/layout.tsx`、`src/utils/image.ts`、`backend/prisma/schema.prisma`、`backend/src/services/account.service.ts`、`backend/src/services/common.ts` |
| 14 | 论文写作正文为写死的模板/虚假数据 | 数据真实性 | 🚧 | `backend/src/content/payloads.ts` |
| 15 | 数据分析页的健康报告 / 导入文件信息为固定值 | 数据真实性 | 🚧 | `backend/src/services/analysis.service.ts` |

> 说明：第 14～15 项按讨论结论**本轮不改**，已在下文「四、待办专项」中整理成可直接开工的方案。

---

## 二、已修复明细

### 1. 画像查看交互：整卡点击即可切换 ✅

- **现象**：只有卡片右上角「查看画像 →」可点，点击卡片主体没有任何反应。
- **处理**：把整张推荐期刊卡片改成可点击区域（`role="button"` + `tabIndex` + Enter/Space 键盘可达），「查看画像 →」降级为纯视觉提示（当前项显示「当前画像」）。
- **附带修复**：切换失败时回滚高亮到上一次选中的期刊并提示，避免左侧列表高亮与右侧画像不一致；重复点击当前项不再重复请求。
- **自测**：进入 `选刊 AI` → 点任一期卡片空白处 → 右侧「期刊画像 · XX」应立即切换，顶部出现「已切换画像：XX」提示。

### 2. 导出逻辑：默认选中格式 + 未选校验 ✅

- **现象**：不选格式（如 PDF）直接点「导出已选产物」会失败，且没有明确原因。
- **根因**：`selectedFormats` 只在**模块初始化**时按示例数据算过一次；真实项目数据加载回来后并没有重算，于是界面上没有任何格式处于选中态，导出请求里带的是空数组。
- **处理**：
  1. 新增 `defaultExportFormat()`（`src/store/index.ts`），优先级 `PDF → docx → doc → zip → md → 第一个`；
  2. `setArtifacts()` 载入产物时**重建** `selectedArtifactIds`（仅「已就绪」项）与 `selectedFormats`（每项预置默认格式）；
  3. `toggleArtifact()` 勾选时若该项还没有格式，顺手补默认值；
  4. `handleExport()` 导出前兜底：未选格式 → 自动补默认并提示「已为 N 项产物默认选中格式」；一项格式都没有（待补齐）→ 直接阻断并点名是哪几项。
- **自测**：`导出中心` 刷新后每个已就绪产物应已高亮某个格式；取消全部格式选中再导出 → 出现「已为 N 项产物默认选中格式」提示并正常导出。

### 3. 删除无实际交互功能的多余选项 ✅

- **现象**：账号设置「通知偏好」里，「核验失败提醒」带一个开关，但点它不会生效（后端返回 40301 且前端回滚），属于「看似可交互、实际无功能」的选项。
- **处理**：`mandatory`（合规必开）项**不再渲染开关**，改为静态状态标识「🔒 已开启 · 必开」；同时 `handleToggleNotification()` 增加 `mandatory` 早退兜底，防止后续被误接回 Toggle。
- **保留**：`DDL 临近提醒`、`长任务完成提醒` 等用户可自主控制的项仍是正常开关。
- **自测**：`账号设置` → 通知偏好 → 「核验失败提醒」行右侧应为静态「已开启 · 必开」，无滑块。

### 4. 修复退出登录后默认显示「陈同学」✅

- **现象**：退出登录后系统仍像是以「陈同学」身份在运行；新开页面也会直接进入工作台。
- **根因（前端）**：`useAuthStore` 初始值写死为 `{ loggedIn: true, user: 陈同学 }`，与 localStorage 里的真实登录凭证无关 → 只要 store 重建（刷新 / 退出后）就「自动登录成示例账号」。
- **根因（后端）**：`login()` 对所有新账号一律写入 `nickname: '陈同学'`、`eduEmail: 'chen@stu.example.edu.cn'`，并直接置为「已通过学生认证」。
- **处理**：
  - 前端：登录态改为**只由 `ru_token` 决定**；用户资料不再预置（`user: null`），改由路由守卫 `SessionGate` 拉 `GET /me` + `GET /me/student-verification` 水合；`verification` 默认「未认证」；`setAuth()` 同步锁定/放开高级功能权限。
  - 路由：无 token 时统一回 `/login`；有 token 先水合再渲染业务页，token 失效自动清理并回登录页。
  - 后端：只有演示账号 `13800000000` 保留「陈同学」示例资料；其他新账号昵称/头像按账号推导（邮箱取 `@` 前缀、手机号取后 4 位），学科年级为「待完善」，**不再伪造教育邮箱与学生认证**。
- **自测**：`账号设置` → 退出登录 → 应停在 `/login` 且默认「注册」视图；刷新页面不再出现「早上好，陈同学」。

### 5. 登录账号位数限制 ✅

- **规则（按讨论确认）**：**仅允许 11 位手机号或合法邮箱**。
  - 纯数字：必须 11 位且以 `1` 开头（否则提示「手机号应为 11 位数字（当前 N 位）」/「请输入以 1 开头的 11 位手机号」）；
  - 含 `@`：按邮箱正则校验，长度 ≤ 64；
  - 其他形态：提示「请输入 11 位手机号或邮箱」。
- **落点**：
  - `src/api/endpoints.ts` 新增 `validateAccount()`，**发验证码与提交登录前各校验一次**（不合法不发码、不发请求）；
  - 后端 `account.service.ts` 新增 `assertAccount()` 兜底（接口可能被直接调用，不能只靠前端）；
  - 登录页新增「注册 / 登录」切换（默认停**注册**），并通过 `intent` 告诉后端意图：`intent=login` 时账号不存在**直接报错、不建号**；`intent=register` 时不存在才创建并返回 `isNewUser`。
- **自测**：账号输入 `123` → 发码被拦并提示位数；输入 `13800000000` 在「登录」视图可正常登录；输入未注册号码在「登录」视图报「该账号尚未注册，请切换到「注册」」。

### 6. 点大纲章节要输出该节内容 ✅

- **现象**：在「论文写作（AI 全文生成）」左侧大纲点任一章节，只弹出一句「已切换到 X」，中间正文区始终是整篇段落，看不到「这一节有什么内容」；点「重新生成本节」也只弹提示，生成结果从不展示。
- **根因（前端）**：正文区渲染的是 `data.paragraphs`（整篇），`activeSection` 只被用在「当前章节」文案和一处**写错的高亮判断**（`n.title.includes(currentSection)`，方向反了，父节点永远不高亮）；`handleRegenerateSection()` 调完接口把返回值**丢掉了**。
- **根因（后端）**：`regenerateSection()` 用「本次生成的几段」**整体替换** `paragraphs` —— 生成「2.1」会把 1.1、3.3 等其他章节整段抹掉。
- **处理**：
  1. 前端新增 `sectionMatches()`（章节双向包含：点父级章节带出子章节段落）、`outlineOrder()`、`isOutlineActive()`；
  2. 正文区改为渲染 `visibleParagraphs`：**选中章节 = 只显示该节**，未选中 = 全文（保持首屏体验）；顶部给「已定位章节 / 查看全文」提示条，大纲下方加「查看全文」按钮，切项目时自动回到全文；
  3. 该节暂无内容时给明确空状态 + 一键「生成本节」，不再悄悄显示别的章节；
  4. 点章节的反馈改为「已定位到 X · 本节约 N 段」或「X 暂无内容，点生成本节」；段落序号旁补显所属章节名；
  5. `handleRegenerateSection()` 改为**应用返回值**：只替换本节段落 → 按大纲顺序重排 P1..Pn → 同步字数/段落数 → 视图切到该节；后端同步改为只替换本节并重算 stats；接口 Mock 分支也只返回本节段落（避免重复插入）。
- **自测**：点「2.1 社交焦虑」→ 正文区只剩该节；点「1 引言」（父级）→ 带出 1.1 / 1.2；点没有内容的节 → 空状态 + 生成本节 → 生成后该节内容出现在正文区，且 `1.1`、`3.3` 等原有章节仍在。

### 7. 候选统计方法改为「AI 依据本项目生成」 ✅

- **现象**：分析页「候选统计方法清单（防主试效应）」永远固定 5 条（分层回归 / Bootstrap 中介 / 调节效应 / SEM / HLM），与选题、假设、变量、样本量毫无关系 —— 也就是「研究方法未经真实分析，只是给了几条通用方法」。
- **根因**：清单直接读 `content/catalogs.ts::ANALYSIS_METHODS` 常量；`ensureAnalysisState()` 还会把 `selectedMethodId` 预置为 `'hierarchical'`（与「AI 推荐不作默认选项」的产品约定相反）。
- **处理**：
  1. 后端新增 `generateMethods()`：把项目的**真实上下文**（选题 / 学科 / 流程 / 样本量 / 变量名+类型+角色 / 已确认假设及其变量链）交给大模型，由模型挑选 3～5 个**真正适用**的方法，并逐条给出针对性「适用前提 / 优点 / 缺点 / 对结论稳健性的影响 / 检验清单」；
  2. **AI 只能在 Python 沙箱支持的 `methodId` 集合内挑选**（`hierarchical/mediation/moderation/sem/multiLevel`），不允许自造 id —— 自造 id 会让沙箱执行落空、退回「模拟结果」；字段缺失或方法名由内置目录兜底补齐，许可证声明固定由后端给出；
  3. 生成结果落库 `AnalysisMethodState`（每个项目只生成一次），并把来源写进留痕 `methodSource: 'ai' | 'catalog'`；
  4. 模型未配置 / 调用失败 / 有效方法少于 3 条 → **回退内置目录**（20s 超时兜底），页面不会卡死也不会空白；
  5. 不再预选任何方法：`selectedMethodId` 初始为 `null`，`未选` 计数按实际选中情况实时计算（前端 `data.methods.filter(...)`）；
  6. 新增 `POST /projects/:projectId/analysis/methods/refresh`（含扁平别名）：用户可主动「重新生成」，换选题 / 补完数据后清单会随上下文变化；清单变更后自动清空旧的已选方法（前后端同时清）；
  7. 分析页卡片头部显示来源（「AI 依据本项目生成」/「内置方法库」）+「重新生成」按钮；`runAnalysis` 改为以**项目实际存放的清单**解析方法，模型给的方法名与理由能一路落到任务名与结果里；顺带把写死的任务名 `questionnaire_n350 有调节的中介分析` 改为「数据文件 · 方法名」。
- **自测**：打开分析页 → 头部应显示「N 个可行方法 · AI 依据本项目生成」，方法名与摘要应符合本项目选题与假设（例如出现「检验 XX 在 A 与 B 间的中介作用，对应 H2」这种带假设编号的理由）；点「重新生成」应换一份清单，且已选方法被清空；随后选一个方法执行分析应能正常跑通。

### 8. 已登录时顶栏仍显示「未登录」 ✅

- **现象**：注册 / 登录成功后进入账号设置页，页面数据都正常（说明凭证有效），但顶栏右上角仍是「未登录 / 请先登录」。
- **根因**：顶栏只看 `auth.user`。为修掉「退出登录后仍显示陈同学」，store 的初始 `user` 改成了 `null`，而用户资料要靠一次 `GET /me` 水合返回 —— 只要这次水合没成功（或页面在修复前就已加载、模块热更新没覆盖到路由守卫），顶栏就一直空着。
- **处理**：
  1. **资料快照本地缓存**（`ru_auth_cache`）：`setAuth / setUser / setVerification` 时把 token + 用户资料 + 认证状态写入 localStorage，store 初始化时**优先用快照还原**（刷新瞬间顶栏就是正确昵称），随后再由 `/me` 校正；`reset()`（退出登录）与 401 失效时一并清除，避免「僵尸登录态」。
  2. 顶栏与侧边栏的显示口径改为「**有 token 就算登录**」：资料未回来时显示「已登录 / 正在同步账号资料…」，不再显示「未登录 / 请先登录」。
  3. 水合失败不再无脑登出：只有业务码 `40101 / 40102`（凭证失效）才清凭证回登录页；网络抖动 / 5xx 一律保留登录态（原来任何异常都会清 token 并跳登录页，属于过度反应）。
  4. 401 统一走 `clearAuthStorage()`，token 与资料快照一起清，不会出现「token 没了但昵称还在」。
- **自测**：登录后刷新页面 → 顶栏应立即显示昵称与「学科 · 年级」；在账号设置页改昵称并保存 → 顶栏同步更新；退出登录 → 顶栏回到「未登录」，且再打开应用不会自动变回已登录。

### 9. 「学生认证」从登录页迁移到账号设置 ✅

- **现象**：登录 / 注册页右侧挂了一张「学生认证」卡（教育邮箱输入 + 认证按钮 + 学信网入口 + 宽限期说明），与「账号设置 → 学生认证」重复，且位置不合理。
- **处理**：
  1. 登录页**删除**该卡片与宽限期文案，只保留一句引导：「学生认证（教育邮箱 / 学信网）已移至『账号设置 → 学生认证』，登录后即可提交并同步学生价与额度」；同时清掉页面上不再使用的状态 / 处理函数与图标导入（`eduEmail`、`verifying`、`handleVerify`、`Tag`、`IconCheckCircle`、`IconShield`）。
  2. 账号设置的「学生认证」卡补齐**认证入口**：未核验时显示教育邮箱输入 + 「认证」按钮（回车可提交）+ 学信网核验入口 + 宽限期说明；已核验时保留状态、渠道、权益同步、认证邮箱/时间/宽限期等信息与「重新认证」按钮（原来只有后者，未核验时反而没有提交认证的地方）。
  3. 认证成功走同一个 `POST /me/student-verification`，并同步全局认证状态（`setVerification`）与页面数据。
- **自测**：登录页不再出现学生认证卡；账号设置 → 学生认证：未核验时可提交教育邮箱认证，提交后状态变为「已核验 / 权益已同步」；已核验时显示「重新认证」。

### 10. 「查看全文」后可把成稿加入下载中心 ✅

- **现象**：点「查看全文」只把段落铺开，**看不出这是写完的那篇文章**（每段头顶还挂着 `P3 · 1.2 问题提出` 这类调试标注）；而且没有任何入口把这篇稿子送去下载 —— 导出中心里的「论文正文」产物 `metaText` 还是 `buildExportPage` 里写死的「约 4,820 字 · 12 页」，与实际内容无关。
- **处理**：
  1. **全文视图 = 成稿预览**：`renderedParagraphs` 在章节变化处插入小标题（`<h3>`），同一章节只出现一次标题；全文视图不再重复显示段落序号与章节名（单节视图保留 `P n · 章节`，便于定位与「重新生成本节」）。
  2. **新增「加入下载中心」**：全文视图下出现动作卡（「加入下载中心」/「加入并前往」），调用新接口 `POST /projects/:projectId/writing/manuscript/publish`（含扁平别名 `/writing/manuscript/publish`）。
  3. 后端 `publishManuscript()`（`export.service.ts`）：按 `index` 顺序组装当前 `WritingDoc` 段落 → 统计**真实**章节数 / 段落数 / 字数 → 刷新导出中心的「论文正文」产物（固定 `a_1`，与 `exportArtifacts` 的生成分支对应）并置为 `ready`，同时回写 `artifactCount`。**只登记不落盘**，真正的 DOCX / PDF / Markdown 仍在导出中心点导出时生成，避免每个项目预生成一堆文件。
  4. 稿件内容为空时明确报错（「当前稿件还没有内容，请先生成章节后再加入下载中心」），不会写出空产物。
- **自测**：写作页点「查看全文」→ 应看到带章节小标题的成稿；点「加入下载中心」→ 提示已加入并显示真实「N 节 · M 段 · X 字」；进导出中心 → 「论文正文（含引用）」的说明文案与草稿一致，选 DOCX 导出可下载到含全部章节 + 参考文献的稿件。

### 11. 模拟评审：修改建议可点开、完整 Rebuttal 草稿改到正文末尾 ✅

三处调整（同一轮反馈）：

**(1) 点「修改建议」要显示出对应内容**
- **现象**：右侧「修改建议」卡只列 H1 / H2 两条，且点任何地方都没有具体内容；底部「查看全部 6 条修改路径 →」点完只弹一句 Toast，数字 6 也是写死的。左侧点 D1 / S1 这类意见时，压根没有对应的修改建议。
- **根因**：后端 `buildReviewPage()` 的 `revisionPaths` 只有 H1 / H2 两条；前端只是把它们平铺出来，没有任何点击行为。
- **处理**：
  1. 后端新增 `ensureRevisionPaths()`（`review.service.ts`）：`getReview()` 时按 `issues` 补齐缺失的修改建议 —— 以意见自身的 `description` 作主建议，再按类型（hard / dispute / style）补一句处理方向，并落库，保证**每条意见都有建议可看**；
  2. 前端「修改建议」卡改为**可点击**：点某条 → 展开该条建议 + 把对应意见卡 `scrollIntoView` 定位到视野中间（`issueRefs` + `focusGuide()`）；条目按 `issueCode` 高亮；
  3. 意见卡内新增「查看修改建议 →」/「收起修改建议」：就地展开该条的完整建议 + 置信度与出现频率；展开时意见卡加一圈 `ring` 高亮；
  4. 底部按钮换成真实的「查看全部 N 条修改建议 →」展开 / 收起（默认只列 2 条，N 取 `revisionPaths.length`），去掉写死的「6 条」。

**(2) 删除右侧的「生成完整 Rebuttal 草稿」按钮**
- 该按钮原来挂在右栏「Rebuttal 辅助」卡底部，点完只弹提示、生成结果从不展示（`handleGenerateRebuttal` 把接口返回值丢掉了）。按钮本身已删除。

**(3) 在风格建议下面生成完整的 Rebuttal 草稿**
- 在左栏**全部意见分组之后**（也就是末尾「风格建议」下面）新增「完整 Rebuttal 草稿」卡：
  - 空态：说明 + 「生成完整 Rebuttal 草稿」按钮；
  - 生成后：就地渲染一封完整回复信（致谢开头 → 按意见编号逐条 `N. 关于「意见标题」（编号）` + 编号子步骤 → 结尾致谢），并提供**真实可用的「复制草稿」**（`navigator.clipboard.writeText`，失败才提示手动复制）；
  - 有争议条目时提示「其中 X 条你已标记为争议：草稿按你的主张生成并标注了冲突点」；
  - `handleGenerateRebuttal()` 改为**应用返回值**（落地到 `data.rebuttals` + 本地 `fullDraft` 状态），右栏「Rebuttal 辅助」则退化为逐条预览并注明「完整草稿见正文末尾」。
- 顺带修掉后端 `generateRebuttal()` 兜底草稿写死的 `title: '回复草稿'`（拼出来是「关于「回复草稿」（H1）」），改为使用意见标题。
- **自测**：任一意见卡点「查看修改建议 →」→ 就地展开建议且卡片高亮；右侧点某条建议 → 页面滚动定位到对应意见并展开；末尾「完整 Rebuttal 草稿」点生成 → 就地出现完整回复信，「复制草稿」能真的复制到剪贴板。

### 12. 写作页段落操作改为真实 API + 支持自定义提示词 ✅

- **现象**：正文下方「选中段落操作：重写 / 缩写 / 扩写 / 学术化改写」四个按钮点下去只弹一句「已执行「重写」」，正文**永远不变**；页面上也没有任何「选中段落」的操作方式。
- **根因（前端调用方式）**：`handleRewrite()` 把参数写死了 —— `paraId: 'd2'`、`action: 'rewrite'`，即四个按钮调用的是**同一个请求**；而且 `await api.rewriteParagraph(...)` 的返回值**被丢掉**，从不写回页面。
- **根因（服务端）**：不接收任何自定义要求；且方法章节（`kind === 'boundMethod'`，与项目分析产物绑定）本不可修改却没有拦截；改完也不重算 `stats`。
- **处理**：
  1. **真的能选中段落**：正文段落可点击选中（`role="button"` + Enter/Space 键盘可达，选中态高亮 + 「已选中」标签）；方法章节不可选（与分析产物绑定）；
  2. **四个按钮按各自动作调接口**：新增 `REWRITE_ACTION_KEY` 把「重写 / 缩写 / 扩写 / 学术化改写」映射到 `rewrite / shorten / expand / academic`，`paraId` 取实际选中段落；
  3. **自定义提示词**：段落操作区新增输入框 + 「按提示词改写」按钮（`action: 'custom'`，`instruction` 为用户原文）；**内置动作在有提示词时也会把它作为额外要求一并交给模型**；
  4. **应用返回值**：把接口返回的新段落文本就地替换渲染，并重算字数 / 段落数、更新自动保存时间（旧实现只弹提示）；
  5. 服务端 `rewriteParagraph(projectId, paraId, action, instruction?)`：支持 `custom` 与 `instruction`，拒绝改写 `boundMethod` 段落（`Errors.param`），无自定义要求时给出带动作标签的兜底文本，改完统一重算 `stats` 并落库；
  6. 接口层 `rewriteParagraph` 增加 `instruction` 与 `RewriteAction`（含 `custom`）类型；Mock 分支也不再原样返回，而是按动作与提示词生成可见变化，便于 Mock 模式下验收。
- **自测**：点正文某段 → 出现「已选中」→ 点「缩写」→ 该段文字被替换（Word 字数同步变化）；在提示词框写「压缩到 60 字内并改成学术书面语」→ 点「按提示词改写」→ 该段按你的要求改写；点「3.3 统计策略」这类方法章节无法选中。

### 13. 头像支持从本地上传自己的图片 ✅

- **现象**：账号设置「基本信息」里的头像写死为「文字头像」，说明文案还写着「无需单独上传」，用户无法使用自己的图片。
- **处理**：
  1. **数据层**：`User` 新增 `avatarUrl String? @db.MediumText`（可空列，不动存量数据，用 `prisma db push` 同步）；`serializeUser()` 与 `GET /me/account` 一并下发 `avatarUrl`；
  2. **本地压缩**：新增 `src/utils/image.ts::fileToAvatarDataUrl()` —— 用 `<img>` + ObjectURL 解码（不用兼容性较差的 `createImageBitmap`），**居中裁剪成正方形 → 缩放到 256×256**，有透明通道优先 PNG、体积超标自动退化为 JPEG（q0.85 → q0.82 → q0.6），产物通常 20–60KB；入口校验类型（PNG/JPG/WebP/GIF）与体积（**≤50MB**，上限由 `MAX_INPUT_MB` 单一真源提供、UI 文案也取自它）；解码后边长超过 `MAX_SOURCE_SIDE`(4096) 的超大原图会**先等比降采样再裁剪**，避免撞上浏览器 canvas 面积上限画出空白图；
  3. **服务端校验**：`PATCH /me` 的 `updateMe` 接受 `avatarUrl` —— 只认 `data:image/(png|jpeg|webp|gif);base64,…`，长度上限 50 万字符；传 `null`/空串表示恢复文字头像；格式或体积不合法直接 `40001`；
  4. **前端交互**（`AccountSettings` 基本信息卡）：圆形头像预览（56px）+「上传头像 / 更换头像」（隐藏 file input，选完即清空 value 以便重复选同一文件）+「移除头像」；**上传后立即保存**（不等「保存修改」），成功后 `setUser` + `setData` 同步，顶栏与侧边栏立刻更新；
  5. **统一渲染**：`components/ui.tsx` 新增 `Avatar({ src, text, size })` —— 有图片渲染 `<img>`（圆形 + `object-cover`），否则回落文字头像；顶栏（28px）、全局侧边栏（32px）、账号设置（56px）共用同一口径。
- **自测**：账号设置 → 上传一张本地图片 → 头像立即变图片、顶栏与侧边栏同步、刷新后仍保留；上传超过 50MB 或非图片文件 → 明确报错；点「移除头像」→ 恢复昵称首字文字头像。

---

## 三、本轮新增的可复用能力

| 能力 | 位置 | 用途 |
| --- | --- | --- |
| `validateAccount(account)` | `src/api/endpoints.ts` | 统一账号规则，前端各处复用 |
| `defaultExportFormat(formats)` | `src/store/index.ts` | 统一导出格式默认值策略 |
| `SessionGate` + `/me` 水合 | `src/router.tsx` | 刷新页面后用户资料不丢、失效凭证自动清理 |
| `sectionMatches` / `outlineOrder` / `isOutlineActive` | `src/pages/Writing.tsx` | 章节 ↔ 段落对齐：单节视图、按大纲重排、父级高亮 |
| `generateMethods()` / `refreshMethods()` | `backend/src/services/analysis.service.ts` | 按项目上下文生成候选统计方法（受支持的 methodId 子集 + 目录兜底）；`methodSource` 标记来源 |
| `writeAuthCache()` / `clearAuthStorage()` | `src/store/index.ts`、`src/api/client.ts` | 登录快照本地缓存与清理：刷新瞬间显示已登录、退出/失效彻底清干净 |
| `publishManuscript()` | `backend/src/services/export.service.ts` | 写作页稿件「加入下载中心」：组装全文 + 真实统计 + 刷新导出产物 `a_1` |
| `ensureRevisionPaths()` | `backend/src/services/review.service.ts` | 保证每条评审意见都有对应修改建议（补齐 + 落库），杜绝「点了没内容」 |
| `REWRITE_ACTION_KEY` + `rewriteParagraph(…, instruction?)` | `src/pages/Writing.tsx`、`backend/src/services/writing.service.ts` | 段落动作按真实 action 调接口、支持自定义提示词并就地替换渲染 |
| `<Avatar src text size>` | `src/components/ui.tsx` | 头像统一渲染：有图片用图片，否则回落文字头像（顶栏 / 侧边栏 / 账号设置共用） |
| `fileToAvatarDataUrl(file)` | `src/utils/image.ts` | 本地图片居中裁剪 + 压缩到 256×256 的 data URL（含类型 / 体积校验与 JPEG 退化） |

---

## 四、待办专项：虚假数据与 API 接入 🚧

> 现象：论文写作与数据分析模块展示的仍是写死的示例内容（「研究方法」一项已在本轮改为 AI 生成）。
> 结论：以下两项需要后端 + LLM 侧改动，建议下一轮排期。

### 4.1 论文写作正文（`backend/src/content/payloads.ts::buildWritingPage`）

- **现状**：无论项目是什么，`GET /projects/:projectId/writing` 都返回同一套「社交焦虑与手机依赖」大纲、3 段固定正文与 `paperId: pa_1` 之类的假引用（`syncCitationPool()` 已把 `editorCitations` 换成真实文献，但正文/大纲仍是模板）。
- **建议方案**：
  1. 首次访问时不落库模板正文，改为「空文档 + 待生成」状态，由用户点「按节生成」触发真实生成；
  2. 复用已有 LLM 通道 `tryChatJSON()`（`backend/src/llm/client.ts`）按大纲逐节生成，落库到 `WritingDoc.data.paragraphs`；
  3. `GET /writing` 的 `stats.wordCount / citationCount` 一律按真实正文统计，未生成时返回 0；
  4. 未配置 `LLM_BASE_URL / LLM_API_KEY` 时，明确返回「模板兜底」标记（例如 `dataSource: 'template'`），前端显示「示例内容，未接入模型」角标，不再伪装成真实产出。
- **验收**：新建一个不同选题的项目 → 打开论文写作 → 正文应与该项目标题相关，且能看出是否由模型生成。

### 4.2 数据分析页的上下文数据（`backend/src/services/analysis.service.ts::getAnalysis`）

- **现状**：`healthNotes`、可复现代码片段、`importedFile`（`512 行 × 36 列`）、`dataVersion` 的兜底值、以及 Python 不可用时的 `fallbackResult()` 全部是硬编码；`runAnalysis()` 本身是**真的**在跑 `python/analysis.py`（statsmodels），这部分不需要改。
- **建议方案**：
  1. 健康报告改为由 `python/analysis.py` 的 `op: health` 真实产出（缺失率、异常值、共线性、正态性），落库 `HealthReport`；
  2. `importedFile` / `dataVersion` 一律读 `DataFile` 表，没有数据时返回明确的空状态而不是 `512 × 36`；
  3. `fallbackResult()` 结果必须带 `simulated: true` 并在前端显著标注「模拟结果 · Python 沙箱不可用」，禁止与真实结果同形展示。
- **验收**：未上传数据的项目进入数据分析页 → 应显示「请先上传数据」，而不是一套完整的体检结论。

### 4.3 候选统计方法清单 ✅ 已完成

已于本轮完成，见「二、已修复明细 / 7」：`generateMethods()` 按项目上下文调用大模型生成方法子集，`methodSource` 标记来源，并新增 `POST /projects/:projectId/analysis/methods/refresh` 供用户重新生成。

---

## 五、回归自测清单

1. 未登录直接访问 `/`：应跳转 `/login`，默认「注册」视图。 ✅
2. 注册一个新手机号（非 13800000000）：登录后顶栏昵称应为「用户XXXX」，账号设置显示「未核验」。 ✅
3. 登录 → 账号设置 → 退出登录：回到 `/login`，刷新不出现示例账号。 ✅
4. 选刊 AI：点期刊卡片任意位置切换画像；键盘 Enter 亦可。 ✅
5. 导出中心：刷新后每项已就绪产物均有默认格式；导出走通。 ✅
6. 账号设置 → 通知偏好：「核验失败提醒」为静态「已开启 · 必开」，其余项开关可正常切换。 ✅
7. 论文写作：点大纲章节 → 正文区只显示该节；点无内容的节 → 空状态 + 生成本节 → 生成内容出现在正文区，其他章节不受影响。 ✅
8. 数据分析：卡片头部显示「AI 依据本项目生成」，方法名/摘要贴合本项目选题与假设；点「重新生成」换成新清单并清空已选方法；选中任一方法执行分析可跑通。 ✅
9. 登录后顶栏显示登录用户（刷新页面也保持）；退出登录后顶栏回到「未登录」，且重新打开不会自动登录。 ✅
10. 登录页无「学生认证」卡；账号设置 → 学生认证 未核验时可提交教育邮箱认证，成功后可享学生价与额度。 ✅
11. 写作页点「查看全文」→ 看到带章节小标题的成稿；点「加入下载中心」→ 提示真实「N 节 · M 段 · X 字」；导出中心「论文正文」说明与草稿一致，选 DOCX 可下载含全部章节的稿件。 ✅
12. 评审页：意见卡点「查看修改建议 →」就地展开该条建议；右侧建议项点击后滚动定位到对应意见并展开；末尾「完整 Rebuttal 草稿」可生成完整回复信并真实复制；右栏不再有「生成完整 Rebuttal 草稿」按钮。 ✅
13. 写作页段落操作：选中段落 → 点「缩写 / 扩写 / 重写 / 学术化改写」→ 该段文字被真实替换；填自定义提示词后「按提示词改写」生效；方法章节不可选中。 ✅
14. 账号设置：上传本地图片作为头像 → 头像立即变成图片、顶栏与侧边栏同步、刷新后保留；「移除头像」恢复文字头像。 ✅
