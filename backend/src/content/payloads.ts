/**
 * 页面载荷构建器
 * 每个函数产出一个前端页面所需的完整载荷（字段名严格对齐 src/types/index.ts）。
 * 无大模型时作为兜底内容；配置了大模型后，生成类接口会在此基础上刷新。
 */
import {
  ANALYSIS_IMPORT_FORMATS,
  DATA_LEVEL_OPTIONS_META,
  DATA_LEVEL_CARDS,
  DATA_SECURITY_TAGS,
  DATA_SAFETY_NOTES,
  DATA_SUPPORTED_FORMATS,
  ETHICS_NOTES,
  JOURNAL_LIBRARY,
  MAX_FILE_SIZE_MB,
  PUBLIC_DATASETS,
  SAMPLE_DATASETS,
  SENSITIVE_DETECT_TEXT,
  SUBMISSION_CHECK_TEMPLATE,
  REWRITE_ACTIONS,
} from './catalogs'
import type { ProjectSchedulePayload } from './schedule'

export interface ProjectLike {
  id: string
  title: string
  discipline: string
  route: string
}

/* ============================================================
 * 文献样例（用于种子与离线兜底）
 * ========================================================== */
export const SAMPLE_PAPERS = [
  {
    title: 'Problematic smartphone use and social anxiety among Chinese college students: a moderated mediation model',
    authors: 'Zhou, L., Wang, Y., & Chen, H.',
    journal: 'Computers in Human Behavior',
    year: 2024,
    quartile: 'JCR Q1',
    doi: '10.1016/j.chb.2024.108012',
    citedCount: 87,
    abstractText:
      '本研究以 1,204 名中国大学生为样本，考察手机依赖与社交焦虑的关系，并检验孤独感的中介作用与自控力的调节作用。结果显示，手机依赖显著正向预测社交焦虑，孤独感起到部分中介作用。',
    relevanceScore: 96,
  },
  {
    title: 'Loneliness as a mediator between social anxiety and problematic mobile phone use',
    authors: 'Elhai, J. D., Levine, J. C., & Hall, B. J.',
    journal: 'Journal of Affective Disorders',
    year: 2023,
    quartile: 'JCR Q1',
    doi: '10.1016/j.jad.2023.04.055',
    citedCount: 152,
    abstractText:
      '基于 982 名大学生样本，作者检验了孤独感在社交焦虑与问题性手机使用之间的中介作用，并讨论了对临床干预的启示。',
    relevanceScore: 92,
  },
  {
    title: 'Self-control as a moderator of the link between smartphone use and mental health',
    authors: 'Kim, S., & Park, J.',
    journal: 'Cyberpsychology, Behavior, and Social Networking',
    year: 2023,
    quartile: 'JCR Q2',
    doi: '10.1089/cyber.2023.0112',
    citedCount: 64,
    abstractText:
      '研究探讨自控力对手机使用与心理健康关系的调节作用，发现高自控力个体受到的不利影响显著更小。',
    relevanceScore: 88,
  },
  {
    title: 'A meta-analysis of the association between smartphone addiction and anxiety',
    authors: 'Liu, Q., Zhang, R., & Sun, X.',
    journal: 'Frontiers in Psychology',
    year: 2022,
    quartile: 'JCR Q3',
    doi: '10.3389/fpsyg.2022.904512',
    citedCount: 210,
    abstractText:
      '对 43 项研究的元分析显示，手机成瘾与焦虑的总体相关为中等偏强（r = 0.38），并受测量工具与文化背景的调节。',
    relevanceScore: 84,
  },
  {
    title: '社交焦虑与手机依赖：孤独感的中介与性别的调节',
    authors: '陈某某, 李某某',
    journal: '心理学报',
    year: 2023,
    quartile: 'CSSCI',
    doi: '10.3724/SP.J.1041.2023.00456',
    citedCount: 128,
    abstractText:
      '以 780 名大学生为被试，采用结构方程模型检验孤独感在社交焦虑与手机依赖之间的中介作用，并考察性别差异。',
    relevanceScore: 90,
  },
  {
    title: 'Longitudinal links between social anxiety and problematic phone use during the pandemic',
    authors: 'Coyne, S. M., Rogers, A. A., & Zurcher, J. D.',
    journal: 'Computers in Human Behavior',
    year: 2022,
    quartile: 'JCR Q1',
    doi: '10.1016/j.chb.2022.107288',
    citedCount: 118,
    abstractText:
      '三波纵向追踪显示，社交焦虑与问题性手机使用存在双向关联，且受社会支持的中介影响。',
    relevanceScore: 83,
  },
]

/* ============================================================
 * 变量与假设样例（数据驱动流程）
 * ========================================================== */
