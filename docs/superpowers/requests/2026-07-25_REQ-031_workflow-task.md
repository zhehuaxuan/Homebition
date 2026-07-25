# 工作流任务模块 - 需求分析

**日期:** 2026-07-25
**状态:** 已定稿

## 概述
在现有平铺直叙的任务清单之外，新增一个独立的工作流任务模块。用户创建任务时可配置线性流程步骤，任务进展反馈采用向导式页面，按步骤依次推进直到闭环。

## 功能需求

### 1. 工作流任务列表页
- **入口**：后台管理 → 任务与订阅 → 工作流任务（独立入口，与"任务清单"并列）
- **路由**：`/about/workflow-tasks`
- **功能**：
  - 卡片列表展示所有工作流任务
  - 每张卡片显示：任务标题、步骤进度（如"3/5"）、整体状态标签
  - 支持按状态筛选（全部 / 待启动 / 进行中 / 已完成）
  - 支持搜索任务标题
  - 操作：新建、编辑、删除、启动任务

### 2. 工作流创建/编辑页
- **路由**：`/about/workflow-tasks/create` 和 `/about/workflow-tasks/:id/edit`
- **创建流程**：
  - 填写任务基本信息：标题、描述
  - 动态配置线性步骤列表：
    - 添加步骤：输入步骤名称、耗时（可选）、操作说明（how-to）
    - 删除步骤
    - 调整步骤顺序（上移/下移）
  - 最少 1 个步骤，无上限
  - 保存后任务状态为"待启动"

### 3. 向导式进展反馈页
- **路由**：`/about/workflow-tasks/:id/progress`
- **交互流程**：
  - 进入页面时，定位到当前待完成的步骤
  - 展示信息：步骤名称、操作说明、预计耗时
  - 用户填写进展反馈文本（textarea）
  - 点击"完成本步骤" → 步骤状态变为已完成 → 自动切换至下一步
  - 最后一步完成时 → 弹窗提示"所有步骤已完成，任务闭环" → 任务状态变为已完成
  - 进度指示器：顶部显示步骤进度条（已完成 / 当前 / 待完成）

### 4. 工作流任务详情页
- **路由**：`/about/workflow-tasks/:id`
- **展示内容**：
  - 任务基本信息（标题、描述、整体状态）
  - 步骤列表：每一步的名称、耗时、操作说明、状态、进展反馈内容
  - 已完成步骤显示反馈文本和完成时间
  - 操作：编辑任务、进入向导反馈、删除任务

### 5. 增删改查功能

| 操作 | 说明 |
|------|------|
| 新建 | 填写任务信息 + 配置步骤列表 |
| 查询 | 列表页可按状态筛选、标题搜索 |
| 编辑 | 仅待启动状态可编辑（标题、描述、步骤配置） |
| 删除 | 支持删除工作流任务（级联删除步骤） |

## 数据模型

### 工作流任务表 (workflow_task)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | |
| title | VARCHAR(255) | 任务标题 |
| description | TEXT | 任务描述 |
| status | TINYINT | 0=待启动 1=进行中 2=已完成 |
| current_step_order | INT DEFAULT 0 | 当前进行到的步骤序号（从 1 开始，0 表示未启动） |
| total_steps | INT | 总步骤数 |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| finished_at | DATETIME NULL | 任务完成时间 |

### 工作流步骤表 (workflow_step)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | |
| task_id | INT | 关联 workflow_task.id |
| step_order | INT | 步骤序号（1, 2, 3...） |
| name | VARCHAR(255) | 节点名称，如"杀鱼" |
| guide | TEXT | 操作说明，如"去鳞去内脏洗净" |
| estimated_duration | VARCHAR(100) | 预计耗时，如"15分钟" |
| progress | TEXT | 该步骤的进展反馈文本 |
| status | TINYINT | 0=待开始 1=进行中 2=已完成 |
| finished_at | DATETIME NULL | 步骤完成时间 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workflow-tasks` | 工作流任务列表（含步骤摘要） |
| GET | `/api/workflow-tasks/:id` | 任务详情（含完整步骤列表） |
| POST | `/api/workflow-tasks` | 新建工作流任务（含步骤） |
| PUT | `/api/workflow-tasks/:id` | 更新任务基本信息 |
| DELETE | `/api/workflow-tasks/:id` | 删除任务（级联删除步骤） |
| POST | `/api/workflow-tasks/:id/start` | 启动任务（状态置为进行中） |
| POST | `/api/workflow-tasks/:id/step/:stepId/complete` | 完成当前步骤（填写进展） |
| GET | `/api/workflow-tasks/:id/current-step` | 获取当前待完成的步骤 |

## 非功能需求
- 所有新页面需包含移动端适配（`@media max-width: 768px`）
- 遵循项目深色主题风格
- 与现有任务系统完全独立，不修改现有 task / taskdetail 表
