/**
 * 静态目录与字典（套餐 / 额度项 / 统计方法库 / 期刊库 / 合规文案 / 选项）
 * 这些是「配置」而非业务数据，集中在此，便于运营与合规版本化管理。
 */

export const MAJOR_OPTIONS = ['心理学', '教育学', '社会学', '医学', '管理学', '计算机', '经济学', '传播学']
export const GRADE_OPTIONS = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士']

export const BRAND_POINTS = [
  '引用可溯源：每条论断都指回原文',
  '分析可复现：一键导出可运行代码',
  '过程可交代：AI 使用留痕，导出披露报告',
]

export const PLANS = [
  {
    planId: 'student',
    name: '学生版',
    subtitle: '适合硕士 / 青年科研人员',
    price: 0,
    priceUnit: 'month',
    currency: 'CNY',
    highlights: ['文献检索与核验（每月 30 次）', '沙箱分析 300 分钟', '结构化综述 20 次', '导出含 AI 披露报告'],
    recommendedFor: '在读学生（需通过学生认证）',
  },
  {
    planId: 'pro',
    name: '专业版',
    subtitle: '适合博士 / 青年教师 / 独立研究者',
    price: 68,
    priceUnit: 'month',
    currency: 'CNY',
    highlights: ['文献检索与核验不限次', '沙箱分析 1200 分钟', '结构化综述 200 次', '优先算力队列', 'Zotero 双向同步'],
    mostPopular: true,
    recommendedFor: '高频写作与投稿需求',
  },
  {
    planId: 'team',
    name: '团队版',
    subtitle: '适合课题组 / 实验室',
    price: 39,
    priceUnit: 'monthPerMember',
    currency: 'CNY',
    highlights: ['成员席位与共享项目', '数据分级与合规留痕', '统一披露报告模板', '团队额度池'],
    recommendedFor: '3 人及以上的课题组',
  },
]

export const QUOTA_ITEMS = [
  { key: 'reviewGenerate', label: '结构化综述生成', student: '20 次 / 月', pro: '200 次 / 月', team: '团队池' },
  { key: 'verify', label: '文献核验', student: '30 次 / 月', pro: '不限次', team: '团队池' },
  { key: 'sandboxMinutes', label: '沙箱分析时长', student: '300 分钟 / 月', pro: '1200 分钟 / 月', team: '团队池' },
  { key: 'export', label: '产物导出', student: '50 次 / 月', pro: '不限次', team: '团队池' },
]

export const OVERAGE_TEXT = {
  title: '额度用尽后怎么处理',
  items: [
    '默认「限流」：额度用尽后相关功能暂停至下个计费周期重置，不影响已有成果。',
    '可切换「按量付费」：超出部分按次计费，在账单中单独列出。',
    '团队版按团队额度池统一扣减，成员之间共享。',
  ],
}

/** 通知偏好模板（核验失败为合规必开项） */
export const NOTIFICATION_PREF_TEMPLATE = [
  { key: 'verifyFailed', label: '核验失败提醒', description: '文献 DOI 或内容核验未通过时通知', enabled: true, mandatory: true },
  { key: 'ddlReminder', label: 'DDL 提醒', description: '开题 / 中期 / 投稿等硬节点临近时提醒', enabled: true, mandatory: false },
  { key: 'taskDone', label: '任务完成通知', description: '沙箱分析、综述生成等长任务完成后通知', enabled: true, mandatory: false },
  { key: 'weeklyReport', label: '每周进度简报', description: '每周一发送项目进度与待办摘要', enabled: false, mandatory: false },
  { key: 'productUpdate', label: '产品更新', description: '新功能与活动通知', enabled: false, mandatory: false },
]

/** 数据分级卡片（合规文案） */
export const DATA_LEVEL_CARDS = [
  {
    level: 'L0',
    name: '完全公开数据',
    description: '来自公共数据库或本人已公开发布的数据，可自由用于分析与分享。',
    rules: ['可一键直连导入公共库', '导出与分享不受限', '不涉及个人隐私信息'],
  },
  {
    level: 'L1',
    name: '受控脱敏数据',
    description: '含脱敏处理后的个人数据（如问卷），仅项目成员可见。',
    rules: ['上传即自动检测敏感字段', '导出需勾选披露声明', '禁止进入公共训练集'],
  },
  {
    level: 'L2',
    name: '敏感原始数据',
    description: '含可识别个人信息或伦理审查要求严格的原始数据。',
    rules: ['强制逐条确认（禁用 YOLO）', '禁止导入外部原行数据', '导出会被阻断直至合规校验通过'],
  },
]