export const SAMPLE_VARIABLES = [
  { varName: 'social_anxiety', typeLabel: '连续变量', valueRange: '1–5', missingRate: 1.2, suggestedRole: 'independent' },
  { varName: 'phone_dependence', typeLabel: '连续变量', valueRange: '1–6', missingRate: 0.8, suggestedRole: 'dependent' },
  { varName: 'loneliness', typeLabel: '连续变量', valueRange: '1–7', missingRate: 2.1, suggestedRole: 'mediator' },
  { varName: 'self_control', typeLabel: '连续变量', valueRange: '1–5', missingRate: 1.5, suggestedRole: 'moderator' },
  { varName: 'gender', typeLabel: '无序分类', valueRange: '1=男 / 2=女', missingRate: 0.0, suggestedRole: 'control' },
  { varName: 'age', typeLabel: '连续变量', valueRange: '18–26', missingRate: 0.3, suggestedRole: 'control' },
  { varName: 'grade', typeLabel: '有序分类', valueRange: '1–4', missingRate: 0.5, suggestedRole: 'control' },
  { varName: 'daily_minutes', typeLabel: '计数', valueRange: '0–720', missingRate: 3.4, suggestedRole: 'resultCandidate' },
]

export const SAMPLE_HYPOTHESES = [
  {
    code: 'H1',
    title: '社交焦虑显著正向预测手机依赖',
    varChain: ['social_anxiety', 'phone_dependence'],
    testMethod: '分层回归',
    basis: '既有研究（Elhai et al., 2023）支持两者正相关。',
  },
  {
    code: 'H2',
    title: '孤独感在社交焦虑与手机依赖之间起中介作用',
    varChain: ['social_anxiety', 'loneliness', 'phone_dependence'],
    testMethod: 'Bootstrap 中介（5000 次）',
    basis: '孤独感是社交焦虑的核心后果之一，并驱动补偿性手机使用。',
  },
  {
    code: 'H3',
    title: '自控力负向调节社交焦虑对手机依赖的影响',
    varChain: ['social_anxiety', 'self_control', 'phone_dependence'],
    testMethod: '交互项回归',
    basis: '高自控力可缓冲不良情绪向成瘾行为的转化。',
  },
]

/* ============================================================
 * 各页面载荷构建
 * ========================================================== */

export function buildHotspot(project: ProjectLike, today: string) {
  const trendSeries = [
    {
      name: project.title.slice(0, 4),
      color: '#2563EB',
      points: [
        { year: '2021', value: 42 },
        { year: '2022', value: 58 },
        { year: '2023', value: 76 },
        { year: '2024', value: 102 },
        { year: '2025', value: 121 },
      ],
    },
    {
      name: '手机依赖',
      color: '#16A34A',
      points: [
        { year: '2021', value: 36 },
        { year: '2022', value: 49 },
        { year: '2023', value: 69 },
        { year: '2024', value: 95 },
        { year: '2025', value: 112 },
      ],
    },
    {
      name: '孤独感',
      color: '#7C3AED',
      points: [
        { year: '2021', value: 20 },
        { year: '2022', value: 28 },
        { year: '2023', value: 41 },
        { year: '2024', value: 55 },
        { year: '2025', value: 63 },
      ],
    },
  ]

  return {
    projectTitle: project.title,
    researchDirection: `${project.discipline} · 社交焦虑与手机依赖的关系机制`,
    gaps: [
      { gapId: 'gap_1', text: '既有研究多为横断设计，难以确认社交焦虑与手机依赖的因果方向。', sourceText: '[1] Zhou et al., 2024 · 讨论部分' },
      { gapId: 'gap_2', text: '中介机制（孤独感）与调节边界（自控力）少有在同一模型内同时检验。', sourceText: '[2] Elhai et al., 2023 · 引言' },
      { gapId: 'gap_3', text: '本土样本中测量工具的等价性尚未得到充分验证。', sourceText: '[5] 陈某某, 2023 · 研究方法' },
    ],
    gapSourceCount: 18,
    feasibility: [
      { key: 'coverage', label: '文献覆盖度', score: 8, maxScore: 10, description: '近三年高相关文献充足', basisText: '近三年检索到 128 篇高相关文献' },
      { key: 'dataAvailability', label: '数据可得性', score: 7, maxScore: 10, description: '可通过问卷采集，含现成公开库', basisText: 'CFPS / 自采问卷均可支撑' },
      { key: 'methodComplexity', label: '方法复杂度', score: 6, maxScore: 10, description: '中介与调节模型为成熟方法', basisText: '分层回归 + Bootstrap 中介' },
    ],
    citedReviews: [
      { reviewId: 'cr_1', title: 'Problematic smartphone use: A meta-analytic review', metaText: 'Zhang, R. et al. · Computers in Human Behavior · 2024', citedCount: 210, doiVerified: true },
      { reviewId: 'cr_2', title: '社交焦虑研究三十年：回顾与展望', metaText: '陈某某 等 · 心理学报 · 2023', citedCount: 128, doiVerified: true },
    ],
    trendTitle: '近五年相关文献量趋势',
    trendSeries,
    trendNote: '数据来自 OpenAlex / Crossref 检索结果，仅作趋势参考。',
    publicDatasets: PUBLIC_DATASETS,
    datasetTotal: PUBLIC_DATASETS.length,
    datasetCategories: ['心理学', '社会学', '公共卫生'],
    questionnaireChecks: [
      { checkId: 'q_1', text: '量表已获得原作者的授权与中文版修订说明', passed: true },
      { checkId: 'q_2', text: '问卷包含注意力检测题与反向计分题', passed: true },
      { checkId: 'q_3', text: '已明确知情同意与匿名化处理流程', passed: false },
    ],
    recognizedPaperCount: 128,
    conclusion: `综合文献覆盖、数据可得性与方法复杂度，本方向在${project.discipline}领域具备较高可行性，建议尽快确认研究方向并进入文献精读。`,
    _generatedAt: today,
  }
}

