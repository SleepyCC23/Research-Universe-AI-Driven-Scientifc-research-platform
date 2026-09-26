# 逐页变量总表（机械提取，防遗漏）

> 生成方式：`node tools/gen-variable-map.js` —— 从源码提取，**不是手写清单**，所以不会漏页。
> 用途：交接另一位开发时，逐页确认「数据从哪来、载荷长什么样、状态放哪」。
> 配套文档：`docs/API.md`（接口契约）、`docs/VARIABLES.md`（字段中文名与枚举）、
> `backend-readiness.md`（后端待补清单）、`docs/COPY-SPEC.md`（文案规范）。

## 一、汇总

| 指标 | 数量 |
| --- | --- |
| 页面文件 | 18 |
| 已登记接口 | 93 |
| 页面已调用的接口 | 77 |
| **未在任何页面调用的接口** | 12 |
| 整页没有调接口的页面（需确认是否遗漏） | 1 |
| 从 `@/mocks/db` 直连静态文案的页面 | 7 |

## 二、逐页清单

| 页面文件 | 调用的接口（真实路径） | 载荷类型 | 全局状态 |
| --- | --- | --- | --- |
| `pages/AccountSettings.tsx` | `DELETE /me`<br>`GET /me/account`<br>`POST /auth/logout`<br>`POST /me/data-export`<br>`POST /me/devices/revoke-others`<br>`POST /me/student-verification`<br>`PATCH /me`<br>`PATCH /me/notifications`<br>`PATCH /me/privacy` | `AccountSettings` `string` | `useAuthStore` `useUiStore` |
| `pages/Analysis.tsx` | `GET /projects/:projectId/analysis`<br>`GET /projects/:projectId/analysis/runs/:runId`<br>`pollTask`<br>`POST /projects/:projectId/analysis/run` | `AnalysisPageData` `string` | `useAnalysisStore` `useUiStore` |
| `pages/ExportCenter.tsx` | `POST /projects/:projectId/export/confirm-unverified`<br>`POST /projects/:projectId/export/artifacts`<br>`GET /projects/:projectId/export`<br>`POST /projects/:projectId/export/disclosure`<br>`POST /projects/:projectId/export/upload-pdf` | `ExportPageData` `string` | `useExportStore` `useUiStore` |
| `pages/IntroDataUpload.tsx` | `GET /projects/:projectId/data/upload`<br>`GET /projects/:projectId/compliance`<br>`POST /projects/:projectId/data/import-public`<br>`POST /projects/:projectId/data/sample/:sampleId`<br>`DELETE /projects/:projectId/data/files/:fileId`<br>`PATCH /projects/:projectId/data-level`<br>`PATCH /projects/:projectId/skip-confirm`<br>`POST /projects/:projectId/data/files` | `DataUploadData` `string` | `useDataFlowStore` `useSettingsStore` `useUiStore` |
| `pages/IntroHotspot.tsx` | `POST /projects/:projectId/intro/hotspot/analyze`<br>`POST /projects/:projectId/intro/confirm-direction`<br>`GET /projects/:projectId/intro/hotspot` | `HotspotPageData` `string` | `useUiStore` |
| `pages/IntroHypotheses.tsx` | `POST /projects/:projectId/data/hypotheses/confirm`<br>`GET /projects/:projectId/data/hypotheses`<br>`POST /projects/:projectId/data/hypotheses/generate` | `HypothesisPageData` `string` | `useDataFlowStore` `useUiStore` |
| `pages/IntroTopicKeywords.tsx` | `POST /projects/:projectId/intro/topic/keywords/analyze`<br>`GET /projects/:projectId/intro/topic/keywords` | `TopicKeywordData` `string` | `useUiStore` |
| `pages/IntroTopicTheory.tsx` | `GET /projects/:projectId/intro/topic/theory`<br>`POST /projects/:projectId/intro/topic/theory/select` | `TopicTheoryData` `string` | `useUiStore` |
| `pages/IntroVariables.tsx` | `POST /projects/:projectId/data/variables/confirm`<br>`GET /projects/:projectId/data/variables`<br>`PATCH /projects/:projectId/data/variables/:varName` | `VariableIdentifyData` `string` | `useDataFlowStore` `useUiStore` |
| `pages/Journal.tsx` | `GET /journals/:journalId/profile`<br>`GET /projects/:projectId/journals`<br>`POST /projects/:projectId/submission-package`<br>`POST /projects/:projectId/journals/match` | `JournalPageData` `JournalProfile` `string` | `useUiStore` |
| `pages/Literature.tsx` | `POST /projects/:projectId/kb/qa`<br>`POST /projects/:projectId/literature/bring-to-writing`<br>`GET /projects/:projectId/literature`<br>`GET /projects/:projectId/compliance`<br>`POST /projects/:projectId/literature/generate-review`<br>`pollTask`<br>`POST /projects/:projectId/literature/search`<br>`POST /projects/:projectId/literature/selection`<br>`PATCH /projects/:projectId/skip-confirm`<br>`POST /projects/:projectId/literature/upload` | `LiteraturePageData` `string` | `useSettingsStore` `useUiStore` |
| `pages/Login.tsx` | `POST /auth/login`<br>`POST /auth/sms-code`<br>`POST /me/student-verification` | — | `useAuthStore` `useUiStore` |
| `pages/NotFound.tsx` | **（无）** | — | — |
| `pages/Pricing.tsx` | `POST /me/plan`<br>`GET /plans` | — | `useAuthStore` `useUiStore` |
| `pages/ProjectSettings.tsx` | `GET /projects/:projectId/settings`<br>`POST /projects/:projectId/members/invite`<br>`POST /projects/:projectId/versions/:versionNo/rollback`<br>`PATCH /projects/:projectId/data-level`<br>`PATCH /projects/:projectId` | `ProjectSettingsData` `string` | `useSettingsStore` `useUiStore` |
| `pages/Review.tsx` | `GET /projects/:projectId/review`<br>`POST /projects/:projectId/review/rebuttal`<br>`PATCH /projects/:projectId/review/issues/:issueId`<br>`POST /projects/:projectId/review/recalibrate` | `ReviewPageData` `string` | `useReviewStore` `useUiStore` |
| `pages/Workspace.tsx` | `POST /projects`<br>`GET /projects/ddl`<br>`GET /projects/ddl-keywords`<br>`GET /projects/:projectId/progress`<br>`GET /projects`<br>`GET /projects/:projectId/stage-artifacts`<br>`PATCH /projects/:projectId/ddl-keyword` | `StageArtifactsPayload` `string` | `useAuthStore` `useProjectStore` `useUiStore` |
| `pages/Writing.tsx` | `POST /projects/:projectId/writing/ai-suggestion/adopt`<br>`POST /integrations/zotero/bind`<br>`GET /projects/:projectId/writing`<br>`POST /projects/:projectId/writing/outline/generate`<br>`POST /projects/:projectId/writing/citation`<br>`POST /projects/:projectId/writing/section/regenerate`<br>`POST /projects/:projectId/writing/paragraph/rewrite`<br>`PATCH /projects/:projectId/writing/doc` | `WritingPageData` `number` `string` | `useUiStore` `useWritingStore` |