export const DATA_SAFETY_NOTES = [
  '上传前请确认已获得伦理审查与数据使用授权。',
  '含可识别个人信息的数据请选择 L2，系统将强制逐条确认。',
  '所有上传文件仅项目成员可见，传输使用 TLS 1.3、落盘使用 AES-256。',
]

export const DATA_SECURITY_TAGS = ['TLS 1.3', 'AES-256', '项目内可见']

export const SENSITIVE_DETECT_TEXT = '检测到疑似敏感字段（姓名 / 手机号 / 身份证），已自动标记并按所选级别处理。'

export const DATA_LEVEL_OPTIONS_META = [
  { level: 'L0', name: '完全公开数据' },
  { level: 'L1', name: '受控脱敏数据' },
  { level: 'L2', name: '敏感原始数据' },
]

/** 变量角色中英映射 */
export const ROLE_LABEL_MAP: Record<string, string> = {
  dependent: '因变量',
  independent: '自变量',
  mediator: '中介变量',
  moderator: '调节变量',
  control: '控制变量',
  resultCandidate: '结果变量候选',
}

/** 评审意见类型元数据 */
export const REVIEW_TYPE_META = {
  hard: { label: '硬伤', color: 'danger', order: 1 },
  dispute: { label: '争议', color: 'warn', order: 2 },
  style: { label: '风格', color: 'info', order: 3 },
}

export const ETHICS_NOTES = [
  '假设必须能由数据中的真实变量检验，禁止编造变量。',
  '分析结论需标注样本来源与局限，不得过度外推。',
  '涉及人类被试的研究须提供伦理审查声明。',
  'AI 生成内容须按目标期刊政策披露使用范围。',
]

export const EXPORT_FOOTNOTE =
  '本导出包含《AI 工具使用情况说明》与可复现代码，可用于投稿附件的可重复性声明。请在提交前确认目标期刊的 AI 使用政策。'

export const REWRITE_ACTIONS = ['重写', '缩写', '扩写', '学术化改写']