export function buildTopicKeywords(project: ProjectLike) {
  const keywords = [
    { keyword: '社交焦虑', freq: 121, growth: 'rising' },
    { keyword: '手机依赖', freq: 112, growth: 'rising' },
    { keyword: '问题性手机使用', freq: 89, growth: 'emerging' },
    { keyword: '孤独感', freq: 63, growth: 'stable' },
    { keyword: '自控力', freq: 58, growth: 'stable' },
    { keyword: '大学生', freq: 54, growth: 'stable' },
    { keyword: '心理健康', freq: 47, growth: 'stable' },
    { keyword: '中介效应', freq: 41, growth: 'rising' },
    { keyword: '纵向研究', freq: 22, growth: 'longTail' },
  ]
  return {
    researchDirection: `${project.discipline} · 社交焦虑与手机依赖`,
    sources: ['OpenAlex', 'Crossref'],
    rangeText: '2021–2025',
    paperCount: 128,
    keywords,
    topKeywords: keywords.slice(0, 6).map((k, i) => ({ rank: i + 1, keyword: k.keyword, freq: k.freq })),
    trendYears: ['2021', '2022', '2023', '2024', '2025'],
    trendSeries: [
      { name: '社交焦虑', color: '#2563EB', points: [{ year: '2021', value: 42 }, { year: '2022', value: 58 }, { year: '2023', value: 76 }, { year: '2024', value: 102 }, { year: '2025', value: 121 }] },
      { name: '手机依赖', color: '#16A34A', points: [{ year: '2021', value: 36 }, { year: '2022', value: 49 }, { year: '2023', value: 69 }, { year: '2024', value: 95 }, { year: '2025', value: 112 }] },
    ],
    trendUnit: '篇',
    citedReviews: [
      { reviewId: 'cr_1', title: 'Problematic smartphone use: A meta-analytic review', metaText: 'Zhang, R. et al. · 2024', citedCount: 210, doiVerified: true },
    ],
    lockedConcepts: ['社交焦虑', '手机依赖', '孤独感'],
  }
}

export function buildTopicTheory(project: ProjectLike) {
  return {
    lockedConcepts: ['社交焦虑', '手机依赖', '孤独感'],
    theories: [
      {
        theoryId: 'th_1',
        name: '情绪调节过程模型（Gross, 1998）',
        stars: 5,
        explainPath: '社交焦虑 → 情绪失调 → 补偿性手机使用',
        representativeRef: 'Gross, J. J. (1998). The emerging field of emotion regulation.',
        citedCount: 12400,
        varChain: ['社交焦虑', '情绪失调', '手机依赖'],
      },
      {
        theoryId: 'th_2',
        name: '社交补偿假说（Valkenburg & Peter, 2009）',
        stars: 4,
        explainPath: '社交焦虑 → 线上补偿 → 手机依赖',
        representativeRef: 'Valkenburg, P. M., & Peter, J. (2009). Social consequences of the Internet.',
        citedCount: 5800,
        varChain: ['社交焦虑', '线上社交补偿', '手机依赖'],
      },
      {
        theoryId: 'th_3',
        name: '自我控制理论（Baumeister, 1998）',
        stars: 4,
        explainPath: '低自控力 → 调节作用弱化 → 依赖增强',
        representativeRef: 'Baumeister, R. F. (1998). Ego depletion.',
        citedCount: 4300,
        varChain: ['自控力', '社交焦虑', '手机依赖'],
      },
    ],
    selectedTheoryId: 'th_1',
    variableDrafts: [
      { varName: '社交焦虑', definition: '个体在社交情境中体验到的紧张与担忧程度', scaleName: 'SIAS-6 简版', itemCount: 6, role: 'independent' },
      { varName: '手机依赖', definition: '对智能手机的过度使用与失控程度', scaleName: 'MPATS', itemCount: 17, role: 'dependent' },
      { varName: '孤独感', definition: '感知到的社会关系匮乏', scaleName: 'UCLA-LS3', itemCount: 20, role: 'mediator' },
      { varName: '自控力', definition: '抑制冲动与坚持长期目标的能力', scaleName: 'SCS', itemCount: 13, role: 'moderator' },
    ],
  }
}

