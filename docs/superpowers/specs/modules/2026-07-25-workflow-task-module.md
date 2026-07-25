# 工作流任务模块设计文档

> **日期**: 2026-07-25
> **文件**: server/routes/workflowTask.js, client/src/views/about/WorkflowTaskList.vue, WorkflowTaskForm.vue, WorkflowTaskDetail.vue, WorkflowTaskProgress.vue
> **表**: workflow_task, workflow_step

## 功能概述

工作流任务模块提供"配置线性步骤 → 向导式进展反馈"的任务管理方式。用户创建任务时可以自定义一系列线性步骤，推进时按步骤依次填写进展，直到所有步骤完成实现闭环。与现有任务系统完全独立，互不干扰。

## 页面结构

### WorkflowTaskList.vue（列表页）
路由 `/about/workflow-tasks`，功能：
- 卡片列表展示所有工作流任务
- 按状态筛选（全部/待启动/进行中/已完成）
- 按标题搜索
- 每张卡片：标题、步骤进度、状态标签、时间
- 操作：详情、编辑、删除、启动、反馈进展

### WorkflowTaskForm.vue（创建/编辑页）
路由：
- 创建：`/about/workflow-tasks/create`
- 编辑：`/about/workflow-tasks/:id/edit`

功能：
- 任务基本信息（标题、描述）
- 动态步骤配置：添加、删除、排序步骤
- 每步骤：名称、操作说明、预计耗时
- 编辑模式限制：仅待启动状态可编辑
- 创建时一次性提交全部数据（任务 + 步骤列表）

### WorkflowTaskDetail.vue（详情页）
路由 `/about/workflow-tasks/:id`，功能：
- 任务基本信息 + 状态标签
- 步骤时间线：每一步骤的名称、说明、耗时、进展反馈、完成时间
- 状态图标区分：⏳待开始 / 🔄进行中 / ✅已完成
- 上下文操作按钮（编辑/启动/反馈进展/删除）

### WorkflowTaskProgress.vue（向导反馈页）
路由 `/about/workflow-tasks/:id/progress`，功能：
- 顶部进度条（el-steps）展示整体进度
- 当前步骤展示：名称、操作说明、预计耗时
- 进展反馈文本域
- "完成本步骤"按钮 → 自动推进到下一步
- 最后一步完成后弹窗提示闭环
- 边缘情况处理：未启动引导、已完成重定向、全部完成祝贺视图

## 数据模型

```
workflow_task（工作流任务）
├── id:                INT PK AUTO_INCREMENT
├── title:             VARCHAR(255) NOT NULL — 任务标题
├── description:       TEXT — 任务描述
├── status:            TINYINT DEFAULT 0 — 0=待启动 1=进行中 2=已完成
├── current_step_order: INT DEFAULT 0 — 当前步骤序号(0=未启动)
├── total_steps:       INT DEFAULT 0 — 总步骤数
├── created_at:        DATETIME
├── updated_at:        DATETIME
├── finished_at:       DATETIME NULL — 任务完成时间
└── INDEX idx_status (status)

workflow_step（工作流步骤）
├── id:                INT PK AUTO_INCREMENT
├── task_id:           INT NOT NULL → FK workflow_task.id
├── step_order:        INT NOT NULL — 步骤序号(1,2,3...)
├── name:              VARCHAR(255) NOT NULL — 节点名称
├── guide:             TEXT — 操作说明
├── estimated_duration: VARCHAR(100) — 预计耗时
├── progress:          TEXT — 该步骤的进展反馈文本
├── status:            TINYINT DEFAULT 0 — 0=待开始 1=进行中 2=已完成
├── finished_at:       DATETIME NULL — 步骤完成时间
├── created_at:        DATETIME
├── updated_at:        DATETIME
├── INDEX idx_task_id (task_id)
└── INDEX idx_step_order (task_id, step_order)
```

## 状态流转

### 任务状态

| 状态 | 值 | 触发条件 |
|------|-----|----------|
| 待启动 | 0 | 新建时默认 |
| 进行中 | 1 | 用户点击"启动" |
| 已完成 | 2 | 最后一步完成时自动设置 |

### 步骤状态

| 状态 | 值 | 触发条件 |
|------|-----|----------|
| 待开始 | 0 | 新建时默认；前序步骤未完成 |
| 进行中 | 1 | 当前轮到该步骤（任务启动时第 1 步，或上一步完成时） |
| 已完成 | 2 | 用户提交进展反馈 |

### 推进逻辑

```
启动任务 → step1.status=1(进行中)
  ↓ 用户完成 step1
step1.status=2, step2.status=1
  ↓ 用户完成 step2
step2.status=2, step3.status=1
  ↓ ...直到最后一步
最后一步完成 → task.status=2, task.finished_at=NOW
```