/** 数据分析候选方法库 */
export const ANALYSIS_METHODS = [
  {
    methodId: 'hierarchical',
    name: '分层回归（Hierarchical Regression）',
    recommended: true,
    summary: '按理论层次依次纳入控制变量、自变量、交互项，观察 R² 增量与系数显著性。',
    prerequisites: '连续 / 有序因变量；自变量间不存在严重多重共线性（VIF < 5）。',
    pros: '解释直观、可展示每一步的增量贡献，审稿人熟悉。',
    cons: '对异常值敏感；无法处理潜变量测量误差。',
    robustnessImpact: '配合 Winsorize 与 Bootstrap 可检验结论稳健性。',
    checklist: '① 缺失值处理 ② 变量中心化 ③ VIF 诊断 ④ 残差正态性',
    licenseNote: 'statsmodels（BSD-3）',
    /** 该方法的可复现代码（与 backend/python/analysis.py 的实现一一对应） */
    code: {
      python:
        '# 分层回归（可复现）\nimport pandas as pd, statsmodels.api as sm\ndf = pd.read_spss("survey_social_anxiety.sav")\nm1 = sm.OLS(df["phone_dependence"], sm.add_constant(df[["social_anxiety"]])).fit()\nm2 = sm.OLS(df["phone_dependence"], sm.add_constant(df[["social_anxiety", "loneliness", "self_control"]])).fit()\nprint(m1.rsquared, m2.rsquared)  # 报告 ΔR² 与各层 β',
      r: '# 分层回归（可复现）\nlibrary(haven)\ndf <- read_sav("survey_social_anxiety.sav")\nm1 <- lm(phone_dependence ~ social_anxiety, data = df)\nm2 <- lm(phone_dependence ~ social_anxiety + loneliness + self_control, data = df)\nsummary(m2); anova(m1, m2)  # ΔR² 与 F 检验',
    },
  },
  {
    methodId: 'mediation',
    name: 'Bootstrap 中介效应（5000 次重抽样）',
    recommended: true,
    summary: '估计间接效应 ab 的偏差校正置信区间，判断中介是否成立。',
    prerequisites: '样本量 ≥ 200；自变量、中介、因变量均为连续变量。',
    pros: '不依赖正态假设，间接效应区间估计更稳健。',
    cons: '计算耗时随重抽样次数上升。',
    robustnessImpact: '替换重抽样次数与随机种子检验区间稳定性。',
    checklist: '① 三步法路径系数 ② Bootstrap 区间不含 0 ③ 中介比例报告',
    licenseNote: 'statsmodels + scikit-learn（BSD-3）',
    /** 该方法的可复现代码（与 backend/python/analysis.py 的实现一一对应） */
    code: {
      python:
        '# Bootstrap 中介效应（5000 次重抽样，seed=42）\nimport numpy as np, pandas as pd, statsmodels.api as sm\ndf = pd.read_spss("survey_social_anxiety.sav")\n\ndef paths(d):\n    a = sm.OLS(d["loneliness"], sm.add_constant(d[["social_anxiety"]])).fit().params["social_anxiety"]\n    b = sm.OLS(d["phone_dependence"], sm.add_constant(d[["social_anxiety", "loneliness"]])).fit().params["loneliness"]\n    return a * b\n\nrng = np.random.default_rng(42)\nboots = [paths(df.iloc[rng.choice(len(df), len(df), replace=True)]) for _ in range(5000)]\nprint(paths(df), np.percentile(boots, [2.5, 97.5]))  # 间接效应 ab 及其 95% CI',
      r: '# Bootstrap 中介效应（5000 次重抽样）\nlibrary(haven); library(mediation)\ndf <- read_sav("survey_social_anxiety.sav")\nmed.fit <- lm(loneliness ~ social_anxiety, data = df)\nout.fit <- lm(phone_dependence ~ social_anxiety + loneliness, data = df)\nres <- mediate(med.fit, out.fit, treat = "social_anxiety", mediator = "loneliness", boot = TRUE, sims = 5000)\nsummary(res)  # ACME / ADE / 总效应',
    },
  },
  {
    methodId: 'moderation',
    name: '调节效应（交互项回归）',
    recommended: false,
    summary: '纳入自变量 × 调节变量交互项，检验调节变量对关系强度的影响。',
    prerequisites: '调节变量为连续或分类；需对连续变量中心化。',
    pros: '可直接回答「何时更强 / 更弱」的研究问题。',
    cons: '交互项易与主效应共线，需谨慎解释。',
    robustnessImpact: '简单斜率分析 + Johnson-Neyman 区间。',
    checklist: '① 中心化 ② 交互项显著性 ③ 简单斜率图',
    licenseNote: 'statsmodels（BSD-3）',
    /** 该方法的可复现代码（与 backend/python/analysis.py 的实现一一对应） */
    code: {
      python:
        '# 调节效应：交互项回归（连续变量先中心化）\nimport pandas as pd, statsmodels.api as sm\ndf = pd.read_spss("survey_social_anxiety.sav")\ndf["x_c"] = df["social_anxiety"] - df["social_anxiety"].mean()\ndf["w_c"] = df["self_control"] - df["self_control"].mean()\ndf["inter"] = df["x_c"] * df["w_c"]\nfit = sm.OLS(df["phone_dependence"], sm.add_constant(df[["x_c", "w_c", "inter"]])).fit()\nprint(fit.params["inter"], fit.conf_int().loc["inter"], fit.rsquared)',
      r: '# 调节效应：交互项回归 + 简单斜率\nlibrary(haven); library(emmeans)\ndf <- read_sav("survey_social_anxiety.sav")\ndf$x_c <- scale(df$social_anxiety, scale = FALSE)\ndf$w_c <- scale(df$self_control, scale = FALSE)\nfit <- lm(phone_dependence ~ x_c * w_c, data = df)\nsummary(fit); emtrends(fit, ~ w_c, var = "x_c")  # 简单斜率',
    },
  },
  {
    methodId: 'sem',
    name: '结构方程模型（SEM）',
    recommended: false,
    summary: '同时估计测量模型与结构模型，适合含潜变量的复杂假设。',
    prerequisites: '每个潜变量 ≥ 3 个指标；样本量 ≥ 300。',
    pros: '可校正测量误差，模型整体拟合指标丰富。',
    cons: '对样本量与模型设定敏感，收敛问题较多。',
    robustnessImpact: '比较 CFI / RMSEA / SRMR 的稳定性。',
    checklist: '① 测量模型拟合 ② 区分效度 ③ 结构路径',
    licenseNote: 'semopy（MIT）',
    /** 该方法的可复现代码（与 backend/python/analysis.py 的实现一一对应） */
    code: {
      python:
        '# 结构方程模型（semopy）\nimport pandas as pd, semopy\ndf = pd.read_spss("survey_social_anxiety.sav")\nmodel = """\nloneliness ~ social_anxiety\nphone_dependence ~ social_anxiety + loneliness\n"""\nfit = semopy.Model(model).fit(df)\nprint(semopy.calc_stats(fit).T)  # CFI / RMSEA / SRMR',
      r: '# 结构方程模型（lavaan）\nlibrary(haven); library(lavaan)\ndf <- read_sav("survey_social_anxiety.sav")\nfit <- sem("loneliness ~ social_anxiety\n            phone_dependence ~ social_anxiety + loneliness", data = df)\nsummary(fit, fit.measures = TRUE, standardized = TRUE)',
    },
  },
  {
    methodId: 'multiLevel',
    name: '多层线性模型（HLM）',
    recommended: false,
    summary: '处理嵌套数据（如学生嵌套于班级），估计跨层效应。',
    prerequisites: '明确的分层结构与足够的组数（≥ 30 组）。',
    pros: '正确处理非独立性，避免标准误低估。',
    cons: '模型设定与解释门槛较高。',
    robustnessImpact: '比较随机截距 / 随机斜率模型的拟合差异。',
    checklist: '① 组内相关系数 ICC ② 随机效应 ③ 跨层交互',
    licenseNote: 'statsmodels MixedLM（BSD-3）',
    /** 该方法的可复现代码（与 backend/python/analysis.py 的实现一一对应） */
    code: {
      python:
        '# 多层线性模型（HLM，处理嵌套数据）\nimport pandas as pd, statsmodels.api as sm\ndf = pd.read_spss("survey_social_anxiety.sav")\nm0 = sm.MixedLM.from_formula("phone_dependence ~ 1", groups="class_id", data=df).fit()\nm1 = sm.MixedLM.from_formula("phone_dependence ~ social_anxiety + self_control", groups="class_id", data=df).fit()\nprint(m0.cov_re, m1.summary())  # 先看 ICC，再解释固定效应',
      r: '# 多层线性模型（lme4）\nlibrary(haven); library(lme4)\ndf <- read_sav("survey_social_anxiety.sav")\nm0 <- lmer(phone_dependence ~ 1 + (1 | class_id), data = df)\nm1 <- lmer(phone_dependence ~ social_anxiety + self_control + (1 | class_id), data = df)\nVarCorr(m0); summary(m1)  # 组内相关系数 ICC',
    },
  },
]