export function buildDataUpload(project: ProjectLike, files: unknown[]) {
  return {
    supportedFormats: DATA_SUPPORTED_FORMATS,
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    uploadedFiles: files,
    publicDatasets: PUBLIC_DATASETS,
    sampleDatasets: SAMPLE_DATASETS,
    readyFileCount: files.length,
    readyVariableCount: 36,
    detectedDataLevel: 'L1',
    sensitiveDetected: true,
  }
}

export function buildVariablesPage(
  project: ProjectLike,
  variables: { varName: string; typeLabel: string; valueRange: string; missingRate: number; suggestedRole: string; overriddenRole?: string | null }[],
  healthAccuracy: number,
  reportedAt: string,
) {
  const typeDistribution = [
    { label: '连续变量', count: variables.filter((v) => v.typeLabel === '连续变量').length, color: '#2563EB' },
    { label: '无序分类', count: variables.filter((v) => v.typeLabel === '无序分类').length, color: '#16A34A' },
    { label: '有序分类', count: variables.filter((v) => v.typeLabel === '有序分类').length, color: '#D97706' },
    { label: '计数', count: variables.filter((v) => v.typeLabel === '计数').length, color: '#7C3AED' },
  ]
  return {
    health: {
      validSampleSize: 512,
      variableCount: variables.length,
      completeVariableCount: variables.filter((v) => v.missingRate < 5).length,
      missingVariableCount: variables.filter((v) => v.missingRate >= 5).length,
      outlierCount: 12,
      duplicateAnswerCount: 3,
      sourceFile: 'survey_social_anxiety.sav',
    },
    healthAccuracy: healthAccuracy,
    healthReportedAt: reportedAt,
    variables: variables.map((v) => ({ ...v, overriddenRole: v.overriddenRole ?? undefined })),
    typeDistribution,
    qualityIssues: [
      { issueId: 'qi_1', level: 'warn', text: 'daily_minutes 存在 3.4% 缺失，建议采用多重插补。', needsConfirm: true },
      { issueId: 'qi_2', level: 'info', text: '检测到 12 个离群值（超过 ±3SD），已在稳健性检验中单独标注。', needsConfirm: false },
    ],
    recognizedCount: variables.length,
    usableCount: variables.filter((v) => v.missingRate < 10).length,
  }
}

export function buildHypothesesPage(project: ProjectLike, hypotheses: any[], variableCount: number) {
  return {
    sourceFile: 'survey_social_anxiety.sav',
    variableCount,
    chatSuggestions: ['为什么选择孤独感作为中介变量？', '自控力的调节假设有文献支持吗？', '还可以检验哪些竞争假设？'],
    hypotheses: hypotheses.map((h, i) => ({
      hypothesisId: `h_${project.id}_${i + 1}`,
      code: h.code,
      title: h.title,
      varChain: h.varChain,
      testMethod: h.testMethod,
      basis: h.basis,
      status: h.status ?? 'pending',
    })),
    citedVariables: [
      { varName: '社交焦虑', roleLabel: '自变量' },
      { varName: '手机依赖', roleLabel: '因变量' },
      { varName: '孤独感', roleLabel: '中介变量' },
      { varName: '自控力', roleLabel: '调节变量' },
    ],
  }
}

export function buildLiteraturePage(project: ProjectLike, papers: any[], selectedIds: string[], kbDocCount: number) {
  return {
    projectTitle: project.title,
    resultTotal: papers.length,
    sortBy: 'relevance',
    filters: {
      quartile: ['JCR Q1', 'JCR Q2', 'JCR Q3', 'CSSCI'],
      // 去重：项目自身学科可能与固定选项重复（如项目学科就是「心理学」），会导致前端 select 的 key 重复
      discipline: Array.from(new Set([project.discipline, '心理学', '公共卫生'])),
      year: ['2022', '2023', '2024', '2025'],
    },
    activeFilter: { query: '', quartile: '', discipline: '', year: '' },
    languageWarning: '检测到 1 条中文文献与英文检索式不匹配，已单独标注。',
    papers,
    selectedPaperIds: selectedIds,
    selectedCount: selectedIds.length,
    minRequired: 10,
    selectionNote: '至少选择 10 篇可核验文献才能生成结构化综述。',
    verify: {
      status: 'idle',
      statusText: '尚未核验',
      agentAlpha: { label: '内容一致性 Agent', accuracy: 0.94, description: '核对论断与原文的一致性' },
      agentBeta: { label: 'DOI 真实性 Agent', accuracy: 0.97, description: '核对 DOI 与元数据真实性' },
      passedCount: 0,
      suspiciousCount: 0,
      failedCount: 0,
      blockExport: false,
      note: '核验后未通过条目将被阻断导出。',
    },
    kbDocCount,
    kbQa: { question: '', answer: '', citations: [], note: '提问后答案将标注引用来源。' },
    verifiedClaimCount: 0,
  }
}

