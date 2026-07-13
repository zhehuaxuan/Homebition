# 需求开发与同步流程

> 新需求从 brainstorming 设计到实现后同步到 `specs/` 的标准工作流。

---

## 核心工作流

```
1. 新需求提出
       │
2. brainstorming skill  →  需求澄清 + 方案设计
       │
3. writing-plans skill  →  生成设计文档
       │                  存入 docs/superpowers/requests/
       │                  命名: <日期>_<REQ编号>_<名称>.md
       │
4. 执行实现计划         →  编码开发
       │
5. npx sync-request <文件名> →  分析 requests/ 中的 .md 文件
                               │  提取设计方案、API 变更、数据表变更
                               │  自动同步到 specs/ 对应目录
                               │  更新需求矩阵 REQ 清单
                               │  标记 requests/ 中的文件为 [已实现]
```

---

## 目录与命名

### requests/ — 需求工作区

brainstorming + writing-plans 产出的设计文档存放在此，文件是整个需求的**完整设计+实现方案**，不拆分。

```
docs/superpowers/requests/
├── README.md                                  ← 需求工作区说明
├── 2026-07-20_REQ-017_add-task-filter.md      ← brainstorming 产出
└── 2026-07-25_REQ-018_user-register.md        ← brainstorming 产出
```

**命名规则**: `<YYYY-MM-DD>_<REQ编号>_<英文描述>.md`

### specs/ — 知识库

`sync-request` 命令的目标目录，按类型组织，供所有开发者查阅。

```
docs/superpowers/specs/
├── modules/              ← 模块设计文档（每个 .md 对应一个模块）
├── api/                  ← API 端点文档
├── database/             ← 数据库 Schema
├── architecture/         ← 架构设计
└── requirements/
    └── requirements-analysis.md  ← 需求矩阵（存量 + 增量汇总）
```

---

## sync-request 命令

实现后通过命令分析 `requests/` 中的 `.md` 文件，自动更新 `specs/`。

```
npx sync-request <文件名>          # 同步单个请求
npx sync-request --all             # 同步所有未同步的请求
npx sync-request --status          # 查看同步状态
```

### sync-request 做了什么

分析 `.md` 文件中的结构化章节，提取信息更新到 `specs/`：

| .md 章节 | 同步目标 |
|----------|----------|
| `3.1 前端改动` | 追加到对应模块设计文档 |
| `3.2 后端改动` | 追加到对应模块设计文档 |
| `3.3 数据表改动` | 追加到 `database-schema.md` |
| `5. 变更清单`（实现后填充） | 校验实际文件改动和计划一致 |

额外动作：
- 将需求追加到 `requirements-analysis.md` 的需求矩阵中（递增 REQ 编号）
- 在 `requests/` 的 `.md` 文件头部追加 `**已同步**: YYYY-MM-DD`
- 打印同步报告：新增/修改了哪些文件

---

## requests/ 文档状态流转

| 状态 | 含义 | 位置 |
|------|------|------|
| `设计稿` | brainstorming 刚完成，未开始实现 | `requests/xxx.md` |
| `实现中` | 编码进行中 | `requests/xxx.md` |
| `已实现` | 编码完成，`sync-request` 已执行 | `requests/xxx.md`（头部标记已同步） |

已实现的需求文档保留在 `requests/` 中作为历史归档，不删除。