/** 分析可导入格式 */
export const ANALYSIS_IMPORT_FORMATS = ['CSV', 'XLSX', 'SPSS(.sav)', 'Stata(.dta)']

/** 支持的文献/数据上传格式 */
export const DATA_SUPPORTED_FORMATS = ['CSV', 'XLSX', 'SPSS(.sav)', 'Stata(.dta)']
export const MAX_FILE_SIZE_MB = 100

/** 公共数据集（用于上传页公共库） */
export const PUBLIC_DATASETS = [
  {
    datasetId: 'ds_cfps',
    name: 'CFPS 中国家庭追踪调查',
    level: 'L0',
    accessAction: 'directImport',
    accessActionText: '一键直连导入',
    accessCondition: '公开数据，需遵守引用规范',
    citationRequirement: '引用：CFPS 官方数据说明',
    subjectTags: ['社会学', '经济学'],
  },
  {
    datasetId: 'ds_clds',
    name: 'CLDS 中国劳动力动态调查',
    level: 'L0',
    accessAction: 'directImport',
    accessActionText: '一键直连导入',
    accessCondition: '公开数据，需遵守引用规范',
    citationRequirement: '引用：CLDS 官方数据说明',
    subjectTags: ['社会学', '劳动经济'],
  },
  {
    datasetId: 'ds_charls',
    name: 'CHARLS 中国健康与养老追踪调查',
    level: 'L1',
    accessAction: 'applyBySelf',
    accessActionText: '需自行申请',
    accessCondition: '需在官网申请账号并同意使用协议',
    citationRequirement: '引用：CHARLS 官方数据说明',
    subjectTags: ['医学', '公共卫生'],
  },
]

export const SAMPLE_DATASETS = [
  { sampleId: 'sample_1', title: '示例：青少年手机依赖问卷（N=512）', metaText: 'SPSS 数据 · 512 行 × 36 列 · 含中介变量' },
  { sampleId: 'sample_2', title: '示例：大学生睡眠与短视频使用（ESM）', metaText: 'CSV · 860 行 × 24 列 · 纵向追踪' },
]