export function buildAnalysisPage(project: ProjectLike, run: unknown | null) {
  const methodList = [
    { methodId: 'hierarchical', name: '分层回归', recommended: true, summary: '', prerequisites: '', pros: '', cons: '', robustnessImpact: '', checklist: '' },
  ]
  return {
    projectTitle: project.title,
    steps: [
      { key: 'import', label: '导入数据', status: 'done' },
      { key: 'healthCheck', label: '数据体检', status: 'done' },
      { key: 'method', label: '选择方法', status: 'current' },
      { key: 'result', label: '结果与稳健性', status: run ? 'current' : 'upcoming' },
    ],
    dataVersion: { version: 'v1', rows: 512, columns: 36, dataLevel: 'L1' },
    methods: methodList,
    selectionTrail: { operatorName: '我', operatedAt: new Date().toISOString(), candidateCount: 5, unselectedCount: 3, dataVersion: 'v1' },
    healthReport: { accuracy: 0.96, reportedAt: new Date().toISOString(), metrics: [] },
    healthNotes: [
      { tone: 'warn', text: 'daily_minutes 缺失 3.4%，已采用 FIML 处理。' },
      { tone: 'danger', text: 'gender 变量在 4 个样本上取值缺失，已在分析中剔除。' },
    ],
    importFormats: ANALYSIS_IMPORT_FORMATS,
    importedFile: { fileName: 'survey_social_anxiety.sav', metaText: 'SPSS 数据 · 512 行 × 36 列', passed: true },
    sensitiveWarning: '当前数据级别为 L1，导出原始数据行需勾选披露声明。',
    code: [
      { language: 'python', fileName: 'analysis.py', code: '# 分层回归示例\nimport statsmodels.api as sm\nX = sm.add_constant(df[["social_anxiety","loneliness","self_control"]])\nmodel = sm.OLS(df["phone_dependence"], X).fit()\nprint(model.summary())', licenseNote: 'statsmodels（BSD-3）' },
    ],
    robustness: [],
    robustnessNote: '运行分析后生成稳健性检验结果。',
    missingBars: [
      { varName: 'social_anxiety', missingRate: 1.2 },
      { varName: 'phone_dependence', missingRate: 0.8 },
      { varName: 'loneliness', missingRate: 2.1 },
      { varName: 'self_control', missingRate: 1.5 },
      { varName: 'daily_minutes', missingRate: 3.4 },
    ],
    run: run ?? null,
  }
}

