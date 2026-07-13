# 需求分析文档

> **日期**: 2026-07-13
> **说明**: 从原始需求到功能实现的分析映射，追踪每个需求的来源、验收标准和落地位置
> **增量需求**: 新需求通过 `sync-request` 命令自动追加到文末

---

## 需求目录

| 编号 | 需求 | 来源 | 模块 | 状态 |
|------|------|------|------|------|
| REQ-001 | 个人品牌展示 | 个人站点定位 | 首页 | ✅ 已实现 |
| REQ-002 | 文章发布与管理 | 个人碎碎念 | 文章系统 | ✅ 已实现 |
| REQ-003 | 从 GitHub 同步文章 | 已有博客迁移 | 文章系统 | ✅ 已实现 |
| REQ-004 | 任务跟踪管理 | 日常待办管理 | 任务管理 | ✅ 已实现 |
| REQ-005 | 任务进展详情 | 任务过程记录 | 任务管理 | ✅ 已实现 |
| REQ-006 | 任务标签分类 | 任务归类 | 任务管理 | ✅ 已实现 |
| REQ-007 | 任务日历/甘特图 | 时间线可视化 | 任务管理 | ✅ 已实现 |
| REQ-008 | 邮件订阅推送 | 用户订阅通知 | 邮件订阅 | ✅ 已实现 |
| REQ-009 | EJS 模板管理 | 动态邮件内容 | 邮件订阅 | ✅ 已实现 |
| REQ-010 | 邮箱地址管理 | 收件人管理 | 邮件订阅 | ✅ 已实现 |
| REQ-011 | 上市公司基本面评估 | 投资研究 | 投资频道 | ✅ 已实现 |
| REQ-012 | 大盘温度查看 | 市场行情 | 投资频道 | 🚧 占位 |
| REQ-013 | 外部接口管理 | 订阅数据源 | API 管理 | ✅ 已实现 |
| REQ-014 | AI 限流 | 防滥用 | 投资频道 | ✅ 已实现 |
| REQ-015 | AI 评估错误日志 | 异常可追溯 | 投资频道 | ✅ 已实现 |
| REQ-016 | 代码规范性 | 可维护性 | — | 📋 待治理 |
| **REQ-017** | **全站移动端响应式适配** | **移动端浏览需求** | **全局 CSS + 所有页面** | **✅ 已实现** |
| **REQ-018** | **About 子页面移动端优化** | **移动端表格操作不便** | **Task.vue + 全局 CSS** | **✅ 已实现** |
| **REQ-019** | **布局优化：首页/关于我/投资频道** | **页面超出视口需滚动** | **index.css + Home/About/Invest** | **✅ 已实现** |

---

## REQ-001: 个人品牌展示

### 原始需求
> 我是 zhehuaxuan，需要一个个人站点展示我的个人信息、教育背景、工作经历和技术方向，让访客快速了解我。

### 验收标准
- [x] 展示姓名、头像、学校、专业
- [x] 展示联系方式（邮箱、电话）
- [x] 展示工作经历和教育背景
- [x] 展示兴趣爱好
- [x] 展示作品集导航（Larkmap、GitHub 等）

### 实现

| 维度 | 实现位置 |
|------|----------|
| 页面 | `client/src/views/Home.vue` |
| 后台编辑 | 由 `auth/profile` API 提供 HTML profile |
| 路由 | `/` → Home.vue |

---

## REQ-002: 文章发布与管理

### 原始需求
> 能写文章并进行管理，支持富文本编辑，像个人博客一样。

### 验收标准
- [x] 富文本编辑器，支持文字排版和图片上传
- [x] 文章标题和内容输入
- [x] 保存、编辑、预览
- [x] 文章列表查看

### 实现

| 维度 | 实现位置 |
|------|----------|
| 编辑器 | `client/src/views/article/ArticleEdit.vue` |
| 编辑器库 | wangeditor 5 (`@wangeditor/editor-for-vue`) |
| 列表页（公开） | `client/src/views/MyArticles.vue` |
| 列表页（管理） | `client/src/views/about/ArticleList.vue` |
| 后端 API | `server/routes/article.js` |
| 数据表 | `article` |
| 图片上传 | POST `/api/upload/image` → multer 存储到 `uploads/` |