## 三、需要人工确认的三张清单

### 3.1 整页没有调接口的页面（防遗漏）
- `pages/NotFound.tsx`

> 判定口径：这些页面若确实只做展示且数据来自父级/路由，属正常；
> 若应展示业务数据却没有任何 `api.` 调用，说明**变量没接上**，需要补接口。

### 3.2 从 `@/mocks/db` 直连的页面（应仅限静态文案）
- `pages/ExportCenter.tsx`
- `pages/IntroDataUpload.tsx`
- `pages/IntroHypotheses.tsx`
- `pages/IntroTopicTheory.tsx`
- `pages/IntroVariables.tsx`
- `pages/Pricing.tsx`
- `pages/Review.tsx`

> 合规要求：页面只允许取**静态文案/枚举字典**，业务数据一律走接口层。
> 交接时请逐个确认这些 import 的符号确实是文案，不是业务数据。

### 3.3 全站无调用的接口（需逐条确认：预留 or 漏接）
- `GET /projects/:projectId/analysis/health-report`（`fetchHealthReport`）
- `GET /me`（`fetchMe`）
- `GET /projects/:projectId/analysis/methods`（`fetchMethods`）
- `GET /projects/:projectId`（`fetchProject`）
- `GET /me/quota`（`fetchQuota`）
- `GET /me/student-verification`（`fetchStudentVerification`）
- `GET /tasks/:taskId`（`fetchTask`）
- `GET /integrations/zotero/status`（`fetchZoteroStatus`）
- `POST /projects/:projectId/analysis/import`（`importProjectData`）
- `POST /projects/:projectId/intro/topic/keywords/lock`（`lockConcepts`）
- `POST /projects/:projectId/analysis/rollback`（`rollbackVersion`）
- `POST /projects/:projectId/literature/verify`（`verifyLiterature`）