export function buildWritingPage(project: ProjectLike) {
  const outline = [
    { nodeId: 'o1', title: '1 引言', level: 1, children: [
      { nodeId: 'o1_1', title: '1.1 研究背景', level: 2, citeCount: 6 },
      { nodeId: 'o1_2', title: '1.2 问题提出', level: 2, citeCount: 4 },
    ] },
    { nodeId: 'o2', title: '2 文献综述', level: 1, children: [
      { nodeId: 'o2_1', title: '2.1 社交焦虑与手机依赖', level: 2, citeCount: 8 },
      { nodeId: 'o2_2', title: '2.2 孤独感的中介作用', level: 2, citeCount: 5 },
      { nodeId: 'o2_3', title: '2.3 自控力的调节作用', level: 2, citeCount: 3 },
    ] },
    { nodeId: 'o3', title: '3 研究方法', level: 1, flag: 'boundArtifact', children: [
      { nodeId: 'o3_1', title: '3.1 被试与程序', level: 2 },
      { nodeId: 'o3_2', title: '3.2 测量工具', level: 2 },
      { nodeId: 'o3_3', title: '3.3 统计策略', level: 2, flag: 'boundArtifact' },
    ] },
    { nodeId: 'o4', title: '4 结果', level: 1, flag: 'missingCitation', children: [] },
    { nodeId: 'o5', title: '5 讨论', level: 1, children: [] },
  ]
  const paragraphs = [
    { paraId: 'p1', index: 1, section: '1.1 研究背景', kind: 'normal', aiGenerated: false, text: '随着智能手机的普及，手机依赖已成为影响大学生心理健康的重要风险因素。', traceLabel: '' },
    { paraId: 'p2', index: 2, section: '1.1 研究背景', kind: 'normal', aiGenerated: true, text: '既有研究表明，社交焦虑与手机依赖之间存在稳定的正相关，但其内在机制尚不清晰。', traceLabel: 'AI 生成 · 已核对 3 条引用' },
    { paraId: 'p3', index: 3, section: '3.3 统计策略', kind: 'boundMethod', aiGenerated: true, text: '本研究采用分层回归与 Bootstrap 中介检验（5000 次重抽样），所有分析在沙箱中完成并可复现。', traceLabel: '绑定分析产物 · run_2024' },
  ]
  const citations = [
    { index: 1, apaText: 'Zhou, L., Wang, Y., & Chen, H. (2024). Problematic smartphone use and social anxiety. Computers in Human Behavior, 152, 108012.', gbText: 'Zhou L, Wang Y, Chen H. Problematic smartphone use and social anxiety[J]. Computers in Human Behavior, 2024, 152: 108012.', paperId: 'pa_1' },
    { index: 2, apaText: 'Elhai, J. D., Levine, J. C., & Hall, B. J. (2023). Loneliness as a mediator. Journal of Affective Disorders, 331, 55–62.', gbText: 'Elhai J D, Levine J C, Hall B J. Loneliness as a mediator[J]. Journal of Affective Disorders, 2023, 331: 55-62.', paperId: 'pa_2' },
  ]
  /**
   * 编辑器正文 = 与「AI 全文生成」页的「查看全文」**同一份内容**。
   *
   * 修复背景：此前这里是写死的 4 块（只有「1 引言」的两段），于是 P11 手动编辑视图
   * 在引言之后就断了；而写作页的「查看全文」明明还有更多段落 —— 两页内容对不上。
   * 现在直接按段落顺序组装（section 变化处插小标题），与写作页全文视图逐段对应。
   */
  const editorBody = buildEditorBody(paragraphs)
  const editorCitations = [
    { index: 1, title: 'Problematic smartphone use and social anxiety', journal: 'Computers in Human Behavior', year: '2024' },
    { index: 2, title: 'Loneliness as a mediator', journal: 'Journal of Affective Disorders', year: '2023' },
  ]
  const checklistItems = SUBMISSION_CHECK_TEMPLATE.map((c) => ({ ...c }))
  return {
    projectTitle: project.title,
    title: `${project.title}`,
    mode: 'aiAssist',
    outline,
    currentSection: '1.1 研究背景',
    autoSavedAt: new Date().toISOString(),
    stats: { wordCount: 4820, paragraphCount: paragraphs.length, citationCount: citations.length, unsavedChanges: 0, lastEditedAt: new Date().toISOString(), aiLabelEnabled: true },
    paragraphs,
    citations,
    citationStyle: 'APA7',
    inTextStyle: '(作者, 年份)',
    targetJournal: { name: 'Computers in Human Behavior', style: 'APA 7' },
    aiPolicyReminder: { journal: 'Computers in Human Behavior', text: '该期刊要求披露 AI 使用范围，允许语言润色，禁止 AI 作者。', syncedAt: new Date().toISOString() },
    zotero: { bound: false, account: '', bidirectionalSync: false, rateLimitText: 'Zotero API 限流：每分钟 60 次', fallbackText: '未绑定时可手动导入 .bib 文件' },
    kbDocs: [
      { paperId: 'pa_1', title: 'Problematic smartphone use and social anxiety', metaText: 'Zhou et al. · 2024' },
      { paperId: 'pa_2', title: 'Loneliness as a mediator', metaText: 'Elhai et al. · 2023' },
    ],
    kbDocCount: 2,
    aiSuggestions: [
      { suggestionId: 'sg_1', text: '在 1.2 补充研究假设 H1–H3 的推导。', adopted: false },
      { suggestionId: 'sg_2', text: '讨论部分建议增加与本土研究的对话。', adopted: false },
    ],
    editor: {
      journalFormat: 'Computers in Human Behavior（APA 7）',
      journalFormatOptions: JOURNAL_LIBRARY.map((j) => j.name),
      citationStyleLabel: 'APA 7',
      inTextLabel: '(作者, 年份)',
      fontName: 'Times New Roman',
      fontSizeLabel: '12pt',
      lineHeightLabel: '1.5',
      pageCount: 12,
      zoom: 100,
    },
    editorBody,
    editorCitations,
    rewriteActions: REWRITE_ACTIONS,
    authorLine: '陈某某 · 心理学系',
    submissionChecklist: {
      total: checklistItems.length,
      done: checklistItems.filter((i) => i.passed).length,
      items: checklistItems,
    },
  }
}

/** 编辑器正文块（对齐前端 src/types/index.ts 的 EditorBlock） */
type EditorBlock = {
  paraId: string
  kind: 'heading' | 'body' | 'aiLabel'
  text: string
  /** 文内引用序号，前端渲染为上标 [n] */
  citeIndex?: number
}

/**
 * 组装 P11 编辑器正文块 —— 与写作页「查看全文」（`WritingPage` 的 isFullView 分支）**逐段对齐**：
 * 段落顺序不变，`section` 变化处插一条小标题，段落自带 `traceLabel` 时补一条 AI 溯源标识行。
 * 这样「手动编辑」页看到的内容 == 「AI 全文生成 · 查看全文」里的内容，两页不再各说各话。
 *
 * 引用序号按段落在全文中的出现顺序给出，与「引用引擎」的上标编号同一口径。
 */