## API 接口

### GET /api/workflow-tasks
工作流任务列表。支持查询参数：
- `status` — 按状态筛选（0/1/2）
- `keyword` — 按标题模糊搜索

响应：
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "title": "烧鱼",
      "status": 1,
      "current_step_order": 2,
      "total_steps": 3,
      "created_at": "2026-07-25T10:00:00.000Z"
    }
  ]
}
```

### GET /api/workflow-tasks/:id
任务详情（含所有步骤，按 step_order 排序）。

响应：
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "title": "烧鱼",
    "description": "做一道红烧鱼",
    "status": 1,
    "current_step_order": 2,
    "total_steps": 3,
    "created_at": "...",
    "updated_at": "...",
    "finished_at": null,
    "steps": [
      { "id": 1, "step_order": 1, "name": "杀鱼", "guide": "去鳞去内脏洗净", "estimated_duration": "10分钟", "progress": "鱼已杀好", "status": 2, "finished_at": "..." },
      { "id": 2, "step_order": 2, "name": "起锅烧油", "guide": "大火烧油至七成热", "estimated_duration": "5分钟", "progress": null, "status": 1, "finished_at": null },
      { "id": 3, "step_order": 3, "name": "翻炒", "guide": "翻炒至两面金黄", "estimated_duration": "15分钟", "progress": null, "status": 0, "finished_at": null }
    ]
  }
}
```

### POST /api/workflow-tasks
新建工作流任务（含步骤）。请求体：

```json
{
  "title": "烧鱼",
  "description": "做一道红烧鱼",
  "steps": [
    { "name": "杀鱼", "guide": "去鳞去内脏洗净", "estimated_duration": "10分钟" },
    { "name": "起锅烧油", "guide": "大火烧油至七成热", "estimated_duration": "5分钟" },
    { "name": "翻炒", "guide": "翻炒至两面金黄", "estimated_duration": "15分钟" }
  ]
}
```

实现说明：使用事务（transaction）先 INSERT workflow_task，再逐个 INSERT workflow_step（自动计算 total_steps 和 step_order）。

### PUT /api/workflow-tasks/:id
更新任务基本信息（仅 status=0 时允许）。请求体：

```json
{
  "title": "新标题",
  "description": "新描述",
  "steps": [
    { "name": "修改后的步骤1", "guide": "...", "estimated_duration": "..." },
    { "name": "步骤2", "guide": "...", "estimated_duration": "..." }
  ]
}
```

更新步骤的实现方式：在事务中 DELETE 旧步骤 → INSERT 新步骤。

### DELETE /api/workflow-tasks/:id
删除任务及所有关联步骤（CASCADE）。

### POST /api/workflow-tasks/:id/start
启动任务：
- 校验 status 必须为 0
- 设置 task.status=1, task.current_step_order=1
- 设置 step1.status=1（进行中）

### POST /api/workflow-tasks/:id/step/:stepId/complete
完成指定步骤。请求体：

```json
{
  "progress": "鱼已杀好洗净"
}
```

处理逻辑：
1. 校验 step 属于该 task
2. 校验 step.status 必须为 1（进行中）
3. 更新 step.progress = 传入文本, step.status=2, step.finished_at=NOW
4. 查找 next_step = 同一 task 中 step_order 更大的最小序号步骤
5. 如果 next_step 存在：设置 next_step.status=1, 更新 task.current_step_order = next_step.step_order
6. 如果不存在（最后一步）：设置 task.status=2, task.finished_at=NOW, task.current_step_order = total_steps

### GET /api/workflow-tasks/:id/current-step
获取当前待完成的步骤信息。

## 关键业务流程

### 创建流程
```
新建按钮 → WorkflowTaskForm(create mode)
  → 填写标题、描述
  → 添加步骤（名称、操作说明、预计耗时）
  → 提交 POST /api/workflow-tasks
  → 跳转到详情页
```

### 推进流程
```
启动任务 → 进入详情页 → 点击"反馈进展"
  → WorkflowTaskProgress 页
  → 看到当前步骤信息
  → 填写进展反馈 → 点击"完成本步骤"
  → 自动推进到下一步 / 闭环完成
```

### 编辑流程
```
列表页 → 编辑按钮 → WorkflowTaskForm(edit mode)
  → 加载现有数据
  → 修改标题、描述、步骤
  → 提交 PUT /api/workflow-tasks/:id
  → 跳转到详情页
```

## 移动端适配
- 768px 断点：列表页筛选栏纵向排列，卡片内边距缩减
- 表单页：步骤卡片垂直堆叠，操作按钮全宽
- 向导页：进度条自适应，文本域全宽，按钮底部固定
- 详情页：步骤卡片纵向排列，操作按钮换行
- 所有按钮保持最小触摸目标 44px