> 这是**扫过 src 全量文件**（pages + components + hooks + store）后的结果，可信度高于只看页面。
> 若某接口出现在这里：要么是设计稿里有但还没做的功能（预留），要么是**应调未调的漏洞**，请逐条判定。

### 3.4 页面里没调、但由公共组件/钩子调用的接口（正常）
- `GET /me/notifications`（`fetchNotifications`）
- `GET /projects/:projectId/steps/:stepKey/draft`（`fetchStepDraft`）
- `POST /me/notifications/read`（`markNotificationsRead`）
- `PATCH /projects/:projectId/progress`（`saveProjectProgress`）
- `PATCH /projects/:projectId/steps/:stepKey/draft`（`saveStepDraft`）

> 典型：顶栏/侧边栏取通知与额度、全局任务弹窗轮询任务、步骤草稿钩子（src/hooks/useStepDraft.ts）。

## 四、接口总表（93 个）

| 函数 | 路径 |
| --- | --- |
| `adoptSuggestion` | `POST /projects/:projectId/writing/ai-suggestion/adopt` |
| `analyzeHotspot` | `POST /projects/:projectId/intro/hotspot/analyze` |
| `analyzeTopicKeywords` | `POST /projects/:projectId/intro/topic/keywords/analyze` |
| `askKnowledgeBase` | `POST /projects/:projectId/kb/qa` |
| `bindZotero` | `POST /integrations/zotero/bind` |
| `bringToWriting` | `POST /projects/:projectId/literature/bring-to-writing` |
| `changePlan` | `POST /me/plan` |
| `confirmDirection` | `POST /projects/:projectId/intro/confirm-direction` |
| `confirmHypotheses` | `POST /projects/:projectId/data/hypotheses/confirm` |
| `confirmUnverifiedExport` | `POST /projects/:projectId/export/confirm-unverified` |
| `confirmVariables` | `POST /projects/:projectId/data/variables/confirm` |
| `createProject` | `POST /projects` |
| `deleteAccount` | `DELETE /me` |
| `exportArtifacts` | `POST /projects/:projectId/export/artifacts` |
| `fetchAccountSettings` | `GET /me/account` |
| `fetchAllDdlTimeline` | `GET /projects/ddl` |
| `fetchAnalysis` | `GET /projects/:projectId/analysis` |
| `fetchAnalysisResult` | `GET /projects/:projectId/analysis/runs/:runId` |
| `fetchDataUpload` | `GET /projects/:projectId/data/upload` |
| `fetchDdlKeywords` | `GET /projects/ddl-keywords` |
| `fetchExportCenter` | `GET /projects/:projectId/export` |
| `fetchHealthReport` | `GET /projects/:projectId/analysis/health-report` |
| `fetchHotspot` | `GET /projects/:projectId/intro/hotspot` |
| `fetchHypotheses` | `GET /projects/:projectId/data/hypotheses` |
| `fetchJournalProfile` | `GET /journals/:journalId/profile` |
| `fetchJournals` | `GET /projects/:projectId/journals` |
| `fetchLiterature` | `GET /projects/:projectId/literature` |
| `fetchMe` | `GET /me` |
| `fetchMethods` | `GET /projects/:projectId/analysis/methods` |
| `fetchNotifications` | `GET /me/notifications` |
| `fetchPlans` | `GET /plans` |
| `fetchProject` | `GET /projects/:projectId` |
| `fetchProjectCompliance` | `GET /projects/:projectId/compliance` |
| `fetchProjectProgress` | `GET /projects/:projectId/progress` |
| `fetchProjectSettings` | `GET /projects/:projectId/settings` |
| `fetchProjects` | `GET /projects` |
| `fetchQuota` | `GET /me/quota` |
| `fetchReview` | `GET /projects/:projectId/review` |
| `fetchStageArtifacts` | `GET /projects/:projectId/stage-artifacts` |
| `fetchStepDraft` | `GET /projects/:projectId/steps/:stepKey/draft` |
| `fetchStudentVerification` | `GET /me/student-verification` |
| `fetchTask` | `GET /tasks/:taskId` |
| `fetchTopicKeywords` | `GET /projects/:projectId/intro/topic/keywords` |
| `fetchTopicTheory` | `GET /projects/:projectId/intro/topic/theory` |
| `fetchVariables` | `GET /projects/:projectId/data/variables` |
| `fetchWriting` | `GET /projects/:projectId/writing` |
| `fetchZoteroStatus` | `GET /integrations/zotero/status` |
| `generateDisclosure` | `POST /projects/:projectId/export/disclosure` |
| `generateHypotheses` | `POST /projects/:projectId/data/hypotheses/generate` |
| `generateOutline` | `POST /projects/:projectId/writing/outline/generate` |
| `generateRebuttal` | `POST /projects/:projectId/review/rebuttal` |
| `generateStructuredReview` | `POST /projects/:projectId/literature/generate-review` |
| `generateSubmissionPackage` | `POST /projects/:projectId/submission-package` |
| `handleReviewIssue` | `PATCH /projects/:projectId/review/issues/:issueId` |
| `importProjectData` | `POST /projects/:projectId/analysis/import` |
| `importPublicDataset` | `POST /projects/:projectId/data/import-public` |
| `insertCitation` | `POST /projects/:projectId/writing/citation` |
| `inviteMember` | `POST /projects/:projectId/members/invite` |
| `loadSampleDataset` | `POST /projects/:projectId/data/sample/:sampleId` |
| `lockConcepts` | `POST /projects/:projectId/intro/topic/keywords/lock` |
| `login` | `POST /auth/login` |
| `logout` | `POST /auth/logout` |
| `markNotificationsRead` | `POST /me/notifications/read` |
| `recalibrateReview` | `POST /projects/:projectId/review/recalibrate` |
| `regenerateSection` | `POST /projects/:projectId/writing/section/regenerate` |
| `rematchJournals` | `POST /projects/:projectId/journals/match` |
| `removeDataFile` | `DELETE /projects/:projectId/data/files/:fileId` |
| `requestDataExport` | `POST /me/data-export` |
| `revokeOtherDevices` | `POST /me/devices/revoke-others` |
| `rewriteParagraph` | `POST /projects/:projectId/writing/paragraph/rewrite` |
| `rollbackProjectVersion` | `POST /projects/:projectId/versions/:versionNo/rollback` |
| `rollbackVersion` | `POST /projects/:projectId/analysis/rollback` |
| `runAnalysis` | `POST /projects/:projectId/analysis/run` |
| `saveProjectProgress` | `PATCH /projects/:projectId/progress` |
| `saveStepDraft` | `PATCH /projects/:projectId/steps/:stepKey/draft` |
| `saveWritingDoc` | `PATCH /projects/:projectId/writing/doc` |
| `searchLiterature` | `POST /projects/:projectId/literature/search` |
| `selectTheory` | `POST /projects/:projectId/intro/topic/theory/select` |
| `sendSmsCode` | `POST /auth/sms-code` |
| `submitStudentVerification` | `POST /me/student-verification` |
| `updateDataLevel` | `PATCH /projects/:projectId/data-level` |
| `updateDdlKeyword` | `PATCH /projects/:projectId/ddl-keyword` |
| `updateMe` | `PATCH /me` |
| `updateNotificationPrefs` | `PATCH /me/notifications` |
| `updatePrivacy` | `PATCH /me/privacy` |
| `updateProject` | `PATCH /projects/:projectId` |
| `updateSelection` | `POST /projects/:projectId/literature/selection` |
| `updateSkipConfirm` | `PATCH /projects/:projectId/skip-confirm` |
| `updateVariable` | `PATCH /projects/:projectId/data/variables/:varName` |
| `uploadDataFile` | `POST /projects/:projectId/data/files` |
| `uploadLiterature` | `POST /projects/:projectId/literature/upload` |
| `uploadVerifyPdf` | `POST /projects/:projectId/export/upload-pdf` |
| `verifyLiterature` | `POST /projects/:projectId/literature/verify` |

---

## 五、交接阅读顺序建议

1. `README.md` —— 环境、依赖、启动命令；
2. 本文件 —— 逐页变量总表（先建立全局印象）；
3. `docs/API.md` —— 逐个接口的入参/出参契约；
4. `docs/VARIABLES.md` —— 字段的中文名、枚举值、命名对照；
5. `backend-readiness.md` —— 后端**尚未提供**的接口与变量清单（开工前先看这份）；
6. `docs/COPY-SPEC.md` / `design-review.md` —— 文案规范与已知设计问题清单。