export function buildEditorBody(
  paragraphs: Array<{ paraId: string; section: string; text: string; traceLabel?: string }>,
): EditorBlock[] {
  const blocks: EditorBlock[] = []
  let citeSeq = 0
  paragraphs.forEach((p, i) => {
    if (p.section && p.section !== paragraphs[i - 1]?.section) {
      blocks.push({ paraId: `h_${i}`, kind: 'heading', text: p.section })
    }
    citeSeq += 1
    blocks.push({ paraId: p.paraId, kind: 'body', text: p.text, citeIndex: citeSeq })
    if (p.traceLabel) blocks.push({ paraId: `${p.paraId}_label`, kind: 'aiLabel', text: p.traceLabel })
  })
  if (blocks.length === 0) {
    blocks.push({ paraId: 'e_empty', kind: 'body', text: '（尚未生成正文，请先在「AI 全文生成」视图生成初稿）' })
  }
  return blocks
}

export function buildJournalPage(project: ProjectLike) {
  const matches = JOURNAL_LIBRARY.slice(0, 4).map((j, i) => ({
    journalId: j.journalId,
    name: j.name,
    indexText: j.indexText,
    matchScore: 92 - i * 7,
    matchReason: i === 0 ? '主题高度契合：社交焦虑与手机依赖，且发表过同类中介模型研究。' : '主题相关，方法与样本量符合期刊偏好。',
  }))
  const profile = JOURNAL_LIBRARY[0]
  const checks = SUBMISSION_CHECK_TEMPLATE.map((c) => ({ ...c }))
  return {
    title: project.title,
    abstractText: '本研究以 512 名大学生为样本，检验社交焦虑对手机依赖的影响，以及孤独感的中介作用与自控力的调节作用。',
    keywords: ['社交焦虑', '手机依赖', '孤独感', '自控力', '中介效应'],
    matches,
    profile: {
      journalId: profile.journalId,
      name: profile.name,
      sourceText: 'OpenAlex / 期刊官网',
      partition: profile.partition,
      reviewCycle: profile.reviewCycle,
      reviewCycleSource: profile.reviewCycleSource,
      acceptanceRate: profile.acceptanceRate,
      acceptanceSource: profile.acceptanceSource,
      apc: profile.apc,
      databases: profile.databases,
      formatRequirement: profile.formatRequirement,
      aiPolicy: profile.aiPolicy,
    },
    submissionChecks: checks,
    completedChecks: checks.filter((c) => c.passed).length,
    totalChecks: checks.length,
    disclaimer: '期刊指标来自公开数据源，仅作参考；投稿前请以期刊官网最新政策为准。',
    dataUpdatedAt: new Date().toISOString(),
  }
}

export function buildReviewPage(project: ProjectLike) {
  const issues = [
    { issueId: 'r_1', code: 'H1', type: 'hard', title: '因果推断过强', confidence: 'high', confidenceText: '置信度：高', description: '横断数据不足以支持「导致」的表述，建议改为「与……相关」。', frequencyText: '同类意见在顶刊审稿中出现 47%', handled: 'none', replyable: true },
    { issueId: 'r_2', code: 'H2', type: 'hard', title: '共同方法偏差未检验', confidence: 'high', confidenceText: '置信度：高', description: '建议补充 Harman 单因子检验或标记变量法。', frequencyText: '同类意见在顶刊审稿中出现 38%', handled: 'none', replyable: true },
    { issueId: 'r_3', code: 'D1', type: 'dispute', title: '中介比例的解读存在争议', confidence: 'medium', confidenceText: '置信度：中', description: '中介比例不稳定，建议弱化其解释权重。', frequencyText: '同类意见在顶刊审稿中出现 22%', handled: 'none', replyable: true },
    { issueId: 'r_4', code: 'S1', type: 'style', title: '摘要字数超出限制', confidence: 'low', confidenceText: '置信度：低', description: '摘要 268 词，建议压缩至 200 词以内。', frequencyText: '同类意见在顶刊审稿中出现 15%', handled: 'none', replyable: false },
  ]
  return {
    reviewTarget: project.title,
    targetJournal: 'Computers in Human Behavior',
    field: project.discipline,
    calibration: { paperCount: 1200, corpusCount: 860, calibratedAt: new Date().toISOString(), note: '基于 860 篇顶刊已发表论文的审稿意见语料校准。' },
    issues,
    revisionPaths: [
      { issueCode: 'H1', title: '修改建议', text: '将「导致」改为「与……相关」，并在局限部分说明因果方向的限制。' },
      { issueCode: 'H2', title: '修改建议', text: '在方法部分补充共同方法偏差检验，并报告结果。' },
    ],
    rebuttals: [
      { issueCode: 'H1', title: '回复草稿', steps: ['感谢审稿人指出因果表述问题。', '我们已在正文中统一改为相关性表述。', '并在局限部分补充了纵向设计的未来方向。'] },
    ],
    summary: { accepted: 0, disputed: 0, ignored: 0, corpusCount: 860 },
    disclaimer: '模拟评审基于发表于顶刊的审稿意见语料，仅作写作参考，不代表真实审稿结论。',
  }
}

