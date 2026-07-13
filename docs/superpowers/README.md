# Homebition 设计文档知识库

> **项目**: Homebition — 个人全栈站点
> **更新**: 2026-07-13

## 目录结构

```
docs/superpowers/
├── README.md                                              ← 入口索引
├── requests/                                               ← 需求工作区（brainstorming 产出）
│   ├── README.md                                           ← 需求工作区说明
│   └── <日期>_<REQ-编号>_<名称>.md                         ← 需求设计文档
├── specs/
│   ├── api/
│   │   └── api-endpoints.md                               ← API 接口设计
│   ├── architecture/
│   │   └── 2026-07-13-homebition-architecture-design.md   ← 整体架构设计
│   ├── database/
│   │   └── database-schema.md                             ← 数据库 Schema
│   ├── modules/
│   │   ├── auth-module.md                                 ← 认证模块
│   │   ├── article-module.md                              ← 文章模块
│   │   ├── task-module.md                                 ← 任务管理模块
│   │   ├── subscription-module.md                         ← 邮件订阅模块
│   │   └── invest-module.md                               ← 投资频道模块
│   └── requirements/
│       ├── requirements-analysis.md                       ← 需求分析文档（存量盘点）
│       └── workflow.md                                    ← 需求开发与同步流程
├── decisions/
│   └── 0001-express-mysql-architecture.md                 ← ADR-0001
└── standards/
    ├── api-conventions.md                                  ← API 响应规范
    ├── javascript-conventions.md                           ← JS 编码规范
    ├── database-conventions.md                             ← 数据库命名规范
    └── logging-conventions.md                              ← 日志规范
```

## 文档清单

### 需求分析
- [需求分析文档](./specs/requirements/requirements-analysis.md) — 原始需求→验收标准→实现映射、需求-模块矩阵（REQ-001~016）
- [需求开发流程](./specs/requirements/workflow.md) — 新需求从提出→设计→归档到知识库的标准工作流

### 架构设计
- [整体架构设计](./specs/architecture/2026-07-13-homebition-architecture-design.md) — 项目全貌、技术栈、前后端架构、数据库、数据流、部署、配置

### 模块设计
- [认证模块](./specs/modules/auth-module.md) — 登录/退出/会话管理
- [文章模块](./specs/modules/article-module.md) — 富文本编辑、GitHub 同步、列表浏览
- [任务管理模块](./specs/modules/task-module.md) — 甘特图/表格视图、标签、进展跟踪
- [邮件订阅模块](./specs/modules/subscription-module.md) — 订阅任务、邮箱管理、EJS 模板、外部接口
- [投资频道模块](./specs/modules/invest-module.md) — AI 公司验证+评估、限流、错误日志

### API 接口设计
- [API 端点文档](./specs/api/api-endpoints.md) — 全量接口定义（50+ API），含请求/响应格式

### 数据库设计
- [数据库 Schema](./specs/database/database-schema.md) — 全部 9 张表的 DDL、ER 关系、索引建议、完整性约束

### 架构决策记录 (ADR)
- [ADR-0001: Express + MySQL 单体架构](./decisions/0001-express-mysql-architecture.md)

### 编码规范
- [API 响应约定](./standards/api-conventions.md) — 响应格式统一目标
- [JavaScript 编码规范](./standards/javascript-conventions.md) — 变量声明、命名、函数、Vue 组件、注释
- [数据库命名规范](./standards/database-conventions.md) — 表名/字段名约定
- [日志规范](./standards/logging-conventions.md) — 日志级别、格式、模块标识

## 设计原则

- **YAGNI**: 只设计当前需要的功能，不为未来假设做设计
- **隔离清晰**: 每个模块有明确的边界和接口
- **先设计后编码**: 任何功能变更必须先经过设计文档评审
- **ADR 驱动**: 重要架构决策记录在 `decisions/`

## 文档流程

1. `brainstorming` skill → 需求澄清与方案设计
2. 设计文档 → 入库到 `specs/` 对应目录
3. `spec-self-review` → 自检一致性
4. 用户评审 → 定稿后可进入实现
5. 实现结束后 → 补充/更新设计文档