### 设计链接
- 模块设计: [article-module.md](../modules/article-module.md)
- API: [api-endpoints.md §2](../api/api-endpoints.md#2-文章模块articlejs)

---

## REQ-003: GitHub 文章同步

### 原始需求
> 我之前在 GitHub Pages (zhehuaxuan.github.io) 上写过文章，希望能一键同步到 Homebition 里。

### 验收标准
- [x] 一键触发同步
- [x] 自动抓取 GitHub Pages 的文章链接
- [x] 自动去重（已存在的跳过）

### 实现

| 维度 | 实现位置 |
|------|----------|
| 同步 API | POST `/api/article/sync` |
| 后端逻辑 | fetch + cheerio 解析 `<a>` 标签 |
| 去重策略 | 按 `url` 字段比对 |
| 触发入口 | ArticleList.vue（管理后台） |

---

## REQ-004 ~ REQ-007: 任务管理

### 原始需求
> 需要管理日常任务，能设置开始/结束时间、重要性、打标签、看进展。希望能有甘特图直观展示时间线，也要能表格浏览。

### 验收标准
- [x] 新增/编辑/删除任务
- [x] 设置任务名称、目标、起止时间、重要性、标签
- [x] 双视图：甘特图模式 + 表格模式
- [x] 任务状态流转（待启动→进行中→已完成）
- [x] 任务延期（修改闭环时间）
- [x] 添加和查看任务进展详情
- [x] 标签管理（CRUD）

### 实现

| 需求 | 实现位置 |
|------|----------|
| 主页面 | `client/src/views/MyTasks.vue` |
| 甘特图 | FullCalendar resource-timeline |
| 表格 | Element Plus el-table |
| 后台管理 | `client/src/views/about/Task.vue`、`Tag.vue` |
| 任务 API | `server/routes/task.js` |
| 标签 API | `server/routes/tag.js` |
| 数据表 | `task`、`taskdetail`、`tag` |
| 标签关联 | `task.tags` JSON 字段 |

### 设计链接
- 模块设计: [task-module.md](../modules/task-module.md)
- API: [api-endpoints.md §3-4](../api/api-endpoints.md#3-任务模块taskjs)

---

## REQ-008 ~ REQ-010: 邮件订阅推送

### 原始需求
> 能管理邮件订阅任务：配置定时向指定邮箱推送内容，内容来自外部接口获取的数据，用 EJS 模板渲染后发送。需要管理收件人邮箱列表。

### 验收标准
- [x] 创建一次性/周期性订阅任务
- [x] 订阅任务关联外部接口作为数据源
- [x] 订阅任务关联 EJS 模板作为内容格式
- [x] 管理收件人邮箱地址
- [x] 管理 EJS 模板文件（增删改查 + 预览 + 变量分析）
- [x] 注册外部接口并测试连通性
- [x] 订阅任务启用/停用切换

### 实现

| 需求 | 实现位置 |
|------|----------|
| 管理页面 | `client/src/views/about/Subscription.vue`（4 个 tab） |
| 模板 API | `server/routes/template.js`（文件系统 EJS） |
| 订阅 API | `server/routes/subscription.js` |
| 邮箱 API | `server/routes/mailAddress.js` |
| 邮件发送 | `server/routes/mail.js`（数据库模板）|
| 邮件服务 | `server/services/mail.js`（nodemailer）|
| 邮件配置 | `server/config/mail.js`（aliyun SMTP）|
| 模板目录 | `server/templates/*.ejs` |

**已知缺口**: 定时调度器未实现，订阅任务需手动触发。

### 设计链接
- 模块设计: [subscription-module.md](../modules/subscription-module.md)
- API: [api-endpoints.md §6-9](../api/api-endpoints.md)
- 数据库: [database-schema.md §2.6](../database/database-schema.md#26-subscription--邮件订阅任务)

---

## REQ-011, REQ-014, REQ-015: 投资频道

### 原始需求
> 能输入公司名称或股票代码，让 AI 帮我做基本面评估打分。需要防止恶意调用，AI 出错了要有日志可查。

### 验收标准
- [x] 输入公司名/代码 → DeepSeek 验证是否为上市公司
- [x] 验证通过 → MiniMax 执行 14 项指标评估
- [x] 评估结果包含行业维度（5 项×20%）和公司维度（9 项×5%-15%）
- [x] 每 IP 每分钟限 5 次
- [x] 评估错误写入文件日志

### 实现

| 维度 | 实现位置 |
|------|----------|
| 页面 | `client/src/views/invest/Enterprise.vue` |
| 布局 | `client/src/views/invest/Invest.vue` |
| 验证 API | POST `/api/invest/verify-company` |
| 评估 API | POST `/api/invest/evaluate` |
| AI 服务 | `server/services/deepseek.js` |
| AI 配置 | `server/config/deepseek.xml` |
| 限流器 | 内存 Map，每 IP 每分钟 5 次 |
| 错误日志 | `server/logs/evaluate-error.log`（JSON Lines）|

### 评估体系

```
行业维度（60%）: 国家战略 / 发展空间 / 发展阶段 / 叙事周期 / 稀缺性
公司维度（40%）: 管理层 / 技术壁垒 / 竞争力 / 财务 / 增长 / 风险 / 估值 / 筹码 / 技术形态
```

### 设计链接
- 模块设计: [invest-module.md](../modules/invest-module.md)
- API: [api-endpoints.md §11](../api/api-endpoints.md#11-投资频道模块investjs)

---

## REQ-016: 代码规范性治理

### 原始需求
> 代码需要规范，方便后续维护。

### 验收标准
- [ ] 密码从明文存储改为 bcrypt 哈希
- [ ] API 响应格式统一为 `{ code: 0, data, message }`
- [ ] 后端接口添加 token 校验中间件
- [ ] 硬编码的配置（数据库密码、AI Key）抽取到环境变量
- [ ] `user` 表双字段统一

### 相关规范文档
- [API 响应约定](../standards/api-conventions.md)
- [JavaScript 编码规范](../standards/javascript-conventions.md)
- [数据库命名规范](../standards/database-conventions.md)

---

## 需求-模块映射矩阵

```
                    首页  文章  任务  订阅  投资  API管理  认证
REQ-001 个人展示      ●
REQ-002 文章发布            ●
REQ-003 GitHub同步          ●
REQ-004 任务管理                  ●
REQ-005 任务进展                  ●
REQ-006 标签管理                  ●
REQ-007 甘特图                    ●
REQ-008 邮件订阅                        ●
REQ-009 模板管理                        ●
REQ-010 邮箱管理                        ●
REQ-011 企业评估                              ●
REQ-012 大盘温度                              ●(占位)
REQ-013 接口管理                                    ●
REQ-014 AI限流                                 ●
REQ-015 错误日志                               ●
REQ-016 规范治理    ○      ○      ○      ○      ○      ○      ○
REQ-017 移动端适配  ●      ●      ●      ●      ●      ●      ●
REQ-018 About移动端优化                ●
REQ-019 布局优化          ●              ●      ●
```

- ● = 核心功能  ○ = 关联影响

---

## REQ-017: 全站移动端响应式适配

### 原始需求
> 个人网站在手机浏览器上界面布局混乱，无法正常完成功能操作。

### 验收标准
- [x] 导航栏在手机端折叠为汉堡菜单（滑动侧边栏）
- [x] About/Invest 侧边栏在手机端切换为水平滚动标签栏
- [x] 5 个表格管理页面：手机端水平滚动 + 隐藏次要列
- [x] MyTasks 甘特图高度自适应视口
- [x] 首页头像和字体在手机上缩小
- [x] 登录卡片在手机上全屏宽度
- [x] 桌面端样式零改动

### 实现

| 需求 | 实现位置 |
|------|----------|
| 全局样式 | `client/src/index.css` — CSS 变量、`.page-container`、`.table-container`、`.hide-on-mobile`、FullCalendar 响应式、Dialog 全屏 |
| 导航栏汉堡菜单 | `client/src/Index.vue` — `menuOpen` 状态、`mobileLinks` 计算属性、遮罩+滑入菜单 |
| 侧边栏→标签栏 | `client/src/views/About.vue`、`client/src/views/invest/Invest.vue` |
| 表格响应式 | `client/src/views/about/{Subscription,Task,Tag,ArticleList,Devices}.vue` |
| 甘特图 | `client/src/views/MyTasks.vue` — 容器高度 `calc(100vh-160px)`、资源列 `80px` |
| 首页微调 | `client/src/views/Home.vue` — 头像 140px |
| 登录微调 | `client/src/views/Login.vue` — 卡片 `95vw` |

### Commits
1. `987ce28` — 汉堡菜单 + 全局 CSS 工具类
2. `586efdb` — 侧边栏转标签栏
3. `13a7b06` — 表格响应式
4. `770f612` — 甘特图/首页/登录微调
5. `de23c35` — review 修复

### 设计链接
- 需求文档: `docs/superpowers/requests/2026-07-13_REQ-017_responsive-mobile-adaptation.md`
- 实现计划: `docs/superpowers/plans/2026-07-13-responsive-mobile-plan.md`

---

## REQ-018: About 子页面移动端优化

### 原始需求
> 关于我下面的子页面（任务清单、设备、文章列表等）在手机上表格只能看到 2-3 列，无法拖动滚动。

### 验收标准
- [x] 任务管理表格手机端只保留 任务名称/状态/操作 三列
- [x] 操作栏桌桌面端不变，手机端只保留搜索+查询+新增
- [x] 去掉全局 min-width: 600px 对手机表格的强制限制
- [x] 统计栏在手机上换行缩小字号

### 实现

| 修改项 | 位置 |
|--------|------|
| 表格列隐藏 | `Task.vue` — 重要性、目标、标签、开始日期、闭环日期、剩余时间 加 `hide-on-mobile` |
| 操作栏折叠 | `Task.vue` — 状态过滤、标签过滤、重置、刷新 加 `desktop-only` |
| 全局限制移除 | `index.css` — 新增 `@media (max-width: 768px)` 下 `min-width: auto` |
| 搜索框缩小 | `Task.vue` — 手机端 `width: 130px` |

### Commit
- `8393f36` — fix: improve Task admin page mobile layout

### 设计链接
- 需求文档: `docs/superpowers/requests/2026-07-13_REQ-018_about-subpage-mobile.md`

---

## REQ-019: 布局优化：首页/关于我/投资频道

### 原始需求
> 首页、关于我、投资频道三个页面内容超出视口高度，出现 scroll-y，需要压缩布局使一屏可展示。

### 验收标准
- [x] 首页头像缩小（200→120px）、间距压缩、友情链接紧凑
- [x] 关于我侧边栏改为 sticky 布局，消除独立滚动
- [x] 投资频道侧边栏改为 sticky 布局，消除独立滚动
- [x] 内容面板与侧边栏顶部对齐
- [x] 内容面板铺满视口高度

### 实现

| 修改项 | 位置 |
|--------|------|
| 首页头像/间距压缩 | `index.css` — 头像 120px、gap 1.5rem、info-grid gap 1rem、work-card padding 缩小 |
| 首页个人介绍限高 | `Home.vue` — biography max-height 100px 超出隐藏 |
| 侧边栏 sticky | `About.vue` / `Invest.vue` — `position: fixed` → `sticky`, `top: 0` |
| 内容面板高度 | `About.vue` / `Invest.vue` — `min-height: calc(100vh - 92px)` |

### Commits
- `37e5ec0` — compress homepage layout, sidebars fixed→sticky
- `7657854` — add align-items flex-start
- `0354153` — sidebar top: 0
- `503e0cd` — restore min-height for full-height background

### 设计链接
- 需求文档: `docs/superpowers/requests/2026-07-14_REQ-019_layout-optimization.md`
- 实现计划: `docs/superpowers/plans/2026-07-14-layout-optimization-plan.md`