export function buildExportPage(project: ProjectLike) {
  const artifacts = [
    { artifactId: 'a_1', name: '论文正文（含引用）', metaText: '约 4,820 字 · 12 页', formats: ['DOCX', 'PDF', 'Markdown'], status: 'ready' },
    { artifactId: 'a_2', name: '参考文献列表', metaText: 'APA 7 / GB/T 7714', formats: ['BIB', 'RIS', 'CSV'], status: 'ready' },
    { artifactId: 'a_3', name: '分析可复现代码', metaText: 'Python + 环境说明', formats: ['PY', 'TXT'], status: 'ready' },
    { artifactId: 'a_4', name: '数据与变量说明', metaText: '512 行 × 36 列', formats: ['CSV', 'XLSX'], status: 'pending', statusText: '待补充变量编码表' },
    { artifactId: 'a_5', name: 'AI 使用情况说明', metaText: '含披露段落', formats: ['DOCX', 'PDF'], status: 'ready' },
  ]
  const disclosureItems = [
    { itemId: 'd_1', text: '已说明哪些环节使用了 AI（文献检索 / 润色 / 代码生成）', done: true },
    { itemId: 'd_2', text: '已确认 AI 未参与研究结论的生成', done: true },
    { itemId: 'd_3', text: '已按目标期刊政策填写披露段落', done: false },
    { itemId: 'd_4', text: '已附上可复现代码与运行环境说明', done: true },
  ]
  return {
    artifactCount: artifacts.length,
    artifacts,
    disclosure: { title: 'AI 工具使用情况说明', note: '导出产物将自动附带本说明，满足期刊披露要求。', items: disclosureItems, unreviewedCount: 1 },
    risk: { hasUnverified: false, unverifiedCount: 0, message: '所有文献均已通过核验，可正常导出。' },
    compliance: [
      { key: 'verify', label: '文献核验通过率', value: '96%', tone: 'ok' },
      { key: 'dataLevel', label: '数据级别', value: 'L1 受控脱敏', tone: 'ok' },
      { key: 'aiDisclose', label: 'AI 披露完整度', value: '75%', tone: 'danger' },
    ],
    complianceNote: '存在 1 项合规项未完成（AI 披露段落待补），请在导出前补齐。',
  }
}

export function buildSettings(project: ProjectLike, schedule: ProjectSchedulePayload, members: any[], versions: any[], dataLevel: string, skipConfirm: boolean) {
  return {
    projectId: project.id,
    title: project.title,
    metaText: `${project.discipline} · ${project.route === 'dataDriven' ? '数据驱动' : '理论驱动'}`,
    discipline: project.discipline,
    routeText: project.route === 'dataDriven' ? '数据驱动' : '理论驱动',
    ddlNodes: schedule.milestones.map((m) => ({ nodeId: m.nodeId, name: m.name, date: m.date, daysLeft: m.daysLeft, status: m.status })),
    members,
    versions,
    versionPolicyText: '每次保存关键产物自动生成版本，可回滚至最近 5 个版本。',
    dataLevel,
    skipConfirm,
    dataLevelOptions: DATA_LEVEL_OPTIONS_META.map((o) => {
      const card = DATA_LEVEL_CARDS.find((c) => c.level === o.level)!
      return { level: o.level, name: card.name, description: card.description, rules: card.rules, current: o.level === dataLevel }
    }),
    dataLevelChangeImpact: '切换到 L2 会强制关闭「跳过逐条确认」，并阻断原始数据行导出。',
  }
}

export function buildArtifacts(project: ProjectLike) {
  return {
    projectId: project.id,
    currentStage: 'analysis',
    currentStageLabel: '数据分析中',
    artifacts: [
      { artifactId: 'sa_1', name: '结构化文献综述', statusText: '已生成 · 含 28 条可核验引用', tone: 'ok' },
      { artifactId: 'sa_2', name: '研究假设 H1–H3', statusText: '已确认', tone: 'ok' },
      { artifactId: 'sa_3', name: '分析结果草案', statusText: '待复核稳健性', tone: 'warn', actionText: '去复核' },
    ],
  }
}

export function buildDdlKeywordSetting(project: ProjectLike, selected: string) {
  return {
    projectId: project.id,
    selected,
    options: [
      { keyword: selected || '社交焦虑', sourceText: '来自项目标题' },
      { keyword: '手机依赖', sourceText: '来自领域研究热词' },
      { keyword: '孤独感', sourceText: '来自领域研究热词' },
    ],
  }
}

// 保留导出，供需要时引用（避免未使用告警）
export const __payloadHelpers = { ETHICS_NOTES, SENSITIVE_DETECT_TEXT, DATA_SAFETY_NOTES, DATA_SECURITY_TAGS, DATA_SUPPORTED_FORMATS }