/** 期刊库（用于选刊匹配的候选池） */
export const JOURNAL_LIBRARY = [
  {
    journalId: 'j_chb',
    name: 'Computers in Human Behavior',
    indexText: 'JCR Q1 · 中科院 1 区 · IF 9.0 · Elsevier',
    partition: 'JCR Q1 / 中科院 1 区',
    reviewCycle: '约 6–8 周',
    reviewCycleSource: '期刊官网 2025 年数据',
    acceptanceRate: '约 12%',
    acceptanceSource: '期刊年报 2024',
    apc: '约 3,500 USD（可选开放获取）',
    databases: 'SSCI / Scopus',
    formatRequirement: 'APA 7 · 结构化摘要 · 图表分辨率 ≥ 300dpi',
    aiPolicy: {
      level: '须披露',
      allows: '允许用于语言润色与结构建议',
      forbids: '禁止将 AI 列为作者',
      requires: '需在方法或致谢中说明 AI 使用范围',
      sourceText: '出版社 AI 政策（2024 版）',
    },
  },
  {
    journalId: 'j_cbsn',
    name: 'Cyberpsychology, Behavior, and Social Networking',
    indexText: 'JCR Q2 · 中科院 2 区 · IF 4.2 · Mary Ann Liebert',
    partition: 'JCR Q2 / 中科院 2 区',
    reviewCycle: '约 4–6 周',
    reviewCycleSource: '期刊官网 2025 年数据',
    acceptanceRate: '约 18%',
    acceptanceSource: '期刊年报 2024',
    apc: '约 2,900 USD',
    databases: 'SSCI / Scopus',
    formatRequirement: 'APA 7 · 关键词 5 个以内',
    aiPolicy: {
      level: '须披露',
      allows: '允许语言润色',
      forbids: '禁止生成研究结论',
      requires: '需在投稿信说明',
      sourceText: '出版社 AI 政策（2024 版）',
    },
  },
  {
    journalId: 'j_jad',
    name: 'Journal of Affective Disorders',
    indexText: 'JCR Q1 · 中科院 2 区 · IF 4.9 · Elsevier',
    partition: 'JCR Q1 / 中科院 2 区',
    reviewCycle: '约 5–7 周',
    reviewCycleSource: '期刊官网 2025 年数据',
    acceptanceRate: '约 20%',
    acceptanceSource: '期刊年报 2024',
    apc: '约 3,200 USD',
    databases: 'SCIE / Scopus',
    formatRequirement: 'IMRaD 结构 · 统计报告须含效应量',
    aiPolicy: {
      level: '须披露',
      allows: '允许语言润色与文献整理',
      forbids: '禁止 AI 作者',
      requires: '需在方法中说明',
      sourceText: '出版社 AI 政策（2024 版）',
    },
  },
  {
    journalId: 'j_xlxb',
    name: '心理学报（Acta Psychologica Sinica）',
    indexText: 'CSSCI · 中文核心 · 心理学权威期刊',
    partition: 'CSSCI / 中文核心',
    reviewCycle: '约 8–12 周',
    reviewCycleSource: '编辑部说明',
    acceptanceRate: '约 8%',
    acceptanceSource: '编辑部说明',
    apc: '不收取版面费',
    databases: 'CSSCI / 北大核心',
    formatRequirement: '中文 · GB/T 7714 参考文献',
    aiPolicy: {
      level: '须披露',
      allows: '允许辅助润色',
      forbids: '禁止用于生成核心论证',
      requires: '需在文中说明',
      sourceText: '编辑部 2024 年公告',
    },
  },
]

/** 投稿前检查清单模板 */
export const SUBMISSION_CHECK_TEMPLATE = [
  { checkId: 'ck_format', text: '格式符合目标期刊要求（结构 / 字数 / 图表）', passed: true, pendingText: '' },
  { checkId: 'ck_citation', text: '参考文献格式统一且与正文引用一致', passed: true, pendingText: '' },
  { checkId: 'ck_ethic', text: '含伦理审查与知情同意声明', passed: false, pendingText: '伦理声明待补' },
  { checkId: 'ck_dataAvail', text: '提供数据可用性声明与可复现代码', passed: true, pendingText: '' },
  { checkId: 'ck_aiDisclose', text: '按期刊政策完成 AI 使用披露', passed: false, pendingText: 'AI 披露段落待补' },
]
